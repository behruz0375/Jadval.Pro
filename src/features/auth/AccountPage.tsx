import { useState } from 'react'
import { UserCog, KeyRound, UserPlus, Ban, CircleCheck, Trash2, Save, GraduationCap, Users, LifeBuoy, Copy, Check } from 'lucide-react'
import { useAuth, type StaffRole } from '@/store/auth'
import { useProject } from '@/store/project'
import { useToast } from '@/store/toast'
import { Field, TextField, SelectField } from '@/components/Field'
import { Modal } from '@/components/Modal'

export function AccountPage() {
  const role = useAuth((s) => s.role)
  const staff = useAuth((s) => s.staff)
  const roleLabel = useAuth((s) => s.roleLabel)

  if (role !== 'director' && role !== 'deputy') return null
  const cred = staff[role]

  return (
    <div className="fade-in mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <UserCog size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold">Hisob</h1>
          <p className="text-sm text-muted">
            {roleLabel()} — <b className="text-ink">{cred?.login}</b>
          </p>
        </div>
      </div>

      <ChangeOwnCredentials role={role} />
      <RecoveryCodeCard role={role} />

      {role === 'director' && (
        <>
          <AccountManager kind="teacher" />
          <AccountManager kind="student" />
        </>
      )}
    </div>
  )
}

