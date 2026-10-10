import { useState } from 'react'
import { Crown, Check, KeyRound, LogOut, Sparkles } from 'lucide-react'
import { useToast } from '@/store/toast'
import {
  useTier,
  getTierKey,
  getTierExpiresAt,
  activatePro,
  deactivatePro,
  PRO_FEATURES,
} from './tier'
import { ProBadge } from './ProBadge'

export function ProActivationCard() {
  const tier = useTier()
  const toast = useToast()
  const [key, setKey] = useState('')
  const isPro = tier === 'pro'
  const activeKey = getTierKey()
  const expiresAt = getTierExpiresAt()

  const handleActivate = () => {
    if (!key.trim()) {
      toast.error('Kalitni kiriting')
      return
    }
    const res = activatePro(key.trim())
    if (res.ok) {
      toast.success('Pro aktivlashtirildi! Barcha imkoniyatlar ochildi.')
      setKey('')
    } else {
      toast.error(res.message || 'Kalit noto‘g‘ri')
    }
  }

  const handleDeactivate = () => {
    if (!confirm('Pro versiya o‘chirilsinmi? Free versiyaga qaytasiz.')) return
    deactivatePro()
    toast.info('Pro versiya o‘chirildi')
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-amber-300/40 bg-gradient-to-br from-amber-50/80 to-orange-50/80 p-5 dark:border-amber-500/20 dark:from-amber-900/10 dark:to-orange-900/10">
      {/* Dekorativ fon */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
      />

      <div className="relative mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
          <Crown size={20} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100">Pro versiya</h2>
            {isPro && <ProBadge size="sm" />}
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
            {isPro
              ? 'Barcha Pro imkoniyatlar yoqilgan. Rahmat sotib olganingiz uchun!'
              : 'Admin bergan Pro kalit bilan barcha imkoniyatlarni oching.'}
          </p>
        </div>
      </div>

      {isPro ? (
        <>
          <div className="relative mb-3 rounded-lg bg-white/60 p-3 dark:bg-black/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Pro kalit</span>
              <span className="font-mono font-semibold text-amber-900 dark:text-amber-200">
                {activeKey || '—'}
              </span>
            </div>
            {expiresAt && (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted">Muddati</span>
                <span className="font-semibold text-ink">
                  {new Date(expiresAt).toLocaleDateString('uz')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleDeactivate}
            className="btn btn-outline h-8 text-xs text-danger"
          >
            <LogOut size={13} /> Pro'ni o'chirish
          </button>
        </>
      ) : (
        <>
          <div className="relative mb-3">
            <label className="mb-1 block text-xs font-medium text-amber-900 dark:text-amber-200">
              <KeyRound size={11} className="mb-0.5 inline" /> Pro kalit (JPRO-XXXX-XXXX-XXXX)
            </label>
            <div className="flex gap-2">
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="JPRO-XXXX-XXXX-XXXX"
                className="input flex-1 font-mono uppercase"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              />
              <button
                onClick={handleActivate}
                className="btn h-9 bg-gradient-to-r from-amber-500 to-orange-500 px-4 font-semibold text-white hover:from-amber-600 hover:to-orange-600"
              >
                <Check size={14} /> Aktivlash
              </button>
            </div>
          </div>

          <div className="relative rounded-lg bg-white/40 p-3 dark:bg-black/15">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
              <Sparkles size={13} className="text-amber-600" />
              Pro'da qanday imkoniyatlar bor?
            </div>
            <ul className="space-y-1 text-xs text-amber-900/90 dark:text-amber-200/80">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check size={11} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] italic text-amber-800/80 dark:text-amber-200/60">
              Kalit olish uchun — TopBar'dagi "Adminga yozish" tugmasi orqali bog'laning.
            </p>
          </div>
        </>
      )}
    </section>
  )
}
