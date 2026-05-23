from __future__ import annotations

import re
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..ai import get_provider
from ..ai.base import ChatTurn
from ..auth import CurrentUser
from ..db import get_db
from ..models import ChatMessage, Idea, Preferences
from ..schemas import ChatMessageIn, ChatResponse

router = APIRouter(prefix="/api/date-finder", tags=["date-finder"])

ID_PATTERN = re.compile(r"\[#(\d+)\]")


def _format_idea_catalog(db: Session) -> str:
    ideas = (
        db.query(Idea)
        .filter(Idea.enrichment_status == "done")
        .order_by(Idea.created_at.desc())
        .limit(40)
        .all()
    )
    if not ideas:
        return ""
    lines = []
    for idea in ideas:
        tags = ", ".join(idea.tags or [])
        lines.append(
            f"#{idea.id} {idea.title or '(ohne Titel)'} — {idea.summary or ''} "
            f"[Tags: {tags}; Ort: {idea.location or '?'}]"
        )
    return "\n".join(lines)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatMessageIn,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ChatResponse:
    provider = get_provider()
    if not provider.configured:
        raise HTTPException(503, f"AI provider '{provider.name}' is not configured.")

    session_id = payload.session_id or secrets.token_urlsafe(12)

    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    history = [ChatTurn(role=h.role, content=h.content) for h in history_rows]

    prefs = db.get(Preferences, 1)
    prefs_text = prefs.context if prefs else ""
    catalog = _format_idea_catalog(db)

    reply = await provider.chat(
        history=history,
        user_message=payload.message,
        preferences=prefs_text,
        idea_catalog=catalog,
    )

    db.add(ChatMessage(session_id=session_id, role="user", content=payload.message))
    db.add(ChatMessage(session_id=session_id, role="assistant", content=reply))
    db.commit()

    suggested = [int(m) for m in ID_PATTERN.findall(reply)]
    return ChatResponse(session_id=session_id, reply=reply, suggested_idea_ids=suggested)
