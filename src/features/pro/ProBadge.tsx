import { Crown, Sparkles } from 'lucide-react'
import { cx } from '@/utils'

/** Pro badge — "PRO" belgisi, oltin aksent bilan. Pro foydalanuvchilar uchun. */
export function ProBadge({ size = 'sm', animated = true, label = 'PRO' }: {
  size?: 'xs' | 'sm' | 'md'
  animated?: boolean
  label?: string
}) {
  const sizeClass =
    size === 'xs' ? 'text-[9px] px-1 py-0 h-4 gap-0.5' :
    size === 'md' ? 'text-xs px-2 py-1 gap-1' :
    'text-[10px] px-1.5 py-0.5 h-5 gap-0.5'
  const iconSize = size === 'xs' ? 9 : size === 'md' ? 14 : 11
  return (
    <span
      className={cx(
        'pro-badge inline-flex items-center rounded-md font-black uppercase tracking-wider',
        animated && 'pro-badge-shine',
        sizeClass,
      )}
      style={{
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b 50%, #d97706)',
        color: '#fff',
        boxShadow: '0 1px 2px rgba(217, 119, 6, 0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
      }}
    >
      <Crown size={iconSize} className="shrink-0" strokeWidth={2.5} />
      {label}
    </span>
  )
}

/** "Pro bo'lmasa" blok — upgrade qiling tugmasi */
export function ProLockOverlay({
  feature,
  onUpgradeClick,
}: {
  feature: string
  onUpgradeClick?: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-300/50 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-500/30 dark:from-amber-900/20 dark:to-orange-900/20">
      <div className="absolute right-3 top-3">
        <ProBadge size="sm" />
      </div>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
            {feature} — Pro imkoniyat
          </h3>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/70">
            Bu funksiya Pro versiyada ochiq. Admin sizga Pro kalit yuborgan bo'lsa — Sozlamalarda kiritishingiz mumkin.
          </p>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="mt-2 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Sozlamalar → Pro aktivatsiya
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
