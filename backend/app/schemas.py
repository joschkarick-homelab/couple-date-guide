from __future__ import annotations

from datetime import date, datetime, time
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class IdeaBase(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    clothing: Optional[str] = None
    food: Optional[str] = None
    music_playlist: Optional[str] = None
    activity: Optional[str] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    image_source: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class IdeaCreate(IdeaBase):
    raw_input: str


class IdeaUpdate(IdeaBase):
    pass


class IdeaQuickAdd(BaseModel):
    raw_input: str = Field(min_length=1)


class IdeaOut(IdeaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    raw_input: str
    enrichment_status: Literal["pending", "done", "failed"]
    enrichment_error: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DateBase(BaseModel):
    title: str
    scheduled_for: date
    start_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    status: Literal["planned", "done", "cancelled"] = "planned"
    idea_id: Optional[int] = None


class DateCreate(DateBase):
    pass


class DateUpdate(BaseModel):
    title: Optional[str] = None
    scheduled_for: Optional[date] = None
    start_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[Literal["planned", "done", "cancelled"]] = None
    idea_id: Optional[int] = None


class DateOut(DateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    notification_sent: bool
    created_at: datetime
    updated_at: datetime
    idea: Optional[IdeaOut] = None


class PreferencesIn(BaseModel):
    context: str
    default_start_time: Optional[time] = None
    default_duration_minutes: Optional[int] = None


class PreferencesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    context: str
    default_start_time: Optional[time] = None
    default_duration_minutes: Optional[int] = None
    updated_at: datetime


class ChatMessageIn(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatMessageOut(BaseModel):
    session_id: str
    role: Literal["user", "assistant"]
    content: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    suggested_idea_ids: list[int] = Field(default_factory=list)


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: dict[str, str]


class HealthOut(BaseModel):
    status: str
    ai_provider: str
    ai_configured: bool


class MeOut(BaseModel):
    email: str
    name: Optional[str] = None


class CalendarSubscriptionOut(BaseModel):
    token: str
    ics_path: str  # "/api/calendar/<token>.ics" — frontend prefixes its origin
