import { useState, useRef, useCallback } from 'react'
import type { Project, TimetableVersion, TimetableEntry } from '@/types'
import type { GenerateOptions } from '@/engine/generate'

type DoneFn = (v: TimetableVersion) => void
type ErrFn = (e: string) => void

export function useGenerator() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const workerRef = useRef<Worker | null>(null)
  /** Oxirgi best-so-far oraliq natija — «To'xtatish»da saqlash uchun */
  const bestRef = useRef<TimetableVersion | null>(null)
  /** Joriy ishning onDone callbacki (stop best-so-far'ni shu orqali yetkazadi) */
  const doneRef = useRef<DoneFn | null>(null)

  const attach = useCallback((worker: Worker, onDone: DoneFn, onError?: ErrFn) => {
    const finish = () => {
      setRunning(false)
      worker.terminate()
      if (workerRef.current === worker) workerRef.current = null
      doneRef.current = null
      bestRef.current = null
    }
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data
      if (m.type === 'progress') {
        setProgress(m.progress)
        setMessage(m.message)
      } else if (m.type === 'snapshot') {
        bestRef.current = m.result as TimetableVersion
      } else if (m.type === 'done') {
        const result = m.result as TimetableVersion
        finish()
        onDone(result)
      } else if (m.type === 'error') {
        finish()
        onError?.(m.error)
      }
    }
    worker.onerror = (e) => {
      finish()
      onError?.(e.message)
    }
  }, [])

  const run = useCallback(
    (project: Project, opts: GenerateOptions, onDone: DoneFn, onError?: ErrFn) => {
      setRunning(true)
      setProgress(0)
      setMessage('Boshlanmoqda...')
      bestRef.current = null
      doneRef.current = onDone
      const worker = new Worker(new URL('../../engine/worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      attach(worker, onDone, onError)
      worker.postMessage({ project, opts })
    },
    [attach],
  )

  const runImprove = useCallback(
    (project: Project, entries: TimetableEntry[], opts: GenerateOptions, onDone: DoneFn, onError?: ErrFn) => {
      setRunning(true)
      setProgress(0)
      setMessage('Yaxshilanmoqda...')
      bestRef.current = null
      doneRef.current = onDone
      const worker = new Worker(new URL('../../engine/worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      attach(worker, onDone, onError)
      worker.postMessage({ mode: 'improve', project, opts, entries })
    },
    [attach],
  )

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setRunning(false)
    setProgress(0)
    const best = bestRef.current
    const done = doneRef.current
    bestRef.current = null
    doneRef.current = null
    if (best && done) {
      setMessage("To'xtatildi — joriy natija saqlandi")
      done(best)
    } else {
      setMessage("To'xtatildi")
    }
  }, [])

  return { running, progress, message, run, runImprove, stop }
}
