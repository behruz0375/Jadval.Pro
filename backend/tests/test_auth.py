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
