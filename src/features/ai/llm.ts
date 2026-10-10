// ============================================================
// AI yordamchi — LLM mijozi. IKKI provayder: Claude (Anthropic) va
// Gemini (Google). Brauzerdan to'g'ridan-to'g'ri API ga ulanadi
// (faqat foydalanuvchi kalit kiritganda). Tool-use loop ni boshqaradi.
// Neytral suhbat tarixi saqlanadi, har provayder formatiga aylantiriladi.
// ============================================================
import { findTool, toolsForLLM, type ToolContext, type ToolResult } from './tools'
import type { Project } from '@/types'

export type Provider = 'proxy' | 'gemini' | 'claude' | 'openai' | 'groq' | 'deepseek' | 'openrouter'

/** Dastur yig'ilish vaqtida sozlangan "sotuvchi serveri" URL (ixtiyoriy).
 *  .env.local da VITE_PROXY_URL=https://your-worker.workers.dev
 *  Agar o'rnatilgan bo'lsa — mijoz hech narsa kiritmasa ham AI ishlaydi,
 *  so'rov sotuvchi serveriga boradi va u yerda sotuvchi kaliti bilan AI chaqiriladi. */
export const BUILTIN_PROXY_URL: string = (import.meta.env?.VITE_PROXY_URL as string | undefined) || ''
export const HAS_BUILTIN_PROXY: boolean = BUILTIN_PROXY_URL.length > 0

export interface LLMConfig {
  provider: Provider
  apiKey: string
  model: string
  lang: 'uz' | 'ru' | 'en'
}

export const DEFAULT_PROVIDER: Provider = HAS_BUILTIN_PROXY ? 'proxy' : 'groq'

export interface ProviderInfo {
  label: string
  keyUrl: string
  keyHint: string
  badge?: string // "bepul", "limit kattta", "arzon"
}

export const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  proxy: { label: 'Sotuvchi serveri', keyUrl: '', keyHint: 'Kalit kerak emas — sotuvchi serveri orqali ishlaydi', badge: 'kalitsiz' },
  groq: { label: 'Groq (Llama)', keyUrl: 'https://console.groq.com/keys', keyHint: 'console.groq.com/keys — bepul, kuniga ko\'p so\'rov', badge: 'bepul · juda tez' },
  gemini: { label: 'Google Gemini', keyUrl: 'https://aistudio.google.com/apikey', keyHint: 'aistudio.google.com/apikey — bepul tier', badge: 'bepul (kam limit)' },
  deepseek: { label: 'DeepSeek', keyUrl: 'https://platform.deepseek.com/api_keys', keyHint: 'platform.deepseek.com/api_keys — juda arzon', badge: 'arzon' },
  openrouter: { label: 'OpenRouter', keyUrl: 'https://openrouter.ai/keys', keyHint: 'openrouter.ai/keys — 100+ model (bepul variantlar bor)', badge: '100+ model' },
  openai: { label: 'OpenAI (ChatGPT)', keyUrl: 'https://platform.openai.com/api-keys', keyHint: 'platform.openai.com/api-keys — pullik', badge: 'pullik' },
  claude: { label: 'Anthropic Claude', keyUrl: 'https://console.anthropic.com/settings/keys', keyHint: 'console.anthropic.com — pullik', badge: 'pullik' },
}

