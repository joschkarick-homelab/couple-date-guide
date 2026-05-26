from __future__ import annotations

import asyncio
import logging

from ..ai import get_provider
from ..db import SessionLocal
from ..models import Idea, Preferences
from .images import search_stock_image

logger = logging.getLogger(__name__)


def _get_preferences_text() -> str:
    with SessionLocal() as db:
        prefs = db.get(Preferences, 1)
        return prefs.context if prefs else ""


async def enrich_idea_async(idea_id: int) -> None:
    """Background task: enrich an idea with AI + optionally fetch a stock image."""
    prefs_text = _get_preferences_text()
    provider = get_provider()

    with SessionLocal() as db:
        idea = db.get(Idea, idea_id)
        if idea is None:
            logger.warning("enrich_idea_async: idea %d not found", idea_id)
            return
        raw_input = idea.raw_input

    try:
        result = await provider.enrich_idea(raw_input, prefs_text)
    except Exception as exc:
        logger.exception("Enrichment failed for idea %d", idea_id)
        with SessionLocal() as db:
            idea = db.get(Idea, idea_id)
            if idea:
                idea.enrichment_status = "failed"
                idea.enrichment_error = str(exc)[:1000]
                db.commit()
        return

    # Image search is best-effort; missing key just skips. The model returns a
    # short English `image_query` tuned for stock-photo search; fall back to the
    # title only (which is also short) if it's missing.
    image_query = (result.image_query or result.title or "").strip()
    image_url = await search_stock_image(image_query) if image_query else None

    with SessionLocal() as db:
        idea = db.get(Idea, idea_id)
        if idea is None:
            return
        idea.title = result.title or idea.title
        idea.summary = result.summary
        idea.clothing = result.clothing
        idea.food = result.food
        idea.music_playlist = result.music_playlist
        idea.activity = result.activity
        idea.location = result.location
        idea.tags = result.tags or []
        if image_url and not idea.image_url:
            idea.image_url = image_url
            idea.image_source = "stock"
        idea.enrichment_status = "done"
        idea.enrichment_error = None
        db.commit()


def schedule_enrichment(idea_id: int) -> None:
    """Fire-and-forget enrichment from a sync context (FastAPI route)."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(enrich_idea_async(idea_id))
    except RuntimeError:
        # No running loop - run synchronously (e.g. from CLI).
        asyncio.run(enrich_idea_async(idea_id))
