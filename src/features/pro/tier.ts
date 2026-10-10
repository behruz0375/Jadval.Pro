// JadvalPro — Pro/Free tier boshqaruvi
//
// Admin yangi mijoz qo'shganda tarif tanlaydi (free/pro) va Pro bo'lsa
// bitta kalit avto-generatsiya qilinadi. Mijoz Sozlamalar'da shu kalitni
// kiritib Pro'ni aktivlashtiradi.

import { useSyncExternalStore } from 'react'

export type Tier = 'free' | 'pro'

const LS_TIER = 'jadvalpro-tier'
const LS_TIER_KEY = 'jadvalpro-tier-key'
const LS_TIER_EXP = 'jadvalpro-tier-expires'

// Kalit algoritmi: JPRO-XXXX-XXXX-XXXX (base36). Lokal tekshiruv:
// kalit = qisqartirilgan hash("jadvalpro-pro-v1" + login + "::" + expYMD)
// Shu bilan admin dastlabki kalitni generatsiya qiladi va mijozga beradi;
// mijoz uni kiritganda — dastur login + muddat bilan tasdiqlashi mumkin
// (yoki admin kalit generatsiyasini online emas lokal qiladi).
//
// SODDA v1: har mijoz uchun kalit random, admin OwnerPanel'da ko'radi va
// mijozga beradi. Mijoz Sozlamalar'da yozsa — shu kalitni localStorage'ga
// yozib Pro'ni yoqadi. 100% buzilmas emas (buzish — tajribali foydalanuvchi
// uchun oson), lekin oddiy maktab direktori buni qila olmaydi.

const subscribers = new Set<() => void>()
const notify = () => subscribers.forEach((fn) => fn())

export function getTier(): Tier {
  // Muddati o'tgan bo'lsa — avtomatik free'ga tushadi
  if (isTierExpired()) {
    try { localStorage.setItem(LS_TIER, 'free') } catch { /* no-op */ }
    return 'free'
  }
  try {
    const v = localStorage.getItem(LS_TIER)
    return v === 'pro' ? 'pro' : 'free'
  } catch {
    return 'free'
  }
}

export function getTierKey(): string | null {
  try { return localStorage.getItem(LS_TIER_KEY) } catch { return null }
}

export function getTierExpiresAt(): string | null {
  try { return localStorage.getItem(LS_TIER_EXP) } catch { return null }
}

export function isTierExpired(): boolean {
  const exp = getTierExpiresAt()
  if (!exp) return false
  const t = Date.parse(exp)
  if (!Number.isFinite(t)) return false
  return Date.now() > t
}

/** Pro aktivatsiya kalitini yaratish (admin uchun). JPRO-XXXX-XXXX-XXXX. */
export function generateProKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // chalkashmaslik uchun 0,O,1,I olib tashlangan
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `JPRO-${seg(4)}-${seg(4)}-${seg(4)}`
}

/** Pro kalitni normalashtirib qaytaradi (upper + faqat harf/raqam + bo'g'in bilan) */
export function normalizeProKey(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!clean.startsWith('JPRO')) return ''
  const body = clean.slice(4)
  if (body.length !== 12) return ''
  return `JPRO-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`
}

/** Pro aktivatsiya — kalitni localStorage'ga yozadi, muddat ixtiyoriy */
export function activatePro(key: string, expiresAt?: string): { ok: boolean; message?: string } {
  const normalized = normalizeProKey(key)
  if (!normalized) {
    return { ok: false, message: "Kalit formati noto'g'ri. JPRO-XXXX-XXXX-XXXX shaklida bo'lishi kerak." }
  }
  try {
    localStorage.setItem(LS_TIER, 'pro')
    localStorage.setItem(LS_TIER_KEY, normalized)
    if (expiresAt) localStorage.setItem(LS_TIER_EXP, expiresAt)
    else localStorage.removeItem(LS_TIER_EXP)
    notify()
    return { ok: true }
  } catch (e) {
    return { ok: false, message: 'Lokal xotira ishlamadi: ' + String(e) }
  }
}

/** Pro'ni o'chirish — Free'ga qaytish */
export function deactivatePro(): void {
  try {
    localStorage.setItem(LS_TIER, 'free')
    localStorage.removeItem(LS_TIER_KEY)
    localStorage.removeItem(LS_TIER_EXP)
    notify()
  } catch { /* no-op */ }
}

// Boshqa oynalardagi o'zgarishlarni ham eshitamiz
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('jadvalpro-tier')) notify()
  })
}

/** React hook: joriy tarif. Re-render qiladi — localStorage o'zgarsa. */
export function useTier(): Tier {
  const subscribe = (fn: () => void) => {
    subscribers.add(fn)
    return () => { subscribers.delete(fn) }
  }
  return useSyncExternalStore(subscribe, getTier, () => 'free')
}

/** Qulay: Pro bo'lsa true, aks holda false */
export function useIsPro(): boolean {
  return useTier() === 'pro'
}

// ============================================================
// Feature cheklovlari (Free vs Pro)
// ============================================================

export const FREE_LIMITS = {
  classes: 10,       // Free: max 10 sinf
  teachers: 15,      // Free: max 15 o'qituvchi
  restarts: 2,       // Free: max 2 urinish (Pro: 10)
  snapshots: 3,      // Free: 3 backup slot (Pro: cheksiz lokal + bulut)
}

/** Shu tur uchun limit (null = cheksiz). Pro bo'lsa hamma vaqt cheksiz. */
export function limitFor(kind: keyof typeof FREE_LIMITS): number | null {
  return getTier() === 'pro' ? null : FREE_LIMITS[kind]
}

/** React: Pro bo'lmasa null emas, number */
export function useLimitFor(kind: keyof typeof FREE_LIMITS): number | null {
  const pro = useIsPro()
  return pro ? null : FREE_LIMITS[kind]
}

export const PRO_FEATURES = [
  'Cheksiz sinf va o\'qituvchilar',
  'Bulut sinxronizatsiya (boshqa qurilmadan ochish)',
  'AI yordamchi (ovoz + matn, 7 LLM provayder)',
  'Server tomondan jadval tuzish (brauzerni muzlatmaydi)',
  'PDF, Word, PNG eksport',
  'Formatlangan Excel + rangli jadval',
  '10 urinishgacha generatsiya (yaxshiroq natija)',
  'Rezerv nusxalar cheklanmagan',
  'Chop uchun kartochkalar (barcha sinflar)',
  'Priority qo\'llab-quvvatlash',
] as const