export const PROVIDER_MODELS: Record<Provider, { id: string; label: string }[]> = {
  proxy: [{ id: 'auto', label: 'Avto (sotuvchi tanlagan)' }],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B — eng aqlli (tavsiya)' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B — eng tez' },
    { id: 'llama-3.3-70b-specdec', label: 'Llama 3.3 70B SpecDec — tez variant' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8×7B' },
  ],
  gemini: [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash — tez (tavsiya)' },
    { id: 'gemini-3.8-pro', label: 'Gemini 3.8 Pro — eng aqlli' },
    { id: 'gemini-flash-latest', label: 'Gemini Flash (oxirgi)' },
    { id: 'gemini-pro-latest', label: 'Gemini Pro (oxirgi)' },
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat V3 — tavsiya' },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner — murakkab fikrlash' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (bepul) — tavsiya' },
    { id: 'google/gemini-flash-1.5', label: 'Gemini Flash' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (pullik)' },
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (pullik)' },
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat (arzon)' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini — arzon (tavsiya)' },
    { id: 'gpt-4o', label: 'GPT-4o — eng aqlli' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  claude: [
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — eng aqlli' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
    { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — tez & arzon' },
  ],
}
export const DEFAULT_MODEL: Record<Provider, string> = {
  proxy: 'auto',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-3.8-flash',
  deepseek: 'deepseek-chat',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  openai: 'gpt-4o-mini',
  claude: 'claude-opus-5-5',
}

/** Eskirgan/ishlamaydigan model tanlovlarini joriysiga ko'chirish */
const DEPRECATED_GEMINI = new Set(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'])
function migrateModel(p: Provider, m: string): string {
  if (p === 'gemini' && (DEPRECATED_GEMINI.has(m) || !m)) return DEFAULT_MODEL.gemini
  return m || DEFAULT_MODEL[p]
}

/** OpenAI-compatible endpoint URL per provayder */
const OPENAI_COMPAT_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}
const isOpenAICompat = (p: Provider): boolean => p in OPENAI_COMPAT_URL

// --------- Neytral suhbat tarixi ---------

export interface NeutralToolCall { id: string; name: string; args: Record<string, unknown> }
export interface NeutralToolResult { id: string; name: string; content: string; isError: boolean }
export type ChatTurn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text?: string; toolCalls?: NeutralToolCall[]; rawParts?: unknown[] }
  | { role: 'tool'; results: NeutralToolResult[] }

/** Provayder javobi (normallashtirilgan) */
interface ProviderReply { text: string; toolCalls: NeutralToolCall[]; refusal?: string; rawParts?: unknown[] }

// --------- Umumiy system prompt ---------

function projectSnapshot(p: Project): string {
  const names = (arr: { name?: string; fullName?: string }[], max = 40) =>
    arr.slice(0, max).map((x) => x.fullName ?? x.name ?? '').filter(Boolean).join(', ')
  return [
    `Maktab: ${p.school.name || '(nomsiz)'} · ish kunlari: ${p.school.workDays} · navbatlar: ${p.school.shifts.length}`,
    `Sinflar (${p.classes.length}): ${names(p.classes) || '—'}`,
    `Fanlar (${p.subjects.length}): ${names(p.subjects) || '—'}`,
    `O'qituvchilar (${p.teachers.length}): ${names(p.teachers) || '—'}`,
    `Xonalar (${p.rooms.length}): ${names(p.rooms) || '—'}`,
    `Darslar: ${p.lessons.length} ta · Tuzilgan jadvallar: ${p.timetables.length} ta`,
  ].join('\n')
}

function systemPrompt(p: Project, lang: string): string {
  const langName = lang === 'ru' ? 'rus' : lang === 'en' ? 'ingliz' : "o'zbek (lotin)"
  return `Siz "JadvalPro" — maktab dars jadvali dasturining AI yordamchisisiz. Vazifangiz: foydalanuvchi buyruqlarini tushunib, dasturdagi tool'lar (funksiyalar) orqali BAJARISH.

Siz dasturdagi HAR QANDAY ishni bajara olasiz: o'qituvchi/sinf/fan/xona/dars qo'shish va o'chirish, ma'lumotlarni tahrirlash, avtomatik jadval tuzish va yaxshilash, o'qituvchi/sinf ish vaqtini belgilash, o'rinbosar topish, tahlil savollari (yuklama, eng band o'qituvchi, jadval sifati, konfliktlar), bulk yaratish, eksport, sozlamalar, navigatsiya.

MUHIM QOIDALAR:
- Foydalanuvchi niyatini aniqlagach, mos funksiya(lar)ni chaqiring. Bir buyruqda bir nechta ish bo'lsa — ketma-ket bir nechta funksiya chaqiring.
- Entity (o'qituvchi/sinf/fan) nomlari aniq bo'lmasa, quyidagi mavjud ro'yxatdan eng yaqinini tanlang. Umuman topilmasa — qisqa aniqlashtiruvchi savol bering.
- Javoblaringiz QISQA va ${langName} tilida. Ortiqcha tushuntirmang — ishni bajaring va natijani bir jumlada ayting.
- Jadval tuzish uchun avval darslar bo'lishi shart.

HOZIRGI LOYIHA HOLATI:
${projectSnapshot(p)}`
}

// ============================================================
// GEMINI adapter (Google Generative Language API)
// ============================================================

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/** fetch with timeout — AI javob bermasa cheksiz osilib qolmasligi uchun */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 45000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) } finally { clearTimeout(timer) }
}

