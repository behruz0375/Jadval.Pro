import { useState } from 'react'
import { LayoutGrid, GraduationCap, Users, ShieldCheck, ArrowRight, ArrowLeft, Send, ShoppingBag, type LucideIcon } from 'lucide-react'
import { OwnerLoginModal } from './AuthScreens'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { BackgroundSlideshow } from '@/components/BackgroundSlideshow'
import { LangSwitcher } from '@/components/LangSwitcher'
import { telegramUrl } from '@/utils'
import { APP_VERSION } from '@/constants'
import { useT } from '@/i18n'
import { useOwnerContact } from '@/store/useOwnerContact'

export type PickRole = 'director' | 'teacher' | 'student'

const ROLES: { role: PickRole; icon: LucideIcon; title: string; text: string; delay: string }[] = [
  {
    role: 'director',
    icon: LayoutGrid,
    title: 'Zavuch',
    text: "Ma'lumot kiritish, dars jadvalini tuzish, o'qituvchi va sinf hisoblarini boshqarish.",
    delay: '0.2s',
  },
  {
    role: 'teacher',
    icon: GraduationCap,
    title: "O'qituvchi",
    text: "O'z dars jadvalini ko'rish — qaysi kun, qaysi sinfda, qaysi xonada.",
    delay: '0.28s',
  },
  {
    role: 'student',
    icon: Users,
    title: "O'quvchi",
    text: "O'z sinfining haftalik dars jadvalini ko'rish.",
    delay: '0.36s',
  },
]

export function ChooseRole({
  onBack,
  onPick,
}: {
  onBack?: () => void
  onPick: (role: PickRole) => void
}) {
  const t = useT()
  const [ownerOpen, setOwnerOpen] = useState(false)
  const ownerContact = useOwnerContact()
  const machineCode = useAuth((s) => s.machineCode)
  const toast = useToast()

  const buyProgram = async () => {
    const msg = `${t('Assalomu alaykum! JadvalPro dasturini sotib olmoqchiman.')}\n${t('Maxsus kod')}: ${machineCode}`
    try {
      await navigator.clipboard.writeText(msg)
      toast.success(t('Xabar nusxalandi — Telegramga joylang'))
    } catch {
      /* ignore */
    }
    const url = telegramUrl(ownerContact.telegram)
    if (!url) {
      toast.error(t("Admin aloqa ma'lumoti kiritilmagan"))
      return
    }
    window.open(url, '_blank')
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg p-4">
      {/* Jadval mavzusidagi orqa fon slideshow (4 ta scena) */}
      <BackgroundSlideshow opacity={0.35} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob animate-floatA h-96 w-96 bg-accent/30" style={{ top: '-6rem', left: '-4rem' }} />
        <div className="blob animate-floatB h-96 w-96" style={{ bottom: '-6rem', right: '-4rem', background: 'rgb(236 72 153 / 0.2)' }} />
        <div className="blob animate-floatC h-72 w-72" style={{ top: '30%', left: '40%', background: 'rgb(16 185 129 / 0.18)' }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          {onBack ? (
            <button onClick={onBack} className="btn btn-ghost hover-lift backdrop-blur">
              <ArrowLeft size={16} /> {t('Orqaga')}
            </button>
          ) : (
            <span />
          )}
          <LangSwitcher />
        </div>

        <div className="mb-8 text-center">
          <div className="anim-rise mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-fg text-3xl font-black shadow-panel">
            J
          </div>
          <h1 className="anim-rise text-3xl font-black sm:text-4xl" style={{ animationDelay: '0.08s' }}>
            {t('Kim sifatida')} <span className="text-gradient">{t('kirasiz?')}</span>
          </h1>
          <p className="anim-rise mt-2 text-muted" style={{ animationDelay: '0.16s' }}>
            {t("Har bir rol o'z logini va paroli bilan kiradi")}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {ROLES.map((r) => {
            const Icon = r.icon
            return (
              <button
                key={r.role}
                onClick={() => onPick(r.role)}
                className="anim-rise card hover-lift group relative overflow-hidden p-6 text-left hover:border-accent/50 hover:shadow-panel"
                style={{ animationDelay: r.delay }}
              >
                <div className="blob animate-floatA h-28 w-28 bg-accent/20" style={{ top: '-1rem', right: '-1rem' }} />
                <div className="relative z-10">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon size={28} />
                  </div>
                  <h2 className="mt-4 text-xl font-bold">{t(r.title)}</h2>
                  <p className="mt-1.5 text-sm text-muted">{t(r.text)}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-semibold text-accent">
                    {t('Kirish')} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Sotib olish / Adminga yozish */}
        {ownerContact.telegram && (
          <div
            className="anim-rise mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface-2/40 to-transparent px-4 py-3 backdrop-blur"
            style={{ animationDelay: '0.42s' }}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <ShoppingBag size={16} className="text-accent" />
              {t('Dasturni sotib olishni istaysizmi?')}
            </span>
            <button
              onClick={buyProgram}
              className="btn hover-lift bg-[#2AABEE] text-white hover:brightness-110"
            >
              <Send size={15} /> {t('Adminga Telegramda yozing')}
            </button>
          </div>
        )}

        <button
          onClick={() => setOwnerOpen(true)}
          className="anim-rise mx-auto mt-6 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-accent"
          style={{ animationDelay: '0.48s' }}
        >
          <ShieldCheck size={15} /> {t('Admin panel')}
        </button>

        <p className="mt-4 text-center text-xs text-muted">{APP_VERSION}</p>
      </div>

      <OwnerLoginModal open={ownerOpen} onClose={() => setOwnerOpen(false)} />
    </div>
  )
}
