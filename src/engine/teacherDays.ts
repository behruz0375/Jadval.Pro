// O'qituvchining ishlash kunlari/vaqtlari — generator, tekshiruv, qo'lda joylash va konfliktlar sahifasi uchun umumiy mantiq.
// Metodik kunlar va "Ish vaqti" gridi QAT'IY cheklov: hech qachon yumshatilmaydi.
import type { Lesson, Teacher } from '@/types'

export type OffReason = 'methodical' | 'unavailable'

/** O'qituvchi shu kun va darsda (slot 1 dan boshlanadi) ishlay olmasa — sababini qaytaradi */
export function teacherOffReason(t: Teacher, day: number, slot: number): OffReason | null {
  if (t.methodicalDays?.includes(day)) return 'methodical'
  if (!(t.availability?.[day]?.[slot - 1] ?? true)) return 'unavailable'
  return null
}

/** Kun ichida o'qituvchi ishlay oladigan darslar soni (metodik kunda — 0) */
export function teacherOpenSlotsOnDay(t: Teacher, day: number, maxP: number): number {
  if (t.methodicalDays?.includes(day)) return 0
  let n = 0
  for (let p = 1; p <= maxP; p++) if (t.availability?.[day]?.[p - 1] ?? true) n++
  return n
}

/** O'qituvchi ishlay oladigan kunlar: metodik emas va kamida bitta ochiq dars bor */
export function teacherWorkableDays(t: Teacher, workDays: number, maxP: number): number[] {
  const out: number[] = []
  for (let d = 0; d < workDays; d++) if (teacherOpenSlotsOnDay(t, d, maxP) > 0) out.push(d)
  return out
}

/** O'qituvchiga (1- yoki 2-o'qituvchi sifatida) biriktirilgan haftalik soatlar */
export function teacherAssignedHours(t: Teacher, lessons: Lesson[]): number {
  return lessons.reduce(
    (a, l) => (l.teacher1Id === t.id || l.teacher2Id === t.id ? a + l.hoursPerWeek : a),
    0,
  )
}