/** Tool'larni Gemini functionDeclarations formatiga (type UPPERCASE) */
function geminiTools() {
  const decls = toolsForLLM().map((t) => {
    const props: Record<string, unknown> = {}
    const schemaProps = (t.input_schema.properties ?? {}) as Record<string, { type?: string; description?: string; enum?: string[]; items?: unknown }>
    for (const [k, v] of Object.entries(schemaProps)) {
      const typ = (v.type || 'string').toUpperCase()
      const entry: Record<string, unknown> = { type: typ === 'ARRAY' ? 'ARRAY' : typ, description: v.description }
      if (v.enum) entry.enum = v.enum
      if (typ === 'ARRAY') entry.items = { type: 'STRING' }
      props[k] = entry
    }
    return {
      name: t.name,
      description: t.description,
      parameters: { type: 'OBJECT', properties: props, required: t.input_schema.required ?? [] },
    }
  })
  return [{ functionDeclarations: decls }]
}

interface GeminiPart { text?: string; thought?: boolean; thoughtSignature?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: Record<string, unknown> } }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

function toGeminiContents(history: ChatTurn[]): GeminiContent[] {
  const out: GeminiContent[] = []
  for (const turn of history) {
    if (turn.role === 'user') out.push({ role: 'user', parts: [{ text: turn.text }] })
    else if (turn.role === 'assistant') {
      // Agar xom qismlar (rawParts) saqlangan bo'lsa — ularni aynan qaytaramiz (thoughtSignature saqlanishi uchun)
      if (turn.rawParts && turn.rawParts.length) {
        out.push({ role: 'model', parts: turn.rawParts as GeminiPart[] })
      } else {
        const parts: GeminiPart[] = []
        if (turn.text) parts.push({ text: turn.text })
        for (const tc of turn.toolCalls ?? []) parts.push({ functionCall: { name: tc.name, args: tc.args } })
        if (parts.length) out.push({ role: 'model', parts })
      }
    } else {
      out.push({ role: 'user', parts: turn.results.map((r) => ({ functionResponse: { name: r.name, response: { result: r.content, success: !r.isError } } })) })
    }
  }
  return out
}

async function callGemini(cfg: LLMConfig, system: string, history: ChatTurn[]): Promise<ProviderReply> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: toGeminiContents(history),
    tools: geminiTools(),
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  }
  let res: Response
  try {
    res = await fetchWithTimeout(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? "Gemini javob bermadi (vaqt tugadi). Internet yoki modelni tekshiring." : `Internetga ulanib bo'lmadi: ${(e as Error).message}`
    throw new Error(msg)
  }
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j?.error?.message || JSON.stringify(j) } catch { detail = await res.text().catch(() => '') }
    if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(detail)) throw new Error("Gemini kalit noto'g'ri. Sozlamalardan tekshiring.")
    if (res.status === 429) throw new Error('Gemini limiti tugadi (429). Birozdan keyin urining.')
    if (res.status === 403) throw new Error(`Gemini ruxsat xatosi (403): ${detail}`)
    throw new Error(`Gemini xatosi ${res.status}: ${detail}`)
  }
  const data = await res.json()
  const cand = data?.candidates?.[0]
  if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'PROHIBITED_CONTENT') {
    return { text: '', toolCalls: [], refusal: 'xavfsizlik sababli' }
  }
  const parts: GeminiPart[] = cand?.content?.parts ?? []
  let text = ''
  const toolCalls: NeutralToolCall[] = []
  let idx = 0
  for (const p of parts) {
    if (p.text && !p.thought) text += p.text
    if (p.functionCall) toolCalls.push({ id: `g${Date.now()}_${idx++}`, name: p.functionCall.name, args: p.functionCall.args || {} })
  }
  return { text: text.trim(), toolCalls, rawParts: parts }
}

