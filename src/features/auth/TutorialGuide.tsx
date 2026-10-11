import { useState } from 'react'
import {
  X, ChevronRight, ChevronLeft,
  LayoutDashboard, LayoutGrid, Sparkles, FolderOpen, Save, Upload,
  School, ListChecks, Users, BookOpen, DoorOpen, GraduationCap,
  CalendarDays, Table2, Calculator, CalendarRange, AlertTriangle,
  Replace, FileBarChart, Settings, UserCog, KeyRound, ShieldCheck,
  BookOpenCheck, Lightbulb, CheckCircle2, ArrowRight, Play,
  type LucideIcon,
} from 'lucide-react'
import { useLang, tr, type Lang } from '@/i18n'

interface TutorialSection {
  id: string
  icon: LucideIcon
  title: string
  description: string
  steps?: string[]
  tip?: string
}

interface TutorialCategory {
  id: string
  title: string
  color: string
  sections: TutorialSection[]
}

/* ── Non-text structure (shared across languages) ── */

const SECTION_ICONS: Record<string, LucideIcon> = {
  workflow: Play,
  dashboard: LayoutDashboard,
  distribution: LayoutGrid,
  ai: Sparkles,
  open: FolderOpen,
  save: Save,
  export: Upload,
  school: School,
  lists: ListChecks,
  classes: Users,
  subjects: BookOpen,
  rooms: DoorOpen,
  teachers: GraduationCap,
  lessons: CalendarDays,
  curriculum: Table2,
  tariff: Calculator,
  views: CalendarRange,
  conflicts: AlertTriangle,
  substitution: Replace,
  reports: FileBarChart,
  settings: Settings,
  account: UserCog,
  license: KeyRound,
}

const CAT_META: { id: string; color: string; sids: string[] }[] = [
  { id: 'start', color: '#3b82f6', sids: ['workflow'] },
  { id: 'main', color: '#8b5cf6', sids: ['dashboard', 'distribution', 'ai'] },
  { id: 'file', color: '#10b981', sids: ['open', 'save', 'export'] },
  { id: 'data', color: '#f59e0b', sids: ['school', 'lists', 'classes', 'subjects', 'rooms', 'teachers'] },
  { id: 'plan', color: '#ec4899', sids: ['lessons', 'curriculum', 'tariff'] },
  { id: 'schedule', color: '#06b6d4', sids: ['views', 'conflicts'] },
  { id: 'extra', color: '#64748b', sids: ['substitution', 'reports', 'settings', 'account', 'license'] },
]

/* ── Translated text for all categories and sections ── */

interface SectionText {
  title: string
  description: string
  steps?: string[]
  tip?: string
}
interface CategoryText {
  title: string
  sections: SectionText[]
}

