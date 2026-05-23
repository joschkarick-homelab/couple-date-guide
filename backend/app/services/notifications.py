from __future__ import annotations

import json
import logging
from datetime import date

from pywebpush import WebPushException, webpush

from ..config import get_settings
from ..db import SessionLocal
from ..models import DatePlan, PushSubscription

logger = logging.getLogger(__name__)


def _send(sub: PushSubscription, payload: dict) -> bool:
    settings = get_settings()
    if not settings.vapid_private_key:
        logger.info("VAPID_PRIVATE_KEY not set, skipping push.")
        return False
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
        return True
    except WebPushException as exc:
        logger.warning("Push to %s failed: %s", sub.endpoint[:60], exc)
        # 404 / 410 -> subscription expired
        if exc.response is not None and exc.response.status_code in (404, 410):
            with SessionLocal() as db:
                stale = db.get(PushSubscription, sub.id)
                if stale:
                    db.delete(stale)
                    db.commit()
        return False


def notify_dates_today() -> int:
    """Send a push for every planned date whose scheduled_for is today
    and that hasn't been notified yet. Returns count of dates notified."""
    today = date.today()
    sent = 0
    with SessionLocal() as db:
        due = (
            db.query(DatePlan)
            .filter(
                DatePlan.scheduled_for == today,
                DatePlan.status == "planned",
                DatePlan.notification_sent.is_(False),
            )
            .all()
        )
        subs = db.query(PushSubscription).all()

        for d in due:
            payload = {
                "title": "💜 Heute ist Date-Tag!",
                "body": d.title,
                "url": f"/dates/{d.id}",
            }
            any_sent = False
            for sub in subs:
                if _send(sub, payload):
                    any_sent = True
            if any_sent:
                d.notification_sent = True
                sent += 1

        db.commit()
    return sent
