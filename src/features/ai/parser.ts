// ============================================================
// AI yordamchi — OFFLINE parser (qoida-asoslangan NLU).
// Matnni tool-call ga aylantiradi. LLM rejimi yoqilmaganda ishlatiladi.
// 3 til: UZ (lotin) · RU · EN. Internet talab qilmaydi.
// ============================================================

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

/** Maxsus (lokal) intentlar — tool emas, UI o'zi bajaradi */
export type LocalIntent =
  | { kind: 'help' }
  | { kind: 'greeting' }
  | { kind: 'thanks' }
  | { kind: 'clear' }
  | { kind: 'undo' }

export type ParseResult =
  | { type: 'tool'; call: ToolCall }
  | { type: 'local'; intent: LocalIntent }
  | { type: 'unknown'; text: string }

type Entity = 'teacher' | 'class' | 'subject' | 'room' | 'lesson'

const ENTITY_WORDS: [string, Entity][] = [
  ["o'qituvchini", 'teacher'], ["o'qituvchiga", 'teacher'], ["o'qituvchi", 'teacher'],
  ['oqituvchini', 'teacher'], ['oqituvchi', 'teacher'], ['ustozni', 'teacher'], ['ustoz', 'teacher'], ['muallim', 'teacher'],
  ['учителя', 'teacher'], ['учителю', 'teacher'], ['учитель', 'teacher'], ['педагог', 'teacher'],
  ['teachers', 'teacher'], ['teacher', 'teacher'],
  ['sinfni', 'class'], ['sinfga', 'class'], ['sinflar', 'class'], ['sinf', 'class'], ['guruh', 'class'],
  ['класса', 'class'], ['классу', 'class'], ['класс', 'class'], ['группа', 'class'],
  ['classes', 'class'], ['class', 'class'], ['grade', 'class'],
  ['fanni', 'subject'], ['fanga', 'subject'], ['fanlar', 'subject'], ['fan', 'subject'], ['predmet', 'subject'],
  ['предмета', 'subject'], ['предмет', 'subject'],
  ['subjects', 'subject'], ['subject', 'subject'],
  ['xonani', 'room'], ['xonaga', 'room'], ['xona', 'room'], ['kabinetni', 'room'], ['kabinet', 'room'],
  ['кабинета', 'room'], ['кабинет', 'room'], ['аудитория', 'room'], ['комната', 'room'],
  ['rooms', 'room'], ['room', 'room'], ['classroom', 'room'],
  ['darsni', 'lesson'], ['darsga', 'lesson'], ['darslar', 'lesson'], ['dars', 'lesson'],
  ['урока', 'lesson'], ['урок', 'lesson'], ['lessons', 'lesson'], ['lesson', 'lesson'],
]

const PANEL_ALIASES: Record<string, string> = {
  sinf: 'classes', sinflar: 'classes', fan: 'subjects', fanlar: 'subjects',
  xona: 'rooms', xonalar: 'rooms', kabinet: 'rooms', "o'qituvchi": 'teachers', "o'qituvchilar": 'teachers',
  oqituvchi: 'teachers', oqituvchilar: 'teachers', dars: 'lessons', darslar: 'lessons',
  jadval: 'distribution', taqsimot: 'distribution', tahta: 'distribution', maktab: 'school',
  sozlama: 'settings', sozlamalar: 'settings', hisobot: 'reports', hisobotlar: 'reports',
  konflikt: 'conflicts', konfliktlar: 'conflicts', almashtirish: 'substitution', eksport: 'export',
  "ro'yxat": 'lists', royxat: 'lists', bosh: 'dashboard', tarif: 'tariff', tarifikatsiya: 'tariff',
  класс: 'classes', классы: 'classes', предмет: 'subjects', предметы: 'subjects', кабинет: 'rooms',
  учителя: 'teachers', урок: 'lessons', расписание: 'distribution', школа: 'school',
  настройки: 'settings', отчёты: 'reports', конфликты: 'conflicts', экспорт: 'export', главная: 'dashboard',
  classes: 'classes', subjects: 'subjects', rooms: 'rooms', teachers: 'teachers', lessons: 'lessons',
  schedule: 'distribution', timetable: 'distribution', school: 'school', settings: 'settings',
  reports: 'reports', conflicts: 'conflicts', export: 'export', dashboard: 'dashboard', tariff: 'tariff',
}

