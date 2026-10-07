import { CalendarRange } from 'lucide-react'
import { useProject } from '@/store/project'
import { TimetableViewer } from './TimetableViewer'

export function ViewsPage() {
  const timetables = useProject((s) => s.project.timetables)
  const latest = timetables[timetables.length - 1] ?? null

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <CalendarRange size={20} />
        </div>
        <h1 className="text-lg font-bold">Jadval ko'rinishlari</h1>
      </div>

      {latest ? (
        <div className="min-h-0 flex-1">
          <TimetableViewer version={latest} />
        </div>
      ) : (
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border text-center text-muted">
          <div>
            <CalendarRange size={40} className="mx-auto mb-2 text-accent/60" />
            <p>Hali jadval tuzilmagan. «Taqsimot» bo'limida jadval tuzing.</p>
          </div>
        </div>
      )}
    </div>
  )
}
