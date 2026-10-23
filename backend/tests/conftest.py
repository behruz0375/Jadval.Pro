"""Pytest fixtures: isolated SQLite DB per test, FastAPI TestClient."""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point the app at a fresh file DB BEFORE importing it
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["OWNER_LOGIN"] = "admin"
os.environ["OWNER_PASSWORD"] = "admin-test"
os.environ["ALLOW_PUBLIC_REGISTRATION"] = "true"

from app import database  # noqa: E402
from app.config import settings  # noqa: E402
from app.deps import get_db  # noqa: E402
from app.main import app  # noqa: E402


# Rebuild engine against the test DB (the module-level engine was built with
# the default URL before our env override was in effect for a cached setting).
_engine = create_engine(f"sqlite:///{_db_path}", connect_args={"check_same_thread": False}, future=True)
_TestSession = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
database.engine = _engine
database.SessionLocal = _TestSession


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session", autouse=True)
def _init_schema():
    database.Base.metadata.drop_all(_engine)
    database.Base.metadata.create_all(_engine)
    # Create admin owner (what main.py's lifespan would do)
    from app.models import User
    from app.security import hash_password

    with _TestSession() as db:
        db.add(
            User(
                login=settings.owner_login,
                password_hash=hash_password(settings.owner_password),
                role="owner",
            )
        )
        db.commit()
    yield
    try:
        os.unlink(_db_path)
    except OSError:
        pass


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_token(client: TestClient) -> str:
    r = client.post(
        "/api/auth/login-json",
        json={"login": "admin", "password": "admin-test"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}
