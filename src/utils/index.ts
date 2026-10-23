import type { WeekType } from '@/types'

/** CSS rangini xavfsiz qiymatga keltiradi (faqat #rgb/#rrggbb...): .jadval yoki bulut nusxasidagi begona matn HTML/CSS ichiga tushib qolmasin */
export function safeColor(c: string | undefined | null, fallback = '#999'): string {
  return typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.trim()) ? c.trim() : fallback
}

/** Classname birlashtiruvchi */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Hafta turlarining nomi va qisqa belgisi */
export const WEEK_LABEL: Record<WeekType, string> = {
  all: 'Har hafta',
  num: '1-hafta (surat)',
  den: '2-hafta (maxraj)',
}
export const WEEK_BADGE: Record<WeekType, string> = { all: '', num: 'I', den: 'II' }

/** Ikki hafta turi bir slotda to'qnashadimi? (butun — har doim, surat/maxraj — faqat o'zaro) */
export function weekOverlap(a: WeekType | undefined, b: WeekType | undefined): boolean {
  const x = a ?? 'all'
  const y = b ?? 'all'
  return x === 'all' || y === 'all' || x === y
}

/** Tasodifiy ID */
export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** HEX rangni "R G B" uchligiga aylantirish */
export function hexToRgbTriplet(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`
}

/** Bo'sh ish vaqti matritsasi (hammasi true) */
export function fullAvailability(days: number, lessons: number): boolean[][] {
  return Array.from({ length: days }, () => Array.from({ length: lessons }, () => true))
}

/** "HH:MM" ni daqiqaga */
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Daqiqani "HH:MM" ga */
export function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** SHA-256 hash (hex) — Web Crypto */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Sonni formatlash */
export function fmt(n: number): string {
  return new Intl.NumberFormat('uz').format(n)
}

/** Telegram username/link ni to'liq URL ga aylantirish */
export function telegramUrl(input: string): string {
  const v = input.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  const clean = v.replace(/^@/, '').replace(/^t\.me\//i, '').replace(/^telegram\.me\//i, '')
  return 'https://t.me/' + clean
}
