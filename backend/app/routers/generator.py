"""Server-side timetable generation — background task."""
import json
import threading
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select

from ..database import SessionLocal
from ..deps import CurrentUser, DbSession, SchoolId, require_role
from ..models import (
    GenerationJob,
    Lesson,
    Room,
    School,
    SchoolClass,
    Subject,
    Teacher,
    Timetable,
)
from ..schemas import GenerateIn, GenerationJobOut
from ..services.generator import generate_timetable

router = APIRouter(prefix="/api/generator", tags=["generator"], dependencies=[Depends(require_role("director", "deputy", "owner"))])

_JOB_CANCEL: dict[str, threading.Event] = {}


def _build_project(db, school_id: int) -> dict:
    school = db.get(School, school_id)
    classes = db.execute(select(SchoolClass).where(SchoolClass.school_id == school_id)).scalars().all()
    subjects = db.execute(select(Subject).where(Subject.school_id == school_id)).scalars().all()
    teachers = db.execute(select(Teacher).where(Teacher.school_id == school_id)).scalars().all()
    rooms = db.execute(select(Room).where(Room.school_id == school_id)).scalars().all()
    lessons = db.execute(select(Lesson).where(Lesson.school_id == school_id)).scalars().all()

    return {
        "school": {
            "id": school.id,
            "name": school.name,
            "daysPerWeek": school.days_per_week,
            "maxLessonsPerDay": school.max_lessons_per_day,
        },
        "classes": [
            {
                "id": c.id,
                "name": c.name,
                "availabilityJson": c.availability_json,
                "buildingId": c.building_id,
            }
            for c in classes
        ],
        "subjects": [{"id": s.id, "name": s.name} for s in subjects],
        "teachers": [
            {
                "id": t.id,
                "name": t.name,
                "dailyCapacity": t.daily_capacity,
                "weeklyMax": t.weekly_max,
                "availabilityJson": t.availability_json,
            }
            for t in teachers
        ],
        "rooms": [
            {
                "id": r.id,
                "name": r.name,
                "availabilityJson": r.availability_json,
                "buildingId": r.building_id,
            }
            for r in rooms
        ],
        "lessons": [
            {
                "id": lesson.id,
                "classIds": json.loads(lesson.class_ids_json),
                "subjectId": lesson.subject_id,
                "teacherId": lesson.teacher_id,
                "roomId": lesson.room_id,
                "hoursPerWeek": lesson.hours_per_week,
                "maxPerDay": lesson.max_per_day,
            }
            for lesson in lessons
        ],
    }


def _run_job(job_id: str, school_id: int, options: dict) -> None:
    cancel = threading.Event()
    _JOB_CANCEL[job_id] = cancel

    db = SessionLocal()
    try:
        job = db.get(GenerationJob, job_id)
        if not job:
            return
        job.status = "running"
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        project = _build_project(db, school_id)

        def on_progress(p: int, msg: str) -> None:
            if cancel.is_set():
                return
            j = db.get(GenerationJob, job_id)
            if j:
                j.progress = max(0, min(100, int(p)))
                j.message = msg
                j.updated_at = datetime.now(timezone.utc)
                db.commit()

        result = generate_timetable(project, options, on_progress=on_progress)

        if cancel.is_set():
            job = db.get(GenerationJob, job_id)
            if job:
                job.status = "cancelled"
                job.updated_at = datetime.now(timezone.utc)
                db.commit()
            return

        # save as a new timetable
        tt = Timetable(
            school_id=school_id,
            name=f"Server-generated #{job_id[:8]}",
            is_working=False,
            entries_json=json.dumps(result["entries"]),
            stats_json=json.dumps(result.get("stats")),
            seed=result.get("seed"),
        )
        db.add(tt); db.flush()

        job = db.get(GenerationJob, job_id)
        if job:
            job.status = "done"
            job.progress = 100
            job.message = f"Joylashtirildi: {result['stats']['placed']}/{result['stats']['totalSessions']}"
            job.result_json = json.dumps({"timetableId": tt.id, "stats": result.get("stats")})
            job.updated_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:  # noqa: BLE001
        db.rollback()
        job = db.get(GenerationJob, job_id)
        if job:
            job.status = "error"
            job.message = str(e)[:1000]
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        _JOB_CANCEL.pop(job_id, None)
        db.close()


@router.post("/start", response_model=GenerationJobOut, status_code=202)
def start_generation(
    data: GenerateIn,
    background: BackgroundTasks,
    school_id: SchoolId,
    db: DbSession,
    user: CurrentUser,
):
    job_id = uuid.uuid4().hex
    options = data.options or {}
    job = GenerationJob(
        id=job_id,
        school_id=school_id,
        status="queued",
        options_json=json.dumps(options),
    )
    db.add(job); db.commit(); db.refresh(job)

    background.add_task(_run_job, job_id, school_id, options)
    return job


@router.get("/jobs/{job_id}", response_model=GenerationJobOut)
def get_job(job_id: str, school_id: SchoolId, db: DbSession):
    row = db.get(GenerationJob, job_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    return row


@router.post("/jobs/{job_id}/cancel", response_model=GenerationJobOut)
def cancel_job(job_id: str, school_id: SchoolId, db: DbSession):
    row = db.get(GenerationJob, job_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    if row.status in {"queued", "running"}:
        cancel = _JOB_CANCEL.get(job_id)
        if cancel:
            cancel.set()
        row.status = "cancelled"
        row.updated_at = datetime.now(timezone.utc)
        db.commit()
    db.refresh(row)
    return row


@router.get("/jobs", response_model=list[GenerationJobOut])
def list_jobs(school_id: SchoolId, db: DbSession):
    stmt = select(GenerationJob).where(GenerationJob.school_id == school_id).order_by(GenerationJob.created_at.desc()).limit(50)
    return list(db.execute(stmt).scalars().all())
