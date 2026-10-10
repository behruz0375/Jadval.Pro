from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from ..deps import CurrentUser, DbSession
from ..models import AuditLog, School, User
from ..schemas import ChangePasswordIn, LoginIn, RegisterIn, TokenOut, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _audit(db: DbSession, user: User | None, action: str, detail: str | None = None) -> None:
    db.add(
        AuditLog(
            user_login=user.login if user else None,
            user_role=user.role if user else None,
            school_id=user.school_id if user else None,
            action=action,
            detail_json=detail,
        )
    )


def _issue_token(user: User) -> TokenOut:
    token = create_access_token(
        subject=user.login,
        extra={"uid": user.id, "role": user.role, "sid": user.school_id},
    )
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenOut)
def register(data: RegisterIn, db: DbSession) -> TokenOut:
    existing = db.scalar(select(User).where(User.login == data.login))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu login allaqachon band")

    school_id: int | None = None
    if data.role == "director" and data.school_name:
        school = School(name=data.school_name, director=data.full_name)
        db.add(school)
        db.flush()
        school_id = school.id

    user = User(
        login=data.login,
        password_hash=hash_password(data.password),
        role=data.role,
        full_name=data.full_name,
        phone=data.phone,
        email=data.email,
        school_id=school_id,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    _audit(db, user, "register")
    db.commit()
    db.refresh(user)
    return _issue_token(user)


@router.post("/login", response_model=TokenOut)
def login_oauth(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
) -> TokenOut:
    """Standard OAuth2 form login — Swagger UI uses this. JSON clients use /login-json."""
    user = db.scalar(select(User).where(User.login == form.username))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login yoki parol noto'g'ri")
    if not user.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Hisob bloklangan")
    user.last_login_at = datetime.now(timezone.utc)
    _audit(db, user, "login")
    db.commit()
    return _issue_token(user)


@router.post("/login-json", response_model=TokenOut)
def login_json(data: LoginIn, db: DbSession) -> TokenOut:
    user = db.scalar(select(User).where(User.login == data.login))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login yoki parol noto'g'ri")
    if not user.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Hisob bloklangan")
    user.last_login_at = datetime.now(timezone.utc)
    _audit(db, user, "login")
    db.commit()
    return _issue_token(user)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@router.post("/change-password", response_model=UserOut)
def change_password(data: ChangePasswordIn, user: CurrentUser, db: DbSession) -> User:
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Joriy parol noto'g'ri")
    user.password_hash = hash_password(data.new_password)
    _audit(db, user, "change-password")
    db.commit()
    db.refresh(user)
    return user


@router.post("/logout")
def logout(user: CurrentUser, db: DbSession) -> dict[str, bool]:
    _audit(db, user, "logout")
    db.commit()
    return {"ok": True}
