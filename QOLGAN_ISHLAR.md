# JadvalPro — Qolgan ishlar ro'yxati

> Holat: 2026-10-05 (12-sessiya). ProRector 2026 ga nisbatan parity auditi asosida.
> Belgilar: ⭐ muhim · ◐ o'rta · ○ past | Hajm: S kichik · M o'rta · L katta

Asosiy funksional bo'limlar **tayyor** (ro'yxatlar, jadval tuzish+yaxshilash, 2-haftalik, almashtirish, hisobotlar, import, chop-kartochka, Ro'yxatlar oynasi, o'qituvchi ranglari, Tauri HWID, binolar, va h.k.). Quyida — **hali qilinmagan** narsalar.

## ✅ 12-sessiyada bajarildi (2026-10-05) — build toza (TSC: 0, Vite build: 24.35s)
Jadval tuzish engine'ida 4 ta jiddiy kamchilik topildi va tuzatildi:
- ⭐ **Teacher `dailyCapacity` qat'iy tekshiriladi** — `canPlace`'da yangi `teacherDayCount` map orqali o'qituvchining shu kundagi joriy soatini + joylashtirilayotgan session uzunligini `dailyCapacity`'ga solishtiriladi. Avval umuman tekshirilmasdi — o'qituvchiga kuniga 10+ dars kelishi mumkin edi.
- ⭐ **Teacher `weeklyMax` qat'iy tekshiriladi** — yangi `teacherWeekCount` map; o'qituvchining jami haftalik soatlari `weeklyMax`'dan oshmaydi. Avval tekshirilmaydi edi.
- ⭐ **Lesson `maxPerDay` qat'iy tekshiriladi** — yangi `classLessonDayCount` map (`classId:day:lessonId`); bir sinfga bir dars kuniga max N marta qo'yiladi. Avval faqat soft penalty bor edi (spreadDays).
- ⭐ **Lesson `pinned[]` qat'iy hurmat qilinadi** — greedy loop'dan avval pinned sessiyalar o'z slot'lariga joylashtiriladi, `_pinned` marker bilan belgilanadi, keyin tegilmaydi. Chiqishda `locked: true` bilan ko'rinadi.
- ◐ **`improveTimetable` yangilandi** — `free()` endi dailyCapacity + maxPerDay'ni ham tekshiradi (swap qilganda buzilmasligi uchun).
- ⭐ `Session` tipiga `maxPerDay` maydoni qo'shildi.
- ⭐ Runtime stress-test (5 restart, demo loyiha, 80ms):
  ```
  placed=95/100, hard=0, soft=0
  ✓ metodik kun · ✓ kunlik sig'im · ✓ haftalik norma · ✓ maxPerDay
  ```

## ✅ 11-sessiyada bajarildi (2026-10-05) — build toza (TSC: 0, Vite build: 27.77s)
Avvalgi sessiyada aniqlangan 3 ta muhim kamchilikni yopdim:
- ⭐ **Dead litsenziya kod tozalandi** — `activate`, `demoActivate`, `deactivate`, `licenseValid`, `recheckLicense`, `generateLicense` auth store'dan o'chirildi. `license`, `licenseError`, `demoPublicJwk` state'dan olib tashlandi. `verifyWithAny` helper, `addMonthsClamped` yordamchi, `makeLicenseKey`, `verifyLicenseKey`, `LicensePayload` interface, `strToB64url`, `b64urlToStr`, `SIGN_ALGO`, `importPriv`/`importPub` crypto'dan o'chirildi. `planLimit` → `() => null` (hech qanday cheklov). Migrate'da eski maydonlar tashlab yuboriladi.
- ⭐ **Admin paroli tiklash tizimi (end-to-end tekshirildi)** — yangi `ownerKeysEncByRecovery` state (maxfiy kalit tiklash kodi bilan ikkinchi marta shifrlangan). Yangi metodlar: `genOwnerRecoveryCode(password)` (joriy parolni tasdiqlab, `JP-XXXX-XXXX-XXXX` qaytaradi) va `ownerRecoverWithCode(code, newLogin, newPassword)` (parol unutilsa). UI: `OwnerPanel`'da `OwnerRecoveryCard` (parol tasdiq + "Yaratish" + bir marta ko'rsatish + Nusxa olish/Saqlab oldim), `OwnerLoginModal`'da "Parolni unutdingizmi?" link + `OwnerRecoveryModal` (kod + yangi login/parol). Runtime test: setup→code→logout→recover→login — ishlaydi.
- ⭐ **Mobil ko'rinish polish** — `StatusBar` endi responsive: mobil (<640px) faqat Zoom + Til ko'radi; tablet (sm+) + Mavzu; desktop (md+) + Eni/Bo'yi + Accent; keng (lg+) + checkboxlar. Overflow-x-auto telefon uchun. Mobilda chiroyli, desktop ham to'liq ishlaydi.

