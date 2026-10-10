"""Generic CRUD routers for classes, subjects, teachers, rooms, buildings, lessons."""
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import DbSession, SchoolId, require_role
from ..models import Building, Lesson, Room, SchoolClass, Subject, Teacher
from ..schemas import (
    BuildingIn,
    BuildingOut,
    ClassIn,
    ClassOut,
    LessonIn,
    LessonOut,
    RoomIn,
    RoomOut,
    SubjectIn,
    SubjectOut,
    TeacherIn,
    TeacherOut,
)

STAFF = Depends(require_role("director", "deputy", "owner"))


def _list(db: Session, model, school_id: int):
    stmt = select(model).where(model.school_id == school_id).order_by(model.order_index, model.id)
    return list(db.execute(stmt).scalars().all())


def _get_or_404(db: Session, model, item_id: int, school_id: int):
    row = db.get(model, item_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    return row


# ===== Buildings =====

buildings = APIRouter(prefix="/api/buildings", tags=["buildings"], dependencies=[STAFF])


@buildings.get("", response_model=list[BuildingOut])
def list_buildings(school_id: SchoolId, db: DbSession):
    return _list(db, Building, school_id)


@buildings.post("", response_model=BuildingOut, status_code=201)
def create_building(data: BuildingIn, school_id: SchoolId, db: DbSession):
    row = Building(school_id=school_id, **data.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@buildings.put("/{item_id}", response_model=BuildingOut)
def update_building(item_id: int, data: BuildingIn, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Building, item_id, school_id)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@buildings.delete("/{item_id}", status_code=204)
def delete_building(item_id: int, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Building, item_id, school_id)
    db.delete(row); db.commit()


# ===== Classes =====

classes = APIRouter(prefix="/api/classes", tags=["classes"], dependencies=[STAFF])


@classes.get("", response_model=list[ClassOut])
def list_classes(school_id: SchoolId, db: DbSession):
    return _list(db, SchoolClass, school_id)


@classes.post("", response_model=ClassOut, status_code=201)
def create_class(data: ClassIn, school_id: SchoolId, db: DbSession):
    row = SchoolClass(school_id=school_id, **data.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@classes.put("/{item_id}", response_model=ClassOut)
def update_class(item_id: int, data: ClassIn, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, SchoolClass, item_id, school_id)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@classes.delete("/{item_id}", status_code=204)
def delete_class(item_id: int, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, SchoolClass, item_id, school_id)
    db.delete(row); db.commit()


# ===== Subjects =====

subjects = APIRouter(prefix="/api/subjects", tags=["subjects"], dependencies=[STAFF])


@subjects.get("", response_model=list[SubjectOut])
def list_subjects(school_id: SchoolId, db: DbSession):
    return _list(db, Subject, school_id)


@subjects.post("", response_model=SubjectOut, status_code=201)
def create_subject(data: SubjectIn, school_id: SchoolId, db: DbSession):
    row = Subject(school_id=school_id, **data.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@subjects.put("/{item_id}", response_model=SubjectOut)
def update_subject(item_id: int, data: SubjectIn, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Subject, item_id, school_id)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@subjects.delete("/{item_id}", status_code=204)
def delete_subject(item_id: int, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Subject, item_id, school_id)
    db.delete(row); db.commit()


# ===== Teachers =====

teachers = APIRouter(prefix="/api/teachers", tags=["teachers"], dependencies=[STAFF])


@teachers.get("", response_model=list[TeacherOut])
def list_teachers(school_id: SchoolId, db: DbSession):
    return _list(db, Teacher, school_id)


@teachers.post("", response_model=TeacherOut, status_code=201)
def create_teacher(data: TeacherIn, school_id: SchoolId, db: DbSession):
    row = Teacher(school_id=school_id, **data.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@teachers.put("/{item_id}", response_model=TeacherOut)
def update_teacher(item_id: int, data: TeacherIn, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Teacher, item_id, school_id)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@teachers.delete("/{item_id}", status_code=204)
def delete_teacher(item_id: int, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Teacher, item_id, school_id)
    db.delete(row); db.commit()


# ===== Rooms =====

rooms = APIRouter(prefix="/api/rooms", tags=["rooms"], dependencies=[STAFF])


@rooms.get("", response_model=list[RoomOut])
def list_rooms(school_id: SchoolId, db: DbSession):
    return _list(db, Room, school_id)


@rooms.post("", response_model=RoomOut, status_code=201)
def create_room(data: RoomIn, school_id: SchoolId, db: DbSession):
    row = Room(school_id=school_id, **data.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@rooms.put("/{item_id}", response_model=RoomOut)
def update_room(item_id: int, data: RoomIn, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Room, item_id, school_id)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return row


@rooms.delete("/{item_id}", status_code=204)
def delete_room(item_id: int, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Room, item_id, school_id)
    db.delete(row); db.commit()


# ===== Lessons =====

lessons = APIRouter(prefix="/api/lessons", tags=["lessons"], dependencies=[STAFF])


def _lesson_to_dict(row: Lesson) -> dict:
    return {
        "id": row.id,
        "school_id": row.school_id,
        "class_ids_json": row.class_ids_json,
        "subject_id": row.subject_id,
        "teacher_id": row.teacher_id,
        "room_id": row.room_id,
        "hours_per_week": row.hours_per_week,
        "max_per_day": row.max_per_day,
        "week_type": row.week_type,
        "pinned_json": row.pinned_json,
        "notes": row.notes,
    }


@lessons.get("", response_model=list[LessonOut])
def list_lessons(school_id: SchoolId, db: DbSession):
    rows = db.execute(select(Lesson).where(Lesson.school_id == school_id).order_by(Lesson.id)).scalars().all()
    return list(rows)


@lessons.post("", response_model=LessonOut, status_code=201)
def create_lesson(data: LessonIn, school_id: SchoolId, db: DbSession):
    row = Lesson(
        school_id=school_id,
        class_ids_json=json.dumps(data.class_ids),
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        room_id=data.room_id,
        hours_per_week=data.hours_per_week,
        max_per_day=data.max_per_day,
        week_type=data.week_type,
        pinned_json=json.dumps(data.pinned) if data.pinned else None,
        notes=data.notes,
    )
    db.add(row); db.commit(); db.refresh(row)
    return row


@lessons.put("/{item_id}", response_model=LessonOut)
def update_lesson(item_id: int, data: LessonIn, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Lesson, item_id, school_id)
    row.class_ids_json = json.dumps(data.class_ids)
    row.subject_id = data.subject_id
    row.teacher_id = data.teacher_id
    row.room_id = data.room_id
    row.hours_per_week = data.hours_per_week
    row.max_per_day = data.max_per_day
    row.week_type = data.week_type
    row.pinned_json = json.dumps(data.pinned) if data.pinned else None
    row.notes = data.notes
    db.commit(); db.refresh(row)
    return row


@lessons.delete("/{item_id}", status_code=204)
def delete_lesson(item_id: int, school_id: SchoolId, db: DbSession):
    row = _get_or_404(db, Lesson, item_id, school_id)
    db.delete(row); db.commit()
