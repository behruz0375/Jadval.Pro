// JadvalPro — jadval tuzishdan oldingi validatsiya ("pre-flight check")
//
// Jadval tuzmasdan oldin loyihada mumkin bo'lmagan vaziyatlarni aniqlab,
// aniq o'zbek tilidagi xato xabari qaytaradi.
//
// Masalan:
//  - "5-A sinfiga 32 soat kerak, lekin faqat 28 slot bo'sh (6 kun × 6 dars)"
//  - "Aliyev V. ga 28 soat lesson biriktirilgan, lekin haftalik max — 24 soat"
//  - "Matematika darsi uchun o'qituvchi tanlanmagan"
//  - "6-A sinfning ish vaqti grid'ida barcha slotlar o'chirilgan"

import type { Project } from '@/types'
import { DAYS_UZ } from '@/constants'
import { teacherOffReason, teacherOpenSlotsOnDay, teacherWorkableDays } from './teacherDays'
import { classesBeyondMaxLessons, requiredLessonSlots } from './shifts'

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  entity: 'class' | 'teacher' | 'lesson' | 'subject' | 'room' | 'school' | 'project'
  entityId?: string
  message: string
  /** Qanday hal qilish mumkinligi (ixtiyoriy, foydalanuvchiga maslahat) */
  hint?: string
}

export interface ValidationResult {
  /** Hech qanday xato yo'q bo'lsa — true (lekin ogohlantirishlar bo'lishi mumkin) */
  ok: boolean
  /** Jadval tuzish ehtimoli nima deyarli imkonsiz: >=1 ta "error" bo'lsa */
  willFail: boolean
  issues: ValidationIssue[]
  /** Qisqa xulosa */
  summary: string
}

