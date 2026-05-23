from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .db import get_db
from .models import User


@dataclass
class AuthUser:
    email: str
    name: str | None


def _ensure_user_row(db: Session, email: str, name: str | None) -> None:
    existing = db.query(User).filter(User.email == email).first()
    if existing is None:
        db.add(User(email=email, name=name))
        db.commit()
    elif name and existing.name != name:
        existing.name = name
        db.commit()


def current_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[Session, Depends(get_db)],
) -> AuthUser:
    if settings.auth_dev_mode:
        email = settings.auth_dev_user_email.lower()
        _ensure_user_row(db, email, "Dev User")
        return AuthUser(email=email, name="Dev User")

    email = request.headers.get(settings.auth_header_email, "").lower()
    name = request.headers.get(settings.auth_header_user) or None

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authenticated user header. Are you behind oauth2-proxy?",
        )

    allowed = settings.allowed_email_list
    if allowed and email not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not whitelisted.",
        )

    _ensure_user_row(db, email, name)
    return AuthUser(email=email, name=name)


def quick_add_auth(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Static-token auth for the iOS Shortcut endpoint."""
    expected = settings.quick_add_token
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="QUICK_ADD_TOKEN not configured on the server.",
        )

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    # We don't know who the shortcut belongs to; record as shortcut-user.
    return "shortcut@local"


CurrentUser = Annotated[AuthUser, Depends(current_user)]
ShortcutAuth = Annotated[str, Depends(quick_add_auth)]
