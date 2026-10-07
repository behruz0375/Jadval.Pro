// ============================================================
// JadvalPro — FORMATLANGAN Excel eksport (ExcelJS).
// Chegara, fan rangi, birlashgan katak, ustun kengligi, muzlatilgan sarlavha.
// ExcelJS og'ir — faqat shu yerda dinamik import qilinadi (alohida chunk).
// ============================================================
import type { Project, TimetableVersion, TimetableEntry } from '@/types'
import { DAYS_UZ } from '@/constants'
import { WEEK_BADGE } from '@/utils'

type ExcelMode = 'class' | 'teacher' | 'room'

function hexToArgb(hex: string | undefined, fallback = 'FF8A8A8A'): string {
  const m = hex && /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return fallback
  return ('FF' + m[1] + m[2] + m[3]).toUpperCase()
}

/** Rangni oqqa yaqinlashtirib och (pastel) qilish — katak foni uchun */
function paleArgb(hex: string | undefined): string {
  const m = hex && /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return 'FFF4F5F9'
  const mix = (c: number) => Math.round(c + (255 - c) * 0.82)
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return ('FF' + h(mix(parseInt(m[1], 16))) + h(mix(parseInt(m[2], 16))) + h(mix(parseInt(m[3], 16)))).toUpperCase()
}

const ACCENT = 'FF3C46BE'
const THIN = { style: 'thin' as const, color: { argb: 'FFB4B4C0' } }
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN }

async function loadExcelJS() {
  const mod = (await import('exceljs')) as unknown as { default?: unknown; Workbook?: unknown }
  const E = (mod.default ?? mod) as { Workbook: new () => import('exceljs').Workbook }
  return E
}

