import { useEffect, useState } from 'react'
import { ArrowLeft, Home } from 'lucide-react'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { panelsForRole, findPanel } from './panels'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { PanelHost } from './PanelHost'
import { SearchPalette } from './SearchPalette'
import { WelcomeLauncher } from '@/features/dashboard/WelcomeLauncher'
import { useT } from '@/i18n'

export function Shell() {
  const zoom = useUI((s) => s.zoom)
  const role = useUI((s) => s.role)
  const activePanel = useUI((s) => s.activePanel)
  const history = useUI((s) => s.history)
  const setRole = useUI((s) => s.setRole)
  const setActivePanel = useUI((s) => s.setActivePanel)
  const back = useUI((s) => s.back)
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const authRole = useAuth((s) => s.role)

  const [welcome, setWelcome] = useState(() => {
    try {
      return !sessionStorage.getItem('jadvalpro-welcome')
    } catch {
      return false
    }
  })
  const dismissWelcome = () => {
    try {
      sessionStorage.setItem('jadvalpro-welcome', '1')
    } catch {
      /* ignore */
    }
    setWelcome(false)
  }

  // Rolni auth'dan sinxronlash
  useEffect(() => {
    if (authRole && authRole !== role) setRole(authRole)
  }, [authRole, role, setRole])

  // Faol panel joriy rolga tegishli bo'lishini ta'minlash
  useEffect(() => {
    const ids = panelsForRole(role).flatMap((g) => g.panels.map((p) => p.id))
    if (!ids.includes(activePanel)) setActivePanel(ids[0] ?? 'dashboard')
  }, [role, activePanel, setActivePanel])

  // Ctrl+F / Ctrl+K — tezkor qidiruv
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'k')) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  const t = useT()
  const home = role === 'owner' ? 'owner' : 'dashboard'
  const label = findPanel(activePanel)?.label ?? ''
  const isHome = activePanel === home

  // Mobil brauzerda `100vh` adres paneli bilan noto'g'ri ishlaydi — `100dvh` dinamik
  // viewport ishlatiladi. Zoom = 100 bo'lsa — hech qanday CSS zoom qo'llanilmaydi
  // (ba'zi mobil brauzerlarda zoom scroll'ni buzadi).
  const applyZoom = zoom !== 100
  return (
    <div className="jadvalpro-shell flex flex-col bg-bg" style={{ height: '100dvh' }}>
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Orqaga paneli */}
          <div className="no-print flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface/60 px-3 backdrop-blur">
            <button
              onClick={back}
              disabled={history.length === 0}
              className="btn btn-ghost hover-lift h-7 px-2 text-sm disabled:opacity-40"
              title="Orqaga"
            >
              <ArrowLeft size={16} /> {t('Orqaga')}
            </button>
            {!isHome && (
              <button onClick={() => setActivePanel(home)} className="btn btn-ghost h-7 w-7 p-0" title="Bosh sahifa">
                <Home size={15} />
              </button>
            )}
            <span className="text-sm text-muted">/</span>
            <span className="text-sm font-medium">{t(label)}</span>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {applyZoom ? (
              <div style={{ zoom: zoom / 100 }}>
                <PanelHost />
              </div>
            ) : (
              <PanelHost />
            )}
          </div>
        </main>
      </div>
      <StatusBar />
      <SearchPalette />
      {welcome && <WelcomeLauncher onClose={dismissWelcome} />}
    </div>
  )
}
