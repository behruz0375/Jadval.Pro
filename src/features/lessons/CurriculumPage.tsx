import { useState } from 'react'
import { Table2, FileSpreadsheet, Link2, X } from 'lucide-react'
import { useProject } from '@/store/project'
import { newLesson } from '@/data/factories'
import { ImportDialog } from '@/features/import/ImportDialog'
import { useT } from '@/i18n'
import { cx } from '@/utils'
import type { Lesson } from '@/types'
import { useExpiry } from '@/features/pro/useExpiry'

export function CurriculumPage() {
  const t = useT()
  const { isReadOnly } = useExpiry()
  const project = useProject((s) => s.project)
  const addLesson = useProject((s) => s.addLesson)
  const updateLesson = useProject((s) => s.updateLesson)
  const removeLesson = useProject((s) => s.removeLesson)
  const { classes, subjects, lessons, teachers, school } = project
  const [importOpen, setImportOpen] = useState(false)

  // Faqat bitta sinfga tegishli darslar — asosiy gridda
  const findCell = (classId: string, subjectId: string): Lesson | undefined =>
    lessons.find(
      (l) => l.subjectId === subjectId && l.classIds.length === 1 && l.classIds[0] === classId,
    )

  const setCell = (classId: string, subjectId: string, hours: number) => {
    const existing = findCell(classId, subjectId)
    if (hours <= 0) {
      if (existing) removeLesson(existing.id)
    } else if (existing) {
      updateLesson(existing.id, { hoursPerWeek: hours })
    } else {
      const l = newLesson(school)
      l.subjectId = subjectId
      l.classIds = [classId]
      l.hoursPerWeek = hours
      addLesson(l)
    }
  }

  // Birlashgan (ko'p-sinfli) darslar — alohida bo'limda
  const combinedLessons = lessons.filter((l) => l.classIds.length > 1)

  const classTotal = (classId: string) =>
    lessons.filter((l) => l.classIds.includes(classId)).reduce((a, l) => a + l.hoursPerWeek, 0)
  const subjectTotal = (subjectId: string) =>
    lessons.filter((l) => l.subjectId === subjectId).reduce((a, l) => a + l.hoursPerWeek, 0)

  const empty = classes.length === 0 || subjects.length === 0

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Sarlavha + import */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <Table2 size={20} />
        </div>
        <h1 className="text-lg font-bold">{t("O'quv reja")}</h1>
        <span className="ml-1 hidden text-sm text-muted sm:inline">
          {t('Sinf × Fan — haftalik soatlar')}
        </span>
        <button onClick={() => setImportOpen(true)} disabled={isReadOnly} className="btn btn-accent hover-lift ml-auto disabled:opacity-40" title={isReadOnly ? t("Muddat tugagan — faqat ko'rish rejimi") : undefined}>
          <FileSpreadsheet size={16} /> {t('Exceldan import')}
        </button>
      </div>

      {empty ? (
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border p-8 text-center text-muted">
          <div>
            <Table2 className="mx-auto mb-3 text-accent/60" size={40} />
            <p>
              {t("O'quv reja uchun avval")} <b className="text-ink">{t('Sinflar')}</b> {t('va')}{' '}
              <b className="text-ink">{t('Fanlar')}</b> {t('kiriting — yoki tayyor')}{' '}
              <b className="text-ink">{t('Excel taqsimotini')}</b> {t('import qiling.')}
            </p>
            <button onClick={() => setImportOpen(true)} className="btn btn-accent hover-lift mt-4">
              <FileSpreadsheet size={16} /> {t('Exceldan import qilish')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-surface">
            <table className="border-collapse text-sm">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 min-w-[90px] border-b border-r border-border bg-surface-2 px-3 py-2 text-left">
                    {t('Sinf \\ Fan')}
                  </th>
                  {subjects.map((s) => (
                    <th key={s.id} className="border-b border-border bg-surface-2 px-2 py-2 text-center font-medium" title={s.name}>
                      <span className="flex items-center justify-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        {s.short || s.name.slice(0, 4)}
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-l border-border bg-surface-2 px-3 py-2 text-center">{t('Jami')}</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const total = classTotal(c.id)
                  return (
                    <tr key={c.id}>
                      <th className="sticky left-0 z-10 border-b border-r border-border bg-surface px-3 py-1.5 text-left font-semibold">
                        {c.name}
                      </th>
                      {subjects.map((s) => {
                        const cell = findCell(c.id, s.id)
                        const val = cell?.hoursPerWeek ?? 0
                        // Birlashgan darsda ham ushbu sinf qatnashyaptimi?
                        const inCombined = combinedLessons.some(
                          (l) => l.subjectId === s.id && l.classIds.includes(c.id),
                        )
                        return (
                          <td key={s.id} className="relative border-b border-border/60 p-0 text-center">
                            {inCombined && (
                              <Link2
                                size={10}
                                className="absolute right-0.5 top-0.5 text-accent/60"
                                aria-label={t('Birlashgan darsda')}
                              />
                            )}
                            <input
                              type="number"
                              min={0}
                              max={16}
                              value={val || ''}
                              placeholder="·"
                              readOnly={isReadOnly}
                              onChange={(e) => !isReadOnly && setCell(c.id, s.id, Math.max(0, +e.target.value || 0))}
                              className={cx(
                                'h-9 w-12 bg-transparent text-center outline-none transition-colors focus:bg-accent/10',
                                val > 0 ? 'font-semibold text-ink' : 'text-muted',
                                isReadOnly && 'cursor-not-allowed',
                              )}
                            />
                          </td>
                        )
                      })}
                      <td className="border-b border-l border-border bg-surface-2 px-3 py-1.5 text-center font-bold tnum">
                        {total}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <th className="sticky left-0 z-10 border-r border-border bg-surface-2 px-3 py-2 text-left">{t('Jami')}</th>
                  {subjects.map((s) => (
                    <td key={s.id} className="bg-surface-2 px-2 py-2 text-center font-bold tnum">
                      {subjectTotal(s.id)}
                    </td>
                  ))}
                  <td className="border-l border-border bg-accent/15 px-3 py-2 text-center font-bold">
                    {lessons.reduce((a, l) => a + l.hoursPerWeek, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {combinedLessons.length > 0 && (
            <div className="rounded-xl border border-border bg-surface">
              <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
                <Link2 size={16} className="text-accent" />
                <h2 className="text-sm font-semibold">{t('Birlashgan darslar (ko‘p sinfli)')}</h2>
                <span className="chip">{combinedLessons.length}</span>
              </div>
              <div className="divide-y divide-border/60">
                {combinedLessons.map((l) => {
                  const subj = subjects.find((s) => s.id === l.subjectId)
                  const tch = teachers.find((tt) => tt.id === l.teacher1Id)
                  const names = l.classIds
                    .map((cid) => classes.find((c) => c.id === cid)?.name)
                    .filter(Boolean)
                    .join(' + ')
                  return (
                    <div key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: subj?.color ?? '#94a3b8' }} />
                        <b>{subj?.name ?? '—'}</b>
                      </span>
                      <span className="text-muted">({names})</span>
                      {tch && <span className="chip">{tch.short}</span>}
                      <span className="ml-auto flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-muted">
                          {t('Soat')}:
                          <input
                            type="number"
                            min={1}
                            max={16}
                            value={l.hoursPerWeek}
                            onChange={(e) => updateLesson(l.id, { hoursPerWeek: Math.max(1, +e.target.value || 1) })}
                            className="input h-7 w-14 text-center tnum"
                          />
                        </label>
                        <button
                          onClick={() => removeLesson(l.id)}
                          className="btn btn-outline h-7 px-2 text-danger"
                          title={t("O'chirish")}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="border-t border-border/60 px-3 py-2 text-xs text-muted">
                {t('Birlashgan darsni «Darslar» bo\'limida yarating (bir nechta sinf tanlab).')}
              </p>
            </div>
          )}

          <p className="text-xs text-muted">
            {t("Maslahat: katakka soat kiriting — dars avtomatik yaratiladi. O'qituvchini «Darslar» bo'limida biriktirasiz.")}
          </p>
        </>
      )}

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