function downloadWorkbookBuffer(buf: ArrayBuffer, filename: string) {
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const safeName = (s: string) => (s || 'jadvalpro').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'jadvalpro'

/** Bitta rejim (sinf/o'qituvchi/xona) uchun formatlangan varaq qo'shadi */
function addGridSheet(
  wb: import('exceljs').Workbook,
  project: Project,
  version: TimetableVersion,
  mode: ExcelMode,
) {
  const { school, classes, subjects, teachers, rooms, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay

  const entities =
    mode === 'class'
      ? classes.map((c) => ({ id: c.id, name: c.name }))
      : mode === 'teacher'
        ? teachers.map((t) => ({ id: t.id, name: t.short || t.fullName }))
        : rooms.map((r) => ({ id: r.id, name: r.short || r.name }))
  const sheetName = mode === 'class' ? 'Sinflar' : mode === 'teacher' ? "O'qituvchilar" : 'Xonalar'
  if (entities.length === 0) return

  const subjOf = (lessonId: string) => {
    const l = lessons.find((x) => x.id === lessonId)
    return subjects.find((s) => s.id === l?.subjectId)
  }
  const tShort = (id?: string) => teachers.find((t) => t.id === id)?.short ?? ''
  const cName = (id: string) => classes.find((c) => c.id === id)?.name ?? ''
  const rShort = (id?: string) => rooms.find((r) => r.id === id)?.short ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}-${t.end}` : ''
  }

  const cellInfo = (eid: string, d: number, p: number): { text: string; color?: string } => {
    const es = version.entries.filter((e: TimetableEntry) => {
      if (e.day !== d || e.slot !== p) return false
      if (mode === 'class') return e.classId === eid
      if (mode === 'teacher') return e.teacherId === eid || e.teacher2Id === eid
      return e.roomId === eid
    })
    if (es.length === 0) return { text: '' }
    const text = es
      .map((e) => {
        const s = subjOf(e.lessonId)
        const wk = e.week && e.week !== 'all' ? WEEK_BADGE[e.week] + ' ' : ''
        const name = s?.short || s?.name || ''
        const extra =
          mode === 'class'
            ? [tShort(e.teacherId), rShort(e.roomId)].filter(Boolean).join(' ')
            : mode === 'teacher'
              ? [cName(e.classId), rShort(e.roomId)].filter(Boolean).join(' ')
              : [cName(e.classId), tShort(e.teacherId)].filter(Boolean).join(' ')
        return `${wk}${name}${extra ? ' ' + extra : ''}`
      })
      .join(' / ')
    return { text, color: subjOf(es[0].lessonId)?.color }
  }

  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }] })
  const totalCols = 3 + entities.length

  // 1-qator: maktab + sarlavha
  ws.mergeCells(1, 1, 1, totalCols)
  const title = ws.getCell(1, 1)
  title.value = `${school.name || 'Maktab'} — ${sheetName} dars jadvali${school.academicYear ? ' (' + school.academicYear + ')' : ''}`
  title.font = { bold: true, size: 13, color: { argb: 'FF1A1A28' } }
  title.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(1).height = 22

  // 2-qator: ustun sarlavhalari
  const headers = ['Kun', '#', 'Vaqt', ...entities.map((e) => e.name)]
  const headerRow = ws.getRow(2)
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1)
    c.value = h
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = BORDER_ALL
  })
  headerRow.height = 20

  // Ma'lumot qatorlari
  let r = 3
  for (let d = 0; d < days; d++) {
    const dayStart = r
    for (let p = 1; p <= maxP; p++) {
      const row = ws.getRow(r)
      row.getCell(1).value = p === 1 ? DAYS_UZ[d] : ''
      row.getCell(2).value = p
      row.getCell(3).value = timeLabel(p)
      for (let k = 0; k < 3; k++) {
        const c = row.getCell(k + 1)
        c.border = BORDER_ALL
        c.alignment = { vertical: 'middle', horizontal: 'center' }
        if (k === 1) c.font = { bold: true }
        if (k === 2) c.font = { size: 9, color: { argb: 'FF666677' } }
      }
      entities.forEach((e, ci) => {
        const c = row.getCell(4 + ci)
        const info = cellInfo(e.id, d, p)
        c.value = info.text
        c.border = BORDER_ALL
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        c.font = { size: 9 }
        if (info.text) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleArgb(info.color) } }
      })
      row.height = 24
      r++
    }
    // «Kun» kataklarini birlashtirish
    ws.mergeCells(dayStart, 1, r - 1, 1)
    const dc = ws.getCell(dayStart, 1)
    dc.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 }
    dc.font = { bold: true, color: { argb: ACCENT } }
  }

  // Ustun kengligi
  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 4
  ws.getColumn(3).width = 12
  for (let i = 0; i < entities.length; i++) ws.getColumn(4 + i).width = 16
}

/** Formatlangan tayyor jadval Excel: Sinflar + O'qituvchilar + Xonalar varaqlari */
export async function exportFormattedTimetableToExcel(project: Project, version: TimetableVersion) {
  const E = await loadExcelJS()
  const wb = new E.Workbook()
  wb.creator = 'JadvalPro'
  wb.created = new Date()
  addGridSheet(wb, project, version, 'class')
  addGridSheet(wb, project, version, 'teacher')
  addGridSheet(wb, project, version, 'room')
  if (wb.worksheets.length === 0) wb.addWorksheet('Bo\'sh')
  const buf = await wb.xlsx.writeBuffer()
  downloadWorkbookBuffer(buf as ArrayBuffer, `${safeName(project.school.name)}_jadval_format.xlsx`)
}

/** Tarifikatsiya (o'qituvchilar yuklamasi) — formatlangan Excel */
export async function exportTariffToExcel(project: Project) {
  const { teachers, lessons, subjects } = project
  const E = await loadExcelJS()
  const wb = new E.Workbook()
  wb.creator = 'JadvalPro'
  const ws = wb.addWorksheet('Tarifikatsiya', { views: [{ state: 'frozen', ySplit: 2 }] })

  const stat = (tid: string) => {
    const mine = lessons.filter((l) => l.teacher1Id === tid || l.teacher2Id === tid)
    const hours = mine.reduce((a, l) => a + l.hoursPerWeek, 0)
    const classSet = new Set<string>()
    mine.forEach((l) => l.classIds.forEach((c) => classSet.add(c)))
    return { hours, lessons: mine.length, classes: classSet.size }
  }
  const subjNames = (ids: string[]) =>
    ids.map((id) => subjects.find((s) => s.id === id)?.short).filter(Boolean).join(', ')

  const cols = 8
  ws.mergeCells(1, 1, 1, cols)
  const title = ws.getCell(1, 1)
  title.value = `${project.school.name || 'Maktab'} — Tarifikatsiya (o'qituvchilar yuklamasi)`
  title.font = { bold: true, size: 13 }
  ws.getRow(1).height = 22

  const headers = ['#', 'F.I.Sh.', 'Fanlari', 'Darslar', 'Sinflar', 'Jami soat', 'Norma', 'Holat']
  const hr = ws.getRow(2)
  headers.forEach((h, i) => {
    const c = hr.getCell(i + 1)
    c.value = h
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = BORDER_ALL
  })
  hr.height = 20

  teachers.forEach((t, i) => {
    const st = stat(t.id)
    const diff = st.hours - t.weeklyMax
    const status = diff > 0 ? `+${diff} ortiqcha` : diff < 0 ? `${-diff} kam` : "to'liq"
    const statusColor = diff > 0 ? 'FFFCE2E2' : diff < 0 ? 'FFFDF3DD' : 'FFDFF5E3'
    const row = ws.getRow(3 + i)
    const vals = [i + 1, t.fullName, subjNames(t.subjectIds) || '—', st.lessons, st.classes, st.hours, t.weeklyMax, status]
    vals.forEach((v, ci) => {
      const c = row.getCell(ci + 1)
      c.value = v as string | number
      c.border = BORDER_ALL
      c.alignment = { vertical: 'middle', horizontal: ci === 1 || ci === 2 ? 'left' : 'center' }
      if (ci === 7) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } }
      if (ci === 5) c.font = { bold: true }
    })
  })

  // Jami qator
  const totalRow = ws.getRow(3 + teachers.length)
  totalRow.getCell(2).value = 'JAMI'
  totalRow.getCell(2).font = { bold: true }
  totalRow.getCell(6).value = lessons.reduce((a, l) => a + l.hoursPerWeek, 0)
  totalRow.getCell(6).font = { bold: true }
  for (let k = 1; k <= cols; k++) totalRow.getCell(k).border = BORDER_ALL

  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 28
  ws.getColumn(3).width = 20
  for (let k = 4; k <= 8; k++) ws.getColumn(k).width = 11

  const buf = await wb.xlsx.writeBuffer()
  downloadWorkbookBuffer(buf as ArrayBuffer, `${safeName(project.school.name)}_tarifikatsiya.xlsx`)
}
