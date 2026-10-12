// ============================================================
// AI yordamchi — bilimlar bazasi (Knowledge Base).
// Offline fallback — parser tushunmasa, shu yerdan javob izlaydi.
// Har yozuv: kalit so'zlar, savol va javob (o'zbek tilida).
// Fuzzy matching orqali mos yozuvni topadi.
// ============================================================

export interface KBEntry {
  id: string
  keywords: string[]
  question: string
  answer: string
  category: 'usage' | 'schedule' | 'troubleshoot' | 'feature' | 'general' | 'concept'
}

export const KNOWLEDGE_BASE: KBEntry[] = [
  // ============ SINF QO'SHISH ============
  {
    id: 'add-class',
    keywords: ['sinf', 'qoshish', "qo'shish", 'class', 'yangi sinf', 'sinf yaratish', 'klass'],
    question: "Sinf qanday qo'shiladi?",
    answer: "Sinflar bo'limiga o'ting va \"+\" tugmasini bosing. Sinf nomini kiriting (masalan \"5-A\"). Shuningdek, menga \"5-A sinf qo'sh\" deb yozing — men o'zim qo'shaman. Ko'p sinf kerak bo'lsa \"1-dan 11-gacha A va B sinflar yarat\" deb buyruq bering.",
    category: 'usage',
  },
  // ============ O'QITUVCHI ============
  {
    id: 'add-teacher',
    keywords: ['oqituvchi', "o'qituvchi", 'teacher', 'ustoz', 'muallim', 'pedagogg', 'yangi oqituvchi'],
    question: "O'qituvchi qanday qo'shiladi?",
    answer: "O'qituvchilar bo'limiga o'ting va \"+\" tugmasini bosing. Ism, familiya va fan(lar)ini tanlang. Menga ham \"Yangi o'qituvchi: Aliyev Vali\" deb yozsangiz, men o'zim qo'shaman. Ko'p o'qituvchi kerak bo'lsa \"30 ta o'qituvchi qo'sh\" deb ayting.",
    category: 'usage',
  },
  // ============ FAN ============
  {
    id: 'add-subject',
    keywords: ['fan', 'predmet', 'subject', 'yangi fan', 'fan qoshish', "fan qo'shish"],
    question: "Fan (predmet) qanday qo'shiladi?",
    answer: "Fanlar bo'limiga o'ting va \"+\" tugmasini bosing. Fan nomini kiriting (masalan \"Matematika\"). Menga \"Matematika fani qo'sh\" deb ham yozishingiz mumkin. Standart fanlar kerak bo'lsa \"17 ta fan qo'sh\" deng — asosiy maktab fanlari avtomatik qo'shiladi.",
    category: 'usage',
  },
  // ============ XONA ============
  {
    id: 'add-room',
    keywords: ['xona', 'kabinet', 'room', 'auditoriya', 'yangi xona', 'xona qoshish'],
    question: "Xona (kabinet) qanday qo'shiladi?",
    answer: "Xonalar bo'limiga o'ting va \"+\" tugmasini bosing. Xona nomini/raqamini kiriting (masalan \"101\"). Menga \"101 xona qo'sh\" deb yozing. Ko'p xona kerak bo'lsa \"30 ta xona qo'sh\" deng.",
    category: 'usage',
  },
  // ============ DARS (TAQSIMOT) ============
  {
    id: 'add-lesson',
    keywords: ['dars', 'taqsimot', 'lesson', 'soat', 'haftalik', 'dars qoshish', "dars qo'shish", 'urok'],
    question: "Dars (taqsimot) qanday qo'shiladi?",
    answer: "Darslar (Taqsimot) bo'limiga o'ting va \"+\" tugmasini bosing. Fan, sinf(lar), o'qituvchi va haftalik soatni tanlang. Masalan: \"5-A sinfga Matematikadan 4 soat dars qo'sh, o'qituvchi Aliyev\". Bu o'quv rejaning asosiy bandi — jadval aynan shu darslar asosida tuziladi.",
    category: 'usage',
  },
  // ============ JADVAL TUZISH ============
  {
    id: 'generate-timetable',
    keywords: ['jadval', 'tuzish', 'generate', 'avtomatik', 'yaratish', 'raspisaniye', 'schedule'],
    question: "Jadval qanday tuziladi?",
    answer: "Avval barcha sinflar, fanlar, o'qituvchilar va darslarni kiritib bo'ling. Keyin menga \"jadval tuz\" deb yozing yoki Taqsimot sahifasidagi \"Avtomatik\" tugmasini bosing. Algoritm bir necha urinish qilib eng yaxshi variantni tanlaydi. Natijada barcha darslar ish kunlari va soatlarga taqsimlanadi.",
    category: 'schedule',
  },
  // ============ JOYLASHMAGAN DARSLAR ============
  {
    id: 'unplaced-lessons',
    keywords: ['joylashmagan', 'joylashmadi', 'qoldi', 'unplaced', 'tushib qoldi', 'joylanmadi', 'sig\'may'],
    question: "Nega ba'zi darslar joylashmay qoldi?",
    answer: "Darslar joylashmasligi bir necha sababdan bo'ladi:\n1. O'qituvchining haftalik norma yoki kunlik sig'imi yetmaydi — normani oshiring.\n2. Ish kunlari kam (5 kun bo'lsa 6 ga o'tkazib ko'ring).\n3. O'qituvchi soni yetarli emas — yangi o'qituvchi qo'shing.\n4. Metodik kunlar yoki availability cheklovlari juda ko'p.\n\n\"Nega joylashmadi?\" deb so'rang — men aniq sababni aytaman.",
    category: 'troubleshoot',
  },
  // ============ JADVAL YAXSHILASH ============
  {
    id: 'improve-timetable',
    keywords: ['yaxshilash', 'optimize', 'oyna', 'bo\'shliq', 'gap', 'darcha', 'oynalar'],
    question: "Tuzilgan jadvalni qanday yaxshilash mumkin?",
    answer: "\"Yaxshila\" deb yozing yoki Taqsimot sahifasida \"Yaxshilash\" tugmasini bosing. Bu o'qituvchi va sinf oynalarini (bo'shliqlarini) kamaytiradi. Bir necha marta takrorlash mumkin — har safar biroz yaxshilanadi.",
    category: 'schedule',
  },
  // ============ EKSPORT ============
  {
    id: 'export',
    keywords: ['eksport', 'yuklab olish', 'excel', 'pdf', 'word', 'png', 'csv', 'chiqarish', 'download', 'fayl'],
    question: "Jadvalni qanday eksport qilish mumkin?",
    answer: "\"Excelga eksport qil\" deb yozing. 5 ta format bor: Excel (.xlsx), PDF, Word (.docx), PNG (rasm), CSV. Masalan: \"PDF ga eksport qil\" yoki \"PNG rasm qil\". Eksport bo'limidan ham tanlash mumkin.",
    category: 'usage',
  },
  // ============ SAQLASH / OCHISH ============
  {
    id: 'save-open',
    keywords: ['saqlash', 'saqla', 'ochish', 'yuklash', 'fayl', 'loyiha', 'jadval fayl'],
    question: "Loyihani qanday saqlash va ochish mumkin?",
    answer: "\"Saqla\" deb yozing — loyiha .jadval fayliga saqlanadi. \"Och\" deb yozsangiz — avval saqlangan faylni ochadi. Dastur avtomatik backup ham yaratadi. \"Yangi loyiha\" deb boshlang — eskisi avtomatik saqlanadi.",
    category: 'usage',
  },
  // ============ WEEKLYMAX (HAFTALIK NORMA) ============
  {
    id: 'weekly-max',
    keywords: ['weeklymax', 'haftalik', 'norma', 'maksimal', 'soat norma', 'haftalik norma'],
    question: "weeklyMax (haftalik norma) nima?",
    answer: "weeklyMax — o'qituvchining haftada maksimal qancha soat dars o'qitishi mumkinligini belgilaydi. Masalan, weeklyMax=24 bo'lsa — haftada 24 soatdan ko'p dars joylashtirilmaydi. Bu o'qituvchining yuklamasini tartibga solishda muhim. O'qituvchi sahifasidan yoki menga \"Aliyev normasi 20 soat\" deb yozib o'zgartirish mumkin.",
    category: 'concept',
  },
  // ============ AVAILABILITY GRID ============
  {
    id: 'availability',
    keywords: ['availability', 'ish vaqti', 'band', 'dam', 'kun', 'dars bermaydi', 'imkoniyat'],
    question: "Availability grid (ish vaqti jadvali) nima?",
    answer: "Har o'qituvchi va sinfning qaysi kun, qaysi soatda ishlashi mumkinligini belgilash. Yashil katak = ishlaydi, qizil = dam. Masalan: \"Aliyev dushanba kuni dars bermaydi\" deb yozing. O'qituvchilar sahifasida katakchalarni bosib ham sozlash mumkin.",
    category: 'concept',
  },
  // ============ VALIDATOR ============
  {
    id: 'validator',
    keywords: ['tekshirish', 'validator', 'validate', 'tayyor', 'tayyormi', 'loyiha tekshirish'],
    question: "Validator nima tekshiradi?",
    answer: "Validator loyihani jadval tuzishdan oldin tekshiradi: o'qituvchilar yetarlimi, soatlar sig'adimi, cheklovlar bir-biriga zidmi. \"Tekshir\" deb yozing — men loyihangizni tahlil qilaman va muammolarni ko'rsataman. Xatolar bo'lsa, jadval tuzish qiyin yoki imkonsiz bo'lishi haqida ogohlantiraman.",
    category: 'concept',
  },
  // ============ KONFLIKTLAR ============
  {
    id: 'conflicts',
    keywords: ['konflikt', "to'qnashuv", 'toqnashuv', 'ziddiyat', 'bir vaqtda', 'clash'],
    question: "Konflikt (to'qnashuv) nima?",
    answer: "Konflikt — bir o'qituvchi yoki sinf bir vaqtda ikki joyda dars berishi/o'qishi. Bu qat'iy xato va bo'lmasligi kerak. \"Konfliktlar bormi?\" deb so'rang — men tekshirib aytaman. Konfliktlar bo'limi barcha to'qnashuvlarni ko'rsatadi. Jadval qayta tuzilsa yoki qo'lda tuzatilsa hal bo'ladi.",
    category: 'concept',
  },
  // ============ ALMASHTIRISH ============
  {
    id: 'substitution',
    keywords: ['almashtirish', "o'rinbosar", 'kelmadi', 'kasal', 'substitute', 'zamena'],
    question: "O'qituvchi kelmasa nima qilish kerak?",
    answer: "\"Aliyev kelmadi dushanba, kim almashtiradi?\" deb yozing. Men shu kungi bo'sh va fanni o'qitadigan o'qituvchilarni topib tavsiya qilaman. Almashtirish bo'limida ham batafsil ko'rish mumkin.",
    category: 'usage',
  },
  // ============ NAVBAT (SHIFT) ============
  {
    id: 'shift',
    keywords: ['navbat', 'smena', 'shift', '1-navbat', '2-navbat', 'birinchi navbat'],
    question: "Navbatlar (shift) qanday ishlaydi?",
    answer: "JadvalPro bir nechta navbatni qo'llab-quvvatlaydi. Maktab sozlamalarida navbatlar sonini belgilang, har sinfga navbat biriktiring. 1-navbat odatda ertalab, 2-navbat kundan keyin o'qiydi. Sinflar bo'limida har sinfning navbatini o'zgartirish mumkin.",
    category: 'concept',
  },
  // ============ METODIK KUN ============
  {
    id: 'methodical-day',
    keywords: ['metodik', 'metodicheskiy', 'dam kun', 'metodik kun'],
    question: "Metodik kun nima?",
    answer: "Metodik kun — o'qituvchi dars bermay, tayyorgarlik va malaka oshirish bilan shug'ullanadigan kun. Bu kunlarda algoritm o'qituvchiga dars joylashmaydi. Bir nechta metodik kun tanlash mumkin. O'qituvchi sahifasida yoki menga \"Aliyev metodik kunlar — chorshanba, juma\" deb belgilang.",
    category: 'concept',
  },
  // ============ CLOUD SYNC ============
  {
    id: 'cloud-sync',
    keywords: ['bulut', 'cloud', 'sinxronizatsiya', 'sync', 'onlayn', 'server', 'saqlash bulut'],
    question: "Bulut sinxronizatsiya qanday ishlaydi?",
    answer: "JadvalPro ma'lumotlarni bulutga saqlab, boshqa qurilmalardan ham foydalanish imkonini beradi. Sozlamalarda bulut hisobingizni ulang. Loyiha avtomatik sinxronizatsiya bo'ladi — boshqa kompyuter yoki telefondan ham ochish mumkin.",
    category: 'feature',
  },
  // ============ TEMPLATE ============
  {
    id: 'templates',
    keywords: ['shablon', 'template', 'namuna', 'demo', 'tayyor', 'misol'],
    question: "Tayyor namuna (demo) ma'lumotlar bormi?",
    answer: "Ha! \"Namuna yukla\" yoki \"demo\" deb yozing — tayyor maktab ma'lumotlari (sinflar, fanlar, o'qituvchilar, darslar) yuklanadi. Bu dasturni sinab ko'rish uchun juda qulay. O'z maktabingizni kiritishdan oldin demo bilan mashq qiling.",
    category: 'usage',
  },
  // ============ ADMIN / FOYDALANUVCHILAR ============
  {
    id: 'accounts',
    keywords: ['hisob', 'foydalanuvchi', 'login', 'parol', 'admin', 'zavuch', "o'qituvchi hisob"],
    question: "Hisoblar (admin, zavuch) qanday sozlanadi?",
    answer: "JadvalPro 4 ta rolni qo'llab-quvvatlaydi: Admin (to'liq huquq), Zavuch (jadval tuzish), O'qituvchi (faqat o'z jadvalini ko'rish) va O'quvchi. Sozlamalar bo'limidan yangi foydalanuvchilar qo'shish va rollarini belgilash mumkin. Har kim o'z login va paroli bilan kiradi.",
    category: 'feature',
  },
  // ============ KUNLIK SIG'IM ============
  {
    id: 'daily-capacity',
    keywords: ['kunlik', 'sigim', "sig'im", 'dailycapacity', 'kuniga', 'maksimal dars'],
    question: "Kunlik sig'im (dailyCapacity) nima?",
    answer: "Kunlik sig'im — o'qituvchining bitta kunda maksimal nechta dars o'tishi mumkinligini belgilaydi. Masalan, dailyCapacity=6 bo'lsa — bir kunda 6 darsdan ko'p joylashtirilmaydi. O'qituvchi sahifasidan yoki menga \"Aliyev kuniga 7 dars\" deb yozib o'zgartirish mumkin.",
    category: 'concept',
  },
  // ============ BO'LIMLAR ============
  {
    id: 'navigate-panels',
    keywords: ["bo'lim", 'panel', 'sahifa', 'navigatsiya', "o'tish", 'ochish', 'qayerda'],
    question: "Dasturning bo'limlari qayerda?",
    answer: "Chap menyuda barcha bo'limlar bor: Bosh sahifa, Maktab, Sinflar, Fanlar, Xonalar, O'qituvchilar, Darslar, Taqsimot (jadval), Ko'rinishlar, Konfliktlar, Almashtirish, Hisobotlar, Eksport, Sozlamalar. Menga \"fanlar bo'limini och\" deb yozsangiz — tezda o'tkazaman.",
    category: 'usage',
  },
  // ============ JUFT DARS ============
  {
    id: 'consecutive',
    keywords: ['juft', 'ketma-ket', 'consecutive', 'para', '2 soat', 'ikki soat', 'uzluksiz'],
    question: "Juft (ketma-ket) darslar qanday belgilanadi?",
    answer: "Dars qo'shayotganda \"Juft dars\" belgilasangiz — bu fan bitta kunda ketma-ket 2 soat bo'lib joylashtiriladi (masalan 3-4 soat). Laboratoriya, jismoniy tarbiya kabi fanlar uchun kerak. Darslar sahifasida tahrirlash orqali yoqish mumkin.",
    category: 'concept',
  },
  // ============ QONGIIROQ JADVALI ============
  {
    id: 'bell-times',
    keywords: ["qo'ng'iroq", 'qongiroq', 'bell', 'vaqt', 'dars vaqti', 'tanaffus', 'peremen'],
    question: "Qo'ng'iroq jadvali qanday sozlanadi?",
    answer: "Maktab sozlamalarida dars davomiyligi (daqiqa) va tanaffus davomiyligini belgilang. Masalan: dars 45 daqiqa, tanaffus 10 daqiqa. Menga \"dars 40 daqiqa, tanaffus 15 daqiqa\" deb ham yozishingiz mumkin.",
    category: 'usage',
  },
  // ============ HISOBOTLAR ============
  {
    id: 'reports',
    keywords: ['hisobot', 'statistika', 'tahlil', 'report', 'sifat', 'natija'],
    question: "Hisobotlar bo'limi nima ko'rsatadi?",
    answer: "Hisobotlar bo'limi jadval sifatini tahlil qiladi: har o'qituvchining yuklamasi, sinf dars taqsimoti, kunlar bo'yicha balans, oynalar soni va boshqa ko'rsatkichlar. \"Jadval sifati\" deb so'rang — men qisqacha aytaman.",
    category: 'usage',
  },
  // ============ TUZATISH ============
  {
    id: 'how-to-fix',
    keywords: ['tuzatish', 'xato', 'muammo', 'hal', 'yechim', 'ishlamayapti', 'fix', 'error'],
    question: "Xato/muammoni qanday tuzatish kerak?",
    answer: "\"Qanday tuzatish kerak?\" deb yozing — men loyihangizni tahlil qilib, aniq maslahatlar beraman. Maslahatlar odatda: o'qituvchi normasi oshirish, yangi o'qituvchi/xona qo'shish, cheklovlarni yumshatish, yoki ish kunlari sonini o'zgartirish bo'ladi.",
    category: 'troubleshoot',
  },
  // ============ TIL O'ZGARTIRISH ============
  {
    id: 'language',
    keywords: ['til', 'ozbekcha', 'ruscha', 'inglizcha', 'language', 'uzbek', 'tilni'],
    question: "Dastur tilini qanday o'zgartirish mumkin?",
    answer: "Menga \"tilni ruscha qil\" yoki \"english\" deb yozing. Sozlamalar bo'limidan ham tanlash mumkin. 3 til qo'llab-quvvatlanadi: O'zbek (lotin), Rus, Ingliz.",
    category: 'usage',
  },
  // ============ TEMA (RANGLAR) ============
  {
    id: 'theme',
    keywords: ["qorong'u", 'tema', 'rang', 'dark', 'light', 'mavzu', 'rejim'],
    question: "Rang mavzusini qanday o'zgartirish mumkin?",
    answer: "\"Qorong'u rejim\" yoki \"yorug' rejim\" deb yozing. Sozlamalar bo'limida turli ranglar mavjud. Dastur ko'z uchun qulay tungi va kunduzgi rejimlarni qo'llab-quvvatlaydi.",
    category: 'usage',
  },
  // ============ BO'SH O'QITUVCHI ============
  {
    id: 'free-teachers',
    keywords: ["bo'sh", 'bosh', 'free', 'band emas', 'kim bosh'],
    question: "Qaysi o'qituvchilar bo'sh ekanini qanday bilish mumkin?",
    answer: "\"Dushanba 3-darsda kim bo'sh?\" deb so'rang — men shu vaqtda dars bermay turgan barcha o'qituvchilarni ko'rsataman. Bu almashtirish yoki qo'shimcha dars tayinlash uchun foydali.",
    category: 'usage',
  },
  // ============ BACKUP ============
  {
    id: 'backup',
    keywords: ['backup', 'zaxira', 'rezerv', 'nusxa', 'himoya'],
    question: "Backup (zaxira nusxa) qanday yaratiladi?",
    answer: "\"Backup\" deb yozing — men hozirgi holatning zaxira nusxasini yarataman. Dastur muhim o'zgarishlardan oldin (yangi loyiha, jadval tuzish) avtomatik backup ham yaratadi. Zaxira nusxalar brauzer xotirasida saqlanadi.",
    category: 'usage',
  },
  // ============ PARALLEL DARSLAR ============
  {
    id: 'grade-lessons',
    keywords: ['parallel', 'barcha', 'hammaga', 'butun sinf', 'parallelga'],
    question: "Barcha parallel sinflarga bir xil darsni qanday qo'shish mumkin?",
    answer: "\"Barcha 5-sinflarga matematikadan 4 soat qo'sh\" deb yozing. Dastur 5-A, 5-B, 5-V va barcha 5-sinflarga avtomatik dars yaratadi. Bu vaqtni juda tejaydi.",
    category: 'usage',
  },
  // ============ UNDO / ORTGA ============
  {
    id: 'undo',
    keywords: ['orqaga', 'qaytarish', 'undo', 'bekor', 'ortga'],
    question: "Oxirgi amalni qanday bekor qilish mumkin?",
    answer: "\"Orqaga\" deb yozing — men oxirgi amalni bekor qilaman. Dastur har qadamni xotirada saqlaydi, shuning uchun bitta qadam orqaga qaytish mumkin.",
    category: 'usage',
  },
  // ============ DASTUR HAQIDA ============
  {
    id: 'about-app',
    keywords: ['jadvalpro', 'dastur', 'nima', 'haqida', 'programma', 'ilova', 'about'],
    question: "JadvalPro nima?",
    answer: "JadvalPro — maktab dars jadvalini avtomatik tuzish dasturi. O'qituvchilar, sinflar, fanlar va darslarni kiritib, bir tugma bilan professional jadval olasiz. Offline ishlaydi (internet shart emas), barcha ma'lumotlar faqat sizning qurilmangizda saqlanadi.",
    category: 'general',
  },
  // ============ QANDAY BOSHLASH ============
  {
    id: 'getting-started',
    keywords: ['boshlash', 'qanday', "boshla'moq", 'birinchi', 'qadam', 'start', 'boshlanish', 'nimadan boshlash'],
    question: "Nimadan boshlash kerak?",
    answer: "Tartib quyidagicha:\n1. Maktab ma'lumotlarini kiriting (nom, ish kunlari)\n2. Sinflar qo'shing (masalan \"1-dan 11-gacha A va B yarat\")\n3. Fanlar qo'shing (\"17 ta fan qo'sh\")\n4. O'qituvchilar qo'shing\n5. Darslar (taqsimot) kiriting — har sinf uchun qaysi fan, necha soat\n6. \"Jadval tuz\" buyrug'i bilan avtomatik jadval oling!\n\nSinab ko'rish uchun \"demo\" deb yozing — tayyor namuna yuklanadi.",
    category: 'general',
  },
  // ============ ISH KUNLARI ============
  {
    id: 'work-days',
    keywords: ['ish kuni', 'ish kunlari', 'hafta', '5 kun', '6 kun', 'shanba', 'workdays'],
    question: "Ish kunlari sonini qanday o'zgartirish mumkin?",
    answer: "Maktab sozlamalarida \"Ish kunlari\" ni 5 yoki 6 qilib belgilang. 6 kun bo'lsa shanba ham kiritiladi. Ko'proq ish kuni = ko'proq dars joylashadi. Menga \"ish kunlari 6\" deb ham yozishingiz mumkin.",
    category: 'usage',
  },
  // ============ JADVAL TOZALASH ============
  {
    id: 'clear-timetable',
    keywords: ['tozalash', 'tozala', "o'chirish", 'jadval ochir', 'qayta', 'boshidan'],
    question: "Jadvalni qanday tozalash mumkin?",
    answer: "\"Jadvalni tozala\" deb yozing — oxirgi tuzilgan jadval o'chiriladi. Keyin qaytadan \"jadval tuz\" bilan yangi jadval tuzish mumkin. Darslar va ma'lumotlar saqlanib qoladi, faqat jadval (joylashtirilgan katak)lar tozalanadi.",
    category: 'usage',
  },
  // ============ OVOZ BILAN BOSHQARISH ============
  {
    id: 'voice',
    keywords: ['ovoz', 'mikrofon', 'gapirish', 'aytish', 'voice', 'speech', 'gapirib'],
    question: "Ovoz bilan qanday boshqarish mumkin?",
    answer: "Mikrofon tugmasini bosing va buyruqni ayting. Masalan: \"Jadval tuz\" yoki \"Aliyev yuklamasi\". Brauzer ruxsat so'rasa \"Ruxsat berish\" ni bosing. O'zbek tili qo'llab-quvvatlanmasa — ruscha yoki inglizchada sinab ko'ring.",
    category: 'usage',
  },
  // ============ AI REJIMLAR ============
  {
    id: 'ai-modes',
    keywords: ['aqlli', 'offline', 'rejim', 'ai', 'sun\'iy', 'intellekt', 'api', 'kalit'],
    question: "AI rejimlar qanday ishlaydi?",
    answer: "Ikki rejim bor:\n1. Offline rejim (standart) — internet kerak emas, buyruqlarni o'zi tushunadi. Oddiy buyruqlar uchun yetarli.\n2. Aqlli rejim — API kalit kiritilganda yoqiladi. Erkin tabiiy tilda yozishingiz mumkin, AI har qanday so'rovni tushunadi. Groq bepul va juda tez (tavsiya). Sozlamalar tugmasidan API kalitni kiriting.",
    category: 'feature',
  },
  // ============ BEPUL KALIT ============
  {
    id: 'free-api-key',
    keywords: ['bepul', 'groq', 'api kalit', 'kalitsiz', 'qanday olish', 'tekin'],
    question: "Bepul API kalit qanday olish mumkin?",
    answer: "Groq bepul va eng tez variant:\n1. console.groq.com/keys ga o'ting\n2. Google hisobingiz bilan kiring (karta kerak emas)\n3. \"Create API Key\" bosing\n4. Kalitni nusxalang (gsk_... bilan boshlanadi)\n5. Sozlamalarda \"Groq\" tanlang va kalitni joylashtiring\n\nBu kuniga minglab so'rov beradi, muddat yo'q.",
    category: 'feature',
  },
]

