"""Python port of JadvalPro's timetable generator (CSP greedy + simple local search).

Simpler than the TS engine (no multi-week, no local search improve pass yet), but
produces a valid timetable: no class/teacher/room conflicts, respects teacher
dailyCapacity + weeklyMax, lesson maxPerDay, and basic availability.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Any


Id = Any  # int or str — generator is ID-agnostic


@dataclass
class _Session:
    id: str
    lesson_id: Id
    class_ids: list[Id]
    subject_id: Id
    teacher_id: Id
    room_id: Id | None
    length: int = 1
    max_per_day: int = 0


@dataclass
class _State:
    # (class_id, day, period) -> session_id
    class_slots: dict[tuple[Id, int, int], str] = field(default_factory=dict)
    teacher_slots: dict[tuple[Id, int, int], str] = field(default_factory=dict)
    room_slots: dict[tuple[Id, int, int], str] = field(default_factory=dict)
    teacher_day_count: dict[tuple[Id, int], int] = field(default_factory=dict)
    teacher_week_count: dict[Id, int] = field(default_factory=dict)
    class_lesson_day_count: dict[tuple[Id, int, Id], int] = field(default_factory=dict)
    entries: list[dict[str, Any]] = field(default_factory=list)


def _is_available(avail_json: str | None, day: int, period: int) -> bool:
    """availability grid: {"days":[[...true/false...], ...]} per day/period (1-indexed)."""
    if not avail_json:
        return True
    try:
        import json

        data = json.loads(avail_json)
    except Exception:
        return True
    days = data.get("days") if isinstance(data, dict) else None
    if not days or day < 1 or day > len(days):
        return True
    row = days[day - 1]
    if not row or period < 1 or period > len(row):
        return True
    return bool(row[period - 1])


def generate_timetable(
    project: dict[str, Any],
    options: dict[str, Any] | None = None,
    on_progress=None,
) -> dict[str, Any]:
    """Generate a timetable. Returns a dict with entries/stats.

    `project` is the full-project JSON blob (same shape as `.jadval` export):
      { school, classes, subjects, teachers, rooms, lessons }
    """
    options = options or {}
    seed = int(options.get("seed") or random.randint(1, 2**31 - 1))
    rng = random.Random(seed)
    consider_rooms = bool(options.get("considerRooms", True))
    max_per_class_day = int(options.get("maxLessonsPerClassDay") or 6)
    restarts = max(1, min(10, int(options.get("restarts") or 3)))

    school = project.get("school", {})
    days_per_week = int(school.get("daysPerWeek") or school.get("days_per_week") or 6)
    periods_per_day = int(school.get("maxLessonsPerDay") or school.get("max_lessons_per_day") or 8)

    classes = {c["id"]: c for c in project.get("classes", [])}
    subjects = {s["id"]: s for s in project.get("subjects", [])}
    teachers = {t["id"]: t for t in project.get("teachers", [])}
    rooms = {r["id"]: r for r in project.get("rooms", [])}
    lessons = project.get("lessons", [])

    # Build sessions (each hour becomes one 1-hour session; could split into 2-hour pairs)
    sessions: list[_Session] = []
    for lesson in lessons:
        class_ids = lesson.get("class_ids") or lesson.get("classIds") or []
        if isinstance(class_ids, str):
            try:
                import json

                class_ids = json.loads(class_ids)
            except Exception:
                class_ids = []
        # Frontend might use string IDs (e.g. "c_1", "t_2") or int — both are fine.
        teacher_id = lesson.get("teacherId") or lesson.get("teacher_id") or lesson.get("teacher1Id")
        subject_id = lesson.get("subjectId") or lesson.get("subject_id")
        room_id = lesson.get("roomId") or lesson.get("room_id")
        hours = int(round(float(lesson.get("hoursPerWeek") or lesson.get("hours_per_week") or 1)))
        for h in range(hours):
            sessions.append(
                _Session(
                    id=f"L{lesson['id']}-h{h}",
                    lesson_id=lesson["id"],
                    class_ids=list(class_ids),
                    subject_id=subject_id,
                    teacher_id=teacher_id,
                    room_id=room_id,
                    length=1,
                    max_per_day=int(lesson.get("maxPerDay") or lesson.get("max_per_day") or 0),
                )
            )

    def _attempt(trial_seed: int) -> tuple[_State, int, int]:
        state = _State()
        unplaced = 0
        hard = 0
        order = list(sessions)
        rng_local = random.Random(trial_seed)
        rng_local.shuffle(order)

        for sess in order:
            placed = False
            teacher = teachers.get(sess.teacher_id)
            room = rooms.get(sess.room_id) if sess.room_id else None
            # try each day/slot
            slots = [(d, p) for d in range(1, days_per_week + 1) for p in range(1, periods_per_day + 1)]
            rng_local.shuffle(slots)
            for day, period in slots:
                # teacher availability
                if teacher and not _is_available(teacher.get("availability_json") or teacher.get("availabilityJson"), day, period):
                    continue
                # teacher conflict
                if (sess.teacher_id, day, period) in state.teacher_slots:
                    continue
                # class conflicts
                conflict = False
                for cid in sess.class_ids:
                    cls = classes.get(cid)
                    if cls and not _is_available(cls.get("availability_json") or cls.get("availabilityJson"), day, period):
                        conflict = True
                        break
                    if (cid, day, period) in state.class_slots:
                        conflict = True
                        break
                    # per-class per-day lesson cap
                    class_day_total = sum(
                        1 for (c, d, p), _ in state.class_slots.items() if c == cid and d == day
                    )
                    if class_day_total >= max_per_class_day:
                        conflict = True
                        break
                    # per-lesson maxPerDay
                    if sess.max_per_day > 0:
                        current = state.class_lesson_day_count.get((cid, day, sess.lesson_id), 0)
                        if current + 1 > sess.max_per_day:
                            conflict = True
                            break
                if conflict:
                    continue
                # teacher daily capacity
                dcap = int(teacher.get("dailyCapacity") or teacher.get("daily_capacity") or 6) if teacher else 6
                day_cnt = state.teacher_day_count.get((sess.teacher_id, day), 0)
                if day_cnt + sess.length > dcap:
                    continue
                # teacher weekly max
                wmax = int(teacher.get("weeklyMax") or teacher.get("weekly_max") or 24) if teacher else 24
                wcnt = state.teacher_week_count.get(sess.teacher_id, 0)
                if wcnt + sess.length > wmax:
                    continue
                # room (if required)
                chosen_room: int | None = None
                if consider_rooms:
                    if room:
                        if (room["id"], day, period) in state.room_slots:
                            continue
                        if not _is_available(room.get("availability_json") or room.get("availabilityJson"), day, period):
                            continue
                        chosen_room = room["id"]
                    else:
                        # pick any free room
                        for rid, rroom in rooms.items():
                            if (rid, day, period) not in state.room_slots and _is_available(
                                rroom.get("availability_json") or rroom.get("availabilityJson"), day, period
                            ):
                                chosen_room = rid
                                break

                # place
                for cid in sess.class_ids:
                    state.class_slots[(cid, day, period)] = sess.id
                    key = (cid, day, sess.lesson_id)
                    state.class_lesson_day_count[key] = state.class_lesson_day_count.get(key, 0) + 1
                state.teacher_slots[(sess.teacher_id, day, period)] = sess.id
                state.teacher_day_count[(sess.teacher_id, day)] = day_cnt + sess.length
                state.teacher_week_count[sess.teacher_id] = wcnt + sess.length
                if chosen_room is not None:
                    state.room_slots[(chosen_room, day, period)] = sess.id
                state.entries.append(
                    {
                        "classIds": sess.class_ids,
                        "subjectId": sess.subject_id,
                        "teacherId": sess.teacher_id,
                        "roomId": chosen_room,
                        "day": day,
                        "period": period,
                        "length": sess.length,
                        "lessonId": sess.lesson_id,
                    }
                )
                placed = True
                break
            if not placed:
                unplaced += 1
        return state, unplaced, hard

    best_state: _State | None = None
    best_score = math.inf
    for i in range(restarts):
        if on_progress:
            on_progress(int(100 * i / restarts), f"Urinish {i + 1}/{restarts}…")
        state, unplaced, hard = _attempt(seed + i * 1009)
        score = unplaced * 10000 + hard * 1000
        if score < best_score:
            best_state = state
            best_score = score
        if score == 0:
            break

    if on_progress:
        on_progress(100, "Tayyor")

    entries = best_state.entries if best_state else []
    return {
        "entries": entries,
        "stats": {
            "placed": len(entries),
            "totalSessions": len(sessions),
            "unplaced": len(sessions) - len(entries),
            "seed": seed,
        },
        "seed": seed,
    }
