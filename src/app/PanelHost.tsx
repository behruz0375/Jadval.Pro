import { useUI } from '@/store/ui'
import { findPanel } from './panels'
import { Placeholder } from '@/components/Placeholder'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { SchoolPage } from '@/features/school/SchoolPage'
import { ClassesPage } from '@/features/classes/ClassesPage'
import { SubjectsPage } from '@/features/subjects/SubjectsPage'
import { RoomsPage } from '@/features/rooms/RoomsPage'
import { TeachersPage } from '@/features/teachers/TeachersPage'
import { LessonsPage } from '@/features/lessons/LessonsPage'
import { CurriculumPage } from '@/features/lessons/CurriculumPage'
import { TariffPage } from '@/features/lessons/TariffPage'
import { ExportPage } from '@/features/io/ExportPage'
import { OwnerPanel } from '@/features/owner/OwnerPanel'
import { LicenseInfoPage } from '@/features/auth/LicenseInfoPage'
import { AccountPage } from '@/features/auth/AccountPage'
import { DistributionPage } from '@/features/timetable/DistributionPage'
import { ViewsPage } from '@/features/timetable/ViewsPage'
import { ConflictsPage } from '@/features/timetable/ConflictsPage'
import { SubstitutionPage } from '@/features/substitution/SubstitutionPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ListsPage } from '@/features/lists/ListsPage'
import { AIAssistantPage } from '@/features/ai/AIAssistantPage'

export function PanelHost() {
  const activePanel = useUI((s) => s.activePanel)
  const def = findPanel(activePanel)

  switch (activePanel) {
    case 'dashboard':
      return <Dashboard />
    case 'school':
      return <SchoolPage />
    case 'lists':
      return <ListsPage />
    case 'classes':
      return <ClassesPage />
    case 'subjects':
      return <SubjectsPage />
    case 'rooms':
      return <RoomsPage />
    case 'teachers':
      return <TeachersPage />
    case 'lessons':
      return <LessonsPage />
    case 'curriculum':
      return <CurriculumPage />
    case 'tariff':
      return <TariffPage />
    case 'export':
      return <ExportPage />
    case 'owner':
      return <OwnerPanel />
    case 'license':
      return <LicenseInfoPage />
    case 'account':
      return <AccountPage />
    case 'distribution':
      return <DistributionPage />
    case 'views':
      return <ViewsPage />
    case 'conflicts':
      return <ConflictsPage />
    case 'substitution':
      return <SubstitutionPage />
    case 'reports':
      return <ReportsPage />
    case 'settings':
      return <SettingsPage />
    case 'ai':
      return <AIAssistantPage />
    default:
      return <Placeholder title={def?.label ?? 'Modul'} icon={def?.icon} />
  }
}
