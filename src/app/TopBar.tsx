import { useEffect, useState } from 'react'
import { Menu, Minus, Square, X, LogOut, Search, Send, Save, Cloud, CloudOff, AlertTriangle, Clock, Home } from 'lucide-react'
import { WelcomeLauncher } from '@/features/dashboard/WelcomeLauncher'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { APP_VERSION, FILE_VERSION } from '@/constants'
import { cx, telegramUrl } from '@/utils'
import { useT } from '@/i18n'
import {
  isCloudSignedIn,
  getStoredUser,
  getLastSyncAt,
  uploadSnapshot,
} from '@/features/cloud/api'
import { useTier } from '@/features/pro/tier'
import { ProBadge } from '@/features/pro/ProBadge'
import { useExpiry } from '@/features/pro/useExpiry'

export function TopBar() {
  const toggleSidebar = useUI((s) => s.toggleSidebar)
  const mobileSidebarOpen = useUI((s) => s.mobileSidebarOpen)
  const setMobileSidebarOpen = useUI((s) => s.setMobileSidebarOpen)
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const role = useAuth((s) => s.role)
  const logout = useAuth((s) => s.logout)
  const ownerContact = useAuth((s) => s.ownerContact)
  const dirty = useProject((s) => s.dirty)
  const savedAt = useProject((s) => s.project.meta?.savedAt)
  const toast = useToast()
  const t = useT()

  const [welcomeOpen, setWelcomeOpen] = useState(false)

  // Oxirgi saqlangandan beri necha daqiqa — har 30s'da yangilash
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const relativeTime = (ms: number | null | undefined) => {
    if (!ms) return null
    const mins = Math.floor((Date.now() - ms) / 60_000)
    if (mins < 1) return t('hozirgina')
    if (mins < 60) return `${mins} ${t('daqiqa oldin')}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ${t('soat oldin')}`
    return `${Math.floor(hours / 24)} ${t('kun oldin')}`
  }

  const savedLabel = (() => {
    void tick
    return savedAt ? relativeTime(new Date(savedAt).getTime()) : null
  })()

  // Bulut sinxronizatsiya ko'rsatkichi
  const [cloudTick, setCloudTick] = useState(0)
  useEffect(() => {
    const onSync = () => setCloudTick((v) => v + 1)
    window.addEventListener('jadvalpro-cloud-sync', onSync)
    return () => window.removeEventListener('jadvalpro-cloud-sync', onSync)
  }, [])
  const cloudReady = isCloudSignedIn() && Boolean(getStoredUser()?.school_id)
  const cloudSyncLabel = (() => {
    void cloudTick
    void tick
    if (!cloudReady) return null
    return relativeTime(getLastSyncAt()) ?? t('hali yuborilmagan')
  })()

  const [cloudBusy, setCloudBusy] = useState(false)
  const syncCloudNow = async () => {
    if (cloudBusy) return
    setCloudBusy(true)
    try {
      const project = useProject.getState().project
      const payload = {
        ...project,
        meta: { appVersion: APP_VERSION, savedAt: new Date().toISOString(), fileVersion: FILE_VERSION },
      }
      await uploadSnapshot(`Qo'lda · ${new Date().toLocaleString()}`, payload)
      toast.success(t('Bulutga yuborildi'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setCloudBusy(false)
    }
  }

  const contactAdmin = () => {
    const url = telegramUrl(ownerContact.telegram)
    if (!url) {
      toast.error(t("Admin aloqa ma'lumoti kiritilmagan"))
      return
    }
    window.open(url, '_blank')
  }

  const expiry = useExpiry()

  const label =
    role === 'owner'
      ? '👑 Admin (Boshqaruv)'
      : role === 'director'
        ? '🧑‍💼 Zavuch'
        : role === 'deputy'
          ? "🧑‍💼 O'TIBDO'"
          : role === 'teacher'
            ? "🎓 O'qituvchi"
            : "👩‍🎓 O'quvchi"

  return (
    <>
    {/* Muddat tugagan — faqat ko'rish rejimi banneri */}
    {expiry.isExpired && (
      <div className="no-print flex h-9 shrink-0 items-center justify-center gap-2 bg-danger text-white text-sm font-semibold select-none">
        <AlertTriangle size={16} />
        <span>{t("Muddat tugagan — faqat ko'rish rejimi")}</span>
      </div>
    )}
    {/* Muddat yaqinlashmoqda — hisob-kitob banneri */}
    {!expiry.isExpired && expiry.isWarning && (
      <div className={cx(
        'no-print flex h-9 shrink-0 items-center justify-center gap-2 text-sm font-semibold select-none',
        expiry.daysLeft <= 1
          ? 'bg-danger/90 text-white'
          : 'bg-amber-500/90 text-white',
      )}>
        <Clock size={16} />
        <span>{t('Muddat yakunlanmoqda')}: {expiry.countdownText}</span>
      </div>
    )}
    <header className="no-print flex h-11 shrink-0 items-center gap-1 border-b border-border bg-surface px-1.5 select-none sm:px-2">
      {/* Hamburger: mobilda sidebar overlay ochadi, desktopda collapse qiladi */}
      <button
        onClick={() => {
          toggleSidebar()
          setMobileSidebarOpen(!mobileSidebarOpen)
        }}
        className="btn btn-ghost h-9 px-2"
        title="Bosh menyu (yon panel)"
      >
        <Menu size={18} />
        <span className="hidden text-sm font-semibold sm:inline">{t('Bosh menyu')}</span>
      </button>

      {/* Boshlang'ich oyna — Yangi/Ochish/Namuna/Davom etish */}
      {role !== 'teacher' && role !== 'student' && role !== 'owner' && (
        <button
          onClick={() => setWelcomeOpen(true)}
          className="btn btn-ghost h-9 px-2 text-accent"
          title={t("Boshlang'ich oyna — Yangi, Ochish, Namuna")}
        >
          <Home size={16} />
          <span className="hidden text-sm font-semibold md:inline">{t("Boshlang'ich")}</span>
        </button>
      )}

      <div className="mx-1 hidden h-5 w-px bg-border sm:mx-2 sm:block" />

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent text-accent-fg text-xs font-black">J</div>
        <span className="truncate text-sm font-semibold">
          JadvalPro <span className="hidden text-muted sm:inline">— Dars jadvali</span>
        </span>
      </div>

      {/* Qidirish — mobilda faqat ikonka, desktopda to'liq */}
      <button
        onClick={() => setSearchOpen(true)}
        className="btn btn-ghost ml-1 h-8 w-8 shrink-0 p-0 text-muted sm:ml-4 sm:hidden"
        title="Qidirish"
      >
        <Search size={16} />
      </button>
      <button
        onClick={() => setSearchOpen(true)}
        className="ml-4 hidden h-8 items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 text-muted transition-colors hover:border-accent/40 hover:text-ink sm:flex"
        title="Qidirish (Ctrl+F)"
      >
        <Search size={15} />
        <span className="hidden text-xs lg:inline">{t('Qidirish...')}</span>
        <kbd className="hidden rounded border border-border bg-surface px-1 text-[10px] lg:inline">Ctrl F</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {role !== 'teacher' && role !== 'student' && role !== 'owner' && savedLabel && (
          <span
            className={cx(
              'hidden items-center gap-1 rounded-md px-2 py-0.5 text-xs lg:inline-flex',
              dirty ? 'bg-warn/15 text-warn' : 'bg-ok/10 text-ok',
            )}
            title={dirty
              ? t("Saqlanmagan o'zgarishlar bor — «Saqlash» tugmasini bosing")
              : `${t('Oxirgi saqlash')}: ${savedLabel}`
            }
          >
            <Save size={12} />
            {dirty ? t("saqlanmagan") : savedLabel}
          </span>
        )}
        {role !== 'teacher' && role !== 'student' && role !== 'owner' && cloudReady && (
          <button
            onClick={syncCloudNow}
            disabled={cloudBusy}
            className="hidden items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent transition-colors hover:bg-accent/20 disabled:opacity-50 lg:inline-flex"
            title={`${t('Bulutga oxirgi yuborish')}: ${cloudSyncLabel} · ${t('Hozir yuborish uchun bosing')}`}
          >
            <Cloud size={12} />
            {cloudSyncLabel}
          </button>
        )}
        {role !== 'teacher' && role !== 'student' && role !== 'owner' && !cloudReady && isCloudSignedIn() && (
          <span
            className="hidden items-center gap-1 rounded-md bg-muted/10 px-2 py-0.5 text-xs text-muted lg:inline-flex"
            title={t('Bulutga ulangan, lekin maktab yo‘q')}
          >
            <CloudOff size={12} />
          </span>
        )}
        {ownerContact.telegram && role !== 'owner' && (
          <button
            onClick={contactAdmin}
            className="btn btn-ghost h-9 px-2.5 text-[#2AABEE] hover:bg-[#2AABEE]/10"
            title={t('Adminga Telegramda yozish')}
          >
            <Send size={16} />
            <span className="hidden sm:inline">{t('Adminga yozish')}</span>
          </button>
        )}
        {role !== 'owner' && <ProChip />}
        <span className="chip hidden md:inline-flex">{label}</span>
        <button
          onClick={() => {
            logout()
            toast.info(t('Tizimdan chiqdingiz'))
          }}
          className="btn btn-ghost h-9 px-2.5 text-danger"
          title={t('Chiqish')}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">{t('Chiqish')}</span>
        </button>
        <span className="hidden text-xs text-muted xl:inline">{APP_VERSION}</span>
        <div className="ml-1 hidden items-center gap-0.5 sm:flex">
          <WinBtn><Minus size={14} /></WinBtn>
          <WinBtn><Square size={11} /></WinBtn>
          <WinBtn danger><X size={14} /></WinBtn>
        </div>
      </div>
    </header>
    {welcomeOpen && <WelcomeLauncher onClose={() => setWelcomeOpen(false)} />}
    </>
  )
}

function ProChip() {
  const tier = useTier()
  const setActivePanel = useUI((s) => s.setActivePanel)
  if (tier === 'pro') {
    return (
      <button
        onClick={() => setActivePanel('settings')}
        className="hidden md:inline-flex"
        title="Pro versiya faol — Sozlamalarda ko'rish"
      >
        <ProBadge size="sm" />
      </button>
    )
  }
  return (
    <button
      onClick={() => setActivePanel('settings')}
      className="hidden items-center gap-1 rounded-md border border-amber-400/40 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200 md:inline-flex dark:bg-amber-900/30 dark:text-amber-200"
      title="Pro aktivatsiya kalit kiriting"
    >
      ✨ Upgrade
    </button>
  )
}

function WinBtn({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      className={cx(
        'grid h-8 w-9 place-items-center rounded-md text-muted transition-colors',
        danger ? 'hover:bg-danger hover:text-white' : 'hover:bg-surface-2',
      )}
      tabIndex={-1}
    >
      {children}
    </button>
  )
}
