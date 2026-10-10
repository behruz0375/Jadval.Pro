from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from ..deps import CurrentUser, DbSession, require_role
from ..models import School, User
from ..schemas import SchoolIn, SchoolOut

router = APIRouter(prefix="/api/schools", tags=["schools"])


@router.get("/mine", response_model=SchoolOut | None)
def my_school(user: CurrentUser, db: DbSession) -> School | None:
    if not user.school_id:
        return None
    return db.get(School, user.school_id)


@router.put("/mine", response_model=SchoolOut)
def update_my_school(
    data: SchoolIn,
    db: DbSession,
    user: Annotated[User, Depends(require_role("director", "deputy"))],
) -> School:
    if not user.school_id:
        school = School(**data.model_dump())
        db.add(school)
        db.flush()
        user.school_id = school.id
    else:
        school = db.get(School, user.school_id)
        if not school:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Maktab topilmadi")
        for k, v in data.model_dump().items():
            setattr(school, k, v)
    db.commit()
    db.refresh(school)
    return school


@router.get("", response_model=list[SchoolOut], dependencies=[Depends(require_role("owner"))])
def list_schools(db: DbSession) -> list[School]:
    return list(db.execute(select(School).order_by(School.name)).scalars().all())
