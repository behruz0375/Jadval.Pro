import type { Project } from '@/types'
import { APP_VERSION, FILE_VERSION } from '@/constants'
import { defaultProject } from '@/data/factories'
import { useProject } from '@/store/project'
import { confirmAsync } from '@/store/confirm'
import { createBackup } from '@/io/backup'

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
      reader.onload = async () => {
        let next: Project
        try {
          const parsed: unknown = JSON.parse(String(reader.result))
          // Har qanday JSON emas — faqat JadvalPro loyihasi (aks holda joriy loyiha jimgina bo'sh bilan almashib ketardi)
          if (!looksLikeProject(parsed)) throw new Error('not-a-project')
          next = mergeWithDefaults(parsed)
        } catch {
          reject(new Error("Bu JadvalPro fayli emas yoki buzilgan"))
          return
        }
        // Joriy loyiha o'rniga fayl ochiladi: ma'lumot bo'lsa tasdiq so'raymiz va avval zaxira nusxa olamiz
        const cur = useProject.getState().project
        if (cur.classes.length > 0 || cur.lessons.length > 0 || cur.teachers.length > 0) {
          const ok = await confirmAsync({
            title: 'Faylni ochish',
            message: `Joriy loyiha "${next.school.name || file.name}" fayli bilan almashtiriladi. Joriy loyihaning zaxira nusxasi avtomatik saqlanadi.

Davom etasizmi?`,
            confirmText: 'Ha, ochish',
            tone: 'danger',
          })
          if (!ok) return resolve(null)
          try {
            await createBackup(cur, 'Fayl ochishdan oldin')
          } catch {
            /* zaxira yozilmasa ham ochish davom etadi */
          }
        }
        resolve(next)
      }
      reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"))
      reader.readAsText(file)
    }
    input.click()
  })
}

/** JSON loyiha tuzilmasiga o'xshaydimi (kamida bitta ro'yxat yoki maktab ob'ekti) */
function looksLikeProject(p: unknown): p is Partial<Project> {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false
  const o = p as Record<string, unknown>
  const lists = ['classes', 'subjects', 'teachers', 'lessons', 'rooms', 'timetables']
  return lists.some((k) => Array.isArray(o[k])) || (typeof o.school === 'object' && o.school !== null)
}

/** Eski/qisman fayllar uchun standart qiymatlar bilan to'ldirish */
function mergeWithDefaults(p: Partial<Project>): Project {
  const base = defaultProject()
  const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  return {
    meta: p.meta ?? base.meta,
    school: { ...base.school, ...(p.school ?? {}) },
    classes: list(p.classes),
    subjects: list(p.subjects),
    rooms: list(p.rooms),
    teachers: list<Project['teachers'][number]>(p.teachers).map(migrateTeacher),
    lessons: list(p.lessons),
    timetables: list(p.timetables),
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
