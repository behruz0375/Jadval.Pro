import { cx } from '@/utils'

export interface Column<T> {
  key: string
  header: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  render: (row: T, index: number) => React.ReactNode
}

export function Table<T>({
  columns,
  rows,
  getId,
  selectedId,
  onSelect,
  onActivate,
  empty,
  footer,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: {
  columns: Column<T>[]
  rows: T[]
  getId: (row: T) => string
  selectedId?: string | null
  onSelect?: (row: T) => void
  onActivate?: (row: T) => void
  empty?: React.ReactNode
  footer?: React.ReactNode
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
}) {
  const multi = !!onToggleSelect
  const allOn = multi && rows.length > 0 && rows.every((r) => selectedIds?.has(getId(r)))

  // Klaviatura navigatsiyasi: Up/Down tanlashni ko'chiradi, Enter tahrirlashni ochadi, Space multi-tanlash
  const onKeyDown = (ev: React.KeyboardEvent<HTMLTableElement>) => {
    if (rows.length === 0) return
    const curIdx = selectedId ? rows.findIndex((r) => getId(r) === selectedId) : -1
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      const next = rows[Math.min(rows.length - 1, curIdx + 1)]
      if (next) onSelect?.(next)
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      const prev = rows[Math.max(0, curIdx - 1)]
      if (prev) onSelect?.(prev)
    } else if (ev.key === 'Enter' && curIdx >= 0) {
      ev.preventDefault()
      onActivate?.(rows[curIdx])
    } else if (ev.key === ' ' && multi && curIdx >= 0) {
      ev.preventDefault()
      onToggleSelect?.(getId(rows[curIdx]))
    } else if (ev.key === 'Home') {
      ev.preventDefault()
      onSelect?.(rows[0])
    } else if (ev.key === 'End') {
      ev.preventDefault()
      onSelect?.(rows[rows.length - 1])
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="min-h-0 flex-1 overflow-auto">
        <table
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="w-full border-collapse text-sm outline-none focus:ring-2 focus:ring-accent/30"
        >
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr className="text-left text-muted">
              {multi && (
                <th className="w-9 border-b border-border px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-accent"
                    checked={allOn}
                    onChange={() => onToggleAll?.()}
                    title="Hammasini belgilash"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  className={cx(
                    'border-b border-border px-3 py-2 font-semibold',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (multi ? 1 : 0)} className="px-3 py-16 text-center text-muted">
                  {empty ?? "Ma'lumot yo'q"}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const id = getId(row)
                const active = id === selectedId
                const checked = selectedIds?.has(id) ?? false
                return (
                  <tr
                    key={id}
                    onClick={() => onSelect?.(row)}
                    onDoubleClick={() => onActivate?.(row)}
                    className={cx(
                      'cursor-pointer border-b border-border/60 transition-colors',
                      active ? 'bg-accent/15' : checked ? 'bg-accent/5' : 'hover:bg-surface-2',
                    )}
                  >
                    {multi && (
                      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-accent"
                          checked={checked}
                          onChange={() => onToggleSelect?.(id)}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cx(
                          'px-3 py-2',
                          c.align === 'right' && 'text-right tabular-nums',
                          c.align === 'center' && 'text-center',
                        )}
                      >
                        {c.render(row, i)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-border bg-surface-2 px-3 py-1.5 text-xs text-muted">
          {footer}
        </div>
      )}
    </div>
  )
}
