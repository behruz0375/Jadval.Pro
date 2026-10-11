import { useMemo, useState } from 'react'
import { Users, GraduationCap, DoorOpen, LayoutGrid } from 'lucide-react'
import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { useToast } from '@/store/toast'
import { DAYS_SHORT } from '@/constants'
import { cx, weekOverlap } from '@/utils'
import { countHardViolations } from '@/features/_shared/compute'
import { TimetableGrid, type ViewMode } from './TimetableGrid'
import type { TimetableEntry } from '@/types'

const WORKING = 'Ishchi jadval'

export function MasterGrid() {
  const project = useProject((s) => s.project)
  const updateTimetable = useProject((s) => s.updateTimetable)
  const ui = useUI()
  const toast = useToast()
  const { school, classes, subjects, teachers, rooms, lessons, timetables } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay

  const version =
    timetables.find((t) => t.name === WORKING) ?? timetables[timetables.length - 1] ?? null

  const [mode, setMode] = useState<ViewMode>('class')
  const [drag, setDrag] = useState<{ id: string; day: number; slot: number } | null>(null)
  const [hideEmpty, setHideEmpty] = useState(true)
  const fullList = mode === 'class' ? classes : mode === 'teacher' ? teachers : rooms
  const [entityId, setEntityId] = useState<string>(fullList[0]?.id ?? '')
  const currentId = fullList.find((x) => x.id === entityId)?.id ?? fullList[0]?.id ?? ''

  const subjById = (id: string) => subjects.find((s) => s.id === id)
  const lessonById = (id: string) => lessons.find((l) => l.id === id)
  const colLabel = (x: { name?: string; short?: string; fullName?: string }) =>
    mode === 'teacher' ? x.short || x.fullName || '' : mode === 'room' ? x.short || x.name || '' : x.name || ''
  const nameOf = (x: { name?: string; fullName?: string }) => (mode === 'teacher' ? x.fullName : x.name) ?? ''

  // Tez qidirish uchun: `${entityId}:${day}:${slot}` -> entry
  const cellMap = useMemo(() => {
    const m = new Map<string, TimetableEntry>()
    if (!version) return m
    for (const e of version.entries) {
      if (mode === 'class') m.set(`${e.classId}:${e.day}:${e.slot}`, e)
      else if (mode === 'teacher') {
        if (e.teacherId) m.set(`${e.teacherId}:${e.day}:${e.slot}`, e)
        if (e.teacher2Id) m.set(`${e.teacher2Id}:${e.day}:${e.slot}`, e)
      } else if (e.roomId) m.set(`${e.roomId}:${e.day}:${e.slot}`, e)
    }
    return m
  }, [version, mode])

  // Bo'sh ustunlarni yashirish — hech qanday dars yo'q entitylarni filterdan o'tkazadi
  const hasAnyLesson = (id: string): boolean => {
    for (let d = 0; d < days; d++) for (let p = 1; p <= maxP; p++) {
      if (cellMap.has(`${id}:${d}:${p}`)) return true
    }
    return false
  }
  const list = useMemo(
    () => (hideEmpty ? fullList.filter((x) => hasAnyLesson(x.id)) : fullList),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fullList, hideEmpty, cellMap],
  )

  // Sinf rejimida bir ustun ichida drag bilan ko'chirish / almashtirish
  const dropHere = (toDay: number, toSlot: number) => {
    if (!version || !drag || mode !== 'class') return setDrag(null)
    const classId = drag.id
    const { day: fromDay, slot: fromSlot } = drag
    if (fromDay === toDay && fromSlot === toSlot) return setDrag(null)
    const all = version.entries
    const src = all.filter((e) => e.classId === classId && e.day === fromDay && e.slot === fromSlot)
    const tgt = all.filter((e) => e.classId === classId && e.day === toDay && e.slot === toSlot)
    if (src.length === 0) return setDrag(null)
    if ([...src, ...tgt].some((e) => e.locked)) {
      toast.info('Qulflangan dars bor')
      return setDrag(null)
    }
    const moved = new Set([...src, ...tgt].map((e) => e.id))
    const next = all.map((e) => {
      if (src.includes(e)) return { ...e, day: toDay, slot: toSlot }
      if (tgt.includes(e)) return { ...e, day: fromDay, slot: fromSlot }
      return e
    })
    const clash = (e: TimetableEntry, day: number, slot: number) => {
      const w = e.week ?? 'all'
      return next.some((o) => {
        if (moved.has(o.id) || o.day !== day || o.slot !== slot || !weekOverlap(o.week, w)) return false
        const sameTeacher =
          (!!e.teacherId && (o.teacherId === e.teacherId || o.teacher2Id === e.teacherId)) ||
          (!!e.teacher2Id && (o.teacherId === e.teacher2Id || o.teacher2Id === e.teacher2Id))
        const sameRoom = !!e.roomId && o.roomId === e.roomId
        return sameTeacher || sameRoom
      })
    }
    if (src.some((e) => clash(e, toDay, toSlot)) || tgt.some((e) => clash(e, fromDay, fromSlot))) {
      toast.error("O'qituvchi yoki xona bu vaqtda band")
      return setDrag(null)
    }
    updateTimetable(version.id, {
      entries: next,
      stats: { ...version.stats, placed: next.length, hardViolations: countHardViolations(next) },
    })
    setDrag(null)
  }

  const modes: { id: ViewMode; label: string; icon: typeof Users }[] = [
    { id: 'class', label: 'Sinf', icon: Users },
    { id: 'teacher', label: "O'qituvchi", icon: GraduationCap },
    { id: 'room', label: 'Xona', icon: DoorOpen },
  ]

  if (!version) {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-center text-muted">
        <div>
          <LayoutGrid size={40} className="mx-auto mb-2 text-accent/60" />
          <p>Hali jadval tuzilmagan. «Tahta» yoki «Avtomatik» orqali jadval tuzing.</p>
        </div>
      </div>
    )
  }

  const hiddenCount = fullList.length - list.length

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
          {modes.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id)
                  const next = m.id === 'class' ? classes : m.id === 'teacher' ? teachers : rooms
                  setEntityId(next[0]?.id ?? '')
                }}
                className={cx(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === m.id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
                )}
              >
                <Icon size={15} /> {m.label}
              </button>
            )
          })}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Bo'shlarni yashirish
          {hiddenCount > 0 && hideEmpty && (
            <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
              -{hiddenCount}
            </span>
          )}
        </label>
        <span className="ml-auto text-xs text-muted">
          Ko'rsatilmoqda: <span className="font-semibold text-ink">{list.length}</span>
          {hiddenCount > 0 && hideEmpty && ` / ${fullList.length}`}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        {/* Umumiy matritsa — barcha ustunlar */}
        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-border bg-surface" style={{ touchAction: 'pan-x pan-y' }}>
          <table className="border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 border-b border-r border-border bg-surface-2 px-2 py-1.5 text-[11px] text-muted">
                  Dars
                </th>
                {list.map((x) => (
                  <th
                    key={x.id}
                    onClick={() => setEntityId(x.id)}
                    title={nameOf(x)}
                    className={cx(
                      'sticky top-0 z-20 cursor-pointer border-b border-l border-border px-1.5 py-1.5 font-semibold transition-colors',
                      currentId === x.id ? 'bg-accent/15 text-accent' : 'bg-surface-2 hover:bg-accent/10',
                    )}
                  >
                    {colLabel(x)}
                  </th>
                ))}
                {list.length === 0 && (
                  <th className="border-b border-l border-border px-3 py-1.5 font-normal text-muted">
                    Ma'lumot yo'q
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days }).flatMap((_, d) =>
                Array.from({ length: maxP }).map((_, pi) => {
                  const p = pi + 1
                  const firstOfDay = pi === 0
                  const lastOfDay = pi === maxP - 1
                  // Zebra stripe by day — har kun kichik rang bilan ajratiladi
                  const dayBand = d % 2 === 0 ? 'bg-surface' : 'bg-surface-2/50'
                  return (
                    <tr key={`${d}:${p}`} className={cx(dayBand, firstOfDay && d > 0 && 'border-t-4 border-t-accent/20')}>
                      <td
                        className={cx(
                          'sticky left-0 z-10 border-r-2 border-r-border px-2 py-0.5 text-[11px]',
                          dayBand,
                          firstOfDay && d > 0 ? 'border-t-4 border-t-accent/20' : 'border-b border-b-border/50',
                          lastOfDay && 'border-b-2 border-b-border/80',
                        )}
                      >
                        {/* Har qatorda kun belgisi — faqat 1-qatorda emas */}
                        <span className={cx('mr-1 inline-block w-6 text-center font-bold', firstOfDay ? 'text-accent' : 'text-accent/40')}>
                          {DAYS_SHORT[d]}
                        </span>
                        <span className="font-semibold tabular-nums">{p}</span>
                      </td>
                      {list.map((x) => {
                        const e = cellMap.get(`${x.id}:${d}:${p}`)
                        const subj = e ? subjById(lessonById(e.lessonId)?.subjectId ?? '') : null
                        const color = ui.blackWhite ? undefined : subj?.color
                        const selectedCol = currentId === x.id
                        const canDrag = mode === 'class' && !!e
                        // ProRector uslubi — har katak 3 qator: fan / o'qituvchi / xona
                        const teacher = e ? teachers.find((t) => t.id === e.teacherId) : null
                        const room = e && e.roomId ? rooms.find((r) => r.id === e.roomId) : null
                        const subjLabel = subj ? (subj.short || subj.name) : ''
                        const teacherLabel = teacher ? (teacher.short || teacher.fullName.split(' ')[0]) : ''
                        const roomLabel = room ? (room.short || room.name) : ''
                        const cellTitle = subj ? `${subj.name}${teacher ? `\n${teacher.fullName}` : ''}${room ? `\n${room.name}` : ''}` : ''
                        return (
                          <td
                            key={x.id}
                            draggable={canDrag}
                            onClick={() => setEntityId(x.id)}
                            onDragStart={() => canDrag && setDrag({ id: x.id, day: d, slot: p })}
                            onDragEnd={() => setDrag(null)}
                            onDragOver={(ev) => {
                              if (mode === 'class' && drag && drag.id === x.id) ev.preventDefault()
                            }}
                            onDrop={(ev) => {
                              ev.preventDefault()
                              dropHere(d, p)
                            }}
                            title={cellTitle}
                            className={cx(
                              'border-l border-border/50 p-0.5',
                              canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                              firstOfDay && d > 0 ? 'border-t-4 border-t-accent/20' : 'border-b border-b-border/50',
                              lastOfDay && 'border-b-2 border-b-border/80',
                              selectedCol && 'bg-accent/10',
                              mode === 'class' && drag && drag.id === x.id && 'ring-1 ring-inset ring-accent/40',
                            )}
                          >
                            {subj ? (
                              <div
                                style={{
                                  minWidth: ui.compact ? 64 : 80,
                                  minHeight: ui.compact ? 44 : 56,
                                  background: color
                                    ? ui.gradient
                                      ? `linear-gradient(135deg, ${color}3a, ${color}1f)`
                                      : `${color}30`
                                    : 'rgba(100,100,100,0.08)',
                                  borderLeft: color ? `3px solid ${color}` : '3px solid rgba(100,100,100,0.3)',
                                }}
                                className="mx-auto flex flex-col items-center justify-center gap-[2px] rounded-md px-1.5 py-1 leading-tight"
                              >
                                <div className={cx('font-bold text-ink', ui.compact ? 'text-[11px]' : 'text-[13px]')}>
                                  {subjLabel}
                                </div>
                                {teacher && (
                                  <div className={cx('max-w-full truncate text-ink/80', ui.compact ? 'text-[9px]' : 'text-[11px]')}>
                                    {teacherLabel}
                                  </div>
                                )}
                                {room && (
                                  <div className={cx('font-semibold text-ink/60', ui.compact ? 'text-[8px]' : 'text-[10px]')}>
                                    {roomLabel}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                style={{ minWidth: ui.compact ? 64 : 80, minHeight: ui.compact ? 44 : 56 }}
                                className="mx-auto grid place-items-center text-[10px] text-muted/25"
                              >
                                ·
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                }),
              )}
            </tbody>
          </table>
        </div>

        {/* Parallel ko'rinish — tanlangan ustun */}
        <div className="hidden w-full flex-col gap-2 md:flex md:w-[21rem] md:shrink-0">
          <select
            value={currentId}
            onChange={(e) => setEntityId(e.target.value)}
            className="input h-9 font-semibold"
          >
            {list.length === 0 && <option>— ma'lumot yo'q —</option>}
            {list.map((x) => (
              <option key={x.id} value={x.id}>
                {nameOf(x)}
              </option>
            ))}
          </select>
          <div className="min-h-0 flex-1 overflow-auto">
            {currentId ? (
              <TimetableGrid version={version} mode={mode} entityId={currentId} />
            ) : (
              <div className="grid h-40 place-items-center text-muted">Ma'lumot yo'q</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
