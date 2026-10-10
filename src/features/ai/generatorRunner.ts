// ============================================================
// AI yordamchi uchun — React hook'siz, Promise asosidagi jadval
// generatori. Worker'ni to'g'ridan-to'g'ri ishga tushiradi.
// ============================================================
import type { Project, TimetableVersion, TimetableEntry } from '@/types'
import type { GenerateOptions } from '@/engine/generate'

export interface GenRunHandle {
  promise: Promise<TimetableVersion>
  stop: () => void
}

/** Jadval tuzish — Promise. onProgress orqali jarayon yetkaziladi. */
export function runGenerateAsync(
  project: Project,
  opts: GenerateOptions,
  onProgress?: (p: number, msg: string) => void,
): GenRunHandle {
  const worker = new Worker(new URL('../../engine/worker.ts', import.meta.url), { type: 'module' })
  let best: TimetableVersion | null = null
  let settled = false
  let resolveFn: (v: TimetableVersion) => void = () => {}
  let rejectFn: (e: Error) => void = () => {}

  const promise = new Promise<TimetableVersion>((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data
      if (m.type === 'progress') {
        onProgress?.(m.progress, m.message)
      } else if (m.type === 'snapshot') {
        best = m.result as TimetableVersion
      } else if (m.type === 'done') {
        settled = true
        worker.terminate()
        resolve(m.result as TimetableVersion)
      } else if (m.type === 'error') {
        settled = true
        worker.terminate()
        reject(new Error(m.error))
      }
    }
    worker.onerror = (e) => {
      settled = true
      worker.terminate()
      reject(new Error(e.message))
    }
    worker.postMessage({ project, opts })
  })

  const stop = () => {
    if (settled) return
    settled = true
    worker.terminate()
    // Promise'ni ham to'g'ri settle qilamiz — osilib qolmasligi uchun.
    // Agar best mavjud bo'lsa — qaytaramiz, aks holda rejection.
    if (best) resolveFn(best)
    else rejectFn(new Error("Jadval tuzish to'xtatildi"))
  }

  return { promise, stop }
}

/** Yaxshilash — mavjud entrieslarni optimallashtiradi. */
export function runImproveAsync(
  project: Project,
  entries: TimetableEntry[],
  opts: GenerateOptions,
  onProgress?: (p: number, msg: string) => void,
): GenRunHandle {
  const worker = new Worker(new URL('../../engine/worker.ts', import.meta.url), { type: 'module' })
  let settled = false
  let rejectFn: (e: Error) => void = () => {}

  const promise = new Promise<TimetableVersion>((resolve, reject) => {
    rejectFn = reject
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data
      if (m.type === 'progress') onProgress?.(m.progress, m.message)
      else if (m.type === 'done') {
        settled = true
        worker.terminate()
        resolve(m.result as TimetableVersion)
      } else if (m.type === 'error') {
        settled = true
        worker.terminate()
        reject(new Error(m.error))
      }
    }
    worker.onerror = (e) => {
      settled = true
      worker.terminate()
      reject(new Error(e.message))
    }
    worker.postMessage({ mode: 'improve', project, opts, entries })
  })

  const stop = () => {
    if (settled) return
    settled = true
    worker.terminate()
    rejectFn(new Error("Yaxshilash to'xtatildi"))
  }

  return { promise, stop }
}
