import { useState, useMemo } from 'react'
import {
  LogOut, GraduationCap, Users, CalendarRange, BookOpen, BarChart3, UserCircle,
  Phone, Calendar, Clock, School, DoorOpen, Printer, TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { useT } from '@/i18n'
import { TimetableGrid } from './TimetableGrid'
import { teacherLoad, classLoad } from '@/features/_shared/compute'
import { cx } from '@/utils'
import type { LucideIcon } from 'lucide-react'
import type { TimetableVersion, Teacher, SchoolClass, Lesson, Subject } from '@/types'

function PortalShell({
  icon: Icon,
  title,
  subtitle,
  tabs,
  activeTab,
  onTab,
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  tabs?: { id: string; label: string; icon: LucideIcon }[]
  activeTab?: string
  onTab?: (id: string) => void
  children: React.ReactNode
}) {
  const t = useT()
  const logout = useAuth((s) => s.logout)
  const toast = useToast()
  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">{title}</div>
          <div className="truncate text-xs text-muted">{subtitle}</div>
        </div>
        <button
          onClick={() => {
            logout()
            toast.info(t('Tizimdan chiqdingiz'))
          }}
          className="btn btn-outline hover-lift h-9 text-danger"
        >
          <LogOut size={16} /> <span className="hidden sm:inline">{t('Chiqish')}</span>
        </button>
      </header>
      {tabs && tabs.length > 0 && (
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface/60 px-2 py-1.5 sm:px-4">
          {tabs.map((tab) => {
            const Ic = tab.icon
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => onTab?.(tab.id)}
                className={cx(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-accent text-accent-fg shadow-sm' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Ic size={15} /> {tab.label}
              </button>
            )
          })}
        </nav>
      )}
      <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">{children}</main>
    </div>
  )
}

function pickVersion(timetables: TimetableVersion[]): TimetableVersion | null {
  return timetables.find((t) => t.name === 'Ishchi jadval') ?? timetables[timetables.length - 1] ?? null
}

