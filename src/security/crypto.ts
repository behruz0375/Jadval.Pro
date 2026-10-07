// ============================================================
// JadvalPro kriptografiyasi.
// Hozirgi auth modelida ECDSA kalit juftligi parol bilan AES-GCM shifrlanadi
// (egasining maxfiy kaliti) — bu PBKDF2 chidamli parolning tasdig'i rolini bajaradi.
// ============================================================
import { sha256Hex } from '@/utils'

// --- base64url yordamchilari ---
function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToBuf(s: string): ArrayBuffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// --- Maxsus kod (qurilma ID) ---
const DEVICE_SALT_KEY = 'jadvalpro-device-salt'

/** Qurilmaning barqaror Maxsus kodi.
 *  Brauzer demo: salt localStorage + IndexedDB'da ikkilanib saqlanadi —
 *  biri tozalansa ikkinchisidan tiklanadi (litsenziya bekor bo'lib qolmasligi uchun).
 *  .exe (Tauri): bu funksiya HWID (anakarta/disk/CPU) bilan almashtiriladi. */
/** Tauri (.exe) ichida ishlasa — apparat HWID'ini oladi, aks holda null */
async function getHardwareId(): Promise<string | null> {
  try {
    const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
    if (!w.__TAURI__ && !w.__TAURI_INTERNALS__) return null
    const { invoke } = await import('@tauri-apps/api/core')
    const id = await invoke<string>('machine_id')
    return id && id.trim() ? id.trim() : null
  } catch {
    return null
  }
}

export async function getMachineCode(): Promise<string> {
  const fmt = (hash: string) => {
    const g = (a: number, b: number) => hash.slice(a, b)
    return `${g(0, 4)}-${g(4, 8)}-${g(8, 12)}-${g(12, 16)}-${g(16, 20)}-${g(20, 23)}`
  }
  // .exe: apparat HWID (xotira tozalansa ham o'zgarmaydi)
  const hwid = await getHardwareId()
  if (hwid) return fmt((await sha256Hex('JADVALPRO-HWID::' + hwid)).toUpperCase())

  const { idbStorage } = await import('@/store/idbStorage')
  let salt: string | null = null
  try {
    salt = localStorage.getItem(DEVICE_SALT_KEY)
  } catch {
    /* localStorage yopiq bo'lishi mumkin */
  }
  const idbSalt = await idbStorage.getItem(DEVICE_SALT_KEY)
  if (!salt && idbSalt) salt = idbSalt
  if (!salt) salt = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string
  // Ikkala joyga ham sinxronlash
  try {
    if (localStorage.getItem(DEVICE_SALT_KEY) !== salt) localStorage.setItem(DEVICE_SALT_KEY, salt)
  } catch {
    /* ignore */
  }
  if (idbSalt !== salt) await idbStorage.setItem(DEVICE_SALT_KEY, salt)
  return fmt((await sha256Hex('JADVALPRO-DEVICE::' + salt)).toUpperCase())
}

// --- Kalit juftligi (egasi) ---
export interface KeyPairJwk {
  publicJwk: JsonWebKey
  privateJwk: JsonWebKey
}

const ALGO = { name: 'ECDSA', namedCurve: 'P-256' } as const

export async function generateOwnerKeys(): Promise<KeyPairJwk> {
  const kp = await crypto.subtle.generateKey(ALGO, true, ['sign', 'verify'])
  const publicJwk = await crypto.subtle.exportKey('jwk', kp.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  return { publicJwk, privateJwk }
}

/** ESKI parol hashi (SHA-256 + salt) — faqat eski hisoblarni ko'chirish uchun */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(salt + '::' + password)
}

export function makeSalt(): string {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string
}

/** Odam o'qiydigan parol tiklash kodi: "JP-XXXX-XXXX-XXXX".
 *  Chalkashadigan belgilar (0/O, 1/I) ishlatilmaydi. */
export function makeRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  let out = ''
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) out += '-'
    out += alphabet[bytes[i] % alphabet.length]
  }
  return 'JP-' + out
}

// --- PBKDF2 (kuchli parol hashi) ---
export const PBKDF2_ITERATIONS = 150_000

async function pbkdf2Key(password: string, salt: string, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** PBKDF2-SHA256 parol hashi (hex) — brute-force'ga chidamli */
export async function pbkdf2Hex(password: string, salt: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations, hash: 'SHA-256' },
    base,
    256,
  )
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// --- Parol bilan shifrlangan saqlash (AES-GCM) — egasining maxfiy kaliti uchun ---
export interface EncryptedBlob {
  salt: string
  iv: string
  data: string
  iterations: number
}

export async function encryptJsonWithPassword(obj: unknown, password: string): Promise<EncryptedBlob> {
  const salt = makeSalt()
  const iterations = PBKDF2_ITERATIONS
  const key = await pbkdf2Key(password, salt, iterations)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(obj)),
  )
  return { salt, iv: bufToB64url(iv.buffer as ArrayBuffer), data: bufToB64url(data), iterations }
}

export async function decryptJsonWithPassword<T>(blob: EncryptedBlob, password: string): Promise<T> {
  const key = await pbkdf2Key(password, blob.salt, blob.iterations)
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b64urlToBuf(blob.iv)) },
    key,
    b64urlToBuf(blob.data),
  )
  return JSON.parse(new TextDecoder().decode(data)) as T
}
