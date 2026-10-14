import { useEffect } from 'react'
import { useUI } from '@/store/ui'
import { useLang } from '@/i18n'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { hexToRgbTriplet } from '@/utils'
import { saveProjectToFile, openProjectFromFile } from '@/io/projectFile'
import { requestPersistentStorage } from '@/storage/persist'
import { AuthGate } from '@/features/auth/AuthGate'
import { Toaster } from '@/components/Toaster'
import { ConfirmHost } from '@/components/ConfirmHost'

export default function App() {
  const theme = useUI((s) => s.theme)
  const accent = useUI((s) => s.accent)
  const lang = useLang((s) => s.lang)

  // Hujjat tili (document.lang) — til almashganda yangilanadi
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // Doimiy saqlash: brauzer ma'lumotni avtomatik o'chirib yubormasin
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  // Mavzuni <html data-theme=...> ga qo'llash
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Foydalanuvchi tanlagan asosiy rang (accent) override
  useEffect(() => {
    const root = document.documentElement
    if (accent) {
      const rgb = hexToRgbTriplet(accent)
      if (rgb) root.style.setProperty('--accent', rgb)
    } else {
      root.style.removeProperty('--accent')
    }
  }, [accent])

  // Klaviatura qisqartmalari: Ctrl+S saqlash, Ctrl+O ochish
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 's') {
        e.preventDefault()
        const { project, markSaved } = useProject.getState()
        saveProjectToFile(project)
        markSaved()
        useToast.getState().success('Loyiha saqlandi')
      } else if (k === 'o') {
        e.preventDefault()
        try {
          const p = await openProjectFromFile()
          if (!p) return
          useProject.getState().setProject(p)
          useToast.getState().success('Loyiha ochildi')
        } catch (err) {
          useToast.getState().error((err as Error).message)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <AuthGate />
      <Toaster />
      <ConfirmHost />
    </>
  )
}
