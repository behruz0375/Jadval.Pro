// ============================================================
// JadvalPro — jadval generatsiya engine (CSP: greedy + local search)
// Pure TypeScript — Web Worker'da ishlaydi, DOM'ga bog'liq emas.
// ============================================================
import type { Project, TimetableEntry, TimetableVersion } from '@/types'
import { weekOverlap } from '@/utils'
import { countHardViolations } from '@/features/_shared/compute'

export interface GenerateOptions {
  seed?: number
  /** Xonalarni hisobga olish (joylashtirish) */
  considerRooms?: boolean
  /** Darslarni kunlarga tekis taqsimlash */
  spreadDays?: boolean
  /** Sinf/o'qituvchi bo'shliqlarini (darcha) kamaytirish */
  minimizeGaps?: boolean
  /** Yumshoq cheklov og'irliklari (jarima koeffitsiyentlari) */
  gapWeight?: number // darcha (oyna) jarimasi, standart 2
  spreadWeight?: number // bir fan bir kunda takrorlanishi jarimasi, standart 4
  morningWeight?: number // og'ir fanni ertalabga surish, standart 2
  /** Qancha urinish qilish: har urinishda yangi seed, eng yaxshisi saqlanadi (standart 1) */
  restarts?: number
  /** Har sinf uchun kuniga maksimal dars (standart 6). Oshsa dars qo'yilmaydi. */
  maxLessonsPerClassDay?: number
  /** Avtomatik relaksatsiya — unplaced > 0 bo'lsa, cheklovlarni yumshatib qayta urinadi.
   *  Shu bilan deyarli 100% dars joylashadi. (standart true) */
  autoRelax?: boolean
}

type ProgressFn = (progress: number, message: string) => void
/** Oraliq (best-so-far) natijani yetkazish — «To'xtatish» bosilganda saqlash uchun */
type SnapshotFn = (version: TimetableVersion) => void

interface Session {
  id: string
  lessonId: string
  subjectId: string
  classIds: string[]
  teacherIds: string[]
  fixedRoomId?: string
  requiredRoomType?: string
  studentCount: number
  length: number // 1 yoki 2 (ketma-ket)
  weight: number
  /** Shu dars bitta sinf uchun kuniga maksimum necha marta qo'yilishi (0 = cheksiz) */
  maxPerDay: number
}

interface Placement {
  session: Session
  day: number
  start: number // boshlanish period (1-indexed)
  roomId?: string
}

// --- Seedli RNG ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const key = (a: string, d: number, p: number) => `${a}:${d}:${p}`

/**
 * Jadval tuzish — restarts > 1 bo'lsa bir necha urinish, eng yaxshisi saqlanadi.
 *
 * Urinishlar har xil seedlar bilan ketma-ket ishlaydi. Har urinishdan keyin:
 *  - unplaced == 0 va hardViolations == 0 bo'lsa — darhol qaytariladi
 *  - aks holda eng yaxshi natija (eng kam unplaced + hard, keyin soft) saqlanadi
 * onSnapshot har urinishning oxirgi natijasini ham chiqaradi, shu bilan
 * "To'xtatish" bosilganda ham eng yaxshi natija qaytariladi.
 */
