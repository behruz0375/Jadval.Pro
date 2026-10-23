import { useState } from 'react'
import { KeyRound, Crown, ArrowLeft, LogIn, UserPlus, LifeBuoy } from 'lucide-react'
import { useAuth, type StaffRole } from '@/store/auth'
import { useToast } from '@/store/toast'
import { Modal } from '@/components/Modal'
import { Field, TextField } from '@/components/Field'
import { ContactAdmin } from '@/components/ContactAdmin'
import { BackgroundSlideshow } from '@/components/BackgroundSlideshow'
import { APP_VERSION, IS_PUBLIC_DEPLOY } from '@/constants'
import { login as cloudLogin, signOut as cloudSignOut, cloudErrorMessage, isCloudNetworkError } from '@/features/cloud/api'

/** Tiklash kodi bilan parolni qayta o'rnatish oynasi (Zavuch/O'TIBDO' parolni unutganda) */
export function RecoveryModal({ role, open, onClose }: { role: StaffRole; open: boolean; onClose: () => void }) {
  const reset = useAuth((s) => s.resetStaffPasswordWithCode)
  const toast = useToast()
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setErr(null)
    if (pw !== pw2) return setErr('Yangi parollar mos kelmadi')
    if (!code.trim()) return setErr('Tiklash kodini kiriting')
    setBusy(true)
    const e = await reset(role, code, pw)
    setBusy(false)
    if (e) setErr(e)
    else {
      toast.success('Parol yangilandi — tizimga kirdingiz')
      setCode('')
      setPw('')
      setPw2('')
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      title="Parolni tiklash"
      onClose={onClose}
      width="max-w-sm"
      footer={
        <>
          {err && <span className="mr-auto text-sm text-danger">{err}</span>}
          <button onClick={onClose} className="btn btn-outline">Bekor</button>
          <button onClick={submit} disabled={busy} className="btn btn-accent disabled:opacity-50">
            <KeyRound size={15} /> Tiklash
          </button>
        </>
      }
    >
      <p className="mb-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
        «Hisob» bo'limida saqlab qo'ygan <b>tiklash kodi</b>ngizni kiriting va yangi parol o'rnating.
        Kod bo'lmasa — admin (dastur egasi) bilan bog'laning.
      </p>
      <div className="flex flex-col gap-3">
        <Field label="Tiklash kodi">
          <TextField
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="JP-XXXX-XXXX-XXXX"
            autoFocus
            className="font-mono"
          />
        </Field>
        <Field label="Yangi parol">
          <TextField type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Yangi parolni tasdiqlang">
          <TextField
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoComplete="new-password"
          />
        </Field>
      </div>
    </Modal>
  )
}

function AuthLayout({ title, children, onBack }: { title: string; children: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg p-4">
      {/* Orqa fonda — jadval mavzusidagi slideshow (4 ta scena, aylanib turadi) */}
      <BackgroundSlideshow opacity={0.4} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob animate-floatA h-96 w-96 bg-accent/30" style={{ top: '-6rem', left: '-4rem' }} />
        <div className="blob animate-floatB h-80 w-80" style={{ bottom: '-5rem', right: '-3rem', background: 'rgb(99 102 241 / 0.25)' }} />
      </div>
      <div className="relative z-10 w-full max-w-lg">
        {onBack && (
          <button onClick={onBack} className="btn btn-ghost hover-lift mb-3 backdrop-blur">
            <ArrowLeft size={16} /> Orqaga
          </button>
        )}
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-fg text-2xl font-black shadow-panel">
            J
          </div>
          <h1 className="text-xl font-bold">JadvalPro 2026</h1>
          <p className="text-sm text-muted">Dars jadvalini avtomatik tuzuvchi dastur</p>
        </div>
        <div className="card p-6 shadow-panel">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="mt-4">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs text-muted">{APP_VERSION}</p>
      </div>
    </div>
  )
}

