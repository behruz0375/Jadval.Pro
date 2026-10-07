import { DoorOpen, Upload } from 'lucide-react'
import { useRef } from 'react'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { CrudModule } from '@/features/_shared/CrudModule'
import { AvailabilityGrid } from '@/components/AvailabilityGrid'
import { Field, TextField, NumberField, SelectField } from '@/components/Field'
import { roomLoad } from '@/features/_shared/compute'
import { exportListToExcel } from '@/io/excel'
import { importRoomsFromExcel } from '@/io/importLists'
import { AvailabilityBar } from '@/components/AvailabilityBar'
import { newRoom } from '@/data/factories'
import type { Column } from '@/components/Table'
import type { Room } from '@/types'

export function RoomsPage() {
  const project = useProject((s) => s.project)
  const addRoom = useProject((s) => s.addRoom)
  const updateRoom = useProject((s) => s.updateRoom)
  const removeRoom = useProject((s) => s.removeRoom)
  const moveEntity = useProject((s) => s.moveEntity)
  const applyAvailabilityToAll = useProject((s) => s.applyAvailabilityToAll)
  const toast = useToast()
  const { school, lessons } = project

  const fileRef = useRef<HTMLInputElement>(null)
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const res = await importRoomsFromExcel(file, project)
      res.added.forEach(addRoom)
      if (res.added.length) toast.success(`${res.added.length} ta xona import qilindi`)
      if (res.errors.length) toast.info(res.errors.slice(0, 3).join(' · ') + (res.errors.length > 3 ? '…' : ''))
      if (!res.added.length && !res.errors.length) toast.error('Fayldan xona topilmadi')
    } catch (err) {
      toast.error('Importda xatolik: ' + (err as Error).message)
    }
  }

  const columns: Column<Room>[] = [
    { key: 'n', header: '#', width: 44, align: 'center', render: (_r, i) => <span className="text-muted">{i + 1}</span> },
    { key: 'name', header: 'Xona nomi', render: (r) => <b>{r.name}</b> },
    { key: 'short', header: 'Qisqacha', render: (r) => r.short },
    { key: 'cap', header: "Sig'im", align: 'center', render: (r) => r.capacity },
    { key: 'type', header: 'Turi', render: (r) => <span className="chip">{r.type}</span> },
    { key: 'load', header: 'Yuklama', align: 'center', render: (r) => roomLoad(r.id, lessons) },
    { key: 'avail', header: 'Ish vaqti', align: 'center', render: (r) => <AvailabilityBar value={r.availability} /> },
    { key: 'building', header: 'Bino', render: (r) => r.building },
  ]

  return (
    <CrudModule<Room>
      title="Xonalar"
      icon={DoorOpen}
      entityName="xona"
      columns={columns}
      rows={project.rooms}
      create={() => newRoom(school)}
      add={addRoom}
      update={updateRoom}
      remove={removeRoom}
      onReorder={(id, dir) => moveEntity('rooms', id, dir)}
      onExport={() =>
        exportListToExcel(
          'Xonalar',
          ['#', 'Xona nomi', 'Qisqacha', "Sig'im", 'Turi', 'Yuklama', 'Bino'],
          project.rooms.map((r, i) => [i + 1, r.name, r.short, r.capacity, r.type, roomLoad(r.id, lessons), r.building]),
        )
      }
      footerSummary={(rows) => (
        <span>
          Jami sig'im: <b className="text-ink">{rows.reduce((a, r) => a + r.capacity, 0)}</b>
        </span>
      )}
      extraActions={
        <>
          <button onClick={() => fileRef.current?.click()} className="btn btn-outline justify-start" title="Excel'dan xonalar ro'yxatini import qilish">
            <Upload size={16} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
        </>
      }
      searchText={(r) => `${r.name} ${r.short} ${r.type} ${r.building}`}
      validate={(d) => (d.name.trim() ? null : 'Xona nomini kiriting')}
      formWidth="max-w-3xl"
      renderForm={(d, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Xona nomi">
            <TextField value={d.name} onChange={(e) => set({ name: e.target.value, short: d.short || e.target.value })} placeholder="204-xona" autoFocus />
          </Field>
          <Field label="Qisqacha">
            <TextField value={d.short} onChange={(e) => set({ short: e.target.value })} placeholder="204" />
          </Field>
          <Field label="Sig'im (o'rin)">
            <NumberField value={d.capacity} min={1} onChange={(e) => set({ capacity: +e.target.value })} />
          </Field>
          <Field label="Turi">
            <SelectField value={d.type} onChange={(e) => set({ type: e.target.value })}>
              <option>Oddiy</option>
              <option>Kimyo</option>
              <option>Fizika</option>
              <option>Informatika</option>
              <option>Sport zali</option>
              <option>Lingafon</option>
              <option>Laboratoriya</option>
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