## ✅ 10-sessiyada bajarildi (2026-10-05) — build toza (TSC: 0, Vite build: 24.12s)
Jadval tuzish sifati va ma'lumot saqlash ishonchliligini oshirish:
- ⭐ **Multi-start generator** (`generate.ts`) — `restarts` opsiyasi (1-10, standart 3). Har urinishda yangi seed, eng yaxshisi (unplaced + hardViolations + softPenalty bo'yicha) saqlanadi. Mukammal natija (unplaced=0, hard=0) topilsa — darhol qaytariladi (early-exit). Qiyin loyihalarda ko'proq urinish → yaxshiroq jadval.
- ⭐ **GenerationOptionsDialog**'ga **Urinishlar soni** slayderi (1-10) + hint matn ("Ko'proq urinish — yaxshiroq natija, lekin sekinroq").
- ⭐ **Avtomatik rezerv nusxa har 10 daqiqada** — `AuthGate`'da fon rejimida `setInterval`, foydalanuvchi ko'rmaydi, teacher/student/guestga tegmaydi. IndexedDB 12 slot ichiga yoziladi.
- ⭐ **TopBar'da oxirgi saqlash ko'rsatkichi** — `savedAt` meta'dan hisoblanadi, 30s'da yangilanadi. `dirty` bo'lsa sariq "saqlanmagan" chip; aks holda yashil "hozirgina / N daqiqa oldin / N soat oldin / N kun oldin".
- ⭐ **ExportPage'da Ma'lumot xavfsizligi bloki** — sariq warning: "Barcha ma'lumot faqat shu qurilmada saqlanadi, bulut yo'q" + 3 ta maslahat (har kuni fayl yuklash, avto-backup har 10 daqiqa, qurilmani almashtirganda tiklash).

## ✅ 9-sessiyada bajarildi (2026-10-05) — build toza (TSC: 0, Vite build: 24.20s)
ProRector 2026 ro'yxatlar oynasi rasmidan taqqoslash — ikkinchi iteratsiya:
- ⭐ **AvailabilityBar komponenti** (`src/components/AvailabilityBar.tsx`) — ProRector 2026 uslubidagi gorizontal SVG strip: har kun uchun yashil (ishlaydi) / qizil (yo'q) segmentlar, tooltip, "on/total" matn. 4 ta CRUD ro'yxatida (Sinflar/Fanlar/Xonalar/O'qituvchilar) ulanadi.
- ⭐ **ListsPage qayta tuzildi** — endi ProRector 2026'dagi "Ro'yxatlar" modali kabi **chap vertikal tab'lar** (katta ikonalar + label). Avval yuqoridan tab'lar edi.
- ⭐ **Table klaviatura navigatsiyasi** — Up/Down (tanlash), Enter (tahrirlash), Space (multi-tanlash), Home/End (birinchi/oxirgi). Focus ring: outline-none focus:ring-2 ring-accent/30.

ProRector 2026 bilan taqqoslov natijalari (rasmdan):
- ✅ Chap vertikal tab'lar katta ikonalar bilan — qo'shildi
- ✅ Yuklama ustuni (classLoad) — bor
- ✅ Qisqacha ustuni — bor
- ✅ Bino ustuni — bor
- ✅ Ish vaqti vizual bar — qo'shildi
- ✅ Yangi/Tahrirlash/Nusxa/O'chirish/Yuqoriga/Pastga — CrudModule da bor
- ✅ Export (Excel+PDF) — bor
- ✅ Qidirish (search box) — har CRUD'da bor
- ✅ Pastki "Jami: N ta" + umumiy yuklama — bor
- ✅ Row aktivatsiyasi: double-click + Enter + double-tap

## ✅ 8-sessiyada bajarildi (2026-10-05) — build toza (TSC: 0, Vite build: 27.09s)
**Litsenziya kaliti va demo rejim butunlay olib tashlandi** — endi dastur sof login+parol asosida ishlaydi:
- ⭐ **ActivationScreen o'chirildi** — `AuthGate` endi litsenziya tekshirmaydi, ChooseRole → to'g'ridan-to'g'ri login/parol ekrani.
- ⭐ **Demo rejim** (`demoActivate` tugma + logika) UI dan olib tashlandi.
- ⭐ **Faollashtirish kaliti** maydoni, Maxsus kod ko'rsatuvchi UI va ECDSA litsenziya tekshiruvi auth oqimidan chiqarildi (store'da funksiyalar backward-compat uchun qoldi).
- ⭐ **StaffLoginScreen (Zavuch birinchi kirish)** — ko'k xabar: _"Admin (dastur sotuvchisi) sizga Telegramda yuborgan login va parolni shu yerga kiriting"_ + ContactAdmin compact "Login/parol olmagan bo'lsangiz — Adminga yozing / telefon".
- ⭐ **"Hisob yaratish" → "Hisobni ro'yxatdan o'tkazish"** label o'zgardi (admin bergan kreditlarni ro'yxatdan o'tkazish ma'nosida).
- ⭐ **OwnerPanel qayta tuzildi** — endi "Mijoz hisoblari" tracker:
  - Yangi `addCustomer(opts)` va `updateCustomer(id, patch)` store metodlari (hech qanday crypto imzolash yo'q, faqat lokal eslatma).
  - `SchoolRecord`'ga `login`, `password`, `notes` optional maydonlari qo'shildi.
  - Mijoz kartasida ko'rsatiladi: Login, Parol (yashirin, 👁 tugmasi bilan ochiladi), telefon, tarif, eslatma.
  - Har mijoz uchun **"Yuborish"** (ko'k Telegram) tugmasi — login+parol xabarini avto-nusxalaydi va Telegramni ochadi.
  - "Yangi mijoz qo'shish" modali: maktab nomi, direktor, telefon, login, parol (🎲 random generator), tarif, eslatma.
  - "Shu qurilma Maxsus kodi" kartochkasi olib tashlandi (endi kerak emas).
  - Statistikalar: Jami mijozlar / Faol / Bloklangan (muddat tugash statistikasi yo'q).
- ⭐ **LicenseInfoPage → "Dastur ma'lumoti"** — litsenziya haqida emas, foydalanuvchi rol/login + qurilma kodi + admin aloqa.
- ⭐ Sidebar panel label "Litsenziya" → "Dastur ma'lumoti".
- ⭐ WelcomeLauncher tile label mos ravishda yangilandi.

## ✅ 7-sessiyada bajarildi (2026-10-05) — build toza (TSC: 0, Vite build: 24.36s)
Mijoz dasturni Telegramda admin bilan bog'lanib sotib olishi kerakligi bo'yicha oqim to'liq jonlashtirildi:
- ⭐ **ContactAdmin reusable komponenti** (`components/ContactAdmin.tsx`) — 3 variant: default/buy/compact. Telegram tugmasi + telefon raqami + xabar avtomatik nusxalanishi.
- ⭐ **Landing navbar'da "Sotib olish" tugmasi** (ko'k Telegram rangli) — adminga Maxsus kod bilan xabar yuboradi.
- ⭐ **Landing CTA pastida "Sotib olish"** tugmasi + "Narx va to'lov tartibini admin Telegramda yuboradi" hint.
- ⭐ **ChooseRole ekranida "Dasturni sotib olishni istaysizmi?"** bloki — ko'k Telegram tugmasi bilan.
- ⭐ **ActivationScreen qayta formatlandi** — katta Telegram tugmasi + telefon + **"💳 To'lov qanday amalga oshiriladi?"** 4-bosqich ko'rsatma: (1) adminga yozish → (2) to'lov rekvizit → (3) kalit olish → (4) faollashtirish.
- ⭐ **StaffLoginScreen (zavuch/o'tibdo)** — ContactAdmin default varianti qo'shildi (parol/login unutilganda).
- ⭐ **AccountLoginScreen (teacher/student)** — ContactAdmin compact varianti qo'shildi.
- ⭐ **TopBar'da floating "Adminga yozish" tugmasi** — ownerContact.telegram sozlangan va foydalanuvchi owner emas bo'lsa, barcha ekranlarda ko'rinadi.
- ⭐ **OwnerPanel aloqa kartasi kuchaytirildi** — telegram sozlanmagan bo'lsa warning + sariq border, "mijozlar sotib ola olmaydi" ogohlantirishi.
- ⭐ i18n: 240+ → 260+ entry (sotib olish/adminga yozish/narx-tarif).

## ✅ 6-sessiyada bajarildi (2026-10-05)
- ⭐ **Konfliktlar sahifasi i18n** (UZ/RU/EN) + yangi "binolararo o'tish" ogohlantirishi.
- ⭐ **Portal (o'qituvchi/o'quvchi)** sahifalari i18n'ga ulandi.
- ⭐ **O'quv reja (CurriculumPage)** i18n'ga ulandi + **birlashgan ko'p-sinfli darslar alohida bo'limda ko'rsatiladi** (soat tahrirlash + o'chirish; asosiy gridda belgisi).
- ⭐ **Mavzu nomlari** lokalizatsiyasi (`JadvalPro (asosiy)`, "Qorong'i" → RU/EN).
- ⭐ **Doimiy Undo/Redo tarixi** — TimetableBoard'da localStorage'ga yoziladi (`jadvalpro-history-<workingId>`), sahifa yangilanganda ham saqlanadi.
- ⭐ **Binolar (korpuslar) ro'yxati + binolararo o'tish vaqti** — School.buildings[] (Building{id,name,short,transitTo:{otherId:min}}). SchoolPage'da yangi karta: bino qo'shish/o'chirish, transit vaqtlar matritsasi. ClassesPage/RoomsPage'da bino tanlash dropdown'ga aylandi (binolar mavjud bo'lsa). ConflictsPage'da o'qituvchining ketma-ket darslarida bino almashishi va tanaffus < transit vaqt bo'lsa ogohlantirish.
- ⭐ i18n: 200+ → 240+ entry.

## ✅ 5-sessiyada bajarildi (2026-10-05) — build toza (TSC: 0, Vite build: OK)
- ⭐ **Mustahkam Taqsimot importi** — har qanday chalkash Excel layoutini o'qiydi: 2-qatorli (merged) sarlavha "5-sinflar/6-sinflar + A/B/V", rus "5 класс", ingliz "Grade 5", bare raqamlar; surat/maxraj (0,5 soat / "3/2" / "2 soat" / "3ч"); sinf nomlarini kanonlashtirish ("5 A", "5А", "5a" → "5-A"); o'qituvchi+fan forward-fill (merged kataklar); "Jami/Umumiy/Итого" qatorlarini **har qanday ustunda** o'tkazib yuborish; multi-sheet fayldan **eng mos varaqni avtomatik tanlash**; takrorlangan teacher+subject+class kombinatsiyalari **soat summaga** qo'shiladi. Barcha 10+ edge case brauzerda ishlatib tekshirildi.
- ⭐ **Formatlangan Excel** — ExcelJS bilan chegara, fan rangi, birlashgan kun kataklari, muzlagan sarlavha (`io/excelStyled.ts`). Tarifikatsiya ham formatli chiqadi.
- ⭐ **Word (.docx) eksport** — `docx` kutubxonasi (`io/word.ts`), ExportPage+TimetableViewer'ga ulandi.
- ⭐ **PNG eksport** — html2canvas (`io/png.ts`), inline-styled jadval, ExportPage'ga ulandi.
- ⭐ **i18n chuqur tarjima** — ~50 → 200+ entry (RU/EN): Sozlamalar, Eksport, Auth, Maktab, Hisobotlar, Generatsiya dialogi, Taxta, Toast, Login.
- ⭐ **Tarif cheklovi funksional** — license payloadda `maxClasses`/`maxTeachers`, ClassesPage/TeachersPage'da `guardedAdd` cheklovni tekshiradi va toast beradi.
- ⭐ **Audit/faollik jurnali** — 200 entry, barcha auth harakatlari (login, chiqish, hisob yaratish/o'chirish, parol tiklash, aktivatsiya) `useAuth.audit`'ga yoziladi; OwnerPanel'da `AuditLogCard`.
- ⭐ **Alohida ro'yxat importi** — `io/importLists.ts`: o'qituvchi/sinf/xonani Exceldan avtomatik ustun aniqlash bilan import. 3 ta sahifada "Import" tugmasi.
- ⭐ **Rezerv nusxa tizimi** — `io/backup.ts` (IndexedDB, 12 slot), ExportPage'da BackupPanel; har saqlashda va yangi loyiha ochishdan oldin avto-backup.
- ⭐ **Har navbat uchun qo'ng'iroq jadvali** — SchoolPage'da smena-boshi vaqt + "Qo'ng'iroqni to'ldirish". Dars/tanaffus/katta tanaffus davomiyligi UI'da sozlanadi.
- ⭐ **Maktab logotipi** — SchoolPage'da yuklash/o'zgartirish/olib tashlash; chop-kartochkada va PDF rekvizitida ko'rinadi.
- ⭐ **Sessiya davomida litsenziya qayta tekshirish** — `setInterval(2min)` + focus/visibilitychange eventlari (`AuthGate`).
- ⭐ **Yumshoq cheklov og'irligi** — `gapWeight/spreadWeight/morningWeight` (0-10) GenerationOptionsDialog'da sliderlar.
- ⭐ **Seed maydoni** — generatsiya dialogida seed input; natijani takrorlash uchun TimetableVersion'da saqlanadi; DistributionPage statusbarda chip.
- ⭐ **Taxtada "Bo'sh varaq"** — joriy jadvalni nomli nusxa qilib saqlab, yangi bo'sh varaq ochish.
- ⭐ **Katak o'ng-menyusiga qulflash qo'shildi** — tahrirlash modal'ida qulflash/olib tashlash va o'chirish tugmalari.
- ⭐ **TSC: 0 xato, production build muvaffaqiyatli** (2028 modul, 24.77s).

## ✅ 4-sessiyada bajarildi (2026-10-04) — build toza, brauzerda tekshirildi
- ⭐ **Haqiqiy PDF** — jsPDF + autotable, PT Sans shrifti embed qilingan (o'zbek lotin + rus kirill 100% to'g'ri). `io/pdf.ts`: jadval PDF (sinf/o'qituvchi/xona gridlari, rekvizit+imzo), ro'yxatlar PDF. ExportPage + TimetableViewer'ga ulandi. Shriftlar alohida lazy chunk (bundle shishmadi).
- ⭐ **Parolni tiklash** — Zavuch/O'TIBDO' uchun **tiklash kodi** (`JP-XXXX-XXXX-XXXX`, PBKDF2 hash saqlanadi). «Hisob»da kod yaratish, login oynasida «Parolni unutdingizmi?» → kod + yangi parol → avtologin. O'qituvchi/o'quvchi hisoblariga ham **parol reset** tugmasi qo'shildi (`auth.ts`).
- ○ **CSV eksport** — `io/csv.ts` (UTF-8 BOM). Jadval (sinflar gridi) CSV; ExportPage'da karta.
- ◐ **hardViolations** endi haqiqatan hisoblanadi (`compute.countHardViolations` — sinf/o'qituvchi/xona to'qnashuvlari; birlashgan sinf va surat/maxraj hisobga olinadi). Generate/improve/board/master'ga ulandi.
- ◐ **To'xtatishda best-so-far** — engine snapshot chiqaradi, `useGenerator` oxirgisini saqlaydi, «To'xtatish» bosilganda joriy natija saqlanadi.
- ◐ **O'lik opsiyalar olib tashlandi** — `algorithm` (eski/yangi) va `parallelAware` GenerationOptionsDialog'dan va `GenerateOptions` tipidan olib tashlandi.

---

## 1. Til (i18n) — chuqur tarjima
Hozir tarjima qilingan: chrome, CRUD, Dashboard, Sozlamalar, Eksport, Auth, Maktab, Hisobotlar, Generatsiya dialogi, Taxta, Toast, Login, **Konfliktlar, Portal, O'quv reja, mavzu nomlari** (6-sessiyada +40 entry = 240+). Qolgani:
- ○ M — Egasi paneli / Litsenziya / Hisob ichki matnlari (hozir chrome qismi tarjima qilingan, inner forma matnlari qolgan)
- ○ M — i18n arxitekturasi: namespace'larga ajratish (hozir bitta yassi lug'at); sana/raqam lokalizatsiyasi

## 2. Eksport / chop etish — **TO'LIQ TAYYOR**
- ✅ ~~⭐ Haqiqiy PDF~~ — **BAJARILDI** (jsPDF + autotable + PT Sans embed)
- ✅ ~~○ CSV eksport~~ — **BAJARILDI** (io/csv.ts)
- ✅ ~~○ Word (.docx) eksport~~ — **BAJARILDI** (io/word.ts)
- ✅ ~~○ PNG eksport~~ — **BAJARILDI** (io/png.ts, html2canvas)
- ✅ ~~◐ Formatlangan Excel~~ — **BAJARILDI** (io/excelStyled.ts, ExcelJS)
- ✅ ~~◐ Tarifikatsiya Excelga~~ — **BAJARILDI** (exportTariffToExcel)

## 3. Jadval tuzish / cheklovlar — **TAYYOR**
- ✅ ~~○ Seed maydoni~~ — **BAJARILDI** (dialogda input, versiyada saqlanadi)
- ✅ ~~◐ Yumshoq cheklov og'irligi~~ — **BAJARILDI** (gap/spread/morning sliderlari)
- ✅ ~~◐ O'lik opsiyalar~~ — **OLIB TASHLANDI**
- ✅ ~~◐ hardViolations~~ — **BAJARILDI**
- ✅ ~~◐ To'xtatishda best-so-far~~ — **BAJARILDI**

## 4. Maktab sozlamalari
- ✅ ~~◐ Har smena uchun qo'ng'iroq jadvali~~ — **BAJARILDI** (smena-boshi + "to'ldirish")
- ✅ ~~◐ Dars/tanaffus/katta tanaffus~~ — **BAJARILDI** (UI'da sozlanadi)
- ✅ ~~○ Maktab logotipi~~ — **BAJARILDI** (SchoolPage'da yuklash)
- ✅ ~~○ Binolar (korpus) ro'yxati + binolararo o'tish~~ — **BAJARILDI** (School.buildings, transit matritsa, ConflictsPage ogohlantirishi)
- ○ L — **O'quv choraklari/semestrlar**; surat/maxraj (2-hafta) rejimini maktab darajasida yoqish

## 5. Taxta / asboblar paneli
- ✅ ~~○ Vertikal ikonali toolbar~~ — **ALLAQACHON TAYYOR** (Sidebar.tsx vertikal flex-col, backlog eskirgan edi)
- ✅ ~~○ "Bo'sh varaq" tugmasi~~ — **BAJARILDI**
- ✅ ~~○ Undo/Redo doimiy saqlash~~ — **BAJARILDI** (localStorage'ga yoziladi)
- ✅ ~~○ Katak o'ng-menyusi (qulflash)~~ — **BAJARILDI** (tahrirlash modal'ida qulflash + o'chirish)

## 6. Birlashgan (qo'shma) sinflar
- ✅ ~~○ O'quv reja gridida birlashgan ko'p-sinfli darslar~~ — **BAJARILDI** (alohida bo'lim: ko'rsatish + soat tahrirlash + o'chirish; asosiy katakda belgisi)

## 7. Foydalanuvchilar / litsenziya / xavfsizlik — **TAYYOR**
- ✅ ~~⭐ Parolni tiklash~~ — **BAJARILDI**
- ◐ L — **Litsenziya bekor qilish (revocation)** mijozda kuchga kirishi — *offline model cheklovi, server kerak*
- ✅ ~~○ Sessiya davomida qayta tekshirish~~ — **BAJARILDI** (2 daqiqalik interval + focus/visibility)
- ✅ ~~○ Tarif darajalari funksional cheklov~~ — **BAJARILDI** (maxClasses/maxTeachers UI'da ishlaydi)
- ○ M — **Ko'p direktor** qo'llab-quvvatlash (hozir bitta)
- ✅ ~~○ Audit/faollik jurnali~~ — **BAJARILDI** (200 entry, OwnerPanel'da)

## 8. Ma'lumot / zaxira — **TAYYOR**
- ✅ ~~◐ Avtomatik rezerv nusxa + tiklash~~ — **BAJARILDI** (12 slot IndexedDB, BackupPanel)
- ✅ ~~○ Alohida ro'yxat importi~~ — **BAJARILDI** (io/importLists.ts, 3 sahifada tugma)
- ✅ ~~⭐ Taqsimot importi mustahkam~~ — **BAJARILDI** (merged header, kasrlar, "5А"/"5-A" normallash, forward-fill, "Jami" filtr har qanday ustunda, multi-sheet avto-tanlash, takrorlangan satrlar summaga)

---

## Eslatma: Windows `.exe`
Tauri scaffolding va HWID tayyor, lekin `.exe` **faqat Rust o'rnatilgan kompyuterda** yig'iladi:
```
npm install
npm run tauri build
```
Tafsilot: `src-tauri/README.md`.

> **Keyingi tavsiya (5-sessiya):** ikkala ⭐ bajarildi. Qolganidan eng foydalilari — ◐ chuqur i18n (Sozlamalar + toast + dialoglar), ◐ avtomatik rezerv nusxa (backup), ◐ per-navbat qo'ng'iroq jadvali, ◐ formatlangan Excel. Istasangiz shulardan davom ettiraman.
