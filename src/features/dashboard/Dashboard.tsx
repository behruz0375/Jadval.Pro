import { Users, BookOpen, DoorOpen, GraduationCap, CalendarDays, LayoutGrid, Sparkles, ArrowRight } from 'lucide-react'
import { useUI } from '@/store/ui'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { buildDemoProject } from '@/data/seed'
import { useT } from '@/i18n'
import type { LucideIcon } from 'lucide-react'

export function Dashboard() {
  const setActivePanel = useUI((s) => s.setActivePanel)
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const toast = useToast()
  const t = useT()

  const stats: { id: string; label: string; icon: LucideIcon; value: number; color: string }[] = [
    { id: 'classes', label: 'Sinflar', icon: Users, value: project.classes.length, color: '#3b82f6' },
    { id: 'subjects', label: 'Fanlar', icon: BookOpen, value: project.subjects.length, color: '#f97316' },
    { id: 'rooms', label: 'Xonalar', icon: DoorOpen, value: project.rooms.length, color: '#14b8a6' },
    { id: 'teachers', label: "O'qituvchilar", icon: GraduationCap, value: project.teachers.length, color: '#a855f7' },
    { id: 'lessons', label: 'Darslar', icon: CalendarDays, value: project.lessons.length, color: '#ec4899' },
  ]

  const loadDemo = () => {
    setProject(buildDemoProject())
    toast.success("Namuna ma'lumotlar yuklandi")
  }

  return (
    <div className="fade-in mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-gradient">{t('Bosh sahifa')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">{t('JadvalPro — maktab dars jadvalini avtomatik tuzuvchi dastur.')}</p>
        </div>
        <button onClick={loadDemo} className="btn btn-outline hover-lift">
          <Sparkles size={16} /> {t("Namuna ma'lumot yuklash")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setActivePanel(s.id)}
              className="card hover-lift group anim-rise relative overflow-hidden p-4 text-left hover:shadow-panel"
              style={{ borderTop: `3px solid ${s.color}`, animationDelay: `${i * 0.06}s` }}
            >
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150" style={{ background: s.color }} />
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

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card anim-rise p-5 lg:col-span-2" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-semibold">{t('Ish tartibi')}</h3>
          <ol className="mt-3 space-y-2 text-sm text-muted">
            <li>1. <b className="text-ink">Maktab</b> — muassasa, dars vaqtlari va navbatlarni sozlang.</li>
            <li>2. <b className="text-ink">Sinflar, Fanlar, Xonalar, O'qituvchilar</b> ro'yxatini kiriting.</li>
            <li>3. <b className="text-ink">Darslar / O'quv reja</b> — kim qaysi sinfga nechta soat.</li>
            <li>4. <b className="text-ink">Taqsimot</b> — jadvalni avtomatik tuzing.</li>
            <li>5. <b className="text-ink">Eksport</b> — Excel yoki PDF ga chiqaring.</li>
          </ol>
        </div>
        <button
          onClick={() => setActivePanel('distribution')}
          className="card hover-lift group anim-rise relative flex flex-col items-start justify-between gap-4 overflow-hidden bg-gradient-to-br from-accent/20 to-surface p-5 text-left hover:shadow-panel"
          style={{ animationDelay: '0.36s' }}
        >
          <div className="blob animate-floatA h-28 w-28 bg-accent/25" style={{ top: '-1rem', right: '-1rem' }} />
          <div className="relative z-10 grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-fg shadow-soft transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
            <LayoutGrid size={24} />
          </div>
          <div className="relative z-10">
            <h3 className="font-semibold">{t('Jadval tuzish')}</h3>
            <p className="mt-1 text-sm text-muted">{t("Ma'lumotlar tayyor bo'lsa, avtomatik jadvalni ishga tushiring.")}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              {t('Boshlash')} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
