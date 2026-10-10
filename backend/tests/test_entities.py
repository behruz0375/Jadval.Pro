import uuid

import pytest


@pytest.fixture
def director_headers(client):
    login = "dir_ent_" + uuid.uuid4().hex[:8]
    r = client.post(
        "/api/auth/register",
        json={
            "login": login,
            "password": "pass1234",
            "role": "director",
            "school_name": f"Ent {login}",
        },
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_class_subject_teacher_room_lesson_crud(client, director_headers):
    # Class
    r = client.post("/api/classes", headers=director_headers, json={"name": "5-A", "grade": 5, "students": 28})
    assert r.status_code == 201, r.text
    class_id = r.json()["id"]

    # Subject
    r = client.post("/api/subjects", headers=director_headers, json={"name": "Matematika", "short": "Mat"})
    assert r.status_code == 201
    subj_id = r.json()["id"]

    # Teacher
    r = client.post(
        "/api/teachers",
        headers=director_headers,
        json={"name": "Aliyev V.", "daily_capacity": 6, "weekly_max": 24},
    )
    assert r.status_code == 201
    tch_id = r.json()["id"]

    # Room
    r = client.post("/api/rooms", headers=director_headers, json={"name": "Xona 101", "capacity": 30})
    assert r.status_code == 201
    room_id = r.json()["id"]

    # Lesson
    r = client.post(
        "/api/lessons",
        headers=director_headers,
        json={
            "class_ids": [class_id],
            "subject_id": subj_id,
            "teacher_id": tch_id,
            "room_id": room_id,
            "hours_per_week": 4,
        },
    )
    assert r.status_code == 201, r.text

    # Lists
    for path in ["classes", "subjects", "teachers", "rooms", "lessons"]:
        r = client.get(f"/api/{path}", headers=director_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1


def test_entity_cross_school_isolation(client, director_headers):
    # Create a class as the first director
    r = client.post("/api/classes", headers=director_headers, json={"name": "6-A", "grade": 6, "students": 25})
    assert r.status_code == 201
    foreign_class = r.json()["id"]

    # Register a different director
    other_login = "dir_other_" + uuid.uuid4().hex[:8]
    r = client.post(
        "/api/auth/register",
        json={"login": other_login, "password": "pass1234", "role": "director", "school_name": "Other"},
    )
    assert r.status_code == 200, r.text
    other_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # The other director's listing must not include the foreign class
    r = client.get("/api/classes", headers=other_headers)
    assert r.status_code == 200
    assert not any(c["id"] == foreign_class for c in r.json())

    # The other director must not be able to edit it either
    r = client.put(f"/api/classes/{foreign_class}", headers=other_headers, json={"name": "hacked"})
    assert r.status_code == 404
