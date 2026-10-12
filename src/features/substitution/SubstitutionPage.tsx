import { useMemo, useState } from 'react'
import { Replace, UserX, Printer, CheckCircle2, CalendarX } from 'lucide-react'
import { useProject } from '@/store/project'
import { DAYS_UZ, DAYS_SHORT } from '@/constants'
import { cx } from '@/utils'

export function SubstitutionPage() {
  const project = useProject((s) => s.project)
  const { school, classes, subjects, rooms, teachers, lessons, timetables } = project
  const version = timetables[timetables.length - 1] ?? null

  const [day, setDay] = useState(0)
  const [absentId, setAbsentId] = useState<string>(teachers[0]?.id ?? '')
  const [subs, setSubs] = useState<Record<string, string>>({})

  const sName = (lid: string) => {
    const l = lessons.find((x) => x.id === lid)
    return subjects.find((s) => s.id === l?.subjectId)
  }
  const subjectIdOf = (lid: string) => lessons.find((x) => x.id === lid)?.subjectId ?? ''
  const cName = (id: string) => classes.find((c) => c.id === id)?.name ?? id
  const rName = (id?: string) => rooms.find((r) => r.id === id)?.short ?? ''
  const tName = (id?: string) => teachers.find((t) => t.id === id)?.short ?? ''
  const timeLabel = (p: number) => {
    const t = school.lessonTimes[p - 1]
    return t ? `${t.start}-${t.end}` : `${p}-dars`
  }

  // Tanlangan kundagi band o'qituvchilar (dars raqami bo'yicha)
  const busyBySlot = useMemo(() => {
    const m = new Map<number, Set<string>>()
    if (!version) return m
    for (const e of version.entries) {
      if (e.day !== day) continue
      const set = m.get(e.slot) ?? m.set(e.slot, new Set()).get(e.slot)!
      if (e.teacherId) set.add(e.teacherId)
      if (e.teacher2Id) set.add(e.teacher2Id)
    }
    return m
  }, [version, day])

  // O'qituvchining shu kundagi darslari
  const affected = useMemo(() => {
    if (!version || !absentId) return []
    return version.entries
      .filter((e) => (e.teacherId === absentId || e.teacher2Id === absentId) && e.day === day)
      .sort((a, b) => a.slot - b.slot)
  }, [version, absentId, day])

  const candidates = (slot: number, subjectId: string) => {
    const busy = busyBySlot.get(slot)
    const free = teachers.filter((t) => {
      if (t.id === absentId) return false
      if (busy?.has(t.id)) return false
      if (t.methodicalDays.includes(day)) return false
      return t.availability?.[day]?.[slot - 1] ?? true
    })
    const recommended = free.filter((t) => t.subjectIds.includes(subjectId))
    const recIds = new Set(recommended.map((t) => t.id))
    const others = free.filter((t) => !recIds.has(t.id))
    return { recommended, others }
  }

  const assignedCount = affected.filter((e) => subs[e.id]).length

  const printSheet = () => {
    const absent = teachers.find((t) => t.id === absentId)
    const rowsHtml = affected
      .map((e, i) => {
        const subj = sName(e.lessonId)
        const sub = teachers.find((t) => t.id === subs[e.id])
        return `<tr>
          <td>${i + 1}</td>
          <td>${e.slot} (${timeLabel(e.slot)})</td>
          <td>${cName(e.classId)}</td>
          <td>${subj?.name ?? ''}</td>
          <td>${absent?.fullName ?? ''}</td>
          <td>${sub ? sub.fullName : '—'}</td>
        </tr>`
      })
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Almashtirish varaqasi</title>
      <style>
        body{font-family:system-ui,Segoe UI,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px}
        .meta{color:#555;font-size:13px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #999;padding:6px 8px;text-align:left}
        th{background:#eee}
      </style></head><body>
      <h1>Almashtirish varaqasi</h1>
      <div class="meta">${school.name || ''} · ${DAYS_UZ[day]} · O'rniga: <b>${absent?.fullName ?? ''}</b></div>
      <table><thead><tr><th>#</th><th>Dars</th><th>Sinf</th><th>Fan</th><th>Asl o'qituvchi</th><th>O'rinbosar</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="6">Dars yo\'q</td></tr>'}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  if (!version) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-muted">
        <div>
          <Replace size={40} className="mx-auto mb-2 text-accent/60" />
          <p>Avval «Taqsimot» bo'limida jadval tuzing.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in flex flex-col gap-4 p-4 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <Replace size={20} />
        </div>
        <h1 className="text-lg font-bold">Almashtirish (o'rinbosar)</h1>
        <button
          onClick={printSheet}
          disabled={affected.length === 0}
          className="btn btn-outline hover-lift ml-auto h-9 disabled:opacity-50"
        >
          <Printer size={15} /> Varaqani chop etish
        </button>
      </div>

      {/* Boshqaruv */}
      <div className="card flex flex-wrap items-end gap-4 p-4">
        <div>
          <span className="label mb-1.5 block text-muted">Kun</span>
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
            {Array.from({ length: school.workDays }).map((_, d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={cx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  day === d ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
                )}
                title={DAYS_UZ[d]}
              >
                {DAYS_SHORT[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[16rem] flex-1">
          <span className="label mb-1.5 block text-muted">Kelmagan o'qituvchi</span>
          <select value={absentId} onChange={(e) => setAbsentId(e.target.value)} className="input h-10">
            {teachers.length === 0 && <option value="">— o'qituvchi yo'q —</option>}
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Xulosa */}
      <div className="flex flex-wrap gap-3">
        <Summary icon={CalendarX} label="Darslar" value={affected.length} />
        <Summary icon={CheckCircle2} label="O'rinbosar topildi" value={assignedCount} ok />
        <Summary icon={UserX} label="Qolgan" value={affected.length - assignedCount} warn={affected.length - assignedCount > 0} />
      </div>

      {/* Darslar ro'yxati */}
      {affected.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border text-center text-muted">
          <div>
            <CheckCircle2 size={40} className="mx-auto mb-2 text-ok/60" />
            <p>{DAYS_UZ[day]} kuni bu o'qituvchining darslari yo'q.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {affected.map((e) => {
            const subj = sName(e.lessonId)
            const subjectId = subjectIdOf(e.lessonId)
            const { recommended, others } = candidates(e.slot, subjectId)
            const noFree = recommended.length + others.length === 0
            return (
              <div key={e.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                <div className="flex w-16 shrink-0 flex-col">
                  <span className="text-sm font-bold">{e.slot}-dars</span>
                  <span className="text-[10px] text-muted">{timeLabel(e.slot)}</span>
                </div>
                <div className="flex min-w-[10rem] flex-1 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: subj?.color }} />
                  <div>
                    <div className="text-sm font-medium">{subj?.name}</div>
                    <div className="text-xs text-muted">
                      {cName(e.classId)}
                      {e.roomId ? ' · ' + rName(e.roomId) : ''}
                    </div>
                  </div>
                </div>
                <div className="min-w-[14rem] flex-1">
                  {noFree ? (
                    <span className="flex items-center gap-1.5 text-sm text-danger">
                      <UserX size={15} /> Bo'sh o'qituvchi yo'q
                    </span>
                  ) : (
                    <select
                      value={subs[e.id] ?? ''}
                      onChange={(ev) => setSubs((s) => ({ ...s, [e.id]: ev.target.value }))}
                      className={cx('input h-9', subs[e.id] && 'border-ok/60')}
                    >
                      <option value="">— o'rinbosar tanlang —</option>
                      {recommended.length > 0 && (
                        <optgroup label="Tavsiya etiladi (fan bo'yicha)">
                          {recommended.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.fullName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {others.length > 0 && (
                        <optgroup label="Boshqa bo'sh o'qituvchilar">
                          {others.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.fullName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}
                </div>
                {subs[e.id] && (
                  <span className="flex items-center gap-1 text-sm font-medium text-ok">
                    <CheckCircle2 size={15} /> {tName(subs[e.id])}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Summary({
  icon: Icon,
  label,
  value,
  ok,
  warn,
}: {
  icon: typeof UserX
  label: string
  value: number
  ok?: boolean
  warn?: boolean
}) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <Icon size={22} className={cx(ok && 'text-ok', warn && 'text-warn', !ok && !warn && 'text-accent')} />
      <div>
        <div className="text-lg font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  )
}
