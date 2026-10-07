import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft, Users, BookOpen, DoorOpen, GraduationCap } from 'lucide-react'
import { useUI } from '@/store/ui'
import { useProject } from '@/store/project'
import { panelsForRole } from './panels'
import { cx } from '@/utils'
import { useT } from '@/i18n'
import type { LucideIcon } from 'lucide-react'

interface Result {
  key: string
  group: string
  label: string
  sub?: string
  icon: LucideIcon
  panel: string
}

export function SearchPalette() {
  const open = useUI((s) => s.searchOpen)
  const setOpen = useUI((s) => s.setSearchOpen)
  const role = useUI((s) => s.role)
  const setActivePanel = useUI((s) => s.setActivePanel)
  const project = useProject((s) => s.project)
  const t = useT()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    const hit = (...vals: (string | undefined)[]) => !q || vals.some((v) => v?.toLowerCase().includes(q))
    const out: Result[] = []
    const take = <T,>(arr: T[]) => (q ? arr : arr.slice(0, 6))

    panelsForRole(role).forEach((g) =>
      g.panels.forEach((p) => {
        if (hit(p.label, t(p.label))) out.push({ key: 'p_' + p.id, group: "Bo'limlar", label: p.label, icon: p.icon, panel: p.id })
      }),
    )
    take(project.classes.filter((c) => hit(c.name, c.short))).forEach((c) =>
      out.push({ key: c.id, group: 'Sinflar', label: c.name, icon: Users, panel: 'classes' }),
    )
    take(project.teachers.filter((t) => hit(t.fullName, t.short))).forEach((t) =>
      out.push({ key: t.id, group: "O'qituvchilar", label: t.fullName, sub: t.short, icon: GraduationCap, panel: 'teachers' }),
    )
    take(project.subjects.filter((s) => hit(s.name, s.short))).forEach((s) =>
      out.push({ key: s.id, group: 'Fanlar', label: s.name, sub: s.short, icon: BookOpen, panel: 'subjects' }),
    )
    take(project.rooms.filter((r) => hit(r.name, r.short))).forEach((r) =>
      out.push({ key: r.id, group: 'Xonalar', label: r.name, sub: r.short, icon: DoorOpen, panel: 'rooms' }),
    )
    return out.slice(0, 40)
  }, [query, role, project, t])

  useEffect(() => {
    if (active >= results.length) setActive(0)
  }, [results, active])

  if (!open) return null

  const choose = (r?: Result) => {
    if (!r) return
    setActivePanel(r.panel)
    setOpen(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="modal-pop relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={t("Sinf, o'qituvchi, fan, xona yoki bo'lim qidiring...")}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline">Esc</kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="grid place-items-center py-10 text-sm text-muted">{t('Hech narsa topilmadi')}</div>
          ) : (
            results.map((r, i) => {
              const Icon = r.icon
              const showGroup = i === 0 || results[i - 1].group !== r.group
              return (
                <div key={r.key}>
                  {showGroup && <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{t(r.group)}</div>}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      active === i ? 'bg-accent/15 text-accent' : 'hover:bg-surface-2',
                    )}
                  >
                    <Icon size={16} className={active === i ? 'text-accent' : 'text-muted'} />
                    <span className="flex-1 truncate">{r.group === "Bo'limlar" ? t(r.label) : r.label}</span>
                    {r.sub && <span className="chip text-[10px]">{r.sub}</span>}
                    {active === i && <CornerDownLeft size={14} className="text-accent" />}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
