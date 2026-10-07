import { Construction } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function Placeholder({
  title,
  icon: Icon = Construction,
  note = 'Bu modul keyingi bosqichda ishga tushadi.',
}: {
  title: string
  icon?: LucideIcon
  note?: string
}) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="card flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Icon size={32} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{note}</p>
        </div>
      </div>
    </div>
  )
}
