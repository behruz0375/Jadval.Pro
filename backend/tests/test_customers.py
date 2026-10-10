def test_customer_crud(client, admin_headers):
    # Create
    r = client.post(
        "/api/customers",
        headers=admin_headers,
        json={
            "name": "Test maktab",
            "director": "Alijonov A.",
            "login": "test1",
            "password_plain": "pw",
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
