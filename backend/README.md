# JadvalPro Backend (FastAPI + SQLite)

Maktab dars jadvali uchun REST API server. Mijoz boshqaruvi, auth, maktab ma'lumotlari CRUD, bulutga sinxronizatsiya va server tarafda jadval tuzish.

## Tez boshlash

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # yoki Windows'da: copy .env.example .env

python run.py
```

Server `http://localhost:8000` da ochiladi.

- Swagger (interaktiv docs): http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json
- Sog'liq: http://localhost:8000/health

Birinchi ishga tushishda `admin` / `admin123` (yoki `.env` dagi `OWNER_LOGIN`/`OWNER_PASSWORD`) hisobi avtomatik yaratiladi. **Birinchi login'dan keyin paroli o'zgartiring.**

## Asosiy endpointlar

### Auth
- `POST /api/auth/login-json` — `{login, password}` → JWT token
- `POST /api/auth/register` — yangi direktor + maktab yaratish
- `GET /api/auth/me` — joriy foydalanuvchi
- `POST /api/auth/change-password` — parolni o'zgartirish

### Admin (owner uchun)
- `GET/POST/PUT/DELETE /api/customers` — mijoz hisoblari CRUD

### Maktab ma'lumotlari (direktor/o'tibdo')
- `GET/PUT /api/schools/mine` — o'z maktabi
- `GET/POST/PUT/DELETE /api/classes` — sinflar
- `GET/POST/PUT/DELETE /api/subjects` — fanlar
- `GET/POST/PUT/DELETE /api/teachers` — o'qituvchilar
- `GET/POST/PUT/DELETE /api/rooms` — xonalar
- `GET/POST/PUT/DELETE /api/buildings` — binolar
- `GET/POST/PUT/DELETE /api/lessons` — darslar
- `GET/POST/PUT/DELETE /api/timetables` — jadvallar

### Bulutga sinxronizatsiya
- `GET /api/sync/snapshots` — barcha backuplar ro'yxati
- `POST /api/sync/snapshots` — yangi backup yuklash (JSON body: `{label, data}`)
- `GET /api/sync/snapshots/{id}/raw` — backup JSON blob
- `DELETE /api/sync/snapshots/{id}` — o'chirish

### Server tarafda jadval tuzish
- `POST /api/generator/start` — background task boshlash
- `GET /api/generator/jobs/{id}` — holat (progress 0-100)
- `POST /api/generator/jobs/{id}/cancel` — to'xtatish
- `GET /api/generator/jobs` — oxirgi 50 ish

## Autentifikatsiya

Barcha himoyalangan endpointlar `Authorization: Bearer <token>` headerini talab qiladi. Tokenni `/api/auth/login-json` dan oling.

## Baza

Standart: `sqlite:///./jadvalpro.db` (bir fayl). PostgreSQL ga ko'chirish uchun `.env` da:

```
DATABASE_URL=postgresql+psycopg2://user:pass@localhost/jadvalpro
```

PostgreSQL uchun `pip install psycopg2-binary` qo'shing.

## Frontend bilan ulanish

Frontend (`jadvalpro/`) `.env.local` ga qo'shing:

```
VITE_API_URL=http://localhost:8000
```

Sozlamalar → "Bulut sinxronizatsiya" kartasidan server URL ni kiriting, login/parol bilan tizimga kiring.

## Testlar

```bash
.venv/Scripts/python -m pytest tests/ -q
```

12 ta integratsiya test (auth, customers, entities, sync, generator) alohida sinov SQLite DB da ishlaydi.

## Deployment

Production uchun:
- `DEBUG=false`
- `SECRET_KEY` — uzun tasodifiy satr (`python -c "import secrets; print(secrets.token_urlsafe(64))"`)
- `OWNER_PASSWORD` — kuchli parol
- HTTPS orqasiga qo'ying (nginx/caddy/traefik)
- PostgreSQL ishlating
- `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`

Docker uchun minimal `Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
