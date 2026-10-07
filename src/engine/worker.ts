/// <reference lib="webworker" />
import { generateTimetable, improveTimetable, type GenerateOptions } from './generate'
import type { Project, TimetableEntry } from '@/types'

type Msg =
  | { mode?: 'generate'; project: Project; opts: GenerateOptions }
  | { mode: 'improve'; project: Project; opts: GenerateOptions; entries: TimetableEntry[] }

self.onmessage = (e: MessageEvent<Msg>) => {
  const data = e.data
  try {
    const onProgress = (progress: number, message: string) =>
      (self as unknown as Worker).postMessage({ type: 'progress', progress, message })
    const onSnapshot = (result: unknown) =>
      (self as unknown as Worker).postMessage({ type: 'snapshot', result })
    const result =
      data.mode === 'improve'
        ? improveTimetable(data.project, data.entries, data.opts, onProgress, onSnapshot)
        : generateTimetable(data.project, data.opts, onProgress, onSnapshot)
    ;(self as unknown as Worker).postMessage({ type: 'done', result })
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ type: 'error', error: (err as Error).message })
  }
}