// ============================================================
// CLAUDE adapter (Anthropic Messages API)
// ============================================================

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

type ClaudeBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

function toClaudeMessages(history: ChatTurn[]): { role: 'user' | 'assistant'; content: string | ClaudeBlock[] }[] {
  const out: { role: 'user' | 'assistant'; content: string | ClaudeBlock[] }[] = []
  for (const turn of history) {
    if (turn.role === 'user') out.push({ role: 'user', content: turn.text })
    else if (turn.role === 'assistant') {
      const blocks: ClaudeBlock[] = []
      if (turn.text) blocks.push({ type: 'text', text: turn.text })
      for (const tc of turn.toolCalls ?? []) blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args })
      out.push({ role: 'assistant', content: blocks.length ? blocks : (turn.text ?? '') })
    } else {
      out.push({ role: 'user', content: turn.results.map((r) => ({ type: 'tool_result' as const, tool_use_id: r.id, content: r.content, is_error: r.isError })) })
    }
  }
  return out
}

async function callClaude(cfg: LLMConfig, system: string, history: ChatTurn[]): Promise<ProviderReply> {
  const body = {
    model: cfg.model, max_tokens: 2048, system,
    messages: toClaudeMessages(history), tools: toolsForLLM(),
    output_config: { effort: 'low' },
  }
  let res: Response
  try {
    res = await fetchWithTimeout(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'Claude javob bermadi (vaqt tugadi).' : `Internetga ulanib bo'lmadi: ${(e as Error).message}`
    throw new Error(msg)
  }
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j?.error?.message || JSON.stringify(j) } catch { detail = await res.text().catch(() => '') }
    if (res.status === 401) throw new Error("Claude kalit noto'g'ri (401).")
    if (res.status === 429) throw new Error('Claude limiti tugadi (429).')
    throw new Error(`Claude xatosi ${res.status}: ${detail}`)
  }
  const data = await res.json()
  if (data.stop_reason === 'refusal') return { text: '', toolCalls: [], refusal: data.stop_details?.explanation || 'xavfsizlik sababli' }
  const content: ClaudeBlock[] = data.content ?? []
  let text = ''
  const toolCalls: NeutralToolCall[] = []
  for (const b of content) {
    if (b.type === 'text') text += b.text
    else if (b.type === 'tool_use') toolCalls.push({ id: b.id, name: b.name, args: b.input || {} })
  }
  return { text: text.trim(), toolCalls }
}

// ============================================================
// OPENAI-COMPATIBLE adapter (OpenAI, Groq, DeepSeek, OpenRouter)
// ============================================================

interface OAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
  name?: string
}

function toOpenAIMessages(system: string, history: ChatTurn[]): OAIMessage[] {
  const out: OAIMessage[] = [{ role: 'system', content: system }]
  for (const turn of history) {
    if (turn.role === 'user') out.push({ role: 'user', content: turn.text })
    else if (turn.role === 'assistant') {
      const tc = (turn.toolCalls ?? []).map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: JSON.stringify(c.args) } }))
      out.push({ role: 'assistant', content: turn.text || null, ...(tc.length ? { tool_calls: tc } : {}) })
    } else {
      for (const r of turn.results) out.push({ role: 'tool', tool_call_id: r.id, name: r.name, content: r.content })
    }
  }
  return out
}

function openAITools() {
  return toolsForLLM().map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }))
}

