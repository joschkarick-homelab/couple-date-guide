from __future__ import annotations

import secrets
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..auth import CurrentUser
from ..db import get_db
from ..models import CalendarToken, DatePlan
from ..schemas import CalendarSubscriptionOut

TZID = "Europe/Berlin"

# Minimal VTIMEZONE block for Europe/Berlin. Outlook honours this so the wall
# clock time stays correct across DST switches regardless of the viewer's TZ.
VTIMEZONE_BLOCK = [
    "BEGIN:VTIMEZONE",
    f"TZID:{TZID}",
    "BEGIN:STANDARD",
    "DTSTART:19701025T030000",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T020000",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
]

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


def _path_for(token: str) -> str:
    return f"/api/calendar/{token}.ics"


@router.get("/me", response_model=CalendarSubscriptionOut | None)
def get_subscription(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> CalendarSubscriptionOut | None:
    existing = (
        db.query(CalendarToken).filter(CalendarToken.user_email == user.email).first()
    )
    if not existing:
        return None
    return CalendarSubscriptionOut(token=existing.token, ics_path=_path_for(existing.token))


@router.post("", response_model=CalendarSubscriptionOut, status_code=201)
def create_or_rotate_subscription(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> CalendarSubscriptionOut:
    """Generate a fresh token, overwriting any existing one for this user.

    Rotating invalidates the old URL — that's the recovery path if a feed URL
    leaks (the user just hits "Neu generieren" and re-subscribes in Outlook).
    """
    new_token = secrets.token_urlsafe(32)
    existing = (
        db.query(CalendarToken).filter(CalendarToken.user_email == user.email).first()
    )
    if existing:
        existing.token = new_token
    else:
        db.add(CalendarToken(user_email=user.email, token=new_token))
    db.commit()
    return CalendarSubscriptionOut(token=new_token, ics_path=_path_for(new_token))


@router.delete("", status_code=204)
def revoke_subscription(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    existing = (
        db.query(CalendarToken).filter(CalendarToken.user_email == user.email).first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return Response(status_code=204)


@router.get("/{token}.ics")
def ics_feed(token: str, db: Annotated[Session, Depends(get_db)]) -> Response:
    """Public ICS feed — Outlook / Apple Calendar subscribe to this URL.

    No OIDC auth (the oauth2-proxy skip-auth-route lets it through); the
    long random token in the path is the secret.
    """
    row = db.query(CalendarToken).filter(CalendarToken.token == token).first()
    if not row:
        raise HTTPException(status_code=404, detail="Unknown calendar token")

    plans = (
        db.query(DatePlan)
        .filter(DatePlan.status == "planned")
        .order_by(DatePlan.scheduled_for.asc())
        .all()
    )

    body = _render_ics(plans)
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Cache-Control": "public, max-age=600"},
    )


def _render_ics(plans: list[DatePlan]) -> str:
    now_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    has_timed = any(p.start_time is not None for p in plans)
    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//date-manager//DE",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Couple Dates",
        "NAME:Couple Dates",
    ]
    if has_timed:
        lines.extend(VTIMEZONE_BLOCK)
    for p in plans:
        lines.extend(_render_event(p, now_utc))
    lines.append("END:VCALENDAR")
    # RFC 5545 wants CRLF line endings and 75-octet line folding.
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"


def _render_event(plan: DatePlan, dtstamp: str) -> list[str]:
    desc_parts: list[str] = []
    if plan.notes:
        desc_parts.append(plan.notes)
    if plan.idea and plan.idea.summary:
        desc_parts.append(plan.idea.summary)
    description = "\n\n".join(desc_parts)

    if plan.start_time is not None:
        # Timed event with a wall-clock time anchored to Europe/Berlin so that
        # DST switches don't shift "20:30" by an hour.
        duration = plan.duration_minutes or 120  # default to 2h if unset
        start_dt = datetime.combine(plan.scheduled_for, plan.start_time)
        end_dt = start_dt + timedelta(minutes=duration)
        dtstart = f"DTSTART;TZID={TZID}:{start_dt.strftime('%Y%m%dT%H%M%S')}"
        dtend = f"DTEND;TZID={TZID}:{end_dt.strftime('%Y%m%dT%H%M%S')}"
        transp = "TRANSP:OPAQUE"  # blocks time in Outlook free/busy
    else:
        start: date = plan.scheduled_for
        end = start + timedelta(days=1)  # all-day, DTEND is exclusive
        dtstart = f"DTSTART;VALUE=DATE:{start.strftime('%Y%m%d')}"
        dtend = f"DTEND;VALUE=DATE:{end.strftime('%Y%m%d')}"
        transp = "TRANSP:TRANSPARENT"

    return [
        "BEGIN:VEVENT",
        f"UID:date-{plan.id}@datemgr",
        f"DTSTAMP:{dtstamp}",
        dtstart,
        dtend,
        f"SUMMARY:{_escape(plan.title)}",
        *([f"DESCRIPTION:{_escape(description)}"] if description else []),
        transp,
        "END:VEVENT",
    ]


def _escape(text: str) -> str:
    # RFC 5545 §3.3.11 TEXT escaping.
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _fold(line: str) -> str:
    """RFC 5545 §3.1 line folding: split lines >75 octets, continuation indented by a single space.

    Folds at character (not byte) boundaries to avoid breaking multibyte UTF-8
    sequences; lines may end up a few octets over 75 in pathological cases, which
    every real-world ICS parser tolerates.
    """
    if len(line.encode("utf-8")) <= 75:
        return line
    out: list[str] = []
    chunk = ""
    chunk_bytes = 0
    for char in line:
        char_bytes = len(char.encode("utf-8"))
        if chunk_bytes + char_bytes > 75:
            out.append(chunk)
            chunk = char
            chunk_bytes = char_bytes
        else:
            chunk += char
            chunk_bytes += char_bytes
    if chunk:
        out.append(chunk)
    return "\r\n ".join(out)
