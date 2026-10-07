import { useState } from 'react'
import { Users, BookOpen, DoorOpen, GraduationCap, type LucideIcon } from 'lucide-react'
import { ClassesPage } from '@/features/classes/ClassesPage'
import { SubjectsPage } from '@/features/subjects/SubjectsPage'
import { RoomsPage } from '@/features/rooms/RoomsPage'
import { TeachersPage } from '@/features/teachers/TeachersPage'
import { cx } from '@/utils'
import { useT } from '@/i18n'

const TABS: { id: string; label: string; icon: LucideIcon; Comp: () => JSX.Element }[] = [
  { id: 'classes', label: 'Sinflar', icon: Users, Comp: ClassesPage },
  { id: 'subjects', label: 'Fanlar', icon: BookOpen, Comp: SubjectsPage },
  { id: 'rooms', label: 'Xonalar', icon: DoorOpen, Comp: RoomsPage },
  { id: 'teachers', label: "O'qituvchilar", icon: GraduationCap, Comp: TeachersPage },
]

export function ListsPage() {
  const t = useT()
  const [tab, setTab] = useState('classes')
  const Active = TABS.find((x) => x.id === tab)?.Comp ?? ClassesPage

  return (
    <div className="flex h-full">
      {/* ProRector 2026 uslubidagi chap vertikal tab'lar — katta ikonalar bilan */}
      <aside className="flex w-24 shrink-0 flex-col gap-1.5 border-r border-border bg-surface p-2">
        {TABS.map((x) => {
          const Icon = x.icon
          const on = tab === x.id
          return (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={cx(
                'group flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                on
                  ? 'border-accent bg-accent/10 text-accent shadow-soft'
                  : 'border-transparent text-muted hover:border-border hover:bg-surface-2 hover:text-ink',
              )}
            >
              <Icon size={26} strokeWidth={on ? 2.4 : 1.9} className={cx('transition-transform', on && 'scale-110')} />
              <span className="text-[11px] font-semibold leading-tight">{t(x.label)}</span>
            </button>
          )
        })}
      </aside>
      <div className="min-h-0 flex-1">
        <Active />
      </div>
    </div>
  )
}
