import time
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select

from ..config import settings
from ..deps import CurrentUser, DbSession
from ..models import AuditLog, School, User
from ..schemas import ChangePasswordIn, LoginIn, RegisterIn, TokenOut, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Parolni terib topishdan himoya: bir login uchun 5 ta xato urinishdan keyin 60 soniya kutish ---
_MAX_FAILS = 5
_LOCK_SECONDS = 60
_FAILS: dict[str, tuple[int, float]] = {}  # login -> (xato urinishlar, bloklanish tugash vaqti)


def norm_login(login: str) -> str:
    """Login katta-kichik harfga va bo'sh joyga bog'liq emas (frontend ham shunday)."""
    return login.strip().lower()


def _check_lock(login: str) -> None:
    rec = _FAILS.get(norm_login(login))
    if not rec:
        return
    count, locked_until = rec
    now = time.time()
    if locked_until > now:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Juda ko'p urinish — {int(locked_until - now) + 1} soniyadan keyin qayta urining",
        )
    if locked_until:  # blok tugadi — hisob qaytadan
        _FAILS.pop(norm_login(login), None)


def _record_fail(login: str) -> None:
    if len(_FAILS) > 5000:
        _FAILS.clear()
    key = norm_login(login)
    count = _FAILS.get(key, (0, 0.0))[0] + 1
    _FAILS[key] = (count, time.time() + _LOCK_SECONDS) if count >= _MAX_FAILS else (count, 0.0)


def _record_ok(login: str) -> None:
    _FAILS.pop(norm_login(login), None)


def _find_user(db: DbSession, login: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.login) == norm_login(login)))


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
    # Ochiq ro'yxatdan o'tish yopiq: login/parolni admin beradi (POST /api/customers, faqat owner).
    if not settings.allow_public_registration:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Ro'yxatdan o'tish yopiq. Login va parolni admin beradi — Telegram orqali bog'laning.",
        )
    # Ochiq ro'yxatdan faqat direktor hisobi ochiladi — owner/deputy/teacher/student hech qachon.
    if data.role != "director":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faqat direktor hisobini ochish mumkin")
    login = norm_login(data.login)
    if _find_user(db, login):
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu login allaqachon band")

    school_id: int | None = None
    if data.school_name:
        school = School(name=data.school_name, director=data.full_name)
        db.add(school)
        db.flush()
        school_id = school.id

    user = User(
        login=login,
        password_hash=hash_password(data.password),
        role="director",
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


def _authenticate(db: DbSession, login: str, password: str) -> TokenOut:
    _check_lock(login)
    user = _find_user(db, login)
    if not user or not verify_password(password, user.password_hash):
        _record_fail(login)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login yoki parol noto'g'ri")
    if not user.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Hisob bloklangan")
    _record_ok(login)
    user.last_login_at = datetime.now(timezone.utc)
    _audit(db, user, "login")
    db.commit()
    return _issue_token(user)


@router.post("/login", response_model=TokenOut)
def login_oauth(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
) -> TokenOut:
    """Standard OAuth2 form login — Swagger UI uses this. JSON clients use /login-json."""
    return _authenticate(db, form.username, form.password)


@router.post("/login-json", response_model=TokenOut)
def login_json(data: LoginIn, db: DbSession) -> TokenOut:
    return _authenticate(db, data.login, data.password)


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