// ============================================================
// FUZZY MATCHING — bilimlar bazasidan mos yozuvni topish
// ============================================================

/** Oddiy Levenshtein distance */
function levDist(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let curr = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const next = Math.min(curr + 1, prev[j] + 1, prev[j - 1] + cost)
      prev[j - 1] = curr
      curr = next
    }
    prev[b.length] = curr
  }
  return prev[b.length]
}

/** Normalizatsiya — kichik harf, o' → o, g' → g */
function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[''`´ʼ]/g, "'")
    .replace(/o'/g, 'o').replace(/g'/g, 'g')
    .replace(/o`/g, 'o').replace(/g`/g, 'g')
    .replace(/[.,!?;:«»""]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 0..1 orasida o'xshashlik */
function wordSim(a: string, b: string): number {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const maxLen = Math.max(na.length, nb.length)
  return 1 - levDist(na, nb) / maxLen
}

export interface KBMatch {
  entry: KBEntry
  score: number
}

/**
 * Foydalanuvchi savoliga mos bilimlar bazasi yozuvini topish.
 * Kalit so'zlar bo'yicha hisoblaydi + fuzzy matching.
 * @param query — foydalanuvchi matni
 * @param minScore — minimal mos kelish bali (0..1). Standart 0.35
 * @returns Eng mos yozuv yoki null
 */
export function searchKnowledge(query: string, minScore = 0.35): KBMatch | null {
  const q = norm(query)
  if (!q || q.length < 2) return null

  const qWords = q.split(/\s+/).filter((w) => w.length >= 2)
  if (qWords.length === 0) return null

  let best: KBMatch | null = null

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0
    let matchedKeywords = 0

    // Kalit so'zlar bo'yicha hisoblash
    for (const kw of entry.keywords) {
      const nkw = norm(kw)
      // To'liq mos kelish
      if (q.includes(nkw)) {
        matchedKeywords++
        score += 0.5
        continue
      }
      // So'z bo'yicha fuzzy matching
      for (const qw of qWords) {
        const sim = wordSim(qw, nkw)
        if (sim >= 0.7) {
          matchedKeywords++
          score += sim * 0.4
          break
        }
      }
    }

    // Savol bilan o'xshashlik
    const qSim = wordSim(q, norm(entry.question))
    score += qSim * 0.3

    // Normallashtirish: eng ko'pi 1 bo'lsin
    const normalizedScore = Math.min(1, score / Math.max(1, entry.keywords.length * 0.3))

    // Kamida bitta keyword mos kelgan bo'lishi shart
    if (matchedKeywords === 0) continue

    if (normalizedScore >= minScore && (!best || normalizedScore > best.score)) {
      best = { entry, score: normalizedScore }
    }
  }

  return best
}

/**
 * Ko'p mos kelgan yozuvlarni topish (top N).
 */
export function searchKnowledgeMulti(query: string, maxResults = 3, minScore = 0.25): KBMatch[] {
  const q = norm(query)
  if (!q || q.length < 2) return []

  const qWords = q.split(/\s+/).filter((w) => w.length >= 2)
  if (qWords.length === 0) return []

  const results: KBMatch[] = []

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0
    let matchedKeywords = 0

    for (const kw of entry.keywords) {
      const nkw = norm(kw)
      if (q.includes(nkw)) { matchedKeywords++; score += 0.5; continue }
      for (const qw of qWords) {
        const sim = wordSim(qw, nkw)
        if (sim >= 0.65) { matchedKeywords++; score += sim * 0.35; break }
      }
    }

    const qSim = wordSim(q, norm(entry.question))
    score += qSim * 0.25

    const normalizedScore = Math.min(1, score / Math.max(1, entry.keywords.length * 0.3))

    if (matchedKeywords > 0 && normalizedScore >= minScore) {
      results.push({ entry, score: normalizedScore })
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}
