import { useMemo } from 'react'
import { useAuth } from './auth'

const ENV_TELEGRAM = String(import.meta.env.VITE_ADMIN_TELEGRAM ?? '').trim()
const ENV_PHONE = String(import.meta.env.VITE_ADMIN_PHONE ?? '').trim()

/** Adminning aloqa ma'lumoti: adminning o'z brauzerida kiritilgani, bo'lmasa saytga o'rnatilgan (VITE_ADMIN_TELEGRAM / VITE_ADMIN_PHONE).
 *  Ommaviy saytda mijoz brauzerida mahalliy qiymat bo'lmaydi — shuning uchun o'rnatilgan qiymat kerak. */
export function useOwnerContact(): { telegram: string; phone: string } {
  const telegram = useAuth((s) => s.ownerContact.telegram)
  const phone = useAuth((s) => s.ownerContact.phone)
  return useMemo(() => ({ telegram: telegram || ENV_TELEGRAM, phone: phone || ENV_PHONE }), [telegram, phone])
}
