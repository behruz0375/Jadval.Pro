from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """A system user: owner (admin), director, deputy, teacher, student."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16))  # owner|director|deputy|teacher|student
    full_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    school_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schools.id"), nullable=True, index=True)
    linked_entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    school: Mapped[Optional[School]] = relationship(back_populates="users")


class Customer(Base):
    """Admin-tracked record of a paying customer school.

    Separate from `schools` so admin can register a sale before the client logs in.
    """

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    director: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    login: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    password_plain: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    plan: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    school_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schools.id"), nullable=True)


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    director: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    inn: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    logo_data_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    days_per_week: Mapped[int] = mapped_column(Integer, default=6)
    max_lessons_per_day: Mapped[int] = mapped_column(Integer, default=8)
    settings_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    users: Mapped[list[User]] = relationship(back_populates="school")
    classes: Mapped[list[SchoolClass]] = relationship(back_populates="school", cascade="all, delete-orphan")
    subjects: Mapped[list[Subject]] = relationship(back_populates="school", cascade="all, delete-orphan")
    teachers: Mapped[list[Teacher]] = relationship(back_populates="school", cascade="all, delete-orphan")
    rooms: Mapped[list[Room]] = relationship(back_populates="school", cascade="all, delete-orphan")
    buildings: Mapped[list[Building]] = relationship(back_populates="school", cascade="all, delete-orphan")
    lessons: Mapped[list[Lesson]] = relationship(back_populates="school", cascade="all, delete-orphan")
    timetables: Mapped[list[Timetable]] = relationship(back_populates="school", cascade="all, delete-orphan")
    snapshots: Mapped[list[ProjectSnapshot]] = relationship(back_populates="school", cascade="all, delete-orphan")


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    short: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    transit_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    school: Mapped[School] = relationship(back_populates="buildings")


class SchoolClass(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    name: Mapped[str] = mapped_column(String(32))
    short: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    grade: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stream: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    students: Mapped[int] = mapped_column(Integer, default=0)
    building_id: Mapped[Optional[int]] = mapped_column(ForeignKey("buildings.id"), nullable=True)
    home_room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    availability_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    school: Mapped[School] = relationship(back_populates="classes")

    __table_args__ = (UniqueConstraint("school_id", "name", name="uq_class_school_name"),)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    name: Mapped[str] = mapped_column(String(64))
    short: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    school: Mapped[School] = relationship(back_populates="subjects")

    __table_args__ = (UniqueConstraint("school_id", "name", name="uq_subject_school_name"),)


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    short: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    daily_capacity: Mapped[int] = mapped_column(Integer, default=6)
    weekly_max: Mapped[int] = mapped_column(Integer, default=24)
    methodical_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    availability_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    school: Mapped[School] = relationship(back_populates="teachers")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    name: Mapped[str] = mapped_column(String(64))
    short: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=30)
    kind: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    building_id: Mapped[Optional[int]] = mapped_column(ForeignKey("buildings.id"), nullable=True)
    availability_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    school: Mapped[School] = relationship(back_populates="rooms")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    class_ids_json: Mapped[str] = mapped_column(Text)  # JSON array of class ids
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"))
    room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    hours_per_week: Mapped[float] = mapped_column(default=1.0)
    max_per_day: Mapped[int] = mapped_column(Integer, default=0)
    week_type: Mapped[str] = mapped_column(String(8), default="all")
    pinned_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    school: Mapped[School] = relationship(back_populates="lessons")


class Timetable(Base):
    __tablename__ = "timetables"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    name: Mapped[str] = mapped_column(String(128), default="Jadval")
    is_working: Mapped[bool] = mapped_column(Boolean, default=False)
    entries_json: Mapped[str] = mapped_column(Text)  # JSON array of entries
    stats_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    seed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    school: Mapped[School] = relationship(back_populates="timetables")


class ProjectSnapshot(Base):
    """Full project backup (JSON blob) — the server-side equivalent of a .jadval file."""

    __tablename__ = "project_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    label: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    data_json: Mapped[str] = mapped_column(Text)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    school: Mapped[School] = relationship(back_populates="snapshots")


class GenerationJob(Base):
    """Background jadval tuzish task."""

    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="queued")  # queued|running|done|error|cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    options_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, index=True)
    user_login: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_role: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    school_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(64))
    detail_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