function normalize(x: string): string {
  return x.toLowerCase().replace(/[«»“”„‟]/g, '"').replace(/[.,!?;]/g, ' ').replace(/\s+/g, ' ').trim()
}
function escapeReg(x: string): string { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function findEntity(txt: string): { entity: Entity | null; rest: string } {
  for (const [w, e] of ENTITY_WORDS) {
    const re = new RegExp(`\\b${escapeReg(w)}\\b`)
    if (re.test(txt)) return { entity: e, rest: txt.replace(new RegExp(`\\b${escapeReg(w)}\\b`, 'g'), ' ').replace(/\s+/g, ' ').trim() }
  }
  return { entity: null, rest: txt }
}

/** Ism ajratish — tirnoq yoki ":"/" — " dan keyin (defis ism ichida qolsin) */
function extractName(x: string): string {
  const q = /"(.+?)"/.exec(x)
  if (q && q[1].trim()) return q[1].trim()
  const sep = /(?::|(?:\s[—–\-]\s))/.exec(x)
  if (sep && typeof sep.index === 'number') {
    const after = x.slice(sep.index + sep[0].length).trim()
    if (after) return after
  }
  return x.trim()
}

// --------- Matcherlar ---------

function mHelp(t: string): ParseResult | null {
  if (/\b(yordam|komanda|komandalar|nima\s+qila|what\s+can|help|команды|что\s+ты|как\s+использ)\b/.test(t)) return { type: 'local', intent: { kind: 'help' } }
  return null
}
function mGreet(t: string): ParseResult | null {
  if (/^(salom|assalomu|hayrli|hi|hey|hello|привет|здравств|добр(ый|ое))/.test(t)) return { type: 'local', intent: { kind: 'greeting' } }
  if (/^(rahmat|tashakkur|спасибо|благодар|thanks|thank)/.test(t)) return { type: 'local', intent: { kind: 'thanks' } }
  return null
}
function mClear(t: string): ParseResult | null {
  if (/^(tozala|tozalash|clear|очисти|очистка)$/.test(t)) return { type: 'local', intent: { kind: 'clear' } }
  return null
}
function mUndo(t: string): ParseResult | null {
  if (/\b(orqaga|qaytar|undo|отмен|назад)\b/.test(t)) return { type: 'local', intent: { kind: 'undo' } }
  return null
}

const DAY_RE = /\b(dushanba|seshanba|chorshanba|payshanba|juma|shanba|понедельник|вторник|среда|четверг|пятница|суббота|monday|tuesday|wednesday|thursday|friday|saturday)\b/

/** Kuchli amallar: ish vaqti, jadval so'rovi, almashtirish, konflikt, bo'shlar */
function mPowerful(t: string): ParseResult | null {
  // Jadvalni tozalash
  if (/\b(jadval\w*\s+(tozala|o'chir|ochir|удали|очисти|clear|delete))\b/.test(t) || /\b(tozala|o'chir)\b.*\bjadval/.test(t)) {
    return { type: 'tool', call: { name: 'clear_timetable', args: {} } }
  }
  // Konfliktlar / to'qnashuvlar
  if (/\b(to'qnashuv|toqnashuv|konflikt\w*\s+(bor|tekshir|nechta)|конфликт\w*\s+(есть|провер)|check\s+conflict)\b/.test(t)
    || /\b(konflikt|to'qnashuv|toqnashuv)\b/.test(t) && /\b(bor|tekshir|nechta|есть|провер|check)\b/.test(t)) {
    return { type: 'tool', call: { name: 'find_conflicts', args: {} } }
  }
  // O'qituvchining kuni: "Aliyev dushanba kuni dars bermaydi" / "ishlamaydi"
  const dayM = DAY_RE.exec(t)
  if (dayM && /\b(dars\s+bermaydi|ishlamaydi|dam|band\s+emas|не\s+работает|выходн|day\s+off|busaydi)\b/.test(t)) {
    const name = t.replace(DAY_RE, ' ').replace(/\b(kuni|dars\s+bermaydi|ishlamaydi|dam|не\s+работает|выходной|day\s+off|o'qituvchi\w*|oqituvchi\w*|учител\w*|teacher)\b/g, ' ').replace(/\s+/g, ' ').trim()
    if (name) return { type: 'tool', call: { name: 'set_teacher_availability', args: { teacher: name, day: dayM[1], available: false } } }
  }
  // Almashtirish: "Aliyev kelmadi ... dushanba" / "kim almashtiradi"
  if (/\b(kelmadi|kasal|almashtir|o'rinbosar|orinbosar|замена|заменит|не\s+пришёл|substitut)\b/.test(t) && dayM) {
    const name = t.replace(DAY_RE, ' ').replace(/\b(kelmadi|kasal|almashtir\w*|o'rinbosar|orinbosar|kim|kuni|замена|заменит\w*|не\s+пришёл|substitut\w*|o'qituvchi\w*|oqituvchi\w*)\b/g, ' ').replace(/\s+/g, ' ').trim()
    if (name) return { type: 'tool', call: { name: 'find_substitute', args: { teacher: name, day: dayM[1] } } }
  }
  // Bo'sh o'qituvchilar: "dushanba 3-darsda kim bo'sh"
  if (dayM && /\b(bo'sh|bosh|band\s+emas|свобод|free)\b/.test(t)) {
    const slotM = /(\d+)\s*[-\s]?\s*(dars|пар|урок|slot|lesson)/.exec(t) || /\b(\d+)\b/.exec(t.replace(DAY_RE, ''))
    if (slotM) return { type: 'tool', call: { name: 'who_is_free', args: { day: dayM[1], slot: Number(slotM[1]) } } }
  }
  // Jadval so'rovi: "5-A jadvalini ko'rsat" / "Aliyev dushanba jadvali"
  if (/\b(jadval\w*|расписани\w*|schedule)\b/.test(t) && /\b(ko'rsat|korsat|qanday|nima|покажи|show|какое)\b/.test(t)) {
    const { entity, rest } = findEntity(t)
    const target = entity === 'teacher' ? 'teacher' : 'class'
    const name = rest.replace(/\b(jadval\w*|расписани\w*|schedule|ko'rsat\w*|korsat\w*|qanday|nima|покажи|show|kuni)\b/g, ' ').replace(DAY_RE, ' ').replace(/\s+/g, ' ').trim()
    const day = dayM ? dayM[1] : undefined
    if (name) return { type: 'tool', call: { name: 'query_schedule', args: { target, name, ...(day ? { day } : {}) } } }
  }
  return null
}

function mSchedule(t: string): ParseResult | null {
  if (/\b(yaxshila|yaxshilash|optimize|optimis|улучш)\b/.test(t)) return { type: 'tool', call: { name: 'improve_timetable', args: {} } }
  if (/\b(jadval\s+tuz|jadvalni\s+tuz|avtomatik\s+tuz|составь\s+расписа|создай\s+расписа|сгенерир|generate|build\s+schedule)\b/.test(t)
    || /\b(tuz|составь|generate)\b.*\b(jadval|расписа|schedule|timetable)\b/.test(t)) {
    const m = /(\d+)\s*(urinish|попыт|retr|restart|times?)/.exec(t)
    return { type: 'tool', call: { name: 'generate_timetable', args: m ? { restarts: Number(m[1]) } : {} } }
  }
  return null
}

function mFile(t: string): ParseResult | null {
  if (/\b(saqla|saqlash|сохрани|save)\b/.test(t)) return { type: 'tool', call: { name: 'save_project', args: {} } }
  if (/\b(och|ochish|открой|открыть|open)\b.*\b(loyiha|fayl|проект|файл|file|project)\b/.test(t)) return { type: 'tool', call: { name: 'open_project', args: {} } }
  if (/\b(yangi\s+loyiha|new\s+project|новый\s+проект|boshidan)\b/.test(t)) return { type: 'tool', call: { name: 'new_project', args: {} } }
  if (/\b(namuna|demo|пример)\b/.test(t)) return { type: 'tool', call: { name: 'load_demo', args: {} } }
  if (/\b(backup|rezerv|zaxira|бэкап|резерв)\b/.test(t)) return { type: 'tool', call: { name: 'backup', args: {} } }
  if (/\b(eksport|chiqar|yuklab|export|download|скачай|экспорт)\b/.test(t)) {
    let format = 'excel'
    if (/\bpdf\b/.test(t)) format = 'pdf'
    else if (/\b(word|docx|ворд)\b/.test(t)) format = 'word'
    else if (/\b(png|rasm|image|изображ|картинк)\b/.test(t)) format = 'png'
    else if (/\bcsv\b/.test(t)) format = 'csv'
    return { type: 'tool', call: { name: 'export_data', args: { format } } }
  }
  return null
}

function mSettings(t: string): ParseResult | null {
  if (/\b(til|язык|language)\b/.test(t)) {
    if (/\b(o'zbek|узбек|uzbek|lotin|uz)\b/.test(t)) return { type: 'tool', call: { name: 'set_language', args: { lang: 'uz' } } }
    if (/\b(rus|русск|russian|ru)\b/.test(t)) return { type: 'tool', call: { name: 'set_language', args: { lang: 'ru' } } }
    if (/\b(ingliz|английск|english|en)\b/.test(t)) return { type: 'tool', call: { name: 'set_language', args: { lang: 'en' } } }
  }
  if (/\b(qorong|dark|тёмн|темн)\b/.test(t)) return { type: 'tool', call: { name: 'set_theme', args: { theme: 'dark' } } }
  if (/\b(yorug|light|светл)\b.*\b(rejim|mode|mavzu|тема|реж)\b/.test(t)) return { type: 'tool', call: { name: 'set_theme', args: { theme: 'light' } } }
  return null
}

function mShow(t: string): ParseResult | null {
  const show = /\b(ko'rsat|korsat|покажи|show|open|och)\b/.test(t)
  if (show && /\b(hisobot|отчёт|отчет|report)/.test(t)) return { type: 'tool', call: { name: 'navigate', args: { panel: 'reports' } } }
  if (show && /\b(konflikt|конфликт|conflict)/.test(t)) return { type: 'tool', call: { name: 'navigate', args: { panel: 'conflicts' } } }
  return null
}

function mAnalytics(t: string): ParseResult | null {
  // Eng band o'qituvchi
  if (/\b(eng\s+band|eng\s+ko'p\s+(yuklama|dars|band)|самый\s+занят|busiest)\b/.test(t)) {
    return { type: 'tool', call: { name: 'busiest_teacher', args: {} } }
  }
  // Jadval sifati / statistika
  if (/\b(jadval\s+(sifat|holat|statist)|качеств|качество\s+распис|schedule\s+stat)\b/.test(t)) {
    return { type: 'tool', call: { name: 'schedule_stats', args: {} } }
  }
  // Yuklama so'rovi: "Aliyev yuklamasi", "o'qituvchi yuklamasi"
  if (/\b(yuklama|yuklamasi|нагрузк|load)\b/.test(t)) {
    const { entity, rest } = findEntity(t)
    const name = rest.replace(/\b(yuklama\w*|нагрузк\w*|load|qancha|nechta|сколько)\b/g, ' ').replace(/\s+/g, ' ').trim()
    if (entity === 'class' && name) return { type: 'tool', call: { name: 'class_load', args: { class: name } } }
    if (name) return { type: 'tool', call: { name: 'teacher_load', args: { teacher: name } } }
  }
  // Sanash: "nechta o'qituvchi"
  if (/\b(nechta|qancha|сколько|how\s+many)\b/.test(t)) {
    const { entity } = findEntity(t)
    if (entity) return { type: 'tool', call: { name: 'count_entities', args: { entity } } }
  }
  // Ro'yxat
  if (/\b(ro'yxat|royxat|список|list)\b/.test(t)) {
    const { entity } = findEntity(t)
    if (entity) return { type: 'tool', call: { name: 'list_entities', args: { entity } } }
  }
  return null
}

/** Bulk sinf yaratish: "1-11 gacha A B sinflar yarat" */
function mBulkClasses(t: string): ParseResult | null {
  // "sinf", "sinflar", "класс(ы)", "class(es)" — so'z boshida (chegarasiz)
  if (!/(sinf|класс|class|grade)/.test(t)) return null
  const range = /(\d+)\s*[-–—]\s*(?:dan|from)?\s*(\d+)\s*(?:gacha|до|to)?/.exec(t) || /(\d+)\s*(?:dan|от)\s*(\d+)\s*(?:gacha|до)/.exec(t)
  if (!range) return null
  const from = Number(range[1]); const to = Number(range[2])
  // Harflar: A, B, V yoki А, Б, В
  const lettersMatch = t.match(/\b([a-zа-я])\b/gi) || []
  const letters = Array.from(new Set(lettersMatch.map((x) => x.toUpperCase()))).filter((x) => /^[A-ZА-Я]$/.test(x) && x.length === 1)
  if (/\b(yarat|qo'sh|qosh|создай|добав|add|create)\b/.test(t) && letters.length > 0) {
    return { type: 'tool', call: { name: 'bulk_add_classes', args: { fromGrade: from, toGrade: to, letters } } }
  }
  return null
}

function mAdd(t: string): ParseResult | null {
  if (!/\b(yangi|qo'sh|qosh|yarat|добав|создай|add|create|new)\b/.test(t)) return null
  const { entity, rest } = findEntity(t)
  if (!entity) return null
  const cleaned = rest.replace(/\b(yangi|qo'sh|qosh|yarat|добав\w*|создай|add|create|new|пожалуйста|please)\b/g, ' ').replace(/\s+/g, ' ').trim()
  const name = extractName(cleaned)
  if (!name) return null
  const map: Record<Exclude<Entity, 'lesson'>, string> = { teacher: 'add_teacher', class: 'add_class', subject: 'add_subject', room: 'add_room' }
  if (entity === 'lesson') return null // dars uchun to'liq parametr kerak — LLM yaxshiroq
  return { type: 'tool', call: { name: map[entity], args: { name } } }
}

function mDelete(t: string): ParseResult | null {
  if (!/\b(o'chir|ochir|olib\s+tashla|удали|убери|delete|remove|drop)\b/.test(t)) return null
  const { entity, rest } = findEntity(t)
  if (!entity) return null
  const cleaned = rest.replace(/\b(o'chir\w*|ochir\w*|olib\s+tashla|удали\w*|убери|delete|remove|drop)\b/g, ' ').replace(/\s+/g, ' ').trim()
  const name = extractName(cleaned)
  if (!name) return null
  return { type: 'tool', call: { name: 'delete_entity', args: { entity, name } } }
}

function mNavigate(t: string): ParseResult | null {
  const nav = /\b(och|ochib|ko'rsat|korsat|open|show|перейди|открой|покажи)\b/.test(t)
  const aliases = Object.entries(PANEL_ALIASES).sort((a, b) => b[0].length - a[0].length)
  for (const [alias, panel] of aliases) {
    if (new RegExp(`\\b${escapeReg(alias)}\\b`).test(t)) {
      const words = t.split(' ').filter(Boolean).length
      if (nav || words <= 2) return { type: 'tool', call: { name: 'navigate', args: { panel } } }
    }
  }
  return null
}

export function parseCommand(input: string): ParseResult {
  const t = normalize(input)
  if (!t) return { type: 'unknown', text: input }
  return (
    mClear(t) || mHelp(t) || mGreet(t) || mUndo(t) ||
    mPowerful(t) || mSchedule(t) || mFile(t) || mSettings(t) || mShow(t) ||
    mAnalytics(t) || mBulkClasses(t) || mAdd(t) || mDelete(t) || mNavigate(t) ||
    { type: 'unknown', text: input }
  )
}
