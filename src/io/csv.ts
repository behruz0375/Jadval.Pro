// ============================================================
// JadvalPro — CSV eksport (yengil, bog'liqliksiz).
// UTF-8 BOM bilan — Excel o'zbek/rus harflarini to'g'ri ochadi.
// ============================================================
import type { Project, TimetableVersion } from '@/types'
import { DAYS_UZ } from '@/constants'
import { WEEK_BADGE } from '@/utils'

function cell(v: string | number | undefined | null): string {
  const s = String(v ?? '')
  // Vergul, qo'shtirnoq yoki yangi qator bo'lsa — qo'shtirnoqqa olib, ichki "ni ikkilantiramiz
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

function safeName(s: string): string {
  return (s || 'jadvalpro').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'jadvalpro'
}

/** CSV matnni fayl sifatida yuklab olish (UTF-8 BOM bilan) */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = '﻿' + toCsv([headers, ...rows])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName(filename)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Tayyor jadvalni CSV ga (sinflar gridi): qator = Kun + dars, ustun = sinf */
export function exportTimetableCsv(project: Project, version: TimetableVersion) {
  const { school, classes, subjects, teachers, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay
  const subjOf = (lessonId: string) => {
    const l = lessons.find((x) => x.id === lessonId)
    return subjects.find((s) => s.id === l?.subjectId)
  }
  const tShort = (id?: string) => teachers.find((t) => t.id === id)?.short ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}-${t.end}` : ''
  }

  const headers = ['Kun', '#', 'Vaqt', ...classes.map((c) => c.name)]
  const rows: (string | number)[][] = []
  for (let d = 0; d < days; d++) {
    for (let p = 1; p <= maxP; p++) {
      const row: (string | number)[] = [p === 1 ? DAYS_UZ[d] : '', p, timeLabel(p)]
      for (const c of classes) {
        const es = version.entries.filter((x) => x.classId === c.id && x.day === d && x.slot === p)
        row.push(
          es
            .map((e) => {
              const s = subjOf(e.lessonId)
              const wk = e.week && e.week !== 'all' ? WEEK_BADGE[e.week] + ' ' : ''
              return `${wk}${s?.short || s?.name || ''}${e.teacherId ? ' (' + tShort(e.teacherId) + ')' : ''}`
            })
            .join(' / '),
        )
      }
      rows.push(row)
    }
  }
  downloadCsv(`${safeName(school.name)}_jadval`, headers, rows)
}
