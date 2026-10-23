import type { Lesson, TimetableEntry, TimetableVersion } from '@/types'
import { countHardViolations, timetableGaps } from './compute'

export const WORKING_NAME = 'Ishchi jadval'

/** Barcha bo'limlar (Tahta, Umumiy, Konfliktlar, Hisobotlar, Almashtirish...) uchun YAGONA "joriy jadval":
 *  «Ishchi jadval» bo'lsa — shu, bo'lmasa oxirgi versiya. Yangi tuzilgan jadval ishchi jadvalga ham
 *  ko'chiriladi (store.addGeneratedTimetable), shuning uchun hamma joyda bir xil jadval ko'rinadi. */
export function currentVersion(timetables: TimetableVersion[]): TimetableVersion | null {
  return timetables.find((t) => t.name === WORKING_NAME) ?? timetables[timetables.length - 1] ?? null
}

/** Jadval versiyalaridagi yozuvlarni o'zgartiradi/olib tashlaydi (fn: yangi yozuv, o'zgarishsiz (shu obyekt) yoki null = o'chirish)
 *  va o'zgargan versiyalar statistikasini jadval taxtasi formulalari bilan qayta hisoblaydi. O'zgarmagan versiyalar o'sha obyektligicha qaytadi. */
export function rebuildTimetables(
  timetables: TimetableVersion[],
  lessons: Lesson[],
  teachers: { id: string }[],
  workDays: number,
  fn: (e: TimetableEntry) => TimetableEntry | null,
): TimetableVersion[] {
  const totalRequired = lessons.reduce((a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length), 0)
  return timetables.map((v) => {
    let changed = false
    const entries: TimetableEntry[] = []
    for (const e of v.entries) {
      const r = fn(e)
      if (r !== e) changed = true
      if (r) entries.push(r)
    }
    if (!changed) return v
    const { teacherGaps, classGaps } = timetableGaps(entries, teachers, workDays)
    return {
      ...v,
      entries,
      stats: {
        ...v.stats,
        placed: entries.length,
        unplaced: Math.max(0, totalRequired - entries.length),
        hardViolations: countHardViolations(entries),
        softPenalty: classGaps * 2,
        teacherGaps,
      },
    }
  })
}
