import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { useConfirm } from '@/store/confirm'

/** Dastur ildizida bir marta mount qilinadigan global confirm dialog host.
 *  Har joyda `await confirmAsync('matn')` yoki `useConfirm.getState().ask({...})`
 *  chaqirilsa — shu yerda modal chiqadi. */
export function ConfirmHost() {
  const open = useConfirm((s) => s.open)
  const options = useConfirm((s) => s.options)
  const resolve = useConfirm((s) => s.resolve)

  const tone = options?.tone ?? 'default'
  const confirmLabel = options?.confirmText ?? 'OK'
  const cancelLabel = options?.cancelText ?? 'Bekor'

  return (
    <Modal
      open={open}
      title={options?.title ?? 'Tasdiqlash'}
      onClose={() => resolve(false)}
      width="max-w-md"
      footer={
        <>
          <button onClick={() => resolve(false)} className="btn btn-outline">
            {cancelLabel}
          </button>
          <button
            onClick={() => resolve(true)}
            className={tone === 'danger' ? 'btn btn-danger' : 'btn btn-accent'}
            autoFocus
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3 py-1">
        {tone === 'danger' && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-danger/15 text-danger">
            <AlertTriangle size={18} />
          </div>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{options?.message}</div>
      </div>
    </Modal>
  )
}
