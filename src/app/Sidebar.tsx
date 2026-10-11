import { useUI } from '@/store/ui'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { saveProjectToFile, openProjectFromFile } from '@/io/projectFile'
import { panelsForRole } from './panels'
import { cx } from '@/utils'
import { useT } from '@/i18n'

export function Sidebar() {
  const { role, activePanel, setActivePanel, sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useUI()
  const t = useT()
  const groups = panelsForRole(role)
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const markSaved = useProject((s) => s.markSaved)
  const toast = useToast()

  const handleClick = async (id: string) => {
    if (id === 'save') {
      saveProjectToFile(project)
      markSaved()
      toast.success('Loyiha saqlandi')
      return
    }
    if (id === 'open') {
      try {
        const p = await openProjectFromFile()
        if (!p) return
        setProject(p)
        toast.success('Loyiha ochildi')
      } catch (e) {
        toast.error((e as Error).message)
      }
      return
    }
    setActivePanel(id)
    // Mobilda navigatsiyadan keyin panelni yopish
    setMobileSidebarOpen(false)
  }

  return (
    <nav
      className={cx(
        'no-print shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-sidebar py-2 transition-[width] duration-200',
        // Mobil: odatda yashirin, mobileSidebarOpen bo'lsa overlay sifatida ko'rinadi
        mobileSidebarOpen
          ? 'fixed inset-y-0 left-0 z-50 flex w-64 shadow-xl sm:relative sm:z-auto sm:shadow-none'
          : 'hidden sm:flex',
        // Desktop kengligi (sm+)
        sidebarCollapsed ? 'sm:w-16' : 'sm:w-16 md:w-44',
      )}
    >
      {groups.map((g, gi) => (
        <div key={g.id}>
          {gi > 0 && <div className="mx-3 my-1.5 h-px bg-border/70" />}
          <ul className="px-2">
            {g.panels.map((p) => {
              const Icon = p.icon
              const active = activePanel === p.id
              return (
                <li key={p.id}>
                  <button
                    onClick={() => handleClick(p.id)}
                    title={t(p.label)}
                    className={cx(
                      'side-btn group my-0.5 flex w-full rounded-lg',
                      // Mobil overlay: gorizontal tartib; Desktop: vertikal tartib
                      mobileSidebarOpen
                        ? 'flex-row items-center gap-3 px-3 py-2.5 text-left sm:flex-col sm:items-center sm:gap-1 sm:px-1 sm:py-2 sm:text-center'
                        : 'flex-col items-center gap-1 px-1 py-2 text-center',
                      active
                        ? 'side-btn-active bg-accent/15 text-accent'
                        : 'text-ink/80 hover:bg-accent/10 hover:text-accent',
                    )}
                  >
                    <Icon
                      size={22}
                      className={cx('shrink-0 transition-transform', active && 'scale-110')}
                      strokeWidth={active ? 2.4 : 1.9}
                    />
                    {!sidebarCollapsed && (
                      <span
                        className={cx(
                          'text-[11px] font-medium leading-tight',
                          // Mobil overlay: har doim ko'rinadi; Desktop: faqat md+ da
                          mobileSidebarOpen ? 'block text-sm sm:text-[11px] sm:hidden md:block' : 'hidden md:block',
                        )}
                      >
                        {t(p.label)}
                      </span>
                    )}
                    {/* Mobil overlay'da collapsed bo'lsa ham label ko'rsatish */}
                    {sidebarCollapsed && mobileSidebarOpen && (
                      <span className="text-sm font-medium leading-tight sm:hidden">
                        {t(p.label)}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
