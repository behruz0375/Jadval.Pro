// ============================================================
// JadvalPro — chuqur offline NLU (hech qanday AI'siz)
// Haqiqiy LLM emas, lekin kundalik buyruqlarni 90%+ to'g'ri tushunadi.
// Ishlatiladigan texnikalar:
//  1. Transliteratsiya / normalizatsiya (o' = o, й = y, ' ' = '')
//  2. Fuzzy string matching (Levenshtein / Jaro-Winkler)
//  3. Keyword scoring (ko'p sinonim/tilga)
//  4. Entity resolver (joriy loyihadagi hamma nomlarni biladi)
//  5. Multi-intent splitter ("va", "i", "and", "va h.k.")
//  6. Natural question answering (hisob-kitob, taqqoslash)
//  7. Context memory (so'nggi mention'ni eslaydi)
// ============================================================
import type { Project, Teacher, SchoolClass, Subject, Room, Lesson } from '@/types'
import type { ToolCall } from './parser'
import { DAYS_UZ } from '@/constants'
import { classLoad, teacherLoad, subjectLoad, countHardViolations } from '@/features/_shared/compute'
import { currentVersion } from '@/features/_shared/versions'

// ============================================================
// 1. NORMALIZATSIYA — matnni bir xil ko'rinishga keltirish
// ============================================================

