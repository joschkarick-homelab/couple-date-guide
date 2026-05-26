from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Enrichment:
    title: Optional[str] = None
    summary: Optional[str] = None
    clothing: Optional[str] = None
    food: Optional[str] = None
    music_playlist: Optional[str] = None
    activity: Optional[str] = None
    location: Optional[str] = None
    image_query: Optional[str] = None
    tags: list[str] = field(default_factory=list)


@dataclass
class ChatTurn:
    role: str  # "user" | "assistant"
    content: str


ENRICHMENT_SYSTEM_PROMPT = """Du bist ein Assistent, der Date-Ideen für ein Paar strukturiert anreichert.

Du bekommst eine kurze, oft unsortierte Idee (z.B. via Sprachnotiz oder Stichwort).
Reichere sie zu einem schönen Date-Konzept an und gib ein JSON-Objekt mit diesen Feldern zurück:

- title (string): kurzer, eingängiger Titel (max 60 Zeichen)
- summary (string): 1-2 Sätze Beschreibung, was das Date ausmacht
- clothing (string): Outfit-Empfehlung (knapp)
- food (string): Essens-/Getränke-Idee passend zum Date
- music_playlist (string): Vorschlag für Musik / Deezer- oder Spotify-Playlist-Stil
- activity (string): die konkrete Aktivität in einem Satz
- location (string): wo das stattfindet (Zuhause / Restaurant / draußen / spezifisch)
- image_query (string): 2-4 englische, generische Stichwörter für eine Unsplash-Stock-Foto-Suche.
  Beschreibe die Stimmung/Szene visuell, KEINE Eigennamen oder Markennamen.
  Beispiele: "cozy couch gaming evening", "romantic candlelight dinner", "autumn forest walk", "homemade pizza kitchen"
- tags (array of strings): erfüllte Bedürfnisse, z.B. ["Romantik", "Spiel & Spaß", "Genuss", "Abenteuer", "Entspannung", "Kultur", "Nerd", "Zuhause"]

Antworte ausschließlich mit JSON, ohne Erklärung, ohne Markdown-Fences."""


FINDER_SYSTEM_PROMPT = """Du bist der Date-Finder für ein Paar. Du hilfst ihnen, aus ihren gespeicherten Ideen
ein passendes Date für die aktuelle Stimmung auszuwählen, oder eine neue Idee vorzuschlagen.

Wenn du eine Idee aus ihrer Liste empfehlen willst, nenne sie beim Namen und referenziere ihre ID im Format [#id].
Sei warm, ein bisschen verspielt, aber knapp – maximal 3-4 Sätze pro Antwort.
Stelle bei Bedarf eine Rückfrage statt eine Liste aufzuzählen."""


class AIProvider(ABC):
    name: str = "base"

    @property
    @abstractmethod
    def configured(self) -> bool: ...

    @abstractmethod
    async def enrich_idea(self, raw_input: str, preferences: str) -> Enrichment: ...

    @abstractmethod
    async def chat(
        self,
        history: list[ChatTurn],
        user_message: str,
        preferences: str,
        idea_catalog: str,
    ) -> str: ...
