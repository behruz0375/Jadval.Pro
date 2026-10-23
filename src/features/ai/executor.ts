// ============================================================
// AI yordamchi — ENGINE (hook). ToolContext ni quradi va
// offline (parser) hamda LLM (Claude) rejimlarini boshqaradi.
// ============================================================
import { useCallback, useRef } from 'react'
import { useProject } from '@/store/project'
import { useUI } from '@/store/ui'
import { useLang } from '@/i18n'
import { useToast } from '@/store/toast'
import { saveProjectToFile, openProjectFromFile } from '@/io/projectFile'
import { exportDataToExcel } from '@/io/excel'
import { exportDataPdf } from '@/io/pdf'
import { createBackup } from '@/io/backup'
import { runGenerateAsync, runImproveAsync, type GenRunHandle } from './generatorRunner'
import { findTool, type ToolContext, type ToolResult } from './tools'
import { parseCommand } from './parser'
import { understand, rememberContext, resolveEntity, extractDay } from './offlineNLU'
import { searchKnowledgeMulti } from './knowledge'
import { runLLMTurn, type LLMConfig, type LLMHooks } from './llm'
import { useAIChat } from './chatStore'
import { currentVersion } from '@/features/_shared/versions'
import { autoRaiseMaxLessons } from '@/features/_shared/shiftFix'

export interface ExecOutcome {
  ok: boolean
  message: string
  /** Faqat local intentlar uchun */
  local?: 'help' | 'greeting' | 'thanks' | 'clear' | 'undo'
}

