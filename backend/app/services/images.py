from __future__ import annotations

import logging
from typing import Optional

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


async def search_stock_image(query: str) -> Optional[str]:
    """Return a stock image URL for the given query, or None if no key/no hit."""
    settings = get_settings()
    if not settings.unsplash_access_key or not query.strip():
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                "https://api.unsplash.com/search/photos",
                params={"query": query, "per_page": 1, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {settings.unsplash_access_key}"},
            )
            r.raise_for_status()
            results = r.json().get("results") or []
            if not results:
                return None
            # `regular` is ~1080w which is fine for tiles.
            return results[0]["urls"]["regular"]
    except Exception:
        logger.exception("Unsplash search failed for query=%r", query)
        return None
