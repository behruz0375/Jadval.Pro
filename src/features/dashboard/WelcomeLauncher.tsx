import { FilePlus2, FolderOpen, ArrowRightCircle, KeyRound, X } from 'lucide-react'
import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { confirmAsync } from '@/store/confirm'
import { openProjectFromFile } from '@/io/projectFile'
import { useT } from '@/i18n'
import type { LucideIcon } from 'lucide-react'

export function WelcomeLauncher({ onClose }: { onClose: () => void }) {
  const project = useProject((s) => s.project)
  const newProject = useProject((s) => s.newProject)
  const setProject = useProject((s) => s.setProject)
  const setActivePanel = useUI((s) => s.setActivePanel)
  const role = useAuth((s) => s.role)
  const toast = useToast()
  const t = useT()

  const hasData = project.classes.length > 0 || project.lessons.length > 0

  const doNew = async () => {
    if (hasData) {
      const ok = await confirmAsync({
        title: t('Yangi jadval'),
        message: t("Yangi jadval? Joriy ma'lumotlar o'rniga bo'sh loyiha ochiladi."),
        confirmText: t('Ha, yangi'),
        tone: 'danger',
      })
      if (!ok) return
    }
    newProject()
    // Yangi loyiha boshlangandan keyin — Maktab sozlamalariga olib boramiz,
    // chunki birinchi qadam shu (maktab nomi + ish kunlari). Bu bosh menyu'dan
    // chalkashroq, lekin "nega hech narsa o'zgarmadi" degan savolni oldini oladi.
    setActivePanel('school')
    toast.success(t('Yangi loyiha yaratildi — avval maktab ma\'lumotlarini kiriting'))
    onClose()
  }
  const doOpen = async () => {
    try {
      const p = await openProjectFromFile()
      if (!p) return
      setProject(p)
      setActivePanel('dashboard')
      toast.success(t('Loyiha ochildi'))
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const doLicense = () => {
    setActivePanel(role === 'owner' ? 'owner' : 'license')
    onClose()
  }

  const tiles: { icon: LucideIcon; title: string; desc: string; color: string; onClick: () => void; primary?: boolean }[] = [
    { icon: FilePlus2, title: t('Yangi jadval yaratish'), desc: t("Bo'sh loyihadan boshlash"), color: '#4457d6', onClick: doNew, primary: true },
    { icon: FolderOpen, title: t('Saqlangan jadvalni ochish'), desc: t('.jadval faylni yuklash'), color: '#f97316', onClick: doOpen },
    { icon: ArrowRightCircle, title: t('Oxirgi bilan davom etish'), desc: t('Joriy loyihani davom ettirish'), color: '#22c55e', onClick: onClose },
    { icon: KeyRound, title: role === 'owner' ? t('Boshqaruv paneli') : t("Dastur ma'lumoti"), desc: role === 'owner' ? t('Mijozlar va login/parollar') : t('Dastur va aloqa'), color: '#14b8a6', onClick: doLicense },
  ]

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob animate-floatA h-80 w-80 bg-accent/30" style={{ top: '-4rem', left: '-3rem' }} />
        <div className="blob animate-floatB h-80 w-80" style={{ bottom: '-4rem', right: '-3rem', background: 'rgb(236 72 153 / 0.22)' }} />
      </div>

      <div className="modal-pop relative z-10 w-full max-w-3xl rounded-2xl border border-border bg-surface/90 p-6 shadow-panel backdrop-blur sm:p-8">
        <button onClick={onClose} className="btn btn-ghost absolute right-3 top-3 h-8 w-8 p-0" title={t('Yopish')}>
          <X size={18} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-fg text-2xl font-black shadow-soft">
            J
          </div>
          <div>
            <h1 className="text-xl font-bold">
              JadvalPro — <span className="text-gradient">{t('xush kelibsiz!')}</span>
            </h1>
            <p className="text-sm text-muted">{t('Nimadan boshlaymiz?')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t, i) => {
            const Icon = t.icon
            return (
              <button
                key={t.title}
                onClick={t.onClick}
                className="anim-rise card hover-lift group flex flex-col items-start gap-3 p-5 text-left hover:shadow-panel"
                style={{ animationDelay: `${i * 0.05}s`, borderTop: `3px solid ${t.color}` }}
              >
                <div
                  className="grid h-12 w-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                  style={{ background: `${t.color}22`, color: t.color }}
                >
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="mt-0.5 text-xs text-muted">{t.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
