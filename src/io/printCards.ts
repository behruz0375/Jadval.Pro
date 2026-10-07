import type { Project, TimetableVersion, TimetableEntry } from '@/types'
import { DAYS_UZ } from '@/constants'
import { WEEK_BADGE } from '@/utils'

export type CardMode = 'class' | 'teacher' | 'room'

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

/** Tanlangan sinf/o'qituvchi/xona(lar) uchun chop-kartochkalarini toza oynada chiqarish */
export function printTimetableCards(
  project: Project,
  version: TimetableVersion,
  mode: CardMode,
  ids: string[],
) {
  const { school, classes, subjects, teachers, rooms, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay

  const subjOf = (lessonId: string) => {
    const l = lessons.find((x) => x.id === lessonId)
    return subjects.find((s) => s.id === l?.subjectId)
  }
  const tShort = (id?: string) => teachers.find((t) => t.id === id)?.short ?? ''
  const cName = (id: string) => classes.find((c) => c.id === id)?.name ?? ''
  const rShort = (id?: string) => rooms.find((r) => r.id === id)?.short ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}–${t.end}` : `${p}`
  }
  const wk = (e: TimetableEntry) => (e.week && e.week !== 'all' ? `<sup>${WEEK_BADGE[e.week]}</sup>` : '')

  const entityName = (id: string) => {
    if (mode === 'class') return classes.find((c) => c.id === id)?.name ?? ''
    if (mode === 'teacher') return teachers.find((t) => t.id === id)?.fullName ?? ''
    return rooms.find((r) => r.id === id)?.name ?? ''
  }
  const modeTitle = mode === 'class' ? 'Sinf' : mode === 'teacher' ? "O'qituvchi" : 'Xona'

  const cellFor = (id: string, d: number, p: number) => {
    const es = version.entries.filter((e) => {
      if (e.day !== d || e.slot !== p) return false
      if (mode === 'class') return e.classId === id
      if (mode === 'teacher') return e.teacherId === id || e.teacher2Id === id
      return e.roomId === id
    })
    if (es.length === 0) return ''
    return es
      .map((e) => {
        const s = subjOf(e.lessonId)
        const name = esc(s?.short || s?.name || '')
        const sub =
          mode === 'class'
            ? [tShort(e.teacherId), rShort(e.roomId)].filter(Boolean).join(' · ')
            : mode === 'teacher'
              ? [cName(e.classId), rShort(e.roomId)].filter(Boolean).join(' · ')
              : [cName(e.classId), tShort(e.teacherId)].filter(Boolean).join(' · ')
        const color = s?.color ?? '#999'
        return `<div class="l" style="border-left:3px solid ${color}"><b>${wk(e)}${name}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`
      })
      .join('')
  }

  const cardHtml = (id: string, last: boolean) => {
    let head = `<tr><th class="t">#</th>`
    for (let d = 0; d < days; d++) head += `<th>${esc(DAYS_UZ[d])}</th>`
    head += `</tr>`
    let body = ''
    for (let p = 1; p <= maxP; p++) {
      body += `<tr><td class="t"><b>${p}</b><span>${timeLabel(p)}</span></td>`
      for (let d = 0; d < days; d++) body += `<td>${cellFor(id, d, p)}</td>`
      body += `</tr>`
    }
    return `<section class="${last ? 'card' : 'card brk'}">
      <div class="hdr">
        <div style="display:flex;align-items:center;gap:8px">
          ${school.logo ? `<img src="${esc(school.logo)}" style="height:38px;width:38px;object-fit:contain"/>` : ''}
          <div>
            <div class="sch">${esc(school.name || 'Maktab')}</div>
            ${
              school.address || school.phone
                ? `<div class="addr">${esc([school.address, school.phone].filter(Boolean).join(' · '))}</div>`
                : ''
            }
          </div>
        </div>
        <div class="yr">${esc(school.academicYear || '')} o'quv yili</div>
      </div>
      <h2>${esc(modeTitle)}: ${esc(entityName(id))} — dars jadvali</h2>
      <table><thead>${head}</thead><tbody>${body}</tbody></table>
      <div class="sign">
        <div>Tuzdi: ${esc(school.oibdo || '______________')}</div>
        <div>Tasdiqlayman — Direktor: ${esc(school.director || '______________')}</div>
      </div>
    </section>`
  }

  const cards = ids.map((id, i) => cardHtml(id, i === ids.length - 1)).join('')

  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Dars jadvali — ${esc(modeTitle)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;color:#111;margin:0;padding:16px}
    .card{margin:0 auto 24px;max-width:900px}
    .brk{break-after:page;page-break-after:always}
    .hdr{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #333;padding-bottom:4px}
    .sch{font-weight:800;font-size:15px}
    .addr{color:#555;font-size:11px}
    .yr{color:#555;font-size:12px}
    h2{font-size:15px;margin:10px 0}
    table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
    th,td{border:1px solid #999;padding:2px 3px;vertical-align:top}
    th{background:#eee;text-align:center;font-size:11px}
    td.t,th.t{width:58px;text-align:center}
    td.t b{display:block}
    td.t span{display:block;color:#666;font-size:9px}
    .l{border-radius:2px;padding:2px 4px;margin:1px 0;background:#f6f6f6}
    .l b{display:block;line-height:1.1}
    .l span{display:block;color:#555;font-size:9px}
    .l sup{color:#2a4bd0;font-weight:800}
    .sign{display:flex;justify-content:space-between;margin-top:14px;font-size:12px}
    @page{margin:12mm}
  </style></head><body>${cards}</body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}
