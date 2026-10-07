import { useEffect, useState } from 'react'
import { Menu, Minus, Square, X, LogOut, Search, Send, Save } from 'lucide-react'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { APP_VERSION } from '@/constants'
import { cx, telegramUrl } from '@/utils'
import { useT } from '@/i18n'

export function TopBar() {
  const toggleSidebar = useUI((s) => s.toggleSidebar)
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const role = useAuth((s) => s.role)
  const logout = useAuth((s) => s.logout)
  const ownerContact = useAuth((s) => s.ownerContact)
  const dirty = useProject((s) => s.dirty)
  const savedAt = useProject((s) => s.project.meta?.savedAt)
  const toast = useToast()
  const t = useT()

  // Oxirgi saqlangandan beri necha daqiqa — har 30s'da yangilash
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const savedLabel = (() => {
    void tick
    if (!savedAt) return null
    const mins = Math.floor((Date.now() - new Date(savedAt).getTime()) / 60_000)
    if (mins < 1) return t('hozirgina')
    if (mins < 60) return `${mins} ${t('daqiqa oldin')}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ${t('soat oldin')}`
    return `${Math.floor(hours / 24)} ${t('kun oldin')}`
  })()

  const contactAdmin = () => {
    const url = telegramUrl(ownerContact.telegram)
    if (!url) {
      toast.error(t("Admin aloqa ma'lumoti kiritilmagan"))
      return
    }
    window.open(url, '_blank')
  }

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
    <header className="no-print flex h-11 shrink-0 items-center gap-1 border-b border-border bg-surface px-2 select-none">
      <button onClick={toggleSidebar} className="btn btn-ghost h-9 px-2.5" title="Bosh menyu (yon panel)">
        <Menu size={18} />
        <span className="hidden text-sm font-semibold sm:inline">{t('Bosh menyu')}</span>
      </button>

      <div className="mx-2 h-5 w-px bg-border" />

      <div className="flex items-center gap-2">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg text-xs font-black">J</div>
        <span className="text-sm font-semibold">
          JadvalPro <span className="text-muted">— Dars jadvali</span>
        </span>
      </div>

      <button
        onClick={() => setSearchOpen(true)}
        className="ml-4 hidden h-8 items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 text-muted transition-colors hover:border-accent/40 hover:text-ink sm:flex"
        title="Qidirish (Ctrl+F)"
      >
        <Search size={15} />
        <span className="hidden text-xs lg:inline">{t('Qidirish...')}</span>
        <kbd className="hidden rounded border border-border bg-surface px-1 text-[10px] lg:inline">Ctrl F</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
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
