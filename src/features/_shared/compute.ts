import type { Lesson, AvailabilityMatrix, TimetableEntry } from '@/types'
import { weekOverlap } from '@/utils'

/** Qat'iy (hard) buzilishlar soni: bir resurs (sinf/o'qituvchi/xona) bir vaqtda
 *  ikki HAR XIL darsda band bo'lsa — to'qnashuv. Birlashgan (ko'p sinfli) darslar
 *  bitta lessonId bo'lgani uchun to'qnashuv deb sanalmaydi. */
export function countHardViolations(entries: TimetableEntry[]): number {
  // Bir resurs bandligidagi (day,slot) bo'yicha har xil darslar juftligini sanash
  const clashes = (buckets: Map<string, TimetableEntry[]>) => {
    let c = 0
    for (const list of buckets.values()) {
      const bySlot = new Map<number, TimetableEntry[]>()
      for (const e of list) {
        const k = e.day * 100 + e.slot
        const arr = bySlot.get(k)
        if (arr) arr.push(e)
        else bySlot.set(k, [e])
      }
      for (const arr of bySlot.values())
        for (let i = 0; i < arr.length; i++)
          for (let j = i + 1; j < arr.length; j++)
            if (arr[i].lessonId !== arr[j].lessonId && weekOverlap(arr[i].week, arr[j].week)) c++
    }
    return c
  }
  const put = (m: Map<string, TimetableEntry[]>, id: string | undefined, e: TimetableEntry) => {
    if (!id) return
    const arr = m.get(id)
    if (arr) arr.push(e)
    else m.set(id, [e])
  }

  const byClass = new Map<string, TimetableEntry[]>()
  const byTeacher = new Map<string, TimetableEntry[]>()
  const byRoom = new Map<string, TimetableEntry[]>()
  for (const e of entries) {
    put(byClass, e.classId, e)
    put(byTeacher, e.teacherId, e)
    put(byTeacher, e.teacher2Id, e) // 2-o'qituvchi ham band bo'ladi
    put(byRoom, e.roomId, e)
  }
  return clashes(byClass) + clashes(byTeacher) + clashes(byRoom)
}

/** Jadvaldagi o'qituvchi va sinf oynalari (darchalari) — haqiqiy hisob */
export function timetableGaps(
  entries: TimetableEntry[],
  teachers: { id: string }[],
  days: number,
): { teacherGaps: number; classGaps: number } {
  const gapOf = (slots: number[]) => {
    if (slots.length < 2) return 0
    let mn = 99
    let mx = 0
    for (const s of slots) {
      if (s < mn) mn = s
      if (s > mx) mx = s
    }
    return mx - mn + 1 - slots.length
  }
  let teacherGaps = 0
  for (const t of teachers)
    for (let d = 0; d < days; d++)
      teacherGaps += gapOf(entries.filter((e) => (e.teacherId === t.id || e.teacher2Id === t.id) && e.day === d).map((e) => e.slot))
  const classIds = new Set(entries.map((e) => e.classId))
  let classGaps = 0
  for (const cid of classIds)
    for (let d = 0; d < days; d++) classGaps += gapOf(entries.filter((e) => e.classId === cid && e.day === d).map((e) => e.slot))
  return { teacherGaps, classGaps }
}

export function classLoad(classId: string, lessons: Lesson[]): number {
  return lessons.filter((l) => l.classIds.includes(classId)).reduce((a, l) => a + l.hoursPerWeek, 0)
}

export function teacherLoad(teacherId: string, lessons: Lesson[]): number {
  return lessons
    .filter((l) => l.teacher1Id === teacherId || l.teacher2Id === teacherId)
    .reduce((a, l) => a + l.hoursPerWeek, 0)
}

export function subjectLoad(subjectId: string, lessons: Lesson[]): number {
  return lessons.filter((l) => l.subjectId === subjectId).reduce((a, l) => a + l.hoursPerWeek, 0)
}

export function roomLoad(roomId: string, lessons: Lesson[]): number {
  return lessons.filter((l) => l.roomId === roomId).reduce((a, l) => a + l.hoursPerWeek, 0)
}

export function availCount(m: AvailabilityMatrix): { on: number; total: number } {
  let on = 0
  let total = 0
  for (const row of m)
    for (const c of row) {
      total++
      if (c) on++
    }
  return { on, total }
}

export function availBadge(m: AvailabilityMatrix): string {
  const { on, total } = availCount(m)
  return `${on}/${total}`
}
