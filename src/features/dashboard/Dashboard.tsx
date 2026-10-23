import {
  Users,
  BookOpen,
  DoorOpen,
  GraduationCap,
  CalendarDays,
  LayoutGrid,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  FileSpreadsheet,
  Upload,
  Save,
} from 'lucide-react'
import { useUI } from '@/store/ui'
import { useProject } from '@/store/project'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { useT } from '@/i18n'
import { saveProjectToFile, openProjectFromFile } from '@/io/projectFile'
import type { LucideIcon } from 'lucide-react'
import { currentVersion } from '@/features/_shared/versions'

export function Dashboard() {
  const setActivePanel = useUI((s) => s.setActivePanel)
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const markSaved = useProject((s) => s.markSaved)
  const role = useAuth((s) => s.role)
  const toast = useToast()
  const t = useT()

  const stats: { id: string; label: string; icon: LucideIcon; value: number; color: string }[] = [
    { id: 'classes', label: 'Sinflar', icon: Users, value: project.classes.length, color: '#3b82f6' },
    { id: 'subjects', label: 'Fanlar', icon: BookOpen, value: project.subjects.length, color: '#f97316' },
    { id: 'rooms', label: 'Xonalar', icon: DoorOpen, value: project.rooms.length, color: '#14b8a6' },
    { id: 'teachers', label: "O'qituvchilar", icon: GraduationCap, value: project.teachers.length, color: '#a855f7' },
    { id: 'lessons', label: 'Darslar', icon: CalendarDays, value: project.lessons.length, color: '#ec4899' },
  ]

  const doSave = () => {
    saveProjectToFile(project)
    markSaved()
    toast.success(t('Loyiha saqlandi'))
  }

  const doOpen = async () => {
    try {
      const p = await openProjectFromFile()
      if (p) {
        setProject(p)
        toast.success(t('Loyiha ochildi'))
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Jadval holati — oxirgi versiya statistikasi
  const latest = currentVersion(project.timetables)
  const totalLessonsRequired = project.lessons.reduce(
    (a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length),
    0,
  )
  // Ma'lumotlar to'liqlik tekshiruvi
  const checks = [
    { label: t('Maktab sozlangan'), ok: !!project.school.name && project.school.workDays > 0 },
    { label: t('Sinflar mavjud'), ok: project.classes.length > 0 },
    { label: t('Fanlar mavjud'), ok: project.subjects.length > 0 },
    { label: t('Xonalar mavjud'), ok: project.rooms.length > 0 },
    { label: t("O'qituvchilar mavjud"), ok: project.teachers.length > 0 },
    { label: t('Darslar biriktirilgan'), ok: project.lessons.length > 0 },
    { label: t('Jadval tuzilgan'), ok: project.timetables.length > 0 },
  ]
  const okCount = checks.filter((c) => c.ok).length
  const progress = Math.round((okCount / checks.length) * 100)

  return (
    <div className="fade-in mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-gradient">{t('Bosh sahifa')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {role === 'director'
              ? t('Zavuch paneli — sinflar, o\'qituvchilar va jadval tuzish')
              : t('JadvalPro — maktab dars jadvalini avtomatik tuzuvchi dastur.')}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setActivePanel(s.id)}
              className="card hover-lift group anim-rise relative overflow-hidden p-4 text-left hover:shadow-panel"
              style={{ borderTop: `3px solid ${s.color}`, animationDelay: `${i * 0.06}s` }}
            >
              <div
                className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150"
                style={{ background: s.color }}
              />
              <div
                className="grid h-11 w-11 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                style={{ background: `${s.color}22`, color: s.color }}
              >
                <Icon size={22} />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black tabular-nums">{s.value}</div>
                <div className="text-xs text-muted">{t(s.label)}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Jadval holati */}
      {latest && (
        <div className="card anim-rise mt-6 p-5" style={{ animationDelay: '0.3s' }}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <CalendarRange size={18} className="text-accent" /> {t('Oxirgi jadval holati')}
            </h3>
            <span className="chip">{latest.name}</span>
            <button
              onClick={() => setActivePanel('distribution')}
              className="btn btn-outline ml-auto h-8 text-xs"
            >
              {t('Taqsimot')} <ArrowRight size={13} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatBox
              label={t('Joylashtirilgan')}
              value={`${latest.stats.placed} / ${latest.stats.placed + latest.stats.unplaced}`}
              color={latest.stats.unplaced === 0 ? '#22c55e' : '#eab308'}
              icon={CheckCircle2}
            />
            <StatBox
              label={t("Qat'iy buzilish")}
              value={String(latest.stats.hardViolations)}
              color={latest.stats.hardViolations === 0 ? '#22c55e' : '#ef4444'}
              icon={latest.stats.hardViolations === 0 ? CheckCircle2 : AlertTriangle}
            />
            <StatBox
              label={t('Yumshoq jarima')}
              value={String(latest.stats.softPenalty)}
              color="#6366f1"
              icon={CalendarRange}
            />
            <StatBox
              label={t("O'qituvchi oynalari")}
              value={String(latest.stats.teacherGaps)}
              color={latest.stats.teacherGaps < 5 ? '#22c55e' : '#eab308'}
              icon={GraduationCap}
            />
          </div>
          {totalLessonsRequired > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (latest.stats.placed / totalLessonsRequired) * 100)}%`,
                  background: latest.stats.unplaced === 0 ? '#22c55e' : '#eab308',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Ish tartibi + progress + tezkor amallar */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card anim-rise p-5 lg:col-span-2" style={{ animationDelay: '0.36s' }}>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-semibold">{t('Ish tartibi')}</h3>
            <span className="chip ml-auto">
              {okCount}/{checks.length} ({progress}%)
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.ok ? (
                  <CheckCircle2 size={15} className="shrink-0 text-ok" />
                ) : (
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-[9px] text-muted">
                    •
                  </span>
                )}
                <span className={c.ok ? 'text-ink' : 'text-muted'}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setActivePanel('distribution')}
            className="card hover-lift group anim-rise relative flex flex-1 flex-col items-start justify-between gap-3 overflow-hidden bg-gradient-to-br from-accent/20 to-surface p-5 text-left hover:shadow-panel"
            style={{ animationDelay: '0.42s' }}
          >
            <div
              className="blob animate-floatA h-28 w-28 bg-accent/25"
              style={{ top: '-1rem', right: '-1rem' }}
            />
            <div className="relative z-10 grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-fg shadow-soft transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <LayoutGrid size={24} />
            </div>
            <div className="relative z-10">
              <h3 className="font-semibold">{t('Jadval tuzish')}</h3>
              <p className="mt-1 text-sm text-muted">
                {t("Ma'lumotlar tayyor bo'lsa, avtomatik jadvalni ishga tushiring.")}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                {t('Boshlash')} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </button>

          {/* Tezkor amallar: Saqlash, Ochish, Eksport */}
          <div
            className="card anim-rise grid grid-cols-3 gap-2 p-3"
            style={{ animationDelay: '0.48s' }}
          >
            <button
              onClick={doSave}
              className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              title={t('Loyihani saqlash')}
            >
              <Save size={18} className="text-accent" />
              <span>{t('Saqlash')}</span>
            </button>
            <button
              onClick={doOpen}
              className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              title={t('Loyihani ochish')}
            >
              <Upload size={18} className="text-accent" />
              <span>{t('Ochish')}</span>
            </button>
            <button
              onClick={() => setActivePanel('export')}
              className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              title={t('Eksport')}
            >
              <FileSpreadsheet size={18} className="text-accent" />
              <span>{t('Eksport')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string
  value: string
  color: string
  icon: LucideIcon
}) {
  return (
    <div
      className="rounded-xl border border-border bg-surface-2/40 p-3"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon size={13} style={{ color }} />
        {label}
      </div>
      <div className="mt-1 text-xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
