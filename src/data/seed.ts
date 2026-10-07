import type { Project } from '@/types'
import {
  defaultProject,
  newClass,
  newSubject,
  newRoom,
  newTeacher,
  newLesson,
} from './factories'

/** Sinov/namuna loyiha — generatsiyani tez sinash uchun */
export function buildDemoProject(): Project {
  const p = defaultProject()
  p.school.name = "1-son umumiy o'rta ta'lim maktabi"
  p.school.director = 'Karimov A.D.'

  // Sinflar
  const classNames = ['5-A', '5-B', '6-A', '6-B', '7-A']
  p.classes = classNames.map((n) => {
    const c = newClass(p.school, n)
    c.studentCount = 28
    return c
  })

  // Fanlar (nom, qisqa, og'irlik)
  const subjDefs: [string, string, number][] = [
    ['Matematika', 'Mat', 9],
    ['Ona tili', 'Ona', 7],
    ['Ingliz tili', 'Ing', 6],
    ['Fizika', 'Fiz', 8],
    ['Tarix', 'Tar', 5],
    ['Biologiya', 'Bio', 6],
    ['Informatika', 'Inf', 5],
    ['Jismoniy tarbiya', 'Jis', 2],
  ]
  p.subjects = subjDefs.map(([name, short, weight], i) => {
    const s = newSubject(p.school, name, i)
    s.short = short
    s.weight = weight
    if (name === 'Informatika') s.requiredRoomType = 'Informatika'
    if (name === 'Jismoniy tarbiya') s.requiredRoomType = 'Sport zali'
    return s
  })
  const subj = (name: string) => p.subjects.find((s) => s.name === name)!

  // Xonalar
  const roomDefs: [string, string, number][] = [
    ['101-xona', 'Oddiy', 30],
    ['102-xona', 'Oddiy', 30],
    ['103-xona', 'Oddiy', 30],
    ['104-xona', 'Oddiy', 30],
    ['Informatika xonasi', 'Informatika', 30],
    ['Sport zali', 'Sport zali', 60],
  ]
  p.rooms = roomDefs.map(([name, type, cap]) => {
    const r = newRoom(p.school, name)
    r.type = type
    r.capacity = cap
    return r
  })

  // O'qituvchilar (F.I.Sh., fanlar)
  const teacherDefs: [string, string[]][] = [
    ['Aliyev Vali Akramovich', ['Matematika']],
    ['Soliyeva Dilnoza Akmalovna', ['Ona tili']],
    ['Rahimov Jasur Shavkatovich', ['Ingliz tili']],
    ['Qodirov Bekzod Umarovich', ['Fizika', 'Matematika']],
    ['Tosheva Malika Rustamovna', ['Tarix', 'Biologiya']],
    ['Yusupov Sardor Davronovich', ['Informatika']],
    ['Ismoilov Akmal Qahhorovich', ['Jismoniy tarbiya']],
    ['Nazarova Gulnoza Botirovna', ['Biologiya', 'Ona tili']],
  ]
  p.teachers = teacherDefs.map(([fullName, subjNames]) => {
    const t = newTeacher(p.school, fullName)
    t.subjectIds = subjNames.map((n) => subj(n).id)
    t.weeklyMax = 24
    return t
  })
  const teacherFor = (subjName: string, k = 0) => {
    const ts = p.teachers.filter((t) => t.subjectIds.includes(subj(subjName).id))
    return ts[k % ts.length] ?? ts[0]
  }

  // Darslar (o'quv reja) — har sinf uchun
  const plan: [string, number][] = [
    ['Matematika', 5],
    ['Ona tili', 4],
    ['Ingliz tili', 3],
    ['Fizika', 2],
    ['Tarix', 2],
    ['Biologiya', 2],
    ['Informatika', 1],
    ['Jismoniy tarbiya', 2],
  ]
  p.lessons = []
  p.classes.forEach((c, ci) => {
    plan.forEach(([subjName, hours]) => {
      const l = newLesson(p.school)
      l.subjectId = subj(subjName).id
      l.classIds = [c.id]
      l.teacher1Id = teacherFor(subjName, ci).id
      l.hoursPerWeek = hours
      l.consecutive = subjName === 'Fizika' // fizika juft
      p.lessons.push(l)
    })
  })

  return p
}
