from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import CurrentUser
from ..db import get_db
from ..models import Preferences
from ..schemas import PreferencesIn, PreferencesOut

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


def _get_or_create(db: Session) -> Preferences:
    prefs = db.get(Preferences, 1)
    if prefs is None:
        prefs = Preferences(id=1, context="")
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("", response_model=PreferencesOut)
def get_preferences(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Preferences:
    return _get_or_create(db)


@router.put("", response_model=PreferencesOut)
def update_preferences(
    payload: PreferencesIn,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Preferences:
    prefs = _get_or_create(db)
    prefs.context = payload.context
    db.commit()
    db.refresh(prefs)
    return prefs
