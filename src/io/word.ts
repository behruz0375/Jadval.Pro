// ============================================================
// JadvalPro — Word (.docx) eksport (docx kutubxonasi).
// Har entity uchun alohida jadval + maktab sarlavhasi + imzo.
// ============================================================
import type { Project, TimetableVersion, TimetableEntry } from '@/types'
import { DAYS_UZ } from '@/constants'
import { WEEK_BADGE } from '@/utils'

export type DocxMode = 'class' | 'teacher' | 'room'

function entityName(project: Project, mode: DocxMode, id: string): string {
  if (mode === 'class') return project.classes.find((c) => c.id === id)?.name ?? ''
  if (mode === 'teacher') return project.teachers.find((t) => t.id === id)?.fullName ?? ''
  return project.rooms.find((r) => r.id === id)?.name ?? ''
}

const safeName = (s: string) => (s || 'jadval').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'jadval'

export async function exportTimetableDocx(project: Project, version: TimetableVersion, mode: DocxMode, ids: string[]) {
  if (ids.length === 0) return
  const docx = await import('docx')
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, HeadingLevel, BorderStyle, PageOrientation,
  } = docx

  const { school, classes, subjects, teachers, rooms, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay
  const subjOf = (lid: string) => subjects.find((s) => s.id === lessons.find((l) => l.id === lid)?.subjectId)
  const tShort = (tid?: string) => teachers.find((t) => t.id === tid)?.short ?? ''
  const cName = (cid: string) => classes.find((c) => c.id === cid)?.name ?? ''
  const rShort = (rid?: string) => rooms.find((r) => r.id === rid)?.short ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}-${t.end}` : `${p}`
  }
  const cellText = (eid: string, d: number, p: number) => {
    const es = version.entries.filter((e: TimetableEntry) => {
      if (e.day !== d || e.slot !== p) return false
      if (mode === 'class') return e.classId === eid
      if (mode === 'teacher') return e.teacherId === eid || e.teacher2Id === eid
      return e.roomId === eid
    })
    return es
      .map((e) => {
        const s = subjOf(e.lessonId)
        const wk = e.week && e.week !== 'all' ? WEEK_BADGE[e.week] + ' ' : ''
        const extra =
          mode === 'class'
            ? [tShort(e.teacherId), rShort(e.roomId)].filter(Boolean).join(' ')
            : mode === 'teacher'
              ? [cName(e.classId), rShort(e.roomId)].filter(Boolean).join(' ')
              : [cName(e.classId), tShort(e.teacherId)].filter(Boolean).join(' ')
        return `${wk}${s?.short || s?.name || ''}${extra ? '\n' + extra : ''}`
      })
      .join(' / ')
  }

  const thin = { style: BorderStyle.SINGLE, size: 4, color: 'B4B4C0' }
  const cellBorders = { top: thin, bottom: thin, left: thin, right: thin }
  const txtCell = (text: string, opts: { bold?: boolean; fill?: string; color?: string; size?: number; align?: unknown } = {}) =>
    new TableCell({
      borders: cellBorders,
      shading: opts.fill ? { fill: opts.fill } : undefined,
      children: text.split('\n').map(
        (line) =>
          new Paragraph({
            alignment: (opts.align as never) ?? AlignmentType.CENTER,
            children: [new TextRun({ text: line, bold: opts.bold, color: opts.color, size: opts.size ?? 16 })],
          }),
      ),
    })

  const children: unknown[] = []
  ids.forEach((id, idx) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: school.name || 'Maktab', bold: true, size: 24 })],
        spacing: { after: 40 },
        pageBreakBefore: idx > 0,
      }),
    )
    const modeTitle = mode === 'class' ? 'Sinf' : mode === 'teacher' ? "O'qituvchi" : 'Xona'
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(`${modeTitle}: ${entityName(project, mode, id)} — dars jadvali${school.academicYear ? '  (' + school.academicYear + ')' : ''}`)],
        spacing: { after: 120 },
      }),
    )

    const headerCells = [txtCell('#', { bold: true, fill: '3C46BE', color: 'FFFFFF' })]
    for (let d = 0; d < days; d++) headerCells.push(txtCell(DAYS_UZ[d], { bold: true, fill: '3C46BE', color: 'FFFFFF' }))
    const rows = [new TableRow({ tableHeader: true, children: headerCells })]
    for (let p = 1; p <= maxP; p++) {
      const cells = [txtCell(`${p}\n${timeLabel(p)}`, { bold: true, fill: 'EEF0FA', size: 14 })]
      for (let d = 0; d < days; d++) cells.push(txtCell(cellText(id, d, p), { size: 15 }))
      rows.push(new TableRow({ children: cells }))
    }
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }))
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun(`Tuzdi: ${school.oibdo || '______________'}        Tasdiqlayman — Direktor: ${school.director || '______________'}`)],
      }),
    )
  })

  const doc = new Document({
    creator: 'JadvalPro',
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: children as never,
      },
    ],
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName(school.name)}_${mode}_jadval.docx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
