import { Languages } from 'lucide-react'
import { useLang, LANGS } from '@/i18n'
import { cx } from '@/utils'

export function LangSwitcher({ className }: { className?: string }) {
  const lang = useLang((l) => l.lang)
  const setLang = useLang((l) => l.setLang)
  return (
    <div className={cx('flex items-center gap-1.5', className)}>
      <Languages size={15} className="text-muted" />
      <div className="flex gap-0.5 rounded-lg border border-border bg-surface/80 p-0.5 backdrop-blur">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            className={cx(
              'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
              lang === l.id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
