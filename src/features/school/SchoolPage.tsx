import { useRef, useState } from 'react'
import { School as SchoolIcon, Clock, Wand2, Bell, Upload, X, Image as ImageIcon, Building2, Plus, Trash2 } from 'lucide-react'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { AvailabilityGrid } from '@/components/AvailabilityGrid'
import { Field, TextField, SelectField, NumberField } from '@/components/Field'
import { generateLessonTimes, fillShiftTimes } from '@/data/factories'
import { useT } from '@/i18n'
import { cx, uid } from '@/utils'
import type { Shift, Building } from '@/types'

export function SchoolPage() {
  const school = useProject((s) => s.project.school)
  const updateSchool = useProject((s) => s.updateSchool)
  const setMaxLessonsPerDay = useProject((s) => s.setMaxLessonsPerDay)
  const toast = useToast()
  const t = useT()
  const [tab, setTab] = useState(0)
  const shiftStartRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const buildings: Building[] = school.buildings ?? []
  const addBuilding = () => {
    const n = buildings.length + 1
    const b: Building = { id: uid('bld_'), name: `${n}-korpus`, short: `K${n}`, transitTo: {} }
    updateSchool({ buildings: [...buildings, b] })
  }
  const updateBuilding = (id: string, patch: Partial<Building>) => {
    updateSchool({ buildings: buildings.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  }
  const removeBuilding = (id: string) => {
    const next = buildings.filter((b) => b.id !== id).map((b) => {
      if (!b.transitTo) return b
      const { [id]: _rm, ...rest } = b.transitTo
      void _rm
      return { ...b, transitTo: rest }
    })
    updateSchool({ buildings: next })
  }
  const setTransit = (fromId: string, toId: string, minutes: number) => {
    updateSchool({
      buildings: buildings.map((b) => {
        if (b.id !== fromId) return b
        const transitTo = { ...(b.transitTo ?? {}) }
        if (minutes > 0) transitTo[toId] = minutes
        else delete transitTo[toId]
        return { ...b, transitTo }
      }),
    })
  }

  const setShift = (idx: number, patch: Partial<Shift>) => {
    const shifts = school.shifts.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    updateSchool({ shifts })
  }

  const shift = school.shifts[tab]
  const shiftTotal = shift.grid.reduce((a, row) => a + row.filter(Boolean).length, 0)

  const bell = {
    lessonMin: school.lessonMin ?? 45,
    breakMin: school.breakMin ?? 5,
    bigBreakAfter: school.bigBreakAfter ?? 0,
    bigBreakMin: school.bigBreakMin ?? 0,
  }

  const autoFillTimes = () => {
    const start = school.lessonTimes[0]?.start || '08:00'
    updateSchool({
      lessonTimes: generateLessonTimes(
        start, bell.lessonMin, bell.breakMin, school.lessonTimes.length || 16, bell.bigBreakAfter, bell.bigBreakMin,
      ),
    })
  }

  const fillThisShift = () => {
    const startTime = shiftStartRef.current?.value || school.lessonTimes[shift.startLesson - 1]?.start || '08:00'
    updateSchool({
      lessonTimes: fillShiftTimes(
        school.lessonTimes, shift.startLesson, shift.lessonCount, startTime,
        bell.lessonMin, bell.breakMin, bell.bigBreakAfter, bell.bigBreakMin,
      ),
    })
    toast.success(`${tab + 1}-navbat qo'ng'iroqlari to'ldirildi`)
  }

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Rasm fayl tanlang')
    if (file.size > 1_200_000) return toast.error('Rasm hajmi 1.2 MB dan katta — kichikrog‘ini tanlang')
    const reader = new FileReader()
    reader.onload = () => updateSchool({ logo: String(reader.result) })
    reader.onerror = () => toast.error("Rasmni o'qib bo'lmadi")
    reader.readAsDataURL(file)
  }

  const setTime = (i: number, key: 'start' | 'end', val: string) => {
    const lessonTimes = school.lessonTimes.map((t, idx) => (idx === i ? { ...t, [key]: val } : t))
    updateSchool({ lessonTimes })
  }

  return (
    <div className="fade-in flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <SchoolIcon size={20} />
        </div>
        <h1 className="text-lg font-bold">Maktab ma'lumotlari</h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Muassasa haqida */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Muassasa haqida</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Muassasa nomi" className="sm:col-span-2">
              <TextField value={school.name} onChange={(e) => updateSchool({ name: e.target.value })} placeholder="1-son umumiy o'rta ta'lim maktabi" />
            </Field>
            <Field label="O'quv yili">
              <TextField value={school.academicYear} onChange={(e) => updateSchool({ academicYear: e.target.value })} />
            </Field>
            <Field label="O'quv kunlari (hafta)">
              <SelectField value={school.workDays} onChange={(e) => updateSchool({ workDays: +e.target.value })}>
                <option value={5}>5 kunlik</option>
                <option value={6}>6 kunlik</option>
              </SelectField>
            </Field>
            <Field label="Kuniga maks. dars" hint="Jadval va ish vaqti kataklari soni">
              <NumberField
                value={school.maxLessonsPerDay}
                min={4}
                max={16}
                onChange={(e) => setMaxLessonsPerDay(Math.min(16, Math.max(1, +e.target.value || 1)))}
              />
            </Field>
            <Field label="Direktor">
              <TextField value={school.director} onChange={(e) => updateSchool({ director: e.target.value })} />
            </Field>
            <Field label="O'IBDO'">
              <TextField value={school.oibdo} onChange={(e) => updateSchool({ oibdo: e.target.value })} />
            </Field>
            <Field label="Kasaba uyushma raisi">
              <TextField value={school.unionHead} onChange={(e) => updateSchool({ unionHead: e.target.value })} />
            </Field>
            <Field label="Psixolog">
              <TextField value={school.psychologist} onChange={(e) => updateSchool({ psychologist: e.target.value })} />
            </Field>
            <Field label="Manzil" className="sm:col-span-2">
              <TextField value={school.address ?? ''} onChange={(e) => updateSchool({ address: e.target.value })} placeholder="Shahar, tuman, ko'cha" />
            </Field>
            <Field label="Hudud (tuman/viloyat)">
              <TextField value={school.region ?? ''} onChange={(e) => updateSchool({ region: e.target.value })} />
            </Field>
            <Field label="Telefon">
              <TextField value={school.phone ?? ''} onChange={(e) => updateSchool({ phone: e.target.value })} placeholder="+998 ..." />
            </Field>
            <Field label="STIR (INN)">
              <TextField value={school.inn ?? ''} onChange={(e) => updateSchool({ inn: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <span className="label">Logotip / gerb (chop va PDF sarlavhasida)</span>
              <div className="mt-1 flex items-center gap-3">
                {school.logo ? (
                  <img src={school.logo} alt="logo" className="h-14 w-14 rounded-lg border border-border object-contain bg-white p-1" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-border text-muted">
                    <ImageIcon size={20} />
                  </div>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
                <button onClick={() => logoInputRef.current?.click()} className="btn btn-outline h-9">
                  <Upload size={15} /> {school.logo ? "O'zgartirish" : 'Yuklash'}
                </button>
                {school.logo && (
                  <button onClick={() => updateSchool({ logo: undefined })} className="btn btn-outline h-9 text-danger">
                    <X size={15} /> Olib tashlash
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Navbatlar */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Navbatlar</h2>
            <span className="chip">Jami: {shiftTotal} ta</span>
          </div>

          <div className="mb-3 flex gap-1 rounded-lg bg-surface-2 p-1">
            {school.shifts.map((s, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={cx(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === i ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink',
                )}
              >
                {i + 1}-Navbat
              </button>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <Field label="Boshlanishi (dars)">
              <input
                type="number"
                min={1}
                max={16}
                value={shift.startLesson}
                onChange={(e) => setShift(tab, { startLesson: +e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Dars soni">
              <input
                type="number"
                min={0}
                max={16}
                value={shift.lessonCount}
                onChange={(e) => setShift(tab, { lessonCount: +e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-2/50 p-2.5">
            <Field label="Navbat boshlanish vaqti">
              <input
                key={tab}
                ref={shiftStartRef}
                type="time"
                defaultValue={school.lessonTimes[shift.startLesson - 1]?.start || '08:00'}
                className="input h-9"
              />
            </Field>
            <button onClick={fillThisShift} className="btn btn-outline h-9" title="Shu navbat darslari uchun qo'ng'iroq vaqtlarini to'ldirish">
              <Bell size={15} /> Qo'ng'iroqni to'ldirish
            </button>
          </div>

          <AvailabilityGrid
            value={shift.grid}
            onChange={(v) => setShift(tab, { grid: v })}
            workDays={school.workDays}
          />
        </section>
      </div>

      {/* Dars vaqtlari */}
      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock size={18} /> Dars vaqtlari
          </h2>
          <button onClick={autoFillTimes} className="btn btn-outline h-8">
            <Wand2 size={15} /> Avto to'ldirish
          </button>
        </div>

        {/* Qo'ng'iroq sozlamalari */}
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2/50 p-3 sm:grid-cols-4">
          <Field label="Dars (daqiqa)">
            <NumberField value={bell.lessonMin} min={20} max={90} onChange={(e) => updateSchool({ lessonMin: +e.target.value || 45 })} />
          </Field>
          <Field label="Tanaffus (daqiqa)">
            <NumberField value={bell.breakMin} min={0} max={60} onChange={(e) => updateSchool({ breakMin: +e.target.value || 0 })} />
          </Field>
          <Field label="Katta tanaffus (nechanchi darsdan keyin)" hint="0 = yo'q">
            <NumberField value={bell.bigBreakAfter} min={0} max={10} onChange={(e) => updateSchool({ bigBreakAfter: +e.target.value || 0 })} />
          </Field>
          <Field label="Katta tanaffus (daqiqa)">
            <NumberField value={bell.bigBreakMin} min={0} max={60} onChange={(e) => updateSchool({ bigBreakMin: +e.target.value || 0 })} />
          </Field>
        </div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {school.lessonTimes.map((lt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-sm text-muted">{lt.index}-{t('dars')}:</span>
              <input type="time" value={lt.start} onChange={(e) => setTime(i, 'start', e.target.value)} className="input h-8 px-2" />
              <span className="text-muted">–</span>
              <input type="time" value={lt.end} onChange={(e) => setTime(i, 'end', e.target.value)} className="input h-8 px-2" />
            </div>
          ))}
        </div>
      </section>

      {/* Binolar (korpuslar) + binolararo o'tish vaqti */}
      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <Building2 size={18} /> {t('Binolar (korpuslar)')}
          </h2>
          <button onClick={addBuilding} className="btn btn-outline h-8">
            <Plus size={15} /> {t("Bino qo'shish")}
          </button>
        </div>
        {buildings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-2/40 p-4 text-center text-sm text-muted">
            {t("Agar maktab bir nechta korpusda joylashgan bo'lsa — har bino uchun nom va binolararo o'tish vaqtini kiriting. Bu konfliktlar sahifasida ogohlantirish uchun ishlatiladi.")}
          </p>
        ) : (
          <>
            <div className="mb-3 grid gap-2">
              {buildings.map((b, i) => (
                <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2/40 p-2">
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-muted">#{i + 1}</span>
                  <TextField
                    value={b.name}
                    onChange={(e) => updateBuilding(b.id, { name: e.target.value })}
                    placeholder={`${i + 1}-${t('korpus')}`}
                  />
                  <TextField
                    value={b.short}
                    onChange={(e) => updateBuilding(b.id, { short: e.target.value })}
                    placeholder={`K${i + 1}`}
                  />
                  <button onClick={() => removeBuilding(b.id)} className="btn btn-outline h-9 text-danger" title={t("O'chirish")}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            {buildings.length >= 2 && (
              <div className="rounded-lg border border-border p-2">
                <p className="mb-2 text-xs text-muted">{t("Binolararo o'tish vaqti (daqiqa) — tanaffusdagi yurish uchun")}</p>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border-b border-border px-2 py-1 text-left text-muted">{t('Qayerdan \\ qayerga')}</th>
                      {buildings.map((b) => (
                        <th key={b.id} className="border-b border-l border-border px-2 py-1">{b.short || b.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {buildings.map((bFrom) => (
                      <tr key={bFrom.id}>
                        <th className="border-b border-border px-2 py-1 text-left font-medium">{bFrom.short || bFrom.name}</th>
                        {buildings.map((bTo) => (
                          <td key={bTo.id} className="border-b border-l border-border p-0 text-center">
                            {bFrom.id === bTo.id ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={60}
                                value={bFrom.transitTo?.[bTo.id] ?? ''}
                                onChange={(e) => setTransit(bFrom.id, bTo.id, Math.max(0, +e.target.value || 0))}
                                className="h-7 w-14 bg-transparent text-center outline-none focus:bg-accent/10"
                                placeholder="0"
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
