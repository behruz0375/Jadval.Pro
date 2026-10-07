import { LogOut, GraduationCap, Users, CalendarRange } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { useT } from '@/i18n'
import { TimetableGrid } from './TimetableGrid'
import type { LucideIcon } from 'lucide-react'
import type { TimetableVersion } from '@/types'

function PortalShell({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const t = useT()
  const logout = useAuth((s) => s.logout)
  const toast = useToast()
  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">{title}</div>
          <div className="truncate text-xs text-muted">{subtitle}</div>
        </div>
        <button
          onClick={() => {
            logout()
            toast.info(t('Tizimdan chiqdingiz'))
          }}
          className="btn btn-outline hover-lift ml-auto h-9 text-danger"
        >
          <LogOut size={16} /> {t('Chiqish')}
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-4">{children}</main>
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

export function TeacherPortal() {
  const t = useT()
  const linkedId = useAuth((s) => s.linkedId)
  const project = useProject((s) => s.project)
  const teacher = project.teachers.find((tt) => tt.id === linkedId)
  const version = pickVersion(project.timetables)

  return (
    <PortalShell icon={GraduationCap} title={teacher?.fullName ?? t("O'qituvchi")} subtitle={t('Mening dars jadvalim')}>
      {version && teacher ? (
        <div className="mx-auto max-w-4xl">
          <TimetableGrid version={version} mode="teacher" entityId={teacher.id} />
        </div>
      ) : (
        <EmptyState />
      )}
    </PortalShell>
  )
}

export function StudentPortal() {
  const t = useT()
  const linkedId = useAuth((s) => s.linkedId)
  const project = useProject((s) => s.project)
  const cls = project.classes.find((c) => c.id === linkedId)
  const version = pickVersion(project.timetables)

  return (
    <PortalShell icon={Users} title={cls ? `${cls.name} ${t('sinfi')}` : t("O'quvchi")} subtitle={t('Sinf dars jadvali')}>
      {version && cls ? (
        <div className="mx-auto max-w-4xl">
          <TimetableGrid version={version} mode="class" entityId={cls.id} />
        </div>
      ) : (
        <EmptyState />
      )}
    </PortalShell>
  )
}
