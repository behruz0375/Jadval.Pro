// ============================================================
// JadvalPro — haqiqiy PDF eksport (jsPDF + autotable).
// To'liq Unicode (o'zbek lotin + rus kirill) uchun PT Sans shrifti
// base64 holida alohida chunk sifatida dinamik yuklanadi (bundle shishmasin).
// ============================================================
import type { Project, TimetableVersion, TimetableEntry } from '@/types'
import { DAYS_UZ, APP_NAME } from '@/constants'
import { WEEK_BADGE } from '@/utils'

type Doc = import('jspdf').jsPDF
type AutoTableOptions = import('jspdf-autotable').UserOptions

export type PdfMode = 'class' | 'teacher' | 'room'

const FONT = 'PTSans'

/** jsPDF + autotable + shriftlarni dinamik yuklab, yangi hujjat tayyorlaydi */
async function newDoc(orientation: 'p' | 'l'): Promise<{ doc: Doc; autoTable: (d: Doc, o: AutoTableOptions) => void }> {
  const [{ jsPDF }, autoTableMod, reg, bold] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('./fonts/ptSansRegular'),
    import('./fonts/ptSansBold'),
  ])
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true })
  doc.addFileToVFS('PTSans-Regular.ttf', reg.ptSansRegular)
  doc.addFont('PTSans-Regular.ttf', FONT, 'normal')
  doc.addFileToVFS('PTSans-Bold.ttf', bold.ptSansBold)
  doc.addFont('PTSans-Bold.ttf', FONT, 'bold')
  doc.setFont(FONT, 'normal')
  const autoTable = (autoTableMod.default ?? autoTableMod) as unknown as (d: Doc, o: AutoTableOptions) => void
  return { doc, autoTable }
}

function lastY(doc: Doc): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0
}

function safeName(s: string): string {
  return (s || APP_NAME).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || APP_NAME
}

/** Hujjat sarlavhasi: maktab rekvizitlari + o'quv yili. Qaytaradi: keyingi Y */
function letterhead(doc: Doc, project: Project, subtitle: string): number {
  const { school } = project
  const pw = doc.internal.pageSize.getWidth()
  const m = 12
  let textX = m
  if (school.logo) {
    try {
      const fmt = school.logo.includes('image/jpeg') ? 'JPEG' : school.logo.includes('image/webp') ? 'WEBP' : 'PNG'
      doc.addImage(school.logo, fmt, m, 5, 15, 15)
      textX = m + 19
    } catch {
      /* yaroqsiz rasm — e'tiborsiz qoldiramiz */
    }
  }
  doc.setFont(FONT, 'bold')
  doc.setFontSize(13)
  doc.setTextColor(20, 20, 30)
  doc.text(school.name || 'Maktab', textX, 14)

  doc.setFont(FONT, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 100)
  const reqs = [school.address, school.phone, school.inn ? `STIR: ${school.inn}` : ''].filter(Boolean).join('  ·  ')
  if (reqs) doc.text(reqs, textX, 19)
  if (school.academicYear) {
    doc.text(`${school.academicYear} o'quv yili`, pw - m, 14, { align: 'right' })
  }

  doc.setDrawColor(60, 70, 190)
  doc.setLineWidth(0.5)
  doc.line(m, 22, pw - m, 22)

  doc.setFont(FONT, 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 30, 40)
  doc.text(subtitle, m, 29)
  return 33
}

/** Sahifa pastidagi imzo qatorlari */
function signatures(doc: Doc, project: Project) {
  const { school } = project
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const y = ph - 14
  doc.setFont(FONT, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 70)
  doc.text(`Tuzdi: ${school.oibdo || '______________'}`, 12, y)
  doc.text(`Tasdiqlayman — Direktor: ${school.director || '______________'}`, pw - 12, y, { align: 'right' })
}

/** Har sahifa pastidagi raqam + dastur nomi (barcha sahifalarga) */
function footers(doc: Doc) {
  const pages = doc.getNumberOfPages()
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 160)
    doc.text(`${APP_NAME}`, 12, ph - 6)
    doc.text(`${i} / ${pages}`, pw - 12, ph - 6, { align: 'right' })
  }
}

const modeTitle = (m: PdfMode) => (m === 'class' ? 'Sinf' : m === 'teacher' ? "O'qituvchi" : 'Xona')

