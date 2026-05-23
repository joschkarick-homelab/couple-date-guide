from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ..auth import CurrentUser
from ..config import Settings, get_settings
from ..db import get_db
from ..models import PushSubscription
from ..schemas import PushSubscriptionIn

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/vapid-public-key")
def vapid_public_key(settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    return {"key": settings.vapid_public_key}


@router.post("/subscribe", status_code=201)
def subscribe(
    payload: PushSubscriptionIn,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if existing:
        existing.p256dh = payload.keys.get("p256dh", "")
        existing.auth = payload.keys.get("auth", "")
        existing.user_email = user.email
    else:
        db.add(
            PushSubscription(
                user_email=user.email,
                endpoint=payload.endpoint,
                p256dh=payload.keys.get("p256dh", ""),
                auth=payload.keys.get("auth", ""),
            )
        )
    db.commit()
    return {"ok": True}


@router.post("/unsubscribe", status_code=204, response_class=Response)
def unsubscribe(
    payload: PushSubscriptionIn,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint
    ).delete()
    db.commit()
    return Response(status_code=204)
