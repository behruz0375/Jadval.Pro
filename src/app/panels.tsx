import {
  LayoutDashboard,
  FolderOpen,
  Save,
  Upload,
  School,
  LayoutGrid,
  Users,
  BookOpen,
  DoorOpen,
  GraduationCap,
  CalendarDays,
  Table2,
  Calculator,
  CalendarRange,
  AlertTriangle,
  Replace,
  FileBarChart,
  Settings as SettingsIcon,
  KeyRound,
  ShieldCheck,
  UserCog,
  ListChecks,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types'

export interface PanelDef {
  id: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

export interface PanelGroup {
  id: string
  panels: PanelDef[]
}

const SCHOOL: Role[] = ['director', 'deputy']
const BOTH: Role[] = ['owner', 'director', 'deputy']

export const PANEL_GROUPS: PanelGroup[] = [
  {
    id: 'main',
    panels: [
      { id: 'owner', label: 'Boshqaruv paneli', icon: ShieldCheck, roles: ['owner'] },
      { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, roles: BOTH },
      { id: 'distribution', label: 'Taqsimot', icon: LayoutGrid, roles: BOTH },
      { id: 'ai', label: 'AI yordamchi', icon: Sparkles, roles: SCHOOL },
    ],
  },
  {
    id: 'file',
    panels: [
      { id: 'open', label: 'Ochish', icon: FolderOpen, roles: BOTH },
      { id: 'save', label: 'Saqlash', icon: Save, roles: BOTH },
      { id: 'export', label: 'Eksport', icon: Upload, roles: BOTH },
    ],
  },
  {
    id: 'data',
    panels: [
      { id: 'school', label: 'Maktab', icon: School, roles: BOTH },
      { id: 'lists', label: "Ro'yxatlar", icon: ListChecks, roles: BOTH },
      { id: 'classes', label: 'Sinflar', icon: Users, roles: BOTH },
      { id: 'subjects', label: 'Fanlar', icon: BookOpen, roles: BOTH },
      { id: 'rooms', label: 'Xonalar', icon: DoorOpen, roles: BOTH },
      { id: 'teachers', label: "O'qituvchilar", icon: GraduationCap, roles: BOTH },
    ],
  },
  {
    id: 'plan',
    panels: [
      { id: 'lessons', label: 'Darslar', icon: CalendarDays, roles: BOTH },
      { id: 'curriculum', label: "O'quv reja", icon: Table2, roles: BOTH },
      { id: 'tariff', label: 'Tarifikatsiya', icon: Calculator, roles: BOTH },
    ],
  },
  {
    id: 'schedule',
    panels: [
      { id: 'views', label: "Jadval ko'rinishlari", icon: CalendarRange, roles: BOTH },
      { id: 'conflicts', label: 'Konfliktlar', icon: AlertTriangle, roles: BOTH },
    ],
  },
  {
    id: 'extra',
    panels: [
      { id: 'substitution', label: 'Almashtirish', icon: Replace, roles: BOTH },
      { id: 'reports', label: 'Hisobotlar', icon: FileBarChart, roles: BOTH },
    ],
  },
  {
    id: 'account',
    panels: [
      { id: 'settings', label: 'Sozlamalar', icon: SettingsIcon, roles: BOTH },
      { id: 'account', label: 'Hisob', icon: UserCog, roles: SCHOOL },
      { id: 'license', label: "Dastur ma'lumoti", icon: KeyRound, roles: SCHOOL },
    ],
  },
]

export function panelsForRole(role: Role): PanelGroup[] {
  return PANEL_GROUPS.map((g) => ({
    ...g,
    panels: g.panels.filter((p) => p.roles.includes(role)),
  })).filter((g) => g.panels.length > 0)
}

export function findPanel(id: string): PanelDef | undefined {
  for (const g of PANEL_GROUPS) {
    const p = g.panels.find((x) => x.id === id)
    if (p) return p
  }
  return undefined
}
