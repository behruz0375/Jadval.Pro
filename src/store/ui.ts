import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/types'

interface UIState {
  role: Role
  activePanel: string
  history: string[]
  sidebarCollapsed: boolean
  searchOpen: boolean
  mobileSidebarOpen: boolean

  // Pastki panel (status bar) sozlamalari
  theme: string
  zoom: number
  cellWidth: number
  cellHeight: number
  gradient: boolean
  compact: boolean
  secondRow: boolean
  blackWhite: boolean
  accent: string | null

  setRole: (r: Role) => void
  setActivePanel: (id: string) => void
  back: () => void
  toggleSidebar: () => void
  setMobileSidebarOpen: (v: boolean) => void
  setTheme: (t: string) => void
  setZoom: (z: number) => void
  setSearchOpen: (v: boolean) => void
  patch: (p: Partial<UIState>) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      role: 'director',
      activePanel: 'dashboard',
      history: [],
      sidebarCollapsed: false,
      searchOpen: false,
      mobileSidebarOpen: false,

      theme: 'softgray',
      zoom: 100,
      cellWidth: 56,
      cellHeight: 44,
      gradient: false,
      compact: true,
      secondRow: false,
      blackWhite: false,
      accent: null,

      setRole: (role) => set({ role }),
      setActivePanel: (id) =>
        set((s) => (id === s.activePanel ? {} : { activePanel: id, history: [...s.history, s.activePanel].slice(-30) })),
      back: () =>
        set((s) => {
          if (s.history.length === 0) return {}
          const history = s.history.slice()
          const prev = history.pop()!
          return { activePanel: prev, history }
        }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
      setTheme: (theme) => set({ theme }),
      setZoom: (zoom) => set({ zoom }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      patch: (p) => set(p),
    }),
    {
      name: 'jadvalpro-ui-v2',
      partialize: (s) => ({
        theme: s.theme,
        zoom: s.zoom,
        cellWidth: s.cellWidth,
        cellHeight: s.cellHeight,
        gradient: s.gradient,
        compact: s.compact,
        secondRow: s.secondRow,
        blackWhite: s.blackWhite,
        accent: s.accent,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
)
