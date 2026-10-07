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

type Entity = 'classes' | 'subjects' | 'rooms' | 'teachers' | 'lessons'

interface ProjectState {
  project: Project
  dirty: boolean

  // Umumiy
  setProject: (p: Project) => void
  newProject: () => void
  markSaved: () => void

  // Maktab
  updateSchool: (patch: Partial<School>) => void
  setMaxLessonsPerDay: (n: number) => void

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
  updateTimetable: (id: string, patch: Partial<TimetableVersion>) => void
  removeTimetable: (id: string) => void
}

export const useProject = create<ProjectState>()(
  persist(
    (set) => {
      const touch = (p: Partial<Project>) => (state: ProjectState) => ({
        project: { ...state.project, ...p },
        dirty: true,
      })

      return {
        project: defaultProject(),
        dirty: false,

        setProject: (project) => set({ project, dirty: false }),
        newProject: () => set({ project: defaultProject(), dirty: false }),
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
        removeClass: (id) =>
          set((s) => touch({ classes: s.project.classes.filter((x) => x.id !== id) })(s)),

        // Fanlar
        addSubject: (sub) => set((s) => touch({ subjects: [...s.project.subjects, sub] })(s)),
        updateSubject: (id, patch) =>
          set((s) =>
            touch({ subjects: s.project.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        removeSubject: (id) =>
          set((s) => touch({ subjects: s.project.subjects.filter((x) => x.id !== id) })(s)),

        // Xonalar
        addRoom: (r) => set((s) => touch({ rooms: [...s.project.rooms, r] })(s)),
        updateRoom: (id, patch) =>
          set((s) =>
            touch({ rooms: s.project.rooms.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        removeRoom: (id) => set((s) => touch({ rooms: s.project.rooms.filter((x) => x.id !== id) })(s)),

        // O'qituvchilar
        addTeacher: (t) => set((s) => touch({ teachers: [...s.project.teachers, t] })(s)),
        updateTeacher: (id, patch) =>
          set((s) =>
            touch({ teachers: s.project.teachers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        removeTeacher: (id) =>
          set((s) => touch({ teachers: s.project.teachers.filter((x) => x.id !== id) })(s)),

        // Darslar
        addLesson: (l) => set((s) => touch({ lessons: [...s.project.lessons, l] })(s)),
        updateLesson: (id, patch) =>
          set((s) =>
            touch({ lessons: s.project.lessons.map((x) => (x.id === id ? { ...x, ...patch } : x)) })(s),
          ),
        removeLesson: (id) =>
          set((s) => touch({ lessons: s.project.lessons.filter((x) => x.id !== id) })(s)),

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
      partialize: (s) => ({ project: s.project }),
    },
  ),
)
