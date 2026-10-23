def test_customer_crud(client, admin_headers):
    # Create
    r = client.post(
        "/api/customers",
        headers=admin_headers,
        json={
            "name": "Test maktab",
            "director": "Alijonov A.",
            "login": "test1",
            "password_plain": "pass1234",
            "plan": "basic",
        },
    )
    assert r.status_code == 201, r.text
    cid = r.json()["id"]

    # List
    r = client.get("/api/customers", headers=admin_headers)
    assert r.status_code == 200
    assert any(c["id"] == cid for c in r.json())

    # Update
    r = client.put(
        f"/api/customers/{cid}",
        headers=admin_headers,
        json={"name": "Yangilangan maktab", "plan": "pro"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Yangilangan maktab"
    assert r.json()["plan"] == "pro"

    # Delete
    r = client.delete(f"/api/customers/{cid}", headers=admin_headers)
    assert r.status_code == 204
    r = client.get("/api/customers", headers=admin_headers)
    assert not any(c["id"] == cid for c in r.json())


def test_customers_require_owner(client):
    # Director cannot touch customers
    reg = client.post(
        "/api/auth/register",
        json={
            "login": "dir_cust",
            "password": "pass1234",
            "role": "director",
            "school_name": "X",
        },
    )
    dtoken = reg.json()["access_token"]
    r = client.get("/api/customers", headers={"Authorization": f"Bearer {dtoken}"})
    assert r.status_code == 403


def test_customer_gets_working_director_login(client, admin_headers):
    r = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Yangi maktab", "director": "Zavuch Z.", "login": "Zavuch1", "password_plain": "pass1234"},
    )
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["school_id"] is not None
    assert r.json()["login"] == "zavuch1"

    # Mijoz shu login/parol bilan kira oladi va faqat o'z maktabiga ega
    login = client.post("/api/auth/login-json", json={"login": "ZAVUCH1", "password": "pass1234"})
    assert login.status_code == 200, login.text
    assert login.json()["user"]["role"] == "director"
    assert login.json()["user"]["school_id"] == r.json()["school_id"]

    # Login band bo'lsa — 409
    dup = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Boshqa", "login": "zavuch1", "password_plain": "pass1234"},
    )
    assert dup.status_code == 409

    # Parolni o'zgartirish ishlaydi, eski parol endi o'tmaydi
    upd = client.put(
        f"/api/customers/{cid}",
        headers=admin_headers,
        json={"name": "Yangi maktab", "login": "zavuch1", "password_plain": "newpass99", "active": True},
    )
    assert upd.status_code == 200, upd.text
    assert client.post("/api/auth/login-json", json={"login": "zavuch1", "password": "pass1234"}).status_code == 401
    assert client.post("/api/auth/login-json", json={"login": "zavuch1", "password": "newpass99"}).status_code == 200

    # Bloklangan mijoz kira olmaydi
    blk = client.put(
        f"/api/customers/{cid}",
        headers=admin_headers,
        json={"name": "Yangi maktab", "login": "zavuch1", "password_plain": "newpass99", "active": False},
    )
    assert blk.status_code == 200
    assert client.post("/api/auth/login-json", json={"login": "zavuch1", "password": "newpass99"}).status_code == 403

    # O'chirilsa ham kira olmaydi
    client.put(
        f"/api/customers/{cid}",
        headers=admin_headers,
        json={"name": "Yangi maktab", "login": "zavuch1", "password_plain": "newpass99", "active": True},
    )
    assert client.delete(f"/api/customers/{cid}", headers=admin_headers).status_code == 204
    assert client.post("/api/auth/login-json", json={"login": "zavuch1", "password": "newpass99"}).status_code == 403
