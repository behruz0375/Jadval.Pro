import { useState } from 'react'
import { LayoutGrid, Play, Trash2, CheckCircle2, AlertTriangle, Sparkles, Grid3x3, Zap, Table2, FileSpreadsheet, StopCircle, Wand2, RotateCcw, Home } from 'lucide-react'
import { WelcomeLauncher } from '@/features/dashboard/WelcomeLauncher'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { useGenerator } from './useGenerator'
import { TimetableViewer } from './TimetableViewer'
import { TimetableBoard } from './TimetableBoard'
import { MasterGrid } from './MasterGrid'
import { ImportDialog } from '@/features/import/ImportDialog'
import { GenerationOptionsDialog, type GenerateOptionsExt } from './GenerationOptionsDialog'
import type { TimetableVersion, TimetableEntry } from '@/types'
import { cx, uid } from '@/utils'
import { generateDirect } from '@/features/cloud/api'
import { countHardViolations, timetableGaps } from '@/features/_shared/compute'
import { validateProject } from '@/engine/validate'
import { autoRaiseMaxLessons, raisedMessage } from '@/features/_shared/shiftFix'
import { teacherOffReason } from '@/engine/teacherDays'
import { useExpiry } from '@/features/pro/useExpiry'
import { isInvalidClass } from '@/io/importTaqsimot'
import { confirmAsync } from '@/store/confirm'
import { currentVersion } from '@/features/_shared/versions'

