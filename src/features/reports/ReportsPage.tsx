import {
  FileBarChart,
  Users,
  BookOpen,
  DoorOpen,
  GraduationCap,
  CalendarDays,
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useProject } from '@/store/project'
import { classLoad, teacherLoad, subjectLoad } from '@/features/_shared/compute'
import { DAYS_UZ } from '@/constants'
import type { LucideIcon } from 'lucide-react'

export function ReportsPage() {
  const project = useProject((s) => s.project)
  const { classes, subjects, rooms, teachers, lessons, school } = project
  const version = project.timetables[project.timetables.length - 1] ?? null

  const totalHours = lessons.reduce((a, l) => a + l.hoursPerWeek, 0)

  const stats: { label: string; icon: LucideIcon; value: number; color: string }[] = [
    { label: 'Sinflar', icon: Users, value: classes.length, color: '#3b82f6' },
    { label: 'Fanlar', icon: BookOpen, value: subjects.length, color: '#f97316' },
    { label: 'Xonalar', icon: DoorOpen, value: rooms.length, color: '#14b8a6' },
    { label: "O'qituvchilar", icon: GraduationCap, value: teachers.length, color: '#a855f7' },
    { label: 'Darslar', icon: CalendarDays, value: lessons.length, color: '#ec4899' },
    { label: 'Jami soat', icon: Clock, value: totalHours, color: '#6366f1' },
  ]

  // O'qituvchilar yuklamasi
  const teacherRows = teachers
    .map((t) => ({ t, load: teacherLoad(t.id, lessons) }))
    .sort((a, b) => b.load - a.load)
  const maxTeacherLoad = Math.max(1, ...teacherRows.map((r) => r.load))

  // Fanlar bo'yicha taqsimot
  const subjectRows = subjects
    .map((sub) => ({ sub, load: subjectLoad(sub.id, lessons) }))
    .sort((a, b) => b.load - a.load)

  // Sinflar yuklamasi
  const classRows = classes.map((c) => ({ c, load: classLoad(c.id, lessons) }))
  const capacity = school.workDays * school.maxLessonsPerDay

  return (
    <div className="fade-in mx-auto max-w-5xl space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <FileBarChart size={20} />
        </div>
        <h1 className="text-lg font-bold">Hisobotlar</h1>
        <button onClick={() => window.print()} className="btn btn-outline hover-lift ml-auto h-9">
          <Printer size={15} /> Chop etish
        </button>
      </div>

      {/* Umumiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((st) => {
          const Icon = st.icon
          return (
            <div key={st.label} className="card relative overflow-hidden p-4" style={{ borderTop: `3px solid ${st.color}` }}>
              <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${st.color}22`, color: st.color }}>
                <Icon size={18} />
              </div>
              <div className="mt-2.5 text-2xl font-black tabular-nums">{st.value}</div>
              <div className="text-xs text-muted">{st.label}</div>
            </div>
          )
        })}
      </div>

      {/* Jadval sifati */}
      {version && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Oxirgi jadval sifati</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QualityCard ok={version.stats.unplaced === 0} label="Joylashtirilgan" value={version.stats.placed} />
            <QualityCard ok={version.stats.unplaced === 0} label="Joylashmagan" value={version.stats.unplaced} invert />
            <QualityCard ok={version.stats.hardViolations === 0} label="Qat'iy buzilish" value={version.stats.hardViolations} invert />
            <QualityCard ok={version.stats.teacherGaps === 0} label="O'qituvchi oynalari" value={version.stats.teacherGaps} invert />
          </div>
        </section>
      )}

      {/* O'qituvchilar yuklamasi */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">O'qituvchilar yuklamasi (haftalik)</h2>
        {teacherRows.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {teacherRows.map(({ t, load }) => {
              const over = load > t.weeklyMax
              return (
                <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[14rem_1fr_auto]">
                  <span className="truncate text-sm font-medium">{t.short || t.fullName}</span>
                  <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-2 sm:col-span-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (load / maxTeacherLoad) * 100)}%`, background: over ? 'rgb(var(--danger))' : 'rgb(var(--accent))' }}
                    />
                  </div>
                  <span className={`text-right text-sm tabular-nums ${over ? 'font-semibold text-danger' : 'text-muted'}`}>
                    {load}/{t.weeklyMax}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Fanlar bo'yicha taqsimot */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Fanlar bo'yicha soatlar</h2>
        {subjectRows.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {subjectRows.map(({ sub, load }) => {
              const pct = totalHours ? (load / totalHours) * 100 : 0
              return (
                <div key={sub.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[14rem_1fr_auto]">
                  <span className="flex items-center gap-2 truncate text-sm font-medium">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: sub.color }} />
                    {sub.name}
                  </span>
                  <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-2 sm:col-span-1">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: sub.color }} />
                  </div>
                  <span className="text-right text-sm tabular-nums text-muted">
                    {load} soat · {pct.toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Sinflar yuklamasi */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Sinflar yuklamasi</h2>
        {classRows.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="border-b border-border px-3 py-2 font-semibold">Sinf</th>
                  <th className="border-b border-border px-3 py-2 text-center font-semibold">Navbat</th>
                  <th className="border-b border-border px-3 py-2 text-right font-semibold">O'quvchi</th>
                  <th className="border-b border-border px-3 py-2 text-right font-semibold">Haftalik soat</th>
                  <th className="border-b border-border px-3 py-2 text-right font-semibold">Bandlik</th>
                </tr>
              </thead>
              <tbody>
                {classRows.map(({ c, load }) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-center">{c.shiftIndex}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.studentCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{load}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {capacity ? `${((load / capacity) * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function QualityCard({ ok, label, value, invert }: { ok: boolean; label: string; value: number; invert?: boolean }) {
  const good = invert ? value === 0 : ok
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3">
      {good ? <CheckCircle2 className="text-ok" size={22} /> : <AlertTriangle className="text-warn" size={22} />}
      <div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-muted">Ma'lumot yo'q</p>
}
