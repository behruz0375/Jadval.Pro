import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/store/auth'
import { useProject } from '@/store/project'
import { Shell } from '@/app/Shell'
import { StaffLoginScreen, AccountLoginScreen } from './AuthScreens'
import { ChooseRole, type PickRole } from './ChooseRole'
import { LandingPage } from '@/features/landing/LandingPage'
import { TeacherPortal, StudentPortal } from '@/features/timetable/PortalPages'
import { createBackup } from '@/io/backup'
import { APP_VERSION, FILE_VERSION } from '@/constants'
import {
  isCloudSignedIn,
  isAutoSyncEnabled,
  uploadSnapshot,
  getLastSyncAt,
  getStoredUser,
} from '@/features/cloud/api'

/**
 * JadvalPro'ning soddalashtirilgan auth oqimi:
 *  Landing → ChooseRole → login+parol ekrani
 *  Hech qanday litsenziya kaliti va demo rejim yo'q.
 *  Login/parolni admin beradi (Telegram orqali).
 */
export function AuthGate() {
  const ready = useAuth((s) => s.ready)
  const init = useAuth((s) => s.init)
  const role = useAuth((s) => s.role)
  const [entered, setEntered] = useState(false)
  const [pick, setPick] = useState<PickRole | null>(null)

  useEffect(() => {
    init()
  }, [init])

  // Avtomatik rezerv nusxa — har 10 daqiqada loyihani fon rejimida saqlaydi.
  // Faqat tizimga kirgan foydalanuvchilarga, bo'sh loyihaga tegmaydi.
  // Bulut ulangan va direktor hisobi uchun — har 10 daqiqada bulutga ham yuboradi.
  useEffect(() => {
    if (!role || role === 'teacher' || role === 'student') return
    const tick = async () => {
      const project = useProject.getState().project
      try {
        await createBackup(project, 'auto-10m')
      } catch {
        /* IndexedDB to'lgan yoki tiqilgan — jim o'tkazamiz */
      }
      // Bulutga ham, agar sozlangan + yoqilgan + direktor
      try {
        if (!isCloudSignedIn() || !isAutoSyncEnabled()) return
        const cu = getStoredUser()
        if (!cu?.school_id) return
        // Oldingi yuborilganidan beri 9 daqiqadan kam o'tgan bo'lsa — o'tkazib yuboramiz
        const last = getLastSyncAt() ?? 0
        if (Date.now() - last < 9 * 60 * 1000) return
        const payload = {
          ...project,
          meta: { appVersion: APP_VERSION, savedAt: new Date().toISOString(), fileVersion: FILE_VERSION },
        }
        await uploadSnapshot(`Auto · ${new Date().toLocaleString()}`, payload)
      } catch {
        /* bulut yetib bormasa jim o'tkazamiz */
      }
    }
    const id = setInterval(tick, 10 * 60 * 1000) // 10 daqiqa
    return () => clearInterval(id)
  }, [role])

  // Chiqilganda (role null) — rol tanlash ekraniga qaytish
  const prevRole = useRef(role)
  useEffect(() => {
    if (prevRole.current && !role) setPick(null)
    prevRole.current = role
  }, [role])

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-accent text-accent-fg text-2xl font-black">
            J
          </div>
          <span className="text-sm text-muted">Yuklanmoqda...</span>
        </div>
      </div>
    )
  }

  // 1) Mehmon (landing) — rol aniqlanmagan bo'lsa avval shu
  if (!entered && !role) return <LandingPage onEnter={() => setEntered(true)} />

  // 2) Kirgan foydalanuvchilar
  if (role === 'owner' || role === 'director' || role === 'deputy') return <Shell />
  if (role === 'teacher') return <TeacherPortal />
  if (role === 'student') return <StudentPortal />

  // 3) Rol tanlangan — login+parol ekraniga o'tish (litsenziya tekshiruvi yo'q)
  if (pick) {
    if (pick === 'director') return <StaffLoginScreen role="director" onBack={() => setPick(null)} />
    return <AccountLoginScreen role={pick} onBack={() => setPick(null)} />
  }

  // 4) Rol tanlash ekrani
  return <ChooseRole onBack={() => setEntered(false)} onPick={setPick} />
}