export function DistributionPage() {
  const project = useProject((s) => s.project)
  const addTimetable = useProject((s) => s.addTimetable)
  const addGeneratedTimetable = useProject((s) => s.addGeneratedTimetable)
  const removeTimetable = useProject((s) => s.removeTimetable)
  const updateTimetable = useProject((s) => s.updateTimetable)
  const setProject = useProject((s) => s.setProject)
  const toast = useToast()
  const { running, progress, message, run, runImprove, stop } = useGenerator()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<'board' | 'master' | 'auto'>('board')
  const [optsOpen, setOptsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)

  const { isReadOnly } = useExpiry()

  const { lessons, classes, teachers, timetables } = project
  const totalHours = lessons.reduce((a, l) => a + l.hoursPerWeek, 0)
  const noTeacher = lessons.filter((l) => !l.teacher1Id).length

  const selected = timetables.find((t) => t.id === selectedId) ?? currentVersion(timetables)

  const generate = async () => {
    // Doim eng yangi holat bilan ishlaymiz (render closure eskirgan bo'lishi mumkin)
    let proj = useProject.getState().project
    if (proj.lessons.length === 0) return toast.error('Avval darslarni kiriting')
    // 1) Buzilgan ma'lumotlarni tekshiramiz
    const invalidClasses = proj.classes.filter((c) => isInvalidClass(c))
    const invalidClassIds = new Set(invalidClasses.map((c) => c.id))
    const brokenLessons = proj.lessons.filter((l) => l.classIds.some((id) => invalidClassIds.has(id)))
    const bloatedLessons = proj.lessons.filter((l) => l.hoursPerWeek > 50)
    if (invalidClasses.length > 0 || bloatedLessons.length > 0) {
      const parts: string[] = []
      if (invalidClasses.length > 0) {
        parts.push(`${invalidClasses.length} ta noma'qul sinf (${invalidClasses.map((c) => c.name).slice(0, 3).join(', ')}${invalidClasses.length > 3 ? '...' : ''})`)
      }
      if (bloatedLessons.length > 0) {
        parts.push(`${bloatedLessons.length} ta buzilgan dars (50+ soat)`)
      }
      const ok = await confirmAsync({
        title: "Buzilgan ma'lumot aniqlandi",
        message: `Loyihada buzilgan ma'lumot aniqlandi:\n\n• ${parts.join('\n• ')}\n\nBular avvalgi import xatosidan qolgan. Avtomatik tozalab, jadval tuzamizmi?`,
        confirmText: 'Tozalab davom etish',
        cancelText: "O'zim tuzataman",
        tone: 'danger',
      })
      if (!ok) return
      proj = {
        ...proj,
        classes: proj.classes.filter((c) => !invalidClassIds.has(c.id)),
        lessons: proj.lessons.filter((l) => !l.classIds.some((id) => invalidClassIds.has(id)) && l.hoursPerWeek <= 50),
      }
      setProject(proj)
      toast.success(`${invalidClasses.length} sinf, ${brokenLessons.length + bloatedLessons.length} dars tozalandi`)
    }
    // 2) 2-smena (masalan 8–14-darslar) "Kuniga maksimal dars"dan keyin boshlansa — sinflarga dars sig'maydi.
    //    Bunday holatda sozlamani avtomatik to'g'rilaymiz.
    const raised = autoRaiseMaxLessons()
    if (raised) {
      proj = useProject.getState().project
      toast.info(raisedMessage(raised))
    }
    // 3) Pre-flight: loyihani tekshiramiz
    const check = validateProject(proj)
    if (check.willFail) {
      const errorMessages = check.issues
        .filter((i) => i.severity === 'error')
        .map((i) => '• ' + i.message)
        .join('\n')
      const first = check.issues.find((i) => i.severity === 'error')
      const ok = await confirmAsync({
        title: 'Jadval tuzish — qiyinchiliklar',
        message: `${check.issues.filter((i) => i.severity === 'error').length} ta xato topildi:\n\n${errorMessages.slice(0, 500)}${first?.hint ? '\n\nMaslahat: ' + first.hint : ''}\n\nDavom etamizmi? (Generator qo'lidan kelgancha joylashtiradi, qolgani unplaced bo'lib qoladi)`,
        confirmText: 'Davom etish',
        tone: 'danger',
      })
      if (!ok) return
    }
    if (check.issues.length > 0) {
      // Ogohlantirishlar bor — toast'da ko'rsatamiz, oldinga davom ettiramiz
      const warningCount = check.issues.filter((i) => i.severity === 'warning').length
      if (warningCount > 0) {
        toast.info(`${warningCount} ta ogohlantirish — generator qo’lidan kelgancha joylashtiradi`)
      }
    }
    setOptsOpen(true)
  }

  const runWith = async (opts: GenerateOptionsExt) => {
    setOptsOpen(false)
    const proj = useProject.getState().project
    const seed = opts.seed ?? Math.floor(Math.random() * 1e9)
    // Serverda tuzish (ixtiyoriy — foydalanuvchi dialogdan tanlasa)
    if (opts.useServerSide) {
      let serverOk = false
      toast.info('Serverda tuzilmoqda...')
      try {
        const { useServerSide: _ignore, ...serverOpts } = opts
        void _ignore
        const result = await generateDirect(proj, { ...serverOpts, seed })
        // Server entrysi: { classIds, teacherId, roomId, day (1..), period (1..), lessonId, length }
        // Client formatida: { id, classId, teacherId, roomId, day (0..), slot (1..), lessonId }
        // Multi-class darslar har bir sinf uchun bitta entry.
        const entries: TimetableEntry[] = []
        for (const [i, raw] of (result.entries as Array<Record<string, unknown>>).entries()) {
          const classIds = (raw.classIds as string[] | undefined) ?? []
          const day0 = Math.max(0, Number(raw.day ?? 1) - 1)
          const slot = Number(raw.period ?? raw.slot ?? 1)
          const teacherId = String(raw.teacherId ?? '')
          const roomId = raw.roomId ? String(raw.roomId) : undefined
          const lessonId = String(raw.lessonId ?? '')
          for (const cid of classIds) {
            entries.push({
              id: uid('e_') + '_' + i,
              classId: String(cid),
              teacherId,
              roomId,
              day: day0,
              slot,
              lessonId,
            })
          }
        }
        // Server generatori metodik kun va o'qituvchining ish vaqtini bilmaydi — natijani shu yerda tekshiramiz
        const teacherById = new Map(proj.teachers.map((t) => [t.id, t]))
        const offCount = entries.filter((e) => {
          const t = teacherById.get(e.teacherId)
          return !!t && teacherOffReason(t, e.day, e.slot) !== null
        }).length
        if (offCount > 0) {
          toast.error(`Server ${offCount} ta darsni o'qituvchining metodik kuni yoki yopiq vaqtiga qo'ydi — brauzerda qayta tuzilmoqda`)
          throw new Error('__server_rule_violation__')
        }
        const hard = countHardViolations(entries)
        const gaps = timetableGaps(entries, proj.teachers, proj.school.workDays)
        const v: TimetableVersion = {
          id: uid('tt_'),
          name: 'Server (' + new Date().toLocaleTimeString() + ')',
          createdAt: new Date().toISOString(),
          seed,
          entries,
          stats: {
            placed: result.stats.placed,
            unplaced: result.stats.unplaced,
            hardViolations: hard,
            teacherGaps: gaps.teacherGaps,
            softPenalty: 0,
          },
        }
        addGeneratedTimetable(v)
        setSelectedId(v.id)
        toast.success(`Server: ${result.stats.placed}/${result.stats.totalSessions} joylashtirildi`)
        serverOk = true
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg !== '__server_rule_violation__') toast.error('Server xatosi: ' + msg + ' — brauzerda tuzilmoqda')
      }
      if (serverOk) return
      // Server ishlamasa yoki qoidani buzsa — brauzerdagi (lokal) generatorga o'tamiz
    }
    run(
      proj,
      { ...opts, seed },
      (v) => {
        addGeneratedTimetable(v)
        setSelectedId(v.id)
        if (v.stats.unplaced === 0) toast.success(`Jadval tayyor! ${v.stats.placed} dars joylashtirildi`)
        else {
          const pct = Math.round((v.stats.placed / (v.stats.placed + v.stats.unplaced)) * 100)
          toast.info(`Jadval tuzildi: ${pct}% dars joylashtirildi. ${v.stats.unplaced} dars sig'madi — "Maktab" sozlamalaridan kuniga dars sonini oshiring yoki Konfliktlarni tekshiring.`)
        }
      },
      (e) => toast.error('Xatolik: ' + e),
    )
  }

  // Yaxshilash — mavjud jadvalni buzmay, o'qituvchi/sinf oynalarini kamaytiradi (in-place local search)
  const optimize = () => {
    // Yaxshilash har doim JORIY jadvalni (Tahta/Umumiy bilan bir xil) yaxshilaydi — eski nusxani emas, aks holda qo'lda tahrirlar yo'qolardi
    const v = currentVersion(timetables)
    if (!v || v.entries.length === 0) return toast.error('Avval jadval tuzing')
    runImprove(
      project,
      v.entries,
      { seed: Math.floor(Math.random() * 1e9), minimizeGaps: true },
      (improved) => {
        addGeneratedTimetable(improved)
        setSelectedId(improved.id)
        toast.success(`Yaxshilandi — o'qituvchi oynalari: ${improved.stats.teacherGaps}. Yana bosib yanada kamaytirishingiz mumkin.`)
      },
      (e) => toast.error('Xatolik: ' + e),
    )
  }

  // Versiyani «Ishchi jadval»ga (tahtaga) tiklash
  const restoreToWorking = (v: TimetableVersion) => {
    const entries = v.entries.map((e) => ({ ...e }))
    const working = timetables.find((t) => t.name === 'Ishchi jadval')
    if (working) {
      updateTimetable(working.id, { entries, stats: v.stats })
      setSelectedId(working.id)
    } else {
      const nv: TimetableVersion = { id: uid('tt_'), name: 'Ishchi jadval', createdAt: new Date().toISOString(), entries, stats: v.stats }
      addTimetable(nv)
      setSelectedId(nv.id)
    }
    toast.success('Jadval tahtaga tiklandi')
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2 sm:gap-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
          <LayoutGrid size={20} />
        </div>
        <h1 className="text-lg font-bold">Taqsimot</h1>
        <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5 sm:ml-2 sm:gap-1 sm:p-1">
          <button
            onClick={() => setMode('board')}
            className={cx('flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm', mode === 'board' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink')}
          >
            <Grid3x3 size={15} /> <span className="hidden sm:inline">Tahta</span>
          </button>
          <button
            onClick={() => setMode('master')}
            className={cx('flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm', mode === 'master' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink')}
          >
            <Table2 size={15} /> <span className="hidden sm:inline">Umumiy</span>
          </button>
          <button
            onClick={() => setMode('auto')}
            className={cx('flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm', mode === 'auto' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink')}
          >
            <Zap size={15} /> <span className="hidden sm:inline">Avtomatik</span>
          </button>
        </div>
        <button
          onClick={() => setWelcomeOpen(true)}
          className="btn btn-outline hover-lift ml-auto h-9"
          title="Yangi jadval, saqlangan jadvalni ochish yoki namuna yuklash"
        >
          <Home size={15} /> <span className="hidden sm:inline">Boshlang'ich oyna</span>
        </button>
        <button
          onClick={() => setImportOpen(true)}
          disabled={isReadOnly}
          className="btn btn-outline hover-lift h-9 disabled:opacity-50"
          title={isReadOnly ? 'Muddat tugagan — faqat ko’rish rejimi' : "Excel taqsimot: fayldagi sinflarning darslari shu fayl bo'yicha yangilanadi (namuna fayl bilan)"}
        >
          <FileSpreadsheet size={15} /> <span className="hidden sm:inline">Excel import</span>
        </button>
      </div>

      {mode === 'board' && (
        <div className="min-h-0 flex-1">
          <TimetableBoard />
        </div>
      )}
      {mode === 'master' && (
        <div className="min-h-0 flex-1">
          <MasterGrid />
        </div>
      )}
      {mode === 'auto' && (
        <>
          {/* Boshqaruv paneli */}
          <div className="card flex flex-wrap items-center gap-2 p-2 sm:gap-4 sm:p-4">
            <button onClick={generate} disabled={running || isReadOnly} className="btn btn-accent h-10 px-3 text-sm disabled:opacity-50 sm:h-11 sm:px-5 sm:text-base" title={isReadOnly ? "Muddat tugagan — faqat ko’rish rejimi" : undefined}>
              {running ? <Sparkles size={18} className="animate-spin" /> : <Play size={18} />}
              {running ? 'Tuzilmoqda...' : 'Jadval tuzish'}
            </button>
            <button onClick={optimize} disabled={running || isReadOnly} className="btn btn-outline h-10 disabled:opacity-50 sm:h-11" title={isReadOnly ? "Muddat tugagan — faqat ko’rish rejimi" : "Mavjud jadvalni buzmay o'qituvchi/sinf oynalarini kamaytiradi"}>
              <Wand2 size={18} /> <span className="hidden sm:inline">Yaxshilash</span>
            </button>
            {running && (
              <button onClick={stop} className="btn btn-outline h-11 text-danger" title="To’xtatish">
                <StopCircle size={18} /> To'xtatish
              </button>
            )}

            {running ? (
              <div className="min-w-[240px] flex-1">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{message}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 text-sm text-muted">
                <span>Sinflar: <b className="text-ink">{classes.length}</b></span>
                <span>O'qituvchilar: <b className="text-ink">{teachers.length}</b></span>
                <span>Darslar: <b className="text-ink">{lessons.length}</b></span>
                <span>Jami soat: <b className="text-ink">{totalHours}</b></span>
                {noTeacher > 0 && (
                  <span className="flex items-center gap-1 text-warn">
                    <AlertTriangle size={14} /> {noTeacher} dars o'qituvchisiz
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {selected ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatBadge
                      ok={selected.stats.unplaced === 0}
                      label={selected.stats.unplaced === 0 ? 'Barcha darslar joylashtirildi' : `${selected.stats.unplaced} dars joylashmadi`}
                    />
                    <span className="chip">Joylashtirilgan: {selected.stats.placed}</span>
                    <span className="chip">O'qituvchi oynalari: {selected.stats.teacherGaps}</span>
                    {selected.stats.hardViolations > 0 && (
                      <span className="chip !bg-danger/15 !text-danger">Qat'iy buzilish: {selected.stats.hardViolations}</span>
                    )}
                    {selected.seed != null && (
                      <span className="chip" title="Shu seed bilan natijani aynan takrorlash mumkin">Seed: {selected.seed}</span>
                    )}
                  </div>
                  <div className="min-h-0 flex-1">
                    <TimetableViewer version={selected} />
                  </div>
                </>
              ) : (
                <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border text-center text-muted">
                  <div>
                    <LayoutGrid size={40} className="mx-auto mb-2 text-accent/60" />
                    <p>Hali jadval tuzilmagan. «Jadval tuzish» tugmasini bosing.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-row gap-2 overflow-x-auto sm:w-52 sm:flex-col sm:overflow-x-visible">
              <h3 className="text-sm font-semibold text-muted">Versiyalar ({timetables.length})</h3>
              <div className="flex flex-col gap-1.5 overflow-y-auto">
                {timetables.slice().reverse().map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cx(
                      'cursor-pointer rounded-lg border p-2 text-xs transition-colors',
                      selected?.id === t.id ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface-2',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t.name === 'Ishchi jadval' ? 'Ishchi' : new Date(t.createdAt).toLocaleTimeString('uz')}</span>
                      <div className="flex items-center gap-1">
                        {t.name !== 'Ishchi jadval' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              restoreToWorking(t)
                            }}
                            className="text-muted hover:text-accent"
                            title="Tahtaga tiklash"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTimetable(t.id)
                            if (selectedId === t.id) setSelectedId(null)
                          }}
                          className="text-muted hover:text-danger"
                          title="O’chirish"
                        >
                          <Trash2 size={13} />
                        </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-0.5 text-muted">
                      {t.stats.unplaced === 0 ? "✓ to'liq" : `${t.stats.unplaced} joylashmadi`}
                    </div>
                  </div>
                ))}
                {timetables.length === 0 && <span className="text-xs text-muted">Versiya yo'q</span>}
              </div>
            </div>
          </div>
        </>
      )}
      <GenerationOptionsDialog
        open={optsOpen}
        onClose={() => setOptsOpen(false)}
        onStart={runWith}
        defaultSeed={currentVersion(timetables)?.seed}
      />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      {welcomeOpen && <WelcomeLauncher onClose={() => setWelcomeOpen(false)} />}
    </div>
  )
}

function StatBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', ok ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn')}>
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {label}
    </span>
  )
}