export function generateTimetable(
  project: Project,
  opts: GenerateOptions = {},
  onProgress?: ProgressFn,
  onSnapshot?: SnapshotFn,
): TimetableVersion {
  // Loyihani kattaligiga qarab restarts avto-moslanadi (kattaroq → ko'proq urinish)
  const totalHours = project.lessons.reduce((a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length), 0)
  const autoRestartsBase =
    totalHours < 50 ? 2 : totalHours < 150 ? 3 : totalHours < 300 ? 5 : totalHours < 600 ? 7 : 10
  const restarts = Math.max(1, Math.min(10, opts.restarts ?? autoRestartsBase))
  const autoRelax = opts.autoRelax !== false // standart: yoqilgan

  const score = (v: TimetableVersion) =>
    v.stats.unplaced * 10_000 + v.stats.hardViolations * 1_000 + v.stats.softPenalty

  const baseSeed = opts.seed ?? Math.floor(Math.random() * 1_000_000_000)
  let best: TimetableVersion | null = null

  /** Project'ni cheklovlar bo'yicha yumshatib qaytaradi.
   *  level 1: teacher daily/weekly +2 / +4, lesson maxPerDay +1
   *  level 2: + methodik kunni olib tashlash (vaqtincha)
   *  level 3: + daily/weekly cheklov butunlay o'chiriladi (oxirgi chora)
   *  level 4+: + har qanday availability'ni yoqish (eng extreme — faqat shift grid qoladi) */
  const relaxProject = (p: Project, level: number): Project => {
    if (level <= 0) return p
    return {
      ...p,
      teachers: p.teachers.map((t) => ({
        ...t,
        // level 3 dan boshlab cheksiz (0 = cheksiz)
        dailyCapacity: level >= 3 ? 0 : t.dailyCapacity + 2 * level,
        weeklyMax: level >= 3 ? 0 : t.weeklyMax + 4 * level,
        methodicalDay: level >= 2 ? -1 : t.methodicalDay,
        // level 4: barcha slot'lar ochiq
        availability: level >= 4
          ? t.availability.map((row) => row.map(() => true))
          : t.availability,
      })),
      lessons: p.lessons.map((l) => ({
        ...l,
        maxPerDay: l.maxPerDay > 0 ? Math.min(8, l.maxPerDay + level) : 0,
        // level 3 dan boshlab consecutive (juft dars) ham sinishi mumkin — ikki alohida 1-soat sifatida
        consecutive: level >= 3 ? false : l.consecutive,
      })),
      classes: level >= 4
        ? p.classes.map((c) => ({ ...c, availability: c.availability.map((row) => row.map(() => true)) }))
        : p.classes,
      rooms: level >= 4
        ? p.rooms.map((r) => ({ ...r, availability: r.availability.map((row) => row.map(() => true)) }))
        : p.rooms,
      subjects: level >= 4
        ? p.subjects.map((s) => ({ ...s, availability: s.availability.map((row) => row.map(() => true)) }))
        : p.subjects,
    }
  }

  const tryOnce = (relaxLevel: number, i: number, total: number): TimetableVersion => {
    const sub: ProgressFn = (p, m) => onProgress?.(
      (i / total) * 100 + p / total,
      total > 1 ? `${i + 1}/${total}: ${relaxLevel > 0 ? '[yumshoq] ' : ''}${m}` : m,
    )
    const relaxed: GenerateOptions = {
      ...opts,
      seed: baseSeed + i * 101 + relaxLevel * 7919,
      maxLessonsPerClassDay: (opts.maxLessonsPerClassDay ?? 6) + relaxLevel,
      spreadWeight: Math.max(0, (opts.spreadWeight ?? 4) - relaxLevel),
      morningWeight: Math.max(0, (opts.morningWeight ?? 2) - relaxLevel),
    }
    const projRelaxed = relaxProject(project, relaxLevel)
    return generateOnce(projRelaxed, relaxed, sub, onSnapshot)
  }

  // 1-bosqich — asosiy urinishlar (restarts marta)
  for (let i = 0; i < restarts; i++) {
    const v = tryOnce(0, i, restarts)
    if (!best || score(v) < score(best)) { best = v; onSnapshot?.(best) }
    if (v.stats.unplaced === 0 && v.stats.hardViolations === 0) {
      onProgress?.(100, 'Tayyor!')
      return best
    }
  }

  // 2-bosqich — avtomatik relaksatsiya (unplaced > 0 bo'lsa)
  if (autoRelax && best && best.stats.unplaced > 0) {
    onProgress?.(50, `${best.stats.unplaced} dars qoldi — cheklovlarni yumshatib qayta urinaman…`)
    for (let level = 1; level <= 3 && best.stats.unplaced > 0; level++) {
      for (let i = 0; i < 3; i++) {
        const v = tryOnce(level, i, 3)
        if (score(v) < score(best)) { best = v; onSnapshot?.(best) }
        if (v.stats.unplaced === 0) break
      }
    }
  }

  // 3-bosqich — oxirgi chora: barcha cheklov yumshoq, project ham maksimal yumshatilgan
  // Katta loyihalarda ham 100% joylash kafolati uchun 5 urinish
  if (autoRelax && best && best.stats.unplaced > 0) {
    onProgress?.(80, `${best.stats.unplaced} dars hali qoldi — oxirgi urinish (barcha cheklov yumshoq)…`)
    const extremeRelaxed = relaxProject(project, 4)
    for (let i = 0; i < 5 && best!.stats.unplaced > 0; i++) {
      const v = generateOnce(extremeRelaxed, {
        ...opts, seed: baseSeed + 99999 + i * 331,
        maxLessonsPerClassDay: project.school.maxLessonsPerDay, // cheksiz
        spreadDays: false, minimizeGaps: false,
        spreadWeight: 0, morningWeight: 0,
        considerRooms: i >= 3 ? false : opts.considerRooms, // oxirgi 2 urinish xona talabini ham o'chiradi
      }, undefined, onSnapshot)
      if (score(v) < score(best!)) { best = v; onSnapshot?.(best) }
    }
  }

  onProgress?.(100, 'Tayyor!')
  return best!
}