/** Egasi tiklash kodi bilan parolni qayta o'rnatish */
function OwnerRecoveryModal({
  open,
  onClose,
  onRecover,
}: {
  open: boolean
  onClose: () => void
  onRecover: (code: string, newLogin: string, newPassword: string) => Promise<string | null>
}) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [newLogin, setNewLogin] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setErr(null)
    if (pw !== pw2) return setErr('Yangi parollar mos kelmadi')
    if (!code.trim()) return setErr('Tiklash kodini kiriting')
    if (!newLogin.trim()) return setErr('Yangi loginni kiriting')
    setBusy(true)
    const e = await onRecover(code, newLogin, pw)
    setBusy(false)
    if (e) setErr(e)
    else {
      toast.success('Admin paroli tiklandi — tizimga kirdingiz')
      setCode('')
      setNewLogin('')
      setPw('')
      setPw2('')
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      title="Admin parolini tiklash"
      onClose={onClose}
      width="max-w-sm"
      footer={
        <>
          {err && <span className="mr-auto text-sm text-danger">{err}</span>}
          <button onClick={onClose} className="btn btn-outline">Bekor</button>
          <button onClick={submit} disabled={busy} className="btn btn-accent disabled:opacity-50">
            <KeyRound size={15} /> Tiklash
          </button>
        </>
      }
    >
      <p className="mb-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
        «Hisob» bo'limida saqlab qo'ygan <b>tiklash kodi</b>ngizni kiriting va yangi login+parol o'rnating.
        Kod formati: <code>JP-XXXX-XXXX-XXXX</code>
      </p>
      <div className="flex flex-col gap-3">
        <Field label="Tiklash kodi">
          <TextField
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="JP-XXXX-XXXX-XXXX"
            autoFocus
            className="font-mono"
          />
        </Field>
        <Field label="Yangi login">
          <TextField value={newLogin} onChange={(e) => setNewLogin(e.target.value)} />
        </Field>
        <Field label="Yangi parol">
          <TextField type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label="Yangi parolni tasdiqlang">
          <TextField
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
      </div>
    </Modal>
  )
}

