import { useState } from 'react'
import { AlertTriangle, Trash2, Eraser, RotateCcw } from 'lucide-react'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { useT } from '@/i18n'
import { Modal } from '@/components/Modal'
import { defaultProject } from '@/data/factories'
import type { Project } from '@/types'

type Action = 'timetables' | 'project' | 'all'

export function DangerZoneCard() {
  const t = useT()
  const toast = useToast()
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const newProject = useProject((s) => s.newProject)
  const [confirming, setConfirming] = useState<Action | null>(null)
  const [typedConfirm, setTypedConfirm] = useState('')

  const actions: {
    id: Action
    icon: typeof Trash2
    title: string
    desc: string
    counts: () => string
    danger: 'low' | 'mid' | 'high'
  }[] = [
    {
      id: 'timetables',
      icon: Eraser,
      title: t('Faqat tuzilgan jadvallarni tozalash'),
      desc: t("Barcha versiyalar va 'Ishchi jadval' o'chadi. Sinflar, o'qituvchilar, darslar — qoladi."),
      counts: () => `${project.timetables.length} ${t('ta jadval')}`,
      danger: 'low',
    },
    {
      id: 'project',
      icon: Trash2,
      title: t('Butun loyiha ma’lumotlarini tozalash'),
      desc: t('Sinflar, fanlar, o‘qituvchilar, xonalar, darslar, jadvallar — hammasi o‘chadi. Sozlamalar va hisob — qoladi.'),
      counts: () => {
        const n = project.classes.length + project.subjects.length + project.teachers.length +
          project.rooms.length + project.lessons.length + project.timetables.length
        return `${n} ${t('ta yozuv')}`
      },
      danger: 'mid',
    },
    {
      id: 'all',
      icon: RotateCcw,
      title: t('Standart holatga qaytarish'),
      desc: t('Loyiha boshidan yangi — namuna ma’lumotlarsiz, bo‘sh.'),
      counts: () => t('Hammasi'),
      danger: 'high',
    },
  ]

  const confirmText =
    confirming === 'timetables' ? 'JADVAL'
    : confirming === 'project' ? 'TOZALA'
    : confirming === 'all' ? 'HAMMASI'
    : ''

  const perform = () => {
    if (!confirming) return
    if (typedConfirm.trim().toUpperCase() !== confirmText) {
      toast.error(t('Tasdiqlash so\'zi noto\'g\'ri'))
      return
    }
    if (confirming === 'timetables') {
      const next: Project = { ...project, timetables: [] }
      setProject(next)
      toast.success(t('Barcha jadvallar o\'chirildi'))
    } else if (confirming === 'project') {
      const base = defaultProject()
      const next: Project = {
        ...project,
        classes: [],
        subjects: [],
        teachers: [],
        rooms: [],
        lessons: [],
        timetables: [],
        // Maktab asosi va sozlamalar qoladi
        school: project.school,
        settings: project.settings,
        meta: base.meta,
      }
      setProject(next)
      toast.success(t('Loyiha ma\'lumotlari o\'chirildi'))
    } else if (confirming === 'all') {
      newProject()
      toast.success(t('Standart holatga qaytarildi'))
    }
    setConfirming(null)
    setTypedConfirm('')
  }

  const dangerClass = (level: 'low' | 'mid' | 'high') =>
    level === 'high'
      ? 'border-danger/40 bg-danger/5 text-danger'
      : level === 'mid'
        ? 'border-warn/40 bg-warn/5 text-warn'
        : 'border-border bg-surface-2 text-ink'

  return (
    <section className="card border-danger/30 p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-danger/15 text-danger">
          <AlertTriangle size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{t('Ma\'lumotlarni tozalash')}</h2>
          <p className="text-xs text-muted">
            {t('Diqqat: bu amallarni bekor qilib bo\'lmaydi. Avval loyihani saqlab oling.')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.id}
              onClick={() => { setConfirming(a.id); setTypedConfirm('') }}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:brightness-95 ${dangerClass(a.danger)}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{a.title}</span>
                  <span className="text-[11px] opacity-70">{a.counts()}</span>
                </div>
                <p className="mt-0.5 text-xs opacity-80">{a.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      <Modal
        open={!!confirming}
        title={t('O\'chirishni tasdiqlang')}
        onClose={() => { setConfirming(null); setTypedConfirm('') }}
        width="max-w-md"
        footer={
          <>
            <button onClick={() => { setConfirming(null); setTypedConfirm('') }} className="btn btn-outline">
              {t('Bekor qilish')}
            </button>
            <button onClick={perform} className="btn btn-danger">
              <Trash2 size={14} /> {t('O\'chirish')}
            </button>
          </>
        }
      >
        {confirming && (
          <>
            <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
              <AlertTriangle size={16} className="mb-1 inline" />{' '}
              <b>
                {confirming === 'all'
                  ? t('Butun loyiha standart holatga qaytariladi!')
                  : confirming === 'project'
                    ? t('Barcha sinf, fan, o\'qituvchi, xona, dars va jadvallar o\'chadi!')
                    : t('Barcha tuzilgan jadvallar o\'chadi!')}
              </b>
              <p className="mt-1 text-xs">{t('Bu amalni bekor qilib bo\'lmaydi.')}</p>
            </div>
            <p className="mt-3 text-sm">
              {t('Tasdiqlash uchun quyida yozing:')}{' '}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono font-bold">{confirmText}</code>
            </p>
            <input
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              className="input mt-2 w-full font-mono uppercase"
              placeholder={confirmText}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && perform()}
            />
          </>
        )}
      </Modal>
    </section>
  )
}
