from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Preferences(Base):
    """One shared preferences row for the couple (singleton, id=1)."""

    __tablename__ = "preferences"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    context: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class Idea(Base):
    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(primary_key=True)
    raw_input: Mapped[str] = mapped_column(Text)

    title: Mapped[Optional[str]] = mapped_column(String(255))
    summary: Mapped[Optional[str]] = mapped_column(Text)

    clothing: Mapped[Optional[str]] = mapped_column(Text)
    food: Mapped[Optional[str]] = mapped_column(Text)
    music_playlist: Mapped[Optional[str]] = mapped_column(Text)
    activity: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(Text)

    image_url: Mapped[Optional[str]] = mapped_column(String(512))
    image_source: Mapped[Optional[str]] = mapped_column(String(32))  # stock | ai | manual

    tags: Mapped[list[str]] = mapped_column(JSON, default=list)

    # pending | done | failed
    enrichment_status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    enrichment_error: Mapped[Optional[str]] = mapped_column(Text)

    created_by: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    dates: Mapped[list["DatePlan"]] = relationship(back_populates="idea")


class DatePlan(Base):
    __tablename__ = "dates"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    scheduled_for: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # planned | done | cancelled
    status: Mapped[str] = mapped_column(String(16), default="planned", index=True)

    idea_id: Mapped[Optional[int]] = mapped_column(ForeignKey("ideas.id"))
    idea: Mapped[Optional[Idea]] = relationship(back_populates="dates")

    notification_sent: Mapped[bool] = mapped_column(default=False)

    created_by: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_email: Mapped[str] = mapped_column(String(255), index=True)
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    p256dh: Mapped[str] = mapped_column(Text)
    auth: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class CalendarToken(Base):
    """Per-user unguessable token to subscribe to dates via iCal feed."""

    __tablename__ = "calendar_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