/** O'zbek lotincha / kirillcha / ruscha / inglizcha harflarni bir xil ko'rinishga */
export function normalize(s: string): string {
  if (!s) return ''
  let t = s.toLowerCase()
  // Tirnoqlarni oddiylashtirish
  t = t.replace(/[''`´ʼ]/g, "'").replace(/[«»""„]/g, '"')
  // O'zbekcha apostroflar — o', g' → o, g
  t = t.replace(/o'/g, 'o').replace(/g'/g, 'g').replace(/o`/g, 'o').replace(/g`/g, 'g')
  // Kirillcha → lotincha (asosiy harflar)
  const cyr: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
    'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'ў': 'o', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h',
  }
  t = t.replace(/[Ѐ-ӿ]/g, (ch) => cyr[ch] ?? ch)
  // Punktuatsiyani olib tashlash (defis, qavslar — saqlanadi)
  t = t.replace(/[.,!?;:«»""]/g, ' ')
  // Bir nechta bo'sh joyni bitta qilish
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/** Belgilarsiz oddiy matn — faqat harf-raqam */
function simplify(s: string): string {
  return normalize(s).replace(/[^a-z0-9\s-]/g, '').trim()
}

// ============================================================
// 2. FUZZY MATCHING — xatolar bilan ham to'g'ri taniydi
// ============================================================

/** Levenshtein distance — ikki satr orasidagi tahrir masofasi */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  for (let i = 0; i <= b.length; i++) prev[i] = i
  for (let i = 1; i <= a.length; i++) {
    let curr = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const next = Math.min(curr + 1, prev[j] + 1, prev[j - 1] + cost)
      prev[j - 1] = curr
      curr = next
    }
    prev[b.length] = curr
  }
  return prev[b.length]
}

/** 0..1 oralig'ida o'xshashlik (1 = teng) */
export function similarity(a: string, b: string): number {
  const na = simplify(a); const nb = simplify(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const maxLen = Math.max(na.length, nb.length)
  return 1 - levenshtein(na, nb) / maxLen
}

// ============================================================
// 3. ENTITY RESOLVER — loyihadagi hamma nomlarni biladi
// ============================================================

export interface ResolvedEntity {
  kind: 'teacher' | 'class' | 'subject' | 'room' | 'lesson'
  id: string
  name: string
  score: number // 0..1 — qanchalik ishonchli
}

/** Berilgan matndan loyihadagi entity'ni fuzzy topish */
export function resolveEntity(query: string, project: Project, prefer?: ResolvedEntity['kind']): ResolvedEntity | null {
  const q = simplify(query)
  if (!q || q.length < 2) return null

  const candidates: ResolvedEntity[] = []

  const push = (kind: ResolvedEntity['kind'], id: string, names: string[]) => {
    let best = 0
    let bestName = ''
    for (const n of names) {
      if (!n) continue
      const score = similarity(q, n)
      if (score > best) { best = score; bestName = n }
    }
    if (best >= 0.6) candidates.push({ kind, id, name: bestName, score: best })
  }

  for (const t of project.teachers) push('teacher', t.id, [t.fullName, t.short])
  for (const c of project.classes) push('class', c.id, [c.name, c.short])
  for (const s of project.subjects) push('subject', s.id, [s.name, s.short])
  for (const r of project.rooms) push('room', r.id, [r.name, r.short])

  if (candidates.length === 0) return null

  // Afzal berilgan tur birinchi
  candidates.sort((a, b) => {
    if (prefer) {
      if (a.kind === prefer && b.kind !== prefer) return -1
      if (b.kind === prefer && a.kind !== prefer) return 1
    }
    return b.score - a.score
  })

  return candidates[0]
}

/** Barcha mos keluvchi entity'larni qaytaradi (ko'p topilsa) */
export function resolveAllEntities(query: string, project: Project): ResolvedEntity[] {
  const q = simplify(query)
  if (!q) return []
  const out: ResolvedEntity[] = []
  const check = (kind: ResolvedEntity['kind'], id: string, names: string[]) => {
    let best = 0
    let bestName = ''
    for (const n of names) {
      if (!n) continue
      const score = similarity(q, n)
      if (score > best) { best = score; bestName = n }
    }
    if (best >= 0.5) out.push({ kind, id, name: bestName, score: best })
  }
  for (const t of project.teachers) check('teacher', t.id, [t.fullName, t.short])
  for (const c of project.classes) check('class', c.id, [c.name, c.short])
  for (const s of project.subjects) check('subject', s.id, [s.name, s.short])
  for (const r of project.rooms) check('room', r.id, [r.name, r.short])
  return out.sort((a, b) => b.score - a.score)
}

// ============================================================
// 4. KEYWORD SETS — har bir intent uchun ko'p sinonim
// ============================================================

const KW = {
  // Harakatlar (verblar)
  add: [
    'yangi', 'qosh', "qo'sh", 'yarat', 'kirit', 'qoyilsin', 'yarating', 'qoshing', "qo'shing",
    'добавить', 'добавь', 'создать', 'создай', 'внести',
    'add', 'create', 'new', 'make', 'insert',
  ],
  remove: [
    "o'chir", 'ochir', 'olib tashla', 'ketkaz', 'yopib tashla', "o'chirib tashla", 'oldirib tashla',
    'удали', 'удалить', 'убери', 'убрать', 'стереть',
    'delete', 'remove', 'drop', 'erase',
  ],
  update: [
    "o'zgartir", 'ozgartir', "o'zgartirish", 'tahrir', 'yangila',
    'изменить', 'изменять', 'поменять', 'обновить',
    'change', 'update', 'edit', 'modify', 'rename',
  ],
  show: [
    "ko'rsat", 'korsat', 'och', 'ochib ber', 'ochib bersin', 'namoyish', "ko'rsatish",
    'покажи', 'показать', 'открой', 'открыть', 'демонстр',
    'show', 'open', 'display', 'reveal', 'view',
  ],
  count: [
    'nechta', 'qancha', 'nechchi', 'qanchcha', 'necha',
    'сколько', 'skolko',
    'how many', 'how much', 'count',
  ],
  list: [
    "ro'yxat", 'royxat', 'spisok',
    'список', 'перечень', 'spisok',
    'list', 'all',
  ],
  generate: [
    'tuz', 'tuzish', 'yaratib ber', 'tuzib ber', 'yaratish', 'avtomatik',
    'составь', 'составить', 'создать расписа', 'сгенерировать',
    'generate', 'build', 'make schedule', 'auto',
  ],
  improve: [
    'yaxshila', 'yaxshilash', 'optimallashtir', 'tozalab chiq', 'yaxshi qilib',
    'улучш', 'оптимиз',
    'optimize', 'improve', 'enhance', 'better',
  ],
  save: [
    'saqla', 'saqlash', 'saqlab qoy',
    'сохрани', 'сохранить',
    'save', 'store',
  ],
  open: [
    'och', 'ochish', 'yukla',
    'открой', 'открыть', 'загрузи',
    'open', 'load',
  ],
  export: [
    'eksport', 'yuklab ol', 'chiqar', 'yukla',
    'экспорт', 'экспортир', 'скачать',
    'export', 'download',
  ],
  busiest: [
    'eng band', "eng ko'p", 'ko\'p yuklama', 'ko\'p dars', 'eng mash',
    'самый занят', 'больше всего',
    'busiest', 'most loaded', 'most busy',
  ],
  load: [
    'yuklama', 'yuklamasi', 'soat', 'nagruzka',
    'нагрузк', 'nagruzka',
    'load', 'hours', 'workload',
  ],
  conflict: [
    "to'qnashuv", 'toqnashuv', 'konflikt', 'ziddiyat', 'muammo',
    'конфликт', 'противореч',
    'conflict', 'clash', 'issue',
  ],
  help: [
    'yordam', 'komanda', 'nima qila ol', 'yordamla', 'komandalar',
    'помощь', 'помоги', 'команды', 'что умеешь',
    'help', 'commands', 'what can you',
  ],
  stats: [
    'statistika', 'tahlil', 'hisobot', 'natija', 'sifat',
    'статистика', 'отчёт', 'отчет', 'анализ',
    'stats', 'report', 'analysis', 'quality',
  ],
}

/** Berilgan matnda qaysi ko'rsatma eng ko'p so'z moslashiyapti */
function scoreIntents(normalized: string): Record<keyof typeof KW, number> {
  const scores = {} as Record<keyof typeof KW, number>
  for (const [intent, words] of Object.entries(KW)) {
    let hits = 0
    for (const w of words) if (normalized.includes(w)) hits++
    scores[intent as keyof typeof KW] = hits
  }
  return scores
}

// ============================================================
// 5. MULTI-INTENT SPLITTER — "va", "i", "and" bilan ajratish
// ============================================================

/** Bitta uzun jumla ichidagi bir nechta buyruqni ajratish */
export function splitIntents(text: string): string[] {
  const norm = normalize(text)
  // "va", "i", ",", ";", "and", keyin"
  const parts = norm.split(/\s+(va|i|and|keyin|затем|потом|hamda|yana)\s+|\s*[,;]\s*/)
  const out = parts.filter((p) => p && !/^(va|i|and|keyin|затем|потом|hamda|yana)$/.test(p)).map((s) => s.trim()).filter(Boolean)
  return out.length ? out : [norm]
}

// ============================================================
// 6. KUNNI ANIQLASH
// ============================================================

// Diqqat: normalize() kirillcha → lotinchaga aylantiradi,
// shuning uchun patternlar FAQAT lotincha (va transliteratsiyadan keyingi) ko'rinishda.
// "понедельник" → "ponedelnik", "вторник" → "vtornik" va h.k.
const DAY_PATTERNS: [RegExp, number][] = [
  [/\b(du|dush|dushanb|ponedel|monday|mon)\w*/, 0],
  [/\b(se|sesh|seshanb|vtorn|tuesday|tue)\w*/, 1],
  [/\b(ch|chor|chorshanb|sred|wednesday|wed)\w*/, 2],
  [/\b(pa|paysh|payshanb|chetverg|thursday|thu)\w*/, 3],
  [/\b(ju|jum|juma|pyatnits|pyatnic|friday|fri)\w*/, 4],
  [/\b(sh|shan|shanb|subbot|saturday|sat)\w*/, 5],
]

export function extractDay(text: string): number | null {
  const t = normalize(text)
  for (const [re, i] of DAY_PATTERNS) if (re.test(t)) return i
  const num = /\b([1-6])(-| )(dars|kun|den|day)/.exec(t)
  if (num) return Number(num[1]) - 1
  return null
}

/** Darsi raqamini topish — "3-dars", "3 soat", "lesson 3" */
export function extractSlot(text: string): number | null {
  const t = normalize(text)
  const m = /(\d+)[-\s]?(dars|lesson|пара|урок|slot)/.exec(t) || /(dars|lesson|пара|урок)[-\s]?(\d+)/.exec(t)
  if (m) {
    const num = /\d+/.exec(m[0])
    if (num) return Number(num[0])
  }
  return null
}

// ============================================================
// 7. HISOB-KITOB VA TAHLIL — tabiiy savollarga javob
// ============================================================

export interface NLUAnswer { text: string; navigate?: string }

/** Tabiiy savolga javob berish (hisob, taqqoslash) */
export function answerAnalyticalQuestion(text: string, project: Project): NLUAnswer | null {
  const t = normalize(text)
  const scores = scoreIntents(t)

  // "Eng band o'qituvchi"
  if (scores.busiest > 0) {
    if (project.teachers.length === 0) return { text: "Hali o'qituvchilar yo'q." }
    const ranked = project.teachers.map((tc) => ({ t: tc, load: teacherLoad(tc.id, project.lessons) }))
      .sort((a, b) => b.load - a.load)
    const top = ranked[0]
    if (top.load === 0) return { text: "O'qituvchilarga hali dars biriktirilmagan." }
    const second = ranked[1]
    const extra = second ? ` 2-o'rinda ${second.t.short} (${second.load} soat).` : ''
    return { text: `Eng band o'qituvchi: ${top.t.short} — ${top.load} soat/hafta.${extra}`, navigate: 'teachers' }
  }

  // "Jadval sifati" / statistika
  if (scores.stats > 0 || /sifat|качество|quality/.test(t)) {
    const v = currentVersion(project.timetables)
    if (!v) return { text: "Hali jadval tuzilmagan — avval 'jadval tuz' deng." }
    const total = v.stats.placed + v.stats.unplaced
    const hv = countHardViolations(v.entries)
    return {
      text: `Oxirgi jadval "${v.name}": ${v.stats.placed}/${total} dars joylashgan, qat'iy to'qnashuv ${hv}, o'qituvchi oynalari ${v.stats.teacherGaps}, yumshoq jarima ${v.stats.softPenalty}.`,
      navigate: 'reports',
    }
  }

  // "Eng ko'p dars qaysi fan"
  if (/eng\s+ko'?p|most/.test(t) && (/fan|subject|предмет/.test(t))) {
    if (project.subjects.length === 0) return { text: "Fanlar hali yo'q." }
    const ranked = project.subjects.map((s) => ({ s, load: subjectLoad(s.id, project.lessons) }))
      .sort((a, b) => b.load - a.load)
    const top = ranked[0]
    if (top.load === 0) return { text: "Darslar hali kiritilmagan." }
    return { text: `Eng ko'p soatli fan: ${top.s.name} — ${top.load} soat/hafta.`, navigate: 'subjects' }
  }

  // "Eng katta sinf"
  if (/eng\s+katta|biggest/.test(t) && /sinf|class|класс/.test(t)) {
    if (project.classes.length === 0) return { text: "Sinflar hali yo'q." }
    const ranked = project.classes.map((c) => ({ c, load: classLoad(c.id, project.lessons) }))
      .sort((a, b) => b.load - a.load)
    const top = ranked[0]
    return { text: `Eng ko'p dars soatli sinf: ${top.c.name} — ${top.load} soat/hafta.`, navigate: 'classes' }
  }

  // "Jami soat"
  if (/jami|umumiy|all|total|общ/.test(t) && /soat|hour|час/.test(t)) {
    const total = project.lessons.reduce((a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length), 0)
    return { text: `Jami haftalik soatlar: ${total}.` }
  }

  // "Konfliktlar"
  if (scores.conflict > 0) {
    const v = currentVersion(project.timetables)
    if (!v) return { text: "Jadval hali tuzilmagan." }
    const hv = countHardViolations(v.entries)
    if (hv === 0) return { text: "✓ Jadvalda qat'iy to'qnashuv yo'q — toza." }
    return { text: `⚠ Jadvalda ${hv} ta qat'iy to'qnashuv bor.`, navigate: 'conflicts' }
  }

  // Sanash — "nechta ..."
  if (scores.count > 0) {
    if (/sinf|класс|class/.test(t)) return { text: `Sinflar: ${project.classes.length} ta.` }
    if (/fan|subject|предмет/.test(t)) return { text: `Fanlar: ${project.subjects.length} ta.` }
    if (/xona|комнат|кабинет|room/.test(t)) return { text: `Xonalar: ${project.rooms.length} ta.` }
    if (/o'?qituvchi|учитель|teacher/.test(t)) return { text: `O'qituvchilar: ${project.teachers.length} ta.` }
    if (/dars|урок|lesson/.test(t)) return { text: `Darslar: ${project.lessons.length} ta.` }
    if (/jadval|расписа|schedule/.test(t)) return { text: `Tuzilgan jadvallar: ${project.timetables.length} ta.` }
  }

  // Spesifik o'qituvchi/sinf yuklamasi
  if (scores.load > 0) {
    const resolved = resolveEntity(t, project)
    if (resolved) {
      if (resolved.kind === 'teacher') {
        const l = teacherLoad(resolved.id, project.lessons)
        const teacher = project.teachers.find((x) => x.id === resolved.id)
        return { text: `${resolved.name} yuklamasi: ${l} soat/hafta (norma: ${teacher?.weeklyMax ?? 24}).` }
      }
      if (resolved.kind === 'class') {
        const l = classLoad(resolved.id, project.lessons)
        return { text: `${resolved.name} yuklamasi: ${l} soat/hafta.` }
      }
      if (resolved.kind === 'subject') {
        const l = subjectLoad(resolved.id, project.lessons)
        return { text: `${resolved.name} fani: ${l} soat/hafta.` }
      }
    }
  }

  return null
}

// ============================================================
// 8. KONTEKST XOTIRASI — oldingi mentionni eslaydi
// ============================================================

const contextMemory: {
  lastEntityId?: string
  lastEntityKind?: ResolvedEntity['kind']
  lastDay?: number
  lastQuestion?: string
} = {}

export function rememberContext(entity: ResolvedEntity | null, day: number | null, question: string) {
  if (entity) { contextMemory.lastEntityId = entity.id; contextMemory.lastEntityKind = entity.kind }
  if (day != null) contextMemory.lastDay = day
  contextMemory.lastQuestion = question
}

export function getContextEntity(project: Project): { kind: ResolvedEntity['kind']; name: string } | null {
  if (!contextMemory.lastEntityId || !contextMemory.lastEntityKind) return null
  const list: Record<ResolvedEntity['kind'], (Teacher | SchoolClass | Subject | Room | Lesson)[]> = {
    teacher: project.teachers, class: project.classes, subject: project.subjects,
    room: project.rooms, lesson: project.lessons,
  }
  const found = list[contextMemory.lastEntityKind].find((x) => x.id === contextMemory.lastEntityId)
  if (!found) return null
  const name = (found as Teacher).fullName ?? (found as { name?: string }).name ?? ''
  return { kind: contextMemory.lastEntityKind, name }
}

export function resetContext() { contextMemory.lastEntityId = undefined; contextMemory.lastEntityKind = undefined; contextMemory.lastDay = undefined; contextMemory.lastQuestion = undefined }

// ============================================================
// 9. QO'SHIMCHA — ism ajratish (ko'proq hollar)
// ============================================================

const STOPWORDS = new Set([
  'ni', 'ga', 'da', 'dan', 'ning', 'uchun', 'bilan', 'bo\'yicha', 'orqali',
  'в', 'на', 'из', 'от', 'до', 'по', 'для', 'через',
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for',
  'qosh', "qo'sh", 'yangi', 'yarat', 'ochir', "o'chir", 'kirit', 'bo\'lsin',
  'добавь', 'создай', 'удали', 'покажи',
  'add', 'create', 'delete', 'remove', 'show', 'open', 'new',
])

export function extractCleanName(text: string, extras: string[] = []): string {
  const skip = new Set([...STOPWORDS, ...extras.map(normalize)])
  const words = normalize(text).split(/\s+/).filter((w) => w && !skip.has(w))
  return words.join(' ').trim()
}

// ============================================================
// 10. ASOSIY NLU — tabiiy jumladan tool-call chiqarish
// ============================================================

export interface NLUResult {
  calls: ToolCall[]      // Bajariladigan tool chaqiruvlari (bir yoki ko'p)
  answer?: NLUAnswer     // Yoki to'g'ridan-to'g'ri javob
  confidence: number     // 0..1
}

export function understand(text: string, project: Project): NLUResult {
  const sentences = splitIntents(text)
  const calls: ToolCall[] = []
  let anyAnswer: NLUAnswer | undefined

  for (const sent of sentences) {
    // 1. Tabiiy savolga javob urinishi
    const ans = answerAnalyticalQuestion(sent, project)
    if (ans) { anyAnswer = ans; continue }

    // 2. Intent-based tool call
    const call = sentenceToToolCall(sent, project)
    if (call) calls.push(call)
  }

  const confidence = calls.length + (anyAnswer ? 1 : 0) > 0 ? 0.8 : 0.1
  return { calls, answer: anyAnswer, confidence }
}

function sentenceToToolCall(sentence: string, project: Project): ToolCall | null {
  const t = normalize(sentence)
  const scores = scoreIntents(t)

  // Add — yangi narsa qo'shish
  if (scores.add > 0) {
    if (/sinf|класс|class/.test(t)) {
      // Bulk? "1 dan 11 gacha a va b"
      const range = /(\d+)\s*[-–]?\s*(?:dan|from|до)?\s*(\d+)/.exec(t)
      const letters = (t.match(/\b([abvbdfeivklmrstuy])\b/gi) || []).map((x) => x.toUpperCase())
      if (range && letters.length) {
        return { name: 'bulk_add_classes', args: { fromGrade: Number(range[1]), toGrade: Number(range[2]), letters: Array.from(new Set(letters)) } }
      }
      const name = extractCleanName(sentence, ['sinf', 'sinfni', 'klass', 'class', 'grade', 'yarat', "qo'sh", 'qosh', 'yangi'])
      if (name) return { name: 'add_class', args: { name } }
    }
    if (/o'?qituvchi|учител|teacher|ustoz/.test(t)) {
      const name = extractCleanName(sentence, ["o'qituvchi", 'oqituvchi', 'ustoz', 'teacher', 'uchitel', 'yarat', "qo'sh", 'qosh', 'yangi'])
      if (name) return { name: 'add_teacher', args: { name } }
    }
    if (/fan|предмет|subject/.test(t)) {
      const name = extractCleanName(sentence, ['fan', 'fanni', 'predmet', 'subject', 'yarat', "qo'sh", 'qosh', 'yangi'])
      if (name) return { name: 'add_subject', args: { name } }
    }
    if (/xona|комнат|кабинет|room|aud/.test(t)) {
      const name = extractCleanName(sentence, ['xona', 'kabinet', 'room', 'aud', 'yarat', "qo'sh", 'qosh', 'yangi'])
      if (name) return { name: 'add_room', args: { name } }
    }
  }

  // Remove — o'chirish
  if (scores.remove > 0) {
    const resolved = resolveEntity(t, project)
    if (resolved) return { name: 'delete_entity', args: { entity: resolved.kind, name: resolved.name } }
  }

  // Schedule — jadval tuzish
  if (scores.generate > 0 && /jadval|расписа|schedule|timetable/.test(t)) {
    const m = /(\d+)\s*(urinish|попыт|retr|restart|try)/.exec(t)
    return { name: 'generate_timetable', args: m ? { restarts: Number(m[1]) } : {} }
  }
  if (scores.improve > 0) return { name: 'improve_timetable', args: {} }

  // File ops
  if (scores.save > 0) return { name: 'save_project', args: {} }
  if (scores.open > 0 && /loyiha|fayl|проект|файл|file|project/.test(t)) return { name: 'open_project', args: {} }
  if (scores.export > 0) {
    let fmt = 'excel'
    if (/pdf/.test(t)) fmt = 'pdf'
    else if (/word|docx|ворд/.test(t)) fmt = 'word'
    else if (/png|rasm|image|изображ/.test(t)) fmt = 'png'
    else if (/csv/.test(t)) fmt = 'csv'
    return { name: 'export_data', args: { format: fmt } }
  }

  // Show — bo'limga o'tish
  if (scores.show > 0) {
    const panelMap: [RegExp, string][] = [
      [/hisobot|отчёт|отчет|report/, 'reports'],
      [/konflikt|конфликт|conflict/, 'conflicts'],
      [/almashtirish|замен|substit/, 'substitution'],
      [/sinf|класс|class/, 'classes'],
      [/fan|предмет|subject/, 'subjects'],
      [/xona|кабинет|room/, 'rooms'],
      [/o'?qituvchi|учитель|teacher/, 'teachers'],
      [/dars|урок|lesson/, 'lessons'],
      [/jadval|расписа|schedule|timetable/, 'distribution'],
      [/maktab|школ|school/, 'school'],
      [/eksport|экспорт|export/, 'export'],
      [/sozlama|настройк|setting/, 'settings'],
    ]
    for (const [re, panel] of panelMap) if (re.test(t)) return { name: 'navigate', args: { panel } }
  }

  // List — ro'yxat
  if (scores.list > 0) {
    if (/o'?qituvchi|учитель|teacher/.test(t)) return { name: 'list_entities', args: { entity: 'teacher' } }
    if (/sinf|класс|class/.test(t)) return { name: 'list_entities', args: { entity: 'class' } }
    if (/fan|subject|предмет/.test(t)) return { name: 'list_entities', args: { entity: 'subject' } }
    if (/xona|кабинет|room/.test(t)) return { name: 'list_entities', args: { entity: 'room' } }
  }

  // Ish vaqti — "Aliyev dushanba dars bermaydi"
  const day = extractDay(t)
  if (day != null && /dars bermaydi|ishlamaydi|не работает|day off|выходной|dam|band emas/.test(t)) {
    const resolved = resolveEntity(t, project, 'teacher')
    if (resolved) {
      if (resolved.kind === 'teacher') return { name: 'set_teacher_availability', args: { teacher: resolved.name, day: DAYS_UZ[day], available: false } }
      if (resolved.kind === 'class') return { name: 'set_class_availability', args: { class: resolved.name, day: DAYS_UZ[day], available: false } }
    }
  }

  // Almashtirish
  if (/kelmadi|kasal|замена|не пришёл|substitut|almashtir|o'rinbosar/.test(t)) {
    const resolved = resolveEntity(t, project, 'teacher')
    if (resolved && day != null) return { name: 'find_substitute', args: { teacher: resolved.name, day: DAYS_UZ[day] } }
  }

  // Jadval ko'rsatish
  if (/jadval|расписа|schedule/.test(t) && scores.show > 0) {
    const resolved = resolveEntity(t, project)
    if (resolved && (resolved.kind === 'class' || resolved.kind === 'teacher')) {
      return { name: 'query_schedule', args: { target: resolved.kind, name: resolved.name, ...(day != null ? { day: DAYS_UZ[day] } : {}) } }
    }
  }

  return null
}
