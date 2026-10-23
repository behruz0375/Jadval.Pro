import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Project,
  School,
  SchoolClass,
  Subject,
  Room,
  Teacher,
  Lesson,
  TimetableVersion,
  AvailabilityMatrix,
} from '@/types'
import { defaultProject } from '@/data/factories'
import { idbStorage } from './idbStorage'
import { APP_VERSION } from '@/constants'
import { uid } from '@/utils'
import { WORKING_NAME, rebuildTimetables } from '@/features/_shared/versions'

type Entity = 'classes' | 'subjects' | 'rooms' | 'teachers' | 'lessons'

interface ProjectState {
  project: Project
  dirty: boolean
  scope: string

  // Umumiy
  setProject: (p: Project) => void
  newProject: () => void
  markSaved: () => void
  switchScope: (newScope: string) => Promise<void>
  /** Scope'dagi loyihani butunlay o'chirish (admin'ning avvalgi "oqib ketgan" ma'lumotlarini tozalash uchun).
   *  Joriy scope o'chirilsa — defaultProject() yuklanadi. */
  resetScope: (scope: string) => Promise<void>
  /** Scope'da ma'lumot bormi (login o'zgartirishda boshqa mijozning ma'lumotini bosib ketmaslik uchun) */
  scopeExists: (scope: string) => Promise<boolean>
  /** Login o'zgarganda maktab ma'lumotini eski scope'dan yangisiga ko'chiradi (yo'qolib qolmasligi uchun) */
  renameScope: (from: string, to: string) => Promise<void>
  /** Scope'ga xavfsiz o'tish: joriy loyihani boshqa scope'ga saqlamaydi. */
  loadScope: (newScope: string) => Promise<void>

  // Maktab
  updateSchool: (patch: Partial<School>) => void
  setMaxLessonsPerDay: (n: number) => void
  /** O'quv kunlari soni (5/6): barcha ish vaqti matritsalari va navbat jadvallari yangi kunlar soniga moslanadi */
  setWorkDays: (n: number) => void
  /** Navbatni o'chiradi va sinflarning navbat raqamlarini to'g'rilaydi */
  removeShiftAt: (idx: number) => void

  // CRUD
  addClass: (c: SchoolClass) => void
  updateClass: (id: string, patch: Partial<SchoolClass>) => void
  removeClass: (id: string) => void

  addSubject: (s: Subject) => void
  updateSubject: (id: string, patch: Partial<Subject>) => void
  removeSubject: (id: string) => void

  addRoom: (r: Room) => void
  updateRoom: (id: string, patch: Partial<Room>) => void
  removeRoom: (id: string) => void

  addTeacher: (t: Teacher) => void
  updateTeacher: (id: string, patch: Partial<Teacher>) => void
  removeTeacher: (id: string) => void

  addLesson: (l: Lesson) => void
  updateLesson: (id: string, patch: Partial<Lesson>) => void
  removeLesson: (id: string) => void

  addMany: <T extends { id: string }>(entity: Entity, items: T[]) => void
  moveEntity: (entity: 'classes' | 'subjects' | 'rooms' | 'teachers', id: string, dir: -1 | 1) => void
  applyAvailabilityToAll: (
    target: 'classes' | 'subjects' | 'rooms' | 'teachers',
    matrix: AvailabilityMatrix,
  ) => void

  // Jadval versiyalari
  addTimetable: (v: TimetableVersion) => void
  /** Yangi tuzilgan (yoki yaxshilangan) jadvalni versiyalarga qo'shadi VA «Ishchi jadval»ga ham ko'chiradi —
   *  shunda Tahta, Umumiy, Konfliktlar, Hisobotlar... hammasi aynan shu jadvalni ko'rsatadi. */
  addGeneratedTimetable: (v: TimetableVersion) => void
  updateTimetable: (id: string, patch: Partial<TimetableVersion>) => void
  removeTimetable: (id: string) => void
}