async function callOpenAICompat(cfg: LLMConfig, system: string, history: ChatTurn[]): Promise<ProviderReply> {
  const url = OPENAI_COMPAT_URL[cfg.provider]
  const headers: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` }
  if (cfg.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://jadvalpro.local'
    headers['X-Title'] = 'JadvalPro'
  }
  const body = {
    model: cfg.model,
    messages: toOpenAIMessages(system, history),
    tools: openAITools(),
    tool_choice: 'auto',
    temperature: 0.2,
    max_tokens: 2048,
  }
  let res: Response
  try { res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) }) }
  catch (e) {
    const msg = (e as Error).name === 'AbortError' ? `${PROVIDER_INFO[cfg.provider].label} javob bermadi (vaqt tugadi).` : `Internetga ulanib bo'lmadi: ${(e as Error).message}`
    throw new Error(msg)
  }
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j?.error?.message || JSON.stringify(j) } catch { detail = await res.text().catch(() => '') }
    const prefix = PROVIDER_INFO[cfg.provider].label
    if (res.status === 401) throw new Error(`${prefix} kalit noto'g'ri (401).`)
    if (res.status === 429) throw new Error(`${prefix} limit tugadi (429). Birozdan keyin urining.`)
    throw new Error(`${prefix} xatosi ${res.status}: ${detail}`)
  }
  const data = await res.json()
  const choice = data?.choices?.[0]
  const message = choice?.message ?? {}
  const text: string = message.content ?? ''
  const toolCalls: NeutralToolCall[] = (message.tool_calls ?? []).map((tc: { id?: string; function?: { name?: string; arguments?: string } }, i: number) => {
    let args: Record<string, unknown> = {}
    try { args = JSON.parse(tc.function?.arguments || '{}') } catch { /* ignore */ }
    return { id: tc.id || `oai_${Date.now()}_${i}`, name: tc.function?.name || '', args }
  })
  if (choice?.finish_reason === 'content_filter') return { text: '', toolCalls: [], refusal: 'xavfsizlik sababli' }
  return { text: (text || '').trim(), toolCalls }
}

// ============================================================
// PROXY adapter — sotuvchi serveri orqali, mijoz kalitni ko'rmaydi.
// Server OpenAI-compatible endpoint ni ko'rsatishi kutiladi.
// ============================================================

async function callProxy(cfg: LLMConfig, system: string, history: ChatTurn[]): Promise<ProviderReply> {
  if (!BUILTIN_PROXY_URL) throw new Error("Sotuvchi serveri sozlanmagan.")
  const url = BUILTIN_PROXY_URL.replace(/\/+$/, '') + '/v1/chat/completions'
  const body = {
    model: cfg.model === 'auto' ? '' : cfg.model,
    messages: toOpenAIMessages(system, history),
    tools: openAITools(),
    tool_choice: 'auto',
    temperature: 0.2,
    max_tokens: 2048,
  }
  let res: Response
  try { res = await fetchWithTimeout(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }
  catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'Server javob bermadi (vaqt tugadi).' : `Serverga ulanib bo'lmadi: ${(e as Error).message}`
    throw new Error(msg)
  }
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j?.error?.message || JSON.stringify(j) } catch { detail = await res.text().catch(() => '') }
    if (res.status === 429) throw new Error('Server limiti tugadi (429). Birozdan keyin urining yoki boshqa provayder tanlang.')
    if (res.status === 503) throw new Error('Server vaqtincha ishlamayapti (503).')
    throw new Error(`Server xatosi ${res.status}: ${detail}`)
  }
  const data = await res.json()
  const choice = data?.choices?.[0]
  const message = choice?.message ?? {}
  const text: string = message.content ?? ''
  const toolCalls: NeutralToolCall[] = (message.tool_calls ?? []).map((tc: { id?: string; function?: { name?: string; arguments?: string } }, i: number) => {
    let args: Record<string, unknown> = {}
    try { args = JSON.parse(tc.function?.arguments || '{}') } catch { /* ignore */ }
    return { id: tc.id || `px_${Date.now()}_${i}`, name: tc.function?.name || '', args }
  })
  if (choice?.finish_reason === 'content_filter') return { text: '', toolCalls: [], refusal: 'xavfsizlik sababli' }
  return { text: (text || '').trim(), toolCalls }
}

// ============================================================
// Umumiy tool-use loop (provayderga bog'liq emas)
// ============================================================

export interface LLMHooks {
  onToolResult?: (toolName: string, result: ToolResult) => void
  onNavigate?: (panel: string) => void
}
export interface LLMTurnResult { text: string; history: ChatTurn[] }

