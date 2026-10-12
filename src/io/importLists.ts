// ============================================================
// JadvalPro — Alohida ro'yxatlarni Excel'dan import qilish
// (O'qituvchi/Sinf/Xona — faqat shu ro'yxatning o'ziga qo'shiladi).
// Format: 1-qator sarlavha, keyingi qatorlar ma'lumot.
// ============================================================
import type { Project, SchoolClass, Teacher, Room } from '@/types'
import { newClass, newTeacher, newRoom } from '@/data/factories'
import { shortName } from '@/data/factories'

const s = (v: unknown) => String(v ?? '').trim()
const num = (v: unknown): number => {
  const t = s(v).replace(',', '.').replace(/\s/g, '')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

async function readFirstSheet(file: File): Promise<string[][]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '', raw: false }) as unknown[][]
  return aoa.map((r) => (Array.isArray(r) ? r.map(s) : []))
}

/** Sarlavhadan ustunlar indeksini topish (bir nechta sinonim bilan). Topilmasa -1. */
function findCol(header: string[], patterns: RegExp[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].toLowerCase()
    if (patterns.some((p) => p.test(h))) return i
  }
  return -1
}

export interface ImportListResult<T> {
  added: T[]
  errors: string[]
}

/** O'qituvchilarni Excel'dan import — F.I.Sh. (talab), telefon, haftalik norma, kunlik sig'im, metodik kun */
export async function importTeachersFromExcel(file: File, project: Project): Promise<ImportListResult<Teacher>> {
  const rows = await readFirstSheet(file)
  const errors: string[] = []
  if (rows.length < 2) return { added: [], errors: ['Faylda yetarli qator yo‘q'] }
  const header = rows[0]
  const cName = findCol(header, [/^f\.?\s*i\.?\s*sh?/i, /familiya/i, /ism/i, /^fio$/i, /ф\.?и\.?о/i, /учител/i])
  const cPhone = findCol(header, [/telefon/i, /phone/i, /тел/i])
  const cWeekly = findCol(header, [/haftalik/i, /norma/i, /weekly/i, /неделя/i])
  const cDaily = findCol(header, [/kunlik/i, /daily/i, /в день/i])
  const cMeth = findCol(header, [/metodik/i, /methodical/i, /метод/i])

  if (cName < 0) return { added: [], errors: ["F.I.Sh. ustuni topilmadi"] }

  const added: Teacher[] = []
  const existing = new Set(project.teachers.map((t) => t.fullName.toLowerCase()))
  for (let r = 1; r < rows.length; r++) {
    const name = s(rows[r][cName])
    if (!name) continue
    if (existing.has(name.toLowerCase())) {
      errors.push(`"${name}" — allaqachon mavjud, o‘tkazib yuborildi`)
      continue
    }
    const t = newTeacher(project.school, name)
    t.short = shortName(name)
    if (cPhone >= 0) t.phone = s(rows[r][cPhone])
    if (cWeekly >= 0) {
      const w = num(rows[r][cWeekly])
      if (w > 0) t.weeklyMax = w
    }
    if (cDaily >= 0) {
      const d = num(rows[r][cDaily])
      if (d > 0) t.dailyCapacity = d
    }
    if (cMeth >= 0) {
      const m = s(rows[r][cMeth]).toLowerCase()
      const map: Record<string, number> = { du: 0, se: 1, ch: 2, pa: 3, ju: 4, sh: 5, пн: 0, вт: 1, ср: 2, чт: 3, пт: 4, сб: 5 }
      const parts = m.split(/[,;\/\s]+/).filter(Boolean)
      const days: number[] = []
      for (const part of parts) {
        const idx = Object.entries(map).find(([k]) => part.startsWith(k))?.[1]
        if (idx != null && !days.includes(idx)) days.push(idx)
      }
      t.methodicalDays = days.sort((a, b) => a - b)
    }
    added.push(t)
    existing.add(name.toLowerCase())
  }
  return { added, errors }
}

/** Sinflarni Excel'dan import — nom (talab), qisqa, o'quvchi, navbat, bino */
export async function importClassesFromExcel(file: File, project: Project): Promise<ImportListResult<SchoolClass>> {
  const rows = await readFirstSheet(file)
  const errors: string[] = []
  if (rows.length < 2) return { added: [], errors: ['Faylda yetarli qator yo‘q'] }
  const h = rows[0]
  const cName = findCol(h, [/^sinf/i, /^nom/i, /name/i, /класс/i])
  const cShort = findCol(h, [/qisqa|short|крат/i])
  const cStud = findCol(h, [/o'?quvchi|student|учащ/i])
  const cShift = findCol(h, [/navbat|shift|смен/i])
  const cBld = findCol(h, [/bino|корп|building/i])
  if (cName < 0) return { added: [], errors: ['Sinf nomi ustuni topilmadi'] }

  const added: SchoolClass[] = []
  const existing = new Set(project.classes.map((c) => c.name.toLowerCase()))
  for (let r = 1; r < rows.length; r++) {
    const name = s(rows[r][cName])
    if (!name) continue
    if (existing.has(name.toLowerCase())) {
      errors.push(`"${name}" — allaqachon mavjud`)
      continue
    }
    const c = newClass(project.school, name)
    if (cShort >= 0 && s(rows[r][cShort])) c.short = s(rows[r][cShort])
    if (cStud >= 0) {
      const n = num(rows[r][cStud])
      if (n > 0) c.studentCount = Math.round(n)
    }
    if (cShift >= 0) {
      const n = num(rows[r][cShift])
      if (n >= 1 && n <= 3) c.shiftIndex = Math.round(n)
    }
    if (cBld >= 0 && s(rows[r][cBld])) c.building = s(rows[r][cBld])
    added.push(c)
    existing.add(name.toLowerCase())
  }
  return { added, errors }
}

/** Xonalarni Excel'dan import — nom (talab), qisqa, sig'im, tur, bino */
export async function importRoomsFromExcel(file: File, project: Project): Promise<ImportListResult<Room>> {
  const rows = await readFirstSheet(file)
  const errors: string[] = []
  if (rows.length < 2) return { added: [], errors: ['Faylda yetarli qator yo‘q'] }
  const h = rows[0]
  const cName = findCol(h, [/xona|room|каб/i])
  const cShort = findCol(h, [/qisqa|short|крат/i])
  const cCap = findCol(h, [/sig'?im|capacity|вмест|o'?rin/i])
  const cType = findCol(h, [/^tur$|type|тип/i])
  const cBld = findCol(h, [/bino|корп|building/i])
  if (cName < 0) return { added: [], errors: ['Xona nomi ustuni topilmadi'] }

  const added: Room[] = []
  const existing = new Set(project.rooms.map((r) => r.name.toLowerCase()))
  for (let r = 1; r < rows.length; r++) {
    const name = s(rows[r][cName])
    if (!name) continue
    if (existing.has(name.toLowerCase())) {
      errors.push(`"${name}" — allaqachon mavjud`)
      continue
    }
    const x = newRoom(project.school, name)
    if (cShort >= 0 && s(rows[r][cShort])) x.short = s(rows[r][cShort])
    if (cCap >= 0) {
      const n = num(rows[r][cCap])
      if (n > 0) x.capacity = Math.round(n)
    }
    if (cType >= 0 && s(rows[r][cType])) x.type = s(rows[r][cType])
    if (cBld >= 0 && s(rows[r][cBld])) x.building = s(rows[r][cBld])
    added.push(x)
    existing.add(name.toLowerCase())
  }
  return { added, errors }
}
