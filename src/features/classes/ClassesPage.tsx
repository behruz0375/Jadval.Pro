import { Users, Upload } from 'lucide-react'
import { useRef } from 'react'
import { useProject } from '@/store/project'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { CrudModule } from '@/features/_shared/CrudModule'
import { AvailabilityGrid } from '@/components/AvailabilityGrid'
import { Field, TextField, NumberField, SelectField } from '@/components/Field'
import { classLoad } from '@/features/_shared/compute'
import { exportListToExcel } from '@/io/excel'
import { importClassesFromExcel } from '@/io/importLists'
import { AvailabilityBar } from '@/components/AvailabilityBar'
import { newClass } from '@/data/factories'
import type { Column } from '@/components/Table'
import type { SchoolClass } from '@/types'

export function ClassesPage() {
  const project = useProject((s) => s.project)
  const addClass = useProject((s) => s.addClass)
  const updateClass = useProject((s) => s.updateClass)
  const removeClass = useProject((s) => s.removeClass)
  const moveEntity = useProject((s) => s.moveEntity)
  const applyAvailabilityToAll = useProject((s) => s.applyAvailabilityToAll)
  const toast = useToast()
  const planLimit = useAuth((s) => s.planLimit)
  const { school, lessons, rooms } = project

  const guardedAdd = (c: SchoolClass) => {
    const lim = planLimit('classes')
    if (lim !== null && project.classes.length >= lim) {
      toast.error(`Tarif cheklovi: maksimum ${lim} ta sinf (joriy tarif bo'yicha)`)
      return
    }
    addClass(c)
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const res = await importClassesFromExcel(file, project)
      res.added.forEach(guardedAdd)
      if (res.added.length) toast.success(`${res.added.length} ta sinf import qilindi`)
      if (res.errors.length) toast.info(res.errors.slice(0, 3).join(' · ') + (res.errors.length > 3 ? '…' : ''))
      if (!res.added.length && !res.errors.length) toast.error('Fayldan sinf topilmadi')
    } catch (err) {
      toast.error('Importda xatolik: ' + (err as Error).message)
    }
  }

  const columns: Column<SchoolClass>[] = [
    { key: 'n', header: '#', width: 44, align: 'center', render: (_r, i) => <span className="text-muted">{i + 1}</span> },
    { key: 'name', header: 'Sinf nomi', render: (r) => <b>{r.name}</b> },
    { key: 'short', header: 'Qisqacha', render: (r) => r.short },
    { key: 'students', header: "O'quvchi", align: 'center', render: (r) => r.studentCount },
    { key: 'shift', header: 'Navbat', align: 'center', render: (r) => `${r.shiftIndex}-navbat` },
    { key: 'load', header: 'Yuklama', align: 'center', render: (r) => classLoad(r.id, lessons) },
    { key: 'avail', header: 'Ish vaqti', align: 'center', render: (r) => <AvailabilityBar value={r.availability} /> },
    { key: 'building', header: 'Bino', render: (r) => r.building },
  ]

  return (
    <CrudModule<SchoolClass>
      title="Sinflar"
      icon={Users}
      entityName="sinf"
      columns={columns}
      rows={project.classes}
      create={() => newClass(school)}
      add={guardedAdd}
      update={updateClass}
      remove={removeClass}
      onReorder={(id, dir) => moveEntity('classes', id, dir)}
      onExport={() =>
        exportListToExcel(
          'Sinflar',
          ['#', 'Sinf nomi', 'Qisqacha', "O'quvchi", 'Navbat', 'Yuklama', 'Bino'],
          project.classes.map((c, i) => [i + 1, c.name, c.short, c.studentCount, c.shiftIndex, classLoad(c.id, lessons), c.building]),
        )
      }
      footerSummary={(rows) => (
        <span>
          Umumiy yuklama: <b className="text-ink">{rows.reduce((a, c) => a + classLoad(c.id, lessons), 0)}</b> soat
        </span>
      )}
      extraActions={
        <>
          <button onClick={() => fileRef.current?.click()} className="btn btn-outline justify-start" title="Excel'dan sinflar ro'yxatini import qilish">
            <Upload size={16} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
        </>
      }
      searchText={(r) => `${r.name} ${r.short} ${r.building}`}
      validate={(d) => (d.name.trim() ? null : 'Sinf nomini kiriting')}
      formWidth="max-w-3xl"
      renderForm={(d, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sinf nomi">
            <TextField
              value={d.name}
              onChange={(e) => set({ name: e.target.value, short: d.short || e.target.value })}
              placeholder="5-A"
              autoFocus
            />
          </Field>
          <Field label="Qisqacha">
            <TextField value={d.short} onChange={(e) => set({ short: e.target.value })} placeholder="5A" />
          </Field>
          <Field label="O'quvchilar soni">
            <NumberField value={d.studentCount} min={1} onChange={(e) => set({ studentCount: +e.target.value })} />
          </Field>
          <Field label="Navbat">
            <SelectField value={d.shiftIndex} onChange={(e) => set({ shiftIndex: +e.target.value })}>
              <option value={1}>1-navbat</option>
              <option value={2}>2-navbat</option>
              <option value={3}>3-navbat</option>
            </SelectField>
          </Field>
          <Field label="Bino">
            {project.school.buildings && project.school.buildings.length > 0 ? (
              <SelectField value={d.building} onChange={(e) => set({ building: e.target.value })}>
                <option value="">—</option>
                {project.school.buildings.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </SelectField>
            ) : (
              <TextField value={d.building} onChange={(e) => set({ building: e.target.value })} />
            )}
          </Field>
          <Field label="Biriktirilgan xona (ixtiyoriy)">
            <SelectField value={d.homeRoomId ?? ''} onChange={(e) => set({ homeRoomId: e.target.value || undefined })}>
              <option value="">— yo'q —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </SelectField>
          </Field>
          <div className="sm:col-span-2">
            <AvailabilityGrid
              value={d.availability}
              onChange={(v) => set({ availability: v })}
              workDays={school.workDays}
              shifts={school.shifts}
              onApplyToAll={(t) => {
                applyAvailabilityToAll(t, d.availability)
                toast.success('Ish vaqti barchasiga qo‘llandi')
              }}
            />
          </div>
        </div>
      )}
    />
  )
}
