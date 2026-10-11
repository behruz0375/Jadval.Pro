import { AlertTriangle, CheckCircle2, UserX, Users, DoorOpen, CalendarX } from 'lucide-react'
import { useProject } from '@/store/project'
import { DAYS_SHORT } from '@/constants'
import { weekOverlap } from '@/utils'
import { useT } from '@/i18n'
import type { LucideIcon } from 'lucide-react'
import type { WeekType } from '@/types'

interface Conflict {
  type: string
  icon: LucideIcon
  text: string
}

export function ConflictsPage() {
  const t = useT()
  const project = useProject((s) => s.project)
  const { timetables, teachers, classes, rooms, subjects, lessons, school } = project
  const version = timetables[timetables.length - 1] ?? null

  if (!version) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-muted">
        <div>
          <AlertTriangle size={40} className="mx-auto mb-2 text-accent/60" />
          <p>{t("Avval «Taqsimot» bo'limida jadval tuzing.")}</p>
        </div>
      </div>
    )
  }

  const conflicts: Conflict[] = []
  const tName = (id: string) => teachers.find((t) => t.id === id)?.short ?? id
  const cName = (id: string) => classes.find((c) => c.id === id)?.name ?? id
  const rName = (id: string) => rooms.find((r) => r.id === id)?.short ?? id
  const sName = (lid: string) => {
    const l = lessons.find((x) => x.id === lid)
    return subjects.find((s) => s.id === l?.subjectId)?.name ?? '?'
  }
  const slot = (d: number, p: number) => `${DAYS_SHORT[d]} ${p}-${t('dars')}`

  // Double-booking tekshiruvi.
  // Birlashgan sinf darsi bitta lessonId bilan bir nechta entry yaratadi —
  // bu konflikt EMAS, shuning uchun faqat HAR XIL darslar (lessonId) sanaladi.
  // Surat (1-hafta) va maxraj (2-hafta) bir slotda bo'lsa — to'qnashuv EMAS.
  type Slot = { lessonId: string; week?: WeekType }
  const teacherMap = new Map<string, Slot[]>()
  const classMap = new Map<string, Slot[]>()
  const roomMap = new Map<string, Slot[]>()
  const put = (m: Map<string, Slot[]>, k: string, lessonId: string, week?: WeekType) =>
    (m.get(k) ?? m.set(k, []).get(k)!).push({ lessonId, week })

  // Haftasi to'qnashadigan HAR XIL darslar soni
  const clash = (arr: Slot[]): number => {
    const bad = new Set<string>()
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++)
        if (arr[i].lessonId !== arr[j].lessonId && weekOverlap(arr[i].week, arr[j].week)) {
          bad.add(arr[i].lessonId)
          bad.add(arr[j].lessonId)
        }
    return bad.size
  }

  version.entries.forEach((e) => {
    for (const tid of [e.teacherId, e.teacher2Id]) {
      if (tid) put(teacherMap, `${tid}:${e.day}:${e.slot}`, e.lessonId, e.week)
    }
    put(classMap, `${e.classId}:${e.day}:${e.slot}`, e.lessonId, e.week)
    if (e.roomId) put(roomMap, `${e.roomId}:${e.day}:${e.slot}`, e.lessonId, e.week)
  })

  for (const [k, arr] of teacherMap) {
    const n = clash(arr)
    if (n > 1) {
      const [tid, d, p] = k.split(':')
      conflicts.push({ type: 'teacher', icon: UserX, text: `${t("O'qituvchi")} ${tName(tid)} — ${slot(+d, +p)}${t('da')} ${n} ${t('ta dars')}` })
    }
  }
  for (const [k, arr] of classMap) {
    const n = clash(arr)
    if (n > 1) {
      const [cid, d, p] = k.split(':')
      conflicts.push({ type: 'class', icon: Users, text: `${t('Sinf')} ${cName(cid)} — ${slot(+d, +p)}${t('da')} ${n} ${t('ta dars')}` })
    }
  }
  for (const [k, arr] of roomMap) {
    const n = clash(arr)
    if (n > 1) {
      const [rid, d, p] = k.split(':')
      conflicts.push({ type: 'room', icon: DoorOpen, text: `${t('Xona')} ${rName(rid)} — ${slot(+d, +p)}${t('da')} ${n} ${t('ta dars')}` })
    }
  }

  // Joylashmagan soatlar
  for (const l of lessons) {
    if (!l.subjectId || !l.teacher1Id || l.classIds.length === 0) continue
    for (const cid of l.classIds) {
      const placed = version.entries.filter((e) => e.lessonId === l.id && e.classId === cid).length
      if (placed < l.hoursPerWeek) {
        conflicts.push({
          type: 'unplaced',
          icon: CalendarX,
          text: `${sName(l.id)} (${cName(cid)}) — ${l.hoursPerWeek - placed}/${l.hoursPerWeek} ${t('soat joylashmadi')}`,
        })
      }
    }
  }

  // O'qituvchi kunlik sig'imi (ikkinchi o'qituvchi sifatida band bo'lganini ham hisoblaydi)
  for (const te of teachers) {
    for (let d = 0; d < school.workDays; d++) {
      const cnt = new Set(
        version.entries
          .filter((e) => (e.teacherId === te.id || e.teacher2Id === te.id) && e.day === d)
          .map((e) => e.slot),
      ).size
      if (cnt > te.dailyCapacity)
        conflicts.push({ type: 'cap', icon: AlertTriangle, text: `${te.short} — ${DAYS_SHORT[d]}: ${cnt} ${t('soat')} (${t("kunlik sig'im")} ${te.dailyCapacity})` })
    }
  }

  // Binolararo o'tish vaqti — tanaffus kam bo'lsa ogohlantirish
  const buildings = school.buildings ?? []
  const breakMin = school.breakMin ?? 5
  if (buildings.length >= 2) {
    const classBuilding = (cid: string) => classes.find((c) => c.id === cid)?.building ?? ''
    const buildingByName = (name: string) =>
      buildings.find((b) => b.name === name || b.short === name) ?? null

    for (const te of teachers) {
      for (let d = 0; d < school.workDays; d++) {
        const sortedSlots = version.entries
          .filter((e) => (e.teacherId === te.id || e.teacher2Id === te.id) && e.day === d)
          .sort((a, b) => a.slot - b.slot)
        for (let i = 1; i < sortedSlots.length; i++) {
          const prev = sortedSlots[i - 1]
          const cur = sortedSlots[i]
          if (cur.slot !== prev.slot + 1) continue
          const bPrev = buildingByName(classBuilding(prev.classId))
          const bCur = buildingByName(classBuilding(cur.classId))
          if (!bPrev || !bCur || bPrev.id === bCur.id) continue
          const transit = bPrev.transitTo?.[bCur.id] ?? bCur.transitTo?.[bPrev.id] ?? 0
          if (transit > breakMin) {
            conflicts.push({
              type: 'cap',
              icon: AlertTriangle,
              text: `${te.short} — ${DAYS_SHORT[d]} ${prev.slot}→${cur.slot}: ${bPrev.short || bPrev.name} → ${bCur.short || bCur.name} ${t("o'tish uchun")} ${transit} ${t('daqiqa, tanaffus')} ${breakMin}`,
            })
          }
        }
      }
    }
  }

  const byType = (type: string) => conflicts.filter((c) => c.type === type)
  const hard = conflicts.filter((c) => ['teacher', 'class', 'room'].includes(c.type))

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <AlertTriangle size={20} />
        </div>
        <h1 className="text-lg font-bold">{t('Konfliktlar va tekshiruv')}</h1>
      </div>

      {conflicts.length === 0 ? (
        <div className="card flex items-center gap-3 p-5 text-ok">
          <CheckCircle2 size={28} />
          <div>
            <div className="font-semibold">{t('Konflikt topilmadi')} 🎉</div>
            <div className="text-sm text-muted">{t("Jadval barcha qat'iy cheklovlarga mos.")}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Summary ok={hard.length === 0} label={t("Qat'iy konfliktlar")} value={hard.length} />
            <Summary ok={byType('unplaced').length === 0} label={t('Joylashmagan')} value={byType('unplaced').length} />
            <Summary ok={byType('cap').length === 0} label={t("Sig'im oshishi")} value={byType('cap').length} />
          </div>
          <div className="flex flex-col gap-2">
            {conflicts.map((c, i) => {
              const Icon = c.icon
              const danger = ['teacher', 'class', 'room'].includes(c.type)
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${danger ? 'border-danger/30 bg-danger/5' : 'border-warn/30 bg-warn/5'}`}
                >
                  <Icon size={16} className={danger ? 'text-danger' : 'text-warn'} />
                  <span>{c.text}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Summary({ ok, label, value }: { ok: boolean; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      {ok ? <CheckCircle2 className="text-ok" size={22} /> : <AlertTriangle className="text-danger" size={22} />}
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  )
}