/** 429 (limit) uchun bir martalik qisqa qayta urinish */
async function callWithRetry(
  call: (cfg: LLMConfig, system: string, history: ChatTurn[]) => Promise<ProviderReply>,
  cfg: LLMConfig, system: string, history: ChatTurn[],
): Promise<ProviderReply> {
  try { return await call(cfg, system, history) }
  catch (e) {
    const msg = (e as Error).message
    if (/429|limit tugadi|quota/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 4000))
      return call(cfg, system, history) // bir marta qayta urinamiz
    }
    throw e
  }
}

export async function runLLMTurn(
  cfg: LLMConfig, userText: string, priorHistory: ChatTurn[], ctx: ToolContext, hooks: LLMHooks = {},
): Promise<LLMTurnResult> {
  const history: ChatTurn[] = [...priorHistory, { role: 'user', text: userText }]
  const call = cfg.provider === 'proxy' ? callProxy : cfg.provider === 'claude' ? callClaude : cfg.provider === 'gemini' ? callGemini : isOpenAICompat(cfg.provider) ? callOpenAICompat : null
  if (!call) throw new Error(`Noma'lum AI provayder: ${cfg.provider}. Sozlamalarni tekshiring.`)
  let guard = 0

  while (guard++ < 8) {
    const system = systemPrompt(ctx.getProject(), cfg.lang)
    const reply = await callWithRetry(call, cfg, system, history)

    if (reply.refusal) {
      history.push({ role: 'assistant', text: `(rad etildi: ${reply.refusal})` })
      return { text: `Kechirasiz, bu so'rovni bajara olmayman (${reply.refusal}).`, history }
    }

    history.push({ role: 'assistant', text: reply.text || undefined, toolCalls: reply.toolCalls.length ? reply.toolCalls : undefined, rawParts: reply.rawParts })

    if (reply.toolCalls.length === 0) {
      return { text: reply.text || '✓ Bajarildi.', history }
    }

    const results: NeutralToolResult[] = []
    for (const tc of reply.toolCalls) {
      const tool = findTool(tc.name)
      let result: ToolResult
      if (!tool) result = { ok: false, message: `Noma'lum funksiya: ${tc.name}` }
      else { try { result = await tool.run(tc.args || {}, ctx) } catch (e) { result = { ok: false, message: `Xato: ${(e as Error).message}` } } }
      hooks.onToolResult?.(tc.name, result)
      if (result.navigate) hooks.onNavigate?.(result.navigate)
      results.push({ id: tc.id, name: tc.name, content: result.message, isError: !result.ok })
    }
    history.push({ role: 'tool', results })
  }
  return { text: "Juda ko'p amal — to'xtatildi. Buyruqni soddalashtiring.", history }
}

// ============================================================
// Sozlamalarni saqlash (per-provayder kalit)
// ============================================================

const K_PROVIDER = 'jadvalpro-ai-provider'
const K_KEY = (p: Provider) => `jadvalpro-ai-key-${p}`
const K_MODEL = (p: Provider) => `jadvalpro-ai-model-${p}`

const VALID_PROVIDERS: Provider[] = ['proxy', 'groq', 'gemini', 'deepseek', 'openrouter', 'openai', 'claude']
export function loadProvider(): Provider {
  try {
    const v = localStorage.getItem(K_PROVIDER) as Provider | null
    return v && VALID_PROVIDERS.includes(v) ? v : DEFAULT_PROVIDER
  } catch { return DEFAULT_PROVIDER }
}
export function saveProvider(p: Provider): void { try { localStorage.setItem(K_PROVIDER, p) } catch { /* ignore */ } }

export function loadApiKey(p: Provider): string {
  try { return localStorage.getItem(K_KEY(p)) || '' } catch { return '' }
}
export function saveApiKey(p: Provider, key: string): void {
  try { if (key) localStorage.setItem(K_KEY(p), key); else localStorage.removeItem(K_KEY(p)) } catch { /* ignore */ }
}
export function loadModel(p: Provider): string {
  try { return migrateModel(p, localStorage.getItem(K_MODEL(p)) || '') } catch { return DEFAULT_MODEL[p] }
}
export function saveModel(p: Provider, m: string): void { try { localStorage.setItem(K_MODEL(p), m) } catch { /* ignore */ } }