export function useAIEngine() {
  const toast = useToast()
  // Joriy generator handle (to'xtatish uchun)
  const genHandle = useRef<GenRunHandle | null>(null)

  /** ToolContext quramiz — getstate orqali DOIM yangi loyihani olamiz */
  const buildCtx = useCallback((onProgress?: (p: number, m: string) => void): ToolContext => {
    const P = useProject.getState
    const U = useUI.getState
    const L = useLang.getState
    return {
      getProject: () => P().project,
      addTeacher: (t) => P().addTeacher(t),
      updateTeacher: (id, patch) => P().updateTeacher(id, patch),
      removeTeacher: (id) => P().removeTeacher(id),
      addClass: (c) => P().addClass(c),
      updateClass: (id, patch) => P().updateClass(id, patch),
      removeClass: (id) => P().removeClass(id),
      addSubject: (x) => P().addSubject(x),
      updateSubject: (id, patch) => P().updateSubject(id, patch),
      removeSubject: (id) => P().removeSubject(id),
      addRoom: (r) => P().addRoom(r),
      updateRoom: (id, patch) => P().updateRoom(id, patch),
      removeRoom: (id) => P().removeRoom(id),
      addLesson: (l) => P().addLesson(l),
      updateLesson: (id, patch) => P().updateLesson(id, patch),
      removeLesson: (id) => P().removeLesson(id),
      addMany: (entity, items) => P().addMany(entity, items as never),
      updateSchool: (patch) => P().updateSchool(patch),
      setProject: (p) => P().setProject(p),
      newProject: () => P().newProject(),
      markSaved: () => P().markSaved(),
      addTimetable: (v) => P().addTimetable(v),
      addGeneratedTimetable: (v) => P().addGeneratedTimetable(v),
      updateTimetable: (id, patch) => P().updateTimetable(id, patch),
      removeTimetable: (id) => P().removeTimetable(id),
      setActivePanel: (id) => U().setActivePanel(id),
      setTheme: (t) => U().setTheme(t),
      getTheme: () => U().theme,
      setLang: (l) => L().setLang(l),
      back: () => U().back(),
      generate: (opts, prog) => {
        autoRaiseMaxLessons()
        const h = runGenerateAsync(P().project, opts, prog ?? onProgress)
        genHandle.current = h
        return h.promise.finally(() => { if (genHandle.current === h) genHandle.current = null })
      },
      improve: (prog) => {
        const proj = P().project
        const latest = currentVersion(proj.timetables)
        const h = runImproveAsync(proj, latest?.entries ?? [], { seed: Math.floor(Math.random() * 1e9), minimizeGaps: true }, prog ?? onProgress)
        genHandle.current = h
        return h.promise.finally(() => { if (genHandle.current === h) genHandle.current = null })
      },
      saveProject: () => saveProjectToFile(P().project),
      openProject: () => openProjectFromFile(),
      exportData: async (format): Promise<string> => {
        const proj = P().project
        const latest = currentVersion(proj.timetables)
        if (format === 'excel') { await exportDataToExcel(proj); return '✓ Ma\'lumotlar Excel faylga eksport qilindi.' }
        if (format === 'pdf') { await exportDataPdf(proj); return '✓ Ma\'lumotlar PDF faylga eksport qilindi.' }
        if (format === 'csv') {
          if (!latest) return 'Avval jadval tuzilishi kerak.'
          const m = await import('@/io/csv'); m.exportTimetableCsv(proj, latest); return '✓ Jadval CSV ga eksport qilindi.'
        }
        if (format === 'word') {
          if (!latest) return 'Avval jadval tuzilishi kerak.'
          if (proj.classes.length === 0) return 'Sinflar yo\'q.'
          const m = await import('@/io/word')
          await m.exportTimetableDocx(proj, latest, 'class', proj.classes.map((c) => c.id))
          return `✓ Jadval Word ga eksport qilindi (${proj.classes.length} ta sinf).`
        }
        if (format === 'png') {
          if (!latest) return 'Avval jadval tuzilishi kerak.'
          if (proj.classes.length === 0) return 'Sinflar yo\'q — PNG eksport uchun kamida 1 ta sinf kerak.'
          const m = await import('@/io/png')
          // PNG — har sinf alohida rasm, hammasi uchun navbatma-navbat
          for (const c of proj.classes) await m.exportTimetablePng(proj, latest, 'class', c.id)
          return `✓ ${proj.classes.length} ta sinf jadvali PNG rasm sifatida eksport qilindi.`
        }
        return `Noma'lum format: ${format}`
      },
      backup: async () => { await createBackup(P().project, 'AI yordamchi orqali') },
      toast: { success: toast.success, error: toast.error, info: toast.info },
    }
  }, [toast])

  /** Jadval generatsiyasini to'xtatish */
  const stopGeneration = useCallback(() => {
    if (genHandle.current) { genHandle.current.stop(); genHandle.current = null; return true }
    return false
  }, [])

  /** Bitta tool-call ni bajarish (yordamchi) */
  const executeOne = useCallback(async (name: string, args: Record<string, unknown>): Promise<ToolResult> => {
    const tool = findTool(name)
    if (!tool) return { ok: false, message: `Ichki xato: "${name}" tool topilmadi.` }
    try {
      const ctx = buildCtx()
      const result = await tool.run(args, ctx)
      if (result.navigate) useUI.getState().setActivePanel(result.navigate)
      return result
    } catch (e) {
      return { ok: false, message: `Xato: ${(e as Error).message}` }
    }
  }, [buildCtx])

  /** OFFLINE rejim — avval tezkor parser, keyin chuqur NLU */
  const runOffline = useCallback(async (text: string): Promise<ExecOutcome> => {
    // 1. Tezkor parser — oddiy shabloniy buyruqlar uchun (eng tez yo'l)
    const parsed = parseCommand(text)
    if (parsed.type === 'local') {
      return { ok: true, message: '', local: parsed.intent.kind }
    }
    if (parsed.type === 'tool') {
      const result = await executeOne(parsed.call.name, parsed.call.args)
      return { ok: result.ok, message: result.message }
    }
    // Bilimlar bazasidan javob topildi
    if (parsed.type === 'knowledge') {
      return { ok: true, message: parsed.answer }
    }

    // 2. Chuqur NLU — tabiiy tilni fuzzy matching + ko'p sinonim + context bilan tushunadi
    const project = useProject.getState().project
    const nlu = understand(text, project)

    // Kontekst — oldingi mentionni eslaymiz (keyingi savollarga foydali)
    const ent = resolveEntity(text, project)
    const day = extractDay(text)
    rememberContext(ent, day, text)

    const messages: string[] = []
    let anyOk = false

    // 2a. Bir yoki bir nechta tool-call bajarish
    for (const call of nlu.calls) {
      const result = await executeOne(call.name, call.args)
      messages.push(result.message)
      if (result.ok) anyOk = true
    }

    // 2b. Yoki tabiiy savolga javob
    if (nlu.answer) {
      messages.push(nlu.answer.text)
      if (nlu.answer.navigate) useUI.getState().setActivePanel(nlu.answer.navigate)
      anyOk = true
    }

    if (messages.length > 0) {
      return { ok: anyOk, message: messages.join('\n') }
    }

    // 3. Bilimlar bazasidan tegishli mavzular tavsiya qilish
    const relatedKB = searchKnowledgeMulti(text, 2, 0.2)
    if (relatedKB.length > 0) {
      const suggestions = relatedKB.map((m) => `  "${m.entry.question}"`).join('\n')
      return {
        ok: false,
        message: `Aniq tushunolmadim, lekin balki quyidagilardan biri kerakdir:\n${suggestions}\n\nShu savollardan birini yozing yoki boshqacha ayting.`,
      }
    }

    return {
      ok: false,
      message: `"${text}" — tushunolmadim. Boshqacha ayting (masalan: "jadval tuz", "5-A sinfni ko'rsat", "Aliyev yuklamasi") yoki "yordam" deb yozing.`,
    }
  }, [buildCtx, executeOne])

  /** LLM rejim — Claude orqali to'liq tabiiy til */
  const runLLM = useCallback(async (
    text: string,
    cfg: LLMConfig,
    hooks: LLMHooks = {},
  ): Promise<ExecOutcome> => {
    const ctx = buildCtx()
    try {
      const prior = useAIChat.getState().llmHistory
      const { text: reply, history } = await runLLMTurn(cfg, text, prior, ctx, hooks)
      // Tarixni yangilaymiz (juda uzun bo'lmasligi uchun oxirgi ~24 navbat)
      useAIChat.getState().setHistory(history.slice(-24))
      return { ok: true, message: reply }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  }, [buildCtx])

  const clearHistory = useCallback(() => { useAIChat.getState().setHistory([]) }, [])

  return { runOffline, runLLM, stopGeneration, clearHistory }
}
