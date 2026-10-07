# JadvalPro — test hisoblari

> Dastur **litsenziya tizimisiz** ishlaydi — login+parol yetarli.
> Login/parolni dastur sotuvchisi (Admin) Telegram orqali mijozga yuboradi.

## 📋 Hozirgi test hisoblari

Brauzer preview (localhost:5173) uchun avtomatik yaratilgan hisoblar:

### 👑 Admin (Egasi — dastur sotuvchisi)

| Login | Parol | Tiklash kodi |
|---|---|---|
| `admin` | `admin2026` | `JP-89AY-D7U5-9QR7` |

**Admin nima qiladi:**
- Yangi mijozlar (maktablar) uchun login/parol yaratadi
- Mijoz ro'yxatini saqlaydi (kim nima to'lagan, qanday login berilgan)
- O'z aloqa (Telegram) ma'lumotini sozlaydi — mijozlar bog'lanish uchun
- Tiklash kodini saqlab qo'yadi — parol unutilsa yordam beradi

### 🎓 Zavuch (direktor o'rinbosari)

| Login | Parol |
|---|---|
| `zavuch` | `zavuch2026` |

**Zavuch nima qiladi:**
- Maktab ma'lumotlari (sinflar, fanlar, xonalar, o'qituvchilar)
- Taqsimot (o'quv reja)
- Dars jadvalini tuzish (avtomatik yoki qo'lda)
- O'qituvchilar va o'quvchilar hisoblarini yaratish
- Konfliktlarni ko'rish, almashtirish, hisobotlar

### 🧑‍💼 O'TIBDO' (o'quv ishlari bo'yicha direktor o'rinbosari)

| Login | Parol |
|---|---|
| `otibdo` | `otibdo2026` |

### 🎓 O'qituvchilar

| Login | Parol | Bog'langan o'qituvchi |
|---|---|---|
| `teacher1` | `teacher2026` | Aliyev Vali Akramovich |
| `teacher2` | `teacher2026` | Soliyeva Dilnoza Akmalovna |
| `teacher3` | `teacher2026` | Rahimov Jasur Shavkatovich |

O'qituvchi tizimga kirsa — faqat **o'z dars jadvalini** ko'radi.

### 👩‍🎓 O'quvchilar (sinf hisoblari)

| Login | Parol | Bog'langan sinf |
|---|---|---|
| `class1` | `student2026` | 5-A |
| `class2` | `student2026` | 5-B |
| `class3` | `student2026` | 6-A |

Har sinf uchun bitta login — sinfdagi hamma o'quvchi shu login bilan kiradi, **o'z sinfining jadvalini** ko'radi.

### 📱 Admin aloqa (sozlangan)

Landing sahifasida va login ekranlarida ko'rinadigan admin kontakti:

- **Telegram**: `@jadvalpro_admin`
- **Telefon**: `+998 90 123 45 67`

## 🚀 Qanday ishlatish

### Dasturni ishlatuvchi (haqiqiy mijoz) oqimi:

1. **Mijoz dasturni oladi** → Landing sahifasida "Sotib olish" tugmasi
2. **Admin bilan Telegramda bog'lanadi** → to'lov qiladi
3. **Admin login+parol yaratadi** (OwnerPanel'da «Yangi mijoz» tugmasi) va Telegramda yuboradi
4. **Mijoz dastur ichida Zavuch kirishi** → «Birinchi kirish» oynasiga admin bergan login/parolni kiritadi
5. **Boshlab ishlaydi**

### Admin uchun ko'rsatma:

1. Landing → **«Egasi kirishi»** → `admin` / `admin2026`
2. OwnerPanel'da:
   - **Aloqa ma'lumotlari** — Telegram username'ingizni sozlang
   - **Admin tiklash kodi** — HOZIR yarating va qog'ozga yozib qo'ying (parol unutilsa!)
   - **Yangi mijoz** — har mijoz uchun login+parol yarating, 🎲 random generator bor
   - Mijoz kartasidagi **«Yuborish»** tugmasi — login+parolni Telegramga avto-nusxalaydi

## 🔄 Hammasini noldan boshlash (reset)

Brauzerda:
1. **F12** (DevTools) → **Application** → **Storage** → **Clear site data**
2. Sahifani yangilash (F5)
3. Birinchi kirish — Admin hisobini yaratasiz

Yoki tezroq (brauzer konsoli):
```js
Object.keys(localStorage).filter(k => k.startsWith('jadvalpro')).forEach(k => localStorage.removeItem(k));
indexedDB.deleteDatabase('jadvalpro-storage');
location.reload();
```

## 🔒 Xavfsizlik eslatmasi

- Parollar **PBKDF2-SHA256** bilan hash qilinadi (150 000 iteratsiya)
- Admin maxfiy kaliti **AES-GCM** bilan parol asosida shifrlanadi
- Admin tiklash kodi (`JP-XXXX-XXXX-XXXX`) ham shu kalitni ikkinchi marta shifrlaydi — parol unutilsa yordam beradi
- **Brute-force himoyasi**: 5 noto'g'ri urinishdan keyin 30 soniya lock
- Hamma ma'lumot **mahalliy IndexedDB**'da (bulut yo'q)

> ⚠️ **Diqqat:** Bu test hisoblari — ishlab chiqish va demo uchun.
> Mijozlarga berishdan oldin O'ZINGIZ yangi admin paroli va tiklash kodini yarating!
