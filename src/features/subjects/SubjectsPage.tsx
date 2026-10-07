import { BookOpen } from 'lucide-react'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { CrudModule } from '@/features/_shared/CrudModule'
import { AvailabilityGrid } from '@/components/AvailabilityGrid'
import { Field, TextField, NumberField, SelectField } from '@/components/Field'
import { subjectLoad } from '@/features/_shared/compute'
import { exportListToExcel } from '@/io/excel'
import { AvailabilityBar } from '@/components/AvailabilityBar'
import { newSubject, SUBJECT_PRESETS } from '@/data/factories'
import type { Column } from '@/components/Table'
import type { Subject } from '@/types'

export function SubjectsPage() {
  const project = useProject((s) => s.project)
  const addSubject = useProject((s) => s.addSubject)
  const updateSubject = useProject((s) => s.updateSubject)
  const removeSubject = useProject((s) => s.removeSubject)
  const moveEntity = useProject((s) => s.moveEntity)
  const applyAvailabilityToAll = useProject((s) => s.applyAvailabilityToAll)
  const toast = useToast()
  const { school, lessons } = project

  const columns: Column<Subject>[] = [
    { key: 'n', header: '#', width: 44, align: 'center', render: (_r, i) => <span className="text-muted">{i + 1}</span> },
    {
      key: 'name',
      header: 'Fan nomi',
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
          <b>{r.name}</b>
        </span>
      ),
    },
    { key: 'short', header: 'Qisqacha', render: (r) => r.short },
    { key: 'weight', header: "Og'irlik", align: 'center', render: (r) => r.weight },
    { key: 'load', header: 'Yuklama', align: 'center', render: (r) => subjectLoad(r.id, lessons) },
    { key: 'avail', header: 'Ish vaqti', align: 'center', render: (r) => <AvailabilityBar value={r.availability} /> },
  ]

  return (
    <CrudModule<Subject>
      title="Fanlar"
      icon={BookOpen}
      entityName="fan"
      columns={columns}
      rows={project.subjects}
      create={() => newSubject(school, '', project.subjects.length)}
      add={addSubject}
      update={updateSubject}
      remove={removeSubject}
      onReorder={(id, dir) => moveEntity('subjects', id, dir)}
      onExport={() =>
        exportListToExcel(
          'Fanlar',
          ['#', 'Fan nomi', 'Qisqacha', "Og'irlik", 'Yuklama'],
          project.subjects.map((s, i) => [i + 1, s.name, s.short, s.weight, subjectLoad(s.id, lessons)]),
        )
      }
      footerSummary={(rows) => (
        <span>
          Umumiy soat: <b className="text-ink">{rows.reduce((a, s) => a + subjectLoad(s.id, lessons), 0)}</b>
        </span>
      )}
      searchText={(r) => `${r.name} ${r.short}`}
      validate={(d) => (d.name.trim() ? null : 'Fan nomini kiriting')}
      formWidth="max-w-3xl"
      renderForm={(d, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fan nomi">
            <input
              className="input"
              list="subject-presets"
              value={d.name}
              onChange={(e) => set({ name: e.target.value, short: d.short || e.target.value.slice(0, 4) })}
              placeholder="Matematika"
              autoFocus
            />
            <datalist id="subject-presets">
              {SUBJECT_PRESETS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Qisqacha">
            <TextField value={d.short} onChange={(e) => set({ short: e.target.value })} placeholder="Mat" />
          </Field>
          <Field label="Og'irlik (qiyinlik 1–10)" hint="SanPiN bo'yicha taqsimot uchun">
            <NumberField value={d.weight} min={1} max={10} onChange={(e) => set({ weight: +e.target.value })} />
          </Field>
          <Field label="Talab qilinadigan xona turi">
            <SelectField value={d.requiredRoomType ?? ''} onChange={(e) => set({ requiredRoomType: e.target.value || undefined })}>
              <option value="">— istalgan —</option>
              <option value="Oddiy">Oddiy</option>
              <option value="Kimyo">Kimyo</option>
              <option value="Fizika">Fizika</option>
              <option value="Informatika">Informatika</option>
              <option value="Sport zali">Sport zali</option>
              <option value="Lingafon">Lingafon</option>
            </SelectField>
          </Field>
          <Field label="Rang">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.color}
                onChange={(e) => set({ color: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded border border-border"
              />
              <span className="text-sm text-muted">{d.color}</span>
            </div>
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
