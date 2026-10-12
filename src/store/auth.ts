import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from './idbStorage'
import type { Role } from '@/types'
import {
  getMachineCode,
  generateOwnerKeys,
  hashPassword,
  pbkdf2Hex,
  PBKDF2_ITERATIONS,
  makeSalt,
  makeRecoveryCode,
  encryptJsonWithPassword,
  decryptJsonWithPassword,
  type KeyPairJwk,
  type EncryptedBlob,
} from '@/security/crypto'
import { uid } from '@/utils'
import { useProject } from './project'

/** Hisob ma'lumotlari (login + PBKDF2 parol hashi) */
export interface Cred {
  login: string
  salt: string
  hash: string
  /** PBKDF2 iteratsiyalari. Yo'q/0 bo'lsa — eski SHA-256 hash (kirishda yangilanadi) */
  iterations?: number
}

/** Parolni tiklash kodi hashi (kod o'zi saqlanmaydi) */
export interface RecoveryHash {
  salt: string
  hash: string
  iterations: number
}

/** Maktab hodimi hisobi — qurilmaga muhrlangan */
export interface StaffCred extends Cred {
  machineSeal: string
  active: boolean
  createdAt: string
  /** Parolni tiklash kodi hashi (ixtiyoriy — hodim o'zi o'rnatadi) */
  recovery?: RecoveryHash
}

export type StaffRole = 'director' | 'deputy'

/** O'qituvchi/O'quvchi hisobi — teacherId yoki classId ga bog'langan */
export interface AccountCred extends Cred {
  id: string
  role: 'teacher' | 'student'
  linkedId: string // teacherId (o'qituvchi) yoki classId (o'quvchi: sinf)
  machineSeal: string
  active: boolean
  createdAt: string
}

/** Faollik jurnali yozuvi (audit log) */
export interface AuditEntry {
  id: string
  at: string
  action: string
  detail?: string
}

/** Egasi reyestridagi maktab/mijoz yozuvi (admin lokal eslatma) */
export interface SchoolRecord {
  licenseId: string
  schoolName: string
  director: string
  phone: string
  machineCode: string
  plan: string
  issuedAt: string
  expiresAt: string
  key: string
  blocked: boolean
  /** Admin mijozga bergan login (yozib qo'yish uchun, lokal eslatma) */
  login?: string
  /** Admin mijozga bergan parol (lokal eslatma — faqat admin qurilmasida saqlanadi) */
  password?: string
  /** Qo'shimcha eslatmalar (to'lov miqdori, sana, h.k.) */
  notes?: string
}

interface AuthState {
  machineCode: string
  ready: boolean

  /** Egasi kalitlari: publicJwk doim; privateJwk faqat ESKI (shifrlanmagan) saqlashdan qolgan bo'lishi mumkin */
  ownerKeys: { publicJwk: JsonWebKey; privateJwk?: JsonWebKey } | null
  /** Egasining maxfiy kaliti — parol bilan AES-GCM shifrlangan holda */
  ownerKeysEnc: EncryptedBlob | null
  /** Maxfiy kalit tiklash kodi bilan ikkinchi marta shifrlangan — parol unutilgan holatda ochish uchun */
  ownerKeysEncByRecovery: EncryptedBlob | null
  /** Maxfiy kalit FAQAT xotirada (sessiya davomida), diskka yozilmaydi */
  ownerPrivateJwk: JsonWebKey | null
  ownerAuth: Cred | null
  staff: { director: StaffCred | null; deputy: StaffCred | null }
  accounts: AccountCred[]
  role: Role | null
  /** Kirgan o'qituvchi/o'quvchining bog'langan IDsi (teacherId yoki classId) */
  linkedId: string | null
  schools: SchoolRecord[]
  ownerContact: { telegram: string; phone: string }
  /** Faollik jurnali (audit log) — qurilmada saqlanadi */
  audit: AuditEntry[]

  init: () => Promise<void>
  logout: () => void

