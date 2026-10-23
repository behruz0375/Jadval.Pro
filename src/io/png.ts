// ============================================================
// JadvalPro — jadvalni rasm (PNG) qilib saqlash (html2canvas).
// Toza, inline-stilli jadval off-screen chiziladi va rasmga olinadi
// (html2canvas Tailwind/CSS-var bilan yaxshi ishlamaydi — shuning uchun hex).
// ============================================================
import type { Project, TimetableVersion, TimetableEntry } from '@/types'
import { DAYS_UZ } from '@/constants'
import { WEEK_BADGE, safeColor } from '@/utils'

export type PngMode = 'class' | 'teacher' | 'room'

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

const pale = (hex?: string) => {
  const m = hex && /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return '#f5f6fa'
  const mix = (c: number) => Math.round(c + (255 - c) * 0.82)
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return '#' + h(mix(parseInt(m[1], 16))) + h(mix(parseInt(m[2], 16))) + h(mix(parseInt(m[3], 16)))
}

function entityName(project: Project, mode: PngMode, id: string): string {
  if (mode === 'class') return project.classes.find((c) => c.id === id)?.name ?? ''
  if (mode === 'teacher') return project.teachers.find((t) => t.id === id)?.fullName ?? ''
  return project.rooms.find((r) => r.id === id)?.name ?? ''
}

function gridHtml(project: Project, version: TimetableVersion, mode: PngMode, id: string): string {
  const { school, classes, subjects, teachers, rooms, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay
  const subjOf = (lid: string) => subjects.find((s) => s.id === lessons.find((l) => l.id === lid)?.subjectId)
  const tShort = (tid?: string) => teachers.find((t) => t.id === tid)?.short ?? ''
  const cName = (cid: string) => classes.find((c) => c.id === cid)?.name ?? ''
  const rShort = (rid?: string) => rooms.find((r) => r.id === rid)?.short ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}–${t.end}` : `${p}`
  }
  const cell = (d: number, p: number) => {
    const es = version.entries.filter((e: TimetableEntry) => {
      if (e.day !== d || e.slot !== p) return false
      if (mode === 'class') return e.classId === id
      if (mode === 'teacher') return e.teacherId === id || e.teacher2Id === id
      return e.roomId === id
    })
    return es
      .map((e) => {
        const s = subjOf(e.lessonId)
        const wk = e.week && e.week !== 'all' ? `<sup style="color:#2a4bd0;font-weight:800">${WEEK_BADGE[e.week]}</sup>` : ''
        const name = esc(s?.short || s?.name || '')
        const sub =
          mode === 'class'
            ? [tShort(e.teacherId), rShort(e.roomId)].filter(Boolean).join(' · ')
            : mode === 'teacher'
              ? [cName(e.classId), rShort(e.roomId)].filter(Boolean).join(' · ')
              : [cName(e.classId), tShort(e.teacherId)].filter(Boolean).join(' · ')
        return `<div style="background:${pale(safeColor(s?.color, ''))};border-left:3px solid ${safeColor(s?.color)};border-radius:3px;padding:3px 5px;margin:1px 0"><b>${wk}${name}</b>${sub ? `<div style="color:#555;font-size:11px">${esc(sub)}</div>` : ''}</div>`
      })
      .join('')
  }
  let head = `<tr><th style="background:#3c46be;color:#fff;border:1px solid #c9ccda;padding:5px;width:70px">#</th>`
  for (let d = 0; d < days; d++) head += `<th style="background:#3c46be;color:#fff;border:1px solid #c9ccda;padding:5px">${esc(DAYS_UZ[d])}</th>`
  head += `</tr>`
  let body = ''
  for (let p = 1; p <= maxP; p++) {
    body += `<tr><td style="border:1px solid #c9ccda;text-align:center;background:#eef0fa;padding:3px"><b>${p}</b><div style="color:#666;font-size:10px">${timeLabel(p)}</div></td>`
    for (let d = 0; d < days; d++) body += `<td style="border:1px solid #c9ccda;vertical-align:top;padding:2px;font-size:13px">${cell(d, p)}</td>`
    body += `</tr>`
  }
  const modeTitle = mode === 'class' ? 'Sinf' : mode === 'teacher' ? "O'qituvchi" : 'Xona'
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #3c46be;padding-bottom:4px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px">
        ${school.logo ? `<img src="${esc(school.logo)}" style="height:42px;width:42px;object-fit:contain"/>` : ''}
        <div style="font-weight:800;font-size:18px">${esc(school.name || 'Maktab')}</div>
      </div>
      <div style="color:#555">${esc(school.academicYear || '')}</div>
    </div>
    <h2 style="font-size:16px;margin:4px 0 10px">${esc(modeTitle)}: ${esc(entityName(project, mode, id))} — dars jadvali</h2>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">${head}${body}</table>`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const safeName = (s: string) => (s || 'jadval').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'jadval'

/** Tanlangan entity jadvalini PNG rasm qilib saqlash */
export async function exportTimetablePng(project: Project, version: TimetableVersion, mode: PngMode, id: string) {
  const html2canvas = (await import('html2canvas')).default
  const wrap = document.createElement('div')
  wrap.style.cssText =
    'position:fixed;left:-99999px;top:0;width:900px;background:#fff;padding:22px;font-family:Segoe UI,system-ui,sans-serif;color:#111'
  wrap.innerHTML = gridHtml(project, version, mode, id)
  document.body.appendChild(wrap)
  try {
    const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: '#ffffff', logging: false })
    await new Promise<void>((resolve) =>
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${safeName(school(project, mode, id))}.png`)
        resolve()
      }, 'image/png'),
    )
  } finally {
    wrap.remove()
  }
}

const school = (project: Project, mode: PngMode, id: string) =>
  `${project.school.name || 'jadval'}_${entityName(project, mode, id)}`
