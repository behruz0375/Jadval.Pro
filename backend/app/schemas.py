from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["owner", "director", "deputy", "teacher", "student"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------

class LoginIn(BaseModel):
    login: str
    password: str


class RegisterIn(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=4, max_length=128)
    role: Role = "director"
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    school_name: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=4, max_length=128)


class UserOut(ORMModel):
    id: int
    login: str
    role: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    school_id: Optional[int] = None
    linked_entity_id: Optional[str] = None
    active: bool = True
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserCreateIn(BaseModel):
    login: str
    password: str
    role: Role
    full_name: Optional[str] = None
    phone: Optional[str] = None
    school_id: Optional[int] = None
    linked_entity_id: Optional[str] = None


# ---------- Customers ----------

class CustomerIn(BaseModel):
    name: str
    director: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = None
    login: Optional[str] = None
    password_plain: Optional[str] = None
    plan: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True
    expires_at: Optional[datetime] = None


class CustomerOut(ORMModel):
    id: int
    name: str
    director: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = None
    login: Optional[str] = None
    password_plain: Optional[str] = None
    plan: Optional[str] = None
    notes: Optional[str] = None
    active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    school_id: Optional[int] = None


# ---------- School ----------

class SchoolIn(BaseModel):
    name: str
    director: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    inn: Optional[str] = None
    logo_data_url: Optional[str] = None
    days_per_week: int = 6
    max_lessons_per_day: int = 8
    settings_json: Optional[str] = None


class SchoolOut(ORMModel):
    id: int
    name: str
    director: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    inn: Optional[str] = None
    logo_data_url: Optional[str] = None
    days_per_week: int
    max_lessons_per_day: int
    settings_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------- Entities ----------

class EntityBase(BaseModel):
    name: str
    short: Optional[str] = None
    order_index: int = 0


class BuildingIn(EntityBase):
    transit_json: Optional[str] = None


class BuildingOut(ORMModel):
    id: int
    school_id: int
    name: str
    short: Optional[str] = None
    transit_json: Optional[str] = None
    order_index: int


class ClassIn(EntityBase):
    grade: Optional[int] = None
    stream: Optional[str] = None
    students: int = 0
    building_id: Optional[int] = None
    home_room_id: Optional[int] = None
    availability_json: Optional[str] = None
    color: Optional[str] = None


class ClassOut(ORMModel):
    id: int
    school_id: int
    name: str
    short: Optional[str] = None
    grade: Optional[int] = None
    stream: Optional[str] = None
    students: int
    building_id: Optional[int] = None
    home_room_id: Optional[int] = None
    availability_json: Optional[str] = None
    color: Optional[str] = None
    order_index: int


class SubjectIn(EntityBase):
    color: Optional[str] = None


class SubjectOut(ORMModel):
    id: int
    school_id: int
    name: str
    short: Optional[str] = None
    color: Optional[str] = None
    order_index: int


class TeacherIn(EntityBase):
    phone: Optional[str] = None
    daily_capacity: int = 6
    weekly_max: int = 24
    methodical_day: Optional[int] = None
    color: Optional[str] = None
    availability_json: Optional[str] = None


class TeacherOut(ORMModel):
    id: int
    school_id: int
    name: str
    short: Optional[str] = None
    phone: Optional[str] = None
    daily_capacity: int
    weekly_max: int
    methodical_day: Optional[int] = None
    color: Optional[str] = None
    availability_json: Optional[str] = None
    order_index: int


class RoomIn(EntityBase):
    capacity: int = 30
    kind: Optional[str] = None
    building_id: Optional[int] = None
    availability_json: Optional[str] = None


class RoomOut(ORMModel):
    id: int
    school_id: int
    name: str
    short: Optional[str] = None
    capacity: int
    kind: Optional[str] = None
    building_id: Optional[int] = None
    availability_json: Optional[str] = None
    order_index: int


class LessonIn(BaseModel):
    class_ids: list[int]
    subject_id: int
    teacher_id: int
    room_id: Optional[int] = None
    hours_per_week: float = 1.0
    max_per_day: int = 0
    week_type: Literal["all", "num", "den"] = "all"
    pinned: Optional[list[dict[str, Any]]] = None
    notes: Optional[str] = None


class LessonOut(ORMModel):
    id: int
    school_id: int
    class_ids_json: str
    subject_id: int
    teacher_id: int
    room_id: Optional[int] = None
    hours_per_week: float
    max_per_day: int
    week_type: str
    pinned_json: Optional[str] = None
    notes: Optional[str] = None


# ---------- Timetable ----------

class TimetableIn(BaseModel):
    name: str = "Jadval"
    is_working: bool = False
    entries: list[dict[str, Any]]
    stats: Optional[dict[str, Any]] = None
    seed: Optional[int] = None


class TimetableOut(ORMModel):
    id: int
    school_id: int
    name: str
    is_working: bool
    entries_json: str
    stats_json: Optional[str] = None
    seed: Optional[int] = None
    created_at: datetime
    updated_at: datetime


# ---------- Snapshot (full project) ----------

class SnapshotIn(BaseModel):
    label: Optional[str] = None
    data: dict[str, Any]


class SnapshotOut(ORMModel):
    id: int
    school_id: int
    label: Optional[str] = None
    size_bytes: int
    created_by: Optional[str] = None
    created_at: datetime


class SnapshotDetail(SnapshotOut):
    data_json: str


# ---------- Generation ----------

class GenerateIn(BaseModel):
    options: Optional[dict[str, Any]] = None


class GenerationJobOut(ORMModel):
    id: str
    school_id: int
    status: str
    progress: int
    message: Optional[str] = None
    options_json: Optional[str] = None
    result_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------- Audit ----------

class AuditLogOut(ORMModel):
    id: int
    at: datetime
    user_login: Optional[str] = None
    user_role: Optional[str] = None
    school_id: Optional[int] = None
    action: str
    detail_json: Optional[str] = None
    ip: Optional[str] = None


TokenOut.model_rebuild()
