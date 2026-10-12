// ============================================================
// Excel «Taqsimot» (tarifikatsiya) importi
// Format: qator = o'qituvchi + fan, ustunlar = sinflar, katak = haftalik soat.
// Har qanday joylashuvni tushunish uchun: avtomatik aniqlash + qo'lda tuzatish.
// ============================================================
import type { Project } from '@/types'
import { newClass, newSubject, newTeacher, newLesson } from '@/data/factories'

export interface SheetData {
  name: string
  rows: string[][]
}

export interface Mapping {
  headerRow: number
  teacherCol: number
  subjectCol: number
  classCols: number[]
}

export interface ParsedRow {
  teacher: string
  subject: string
  hours: Record<string, number> // className -> soat
}

export interface Parsed {
  classNames: string[]
  rows: ParsedRow[]
}

export interface ImportSummary {
  classes: number
  subjects: number
  teachers: number
  /** Yangi yaratilgan darslar */
  lessons: number
  /** Mavjud darslar yangilandi (soat o'zgartirildi yoki o'qituvchi tayinlandi) */
  updated: number
  hours: number
}

const s = (v: unknown) => String(v ?? '').trim()

/** "0,5" / "1" / " 2 " / "1 1/2" / "0.75" -> raqam; bo'lmasa 0 */
function num(v: unknown): number {
  const t = s(v).replace(',', '.').replace(/\s/g, '')
  if (!t) return 0
  // "1 1/2" yoki "3/2" kabi oddiy kasrlar
  const frac = /^(\d+)?[/](\d+)$/.exec(t) || /^(\d+)[+](\d+)[/](\d+)$/.exec(t)
  if (frac) {
    if (frac.length === 3) return parseFloat(frac[1] || '0') / parseFloat(frac[2])
    return parseFloat(frac[1]) + parseFloat(frac[2]) / parseFloat(frac[3])
  }
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

/** Sinf nomiga o'xshaydimi? Juda keng — "5-A", "11B", "6", "5А", "10 A", "9в", "1-sinf A", "IV-A" */
function looksLikeClass(h: string): boolean {
  const t = s(h).replace(/\s+/g, ' ')
  if (!t || t.length > 20) return false
  // Faqat raqam (1-12): sinf raqami (A/B/V ustki qatorda bo'lishi mumkin)
  if (/^(1[0-2]|[1-9])$/.test(t)) return true
  // Raqam + harf (tirnoq ham bo'lishi mumkin): "5-A", "11B", "6V", "9 в", "10А", "5-\"A\""
  if (/^(1[0-2]|[1-9])\s*[-–—.·]?\s*["«»"'']?[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ]{1,4}["«»"'']?$/i.test(t)) return true
  // "1-sinf", "9-sinf A" — "sinf"/"class"/"класс" so'zi bilan
  if (/(sinf|класс|class|guruh|группа)/i.test(t) && /\d/.test(t)) return true
  // Rim raqamlari: "I-A", "IX-B", "XI"
  if (/^(X{0,2}(IX|IV|V?I{0,3}))\s*[-–—.·]?\s*["«»"'']?[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ]{0,4}["«»"'']?$/i.test(t)) return true
  return false
}

/** Sinf nomini kanonlashtirish: "5 A" / "5А" / "5a" / "5-A" -> "5-A"  */
function normalizeClassName(raw: string): string {
  const t = s(raw).replace(/\s+/g, '').replace(/[.·—–]/g, '-')
  const m = /^(\d{1,2})-?([A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ]{1,4})$/.exec(t)
  if (m) return `${m[1]}-${m[2].toUpperCase()}`
  return s(raw).replace(/\s+/g, ' ')
}

const TEACHER_RE = /f\.?\s*i\.?\s*(sh|o)?|familiya|o'?qituv|ustoz|муаллим|учител|ф\.?и\.?о|teacher|преподават/i
const SUBJECT_RE = /^fan|fani|predmet|dars nomi|предмет|subject|дисциплин/i
const SKIP_HEADER_RE = /^(jami|jami soat|umumiy|umumiy soat|soat|soat soni|yillik|yillik soat|yillik soati|summa|итог|всего|всего часов|stavka|stavkasi|soni|total|haftaga|хафтага|#|№|no\.?|t\/r|t\.r\.|nomer|номер|row|строка|р\/с|р\.с\.|tartib|tartib raqami)$/i
/** Qatorda bu matn bo'lsa — o'qituvchi emas, umumlashtirilgan qator */
const SKIP_ROW_RE = /^(jami|umumiy|итог|всего|total|сумм)/i

/** Excel faylni varaqlarga o'qish (SheetJS dinamik import) */
export async function readSheets(file: File): Promise<SheetData[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return wb.SheetNames.map((name) => {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    }) as unknown[][]
    const rows = aoa.map((r) => (Array.isArray(r) ? r.map(s) : []))
    return { name, rows }
  }).filter((sh) => sh.rows.length > 0)
}

