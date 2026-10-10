import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, DbSession, SchoolId, require_role
from ..models import Timetable
from ..schemas import TimetableIn, TimetableOut

router = APIRouter(prefix="/api/timetables", tags=["timetables"])

STAFF = Depends(require_role("director", "deputy", "owner"))


@router.get("", response_model=list[TimetableOut])
def list_timetables(school_id: SchoolId, db: DbSession, user: CurrentUser):
    stmt = select(Timetable).where(Timetable.school_id == school_id).order_by(Timetable.updated_at.desc())
    return list(db.execute(stmt).scalars().all())


@router.get("/working", response_model=TimetableOut | None)
def get_working(school_id: SchoolId, db: DbSession, user: CurrentUser):
    return db.scalar(
        select(Timetable).where(Timetable.school_id == school_id, Timetable.is_working == True)  # noqa: E712
    )


@router.get("/{item_id}", response_model=TimetableOut)
def get_timetable(item_id: int, school_id: SchoolId, db: DbSession, user: CurrentUser):
    row = db.get(Timetable, item_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    return row


@router.post("", response_model=TimetableOut, status_code=201, dependencies=[STAFF])
def create_timetable(data: TimetableIn, school_id: SchoolId, db: DbSession):
    if data.is_working:
        for other in db.execute(
            select(Timetable).where(Timetable.school_id == school_id, Timetable.is_working == True)  # noqa: E712
        ).scalars():
            other.is_working = False
    row = Timetable(
        school_id=school_id,
        name=data.name,
        is_working=data.is_working,
        entries_json=json.dumps(data.entries),
        stats_json=json.dumps(data.stats) if data.stats else None,
        seed=data.seed,
    )
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.put("/{item_id}", response_model=TimetableOut, dependencies=[STAFF])
def update_timetable(item_id: int, data: TimetableIn, school_id: SchoolId, db: DbSession):
    row = db.get(Timetable, item_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    if data.is_working and not row.is_working:
        for other in db.execute(
            select(Timetable).where(Timetable.school_id == school_id, Timetable.is_working == True)  # noqa: E712
        ).scalars():
            other.is_working = False
    row.name = data.name
    row.is_working = data.is_working
    row.entries_json = json.dumps(data.entries)
    row.stats_json = json.dumps(data.stats) if data.stats else None
    row.seed = data.seed
    db.commit(); db.refresh(row)
    return row


@router.delete("/{item_id}", status_code=204, dependencies=[STAFF])
def delete_timetable(item_id: int, school_id: SchoolId, db: DbSession):
    row = db.get(Timetable, item_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    db.delete(row); db.commit()
