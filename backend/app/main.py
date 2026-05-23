from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ai import get_provider
from .auth import CurrentUser
from .config import Settings, get_settings
from .db import init_db
from .routers import date_finder, dates, ideas, notifications, preferences
from .schemas import HealthOut, MeOut
from .services.notifications import notify_dates_today

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("datemgr")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    scheduler = AsyncIOScheduler()
    # Every day at 08:00 server-local-time: notify dates scheduled for today.
    scheduler.add_job(
        notify_dates_today,
        CronTrigger(hour=8, minute=0),
        id="notify_dates_today",
        replace_existing=True,
    )
    scheduler.start()
    log.info("Scheduler started, AI provider=%s", get_settings().ai_provider)

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(title="Date Manager", lifespan=lifespan)

# In production the frontend is served from the same origin via Nginx,
# so CORS is mostly relevant for local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthOut)
def health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthOut:
    provider = get_provider(settings)
    return HealthOut(
        status="ok",
        ai_provider=settings.ai_provider,
        ai_configured=provider.configured,
    )


@app.get("/api/me", response_model=MeOut)
def me(user: CurrentUser) -> MeOut:
    return MeOut(email=user.email, name=user.name)


app.include_router(ideas.router)
app.include_router(dates.router)
app.include_router(preferences.router)
app.include_router(date_finder.router)
app.include_router(notifications.router)