/** Parent sarlavhadan sinf raqamini ajratib olish:
 *  "5-sinflar" → "5", "10 класс" → "10", "6" → "6", "Grade 5" → "5",
 *  "5-sinf A" → null (o'zi to'liq sinf nomi — birlashtirish shart emas) */
function extractClassNumber(parent: string): string | null {
  const t = s(parent)
  if (!t) return null
  // Faqat raqam: "5", "10"
  if (/^(1[0-2]|[1-9])$/.test(t)) return t
  // Raqam + "sinf"/"sinflar"/"класс"/"классы"/"grade"/"class" (harfli bo'lmagan)
  const m = /^(\d{1,2})\s*[-–—.]?\s*(sinf|sinflar|класс|классы|grade|class)\w{0,5}$/i.exec(t)
  if (m) return m[1]
  // "Grade 5" (teskari tartib)
  const m2 = /^(sinf|sinflar|класс|классы|grade|class)\w{0,5}\s*[-–—.]?\s*(\d{1,2})$/i.exec(t)
  if (m2) return m2[2]
  return null
}

/** 2 qatorli sarlavha + merged cell'ni qo'llab-quvvatlab, har ustun uchun
 *  yakuniy sarlavha matnini yig'adi: ustki qator (parent/raqam) + pastki (harf). */
function combinedHeader(rows: string[][], topRow: number, bottomRow: number): string[] {
  if (topRow === bottomRow) return rows[topRow]?.map((c) => s(c)) ?? []
  const top = rows[topRow] ?? []
  const bot = rows[bottomRow] ?? []
  const width = Math.max(top.length, bot.length)
  // Birlashgan katak: ustki qatorda bo'sh — avvalgi parent'ni meros qilib olish (forward-fill)
  let lastTop = ''
  const combined: string[] = []
  for (let i = 0; i < width; i++) {
    const t = s(top[i])
    const b = s(bot[i])
    if (t) lastTop = t
    const parent = lastTop
    // Parentdan raqam ajratish: "5-sinflar" → "5", "10" → "10"
    const parentNum = extractClassNumber(parent)
    // "5" + "A" → "5-A", "5-sinflar" + "B" → "5-B"
    if (parentNum && b && /^[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ]{1,4}$/.test(b)) {
      combined.push(`${parentNum}-${b.toUpperCase()}`)
    } else if (parent && b && looksLikeClass(`${parent} ${b}`)) {
      // Agar birlashtirganda sinf nomiga o'xshasa (masalan "5" + "sinf A" → "5 sinf A")
      combined.push(normalizeClassName(`${parent} ${b}`))
    } else if (b) {
      combined.push(b)
    } else if (t) {
      combined.push(t)
    } else {
      combined.push('')
    }
  }
  return combined
}

