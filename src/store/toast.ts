import { create } from 'zustand'
import { uid } from '@/utils'

export type ToastType = 'success' | 'error' | 'info'
export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (type: ToastType, message: string) => void
  remove: (id: string) => void
  success: (m: string) => void
  error: (m: string) => void
  info: (m: string) => void
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, message) => {
    const id = uid('t_')
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => get().remove(id), 3500)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  success: (m) => get().push('success', m),
  error: (m) => get().push('error', m),
  info: (m) => get().push('info', m),
}))
