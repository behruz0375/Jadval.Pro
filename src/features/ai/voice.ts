// ============================================================
// Ovoz orqali buyruq olish — brauzerning Web Speech API ustidan
// ingichka o'ram. Uzbek lotincha ko'p brauzerlarda yo'q, shuning uchun
// 'uz-UZ' topilmasa — 'ru-RU' ga, keyin 'en-US' ga tushamiz.
// ============================================================

type SpeechLang = 'uz-UZ' | 'ru-RU' | 'en-US'

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: ArrayLike<{
    0: { transcript: string; confidence: number }
    isFinal: boolean
    length: number
  }>
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

/** Brauzer qo'llab-quvvatlaydimi? */
export function isVoiceSupported(): boolean {
  const w = window as WindowWithSpeech
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

/** Yangi recognition yaratish */
function createRecognition(): SpeechRecognitionLike | null {
  const w = window as WindowWithSpeech
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null
  return new Ctor()
}

/** Mikrofon ruxsatini oldindan so'rash — brauzer ruxsat oynasini chiqaradi.
 *  SpeechRecognition ba'zan o'zi ruxsat so'ramaydi; getUserMedia ishonchliroq. */
export async function requestMicPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return 'unavailable'
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // Darhol yopamiz — faqat ruxsat kerak edi
    stream.getTracks().forEach((t) => t.stop())
    return 'granted'
  } catch (e) {
    const name = (e as Error)?.name || ''
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
    return 'unavailable'
  }
}

/** Xato kodini tushunarli o'zbekcha xabarga aylantirish */
export function voiceErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'denied':
    case 'service-not-allowed':
      return "Mikrofonga ruxsat berilmagan. Brauzer manzil panelidagi 🔒 belgisini bosib, mikrofonni «Ruxsat» qiling va qayta urining. (Claude ichidagi ko'rish oynasida mikrofon bloklangan — haqiqiy brauzerda oching.)"
    case 'no-speech':
      return 'Ovoz eshitilmadi. Mikrofonga gapiring.'
    case 'audio-capture':
      return "Mikrofon topilmadi. Qurilmaga mikrofon ulanganini tekshiring."
    case 'language-not-supported':
      return "Bu til ovoz tanishda qo'llab-quvvatlanmaydi. Rus yoki ingliz tilini sinab ko'ring."
    case 'network':
      return "Ovoz tanish uchun internet kerak (brauzer xizmati). Ulanishni tekshiring."
    case 'not-supported':
      return "Brauzeringizda ovoz tanish yo'q. Chrome yoki Edge ishlatib ko'ring."
    case 'unavailable':
      return "Mikrofon mavjud emas yoki bloklangan."
    default:
      return `Ovoz xatosi: ${code}`
  }
}

/** Oddiy foydalanish:
 *  const stop = listenOnce({ lang: 'uz-UZ', onResult: (t) => console.log(t) })
 *  // keyin stop() chaqirish mumkin agar foydalanuvchi bekor qilsa.
 */
export function listenOnce(opts: {
  lang: SpeechLang
  onResult: (transcript: string) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
  interim?: (partial: string) => void
}): () => void {
  const rec = createRecognition()
  if (!rec) {
    opts.onError?.('not-supported')
    return () => {}
  }
  rec.lang = opts.lang
  rec.continuous = false
  rec.interimResults = !!opts.interim

  rec.onstart = () => opts.onStart?.()
  rec.onend = () => opts.onEnd?.()
  rec.onerror = (e) => opts.onError?.(e.error || 'error')
  rec.onresult = (e: SpeechRecognitionEvent) => {
    let final = ''
    let partial = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) final += r[0].transcript
      else partial += r[0].transcript
    }
    if (partial && opts.interim) opts.interim(partial)
    if (final) opts.onResult(final.trim())
  }
  try {
    rec.start()
  } catch (err) {
    opts.onError?.(String(err))
  }
  return () => {
    try { rec.abort() } catch { /* ignore */ }
  }
}

/** TTS orqali javob o'qish — ovozli yordamchiga o'xshaydi. */
export function speak(text: string, lang: SpeechLang = 'uz-UZ'): void {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 1
    u.volume = 1
    synth.speak(u)
  } catch { /* ignore */ }
}
