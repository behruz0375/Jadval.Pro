// ============================================================
// JadvalPro — AI proxy (Cloudflare Worker)
// Sotuvchi kalitini yashiradi. Mijoz brauzeri shu Worker ga ulanadi,
// Worker esa OpenAI-compatible AI (Groq/OpenAI/DeepSeek/OpenRouter) ga
// sotuvchi kaliti bilan so'rov yuboradi.
//
// DEPLOY:
//   1. https://workers.cloudflare.com -> Create Worker
//   2. Worker Settings -> Variables -> secret qo'shing:
//        AI_API_KEY   = sizning Groq/OpenAI kalitingiz
//        AI_API_URL   = https://api.groq.com/openai/v1/chat/completions
//        AI_MODEL     = llama-3.3-70b-versatile  (ixtiyoriy — mijoz tanlasa, mijoz tanlagan ishlatiladi)
//        ALLOWED_ORIGINS = https://your-domain.com,http://localhost:5173  (CORS; '*' qo'yish mumkin lekin xavfli)
//   3. Shu faylni Worker kodiga yopishtiring -> Deploy
//   4. Worker URL (misol: https://jadvalpro-ai.yourname.workers.dev) ni dasturning
//      .env.local fayliga yozing:   VITE_PROXY_URL=https://jadvalpro-ai.yourname.workers.dev
//   5. npm run build va dastur mijozlarga tarqating.
//
// NATIJA: mijozlar hech qanday kalit kiritmaydi, sizning limitingiz orqali ishlatadi,
// kalit faqat Worker ichida (Cloudflare secret), brauzerda ko'rinmaydi.
// ============================================================

export default {
  async fetch(request, env) {
    // CORS preflight
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS || '*')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    // Faqat POST /v1/chat/completions
    const url = new URL(request.url)
    if (!/\/v1\/chat\/completions$/.test(url.pathname) || request.method !== 'POST') {
      return json({ error: { message: 'Not found' } }, 404, cors)
    }

    const apiKey = env.AI_API_KEY
    const apiUrl = env.AI_API_URL
    if (!apiKey || !apiUrl) {
      return json({ error: { message: 'Server sozlanmagan (AI_API_KEY/AI_API_URL yo\'q)' } }, 500, cors)
    }

    // Mijozning so'rovini olamiz
    let body
    try { body = await request.json() } catch { return json({ error: { message: 'JSON noto\'g\'ri' } }, 400, cors) }

    // Agar modelga `""` yoki `"auto"` berilgan bo'lsa — server tanlagan model
    if (!body.model || body.model === 'auto' || body.model === '') {
      body.model = env.AI_MODEL || 'llama-3.3-70b-versatile'
    }

    // Og'irlashtirish — mijoz yovuz prompt yubormasligi uchun oddiy limit
    if (JSON.stringify(body).length > 500_000) {
      return json({ error: { message: 'So\'rov juda katta' } }, 413, cors)
    }

    // Haqiqiy AI ga uzatamiz
    let upstream
    try {
      upstream = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          ...(env.AI_EXTRA_HEADERS ? JSON.parse(env.AI_EXTRA_HEADERS) : {}),
        },
        body: JSON.stringify(body),
      })
    } catch (e) {
      return json({ error: { message: 'AI serveriga ulanib bo\'lmadi: ' + (e?.message || e) } }, 502, cors)
    }

    // Javobni mijozga shunday qaytaramiz (kalit o'rniga Worker URL ko'rinadi)
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        ...cors,
      },
    })
  },
}

function corsHeaders(origin, allowed) {
  const list = String(allowed).split(',').map((s) => s.trim())
  const ok = list.includes('*') || list.includes(origin)
  return {
    'Access-Control-Allow-Origin': ok ? (origin || '*') : list[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  })
}
