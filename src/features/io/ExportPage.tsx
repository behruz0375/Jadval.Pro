import { useEffect, useState } from 'react'
import {
  FileSpreadsheet, Printer, Save, FolderOpen, CalendarRange, FileText, Table,
  Calculator, DatabaseBackup, RotateCcw, Trash2, Shield,
} from 'lucide-react'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { exportDataToExcel } from '@/io/excel'
import { exportFormattedTimetableToExcel, exportTariffToExcel } from '@/io/excelStyled'
import { exportFullTimetablePdf, exportDataPdf } from '@/io/pdf'
import { exportTimetableCsv } from '@/io/csv'
import { saveProjectToFile, openProjectFromFile } from '@/io/projectFile'
import { listBackups, createBackup, restoreBackup, deleteBackup, type BackupMeta } from '@/io/backup'
import type { Project, TimetableVersion } from '@/types'
import type { LucideIcon } from 'lucide-react'

function workingVersion(project: Project): TimetableVersion | undefined {
  return (
    project.timetables.find((t) => t.name === 'Ishchi jadval') ??
    project.timetables[project.timetables.length - 1]
  )
}

export function ExportPage() {
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const markSaved = useProject((s) => s.markSaved)
  const toast = useToast()

  const doExcel = async () => {
    try {
      await exportDataToExcel(project)
      toast.success('Excel fayl tayyorlandi')
    } catch {
      toast.error('Excel eksportda xatolik')
    }
  }
  const doTimetableExcel = async () => {
    const v = workingVersion(project)
    if (!v) return toast.error('Avval «Taqsimot» bo‘limida jadval tuzing')
    try {
      toast.info('Excel tayyorlanmoqda...')
      await exportFormattedTimetableToExcel(project, v)
      toast.success('Formatlangan jadval Excelga chiqarildi')
    } catch {
      toast.error('Eksportda xatolik')
    }
  }
  const doTariffExcel = async () => {
    if (project.teachers.length === 0) return toast.error("Avval o'qituvchilarni kiriting")
    try {
      await exportTariffToExcel(project)
      toast.success('Tarifikatsiya Excelga chiqarildi')
    } catch {
      toast.error('Eksportda xatolik')
    }
  }
  const doTimetablePdf = async () => {
    const v = workingVersion(project)
    if (!v) return toast.error('Avval «Taqsimot» bo‘limida jadval tuzing')
    try {
      toast.info('PDF tayyorlanmoqda...')
      await exportFullTimetablePdf(project, v)
      toast.success('Jadval PDF tayyorlandi')
    } catch {
      toast.error('PDF eksportda xatolik')
    }
  }
  const doDataPdf = async () => {
    try {
      toast.info('PDF tayyorlanmoqda...')
      await exportDataPdf(project)
      toast.success("Ma'lumotlar PDF tayyorlandi")
    } catch {
      toast.error('PDF eksportda xatolik')
    }
  }
  const doTimetableCsv = () => {
    const v = workingVersion(project)
    if (!v) return toast.error('Avval «Taqsimot» bo‘limida jadval tuzing')
    try {
      exportTimetableCsv(project, v)
      toast.success('Jadval CSV tayyorlandi')
    } catch {
      toast.error('CSV eksportda xatolik')
    }
  }
  const doSave = async () => {
    saveProjectToFile(project)
    markSaved()
    await createBackup(project, 'Faylga saqlandi').catch(() => {})
    toast.success('Loyiha .jadval fayliga saqlandi')
  }
  const doOpen = async () => {
    try {
      await createBackup(project, 'Fayl ochishdan oldin').catch(() => {})
      const p = await openProjectFromFile()
      if (!p) return
      setProject(p)
      toast.success('Loyiha ochildi')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="fade-in mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Eksport va fayl</h1>
      <p className="mt-1 text-sm text-muted">Loyihani saqlang, oching yoki jadval/ma'lumotlarni PDF, Excel, CSV ga chiqaring.</p>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Loyiha fayli</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Card icon={Save} title="Loyihani saqlash" desc=".jadval fayliga saqlash (USB/pochta orqali uzatish uchun)" action="Saqlash" onClick={doSave} />
        <Card icon={FolderOpen} title="Loyihani ochish" desc=".jadval faylni yuklab, ma'lumotlarni tiklash" action="Ochish" onClick={doOpen} />
      </div>

      <h2 className="mt-7 text-sm font-semibold uppercase tracking-wide text-muted">Tayyor dars jadvali</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Card icon={FileText} title="Jadval → PDF" desc="Sinf, o'qituvchi va xona jadvallari — rekvizit va imzo bilan (chop etishga tayyor)" action="PDF" accent onClick={doTimetablePdf} />
        <Card icon={CalendarRange} title="Jadval → Excel" desc="Formatlangan: chegara, fan rangi, birlashgan kun, ustun kengligi (.xlsx)" action="Excel" onClick={doTimetableExcel} />
        <Card icon={Table} title="Jadval → CSV" desc="Sinflar jadvali — boshqa dasturlarga import uchun (.csv)" action="CSV" onClick={doTimetableCsv} />
        <Card icon={Printer} title="Chop etish" desc="Brauzer orqali to'g'ridan-to'g'ri bosib chiqarish" action="Chop etish" onClick={() => window.print()} />
      </div>
      <p className="mt-2 text-xs text-muted">PNG rasm va Word (.docx) eksporti — «Taqsimot → Jadval ko'rinishlari» bo'limida (har sinf/o'qituvchi uchun).</p>

      <h2 className="mt-7 text-sm font-semibold uppercase tracking-wide text-muted">Ma'lumotlar (ro'yxatlar)</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Card icon={FileText} title="Ma'lumotlar → PDF" desc="Sinf, fan, xona, o'qituvchi va darslar — alohida sahifalarda" action="PDF" onClick={doDataPdf} />
        <Card icon={FileSpreadsheet} title="Ma'lumotlar → Excel" desc="Har bo'lim alohida varaqda (.xlsx)" action="Excel" onClick={doExcel} />
        <Card icon={Calculator} title="Tarifikatsiya → Excel" desc="O'qituvchilar yuklamasi — formatlangan, holat rangi bilan (.xlsx)" action="Excel" onClick={doTariffExcel} />
      </div>

      <BackupPanel />

      {/* Ma'lumot xavfsizligi haqida ogohlantirish */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm">
        <Shield size={18} className="mt-0.5 shrink-0 text-warn" />
        <div>
          <p className="font-semibold">Ma'lumot xavfsizligi haqida</p>
          <p className="mt-1 text-muted">
            Barcha ma'lumot <b className="text-ink">faqat shu qurilmada</b> saqlanadi (IndexedDB).
            Server yo'q, bulutga avtomatik yuklanmaydi. Agar qurilma buzilsa yoki yangilansa — ma'lumot yo'qolishi mumkin.
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted">
            <li><b className="text-ink">Har kuni</b> «Loyihani saqlash» tugmasini bosib, <code>.jadval</code> faylini Google Drive / Yandex Disk / Telegram'ga yuklab turing.</li>
            <li>Avtomatik rezerv nusxa <b className="text-ink">har 10 daqiqada</b> IndexedDB'ga yoziladi (yuqoridagi ro'yxatda ko'rinadi).</li>
            <li>Qurilmani almashtirganda — «Loyihani ochish» orqali eski <code>.jadval</code> faylini tiklang.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function BackupPanel() {
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const toast = useToast()
  const [list, setList] = useState<BackupMeta[]>([])
  const [busy, setBusy] = useState(false)

  const refresh = () => listBackups().then(setList).catch(() => {})
  useEffect(() => {
    refresh()
  }, [])

  const doCreate = async () => {
    setBusy(true)
    try {
      await createBackup(project, "Qo'lda rezerv nusxa")
      await refresh()
      toast.success('Rezerv nusxa yaratildi')
    } catch {
      toast.error('Rezerv nusxa olinmadi')
    } finally {
      setBusy(false)
    }
  }
  const doRestore = async (id: string) => {
    const p = await restoreBackup(id)
    if (!p) return toast.error('Nusxa topilmadi')
    await createBackup(project, 'Tiklashdan oldin').catch(() => {})
    setProject(p)
    toast.success('Loyiha rezerv nusxadan tiklandi')
  }
  const doDelete = async (id: string) => {
    await deleteBackup(id)
    await refresh()
  }

  return (
    <>
      <h2 className="mt-7 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <Shield size={14} /> Rezerv nusxa (backup)
      </h2>
      <div className="card mt-2 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
            <DatabaseBackup size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Avtomatik rezerv nusxa</h3>
            <p className="mt-0.5 text-sm text-muted">
              Har saqlashda va loyihani almashtirishdan oldin oxirgi 12 nusxa qurilmada saqlanadi.
            </p>
          </div>
          <button onClick={doCreate} disabled={busy} className="btn btn-accent disabled:opacity-50">
            <DatabaseBackup size={15} /> Hozir nusxa olish
          </button>
        </div>

        {list.length > 0 ? (
          <div className="mt-4 flex flex-col gap-1.5">
            {list.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="font-medium">{new Date(b.savedAt).toLocaleString('uz')}</span>
                <span className="chip">{b.note || 'nusxa'}</span>
                <span className="text-xs text-muted">
                  {b.classes} sinf · {b.teachers} o'qit. · {b.lessons} dars · {b.timetables} jadval
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => doRestore(b.id)} className="btn btn-outline h-8 text-xs">
                    <RotateCcw size={13} /> Tiklash
                  </button>
                  <button onClick={() => doDelete(b.id)} className="btn btn-outline h-8 text-xs text-danger" title="O'chirish">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Hali rezerv nusxa yo'q.</p>
        )}
      </div>
    </>
  )
}

function Card({
  icon: Icon,
  title,
  desc,
  action,
  onClick,
  accent,
}: {
  icon: LucideIcon
  title: string
  desc: string
  action: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{desc}</p>
      </div>
      <button onClick={onClick} className={`btn self-start ${accent ? 'btn-accent' : 'btn-outline'}`}>
        {action}
      </button>
    </div>
  )
}