export const useProject = create<ProjectState>()(
  persist(
    (set, get) => {
      const touch = (p: Partial<Project>) => (state: ProjectState) => ({
        project: { ...state.project, ...p },
        dirty: true,
      })

      return {
        project: defaultProject(),
        dirty: false,
        scope: '_default_',

        setProject: (project) => set({ project, dirty: false }),
        newProject: () => set({ project: defaultProject(), dirty: false }),
        switchScope: async (newScope: string) => {
          const state = get()
          const oldScope = state.scope
          if (oldScope === newScope) return
          if (oldScope) {
            await idbStorage.setItem(
              `jadvalpro-project-scope:${oldScope}`,
              JSON.stringify({ state: { project: state.project } }),
            )
          }
          let stored = await idbStorage.getItem(`jadvalpro-project-scope:${newScope}`)
          if (!stored && newScope !== '_default_') {
            const fallback = await idbStorage.getItem('jadvalpro-project-scope:_default_')
            if (fallback) {
              stored = fallback
              await idbStorage.removeItem('jadvalpro-project-scope:_default_')
            }
          }
          let project: Project
          if (stored) {
            try {
              const parsed = JSON.parse(stored as string)
              project = parsed?.state?.project ?? defaultProject()
              if (project.teachers) {
                project.teachers = project.teachers.map((t: any) => {
                  if (!Array.isArray(t.methodicalDays)) {
                    t.methodicalDays = t.methodicalDay != null && t.methodicalDay >= 0 ? [t.methodicalDay] : []
                    delete t.methodicalDay
                  }
                  return t
                })
              }
            } catch {
              project = defaultProject()
            }
          } else {
            project = defaultProject()
          }
          set({ project, scope: newScope, dirty: false })
        },
        resetScope: async (scope: string) => {
          await idbStorage.removeItem(`jadvalpro-project-scope:${scope}`)
          if (get().scope === scope) {
            set({ project: defaultProject(), dirty: false })
          }
        },
        scopeExists: async (scope: string) => (await idbStorage.getItem(`jadvalpro-project-scope:${scope}`)) != null,
        renameScope: async (from: string, to: string) => {
          if (from === to) return
          const cur = get()
          // Joriy scope bo'lsa — xotiradagi (eng yangi) loyiha ko'chiriladi
          const payload =
            cur.scope === from
              ? JSON.stringify({ state: { project: cur.project } })
              : ((await idbStorage.getItem(`jadvalpro-project-scope:${from}`)) as string | null)
          if (!payload) return
          if ((await idbStorage.getItem(`jadvalpro-project-scope:${to}`)) != null) return // boshqa mijoz ma'lumotini bosib ketmaymiz
          await idbStorage.setItem(`jadvalpro-project-scope:${to}`, payload)
          await idbStorage.removeItem(`jadvalpro-project-scope:${from}`)
          if (cur.scope === from) set({ scope: to })
        },
        /** Scope'ga xavfsiz o'tish: joriy xotira'dagi loyihani BOSHQA scope'ga yozmaydi.
         *  Faqat yangi scope'dan loyiha o'qiydi (yoki defaultProject). Admin'ning ma'lumotlari
         *  mijozning scope'iga ko'chib ketmasligi uchun ishlatiladi. */
        loadScope: async (newScope: string) => {
          const stored = await idbStorage.getItem(`jadvalpro-project-scope:${newScope}`)
          let project: Project
          if (stored) {
            try {
              const parsed = JSON.parse(stored as string)
              project = parsed?.state?.project ?? defaultProject()
            } catch {
              project = defaultProject()
            }
          } else {
            project = defaultProject()
          }
          set({ project, scope: newScope, dirty: false })
        },
        markSaved: () =>
          set((s) => ({
            dirty: false,
            project: {
              ...s.project,
              meta: { ...s.project.meta, savedAt: new Date().toISOString(), appVersion: APP_VERSION },
            },
          })),

        updateSchool: (patch) =>
          set((s) => touch({ school: { ...s.project.school, ...patch } })(s)),

        setWorkDays: (n) =>
          set((s) => {
            const p = s.project
            const lessonsPerDay = p.school.maxLessonsPerDay
            const resizeDays = (m: AvailabilityMatrix): AvailabilityMatrix =>
              Array.from({ length: n }, (_, d) =>
                m[d] ? m[d].slice() : new Array(m[0]?.length ?? lessonsPerDay).fill(true),
              )
            // navbat jadvali [dars][kun]: yangi kun oxirgi mavjud kunning qiymatini oladi
            const shifts = p.school.shifts.map((sh) => ({
              ...sh,
              grid: sh.grid.map((row) => Array.from({ length: n }, (_, d) => row[d] ?? row[row.length - 1] ?? false)),
            }))
            return touch({
              school: { ...p.school, workDays: n, shifts },
              classes: p.classes.map((c) => ({ ...c, availability: resizeDays(c.availability) })),
              subjects: p.subjects.map((x) => ({ ...x, availability: resizeDays(x.availability) })),
              rooms: p.rooms.map((x) => ({ ...x, availability: resizeDays(x.availability) })),
              teachers: p.teachers.map((x) => ({
                ...x,
                availability: resizeDays(x.availability),
                methodicalDays: (x.methodicalDays ?? []).filter((d) => d < n),
              })),
            })(s)
          }),
        removeShiftAt: (idx) =>
          set((s) => {
            const p = s.project
            if (p.school.shifts.length <= 1) return {}
            const shifts = p.school.shifts.filter((_, i) => i !== idx).map((sh, i) => ({ ...sh, index: i + 1 }))
            // Sinflarning navbat raqami: o'chirilganga biriktirilganlar 1-navbatga, keyingilar bir pog'ona yuqoriga
            const classes = p.classes.map((c) => {
              if (c.shiftIndex === idx + 1) return { ...c, shiftIndex: 1 }
              if (c.shiftIndex > idx + 1) return { ...c, shiftIndex: c.shiftIndex - 1 }
              return c
            })
            return touch({ school: { ...p.school, shifts }, classes })(s)
          }),
        setMaxLessonsPerDay: (n) =>
          set((s) => {
            const resize = (m: AvailabilityMatrix) =>
              m.map((row) => {
                const r = row.slice(0, n)
                while (r.length < n) r.push(true)
                return r
              })
            const p = s.project
            return touch({
              school: { ...p.school, maxLessonsPerDay: n },
              classes: p.classes.map((c) => ({ ...c, availability: resize(c.availability) })),
              subjects: p.subjects.map((x) => ({ ...x, availability: resize(x.availability) })),
              rooms: p.rooms.map((x) => ({ ...x, availability: resize(x.availability) })),
              teachers: p.teachers.map((x) => ({ ...x, availability: resize(x.availability) })),
            })(s)
          }),

        // Sinflar
        addClass: (c) => set((s) => touch({ classes: [...s.project.classes, c] })(s)),
        updateClass: (id, patch) =>
          set((s) =>
            touch({ classes: s.project.classes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        // O'chirishda unga bog'langan darslar va jadval yozuvlari ham tozalanadi (aks holda "osilib qolgan" havolalar
        // qoladi: tekshiruv "tayyor" deydi, lekin darslar jimgina joylashmaydi).
        removeClass: (id) =>
          set((s) => {
            const p = s.project
            const lessons = p.lessons
              .map((l) => (l.classIds.includes(id) ? { ...l, classIds: l.classIds.filter((c) => c !== id) } : l))
              .filter((l) => l.classIds.length > 0)
            const alive = new Set(lessons.map((l) => l.id))
            const timetables = rebuildTimetables(p.timetables, lessons, p.teachers, p.school.workDays, (e) =>
              e.classId === id || !alive.has(e.lessonId) ? null : e,
            )
            return touch({ classes: p.classes.filter((x) => x.id !== id), lessons, timetables })(s)
          }),

        // Fanlar
        addSubject: (sub) => set((s) => touch({ subjects: [...s.project.subjects, sub] })(s)),
        updateSubject: (id, patch) =>
          set((s) =>
            touch({ subjects: s.project.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        removeSubject: (id) =>
          set((s) => {
            const p = s.project
            const lessons = p.lessons.filter((l) => l.subjectId !== id)
            const alive = new Set(lessons.map((l) => l.id))
            const timetables = rebuildTimetables(p.timetables, lessons, p.teachers, p.school.workDays, (e) =>
              alive.has(e.lessonId) ? e : null,
            )
            const teachers = p.teachers.map((t) =>
              t.subjectIds.includes(id) ? { ...t, subjectIds: t.subjectIds.filter((x) => x !== id) } : t,
            )
            return touch({ subjects: p.subjects.filter((x) => x.id !== id), lessons, teachers, timetables })(s)
          }),

        // Xonalar
        addRoom: (r) => set((s) => touch({ rooms: [...s.project.rooms, r] })(s)),
        updateRoom: (id, patch) =>
          set((s) =>
            touch({ rooms: s.project.rooms.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        removeRoom: (id) =>
          set((s) => {
            const p = s.project
            const lessons = p.lessons.map((l) => (l.roomId === id ? { ...l, roomId: undefined } : l))
            const timetables = rebuildTimetables(p.timetables, lessons, p.teachers, p.school.workDays, (e) =>
              e.roomId === id ? { ...e, roomId: undefined } : e,
            )
            return touch({ rooms: p.rooms.filter((x) => x.id !== id), lessons, timetables })(s)
          }),

        // O'qituvchilar
        addTeacher: (t) => set((s) => touch({ teachers: [...s.project.teachers, t] })(s)),
        updateTeacher: (id, patch) =>
          set((s) =>
            touch({ teachers: s.project.teachers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        removeTeacher: (id) =>
          set((s) => {
            const p = s.project
            const lessons = p.lessons.map((l) => {
              if (l.teacher1Id !== id && l.teacher2Id !== id) return l
              // 1-o'qituvchi ketsa, 2-o'qituvchi asosiy bo'ladi; ikkalasi bo'lmasa — dars o'qituvchisiz qoladi (tekshiruv ko'rsatadi)
              const t1 = l.teacher1Id === id ? l.teacher2Id ?? '' : l.teacher1Id
              const t2 = l.teacher1Id === id ? undefined : l.teacher2Id === id ? undefined : l.teacher2Id
              return { ...l, teacher1Id: t1, teacher2Id: t2 }
            })
            const timetables = rebuildTimetables(p.timetables, lessons, p.teachers.filter((t) => t.id !== id), p.school.workDays, (e) => {
              if (e.teacherId !== id && e.teacher2Id !== id) return e
              // O'qituvchisiz qolgan dars jadvaldan olib tashlanadi; faqat 2-o'qituvchi ketgan bo'lsa yozuv saqlanadi
              if (e.teacherId === id) return e.teacher2Id && e.teacher2Id !== id ? { ...e, teacherId: e.teacher2Id, teacher2Id: undefined } : null
              return { ...e, teacher2Id: undefined }
            })
            const classes = p.classes.map((c) => (c.classTeacherId === id ? { ...c, classTeacherId: '' } : c))
            return touch({ teachers: p.teachers.filter((x) => x.id !== id), lessons, classes, timetables })(s)
          }),

        // Darslar
        addLesson: (l) => set((s) => touch({ lessons: [...s.project.lessons, l] })(s)),
        updateLesson: (id, patch) =>
          set((s) => {
            const p = s.project
            const lessons = p.lessons.map((x) => (x.id === id ? { ...x, ...patch } : x))
            // O'qituvchi/xona o'zgarsa jadvaldagi shu dars yozuvlari ham yangilanadi (aks holda eski o'qituvchi "qolib" ketadi)
            const updated = lessons.find((x) => x.id === id)
            const reassigned = 'teacher1Id' in patch || 'teacher2Id' in patch || 'roomId' in patch
            const timetables =
              reassigned && updated
                ? rebuildTimetables(p.timetables, lessons, p.teachers, p.school.workDays, (e) =>
                    e.lessonId !== id
                      ? e
                      : { ...e, teacherId: updated.teacher1Id, teacher2Id: updated.teacher2Id, roomId: updated.roomId },
                  )
                : p.timetables
            return touch({ lessons, timetables })(s)
          }),
        removeLesson: (id) =>
          set((s) => {
            const p = s.project
            const lessons = p.lessons.filter((x) => x.id !== id)
            const timetables = rebuildTimetables(p.timetables, lessons, p.teachers, p.school.workDays, (e) =>
              e.lessonId === id ? null : e,
            )
            return touch({ lessons, timetables })(s)
          }),

        addMany: (entity, items) =>
          set((s) => touch({ [entity]: [...(s.project[entity] as any[]), ...items] } as any)(s)),

        moveEntity: (entity, id, dir) =>
          set((s) => {
            const list = [...(s.project[entity] as Array<{ id: string }>)]
            const i = list.findIndex((x) => x.id === id)
            const j = i + dir
            if (i < 0 || j < 0 || j >= list.length) return {}
            const tmp = list[i]
            list[i] = list[j]
            list[j] = tmp
            return touch({ [entity]: list } as any)(s)
          }),

        applyAvailabilityToAll: (target, matrix) =>
          set((s) => {
            const clone = () => matrix.map((row) => row.slice())
            const list = (s.project[target] as Array<{ availability: AvailabilityMatrix }>).map((x) => ({
              ...x,
              availability: clone(),
            }))
            return touch({ [target]: list } as any)(s)
          }),

        // Jadvallar
        addTimetable: (v) => set((s) => touch({ timetables: [...s.project.timetables, v] })(s)),
        addGeneratedTimetable: (v) =>
          set((s) => {
            const list = [...s.project.timetables, v]
            const wi = list.findIndex((t) => t.name === WORKING_NAME)
            const working: TimetableVersion = {
              id: wi >= 0 ? list[wi].id : uid('tt_'),
              name: WORKING_NAME,
              createdAt: wi >= 0 ? list[wi].createdAt : v.createdAt,
              entries: v.entries.map((e) => ({ ...e })),
              stats: v.stats,
              ...(v.seed != null ? { seed: v.seed } : {}),
            }
            if (wi >= 0) list[wi] = working
            else list.push(working)
            return touch({ timetables: list })(s)
          }),
        updateTimetable: (id, patch) =>
          set((s) =>
            touch({
              timetables: s.project.timetables.map((x) => (x.id === id ? { ...x, ...patch } : x)),
            })(s),
          ),
        removeTimetable: (id) =>
          set((s) => touch({ timetables: s.project.timetables.filter((x) => x.id !== id) })(s)),
      }
    },
    {
      name: 'jadvalpro-project',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ project: s.project, scope: s.scope }),
      merge: (persisted, current) => {
        const s = persisted as { project?: Project }
        if (s?.project?.teachers) {
          s.project.teachers = s.project.teachers.map((t: any) => {
            if (!Array.isArray(t.methodicalDays)) {
              t.methodicalDays = t.methodicalDay != null && t.methodicalDay >= 0 ? [t.methodicalDay] : []
            }
            delete t.methodicalDay
            return t
          })
        }
        return { ...current, ...s } as ProjectState
      },
    },
  ),
)
