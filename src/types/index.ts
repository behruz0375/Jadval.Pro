// ============================================================
// JadvalPro — Ma'lumotlar modeli (TZ 4-bo'lim)
// ============================================================

/** Foydalanuvchi rollari: Admin(Egasi), Zavuch(director), O'qituvchi, O'quvchi */
export type Role = 'owner' | 'director' | 'deputy' | 'teacher' | 'student'

/** Ish vaqti matritsasi: [kun][dars] = true (ishlaydi) / false */
export type AvailabilityMatrix = boolean[][]

/** Hafta turi: butun (har hafta), surat (1-hafta / toq), maxraj (2-hafta / juft) */
export type WeekType = 'all' | 'num' | 'den'

// ---------------- Maktab ----------------
export interface LessonTime {
  index: number // 1..16
  start: string // "08:00"
  end: string // "08:45"
}

export interface Shift {
  index: number // 1..3
  startLesson: number // boshlanish dars raqami
  lessonCount: number // dars soni
  /** grid[dars 0..15][kun 0..5] = faolmi */
  grid: boolean[][]
}

export interface School {
  name: string
  academicYear: string
  director: string
  oibdo: string
  unionHead: string
  psychologist: string
  /** Rekvizitlar (ixtiyoriy) — hisobot/chop sarlavhalari uchun */
  address?: string
  region?: string
  phone?: string
  inn?: string // STIR
  /** Maktab logotipi/gerbi — data URL (base64), chop/PDF sarlavhasida */
  logo?: string
  lessonTimes: LessonTime[]
  shifts: Shift[]
  workDays: number // 5 yoki 6
  maxLessonsPerDay: number // kuniga maksimal darslar (ish vaqti matritsasi uchun)
  /** Qo'ng'iroq jadvali sozlamalari (avto-to'ldirish uchun) */
  lessonMin?: number // dars davomiyligi (daqiqa), standart 45
  breakMin?: number // tanaffus (daqiqa), standart 5
  bigBreakAfter?: number // nechanchi darsdan keyin katta tanaffus (0 = yo'q)
  bigBreakMin?: number // katta tanaffus (daqiqa)
  /** Binolar (korpuslar) ro'yxati va binolararo o'tish vaqti (daqiqa). Standart: 1 bino. */
  buildings?: Building[]
}

/** Bino (korpus): nomi, qisqa belgisi va boshqa binolargacha o'tish vaqti (daqiqa) */
export interface Building {
  id: string
  name: string
  short: string
  /** this.id -> other.id (daqiqa). Keyi mavjud bo'lmasa 0 deb hisoblanadi. */
  transitTo?: Record<string, number>
}

// ---------------- Sinf ----------------
export interface SchoolClass {
  id: string
  name: string
  short: string
  studentCount: number
  shiftIndex: number // 1..3
  building: string
  homeRoomId?: string
  /** Sinf rahbari — teacherId (ixtiyoriy) */
  classTeacherId?: string
  availability: AvailabilityMatrix
}

// ---------------- Fan ----------------
export interface Subject {
  id: string
  name: string
  short: string
  weight: number // 1..10 og'irlik (qiyinlik)
  requiredRoomType?: string
  color: string
  availability: AvailabilityMatrix
}

// ---------------- Xona ----------------
export interface Room {
  id: string
  name: string
  short: string
  capacity: number
  type: string
  building: string
  availability: AvailabilityMatrix
}

// ---------------- O'qituvchi ----------------
export interface Teacher {
  id: string
  fullName: string
  short: string
  phone: string
  subjectIds: string[]
  methodicalDays: number[] // [0,2,4] = Du,Ch,Ju; [] = yo'q
  /** @deprecated — eski formatdan migrate qilish uchun */
  methodicalDay?: number
  dailyCapacity: number
  weeklyMax: number
  minimizeGaps: boolean // "Darcha" — oynalarni kamaytirish
  color?: string // ro'yxat/ko'rinishdagi rang belgisi
  availability: AvailabilityMatrix
}

// ---------------- Dars (o'quv reja bandi) ----------------
export interface Placement {
  day: number
  slot: number
}

export interface Lesson {
  id: string
  subjectId: string
  classIds: string[]
  teacher1Id: string
  teacher2Id?: string
  roomId?: string
  hoursPerWeek: number
  consecutive: boolean // ketma-ket (juft dars)
  maxPerDay: number
  pinned: Placement[]
}

// ---------------- Jadval natijasi ----------------
export interface TimetableEntry {
  id: string
  lessonId: string
  classId: string
  teacherId: string
  teacher2Id?: string
  roomId?: string
  day: number // 0..5
  slot: number // 1..16
  locked?: boolean
  /** Hafta turi: belgilanmasa — har hafta (butun) */
  week?: WeekType
}

export interface TimetableStats {
  placed: number
  unplaced: number
  hardViolations: number
  softPenalty: number
  teacherGaps: number
}

export interface TimetableVersion {
  id: string
  name: string
  createdAt: string
  entries: TimetableEntry[]
  stats: TimetableStats
  /** Generatsiya seed'i — natijani aynan takrorlash uchun (ixtiyoriy) */
  seed?: number
}

// ---------------- Dastur sozlamalari ----------------
export interface AppSettings {
  theme: string
  zoom: number
  cellWidth: number
  cellHeight: number
  gradient: boolean
  compact: boolean
  secondRow: boolean
  blackWhite: boolean
  accent: string | null
}

// ---------------- Foydalanuvchilar / xavfsizlik ----------------
export interface UserAccount {
  id: string
  role: Role
  login: string
  /** SHA-256(salt + parol) */
  passwordHash: string
  salt: string
  fullName: string
  /** Hisob yaratilgan qurilma muhri (Maxsus kod) — boshqa qurilmada yaroqsiz */
  machineSeal: string
  createdAt: string
  active: boolean
}

export interface License {
  licenseId: string
  owner: string
  machineCode: string
  plan: string
  maxDirectors: number
  maxDeputies: number
  issuedAt: string
  expiresAt: string
  /** Ed25519 imzo (base64) — egasining maxfiy kaliti bilan */
  signature: string
}

// ---------------- Butun loyiha (bitta fayl) ----------------
export interface Project {
  meta: { appVersion: string; savedAt: string; fileVersion: number }
  school: School
  classes: SchoolClass[]
  subjects: Subject[]
  rooms: Room[]
  teachers: Teacher[]
  lessons: Lesson[]
  timetables: TimetableVersion[]
  settings: AppSettings
}