/** Sarlavha qatori va ustunlarni avtomatik aniqlash (2 qatorli sarlavha, merged, bo'sh ustunlar). */
export function autoDetect(rows: string[][]): Mapping {
  const limit = Math.min(rows.length, 40)
  let headerRow = 0
  let bestScore = -1
  // Har qator uchun ikki variantni ham baholaymiz: faqat shu qator, va shu qator + oldingisi (merged)
  for (let r = 0; r < limit; r++) {
    for (const topR of [r, Math.max(0, r - 1)]) {
      const header = combinedHeader(rows, topR, r)
      let score = 0
      if (header.some((c) => TEACHER_RE.test(c))) score += 5
      if (header.some((c) => SUBJECT_RE.test(c))) score += 5
      score += header.filter((c) => looksLikeClass(c)).length * 2
      // Pastki qatorda yetarli raqamli data turgan bo'lsa — bu haqiqiy sarlavha
      let dataRows = 0
      for (let rr = r + 1; rr < Math.min(rows.length, r + 10); rr++)
        if (rows[rr]?.some((c) => num(c) > 0)) dataRows++
      score += Math.min(dataRows, 5)
      if (score > bestScore) {
        bestScore = score
        headerRow = r
      }
    }
  }

  // Birlashgan sarlavha matnini (headerRow ± 1 bilan) tuzish
  const prev = Math.max(0, headerRow - 1)
  const headerA = combinedHeader(rows, prev, headerRow)
  const headerB = rows[headerRow]?.map(s) ?? []
  const header =
    headerA.filter((c) => looksLikeClass(c)).length >= headerB.filter((c) => looksLikeClass(c)).length
      ? headerA
      : headerB
  const synthesized = header !== headerB
  // Original rows ustida ishlashini saqlab qolish uchun — faqat mapping qaytaradi; buildParsed combinedHeader'ni qayta hisoblaydi.

  let teacherCol = header.findIndex((c) => TEACHER_RE.test(c))
  let subjectCol = header.findIndex((c) => SUBJECT_RE.test(c))

  if (teacherCol < 0) {
    teacherCol = header.findIndex((c, i) => i > 0 && c && !looksLikeClass(c) && isNaN(Number(c)))
    if (teacherCol < 0) teacherCol = 1
  }
  if (subjectCol < 0) {
    subjectCol = header.findIndex((c, i) => i > teacherCol && c && !looksLikeClass(c) && !SKIP_HEADER_RE.test(c))
    if (subjectCol < 0) subjectCol = teacherCol + 1
  }

  const classCols: number[] = []
  // 1-bosqich: sinf nomiga o'xshagan sarlavha + raqamli data bo'lgan ustunlar (joylashuvdan qat'iy nazar)
  for (let i = 0; i < header.length; i++) {
    if (i === teacherCol || i === subjectCol) continue
    const h = header[i]
    if (SKIP_HEADER_RE.test(h || '')) continue
    if (!h) continue
    if (looksLikeClass(h) || hasNumericData(rows, headerRow, i)) classCols.push(i)
  }

  // 2-bosqich: 2 qatorli sarlavha gipotezasi
  if (classCols.length === 0 && !synthesized && headerRow + 1 < rows.length) {
    const h2 = combinedHeader(rows, headerRow, headerRow + 1)
    for (let i = 0; i < h2.length; i++) {
      if (i === teacherCol || i === subjectCol) continue
      if (h2[i] && !SKIP_HEADER_RE.test(h2[i]) && looksLikeClass(h2[i])) classCols.push(i)
    }
    if (classCols.length > 0) return { headerRow: headerRow + 1, teacherCol, subjectCol, classCols }
  }

  // 3-bosqich: oxirgi fallback — har qanday raqamli data'li ustunni sinf ustuni deb olish
  if (classCols.length === 0) {
    const width = Math.max(header.length, ...rows.slice(headerRow + 1, headerRow + 10).map((r) => r?.length ?? 0))
    for (let i = 0; i < width; i++) {
      if (i === teacherCol || i === subjectCol) continue
      if (SKIP_HEADER_RE.test(header[i] || '')) continue
      if (hasNumericData(rows, headerRow, i)) classCols.push(i)
    }
  }

  return { headerRow, teacherCol, subjectCol, classCols }
}

