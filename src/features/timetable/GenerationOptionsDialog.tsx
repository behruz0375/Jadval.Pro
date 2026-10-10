import { useState } from 'react'
import { Play, CalendarDays, UserMinus, DoorOpen, Repeat, Cloud } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useT } from '@/i18n'
import type { GenerateOptions } from '@/engine/generate'
import { isCloudSignedIn } from '@/features/cloud/api'

export interface GenerateOptionsExt extends GenerateOptions {
  useServerSide?: boolean
}

const OPTS: { key: keyof GenerateOptions; label: string; icon: typeof CalendarDays }[] = [
  { key: 'spreadDays', label: 'Darslarni kunlarga tekis taqsimlash', icon: CalendarDays },
  { key: 'minimizeGaps', label: "O'qituvchi/sinf darchalarini (okno) kamaytirish", icon: UserMinus },
  { key: 'considerRooms', label: 'Xonalarni hisobga olish', icon: DoorOpen },
]

export function GenerationOptionsDialog({
  open,
  onClose,
  onStart,
}: {
  open: boolean
  onClose: () => void
  onStart: (opts: GenerateOptionsExt) => void
}) {
  const t = useT()
  const [flags, setFlags] = useState<Record<string, boolean>>({
    spreadDays: true,
    minimizeGaps: true,
    considerRooms: true,
  })
  const [seed, setSeed] = useState('')
  const [weights, setWeights] = useState({ gapWeight: 2, spreadWeight: 4, morningWeight: 2 })
  const [restarts, setRestarts] = useState(3)
  const [useServerSide, setUseServerSide] = useState(false)
  const cloudAvailable = isCloudSignedIn()

  const start = () => {
    const s = seed.trim() ? Number(seed.trim()) : undefined
    onStart({
      ...flags,
      ...weights,
      restarts,
      seed: Number.isFinite(s) ? s : undefined,
      useServerSide,
    } as GenerateOptionsExt)
  }

  return (
    <Modal
      open={open}
      title={t('Dars jadvalini avtomatik tuzish')}
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-outline">{t('Bekor qilish')}</button>
          <button onClick={start} className="btn btn-accent hover-lift">
            <Play size={16} /> {t('Tuzishni boshlash')}
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">{t('Qaysi shartlarni hisobga olgan holda jadval tuzilsin:')}</p>
      <div className="flex flex-col gap-1.5">
        {OPTS.map((o) => {
          const Icon = o.icon
          const on = !!flags[o.key as string]
          return (
            <label
              key={o.key as string}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-surface-2"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setFlags((f) => ({ ...f, [o.key as string]: e.target.checked }))}
                className="h-4 w-4 accent-accent"
              />
              <Icon size={17} className="text-accent" />
              <span className="text-sm">{t(o.label)}</span>
            </label>
          )
        })}
      </div>

      <div className="mt-4 rounded-lg border border-border p-3">
        <div className="mb-2 text-sm font-medium">{t("Yumshoq cheklov og'irliklari")}</div>
        <WeightSlider label={t('Darchalarni (oyna) kamaytirish')} value={weights.gapWeight} onChange={(v) => setWeights((w) => ({ ...w, gapWeight: v }))} />
        <WeightSlider label={t('Fanlarni kunlarga tekis tarqatish')} value={weights.spreadWeight} onChange={(v) => setWeights((w) => ({ ...w, spreadWeight: v }))} />
        <WeightSlider label={t("Og'ir fanlarni ertalabga surish")} value={weights.morningWeight} onChange={(v) => setWeights((w) => ({ ...w, morningWeight: v }))} />
      </div>

      {cloudAvailable && (
        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 transition-colors hover:bg-accent/10">
          <input
            type="checkbox"
            checked={useServerSide}
            onChange={(e) => setUseServerSide(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          <Cloud size={17} className="text-accent" />
          <span className="min-w-0 flex-1 text-sm">
            {t('Serverda tuzish')}
            <span className="ml-2 text-[11px] text-muted">
              {t('(brauzerni muzlatmaydi, bulut server kerak)')}
            </span>
          </span>
        </label>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1.5">
            <Repeat size={14} className="text-accent" />
            {t('Urinishlar soni')}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              value={restarts}
              onChange={(e) => setRestarts(+e.target.value)}
              className="flex-1 accent-accent"
            />
            <span className="w-5 text-right text-sm tabular-nums text-muted">{restarts}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {t("Ko'proq urinish — yaxshiroq natija (lekin sekinroq)")}
          </p>
        </div>
        <div>
          <label className="label flex items-center gap-1">
            {t('Seed')}
          </label>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder={t("Bo'sh = tasodifiy")}
            className="input mt-1"
          />
        </div>
      </div>
    </Modal>
  )
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="flex-1 text-sm">{label}</span>
      <input type="range" min={0} max={10} value={value} onChange={(e) => onChange(+e.target.value)} className="w-32 accent-accent" />
      <span className="w-5 text-right text-sm tabular-nums text-muted">{value}</span>
    </div>
  )
}
