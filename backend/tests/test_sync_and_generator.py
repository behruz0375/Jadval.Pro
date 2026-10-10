import uuid

import pytest


@pytest.fixture
def director_headers(client):
    login = "dir_sg_" + uuid.uuid4().hex[:8]
    r = client.post(
        "/api/auth/register",
        json={"login": login, "password": "pass1234", "role": "director", "school_name": f"SG {login}"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_snapshot_upload_list_download_delete(client, director_headers):
    payload = {"label": "First", "data": {"school": {"name": "X"}, "classes": [{"id": 1, "name": "5-A"}]}}
    r = client.post("/api/sync/snapshots", headers=director_headers, json=payload)
    assert r.status_code == 201
    sid = r.json()["id"]

    r = client.get("/api/sync/snapshots", headers=director_headers)
    assert r.status_code == 200
    assert any(s["id"] == sid for s in r.json())

    r = client.get(f"/api/sync/snapshots/{sid}/raw", headers=director_headers)
    assert r.status_code == 200
    assert r.json()["classes"][0]["name"] == "5-A"

    r = client.delete(f"/api/sync/snapshots/{sid}", headers=director_headers)
    assert r.status_code == 204


def test_generator_run_direct(client, director_headers):
    project = {
        "school": {"id": 1, "name": "test", "daysPerWeek": 6, "maxLessonsPerDay": 8},
        "classes": [{"id": "c1", "name": "5-A"}],
        "subjects": [{"id": "s1", "name": "Mat"}],
        "teachers": [{"id": "t1", "name": "A", "dailyCapacity": 6, "weeklyMax": 24}],
        "rooms": [{"id": "r1", "name": "101"}],
        "lessons": [
            {
                "id": "L1",
                "classIds": ["c1"],
                "subjectId": "s1",
                "teacherId": "t1",
                "roomId": "r1",
                "hoursPerWeek": 4,
                "maxPerDay": 1,
            }
        ],
    }
    r = client.post(
        "/api/generator/run-direct",
        headers=director_headers,
        json={"project": project, "options": {"restarts": 2, "maxLessonsPerClassDay": 6}},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["stats"]["placed"] == 4
    assert body["stats"]["unplaced"] == 0
    assert len(body["entries"]) == 4
    # Each entry should have classIds, teacherId, day, period, lessonId
    e = body["entries"][0]
    assert "classIds" in e and "teacherId" in e and "day" in e and "period" in e


def test_generator_background_job(client, director_headers):
    # Create some entities and lessons so the job has something to place
    for name in ["5-A"]:
        client.post("/api/classes", headers=director_headers, json={"name": name, "grade": 5, "students": 25})
    r = client.get("/api/classes", headers=director_headers)
    class_id = r.json()[0]["id"]
    r = client.post("/api/subjects", headers=director_headers, json={"name": "Matematika"})
    subj_id = r.json()["id"]
    r = client.post("/api/teachers", headers=director_headers, json={"name": "A", "daily_capacity": 6, "weekly_max": 24})
    tch_id = r.json()["id"]
    client.post(
        "/api/lessons",
        headers=director_headers,
        json={
            "class_ids": [class_id],
            "subject_id": subj_id,
            "teacher_id": tch_id,
            "hours_per_week": 3,
        },
    )

    r = client.post(
        "/api/generator/start",
        headers=director_headers,
        json={"options": {"restarts": 1, "maxLessonsPerClassDay": 6}},
    )
    assert r.status_code == 202, r.text
    job = r.json()
    assert job["status"] in {"queued", "running", "done"}

    # Poll
    for _ in range(20):
        r = client.get(f"/api/generator/jobs/{job['id']}", headers=director_headers)
        if r.json()["status"] in {"done", "error", "cancelled"}:
            break
    assert r.json()["status"] == "done", r.text
