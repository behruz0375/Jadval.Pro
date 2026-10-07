import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { DAYS_SHORT } from '@/constants'
import { cx, WEEK_BADGE } from '@/utils'
import type { TimetableVersion, TimetableEntry, WeekType } from '@/types'

export type ViewMode = 'class' | 'teacher' | 'room'

export function TimetableGrid({
  version,
  mode,
  entityId,
  week = 'all',
}: {
  version: TimetableVersion
  mode: ViewMode
  entityId: string
  /** Hafta filtri: 'all' — hammasi, 'num' — 1-hafta, 'den' — 2-hafta */
  week?: WeekType
}) {
  const project = useProject((s) => s.project)
  const ui = useUI()
  const { school, subjects, teachers, classes, rooms, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay

  const subjById = (id: string) => subjects.find((s) => s.id === id)
  const lessonById = (id: string) => lessons.find((l) => l.id === id)
  const tName = (id?: string) => teachers.find((t) => t.id === id)?.short ?? ''
  const cName = (id: string) => classes.find((c) => c.id === id)?.name ?? ''
  const rName = (id?: string) => rooms.find((r) => r.id === id)?.short ?? ''

  const match = (e: TimetableEntry) =>
    mode === 'class'
      ? e.classId === entityId
      : mode === 'teacher'
        ? e.teacherId === entityId || e.teacher2Id === entityId
        : e.roomId === entityId

  const showWeek = (e: TimetableEntry) => week === 'all' || (e.week ?? 'all') === 'all' || e.week === week

  const cell: Record<string, TimetableEntry[]> = {}
  version.entries.filter((e) => match(e) && showWeek(e)).forEach((e) => {
    const k = `${e.day}:${e.slot}`
    ;(cell[k] ??= []).push(e)
  })

  const cellStyle = { minWidth: ui.cellWidth, height: ui.cellHeight }

  return (
    <div className="overflow-auto rounded-xl border border-border bg-surface">
      <table className="w-full border-collapse text-center text-sm">
        <thead>
          <tr className="bg-surface-2">
            <th className="sticky left-0 z-10 border-b border-r border-border bg-surface-2 px-2 py-2 text-xs text-muted">
              Dars
            </th>
            {Array.from({ length: days }).map((_, d) => (
              <th key={d} className="border-b border-border px-2 py-2 font-semibold">
                {DAYS_SHORT[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxP }).map((_, pi) => {
            const p = pi + 1
            const time = school.lessonTimes[pi]
            return (
              <tr key={p}>
                <td className="sticky left-0 z-10 border-b border-r border-border bg-surface-2 px-2 py-1 text-xs">
                  <div className="font-bold">{p}</div>
                  {time && <div className="text-[10px] text-muted">{time.start}</div>}
                </td>
                {Array.from({ length: days }).map((_, d) => {
                  const entries = cell[`${d}:${p}`] ?? []
                  return (
                    <td key={d} className="border-b border-border/60 p-0.5 align-top">
                      {entries.map((e) => {
                        const subj = subjById(e.lessonId ? lessonById(e.lessonId)?.subjectId ?? '' : '')
                        const color = ui.blackWhite ? undefined : subj?.color
                        const tBoth = e.teacher2Id
                          ? `${tName(e.teacherId)}/${tName(e.teacher2Id)}`
                          : tName(e.teacherId)
                        const second =
                          mode === 'class'
                            ? `${tBoth}${e.roomId ? ' · ' + rName(e.roomId) : ''}`
                            : mode === 'teacher'
                              ? `${cName(e.classId)}${e.roomId ? ' · ' + rName(e.roomId) : ''}`
                              : `${cName(e.classId)} · ${tBoth}`
                        return (
                          <div
                            key={e.id}
                            style={{
                              ...cellStyle,
                              background: color
                                ? ui.gradient
                                  ? `linear-gradient(135deg, ${color}26, ${color}14)`
                                  : `${color}1f`
                                : undefined,
                              borderLeft: color ? `3px solid ${color}` : undefined,
                            }}
                            className={cx(
                              'flex flex-col justify-center rounded px-1.5 text-left',
                              ui.compact ? 'py-0.5' : 'py-1',
                            )}
                          >
                            <span className="flex items-center gap-1 truncate text-xs font-semibold leading-tight">
                              {e.week && e.week !== 'all' && (
                                <span className="shrink-0 rounded bg-accent/25 px-1 text-[9px] font-bold text-accent">
                                  {WEEK_BADGE[e.week]}
                                </span>
                              )}
                              {subj?.short || subj?.name || '—'}
                            </span>
                            {ui.secondRow && <span className="truncate text-[10px] text-muted">{second}</span>}
                          </div>
                        )
                      })}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
