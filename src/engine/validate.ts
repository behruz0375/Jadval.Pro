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
    // Metodik kun availability'ni butunlay o'chirmayotgani
    if (t.methodicalDay >= 0) {
      const availableSlots = (() => {
        let n = 0
        for (let d = 0; d < days; d++) {
          if (d === t.methodicalDay) continue
          for (let p = 0; p < maxP; p++) if (t.availability?.[d]?.[p] ?? true) n++
        }
        return n
      })()
      if (assigned > availableSlots) {
        issues.push({
          severity: 'warning',
          entity: 'teacher',
          entityId: t.id,
          message: `${t.fullName}: ${assigned} soat kerak, lekin faqat ${availableSlots} slot bo‘sh (metodik kun + ish vaqti grid'ini hisobga olib)`,
          hint: 'Metodik kunni o‘chiring yoki ish vaqti gridida ko‘proq slot yoqing',
        })
      }
    }
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
