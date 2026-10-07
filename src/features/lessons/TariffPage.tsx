import { Calculator } from 'lucide-react'
import { useProject } from '@/store/project'
import { Table, type Column } from '@/components/Table'
import { cx } from '@/utils'
import type { Teacher } from '@/types'

export function TariffPage() {
  const project = useProject((s) => s.project)
  const { teachers, lessons, subjects, classes } = project

  const stat = (t: Teacher) => {
    const mine = lessons.filter((l) => l.teacher1Id === t.id || l.teacher2Id === t.id)
    const hours = mine.reduce((a, l) => a + l.hoursPerWeek, 0)
    const classSet = new Set<string>()
    mine.forEach((l) => l.classIds.forEach((c) => classSet.add(c)))
    const subjSet = new Set(mine.map((l) => l.subjectId))
    return { hours, lessons: mine.length, classes: classSet.size, subjects: subjSet.size }
  }

  const columns: Column<Teacher>[] = [
    { key: 'n', header: '#', width: 44, align: 'center', render: (_r, i) => <span className="text-muted">{i + 1}</span> },
    { key: 'name', header: "O'qituvchi", render: (r) => <b>{r.fullName}</b> },
    {
      key: 'subj',
      header: 'Fanlari',
      render: (r) => (
        <span className="text-muted">
          {r.subjectIds.map((id) => subjects.find((s) => s.id === id)?.short).filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    { key: 'les', header: 'Darslar', align: 'center', render: (r) => stat(r).lessons },
    { key: 'cls', header: 'Sinflar', align: 'center', render: (r) => stat(r).classes },
    { key: 'hours', header: 'Jami soat', align: 'center', render: (r) => <b>{stat(r).hours}</b> },
    { key: 'norm', header: 'Norma', align: 'center', render: (r) => r.weeklyMax },
    {
      key: 'status',
      header: 'Holat',
      align: 'center',
      render: (r) => {
        const { hours } = stat(r)
        const diff = hours - r.weeklyMax
        if (diff > 0) return <span className="chip bg-danger/15 text-danger">+{diff} ortiqcha</span>
        if (diff < 0) return <span className="chip bg-warn/15 text-warn">{-diff} kam</span>
        return <span className="chip bg-ok/15 text-ok">to'liq</span>
      },
    },
  ]

  const totalHours = lessons.reduce((a, l) => a + l.hoursPerWeek, 0)

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <Calculator size={20} />
        </div>
        <h1 className="text-lg font-bold">Tarifikatsiya</h1>
        <span className="ml-2 text-sm text-muted">O'qituvchilar yuklamasi</span>
      </div>

      <div className={cx('grid grid-cols-2 gap-3 sm:grid-cols-4')}>
        <StatCard label="O'qituvchilar" value={teachers.length} />
        <StatCard label="Jami darslar" value={lessons.length} />
        <StatCard label="Jami soat/hafta" value={totalHours} />
        <StatCard label="Sinflar" value={classes.length} />
      </div>

      <div className="min-h-0 flex-1">
        <Table
          columns={columns}
          rows={teachers}
          getId={(r) => r.id}
          empty={"O'qituvchilar yo'q."}
          footer={<span>Jami: <b className="text-ink">{teachers.length}</b> o'qituvchi</span>}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}
