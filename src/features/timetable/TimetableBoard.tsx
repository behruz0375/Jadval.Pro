import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Wand2,
  Eraser,
  Trash2,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  Layers,
  Undo2,
  Redo2,
  StopCircle,
  FilePlus,
} from 'lucide-react'
import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { useToast } from '@/store/toast'
import { useExpiry } from '@/features/pro/useExpiry'
import { useT } from '@/i18n'
import { useGenerator } from './useGenerator'
import { Modal } from '@/components/Modal'
import { Field, SelectField } from '@/components/Field'
import { DAYS_SHORT } from '@/constants'
import { timetableGaps, countHardViolations } from '@/features/_shared/compute'
import { uid, cx, weekOverlap, WEEK_BADGE, WEEK_LABEL } from '@/utils'
import type { TimetableEntry, TimetableVersion, WeekType } from '@/types'

const WORKING = 'Ishchi jadval'

export function TimetableBoard() {
  const project = useProject((s) => s.project)
  const addTimetable = useProject((s) => s.addTimetable)
  const updateTimetable = useProject((s) => s.updateTimetable)
  const toast = useToast()
  const ui = useUI()
  const tr = useT()
  const { running, progress, message, run, stop } = useGenerator()
  const { isReadOnly } = useExpiry()

  const { school, classes, subjects, teachers, rooms, lessons, timetables } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay

  const [workingId, setWorkingId] = useState<string | null>(
    () => timetables.find((t) => t.name === WORKING)?.id ?? null,
  )
  const [classIdx, setClassIdx] = useState(0)
  const [pickedLessonId, setPickedLessonId] = useState<string | null>(null)
  const [lockMode, setLockMode] = useState(false)
  const [weekMode, setWeekMode] = useState<WeekType>('all')
  const [dragId, setDragId] = useState<string | null>(null)
  const dragEndAt = useRef(0)
  const historyKey = (id: string | null) => (id ? `jadvalpro-history-${id}` : null)
  const loadHistory = (id: string | null): { past: TimetableEntry[][]; future: TimetableEntry[][] } => {
    const key = historyKey(id)
    if (!key) return { past: [], future: [] }
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { past: [], future: [] }
      const parsed = JSON.parse(raw) as { past: TimetableEntry[][]; future: TimetableEntry[][] }
      if (!parsed.past || !parsed.future) return { past: [], future: [] }
      return parsed
    } catch {
      return { past: [], future: [] }
    }
  }
  const [past, setPast] = useState<TimetableEntry[][]>(() => loadHistory(workingId).past)
  const [future, setFuture] = useState<TimetableEntry[][]>(() => loadHistory(workingId).future)
  const [edit, setEdit] = useState<TimetableEntry | null>(null)

  // Workingning o'zi almashsa (yangi versiya) — tarixni shu versiyaga tegishli diskdan tiklash
  useEffect(() => {
    const h = loadHistory(workingId)
    setPast(h.past)
    setFuture(h.future)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingId])

  // Tarix o'zgarganda diskka yozish (debouncesiz — kichik rows). 50 yozuvdan oshmaydi.
  useEffect(() => {
    const key = historyKey(workingId)
    if (!key) return
    try {
      if (past.length === 0 && future.length === 0) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify({ past, future }))
    } catch {
      /* localStorage to'lgan bo'lishi mumkin — jim o'tkazamiz */
    }
  }, [past, future, workingId])

  const workingVersion =
    timetables.find((t) => t.id === workingId) ?? timetables.find((t) => t.name === WORKING) ?? null
  const entries = workingVersion?.entries ?? []

  const cls = classes[classIdx] ?? null

  const subjById = (id: string) => subjects.find((s) => s.id === id)
  const tName = (id?: string) => teachers.find((t) => t.id === id)?.short ?? ''
  const rName = (id?: string) => rooms.find((r) => r.id === id)?.short ?? ''
  const lessonById = (id: string) => lessons.find((l) => l.id === id)

  const totalRequired = useMemo(
    () => lessons.reduce((a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length), 0),
    [lessons],
  )

  const commit = (next: TimetableEntry[], record = true) => {
    if (record) {
      setPast((p) => [...p.slice(-49), entries])
      setFuture([])
    }
    const { teacherGaps, classGaps } = timetableGaps(next, teachers, school.workDays)
    const stats = {
      placed: next.length,
      unplaced: Math.max(0, totalRequired - next.length),
      hardViolations: countHardViolations(next),
      softPenalty: classGaps * 2,
      teacherGaps,
    }
    if (workingId && timetables.some((t) => t.id === workingId)) {
      updateTimetable(workingId, { entries: next, stats })
    } else {
      const v: TimetableVersion = {
        id: uid('tt_'),
        name: WORKING,
        createdAt: new Date().toISOString(),
        entries: next,
        stats,
      }
      addTimetable(v)
      setWorkingId(v.id)
    }
  }

  // Orqaga / Oldinga qaytarish (undo / redo)
  const undo = () => {
    if (past.length === 0) return
    const prev = past[past.length - 1]
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [entries, ...f].slice(0, 50))
    commit(prev, false)
  }
  const redo = () => {
    if (future.length === 0) return
    const nxt = future[0]
    setFuture((f) => f.slice(1))
    setPast((p) => [...p.slice(-49), entries])
    commit(nxt, false)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const allowed = (day: number, slot: number) => {
    if (!cls) return false
    const shift = school.shifts[cls.shiftIndex - 1] ?? school.shifts[0]
    const shiftOk = shift?.grid?.[slot - 1]?.[day] ?? true
    const availOk = cls.availability?.[day]?.[slot - 1] ?? true
    return shiftOk && availOk
  }
  const entriesAt = (day: number, slot: number) =>
    cls ? entries.filter((e) => e.classId === cls.id && e.day === day && e.slot === slot) : []
  // Joriy qatlam (weekMode) uchun katakdagi dars — o'chirish/qulflash nishoni
  const layerEntry = (day: number, slot: number) => {
    const list = entriesAt(day, slot)
    return weekMode === 'all' ? list[0] : list.find((e) => (e.week ?? 'all') === weekMode)
  }
  const teacherBusy = (teacherId: string, day: number, slot: number, week: WeekType) =>
    entries.some(
      (e) =>
        e.teacherId === teacherId &&
        e.day === day &&
        e.slot === slot &&
        e.classId !== cls?.id &&
        weekOverlap(e.week, week),
    )
  const roomBusy = (roomId: string, day: number, slot: number, week: WeekType) =>
    entries.some(
      (e) =>
        e.roomId === roomId &&
        e.day === day &&
        e.slot === slot &&
        e.classId !== cls?.id &&
        weekOverlap(e.week, week),
    )

  const classLessons = useMemo(
    () => (cls ? lessons.filter((l) => l.classIds.includes(cls.id)) : []),
    [cls, lessons],
  )
  const placedCount = (lessonId: string) =>
    cls ? entries.filter((e) => e.lessonId === lessonId && e.classId === cls.id).length : 0

  const placeOrRemove = (day: number, slot: number) => {
    if (!cls) return
    const cellEntries = entriesAt(day, slot)
    const target = layerEntry(day, slot)
    if (lockMode) {
      const t = target ?? cellEntries[0]
      if (t) commit(entries.map((e) => (e.id === t.id ? { ...e, locked: !e.locked } : e)))
      return
    }
    if (target) {
      if (target.locked) return toast.info('Bu dars qulflangan')
      commit(entries.filter((e) => e.id !== target.id))
      return
    }
    if (!pickedLessonId) return
    if (!allowed(day, slot)) return toast.error('Bu vaqt sinf uchun yopiq')
    if (cellEntries.some((e) => weekOverlap(e.week, weekMode)))
      return toast.error(weekMode === 'all' ? 'Bu katak band' : `Bu katakda ${WEEK_LABEL[weekMode]} darsini qo'yib bo'lmaydi`)
    const lesson = lessonById(pickedLessonId)
    if (!lesson) return
    if (placedCount(lesson.id) >= lesson.hoursPerWeek) return toast.info('Bu dars soati to‘ldi')
    if (lesson.teacher1Id && teacherBusy(lesson.teacher1Id, day, slot, weekMode))
      return toast.error(`O'qituvchi ${tName(lesson.teacher1Id)} bu vaqtda band`)
    if (lesson.roomId && roomBusy(lesson.roomId, day, slot, weekMode))
      return toast.error(`Xona ${rName(lesson.roomId)} bu vaqtda band`)
    const entry: TimetableEntry = {
      id: `${lesson.id}_${cls.id}_${day}_${slot}_${weekMode}`,
      lessonId: lesson.id,
      classId: cls.id,
      teacherId: lesson.teacher1Id,
      roomId: lesson.roomId,
      day,
      slot,
      ...(weekMode !== 'all' ? { week: weekMode } : {}),
    }
    commit([...entries, entry])
  }

  // Drag bilan ko'chirish / almashtirish uchun to'qnashuv tekshiruvi
  const conflictAt = (
    list: TimetableEntry[],
    entry: TimetableEntry,
    day: number,
    slot: number,
    excludeIds: string[],
  ) => {
    const w = entry.week ?? 'all'
    return list.some(
      (o) =>
        !excludeIds.includes(o.id) &&
        o.day === day &&
        o.slot === slot &&
        weekOverlap(o.week, w) &&
        ((!!entry.teacherId && o.teacherId === entry.teacherId) ||
          (!!entry.roomId && o.roomId === entry.roomId)),
    )
  }

  // Darsni boshqa katakka ko'chirish yoki o'rin almashtirish (drag-and-drop)
  const moveOrSwap = (srcId: string, day: number, slot: number) => {
    if (!cls) return
    const src = entries.find((e) => e.id === srcId)
    if (!src || src.classId !== cls.id) return
    if (src.day === day && src.slot === slot) return
    if (src.locked) return toast.info('Bu dars qulflangan')
    if (!allowed(day, slot)) return toast.error('Bu vaqt sinf uchun yopiq')
    const w = src.week ?? 'all'
    const overlap = entries.filter(
      (e) => e.classId === cls.id && e.day === day && e.slot === slot && e.id !== srcId && weekOverlap(e.week, w),
    )
    if (overlap.length > 1) return toast.info('Bu katakni almashtirib bo‘lmaydi')
    const tgt = overlap[0]
    if (tgt?.locked) return toast.info('Maqsad dars qulflangan')
    const next = entries.map((e) => {
      if (e.id === src.id) return { ...e, day, slot }
      if (tgt && e.id === tgt.id) return { ...e, day: src.day, slot: src.slot }
      return e
    })
    const excl = tgt ? [src.id, tgt.id] : [src.id]
    if (conflictAt(next, { ...src, day, slot }, day, slot, excl))
      return toast.error("O'qituvchi yoki xona bu vaqtda band")
    if (tgt && conflictAt(next, { ...tgt, day: src.day, slot: src.slot }, src.day, src.slot, excl))
      return toast.error('Almashtirib bo‘lmaydi: band')
    commit(next)
  }

  const commitEdit = () => {
    if (!edit) return
    const w = edit.week ?? 'all'
    const busyT = (tid?: string) =>
      !!tid &&
      entries.some(
        (o) =>
          o.id !== edit.id &&
          o.day === edit.day &&
          o.slot === edit.slot &&
          o.classId !== edit.classId &&
          weekOverlap(o.week, w) &&
          (o.teacherId === tid || o.teacher2Id === tid),
      )
    if (busyT(edit.teacherId)) return toast.error(`O'qituvchi ${tName(edit.teacherId)} bu vaqtda band`)
    if (edit.teacher2Id && busyT(edit.teacher2Id)) return toast.error(`O'qituvchi ${tName(edit.teacher2Id)} bu vaqtda band`)
    if (
      edit.roomId &&
      entries.some(
        (o) =>
          o.id !== edit.id &&
          o.day === edit.day &&
          o.slot === edit.slot &&
          o.classId !== edit.classId &&
          weekOverlap(o.week, w) &&
          o.roomId === edit.roomId,
      )
    )
      return toast.error(`Xona ${rName(edit.roomId)} bu vaqtda band`)
    commit(entries.map((e) => (e.id === edit.id ? edit : e)))
    setEdit(null)
  }

  const clearClass = () => {
    if (!cls) return
    const count = entries.filter((e) => e.classId === cls.id && !e.locked).length
    if (count === 0) return
    if (!window.confirm(`${cls.name} sinfidagi ${count} ta darsni tozalaysizmi? (Qulflangan darslar tegilmaydi)`)) return
    commit(entries.filter((e) => e.classId !== cls.id || e.locked))
  }
  const clearAll = () => {
    const count = entries.filter((e) => !e.locked).length
    if (count === 0) return
    if (!window.confirm(`Barcha ${count} ta darsni tozalaysizmi? Bu amal qaytarib bo'lmaydi (lekin qulflangan darslar tegilmaydi).`)) return
    commit(entries.filter((e) => e.locked))
  }

  // Bo'sh varaq — joriy jadvalni nomli versiyaga nusxalab, ishchi varaqni tozalaydi
  const blankSheet = () => {
    if (entries.length > 0 && workingVersion) {
      addTimetable({
        id: uid('tt_'),
        name: `Nusxa ${new Date().toLocaleTimeString('uz')}`,
        createdAt: new Date().toISOString(),
        entries: entries.map((e) => ({ ...e })),
        stats: workingVersion.stats,
      })
    }
    commit([])
    toast.success("Bo'sh varaq ochildi — avvalgi jadval nusxaga saqlandi")
  }

  const autoFill = () => {
    if (lessons.length === 0) return toast.error('Avval darslarni kiriting')
    run(
      project,
      { seed: Math.floor(Math.random() * 1e9) },
      (v) => {
        // Qulflangan darslarni saqlab qolamiz
        const locked = entries.filter((e) => e.locked)
        const lockedKeys = new Set(locked.map((e) => `${e.classId}:${e.day}:${e.slot}`))
        const merged = [...locked, ...v.entries.filter((e) => !lockedKeys.has(`${e.classId}:${e.day}:${e.slot}`))]
        commit(merged)
        toast.success(v.stats.unplaced === 0 ? 'Jadval to‘liq tuzildi' : `${v.stats.unplaced} dars joylashmadi`)
      },
      (e) => toast.error('Xatolik: ' + e),
    )
  }

  if (classes.length === 0) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-muted">
        <div>
          <Wand2 className="mx-auto mb-3 text-accent/60" size={40} />
          <p>Avval <b className="text-ink">Sinflar</b> va <b className="text-ink">Darslar</b> kiriting.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Boshqaruv */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost h-9 w-9 p-0" onClick={() => setClassIdx((i) => (i - 1 + classes.length) % classes.length)}>
            <ChevronLeft size={18} />
          </button>
          <select
            value={classIdx}
            onChange={(e) => setClassIdx(+e.target.value)}
            className="input h-9 w-36 text-center font-semibold"
          >
            {classes.map((c, i) => (
              <option key={c.id} value={i}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost h-9 w-9 p-0" onClick={() => setClassIdx((i) => (i + 1) % classes.length)}>
            <ChevronRight size={18} />
          </button>
        </div>

        <button onClick={autoFill} disabled={running || isReadOnly} className="btn btn-accent h-9 disabled:opacity-50">
          {running ? <Wand2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {running ? `${tr('Tuzilmoqda')} ${Math.round(progress)}%` : tr('Avtomatik to‘ldirish')}
        </button>
        {running && (
          <button onClick={stop} className="btn btn-outline h-9 text-danger" title={tr('To‘xtatish')}>
            <StopCircle size={15} /> {tr('To‘xtatish')}
          </button>
        )}
        <button
          onClick={() => setLockMode((v) => !v)}
          className={cx('btn h-9', lockMode ? 'btn-accent' : 'btn-outline')}
          title={tr("Qulflash rejimi — kataklarni qulflab qo'yadi")}
        >
          {lockMode ? <Lock size={16} /> : <Unlock size={16} />} {tr('Qulflash')}
        </button>
        <div className="flex h-9 items-center gap-1 rounded-lg bg-surface-2 px-1.5" title={tr("Hafta qatlami — qaysi haftaga dars qo'yilsin")}>
          <Layers size={15} className="text-muted" />
          {(['all', 'num', 'den'] as WeekType[]).map((w) => (
            <button
              key={w}
              onClick={() => setWeekMode(w)}
              className={cx(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                weekMode === w ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
              )}
              title={WEEK_LABEL[w]}
            >
              {w === 'all' ? tr('Butun') : w === 'num' ? tr('1-hafta') : tr('2-hafta')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="btn btn-ghost h-9 w-9 p-0 disabled:opacity-40"
            title={tr('Orqaga qaytarish (Ctrl+Z)')}
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="btn btn-ghost h-9 w-9 p-0 disabled:opacity-40"
            title={tr('Oldinga qaytarish (Ctrl+Y)')}
          >
            <Redo2 size={16} />
          </button>
        </div>
        <button onClick={blankSheet} disabled={isReadOnly} className="btn btn-outline h-9 disabled:opacity-40" title={tr("Joriy jadvalni nusxaga saqlab, bo'sh varaqdan boshlash")}>
          <FilePlus size={16} /> {tr("Bo'sh varaq")}
        </button>
        <button onClick={clearClass} disabled={isReadOnly} className="btn btn-outline h-9 disabled:opacity-40">
          <Eraser size={16} /> {tr('Sinfni tozalash')}
        </button>
        <button onClick={clearAll} disabled={isReadOnly} className="btn btn-outline h-9 text-danger disabled:opacity-40">
          <Trash2 size={16} /> {tr('Hammasini tozalash')}
        </button>

        {running && (
          <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {!running && <span className="ml-auto text-xs text-muted">{message || `${entries.length} dars joylashtirilgan`}</span>}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Sinf jadvali */}
        <div className="min-w-0 flex-1 overflow-auto rounded-xl border border-border bg-surface">
          <table className="w-full border-collapse text-center text-sm">
            <thead>
              <tr className="bg-surface-2">
                <th className="sticky left-0 z-10 w-14 border-b border-r border-border bg-surface-2 px-2 py-2 text-xs text-muted">
                  Dars
                </th>
                {Array.from({ length: days }).map((_, d) => (
                  <th key={d} className="border-b border-border px-2 py-2 font-semibold">
                    {DAYS_SHORT[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxP }).map((_, pi) => {
                const slot = pi + 1
                const time = school.lessonTimes[pi]
                return (
                  <tr key={slot}>
                    <td className="sticky left-0 z-10 border-b border-r border-border bg-surface-2 px-1 py-1 text-xs">
                      <div className="font-bold">{slot}</div>
                      {time && <div className="text-[10px] text-muted">{time.start}</div>}
                    </td>
                    {Array.from({ length: days }).map((_, d) => {
                      const cellEntries = entriesAt(d, slot)
                      const ok = allowed(d, slot)
                      const empty = cellEntries.length === 0
                      const wkOrder = (w?: TimetableEntry['week']) => (w === 'num' ? 1 : w === 'den' ? 2 : 0)
                      return (
                        <td key={d} className="border-b border-l border-border/60 p-0.5">
                          <button
                            onClick={() => {
                              if (isReadOnly) return
                              if (Date.now() - dragEndAt.current < 250) return
                              placeOrRemove(d, slot)
                            }}
                            onDragOver={(ev) => {
                              if (ok && dragId && !isReadOnly) ev.preventDefault()
                            }}
                            onDrop={(ev) => {
                              if (isReadOnly) return
                              ev.preventDefault()
                              const id = dragId ?? ev.dataTransfer.getData('text/plain')
                              dragEndAt.current = Date.now()
                              if (id) moveOrSwap(id, d, slot)
                              setDragId(null)
                            }}
                            style={{ height: ui.cellHeight }}
                            className={cx(
                              'group relative flex w-full flex-col items-stretch justify-center gap-0.5 rounded-md px-1 text-left transition-all',
                              !ok && 'cursor-not-allowed bg-[repeating-linear-gradient(45deg,rgb(var(--danger)/0.06)_0_6px,transparent_6px_12px)]',
                              ok && empty && pickedLessonId && 'cursor-copy hover:bg-accent/15 ring-1 ring-inset ring-transparent hover:ring-accent/40',
                              ok && empty && !pickedLessonId && !dragId && 'hover:bg-surface-2',
                              ok && dragId && 'ring-1 ring-inset ring-accent/40 hover:bg-accent/15',
                            )}
                          >
                            {!empty ? (
                              cellEntries
                                .slice()
                                .sort((a, b) => wkOrder(a.week) - wkOrder(b.week))
                                .map((e) => {
                                  const subj = subjById(lessonById(e.lessonId)?.subjectId ?? '')
                                  const color = subj?.color
                                  const w = e.week ?? 'all'
                                  return (
                                    <span
                                      key={e.id}
                                      draggable={!e.locked && !isReadOnly}
                                      onDragStart={(ev) => {
                                        if (isReadOnly) { ev.preventDefault(); return }
                                        ev.stopPropagation()
                                        ev.dataTransfer.setData('text/plain', e.id)
                                        ev.dataTransfer.effectAllowed = 'move'
                                        setDragId(e.id)
                                      }}
                                      onDragEnd={() => {
                                        dragEndAt.current = Date.now()
                                        setDragId(null)
                                      }}
                                      onContextMenu={(ev) => {
                                        ev.preventDefault()
                                        ev.stopPropagation()
                                        setEdit({ ...e })
                                      }}
                                      title={e.locked ? 'O‘ng tugma — tahrirlash' : "Sudrab ko'chiring · o'ng tugma — tahrirlash"}
                                      className={cx(
                                        'flex w-full items-center gap-1 rounded px-1.5 py-0.5 leading-tight',
                                        !e.locked && 'cursor-grab active:cursor-grabbing',
                                        dragId === e.id && 'opacity-40',
                                      )}
                                      style={{
                                        background: color ? `${color}22` : undefined,
                                        borderLeft: color ? `3px solid ${color}` : undefined,
                                      }}
                                    >
                                      {e.locked && <Lock size={10} className="shrink-0 text-accent" />}
                                      {w !== 'all' && (
                                        <span className="shrink-0 rounded bg-accent/25 px-1 text-[9px] font-bold text-accent">
                                          {WEEK_BADGE[w]}
                                        </span>
                                      )}
                                      <span className="truncate text-xs font-semibold">{subj?.short || subj?.name}</span>
                                      {ui.secondRow && (
                                        <span className="truncate text-[10px] text-muted">
                                          {tName(e.teacherId)}
                                          {e.roomId ? ' · ' + rName(e.roomId) : ''}
                                        </span>
                                      )}
                                    </span>
                                  )
                                })
                            ) : !ok ? (
                              <X size={12} className="mx-auto text-danger/40" />
                            ) : null}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Palitra — sinf darslari */}
        <div className="flex w-60 shrink-0 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-surface p-3">
          <h3 className="text-sm font-semibold">{cls?.name} darslari</h3>
          <p className="text-xs text-muted">
            Plitkani tanlang, so‘ng bo‘sh katakni bosing. Qo‘yilgan darsni sudrab boshqa katakka ko‘chiring yoki almashtiring.
          </p>
          <div className="mt-1 flex flex-col gap-1.5">
            {classLessons.length === 0 && <span className="text-xs text-muted">Bu sinf uchun dars yo‘q.</span>}
            {classLessons.map((l) => {
              const subj = subjById(l.subjectId)
              const placed = placedCount(l.id)
              const remaining = l.hoursPerWeek - placed
              const done = remaining <= 0
              const picked = pickedLessonId === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => setPickedLessonId(picked ? null : l.id)}
                  disabled={done}
                  className={cx(
                    'flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-sm transition-all',
                    picked ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:bg-surface-2',
                    done && 'opacity-45',
                  )}
                  style={{ background: subj?.color ? `${subj.color}14` : undefined }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: subj?.color }} />
                    <span className="truncate">
                      <span className="font-medium">{subj?.short || subj?.name}</span>
                      <span className="block text-[10px] text-muted">{tName(l.teacher1Id)}</span>
                    </span>
                  </span>
                  <span
                    className={cx(
                      'ml-1 grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1 text-xs font-bold',
                      done ? 'bg-ok/20 text-ok' : 'bg-accent/15 text-accent',
                    )}
                  >
                    {done ? <CheckCircle2 size={13} /> : remaining}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {edit && (
        <Modal
          open
          title="Darsni tahrirlash"
          onClose={() => setEdit(null)}
          width="max-w-md"
          footer={
            <>
              <button
                onClick={() => {
                  commit(entries.filter((e) => e.id !== edit.id))
                  setEdit(null)
                }}
                className="btn btn-outline text-danger"
                title="Darsni o'chirish"
              >
                <Trash2 size={15} /> O'chirish
              </button>
              <button
                onClick={() => setEdit({ ...edit, locked: !edit.locked })}
                className={cx('btn', edit.locked ? 'btn-accent' : 'btn-outline')}
                title="Qulflash — avtomatik to'ldirishda joyida qoladi"
              >
                {edit.locked ? <Lock size={15} /> : <Unlock size={15} />} {edit.locked ? 'Qulflangan' : 'Qulflash'}
              </button>
              <button onClick={() => setEdit(null)} className="btn btn-outline">
                Bekor
              </button>
              <button onClick={commitEdit} className="btn btn-accent">
                Saqlash
              </button>
            </>
          }
        >
          <div className="grid gap-3">
            <Field label="Fan">
              <div className="input bg-surface-2">
                {subjById(lessonById(edit.lessonId)?.subjectId ?? '')?.name ?? '—'}
              </div>
            </Field>
            <Field label="1-o'qituvchi">
              <SelectField value={edit.teacherId} onChange={(e) => setEdit({ ...edit, teacherId: e.target.value })}>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label="2-o'qituvchi (ixtiyoriy)">
              <SelectField
                value={edit.teacher2Id ?? ''}
                onChange={(e) => setEdit({ ...edit, teacher2Id: e.target.value || undefined })}
              >
                <option value="">— yo'q —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label="Xona (ixtiyoriy)">
              <SelectField
                value={edit.roomId ?? ''}
                onChange={(e) => setEdit({ ...edit, roomId: e.target.value || undefined })}
              >
                <option value="">— yo'q —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label="Hafta">
              <SelectField
                value={edit.week ?? 'all'}
                onChange={(e) => {
                  const v = e.target.value as WeekType
                  setEdit({ ...edit, week: v === 'all' ? undefined : v })
                }}
              >
                <option value="all">{WEEK_LABEL.all}</option>
                <option value="num">{WEEK_LABEL.num}</option>
                <option value="den">{WEEK_LABEL.den}</option>
              </SelectField>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
