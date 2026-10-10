from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings
from .database import SessionLocal, init_db
from .models import User
from .routers import auth, customers, entities, generator, schools, sync, timetables
from .security import hash_password


def _ensure_owner_account() -> None:
    """Create the admin owner account on first run (reads credentials from settings)."""
    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.role == "owner"))
        if existing:
            return
        owner = User(
            login=settings.owner_login,
            password_hash=hash_password(settings.owner_password),
            role="owner",
            full_name="Admin",
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(owner)
        db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    _ensure_owner_account()
    yield


app = FastAPI(
    title=settings.app_name,
    version="2026.1.0",
    description="JadvalPro backend — maktab dars jadvali uchun REST API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(schools.router)
app.include_router(entities.buildings)
app.include_router(entities.classes)
app.include_router(entities.subjects)
app.include_router(entities.teachers)
app.include_router(entities.rooms)
app.include_router(entities.lessons)
app.include_router(timetables.router)
app.include_router(sync.router)
app.include_router(generator.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name, "version": "2026.1.0"}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "openapi": "/openapi.json",
        "health": "/health",
    }
