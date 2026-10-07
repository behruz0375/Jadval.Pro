import { FilePlus2, FolderOpen, ArrowRightCircle, Sparkles, KeyRound, X } from 'lucide-react'
import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { buildDemoProject } from '@/data/seed'
import { openProjectFromFile } from '@/io/projectFile'
import type { LucideIcon } from 'lucide-react'

export function WelcomeLauncher({ onClose }: { onClose: () => void }) {
  const project = useProject((s) => s.project)
  const newProject = useProject((s) => s.newProject)
  const setProject = useProject((s) => s.setProject)
  const setActivePanel = useUI((s) => s.setActivePanel)
  const role = useAuth((s) => s.role)
  const toast = useToast()

  const hasData = project.classes.length > 0 || project.lessons.length > 0

  const doNew = () => {
    if (hasData && !window.confirm("Yangi jadval? Joriy ma'lumotlar o'rniga bo'sh loyiha ochiladi.")) return
    newProject()
    toast.success('Yangi loyiha yaratildi')
    onClose()
  }
  const doOpen = async () => {
    try {
      const p = await openProjectFromFile()
      if (!p) return
      setProject(p)
      toast.success('Loyiha ochildi')
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const doDemo = () => {
    newProject()
    setProject(buildDemoProject())
    toast.success("Namuna ma'lumotlar yuklandi")
    onClose()
  }
  const doLicense = () => {
    setActivePanel(role === 'owner' ? 'owner' : 'license')
    onClose()
  }

  const tiles: { icon: LucideIcon; title: string; desc: string; color: string; onClick: () => void; primary?: boolean }[] = [
    { icon: FilePlus2, title: 'Yangi jadval yaratish', desc: "Bo'sh loyihadan boshlash", color: '#4457d6', onClick: doNew, primary: true },
    { icon: FolderOpen, title: 'Saqlangan jadvalni ochish', desc: '.jadval faylni yuklash', color: '#f97316', onClick: doOpen },
    { icon: ArrowRightCircle, title: 'Oxirgi bilan davom etish', desc: 'Joriy loyihani davom ettirish', color: '#22c55e', onClick: onClose },
    { icon: Sparkles, title: "Namuna ma'lumot", desc: 'Sinov uchun tayyor maktab', color: '#a855f7', onClick: doDemo },
    { icon: KeyRound, title: role === 'owner' ? 'Boshqaruv paneli' : "Dastur ma'lumoti", desc: role === 'owner' ? 'Mijozlar va login/parollar' : 'Dastur va aloqa', color: '#14b8a6', onClick: doLicense },
  ]

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob animate-floatA h-80 w-80 bg-accent/30" style={{ top: '-4rem', left: '-3rem' }} />
        <div className="blob animate-floatB h-80 w-80" style={{ bottom: '-4rem', right: '-3rem', background: 'rgb(236 72 153 / 0.22)' }} />
      </div>

      <div className="modal-pop relative z-10 w-full max-w-3xl rounded-2xl border border-border bg-surface/90 p-6 shadow-panel backdrop-blur sm:p-8">
        <button onClick={onClose} className="btn btn-ghost absolute right-3 top-3 h-8 w-8 p-0" title="Yopish">
          <X size={18} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-fg text-2xl font-black shadow-soft">
            J
          </div>
          <div>
            <h1 className="text-xl font-bold">
              JadvalPro — <span className="text-gradient">xush kelibsiz!</span>
            </h1>
            <p className="text-sm text-muted">Nimadan boshlaymiz?</p>
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
