// JadvalPro — bulut (FastAPI backend) API mijozi.
// Barcha chaqiriqlar fetch asosida, Authorization: Bearer <jwt> header bilan.

const LS_URL = 'jadvalpro-cloud-url'
const LS_TOKEN = 'jadvalpro-cloud-token'
const LS_USER = 'jadvalpro-cloud-user'
const LS_LAST_SYNC = 'jadvalpro-cloud-last-sync'
const LS_AUTOSYNC = 'jadvalpro-cloud-autosync'

export interface CloudUser {
  id: number
  login: string
  role: string
  full_name?: string | null
  school_id?: number | null
  active: boolean
}

export interface CloudLoginResponse {
  access_token: string
  token_type: string
  user: CloudUser
}

export interface CloudSnapshot {
  id: number
  school_id: number
  label?: string | null
  size_bytes: number
  created_by?: string | null
  created_at: string
}

export interface GenerationJob {
  id: string
  school_id: number
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled'
  progress: number
  message?: string | null
  result_json?: string | null
  created_at: string
  updated_at: string
}

export function getCloudUrl(): string {
  return localStorage.getItem(LS_URL) || (import.meta.env.VITE_API_URL as string) || ''
}

export function setCloudUrl(url: string): void {
  if (url) localStorage.setItem(LS_URL, url.replace(/\/+$/, ''))
  else localStorage.removeItem(LS_URL)
}

export function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN)
}

export function setToken(t: string | null): void {
  if (t) localStorage.setItem(LS_TOKEN, t)
  else localStorage.removeItem(LS_TOKEN)
}

export function getStoredUser(): CloudUser | null {
  const raw = localStorage.getItem(LS_USER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CloudUser
  } catch {
    return null
  }
}

export function setStoredUser(u: CloudUser | null): void {
  if (u) localStorage.setItem(LS_USER, JSON.stringify(u))
  else localStorage.removeItem(LS_USER)
}

export function isCloudConfigured(): boolean {
  return Boolean(getCloudUrl())
}

export function isCloudSignedIn(): boolean {
  return Boolean(getToken() && getStoredUser())
}

export function getLastSyncAt(): number | null {
  const v = localStorage.getItem(LS_LAST_SYNC)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function setLastSyncAt(ts: number | null): void {
  if (ts) localStorage.setItem(LS_LAST_SYNC, String(ts))
  else localStorage.removeItem(LS_LAST_SYNC)
  // notify same-tab listeners (storage event only fires cross-tab)
  try {
    window.dispatchEvent(new CustomEvent('jadvalpro-cloud-sync', { detail: ts }))
  } catch {
    /* no-op */
  }
}

export function isAutoSyncEnabled(): boolean {
  // Enabled by default when cloud is signed in; user can disable in Settings.
  const raw = localStorage.getItem(LS_AUTOSYNC)
  return raw === null ? true : raw === '1'
}

export function setAutoSyncEnabled(on: boolean): void {
  localStorage.setItem(LS_AUTOSYNC, on ? '1' : '0')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getCloudUrl()
  if (!base) throw new Error('Bulut server URL kiritilmagan')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, { ...init, headers })
  // Login so'rovida 401 = "login/parol noto'g'ri" (sessiya tugagani emas) — server xabarini ko'rsatamiz
  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    setToken(null)
    setStoredUser(null)
    throw new Error('Qayta kirish talab qilinadi')
  }
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.detail || JSON.stringify(body)
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`${res.status} ${detail}`.trim())
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function login(loginName: string, password: string): Promise<CloudLoginResponse> {
  const resp = await request<CloudLoginResponse>('/api/auth/login-json', {
    method: 'POST',
    body: JSON.stringify({ login: loginName, password }),
  })
  setToken(resp.access_token)
  setStoredUser(resp.user)
  return resp
}

export async function register(data: {
  login: string
  password: string
  role?: string
  full_name?: string
  school_name?: string
}): Promise<CloudLoginResponse> {
  const resp = await request<CloudLoginResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ role: 'director', ...data }),
  })
  setToken(resp.access_token)
  setStoredUser(resp.user)
  return resp
}

export function signOut(): void {
  setToken(null)
  setStoredUser(null)
}

export async function health(): Promise<{ status: string; service: string; version: string }> {
  const base = getCloudUrl()
  if (!base) throw new Error('URL yo‘q')
  const res = await fetch(`${base}/health`)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// --- Snapshots (full project backup) ---

export const listSnapshots = () => request<CloudSnapshot[]>('/api/sync/snapshots')

export const uploadSnapshot = async (label: string, data: unknown): Promise<CloudSnapshot> => {
  const res = await request<CloudSnapshot>('/api/sync/snapshots', {
    method: 'POST',
    body: JSON.stringify({ label, data }),
  })
  setLastSyncAt(Date.now())
  return res
}

export const downloadSnapshot = (id: number) =>
  request<Record<string, unknown>>(`/api/sync/snapshots/${id}/raw`)

export const deleteSnapshot = (id: number) =>
  request<void>(`/api/sync/snapshots/${id}`, { method: 'DELETE' })

// --- Server-side generation ---

export const startGeneration = (options: Record<string, unknown> = {}) =>
  request<GenerationJob>('/api/generator/start', {
    method: 'POST',
    body: JSON.stringify({ options }),
  })

export const getJob = (jobId: string) =>
  request<GenerationJob>(`/api/generator/jobs/${jobId}`)

export const cancelJob = (jobId: string) =>
  request<GenerationJob>(`/api/generator/jobs/${jobId}/cancel`, { method: 'POST' })

export interface DirectGenResult {
  entries: Array<Record<string, unknown>>
  stats: { placed: number; totalSessions: number; unplaced: number; seed: number }
  seed: number | null
}

export const generateDirect = (project: unknown, options: Record<string, unknown> = {}) =>
  request<DirectGenResult>('/api/generator/run-direct', {
    method: 'POST',
    body: JSON.stringify({ project, options }),
  })

// --- Customers (admin) ---

export interface CloudCustomer {
  id: number
  name: string
  director?: string | null
  phone?: string | null
  region?: string | null
  login?: string | null
  password_plain?: string | null
  plan?: string | null
  notes?: string | null
  active: boolean
  expires_at?: string | null
  school_id?: number | null
  created_at: string
}

/** Server xabaridan "401 " kabi status prefiksini olib tashlaydi (foydalanuvchiga ko'rsatish uchun) */
export function cloudErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/^\d{3}\s+/, '')
}

/** Server bilan aloqa umuman o'rnatilmadimi (internet yo'q / server yetib bo'lmaydi) */
export function isCloudNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /failed to fetch|networkerror|load failed|network request failed|kiritilmagan/i.test(msg)
}

export const listCustomers = () => request<CloudCustomer[]>('/api/customers')

export const createCustomer = (data: Partial<CloudCustomer>) =>
  request<CloudCustomer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateCustomer = (id: number, data: Partial<CloudCustomer>) =>
  request<CloudCustomer>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteCustomer = (id: number) =>
  request<void>(`/api/customers/${id}`, { method: 'DELETE' })