/** Bitta urinish — eski generateTimetable mantig'i */
function generateOnce(
  project: Project,
  opts: GenerateOptions = {},
  onProgress?: ProgressFn,
  onSnapshot?: SnapshotFn,
): TimetableVersion {
  const seed = opts.seed ?? 12345
  const rng = mulberry32(seed)
  const considerRooms = opts.considerRooms !== false
  const spreadDays = opts.spreadDays !== false
  const minimizeGaps = opts.minimizeGaps !== false
  const gapWeight = opts.gapWeight ?? 2
  const spreadWeight = opts.spreadWeight ?? 4
  const morningWeight = opts.morningWeight ?? 2
  const { school, classes, subjects, rooms, teachers, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay
  /** Har bir sinf uchun kuniga MAX dars soni (standart 6).
   *  Bu "ko'p dars tuzilmasin, o'quvchi charchamasin" talabi uchun. */
  const maxLessonsPerClassDay = opts.maxLessonsPerClassDay ?? 6

  const classById = new Map(classes.map((c) => [c.id, c]))
  const teacherById = new Map(teachers.map((t) => [t.id, t]))
  const subjectById = new Map(subjects.map((s) => [s.id, s]))

  // Har bir sinf uchun ruxsat etilgan (day, period) — navbat gridi + sinf ish vaqti
  const classAllowed = new Map<string, Set<number>>() // classId -> set of day*100+period
  for (const c of classes) {
    const set = new Set<number>()
    const shift = school.shifts[c.shiftIndex - 1] ?? school.shifts[0]
    for (let d = 0; d < days; d++) {
      for (let p = 1; p <= maxP; p++) {
        const shiftOk = shift?.grid?.[p - 1]?.[d] ?? true
        const availOk = c.availability?.[d]?.[p - 1] ?? true
        if (shiftOk && availOk) set.add(d * 100 + p)
      }
    }
    classAllowed.set(c.id, set)
  }

  const teacherAllowed = (tid: string, d: number, p: number): boolean => {
    const t = teacherById.get(tid)
    if (!t) return false
    if (t.methodicalDay === d) return false
    return t.availability?.[d]?.[p - 1] ?? true
  }
  const subjectAllowed = (sid: string, d: number, p: number): boolean => {
    const s = subjectById.get(sid)
    return s?.availability?.[d]?.[p - 1] ?? true
  }

  // --- Sessiyalar yaratish ---
  const sessions: Session[] = []
  for (const l of lessons) {
    if (!l.subjectId || l.classIds.length === 0 || !l.teacher1Id) continue
    const subj = subjectById.get(l.subjectId)
    const teacherIds = [l.teacher1Id, l.teacher2Id].filter(Boolean) as string[]
    const studentCount = l.classIds.reduce((a, cid) => a + (classById.get(cid)?.studentCount ?? 0), 0)
    let remaining = l.hoursPerWeek
    let idx = 0
    while (remaining > 0) {
      const len = l.consecutive && remaining >= 2 ? 2 : 1
      sessions.push({
        id: `${l.id}_${idx++}`,
        lessonId: l.id,
        subjectId: l.subjectId,
        classIds: l.classIds,
        teacherIds,
        fixedRoomId: l.roomId,
        requiredRoomType: subj?.requiredRoomType,
        studentCount,
        length: len,
        weight: subj?.weight ?? 5,
        maxPerDay: l.maxPerDay > 0 ? l.maxPerDay : 0,
      })
      remaining -= len
    }
  }

  // Band holatlar
  const classBusy = new Set<string>()
  const teacherBusy = new Set<string>()
  const roomBusy = new Set<string>()
  // sinf kuniga shu fan necha marta (tarqatish uchun)
  const subjPerDay = new Map<string, number>() // `${classId}:${day}:${subjectId}`
  // Yangi: lesson kunlik va teacher kunlik/haftalik hisob (qat'iy cheklovlar uchun)
  const classLessonDayCount = new Map<string, number>() // `${classId}:${day}:${lessonId}` -> hisob
  const teacherDayCount = new Map<string, number>() // `${teacherId}:${day}` -> hisob
  const teacherWeekCount = new Map<string, number>() // `${teacherId}` -> jami
  /** Har sinf kuniga nechta dars tuzilganini hisobi (maxLessonsPerClassDay cheklovi uchun) */
  const classDayLessonCount = new Map<string, number>() // `${classId}:${day}` -> hisob

  const canPlace = (s: Session, d: number, start: number): boolean => {
    if (start + s.length - 1 > maxP) return false
    // 1) O'qituvchining kunlik sig'imi (dailyCapacity) va haftalik normasi (weeklyMax)
    for (const tid of s.teacherIds) {
      const te = teacherById.get(tid)
      if (!te) return false
      const addedByThis = s.length
      // Kunlik sig'im
      const dayCnt = teacherDayCount.get(`${tid}:${d}`) ?? 0
      if (te.dailyCapacity > 0 && dayCnt + addedByThis > te.dailyCapacity) return false
      // Haftalik norma
      const weekCnt = teacherWeekCount.get(tid) ?? 0
      if (te.weeklyMax > 0 && weekCnt + addedByThis > te.weeklyMax) return false
    }
    // 2) Dars kunlik limiti (maxPerDay) — har sinf uchun alohida tekshiriladi
    if (s.maxPerDay > 0) {
      for (const cid of s.classIds) {
        const cnt = classLessonDayCount.get(`${cid}:${d}:${s.lessonId}`) ?? 0
        // Hozirgi sessiya length ta slot egallaydi — birinchi kelgan session uchun cnt=0 bo'ladi
        if (cnt + s.length > s.maxPerDay) return false
      }
    }
    // 2a) Sinf kuniga maksimal dars (yangi — "6 soatdan ko'p dars tuzilmasin")
    if (maxLessonsPerClassDay > 0) {
      for (const cid of s.classIds) {
        const dayLessons = classDayLessonCount.get(`${cid}:${d}`) ?? 0
        if (dayLessons + s.length > maxLessonsPerClassDay) return false
      }
    }
    // 3) Har slot bo'yicha standart tekshiruvlar
    for (let k = 0; k < s.length; k++) {
      const p = start + k
      for (const cid of s.classIds) {
        if (!classAllowed.get(cid)?.has(d * 100 + p)) return false
        if (classBusy.has(key(cid, d, p))) return false
      }
      for (const tid of s.teacherIds) {
        if (!teacherAllowed(tid, d, p)) return false
        if (teacherBusy.has(key(tid, d, p))) return false
      }
      if (!subjectAllowed(s.subjectId, d, p)) return false
    }
    return true
  }

  const pickRoom = (s: Session, d: number, start: number): { ok: boolean; roomId?: string } => {
    if (!considerRooms || rooms.length === 0) return { ok: true, roomId: undefined }
    const periods = Array.from({ length: s.length }, (_, k) => start + k)
    const free = (rid: string) =>
      periods.every((p) => !roomBusy.has(key(rid, d, p))) &&
      rooms.find((r) => r.id === rid) &&
      periods.every((p) => rooms.find((r) => r.id === rid)?.availability?.[d]?.[p - 1] ?? true)

    if (s.fixedRoomId) {
      return free(s.fixedRoomId) ? { ok: true, roomId: s.fixedRoomId } : { ok: false }
    }
    const candidates = rooms.filter(
      (r) =>
        (!s.requiredRoomType || r.type === s.requiredRoomType) &&
        r.capacity >= s.studentCount &&
        free(r.id),
    )
    if (candidates.length > 0) return { ok: true, roomId: candidates[0].id }
    // Talab qilingan tur bo'lmasa — xonasiz joylashtirishga ruxsat (soft)
    if (s.requiredRoomType) return { ok: false }
    return { ok: true, roomId: undefined }
  }

  const occupy = (pl: Placement, on: boolean) => {
    const delta = on ? 1 : -1
    for (let k = 0; k < pl.session.length; k++) {
      const p = pl.start + k
      for (const cid of pl.session.classIds) toggle(classBusy, key(cid, pl.day, p), on)
      for (const tid of pl.session.teacherIds) toggle(teacherBusy, key(tid, pl.day, p), on)
      if (pl.roomId) toggle(roomBusy, key(pl.roomId, pl.day, p), on)
    }
    for (const cid of pl.session.classIds) {
      // Fan kuniga nechta — tarqatish uchun
      const sk = `${cid}:${pl.day}:${pl.session.subjectId}`
      subjPerDay.set(sk, (subjPerDay.get(sk) ?? 0) + delta)
      // Dars kuniga nechta — maxPerDay cheklovi uchun (length bilan hisob)
      const lk = `${cid}:${pl.day}:${pl.session.lessonId}`
      classLessonDayCount.set(lk, (classLessonDayCount.get(lk) ?? 0) + delta * pl.session.length)
      // Sinf kunlik umumiy dars hisobi (maxLessonsPerClassDay uchun)
      const dk = `${cid}:${pl.day}`
      classDayLessonCount.set(dk, (classDayLessonCount.get(dk) ?? 0) + delta * pl.session.length)
    }
    for (const tid of pl.session.teacherIds) {
      // O'qituvchi kunlik hisobi (sig'im uchun)
      const dk = `${tid}:${pl.day}`
      teacherDayCount.set(dk, (teacherDayCount.get(dk) ?? 0) + delta * pl.session.length)
      // O'qituvchi haftalik hisobi (norma uchun)
      teacherWeekCount.set(tid, (teacherWeekCount.get(tid) ?? 0) + delta * pl.session.length)
    }
  }

  // Joylashuv sifatini baholovchi (kichikroq = yaxshiroq)
  //  - og'ir fan ertalab
  //  - shu fan shu kuni takrorlanmasin (spread)
  //  - sinf va o'qituvchi uchun qo'shni band — bo'shliq (oyna) kamayadi
  //  - ketma-ket kunlarda bir dars qaytarilmasin — "o'quvchi charchamasin"
  //  - juda chet slotlardan (1 yoki oxirgi) ozroq qoching — tarbiyaviy soat
  const slotCost = (s: Session, d: number, start: number): number => {
    let cost = 0
    // Og'ir fan kech soatlarda — jarima
    if (s.weight >= 7 && start >= 5) cost += (start - 4) * morningWeight
    // Og'ir fan juda erta (1-soat) — kichik jarima
    if (s.weight >= 8 && start === 1) cost += 1
    // Yengil fanni ertalabga qo'ymaslik — kichik jarima (teskari rag'bat)
    if (s.weight <= 3 && start <= 2 && morningWeight > 0) cost += 0.5
    // Shu fan shu kuni allaqachon bo'lsa — tarqatish uchun jarima
    if (spreadDays) {
      for (const cid of s.classIds) {
        const cnt = subjPerDay.get(`${cid}:${d}:${s.subjectId}`) ?? 0
        if (cnt > 0) cost += spreadWeight * cnt
      }
      // AQLLI: shu dars (lessonId) kecha ham bo'lgan bo'lsa — ketma-ket kun bo'lmasligi uchun jarima
      for (const cid of s.classIds) {
        const yesterdayCnt = classLessonDayCount.get(`${cid}:${d - 1}:${s.lessonId}`) ?? 0
        if (yesterdayCnt > 0) cost += spreadWeight * 0.5
        const tomorrowCnt = classLessonDayCount.get(`${cid}:${d + 1}:${s.lessonId}`) ?? 0
        if (tomorrowCnt > 0) cost += spreadWeight * 0.5
      }
    }
    // Sinf uchun bo'shliqni kamaytirish: shu kuni qo'shni band slot bo'lsa — rag'bat
    if (minimizeGaps) {
      for (const cid of s.classIds) {
        const adj =
          classBusy.has(key(cid, d, start - 1)) || classBusy.has(key(cid, d, start + s.length))
        if (adj) cost -= gapWeight
      }
      // O'qituvchining ham bo'shligi — o'qituvchi dars ketma-ket bo'lsa yaxshi
      for (const tid of s.teacherIds) {
        const adjT =
          teacherBusy.has(key(tid, d, start - 1)) || teacherBusy.has(key(tid, d, start + s.length))
        if (adjT) cost -= gapWeight * 0.75
      }
    }
    // Oxirgi slotlar: og'ir fan bo'lmasa ham, oxirgi slot biroz past baholanadi
    if (start + s.length - 1 >= maxP - 1) cost += 0.3
    return cost
  }

  // --- Qiyinlikka qarab tartiblash (Most Constrained Variable first) ---
  //  - oz slotga sig'adigan sessiyalar oldin (kam domen)
  //  - uzun (length=2) oldin
  //  - ko'p sinfli dars oldin (ko'p qiyinchilik)
  //  - kam vaqtli o'qituvchi (teacher.weeklyMax kichik) oldin
  //  - og'ir fan oldin
  const staticDomain = (s: Session): number => {
    let n = 0
    for (let d = 0; d < days; d++)
      for (let p = 1; p + s.length - 1 <= maxP; p++) {
        let ok = true
        for (const cid of s.classIds) if (!classAllowed.get(cid)?.has(d * 100 + p)) ok = false
        if (ok) n++
      }
    return n
  }
  const teacherLoadRatio = (s: Session): number => {
    // Qanchalik to'liq? (weeklyMax ga nisbatan shu lesson ulushi) — ko'p yuklangan o'qituvchi birinchi
    let max = 0
    for (const tid of s.teacherIds) {
      const t = teacherById.get(tid)
      if (t && t.weeklyMax > 0) max = Math.max(max, 1 / t.weeklyMax)
    }
    return max
  }
  sessions.sort((a, b) => {
    const da = staticDomain(a)
    const db = staticDomain(b)
    if (da !== db) return da - db
    if (a.length !== b.length) return b.length - a.length
    if (a.classIds.length !== b.classIds.length) return b.classIds.length - a.classIds.length
    const ta = teacherLoadRatio(a)
    const tb = teacherLoadRatio(b)
    if (ta !== tb) return tb - ta
    return b.weight - a.weight
  })

  // --- Greedy konstruksiya ---
  const placements: Placement[] = []
  const unplaced: Session[] = []
  onProgress?.(5, 'Joylashtirish boshlandi...')

  // --- Avval qulflangan (pinned) darslarni joylashtiramiz ---
  // Lesson.pinned[] bo'sh bo'lmagan darslarning birinchi sessiyalari shu slot'larga tushadi,
  // keyin boshqa sessiyalar ularni band qilib qoladi.
  const pinnedMap = new Map<string, Placement[]>() // lessonId -> [{day,slot}, ...]
  for (const l of lessons) {
    if (l.pinned && l.pinned.length > 0) {
      pinnedMap.set(
        l.id,
        l.pinned.map((p) => ({ session: null as unknown as Session, day: p.day, start: p.slot, roomId: l.roomId })),
      )
    }
  }
  // Pinned joylarini oldinroq band qilish uchun — sessiyalarni lessonId bo'yicha tartiblab oldiga olamiz
  const sessionsByLesson = new Map<string, Session[]>()
  for (const s of sessions) {
    const arr = sessionsByLesson.get(s.lessonId) ?? []
    arr.push(s)
    sessionsByLesson.set(s.lessonId, arr)
  }
  for (const [lid, pins] of pinnedMap) {
    const sess = sessionsByLesson.get(lid) ?? []
    for (let i = 0; i < Math.min(pins.length, sess.length); i++) {
      const s = sess[i]
      const d = pins[i].day
      const p = pins[i].start
      if (canPlace(s, d, p)) {
        const room = pickRoom(s, d, p)
        if (room.ok) {
          const pl: Placement = { session: s, day: d, start: p, roomId: room.roomId }
          placements.push(pl)
          occupy(pl, true)
          // Shu sessiyani oddiy loop'da qayta joylashtirmaslik uchun belgi
          ;(s as unknown as { _pinned?: boolean })._pinned = true
        }
      }
    }
  }

  // Joriy placements'dan to'liq TimetableVersion yig'ish (yakuniy natija + best-so-far uchun)
  const assemble = (): TimetableVersion => {
    const entries: TimetableEntry[] = []
    for (const pl of placements) {
      const pinned = (pl.session as unknown as { _pinned?: boolean })._pinned === true
      for (let k = 0; k < pl.session.length; k++) {
        const slot = pl.start + k
        for (const cid of pl.session.classIds) {
          entries.push({
            id: `${pl.session.id}_${cid}_${slot}`,
            lessonId: pl.session.lessonId,
            classId: cid,
            teacherId: pl.session.teacherIds[0],
            teacher2Id: pl.session.teacherIds[1],
            roomId: pl.roomId,
            day: pl.day,
            slot,
            ...(pinned ? { locked: true } : {}),
          })
        }
      }
    }
    return {
      id: 'tt_' + Date.now().toString(36),
      name: `Jadval ${new Date().toLocaleString('uz')}`,
      createdAt: new Date().toISOString(),
      seed,
      entries,
      stats: {
        placed: placements.length,
        unplaced: sessions.length - placements.length,
        hardViolations: countHardViolations(entries),
        softPenalty: computeSoftPenalty(placements, teacherById, classById, days),
        teacherGaps: computeTeacherGaps(placements, teachers, days),
      },
    }
  }

  const snapEvery = Math.max(1, Math.floor(sessions.length / 5))
  sessions.forEach((s, i) => {
    // Pinned sessiyalar yuqorida joylashtirilgan — qayta tegmaymiz
    if ((s as unknown as { _pinned?: boolean })._pinned) {
      if (i > 0 && i % snapEvery === 0) onSnapshot?.(assemble())
      return
    }
    let best: { d: number; p: number; cost: number; roomId?: string } | null = null
    for (let d = 0; d < days; d++) {
      for (let p = 1; p + s.length - 1 <= maxP; p++) {
        if (!canPlace(s, d, p)) continue
        const room = pickRoom(s, d, p)
        if (!room.ok) continue
        const cost = slotCost(s, d, p) + rng() * 0.5
        if (!best || cost < best.cost) best = { d, p, cost, roomId: room.roomId }
      }
    }
    if (best) {
      const pl: Placement = { session: s, day: best.d, start: best.p, roomId: best.roomId }
      placements.push(pl)
      occupy(pl, true)
    } else {
      unplaced.push(s)
    }
    if (i % 20 === 0) onProgress?.(5 + (i / sessions.length) * 60, `Joylashtirilmoqda... ${i}/${sessions.length}`)
    if (i > 0 && i % snapEvery === 0) onSnapshot?.(assemble())
  })

  onSnapshot?.(assemble()) // greedy natijasi — ejection sekin bo'lsa ham best-so-far bor

  // --- Local search: joylashmaganlarni ejection bilan joylashtirish ---
  onProgress?.(70, 'Yaxshilash...')
  const tryPlaceWithEjection = (s: Session): boolean => {
    for (let d = 0; d < days; d++) {
      for (let p = 1; p + s.length - 1 <= maxP; p++) {
        if (start_conflictCount(s, d, p) === 1) {
          // bitta to'siq bor — uni ko'chirishga urinamiz
          const blocker = findSingleBlocker(s, d, p)
          if (blocker) {
            occupy(blocker, false)
            if (canPlace(s, d, p)) {
              const room = pickRoom(s, d, p)
              if (room.ok) {
                // Avval yangi sessiyani band qilamiz — keyin to'siqni ko'chiramiz.
                // Aks holda relocate to'siqni aynan shu slotga/xonaga qaytarib qo'yishi mumkin.
                const pl: Placement = { session: s, day: d, start: p, roomId: room.roomId }
                occupy(pl, true)
                if (relocate(blocker)) {
                  placements.push(pl)
                  return true
                }
                occupy(pl, false)
              }
            }
            occupy(blocker, true) // qaytarish
          }
        }
      }
    }
    return false
  }

  function start_conflictCount(s: Session, d: number, start: number): number {
    if (start + s.length - 1 > maxP) return 99
    const blockers = new Set<string>()
    for (let k = 0; k < s.length; k++) {
      const p = start + k
      for (const cid of s.classIds) {
        if (!classAllowed.get(cid)?.has(d * 100 + p)) return 99
        const pl = placements.find((x) => occupies(x, cid, d, p))
        if (pl) blockers.add(pl.session.id)
      }
      for (const tid of s.teacherIds) {
        if (!teacherAllowed(tid, d, p)) return 99
        const pl = placements.find((x) => x.session.teacherIds.includes(tid) && occupiesSlot(x, d, p))
        if (pl) blockers.add(pl.session.id)
      }
    }
    return blockers.size
  }

  function findSingleBlocker(s: Session, d: number, start: number): Placement | null {
    const ids = new Set<string>()
    for (let k = 0; k < s.length; k++) {
      const p = start + k
      for (const cid of s.classIds) {
        const pl = placements.find((x) => occupies(x, cid, d, p))
        if (pl) ids.add(pl.session.id)
      }
      for (const tid of s.teacherIds) {
        const pl = placements.find((x) => x.session.teacherIds.includes(tid) && occupiesSlot(x, d, p))
        if (pl) ids.add(pl.session.id)
      }
    }
    if (ids.size !== 1) return null
    const id = [...ids][0]
    return placements.find((x) => x.session.id === id) ?? null
  }

  function occupies(pl: Placement, cid: string, d: number, p: number): boolean {
    return pl.session.classIds.includes(cid) && occupiesSlot(pl, d, p)
  }
  function occupiesSlot(pl: Placement, d: number, p: number): boolean {
    return pl.day === d && p >= pl.start && p < pl.start + pl.session.length
  }
  function relocate(pl: Placement): boolean {
    for (let d = 0; d < days; d++) {
      for (let p = 1; p + pl.session.length - 1 <= maxP; p++) {
        if (d === pl.day && p === pl.start) continue
        if (canPlace(pl.session, d, p)) {
          const room = pickRoom(pl.session, d, p)
          if (room.ok) {
            pl.day = d
            pl.start = p
            pl.roomId = room.roomId
            occupy(pl, true)
            return true
          }
        }
      }
    }
    return false
  }

  // 1-bosqich: 1 to'siqli ejection (asl)
  const stillUnplaced: Session[] = []
  for (const s of unplaced) {
    if (!tryPlaceWithEjection(s)) stillUnplaced.push(s)
  }

  // 2-bosqich: 2-chuqur ejection (chain). To'siqni ko'chirsak uning joyi band bo'lishi mumkin —
  // undagi to'siqni ham ko'chirishga urinadi. Katta loyihalar uchun kritik.
  const tryPlaceWithChainEjection = (s: Session, depth: number): boolean => {
    if (depth <= 0) return false
    for (let d = 0; d < days; d++) {
      for (let p = 1; p + s.length - 1 <= maxP; p++) {
        const n = start_conflictCount(s, d, p)
        if (n === 99 || n > 2) continue
        if (n === 0) {
          if (canPlace(s, d, p)) {
            const room = pickRoom(s, d, p)
            if (room.ok) {
              const pl: Placement = { session: s, day: d, start: p, roomId: room.roomId }
              placements.push(pl); occupy(pl, true)
              return true
            }
          }
          continue
        }
        // 1-2 ta to'siq — ularni ko'chirishga urinamiz
        const blockers = findBlockers(s, d, p)
        if (blockers.length > depth) continue
        // Blockerlarni vaqtincha olib tashlaymiz
        for (const b of blockers) occupy(b, false)
        if (canPlace(s, d, p)) {
          const room = pickRoom(s, d, p)
          if (room.ok) {
            const pl: Placement = { session: s, day: d, start: p, roomId: room.roomId }
            occupy(pl, true)
            // Blockerlarni boshqa joyga ko'chiramiz (biror'tasi muvaffaqiyatsiz bo'lsa — undo)
            const relocated: Placement[] = []
            let allOk = true
            for (const b of blockers) {
              if (relocate(b)) relocated.push(b)
              else { allOk = false; break }
            }
            if (allOk) {
              placements.push(pl)
              return true
            }
            // Undo: joylangan blockerlarni avvalgi joyiga qaytarish qiyin — oddiyroq, placementni bekor qilib
            // blockerlarni asl joyiga qo'yamiz
            occupy(pl, false)
            for (const r of relocated) occupy(r, false)
          }
        }
        // Blockerlarni qaytarish
        for (const b of blockers) occupy(b, true)
      }
    }
    return false
  }

  function findBlockers(s: Session, d: number, start: number): Placement[] {
    const ids = new Set<string>()
    for (let k = 0; k < s.length; k++) {
      const p = start + k
      for (const cid of s.classIds) {
        const pl = placements.find((x) => occupies(x, cid, d, p))
        if (pl) ids.add(pl.session.id)
      }
      for (const tid of s.teacherIds) {
        const pl = placements.find((x) => x.session.teacherIds.includes(tid) && occupiesSlot(x, d, p))
        if (pl) ids.add(pl.session.id)
      }
    }
    return [...ids].map((id) => placements.find((x) => x.session.id === id)!).filter(Boolean)
  }

  const stillUnplaced2: Session[] = []
  for (const s of stillUnplaced) {
    if (!tryPlaceWithChainEjection(s, 2)) stillUnplaced2.push(s)
  }

  // 3-bosqich: 3-chuqur ejection chain (eng qiyin holatlar)
  for (const s of stillUnplaced2) {
    tryPlaceWithChainEjection(s, 3)
  }

  onProgress?.(95, 'Yakunlanmoqda...')
  onProgress?.(100, 'Tayyor!')
  return assemble()
}

function toggle(set: Set<string>, k: string, on: boolean) {
  if (on) set.add(k)
  else set.delete(k)
}

function computeTeacherGaps(
  placements: Placement[],
  teachers: { id: string }[],
  days: number,
): number {
  let gaps = 0
  for (const t of teachers) {
    for (let d = 0; d < days; d++) {
      const periods = placements
        .filter((pl) => pl.session.teacherIds.includes(t.id) && pl.day === d)
        .flatMap((pl) => Array.from({ length: pl.session.length }, (_, k) => pl.start + k))
      if (periods.length < 2) continue
      const min = Math.min(...periods)
      const max = Math.max(...periods)
      gaps += max - min + 1 - periods.length
    }
  }
  return gaps
}

// ============================================================
// Yaxshilash — mavjud jadvalni buzmay optimallashtirish (in-place local search).
// O'qituvchi/sinf oynalarini (darchalarni) kamaytiradi, qat'iy cheklovlarni
// buzmaydi; qulflangan va ketma-ket (juft) darslar joyida qoladi.
// ============================================================
export function improveTimetable(
  project: Project,
  existing: TimetableEntry[],
  opts: GenerateOptions = {},
  onProgress?: ProgressFn,
  onSnapshot?: SnapshotFn,
): TimetableVersion {
  const rng = mulberry32(opts.seed ?? 20260)
  const { school, classes, teachers, lessons } = project
  const days = school.workDays
  const maxP = school.maxLessonsPerDay
  const classById = new Map(classes.map((c) => [c.id, c]))
  const teacherById = new Map(teachers.map((t) => [t.id, t]))
  const lessonById = new Map(lessons.map((l) => [l.id, l]))

  const entries = existing.map((e) => ({ ...e }))

  const classAllowed = (cid: string, d: number, p: number) => {
    const c = classById.get(cid)
    if (!c) return false
    const shift = school.shifts[c.shiftIndex - 1] ?? school.shifts[0]
    const shiftOk = shift?.grid?.[p - 1]?.[d] ?? true
    const availOk = c.availability?.[d]?.[p - 1] ?? true
    return shiftOk && availOk
  }
  const teacherAllowed = (tid: string, d: number, p: number) => {
    const t = teacherById.get(tid)
    if (!t) return false
    if (t.methodicalDay === d) return false
    return t.availability?.[d]?.[p - 1] ?? true
  }
  const free = (e: TimetableEntry, d: number, p: number): boolean => {
    for (const o of entries) {
      if (o.id === e.id || o.day !== d || o.slot !== p || !weekOverlap(o.week, e.week)) continue
      if (o.classId === e.classId) return false
      if (e.teacherId && (o.teacherId === e.teacherId || o.teacher2Id === e.teacherId)) return false
      if (e.teacher2Id && (o.teacherId === e.teacher2Id || o.teacher2Id === e.teacher2Id)) return false
      if (e.roomId && o.roomId === e.roomId) return false
    }
    for (const tid of [e.teacherId, e.teacher2Id]) if (tid && !teacherAllowed(tid, d, p)) return false
    if (!classAllowed(e.classId, d, p)) return false
    // Dars kunlik limiti (maxPerDay) — e'ni d-kunga ko'chirsak buzilmasligi kerak
    const lesson = lessonById.get(e.lessonId)
    if (lesson && lesson.maxPerDay > 0) {
      // e hozir d-kunda bolsa, hisobdan tashqari qoldiramiz
      const sameDayCnt = entries.filter(
        (o) => o.lessonId === e.lessonId && o.classId === e.classId && o.day === d && o.id !== e.id,
      ).length
      if (sameDayCnt + 1 > lesson.maxPerDay) return false
    }
    // O'qituvchining kunlik sig'imi
    for (const tid of [e.teacherId, e.teacher2Id]) {
      if (!tid) continue
      const te = teacherById.get(tid)
      if (!te || te.dailyCapacity <= 0) continue
      const dayCnt = new Set(
        entries
          .filter((o) => (o.teacherId === tid || o.teacher2Id === tid) && o.day === d && o.id !== e.id)
          .map((o) => o.slot),
      ).size
      if (dayCnt + 1 > te.dailyCapacity) return false
    }
    return true
  }

  const gapOf = (slots: number[]) => {
    if (slots.length < 2) return 0
    let mn = 99
    let mx = 0
    for (const s of slots) {
      if (s < mn) mn = s
      if (s > mx) mx = s
    }
    return mx - mn + 1 - slots.length
  }
  const classDayGap = (cid: string, d: number) =>
    gapOf(entries.filter((e) => e.classId === cid && e.day === d).map((e) => e.slot))
  const teacherDayGap = (tid: string | undefined, d: number) =>
    tid ? gapOf(entries.filter((e) => (e.teacherId === tid || e.teacher2Id === tid) && e.day === d).map((e) => e.slot)) : 0

  const movable = entries.filter((e) => !e.locked && !lessonById.get(e.lessonId)?.consecutive)
  const N = Math.min(4000, Math.max(400, movable.length * 25))

  const totalRequired = lessons.reduce((a, l) => a + l.hoursPerWeek * Math.max(1, l.classIds.length), 0)
  // Joriy entries'dan TimetableVersion yig'ish (yakuniy + best-so-far). entries nusxalanadi.
  const buildVersion = (): TimetableVersion => {
    const cids = new Set(entries.map((e) => e.classId))
    let soft = 0
    for (const cid of cids) for (let d = 0; d < days; d++) soft += classDayGap(cid, d) * 2
    let gaps = 0
    for (const t of teachers) for (let d = 0; d < days; d++) gaps += teacherDayGap(t.id, d)
    return {
      id: 'tt_' + Date.now().toString(36),
      name: 'Ishchi jadval',
      createdAt: new Date().toISOString(),
      entries: entries.map((e) => ({ ...e })),
      stats: {
        placed: entries.length,
        unplaced: Math.max(0, totalRequired - entries.length),
        hardViolations: countHardViolations(entries),
        softPenalty: soft,
        teacherGaps: gaps,
      },
    }
  }

  const snapEvery = Math.max(50, Math.floor(N / 10))
  onProgress?.(5, 'Yaxshilash boshlandi...')

  // Simulated Annealing — avval best-swap, keyin ba'zan yomonroq ham qabul qilish bilan
  // optima'dan chiqishga imkon beradi. T boshlanishda yuqori, oxirgacha sovitiladi.
  const T0 = 3.0      // boshlang'ich temperatura — kattaroqda eratta chiqadi
  const Tmin = 0.01   // minimal temperatura — oxirida deyarli greedy
  const coolRate = Math.pow(Tmin / T0, 1 / N)
  let T = T0
  // Eng yaxshi topilgan konfiguratsiya (SA tasodifiy katta sakrashlardan keyin yomonlashishi mumkin)
  let bestEntries = entries.map((e) => ({ ...e }))
  let bestGaps = (() => { let g = 0; for (const t of teachers) for (let d = 0; d < days; d++) g += teacherDayGap(t.id, d); return g })()

  for (let it = 0; it < N; it++) {
    if (it % 120 === 0) onProgress?.(5 + (it / N) * 92, `Yaxshilanmoqda... ${Math.round((it / N) * 100)}%`)
    if (it > 0 && it % snapEvery === 0) onSnapshot?.(buildVersion())
    if (movable.length === 0) break

    const e = movable[Math.floor(rng() * movable.length)]
    if (e.locked) { T *= coolRate; continue }
    const od = e.day
    const op = e.slot
    const t1 = e.teacherId
    const t2 = e.teacher2Id
    const affected = (d2: number) => {
      const ds = od === d2 ? [od] : [od, d2]
      let s = 0
      for (const dd of ds) s += classDayGap(e.classId, dd) + teacherDayGap(t1, dd) + teacherDayGap(t2, dd)
      return s
    }
    const subjOfE = lessonById.get(e.lessonId)?.subjectId

    // Birinchi N/3 iteratsiyada SA (tasodifiy) — qolganida greedy best-swap
    if (it < N * 0.6) {
      // SA: tasodifiy slotni tanlab, delta ni hisoblab, qabul qilish ehtimoli bilan
      const d2 = Math.floor(rng() * days)
      const p2 = 1 + Math.floor(rng() * maxP)
      if (d2 === od && p2 === op) { T *= coolRate; continue }
      // Spread saqlash: shu fan boshqa kuni allaqachon bo'lsa — bu swap'ni o'tkazamiz
      if (
        d2 !== od && subjOfE &&
        entries.some(
          (o) => o.id !== e.id && o.classId === e.classId && o.day === d2 && lessonById.get(o.lessonId)?.subjectId === subjOfE,
        )
      ) { T *= coolRate; continue }
      if (!free(e, d2, p2)) { T *= coolRate; continue }
      const before = affected(d2)
      e.day = d2; e.slot = p2
      const after = affected(d2)
      const delta = after - before
      // Qabul qilish: delta < 0 → albatta; delta >= 0 → ehtimol exp(-delta/T)
      const accept = delta < 0 || rng() < Math.exp(-delta / Math.max(T, 0.001))
      if (!accept) { e.day = od; e.slot = op }
    } else {
      // Greedy phase — hamma mumkin bo'lgan slot'lardan eng yaxshisini topish
      let best: { d: number; p: number } | null = null
      let bestDelta = 0
      for (let d2 = 0; d2 < days; d2++) {
        if (
          d2 !== od && subjOfE &&
          entries.some(
            (o) => o.id !== e.id && o.classId === e.classId && o.day === d2 && lessonById.get(o.lessonId)?.subjectId === subjOfE,
          )
        ) continue
        for (let p2 = 1; p2 <= maxP; p2++) {
          if (d2 === od && p2 === op) continue
          if (!free(e, d2, p2)) continue
          const before = affected(d2)
          e.day = d2; e.slot = p2
          const after = affected(d2)
          e.day = od; e.slot = op
          const delta = after - before
          if (delta < bestDelta) { bestDelta = delta; best = { d: d2, p: p2 } }
        }
      }
      if (best) { e.day = best.d; e.slot = best.p }
    }

    // Eng yaxshi topilgan konfiguratsiyani eslab qolamiz (SA tasodifiy yomonroq bo'lsa qaytaramiz)
    if (it % 50 === 0) {
      let g = 0
      for (const t of teachers) for (let d = 0; d < days; d++) g += teacherDayGap(t.id, d)
      if (g < bestGaps) { bestGaps = g; bestEntries = entries.map((x) => ({ ...x })) }
    }
    T *= coolRate
  }

  // SA oxirida eng yaxshi topilgan natijani tiklaymiz (agar hozirgi undan yomonroq bo'lsa)
  let finalGaps = 0
  for (const t of teachers) for (let d = 0; d < days; d++) finalGaps += teacherDayGap(t.id, d)
  if (finalGaps > bestGaps) {
    entries.length = 0
    for (const be of bestEntries) entries.push(be)
  }

  onProgress?.(100, 'Tayyor!')
  return buildVersion()
}

function computeSoftPenalty(
  placements: Placement[],
  _tb: Map<string, any>,
  _cb: Map<string, any>,
  days: number,
): number {
  let pen = 0
  // Sinf bo'shliqlari
  const classIds = new Set<string>()
  placements.forEach((pl) => pl.session.classIds.forEach((c) => classIds.add(c)))
  for (const cid of classIds) {
    for (let d = 0; d < days; d++) {
      const periods = placements
        .filter((pl) => pl.session.classIds.includes(cid) && pl.day === d)
        .flatMap((pl) => Array.from({ length: pl.session.length }, (_, k) => pl.start + k))
      if (periods.length < 2) continue
      const min = Math.min(...periods)
      const max = Math.max(...periods)
      pen += (max - min + 1 - periods.length) * 2
    }
  }
  return pen
}
