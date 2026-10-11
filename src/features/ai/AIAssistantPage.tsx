// ============================================================
// AI yordamchi sahifasi — chat interfeys. Offline (parser) yoki
// LLM (Claude API) rejimida ishlaydi. Ovoz kirish + TTS.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import {
  Bot, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, Trash2, Lightbulb,
  AlertCircle, CheckCircle2, Settings2, Square, Zap, WifiOff, KeyRound,
} from 'lucide-react'
import { parseCommand } from './parser'
import { useAIEngine } from './executor'
import { isVoiceSupported, listenOnce, speak, requestMicPermission, voiceErrorMessage } from './voice'
import {
  loadProvider, saveProvider, loadApiKey, saveApiKey, loadModel, saveModel,
  PROVIDER_MODELS, PROVIDER_INFO, HAS_BUILTIN_PROXY,
  type LLMConfig, type Provider,
} from './llm'
import { useLang } from '@/i18n'
import { useUI } from '@/store/ui'
import { cx } from '@/utils'
import { Modal } from '@/components/Modal'
import { Field } from '@/components/Field'
import { useAIChat, type Msg } from './chatStore'
import { RobotMascot, type RobotState } from './RobotMascot'


const SAMPLES_UZ = [
  "Loyihani tekshirib ko'r — jadval tuzila oladimi?",
  "Jadvalni tushuntirib ber",
  "Nega darslar joylashmay qoldi?",
  "Qanday tuzatish kerak?",
  "Yangi o'qituvchi: Ali Valiyev",
  "1-dan 4-gacha A va B sinflar yarat",
  "Jadval tuz",
  "Barcha 5-sinflarga matematikadan 4 soat qo'sh",
  "Aliyev dushanba kuni dars bermaydi",
  "Aliyev kelmadi dushanba, kim almashtiradi?",
  "5-A jadvalini ko'rsat",
  "Eng band o'qituvchi kim?",
  "Konfliktlar bormi?",
  "Excelga eksport qil",
]
const SAMPLES_RU = [
  'Добавь учителя: Иванов И.И.',
  'Добавь урок математики для 5-А, учитель Иванов, 6 часов',
  'Создай классы с 1 по 4, буквы А и Б',
  'Составь расписание',
  'Кто самый занятый учитель?',
  'Экспорт в Excel',
]
const SAMPLES_EN = [
  'Add teacher: John Doe',
  'Add 6 hours of math for class 5-A with teacher John',
  'Create classes 1 to 4 with letters A and B',
  'Generate schedule',
  'Who is the busiest teacher?',
  'Export to Excel',
]