/** Loyihani jadval tuzishga tayyormi deb tekshiradi */
export function validateProject(project: Project): ValidationResult {
  const issues: ValidationIssue[] = []
  const { school, classes, subjects, teachers, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay

  // ================== 1. Umumiy tekshiruvlar ==================
  if (classes.length === 0) {
    issues.push({
      severity: 'error',
      entity: 'project',
      message: 'Birorta sinf yo‘q',
      hint: '"Sinflar" bo‘limida yangi sinf qo‘shing',
    })
  }
  if (subjects.length === 0) {
    issues.push({
      severity: 'error',
      entity: 'project',
      message: 'Birorta fan yo‘q',
      hint: '"Fanlar" bo‘limida yangi fan qo‘shing',
    })
  }
  if (teachers.length === 0) {
    issues.push({
      severity: 'error',
      entity: 'project',
      message: 'Birorta o‘qituvchi yo‘q',
      hint: '"O‘qituvchilar" bo‘limida yangi o‘qituvchi qo‘shing',
    })
  }
  if (lessons.length === 0) {
    issues.push({
      severity: 'error',
      entity: 'project',
      message: 'Birorta dars tanlanmagan',
      hint: '"Darslar" yoki "O‘quv reja" bo‘limida dars qo‘shing',
    })
  }

  // ================== 2. Har bir dars uchun tekshiruv ==================
  for (const l of lessons) {
    const subj = subjects.find((s) => s.id === l.subjectId)
    if (!subj) {
      issues.push({
        severity: 'error',
        entity: 'lesson',
        entityId: l.id,
        message: `Dars uchun fan tanlanmagan (lesson id: ${l.id})`,
        hint: 'Darslar bo‘limida tahrirlab fanni tanlang',
      })
      continue
    }
    if (l.classIds.length === 0) {
      issues.push({
        severity: 'error',
        entity: 'lesson',
        entityId: l.id,
        message: `"${subj.name}" uchun sinflar tanlanmagan`,
        hint: 'Darslar bo‘limida tahrirlab kamida bitta sinf tanlang',
      })
    }
    if (!l.teacher1Id) {
      issues.push({
        severity: 'error',
        entity: 'lesson',
        entityId: l.id,
        message: `"${subj.name}" uchun o‘qituvchi tanlanmagan`,
        hint: 'Darslar bo‘limida tahrirlab o‘qituvchini tanlang',
      })
    }
    // O'chirilgan (endi mavjud bo'lmagan) sinf/o'qituvchi/xonaga havolalar — dars jimgina joylashmay qolmasin
    const missingClasses = l.classIds.filter((cid) => !classes.some((c) => c.id === cid))
    if (missingClasses.length > 0) {
      issues.push({
        severity: 'error',
        entity: 'lesson',
        entityId: l.id,
        message: `"${subj.name}" darsi mavjud bo'lmagan (o'chirilgan) sinfga biriktirilgan`,
        hint: 'Darslar bo‘limida darsni tahrirlab sinfni tanlang yoki darsni o‘chiring',
      })
    }
    for (const [label, tid] of [['1-o‘qituvchi', l.teacher1Id], ['2-o‘qituvchi', l.teacher2Id]] as const) {
      if (tid && !teachers.some((t) => t.id === tid)) {
        issues.push({
          severity: 'error',
          entity: 'lesson',
          entityId: l.id,
          message: `"${subj.name}" darsining ${label}si mavjud emas (o'chirilgan)`,
          hint: 'Darslar bo‘limida tahrirlab o‘qituvchini qayta tanlang',
        })
      }
    }
    if (l.roomId && !project.rooms.some((r) => r.id === l.roomId)) {
      issues.push({
        severity: 'warning',
        entity: 'lesson',
        entityId: l.id,
        message: `"${subj.name}" darsi mavjud bo'lmagan (o'chirilgan) xonaga biriktirilgan — xona hisobga olinmaydi`,
        hint: 'Darslar bo‘limida xonani qayta tanlang yoki tozalang',
      })
    }
    if (l.hoursPerWeek <= 0) {
      issues.push({
        severity: 'error',
        entity: 'lesson',
        entityId: l.id,
        message: `"${subj.name}" uchun haftalik soat 0 yoki manfiy`,
        hint: 'Darslar bo‘limida haftalik soatni to‘g‘rilang',
      })
    }
  }

  // ================== 3. O'qituvchi yuklamasi ==================
  for (const t of teachers) {
    const assigned = lessons
      .filter((l) => l.teacher1Id === t.id || l.teacher2Id === t.id)
      .reduce((a, l) => a + l.hoursPerWeek, 0)
    if (t.weeklyMax > 0 && assigned > t.weeklyMax) {
      // Generator weeklyMax'ni hurmat qiladi — ortiqcha dars joylashmay qoladi, lekin
      // halokat emas. Shuning uchun bu — ogohlantirish, ERROR emas.
      issues.push({
        severity: 'warning',
        entity: 'teacher',
        entityId: t.id,
        message: `${t.fullName}ga ${assigned} soat biriktirilgan, haftalik max — ${t.weeklyMax} soat (${assigned - t.weeklyMax} soat sig‘maydi)`,
        hint: `O'qituvchining "Haftalik maksimum" ni ${assigned} ga oshiring, yoki shu dars boshqa o'qituvchiga biriktiring`,
      })
    }
    // Metodik kunlar va "Ish vaqti" gridi qat'iy cheklov — generator ularni hech qachon buzmaydi.
    // Shuning uchun o'qituvchi ishlay oladigan kun/slotlar yuklamaga yetmasa, aniq sababini aytamiz.
    const workable = teacherWorkableDays(t, days, maxP)
    if (assigned > 0 && workable.length === 0) {
      issues.push({
        severity: 'error',
        entity: 'teacher',
        entityId: t.id,
        message: `${t.fullName}: barcha kunlar metodik yoki yopiq, lekin ${assigned} soat dars biriktirilgan — joylashtirib bo'lmaydi`,
        hint: "O'qituvchining metodik kunlarini kamaytiring yoki «Ish vaqti» gridida kamida bitta kunni oching",
      })
    } else if (assigned > 0) {
      const cap = workable.reduce((a, d) => a + teacherOpenSlotsOnDay(t, d, maxP), 0)
      const toPlace = t.weeklyMax > 0 ? Math.min(assigned, t.weeklyMax) : assigned
      if (toPlace > cap) {
        const dayNames = workable.map((d) => DAYS_UZ[d]).join(', ')
        issues.push({
          severity: 'warning',
          entity: 'teacher',
          entityId: t.id,
          message: `${t.fullName}: ishlaydigan kunlari — ${dayNames}. ${toPlace} soat kerak, lekin bu kunlarga ko'pi bilan ${cap} soat sig'adi (${toPlace - cap} soat joylashmaydi)`,
          hint: "Metodik kunlarni kamaytiring, «Ish vaqti» gridida ko'proq slot oching yoki soatni boshqa o'qituvchiga bering",
        })
      }
    }
  }

  // ================== 3b. Dars darajasida: o'qituvchi(lar) va sinf(lar) UMUMIY bo'sh vaqti ==================
  // Dars faqat shunday kataklarga tushadiki, unda 1-/2-o'qituvchining metodik kuni/ish vaqti ochiq VA sinfning smenasi
  // hamda ish vaqti ochiq bo'lsin. Bunday kataklar soni soatdan kam bo'lsa — dars hech qachon to'liq joylashmaydi.
  // (Smenasi "Kuniga maksimal dars"dan keyin boshlanadigan sinflar pastda alohida xato sifatida ko'rsatiladi.)
  const beyondNames = new Set(classesBeyondMaxLessons(project))
  for (const l of lessons) {
    const ts = [l.teacher1Id, l.teacher2Id]
      .map((id) => (id ? teachers.find((t) => t.id === id) : undefined))
      .filter((t): t is NonNullable<typeof t> => !!t)
    const cs = l.classIds.map((id) => classes.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c)
    if (ts.length === 0 || cs.length === 0 || l.hoursPerWeek <= 0) continue
    if (cs.some((c) => beyondNames.has(c.name))) continue
    let common = 0
    for (let d = 0; d < days; d++) {
      for (let p = 1; p <= maxP; p++) {
        if (ts.some((t) => teacherOffReason(t, d, p) !== null)) continue
        const classesOpen = cs.every((c) => {
          const sh = school.shifts[c.shiftIndex - 1] ?? school.shifts[0]
          return (sh?.grid?.[p - 1]?.[d] ?? true) && (c.availability?.[d]?.[p - 1] ?? true)
        })
        if (classesOpen) common++
      }
    }
    if (l.hoursPerWeek > common) {
      const subj = subjects.find((s) => s.id === l.subjectId)?.name ?? 'Dars'
      const who = ts.map((t) => t.short || t.fullName).join(' + ')
      const where = cs.map((c) => c.name).join(', ')
      issues.push({
        severity: common === 0 ? 'error' : 'warning',
        entity: 'lesson',
        entityId: l.id,
        message: `${subj} (${where}, ${who}): ${l.hoursPerWeek} soat kerak, lekin o'qituvchi va sinfning umumiy bo'sh vaqti ${common} ta — ${l.hoursPerWeek - common} soat joylashmaydi`,
        hint: "O'qituvchining metodik kunlarini kamaytiring, sinf yoki o'qituvchining ish vaqtini kengaytiring yoki darsni boshqa o'qituvchiga bering",
      })
    }
  }

  // 2-smena (masalan 8–14-darslar) "Kuniga maksimal dars"dan keyin boshlansa — bu sinflarga umuman dars sig'maydi
  const beyondShift = classesBeyondMaxLessons(project)
  if (beyondShift.length > 0) {
    issues.push({
      severity: 'error',
      entity: 'school',
      message: `${beyondShift.length} ta sinf (${beyondShift.slice(0, 3).join(', ')}${beyondShift.length > 3 ? '...' : ''}) keyingi smenada, lekin «Kuniga maksimal dars» (${maxP}) undan kam — bu sinflarga dars sig'maydi`,
      hint: `Maktab sozlamalarida «Kuniga maksimal dars»ni ${requiredLessonSlots(project)} ga oshiring (jadval tuzishda avtomatik oshiriladi)`,
    })
  }

  // ================== 4. Sinf sig'imi ==================
  for (const c of classes) {
    const needed = lessons
      .filter((l) => l.classIds.includes(c.id))
      .reduce((a, l) => a + l.hoursPerWeek, 0)
    const availableSlots = (() => {
      let n = 0
      for (let d = 0; d < days; d++)
        for (let p = 0; p < maxP; p++)
          if (c.availability?.[d]?.[p] ?? true) n++
      return n
    })()
    if (needed > availableSlots) {
      // Haqiqiy fizik imkonsizlik — bu error (slot yetmaydi)
      issues.push({
        severity: 'error',
        entity: 'class',
        entityId: c.id,
        message: `${c.name} sinfiga ${needed} soat kerak, lekin faqat ${availableSlots} slot bo‘sh (${days} kun × ${maxP} dars)`,
        hint: `Darslar sonini kamaytiring yoki Maktab sozlamalarida kunlik dars sonini oshiring (hozir: ${maxP})`,
      })
    }
    const maxLessonsCap = 6 // standart cap
    if (needed > days * maxLessonsCap) {
      issues.push({
        severity: 'warning',
        entity: 'class',
        entityId: c.id,
        message: `${c.name}: ${needed} soat (haftalik) — kuniga ${maxLessonsCap} soatdan ko‘proq joylashishi mumkin`,
        hint: '"Kuniga maksimum" cheklovini oshiring (Taqsimot → sozlamalar)',
      })
    }
  }

  // ================== 5. Jami balans ==================
  const totalLessonHours = lessons.reduce(
    (a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length),
    0,
  )
  const totalTeacherHours = teachers.reduce(
    (a, t) => a + (t.weeklyMax > 0 ? t.weeklyMax : days * maxP),
    0,
  )
  if (totalLessonHours > totalTeacherHours) {
    // Umumiy sig'im yetmaydi — bu ham ogohlantirish (generator joylashishi mumkinini qiladi, qolgan qism unplaced)
    issues.push({
      severity: 'warning',
      entity: 'project',
      message: `Umumiy balans: ${totalLessonHours} soat kerak, barcha o‘qituvchilar jami ${totalTeacherHours} soat (${totalLessonHours - totalTeacherHours} soat yetishmaydi)`,
      hint: 'Yangi o‘qituvchi qo‘shing yoki mavjudlarning "Haftalik maksimum"ni oshiring. Generator joylash mumkin bo‘lgan qismini joylashtiradi.',
    })
  }

  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length
  return {
    ok: issues.length === 0,
    willFail: errors > 0,
    issues,
    summary:
      errors > 0
        ? `${errors} ta xato topildi — jadval to‘liq tuzilmaydi`
        : warnings > 0
          ? `${warnings} ta ogohlantirish — jadval tuziladi, lekin diqqat qilishi mumkin`
          : 'Loyiha tayyor — jadval muvaffaqiyatli tuzilishi kutilmoqda',
  }
}
