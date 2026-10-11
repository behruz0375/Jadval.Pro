import { Search, Palette, Languages } from 'lucide-react'
import { useUI } from '@/store/ui'
import { THEMES, ZOOM_LEVELS } from '@/theme/themes'
import { APP_VERSION } from '@/constants'
import { useT, useLang, LANGS } from '@/i18n'
import { cx } from '@/utils'

export function StatusBar() {
  const s = useUI()
  const t = useT()
  const lang = useLang((l) => l.lang)
  const setLang = useLang((l) => l.setLang)
  return (
    <footer className="no-print flex h-10 shrink-0 flex-nowrap items-center gap-x-2 gap-y-1 overflow-x-auto border-t border-border bg-surface px-2 text-sm select-none sm:h-11 sm:gap-x-3 sm:px-3 sm:flex-wrap sm:overflow-x-visible">
      {/* Zoom — har doim ko'rinadi */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Search size={15} className="text-muted" />
        <select
          value={s.zoom}
          onChange={(e) => s.setZoom(Number(e.target.value))}
          className="input h-7 w-[72px] px-1.5 py-0"
          title="Masshtab"
        >
          {ZOOM_LEVELS.map((z) => (
            <option key={z} value={z}>
              {z} %
            </option>
          ))}
        </select>
      </div>

      <div className="hidden h-5 w-px bg-border sm:block" />

      {/* Mavzu — faqat katta ekranlarda (telefonlar: Sozlamalar'dan boshqariladi) */}
      <select
        value={s.theme}
        onChange={(e) => s.setTheme(e.target.value)}
        className="input hidden h-7 w-[170px] px-2 py-0 sm:block"
        title="Mavzu (rang sxemasi)"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>

      <div className="hidden h-5 w-px bg-border md:block" />

      {/* Eni / Bo'yi — faqat o'rta va katta ekranda */}
      <div className="hidden items-center gap-3 md:flex">
        <Slider
          label={t('Eni')}
          value={s.cellWidth}
          min={32}
          max={120}
          onChange={(v) => s.patch({ cellWidth: v })}
        />
        <Slider
          label={t("Bo'yi")}
          value={s.cellHeight}
          min={28}
          max={96}
          onChange={(v) => s.patch({ cellHeight: v })}
        />
      </div>

      <div className="hidden h-5 w-px bg-border lg:block" />

      {/* Checkboxlar — faqat katta ekranlarda */}
      <div className="hidden items-center gap-3 lg:flex">
        <Check label={t('Gradient')} checked={s.gradient} onChange={(v) => s.patch({ gradient: v })} />
        <Check label={t('Qisqa')} checked={s.compact} onChange={(v) => s.patch({ compact: v })} />
        <Check
          label={t('Ikkinchi qator')}
          checked={s.secondRow}
          onChange={(v) => s.patch({ secondRow: v })}
        />
        <Check label={t('Oq-qora')} checked={s.blackWhite} onChange={(v) => s.patch({ blackWhite: v })} />
      </div>

      {/* Accent rang — o'rta ekrandan boshlab */}
      <label className="relative ml-1 hidden cursor-pointer md:inline-flex" title="Asosiy rang">
        <Palette size={17} className="text-muted" />
        <input
          type="color"
          value={s.accent ?? '#4457d6'}
          onChange={(e) => s.patch({ accent: e.target.value })}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      {s.accent && (
        <button
          onClick={() => s.patch({ accent: null })}
          className="hidden text-xs text-muted underline hover:text-ink md:inline"
          title="Rangni tiklash"
        >
          {t('tiklash')}
        </button>
      )}

      {/* Til (UZ / RU / EN) — har doim ko'rinadi (asosiy sozlamalardan) */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Languages size={15} className="hidden text-muted sm:block" />
        <div className="flex gap-0.5 rounded-md bg-surface-2 p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={cx(
                'rounded px-1.5 py-0.5 text-xs font-semibold transition-colors',
                lang === l.id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <span className="hidden text-xs text-muted sm:inline">{APP_VERSION}</span>
    </footer>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex items-center gap-1.5" title={`${label}: ${value}px`}>
      <span className="text-muted">{label}:</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-20 cursor-pointer accent-accent"
      />
    </label>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded accent-accent"
      />
      <span className="text-ink/90">{label}</span>
    </label>
  )
}