  // Egasi hisobi
  ownerSetup: (login: string, password: string) => Promise<string | null>
  ownerLogin: (login: string, password: string) => Promise<string | null>
  ownerChangeCredentials: (
    currentPassword: string,
    newLogin: string,
    newPassword?: string,
  ) => Promise<string | null>
  /** Egasi uchun yangi parol tiklash kodi yaratadi va KODNING O'ZINI qaytaradi (bir marta ko'rsatish).
   *  Kod bilan maxfiy kalit qayta shifrlanadi — parol unutilsa shu kod bilan tiklash mumkin. */
  genOwnerRecoveryCode: (currentPassword: string) => Promise<string>
  /** Admin paroli unutilgan — tiklash kodi + yangi login + yangi parol bilan tiklaydi */
  ownerRecoverWithCode: (code: string, newLogin: string, newPassword: string) => Promise<string | null>

  // Maktab hodimlari (Direktor / O'TIBDO')
  setupDirector: (login: string, password: string) => Promise<string | null>
  staffLogin: (role: StaffRole, login: string, password: string) => Promise<string | null>
  staffChangeCredentials: (
    role: StaffRole,
    currentPassword: string,
    newLogin: string,
    newPassword?: string,
  ) => Promise<string | null>
  setDeputyAccount: (login: string, password: string) => Promise<string | null>
  setDeputyActive: (active: boolean) => void
  removeDeputy: () => void
  /** Hodim uchun yangi parol tiklash kodi yaratadi va KODNING O'ZINI qaytaradi (bir marta ko'rsatish) */
  genStaffRecoveryCode: (role: StaffRole) => Promise<string>
  /** Tiklash kodi bilan parolni qayta o'rnatish va kirish */
  resetStaffPasswordWithCode: (role: StaffRole, code: string, newPassword: string) => Promise<string | null>

  // O'qituvchi / O'quvchi hisoblari
  createAccount: (role: 'teacher' | 'student', login: string, password: string, linkedId: string) => Promise<string | null>
  removeAccount: (id: string) => void
  setAccountActive: (id: string, active: boolean) => void
  /** O'qituvchi/o'quvchi hisobiga yangi parol o'rnatish (Zavuch — eski parolsiz) */
  resetAccountPassword: (id: string, newPassword: string) => Promise<string | null>
  accountLogin: (role: 'teacher' | 'student', login: string, password: string) => Promise<string | null>

  /** Yangi mijoz yozuvi (admin lokal eslatma: login, parol, telefon va h.k.) — litsenziyasiz */
  addCustomer: (opts: {
    schoolName: string
    director: string
    phone: string
    login: string
    password: string
    notes?: string
    plan?: string
    key?: string
  }) => void
  /** Admin shu qurilmada direktor hisobini SOZLAYDI (yoki qayta yozadi) —
   *  shu bilan admin o'z qurilmasida ham testlab ko'ra oladi (chiqib → Zavuch login).
   *  Haqiqiy mijoz boshqa qurilmada login+parolni Zavuch panelida ro'yxatdan o'tishi kerak. */
  provisionDirectorHere: (login: string, password: string) => Promise<string | null>
  /** Mavjud mijoz yozuvini yangilash (shu jumladan admin bergan login/parol) */
  updateCustomer: (id: string, patch: Partial<SchoolRecord>) => void
  setSchoolBlocked: (id: string, blocked: boolean) => void
  removeSchool: (id: string) => void
  setOwnerContact: (patch: Partial<{ telegram: string; phone: string }>) => void

  // Faollik jurnali
  logAudit: (action: string, detail?: string) => void
  clearAudit: () => void
  /** Tarif cheklovi (sinf/o'qituvchi): son yoki null (cheksiz) */
  planLimit: (kind: 'classes' | 'teachers') => number | null

  roleLabel: () => string
}

