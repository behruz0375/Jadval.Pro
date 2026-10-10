import type { Project, TimetableVersion, WeekType } from '@/types'
import { DAYS_UZ } from '@/constants'
import { WEEK_BADGE } from '@/utils'

const wk = (w?: WeekType) => (w && w !== 'all' ? WEEK_BADGE[w] + ' ' : '')

type XLSXModule = typeof import('xlsx')

/** Ma'lumotlarni Excel (.xlsx) ga eksport qilish — har bo'lim alohida varaq.
 *  xlsx kutubxonasi og'ir, shuning uchun faqat shu yerda dynamic import qilinadi. */
export async function exportDataToExcel(project: Project) {
  const XLSX = await import('xlsx')
  const { classes, subjects, rooms, teachers, lessons } = project
  const wb = XLSX.utils.book_new()

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? ''
  const teacherName = (id?: string) => (id ? teachers.find((t) => t.id === id)?.fullName ?? '' : '')
  const classNames = (ids: string[]) =>
    ids.map((id) => classes.find((c) => c.id === id)?.name).filter(Boolean).join(', ')

  // Sinflar
  add(XLSX, wb,'Sinflar', [
    ['#', 'Sinf nomi', 'Qisqacha', 'Navbat', 'Sinf rahbari', 'Bino'],
    ...classes.map((c, i) => [
      i + 1,
      c.name,
      c.short,
      c.shiftIndex,
      teacherName(c.classTeacherId),
      c.building,
    ]),
  ])

  // Fanlar
  add(XLSX, wb,'Fanlar', [
    ['#', 'Fan nomi', 'Qisqacha'],
    ...subjects.map((s, i) => [i + 1, s.name, s.short]),
  ])

  // Xonalar
  add(XLSX, wb,'Xonalar', [
    ['#', 'Xona nomi', 'Qisqacha', "Sig'im", 'Turi', 'Bino'],
    ...rooms.map((r, i) => [i + 1, r.name, r.short, r.capacity, r.type, r.building]),
  ])

  // O'qituvchilar
  add(XLSX, wb,"O'qituvchilar", [
    ['#', 'F.I.Sh.', 'Metodik kun', 'Kunlik sig\'im', 'Haftalik norma'],
    ...teachers.map((t, i) => [
      i + 1,
      t.fullName,
      t.methodicalDay >= 0 ? DAYS_UZ[t.methodicalDay] : '—',
      t.dailyCapacity,
      t.weeklyMax,
    ]),
  ])

  // Darslar
  add(XLSX, wb,'Darslar', [
    ['#', 'Dars', 'Sinf(lar)', "1-o'qituvchi", "2-o'qituvchi", 'Soat', 'Ketma-ket'],
    ...lessons.map((l, i) => [
      i + 1,
      subjName(l.subjectId),
      classNames(l.classIds),
      teacherName(l.teacher1Id),
      teacherName(l.teacher2Id),
      l.hoursPerWeek,
      l.consecutive ? 'Ha' : '',
    ]),
  ])

  const safe = (project.school.name || 'jadvalpro').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40)
  XLSX.writeFile(wb, `${safe}_malumotlar.xlsx`)
}

function add(
  XLSX: XLSXModule,
  wb: import('xlsx').WorkBook,
  name: string,
  rows: (string | number)[][],
) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, name)
}

/** Bitta ro'yxatni (sarlavha + qatorlar) alohida Excel faylga chiqarish */
export async function exportListToExcel(name: string, headers: string[], rows: (string | number)[][]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  add(XLSX, wb, name.slice(0, 28) || 'Ro\'yxat', [headers, ...rows])
  const safe = name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40)
  XLSX.writeFile(wb, `${safe}.xlsx`)
}

/** Tayyor jadvalni Excelga (chop-ko'rinishida): Sinflar va O'qituvchilar varaqlari.
 *  Qator = Kun + dars raqami, ustun = sinf/o'qituvchi, katak = fan (+ o'qituvchi/sinf). */
export async function exportTimetableToExcel(project: Project, version: TimetableVersion) {
  const XLSX = await import('xlsx')
  const { school, classes, subjects, teachers, rooms, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay

  const subjOf = (lessonId: string) => {
    const l = lessons.find((x) => x.id === lessonId)
    return subjects.find((s) => s.id === l?.subjectId)
  }
  const tShort = (id?: string) => teachers.find((t) => t.id === id)?.short ?? ''
  const cName = (id: string) => classes.find((c) => c.id === id)?.name ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}-${t.end}` : ''
  }

  const wb = XLSX.utils.book_new()

  // --- Sinflar dars jadvali ---
  const rows1: (string | number)[][] = [['Kun', '#', 'Vaqt', ...classes.map((c) => c.name)]]
  for (let d = 0; d < days; d++) {
    for (let p = 1; p <= maxP; p++) {
      const row: (string | number)[] = [p === 1 ? DAYS_UZ[d] : '', p, timeLabel(p)]
      for (const c of classes) {
        const es = version.entries.filter((x) => x.classId === c.id && x.day === d && x.slot === p)
        row.push(
          es
            .map((e) => {
              const s = subjOf(e.lessonId)
              return `${wk(e.week)}${s?.short || s?.name || ''}${e.teacherId ? ' (' + tShort(e.teacherId) + ')' : ''}`
            })
            .join(' / '),
        )
      }
      rows1.push(row)
    }
  }
  add(XLSX, wb, 'Sinflar jadvali', rows1)

  // --- O'qituvchilar dars jadvali ---
  const rows2: (string | number)[][] = [['Kun', '#', 'Vaqt', ...teachers.map((t) => t.short || t.fullName)]]
  for (let d = 0; d < days; d++) {
    for (let p = 1; p <= maxP; p++) {
      const row: (string | number)[] = [p === 1 ? DAYS_UZ[d] : '', p, timeLabel(p)]
      for (const t of teachers) {
        const es = version.entries.filter(
          (x) => (x.teacherId === t.id || x.teacher2Id === t.id) && x.day === d && x.slot === p,
        )
        row.push(
          es
            .map((e) => {
              const s = subjOf(e.lessonId)
              return `${wk(e.week)}${s?.short || ''} ${cName(e.classId)}`.trim()
            })
            .join(' / '),
        )
      }
      rows2.push(row)
    }
  }
  add(XLSX, wb, "O'qituvchilar jadvali", rows2)

  // --- Xonalar dars jadvali ---
  if (rooms.length) {
    const rows3: (string | number)[][] = [['Kun', '#', 'Vaqt', ...rooms.map((r) => r.short || r.name)]]
    for (let d = 0; d < days; d++) {
      for (let p = 1; p <= maxP; p++) {
        const row: (string | number)[] = [p === 1 ? DAYS_UZ[d] : '', p, timeLabel(p)]
        for (const r of rooms) {
          const es = version.entries.filter((x) => x.roomId === r.id && x.day === d && x.slot === p)
          row.push(
            es
              .map((e) => {
                const s = subjOf(e.lessonId)
                return `${wk(e.week)}${s?.short || ''} ${cName(e.classId)}`.trim()
              })
              .join(' / '),
          )
        }
        rows3.push(row)
      }
    }
    add(XLSX, wb, 'Xonalar jadvali', rows3)
  }

  const safe = (school.name || 'jadvalpro').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40)
  XLSX.writeFile(wb, `${safe}_jadval.xlsx`)
}
