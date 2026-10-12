import type {
  School,
  Shift,
  LessonTime,
  SchoolClass,
  Subject,
  Room,
  Teacher,
  Lesson,
  AppSettings,
  Project,
  AvailabilityMatrix,
} from '@/types'
import { APP_VERSION, FILE_VERSION, MAX_LESSONS, DEFAULT_LESSON_MIN, DEFAULT_BREAK_MIN } from '@/constants'
import { uid, minToTime, timeToMin, fullAvailability } from '@/utils'

export const DEFAULT_WORK_DAYS = 6
/** Standart kuniga maksimal dars soni. */
export const DEFAULT_MAX_LESSONS_PER_DAY = 6

/** Dars vaqtlarini avtomatik generatsiya qilish (katta tanaffus bilan) */
export function generateLessonTimes(
  start = '08:00',
  lessonMin = DEFAULT_LESSON_MIN,
  breakMin = DEFAULT_BREAK_MIN,
  count = MAX_LESSONS,
  bigBreakAfter = 0,
  bigBreakMin = 0,
): LessonTime[] {
  const times: LessonTime[] = []
  let cur = timeToMin(start)
  for (let i = 0; i < count; i++) {
    const end = cur + lessonMin
    times.push({ index: i + 1, start: minToTime(cur), end: minToTime(end) })
    const brk = bigBreakAfter > 0 && i + 1 === bigBreakAfter ? bigBreakMin : breakMin
    cur = end + brk
  }
  return times
}

/** Bitta navbat (smena) slotlarini (startLesson..) berilgan vaqtdan to'ldirish —
 *  qolgan slotlarga tegmaydi (har navbat uchun alohida qo'ng'iroq jadvali). */
export function fillShiftTimes(
  existing: LessonTime[],
  startLesson: number,
  lessonCount: number,
  startTime: string,
  lessonMin = DEFAULT_LESSON_MIN,
  breakMin = DEFAULT_BREAK_MIN,
  bigBreakAfter = 0,
  bigBreakMin = 0,
): LessonTime[] {
  const times = existing.map((t) => ({ ...t }))
  let cur = timeToMin(startTime)
  for (let k = 0; k < lessonCount; k++) {
    const slot = startLesson + k // 1-indeksli
    if (slot - 1 < 0 || slot - 1 >= times.length) break
    const end = cur + lessonMin
    times[slot - 1] = { index: slot, start: minToTime(cur), end: minToTime(end) }
    const brk = bigBreakAfter > 0 && k + 1 === bigBreakAfter ? bigBreakMin : breakMin
    cur = end + brk
  }
  return times
}

/** Navbat gridi: [dars 0..15][kun 0..5] */
function makeShiftGrid(startLesson: number, lessonCount: number, workDays: number): boolean[][] {
  const grid: boolean[][] = []
  for (let l = 0; l < MAX_LESSONS; l++) {
    const row: boolean[] = []
    const active = l >= startLesson - 1 && l < startLesson - 1 + lessonCount
    for (let d = 0; d < 6; d++) row.push(active && d < workDays)
    grid.push(row)
  }
  return grid
}

export function defaultShifts(workDays = DEFAULT_WORK_DAYS): Shift[] {
  // Standart — 2 ta navbat × 7 dars (1234567 va 1234567).
  // Qo'shimcha navbat kerak bo'lsa — Maktab sozlamalaridan qo'shiladi.
  return [
    { index: 1, startLesson: 1, lessonCount: 7, grid: makeShiftGrid(1, 7, workDays) },
    { index: 2, startLesson: 8, lessonCount: 7, grid: makeShiftGrid(8, 7, workDays) },
  ]
}

export function defaultSchool(): School {
  return {
    name: '',
    academicYear: '2025-2026',
    director: '',
    oibdo: '',
    unionHead: '',
    psychologist: '',
    lessonTimes: generateLessonTimes(),
    shifts: defaultShifts(),
    workDays: DEFAULT_WORK_DAYS,
    maxLessonsPerDay: DEFAULT_MAX_LESSONS_PER_DAY,
  }
}

export function defaultSettings(): AppSettings {
  return {
    theme: 'softgray',
    zoom: 100,
    cellWidth: 56,
    cellHeight: 44,
    gradient: false,
    compact: true,
    secondRow: false,
    blackWhite: false,
    accent: null,
  }
}

function emptyAvail(school: School): AvailabilityMatrix {
  return fullAvailability(school.workDays, school.maxLessonsPerDay)
}