/** Parolni tiklash kodini yaratish/ko'rsatish (hodim o'zi uchun) */
function RecoveryCodeCard({ role }: { role: StaffRole }) {
  const staff = useAuth((s) => s.staff)
  const gen = useAuth((s) => s.genStaffRecoveryCode)
  const toast = useToast()
  const has = !!staff[role]?.recovery
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const generate = async () => {
    setBusy(true)
    try {
      setCode(await gen(role))
    } catch {
      toast.error('Kod yaratishda xatolik')
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <LifeBuoy size={18} className="text-accent" /> Parolni tiklash kodi
      </h2>
      <p className="mb-3 text-sm text-muted">
        Parolni unutib qolsangiz, kirish oynasidagi «Parolni unutdingizmi?» orqali shu kod bilan yangi parol o'rnatasiz.
        Kodni xavfsiz joyda saqlang — u faqat shu qurilmada ishlaydi.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={has ? 'chip !bg-ok/15 !text-ok' : 'chip !bg-warn/15 !text-warn'}>
          {has ? "Kod o'rnatilgan" : "Kod o'rnatilmagan"}
        </span>
        <button onClick={generate} disabled={busy} className="btn btn-outline h-9 disabled:opacity-50">
          <KeyRound size={15} /> {has ? 'Yangi kod yaratish' : 'Kod yaratish'}
        </button>
      </div>

      <Modal
        open={!!code}
        title="Tiklash kodingiz"
        onClose={() => setCode(null)}
        width="max-w-sm"
        footer={
          <button onClick={() => setCode(null)} className="btn btn-accent">
            <Check size={15} /> Saqlab oldim
          </button>
        }
      >
        <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          Bu kod faqat <b>hozir</b> ko'rsatiladi. Uni yozib oling yoki nusxalang — keyin qayta ko'rsatilmaydi!
          Avvalgi kod (bo'lsa) endi ishlamaydi.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-center font-mono text-lg tracking-wider">
            {code}
          </code>
          <button onClick={copy} className="btn btn-outline h-11 w-11 p-0" title="Nusxa olish">
            {copied ? <Check size={16} className="text-ok" /> : <Copy size={16} />}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function ChangeOwnCredentials({ role }: { role: StaffRole }) {
  const staff = useAuth((s) => s.staff)
  const change = useAuth((s) => s.staffChangeCredentials)
  const toast = useToast()
  const [cur, setCur] = useState('')
  const [login, setLogin] = useState(staff[role]?.login ?? '')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    setErr(null)
    if (pw && pw !== pw2) {
      setErr('Yangi parollar mos kelmadi')
      return
    }
    const e = await change(role, cur, login, pw || undefined)
    if (e) setErr(e)
    else {
      toast.success("Hisob ma'lumotlari yangilandi")
      setCur('')
      setPw('')
      setPw2('')
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <KeyRound size={18} className="text-accent" /> Login va parolni o'zgartirish
      </h2>
      <p className="mb-4 text-sm text-muted">
        O'zgartirish uchun joriy parolni kiriting. Parol maydonini bo'sh qoldirsangiz — faqat login o'zgaradi.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Joriy parol" className="sm:col-span-2">
          <TextField type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="Login">
          <TextField value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Yangi parol (ixtiyoriy)">
          <TextField type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Yangi parolni tasdiqlang">
          <TextField type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </Field>
      </div>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <button onClick={save} disabled={!cur} className="btn btn-accent mt-4 disabled:opacity-40">
        <Save size={15} /> Saqlash
      </button>
    </div>
  )
}

/** O'qituvchi yoki O'quvchi (sinf) hisoblarini boshqarish */
function AccountManager({ kind }: { kind: 'teacher' | 'student' }) {
  const accounts = useAuth((s) => s.accounts)
  const createAccount = useAuth((s) => s.createAccount)
  const removeAccount = useAuth((s) => s.removeAccount)
  const setAccountActive = useAuth((s) => s.setAccountActive)
  const resetAccountPassword = useAuth((s) => s.resetAccountPassword)
  const project = useProject((s) => s.project)
  const toast = useToast()

  const [linkedId, setLinkedId] = useState('')
  const [login, setLogin] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPw, setResetPw] = useState('')

  const doReset = async () => {
    if (!resetId) return
    const e = await resetAccountPassword(resetId, resetPw)
    if (e) toast.error(e)
    else {
      toast.success('Parol yangilandi')
      setResetId(null)
      setResetPw('')
    }
  }

  const list = accounts.filter((a) => a.role === kind)
  const options =
    kind === 'teacher'
      ? project.teachers.map((t) => ({ id: t.id, label: t.fullName }))
      : project.classes.map((c) => ({ id: c.id, label: c.name }))
  const nameOf = (id: string) => options.find((o) => o.id === id)?.label ?? '—'

  const title = kind === 'teacher' ? "O'qituvchi hisoblari" : "O'quvchi (sinf) hisoblari"
  const Icon = kind === 'teacher' ? GraduationCap : Users

  const create = async () => {
    setErr(null)
    const e = await createAccount(kind, login, pw, linkedId)
    if (e) setErr(e)
    else {
      toast.success('Hisob yaratildi')
      setLogin('')
      setPw('')
      setLinkedId('')
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon size={18} className="text-accent" /> {title}
      </h2>
      <p className="mb-3 text-sm text-muted">
        {kind === 'teacher'
          ? "Har o'qituvchiga login/parol bering — u o'z jadvalini ko'radi."
          : "Har sinfga login/parol bering — o'quvchilar shu bilan kirib sinf jadvalini ko'radi."}
      </p>

      {list.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          {list.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <b>{nameOf(a.linkedId)}</b>
              <span className="text-muted">— {a.login}</span>
              <span className={a.active ? 'chip !bg-ok/15 !text-ok' : 'chip !bg-danger/15 !text-danger'}>
                {a.active ? 'Faol' : 'Bloklangan'}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    setResetId(a.id)
                    setResetPw('')
                  }}
                  className="btn btn-outline h-8 text-xs"
                  title="Parolni almashtirish"
                >
                  <KeyRound size={13} /> Parol
                </button>
                <button onClick={() => setAccountActive(a.id, !a.active)} className="btn btn-outline h-8 text-xs">
                  {a.active ? <><Ban size={13} /> Bloklash</> : <><CircleCheck size={13} /> Ochish</>}
                </button>
                <button
                  onClick={() => {
                    removeAccount(a.id)
                    toast.success("Hisob o'chirildi")
                  }}
                  className="btn btn-outline h-8 text-xs text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={kind === 'teacher' ? "O'qituvchi" : 'Sinf'}>
          <SelectField value={linkedId} onChange={(e) => setLinkedId(e.target.value)}>
            <option value="">— tanlang —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="Login">
          <TextField value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Parol">
          <TextField type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </Field>
      </div>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <button onClick={create} disabled={!linkedId || !login.trim() || !pw} className="btn btn-accent mt-3 disabled:opacity-40">
        <UserPlus size={15} /> Hisob yaratish
      </button>

      <Modal
        open={!!resetId}
        title="Yangi parol o'rnatish"
        onClose={() => setResetId(null)}
        width="max-w-sm"
        footer={
          <>
            <button onClick={() => setResetId(null)} className="btn btn-outline">Bekor</button>
            <button onClick={doReset} disabled={!resetPw} className="btn btn-accent disabled:opacity-50">
              <Save size={15} /> Saqlash
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">
          <b>{nameOf(accounts.find((a) => a.id === resetId)?.linkedId ?? '')}</b> hisobi uchun yangi parol kiriting.
          Eski parol talab qilinmaydi.
        </p>
        <Field label="Yangi parol">
          <TextField
            type="password"
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doReset()}
            autoFocus
            autoComplete="new-password"
          />
        </Field>
      </Modal>
    </div>
  )
}
