def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_admin_login(client):
    r = client.post("/api/auth/login-json", json={"login": "admin", "password": "admin-test"})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["role"] == "owner"
    assert body["access_token"]


def test_login_bad_password(client):
    r = client.post("/api/auth/login-json", json={"login": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_me(client, admin_headers):
    r = client.get("/api/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["login"] == "admin"


def test_register_director_creates_school(client):
    r = client.post(
        "/api/auth/register",
        json={
            "login": "dir1",
            "password": "pass1234",
            "role": "director",
            "full_name": "Direktor A.",
            "school_name": "1-maktab",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "director"
    assert body["user"]["school_id"] is not None


def test_register_cannot_create_owner(client):
    for role in ("owner", "teacher", "student", "deputy"):
        r = client.post(
            "/api/auth/register",
            json={"login": f"evil_{role}", "password": "pass1234", "role": role},
        )
        assert r.status_code == 403, (role, r.text)
    r = client.post("/api/auth/login-json", json={"login": "evil_owner", "password": "pass1234"})
    assert r.status_code == 401


def test_register_closed_by_default(client):
    from app.config import settings

    settings.allow_public_registration = False
    try:
        r = client.post(
            "/api/auth/register",
            json={"login": "closed1", "password": "pass1234", "role": "director", "school_name": "X"},
        )
        assert r.status_code == 403
        assert "admin" in r.json()["detail"].lower()
    finally:
        settings.allow_public_registration = True


def test_login_is_case_insensitive_and_locks_after_failures(client):
    r = client.post("/api/auth/login-json", json={"login": "  ADMIN ", "password": "admin-test"})
    assert r.status_code == 200
    for _ in range(5):
        bad = client.post("/api/auth/login-json", json={"login": "lockme", "password": "wrong"})
        assert bad.status_code == 401
    locked = client.post("/api/auth/login-json", json={"login": "lockme", "password": "wrong"})
    assert locked.status_code == 429
