import { useState } from 'react'
import { Users, GraduationCap, DoorOpen, Printer, Layers, FileText, Image, FileType } from 'lucide-react'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { TimetableGrid, type ViewMode } from './TimetableGrid'
import { printTimetableCards } from '@/io/printCards'
import { exportTimetablePdf } from '@/io/pdf'
import { exportTimetablePng } from '@/io/png'
import { exportTimetableDocx } from '@/io/word'
import { cx } from '@/utils'
import type { TimetableVersion, WeekType } from '@/types'

export function TimetableViewer({ version }: { version: TimetableVersion }) {
  const project = useProject((s) => s.project)
  const toast = useToast()
  const [mode, setMode] = useState<ViewMode>('class')
  const [week, setWeek] = useState<WeekType>('all')
  const { classes, teachers, rooms } = project

  const doPdf = async () => {
    if (list.length === 0) return
    try {
      toast.info('PDF tayyorlanmoqda...')
      await exportTimetablePdf(project, version, mode, list.map((x) => x.id))
      toast.success('PDF tayyorlandi')
    } catch {
      toast.error('PDF eksportda xatolik')
    }
  }

  const doPng = async () => {
    if (!currentId) return
    try {
      toast.info('Rasm tayyorlanmoqda...')
      await exportTimetablePng(project, version, mode, currentId)
      toast.success('PNG rasm tayyorlandi')
    } catch {
      toast.error('PNG eksportda xatolik')
    }
  }

  const doWord = async () => {
    if (list.length === 0) return
    try {
      toast.info('Word tayyorlanmoqda...')
      await exportTimetableDocx(project, version, mode, list.map((x) => x.id))
      toast.success('Word (.docx) tayyorlandi')
    } catch {
      toast.error('Word eksportda xatolik')
    }
  }

  const list = mode === 'class' ? classes : mode === 'teacher' ? teachers : rooms
  const nameOf = (x: any) => (mode === 'teacher' ? x.fullName : x.name)
  const [entityId, setEntityId] = useState<string>(list[0]?.id ?? '')
  const currentId = list.find((x) => x.id === entityId)?.id ?? list[0]?.id ?? ''

  const modes: { id: ViewMode; label: string; icon: typeof Users }[] = [
    { id: 'class', label: 'Sinf', icon: Users },
    { id: 'teacher', label: "O'qituvchi", icon: GraduationCap },
    { id: 'room', label: 'Xona', icon: DoorOpen },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {modes.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id)
                  const nextList = m.id === 'class' ? classes : m.id === 'teacher' ? teachers : rooms
                  setEntityId(nextList[0]?.id ?? '')
                }}
                className={cx(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === m.id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
                )}
              >
                <Icon size={15} /> {m.label}
              </button>
            )
          })}
        </div>

        <select
          value={currentId}
          onChange={(e) => setEntityId(e.target.value)}
          className="input h-9 w-56"
        >
          {list.length === 0 && <option>— ma'lumot yo'q —</option>}
          {list.map((x) => (
            <option key={x.id} value={x.id}>
              {nameOf(x)}
            </option>
          ))}
        </select>

        <div className="flex gap-1 rounded-lg bg-surface-2 p-1" title="Hafta">
          {(['all', 'num', 'den'] as WeekType[]).map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={cx(
                'rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                week === w ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
              )}
            >
              {w === 'all' ? 'Butun' : w === 'num' ? '1-hafta' : '2-hafta'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={doPdf}
            disabled={list.length === 0}
            className="btn btn-accent h-9 disabled:opacity-40"
            title="Barcha kartochkalarni PDF faylga chiqarish"
          >
            <FileText size={15} /> PDF
          </button>
          <button
            onClick={doPng}
            disabled={!currentId}
            className="btn btn-outline h-9 disabled:opacity-40"
            title="Joriy jadvalni PNG rasm qilib saqlash"
          >
            <Image size={15} /> PNG
          </button>
          <button
            onClick={doWord}
            disabled={list.length === 0}
            className="btn btn-outline h-9 disabled:opacity-40"
            title="Barcha jadvallarni Word (.docx) faylga chiqarish"
          >
            <FileType size={15} /> Word
          </button>
          <button
            onClick={() => currentId && printTimetableCards(project, version, mode, [currentId])}
            disabled={!currentId}
            className="btn btn-outline h-9 disabled:opacity-40"
            title="Joriy kartochkani chop etish"
          >
            <Printer size={15} /> Chop etish
          </button>
          <button
            onClick={() => list.length > 0 && printTimetableCards(project, version, mode, list.map((x) => x.id))}
            disabled={list.length === 0}
            className="btn btn-outline h-9 disabled:opacity-40"
            title="Barcha kartochkalarni bitta hujjatda chop etish"
          >
            <Layers size={15} /> Barchasi
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {currentId ? (
          <TimetableGrid version={version} mode={mode} entityId={currentId} week={week} />
        ) : (
          <div className="grid h-40 place-items-center text-muted">Ma'lumot yo'q</div>
        )}
      </div>
    </div>
  )
}
