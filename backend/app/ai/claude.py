from __future__ import annotations

import json
import logging
from typing import Optional

from anthropic import AsyncAnthropic

from .base import (
    ENRICHMENT_SYSTEM_PROMPT,
    FINDER_SYSTEM_PROMPT,
    AIProvider,
    ChatTurn,
    Enrichment,
)

logger = logging.getLogger(__name__)


class ClaudeProvider(AIProvider):
    name = "claude"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self._client: Optional[AsyncAnthropic] = None

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def _client_or_raise(self) -> AsyncAnthropic:
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set.")
        if self._client is None:
            self._client = AsyncAnthropic(api_key=self.api_key)
        return self._client

    async def enrich_idea(self, raw_input: str, preferences: str) -> Enrichment:
        client = self._client_or_raise()

        user_content = (
            f"Allgemeine Präferenzen des Paars:\n{preferences or '(keine angegeben)'}\n\n"
            f"Rohe Idee:\n{raw_input}\n\n"
            "Gib das angereicherte JSON-Objekt zurück."
        )

        resp = await client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=ENRICHMENT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )

        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        text = _strip_code_fences(text)
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            logger.warning("Claude enrichment returned non-JSON: %s", text[:500])
            raise RuntimeError(f"Enrichment response was not valid JSON: {exc}") from exc

        return Enrichment(
            title=data.get("title"),
            summary=data.get("summary"),
            clothing=data.get("clothing"),
            food=data.get("food"),
            music_playlist=data.get("music_playlist"),
            activity=data.get("activity"),
            location=data.get("location"),
            tags=[str(t) for t in (data.get("tags") or [])],
        )

    async def chat(
        self,
        history: list[ChatTurn],
        user_message: str,
        preferences: str,
        idea_catalog: str,
    ) -> str:
        client = self._client_or_raise()

        system = (
            FINDER_SYSTEM_PROMPT
            + "\n\nAllgemeine Präferenzen des Paars:\n"
            + (preferences or "(keine angegeben)")
            + "\n\nGespeicherte Ideen-Katalog:\n"
            + (idea_catalog or "(noch keine Ideen)")
        )

        messages = [{"role": t.role, "content": t.content} for t in history]
        messages.append({"role": "user", "content": user_message})

        resp = await client.messages.create(
            model=self.model,
            max_tokens=512,
            system=system,
            messages=messages,
        )
        return "".join(b.text for b in resp.content if b.type == "text").strip()


def _strip_code_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        first_newline = t.find("\n")
        if first_newline != -1:
            t = t[first_newline + 1 :]
        if t.endswith("```"):
            t = t[:-3]
    return t.strip()
