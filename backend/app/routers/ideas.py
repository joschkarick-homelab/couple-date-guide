from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import CurrentUser, ShortcutAuth
from ..db import get_db
from ..models import Idea
from ..schemas import IdeaCreate, IdeaOut, IdeaQuickAdd, IdeaUpdate
from ..services.enrichment import enrich_idea_async

router = APIRouter(prefix="/api/ideas", tags=["ideas"])


@router.get("", response_model=list[IdeaOut])
def list_ideas(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    q: Optional[str] = Query(None, description="Volltextsuche in Titel/Summary/Raw"),
    tag: Optional[str] = Query(None, description="Filter auf einen Tag (exakt)"),
    status: Optional[str] = Query(None, description="enrichment_status filter"),
) -> list[Idea]:
    query = db.query(Idea).order_by(Idea.created_at.desc())
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(Idea.title.like(like), Idea.summary.like(like), Idea.raw_input.like(like))
        )
    if status:
        query = query.filter(Idea.enrichment_status == status)
    items = query.all()
    if tag:
        items = [i for i in items if tag in (i.tags or [])]
    return items


@router.get("/{idea_id}", response_model=IdeaOut)
def get_idea(
    idea_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Idea:
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404)
    return idea


@router.post("", response_model=IdeaOut, status_code=201)
def create_idea(
    payload: IdeaCreate,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    background: BackgroundTasks,
) -> Idea:
    idea = Idea(
        raw_input=payload.raw_input,
        title=payload.title,
        summary=payload.summary,
        clothing=payload.clothing,
        food=payload.food,
        music_playlist=payload.music_playlist,
        activity=payload.activity,
        location=payload.location,
        image_url=payload.image_url,
        image_source=payload.image_source,
        tags=payload.tags or [],
        created_by=user.email,
        enrichment_status="pending" if not payload.title else "done",
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)

    if idea.enrichment_status == "pending":
        background.add_task(enrich_idea_async, idea.id)

    return idea


@router.post("/quick-add", response_model=IdeaOut, status_code=201)
def quick_add_idea(
    payload: IdeaQuickAdd,
    db: Annotated[Session, Depends(get_db)],
    background: BackgroundTasks,
    _: ShortcutAuth,
) -> Idea:
    """iOS-Kurzbefehl-Endpoint: nur Rohtext. Anreicherung passiert async."""
    idea = Idea(
        raw_input=payload.raw_input,
        created_by="shortcut",
        enrichment_status="pending",
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    background.add_task(enrich_idea_async, idea.id)
    return idea


@router.patch("/{idea_id}", response_model=IdeaOut)
def update_idea(
    idea_id: int,
    payload: IdeaUpdate,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Idea:
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(idea, k, v)
    db.commit()
    db.refresh(idea)
    return idea


@router.post("/{idea_id}/re-enrich", response_model=IdeaOut)
def re_enrich(
    idea_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    background: BackgroundTasks,
) -> Idea:
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404)
    idea.enrichment_status = "pending"
    idea.enrichment_error = None
    db.commit()
    db.refresh(idea)
    background.add_task(enrich_idea_async, idea.id)
    return idea


@router.delete("/{idea_id}", status_code=204, response_class=Response)
def delete_idea(
    idea_id: int,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    idea = db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404)
    db.delete(idea)
    db.commit()
    return Response(status_code=204)
