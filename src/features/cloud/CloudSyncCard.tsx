import { useEffect, useState } from 'react'
import { Cloud, CloudOff, CloudUpload, CloudDownload, LogIn, LogOut, Trash2, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { useToast } from '@/store/toast'
import { useT } from '@/i18n'
import { useProject } from '@/store/project'
import { APP_VERSION, FILE_VERSION } from '@/constants'
import type { Project } from '@/types'
import { defaultProject } from '@/data/factories'
import {
  getCloudUrl,
  setCloudUrl,
  isCloudSignedIn,
  getStoredUser,
  login as cloudLogin,
  register as cloudRegister,
  signOut as cloudSignOut,
  health as cloudHealth,
  listSnapshots,
  uploadSnapshot,
  downloadSnapshot,
  deleteSnapshot,
  type CloudSnapshot,
  type CloudUser,
} from './api'

type Status = 'idle' | 'checking' | 'ok' | 'error'

export function CloudSyncCard() {
  const t = useT()
  const toast = useToast()
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)

  const [url, setUrl] = useState(getCloudUrl())
  const [user, setUser] = useState<CloudUser | null>(getStoredUser())
  const [status, setStatus] = useState<Status>('idle')
  const [statusInfo, setStatusInfo] = useState('')
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>([])

  const signedIn = Boolean(user) && isCloudSignedIn()
  const hasSchool = Boolean(user?.school_id)

  async function refreshStatus() {
    if (!url) {
      setStatus('idle')
      setStatusInfo('')
      return
    }
    setStatus('checking')
    try {
      const h = await cloudHealth()
      setStatus('ok')
      setStatusInfo(`${h.service} v${h.version}`)
    } catch (e) {
      setStatus('error')
      setStatusInfo(e instanceof Error ? e.message : String(e))
    }
  }

  async function refreshSnapshots() {
    if (!signedIn || !hasSchool) {
      setSnapshots([])
      return
    }
    try {
      setSnapshots(await listSnapshots())
    } catch (e) {
      // owner (admin) has no school → 400; just show empty list, not a toast.
      setSnapshots([])
      if (!/400/.test(String(e))) {
        toast.error(e instanceof Error ? e.message : String(e))
      }
    }
  }

  useEffect(() => {
    refreshStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  useEffect(() => {
    refreshSnapshots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  function saveUrl() {
    setCloudUrl(url.trim())
    toast.success(t('Bulut server URL saqlandi'))
    refreshStatus()
  }

  async function handleLogin() {
    if (!loginName || !password) {
      toast.error(t('Login va parolni kiriting'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        const resp = await cloudRegister({
          login: loginName,
          password,
          role: 'director',
          school_name: schoolName || `${loginName} maktabi`,
        })
        setUser(resp.user)
        toast.success(t("Hisob yaratildi va kirildi"))
      } else {
        const resp = await cloudLogin(loginName, password)
        setUser(resp.user)
        toast.success(t('Bulutga kirildi'))
      }
      setPassword('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function handleSignOut() {
    cloudSignOut()
    setUser(null)
    setSnapshots([])
    toast.info(t('Bulutdan chiqildi'))
  }

  async function handleUpload() {
    setBusy(true)
    try {
      const payload: Project = {
        ...project,
        meta: { appVersion: APP_VERSION, savedAt: new Date().toISOString(), fileVersion: FILE_VERSION },
      }
      const label = `${project.school.name || 'Jadval'} — ${new Date().toLocaleString()}`
      await uploadSnapshot(label, payload)
      toast.success(t('Bulutga saqlandi'))
      refreshSnapshots()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload(id: number) {
    if (!confirm(t('Joriy loyiha ustiga yoziladi. Davom etasizmi?'))) return
    setBusy(true)
    try {
      const data = (await downloadSnapshot(id)) as Partial<Project>
      const base = defaultProject()
      const next: Project = {
        meta: data.meta ?? base.meta,
        school: { ...base.school, ...(data.school ?? {}) },
        classes: data.classes ?? [],
        subjects: data.subjects ?? [],
        rooms: data.rooms ?? [],
        teachers: data.teachers ?? [],
        lessons: data.lessons ?? [],
        timetables: data.timetables ?? [],
        settings: { ...base.settings, ...(data.settings ?? {}) },
      }
      setProject(next)
      toast.success(t('Bulutdan yuklandi'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("O'chirilsinmi?"))) return
    try {
      await deleteSnapshot(id)
      toast.success(t("O'chirildi"))
      refreshSnapshots()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/12 text-accent">
          {signedIn ? <Cloud size={17} /> : <CloudOff size={17} />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{t('Bulut sinxronizatsiya')}</h2>
          <p className="text-xs text-muted">{t('Loyihani bulutga saqlab, boshqa qurilmadan ocha olasiz')}</p>
        </div>
        {status === 'ok' && (
          <span className="chip text-xs text-success"><Check size={13} /> {t('Ulandi')}</span>
        )}
        {status === 'error' && (
          <span className="chip text-xs text-danger" title={statusInfo}><AlertCircle size={13} /> {t('Xato')}</span>
        )}
      </div>

      {/* URL */}
      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-muted">{t('Server URL')}</span>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:8000"
            className="input flex-1"
          />
          <button onClick={saveUrl} className="btn btn-outline">{t('Saqlash')}</button>
          <button onClick={refreshStatus} className="btn btn-ghost" title={t('Tekshirish')}><RefreshCw size={15} /></button>
        </div>
        {statusInfo && status !== 'ok' && (
          <p className="mt-1 text-xs text-danger">{statusInfo}</p>
        )}
      </label>

      {!signedIn ? (
        <>
          <div className="mb-3 flex gap-1">
            <button
              onClick={() => setMode('login')}
              className={mode === 'login' ? 'btn btn-accent h-8' : 'btn btn-ghost h-8'}
            >
              {t('Kirish')}
            </button>
            <button
              onClick={() => setMode('register')}
              className={mode === 'register' ? 'btn btn-accent h-8' : 'btn btn-ghost h-8'}
            >
              {t('Ro‘yxatdan o‘tish')}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder={t('Login')}
              className="input"
              autoComplete="username"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('Parol')}
              className="input"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {mode === 'register' && (
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder={t('Maktab nomi')}
                className="input sm:col-span-2"
              />
            )}
          </div>
          <button onClick={handleLogin} disabled={busy || status !== 'ok'} className="btn btn-accent mt-3 w-full">
            <LogIn size={15} />
            {mode === 'register' ? t("Ro'yxatdan o'tish") : t('Kirish')}
          </button>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
            <div className="text-sm">
              <div className="font-medium">{user?.full_name || user?.login}</div>
              <div className="text-xs text-muted">{user?.role} · {t('ID')} {user?.id}</div>
            </div>
            <button onClick={handleSignOut} className="btn btn-ghost h-8"><LogOut size={14} /> {t('Chiqish')}</button>
          </div>

          {!hasSchool && (
            <div className="mb-3 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-3 text-xs text-muted">
              <AlertCircle size={14} className="mb-1 inline-block" />
              {' '}
              {t('Admin hisobida maktab yo‘q — sinxronizatsiya faqat direktor hisobi uchun')}
            </div>
          )}

          {hasSchool && (
            <div className="mb-3 flex gap-2">
              <button onClick={handleUpload} disabled={busy} className="btn btn-accent flex-1">
                <CloudUpload size={15} /> {t('Bulutga saqlash')}
              </button>
              <button onClick={refreshSnapshots} disabled={busy} className="btn btn-ghost" title={t('Yangilash')}>
                <RefreshCw size={15} />
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-xs text-muted">{t('Bulutdagi nusxalar')} ({snapshots.length})</div>
            {snapshots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                {t('Hali bulutga nusxa yuklanmagan')}
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {snapshots.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 bg-surface px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1 truncate">
                      <div className="truncate font-medium">{s.label || `#${s.id}`}</div>
                      <div className="text-xs text-muted">
                        {new Date(s.created_at).toLocaleString()} · {(s.size_bytes / 1024).toFixed(1)} KB
                        {s.created_by && ` · ${s.created_by}`}
                      </div>
                    </div>
                    <button onClick={() => handleDownload(s.id)} className="btn btn-ghost h-8" title={t('Yuklab olish')}>
                      <CloudDownload size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="btn btn-ghost h-8 text-danger" title={t("O'chirish")}>
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
