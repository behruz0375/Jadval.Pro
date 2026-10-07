// ============================================================
// AvailabilityBar — mini vizual Ish vaqti ko'rsatkichi.
// Har kun uchun bitta rangli segment: yashil = ishlaydi, qizil = yo'q.
// Jadval ro'yxatlarida kompakt holda ko'rsatish uchun (ProRector 2026 uslubi).
// ============================================================
import type { AvailabilityMatrix } from '@/types'
import { DAYS_SHORT } from '@/constants'

interface Props {
  value: AvailabilityMatrix
  /** 0..6 daqiqadagi slot soni (undefined bo'lsa — matritsa ichidan olinadi) */
  slots?: number
  /** Ko'rsatkich kengligi (px) — default 72 */
  width?: number
  /** Balandligi (px) — default 10 */
  height?: number
  /** Tooltipda ko'rsatish uchun jami/ishlaydi */
  showCount?: boolean
}

export function AvailabilityBar({ value, slots, width = 72, height = 10, showCount = true }: Props) {
  const matrix = value ?? []
  const days = matrix.length
  const slotCount = slots ?? matrix[0]?.length ?? 0

  let on = 0
  let total = 0
  for (let d = 0; d < days; d++) {
    for (let s = 0; s < slotCount; s++) {
      total++
      if (matrix[d]?.[s]) on++
    }
  }

  if (days === 0 || slotCount === 0) {
    return <span className="text-xs text-muted">—</span>
  }

  const dayW = Math.max(2, Math.floor(width / Math.max(1, days)))
  const title = `${DAYS_SHORT.slice(0, days).map((d, i) => {
    const row = matrix[i] ?? []
    const o = row.filter(Boolean).length
    return `${d}: ${o}/${row.length}`
  }).join(' · ')}`

  return (
    <span className="inline-flex items-center gap-2 align-middle" title={title}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="rounded-sm overflow-hidden ring-1 ring-border/60">
        {Array.from({ length: days }).map((_, d) => (
          <g key={d} transform={`translate(${d * dayW}, 0)`}>
            {Array.from({ length: slotCount }).map((_, s) => {
              const avail = matrix[d]?.[s]
              const segH = height / Math.max(1, slotCount)
              return (
                <rect
                  key={s}
                  x={0.5}
                  y={s * segH}
                  width={dayW - 1}
                  height={segH}
                  fill={avail ? '#22c55e' : '#ef4444'}
                  opacity={avail ? 0.9 : 0.75}
                />
              )
            })}
          </g>
        ))}
      </svg>
      {showCount && (
        <span className="tnum text-xs text-muted">{on}/{total}</span>
      )}
    </span>
  )
}
