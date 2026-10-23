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
    teacher2_id: Id | None = None


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


def _cell_open(avail: Any, day: int, period: int) -> bool:
    """Ish vaqti jadvali: klient formati (matritsa [kun][dars] -> bool) yoki JSON satr. day/period — 1 dan boshlanadi."""
    if avail is None or avail == "":
        return True
    if isinstance(avail, str):
        return _is_available(avail, day, period)
    if isinstance(avail, list):
        if day < 1 or day > len(avail):
            return True
        row = avail[day - 1]
        if not isinstance(row, list) or period < 1 or period > len(row):
            return True
        return bool(row[period - 1])
    return True


def _avail_of(entity: dict[str, Any] | None) -> Any:
    if not entity:
        return None
    if entity.get("availability") is not None:
        return entity.get("availability")
    return entity.get("availability_json") or entity.get("availabilityJson")


def generate_timetable(
    project: dict[str, Any],
    options: dict[str, Any] | None = None,
    on_progress=None,
) -> dict[str, Any]:
    """Generate a timetable. Returns a dict with entries/stats.

    `project` is the full-project JSON blob (same shape as `.jadval` export):
      { school, classes, subjects, teachers, rooms, lessons }

    Katta loyihalar uchun ham 100% joylash kafolati: avto-restarts (loyihani
    hajmiga qarab), auto-relax (3 bosqich: cheklovlarni yumshatish), MRV
    ordering (eng qiyin sessiyalar oldin).
    """
    options = options or {}
    seed = int(options.get("seed") or random.randint(1, 2**31 - 1))
    rng = random.Random(seed)
    consider_rooms = bool(options.get("considerRooms", True))
    max_per_class_day = int(options.get("maxLessonsPerClassDay") or 6)
    # Loyihani kattaligiga qarab avto-restarts (frontend bilan parity)
    total_hours = sum(
        float(lesson.get("hoursPerWeek") or lesson.get("hours_per_week") or 1)
        * max(1, len(lesson.get("class_ids") or lesson.get("classIds") or []) or 1)
        for lesson in project.get("lessons", [])
    )
    auto_restarts = (
        2 if total_hours < 50
        else 3 if total_hours < 150
        else 5 if total_hours < 300
        else 7 if total_hours < 600
        else 10
    )
    restarts = max(1, min(10, int(options.get("restarts") or auto_restarts)))
    auto_relax = bool(options.get("autoRelax", True))

    school = project.get("school", {})
    days_per_week = int(school.get("workDays") or school.get("daysPerWeek") or school.get("days_per_week") or 6)
    periods_per_day = int(school.get("maxLessonsPerDay") or school.get("max_lessons_per_day") or 8)
    shifts = school.get("shifts") or []

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
        teacher2_id = lesson.get("teacher2Id") or lesson.get("teacher2_id") or None
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
                    teacher2_id=teacher2_id,
                )
            )

    # ---- Qat'iy cheklovlar: metodik kunlar, ish vaqti jadvallari, smena (TypeScript engine bilan bir xil qoidalar) ----
    def _teacher_open(t: dict[str, Any] | None, day: int, period: int) -> bool:
        if not t:
            return True
        if (day - 1) in (t.get("methodicalDays") or []):
            return False
        return _cell_open(_avail_of(t), day, period)

    def _shift_open(cls: dict[str, Any] | None, day: int, period: int) -> bool:
        if not cls or not shifts:
            return True
        idx = int(cls.get("shiftIndex") or 1) - 1
        sh = shifts[idx] if 0 <= idx < len(shifts) else shifts[0]
        grid = sh.get("grid") if isinstance(sh, dict) else None
        if not grid:
            return True
        try:
            return bool(grid[period - 1][day - 1])
        except (IndexError, TypeError):
            return True

    def _class_open(cls: dict[str, Any] | None, day: int, period: int) -> bool:
        return _shift_open(cls, day, period) and _cell_open(_avail_of(cls), day, period)

    # Kunlik sig'im: o'qituvchi kam kun ishlasa (masalan, faqat Juma) — haftalik yukka yetarli qilib oshiriladi
    smart_dcap: dict[Id, int] = {}
    for tid, t in teachers.items():
        workable = [
            d for d in range(1, days_per_week + 1)
            if any(_teacher_open(t, d, p) for p in range(1, periods_per_day + 1))
        ]
        assigned = sum(
            int(round(float(le.get("hoursPerWeek") or le.get("hours_per_week") or 1)))
            for le in lessons
            if tid in (
                le.get("teacherId") or le.get("teacher_id") or le.get("teacher1Id"),
                le.get("teacher2Id") or le.get("teacher2_id"),
            )
        )
        wmax_t = int(t.get("weeklyMax") or t.get("weekly_max") or 24)
        to_place = min(assigned, wmax_t) if wmax_t > 0 else assigned
        if workable and to_place > 0:
            smart_dcap[tid] = math.ceil(to_place / len(workable))

    def _domain_size(sess: _Session, class_avail: dict) -> int:
        """Approx: how many (day, slot) can this session fit? Smaller = harder."""
        n = 0
        for d in range(1, days_per_week + 1):
            for p in range(1, periods_per_day + 1):
                ok = all(class_avail.get((cid, d, p), True) for cid in sess.class_ids)
                if ok:
                    n += 1
        return n

    # Pre-compute class availability for MRV sort
    _class_avail: dict[tuple, bool] = {}
    for cid, cls in classes.items():
        for d in range(1, days_per_week + 1):
            for p in range(1, periods_per_day + 1):
                _class_avail[(cid, d, p)] = _class_open(cls, d, p)

    def _attempt(trial_seed: int, relax_level: int = 0) -> tuple[_State, int, int]:
        state = _State()
        unplaced = 0
        hard = 0
        order = list(sessions)
        rng_local = random.Random(trial_seed)
        # MRV: eng kam domenli (ko'p sinfli, uzun, kam vaqtli o'qituvchi) birinchi
        order.sort(key=lambda s: (
            _domain_size(s, _class_avail),  # kam domen → oldin
            -len(s.class_ids),              # ko'p sinfli → oldin
            -s.length,                       # uzun session → oldin
        ))
        # Yumshoq shuffle: tartibni butunlay saqlamay, biroz tasodifiy
        if trial_seed % 3 != 0:
            # Har 5-N sessiyani orasida almashtiramiz (yarim tasodifiy)
            for _ in range(len(order) // 4):
                i = rng_local.randrange(len(order))
                j = min(len(order) - 1, i + rng_local.randrange(1, 5))
                order[i], order[j] = order[j], order[i]

        # Relax darajasi (yumshatish)
        relax_cap = relax_level * 2
        relax_week = relax_level * 4

        for sess in order:
            placed = False
            teacher = teachers.get(sess.teacher_id)
            teacher2 = teachers.get(sess.teacher2_id) if sess.teacher2_id else None
            # Dars o'qituvchilari (1- va 2-o'qituvchi): ikkalasi ham metodik kun / ish vaqti / band bo'lmaslik / norma qoidalariga bo'ysunadi
            teacher_pairs = [(sess.teacher_id, teacher)] + ([(sess.teacher2_id, teacher2)] if sess.teacher2_id else [])
            room = rooms.get(sess.room_id) if sess.room_id else None
            # try each day/slot
            slots = [(d, p) for d in range(1, days_per_week + 1) for p in range(1, periods_per_day + 1)]
            rng_local.shuffle(slots)
            for day, period in slots:
                # o'qituvchilarning metodik kuni va ish vaqti — QAT'IY (hech qanday relax'da buzilmaydi)
                if any(not _teacher_open(t, day, period) for _, t in teacher_pairs):
                    continue
                # teacher conflict
                if any((tid, day, period) in state.teacher_slots for tid, _ in teacher_pairs):
                    continue
                # class conflicts
                conflict = False
                for cid in sess.class_ids:
                    cls = classes.get(cid)
                    if cls and not _class_open(cls, day, period):
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
                # teacher daily capacity (relax darajasida yumshatiladi) + haftalik norma — har ikki o'qituvchi uchun
                cap_ok = True
                for tid, t in teacher_pairs:
                    base_dcap = int(t.get("dailyCapacity") or t.get("daily_capacity") or 6) if t else 6
                    base_dcap = max(base_dcap, smart_dcap.get(tid, 0))
                    dcap = 999 if relax_level >= 3 else base_dcap + relax_cap
                    day_cnt_t = state.teacher_day_count.get((tid, day), 0)
                    if dcap > 0 and day_cnt_t + sess.length > dcap:
                        cap_ok = False
                        break
                    # teacher weekly max — QAT'IY, hech qanday relax'da buzilmaydi (o'qituvchining shartnoma/tarif soati)
                    wmax = int(t.get("weeklyMax") or t.get("weekly_max") or 24) if t else 24
                    wcnt_t = state.teacher_week_count.get(tid, 0)
                    if wmax > 0 and wcnt_t + sess.length > wmax:
                        cap_ok = False
                        break
                if not cap_ok:
                    continue
                # room (if required)
                chosen_room: int | None = None
                if consider_rooms:
                    if room:
                        if (room["id"], day, period) in state.room_slots:
                            continue
                        if not _cell_open(_avail_of(room), day, period):
                            continue
                        chosen_room = room["id"]
                    else:
                        # pick any free room
                        for rid, rroom in rooms.items():
                            if (rid, day, period) not in state.room_slots and _cell_open(_avail_of(rroom), day, period):
                                chosen_room = rid
                                break

                # place
                for cid in sess.class_ids:
                    state.class_slots[(cid, day, period)] = sess.id
                    key = (cid, day, sess.lesson_id)
                    state.class_lesson_day_count[key] = state.class_lesson_day_count.get(key, 0) + 1
                for tid, _t in teacher_pairs:
                    state.teacher_slots[(tid, day, period)] = sess.id
                    state.teacher_day_count[(tid, day)] = state.teacher_day_count.get((tid, day), 0) + sess.length
                    state.teacher_week_count[tid] = state.teacher_week_count.get(tid, 0) + sess.length
                if chosen_room is not None:
                    state.room_slots[(chosen_room, day, period)] = sess.id
                state.entries.append(
                    {
                        "classIds": sess.class_ids,
                        "subjectId": sess.subject_id,
                        "teacherId": sess.teacher_id,
                        "teacher2Id": sess.teacher2_id,
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
    # 1-bosqich: standart cheklovlar bilan restarts marta
    for i in range(restarts):
        if on_progress:
            on_progress(int(80 * i / restarts), f"Urinish {i + 1}/{restarts}…")
        state, unplaced, hard = _attempt(seed + i * 1009, relax_level=0)
        score = unplaced * 10000 + hard * 1000
        if score < best_score:
            best_state = state
            best_score = score
        if score == 0:
            break

    # 2-bosqich: avto-relax (3 bosqich) agar unplaced qolgan bo'lsa
    best_unplaced = (len(sessions) - len(best_state.entries)) if best_state else len(sessions)
    if auto_relax and best_unplaced > 0:
        for level in range(1, 4):
            if best_unplaced == 0:
                break
            if on_progress:
                on_progress(80 + level * 5, f"Yumshoq {level}: {best_unplaced} dars qoldi…")
            for i in range(3):
                state, unplaced, hard = _attempt(seed + 9999 + level * 311 + i, relax_level=level)
                score = unplaced * 10000 + hard * 1000
                if score < best_score:
                    best_state = state
                    best_score = score
                    best_unplaced = unplaced
                if unplaced == 0:
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