const TEXTS: Record<Lang, CategoryText[]> = {
  /* ───────────────── O'ZBEK ───────────────── */
  uz: [
    {
      title: "Boshlash yo'riqnomasi",
      sections: [
        {
          title: 'Jadval tuzish tartibi',
          description: "JadvalPro'da jadval tuzish uchun quyidagi tartibda ishlang:",
          steps: [
            "Maktab ma'lumotlarini kiriting (nom, yil, dars vaqtlari)",
            "Sinflarni qo'shing (1-A, 2-B, ...)",
            'Fanlarni kiriting (Matematika, Fizika, ...)',
            'Xonalarni belgilang (101-xona, Sport zal, ...)',
            "O'qituvchilarni ro'yxatga oling",
            "Darslarni taqsimlang (qaysi fan, qaysi sinf, qaysi o'qituvchi)",
            "Taqsimot bo'limida «Jadval tuzish» tugmasini bosing",
            "Tayyor jadvallarni ko'ring va eksport qiling",
          ],
          tip: "Har bir bosqichni tartib bilan bajaring — oldingi ma'lumotlar keyingilariga kerak bo'ladi.",
        },
      ],
    },
    {
      title: "Asosiy bo'limlar",
      sections: [
        {
          title: 'Bosh sahifa',
          description: "Dasturning asosiy ekrani. Bu yerda loyiha holati, statistika (sinflar, fanlar, o'qituvchilar soni), oxirgi o'zgarishlar va tezkor havolalar ko'rsatiladi.",
          tip: 'Yangi loyiha boshlash yoki mavjud loyihani ochish shu yerdan.',
        },
        {
          title: 'Taqsimot',
          description: "Jadval tuzish jarayoni shu bo'limda amalga oshiriladi. Barcha darslar, o'qituvchilar va xonalar to'g'ri kiritilganidan so'ng «Jadval tuzish» tugmasini bosasiz. Dastur avtomatik ravishda optimal jadvalni yaratadi.",
          steps: [
            "Darslar to'liq kiritilganini tekshiring",
            "«Jadval tuzish» tugmasini bosing",
            'Dastur bir necha soniyada jadvalni yaratadi',
            "Natijani ko'rib chiqing va kerak bo'lsa qayta tuzing",
          ],
          tip: "Agar jadval tuzishda muammo bo'lsa — AI yordamchi sababini tushuntiradi.",
        },
        {
          title: 'AI yordamchi',
          description: "Sun'iy intellekt yordamchisi. Jadval haqida savol bering, muammolarni hal qiling. Robot maskot sizga yordam beradi — u savollaringizga tushunib javob beradi.",
          steps: [
            "Savolingizni yozing (masalan: «Nima uchun jadval tuzilmayabdi?»)",
            'AI javob beradi va kerak bo\'lsa amaliy harakatlar taklif qiladi',
            "Buyruqlar ham ishlaydi: «Statistika ko'rsat», «Konfliktlarni tekshir»",
          ],
          tip: "AI o'zbek tilida ishlaydi. Oddiy so'zlar bilan yozing.",
        },
      ],
    },
    {
      title: 'Fayl boshqaruvi',
      sections: [
        {
          title: 'Ochish',
          description: "Saqlangan loyihani (.jadvalpro yoki .json) kompyuterdan ochish. Bulut sinxronizatsiyasi yoqilgan bo'lsa — bulutdan ham yuklash mumkin.",
        },
        {
          title: 'Saqlash',
          description: "Joriy loyihani kompyuterga .jadvalpro fayl sifatida saqlash. Muntazam saqlash odatini tuting — kutilmagan holatlarda ma'lumot yo'qolmaydi.",
          tip: 'Ctrl+S tugmasi bilan tez saqlash mumkin.',
        },
        {
          title: 'Eksport',
          description: "Tayyor jadvalni turli formatlarda eksport qilish: PDF, Excel, chop etish. Sinflar bo'yicha, o'qituvchilar bo'yicha yoki umumiy jadval shaklida chiqarish mumkin.",
        },
      ],
    },
    {
      title: "Ma'lumotlar kiritish",
      sections: [
        {
          title: 'Maktab',
          description: "Maktab haqidagi umumiy ma'lumotlar: nomi, o'quv yili, direktor, navbatlar (smenalar), ish kunlari, dars vaqtlari va qo'ng'iroq jadvali.",
          steps: [
            'Maktab nomini kiriting',
            "O'quv yilini belgilang",
            'Ish kunlari sonini tanlang (odatda 6)',
            'Navbatlarni sozlang (1-navbat, 2-navbat)',
            'Dars vaqtlarini kiriting yoki avtomatik yarating',
          ],
        },
        {
          title: "Ro'yxatlar",
          description: "Sinflar, fanlar, xonalar va o'qituvchilarning umumiy ro'yxati bir sahifada. Tez ko'rib chiqish va umumiy statistika uchun qulay.",
        },
        {
          title: 'Sinflar',
          description: "Maktab sinflari ro'yxati. Har bir sinf uchun: nom (1-A, 5-B), o'quvchilar soni, navbat, bino va dars uchun mavjudlik jadvali.",
          steps: [
            "«Yangi sinf» tugmasini bosing",
            'Sinf nomini kiriting (masalan: 5-A)',
            'Navbatni tanlang',
            "Kerak bo'lsa — mavjudlik jadvalini sozlang",
          ],
          tip: "Sinflarni guruhlash uchun nom tartibini bir xil saqlang: 1-A, 1-B, 2-A...",
        },
        {
          title: 'Fanlar',
          description: "O'quv fanlari ro'yxati. Har bir fan uchun: nom, qisqa nom, rang, vazn (muhimlik darajasi) va mavjudlik jadvali belgilanadi.",
          steps: [
            "«Yangi fan» yoki tayyor ro'yxatdan tanlang",
            'Fan nomini va qisqa nomini kiriting',
            'Rangini tanlang (jadvalda farqlash uchun)',
            "Vazn — qancha muhim (og'ir fanlar kun boshiga qo'yiladi)",
          ],
          tip: "Og'ir fanlar (Matematika, Fizika) — yuqori vazn. Yengil fanlar (Musiqa, Jismoniy tarbiya) — past vazn.",
        },
        {
          title: 'Xonalar',
          description: "Dars xonalari ro'yxati. Har bir xona uchun: nom, sig'im, tur (oddiy, laboratoriya, sport zal), bino va mavjudlik jadvali.",
          tip: "Maxsus xonalar (kompyuter xonasi, laboratoriya) uchun turini belgilang — dastur ularni to'g'ri taqsimlaydi.",
        },
        {
          title: "O'qituvchilar",
          description: "O'qituvchilar ro'yxati. Har biri uchun: F.I.O., telefon, o'qitadigan fanlar, kunlik va haftalik dars limiti, uslubiy kun va mavjudlik jadvali.",
          steps: [
            "«Yangi o'qituvchi» tugmasini bosing",
            'F.I.O. kiriting',
            "O'qitadigan fanlarni tanlang",
            'Kunlik limit — kuniga nechta dars (standart: 6)',
            'Haftalik limit — haftasiga jami nechta dars',
            "Uslubiy kun — dars bo'lmaydigan kun (ixtiyoriy)",
          ],
          tip: "Mavjudlik jadvalida o'qituvchi kelmaydigan kunlarni yoping — dastur o'sha kunlarga dars qo'ymaydi.",
        },
      ],
    },
    {
      title: 'Rejalashtirish',
      sections: [
        {
          title: 'Darslar',
          description: "Eng muhim bo'lim! Qaysi fan, qaysi sinfda, qaysi o'qituvchi tomonidan, haftada necha soat o'qitilishini belgilaysiz. Shu ma'lumotlar asosida jadval tuziladi.",
          steps: [
            "«Yangi dars» tugmasini bosing",
            'Fanni tanlang',
            'Sinfni (yoki bir nechta sinf) tanlang',
            "O'qituvchini tanlang",
            'Haftadagi soat sonini kiriting',
            "Kerak bo'lsa — juft dars (ketma-ket) belgilang",
          ],
          tip: "Barcha darslar to'g'ri kiritilgandan so'ng — Taqsimot bo'limida jadval tuzing.",
        },
        {
          title: "O'quv reja",
          description: "O'quv rejasini jadval shaklida ko'rish va tekshirish. Har bir sinf uchun qaysi fanlardan haftasiga necha soat belgilangan — nazorat qilish imkoniyati.",
        },
        {
          title: 'Tarifikatsiya',
          description: "O'qituvchilarning dars yuklamasini hisoblash. Har bir o'qituvchi haftasiga necha soat dars berishi, qaysi sinflarda o'qitishi ko'rsatiladi.",
        },
      ],
    },
    {
      title: 'Jadval',
      sections: [
        {
          title: "Jadval ko'rinishlari",
          description: "Tayyor jadvalni turli ko'rinishlarda ko'rish: umumiy jadval, sinf bo'yicha, o'qituvchi bo'yicha, xona bo'yicha. Har bir ko'rinishni alohida chop etish mumkin.",
        },
        {
          title: 'Konfliktlar',
          description: "Jadvaldagi to'qnashuvlar va muammolar ro'yxati. Masalan: bir o'qituvchi bir vaqtda ikki sinfda, xona bandligi, dars limiti oshishi va h.k.",
          tip: "Jadval tuzilgandan keyin bu bo'limni albatta tekshiring — muammolarni tezda ko'rasiz.",
        },
      ],
    },
    {
      title: "Qo'shimcha",
      sections: [
        {
          title: 'Almashtirish',
          description: "O'qituvchi kasallanganda yoki bo'lmaganda — o'rniga boshqa o'qituvchi qo'yish. Almashtirish jadvali shu yerda boshqariladi.",
        },
        {
          title: 'Hisobotlar',
          description: "Jadval bo'yicha hisobotlar: o'qituvchilar yuklamasi, xonalar bandligi, sinflar jadvali va boshqa statistik ma'lumotlar.",
        },
        {
          title: 'Sozlamalar',
          description: "Dastur ko'rinishini sozlash: rang mavzusi, zoom, jadval kataklar o'lchami, Pro versiyani faollashtirish va bulut sinxronizatsiya.",
        },
        {
          title: 'Hisob',
          description: "Foydalanuvchi hisobi. O'qituvchi va o'quvchilar uchun login va parolni shu yerdan boshqarish mumkin.",
        },
        {
          title: "Dastur ma'lumoti",
          description: "Dastur versiyasi, litsenziya holati, Pro kalit va qurilma kodi haqida ma'lumot.",
        },
      ],
    },
  ],

  /* ───────────────── RUSСКИЙ ───────────────── */
  ru: [
    {
      title: 'Руководство по началу работы',
      sections: [
        {
          title: 'Порядок составления расписания',
          description: 'Для составления расписания в JadvalPro выполните следующие шаги:',
          steps: [
            'Введите данные школы (название, год, время уроков)',
            'Добавьте классы (1-А, 2-Б, ...)',
            'Введите предметы (Математика, Физика, ...)',
            'Укажите кабинеты (каб. 101, Спортзал, ...)',
            'Добавьте учителей в список',
            'Распределите уроки (какой предмет, какой класс, какой учитель)',
            'В разделе «Распределение» нажмите «Составить расписание»',
            'Просмотрите готовое расписание и экспортируйте',
          ],
          tip: 'Выполняйте шаги по порядку — каждый следующий шаг опирается на предыдущие данные.',
        },
      ],
    },
    {
      title: 'Основные разделы',
      sections: [
        {
          title: 'Главная',
          description: 'Главный экран программы. Здесь отображается состояние проекта, статистика (количество классов, предметов, учителей), последние изменения и быстрые ссылки.',
          tip: 'Начать новый проект или открыть существующий можно отсюда.',
        },
        {
          title: 'Распределение',
          description: 'Составление расписания происходит в этом разделе. После правильного ввода всех уроков, учителей и кабинетов нажмите «Составить расписание». Программа автоматически создаст оптимальное расписание.',
          steps: [
            'Убедитесь, что все уроки введены полностью',
            'Нажмите «Составить расписание»',
            'Программа создаст расписание за несколько секунд',
            'Просмотрите результат и при необходимости пересоставьте',
          ],
          tip: 'Если при составлении возникнут проблемы — AI-ассистент объяснит причину.',
        },
        {
          title: 'AI-ассистент',
          description: 'Помощник на основе искусственного интеллекта. Задавайте вопросы о расписании, решайте проблемы. Робот-маскот поможет вам — он понимает ваши вопросы и отвечает по делу.',
          steps: [
            'Напишите вопрос (например: «Почему расписание не составляется?»)',
            'AI ответит и при необходимости предложит действия',
            'Команды тоже работают: «Покажи статистику», «Проверь конфликты»',
          ],
          tip: 'AI работает на узбекском языке. Пишите простыми словами.',
        },
      ],
    },
    {
      title: 'Управление файлами',
      sections: [
        {
          title: 'Открыть',
          description: 'Открытие сохранённого проекта (.jadvalpro или .json) с компьютера. Если включена облачная синхронизация — можно загрузить из облака.',
        },
        {
          title: 'Сохранить',
          description: 'Сохранение текущего проекта на компьютер в формате .jadvalpro. Регулярно сохраняйте — так данные не пропадут.',
          tip: 'Быстрое сохранение — Ctrl+S.',
        },
        {
          title: 'Экспорт',
          description: 'Экспорт готового расписания в различные форматы: PDF, Excel, печать. Можно выгрузить по классам, по учителям или как общее расписание.',
        },
      ],
    },
    {
      title: 'Ввод данных',
      sections: [
        {
          title: 'Школа',
          description: 'Общие сведения о школе: название, учебный год, директор, смены, рабочие дни, время уроков и расписание звонков.',
          steps: [
            'Введите название школы',
            'Укажите учебный год',
            'Выберите количество рабочих дней (обычно 6)',
            'Настройте смены (1-я смена, 2-я смена)',
            'Введите время уроков или создайте автоматически',
          ],
        },
        {
          title: 'Списки',
          description: 'Общий список классов, предметов, кабинетов и учителей на одной странице. Удобно для быстрого обзора и общей статистики.',
        },
        {
          title: 'Классы',
          description: 'Список классов школы. Для каждого класса: название (1-А, 5-Б), количество учеников, смена, здание и расписание доступности.',
          steps: [
            'Нажмите «Новый класс»',
            'Введите название класса (например: 5-А)',
            'Выберите смену',
            'При необходимости — настройте расписание доступности',
          ],
          tip: 'Для группировки классов используйте единый формат: 1-А, 1-Б, 2-А...',
        },
        {
          title: 'Предметы',
          description: 'Список учебных предметов. Для каждого: название, сокращение, цвет, вес (степень важности) и расписание доступности.',
          steps: [
            'Нажмите «Новый предмет» или выберите из готового списка',
            'Введите название и сокращение',
            'Выберите цвет (для различения в расписании)',
            'Вес — насколько важен (сложные предметы ставятся в начало дня)',
          ],
          tip: 'Сложные предметы (Математика, Физика) — высокий вес. Лёгкие (Музыка, Физкультура) — низкий.',
        },
        {
          title: 'Кабинеты',
          description: 'Список кабинетов. Для каждого: название, вместимость, тип (обычный, лаборатория, спортзал), здание и расписание доступности.',
          tip: 'Для специальных кабинетов (компьютерный класс, лаборатория) укажите тип — программа распределит их правильно.',
        },
        {
          title: 'Учителя',
          description: 'Список учителей. Для каждого: ФИО, телефон, преподаваемые предметы, дневной и недельный лимит уроков, методический день и расписание доступности.',
          steps: [
            'Нажмите «Новый учитель»',
            'Введите ФИО',
            'Выберите преподаваемые предметы',
            'Дневной лимит — сколько уроков в день (по умолчанию: 6)',
            'Недельный лимит — сколько уроков в неделю всего',
            'Методический день — день без уроков (необязательно)',
          ],
          tip: 'В расписании доступности закройте дни, когда учитель не приходит — программа не поставит уроки на эти дни.',
        },
      ],
    },
    {
      title: 'Планирование',
      sections: [
        {
          title: 'Уроки',
          description: 'Самый важный раздел! Здесь вы указываете: какой предмет, в каком классе, каким учителем, сколько часов в неделю преподаётся. На основе этих данных составляется расписание.',
          steps: [
            'Нажмите «Новый урок»',
            'Выберите предмет',
            'Выберите класс (или несколько классов)',
            'Выберите учителя',
            'Введите количество часов в неделю',
            'При необходимости — отметьте сдвоенный урок',
          ],
          tip: 'После правильного ввода всех уроков — составьте расписание в разделе «Распределение».',
        },
        {
          title: 'Учебный план',
          description: 'Просмотр и проверка учебного плана в табличном виде. Для каждого класса — сколько часов в неделю отведено на каждый предмет.',
        },
        {
          title: 'Тарификация',
          description: 'Расчёт учебной нагрузки учителей. Сколько часов в неделю ведёт каждый учитель, в каких классах преподаёт.',
        },
      ],
    },
    {
      title: 'Расписание',
      sections: [
        {
          title: 'Виды расписания',
          description: 'Просмотр готового расписания в разных видах: общее, по классам, по учителям, по кабинетам. Каждый вид можно распечатать отдельно.',
        },
        {
          title: 'Конфликты',
          description: 'Список столкновений и проблем в расписании. Например: один учитель одновременно в двух классах, занятость кабинета, превышение лимита уроков и т.д.',
          tip: 'После составления расписания обязательно проверьте этот раздел — вы сразу увидите проблемы.',
        },
      ],
    },
    {
      title: 'Дополнительно',
      sections: [
        {
          title: 'Замены',
          description: 'Когда учитель болеет или отсутствует — назначить замену другим учителем. Расписание замен управляется здесь.',
        },
        {
          title: 'Отчёты',
          description: 'Отчёты по расписанию: нагрузка учителей, занятость кабинетов, расписание классов и другая статистика.',
        },
        {
          title: 'Настройки',
          description: 'Настройка внешнего вида программы: цветовая тема, масштаб, размер ячеек, активация Pro-версии и облачная синхронизация.',
        },
        {
          title: 'Аккаунты',
          description: 'Аккаунт пользователя. Управление логинами и паролями для учителей и учеников.',
        },
        {
          title: 'О программе',
          description: 'Версия программы, состояние лицензии, Pro-ключ и код устройства.',
        },
      ],
    },
  ],

  /* ───────────────── ENGLISH ───────────────── */
  en: [
    {
      title: 'Getting started guide',
      sections: [
        {
          title: 'Timetable creation workflow',
          description: 'Follow these steps to create a timetable in JadvalPro:',
          steps: [
            'Enter school information (name, year, lesson times)',
            'Add classes (1-A, 2-B, ...)',
            'Enter subjects (Math, Physics, ...)',
            'Set up rooms (Room 101, Gym, ...)',
            'Add teachers to the list',
            'Assign lessons (which subject, which class, which teacher)',
            'In the Distribution section, click "Build timetable"',
            'Review the finished timetable and export',
          ],
          tip: 'Follow the steps in order — each step relies on data from the previous ones.',
        },
      ],
    },
    {
      title: 'Main sections',
      sections: [
        {
          title: 'Home',
          description: 'The main screen of the app. Here you can see project status, statistics (number of classes, subjects, teachers), recent changes and quick links.',
          tip: 'Start a new project or open an existing one from here.',
        },
        {
          title: 'Distribution',
          description: 'Timetable building happens in this section. After all lessons, teachers and rooms are entered correctly, click "Build timetable". The app will automatically generate an optimal timetable.',
          steps: [
            'Make sure all lessons are fully entered',
            'Click "Build timetable"',
            'The app will create the timetable in a few seconds',
            'Review the result and rebuild if needed',
          ],
          tip: "If there's a problem building the timetable — the AI assistant will explain the reason.",
        },
        {
          title: 'AI Assistant',
          description: 'Artificial intelligence assistant. Ask questions about the timetable, solve problems. The robot mascot will help you — it understands your questions and gives relevant answers.',
          steps: [
            'Type your question (e.g. "Why isn\'t the timetable building?")',
            'AI will answer and suggest actions if needed',
            'Commands also work: "Show statistics", "Check conflicts"',
          ],
          tip: 'AI works in Uzbek. Write in simple words.',
        },
      ],
    },
    {
      title: 'File management',
      sections: [
        {
          title: 'Open',
          description: 'Open a saved project (.jadvalpro or .json) from your computer. If cloud sync is enabled — you can also download from the cloud.',
        },
        {
          title: 'Save',
          description: 'Save the current project to your computer as a .jadvalpro file. Save regularly — so data won\'t be lost unexpectedly.',
          tip: 'Quick save with Ctrl+S.',
        },
        {
          title: 'Export',
          description: 'Export the finished timetable in various formats: PDF, Excel, print. You can export by class, by teacher, or as a full timetable.',
        },
      ],
    },
    {
      title: 'Data entry',
      sections: [
        {
          title: 'School',
          description: 'General school information: name, academic year, director, shifts, working days, lesson times and bell schedule.',
          steps: [
            'Enter the school name',
            'Set the academic year',
            'Choose the number of working days (usually 6)',
            'Configure shifts (1st shift, 2nd shift)',
            'Enter lesson times or generate automatically',
          ],
        },
        {
          title: 'Lists',
          description: 'Overview of all classes, subjects, rooms and teachers on one page. Convenient for quick review and general statistics.',
        },
        {
          title: 'Classes',
          description: 'List of school classes. For each class: name (1-A, 5-B), number of students, shift, building and availability schedule.',
          steps: [
            'Click "New class"',
            'Enter the class name (e.g. 5-A)',
            'Select the shift',
            'If needed — configure the availability schedule',
          ],
          tip: 'To group classes, keep a consistent naming format: 1-A, 1-B, 2-A...',
        },
        {
          title: 'Subjects',
          description: 'List of school subjects. For each: name, abbreviation, color, weight (importance level) and availability schedule.',
          steps: [
            'Click "New subject" or pick from a ready list',
            'Enter the name and abbreviation',
            'Choose a color (to distinguish in the timetable)',
            'Weight — how important (heavy subjects are placed at the start of the day)',
          ],
          tip: 'Hard subjects (Math, Physics) — high weight. Light subjects (Music, PE) — low weight.',
        },
        {
          title: 'Rooms',
          description: 'List of classrooms. For each: name, capacity, type (regular, laboratory, gym), building and availability schedule.',
          tip: 'For special rooms (computer lab, science lab) set the type — the app will distribute them correctly.',
        },
        {
          title: 'Teachers',
          description: 'List of teachers. For each: full name, phone, subjects taught, daily and weekly lesson limits, methodology day and availability schedule.',
          steps: [
            'Click "New teacher"',
            'Enter the full name',
            'Select subjects they teach',
            'Daily limit — lessons per day (default: 6)',
            'Weekly limit — total lessons per week',
            'Methodology day — day with no lessons (optional)',
          ],
          tip: "In the availability schedule, close the days when a teacher is unavailable — the app won't assign lessons on those days.",
        },
      ],
    },
    {
      title: 'Planning',
      sections: [
        {
          title: 'Lessons',
          description: 'The most important section! Here you specify: which subject, in which class, by which teacher, how many hours per week. The timetable is built based on this data.',
          steps: [
            'Click "New lesson"',
            'Select the subject',
            'Select the class (or multiple classes)',
            'Select the teacher',
            'Enter hours per week',
            'If needed — mark as a double lesson (consecutive)',
          ],
          tip: 'After all lessons are entered correctly — build the timetable in the "Distribution" section.',
        },
        {
          title: 'Curriculum',
          description: 'View and check the curriculum in table form. For each class — how many hours per week are allocated to each subject.',
        },
        {
          title: 'Workload',
          description: 'Calculate teacher workload. How many hours per week each teacher teaches, which classes they teach in.',
        },
      ],
    },
    {
      title: 'Timetable',
      sections: [
        {
          title: 'Timetable views',
          description: 'View the finished timetable in different formats: overall, by class, by teacher, by room. Each view can be printed separately.',
        },
        {
          title: 'Conflicts',
          description: 'List of clashes and issues in the timetable. For example: one teacher in two classes at the same time, room occupancy, lesson limit exceeded, etc.',
          tip: 'After building the timetable, always check this section — you\'ll see problems right away.',
        },
      ],
    },
    {
      title: 'Additional',
      sections: [
        {
          title: 'Substitution',
          description: 'When a teacher is sick or absent — assign a substitute. The substitution schedule is managed here.',
        },
        {
          title: 'Reports',
          description: 'Timetable reports: teacher workload, room occupancy, class schedules and other statistics.',
        },
        {
          title: 'Settings',
          description: 'Customize the app appearance: color theme, zoom, cell sizes, Pro version activation and cloud sync.',
        },
        {
          title: 'Accounts',
          description: 'User account. Manage logins and passwords for teachers and students.',
        },
        {
          title: 'App info',
          description: 'App version, license status, Pro key and device code.',
        },
      ],
    },
  ],
}