export function newClass(school: School, name = ''): SchoolClass {
  return {
    id: uid('cls_'),
    name,
    short: name,
    studentCount: 25,
    shiftIndex: 1,
    building: '1-bino',
    classTeacherId: '',
    availability: emptyAvail(school),
  }
}

export const SUBJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
]

/** O'qituvchi/ro'yxat rang palitrasi */
export const ENTITY_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6',
  '#eab308', '#ef4444', '#6366f1', '#06b6d4', '#84cc16', '#f43f5e',
]

export function newSubject(school: School, name = '', idx = 0): Subject {
  return {
    id: uid('sub_'),
    name,
    short: name.slice(0, 4),
    weight: 5,
    color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
    availability: emptyAvail(school),
  }
}

export function newRoom(school: School, name = ''): Room {
  return {
    id: uid('room_'),
    name,
    short: name,
    capacity: 30,
    type: 'Oddiy',
    building: '1-bino',
    availability: emptyAvail(school),
  }
}

export function newTeacher(school: School, fullName = ''): Teacher {
  return {
    id: uid('tch_'),
    fullName,
    short: shortName(fullName),
    phone: '',
    subjectIds: [],
    methodicalDays: [],
    dailyCapacity: 6,
    weeklyMax: 24,
    minimizeGaps: true,
    color: ENTITY_COLORS[Math.floor(Math.random() * ENTITY_COLORS.length)],
    availability: emptyAvail(school),
  }
}

export function newLesson(school: School): Lesson {
  void school
  return {
    id: uid('les_'),
    subjectId: '',
    classIds: [],
    teacher1Id: '',
    hoursPerWeek: 1,
    consecutive: false,
    maxPerDay: 0, // 0 = cheksiz — dastur avtomatik tarqatadi (maxLessonsPerDay bilan cheklangan)
    pinned: [],
  }
}

/** "Aliyev Vali Akramovich" -> "Aliyev V.A." */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return ''
  const last = parts[0]
  const initials = parts
    .slice(1)
    .map((p) => p[0]?.toUpperCase() + '.')
    .join('')
  return initials ? `${last} ${initials}` : last
}

export function defaultProject(): Project {
  return {
    meta: { appVersion: APP_VERSION, savedAt: new Date().toISOString(), fileVersion: FILE_VERSION },
    school: defaultSchool(),
    classes: [],
    subjects: [],
    rooms: [],
    teachers: [],
    lessons: [],
    timetables: [],
    settings: defaultSettings(),
  }
}

/** SUB-COMMANDS: sinf nomlari generatori "1-A..4-B" uchun (kelgusi) */
/** Fan guruhlari — Oʻzbekiston maktab o'quv rejasiga mos */
export const SUBJECT_GROUPS = {
  aniq: {
    label: 'Aniq fanlar',
    subjects: ['Matematika', 'Algebra', 'Geometriya', 'Fizika', 'Astronomiya', 'Informatika', 'Dasturlash'],
  },
  tabiiy: {
    label: 'Tabiiy fanlar',
    subjects: ['Kimyo', 'Biologiya', 'Geografiya', 'Tabiatshunoslik', 'Ekologiya'],
  },
  ijtimoiy: {
    label: 'Ijtimoiy-gumanitar fanlar',
    subjects: [
      'Tarix', "Jahon tarixi", "O'zbekiston tarixi", 'Huquq',
      'Konstitutsiya asoslari', 'Vatan tuyg‘usi', 'Odobnoma',
      'Milliy g‘oya', 'Iqtisod asoslari', 'Diniy tarbiya',
    ],
  },
  'til-adabiyot': {
    label: 'Til va adabiyot',
    subjects: [
      'Ona tili', 'Adabiyot', 'O‘zbek tili va adabiyoti',
      'Rus tili', 'Ingliz tili', 'Nemis tili', 'Fransuz tili', 'Arab tili', 'Koreys tili',
    ],
  },
  'etik-estetik': {
    label: 'Etik-estetik fanlar',
    subjects: [
      'Musiqa', 'Tasviriy san‘at', 'Chizmachilik',
      'Jismoniy tarbiya', 'Mehnat ta‘limi', 'Texnologiya',
      'Dizayn asoslari', 'Teatr', 'Xoreografiya',
    ],
  },
} as const

export const SUBJECT_PRESETS: readonly string[] = Object.values(SUBJECT_GROUPS)
  .flatMap((g) => g.subjects)
  .filter((v, i, a) => a.indexOf(v) === i)
