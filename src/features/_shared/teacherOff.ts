import { DAYS_UZ } from '@/constants'
import { teacherOffReason } from '@/engine/teacherDays'
import type { Teacher } from '@/types'

/** Dars shu kun/darsga qo'yilsa o'qituvchining metodik kuni yoki yopiq ish vaqtiga to'g'ri kelsa — foydalanuvchiga
 *  ko'rsatiladigan xato matni (aks holda null). Tahta va Umumiy ko'rinishdagi qo'lda joylash shuni ishlatadi. */
export function teacherOffMessage(
  teachers: Teacher[],
  day: number,
  slot: number,
  ...teacherIds: (string | undefined)[]
): string | null {
  for (const tid of teacherIds) {
    const te = tid ? teachers.find((x) => x.id === tid) : undefined
    if (!te) continue
    const why = teacherOffReason(te, day, slot)
    if (why === 'methodical') return `${te.short} — ${DAYS_UZ[day]} metodik kuni, dars qo'yib bo'lmaydi`
    if (why === 'unavailable') return `${te.short} bu vaqtda ishlamaydi (ish vaqti yopiq)`
  }
  return null
}