export function OwnerLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ownerLogin = useAuth((s) => s.ownerLogin)
  const ownerSetup = useAuth((s) => s.ownerSetup)
  const ownerRecoverWithCode = useAuth((s) => s.ownerRecoverWithCode)
  const ownerAuth = useAuth((s) => s.ownerAuth)
  const ownerKeysEncByRecovery = useAuth((s) => s.ownerKeysEncByRecovery)
  const toast = useToast()
  const [login, setLogin] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)
  // Public deploy: faqat login — "Setup" mavjud emas. Admin hisobi backend'da
  // (Render env'da OWNER_LOGIN/OWNER_PASSWORD) oldindan sozlangan.
  const isSetup = !IS_PUBLIC_DEPLOY && !ownerAuth
  const isLegacy = !!ownerAuth && !ownerAuth.iterations

  const submit = async () => {
    setErr(null)
    let e: string | null
    if (isSetup) {
      if (pw !== pw2) {
        setErr('Parollar mos kelmadi')
        return
      }
      e = await ownerSetup(login, pw)
    } else if (IS_PUBLIC_DEPLOY && !ownerAuth) {
      // Birinchi marta online admin kirmoqda — backend orqali tekshiramiz,
      // keyin lokal ownerAuth yaratib qo'yamiz (keyingi kirishlar oflayn ishlasin).
      setBusy(true)
      try {
        const resp = await cloudLogin(login.trim(), pw)
        const role = (resp.user?.role || '').toLowerCase()
        if (role !== 'admin' && role !== 'owner') {
          setBusy(false)
          setErr('Bu hisob admin emas')
          return
        }
        e = await ownerSetup(login.trim(), pw)
      } catch (err) {
        setBusy(false)
        setErr(isCloudNetworkError(err) ? "Serverga ulanib bo'lmadi — internetni tekshiring (server uyg'onishi ~1 daqiqa olishi mumkin)" : cloudErrorMessage(err))
        return
      }
      setBusy(false)
    } else {
      e = await ownerLogin(login, pw)
    }
    if (e) setErr(e)
    else {
      toast.success('Admin sifatida kirdingiz')
      onClose()
    }
  }

  return (
    <>
    <Modal
      open={open && !recoverOpen}
      title={isSetup ? 'Admin hisobini yaratish' : 'Admin panel — kirish'}
      onClose={onClose}
      width="max-w-sm"
      footer={
        <>
          {err && <span className="mr-auto text-sm text-danger">{err}</span>}
          <button onClick={onClose} className="btn btn-outline">Bekor</button>
          <button onClick={submit} disabled={busy} className="btn btn-accent disabled:opacity-50">
            {isSetup ? <><UserPlus size={15} /> Yaratish</> : <><LogIn size={15} /> {busy ? 'Kirilmoqda…' : 'Kirish'}</>}
          </button>
        </>
      }
    >
      {isSetup ? (
        <p className="mb-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
          Birinchi sozlash: bu qurilmada <b>admin hisobi</b> yaratiladi. Login va parolni eslab qoling —
          hisobga kirgach, «Hisob» bo'limida <b>tiklash kodi</b> ham oling (parol unutilsa yordam beradi)!
        </p>
      ) : IS_PUBLIC_DEPLOY && !ownerAuth ? (
        <p className="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          Admin login/parolini kiriting. Birinchi kirishda server orqali tekshiriladi.
        </p>
      ) : (
        <p className="mb-3 text-sm text-muted">
          Admin login va parolini kiriting.
          {isLegacy && (
            <span className="mt-1 block text-xs text-warn">Eski hisob: login — <b>egasi</b></span>
          )}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <Field label="Login">
          <TextField value={login} onChange={(e) => setLogin(e.target.value)} autoFocus autoComplete="username" />
        </Field>
        <Field label="Parol">
          <TextField
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isSetup && submit()}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
          />
        </Field>
        {isSetup && (
          <Field label="Parolni tasdiqlang">
            <TextField
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoComplete="new-password"
            />
          </Field>
        )}
      </div>
      {!isSetup && ownerKeysEncByRecovery && (
        <button
          onClick={() => setRecoverOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs text-muted hover:text-ink"
        >
          <LifeBuoy size={13} /> Parolni unutdingizmi? (tiklash kodi bilan)
        </button>
      )}
    </Modal>
    <OwnerRecoveryModal
      open={recoverOpen}
      onClose={() => {
        setRecoverOpen(false)
        onClose()
      }}
      onRecover={ownerRecoverWithCode}
    />
    </>
  )
}

/** Direktor / O'TIBDO' kirish (yoki Direktor uchun birinchi sozlash) ekrani */
export function StaffLoginScreen({ role, onBack }: { role: StaffRole; onBack?: () => void }) {
  const staff = useAuth((s) => s.staff)
  const staffLogin = useAuth((s) => s.staffLogin)
  const setupDirector = useAuth((s) => s.setupDirector)
  const enrollDirectorFromCloud = useAuth((s) => s.enrollDirectorFromCloud)
  const toast = useToast()
  const [login, setLogin] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)

  const cred = staff[role]
  // Public deploy'da: Zavuch hisobi mahalliy "setup" orqali yaratilmaydi.
  // Hisobni admin (Telegram orqali bog'langach) OwnerPanel'da yaratib,
  // login/parolni mijozga beradi — shundan keyin odatiy "Kirish" ishlaydi.
  const isSetup = !IS_PUBLIC_DEPLOY && role === 'director' && !cred
  const roleTitle = role === 'director' ? 'Zavuch' : "O'TIBDO'"

  // O'TIBDO' hisobi hali yaratilmagan
  if (role === 'deputy' && !cred) {
    return (
      <AuthLayout title={`${roleTitle} — kirish`} onBack={onBack}>
        <p className="rounded-lg bg-warn/10 px-3 py-2.5 text-sm text-warn">
          O'TIBDO' hisobi hali yaratilmagan. Direktor tizimga kirib, <b>«Hisob»</b> bo'limida
          O'TIBDO' uchun login va parol yaratadi.
        </p>
      </AuthLayout>
    )
  }

  const submit = async () => {
    if (busy) return
    setErr(null)
    let e: string | null
    if (isSetup) {
      if (pw !== pw2) {
        setErr('Parollar mos kelmadi')
        return
      }
      e = await setupDirector(login, pw)
      if (!e) toast.success('Zavuch hisobi yaratildi — xush kelibsiz!')
    } else if (IS_PUBLIC_DEPLOY && role === 'director') {
      // Ommaviy sayt: login/parol SERVERDA tekshiriladi (admin mijozni yaratganda serverda Zavuch hisobi ochiladi).
      // Tasdiqlangach shu qurilmada mahalliy hisob saqlanadi — keyingi kirishlar internetsiz ham ishlaydi.
      setBusy(true)
      try {
        const resp = await cloudLogin(login.trim(), pw)
        if (resp.user.role !== 'director') {
          cloudSignOut()
          e = resp.user.role === 'owner' ? 'Bu admin hisobi — «Admin panel» orqali kiring' : 'Bu hisob Zavuch emas'
        } else {
          e = await enrollDirectorFromCloud(login, pw)
        }
      } catch (er) {
        if (isCloudNetworkError(er)) {
          // Internet yoki server yo'q — shu qurilmada avval saqlangan hisob bilan kirishga urinamiz
          e = staff.director ? await staffLogin(role, login, pw) : "Serverga ulanib bo'lmadi — internetni tekshirib qayta urining"
        } else {
          e = cloudErrorMessage(er)
        }
      } finally {
        setBusy(false)
      }
      if (!e) toast.success(`${roleTitle} sifatida kirdingiz`)
    } else {
      e = await staffLogin(role, login, pw)
      if (!e) toast.success(`${roleTitle} sifatida kirdingiz`)
    }
    if (e) setErr(e)
  }

  return (
    <AuthLayout
      title={isSetup ? 'Zavuch hisobini yaratish (birinchi kirish)' : `${roleTitle} — kirish`}
      onBack={onBack}
    >
      {isSetup && (
        <>
          <p className="mb-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            <b>Birinchi kirish.</b> Admin (dastur sotuvchisi) sizga Telegramda yuborgan
            login va parolni shu yerga kiriting — ular shu qurilmada saqlanadi va keyingi
            kirishlarda ishlatiladi.
          </p>
          <ContactAdmin
            variant="compact"
            label="Login/parol olmagan bo'lsangiz — "
            className="mb-3"
          />
        </>
      )}
      <div className="flex flex-col gap-3">
        <Field label="Login">
          <TextField value={login} onChange={(e) => setLogin(e.target.value)} autoFocus autoComplete="username" />
        </Field>
        <Field label="Parol">
          <TextField
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isSetup && submit()}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
          />
        </Field>
        {isSetup && (
          <Field label="Parolni tasdiqlang">
            <TextField
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoComplete="new-password"
            />
          </Field>
        )}
        {err && <p className="text-sm text-danger">{err}</p>}
        <button onClick={submit} disabled={busy} className="btn btn-accent hover-lift mt-1 w-full disabled:opacity-60">
          {isSetup ? (
            <><UserPlus size={16} /> Hisobni ro'yxatdan o'tkazish</>
          ) : busy ? (
            <>Tekshirilmoqda… (server uyg'onayotgan bo'lsa ~1 daqiqa)</>
          ) : (
            <><LogIn size={16} /> Kirish</>
          )}
        </button>
        {!isSetup && (
          <button
            onClick={() => setRecoverOpen(true)}
            className="mt-1 flex w-full items-center justify-center gap-1.5 text-xs text-muted hover:text-ink"
          >
            <LifeBuoy size={13} /> Parolni unutdingizmi?
          </button>
        )}
      </div>
      {!isSetup && (
        <ContactAdmin
          variant="default"
          label="Parol/login unutdingizmi? Yangi hisob kerakmi? — Adminga yozing"
          className="mt-4"
        />
      )}
      <RecoveryModal role={role} open={recoverOpen} onClose={() => setRecoverOpen(false)} />
    </AuthLayout>
  )
}

