import type { Project } from '@/types'
import { APP_VERSION, FILE_VERSION } from '@/constants'
import { defaultProject } from '@/data/factories'

/** Loyihani .jadval (JSON) fayl sifatida saqlash (yuklab olish) */
export function saveProjectToFile(project: Project) {
  const data: Project = {
    ...project,
    meta: { appVersion: APP_VERSION, savedAt: new Date().toISOString(), fileVersion: FILE_VERSION },
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = (project.school.name || 'jadval').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40)
  a.href = url
  a.download = `${safe || 'jadval'}.jadval`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** .jadval faylni ochish (fayl tanlash oynasi) → Project yoki bekor qilinsa null */
export function openProjectFromFile(): Promise<Project | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.jadval,application/json,.json'
    input.oncancel = () => resolve(null)
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as Partial<Project>
          resolve(mergeWithDefaults(parsed))
        } catch {
          reject(new Error("Fayl noto'g'ri yoki buzilgan"))
        }
      }
      reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"))
      reader.readAsText(file)
    }
    input.click()
  })
}

/** Eski/qisman fayllar uchun standart qiymatlar bilan to'ldirish */
function mergeWithDefaults(p: Partial<Project>): Project {
  const base = defaultProject()
  return {
    meta: p.meta ?? base.meta,
    school: { ...base.school, ...(p.school ?? {}) },
    classes: p.classes ?? [],
    subjects: p.subjects ?? [],
    rooms: p.rooms ?? [],
    teachers: (p.teachers ?? []).map(migrateTeacher),
    lessons: p.lessons ?? [],
    timetables: p.timetables ?? [],
    settings: { ...base.settings, ...(p.settings ?? {}) },
  }
}

function migrateTeacher(t: any): any {
  if (!Array.isArray(t.methodicalDays)) {
    const old = t.methodicalDay as number | undefined
    t.methodicalDays = old != null && old >= 0 ? [old] : []
  }
  delete t.methodicalDay
  return t
}
