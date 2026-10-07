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
  const list = mode === 'class' ? classes : mode === 'teacher' ? teachers : rooms
  const [entityId, setEntityId] = useState<string>(list[0]?.id ?? '')
  const currentId = list.find((x) => x.id === entityId)?.id ?? list[0]?.id ?? ''

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

  return (
    <div className="flex h-full flex-col gap-3">
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

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Umumiy matritsa — barcha ustunlar */}
        <div className="min-w-0 flex-1 overflow-auto rounded-xl border border-border bg-surface">
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
                  return (
                    <tr key={`${d}:${p}`}>
                      <td
                        className={cx(
                          'sticky left-0 z-10 border-r border-border bg-surface-2 px-2 py-0.5 text-[11px]',
                          firstOfDay && d > 0 ? 'border-t-2 border-t-border' : 'border-b border-b-border/60',
                        )}
                      >
                        {firstOfDay && <span className="mr-1 font-bold text-accent">{DAYS_SHORT[d]}</span>}
                        <span className="font-semibold">{p}</span>
                      </td>
                      {list.map((x) => {
                        const e = cellMap.get(`${x.id}:${d}:${p}`)
                        const subj = e ? subjById(lessonById(e.lessonId)?.subjectId ?? '') : null
                        const color = ui.blackWhite ? undefined : subj?.color
                        const selectedCol = currentId === x.id
                        const canDrag = mode === 'class' && !!e
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
                            className={cx(
                              'border-l border-border/60 p-0.5',
                              canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                              firstOfDay && d > 0 ? 'border-t-2 border-t-border' : 'border-b border-b-border/60',
                              selectedCol && 'bg-accent/5',
                              mode === 'class' && drag && drag.id === x.id && 'ring-1 ring-inset ring-accent/40',
                            )}
                          >
                            {subj ? (
                              <div
                                style={{
                                  minWidth: 46,
                                  height: ui.compact ? 26 : 34,
                                  background: color
                                    ? ui.gradient
                                      ? `linear-gradient(135deg, ${color}26, ${color}14)`
                                      : `${color}22`
                                    : undefined,
                                  borderLeft: color ? `3px solid ${color}` : undefined,
                                }}
                                className="mx-auto grid place-items-center rounded font-semibold leading-none"
                              >
                                {subj.short || subj.name}
                              </div>
                            ) : (
                              <div style={{ minWidth: 46, height: ui.compact ? 26 : 34 }} />
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
        <div className="flex w-[21rem] shrink-0 flex-col gap-2">
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
