import { useState } from 'react'
import {
  Sparkles,
  ShieldCheck,
  Palette,
  Users,
  FileSpreadsheet,
  WifiOff,
  Zap,
  ArrowRight,
  Crown,
  CheckCircle2,
  CalendarRange,
  Clock,
  Send,
  ShoppingBag,
} from 'lucide-react'
import { OwnerLoginModal } from '@/features/auth/AuthScreens'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { telegramUrl } from '@/utils'
import { APP_VERSION } from '@/constants'
import type { LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Zap, title: 'Avtomatik jadval', text: "Yuzlab darsni bir necha soniyada konfliktsiz joylashtiradi — o'qituvchi, sinf va xona to'qnashuvisiz." },
  { icon: ShieldCheck, title: 'Kuchli himoya', text: 'Qurilmaga bog\'langan litsenziya. Nusxa ko\'chirib boshqa kompyuterda ishlatib bo\'lmaydi.' },
  { icon: Users, title: '3 pog\'onali rol', text: "Egasi, Direktor va O'rinbosar (O'TIBDO') uchun alohida panel va huquqlar." },
  { icon: Palette, title: '8 mavzu + sozlamalar', text: 'Qorong\'i rejim, zoom, zichlik, gradient, ranglar — har kim o\'ziga moslaydi.' },
  { icon: FileSpreadsheet, title: 'Excel & PDF eksport', text: "Sinf va o'qituvchi jadvallarini chop etishga tayyor formatda chiqaring." },
  { icon: WifiOff, title: 'Internetsiz ishlaydi', text: "Barcha ma'lumot qurilmada. Offline, tez va maxfiy." },
]

