import { useRef, useState } from 'react'
import { FileSpreadsheet, Download, Upload, Check, Wand2, Eye, EyeOff } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import {
  readSheets,
  autoDetect,
  buildParsed,
  remap,
  applyImport,
  downloadSample,
  pickBestSheet,
  toggleClassCol,
  type SheetData,
  type Mapping,
  type Parsed,
} from '@/io/importTaqsimot'

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'ask' | 'preview'>('ask')
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [sheetIdx, setSheetIdx] = useState(0)
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const reset = () => {
    setStep('ask')
    setFileName('')
    setSheets([])
    setSheetIdx(0)
    setMapping(null)
    setParsed(null)
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const rows = sheets[sheetIdx]?.rows ?? []
  const header = mapping ? rows[mapping.headerRow] ?? [] : []

  const applyMapping = (shIdx: number, m: Mapping) => {
    const r = sheets[shIdx]?.rows ?? []
    setMapping(m)
    setParsed(buildParsed(r, m))
  }

  const onFile = async (file: File) => {
    setError(null)
    setBusy(true)
    try {
      const sh = await readSheets(file)
      if (sh.length === 0) throw new Error("Faylda ma'lumot topilmadi")
      setSheets(sh)
      // Multi-sheet fayllarda eng mos varaqni avtomatik tanlash
      const best = pickBestSheet(sh) ?? sh[0]
      const idx = Math.max(0, sh.indexOf(best))
      setSheetIdx(idx)
      setFileName(file.name)
      const m = autoDetect(sh[idx].rows)
      setMapping(m)
      const p = buildParsed(sh[idx].rows, m)
      setParsed(p)
      // Hech narsa aniqlanmasa — xom ma'lumotlarni darhol ko'rsatamiz
      if (p.rows.length === 0) setShowRaw(true)
      setStep('preview')
    } catch (e) {
      setError((e as Error).message || "Faylni o'qib bo'lmadi")
    } finally {
      setBusy(false)
    }
  }

  const changeSheet = (idx: number) => {
    setSheetIdx(idx)
    const m = autoDetect(sheets[idx].rows)
    applyMapping(idx, m)
  }

  const setCol = (which: 'teacherCol' | 'subjectCol' | 'headerRow', value: number) => {
    if (!mapping) return
    const next = { ...mapping, [which]: value }
    const m = remap(rows, next.headerRow, next.teacherCol, next.subjectCol)
    applyMapping(sheetIdx, m)
  }

  const toggleCol = (col: number) => {
    if (!mapping) return
    const m = toggleClassCol(mapping, col)
    applyMapping(sheetIdx, m)
  }

  const doImport = () => {
    if (!parsed) return
    if (parsed.rows.length === 0) {
      setError("Hech qanday dars topilmadi — pastdagi \"Sinf ustunlari\" bo'limida sinflarni qo'lda belgilang yoki \"Fayl mazmuni\" ni ko'rib ustunlarni to'g'rilang")
      setShowRaw(true)
      return
    }
    const { project: next, summary } = applyImport(parsed, project)
    setProject(next)
    const parts: string[] = []
    if (summary.classes > 0) parts.push(`+${summary.classes} sinf`)
    if (summary.subjects > 0) parts.push(`+${summary.subjects} fan`)
    if (summary.teachers > 0) parts.push(`+${summary.teachers} o'qituvchi`)
    if (summary.lessons > 0) parts.push(`+${summary.lessons} yangi dars`)
    if (summary.updated > 0) parts.push(`${summary.updated} dars yangilandi`)
    if (parts.length === 0) {
      toast.info(`Hamma ma'lumot allaqachon mavjud (${summary.hours} soat tekshirildi) — hech narsa o'zgarmadi`)
    } else {
      toast.success('Import: ' + parts.join(', '))
    }
    close()
  }

  const colOptions = header.map((h, i) => ({ i, label: `${colLetter(i)} — ${h || '(bo‘sh)'}` }))

  // Barcha ustunlarning umumiy soni (sarlavha + ma'lumot qatorlaridan maksimum)
  const totalCols = Math.max(
    header.length,
    ...rows.slice(mapping?.headerRow ?? 0, (mapping?.headerRow ?? 0) + 20).map((r) => r?.length ?? 0),
  )

  return (
    <Modal
      open={open}
      title="Dars taqsimotini import qilish"
      onClose={close}
      width={step === 'preview' ? 'max-w-4xl' : 'max-w-md'}
      footer={
        step === 'preview' ? (
          <>
            {error && <span className="mr-auto text-sm text-danger">{error}</span>}
            <button onClick={() => setStep('ask')} className="btn btn-outline">
              Orqaga
            </button>
            <button onClick={doImport} className="btn btn-accent">
              <Check size={16} /> Import qilish
            </button>
          </>
        ) : undefined
      }
    >
      {step === 'ask' ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <p className="text-base font-semibold">Sizda Excelda tayyorlangan dars taqsimoti bormi?</p>
            <p className="mt-1 text-sm text-muted">
              Ustun = sinf, qator = o'qituvchi + fan, katak = soat. Dastur o'zi o'qib tushunadi.
            </p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => fileInput.current?.click()} disabled={busy} className="btn btn-accent">
              {busy ? <Wand2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Ha — Excel faylni tanlash
            </button>
            <button onClick={close} className="btn btn-outline">
              Yo'q
            </button>
          </div>
          <div className="mt-1 flex flex-col items-center gap-1">
            <button onClick={() => downloadSample()} className="btn btn-outline h-9">
              <Download size={15} /> Namuna (shablon) faylni yuklab olish
            </button>
            <span className="text-[11px] text-muted">Qanday ko'rinishda bo'lishini bilmasangiz — namunani oching</span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ''
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileSpreadsheet size={16} className="text-accent" />
            <span className="font-medium">{fileName}</span>
            {sheets.length > 1 && (
              <select
                value={sheetIdx}
                onChange={(e) => changeSheet(+e.target.value)}
                className="input h-8 w-auto"
              >
                {sheets.map((sh, i) => (
                  <option key={i} value={i}>
                    {sh.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Ustunlarni tuzatish */}
          {mapping && (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface-2 p-2 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-muted">Sarlavha qatori</span>
                <input
                  type="number"
                  min={1}
                  value={mapping.headerRow + 1}
                  onChange={(e) => setCol('headerRow', Math.max(0, +e.target.value - 1))}
                  className="input h-8"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted">O'qituvchi ustuni</span>
                <select value={mapping.teacherCol} onChange={(e) => setCol('teacherCol', +e.target.value)} className="input h-8">
                  {colOptions.map((o) => (
                    <option key={o.i} value={o.i}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted">Fan ustuni</span>
                <select value={mapping.subjectCol} onChange={(e) => setCol('subjectCol', +e.target.value)} className="input h-8">
                  {colOptions.map((o) => (
                    <option key={o.i} value={o.i}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Sinf ustunlari — qo'lda belgilash */}
          {mapping && (
            <div className="rounded-lg border border-border bg-surface-2 p-2 text-xs">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-semibold">Sinf ustunlari</span>
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="btn btn-outline h-6 px-2 text-[11px]"
                >
                  {showRaw ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showRaw ? 'Fayl mazmunini yashirish' : 'Fayl mazmunini ko‘rish'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: totalCols }, (_, i) => i)
                  .filter((i) => i !== mapping.teacherCol && i !== mapping.subjectCol)
                  .map((i) => {
                    const h = header[i] || ''
                    const active = mapping.classCols.includes(i)
                    return (
                      <button
                        key={i}
                        onClick={() => toggleCol(i)}
                        className={`rounded border px-2 py-0.5 text-[11px] transition ${
                          active
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-border bg-surface text-muted hover:text-text'
                        }`}
                        title={active ? 'Sinf ustuni (bosib o‘chirish)' : 'Sinf emas (bosib qo‘shish)'}
                      >
                        {active ? '☑ ' : '☐ '}
                        <span className="font-mono">{colLetter(i)}</span>
                        {h && <span className="ml-1">— {h.length > 12 ? h.slice(0, 12) + '…' : h}</span>}
                      </button>
                    )
                  })}
              </div>
              {mapping.classCols.length === 0 && (
                <p className="mt-1.5 text-[11px] text-danger">
                  Hech qanday sinf ustuni belgilanmagan — yuqoridagi ustunlardan sinflarni tanlang
                </p>
              )}
            </div>
          )}

          {/* Fayl mazmuni — xom qatorlar (ustunlarni to'g'rilash uchun) */}
          {showRaw && (
            <div className="max-h-[25vh] overflow-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    <th className="border-b border-border px-1.5 py-1 text-center font-mono text-muted">#</th>
                    {Array.from({ length: totalCols }, (_, i) => {
                      const role = i === mapping?.teacherCol
                        ? 'O\'q.'
                        : i === mapping?.subjectCol
                        ? 'Fan'
                        : mapping?.classCols.includes(i)
                        ? 'Sinf'
                        : ''
                      return (
                        <th
                          key={i}
                          className={`border-b border-l border-border px-1.5 py-1 text-center font-mono ${
                            role === 'Sinf' ? 'bg-accent/10 text-accent' : role ? 'bg-primary/10 text-primary' : 'text-muted'
                          }`}
                        >
                          {colLetter(i)}
                          {role && <div className="text-[9px] font-sans">{role}</div>}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 15).map((r, i) => (
                    <tr
                      key={i}
                      className={`${
                        i === mapping?.headerRow ? 'bg-primary/5 font-semibold' : 'odd:bg-surface even:bg-surface-2/40'
                      }`}
                    >
                      <td className="border-b border-border/60 px-1.5 py-0.5 text-center font-mono text-muted">
                        {i + 1}
                      </td>
                      {Array.from({ length: totalCols }, (_, c) => (
                        <td
                          key={c}
                          className={`border-b border-l border-border/60 px-1.5 py-0.5 ${
                            mapping?.classCols.includes(c) ? 'bg-accent/5' : ''
                          }`}
                        >
                          {r[c] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 15 && (
                <p className="bg-surface-2 px-2 py-1 text-center text-[10px] text-muted">… va yana {rows.length - 15} qator</p>
              )}
            </div>
          )}

          {/* Natija xulosasi */}
          {parsed && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="chip">{parsed.classNames.length} sinf aniqlandi</span>
              <span className="chip">{parsed.rows.length} qator (o'qituvchi×fan)</span>
              <span className="chip">
                {parsed.rows.reduce((a, r) => a + Object.values(r.hours).reduce((x, y) => x + y, 0), 0)} soat
              </span>
            </div>
          )}

          {/* Preview jadval */}
          <div className="max-h-[42vh] overflow-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="border-b border-border px-2 py-1.5 text-left font-semibold">O'qituvchi</th>
                  <th className="border-b border-border px-2 py-1.5 text-left font-semibold">Fan</th>
                  {parsed?.classNames.map((cn) => (
                    <th key={cn} className="border-b border-l border-border px-2 py-1.5 text-center font-semibold">
                      {cn}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed?.rows.slice(0, 40).map((r, i) => (
                  <tr key={i} className="odd:bg-surface even:bg-surface-2/40">
                    <td className="border-b border-border/60 px-2 py-1 whitespace-nowrap">{r.teacher || '—'}</td>
                    <td className="border-b border-border/60 px-2 py-1 whitespace-nowrap">{r.subject}</td>
                    {parsed.classNames.map((cn) => (
                      <td key={cn} className="border-b border-l border-border/60 px-2 py-1 text-center tnum">
                        {r.hours[cn] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed && parsed.rows.length > 40 && (
            <p className="text-center text-xs text-muted">… va yana {parsed.rows.length - 40} qator</p>
          )}
        </div>
      )}
    </Modal>
  )
}

function colLetter(i: number): string {
  let n = i
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}
