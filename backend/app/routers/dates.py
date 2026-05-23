from __future__ import annotations

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from ..auth import CurrentUser
from ..db import get_db
from ..models import DatePlan
from ..schemas import DateCreate, DateOut, DateUpdate

router = APIRouter(prefix="/api/dates", tags=["dates"])


@router.get("", response_model=list[DateOut])
def list_dates(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    upcoming: bool = Query(False, description="Nur ab heute"),
    status: Optional[str] = Query(None),
) -> list[DatePlan]:
    query = db.query(DatePlan).order_by(DatePlan.scheduled_for.asc())
    if upcoming:
        query = query.filter(DatePlan.scheduled_for >= date.today())
    if status:
        query = query.filter(DatePlan.status == status)
    return query.all()


@router.get("/{date_id}", response_model=DateOut)
def get_date(
    date_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> DatePlan:
    d = db.get(DatePlan, date_id)
    if not d:
        raise HTTPException(404)
    return d


@router.post("", response_model=DateOut, status_code=201)
def create_date(
    payload: DateCreate,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> DatePlan:
    d = DatePlan(
        title=payload.title,
        scheduled_for=payload.scheduled_for,
        notes=payload.notes,
        status=payload.status,
        idea_id=payload.idea_id,
        created_by=user.email,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.patch("/{date_id}", response_model=DateOut)
def update_date(
    date_id: int,
    payload: DateUpdate,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> DatePlan:
    d = db.get(DatePlan, date_id)
    if not d:
        raise HTTPException(404)
    data = payload.model_dump(exclude_unset=True)
    if "scheduled_for" in data:
        # User changed the date – allow a new notification.
        d.notification_sent = False
    for k, v in data.items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/{date_id}", status_code=204, response_class=Response)
def delete_date(
    date_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    d = db.get(DatePlan, date_id)
    if not d:
        raise HTTPException(404)
    db.delete(d)
    db.commit()
    return Response(status_code=204)
