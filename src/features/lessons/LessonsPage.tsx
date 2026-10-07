import { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  FilePlus2,
  Pencil,
  Trash2,
  Table2,
  Calculator,
  Link2,
} from 'lucide-react'
import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { Table, type Column } from '@/components/Table'
import { Modal } from '@/components/Modal'
import { Field, NumberField, SelectField } from '@/components/Field'
import { DualListBox } from '@/components/DualListBox'
import { newLesson } from '@/data/factories'
import { cx } from '@/utils'
import type { Lesson } from '@/types'

export function LessonsPage() {
  const project = useProject((s) => s.project)
  const addLesson = useProject((s) => s.addLesson)
  const updateLesson = useProject((s) => s.updateLesson)
  const removeLesson = useProject((s) => s.removeLesson)
  const setActivePanel = useUI((s) => s.setActivePanel)
  const { subjects, teachers, rooms, classes, lessons, school } = project

  const [filterType, setFilterType] = useState<'class' | 'subject' | 'teacher'>('class')
  const [filterValue, setFilterValue] = useState<string>('ALL')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ draft: Lesson; isNew: boolean } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? '—'
  const teacherName = (id?: string) => (id ? teachers.find((t) => t.id === id)?.short ?? '—' : '—')
  const roomName = (id?: string) => (id ? rooms.find((r) => r.id === id)?.name ?? '' : '')
  const classNames = (ids: string[]) =>
    ids.map((id) => classes.find((c) => c.id === id)?.name).filter(Boolean).join(', ')

  const valueOptions = useMemo(() => {
    if (filterType === 'class') return classes.map((c) => ({ id: c.id, label: c.name }))
    if (filterType === 'subject') return subjects.map((s) => ({ id: s.id, label: s.name }))
    return teachers.map((t) => ({ id: t.id, label: t.fullName }))
  }, [filterType, classes, subjects, teachers])

  const allLabel =
    filterType === 'class' ? 'BARCHA SINFLAR' : filterType === 'subject' ? 'BARCHA FANLAR' : "BARCHA O'QITUVCHILAR"

  const matchFilter = (l: Lesson) => {
    if (filterValue === 'ALL') return true
    if (filterType === 'class') return l.classIds.includes(filterValue)
    if (filterType === 'subject') return l.subjectId === filterValue
    return l.teacher1Id === filterValue || l.teacher2Id === filterValue
  }

  const filtered = useMemo(() => {
    let list = lessons.filter(matchFilter)
    const q = query.trim().toLowerCase()
    if (q)
      list = list.filter((l) =>
        `${subjName(l.subjectId)} ${classNames(l.classIds)} ${teacherName(l.teacher1Id)}`
          .toLowerCase()
          .includes(q),
      )
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, filterType, filterValue, query])

  const cycle = (dir: 1 | -1) => {
    const ids = ['ALL', ...valueOptions.map((o) => o.id)]
    const i = ids.indexOf(filterValue)
    setFilterValue(ids[(i + dir + ids.length) % ids.length])
  }

  const selected = lessons.find((l) => l.id === selectedId) ?? null

  const openNew = () => {
    setError(null)
    const draft = newLesson(school)
    if (filterValue !== 'ALL') {
      if (filterType === 'class') draft.classIds = [filterValue]
      else if (filterType === 'subject') draft.subjectId = filterValue
      else draft.teacher1Id = filterValue
    }
    setEditing({ draft, isNew: true })
  }
  const openEdit = (l: Lesson) => {
    setError(null)
    setEditing({ draft: { ...l, classIds: [...l.classIds] }, isNew: false })
  }
  const setDraft = (patch: Partial<Lesson>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))

  const save = () => {
    if (!editing) return
    const d = editing.draft
    if (!d.subjectId) return setError('Fan tanlang')
    if (d.classIds.length === 0) return setError('Kamida bitta sinf tanlang')
    if (!d.teacher1Id) return setError("1-o'qituvchini tanlang")
    if (editing.isNew) {
      addLesson(d)
      setSelectedId(d.id)
    } else {
      updateLesson(d.id, d)
    }
    setEditing(null)
  }

  const doDelete = () => {
    if (selected) removeLesson(selected.id)
    setSelectedId(null)
    setConfirmDel(false)
  }

  const columns: Column<Lesson>[] = [
    { key: 'n', header: '#', width: 44, align: 'center', render: (_r, i) => <span className="text-muted">{i + 1}</span> },
    {
      key: 'subj',
      header: 'Dars',
      render: (r) => {
        const s = subjects.find((x) => x.id === r.subjectId)
        return (
          <span className="flex items-center gap-2">
            {s && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />}
            <b>{subjName(r.subjectId)}</b>
          </span>
        )
      },
    },
    { key: 'cls', header: 'Sinf(lar)', render: (r) => classNames(r.classIds) },
    { key: 't1', header: "1-o'qituvchi", render: (r) => teacherName(r.teacher1Id) },
    { key: 't2', header: "2-o'qituvchi", render: (r) => (r.teacher2Id ? teacherName(r.teacher2Id) : '—') },
    { key: 'room', header: 'Xona', render: (r) => roomName(r.roomId) || '—' },
    { key: 'load', header: 'Yuklama', align: 'center', render: (r) => <b>{r.hoursPerWeek}</b> },
    {
      key: 'seq',
      header: 'Ketma-ket',
      align: 'center',
      render: (r) => (r.consecutive ? <span className="chip text-accent"><Link2 size={12} /> juft</span> : '—'),
    },
  ]

  const totalHours = filtered.reduce((a, l) => a + l.hoursPerWeek, 0)

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Yuqori panel */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
            <CalendarDays size={20} />
          </div>
          <h1 className="text-lg font-bold">Darslar</h1>
        </div>

        {/* Filtr: tur (Sinf/Fan/O'qituvchi) + qiymat */}
        <div className="ml-2 flex items-center gap-1">
          <SelectField
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as 'class' | 'subject' | 'teacher')
              setFilterValue('ALL')
            }}
            className="h-9 w-28"
            title="Filtr turi"
          >
            <option value="class">Sinf</option>
            <option value="subject">Fan</option>
            <option value="teacher">O'qituvchi</option>
          </SelectField>
          <button className="btn btn-ghost h-9 w-9 p-0" onClick={() => cycle(-1)} title="Oldingi">
            <ChevronLeft size={18} />
          </button>
          <SelectField value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="h-9 w-48">
            <option value="ALL">{allLabel}</option>
            {valueOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <button className="btn btn-ghost h-9 w-9 p-0" onClick={() => cycle(1)} title="Keyingi">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qidirish..." className="input h-9 w-44 pl-8" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setActivePanel('curriculum')} className="btn btn-outline h-9">
            <Table2 size={16} /> O'quv reja
          </button>
          <button onClick={() => setActivePanel('tariff')} className="btn btn-outline h-9">
            <Calculator size={16} /> Tarifikatsiya
          </button>
        </div>
      </div>

      {/* Jadval + amallar */}
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <Table
            columns={columns}
            rows={filtered}
            getId={(r) => r.id}
            selectedId={selectedId}
            onSelect={(r) => setSelectedId(r.id)}
            onActivate={openEdit}
            empty={'Dars yo\'q. "Yaratish" tugmasini bosing.'}
            footer={
              <div className="flex items-center justify-between">
                <span>
                  Jami: <b className="text-ink">{filtered.length}</b> ta dars
                </span>
                <span>
                  Umumiy yuklama: <b className="text-ink">{totalHours}</b> soat
                </span>
              </div>
            }
          />
        </div>

        <div className="flex w-48 shrink-0 flex-col gap-2">
          <button onClick={openNew} className="btn btn-accent justify-start">
            <FilePlus2 size={16} /> Yaratish
          </button>
          <button onClick={() => selected && openEdit(selected)} disabled={!selected} className="btn btn-outline justify-start disabled:opacity-40">
            <Pencil size={16} /> Tahrirlash
          </button>
          <button onClick={() => selected && setConfirmDel(true)} disabled={!selected} className="btn btn-outline justify-start text-danger disabled:opacity-40">
            <Trash2 size={16} /> O'chirish
          </button>
        </div>
      </div>

      {/* Forma */}
      <Modal
        open={!!editing}
        title={`${editing?.isNew ? 'Yangi dars' : 'Darsni tahrirlash'}`}
        onClose={() => setEditing(null)}
        width="max-w-2xl"
        footer={
          <>
            {error && <span className="mr-auto text-sm text-danger">{error}</span>}
            <button onClick={() => setEditing(null)} className="btn btn-outline">Bekor qilish</button>
            <button onClick={save} className="btn btn-accent">Saqlash</button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fan (dars)">
              <SelectField value={editing.draft.subjectId} onChange={(e) => setDraft({ subjectId: e.target.value })} autoFocus>
                <option value="">— tanlang —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="Haftalik soat">
              <NumberField value={editing.draft.hoursPerWeek} min={1} max={16} onChange={(e) => setDraft({ hoursPerWeek: +e.target.value })} />
            </Field>

            <Field label="1-o'qituvchi">
              <SelectField value={editing.draft.teacher1Id} onChange={(e) => setDraft({ teacher1Id: e.target.value })}>
                <option value="">— tanlang —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="2-o'qituvchi (ixtiyoriy)">
              <SelectField value={editing.draft.teacher2Id ?? ''} onChange={(e) => setDraft({ teacher2Id: e.target.value || undefined })}>
                <option value="">— yo'q —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </SelectField>
            </Field>

            <Field label="Xona (ixtiyoriy)">
              <SelectField value={editing.draft.roomId ?? ''} onChange={(e) => setDraft({ roomId: e.target.value || undefined })}>
                <option value="">— avtomatik —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="Kuniga maksimum">
              <NumberField value={editing.draft.maxPerDay} min={1} max={8} onChange={(e) => setDraft({ maxPerDay: +e.target.value })} />
            </Field>

            {/* Sinflar — ikki ustunli tanlov */}
            <div className="sm:col-span-2">
              <span className="label">Sinf(lar)</span>
              {classes.length === 0 ? (
                <div className="mt-1 rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
                  Avval "Sinflar" bo'limida sinf qo'shing.
                </div>
              ) : (
                <div className="mt-1">
                  <DualListBox
                    value={editing.draft.classIds}
                    options={classes.map((c) => ({ id: c.id, label: c.name }))}
                    onChange={(classIds) => setDraft({ classIds })}
                    leftTitle="Barcha sinflar"
                    rightTitle="Tanlangan"
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-muted">Bir nechta sinf tanlansa — birlashgan (qo'shma) dars bo'ladi.</p>
            </div>

            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-accent" checked={editing.draft.consecutive} onChange={(e) => setDraft({ consecutive: e.target.checked })} />
              <span className="label">Ketma-ket (juft dars — ikki soat yonma-yon)</span>
            </label>
          </div>
        )}
      </Modal>

      {/* O'chirish tasdiqi */}
      <Modal
        open={confirmDel}
        title="O'chirishni tasdiqlang"
        onClose={() => setConfirmDel(false)}
        width="max-w-md"
        footer={
          <>
            <button onClick={() => setConfirmDel(false)} className="btn btn-outline">Bekor</button>
            <button onClick={doDelete} className="btn btn-danger">O'chirish</button>
          </>
        }
      >
        <p className="text-sm">Rostdan ham ushbu darsni o'chirmoqchimisiz?</p>
      </Modal>
    </div>
  )
}