/** Bitta entity (sinf/o'qituvchi/xona) uchun jadval gridi qatorlari */
function gridRows(project: Project, version: TimetableVersion, mode: PdfMode, id: string): string[][] {
  const { school, classes, subjects, teachers, rooms, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay
  const subjOf = (lessonId: string) => {
    const l = lessons.find((x) => x.id === lessonId)
    return subjects.find((s) => s.id === l?.subjectId)
  }
  const tShort = (tid?: string) => teachers.find((t) => t.id === tid)?.short ?? ''
  const cName = (cid: string) => classes.find((c) => c.id === cid)?.name ?? ''
  const rShort = (rid?: string) => rooms.find((r) => r.id === rid)?.short ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}-${t.end}` : ''
  }
  const wk = (e: TimetableEntry) => (e.week && e.week !== 'all' ? WEEK_BADGE[e.week] + ' ' : '')

  const cellText = (d: number, p: number): string => {
    const es = version.entries.filter((e) => {
      if (e.day !== d || e.slot !== p) return false
      if (mode === 'class') return e.classId === id
      if (mode === 'teacher') return e.teacherId === id || e.teacher2Id === id
      return e.roomId === id
    })
    return es
      .map((e) => {
        const s = subjOf(e.lessonId)
        const name = s?.short || s?.name || ''
        const sub =
          mode === 'class'
            ? [tShort(e.teacherId), rShort(e.roomId)].filter(Boolean).join(' ')
            : mode === 'teacher'
              ? [cName(e.classId), rShort(e.roomId)].filter(Boolean).join(' ')
              : [cName(e.classId), tShort(e.teacherId)].filter(Boolean).join(' ')
        return `${wk(e)}${name}${sub ? `\n${sub}` : ''}`
      })
      .join(' / ')
  }

  const rows: string[][] = []
  for (let p = 1; p <= maxP; p++) {
    const row = [`${p}\n${timeLabel(p)}`]
    for (let d = 0; d < days; d++) row.push(cellText(d, p))
    rows.push(row)
  }
  return rows
}

const entityName = (project: Project, mode: PdfMode, id: string): string => {
  if (mode === 'class') return project.classes.find((c) => c.id === id)?.name ?? ''
  if (mode === 'teacher') return project.teachers.find((t) => t.id === id)?.fullName ?? ''
  return project.rooms.find((r) => r.id === id)?.name ?? ''
}

/** Bir hujjatga tanlangan entitylar uchun jadval sahifalarini chizish */
function renderEntities(
  doc: Doc,
  autoTable: (d: Doc, o: AutoTableOptions) => void,
  project: Project,
  version: TimetableVersion,
  mode: PdfMode,
  ids: string[],
  first: boolean,
) {
  const days = project.school.workDays
  const head = [['#', ...Array.from({ length: days }, (_, d) => DAYS_UZ[d])]]
  ids.forEach((id, i) => {
    if (!first || i > 0) doc.addPage()
    const startY = letterhead(doc, project, `${modeTitle(mode)}: ${entityName(project, mode, id)} — dars jadvali`)
    autoTable(doc, {
      head,
      body: gridRows(project, version, mode, id),
      startY,
      margin: { left: 12, right: 12, bottom: 20 },
      styles: { font: FONT, fontSize: 8.5, cellPadding: 1.6, valign: 'middle', halign: 'center', lineColor: [170, 170, 180], lineWidth: 0.1, textColor: [25, 25, 35] },
      headStyles: { font: FONT, fontStyle: 'bold', fillColor: [60, 70, 190], textColor: [255, 255, 255], halign: 'center' },
      columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold', fillColor: [238, 240, 250] } },
      alternateRowStyles: { fillColor: [247, 248, 252] },
    })
    signatures(doc, project)
  })
}

/** Tanlangan rejim + idlar uchun jadval PDF (TimetableViewer uchun) */
export async function exportTimetablePdf(project: Project, version: TimetableVersion, mode: PdfMode, ids: string[]) {
  if (ids.length === 0) return
  const { doc, autoTable } = await newDoc('l')
  renderEntities(doc, autoTable, project, version, mode, ids, true)
  footers(doc)
  doc.save(`${safeName(project.school.name)}_${mode}_jadval.pdf`)
}

/** To'liq jadval PDF: barcha sinflar + o'qituvchilar + xonalar bitta faylda */
export async function exportFullTimetablePdf(project: Project, version: TimetableVersion) {
  const { doc, autoTable } = await newDoc('l')
  let first = true
  const classIds = project.classes.map((c) => c.id)
  const teacherIds = project.teachers.map((t) => t.id)
  const roomIds = project.rooms.map((r) => r.id)
  if (classIds.length) {
    renderEntities(doc, autoTable, project, version, 'class', classIds, first)
    first = false
  }
  if (teacherIds.length) {
    renderEntities(doc, autoTable, project, version, 'teacher', teacherIds, first)
    first = false
  }
  if (roomIds.length) {
    renderEntities(doc, autoTable, project, version, 'room', roomIds, first)
    first = false
  }
  if (first) {
    // Hech narsa yo'q — bo'sh sahifa ogohlantirishi
    letterhead(doc, project, 'Dars jadvali')
    doc.setFont(FONT, 'normal')
    doc.setFontSize(11)
    doc.text("Jadval bo'sh — avval «Taqsimot» bo'limida jadval tuzing.", 12, 40)
  }
  footers(doc)
  doc.save(`${safeName(project.school.name)}_jadval.pdf`)
}

/** Umumiy ro'yxat (sarlavha + qatorlar) PDF — portret */
export async function exportListPdf(project: Project, title: string, headers: string[], rows: (string | number)[][]) {
  const { doc, autoTable } = await newDoc('p')
  const startY = letterhead(doc, project, title)
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c ?? ''))),
    startY,
    margin: { left: 12, right: 12, bottom: 16 },
    styles: { font: FONT, fontSize: 9, cellPadding: 1.8, lineColor: [180, 180, 190], lineWidth: 0.1, textColor: [25, 25, 35] },
    headStyles: { font: FONT, fontStyle: 'bold', fillColor: [60, 70, 190], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [247, 248, 252] },
  })
  footers(doc)
  doc.save(`${safeName(title)}.pdf`)
}

/** Barcha ma'lumotlar ro'yxatlari bitta PDFda (sinf/fan/xona/o'qituvchi/dars) */
export async function exportDataPdf(project: Project) {
  const { classes, subjects, rooms, teachers, lessons } = project
  const { doc, autoTable } = await newDoc('p')

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? ''
  const teacherName = (id?: string) => (id ? teachers.find((t) => t.id === id)?.fullName ?? '' : '')
  const classNames = (ids: string[]) => ids.map((id) => classes.find((c) => c.id === id)?.name).filter(Boolean).join(', ')

  const sections: { title: string; head: string[]; body: (string | number)[][] }[] = [
    {
      title: 'Sinflar',
      head: ['#', 'Sinf nomi', 'Qisqa', 'Navbat', 'Sinf rahbari', 'Bino'],
      body: classes.map((c, i) => [
        i + 1,
        c.name,
        c.short,
        c.shiftIndex,
        teacherName(c.classTeacherId),
        c.building,
      ]),
    },
    {
      title: 'Fanlar',
      head: ['#', 'Fan nomi', 'Qisqa'],
      body: subjects.map((s, i) => [i + 1, s.name, s.short]),
    },
    {
      title: 'Xonalar',
      head: ['#', 'Xona nomi', 'Qisqa', "Sig'im", 'Turi', 'Bino'],
      body: rooms.map((r, i) => [i + 1, r.name, r.short, r.capacity, r.type, r.building]),
    },
    {
      title: "O'qituvchilar",
      head: ['#', 'F.I.Sh.', 'Kunlik', 'Haftalik'],
      body: teachers.map((t, i) => [i + 1, t.fullName, t.dailyCapacity, t.weeklyMax]),
    },
    {
      title: 'Darslar',
      head: ['#', 'Fan', 'Sinf(lar)', "O'qituvchi", 'Soat'],
      body: lessons.map((l, i) => [i + 1, subjName(l.subjectId), classNames(l.classIds), teacherName(l.teacher1Id), l.hoursPerWeek]),
    },
  ]

  let first = true
  for (const sec of sections) {
    if (sec.body.length === 0) continue
    if (!first) doc.addPage()
    const startY = letterhead(doc, project, sec.title)
    autoTable(doc, {
      head: [sec.head],
      body: sec.body.map((r) => r.map((c) => String(c ?? ''))),
      startY,
      margin: { left: 12, right: 12, bottom: 16 },
      styles: { font: FONT, fontSize: 9, cellPadding: 1.8, lineColor: [180, 180, 190], lineWidth: 0.1, textColor: [25, 25, 35] },
      headStyles: { font: FONT, fontStyle: 'bold', fillColor: [60, 70, 190], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [247, 248, 252] },
    })
    first = false
  }
  if (first) {
    letterhead(doc, project, "Ma'lumotlar")
    doc.setFont(FONT, 'normal')
    doc.setFontSize(11)
    doc.text("Ma'lumot yo'q.", 12, 40)
  }
  footers(doc)
  doc.save(`${safeName(project.school.name)}_malumotlar.pdf`)
}
