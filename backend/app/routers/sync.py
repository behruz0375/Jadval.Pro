"""Full project snapshot sync — upload/download the whole `.jadval`-like JSON blob."""
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, DbSession, SchoolId, require_role
from ..models import ProjectSnapshot
from ..schemas import SnapshotDetail, SnapshotIn, SnapshotOut

router = APIRouter(prefix="/api/sync", tags=["sync"], dependencies=[Depends(require_role("director", "deputy", "owner"))])

MAX_SNAPSHOTS = 20


@router.get("/snapshots", response_model=list[SnapshotOut])
def list_snapshots(school_id: SchoolId, db: DbSession):
    stmt = (
        select(ProjectSnapshot)
        .where(ProjectSnapshot.school_id == school_id)
        .order_by(ProjectSnapshot.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


@router.post("/snapshots", response_model=SnapshotOut, status_code=201)
def upload_snapshot(data: SnapshotIn, school_id: SchoolId, db: DbSession, user: CurrentUser):
    body = json.dumps(data.data, ensure_ascii=False, separators=(",", ":"))
    row = ProjectSnapshot(
        school_id=school_id,
        label=data.label,
        data_json=body,
        size_bytes=len(body.encode("utf-8")),
        created_by=user.login,
    )
    db.add(row); db.flush()

    # keep only the latest MAX_SNAPSHOTS per school
    older = (
        db.execute(
            select(ProjectSnapshot)
            .where(ProjectSnapshot.school_id == school_id)
            .order_by(ProjectSnapshot.created_at.desc())
            .offset(MAX_SNAPSHOTS)
        )
        .scalars()
        .all()
    )
    for extra in older:
        db.delete(extra)

    db.commit(); db.refresh(row)
    return row


@router.get("/snapshots/{snap_id}", response_model=SnapshotDetail)
def download_snapshot(snap_id: int, school_id: SchoolId, db: DbSession):
    row = db.get(ProjectSnapshot, snap_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    return row


@router.get("/snapshots/{snap_id}/raw")
def download_snapshot_raw(snap_id: int, school_id: SchoolId, db: DbSession) -> dict:
    row = db.get(ProjectSnapshot, snap_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    return json.loads(row.data_json)


@router.delete("/snapshots/{snap_id}", status_code=204)
def delete_snapshot(snap_id: int, school_id: SchoolId, db: DbSession):
    row = db.get(ProjectSnapshot, snap_id)
    if not row or row.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    db.delete(row); db.commit()
