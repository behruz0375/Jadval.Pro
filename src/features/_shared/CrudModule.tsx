import { useMemo, useState } from 'react'
import { FilePlus2, Pencil, Trash2, Search, Download, Copy, ChevronUp, ChevronDown, type LucideIcon } from 'lucide-react'
import { Table, type Column } from '@/components/Table'
import { Modal } from '@/components/Modal'
import { cx } from '@/utils'
import { useT } from '@/i18n'

export interface CrudModuleProps<T extends { id: string }> {
  title: string
  icon?: LucideIcon
  columns: Column<T>[]
  rows: T[]
  create: () => T
  add: (t: T) => void
  update: (id: string, patch: Partial<T>) => void
  remove: (id: string) => void
  renderForm: (draft: T, setDraft: (patch: Partial<T>) => void) => React.ReactNode
  searchText: (t: T) => string
  entityName?: string // "sinf", "fan" ...
  extraActions?: React.ReactNode
  footerSummary?: (rows: T[]) => React.ReactNode
  formWidth?: string
  onExport?: () => void
  onReorder?: (id: string, dir: -1 | 1) => void
  validate?: (draft: T) => string | null
}

export function CrudModule<T extends { id: string }>(props: CrudModuleProps<T>) {
  const { title, icon: Icon, columns, rows, create, add, update, remove } = props
  const t = useT()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ draft: T; isNew: boolean } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => props.searchText(r).toLowerCase().includes(q))
  }, [rows, query, props])

  const selected = rows.find((r) => r.id === selectedId) ?? null

  const openNew = () => {
    setError(null)
    setEditing({ draft: create(), isNew: true })
  }
  const openEdit = (row: T) => {
    setError(null)
    setEditing({ draft: { ...row }, isNew: false })
  }
  const setDraft = (patch: Partial<T>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))

  const save = () => {
    if (!editing) return
    const err = props.validate?.(editing.draft) ?? null
    if (err) {
      setError(err)
      return
    }
    if (editing.isNew) {
      add(editing.draft)
      setSelectedId(editing.draft.id)
    } else {
      update(editing.draft.id, editing.draft)
    }
    setEditing(null)
  }

  const doDelete = () => {
    if (selected) remove(selected.id)
    setSelectedId(null)
    setConfirmDel(false)
  }

  const doClone = () => {
    if (!selected) return
    const copy = { ...selected, id: create().id } as T
    add(copy)
    setSelectedId(copy.id)
  }

  const toggleSelect = (id: string) =>
    setChecked((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleAll = () =>
    setChecked((s) => (filtered.every((r) => s.has(getId(r))) ? new Set() : new Set(filtered.map(getId))))
  const deleteChecked = () => {
    checked.forEach((id) => remove(id))
    setChecked(new Set())
    setConfirmBulk(false)
    if (selectedId && checked.has(selectedId)) setSelectedId(null)
  }
  const getId = (r: T) => r.id

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Sarlavha + qidiruv */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
              <Icon size={20} />
            </div>
          )}
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
        <div className="relative ml-auto">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Qidirish...')}
            className="input h-9 w-40 pl-8 sm:w-56"
          />
        </div>
        {props.onExport && (
          <button onClick={props.onExport} className="btn btn-outline h-9">
            <Download size={16} /> {t('Eksport')}
          </button>
        )}
      </div>

      {/* Jadval + amallar */}
      <div className="flex min-h-0 flex-1 flex-col-reverse gap-3 sm:flex-row">
        <div className="min-h-0 min-w-0 flex-1">
          <Table
            columns={columns}
            rows={filtered}
            getId={(r) => r.id}
            selectedId={selectedId}
            onSelect={(r) => setSelectedId(r.id)}
            onActivate={openEdit}
            selectedIds={checked}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            empty={t("Hozircha yozuv yo'q. «Yangi» tugmasini bosing.")}
            footer={
              <div className="flex items-center justify-between">
                <span>
                  {t('Jami')}: <b className="text-ink">{filtered.length}</b> {t('ta')}
                  {query && ` (${rows.length} ${t('dan')})`}
                </span>
                {props.footerSummary?.(filtered)}
              </div>
            }
          />
        </div>

        <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:w-44 sm:flex-col">
          <button onClick={openNew} className="btn btn-accent justify-start">
            <FilePlus2 size={16} /> {t('Yangi')}
          </button>
          <button
            onClick={() => selected && openEdit(selected)}
            disabled={!selected}
            className="btn btn-outline justify-start disabled:opacity-40"
          >
            <Pencil size={16} /> {t('Tahrirlash')}
          </button>
          <button
            onClick={doClone}
            disabled={!selected}
            className="btn btn-outline justify-start disabled:opacity-40"
            title={t('Nusxa')}
          >
            <Copy size={16} /> {t('Nusxa')}
          </button>
          <button
            onClick={() => selected && setConfirmDel(true)}
            disabled={!selected}
            className="btn btn-outline justify-start text-danger disabled:opacity-40"
          >
            <Trash2 size={16} /> {t("O'chirish")}
          </button>
          {props.onReorder && (
            <div className="flex gap-2">
              <button
                onClick={() => selected && !query && props.onReorder!(selected.id, -1)}
                disabled={!selected || !!query}
                className="btn btn-outline flex-1 justify-center disabled:opacity-40"
                title={t('Yuqoriga')}
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => selected && !query && props.onReorder!(selected.id, 1)}
                disabled={!selected || !!query}
                className="btn btn-outline flex-1 justify-center disabled:opacity-40"
                title={t('Pastga')}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          )}
          {checked.size > 0 && (
            <button onClick={() => setConfirmBulk(true)} className="btn btn-danger justify-start">
              <Trash2 size={16} /> {t('Belgilangan')} ({checked.size})
            </button>
          )}
          {props.extraActions && <div className="flex flex-row flex-wrap gap-2 sm:mt-2 sm:flex-col">{props.extraActions}</div>}
        </div>
      </div>

      {/* Forma oynasi */}
      <Modal
        open={!!editing}
        title={`${editing?.isNew ? t('Yangi') : t('Tahrirlash')} — ${t(title)}`}
        onClose={() => setEditing(null)}
        width={props.formWidth ?? 'max-w-2xl'}
        footer={
          <>
            {error && <span className="mr-auto text-sm text-danger">{error}</span>}
            <button onClick={() => setEditing(null)} className="btn btn-outline">
              {t('Bekor qilish')}
            </button>
            <button onClick={save} className="btn btn-accent">
              {t('Saqlash')}
            </button>
          </>
        }
      >
        {editing && props.renderForm(editing.draft, setDraft)}
      </Modal>

      {/* O'chirishni tasdiqlash */}
      <Modal
        open={confirmDel}
        title={t("O'chirishni tasdiqlang")}
        onClose={() => setConfirmDel(false)}
        width="max-w-md"
        footer={
          <>
            <button onClick={() => setConfirmDel(false)} className="btn btn-outline">
              {t('Bekor')}
            </button>
            <button onClick={doDelete} className="btn btn-danger">
              {t("O'chirish")}
            </button>
          </>
        }
      >
        <p className={cx('text-sm')}>
          {t("Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.")}
        </p>
      </Modal>

      {/* Ko'p tanlab o'chirish tasdiqi */}
      <Modal
        open={confirmBulk}
        title={t("O'chirishni tasdiqlang")}
        onClose={() => setConfirmBulk(false)}
        width="max-w-md"
        footer={
          <>
            <button onClick={() => setConfirmBulk(false)} className="btn btn-outline">
              {t('Bekor')}
            </button>
            <button onClick={deleteChecked} className="btn btn-danger">
              {t("O'chirish")} ({checked.size})
            </button>
          </>
        }
      >
        <p className="text-sm">{t("Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.")}</p>
      </Modal>
    </div>
  )
}
