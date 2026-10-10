// ============================================================
// Generator stress test — brauzer orqali ishga tushiriladi.
// window.__stressTest__() chaqirib, konsol/natijani olish mumkin.
// Faqat dev vaqtida ishlatiladi.
// ============================================================
import type { Project, Lesson } from '@/types'
import { FILE_VERSION } from '@/constants'
import { generateTimetable } from './generate'

function buildProject(nClasses: number, nTeachers: number, nSubjects: number, hoursPerClass: number, workDays = 6, maxLessonsPerDay = 7): Project {
  const avail = (days: number, lessons: number) =>
    Array.from({ length: days }, () => Array.from({ length: lessons }, () => true))

  const shiftGrid: boolean[][] = Array.from({ length: maxLessonsPerDay }, () =>
    Array.from({ length: 6 }, () => true),
  )
  const shifts = [{ index: 1, startLesson: 1, lessonCount: maxLessonsPerDay, grid: shiftGrid }]

  const classes = Array.from({ length: nClasses }, (_, i) => ({
    id: `c${i}`,
    name: `${Math.floor(i / 4) + 1}-${String.fromCharCode(65 + (i % 4))}`,
    short: `${Math.floor(i / 4) + 1}${String.fromCharCode(65 + (i % 4))}`,
    studentCount: 25,
    shiftIndex: 1,
    building: '1',
    availability: avail(workDays, maxLessonsPerDay),
  }))
  const subjects = Array.from({ length: nSubjects }, (_, i) => ({
    id: `s${i}`,
    name: `Fan${i + 1}`,
    short: `F${i + 1}`,
    weight: 5,
    color: '#3b82f6',
    availability: avail(workDays, maxLessonsPerDay),
  }))
  const teachers = Array.from({ length: nTeachers }, (_, i) => ({
    id: `t${i}`,
    fullName: `Teacher ${i + 1}`,
    short: `T${i + 1}`,
    phone: '',
    subjectIds: subjects.filter((_, j) => (j % nTeachers) === (i % nSubjects)).map((s) => s.id),
    methodicalDay: -1,
    dailyCapacity: Math.max(5, Math.ceil(hoursPerClass / 4)),
    weeklyMax: Math.max(20, hoursPerClass * 2),
    minimizeGaps: true,
    availability: avail(workDays, maxLessonsPerDay),
  }))
  const lessons: Lesson[] = []
  let ln = 0
  for (const cls of classes) {
    let left = hoursPerClass
    let subjIdx = 0
    while (left > 0 && subjIdx < nSubjects * 3) {
      const subj = subjects[subjIdx % nSubjects]
      const teacher = teachers[(subjIdx * 7 + Number(cls.id.slice(1))) % nTeachers]
      const h = Math.min(left, Math.max(1, Math.min(4, left)))
      lessons.push({
        id: `l${ln++}`,
        subjectId: subj.id,
        classIds: [cls.id],
        teacher1Id: teacher.id,
        hoursPerWeek: h,
        consecutive: false,
        maxPerDay: 2,
        pinned: [],
      })
      left -= h
      subjIdx++
    }
  }

  return {
    meta: { appVersion: '2026.1.0', savedAt: new Date().toISOString(), fileVersion: FILE_VERSION },
    settings: { theme: 'softgray', zoom: 100, cellWidth: 56, cellHeight: 44, gradient: false, compact: true, secondRow: false, blackWhite: false, accent: null },
    school: {
      name: 'Stress Test', academicYear: '2026', director: '', oibdo: '', unionHead: '',
      psychologist: '', lessonTimes: [], shifts, workDays, maxLessonsPerDay,
    },
    classes, subjects, rooms: [], teachers, lessons, timetables: [],
  }
}

export interface StressCase { label: string; classes: number; teachers: number; subjects: number; hours: number; workDays?: number; maxLessonsPerDay?: number }
export interface StressResult { label: string; lessons: number; totalHours: number; capacity: number; placed: number; unplaced: number; hardViolations: number; durationMs: number; pct: number; status: '✅' | '⚠' | '❌' }

const DEFAULT_CASES: StressCase[] = [
  { label: '50 dars (kichik)',      classes: 5,  teachers: 8,  subjects: 8,  hours: 20 },
  { label: '150 dars (o\'rta)',     classes: 10, teachers: 15, subjects: 10, hours: 25 },
  { label: '300 dars (katta)',      classes: 15, teachers: 20, subjects: 12, hours: 25 },
  { label: '500 dars (juda katta)', classes: 20, teachers: 30, subjects: 14, hours: 28, workDays: 6, maxLessonsPerDay: 7 },
  { label: '800 dars (ulkan)',      classes: 30, teachers: 40, subjects: 16, hours: 28, workDays: 6, maxLessonsPerDay: 8 },
]

export function runStressTest(cases: StressCase[] = DEFAULT_CASES): StressResult[] {
  const results: StressResult[] = []
  for (const c of cases) {
    const proj = buildProject(c.classes, c.teachers, c.subjects, c.hours, c.workDays ?? 6, c.maxLessonsPerDay ?? 7)
    const totalHours = proj.lessons.reduce((a, l) => a + l.hoursPerWeek, 0)
    const capacity = c.classes * (c.workDays ?? 6) * (c.maxLessonsPerDay ?? 7)
    const t0 = Date.now()
    const v = generateTimetable(proj, { restarts: 3, autoRelax: true, maxLessonsPerClassDay: 6 })
    const durationMs = Date.now() - t0
    const total = v.stats.placed + v.stats.unplaced
    const pct = total ? Math.round((v.stats.placed / total) * 100) : 0
    const status: StressResult['status'] = v.stats.unplaced === 0 ? '✅' : v.stats.placed > v.stats.unplaced ? '⚠' : '❌'
    results.push({
      label: c.label, lessons: proj.lessons.length, totalHours, capacity,
      placed: v.stats.placed, unplaced: v.stats.unplaced,
      hardViolations: v.stats.hardViolations, durationMs, pct, status,
    })
  }
  return results
}

/** Konsolga chop etuvchi variant — tezkor sinov uchun */
export function logStressTest(): StressResult[] {
  const res = runStressTest()
  console.log('='.repeat(80))
  console.log('JadvalPro Generator Stress Test')
  console.log('='.repeat(80))
  for (const r of res) {
    console.log(
      `${r.status} ${r.label.padEnd(25)} | lessons=${String(r.lessons).padStart(4)} | hours=${String(r.totalHours).padStart(4)} | cap=${String(r.capacity).padStart(4)} | placed=${r.placed}/${r.placed + r.unplaced} (${r.pct}%) | hard=${r.hardViolations} | ${r.durationMs}ms`,
    )
  }
  console.log('='.repeat(80))
  return res
}