/* ── Build the final data structure from metadata + translated text ── */

function getTutorialData(lang: Lang): TutorialCategory[] {
  const texts = TEXTS[lang]
  return CAT_META.map((meta, ci) => ({
    id: meta.id,
    title: texts[ci].title,
    color: meta.color,
    sections: meta.sids.map((sid, si) => ({
      id: sid,
      icon: SECTION_ICONS[sid],
      ...texts[ci].sections[si],
    })),
  }))
}

/* ── Component ── */

export function TutorialGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang((s) => s.lang)
  const t = (key: string) => tr(lang, key)
  const [activeCat, setActiveCat] = useState(0)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  if (!open) return null

  const data = getTutorialData(lang)
  const cat = data[activeCat]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-accent/10 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg">
              <BookOpenCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("Dasturni o'rganish")}</h2>
              <p className="text-xs text-muted">{t("Har bir bo'lim haqida batafsil")}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Sidebar */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface/50 p-2 sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
            {data.map((c, i) => (
              <button
                key={c.id}
                onClick={() => { setActiveCat(i); setExpandedSection(null) }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                  i === activeCat
                    ? 'bg-accent/15 text-accent shadow-sm'
                    : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                {c.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <span className="h-3 w-3 rounded-full" style={{ background: cat.color }} />
              {cat.title}
            </h3>

            <div className="space-y-3">
              {cat.sections.map((s) => {
                const Icon = s.icon
                const isExpanded = expandedSection === s.id
                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl border transition-all ${
                      isExpanded ? 'border-accent/40 bg-accent/5 shadow-sm' : 'border-border bg-surface/50 hover:border-accent/20'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform"
                        style={{ background: `${cat.color}20`, color: cat.color }}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold">{s.title}</h4>
                        {!isExpanded && (
                          <p className="mt-0.5 truncate text-sm text-muted">{s.description}</p>
                        )}
                      </div>
                      <ChevronRight
                        size={18}
                        className={`shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/50 px-4 pb-4 pt-3">
                        <p className="text-sm leading-relaxed text-ink/80">{s.description}</p>

                        {s.steps && (
                          <div className="mt-3 space-y-1.5">
                            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                              <ArrowRight size={12} /> {t('Qadamlar')}
                            </p>
                            {s.steps.map((step, i) => (
                              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-bg/60 px-3 py-2">
                                <span
                                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                                  style={{ background: cat.color }}
                                >
                                  {i + 1}
                                </span>
                                <span className="text-sm">{step}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {s.tip && (
                          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5">
                            <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" />
                            <p className="text-sm text-amber-700 dark:text-amber-400">{s.tip}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-surface/50 px-6 py-3">
          <button
            onClick={() => { setActiveCat(Math.max(0, activeCat - 1)); setExpandedSection(null) }}
            disabled={activeCat === 0}
            className="btn btn-ghost text-sm disabled:opacity-30"
          >
            <ChevronLeft size={16} /> {t('Oldingi')}
          </button>
          <span className="text-xs text-muted">
            {activeCat + 1} / {data.length}
          </span>
          <button
            onClick={() => {
              if (activeCat < data.length - 1) {
                setActiveCat(activeCat + 1)
                setExpandedSection(null)
              } else {
                onClose()
              }
            }}
            className="btn btn-ghost text-sm"
          >
            {activeCat < data.length - 1 ? (
              <>{t('Keyingi')} <ChevronRight size={16} /></>
            ) : (
              <>{t('Tayyor')} <CheckCircle2 size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