export function AIAssistantPage() {
  const lang = useLang((s) => s.lang)
  const { runOffline, runLLM, stopGeneration, clearHistory } = useAIEngine()

  const [provider, setProvider] = useState<Provider>(() => loadProvider())
  const [apiKey, setApiKey] = useState(() => loadApiKey(loadProvider()))
  const [model, setModel] = useState(() => loadModel(loadProvider()))
  const [forceOffline, setForceOffline] = useState(false)
  // Proxy rejimida kalit kerak emas; boshqa provayderlarda kalit shart
  const llmOn = !forceOffline && (provider === 'proxy' ? HAS_BUILTIN_PROXY : !!apiKey)

  // Provayder almashsa — o'sha provayderning saqlangan kaliti/modelini yuklaymiz
  const switchProvider = (p: Provider) => {
    setProvider(p)
    setApiKey(loadApiKey(p))
    setModel(loadModel(p))
  }

  // Chat tarixi — store'da (bo'lim almashganda ham saqlanadi, faqat sahifa qayta yuklanganda tozalanadi)
  const msgs = useAIChat((s) => s.msgs)
  const setMsgs = useAIChat((s) => s.setMsgs)
  const resetChat = useAIChat((s) => s.reset)
  // Birinchi marta — welcome xabarini qo'shamiz
  useEffect(() => { useAIChat.getState().init(welcomeMsg(lang)) }, [lang])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ttsOn, setTtsOn] = useState(() => { try { return localStorage.getItem('jp-ai-tts') === '1' } catch { return false } })
  const [robotState, setRobotState] = useState<RobotState>('idle')

  const stopListeningRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, interim])
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { try { localStorage.setItem('jp-ai-tts', ttsOn ? '1' : '0') } catch { /* ignore */ } }, [ttsOn])

  const pushAI = (text: string, ok?: boolean, tool?: boolean) =>
    setMsgs((m) => [...m, { id: `a${Date.now()}${Math.random()}`, role: 'ai', text, ok, tool, ts: Date.now() }])

  const sendText = async (raw: string) => {
    const t = raw.trim()
    if (!t || busy) return
    setBusy(true); setInput(''); setInterim('')
    setRobotState('thinking')
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: t, ts: Date.now() }])

    // "to'xtat" — generatsiyani to'xtatish
    if (generating && /\b(to'xtat|toxtat|stop|останови|прерв)\b/i.test(t)) {
      stopGeneration(); setGenerating(false)
      pushAI("✓ To'xtatildi.", true)
      setRobotState('idle')
      setBusy(false)
      return
    }

    // Local intent (help/greeting/clear) — har ikki rejimda ham tez javob
    const quick = parseCommand(t)
    if (quick.type === 'local') {
      handleLocal(quick.intent.kind)
      setRobotState(quick.intent.kind === 'greeting' || quick.intent.kind === 'thanks' ? 'happy' : 'idle')
      setBusy(false)
      return
    }

    // Bilimlar bazasidan javob topildi
    if (quick.type === 'knowledge') {
      pushAI(quick.answer, true)
      setRobotState('happy')
      if (ttsOn && quick.answer) speak(quick.answer, ttsLang(lang))
      setBusy(false)
      setTimeout(() => setRobotState('idle'), 3000)
      return
    }

    // ======== GIBRID-TEZKOR rejim ========
    const offlineUnderstood = quick.type === 'tool'
    const isGen = quick.type === 'tool' && (quick.call.name === 'generate_timetable' || quick.call.name === 'improve_timetable')

    if (offlineUnderstood || !llmOn) {
      if (isGen) { setGenerating(true); pushAI('Jadval tuzilmoqda… (to\'xtatish uchun "to\'xtat" deb yozing)', true) }
      const outcome = await runOffline(t)
      setGenerating(false)
      if (outcome.local) {
        handleLocal(outcome.local)
        setRobotState('idle')
        setBusy(false)
        return
      }
      pushAI(outcome.message, outcome.ok)
      setRobotState(outcome.ok ? 'happy' : outcome.message.includes('tushunolmadim') || outcome.message.includes('topilmadi') ? 'confused' : 'error')
      if (ttsOn && outcome.message) speak(outcome.message, ttsLang(lang))
      setBusy(false)
      setTimeout(() => setRobotState('idle'), 4000)
      return
    }

    // Parser tushunmadi — LLM (Gemini/Claude/Proxy) ga boramiz
    const cfg: LLMConfig = { provider, apiKey, model, lang }
    const outcome = await runLLM(t, cfg, {
      onToolResult: (name, res) => {
        if (name === 'generate_timetable' || name === 'improve_timetable') setGenerating(false)
        pushAI(res.message, res.ok, true)
      },
      onNavigate: () => {},
    })
    setGenerating(false)

    // LLM muvaffaqiyatsiz
    if (!outcome.ok) {
      const isTransient = /limit|tugadi|429|quota|503|502|504|internet|ulanib|timeout|vaqt tugadi|server xatosi/i.test(outcome.message)
      if (isTransient) {
        pushAI(`⚠ ${outcome.message}\n\n💡 Offline NLU ga o'tdim, buyruqni o'zim tushunib bajaraman…`, undefined)
      }
      const fallback = await runOffline(t)
      if (fallback.local) { handleLocal(fallback.local); setRobotState('idle'); setBusy(false); return }
      pushAI(fallback.message, fallback.ok)
      setRobotState(fallback.ok ? 'happy' : 'confused')
      if (ttsOn && fallback.message) speak(fallback.message, ttsLang(lang))
      setBusy(false)
      setTimeout(() => setRobotState('idle'), 4000)
      return
    }
    if (outcome.message) pushAI(outcome.message, true)
    setRobotState('happy')
    if (ttsOn && outcome.message) speak(outcome.message, ttsLang(lang))
    setBusy(false)
    setTimeout(() => setRobotState('idle'), 4000)
  }

  const handleLocal = (kind: 'help' | 'greeting' | 'thanks' | 'clear' | 'undo') => {
    if (kind === 'clear') { clearHistory(); resetChat(welcomeMsg(lang)); return }
    if (kind === 'greeting') { pushAI(greet(lang), true); return }
    if (kind === 'thanks') { pushAI(lang === 'ru' ? 'Пожалуйста!' : lang === 'en' ? "You're welcome!" : 'Arzimaydi!', true); return }
    if (kind === 'undo') { useUI.getState().back(); pushAI('✓ Orqaga qaytdim.', true); return }
    if (kind === 'help') {
      const samples = lang === 'ru' ? SAMPLES_RU : lang === 'en' ? SAMPLES_EN : SAMPLES_UZ
      const head = lang === 'ru' ? 'Я умею (примеры):' : lang === 'en' ? 'I can (examples):' : 'Men quyidagilarni qila olaman (namuna):'
      const tail = llmOn
        ? (lang === 'ru' ? '\n\n💡 Умный режим включён — пишите свободно, любыми словами.' : lang === 'en' ? '\n\n💡 Smart mode is on — write freely in natural language.' : "\n\n💡 Aqlli rejim yoqilgan — erkin, istalgan so'z bilan yozing.")
        : (lang === 'ru' ? '\n\n💡 Включите умный режим (ключ API) для свободного языка.' : lang === 'en' ? '\n\n💡 Enable smart mode (API key) for free-form language.' : "\n\n💡 To'liq erkin til uchun Sozlamalardan AI kalitini ulang.")
      pushAI(head + '\n• ' + samples.join('\n• ') + tail, true)
    }
  }

  const startRecognition = (recLang: 'uz-UZ' | 'ru-RU' | 'en-US', triedFallback = false) => {
    setListening(true); setInterim(''); setRobotState('listening')
    stopListeningRef.current = listenOnce({
      lang: recLang,
      interim: (p) => setInterim(p),
      onResult: (txt) => { setListening(false); setInterim(''); void sendText(txt) },
      onError: (err) => {
        setListening(false); setInterim('')
        if (err === 'aborted') return
        // Til qo'llab-quvvatlanmasa — rus, keyin ingliz tiliga tushamiz
        if (err === 'language-not-supported' && !triedFallback) {
          const next = recLang === 'uz-UZ' ? 'ru-RU' : 'en-US'
          pushAI(`"${recLang}" ovozda yo'q — ${next} bilan sinayapman…`, undefined)
          startRecognition(next, true)
          return
        }
        if (err !== 'no-speech') pushAI(voiceErrorMessage(err), false)
      },
      onStart: () => setListening(true),
      onEnd: () => setListening(false),
    })
  }

  const toggleListen = async () => {
    if (listening) { stopListeningRef.current?.(); setListening(false); setRobotState('idle'); return }
    if (!isVoiceSupported()) { pushAI(voiceErrorMessage('not-supported'), false); setRobotState('error'); return }
    // Avval mikrofon ruxsatini so'raymiz — brauzer ruxsat oynasini chiqaradi
    const perm = await requestMicPermission()
    if (perm === 'denied') { pushAI(voiceErrorMessage('not-allowed'), false); return }
    if (perm === 'unavailable') { pushAI(voiceErrorMessage('audio-capture'), false); return }
    startRecognition(ttsLang(lang))
  }

  const saveSettings = () => {
    saveProvider(provider); saveApiKey(provider, apiKey.trim()); saveModel(provider, model)
    setSettingsOpen(false)
    const pName = PROVIDER_INFO[provider].label
    const hasAccess = provider === 'proxy' ? HAS_BUILTIN_PROXY : !!apiKey.trim()
    pushAI(hasAccess
      ? `✓ Aqlli rejim yoqildi (${pName}) — endi erkin, istalgan so'z bilan yozishingiz mumkin.`
      : '✓ Sozlamalar saqlandi. (Offline rejim)', true)
  }

  const samples = lang === 'ru' ? SAMPLES_RU : lang === 'en' ? SAMPLES_EN : SAMPLES_UZ

  return (
    <div className="fade-in flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      {/* Sarlavha */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-indigo-500 text-white shadow-soft">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-bold">
            {lang === 'ru' ? 'AI ассистент' : lang === 'en' ? 'AI Assistant' : 'AI yordamchi'}
            <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              llmOn ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted')}>
              {llmOn ? <><Zap size={10} /> Aqlli</> : <><WifiOff size={10} /> Offline</>}
            </span>
          </h1>
          <p className="truncate text-xs text-muted">
            {lang === 'ru' ? 'Управляйте программой голосом или текстом' : lang === 'en' ? 'Control the app by voice or text' : "Dasturni ovoz yoki matn orqali boshqaring"}
          </p>
        </div>
        <button type="button" onClick={() => setTtsOn((v) => !v)}
          className={cx('grid h-9 w-9 place-items-center rounded-lg border transition-colors',
            ttsOn ? 'border-accent/40 bg-accent/15 text-accent' : 'border-border bg-surface text-muted hover:text-ink')}
          title="Javoblarni ovozda o'qish">
          {ttsOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-accent"
          title="AI sozlamalari (kalit, model)">
          <Settings2 size={16} />
        </button>
        <button type="button" onClick={() => { clearHistory(); resetChat(welcomeMsg(lang)) }}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-danger"
          title="Suhbatni tozalash">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Suhbat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0, background: 'linear-gradient(180deg, rgba(99,102,241,0.03), transparent)' }}>
        <div className="mx-auto max-w-3xl space-y-3">
          {/* Robot maskot — suhbat boshida katta, keyin kichik */}
          {msgs.length <= 2 && (
            <div className="flex flex-col items-center pb-4 pt-2">
              <RobotMascot state={robotState} size={100} />
              <p className="mt-2 text-center text-xs text-muted">
                {robotState === 'listening' ? 'Eshityapman...' :
                 robotState === 'thinking' ? "O'ylayapman..." :
                 robotState === 'happy' ? 'Bajarildi!' :
                 robotState === 'confused' ? 'Tushunmadim...' :
                 robotState === 'error' ? 'Xatolik yuz berdi' :
                 'Buyruq yozing yoki ayting'}
              </p>
            </div>
          )}
          {msgs.map((m) => <MsgBubble key={m.id} msg={m} />)}
          {interim && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md border-2 border-dashed border-accent/40 bg-accent/5 px-4 py-2 text-sm italic text-muted">{interim}</div>
            </div>
          )}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <RobotMascot state={robotState} size={36} />
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              {generating ? 'Jadval tuzilmoqda…' : llmOn ? "O'ylayapman…" : 'Bajarilmoqda…'}
              {generating && (
                <button onClick={() => { stopGeneration(); setGenerating(false); setBusy(false); setRobotState('idle'); pushAI("✓ To'xtatildi.", true) }}
                  className="ml-2 inline-flex items-center gap-1 rounded-md bg-danger/15 px-2 py-0.5 text-danger hover:bg-danger/25">
                  <Square size={10} /> To'xtatish
                </button>
              )}
            </div>
          )}
          {/* Kichik robot — suhbat davomida (faqat busy bo'lmaganda, msgs > 2) */}
          {!busy && msgs.length > 2 && robotState !== 'idle' && (
            <div className="flex items-center gap-2">
              <RobotMascot state={robotState} size={36} />
              <span className="text-xs text-muted">
                {robotState === 'happy' ? 'Tayyor!' :
                 robotState === 'confused' ? 'Tushunmadim...' :
                 robotState === 'error' ? 'Xatolik...' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Namuna chiplar */}
      {msgs.length <= 2 && (
        <div className="border-t border-border px-5 pb-2 pt-3">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted">
              <Lightbulb size={13} />
              {lang === 'ru' ? 'Примеры:' : lang === 'en' ? 'Examples:' : 'Namuna buyruqlar:'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {samples.map((smp) => (
                <button key={smp} type="button" onClick={() => void sendText(smp)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent">
                  {smp}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); void sendText(input) }}
        className="border-t border-border bg-surface/50 px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button type="button" onClick={() => void toggleListen()} disabled={busy}
            className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition-all',
              listening ? 'animate-pulse border-danger/50 bg-danger text-white shadow-lg'
                : 'border-border bg-surface text-muted hover:border-accent/40 hover:bg-accent/10 hover:text-accent')}
            title={listening ? "To'xtatish" : 'Mikrofon'}>
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={llmOn
              ? (lang === 'ru' ? 'Напишите что угодно…' : lang === 'en' ? 'Type anything…' : 'Istalgan narsani yozing…')
              : (lang === 'ru' ? 'Команда или микрофон…' : lang === 'en' ? 'Command or microphone…' : 'Buyruq yozing yoki mikrofon…')}
            disabled={busy}
            className="flex-1 rounded-full border border-border bg-surface px-5 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
          <button type="submit" disabled={busy || !input.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg shadow-soft transition-all hover:shadow-lg disabled:opacity-40"
            title="Yuborish">
            <Send size={16} />
          </button>
        </div>
      </form>

      {/* Sozlamalar modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="AI yordamchi sozlamalari" width="max-w-lg"
        footer={<>
          <button onClick={() => setSettingsOpen(false)} className="btn btn-ghost">Bekor</button>
          <button onClick={saveSettings} className="btn btn-primary">Saqlash</button>
        </>}>
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 font-semibold text-accent"><Zap size={15} /> Aqlli rejim</div>
            <p className="text-muted">
              API kalit kiritsangiz — AI har qanday tabiiy tilni to'liq tushunadi va murakkab buyruqlarni bajaradi.
              Kalitsiz ham dastur <b>offline rejimda</b> asosiy buyruqlarni tushunadi (internet kerak emas).
            </p>
          </div>

          {/* Kalit olish bo'yicha oddiy yo'riqnoma */}
          <details className="rounded-lg border border-ok/30 bg-ok/5">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ok">
              📖 Groq uchun bepul kalit qanday olinadi? (2 daqiqa)
            </summary>
            <ol className="space-y-2 border-t border-ok/20 px-4 py-3 text-sm text-muted">
              <li><b className="text-ink">1-qadam.</b> Yangi oynada ushbu havolani oching:{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                  className="font-medium text-accent underline">console.groq.com/keys</a>
              </li>
              <li><b className="text-ink">2-qadam.</b> "Sign in with Google" tugmasini bosib, oddiy Gmail hisobingiz bilan kiring (karta kerak emas, bepul).</li>
              <li><b className="text-ink">3-qadam.</b> "Create API Key" tugmasini bosing — nom bering (masalan "JadvalPro"), "Create" bosing.</li>
              <li><b className="text-ink">4-qadam.</b> Chiqqan kalitni (`gsk_...` bilan boshlanadi) nusxalang — bu oyna <b>bir martagina ko'rinadi</b>.</li>
              <li><b className="text-ink">5-qadam.</b> Shu yerga qaytib, "Groq" tanlang va kalitni pastdagi maydonga joylashtiring → Saqlash.</li>
            </ol>
            <div className="border-t border-ok/20 bg-ok/10 px-4 py-2 text-xs text-muted">
              <b className="text-ok">✓ Bepul:</b> Groq kuniga minglab so'rov beradi, karta so'ramaydi, muddat yo'q.
            </div>
          </details>

          <Field label="AI provayder" hint="Qaysi sun'iy intellekt xizmatidan foydalanasiz.">
            <div className="grid grid-cols-2 gap-2">
              {((HAS_BUILTIN_PROXY
                ? ['proxy', 'groq', 'gemini', 'deepseek', 'openrouter', 'openai', 'claude']
                : ['groq', 'gemini', 'deepseek', 'openrouter', 'openai', 'claude']) as Provider[]).map((p) => (
                <button key={p} type="button" onClick={() => switchProvider(p)}
                  className={cx('flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    provider === p ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-muted hover:text-ink')}>
                  <span className="font-medium">{PROVIDER_INFO[p].label}</span>
                  {PROVIDER_INFO[p].badge && (
                    <span className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">{PROVIDER_INFO[p].badge}</span>
                  )}
                </button>
              ))}
            </div>
          </Field>

          {provider === 'proxy' ? (
            <div className="rounded-lg border border-ok/30 bg-ok/5 p-3 text-sm text-muted">
              <b className="text-ok">✓ Kalit kerak emas.</b> So'rovlar sotuvchi serveri orqali bajariladi — hech narsa sozlash shart emas. Shunchaki "Saqlash" ni bosing.
            </div>
          ) : (
            <>
              <Field label={`${PROVIDER_INFO[provider].label} API kalit`} hint={PROVIDER_INFO[provider].keyHint}>
                <div className="relative">
                  <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder={placeholderFor(provider)} autoComplete="off"
                    className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </div>
              </Field>
              {PROVIDER_INFO[provider].keyUrl && (
                <a href={PROVIDER_INFO[provider].keyUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  🔗 {PROVIDER_INFO[provider].label} kalit sahifasini ochish
                </a>
              )}
            </>
          )}

          {provider !== 'proxy' && (
            <Field label="Model" hint="Flash/Haiku — tez & arzon; Pro/Opus — eng aqlli.">
              <select value={model} onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent">
                {PROVIDER_MODELS[provider].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={forceOffline} onChange={(e) => setForceOffline(e.target.checked)} className="h-4 w-4 accent-accent" />
            <WifiOff size={14} className="text-muted" />
            Offline rejimni majburiy yoqish (kalit bo'lsa ham AI ni ishlatmaslik)
          </label>

          <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-xs text-muted">
            <b>Maxfiylik:</b> API kalit faqat shu brauzer/qurilmada (localStorage) saqlanadi, hech qayerga yuborilmaydi.
            So'rovlar to'g'ridan-to'g'ri {PROVIDER_INFO[provider].label} serveriga boradi.
            {(provider === 'groq' || provider === 'gemini') ? ' Bu provayderda bepul limit mavjud.' : ' Har so\'rov uchun kalitingiz hisobidan to\'lov yechiladi.'}
          </div>
          <div className="rounded-lg border border-ok/30 bg-ok/5 p-3 text-xs text-muted">
            <b className="text-ok">💡 Tezkor rejim:</b> Oddiy buyruqlar (yangi, o'chir, jadval tuz, eksport va h.k.) <b>offline parser</b> orqali bajariladi — AI chaqirilmaydi, limitingiz tejaladi. AI faqat erkin tabiiy til uchun ishga tushadi.
          </div>
        </div>
      </Modal>
    </div>
  )
}

function placeholderFor(p: Provider): string {
  switch (p) {
    case 'proxy': return ''
    case 'gemini': return 'AIza...'
    case 'claude': return 'sk-ant-...'
    case 'openai': return 'sk-...'
    case 'groq': return 'gsk_...'
    case 'deepseek': return 'sk-...'
    case 'openrouter': return 'sk-or-...'
  }
}

function welcomeMsg(lang: string): Msg {
  return {
    id: 'welcome', role: 'ai', ts: Date.now(),
    text: lang === 'ru'
      ? "Привет! Я ассистент JadvalPro. Я могу управлять всей программой — добавлять учителей и классы, составлять расписание, отвечать на вопросы. Напишите или скажите команду. Для списка команд напишите «помощь»."
      : lang === 'en'
        ? "Hi! I'm the JadvalPro assistant. I can run the whole app — add teachers and classes, build the timetable, answer questions. Type or speak a command. For a list, type 'help'."
        : "Assalomu alaykum! Men JadvalPro yordamchisiman. Dasturdagi har qanday ishni bajara olaman — o'qituvchi/sinf qo'shish, jadval tuzish, savollarga javob berish. Buyruq yozing yoki ayting. Buyruqlar ro'yxati uchun \"yordam\" deb yozing.",
  }
}
function greet(lang: string): string {
  return lang === 'ru' ? 'Здравствуйте! Чем помочь?' : lang === 'en' ? 'Hello! How can I help?' : 'Assalomu alaykum! Nimada yordam beraman?'
}
function ttsLang(lang: string): 'uz-UZ' | 'ru-RU' | 'en-US' {
  return lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ'
}

function MsgBubble({ msg }: { msg: Msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-fg shadow-sm">{msg.text}</div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2">
      <div className={cx('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
        msg.ok === false ? 'bg-danger/15 text-danger' : msg.tool ? 'bg-ok/15 text-ok' : 'bg-accent/15 text-accent')}>
        {msg.ok === false ? <AlertCircle size={16} /> : msg.ok === true ? <CheckCircle2 size={16} /> : <Bot size={16} />}
      </div>
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-2.5 text-sm">{msg.text}</div>
    </div>
  )
}
