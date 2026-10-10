# JadvalPro backend — Render.com'ga deploy qilish

Oldindan tayyorlangan: `render.yaml` (Blueprint), `backend/Dockerfile`, `backend/.env.example`, PostgreSQL avto-ulanish.

**Taxminiy vaqt:** 10-15 daqiqa (hisob yaratish bilan).
**Narx:** 0 so'm — bepul tier ishlatiladi.
**Credit card:** kerak emas.

---

## 1-qadam. Kodni GitHub'ga yuklang

Kod allaqachon `https://github.com/behruz0375/Jadval.Pro.git` da. Oxirgi o'zgartirishlarni push qiling:

```bash
cd C:\Users\User\Desktop\JadvalPro\jadvalpro
git push origin main
```

> **Agar `git push` parol so'rasa:** GitHub endi parol qabul qilmaydi. Buning o'rniga **Personal Access Token** kerak:
> 1. https://github.com/settings/tokens/new ga kiring
> 2. Note: "jadvalpro-deploy", scope: `repo` (ikkita checkbox: `repo`), Expiration: 90 days
> 3. Generatsiya qiling → tokenni nusxalab oling
> 4. `git push origin main` so'raganda username: `behruz0375`, password: **tokenni** kiriting
> 5. Keyin `git config credential.helper store` — bir marta kiritasiz, keyin eslab qoladi

---

## 2-qadam. Render.com'da hisob yarating

1. https://dashboard.render.com/register ga kiring
2. "Sign up with GitHub" — bu eng tez yo'l (chunki repo ham GitHub'da)
3. GitHub'ning OAuth sahifasida ruxsat bering

---

## 3-qadam. Blueprint orqali deploy

Bitta `render.yaml` fayli bilan **ikkala service (API + PostgreSQL)** birga ko'tariladi.

1. Dashboard'da **"New +"** → **"Blueprint"** ni bosing
2. "Connect a repository" → `Jadval.Pro` ni tanlang (ro'yxatda bo'lmasa "Configure account" → ruxsat bering)
3. Render `render.yaml` ni avto-topadi va 2 ta resursni ko'rsatadi:
   - `jadvalpro-api` (web service, Docker)
   - `jadvalpro-db` (PostgreSQL, free)
4. **MUHIM:** sahifada `OWNER_PASSWORD` maydoni bo'sh ko'rinadi (`sync: false` sababli). Kuchli parol yozing (masalan tasodifiy 20 harf). **Buni eslab qoling — admin hisob paroli shu bo'ladi.**
5. **"Apply"** tugmasini bosing

Render:
- PostgreSQL ni yaratadi (~1 daqiqa)
- Backend Docker image'ini quradi (~3-5 daqiqa, 1-marta)
- `DATABASE_URL` va `SECRET_KEY` ni avto-ulaydi
- Deploy tugagach, API URL beradi: masalan `https://jadvalpro-api.onrender.com`

**Deploy tugaganini bilish:** Dashboard'da `jadvalpro-api` yashil "Live" bo'lsa.

---

## 4-qadam. Deploy'ni tekshiring

Brauzerda yoki terminalda:

```bash
curl https://jadvalpro-api.onrender.com/health
```

Javob: `{"status":"ok","service":"JadvalPro Backend","version":"2026.1.0"}`

Interaktiv docs: `https://jadvalpro-api.onrender.com/docs`

Admin login testi:

```bash
curl -X POST https://jadvalpro-api.onrender.com/api/auth/login-json \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"SIZNING_OWNER_PASSWORDINGIZ"}'
```

Javobda `access_token` kelsa — hamma narsa ishlayapti.

---

## 5-qadam. Frontend'ni serverga ulang

**Variant A (sinov uchun):** Lokal frontend → Render backend
- Vite dev server'ni ishga tushiring: `cd jadvalpro && npm run dev`
- Brauzerda ochib Zavuch sifatida kirib **Sozlamalar** → "Bulut sinxronizatsiya" kartasida:
  - Server URL: `https://jadvalpro-api.onrender.com` yozing
  - "Saqlash" → yashil "Ulandi" chip chiqishi kerak
  - "Ro'yxatdan o'tish" → login/parol/maktab nomi → tizimga kiring
  - "Bulutga saqlash" tugmasi bilan loyihani bulutga yuboring

**Variant B (production):** Frontend'ni ham deploy qilish
- Vercel/Netlify/Cloudflare Pages — har qaysi bepul tier mos keladi
- Build command: `npm run build`
- Output dir: `dist`
- Environment variable: `VITE_API_URL=https://jadvalpro-api.onrender.com`

---

## Muhim eslatmalar

### Bepul tier cheklovlari

- **Web service**: 15 daqiqa harakatsiz bo'lsa uxlab qoladi. Keyingi so'rov **~30-50 soniya** kutadi (cold start). Doimo uyg'oq turish uchun oyiga $7 kerak.
- **PostgreSQL**: 1GB disk, **90 kundan keyin baza suspend qilinadi**. Zaxira olib (`pg_dump`), qayta yarating. Doimiy baza uchun oyiga $7.

### CORS

Agar frontend boshqa domenda bo'lsa (`vercel.app`, `netlify.app` yoki o'z domeningiz), uni `CORS_ORIGINS` yoki `CORS_ORIGIN_REGEX` env'ga qo'shing (Dashboard → Environment).

### Birinchi admin parolini o'zgartirish

Deploy'dan keyin darhol admin bilan kirib parolni o'zgartiring (`/api/auth/change-password`), yoki Render dashboard'da `OWNER_PASSWORD` ni o'zgartiring (restart kerak bo'ladi).

### Logs

Render dashboard → `jadvalpro-api` → **"Logs"** tab. Deploy logi + runtime logi real vaqtda ko'rinadi.

### Zaxira

Render dashboard → `jadvalpro-db` → **"Backups"** tab. Bepul tier'da avtomatik kunlik backup. Qo'lda `pg_dump` qilish uchun ulanish satrini oling.

### Avto-deploy

`render.yaml`'da `autoDeploy: true` — har `git push origin main`'dan keyin Render avtomatik qayta deploy qiladi (~2-3 daqiqa).

---

## Troubleshooting

**"Build failed: psycopg2"**
Dockerfile'da `libpq-dev` bor — bu bo'lishi mumkin emas. Logga qarang.

**"Internal Server Error" health endpointda**
DATABASE_URL noto'g'ri ulangan. Render dashboard → `jadvalpro-api` → **"Environment"** → DATABASE_URL `${{jadvalpro-db.connectionString}}` ga teng bo'lishi kerak.

**"Login or password incorrect"**
`OWNER_PASSWORD` env noto'g'ri. Dashboard → Environment → yangilang → Service'ni restart qiling.

**CORS error brauzer console'da**
Frontend domenni `CORS_ORIGINS` ga qo'shing. Masalan `https://my-app.vercel.app` → verguldan keyin yozing.

**Service dastlabki yuklanishida secundlar sayin uxlaydi (cold start)**
Bu bepul tier xususiyati. Agar muhim bo'lsa:
- UptimeRobot (bepul) orqali har 10 daqiqa `/health`'ga ping yuborib uxlashga yo'l qo'ymang
- Yoki Starter planga ($7/oy) o'tingiz

---

## Backend o'chirish/qayta yaratish

Dashboard → `jadvalpro-api` → **"Settings"** → **"Delete Service"**. Baza alohida, uni ham o'chirmasangiz saqlanib qoladi.