/** Qo'lda tuzatishdan keyin mappingni qayta hisoblash (sinf ustunlarini topadi) */
export function remap(rows: string[][], headerRow: number, teacherCol: number, subjectCol: number): Mapping {
  const prev = Math.max(0, headerRow - 1)
  const headerCombined = combinedHeader(rows, prev, headerRow)
  const headerPlain = rows[headerRow]?.map(s) ?? []
  const header =
    headerCombined.filter((c) => looksLikeClass(c)).length > headerPlain.filter((c) => looksLikeClass(c)).length
      ? headerCombined
      : headerPlain
  const classCols: number[] = []
  for (let i = 0; i < header.length; i++) {
    if (i === teacherCol || i === subjectCol) continue
    const h = header[i]
    if (SKIP_HEADER_RE.test(h || '')) continue
    if (!h) continue
    if (looksLikeClass(h) || hasNumericData(rows, headerRow, i)) classCols.push(i)
  }
  // Fallback: hech narsa topilmasa, raqamli data'li ustunlarni oladi
  if (classCols.length === 0) {
    const width = Math.max(header.length, ...rows.slice(headerRow + 1, headerRow + 10).map((r) => r?.length ?? 0))
    for (let i = 0; i < width; i++) {
      if (i === teacherCol || i === subjectCol) continue
      if (SKIP_HEADER_RE.test(header[i] || '')) continue
      if (hasNumericData(rows, headerRow, i)) classCols.push(i)
    }
  }
  return { headerRow, teacherCol, subjectCol, classCols }
}

/** Qo'lda sinf ustunlarini belgilash (toggle) */
export function toggleClassCol(m: Mapping, col: number): Mapping {
  const set = new Set(m.classCols)
  if (set.has(col)) set.delete(col)
  else set.add(col)
  return { ...m, classCols: [...set].sort((a, b) => a - b) }
}

function hasNumericData(rows: string[][], headerRow: number, col: number): boolean {
  let numeric = 0
  let total = 0
  // Row-number ustunini aniqlash: 1,2,3,4,... ketma-ket raqamlar
  let seqMatches = 0
  let seqChecked = 0
  for (let r = headerRow + 1; r < Math.min(rows.length, headerRow + 25); r++) {
    const v = rows[r]?.[col]
    const str = s(v)
    if (str) {
      total++
      const n = num(v)
      if (n > 0) numeric++
      // Ketma-ket raqam tekshiruvi (r - headerRow kabi)
      const expected = r - headerRow
      if (n === expected) seqMatches++
      seqChecked++
    }
  }
  if (total === 0) return false
  // Agar aksariyat qiymatlar ketma-ket row-number bo'lsa — bu sinf ustuni emas
  if (seqChecked >= 3 && seqMatches / seqChecked >= 0.8) return false
  return numeric / total >= 0.3
}

/** Mapping asosida qatorlarni o'qish:
 *  - 2 qatorli sarlavhani (merged) birlashtiradi
 *  - O'qituvchi/fan birlashgan kataklar uchun forward-fill
 *  - "Jami/Umumiy/Итого" kabi qatorlarni tashlab yuboradi
 *  - Sinf nomlarini kanonlashtiradi ("5 A" → "5-A") */
export function buildParsed(rows: string[][], m: Mapping): Parsed {
  // Ustki qator (birlashgan parent) bo'lsa, uni ham hisobga olib birlashtirilgan sarlavhani olamiz
  const prev = Math.max(0, m.headerRow - 1)
  const headerCombined = combinedHeader(rows, prev, m.headerRow)
  const headerPlain = rows[m.headerRow]?.map(s) ?? []
  const header =
    headerCombined.filter((c) => looksLikeClass(c)).length > headerPlain.filter((c) => looksLikeClass(c)).length
      ? headerCombined
      : headerPlain

  const classNames: string[] = []
  const classByCol: Record<number, string> = {}
  for (const i of m.classCols) {
    const raw = s(header[i])
    // Sarlavha bo'sh bo'lsa — ustun harfidan "Sinf-X" nomini yaratamiz (foydalanuvchi keyin tahrirlaydi)
    const cn = raw ? normalizeClassName(raw) : `Sinf-${colLetter(i)}`
    classByCol[i] = cn
    if (!classNames.includes(cn)) classNames.push(cn)
  }

  const out: ParsedRow[] = []
  let lastTeacher = ''
  let lastSubject = ''

  const stripLeadingNumber = (t: string) => s(t).replace(/^\s*\d+[\s.)]*/, '').trim()

  for (let r = m.headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.every((c) => !s(c))) continue
    const teacherRaw = stripLeadingNumber(s(row[m.teacherCol]))
    const subjectRaw = s(row[m.subjectCol])
    // "Jami/Umumiy/Итого" turidagi umumlashtiruvchi qatorlar — har qanday matnli ustunda bo'lishi mumkin
    const textCells = row
      .map((c, i) => (i === m.teacherCol || i === m.subjectCol || m.classCols.includes(i) ? '' : s(c)))
      .filter((x) => x && isNaN(Number(x)))
    if (
      SKIP_ROW_RE.test(teacherRaw) ||
      SKIP_ROW_RE.test(subjectRaw) ||
      textCells.some((t) => SKIP_ROW_RE.test(t))
    )
      continue
    if (teacherRaw) lastTeacher = teacherRaw
    if (subjectRaw) lastSubject = subjectRaw
    const teacher = teacherRaw || lastTeacher
    const subject = subjectRaw || lastSubject
    if (!subject) continue
    if (SKIP_HEADER_RE.test(subject)) continue

    const hours: Record<string, number> = {}
    let any = false
    for (const col of m.classCols) {
      const cn = classByCol[col]
      if (!cn) continue
      const h = num(row[col])
      if (h > 0) {
        hours[cn] = (hours[cn] ?? 0) + h
        any = true
      }
    }
    if (any) out.push({ teacher, subject, hours })
  }

  return { classNames, rows: out }
}

