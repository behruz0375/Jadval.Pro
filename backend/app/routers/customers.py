from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from ..deps import DbSession, require_role
from ..models import Customer
from ..schemas import CustomerIn, CustomerOut

router = APIRouter(prefix="/api/customers", tags=["customers"], dependencies=[Depends(require_role("owner"))])


@router.get("", response_model=list[CustomerOut])
def list_customers(db: DbSession) -> list[Customer]:
    rows = db.execute(select(Customer).order_by(Customer.created_at.desc())).scalars().all()
    return list(rows)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerIn, db: DbSession) -> Customer:
    row = Customer(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, data: CustomerIn, db: DbSession) -> Customer:
    row = db.get(Customer, customer_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: DbSession) -> None:
    row = db.get(Customer, customer_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topilmadi")
    db.delete(row)
    db.commit()
