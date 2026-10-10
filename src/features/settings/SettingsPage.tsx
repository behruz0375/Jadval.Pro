import {
  Settings as SettingsIcon,
  Palette,
  Paintbrush,
  Search,
  Grid2x2,
  RotateCcw,
  Info,
  Check,
} from 'lucide-react'
import { useUI } from '@/store/ui'
import { THEMES, ZOOM_LEVELS } from '@/theme/themes'
import { defaultSettings } from '@/data/factories'
import { APP_NAME, APP_VERSION } from '@/constants'
import { useToast } from '@/store/toast'
import { useT } from '@/i18n'
import { cx } from '@/utils'
import type { LucideIcon } from 'lucide-react'
import { CloudSyncCard } from '@/features/cloud/CloudSyncCard'
import { ProActivationCard } from '@/features/pro/ProActivationCard'
import { DangerZoneCard } from './DangerZoneCard'

const ACCENT_PRESETS = ['#4457d6', '#2563eb', '#059669', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#dc2626']

export function SettingsPage() {
  const s = useUI()
  const toast = useToast()
  const t = useT()
  const accent = s.accent ?? '#4457d6'

  const resetLook = () => {
    s.patch(defaultSettings())
    toast.success(t("Ko'rinish sozlamalari standartga qaytarildi"))
  }

  return (
    <div className="fade-in mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <SettingsIcon size={20} />
        </div>
        <h1 className="text-lg font-bold">{t('Sozlamalar')}</h1>
      </div>

      {/* Rang mavzusi */}
      <Section icon={Palette} title={t('Rang mavzusi')} desc={t('Dastur umumiy rang sxemasini tanlang')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((th) => {
            const active = s.theme === th.id
            return (
              <button
                key={th.id}
                onClick={() => s.setTheme(th.id)}
                className={cx(
                  'relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all',
                  active ? 'border-accent bg-accent/10 shadow-soft' : 'border-border hover:border-accent/40 hover:bg-surface-2',
                )}
              >
                <span className="flex gap-1" data-theme={th.id}>
                  <Swatch varName="--accent" />
                  <Swatch varName="--surface" />
                  <Swatch varName="--bg" />
                </span>
                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t(th.label)}</span>
                  {active && <Check size={15} className="text-accent" />}
                </span>
                {th.dark && <span className="chip w-fit text-[10px]">{t("Qorong'i")}</span>}
              </button>
            )
          })}
        </div>
      </Section>

      {/* Asosiy rang */}
      <Section icon={Paintbrush} title={t('Asosiy rang')} desc="Tugmalar va urg'u elementlari rangi">
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => {
            const active = (s.accent ?? '#4457d6') === c
            return (
              <button
                key={c}
                onClick={() => s.patch({ accent: c })}
                className={cx(
                  'grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110',
                  active && 'ring-2 ring-accent',
                )}
                style={{ background: c }}
                title={c}
              >
                {active && <Check size={15} className="text-white" />}
              </button>
            )
          })}
          <label className="btn btn-outline h-8 cursor-pointer px-3" title="Boshqa rang tanlash">
            <Palette size={15} /> Boshqa
            <input
              type="color"
              value={accent}
              onChange={(e) => s.patch({ accent: e.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          {s.accent && (
            <button onClick={() => s.patch({ accent: null })} className="text-sm text-muted underline hover:text-ink">
              {t('tiklash')}
            </button>
          )}
        </div>
      </Section>

      {/* Masshtab */}
      <Section icon={Search} title={t('Masshtab')} desc="Butun oyna ko'rsatkichi">
        <div className="flex flex-wrap gap-1.5">
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z}
              onClick={() => s.setZoom(z)}
              className={cx(
                'rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors',
                s.zoom === z ? 'border-accent bg-accent text-accent-fg' : 'border-border text-muted hover:border-accent/40 hover:text-ink',
              )}
            >
              {z}%
            </button>
          ))}
        </div>
      </Section>

      {/* Jadval katakchalari */}
      <Section icon={Grid2x2} title={t("Ko'rinish")} desc="Jadval ko'rinishidagi kataklar o'lchami va uslubi">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <Range label={t('Katak kengligi')} value={s.cellWidth} min={32} max={120} unit="px" onChange={(v) => s.patch({ cellWidth: v })} />
            <Range label={t('Katak balandligi')} value={s.cellHeight} min={28} max={96} unit="px" onChange={(v) => s.patch({ cellHeight: v })} />
            <div className="grid gap-2">
              <Toggle label={t('Gradient')} desc="Katak foniga rang o'tishi" checked={s.gradient} onChange={(v) => s.patch({ gradient: v })} />
              <Toggle label={t('Qisqa')} desc="Kataklar ichida kam bo'shliq" checked={s.compact} onChange={(v) => s.patch({ compact: v })} />
              <Toggle label={t('Ikkinchi qator')} desc="O'qituvchi/sinf/xonani ko'rsatish" checked={s.secondRow} onChange={(v) => s.patch({ secondRow: v })} />
              <Toggle label={t('Oq-qora')} desc={t("Oq-qora bosib chiqarish uchun ko'rinish")} checked={s.blackWhite} onChange={(v) => s.patch({ blackWhite: v })} />
            </div>
          </div>

          {/* Jonli ko'rinish */}
          <div className="flex flex-col gap-2">
            <span className="label text-muted">{t("Namuna ko'rinish")}</span>
            <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface-2 p-4">
              <div className="flex gap-1.5">
                <PreviewCell ui={s} short="Mat" color="#3b82f6" second="Aliyev V.A." />
                <PreviewCell ui={s} short="Ona" color="#22c55e" second="Soliyeva D.A." />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Standartga qaytarish */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <RotateCcw size={16} /> {t("Ko'rinish sozlamalari standartga qaytarildi")}
        </div>
        <button onClick={resetLook} className="btn btn-outline h-9">
          <RotateCcw size={15} /> {t('Standartga qaytarish')}
        </button>
      </div>

      {/* Pro aktivatsiya */}
      <ProActivationCard />

      {/* Bulut sinxronizatsiya */}
      <CloudSyncCard />

      {/* Ma'lumotlarni tozalash */}
      <DangerZoneCard />

      {/* Dastur haqida */}
      <Section icon={Info} title={t('Dastur haqida')}>
        <div className="grid gap-y-1.5 text-sm sm:grid-cols-2">
          <Row label={APP_NAME} value={APP_NAME} />
          <Row label={t('Dastur haqida')} value={APP_VERSION} />
          <Row label={t('Rang mavzusi')} value={t(THEMES.find((th) => th.id === s.theme)?.label ?? s.theme)} />
          <Row label={t('Masshtab')} value={`${s.zoom}%`} />
        </div>
      </Section>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: LucideIcon
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/12 text-accent">
          <Icon size={17} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {desc && <p className="text-xs text-muted">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Swatch({ varName }: { varName: string }) {
  return <span className="h-5 w-5 rounded-md border border-border" style={{ background: `rgb(var(${varName}))` }} />
}

function Range({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">
          {value} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-accent"
      />
    </label>
  )
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-lg border border-border px-3.5 py-2.5 text-left transition-colors hover:border-accent/40"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {desc && <span className="block text-xs text-muted">{desc}</span>}
      </span>
      <span
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent' : 'border border-border bg-surface-2',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}

function PreviewCell({
  ui,
  short,
  color,
  second,
}: {
  ui: { cellWidth: number; cellHeight: number; gradient: boolean; compact: boolean; secondRow: boolean; blackWhite: boolean }
  short: string
  color: string
  second: string
}) {
  const c = ui.blackWhite ? undefined : color
  return (
    <div
      style={{
        minWidth: ui.cellWidth,
        height: ui.cellHeight,
        background: c ? (ui.gradient ? `linear-gradient(135deg, ${c}26, ${c}14)` : `${c}1f`) : undefined,
        borderLeft: c ? `3px solid ${c}` : undefined,
      }}
      className={cx('flex flex-col justify-center rounded bg-surface px-1.5 text-left', ui.compact ? 'py-0.5' : 'py-1')}
    >
      <span className="truncate text-xs font-semibold leading-tight">{short}</span>
      {ui.secondRow && <span className="truncate text-[10px] text-muted">{second}</span>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 pr-4">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