/** Multi-sheet Excel fayldagi eng mos (eng yuqori ball) varaqni tanlash */
export function pickBestSheet(sheets: SheetData[]): SheetData | null {
  if (sheets.length === 0) return null
  let best = sheets[0]
  let bestScore = -1
  for (const sh of sheets) {
    const m = autoDetect(sh.rows)
    const p = buildParsed(sh.rows, m)
    const score = p.rows.length * 2 + p.classNames.length
    if (score > bestScore) {
      bestScore = score
      best = sh
    }
  }
  return best
}

/** Noma'qul "sinf" nomlari: ustun qator-raqami yoki noma'noli belgi.
 *  Bular hech qachon haqiqiy sinf nomi bo'lmaydi — ularni import jarayonida chetlab o'tamiz. */
const INVALID_CLASS_NAME_RE = /^(#|№|n|no\.?|t\/r|t\.r\.|nomer|номер|row|строка|р\/с|р\.с\.|tartib|xona|xonalar|room|каб|каб\.|кабинет|-|—|–|\.|,|\s*)$/i
export const isInvalidClassName = (name: string): boolean => INVALID_CLASS_NAME_RE.test((name || '').trim())

/** Import natijasini loyihaga qo'llash (mavjudlarini topib yoki yaratib).
 *  Qayta-import xavfsiz: mavjud darslar soatlari qo'shilmaydi, aksincha import qiymati bilan
 *  yangilanadi (shu bilan 2 marta import qilsangiz, soatlar 2 barobar bo'lib ketmaydi). */
export function applyImport(parsed: Parsed, project: Project): { project: Project; summary: ImportSummary } {
  const classes = [...project.classes]
  const subjects = [...project.subjects]
  const teachers = [...project.teachers]
  const lessons = [...project.lessons]
  const summary: ImportSummary = { classes: 0, subjects: 0, teachers: 0, lessons: 0, updated: 0, hours: 0 }
  /** Shu import davomida yaratilgan yoki yangilangan dars ID'lari (bir xil fayldagi takroriy
   *  qatorlarda soatlar to'g'ri jamlanishi uchun). */
  const touchedInThisBatch = new Set<string>()

  // Noma'qul sinf nomlarini chetlab o'tamiz (masalan "#", "Xona", "№" avvalgi bug'li importdan)
  const validClassNames = parsed.classNames.filter(cn => !isInvalidClassName(cn))
  const parsedRows = parsed.rows.map(r => ({
    ...r,
    hours: Object.fromEntries(
      Object.entries(r.hours).filter(([cn]) => !isInvalidClassName(cn)),
    ),
  }))
  parsed = { classNames: validClassNames, rows: parsedRows }

  const lc = (x: string) => x.trim().toLowerCase()
  const classKey = (x: string) => normalizeClassName(x).toLowerCase()
  const findClass = (n: string) => classes.find((c) => classKey(c.name) === classKey(n) || lc(c.name) === lc(n) || lc(c.short) === lc(n))
  const findSubj = (n: string) => subjects.find((x) => lc(x.name) === lc(n) || lc(x.short) === lc(n))
  const findTeacher = (n: string) => teachers.find((t) => lc(t.fullName) === lc(n))

  for (const cn of parsed.classNames) {
    if (!findClass(cn)) {
      const c = newClass(project.school, cn)
      c.short = cn
      classes.push(c)
      summary.classes++
    }
  }

  for (const row of parsed.rows) {
    if (!row.subject) continue
    let subj = findSubj(row.subject)
    if (!subj) {
      subj = newSubject(project.school, row.subject, subjects.length)
      subjects.push(subj)
      summary.subjects++
    }
    let teacherId = ''
    if (row.teacher) {
      let t = findTeacher(row.teacher)
      if (!t) {
        t = newTeacher(project.school, row.teacher)
        t.subjectIds = [subj.id]
        teachers.push(t)
        summary.teachers++
      } else if (!t.subjectIds.includes(subj.id)) {
        const idx = teachers.findIndex((x) => x.id === t!.id)
        teachers[idx] = { ...t, subjectIds: [...t.subjectIds, subj.id] }
        t = teachers[idx]
      }
      teacherId = t.id
    }

    for (const [cn, h] of Object.entries(row.hours)) {
      const cls = findClass(cn)
      if (!cls) continue
      const existingIdx = lessons.findIndex(
        (l) =>
          l.subjectId === subj!.id &&
          l.classIds.length === 1 &&
          l.classIds[0] === cls.id &&
          (teacherId ? l.teacher1Id === teacherId : true),
      )
      if (existingIdx >= 0) {
        const existing = lessons[existingIdx]
        if (touchedInThisBatch.has(existing.id)) {
          // Shu import davomida yaratilgan/yangilangan dars — bir xil kombinatsiya 2 marta
          // kelsa (chorak/semestr), soatlarni jamlaymiz
          lessons[existingIdx] = {
            ...existing,
            hoursPerWeek: existing.hoursPerWeek + h,
            teacher1Id: teacherId || existing.teacher1Id,
          }
        } else {
          // Loyihada avvaldan mavjud bo'lgan dars — soatni ALMASHTIRAMIZ (qo'shmaymiz).
          // Shu bilan bir xil Excel'ni 2 marta import qilsangiz, soatlar duplicatelanmaydi.
          const changed = existing.hoursPerWeek !== h || (teacherId && existing.teacher1Id !== teacherId)
          lessons[existingIdx] = {
            ...existing,
            hoursPerWeek: h,
            teacher1Id: teacherId || existing.teacher1Id,
          }
          if (changed) summary.updated++
          touchedInThisBatch.add(existing.id)
        }
      } else {
        const l = newLesson(project.school)
        l.subjectId = subj.id
        l.classIds = [cls.id]
        l.teacher1Id = teacherId
        l.hoursPerWeek = h
        lessons.push(l)
        touchedInThisBatch.add(l.id)
        summary.lessons++
      }
      summary.hours += h
    }
  }

  return { project: { ...project, classes, subjects, teachers, lessons }, summary }
}

/** Ustun indeksini Excel harfiga aylantiradi (0 → A, 25 → Z, 26 → AA) */
export function colLetter(i: number): string {
  let n = i
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/** Namuna shablon faylni yuklab berish */
export async function downloadSample() {
  const XLSX = await import('xlsx')
  const rows = [
    ['#', 'F.I.Sh', 'Fani', '5-A', '5-B', '6-A', '6-B'],
    [1, 'Aliyev Vali Akramovich', 'Matematika', 5, 5, '', ''],
    [2, 'Aliyev Vali Akramovich', 'Geometriya', '', '', 2, 2],
    [3, 'Soliyeva Dilnoza', 'Ona tili', 4, 4, 3, 3],
    [4, 'Rahimov Jasur', 'Ingliz tili', 3, 3, 3, 3],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Taqsimot')
  XLSX.writeFile(wb, 'taqsimot_namuna.xlsx')
}