function EmptyState() {
  const t = useT()
  return (
    <div className="grid h-full place-items-center text-center text-muted">
      <div>
        <CalendarRange size={42} className="mx-auto mb-2 text-accent/50" />
        <p>{t("Jadval hali tuzilmagan. Zavuch jadvalni tuzgach shu yerda ko'rinadi.")}</p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = '#3b82f6' }: { icon: LucideIcon; label: string; value: string | number; color?: string }) {
  return (
    <div className="card hover-lift p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${color}20`, color }}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted">{label}</div>
          <div className="truncate text-xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  )
}

/* ========== TEACHER PORTAL ========== */

type TeacherTab = 'schedule' | 'classes' | 'subjects' | 'workload' | 'profile'

export function TeacherPortal() {
  const t = useT()
  const linkedId = useAuth((s) => s.linkedId)
  const project = useProject((s) => s.project)
  const teacher = project.teachers.find((tt) => tt.id === linkedId) as Teacher | undefined
  const version = pickVersion(project.timetables)
  const [tab, setTab] = useState<TeacherTab>('schedule')

  // O'qituvchi dars beradigan sinflar
  const myLessons = useMemo(
    () => (teacher ? project.lessons.filter((l) => l.teacher1Id === teacher.id || l.teacher2Id === teacher.id) : []),
    [teacher, project.lessons],
  )
  const mySubjects = useMemo(
    () => Array.from(new Set(myLessons.map((l) => l.subjectId))).map((id) => project.subjects.find((s) => s.id === id)).filter(Boolean) as Subject[],
    [myLessons, project.subjects],
  )
  const myClasses = useMemo(() => {
    const ids = new Set<string>()
    myLessons.forEach((l) => l.classIds.forEach((cid) => ids.add(cid)))
    return Array.from(ids).map((id) => project.classes.find((c) => c.id === id)).filter(Boolean) as SchoolClass[]
  }, [myLessons, project.classes])
  const homeroomClass = useMemo(
    () => (teacher ? project.classes.find((c) => c.classTeacherId === teacher.id) : undefined),
    [teacher, project.classes],
  )
  const totalHours = teacher ? teacherLoad(teacher.id, project.lessons) : 0
  const todayDay = (new Date().getDay() + 6) % 7 // Du=0..Ya=6
  const todayLessons = useMemo(() => {
    if (!version || !teacher) return []
    return version.entries
      .filter((e) => (e.teacherId === teacher.id || e.teacher2Id === teacher.id) && e.day === todayDay)
      .sort((a, b) => a.slot - b.slot)
  }, [version, teacher, todayDay])

  const tabs = [
    { id: 'schedule' as const, label: t('Jadval'), icon: CalendarRange },
    { id: 'classes' as const, label: t('Sinflarim'), icon: Users },
    { id: 'subjects' as const, label: t('Fanlarim'), icon: BookOpen },
    { id: 'workload' as const, label: t('Yuklamam'), icon: BarChart3 },
    { id: 'profile' as const, label: t('Ma\'lumotlarim'), icon: UserCircle },
  ]

  if (!teacher) {
    return (
      <PortalShell icon={GraduationCap} title={t("O'qituvchi")} subtitle={t('Mening dars jadvalim')}>
        <EmptyState />
      </PortalShell>
    )
  }

  return (
    <PortalShell
      icon={GraduationCap}
      title={teacher.fullName}
      subtitle={`${t('Mening dars jadvalim')} · ${totalHours} ${t('soat')}/${t('hafta')}`}
      tabs={tabs}
      activeTab={tab}
      onTab={(id) => setTab(id as TeacherTab)}
    >
      {tab === 'schedule' && (
        version ? (
          <div className="mx-auto max-w-5xl">
            {todayLessons.length > 0 && (
              <div className="card mb-4 border-accent/30 bg-accent/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
                  <Calendar size={16} /> {t('Bugungi darslar')} ({todayLessons.length} {t('ta')})
                </div>
                <div className="flex flex-wrap gap-2">
                  {todayLessons.map((e) => {
                    const lesson = project.lessons.find((l) => l.id === e.lessonId)
                    const sub = project.subjects.find((s) => s.id === lesson?.subjectId)
                    const cls = project.classes.find((c) => c.id === e.classId)
                    const slot = project.school.lessonTimes.find((lt) => lt.index === e.slot)
                    return (
                      <div key={e.id} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
                        <span className="font-semibold" style={{ color: sub?.color }}>{sub?.short}</span>
                        <span className="text-muted"> · {cls?.name}</span>
                        {slot && <span className="ml-1 text-xs text-muted">({slot.start})</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <TimetableGrid version={version} mode="teacher" entityId={teacher.id} />
          </div>
        ) : <EmptyState />
      )}

      {tab === 'classes' && (
        <div className="mx-auto max-w-4xl">
          {homeroomClass && (
            <div className="card mb-4 border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-fg">
                  <School size={22} />
                </div>
                <div>
                  <div className="text-xs text-muted">{t('Siz sinf rahbarisiz')}</div>
                  <div className="text-lg font-bold">{homeroomClass.name} {t('sinfi')}</div>
                </div>
              </div>
            </div>
          )}
          <h2 className="mb-3 text-sm font-semibold text-muted">{t('Dars beradigan sinflar')} ({myClasses.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myClasses.map((c) => {
              const hrs = myLessons
                .filter((l) => l.classIds.includes(c.id))
                .reduce((a, l) => a + l.hoursPerWeek, 0)
              const subs = Array.from(new Set(myLessons.filter((l) => l.classIds.includes(c.id)).map((l) => project.subjects.find((s) => s.id === l.subjectId)?.short).filter(Boolean)))
              return (
                <div key={c.id} className="card hover-lift p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">{c.name}</div>
                    <div className="chip bg-accent/10 text-xs text-accent">{hrs} {t('soat')}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted">{c.studentCount} {t('o\'quvchi')} · {c.shiftIndex}-{t('navbat')}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {subs.map((s) => <span key={s} className="chip bg-surface-2 text-xs">{s}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-sm font-semibold text-muted">{t('O\'qitadigan fanlar')} ({mySubjects.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mySubjects.map((s) => {
              const hrs = myLessons.filter((l) => l.subjectId === s.id).reduce((a, l) => a + l.hoursPerWeek, 0)
              const classesForSub = Array.from(new Set(myLessons.filter((l) => l.subjectId === s.id).flatMap((l) => l.classIds)))
                .map((id) => project.classes.find((c) => c.id === id)?.name).filter(Boolean)
              return (
                <div key={s.id} className="card hover-lift p-4" style={{ borderLeft: `4px solid ${s.color}` }}>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold" style={{ color: s.color }}>{s.name}</div>
                    <div className="chip text-xs" style={{ background: `${s.color}20`, color: s.color }}>{hrs} {t('soat')}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {classesForSub.map((cn) => <span key={cn} className="chip bg-surface-2 text-xs">{cn}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'workload' && (
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Clock} label={t('Haftalik soat')} value={totalHours} color="#3b82f6" />
            <StatCard icon={Users} label={t('Sinflar')} value={myClasses.length} color="#22c55e" />
            <StatCard icon={BookOpen} label={t('Fanlar')} value={mySubjects.length} color="#a855f7" />
            <StatCard icon={CalendarRange} label={t('Darslar soni')} value={myLessons.length} color="#f97316" />
          </div>

          <div className="card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={16} className="text-accent" /> {t('Fan bo\'yicha yuklama')}
            </h3>
            <div className="space-y-2">
              {mySubjects.map((s) => {
                const hrs = myLessons.filter((l) => l.subjectId === s.id).reduce((a, l) => a + l.hoursPerWeek, 0)
                const pct = totalHours > 0 ? (hrs / totalHours) * 100 : 0
                return (
                  <div key={s.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted">{hrs} {t('soat')} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users size={16} className="text-accent" /> {t('Sinf bo\'yicha yuklama')}
            </h3>
            <div className="space-y-2">
              {myClasses.map((c) => {
                const hrs = myLessons.filter((l) => l.classIds.includes(c.id)).reduce((a, l) => a + l.hoursPerWeek, 0)
                const pct = totalHours > 0 ? (hrs / totalHours) * 100 : 0
                return (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted">{hrs} {t('soat')} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-black text-white"
                style={{ background: teacher.color || '#3b82f6' }}
              >
                {teacher.short?.[0] ?? teacher.fullName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-bold">{teacher.fullName}</div>
                <div className="text-sm text-muted">{teacher.short}</div>
              </div>
            </div>
          </div>

          <div className="card divide-y divide-border p-0">
            {teacher.phone && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone size={16} className="text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">{t('Telefon')}</div>
                  <div className="font-medium">{teacher.phone}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3">
              <Clock size={16} className="text-muted" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">{t('Kunlik limit')}</div>
                <div className="font-medium">{teacher.dailyCapacity} {t('soat')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar size={16} className="text-muted" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">{t('Haftalik limit')}</div>
                <div className="font-medium">{teacher.weeklyMax} {t('soat')}</div>
              </div>
            </div>
            {teacher.methodicalDays.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar size={16} className="text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">{t('Uslubiy kun')}</div>
                  <div className="font-medium">{teacher.methodicalDays.map((d) => ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'][d]).join(', ')}</div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => window.print()} className="btn btn-outline hover-lift w-full">
            <Printer size={16} /> {t('Chop etish')}
          </button>
        </div>
      )}
    </PortalShell>
  )
}

/* ========== STUDENT PORTAL ========== */

type StudentTab = 'schedule' | 'teachers' | 'subjects' | 'info'

export function StudentPortal() {
  const t = useT()
  const linkedId = useAuth((s) => s.linkedId)
  const project = useProject((s) => s.project)
  const cls = project.classes.find((c) => c.id === linkedId) as SchoolClass | undefined
  const version = pickVersion(project.timetables)
  const [tab, setTab] = useState<StudentTab>('schedule')

  const classLessons: Lesson[] = useMemo(
    () => (cls ? project.lessons.filter((l) => l.classIds.includes(cls.id)) : []),
    [cls, project.lessons],
  )
  const classSubjects = useMemo(
    () => Array.from(new Set(classLessons.map((l) => l.subjectId))).map((id) => project.subjects.find((s) => s.id === id)).filter(Boolean) as Subject[],
    [classLessons, project.subjects],
  )
  const classTeachers = useMemo(() => {
    const ids = new Set<string>()
    classLessons.forEach((l) => { if (l.teacher1Id) ids.add(l.teacher1Id); if (l.teacher2Id) ids.add(l.teacher2Id!) })
    return Array.from(ids).map((id) => project.teachers.find((t) => t.id === id)).filter(Boolean) as Teacher[]
  }, [classLessons, project.teachers])
  const homeroomTeacher = cls?.classTeacherId ? project.teachers.find((t) => t.id === cls.classTeacherId) : undefined
  const totalHours = cls ? classLoad(cls.id, project.lessons) : 0

  const todayDay = (new Date().getDay() + 6) % 7
  const todayLessons = useMemo(() => {
    if (!version || !cls) return []
    return version.entries.filter((e) => e.classId === cls.id && e.day === todayDay).sort((a, b) => a.slot - b.slot)
  }, [version, cls, todayDay])

  const tabs = [
    { id: 'schedule' as const, label: t('Jadval'), icon: CalendarRange },
    { id: 'teachers' as const, label: t("O'qituvchilarim"), icon: GraduationCap },
    { id: 'subjects' as const, label: t('Fanlarim'), icon: BookOpen },
    { id: 'info' as const, label: t('Sinf haqida'), icon: UserCircle },
  ]

  if (!cls) {
    return (
      <PortalShell icon={Users} title={t("O'quvchi")} subtitle={t('Sinf dars jadvali')}>
        <EmptyState />
      </PortalShell>
    )
  }

  return (
    <PortalShell
      icon={Users}
      title={`${cls.name} ${t('sinfi')}`}
      subtitle={`${t('Sinf dars jadvali')} · ${totalHours} ${t('soat')}/${t('hafta')}`}
      tabs={tabs}
      activeTab={tab}
      onTab={(id) => setTab(id as StudentTab)}
    >
      {tab === 'schedule' && (
        version ? (
          <div className="mx-auto max-w-5xl">
            {todayLessons.length > 0 && (
              <div className="card mb-4 border-accent/30 bg-accent/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
                  <Calendar size={16} /> {t('Bugungi darslar')} ({todayLessons.length} {t('ta')})
                </div>
                <div className="flex flex-wrap gap-2">
                  {todayLessons.map((e) => {
                    const lesson = project.lessons.find((l) => l.id === e.lessonId)
                    const sub = project.subjects.find((s) => s.id === lesson?.subjectId)
                    const slot = project.school.lessonTimes.find((lt) => lt.index === e.slot)
                    return (
                      <div key={e.id} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
                        <span className="font-semibold" style={{ color: sub?.color }}>{sub?.short}</span>
                        {slot && <span className="ml-1 text-xs text-muted">({slot.start})</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <TimetableGrid version={version} mode="class" entityId={cls.id} />
          </div>
        ) : <EmptyState />
      )}

      {tab === 'teachers' && (
        <div className="mx-auto max-w-4xl">
          {homeroomTeacher && (
            <div className="card mb-4 border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl text-xl font-black text-white" style={{ background: homeroomTeacher.color || '#3b82f6' }}>
                  {homeroomTeacher.short?.[0] ?? homeroomTeacher.fullName[0]}
                </div>
                <div>
                  <div className="text-xs text-muted">{t('Sinf rahbari')}</div>
                  <div className="text-lg font-bold">{homeroomTeacher.fullName}</div>
                  {homeroomTeacher.phone && <div className="text-xs text-muted">{homeroomTeacher.phone}</div>}
                </div>
              </div>
            </div>
          )}
          <h2 className="mb-3 text-sm font-semibold text-muted">{t('Barcha o\'qituvchilar')} ({classTeachers.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classTeachers.map((tc) => {
              const subs = Array.from(new Set(classLessons.filter((l) => l.teacher1Id === tc.id || l.teacher2Id === tc.id).map((l) => project.subjects.find((s) => s.id === l.subjectId)?.short).filter(Boolean)))
              return (
                <div key={tc.id} className="card hover-lift p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: tc.color || '#3b82f6' }}>
                      {tc.short?.[0] ?? tc.fullName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{tc.fullName}</div>
                      {tc.phone && <div className="truncate text-xs text-muted">{tc.phone}</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {subs.map((s) => <span key={s} className="chip bg-surface-2 text-xs">{s}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-sm font-semibold text-muted">{t('O\'quv fanlari')} ({classSubjects.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classSubjects.map((s) => {
              const hrs = classLessons.filter((l) => l.subjectId === s.id).reduce((a, l) => a + l.hoursPerWeek, 0)
              const teacher = classLessons.find((l) => l.subjectId === s.id)?.teacher1Id
              const tName = teacher ? project.teachers.find((t) => t.id === teacher)?.short : null
              return (
                <div key={s.id} className="card hover-lift p-4" style={{ borderLeft: `4px solid ${s.color}` }}>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold" style={{ color: s.color }}>{s.name}</div>
                    <div className="chip text-xs" style={{ background: `${s.color}20`, color: s.color }}>{hrs} {t('soat')}</div>
                  </div>
                  {tName && <div className="mt-2 text-xs text-muted">{t('O\'qituvchi')}: {tName}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'info' && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard icon={Users} label={t("O'quvchilar soni")} value={cls.studentCount} color="#22c55e" />
            <StatCard icon={Clock} label={t('Haftalik soat')} value={totalHours} color="#3b82f6" />
            <StatCard icon={BookOpen} label={t('Fanlar')} value={classSubjects.length} color="#a855f7" />
            <StatCard icon={GraduationCap} label={t("O'qituvchilar")} value={classTeachers.length} color="#f97316" />
          </div>

          <div className="card divide-y divide-border p-0">
            <div className="flex items-center gap-3 px-4 py-3">
              <School size={16} className="text-muted" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">{t('Sinf nomi')}</div>
                <div className="font-medium">{cls.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar size={16} className="text-muted" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">{t('Navbat')}</div>
                <div className="font-medium">{cls.shiftIndex}-{t('navbat')}</div>
              </div>
            </div>
            {cls.building && (
              <div className="flex items-center gap-3 px-4 py-3">
                <DoorOpen size={16} className="text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">{t('Bino')}</div>
                  <div className="font-medium">{cls.building}</div>
                </div>
              </div>
            )}
            {homeroomTeacher && (
              <div className="flex items-center gap-3 px-4 py-3">
                <GraduationCap size={16} className="text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">{t('Sinf rahbari')}</div>
                  <div className="font-medium">{homeroomTeacher.fullName}</div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => window.print()} className="btn btn-outline hover-lift w-full">
            <Printer size={16} /> {t('Chop etish')}
          </button>
        </div>
      )}
    </PortalShell>
  )
}
