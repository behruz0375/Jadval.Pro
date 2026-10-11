// JadvalPro — Muddat (expiry) hook
//
// Litsenziya muddatini kuzatadi va real-time hisob-kitob qiladi.
// Komponentlarda: const { isExpired, daysLeft, countdownText, ... } = useExpiry()

import { useEffect, useState } from 'react'
import { getTierExpiresAt, useTier } from './tier'

export interface ExpiryInfo {
  /** Muddat tugaganmi? */
  isExpired: boolean
  /** Muddat tugaguncha qolgan to'liq kunlar (expired bo'lsa 0) */
  daysLeft: number
  /** Muddat sanasi (null = cheksiz / belgilanmagan) */
  expiryDate: Date | null
  /** Hisob-kitob matni: "2 kun 14:32" yoki "" */
  countdownText: string
  /** Muddat yaqinlashmoqdami? (3 kun yoki kamroq qolgan) */
  isWarning: boolean
  /** Faqat ko'rish rejimi (expired + free tier) */
  isReadOnly: boolean
}

function calcExpiry(): ExpiryInfo {
  const raw = getTierExpiresAt()
  if (!raw) {
    return { isExpired: false, daysLeft: Infinity, expiryDate: null, countdownText: '', isWarning: false, isReadOnly: false }
  }
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) {
    return { isExpired: false, daysLeft: Infinity, expiryDate: null, countdownText: '', isWarning: false, isReadOnly: false }
  }

  const expiryDate = new Date(t)
  const now = Date.now()
  const diff = t - now

  if (diff <= 0) {
    return {
      isExpired: true,
      daysLeft: 0,
      expiryDate,
      countdownText: '',
      isWarning: false,
      isReadOnly: true,
    }
  }

  const totalMinutes = Math.floor(diff / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  let countdownText = ''
  if (days > 0) {
    countdownText = `${days} kun ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  } else {
    countdownText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  return {
    isExpired: false,
    daysLeft: days,
    expiryDate,
    countdownText,
    isWarning: days <= 3,
    isReadOnly: false,
  }
}

/** React hook: litsenziya muddati haqida ma'lumot. Har daqiqada yangilanadi. */
export function useExpiry(): ExpiryInfo {
  const tier = useTier()
  const [info, setInfo] = useState<ExpiryInfo>(calcExpiry)

  useEffect(() => {
    // Darhol hisoblash
    setInfo(calcExpiry())
    // Har daqiqada yangilash
    const id = setInterval(() => setInfo(calcExpiry()), 60_000)
    return () => clearInterval(id)
  }, [tier])

  return info
}

/** Muddat tugagan va faqat ko'rish rejimi ekanini tekshirish (hook bo'lmagan joylar uchun) */
export function isLicenseReadOnly(): boolean {
  const raw = getTierExpiresAt()
  if (!raw) return false
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) return false
  return Date.now() > t
}
