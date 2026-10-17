// Demo seed: random 80 o'qituvchi + fanlar (yoki boshqa son).
// Faqat sinov va demonstratsiya uchun. Haqiqiy maktab ma'lumotlariga tegmaydi.

import type { Project, Teacher, Subject } from '@/types'
import { newTeacher, newSubject, shortName, ENTITY_COLORS, SUBJECT_PRESETS } from '@/data/factories'

const LAST_NAMES = [
  'Aliyev', 'Valiyev', 'Karimov', 'Rahimov', 'Yusupov', 'Ergashev', 'Qodirov', 'Ismoilov',
  'Mamatqulov', 'Toshmatov', 'Nazarov', 'Haydarov', 'Jo‘rayev', 'Umarov', 'Mirzayev',
  'Xo‘jayev', 'Boboqulov', 'Qoraboyev', 'Sotivoldiyev', 'Qosimov', 'Rustamov', 'Saidov',
  'Nurmatov', 'Olimov', 'Abdullayev', 'Fayzullayev', 'Toshxo‘jayev', 'Ergashov', 'Soliyev',
  'Jalilov', 'Mahmudov', 'Abdurahmonov', 'Normatov', 'Boltayev', 'Shoyimov', 'Qarshiyev',
  'Rajabov', 'Hamdamov', 'Sayfullayev', 'Sanaqulov',
  'Aliyeva', 'Valiyeva', 'Karimova', 'Rahimova', 'Yusupova', 'Ergasheva', 'Qodirova',
  'Ismoilova', 'Toshmatova', 'Nazarova', 'Haydarova', 'Jo‘rayeva', 'Umarova', 'Mirzayeva',
  'Xo‘jayeva', 'Boboqulova', 'Qoraboyeva', 'Qosimova', 'Rustamova', 'Saidova', 'Olimova',
  'Abdullayeva', 'Fayzullayeva', 'Soliyeva', 'Jalilova', 'Mahmudova', 'Normatova',
  'Boltayeva', 'Shoyimova', 'Rajabova', 'Hamdamova', 'Sayfullayeva',
]

const FIRST_NAMES_M = [
  'Vali', 'Akram', 'Bekzod', 'Davron', 'Elyor', 'Farrux', 'G‘ani', 'Hasan', 'Islom', 'Jamshid',
  'Komil', 'Lochin', 'Murod', 'Nodir', 'Olim', 'Po‘lat', 'Qudrat', 'Rustam', 'Sardor', 'Temur',
  'Ulug‘bek', 'Vohid', 'Xondamir', 'Yoqub', 'Zafar', 'Abror', 'Botir', 'Doniyor', 'Erkin',
  'Jahongir', 'Mansur', 'Oybek', 'Shavkat', 'Sherzod', 'Oltinbek', 'Shuhrat', 'Faxriddin',
]

const FIRST_NAMES_F = [
  'Nilufar', 'Zarina', 'Dilbar', 'Gulnoza', 'Malika', 'Munisa', 'Shahnoza', 'Sayyora', 'Aziza',
  'Barno', 'Dilshoda', 'Gulnora', 'Hilola', 'Iroda', 'Kamola', 'Latofat', 'Madina', 'Nargiza',
  'Oydina', 'Rayhona', 'Sabina', 'Umida', 'Zebo', 'Nozima', 'Mohira', 'Shahlo', 'Nasiba',
]

const PATRONYMICS_M = [
  'Akramovich', 'Bekzodovich', 'Davronovich', 'Elyorovich', 'Farruxovich', 'Hasanovich',
  'Islomovich', 'Komilovich', 'Murodovich', 'Nodirovich', 'Olimovich', 'Rustamovich',
  'Sardorovich', 'Temurovich', 'Ulug‘bekovich', 'Vohidovich', 'Zafarovich', 'Abrorovich',
  'Jahongirovich', 'Mansurovich', 'Oybekovich', 'Shavkatovich', 'Sherzodovich', 'Shuhratovich',
]

const PATRONYMICS_F = [
  'Akramovna', 'Bekzodovna', 'Davronovna', 'Elyorovna', 'Farruxovna', 'Hasanovna',
  'Islomovna', 'Komilovna', 'Murodovna', 'Nodirovna', 'Olimovna', 'Rustamovna',
  'Sardorovna', 'Temurovna', 'Vohidovna', 'Zafarovna', 'Jahongirovna', 'Mansurovna',
  'Oybekovna', 'Shavkatovna', 'Sherzodovna', 'Shuhratovna',
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 1..3 ta random metodik kun — har ikki kun ketma-ket emas, workDays ichida. */
function randomMethodicalDays(workDays: number): number[] {
  // 1 kun — 50%, 2 kun — 35%, 3 kun — 15% (ta'lim amaliyotiga mos nisbat)
  const r = Math.random()
  const count = r < 0.5 ? 1 : r < 0.85 ? 2 : 3
  const pool = Array.from({ length: workDays }, (_, i) => i)
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}

function randomFullName(): string {
  const female = Math.random() < 0.45
  const last = pick(LAST_NAMES)
  const first = female ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M)
  const patr = female ? pick(PATRONYMICS_F) : pick(PATRONYMICS_M)
  return `${last} ${first} ${patr}`
}

export interface SeedResult {
  teachers: Teacher[]
  subjects: Subject[]
}

/**
 * Loyihaga qo'shiladigan random o'qituvchi va fanlarni tayyorlaydi.
 * Mavjud fan nomlari takrorlanmaydi (SUBJECT_PRESETS'dan yangilari qo'shiladi).
 */
export function generateDemoData(project: Project, teacherCount = 80): SeedResult {
  const { school, subjects: existingSubjects } = project
  const existingSubjNames = new Set(existingSubjects.map((s) => s.name.toLowerCase().trim()))

  // Yangi fanlar — hali qo'shilmaganlarini qo'shamiz
  const newSubjects: Subject[] = []
  SUBJECT_PRESETS.forEach((name, i) => {
    if (!existingSubjNames.has(name.toLowerCase().trim())) {
      newSubjects.push(newSubject(school, name, existingSubjects.length + i))
    }
  })

  // Fanlar: barcha mavjud + yangi
  const allSubjects = [...existingSubjects, ...newSubjects]

  // Takrorlanmas F.I.Sh.
  const usedNames = new Set(project.teachers.map((t) => t.fullName.toLowerCase().trim()))
  const newTeachers: Teacher[] = []
  let safety = teacherCount * 10
  while (newTeachers.length < teacherCount && safety-- > 0) {
    const fullName = randomFullName()
    const key = fullName.toLowerCase().trim()
    if (usedNames.has(key)) continue
    usedNames.add(key)

    const t = newTeacher(school, fullName)
    t.short = shortName(fullName)
    t.methodicalDays = randomMethodicalDays(school.workDays)
    // Random 1..3 ta fan tayinlaymiz
    const subjCount = randInt(1, 3)
    const pool = [...allSubjects]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    t.subjectIds = pool.slice(0, subjCount).map((s) => s.id)
    // Kunlik sig'im va haftalik norma — ozgina farqlansin
    t.dailyCapacity = randInt(4, 7)
    t.weeklyMax = randInt(18, 26)
    t.color = ENTITY_COLORS[newTeachers.length % ENTITY_COLORS.length]
    newTeachers.push(t)
  }

  return { teachers: newTeachers, subjects: newSubjects }
}
