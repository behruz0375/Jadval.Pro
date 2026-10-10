import { GraduationCap, Palette } from 'lucide-react'
import { useProject } from '@/store/project'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { CrudModule } from '@/features/_shared/CrudModule'
import { AvailabilityGrid } from '@/components/AvailabilityGrid'
import { Field, TextField, NumberField, SelectField } from '@/components/Field'
import { teacherLoad } from '@/features/_shared/compute'
import { exportListToExcel } from '@/io/excel'
import { importTeachersFromExcel } from '@/io/importLists'
import { AvailabilityBar } from '@/components/AvailabilityBar'
import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { newTeacher, shortName, ENTITY_COLORS } from '@/data/factories'
import { DAYS_UZ } from '@/constants'
import { cx } from '@/utils'
import type { Column } from '@/components/Table'
import type { Teacher } from '@/types'

export function TeachersPage() {
  const project = useProject((s) => s.project)
  const addTeacher = useProject((s) => s.addTeacher)
  const updateTeacher = useProject((s) => s.updateTeacher)
  const removeTeacher = useProject((s) => s.removeTeacher)
  const moveEntity = useProject((s) => s.moveEntity)
  const applyAvailabilityToAll = useProject((s) => s.applyAvailabilityToAll)
  const toast = useToast()
  const planLimit = useAuth((s) => s.planLimit)
  const { school, lessons, subjects } = project

  const guardedAddTeacher = (t: Teacher) => {
    const lim = planLimit('teachers')
    if (lim !== null && project.teachers.length >= lim) {
      toast.error(`Tarif cheklovi: maksimum ${lim} ta o'qituvchi (joriy tarif bo'yicha)`)
      return
    }
    addTeacher(t)
  }

  const subjName = (ids: string[]) =>
    ids.map((id) => subjects.find((s) => s.id === id)?.short).filter(Boolean).join(', ')

  const shuffleColors = () => {
    project.teachers.forEach((t, i) => updateTeacher(t.id, { color: ENTITY_COLORS[i % ENTITY_COLORS.length] }))
    toast.success('Ranglar qayta taqsimlandi')
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const res = await importTeachersFromExcel(file, project)
      res.added.forEach(guardedAddTeacher)
      if (res.added.length) toast.success(`${res.added.length} ta o'qituvchi import qilindi`)
      if (res.errors.length) toast.info(res.errors.slice(0, 3).join(' · ') + (res.errors.length > 3 ? '…' : ''))
      if (!res.added.length && !res.errors.length) toast.error('Fayldan hech kim topilmadi')
    } catch (err) {
      toast.error('Importda xatolik: ' + (err as Error).message)
    }
  }

  const columns: Column<Teacher>[] = [
    { key: 'n', header: '#', width: 44, align: 'center', render: (_r, i) => <span className="text-muted">{i + 1}</span> },
    {
      key: 'name',
      header: "O'qituvchi",
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color ?? '#94a3b8' }} />
          <b>{r.fullName}</b>
        </span>
      ),
    },
    { key: 'short', header: 'Qisqacha', render: (r) => r.short },
    { key: 'subj', header: 'Fanlari', render: (r) => <span className="text-muted">{subjName(r.subjectIds) || '—'}</span> },
    { key: 'load', header: 'Yuklama', align: 'center', render: (r) => teacherLoad(r.id, lessons) },
    { key: 'md', header: 'Metodik kun', align: 'center', render: (r) => (r.methodicalDay >= 0 ? DAYS_UZ[r.methodicalDay] : '—') },
    { key: 'cap', header: 'Kunlik sig\'im', align: 'center', render: (r) => r.dailyCapacity },
    { key: 'gap', header: 'Darcha', align: 'center', render: (r) => (r.minimizeGaps ? <span className="chip text-ok">kam</span> : '—') },
    { key: 'avail', header: 'Ish vaqti', align: 'center', render: (r) => <AvailabilityBar value={r.availability} /> },
  ]

  return (
    <CrudModule<Teacher>
      title="O'qituvchilar"
      icon={GraduationCap}
      entityName="o'qituvchi"
      columns={columns}
      rows={project.teachers}
      create={() => newTeacher(school)}
      add={guardedAddTeacher}
      update={updateTeacher}
      remove={removeTeacher}
      onReorder={(id, dir) => moveEntity('teachers', id, dir)}
      footerSummary={(rows) => (
        <span>
          Umumiy yuklama: <b className="text-ink">{rows.reduce((a, t) => a + teacherLoad(t.id, lessons), 0)}</b> soat
        </span>
      )}
      searchText={(r) => `${r.fullName} ${r.short} ${subjName(r.subjectIds)}`}
      onExport={() =>
        exportListToExcel(
          "O'qituvchilar",
          ['#', 'F.I.Sh.', 'Qisqacha', 'Fanlari', 'Metodik kun', "Kunlik sig'im", 'Haftalik norma', 'Yuklama'],
          project.teachers.map((t, i) => [
            i + 1,
            t.fullName,
            t.short,
            subjName(t.subjectIds),
            t.methodicalDay >= 0 ? DAYS_UZ[t.methodicalDay] : '—',
            t.dailyCapacity,
            t.weeklyMax,
            teacherLoad(t.id, lessons),
          ]),
        )
      }
      extraActions={
        <>
          <button onClick={() => fileRef.current?.click()} className="btn btn-outline justify-start" title="Excel'dan o'qituvchilar ro'yxatini import qilish">
            <Upload size={16} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
          <button onClick={shuffleColors} className="btn btn-outline justify-start" title="Barcha o'qituvchilarga rang taqsimlash">
            <Palette size={16} /> Ranglar
          </button>
        </>
      }
      validate={(d) => (d.fullName.trim() ? null : "O'qituvchi F.I.Sh. ni kiriting")}
      formWidth="max-w-3xl"
      renderForm={(d, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="F.I.Sh." className="sm:col-span-2" hint={d.short ? `Qisqacha: ${d.short}` : undefined}>
            <TextField
              value={d.fullName}
              onChange={(e) => set({ fullName: e.target.value, short: shortName(e.target.value) })}
              placeholder="Aliyev Vali Akramovich"
              autoFocus
            />
          </Field>
          <Field label="Metodik kun" hint="Tanlangan bo'lsa — dastur avtomatik ravishda shu kunga dars qo'ymaydi">
            <SelectField value={d.methodicalDay} onChange={(e) => set({ methodicalDay: +e.target.value })}>
              <option value={-1}>— yo'q (tanlanmagan) —</option>
              {DAYS_UZ.slice(0, school.workDays).map((day, i) => (
                <option key={day} value={i}>
                  {day}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Kunlik sig'im (soat)">
            <NumberField value={d.dailyCapacity} min={1} max={16} onChange={(e) => set({ dailyCapacity: +e.target.value })} />
          </Field>
          <Field label="Haftalik maksimum (soat)">
            <NumberField value={d.weeklyMax} min={1} onChange={(e) => set({ weeklyMax: +e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={d.minimizeGaps} onChange={(e) => set({ minimizeGaps: e.target.checked })} />
            <span className="label">Darcha (oynalar)ni kamaytirish</span>
          </label>

          {/* Rang */}
          <div className="sm:col-span-2">
            <span className="label">Rang belgisi</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ENTITY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set({ color: c })}
                  className={cx(
                    'h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110',
                    (d.color ?? '') === c && 'ring-2 ring-accent',
                  )}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Fanlari */}
          <div className="sm:col-span-2">
            <span className="label">O'qitadigan fanlari</span>
            <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-2">
              {subjects.length === 0 && <span className="text-sm text-muted">Avval "Fanlar" bo'limida fan qo'shing.</span>}
              {subjects.map((s) => {
                const on = d.subjectIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      set({
                        subjectIds: on ? d.subjectIds.filter((x) => x !== s.id) : [...d.subjectIds, s.id],
                      })
                    }
                    className={cx(
                      'rounded-full px-3 py-1 text-sm transition-colors',
                      on ? 'bg-accent text-accent-fg' : 'bg-surface text-ink hover:bg-surface-2 border border-border',
                    )}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>

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
