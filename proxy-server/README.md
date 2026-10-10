# JadvalPro — AI Proxy Server

Bu papka — **ixtiyoriy** sotuvchi serveri. Agar siz dasturni mijozlarga sotmoqchi bo'lsangiz va **ular AI uchun hech qanday kalit kiritmasin**, lekin **kalitingiz ham ko'rinmasin** desangiz — buni Cloudflare Workers'da deploy qilasiz (bepul, 5 daqiqa).

## Nima uchun kerak

- ❌ Agar kalitni dastur kodida yashirsangiz — brauzerda **hamma ko'radi** (JavaScript).
- ✅ Worker server tomonida ishlaydi, kalit Cloudflare secret'da — mijoz **hech qachon ko'rmaydi**.
- ✅ Mijoz hech narsa sozlamaydi — oddiygina dasturdan foydalanadi.
- ✅ Siz Cloudflare'da **oyiga bepul 100,000 so'rov** olasiz.

## Deploy — 5 daqiqa

### 1-qadam: Groq kaliti oling (bepul)
- https://console.groq.com/keys → Google bilan kiring → "Create API Key" → nusxalab oling

### 2-qadam: Cloudflare Worker yarating
1. https://workers.cloudflare.com → ro'yxatdan o'ting (bepul)
2. Dashboard → **Workers & Pages** → **Create** → **Create Worker**
3. Nom bering: `jadvalpro-ai` → **Deploy**
4. **Edit Code** → bor kodni o'chiring → `worker.js` fayldan nusxalab yopishtiring → **Save and Deploy**

### 3-qadam: Secret o'zgaruvchilarni qo'shing
Worker sahifasida: **Settings** → **Variables and Secrets** → **Add variable**:

| Nomi | Qiymati | Tur |
|---|---|---|
| `AI_API_KEY` | `gsk_...` (Groq kalitingiz) | **Secret** (yashirin) |
| `AI_API_URL` | `https://api.groq.com/openai/v1/chat/completions` | Text |
| `AI_MODEL` | `llama-3.3-70b-versatile` | Text |
| `ALLOWED_ORIGINS` | `*` (yoki aniq domen: `https://jadvalpro.uz`) | Text |

**Save and Deploy** ni bosing.

### 4-qadam: Worker URL ni dasturga ulang
Worker URL'ini oling (`https://jadvalpro-ai.YOUR-NAME.workers.dev` shaklida).

Dastur ildiz papkasida `.env.local` fayl yarating:
```
VITE_PROXY_URL=https://jadvalpro-ai.YOUR-NAME.workers.dev
```

### 5-qadam: Build qiling va tarqating
```bash
npm run build
```

`dist/` papkasini mijozlarga bering. Ular dasturni ochganda **Sotuvchi serveri** rejimi avtomatik tanlangan bo'ladi — hech narsa sozlamaydi.

## Boshqa provayderlar

Groq o'rniga istalgan OpenAI-compatible provayderni ishlatish mumkin — faqat `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` ni almashtiring:

| Provayder | `AI_API_URL` | `AI_MODEL` namuna |
|---|---|---|
| **Groq** (bepul, tez) | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| **OpenAI (ChatGPT)** | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| **DeepSeek** (arzon) | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| **OpenRouter** (ko'p model) | `https://openrouter.ai/api/v1/chat/completions` | `meta-llama/llama-3.3-70b-instruct:free` |

## Xavfsizlik tavsiyalari

1. **`ALLOWED_ORIGINS`** ni aniq domenga sozlang (`*` o'rniga). Masalan: `https://jadvalpro.uz`.
2. Cloudflare Dashboard → Worker → Settings → **Rate Limiting** qoidasini qo'shing (masalan: IP uchun daqiqasiga 10 so'rov).
3. Vaqti-vaqti bilan Groq konsolida sarf-xarajat (`Usage`) ni tekshirib turing.
4. Agar birov sizning Worker URL'ingizdan foydalanib qolgan bo'lsa — Secret kalitni yangilang.

## Narxlar

- **Cloudflare Workers:** bepul tier — kuniga 100,000 so'rov (oyiga ~3M).
- **Groq:** bepul tier — kuniga minglab so'rov, karta kerak emas.
- **Yakuniy:** haqiqatan ham **bepul**, agar mijozlar soni ming atrofida bo'lsa.

Katta hajm uchun oyiga 5 dollarlik Cloudflare Workers Paid planga o'tasiz.
