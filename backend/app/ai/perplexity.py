from __future__ import annotations

import json

import httpx

from .base import (
    ENRICHMENT_SYSTEM_PROMPT,
    FINDER_SYSTEM_PROMPT,
    AIProvider,
    ChatTurn,
    Enrichment,
)


class PerplexityProvider(AIProvider):
    name = "perplexity"
    base_url = "https://api.perplexity.ai"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def _chat(self, system: str, messages: list[dict]) -> str:
        if not self.api_key:
            raise RuntimeError("PERPLEXITY_API_KEY is not set.")
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "system", "content": system}] + messages,
                },
            )
            r.raise_for_status()
            data = r.json()
        return data["choices"][0]["message"]["content"].strip()

    async def enrich_idea(self, raw_input: str, preferences: str) -> Enrichment:
        user = (
            f"Allgemeine Präferenzen des Paars:\n{preferences or '(keine angegeben)'}\n\n"
            f"Rohe Idee:\n{raw_input}\n\nGib das angereicherte JSON zurück."
        )
        text = await self._chat(
            ENRICHMENT_SYSTEM_PROMPT, [{"role": "user", "content": user}]
        )
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text
            if text.endswith("```"):
                text = text[:-3]
        data = json.loads(text.strip())
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
        system = (
            FINDER_SYSTEM_PROMPT
            + "\n\nAllgemeine Präferenzen des Paars:\n"
            + (preferences or "(keine angegeben)")
            + "\n\nGespeicherte Ideen-Katalog:\n"
            + (idea_catalog or "(noch keine Ideen)")
        )
        messages = [{"role": t.role, "content": t.content} for t in history]
        messages.append({"role": "user", "content": user_message})
        return await self._chat(system, messages)
