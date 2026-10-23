from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from ..deps import DbSession, require_role
from ..models import Customer, School, User
from ..schemas import CustomerIn, CustomerOut
from ..security import hash_password
from .auth import norm_login

router = APIRouter(prefix="/api/customers", tags=["customers"], dependencies=[Depends(require_role("owner"))])

_MIN_PASSWORD = 4


def _login_taken(db: DbSession, login: str, exclude_user_id: int | None = None, exclude_customer_id: int | None = None) -> bool:
    users = select(User).where(func.lower(User.login) == login)
    if exclude_user_id is not None:
        users = users.where(User.id != exclude_user_id)
    if db.scalar(users):
        return True
    customers = select(Customer).where(func.lower(Customer.login) == login)
    if exclude_customer_id is not None:
        customers = customers.where(Customer.id != exclude_customer_id)
    return db.scalar(customers) is not None


def _director_of(db: DbSession, row: Customer) -> User | None:
    if not row.school_id:
        return None
    return db.scalar(select(User).where(User.school_id == row.school_id, User.role == "director").order_by(User.id))


def _create_director(db: DbSession, row: Customer, login: str, password: str, data: CustomerIn) -> None:
    """Mijoz uchun maktab va Zavuch (director) hisobini yaratadi — mijoz shu login/parol bilan saytga kira oladi."""
    school = School(name=data.name, director=data.director, phone=data.phone, region=data.region)
    db.add(school)
    db.flush()
    db.add(
        User(
            login=login,
            password_hash=hash_password(password),
            role="director",
            full_name=data.director,
            phone=data.phone,
            school_id=school.id,
            active=data.active,
        )
    )
    row.school_id = school.id


@router.get("", response_model=list[CustomerOut])
def list_customers(db: DbSession) -> list[Customer]:
    rows = db.execute(select(Customer).order_by(Customer.created_at.desc())).scalars().all()
    return list(rows)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerIn, db: DbSession) -> Customer:
    login = norm_login(data.login) if data.login else None
    if login:
        if _login_taken(db, login):
            raise HTTPException(status.HTTP_409_CONFLICT, "Bu login allaqachon band")
        if not data.password_plain or len(data.password_plain) < _MIN_PASSWORD:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Parol kamida {_MIN_PASSWORD} belgi bo'lsin")
    payload = data.model_dump()
    payload["login"] = login
    row = Customer(**payload)
    db.add(row)
    if login:
        _create_director(db, row, login, data.password_plain or "", data)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, data: CustomerIn, db: DbSession) -> Customer:
    row = db.get(Customer, customer_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    login = norm_login(data.login) if data.login else None
    director = _director_of(db, row)
    if login and _login_taken(db, login, exclude_user_id=director.id if director else None, exclude_customer_id=row.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu login allaqachon band")
    if login and data.password_plain and len(data.password_plain) < _MIN_PASSWORD:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Parol kamida {_MIN_PASSWORD} belgi bo'lsin")

    payload = data.model_dump()
    payload["login"] = login
    for key, value in payload.items():
        setattr(row, key, value)

    if director:
        # Mavjud Zavuch hisobini mijoz yozuvi bilan sinxronlaymiz (login, parol, bloklash, ism)
        if login:
            director.login = login
        director.active = data.active
        director.full_name = data.director
        director.phone = data.phone
        if data.password_plain:
            director.password_hash = hash_password(data.password_plain)
        if row.school_id:
            school = db.get(School, row.school_id)
            if school:
                school.name = data.name
                school.director = data.director
                school.phone = data.phone
                school.region = data.region
    elif login and data.password_plain and len(data.password_plain) >= _MIN_PASSWORD:
        # Hisobsiz (eski) mijozga birinchi marta Zavuch hisobi beriladi
        _create_director(db, row, login, data.password_plain, data)

    db.commit()
    db.refresh(row)
    return row


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: DbSession) -> None:
    row = db.get(Customer, customer_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    # Mijoz o'chirilsa — Zavuch hisobi bloklanadi (maktab ma'lumotlari saqlanib qoladi)
    director = _director_of(db, row)
    if director:
        director.active = False
    db.delete(row)
    db.commit()