const STATS = [
  { value: '<30s', label: 'Jadval tuziladi' },
  { value: '0', label: 'Konflikt kafolati' },
  { value: '8', label: 'Chiroyli mavzu' },
  { value: '100%', label: 'Offline' },
]

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [ownerOpen, setOwnerOpen] = useState(false)
  const ownerContact = useAuth((s) => s.ownerContact)
  const machineCode = useAuth((s) => s.machineCode)
  const toast = useToast()

  const buyProgram = async () => {
    const msg = `Assalomu alaykum! JadvalPro dasturini sotib olmoqchiman.\nMaxsus kod: ${machineCode}`
    try {
      await navigator.clipboard.writeText(msg)
      toast.success('Xabar nusxalandi — Telegramga joylang')
    } catch { /* ignore */ }
    const url = telegramUrl(ownerContact.telegram)
    if (!url) {
      toast.error("Admin aloqa ma'lumoti kiritilmagan")
      return
    }
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-bg">
      {/* Animatsiyali orqa fon */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob animate-floatA h-80 w-80 bg-accent/40" style={{ top: '-4rem', left: '-3rem' }} />
        <div className="blob animate-floatB h-96 w-96" style={{ top: '20%', right: '-6rem', background: 'rgb(236 72 153 / 0.28)' }} />
        <div className="blob animate-floatC h-72 w-72" style={{ bottom: '-4rem', left: '25%', background: 'rgb(16 185 129 / 0.26)' }} />
        <div className="blob animate-floatA h-64 w-64 bg-accent/30" style={{ bottom: '10%', right: '15%' }} />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg text-xl font-black shadow-soft">
              J
            </div>
            <span className="text-lg font-bold">JadvalPro <span className="text-muted">2026</span></span>
          </div>
          <div className="flex items-center gap-2">
            {ownerContact.telegram && (
              <button
                onClick={buyProgram}
                className="btn hover-lift bg-[#2AABEE] text-white hover:brightness-110"
                title="Dasturni sotib olish — Telegramda admin bilan bog'lanish"
              >
                <ShoppingBag size={15} /> <span className="hidden sm:inline">Sotib olish</span>
                <Send size={14} />
              </button>
            )}
            <button onClick={() => setOwnerOpen(true)} className="btn btn-ghost hover-lift hidden sm:inline-flex">
              <Crown size={16} /> Egasi kirishi
            </button>
            <button onClick={onEnter} className="btn btn-accent hover-lift shadow-soft">
              Kirish <ArrowRight size={16} />
            </button>
          </div>
        </nav>

        {/* Hero */}
        <header className="mx-auto max-w-4xl px-5 pb-10 pt-12 text-center sm:pt-20">
          <div className="anim-rise chip mx-auto mb-5 w-fit border border-border bg-surface/70 px-3 py-1 backdrop-blur" style={{ animationDelay: '0.05s' }}>
            <Sparkles size={13} className="text-accent" /> Maktablar uchun aqlli jadval tuzuvchi
          </div>
          <h1 className="anim-rise text-4xl font-black leading-tight sm:text-6xl" style={{ animationDelay: '0.12s' }}>
            Dars jadvalini <span className="text-gradient">soniyalarda</span> tuzing
          </h1>
          <p className="anim-rise mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg" style={{ animationDelay: '0.2s' }}>
            JadvalPro — o'qituvchi, sinf va xonalar bo'yicha to'qnashuvsiz, SanPiN talablariga mos
            jadvalni avtomatik tuzadi. Qo'lda kunlar ketadigan ishni bir necha daqiqaga qisqartiradi.
          </p>
          <div className="anim-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '0.28s' }}>
            <button onClick={onEnter} className="btn btn-accent hover-lift animate-glow px-6 py-3 text-base shadow-panel">
              Boshlash <ArrowRight size={18} />
            </button>
            <a href="#features" className="btn btn-outline hover-lift px-6 py-3 text-base backdrop-blur">
              Imkoniyatlar
            </a>
          </div>

          {/* Mini stats */}
          <div className="anim-rise mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4" style={{ animationDelay: '0.36s' }}>
            {STATS.map((s) => (
              <div key={s.label} className="card hover-lift bg-surface/70 p-4 backdrop-blur hover:shadow-panel">
                <div className="text-2xl font-black text-accent">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Dekorativ jadval preview */}
        <div className="mx-auto max-w-4xl px-5 pb-6">
          <div className="anim-rise card hover-lift overflow-hidden bg-surface/80 p-4 backdrop-blur hover:shadow-panel" style={{ animationDelay: '0.44s' }}>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted">
              <CalendarRange size={16} className="text-accent" /> Namuna jadval — 5-A sinf
            </div>
            <MiniTimetable />
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Nega aynan JadvalPro?</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted">
            Zamonaviy, tez va xavfsiz — maktab ehtiyojlariga moslangan.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="anim-rise card hover-lift group border-border/70 bg-surface/70 p-6 backdrop-blur hover:border-accent/40 hover:shadow-panel"
                  style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{f.text}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* CTA pasti */}
        <section className="mx-auto max-w-4xl px-5 pb-16">
          <div className="card relative overflow-hidden bg-gradient-to-br from-accent/15 to-surface p-8 text-center sm:p-12">
            <div className="blob animate-floatB h-48 w-48 bg-accent/30" style={{ top: '-2rem', right: '-2rem' }} />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold sm:text-3xl">Bugun jadvalingizni tuzing</h2>
              <ul className="mx-auto mt-5 flex max-w-md flex-col gap-2 text-left text-sm">
                {['Konfliktsiz avtomatik jadval', 'Qurilmaga bog\'langan xavfsiz litsenziya', 'Excel va PDF eksport', 'Internetsiz, tez va maxfiy'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 size={17} className="shrink-0 text-ok" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button onClick={onEnter} className="btn btn-accent hover-lift px-7 py-3 text-base shadow-panel">
                  Dasturga kirish <ArrowRight size={18} />
                </button>
                {ownerContact.telegram && (
                  <button
                    onClick={buyProgram}
                    className="btn hover-lift bg-[#2AABEE] px-7 py-3 text-base text-white shadow-panel hover:brightness-110"
                  >
                    <ShoppingBag size={17} /> Sotib olish <Send size={16} />
                  </button>
                )}
              </div>
              {ownerContact.telegram && (
                <p className="mt-3 text-xs text-muted">
                  Narx va to'lov tartibini admin Telegramda yuboradi
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/60 bg-surface/50 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Clock size={14} /> JadvalPro {APP_VERSION} — Dars jadvali tuzuvchi
            </div>
            <button onClick={() => setOwnerOpen(true)} className="flex items-center gap-1.5 hover:text-ink">
              <Crown size={14} /> Egasi (dastur sotuvchisi) kirishi
            </button>
          </div>
        </footer>
      </div>

      <OwnerLoginModal open={ownerOpen} onClose={() => setOwnerOpen(false)} />
    </div>
  )
}

/** Dekorativ mini jadval */
function MiniTimetable() {
  const days = ['Du', 'Se', 'Ch', 'Pa', 'Ju']
  const cells: { s: string; c: string }[][] = [
    [{ s: 'Mat', c: '#3b82f6' }, { s: 'Ona', c: '#f97316' }, { s: 'Mat', c: '#3b82f6' }, { s: 'Ing', c: '#22c55e' }, { s: 'Fiz', c: '#a855f7' }],
    [{ s: 'Ing', c: '#22c55e' }, { s: 'Mat', c: '#3b82f6' }, { s: 'Bio', c: '#14b8a6' }, { s: 'Ona', c: '#f97316' }, { s: 'Mat', c: '#3b82f6' }],
    [{ s: 'Tar', c: '#eab308' }, { s: 'Fiz', c: '#a855f7' }, { s: 'Ona', c: '#f97316' }, { s: 'Jis', c: '#ef4444' }, { s: 'Ing', c: '#22c55e' }],
    [{ s: 'Bio', c: '#14b8a6' }, { s: 'Inf', c: '#6366f1' }, { s: 'Tar', c: '#eab308' }, { s: 'Mat', c: '#3b82f6' }, { s: 'Ona', c: '#f97316' }],
  ]
  return (
    <div className="grid grid-cols-6 gap-1.5 text-center text-xs">
      <div className="py-1 font-semibold text-muted">#</div>
      {days.map((d) => (
        <div key={d} className="py-1 font-semibold text-muted">{d}</div>
      ))}
      {cells.map((row, ri) => (
        <Row key={ri} n={ri + 1} row={row} delay={ri * 0.06} />
      ))}
    </div>
  )
}

function Row({ n, row, delay }: { n: number; row: { s: string; c: string }[]; delay: number }) {
  return (
    <>
      <div className="grid place-items-center rounded bg-surface-2 py-2 font-bold text-muted">{n}</div>
      {row.map((cell, i) => (
        <div
          key={i}
          className="anim-rise rounded py-2 font-semibold transition-transform duration-200 hover:scale-105"
          style={{
            background: `${cell.c}22`,
            borderLeft: `3px solid ${cell.c}`,
            color: cell.c,
            animationDelay: `${0.5 + delay + i * 0.03}s`,
          }}
        >
          {cell.s}
        </div>
      ))}
    </>
  )
}