/** Parolni tekshirish: PBKDF2, eski hisoblar uchun SHA-256 fallback.
 *  Natija: mos kelsa va eski bo'lsa — yangilangan Cred qaytaradi. */
async function verifyPassword(cred: Cred, password: string): Promise<{ ok: boolean; upgraded?: Cred }> {
  if (cred.iterations) {
    const hash = await pbkdf2Hex(password, cred.salt, cred.iterations)
    return { ok: hash === cred.hash }
  }
  // Eski SHA-256 hash
  const legacy = await hashPassword(password, cred.salt)
  if (legacy !== cred.hash) return { ok: false }
  const salt = makeSalt()
  const hash = await pbkdf2Hex(password, salt)
  return { ok: true, upgraded: { ...cred, salt, hash, iterations: PBKDF2_ITERATIONS } }
}

async function makeCred(login: string, password: string): Promise<Cred> {
  const salt = makeSalt()
  return { login: login.trim(), salt, hash: await pbkdf2Hex(password, salt), iterations: PBKDF2_ITERATIONS }
}

const sameLogin = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Tiklash kodini solishtirish uchun kanonik shaklga keltirish (katta harf, faqat harf/raqam) */
const normalizeRecovery = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

// ---------------- Brute-force himoyasi (sessiya davomida) ----------------
const attempts = new Map<string, { count: number; until: number }>()
const MAX_ATTEMPTS = 5
const LOCK_MS = 30_000
function lockRemaining(key: string): number {
  const a = attempts.get(key)
  return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 1000) : 0
}
function recordFail(key: string) {
  const a = attempts.get(key) ?? { count: 0, until: 0 }
  a.count++
  if (a.count >= MAX_ATTEMPTS) {
    a.until = Date.now() + LOCK_MS
    a.count = 0
  }
  attempts.set(key, a)
}
function recordOk(key: string) {
  attempts.delete(key)
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      machineCode: '',
      ready: false,
      ownerKeys: null,
      ownerKeysEnc: null,
      ownerKeysEncByRecovery: null,
      ownerPrivateJwk: null,
      ownerAuth: null,
      staff: { director: null, deputy: null },
      accounts: [],
      role: null,
      linkedId: null,
      schools: [],
      ownerContact: { telegram: '', phone: '' },
      audit: [],

      init: async () => {
        const machineCode = await getMachineCode()
        set({ machineCode, ready: true })
      },

      logout: () => {
        const ps = useProject.getState()
        const scope = ps.scope
        if (scope) {
          void idbStorage.setItem(
            `jadvalpro-project-scope:${scope}`,
            JSON.stringify({ state: { project: ps.project } }),
          )
        }
        set({ role: null, ownerPrivateJwk: null, linkedId: null })
      },

      // ---------------- Egasi hisobi ----------------

      ownerSetup: async (login, password) => {
        if (get().ownerAuth) return 'Egasi hisobi allaqachon mavjud'
        if (!login.trim()) return 'Login kiriting'
        if (password.length < 4) return "Parol kamida 4 belgi bo'lsin"
        const cred = await makeCred(login, password)
        // Kalit juftligi: ochiq — ochiq saqlanadi, maxfiy — parol bilan shifrlanadi
        const keys: KeyPairJwk = get().ownerKeys?.privateJwk
          ? { publicJwk: get().ownerKeys!.publicJwk, privateJwk: get().ownerKeys!.privateJwk! }
          : await generateOwnerKeys()
        const enc = await encryptJsonWithPassword(keys.privateJwk, password)
        set({
          ownerAuth: cred,
          ownerKeys: { publicJwk: keys.publicJwk },
          ownerKeysEnc: enc,
          ownerPrivateJwk: keys.privateJwk,
          role: 'owner',
        })
        return null
      },

      ownerLogin: async (login, password) => {
        const auth = get().ownerAuth
        if (!auth) return 'Egasi hisobi hali yaratilmagan'
        const rem = lockRemaining('owner')
        if (rem) return `Juda ko'p urinish — ${rem} soniyadan keyin qayta urining`
        if (!sameLogin(auth.login || 'egasi', login)) {
          recordFail('owner')
          return "Login yoki parol noto'g'ri"
        }
        const res = await verifyPassword(auth, password)
        if (!res.ok) {
          recordFail('owner')
          return "Login yoki parol noto'g'ri"
        }
        recordOk('owner')
        if (res.upgraded) set({ ownerAuth: res.upgraded })

        // Maxfiy kalitni xotiraga ochish
        let priv: JsonWebKey | null = null
        const { ownerKeys, ownerKeysEnc } = get()
        if (ownerKeysEnc) {
          try {
            priv = await decryptJsonWithPassword<JsonWebKey>(ownerKeysEnc, password)
          } catch {
            return "Kalitni ochib bo'lmadi — ma'lumotlar buzilgan"
          }
        } else if (ownerKeys?.privateJwk) {
          // Eski (shifrlanmagan) kalit — endi shifrlab qo'yamiz
          priv = ownerKeys.privateJwk
          const enc = await encryptJsonWithPassword(priv, password)
          set({ ownerKeys: { publicJwk: ownerKeys.publicJwk }, ownerKeysEnc: enc })
        } else {
          // Kalitlar umuman yo'q — yangi yaratamiz
          const keys = await generateOwnerKeys()
          priv = keys.privateJwk
          const enc = await encryptJsonWithPassword(priv, password)
          set({ ownerKeys: { publicJwk: keys.publicJwk }, ownerKeysEnc: enc })
        }
        set({ ownerPrivateJwk: priv, role: 'owner' })
        get().logAudit('Egasi kirdi', auth.login || 'egasi')
        void useProject.getState().switchScope('_owner_')
        return null
      },

      ownerChangeCredentials: async (currentPassword, newLogin, newPassword) => {
        const auth = get().ownerAuth
        if (!auth) return 'Egasi hisobi topilmadi'
        const res = await verifyPassword(auth, currentPassword)
        if (!res.ok) return "Joriy parol noto'g'ri"
        if (!newLogin.trim()) return 'Login kiriting'
        if (newPassword !== undefined && newPassword.length > 0 && newPassword.length < 4)
          return "Yangi parol kamida 4 belgi bo'lsin"

        const effectivePassword = newPassword || currentPassword
        const cred = await makeCred(newLogin, effectivePassword)

        // Parol o'zgarsa maxfiy kalit yangi parol bilan qayta shifrlanadi
        let priv = get().ownerPrivateJwk
        if (!priv && get().ownerKeysEnc) {
          try {
            priv = await decryptJsonWithPassword<JsonWebKey>(get().ownerKeysEnc!, currentPassword)
          } catch {
            return "Kalitni ochib bo'lmadi"
          }
        }
        if (priv) {
          const enc = await encryptJsonWithPassword(priv, effectivePassword)
          set({ ownerKeysEnc: enc, ownerPrivateJwk: priv })
        }
        set({ ownerAuth: cred })
        return null
      },

      /** Egasi tiklash kodi — mavjud parol bilan tasdiqlagach yangi kod yaratiladi.
       *  Maxfiy kalit shu kod bilan ikkinchi marta shifrlanadi (ownerKeysEncByRecovery).
       *  Kod faqat shu holda, 1 marta qaytariladi — admin uni Telegram, qog'oz, parol boshqaruvchida saqlashi kerak. */
      genOwnerRecoveryCode: async (currentPassword: string) => {
        const auth = get().ownerAuth
        if (!auth) throw new Error('Egasi hisobi topilmadi')
        const res = await verifyPassword(auth, currentPassword)
        if (!res.ok) throw new Error("Joriy parol noto'g'ri")
        // Maxfiy kalitni ochish
        let priv = get().ownerPrivateJwk
        if (!priv && get().ownerKeysEnc) {
          try {
            priv = await decryptJsonWithPassword<JsonWebKey>(get().ownerKeysEnc!, currentPassword)
          } catch {
            throw new Error("Kalitni ochib bo'lmadi")
          }
        }
        if (!priv) throw new Error("Kalit yo'q — hisobni qayta sozlang")
        const code = makeRecoveryCode()
        const normalized = code.replace(/[^A-Z0-9]/g, '').toUpperCase()
        const enc = await encryptJsonWithPassword({ priv, login: auth.login || 'egasi' }, normalized)
        set({ ownerKeysEncByRecovery: enc, ownerPrivateJwk: priv })
        get().logAudit('Egasi tiklash kodi yaratildi')
        return code
      },

      ownerRecoverWithCode: async (code, newLogin, newPassword) => {
        const encBy = get().ownerKeysEncByRecovery
        if (!encBy) return "Tiklash kodi o'rnatilmagan — admin kirgach «Hisob» da yarating"
        const rem = lockRemaining('owner')
        if (rem) return `Juda ko'p urinish — ${rem} soniyadan keyin qayta urining`
        if (!newLogin.trim()) return 'Yangi loginni kiriting'
        if (newPassword.length < 4) return "Yangi parol kamida 4 belgi bo'lsin"
        const normalized = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        let data: { priv: JsonWebKey; login: string }
        try {
          data = await decryptJsonWithPassword<{ priv: JsonWebKey; login: string }>(encBy, normalized)
        } catch {
          recordFail('owner')
          return "Tiklash kodi noto'g'ri"
        }
        recordOk('owner')
        // Yangi hisob + yangi parol bilan qayta shifrlash
        const cred = await makeCred(newLogin, newPassword)
        const enc = await encryptJsonWithPassword(data.priv, newPassword)
        const encRecNew = await encryptJsonWithPassword(
          { priv: data.priv, login: newLogin },
          normalized,
        )
        set({
          ownerAuth: cred,
          ownerKeysEnc: enc,
          ownerKeysEncByRecovery: encRecNew,
          ownerPrivateJwk: data.priv,
          role: 'owner',
        })
        get().logAudit('Egasi paroli tiklandi', newLogin)
        return null
      },

      // ---------------- Maktab hodimlari ----------------

      setupDirector: async (login, password) => {
        if (get().staff.director) return 'Direktor hisobi allaqachon mavjud'
        if (!login.trim()) return 'Login kiriting'
        if (password.length < 4) return "Parol kamida 4 belgi bo'lsin"
        const cred = await makeCred(login, password)
        const rec: StaffCred = {
          ...cred,
          machineSeal: get().machineCode,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ staff: { ...s.staff, director: rec }, role: 'director' }))
        get().logAudit('Zavuch hisobi yaratildi', login)
        return null
      },

      staffLogin: async (role, login, password) => {
        const cred = get().staff[role]
        if (!cred) {
          return role === 'director'
            ? 'Direktor hisobi hali yaratilmagan'
            : "O'TIBDO' hisobi yaratilmagan — Direktor «Hisob» bo'limida yaratadi"
        }
        if (!cred.active) return 'Bu hisob bloklangan — Direktorga murojaat qiling'
        if (cred.machineSeal !== get().machineCode) return 'Hisob boshqa qurilmada yaratilgan'
        const lkey = 'staff:' + role
        const rem = lockRemaining(lkey)
        if (rem) return `Juda ko'p urinish — ${rem} soniyadan keyin qayta urining`
        if (!sameLogin(cred.login, login)) {
          recordFail(lkey)
          return "Login yoki parol noto'g'ri"
        }
        const res = await verifyPassword(cred, password)
        if (!res.ok) {
          recordFail(lkey)
          return "Login yoki parol noto'g'ri"
        }
        recordOk(lkey)
        if (res.upgraded)
          set((s) => ({ staff: { ...s.staff, [role]: { ...cred, ...res.upgraded } } }))
        set({ role })
        get().logAudit('Kirish', (role === 'director' ? 'Zavuch' : "O'TIBDO'") + ': ' + login)
        const dirLogin = (role === 'director' ? cred.login : get().staff.director?.login) || 'staff'
        void useProject.getState().switchScope(`staff:${dirLogin.toLowerCase().trim()}`)
        return null
      },

      staffChangeCredentials: async (role, currentPassword, newLogin, newPassword) => {
        const cred = get().staff[role]
        if (!cred) return 'Hisob topilmadi'
        const res = await verifyPassword(cred, currentPassword)
        if (!res.ok) return "Joriy parol noto'g'ri"
        if (!newLogin.trim()) return 'Login kiriting'
        if (newPassword !== undefined && newPassword.length > 0 && newPassword.length < 4)
          return "Yangi parol kamida 4 belgi bo'lsin"
        const next = await makeCred(newLogin, newPassword || currentPassword)
        set((s) => ({ staff: { ...s.staff, [role]: { ...cred, ...next } } }))
        return null
      },

      setDeputyAccount: async (login, password) => {
        if (!login.trim()) return 'Login kiriting'
        if (password.length < 4) return "Parol kamida 4 belgi bo'lsin"
        const cred = await makeCred(login, password)
        const rec: StaffCred = {
          ...cred,
          machineSeal: get().machineCode,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ staff: { ...s.staff, deputy: rec } }))
        return null
      },

      setDeputyActive: (active) =>
        set((s) => ({
          staff: { ...s.staff, deputy: s.staff.deputy ? { ...s.staff.deputy, active } : null },
        })),

      removeDeputy: () => set((s) => ({ staff: { ...s.staff, deputy: null } })),

      genStaffRecoveryCode: async (role) => {
        const cred = get().staff[role]
        if (!cred) throw new Error('Hisob topilmadi')
        const code = makeRecoveryCode()
        const salt = makeSalt()
        const hash = await pbkdf2Hex(normalizeRecovery(code), salt)
        set((s) => ({
          staff: { ...s.staff, [role]: { ...cred, recovery: { salt, hash, iterations: PBKDF2_ITERATIONS } } },
        }))
        return code
      },

      resetStaffPasswordWithCode: async (role, code, newPassword) => {
        const cred = get().staff[role]
        if (!cred) return 'Hisob topilmadi'
        if (!cred.recovery) return "Bu hisob uchun tiklash kodi o'rnatilmagan"
        if (cred.machineSeal !== get().machineCode) return 'Hisob boshqa qurilmada yaratilgan'
        if (newPassword.length < 4) return "Yangi parol kamida 4 belgi bo'lsin"
        const lkey = 'recover:' + role
        const rem = lockRemaining(lkey)
        if (rem) return `Juda ko'p urinish — ${rem} soniyadan keyin qayta urining`
        const hash = await pbkdf2Hex(normalizeRecovery(code), cred.recovery.salt, cred.recovery.iterations)
        if (hash !== cred.recovery.hash) {
          recordFail(lkey)
          return "Tiklash kodi noto'g'ri"
        }
        recordOk(lkey)
        const next = await makeCred(cred.login, newPassword)
        // Parol yangilandi — tiklash kodi keyingi marta uchun amal qiladi; hodim istasa yangilaydi
        set((s) => ({ staff: { ...s.staff, [role]: { ...cred, ...next } }, role }))
        get().logAudit('Parol tiklash kodi bilan tiklandi', (role === 'director' ? 'Zavuch' : "O'TIBDO'") + ': ' + cred.login)
        return null
      },

      // ---------------- O'qituvchi / O'quvchi hisoblari ----------------

      createAccount: async (role, login, password, linkedId) => {
        if (!login.trim()) return 'Login kiriting'
        if (password.length < 4) return "Parol kamida 4 belgi bo'lsin"
        if (!linkedId) return role === 'teacher' ? "O'qituvchini tanlang" : 'Sinfni tanlang'
        if (get().accounts.some((a) => a.role === role && sameLogin(a.login, login)))
          return 'Bu login band'
        const cred = await makeCred(login, password)
        const acc: AccountCred = {
          ...cred,
          id: uid('acc_'),
          role,
          linkedId,
          machineSeal: get().machineCode,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ accounts: [...s.accounts, acc] }))
        get().logAudit((role === 'teacher' ? "O'qituvchi" : "O'quvchi") + ' hisobi yaratildi', login)
        return null
      },

      removeAccount: (id) => {
        const acc = get().accounts.find((a) => a.id === id)
        if (acc) get().logAudit('Hisob o\'chirildi', acc.login)
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }))
      },

      setAccountActive: (id, active) => {
        const acc = get().accounts.find((a) => a.id === id)
        if (acc) get().logAudit(active ? 'Hisob ochildi' : 'Hisob bloklandi', acc.login)
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, active } : a)) }))
      },

      resetAccountPassword: async (id, newPassword) => {
        const acc = get().accounts.find((a) => a.id === id)
        if (!acc) return 'Hisob topilmadi'
        if (newPassword.length < 4) return "Parol kamida 4 belgi bo'lsin"
        const next = await makeCred(acc.login, newPassword)
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...next } : a)) }))
        return null
      },

      accountLogin: async (role, login, password) => {
        const acc = get().accounts.find((a) => a.role === role && sameLogin(a.login, login))
        if (!acc)
          return role === 'teacher'
            ? "O'qituvchi hisobi topilmadi — Zavuch yaratadi"
            : "O'quvchi (sinf) hisobi topilmadi — Zavuch yaratadi"
        if (!acc.active) return 'Hisob bloklangan — Zavuchga murojaat qiling'
        if (acc.machineSeal !== get().machineCode) return 'Hisob boshqa qurilmada yaratilgan'
        const akey = 'acc:' + role + ':' + acc.login.toLowerCase()
        const rem = lockRemaining(akey)
        if (rem) return `Juda ko'p urinish — ${rem} soniyadan keyin qayta urining`
        const res = await verifyPassword(acc, password)
        if (!res.ok) {
          recordFail(akey)
          return "Login yoki parol noto'g'ri"
        }
        recordOk(akey)
        if (res.upgraded)
          set((s) => ({ accounts: s.accounts.map((a) => (a.id === acc.id ? { ...a, ...res.upgraded } : a)) }))
        set({ role, linkedId: acc.linkedId })
        get().logAudit('Kirish', (role === 'teacher' ? "O'qituvchi" : "O'quvchi") + ': ' + login)
        const dirLogin = get().staff.director?.login || 'staff'
        void useProject.getState().switchScope(`staff:${dirLogin.toLowerCase().trim()}`)
        return null
      },

      setSchoolBlocked: (id, blocked) =>
        set((s) => ({ schools: s.schools.map((x) => (x.licenseId === id ? { ...x, blocked } : x)) })),
      removeSchool: (id) => set((s) => ({ schools: s.schools.filter((x) => x.licenseId !== id) })),

      /** Yangi mijoz yozuvi — litsenziya kaliti yaratilmaydi, faqat admin lokal eslatma.
       *  Pro kaliti (ixtiyoriy) `key` orqali uzatiladi — mijoz Sozlamalar'da aktivlashtiradi. */
      addCustomer: ({ schoolName, director, phone, login, password, notes, plan, key }) => {
        const now = new Date()
        const rec: SchoolRecord = {
          licenseId: uid('CUS_'),
          schoolName: schoolName || 'Nomsiz maktab',
          director,
          phone,
          machineCode: '',
          plan: plan || 'Free',
          issuedAt: now.toISOString(),
          expiresAt: now.toISOString(),
          key: key || '',
          blocked: false,
          login,
          password,
          notes,
        }
        set((s) => ({ schools: [rec, ...s.schools] }))
        get().logAudit('customer:add', `${schoolName} / ${login}`)
      },
      updateCustomer: (id, patch) =>
        set((s) => ({ schools: s.schools.map((x) => (x.licenseId === id ? { ...x, ...patch } : x)) })),

      /** Admin qurilmasida direktor hisobini sozlash/qayta yozish.
       *  OwnerPanel'dan chaqiriladi: admin yangi mijoz qo'shsa yoki tahrirlasa —
       *  shu login/parol bilan DARHOL Zavuch rejimida kirib testlab ko'rishi mumkin. */
      provisionDirectorHere: async (login, password) => {
        if (!login.trim()) return 'Login kiriting'
        if (password.length < 4) return "Parol kamida 4 belgi bo'lsin"
        const cred = await makeCred(login, password)
        const rec: StaffCred = {
          ...cred,
          machineSeal: get().machineCode,
          active: true,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ staff: { ...s.staff, director: rec } }))
        get().logAudit('customer:provision-director', login)
        void useProject.getState().switchScope(`staff:${login.toLowerCase().trim()}`)
        return null
      },
      setOwnerContact: (patch) => set((s) => ({ ownerContact: { ...s.ownerContact, ...patch } })),

      logAudit: (action, detail) =>
        set((s) => ({
          audit: [{ id: uid('au_'), at: new Date().toISOString(), action, detail }, ...s.audit].slice(0, 200),
        })),
      clearAudit: () => set({ audit: [] }),
      // Litsenziya tizimi olib tashlandi — hech qanday tarif cheklovi yo'q
      planLimit: (kind) => {
        // Pro tier module'dan limit o'qiymiz — moddiy cheklovlar (free: 10 sinf, 15 o'qituvchi)
        try {
          // Dynamic import required because tier.ts depends on React (useSyncExternalStore).
          // We only need the pure getters here, so inline fallback.
          const v = localStorage.getItem('jadvalpro-tier')
          if (v === 'pro') return null
          // Free limits — synced with FREE_LIMITS in src/features/pro/tier.ts
          if (kind === 'classes') return 10
          if (kind === 'teachers') return 15
          return null
        } catch {
          return null
        }
      },

      roleLabel: () => {
        const r = get().role
        return r === 'owner'
          ? 'Admin'
          : r === 'director'
            ? 'Zavuch'
            : r === 'deputy'
              ? "O'TIBDO'"
              : r === 'teacher'
                ? "O'qituvchi"
                : r === 'student'
                  ? "O'quvchi"
                  : ''
      },
    }),
    {
      name: 'jadvalpro-auth-v2',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      migrate: (persisted: unknown, version) => {
        const s = persisted as Record<string, unknown>
        if (version === 0 && s) {
          // Eski 'user' roli endi 'director'; egasi roli saqlanmaydi (har safar login)
          if (s.role === 'user') s.role = 'director'
          if (s.role === 'owner') s.role = null
          // Eski ownerAuth'da login yo'q edi
          const oa = s.ownerAuth as Cred | null
          if (oa && !oa.login) oa.login = 'egasi'
          if (!s.staff) s.staff = { director: null, deputy: null }
        }
        // Litsenziya tizimi olib tashlandi — eski maydonlarni tashlab yuborish
        if (s) {
          delete s.license
          delete s.licenseError
          delete s.demoPublicJwk
        }
        return s
      },
      partialize: (s) => ({
        ownerKeys: s.ownerKeys,
        ownerKeysEnc: s.ownerKeysEnc,
        ownerKeysEncByRecovery: s.ownerKeysEncByRecovery,
        ownerAuth: s.ownerAuth,
        staff: s.staff,
        accounts: s.accounts,
        // Egasi roli saqlanmaydi — qayta ochganda login talab qilinadi
        role: s.role === 'owner' ? null : s.role,
        linkedId: s.linkedId,
        schools: s.schools,
        ownerContact: s.ownerContact,
        audit: s.audit,
      }),
    },
  ),
)

