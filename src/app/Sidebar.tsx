import { useUI } from '@/store/ui'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { saveProjectToFile, openProjectFromFile } from '@/io/projectFile'
import { panelsForRole } from './panels'
import { cx } from '@/utils'
import { useT } from '@/i18n'

export function Sidebar() {
  const { role, activePanel, setActivePanel, sidebarCollapsed } = useUI()
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
  }

  return (
    <nav
      className={cx(
        'no-print flex h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-sidebar py-2 transition-[width] duration-200',
        sidebarCollapsed ? 'w-14 sm:w-16' : 'w-14 sm:w-16 md:w-44',
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
                      'side-btn group my-0.5 flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center',
                      active
                        ? 'side-btn-active bg-accent/15 text-accent'
                        : 'text-ink/80 hover:bg-accent/10 hover:text-accent',
                    )}
                  >
                    <Icon
                      size={sidebarCollapsed ? 22 : 22}
                      className={cx('transition-transform', active && 'scale-110')}
                      strokeWidth={active ? 2.4 : 1.9}
                    />
                    {!sidebarCollapsed && (
                      <span className="hidden text-[11px] font-medium leading-tight md:block">{t(p.label)}</span>
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
