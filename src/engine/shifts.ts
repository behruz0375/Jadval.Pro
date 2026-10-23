import type { Project } from '@/types'

/** Smenasi "Kuniga maksimal dars"dan KEYIN boshlanadigan sinflar (darsi bor): ularga hech qanday dars sig'maydi.
 *  Masalan, 2-smena 8–14-darslar, "Kuniga maksimal dars" esa 6 bo'lsa. */
export function classesBeyondMaxLessons(p: Project): string[] {
  const used = new Set(p.lessons.flatMap((l) => l.classIds))
  const maxP = p.school.maxLessonsPerDay
  const out: string[] = []
  for (const c of p.classes) {
    if (!used.has(c.id)) continue
    const sh = p.school.shifts[c.shiftIndex - 1] ?? p.school.shifts[0]
    if (sh && sh.startLesson > maxP) out.push(c.name)
  }
  return out
}

/** "Kuniga maksimal dars" necha bo'lishi kerakligi: hamma smenalar (darsi bor sinflar) sig'sin.
 *  Hech qanday sinf smenasi chegaradan oshmasa — joriy qiymat o'zgarishsiz qaytadi. */
export function requiredLessonSlots(p: Project): number {
  const maxP = p.school.maxLessonsPerDay
  if (classesBeyondMaxLessons(p).length === 0) return maxP
  const used = new Set(p.lessons.flatMap((l) => l.classIds))
  let need = maxP
  for (const c of p.classes) {
    if (!used.has(c.id)) continue
    const sh = p.school.shifts[c.shiftIndex - 1] ?? p.school.shifts[0]
    if (sh) need = Math.max(need, sh.startLesson + sh.lessonCount - 1)
  }
  return need
}
