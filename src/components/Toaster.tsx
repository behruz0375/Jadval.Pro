import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToast } from '@/store/toast'
import { cx } from '@/utils'

const ICON = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const STYLE = {
  success: 'border-ok/40 text-ok',
  error: 'border-danger/40 text-danger',
  info: 'border-accent/40 text-accent',
}

export function Toaster() {
  const { toasts, remove } = useToast()
  return (
    <div className="pointer-events-none fixed bottom-14 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.type]
        return (
          <div
            key={t.id}
            className={cx(
              'toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-surface px-4 py-3 shadow-panel',
              STYLE[t.type],
            )}
          >
            <Icon size={18} />
            <span className="text-sm text-ink">{t.message}</span>
            <button onClick={() => remove(t.id)} className="ml-2 text-muted hover:text-ink">
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