/** O'qituvchi / O'quvchi kirish ekrani */
export function AccountLoginScreen({ role, onBack }: { role: 'teacher' | 'student'; onBack?: () => void }) {
  const accountLogin = useAuth((s) => s.accountLogin)
  const toast = useToast()
  const [login, setLogin] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const title = role === 'teacher' ? "O'qituvchi — kirish" : "O'quvchi — kirish"

  const submit = async () => {
    setErr(null)
    const e = await accountLogin(role, login, pw)
    if (e) setErr(e)
    else toast.success('Xush kelibsiz!')
  }

  return (
    <AuthLayout title={title} onBack={onBack}>
      <p className="mb-3 text-sm text-muted">
        {role === 'teacher'
          ? "O'qituvchi hisobingiz bilan kiring (login/parolni Zavuch beradi)."
          : "Sinf hisobingiz bilan kiring (login/parolni Zavuch beradi)."}
      </p>
      <div className="flex flex-col gap-3">
        <Field label="Login">
          <TextField value={login} onChange={(e) => setLogin(e.target.value)} autoFocus autoComplete="username" />
        </Field>
        <Field label="Parol">
          <TextField
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoComplete="current-password"
          />
        </Field>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button onClick={submit} className="btn btn-accent hover-lift mt-1 w-full">
          <LogIn size={16} /> Kirish
        </button>
      </div>
      <ContactAdmin
        variant="compact"
        label="Parol/login unutdingizmi? — "
        className="mt-4"
      />
    </AuthLayout>
  )
}
