// ============================================================
// JadvalPro — avtomatik rezerv nusxa (backup) + tiklash.
// Oxirgi N nusxa IndexedDB'da alohida kalitda saqlanadi.
// Har saqlashda va loyihani almashtirishdan oldin avtomatik nusxa olinadi.
// ============================================================
import type { Project } from '@/types'
import { idbStorage } from '@/store/idbStorage'

export interface BackupMeta {
  id: string
  savedAt: string
  note: string
  classes: number
  teachers: number
  lessons: number
  timetables: number
}
interface BackupEntry extends BackupMeta {
  project: Project
}

const KEY = 'jadvalpro-backups'
const MAX = 12

async function readAll(): Promise<BackupEntry[]> {
  const raw = await idbStorage.getItem(KEY)
  if (!raw) return []
  try {
    const arr = JSON.parse(raw) as BackupEntry[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeAll(arr: BackupEntry[]): Promise<void> {
  await idbStorage.setItem(KEY, JSON.stringify(arr))
}

/** Rezerv nusxalar ro'yxati (loyihasiz — faqat meta) — yangi birinchi */
export async function listBackups(): Promise<BackupMeta[]> {
  const all = await readAll()
  return all
    .map(({ project: _p, ...meta }) => meta)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

/** Yangi rezerv nusxa yaratish (oxirgi MAX ta saqlanadi). Bir xil bo'sh loyiha spam bo'lmasin. */
export async function createBackup(project: Project, note = ''): Promise<void> {
  if (
    project.classes.length === 0 &&
    project.teachers.length === 0 &&
    project.lessons.length === 0 &&
    project.subjects.length === 0
  )
    return // bo'sh loyihani zaxiralash shart emas
  const all = await readAll()
  const entry: BackupEntry = {
    id: 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    savedAt: new Date().toISOString(),
    note,
    classes: project.classes.length,
    teachers: project.teachers.length,
    lessons: project.lessons.length,
    timetables: project.timetables.length,
    project: JSON.parse(JSON.stringify(project)) as Project,
  }
  await writeAll([entry, ...all].slice(0, MAX))
}

export async function restoreBackup(id: string): Promise<Project | null> {
  const all = await readAll()
  return all.find((b) => b.id === id)?.project ?? null
}

export async function deleteBackup(id: string): Promise<void> {
  const all = await readAll()
  await writeAll(all.filter((b) => b.id !== id))
}

export async function clearBackups(): Promise<void> {
  await writeAll([])
}
