// ============================================================
// Global Modal-based confirm — native window.confirm() o'rniga.
// Native confirm Claude brauzer panelida avtomatik "Cancel" qilinadi;
// bu store orqali chaqirilgan dialog hamma joyda ishlaydi va chiroyliroq.
// ============================================================
import { create } from 'zustand'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  /** 'danger' qizil, 'default' asosiy */
  tone?: 'default' | 'danger'
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions | null
  resolver: ((v: boolean) => void) | null
  ask: (opts: ConfirmOptions | string) => Promise<boolean>
  resolve: (ok: boolean) => void
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolver: null,
  ask: (opts) => {
    const options: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts
    return new Promise<boolean>((resolve) => {
      set({ open: true, options, resolver: resolve })
    })
  },
  resolve: (ok) => {
    const r = get().resolver
    set({ open: false, options: null, resolver: null })
    r?.(ok)
  },
}))

/** Qulaylik uchun — await confirmAsync('Chindan o‘chirilsinmi?') */
export const confirmAsync = (opts: ConfirmOptions | string) => useConfirm.getState().ask(opts)
