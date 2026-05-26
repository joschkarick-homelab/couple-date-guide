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


class GeminiProvider(AIProvider):
    name = "gemini"
    base_url = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    async def _call(self, system: str, contents: list[dict]) -> str:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        url = f"{self.base_url}/models/{self.model}:generateContent"
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(
                url,
                params={"key": self.api_key},
                json={
                    "systemInstruction": {"parts": [{"text": system}]},
                    "contents": contents,
                },
            )
            r.raise_for_status()
            data = r.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"Gemini returned unexpected payload: {data}") from e

    async def enrich_idea(self, raw_input: str, preferences: str) -> Enrichment:
        user = (
            f"Allgemeine Präferenzen des Paars:\n{preferences or '(keine angegeben)'}\n\n"
            f"Rohe Idee:\n{raw_input}"
        )
        text = await self._call(
            ENRICHMENT_SYSTEM_PROMPT,
            [{"role": "user", "parts": [{"text": user}]}],
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
            image_query=data.get("image_query"),
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
        contents = []
        for t in history:
            contents.append(
                {
                    "role": "user" if t.role == "user" else "model",
                    "parts": [{"text": t.content}],
                }
            )
        contents.append({"role": "user", "parts": [{"text": user_message}]})
        return await self._call(system, contents)
