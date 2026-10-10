// ============================================================
// AI yordamchi — TOOL REGISTRY
// Bu dasturdagi HAR QANDAY ishni bajara oladigan "asboblar" to'plami.
// Ham offline parser, ham LLM (Claude) shu bitta registrdan foydalanadi.
// Har tool: nomi, tavsifi, parametrlari (LLM JSON-schema uchun) va run().
// ============================================================
import type {
  Project, SchoolClass, Subject, Room, Teacher, Lesson, TimetableVersion, Shift,
} from '@/types'
import type { GenerateOptions } from '@/engine/generate'
import { newClass, newSubject, newRoom, newTeacher, newLesson } from '@/data/factories'
import { buildDemoProject } from '@/data/seed'
import { classLoad, teacherLoad, subjectLoad, countHardViolations } from '@/features/_shared/compute'
import { DAYS_UZ } from '@/constants'

// --------- Tiplar ---------

export type ParamType = 'string' | 'number' | 'boolean' | 'string[]'

export interface ToolParam {
  name: string
  type: ParamType
  description: string
  required?: boolean
  enum?: string[]
}

export interface ToolResult {
  ok: boolean
  message: string
  /** Bajarilgandan keyin o'tiladigan panel (ixtiyoriy) */
  navigate?: string
}

/** Tool bajarilganda beriladigan kontekst — barcha imkoniyatlar shu yerda */
export interface ToolContext {
  getProject: () => Project
  // Store mutatsiyalari
  addTeacher: (t: Teacher) => void
  updateTeacher: (id: string, patch: Partial<Teacher>) => void
  removeTeacher: (id: string) => void
  addClass: (c: SchoolClass) => void
  updateClass: (id: string, patch: Partial<SchoolClass>) => void
  removeClass: (id: string) => void
  addSubject: (s: Subject) => void
  updateSubject: (id: string, patch: Partial<Subject>) => void
  removeSubject: (id: string) => void
  addRoom: (r: Room) => void
  updateRoom: (id: string, patch: Partial<Room>) => void
  removeRoom: (id: string) => void
  addLesson: (l: Lesson) => void
  updateLesson: (id: string, patch: Partial<Lesson>) => void
  removeLesson: (id: string) => void
  addMany: (entity: 'classes' | 'subjects' | 'rooms' | 'teachers' | 'lessons', items: { id: string }[]) => void
  updateSchool: (patch: Partial<Project['school']>) => void
  setProject: (p: Project) => void
  newProject: () => void
  markSaved: () => void
  addTimetable: (v: TimetableVersion) => void
  updateTimetable: (id: string, patch: Partial<TimetableVersion>) => void
  removeTimetable: (id: string) => void
  // UI
  setActivePanel: (id: string) => void
  setTheme: (t: string) => void
  getTheme: () => string
  setLang: (l: 'uz' | 'ru' | 'en') => void
  back: () => void
  // Jadval generatsiyasi (async — AIAssistantPage ulaydi)
  generate: (opts: GenerateOptions, onProgress?: (p: number, m: string) => void) => Promise<TimetableVersion>
  improve: (onProgress?: (p: number, m: string) => void) => Promise<TimetableVersion>
  // IO
  saveProject: () => void | Promise<void>
  openProject: () => Promise<Project | null>
  exportData: (format: 'excel' | 'pdf' | 'word' | 'png' | 'csv') => Promise<string>
  backup: () => Promise<void>
  toast: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }
}

export interface ToolDef {
  name: string
  description: string
  params: ToolParam[]
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult> | ToolResult
}

// --------- Yordamchilar ---------

const s = (v: unknown): string => (v == null ? '' : String(v)).trim()
const n = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined
  const x = Number(v)
  return Number.isFinite(x) ? x : undefined
}
const titleCase = (x: string) => x.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ').trim()

/** Fuzzy entity qidirish nom/qisqa bo'yicha */
function findEntity<T extends { id: string; fullName?: string; name?: string; short?: string }>(
  list: T[], query: string,
): T | null {
  const q = query.toLowerCase().trim()
  if (!q) return null
  const nameOf = (x: T) => (x.fullName ?? x.name ?? '').toLowerCase()
  const shortOf = (x: T) => (x.short ?? '').toLowerCase()
  return (
    list.find((x) => nameOf(x) === q || shortOf(x) === q) ||
    list.find((x) => nameOf(x).startsWith(q) || shortOf(x).startsWith(q)) ||
    list.find((x) => nameOf(x).includes(q) || shortOf(x).includes(q)) ||
    null
  )
}

type AnyEntity = 'teacher' | 'class' | 'subject' | 'room' | 'lesson'
function listForEntity(p: Project, e: AnyEntity) {
  return e === 'teacher' ? p.teachers : e === 'class' ? p.classes : e === 'subject' ? p.subjects : e === 'room' ? p.rooms : p.lessons
}
function entityUz(e: AnyEntity, plural = false): string {
  const m: Record<AnyEntity, [string, string]> = {
    teacher: ["o'qituvchi", "o'qituvchilar"], class: ['sinf', 'sinflar'],
    subject: ['fan', 'fanlar'], room: ['xona', 'xonalar'], lesson: ['dars', 'darslar'],
  }
  return plural ? m[e][1] : m[e][0]
}
function panelForEntity(e: AnyEntity): string {
  return { teacher: 'teachers', class: 'classes', subject: 'subjects', room: 'rooms', lesson: 'lessons' }[e]
}

/** Kun nomini 0..5 indeksga aylantirish (dushanba=0). RU/EN ham. */
function parseDay(x: string): number | null {
  const t = x.toLowerCase().trim()
  const maps: [RegExp, number][] = [
    [/^(du|dush|понед|mon)/, 0], [/^(se|sesh|втор|tue)/, 1], [/^(ch|chor|сред|wed)/, 2],
    [/^(pa|paysh|четв|thu)/, 3], [/^(ju|jum|пятн|fri)/, 4], [/^(sh|shan|суб|sat)/, 5],
  ]
  for (const [re, i] of maps) if (re.test(t)) return i
  const num = Number(t)
  if (Number.isFinite(num) && num >= 1 && num <= 6) return num - 1
  return null
}

/** Jadvaldan sinf/o'qituvchi uchun yozuvlarni olish */
function entriesFor(v: { entries: { classId: string; teacherId: string; day: number; slot: number; lessonId: string }[] }, key: 'classId' | 'teacherId', id: string) {
  return v.entries.filter((e) => e[key] === id).sort((a, b) => a.day - b.day || a.slot - b.slot)
}

// --------- TOOL REGISTRY ---------

