import { useProject } from '@/store/project'
import { classesBeyondMaxLessons, requiredLessonSlots } from '@/engine/shifts'

/** 2-smena (masalan 8–14-darslar) "Kuniga maksimal dars"dan keyin boshlansa, o'sha sinflarga hech qanday dars sig'maydi.
 *  Jadval tuzishdan oldin chaqiriladi: sozlamani kerakli qiymatga oshiradi (ish vaqti matritsalari ham kengayadi).
 *  Qaytaradi: yangi qiymat va ta'sirlangan sinflar nomlari; hech narsa o'zgarmasa — null. */
export function autoRaiseMaxLessons(): { need: number; classes: string[] } | null {
  const st = useProject.getState()
  const beyond = classesBeyondMaxLessons(st.project)
  if (beyond.length === 0) return null
  const need = requiredLessonSlots(st.project)
  st.setMaxLessonsPerDay(need)
  return { need, classes: beyond }
}

export const raisedMessage = (r: { need: number; classes: string[] }): string =>
  `Kuniga maksimal dars soni ${r.need} ga oshirildi — 2-smenadagi sinflar (${r.classes.slice(0, 3).join(', ')}${r.classes.length > 3 ? '...' : ''}) uchun`
