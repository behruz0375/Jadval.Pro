from typing import Annotated, Iterator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User
from .security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    token: str | None = Depends(oauth2_scheme),
) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login talab qilinadi")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token noto'g'ri yoki muddati o'tgan")
    user_id = payload.get("uid")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token tarkibi noto'g'ri")
    user = db.get(User, user_id)
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Foydalanuvchi topilmadi yoki bloklangan")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*allowed: str):
    def _dep(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")
        return user

    return _dep


def require_school(user: CurrentUser) -> int:
    if not user.school_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Foydalanuvchiga maktab biriktirilmagan")
    return user.school_id


SchoolId = Annotated[int, Depends(require_school)]
