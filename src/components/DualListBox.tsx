import { useMemo, useState } from 'react'
import { ChevronsRight, ChevronsLeft, Search } from 'lucide-react'
import { cx } from '@/utils'

export interface DualOption {
  id: string
  label: string
}

/** ProRector uslubidagi ikki ustunli tanlov: chapda — mavjud, o'ngda — tanlangan */
export function DualListBox({
  value,
  options,
  onChange,
  leftTitle = 'Mavjud',
  rightTitle = 'Tanlangan',
}: {
  value: string[]
  options: DualOption[]
  onChange: (v: string[]) => void
  leftTitle?: string
  rightTitle?: string
}) {
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState<{ side: 'L' | 'R'; id: string } | null>(null)

  const selectedSet = useMemo(() => new Set(value), [value])
  const available = options.filter((o) => !selectedSet.has(o.id) && o.label.toLowerCase().includes(q.trim().toLowerCase()))
  const selected = value.map((id) => options.find((o) => o.id === id)).filter(Boolean) as DualOption[]

  const add = (id: string) => onChange([...value, id])
  const remove = (id: string) => onChange(value.filter((x) => x !== id))
  const addAll = () => onChange([...value, ...available.map((o) => o.id)])
  const removeAll = () => onChange([])

  const List = ({ side, items }: { side: 'L' | 'R'; items: DualOption[] }) => (
    <div className="min-h-[9rem] flex-1 overflow-y-auto rounded-lg border border-border bg-surface">
      {items.length === 0 && <div className="grid h-24 place-items-center text-xs text-muted">—</div>}
      {items.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setFocus({ side, id: o.id })}
          onDoubleClick={() => (side === 'L' ? add(o.id) : remove(o.id))}
          className={cx(
            'block w-full px-2.5 py-1.5 text-left text-sm transition-colors',
            focus?.side === side && focus.id === o.id ? 'bg-accent/15 text-accent' : 'hover:bg-surface-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2">
      <div className="relative mb-2">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish..." className="input h-8 w-full pl-8" />
      </div>
      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{leftTitle}</span>
          <List side="L" items={available} />
        </div>
        <div className="flex flex-col justify-center gap-1.5">
          <button type="button" onClick={() => focus?.side === 'L' && add(focus.id)} className="btn btn-outline h-8 w-8 p-0" title="Qo'shish">
            <ChevronsRight size={16} />
          </button>
          <button type="button" onClick={addAll} className="btn btn-ghost h-7 w-8 p-0 text-xs" title="Hammasini qo'shish">
            »»
          </button>
          <button type="button" onClick={() => focus?.side === 'R' && remove(focus.id)} className="btn btn-outline h-8 w-8 p-0" title="Olib tashlash">
            <ChevronsLeft size={16} />
          </button>
          <button type="button" onClick={removeAll} className="btn btn-ghost h-7 w-8 p-0 text-xs" title="Hammasini olib tashlash">
            ««
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {rightTitle} ({selected.length})
          </span>
          <List side="R" items={selected} />
        </div>
      </div>
    </div>
  )
}