export const TOOLS: ToolDef[] = [
  // ============ YARATISH ============
  {
    name: 'add_teacher',
    description: "Yangi o'qituvchi qo'shadi. Ismi, o'qitadigan fanlari, haftalik norma, kunlik sig'im va metodik kunini belgilash mumkin.",
    params: [
      { name: 'name', type: 'string', description: "O'qituvchining to'liq ismi (F.I.Sh.)", required: true },
      { name: 'subjects', type: 'string[]', description: "O'qitadigan fan nomlari ro'yxati (ixtiyoriy)" },
      { name: 'weeklyMax', type: 'number', description: 'Haftalik maksimal soat (ixtiyoriy, standart 24)' },
      { name: 'dailyCapacity', type: 'number', description: "Kunlik maksimal dars soni (ixtiyoriy, standart 6)" },
      { name: 'methodicalDay', type: 'string', description: "Metodik kun nomi: Dushanba..Shanba (ixtiyoriy)" },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const name = titleCase(s(a.name))
      if (!name) return { ok: false, message: "O'qituvchi ismini ayting." }
      const t = newTeacher(p.school, name)
      const wk = n(a.weeklyMax); if (wk != null) t.weeklyMax = wk
      const dc = n(a.dailyCapacity); if (dc != null) t.dailyCapacity = dc
      // Fanlarni biriktirish
      const subs = Array.isArray(a.subjects) ? a.subjects.map(s) : []
      if (subs.length) {
        t.subjectIds = subs.map((sn) => findEntity(p.subjects, sn)?.id).filter(Boolean) as string[]
      }
      // Metodik kun
      const md = s(a.methodicalDay)
      if (md) {
        const idx = DAYS_UZ.findIndex((d) => d.toLowerCase().startsWith(md.toLowerCase().slice(0, 3)))
        if (idx >= 0) t.methodicalDay = idx
      }
      ctx.addTeacher(t)
      return { ok: true, message: `✓ "${name}" o'qituvchi qo'shildi.`, navigate: 'teachers' }
    },
  },
  {
    name: 'add_class',
    description: "Yangi sinf qo'shadi. Nomi, navbati, binosi va sinf rahbarini belgilash mumkin.",
    params: [
      { name: 'name', type: 'string', description: 'Sinf nomi, masalan "5-A"', required: true },
      { name: 'shift', type: 'number', description: 'Navbat raqami (1, 2, 3...) — ixtiyoriy' },
      { name: 'building', type: 'string', description: 'Bino nomi (ixtiyoriy)' },
      { name: 'classTeacher', type: 'string', description: "Sinf rahbari o'qituvchi ismi (ixtiyoriy)" },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const name = s(a.name)
      if (!name) return { ok: false, message: 'Sinf nomini ayting.' }
      const c = newClass(p.school, name)
      c.short = name
      const sh = n(a.shift); if (sh && sh >= 1) c.shiftIndex = sh
      const b = s(a.building); if (b) c.building = b
      const ct = s(a.classTeacher)
      if (ct) { const t = findEntity(p.teachers, ct); if (t) c.classTeacherId = t.id }
      ctx.addClass(c)
      return { ok: true, message: `✓ "${name}" sinfi qo'shildi.`, navigate: 'classes' }
    },
  },
  {
    name: 'add_subject',
    description: "Yangi fan qo'shadi.",
    params: [{ name: 'name', type: 'string', description: 'Fan nomi, masalan "Matematika"', required: true }],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const name = titleCase(s(a.name))
      if (!name) return { ok: false, message: 'Fan nomini ayting.' }
      ctx.addSubject(newSubject(p.school, name, p.subjects.length))
      return { ok: true, message: `✓ "${name}" fani qo'shildi.`, navigate: 'subjects' }
    },
  },
  {
    name: 'add_room',
    description: "Yangi xona (kabinet) qo'shadi. Sig'imi va turini belgilash mumkin.",
    params: [
      { name: 'name', type: 'string', description: 'Xona nomi/raqami, masalan "101"', required: true },
      { name: 'capacity', type: 'number', description: "Sig'imi (o'quvchilar soni) — ixtiyoriy" },
      { name: 'type', type: 'string', description: 'Xona turi, masalan "Fizika laboratoriyasi" — ixtiyoriy' },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const name = s(a.name)
      if (!name) return { ok: false, message: 'Xona nomini ayting.' }
      const r = newRoom(p.school, name)
      const cap = n(a.capacity); if (cap != null) r.capacity = cap
      const ty = s(a.type); if (ty) r.type = ty
      ctx.addRoom(r)
      return { ok: true, message: `✓ "${name}" xonasi qo'shildi.`, navigate: 'rooms' }
    },
  },
  {
    name: 'add_lesson',
    description: "Yangi dars qo'shadi: fan + sinf(lar) + o'qituvchi + haftalik soat. Bu o'quv rejaning asosiy bandi.",
    params: [
      { name: 'subject', type: 'string', description: 'Fan nomi', required: true },
      { name: 'classes', type: 'string[]', description: 'Sinf nomlari (bitta yoki bir nechta — birlashgan dars)', required: true },
      { name: 'teacher', type: 'string', description: "O'qituvchi ismi", required: true },
      { name: 'hours', type: 'number', description: 'Haftalik soat', required: true },
      { name: 'consecutive', type: 'boolean', description: 'Juft (ketma-ket) dars bo\'lsinmi — ixtiyoriy' },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const subj = findEntity(p.subjects, s(a.subject))
      if (!subj) return { ok: false, message: `"${s(a.subject)}" fani topilmadi. Avval fanni qo'shing.` }
      const teacher = findEntity(p.teachers, s(a.teacher))
      if (!teacher) return { ok: false, message: `"${s(a.teacher)}" o'qituvchi topilmadi.` }
      const clsNames = Array.isArray(a.classes) ? a.classes.map(s) : [s(a.classes)]
      const clsIds: string[] = []
      for (const cn of clsNames) {
        const c = findEntity(p.classes, cn)
        if (!c) return { ok: false, message: `"${cn}" sinfi topilmadi.` }
        clsIds.push(c.id)
      }
      const hours = n(a.hours) ?? 1
      const l = newLesson(p.school)
      l.subjectId = subj.id
      l.classIds = clsIds
      l.teacher1Id = teacher.id
      l.hoursPerWeek = hours
      l.consecutive = a.consecutive === true
      ctx.addLesson(l)
      const clsLabel = clsNames.join(', ')
      return { ok: true, message: `✓ Dars qo'shildi: ${subj.name} — ${clsLabel} — ${teacher.short} (${hours} soat).`, navigate: 'lessons' }
    },
  },
  {
    name: 'bulk_add_classes',
    description: 'Ko\'p sinfni bir vaqtda yaratadi, masalan 1-sinfdan 11-sinfgacha A va B harflar bilan.',
    params: [
      { name: 'fromGrade', type: 'number', description: 'Boshlang\'ich sinf raqami, masalan 1', required: true },
      { name: 'toGrade', type: 'number', description: 'Oxirgi sinf raqami, masalan 11', required: true },
      { name: 'letters', type: 'string[]', description: 'Harflar ro\'yxati, masalan ["A","B"]', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const from = n(a.fromGrade) ?? 1
      const to = n(a.toGrade) ?? from
      const letters = (Array.isArray(a.letters) ? a.letters.map(s) : [s(a.letters)]).filter(Boolean)
      if (letters.length === 0) return { ok: false, message: 'Harflarni ayting, masalan A, B.' }
      if (to < from || to - from > 15) return { ok: false, message: "Sinf oralig'i noto'g'ri." }
      const created: SchoolClass[] = []
      for (let g = from; g <= to; g++) {
        for (const L of letters) {
          const name = `${g}-${L.toUpperCase()}`
          const c = newClass(p.school, name)
          c.short = name
          created.push(c)
        }
      }
      ctx.addMany('classes', created)
      return { ok: true, message: `✓ ${created.length} ta sinf yaratildi (${from}-${to}, ${letters.join('/')}).`, navigate: 'classes' }
    },
  },

  // ============ TAHRIRLASH ============
  {
    name: 'update_teacher',
    description: "O'qituvchi ma'lumotlarini o'zgartiradi: haftalik norma, kunlik sig'im, metodik kun.",
    params: [
      { name: 'name', type: 'string', description: "O'qituvchi ismi", required: true },
      { name: 'weeklyMax', type: 'number', description: 'Yangi haftalik maksimal soat (ixtiyoriy)' },
      { name: 'dailyCapacity', type: 'number', description: 'Yangi kunlik sig\'im (ixtiyoriy)' },
      { name: 'methodicalDay', type: 'string', description: 'Metodik kun nomi yoki "yo\'q" (ixtiyoriy)' },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const t = findEntity(p.teachers, s(a.name))
      if (!t) return { ok: false, message: `"${s(a.name)}" o'qituvchi topilmadi.` }
      const patch: Partial<Teacher> = {}
      const wk = n(a.weeklyMax); if (wk != null) patch.weeklyMax = wk
      const dc = n(a.dailyCapacity); if (dc != null) patch.dailyCapacity = dc
      const md = s(a.methodicalDay)
      if (md) {
        if (/yo'q|yoq|нет|none/i.test(md)) patch.methodicalDay = -1
        else {
          const idx = DAYS_UZ.findIndex((d) => d.toLowerCase().startsWith(md.toLowerCase().slice(0, 3)))
          if (idx >= 0) patch.methodicalDay = idx
        }
      }
      if (Object.keys(patch).length === 0) return { ok: false, message: 'Nimani o\'zgartirishni aniq ayting (norma, sig\'im, metodik kun).' }
      ctx.updateTeacher(t.id, patch)
      return { ok: true, message: `✓ ${t.short} ma'lumotlari yangilandi.`, navigate: 'teachers' }
    },
  },
  {
    name: 'update_class',
    description: 'Sinf ma\'lumotlarini o\'zgartiradi: navbat, bino, sinf rahbari.',
    params: [
      { name: 'name', type: 'string', description: 'Sinf nomi', required: true },
      { name: 'shift', type: 'number', description: 'Yangi navbat raqami (ixtiyoriy)' },
      { name: 'building', type: 'string', description: 'Yangi bino (ixtiyoriy)' },
      { name: 'classTeacher', type: 'string', description: 'Sinf rahbari ismi (ixtiyoriy)' },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const c = findEntity(p.classes, s(a.name))
      if (!c) return { ok: false, message: `"${s(a.name)}" sinfi topilmadi.` }
      const patch: Partial<SchoolClass> = {}
      const sh = n(a.shift); if (sh && sh >= 1) patch.shiftIndex = sh
      const b = s(a.building); if (b) patch.building = b
      const ct = s(a.classTeacher)
      if (ct) { const t = findEntity(p.teachers, ct); if (t) patch.classTeacherId = t.id }
      if (Object.keys(patch).length === 0) return { ok: false, message: 'Nimani o\'zgartirishni ayting (navbat, bino, rahbar).' }
      ctx.updateClass(c.id, patch)
      return { ok: true, message: `✓ ${c.name} yangilandi.`, navigate: 'classes' }
    },
  },
  {
    name: 'rename_entity',
    description: "O'qituvchi, sinf, fan yoki xona nomini o'zgartiradi.",
    params: [
      { name: 'entity', type: 'string', description: 'Tur', required: true, enum: ['teacher', 'class', 'subject', 'room'] },
      { name: 'from', type: 'string', description: 'Joriy nomi', required: true },
      { name: 'to', type: 'string', description: 'Yangi nomi', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const entity = s(a.entity) as AnyEntity
      const from = s(a.from); const to = s(a.to)
      if (!to) return { ok: false, message: 'Yangi nomni ayting.' }
      const list = listForEntity(p, entity) as { id: string; fullName?: string; name?: string }[]
      const found = findEntity(list, from)
      if (!found) return { ok: false, message: `"${from}" ${entityUz(entity)} topilmadi.` }
      if (entity === 'teacher') ctx.updateTeacher(found.id, { fullName: titleCase(to) })
      else if (entity === 'class') ctx.updateClass(found.id, { name: to, short: to })
      else if (entity === 'subject') ctx.updateSubject(found.id, { name: titleCase(to) })
      else if (entity === 'room') ctx.updateRoom(found.id, { name: to })
      return { ok: true, message: `✓ Nomi o'zgartirildi: "${to}".`, navigate: panelForEntity(entity) }
    },
  },
  {
    name: 'assign_subject_to_teacher',
    description: "O'qituvchiga fan biriktiradi (o'qituvchi shu fanni o'qitadi).",
    params: [
      { name: 'teacher', type: 'string', description: "O'qituvchi ismi", required: true },
      { name: 'subject', type: 'string', description: 'Fan nomi', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const t = findEntity(p.teachers, s(a.teacher))
      if (!t) return { ok: false, message: `"${s(a.teacher)}" o'qituvchi topilmadi.` }
      const subj = findEntity(p.subjects, s(a.subject))
      if (!subj) return { ok: false, message: `"${s(a.subject)}" fani topilmadi.` }
      if (t.subjectIds.includes(subj.id)) return { ok: true, message: `${t.short} allaqachon ${subj.name} fanini o'qitadi.` }
      ctx.updateTeacher(t.id, { subjectIds: [...t.subjectIds, subj.id] })
      return { ok: true, message: `✓ ${t.short}ga "${subj.name}" fani biriktirildi.`, navigate: 'teachers' }
    },
  },

  // ============ O'CHIRISH ============
  {
    name: 'delete_entity',
    description: "O'qituvchi, sinf, fan, xona yoki darsni o'chiradi.",
    params: [
      { name: 'entity', type: 'string', description: 'Tur', required: true, enum: ['teacher', 'class', 'subject', 'room', 'lesson'] },
      { name: 'name', type: 'string', description: 'O\'chiriladigan element nomi', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const entity = s(a.entity) as AnyEntity
      const list = listForEntity(p, entity) as { id: string; fullName?: string; name?: string }[]
      const found = findEntity(list, s(a.name))
      if (!found) return { ok: false, message: `"${s(a.name)}" nomli ${entityUz(entity)} topilmadi.` }
      const label = found.fullName ?? found.name ?? ''
      if (entity === 'teacher') ctx.removeTeacher(found.id)
      else if (entity === 'class') ctx.removeClass(found.id)
      else if (entity === 'subject') ctx.removeSubject(found.id)
      else if (entity === 'room') ctx.removeRoom(found.id)
      else if (entity === 'lesson') ctx.removeLesson(found.id)
      return { ok: true, message: `✓ "${label}" o'chirildi.`, navigate: panelForEntity(entity) }
    },
  },

  // ============ JADVAL ============
  {
    name: 'generate_timetable',
    description: "Avtomatik dars jadvalini tuzadi. Bu dasturning asosiy vazifasi. Bir necha urinish qilib eng yaxshisini saqlaydi.",
    params: [
      { name: 'restarts', type: 'number', description: 'Urinishlar soni 1-10 (ko\'proq = yaxshiroq, lekin sekinroq). Standart 3.' },
    ],
    run: async (a, ctx) => {
      const p = ctx.getProject()
      if (p.lessons.length === 0) return { ok: false, message: 'Avval darslarni kiriting — jadval tuzish uchun o\'quv reja kerak.' }
      ctx.setActivePanel('distribution')
      const restarts = Math.min(10, Math.max(1, n(a.restarts) ?? 3))
      const v = await ctx.generate({ seed: Math.floor(Math.random() * 1e9), considerRooms: true, spreadDays: true, minimizeGaps: true, restarts, autoRelax: true })
      ctx.addTimetable(v)
      const total = v.stats.placed + v.stats.unplaced
      if (v.stats.unplaced === 0) {
        return { ok: true, message: `✓ Jadval tayyor! Barcha ${v.stats.placed} dars joylashtirildi. Qat'iy to'qnashuv: ${v.stats.hardViolations}, o'qituvchi oynalari: ${v.stats.teacherGaps}.` }
      }
      // Unplaced > 0 — foydalanuvchiga aqlli tushuntirish va amaliy tavsiya
      const pct = Math.round((v.stats.placed / total) * 100)
      const proj = ctx.getProject()
      const workDays = proj.school.workDays
      const nClasses = proj.classes.length
      const capacity = nClasses * workDays * 6
      const reasonLines: string[] = []
      if (total > capacity) {
        reasonLines.push(`• Umumiy soatlar (${total}) sinflarning fizik sig'imidan (${capacity} = ${nClasses} sinf × ${workDays} kun × 6 dars) oshib ketdi.`)
        reasonLines.push(`• Yechim: Maktab → "Kuniga maksimal dars" ni 7-8 ga oshiring, YOKI ish kunlari sonini 6 ga ko'tiring, YOKI darslar sonini kamaytiring.`)
      } else {
        reasonLines.push(`• O'qituvchilar yoki xonalar yetarli emas bo'lishi mumkin — Konfliktlar bo'limida tekshiring.`)
        reasonLines.push(`• Yechim: Ba'zi o'qituvchilarning kunlik sig'im/haftalik normasini oshiring, yoki yangi o'qituvchi/xona qo'shing.`)
      }
      return { ok: true, message: `✓ Jadval tuzildi: ${v.stats.placed}/${total} dars (${pct}%) joylashtirildi.\n\n${v.stats.unplaced} dars joylashmadi, sabablari:\n${reasonLines.join('\n')}` }
    },
  },
  {
    name: 'improve_timetable',
    description: "Mavjud jadvalni yaxshilaydi — o'qituvchi va sinf oynalarini (darchalarni) kamaytiradi.",
    params: [],
    run: async (_a, ctx) => {
      const p = ctx.getProject()
      const latest = p.timetables[p.timetables.length - 1]
      if (!latest || latest.entries.length === 0) return { ok: false, message: 'Avval jadval tuzing.' }
      ctx.setActivePanel('distribution')
      const v = await ctx.improve()
      ctx.addTimetable(v)
      return { ok: true, message: `✓ Yaxshilandi — o'qituvchi oynalari: ${v.stats.teacherGaps}. Yana takrorlab yanada kamaytirish mumkin.` }
    },
  },

  // ============ TAHLIL / SAVOL ============
  {
    name: 'count_entities',
    description: "Nechta o'qituvchi/sinf/fan/xona/dars borligini aytadi.",
    params: [{ name: 'entity', type: 'string', description: 'Tur', required: true, enum: ['teacher', 'class', 'subject', 'room', 'lesson'] }],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const entity = s(a.entity) as AnyEntity
      const cnt = listForEntity(p, entity).length
      return { ok: true, message: `${titleCase(entityUz(entity, true))}: ${cnt} ta.` }
    },
  },
  {
    name: 'list_entities',
    description: "O'qituvchi/sinf/fan/xona ro'yxatini ko'rsatadi.",
    params: [{ name: 'entity', type: 'string', description: 'Tur', required: true, enum: ['teacher', 'class', 'subject', 'room', 'lesson'] }],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const entity = s(a.entity) as AnyEntity
      const list = listForEntity(p, entity) as { fullName?: string; name?: string }[]
      if (list.length === 0) return { ok: true, message: `Hali hech qanday ${entityUz(entity)} yo'q.` }
      const names = list.slice(0, 30).map((x) => x.fullName ?? x.name ?? '').join(', ')
      const more = list.length > 30 ? ` …va yana ${list.length - 30} ta.` : ''
      return { ok: true, message: `${titleCase(entityUz(entity, true))} (${list.length}): ${names}.${more}`, navigate: panelForEntity(entity) }
    },
  },
  {
    name: 'teacher_load',
    description: "Bitta o'qituvchining haftalik yuklamasini (soatini) aytadi.",
    params: [{ name: 'teacher', type: 'string', description: "O'qituvchi ismi", required: true }],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const t = findEntity(p.teachers, s(a.teacher))
      if (!t) return { ok: false, message: `"${s(a.teacher)}" o'qituvchi topilmadi.` }
      const load = teacherLoad(t.id, p.lessons)
      return { ok: true, message: `${t.short} yuklamasi: ${load} soat/hafta (norma: ${t.weeklyMax}).` }
    },
  },
  {
    name: 'busiest_teacher',
    description: "Eng band (eng ko'p yuklamali) o'qituvchini topadi.",
    params: [],
    run: (_a, ctx) => {
      const p = ctx.getProject()
      if (p.teachers.length === 0) return { ok: false, message: "Hali o'qituvchilar yo'q." }
      const ranked = p.teachers.map((t) => ({ t, load: teacherLoad(t.id, p.lessons) })).sort((x, y) => y.load - x.load)
      const top = ranked[0]
      return { ok: true, message: `Eng band o'qituvchi: ${top.t.short} — ${top.load} soat/hafta.` }
    },
  },
  {
    name: 'class_load',
    description: 'Bitta sinfning haftalik yuklamasini (umumiy soatini) aytadi.',
    params: [{ name: 'class', type: 'string', description: 'Sinf nomi', required: true }],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const c = findEntity(p.classes, s(a.class))
      if (!c) return { ok: false, message: `"${s(a.class)}" sinfi topilmadi.` }
      return { ok: true, message: `${c.name} yuklamasi: ${classLoad(c.id, p.lessons)} soat/hafta.` }
    },
  },
  {
    name: 'schedule_stats',
    description: "Oxirgi tuzilgan jadval sifati haqida ma'lumot: joylashtirilgan darslar, qat'iy buzilishlar, o'qituvchi oynalari.",
    params: [],
    run: (_a, ctx) => {
      const p = ctx.getProject()
      const v = p.timetables[p.timetables.length - 1]
      if (!v) return { ok: false, message: 'Hali jadval tuzilmagan.' }
      const total = v.stats.placed + v.stats.unplaced
      return { ok: true, message: `Oxirgi jadval "${v.name}": ${v.stats.placed}/${total} dars joylashgan, qat'iy buzilish ${v.stats.hardViolations}, o'qituvchi oynalari ${v.stats.teacherGaps}, yumshoq jarima ${v.stats.softPenalty}.` }
    },
  },

  // ============ FAYL / SOZLAMA ============
  {
    name: 'save_project',
    description: 'Loyihani faylga (.jadval) saqlaydi.',
    params: [],
    run: async (_a, ctx) => { await ctx.saveProject(); ctx.markSaved(); return { ok: true, message: '✓ Loyiha faylga saqlandi.' } },
  },
  {
    name: 'open_project',
    description: 'Saqlangan loyiha faylini ochadi.',
    params: [],
    run: async (_a, ctx) => {
      const p = await ctx.openProject()
      if (p) { ctx.setProject(p); return { ok: true, message: `✓ "${p.school.name || 'Loyiha'}" ochildi.` } }
      return { ok: false, message: 'Fayl tanlanmadi.' }
    },
  },
  {
    name: 'new_project',
    description: 'Yangi bo\'sh loyiha boshlaydi (avval avto-backup qiladi).',
    params: [],
    run: async (_a, ctx) => { await ctx.backup().catch(() => {}); ctx.newProject(); return { ok: true, message: '✓ Yangi loyiha boshlandi.', navigate: 'school' } },
  },
  {
    name: 'load_demo',
    description: 'Namuna (demo) maktab ma\'lumotlarini yuklaydi — sinab ko\'rish uchun.',
    params: [],
    run: (_a, ctx) => { ctx.setProject(buildDemoProject()); return { ok: true, message: "✓ Namuna ma'lumotlar yuklandi.", navigate: 'dashboard' } },
  },
  {
    name: 'backup',
    description: 'Hozirgi holatning rezerv nusxasini yaratadi.',
    params: [],
    run: async (_a, ctx) => { await ctx.backup(); return { ok: true, message: '✓ Rezerv nusxa yaratildi.' } },
  },
  {
    name: 'export_data',
    description: "Ma'lumot yoki jadvalni faylga eksport qiladi (Excel, PDF, Word, PNG, CSV).",
    params: [{ name: 'format', type: 'string', description: 'Format', required: true, enum: ['excel', 'pdf', 'word', 'png', 'csv'] }],
    run: async (a, ctx) => {
      const fmt = s(a.format).toLowerCase() as 'excel' | 'pdf' | 'word' | 'png' | 'csv'
      const msg = await ctx.exportData(fmt)
      return { ok: true, message: msg }
    },
  },
  {
    name: 'set_language',
    description: "Dastur tilini o'zgartiradi (o'zbek, rus, ingliz).",
    params: [{ name: 'lang', type: 'string', description: 'Til', required: true, enum: ['uz', 'ru', 'en'] }],
    run: (a, ctx) => {
      const lang = s(a.lang).toLowerCase() as 'uz' | 'ru' | 'en'
      ctx.setLang(lang)
      const names = { uz: "O'zbek", ru: 'Русский', en: 'English' }
      return { ok: true, message: `✓ Til: ${names[lang] ?? lang}` }
    },
  },
  {
    name: 'set_theme',
    description: "Rang mavzusini o'zgartiradi yoki qorong'u/yorug' rejimga o'tkazadi.",
    params: [{ name: 'theme', type: 'string', description: 'Mavzu id yoki "dark"/"light"/"qorong\'u"/"yorug\'"', required: true }],
    run: (a, ctx) => {
      const raw = s(a.theme).toLowerCase()
      let theme = raw
      if (/qorong|тёмн|темн|dark|night/.test(raw)) theme = 'dark'
      else if (/yorug|светл|light|oq/.test(raw)) theme = 'softgray'
      ctx.setTheme(theme)
      return { ok: true, message: `✓ Mavzu: ${theme}` }
    },
  },
  {
    name: 'set_school',
    description: "Maktab ma'lumotlarini o'rnatadi: nomi, ish kunlari soni.",
    params: [
      { name: 'name', type: 'string', description: 'Maktab nomi (ixtiyoriy)' },
      { name: 'workDays', type: 'number', description: 'Haftadagi ish kunlari (5 yoki 6) — ixtiyoriy' },
    ],
    run: (a, ctx) => {
      const patch: Partial<Project['school']> = {}
      const nm = s(a.name); if (nm) patch.name = nm
      const wd = n(a.workDays); if (wd && wd >= 1 && wd <= 7) patch.workDays = wd
      if (Object.keys(patch).length === 0) return { ok: false, message: 'Maktab nomi yoki ish kunlarini ayting.' }
      ctx.updateSchool(patch)
      return { ok: true, message: `✓ Maktab ma'lumoti yangilandi.`, navigate: 'school' }
    },
  },
  // ============ KUCHLI AMALLAR ============
  {
    name: 'set_teacher_availability',
    description: "O'qituvchining biror kunini ish/dam kuniga belgilaydi (masalan 'Aliyev dushanba kuni dars bermaydi').",
    params: [
      { name: 'teacher', type: 'string', description: "O'qituvchi ismi", required: true },
      { name: 'day', type: 'string', description: 'Kun nomi (Dushanba..Shanba)', required: true },
      { name: 'available', type: 'boolean', description: 'true = ishlaydi, false = dars bermaydi', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const t = findEntity(p.teachers, s(a.teacher))
      if (!t) return { ok: false, message: `"${s(a.teacher)}" o'qituvchi topilmadi.` }
      const d = parseDay(s(a.day))
      if (d == null) return { ok: false, message: 'Kunni aniq ayting (Dushanba..Shanba).' }
      // LLM `a.available` ni string ("false"/"true") qaytarishi mumkin — kuchli boolean coercion
      const available = a.available === false || a.available === 'false' || a.available === 0 || a.available === '0' ? false : true
      const avail = t.availability.map((row, i) => (i === d ? row.map(() => available) : row.slice()))
      ctx.updateTeacher(t.id, { availability: avail })
      return { ok: true, message: `✓ ${t.short} — ${DAYS_UZ[d]} kuni ${available ? 'ishlaydi' : 'dars bermaydi'}.`, navigate: 'teachers' }
    },
  },
  {
    name: 'set_class_availability',
    description: 'Sinfning biror kunini ish/dam kuniga belgilaydi.',
    params: [
      { name: 'class', type: 'string', description: 'Sinf nomi', required: true },
      { name: 'day', type: 'string', description: 'Kun nomi', required: true },
      { name: 'available', type: 'boolean', description: 'true = o\'qiydi, false = dars yo\'q', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const c = findEntity(p.classes, s(a.class))
      if (!c) return { ok: false, message: `"${s(a.class)}" sinfi topilmadi.` }
      const d = parseDay(s(a.day))
      if (d == null) return { ok: false, message: 'Kunni aniq ayting.' }
      const available = a.available === false || a.available === 'false' || a.available === 0 || a.available === '0' ? false : true
      const avail = c.availability.map((row, i) => (i === d ? row.map(() => available) : row.slice()))
      ctx.updateClass(c.id, { availability: avail })
      return { ok: true, message: `✓ ${c.name} — ${DAYS_UZ[d]} kuni ${available ? 'o\'qiydi' : 'dars yo\'q'}.`, navigate: 'classes' }
    },
  },
  {
    name: 'add_lesson_to_grade',
    description: "Bir parallel (masalan barcha 5-sinflar: 5-A, 5-B...) ga bir xil darsni qo'shadi.",
    params: [
      { name: 'subject', type: 'string', description: 'Fan nomi', required: true },
      { name: 'grade', type: 'number', description: 'Sinf raqami (parallel), masalan 5', required: true },
      { name: 'teacher', type: 'string', description: "O'qituvchi ismi (ixtiyoriy — har sinfga bitta o'qituvchi)" },
      { name: 'hours', type: 'number', description: 'Haftalik soat', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const subj = findEntity(p.subjects, s(a.subject))
      if (!subj) return { ok: false, message: `"${s(a.subject)}" fani topilmadi.` }
      const grade = n(a.grade)
      if (!grade) return { ok: false, message: 'Sinf raqamini ayting.' }
      const teacher = s(a.teacher) ? findEntity(p.teachers, s(a.teacher)) : null
      const hours = n(a.hours) ?? 1
      // Shu parallel sinflar: nomi "<grade>-" bilan boshlanadigan yoki raqami mos
      const classes = p.classes.filter((c) => {
        const m = /(\d+)/.exec(c.name)
        return m && Number(m[1]) === grade
      })
      if (classes.length === 0) return { ok: false, message: `${grade}-sinflar topilmadi.` }
      const lessons: Lesson[] = classes.map((c) => {
        const l = newLesson(p.school)
        l.subjectId = subj.id; l.classIds = [c.id]; l.hoursPerWeek = hours
        if (teacher) l.teacher1Id = teacher.id
        return l
      })
      ctx.addMany('lessons', lessons)
      return { ok: true, message: `✓ ${classes.length} ta ${grade}-sinfga "${subj.name}" (${hours} soat) qo'shildi.`, navigate: 'lessons' }
    },
  },
  {
    name: 'query_schedule',
    description: "Sinf yoki o'qituvchining jadvalini ko'rsatadi — qaysi kun, qaysi darslar. Kun berilsa faqat o'sha kun.",
    params: [
      { name: 'target', type: 'string', description: 'Tur', required: true, enum: ['class', 'teacher'] },
      { name: 'name', type: 'string', description: 'Sinf yoki o\'qituvchi nomi', required: true },
      { name: 'day', type: 'string', description: 'Kun (ixtiyoriy) — berilmasa butun hafta' },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const v = p.timetables[p.timetables.length - 1]
      if (!v || v.entries.length === 0) return { ok: false, message: 'Hali jadval tuzilmagan.' }
      const target = s(a.target) === 'teacher' ? 'teacher' : 'class'
      const list = target === 'teacher' ? p.teachers : p.classes
      const ent = findEntity(list as { id: string; fullName?: string; name?: string }[], s(a.name))
      if (!ent) return { ok: false, message: `"${s(a.name)}" topilmadi.` }
      const dayFilter = s(a.day) ? parseDay(s(a.day)) : null
      let rows = entriesFor(v, target === 'teacher' ? 'teacherId' : 'classId', ent.id)
      if (dayFilter != null) rows = rows.filter((r) => r.day === dayFilter)
      if (rows.length === 0) return { ok: true, message: `${ent.fullName ?? ent.name}: ${dayFilter != null ? DAYS_UZ[dayFilter] + ' kuni ' : ''}dars yo'q.` }
      const subjName = (lid: string) => { const l = p.lessons.find((x) => x.id === lid); return l ? (p.subjects.find((su) => su.id === l.subjectId)?.short ?? '?') : '?' }
      const byDay: Record<number, string[]> = {}
      for (const r of rows) { (byDay[r.day] ??= []).push(`${r.slot}-${subjName(r.lessonId)}`) }
      const parts = Object.entries(byDay).map(([d, items]) => `${DAYS_UZ[Number(d)]}: ${items.join(', ')}`)
      return { ok: true, message: `${ent.fullName ?? ent.name} jadvali —\n${parts.join('\n')}` }
    },
  },
  {
    name: 'who_is_free',
    description: "Berilgan kun va darsda qaysi o'qituvchilar bo'sh (band emas) ekanini aytadi.",
    params: [
      { name: 'day', type: 'string', description: 'Kun nomi', required: true },
      { name: 'slot', type: 'number', description: 'Dars raqami (1, 2, 3...)', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const v = p.timetables[p.timetables.length - 1]
      const d = parseDay(s(a.day)); const slot = n(a.slot)
      if (d == null || !slot) return { ok: false, message: 'Kun va dars raqamini aniq ayting.' }
      const busy = new Set((v?.entries ?? []).filter((e) => e.day === d && e.slot === slot).map((e) => e.teacherId))
      const free = p.teachers.filter((t) => !busy.has(t.id))
      if (free.length === 0) return { ok: true, message: `${DAYS_UZ[d]} ${slot}-darsda hamma o'qituvchi band.` }
      const names = free.slice(0, 25).map((t) => t.short).join(', ')
      return { ok: true, message: `${DAYS_UZ[d]} ${slot}-darsda bo'sh (${free.length}): ${names}${free.length > 25 ? '…' : ''}.` }
    },
  },
  {
    name: 'find_substitute',
    description: "O'qituvchi kelmaganda uning darslarini kim almashtira olishini tavsiya qiladi (shu kun, bo'sh va fanni o'qitadigan o'qituvchilar).",
    params: [
      { name: 'teacher', type: 'string', description: "Kelmagan o'qituvchi ismi", required: true },
      { name: 'day', type: 'string', description: 'Kun nomi', required: true },
    ],
    run: (a, ctx) => {
      const p = ctx.getProject()
      const v = p.timetables[p.timetables.length - 1]
      if (!v || v.entries.length === 0) return { ok: false, message: 'Jadval tuzilmagan — almashtirishni hisoblab bo\'lmaydi.' }
      const t = findEntity(p.teachers, s(a.teacher))
      if (!t) return { ok: false, message: `"${s(a.teacher)}" o'qituvchi topilmadi.` }
      const d = parseDay(s(a.day))
      if (d == null) return { ok: false, message: 'Kunni ayting.' }
      const lessons = v.entries.filter((e) => e.teacherId === t.id && e.day === d).sort((x, y) => x.slot - y.slot)
      if (lessons.length === 0) return { ok: true, message: `${t.short}ning ${DAYS_UZ[d]} kuni darsi yo'q.` }
      const subjOf = (lid: string) => { const l = p.lessons.find((x) => x.id === lid); return l ? { subjId: l.subjectId, name: p.subjects.find((su) => su.id === l.subjectId)?.short ?? '?' } : null }
      const out: string[] = []
      for (const e of lessons) {
        const sub = subjOf(e.lessonId)
        const busy = new Set(v.entries.filter((x) => x.day === d && x.slot === e.slot && x.teacherId !== t.id).map((x) => x.teacherId))
        const cands = p.teachers.filter((c) => c.id !== t.id && !busy.has(c.id) && (!sub || c.subjectIds.includes(sub.subjId)))
        const best = cands.slice(0, 3).map((c) => c.short).join(', ') || 'mos o\'rinbosar yo\'q'
        out.push(`${e.slot}-dars (${sub?.name ?? '?'}): ${best}`)
      }
      return { ok: true, message: `${t.short} o'rniga (${DAYS_UZ[d]}):\n${out.join('\n')}`, navigate: 'substitution' }
    },
  },
  {
    name: 'find_conflicts',
    description: "Oxirgi jadvaldagi qat'iy to'qnashuvlar (bir vaqtda ikki joyda) sonini tekshiradi.",
    params: [],
    run: (_a, ctx) => {
      const p = ctx.getProject()
      const v = p.timetables[p.timetables.length - 1]
      if (!v) return { ok: false, message: 'Jadval tuzilmagan.' }
      const hv = countHardViolations(v.entries)
      if (hv === 0) return { ok: true, message: '✓ Jadvalda qat\'iy to\'qnashuv yo\'q — toza.' }
      return { ok: true, message: `⚠ Jadvalda ${hv} ta qat'iy to'qnashuv bor. Konfliktlar bo'limida batafsil ko'ring.`, navigate: 'conflicts' }
    },
  },
  {
    name: 'clear_timetable',
    description: "Oxirgi tuzilgan jadvalni (yozuvlarini) tozalaydi/o'chiradi.",
    params: [],
    run: (_a, ctx) => {
      const p = ctx.getProject()
      const v = p.timetables[p.timetables.length - 1]
      if (!v) return { ok: false, message: 'O\'chiriladigan jadval yo\'q.' }
      ctx.removeTimetable(v.id)
      return { ok: true, message: `✓ "${v.name}" jadvali o'chirildi.` }
    },
  },
  {
    name: 'set_bell_times',
    description: 'Qo\'ng\'iroq jadvalini sozlaydi: dars davomiyligi, tanaffus.',
    params: [
      { name: 'lessonMin', type: 'number', description: 'Dars davomiyligi (daqiqa)' },
      { name: 'breakMin', type: 'number', description: 'Tanaffus davomiyligi (daqiqa)' },
    ],
    run: (a, ctx) => {
      const patch: Partial<Project['school']> = {}
      const lm = n(a.lessonMin); if (lm) patch.lessonMin = lm
      const bm = n(a.breakMin); if (bm != null) patch.breakMin = bm
      if (Object.keys(patch).length === 0) return { ok: false, message: 'Dars yoki tanaffus daqiqasini ayting.' }
      ctx.updateSchool(patch)
      return { ok: true, message: '✓ Qo\'ng\'iroq jadvali yangilandi.', navigate: 'school' }
    },
  },
  {
    name: 'navigate',
    description: "Dasturning biror bo'limiga o'tadi.",
    params: [{ name: 'panel', type: 'string', description: 'Bo\'lim id', required: true, enum: ['dashboard', 'school', 'classes', 'subjects', 'rooms', 'teachers', 'lessons', 'curriculum', 'tariff', 'distribution', 'views', 'conflicts', 'substitution', 'reports', 'export', 'settings', 'lists'] }],
    run: (a, ctx) => {
      const panel = s(a.panel)
      ctx.setActivePanel(panel)
      return { ok: true, message: `✓ Ochildi: ${panel}` }
    },
  },
  // ============ JADVAL TAHLILI (yangi, 2026-10-10) ============
  {
    name: 'validate_project',
    description: "Loyihani jadval tuzishga tayyormi deb tekshiradi: o'qituvchi yuklamasi, sinf sig'imi, metodik kun, umumiy balans. Jadval tuzmasdan oldin ishlatish uchun.",
    params: [],
    run: async (_a, ctx) => {
      const { validateProject } = await import('@/engine/validate')
      const p = ctx.getProject()
      const r = validateProject(p)
      if (r.ok) return { ok: true, message: '✓ Loyiha tayyor. Hech qanday muammo yo‘q — jadval muvaffaqiyatli tuziladi.' }
      const lines: string[] = [r.summary, '']
      const errors = r.issues.filter((i) => i.severity === 'error')
      const warnings = r.issues.filter((i) => i.severity === 'warning')
      if (errors.length) {
        lines.push('❌ XATOLAR:')
        errors.slice(0, 8).forEach((i) => {
          lines.push(`• ${i.message}${i.hint ? ` → ${i.hint}` : ''}`)
        })
        if (errors.length > 8) lines.push(`  ... va yana ${errors.length - 8} ta`)
      }
      if (warnings.length) {
        lines.push('', '⚠ Ogohlantirishlar:')
        warnings.slice(0, 5).forEach((i) => {
          lines.push(`• ${i.message}${i.hint ? ` → ${i.hint}` : ''}`)
        })
      }
      return { ok: !r.willFail, message: lines.join('\n') }
    },
  },
  {
    name: 'explain_timetable',
    description: 'Joriy jadval statistikasini tushuntiradi: nechta dars joylashgan, konfliktlar, bo‘shliqlar, qaysi o‘qituvchi qancha soat ishlaydi.',
    params: [],
    run: (_a, ctx) => {
      const p = ctx.getProject()
      const working = p.timetables.find((t) => t.name === 'Ishchi jadval') ?? p.timetables[p.timetables.length - 1]
      if (!working || working.entries.length === 0) {
        return { ok: false, message: 'Hali jadval tuzilmagan. "Jadval tuz" buyrug‘ini ishlating yoki Taqsimot → Avtomatik tugmasini bosing.' }
      }
      const st = working.stats
      const totalLessons = p.lessons.reduce((a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length), 0)
      const placedPct = Math.round((st.placed / Math.max(1, totalLessons)) * 100)
      const lines = [
        `📅 Joriy jadval: "${working.name}"`,
        '',
        `• Joylashtirilgan: ${st.placed} / ${totalLessons} (${placedPct}%)`,
        `• Qolgan: ${st.unplaced || 0}`,
        `• Qattiq konfliktlar: ${st.hardViolations || 0}`,
        `• O'qituvchi oynalari (bo'shliqlar): ${st.teacherGaps || 0}`,
        `• Yumshoq jarima: ${st.softPenalty || 0}`,
      ]
      if (st.unplaced > 0) {
        lines.push('', '⚠ Darslar qolgan — "diagnose_unplaced" buyrug‘ini ishlating sabablarini bilish uchun.')
      } else {
        lines.push('', '✓ Barcha darslar joylashtirilgan!')
      }
      return { ok: true, message: lines.join('\n') }
    },
  },
  {
    name: 'diagnose_unplaced',
    description: 'Joylashmagan darslar sababini tushuntiradi: qaysi o‘qituvchi yetishmayapti, qaysi sinf sig‘maydi, qanday cheklov halaqit beradi.',
    params: [],
    run: async (_a, ctx) => {
      const { validateProject } = await import('@/engine/validate')
      const p = ctx.getProject()
      const v = validateProject(p)
      if (v.willFail) {
        return {
          ok: false,
          message: 'Loyihada xato bor:\n' + v.issues
            .filter((i) => i.severity === 'error')
            .slice(0, 5)
            .map((i) => `• ${i.message}${i.hint ? ` → ${i.hint}` : ''}`)
            .join('\n'),
        }
      }
      // Loyiha xatosi yo'q, lekin unplaced qolgan bo'lsa — joylashtirish qiyinligi
      const working = p.timetables.find((t) => t.name === 'Ishchi jadval') ?? p.timetables[p.timetables.length - 1]
      if (!working || working.stats.unplaced === 0) {
        return { ok: true, message: 'Hamma darslar joylashgan — hech qanday muammo yo‘q.' }
      }
      // Taxminiy sabablar
      const reasons: string[] = []
      const totalLesson = p.lessons.reduce((a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length), 0)
      const totalCap = p.teachers.reduce((a, t) => a + (t.weeklyMax > 0 ? t.weeklyMax : 24), 0)
      if (totalLesson > totalCap) {
        reasons.push(`O'qituvchi haftalik maksimumlari jami ${totalCap} soat, lekin ${totalLesson} soat kerak. Yangi o'qituvchi qo'shing.`)
      }
      for (const t of p.teachers) {
        const assigned = p.lessons
          .filter((l) => l.teacher1Id === t.id || l.teacher2Id === t.id)
          .reduce((a, l) => a + l.hoursPerWeek, 0)
        if (t.weeklyMax > 0 && assigned > t.weeklyMax) {
          reasons.push(`${t.fullName}: ${assigned} soat tayinlangan, ${t.weeklyMax} soat ruxsat → cheklov sabab bir qism tushib qoladi`)
        }
      }
      if (reasons.length === 0) {
        reasons.push("Dars joylashishi uchun yetarli slot bor, lekin cheklovlar (metodik kun, availability grid, consecutive) bir-biri bilan konflikt bo'ldi. 'Yaxshilash' tugmasi yoki ko'proq urinish bilan qayta tuzing.")
      }
      return {
        ok: true,
        message:
          `${working.stats.unplaced} ta dars joylashmay qoldi. Sabablari:\n` +
          reasons.map((r) => '• ' + r).join('\n'),
      }
    },
  },
  {
    name: 'suggest_fix',
    description: 'Loyihadagi muammolarni avtomatik tuzatish uchun qanday qadam qilish kerakligini maslahat beradi.',
    params: [],
    run: async (_a, ctx) => {
      const { validateProject } = await import('@/engine/validate')
      const r = validateProject(ctx.getProject())
      const hints = r.issues.filter((i) => i.hint).map((i) => `• ${i.hint}`)
      if (hints.length === 0) {
        return { ok: true, message: '✓ Loyihada hech qanday muammo yo‘q — birorta maslahat ham yo‘q.' }
      }
      return { ok: true, message: 'Maslahatlar:\n' + hints.slice(0, 10).join('\n') }
    },
  },
]

/** Nom bo'yicha tool topish */
export function findTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name)
}

/** LLM uchun tool'larni Anthropic input_schema formatiga aylantirish */
export function toolsForLLM() {
  return TOOLS.map((t) => {
    const props: Record<string, unknown> = {}
    const required: string[] = []
    for (const p of t.params) {
      const base: Record<string, unknown> =
        p.type === 'string[]'
          ? { type: 'array', items: { type: 'string' } }
          : { type: p.type === 'number' ? 'number' : p.type === 'boolean' ? 'boolean' : 'string' }
      base.description = p.description
      if (p.enum) base.enum = p.enum
      props[p.name] = base
      if (p.required) required.push(p.name)
    }
    return {
      name: t.name,
      description: t.description,
      input_schema: { type: 'object' as const, properties: props, required },
    }
  })
}
