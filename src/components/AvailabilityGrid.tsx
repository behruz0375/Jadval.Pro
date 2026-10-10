import { Fragment, useState } from 'react'
import { Check, X } from 'lucide-react'
import { DAYS_SHORT } from '@/constants'
import { cx } from '@/utils'
import type { AvailabilityMatrix, Shift } from '@/types'

export type ApplyTarget = 'classes' | 'subjects' | 'rooms' | 'teachers'

/**
 * Ish vaqti matritsasi muharriri.
 * Qatorlar = darslar, Ustunlar = kunlar. Katak bosilsa ✓/✗ almashadi.
 * Sichqoncha bilan sudrab bir nechta katakni belgilash mumkin.
 */
export function AvailabilityGrid({
  value,
  onChange,
  workDays = 6,
  shifts,
  onApplyToAll,
}: {
  value: AvailabilityMatrix
  onChange: (v: AvailabilityMatrix) => void
  workDays?: number
  shifts?: Shift[]
  onApplyToAll?: (target: ApplyTarget) => void
}) {
  const [paint, setPaint] = useState<boolean | null>(null)
  // AvailabilityMatrix = [day][slot] (engine shu tarzda o'qiydi)
  const days = Math.min(workDays, value.length)
  const lessons = value[0]?.length ?? 0
  const totalOn = value
    .slice(0, days)
    .reduce((a, row) => a + row.filter(Boolean).length, 0)

  // Har slot uchun navbat (shift) raqami + navbat ichidagi tartib (1,2,3,…) ni hisoblaymiz.
  // Natijada "1-navbat: 1234567" + "2-navbat: 1234567" ko'rinishida bo'ladi.
  const slotInfo = (slotIdx: number): { shiftIdx: number; posInShift: number; isFirstInShift: boolean } => {
    if (shifts && shifts.length > 0) {
      for (let i = 0; i < shifts.length; i++) {
        const sh = shifts[i]
        const start = Math.max(0, (sh.startLesson ?? 1) - 1)
        const end = start + (sh.lessonCount ?? 0)
        if (slotIdx >= start && slotIdx < end) {
          return { shiftIdx: i, posInShift: slotIdx - start + 1, isFirstInShift: slotIdx === start }
        }
      }
    }
    return { shiftIdx: 0, posInShift: slotIdx + 1, isFirstInShift: slotIdx === 0 }
  }

  const fillFromShift = (idx: number) => {
    const shift = shifts?.[idx]
    if (!shift) return
    // shift.grid[dars][kun] -> availability[kun][dars]
    onChange(value.map((row, d) => row.map((_, l) => shift.grid?.[l]?.[d] ?? false)))
  }

  // value[day][slot] — day qator, slot ustun matritsa indeksida
  const setCell = (lesson: number, day: number, val: boolean) => {
    const next = value.map((row) => row.slice())
    if (!next[day]) next[day] = []
    next[day][lesson] = val
    onChange(next)
  }

  const toggleAll = (val: boolean) => {
    onChange(value.map((row) => row.map(() => val)))
  }

  // Bir kun ustunini (shu kunning hamma darslari) almashtirish
  const toggleDay = (day: number) => {
    const row = value[day] ?? []
    const allOn = row.slice(0, lessons).every(Boolean)
    const next = value.map((r, i) => (i === day ? r.map(() => !allOn) : r.slice()))
    onChange(next)
  }

  // Bir dars qatorini (shu darsning hamma kunlari) almashtirish
  const toggleLesson = (lesson: number) => {
    const allOn = value.slice(0, days).every((row) => row[lesson])
    const next = value.map((row, d) => {
      if (d >= days) return row.slice()
      const r = row.slice()
      r[lesson] = !allOn
      return r
    })
    onChange(next)
  }

  return (
    <div className="select-none" onMouseLeave={() => setPaint(null)} onMouseUp={() => setPaint(null)}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Ish vaqti:</span>
        <button type="button" className="chip hover:text-ink" onClick={() => toggleAll(true)}>
          Hammasi ✓
        </button>
        <button type="button" className="chip hover:text-ink" onClick={() => toggleAll(false)}>
          Hammasi ✗
        </button>
        {shifts && shifts.length > 0 && (
          <select
            className="input h-7 w-auto py-0 text-xs"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value !== '') fillFromShift(+e.target.value)
              e.target.value = ''
            }}
            title="Navbat jadvali bo'yicha to'ldirish"
          >
            <option value="">Navbat bo'yicha…</option>
            {shifts.map((s, i) => (
              <option key={i} value={i}>
                {i + 1}-navbat
              </option>
            ))}
          </select>
        )}
        <span className="chip ml-auto">Jami: {totalOn} ta</span>
      </div>

      {onApplyToAll && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Shu jadvalni qo'llash:</span>
          {(
            [
              ['classes', 'Sinflarga'],
              ['subjects', 'Fanlarga'],
              ['rooms', 'Xonalarga'],
              ['teachers', "O'qituvchilarga"],
            ] as [ApplyTarget, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => onApplyToAll(t)}
              className="rounded-md border border-border px-2 py-1 text-xs hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <table className="border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="w-10 p-1"></th>
            {DAYS_SHORT.slice(0, days).map((d, i) => (
              <th
                key={d}
                className="cursor-pointer px-2 py-1 font-semibold text-muted hover:text-ink"
                onClick={() => toggleDay(i)}
                title="Ustunni almashtirish"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: lessons }).map((_, l) => {
            const info = slotInfo(l)
            // Navbat boshida ajratuvchi qator va "N-navbat" sarlavhasi
            const sep = info.isFirstInShift && l > 0 && shifts && shifts.length > 1
            return (
              <Fragment key={l}>
                {sep && (
                  <tr>
                    <td colSpan={days + 1} className="py-1">
                      <div className="my-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        <span className="h-px flex-1 bg-border" />
                        <span>{info.shiftIdx + 1}-navbat</span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    className="cursor-pointer px-1 py-0.5 font-semibold text-muted hover:text-ink"
                    onClick={() => toggleLesson(l)}
                    title="Qatorni almashtirish"
                  >
                    {info.posInShift}
                  </td>
                  {Array.from({ length: days }).map((_, d) => {
                    const on = value[d]?.[l] ?? false
                    return (
                      <td key={d} className="p-0.5">
                        <button
                          type="button"
                          onMouseDown={() => {
                            setPaint(!on)
                            setCell(l, d, !on)
                          }}
                          onMouseEnter={() => {
                            if (paint !== null) setCell(l, d, paint)
                          }}
                          className={cx(
                            'grid h-7 w-9 place-items-center rounded transition-colors',
                            on
                              ? 'bg-ok/20 text-ok hover:bg-ok/30'
                              : 'bg-danger/15 text-danger hover:bg-danger/25',
                          )}
                        >
                          {on ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
