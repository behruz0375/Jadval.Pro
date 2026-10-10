import { useState } from 'react'
import {
  ShieldCheck,
  Copy,
  Check,
  Plus,
  Building2,
  Ban,
  CircleCheck,
  Trash2,
  Search,
  Send,
  UserCog,
  Save,
  History,
  Eraser,
  Eye,
  EyeOff,
  Pencil,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { Field, TextField, SelectField } from '@/components/Field'
import { Modal } from '@/components/Modal'
import { cx } from '@/utils'
import { generateProKey } from '@/features/pro/tier'
import { ProBadge } from '@/features/pro/ProBadge'

export function OwnerPanel() {
  const schools = useAuth((s) => s.schools)
  const addCustomer = useAuth((s) => s.addCustomer)
  const updateCustomer = useAuth((s) => s.updateCustomer)
  const setSchoolBlocked = useAuth((s) => s.setSchoolBlocked)
  const removeSchool = useAuth((s) => s.removeSchool)
  const ownerContact = useAuth((s) => s.ownerContact)
  const setOwnerContact = useAuth((s) => s.setOwnerContact)
  const toast = useToast()

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [director, setDirector] = useState('')
  const [phone, setPhone] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [plan, setPlan] = useState<'Free' | 'Pro'>('Free')
  const [proKey, setProKey] = useState('')
  const [query, setQuery] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const active = schools.filter((s) => !s.blocked)
  const blocked = schools.filter((s) => s.blocked)

  const randomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
    setPassword(out)
  }

  const save = () => {
    if (!schoolName.trim()) return toast.error('Maktab nomini kiriting')
    if (!login.trim()) return toast.error('Login kiriting')
    if (!password.trim()) return toast.error('Parolni kiriting')
    // Pro tanlangan va kalit yo'q bo'lsa — avto-generatsiya
    const key = plan === 'Pro' ? (proKey.trim() || generateProKey()) : ''
    if (editId) {
      updateCustomer(editId, { schoolName, director, phone, login, password, notes, plan, key })
      toast.success('Mijoz yangilandi')
    } else {
      addCustomer({ schoolName, director, phone, login, password, notes, plan, key })
      toast.success(plan === 'Pro' ? `Yangi Pro mijoz saqlandi. Kalit: ${key}` : 'Yangi mijoz saqlandi')
    }
    reset()
    setOpen(false)
  }

  const openForEdit = (id: string) => {
    const s = schools.find((x) => x.licenseId === id)
    if (!s) return
    setEditId(id)
    setSchoolName(s.schoolName)
    setDirector(s.director)
    setPhone(s.phone)
    setLogin(s.login ?? '')
    setPassword(s.password ?? '')
    setNotes(s.notes ?? '')
    const planNorm = (s.plan === 'Pro' || s.plan === 'Premium') ? 'Pro' : 'Free'
    setPlan(planNorm)
    setProKey(s.key ?? '')
    setOpen(true)
  }

  const reset = () => {
    setEditId(null)
    setSchoolName('')
    setDirector('')
    setPhone('')
    setLogin('')
    setPassword('')
    setNotes('')
    setPlan('Free')
    setProKey('')
  }

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const sendCredentialsViaTelegram = (s: typeof schools[number]) => {
    const isPro = (s.plan === 'Pro' || s.plan === 'Premium') && s.key
    const proBlock = isPro
      ? `\n\n🔑 PRO AKTIVATSIYA KALITI:\n${s.key}\n\nDastur Sozlamalar → Pro versiya kartasiga yozib "Aktivlash" bosing — barcha Pro imkoniyatlar ochiladi.`
      : ''
    const msg = `Assalomu alaykum! JadvalPro dasturi uchun login/parolingiz:\n\nLogin: ${s.login}\nParol: ${s.password}\n\nDastur ichida Zavuch (direktor) sifatida kiring va shu ma'lumotlarni «Birinchi kirish» oynasiga kiriting.${proBlock}`
    navigator.clipboard.writeText(msg).then(() => {
      toast.success(isPro ? 'Login, parol va Pro kalit nusxalandi' : 'Login va parol xabari nusxalandi')
    }).catch(() => { /* ignore */ })
    const tg = ownerContact.telegram
    if (!tg) return
    const url = tg.startsWith('http') ? tg : `https://t.me/${tg.replace(/^@/, '').replace(/^t\.me\//, '')}`
    window.open(url, '_blank')
  }

  const filtered = schools.filter((s) =>
    `${s.schoolName} ${s.director} ${s.phone} ${s.login} ${s.notes ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  )

  const STATS = [
    { label: 'Jami mijozlar', value: schools.length, color: '#3b82f6', icon: Building2 },
    { label: 'Faol', value: active.length, color: '#22c55e', icon: CircleCheck },
    { label: 'Bloklangan', value: blocked.length, color: '#ef4444', icon: Ban },
  ]

  return (
    <div className="fade-in flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg shadow-soft">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Boshqaruv paneli</h1>
          <p className="text-sm text-muted">Egasi — mijozlar va ularga berilgan login/parollar</p>
        </div>
        <button onClick={() => { reset(); setOpen(true) }} className="btn btn-accent hover-lift ml-auto shadow-soft">
          <Plus size={16} /> Yangi mijoz
        </button>
      </div>

      {/* Rangli statistikalar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="card hover-lift relative overflow-hidden p-4"
              style={{ borderTop: `3px solid ${s.color}` }}
            >
              <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-10" style={{ background: s.color }} />
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${s.color}22`, color: s.color }}>
                <Icon size={20} />
              </div>
              <div className="mt-3 text-3xl font-black tabular-nums">{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Aloqa ma'lumotlari (mijozlar ko'radi) */}
      <div
        className={ownerContact.telegram ? 'card p-5' : 'card border-warn/40 bg-warn/5 p-5'}
      >
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <Send size={18} className="text-accent" /> Aloqa ma'lumotlari
          {!ownerContact.telegram && (
            <span className="chip ml-2 bg-warn/15 text-warn">⚠ sozlang</span>
          )}
        </h2>
        <p className="mb-3 text-sm text-muted">
          Bu ma'lumotlar Landing, Kirish va «Adminga murojaat» tugmalarida ishlatiladi.
          <b className="text-ink"> Agar Telegram manzilingiz kiritilmagan bo'lsa — mijozlar siz bilan bog'lana olmaydi va dasturni sotib ola olmaydi.</b>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telegram (username yoki havola)" hint="masalan: @erkinjon yoki t.me/erkinjon">
            <TextField
              value={ownerContact.telegram}
              onChange={(e) => setOwnerContact({ telegram: e.target.value })}
              placeholder="@username"
            />
          </Field>
          <Field label="Telefon raqami">
            <TextField
              value={ownerContact.phone}
              onChange={(e) => setOwnerContact({ phone: e.target.value })}
              placeholder="+998 90 123 45 67"
            />
          </Field>
        </div>
        {ownerContact.telegram ? (
          <p className="mt-2 text-xs text-ok">✓ Mijozlar Telegram orqali bog'lana oladi</p>
        ) : (
          <p className="mt-2 text-xs text-warn">
            ⚠ Telegram manzili kiritilmagan — Landing/Kirish ekranlarida «Sotib olish» tugmasi ko'rinmaydi
          </p>
        )}
      </div>

      {/* Egasi hisobi xavfsizligi */}
      <OwnerAccountCard />
      <OwnerRecoveryCard />
      <AuditLogCard />

      {/* Mijozlar ro'yxati */}
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Mijozlar (maktablar)</h2>
        <span className="chip">{schools.length}</span>
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qidirish..." className="input h-9 w-56 pl-8" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border py-16 text-center text-muted">
          <div>
            <Building2 size={40} className="mx-auto mb-2 text-accent/50" />
            <p>Hali mijoz qo'shilmagan.</p>
            <button onClick={() => { reset(); setOpen(true) }} className="btn btn-accent hover-lift mt-3">
              <Plus size={16} /> Birinchi mijoz qo'shish
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const show = revealed.has(s.licenseId)
            return (
              <div key={s.licenseId} className={cx('card hover-lift flex flex-col gap-3 p-5', s.blocked && 'opacity-60')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold leading-tight">
                        {s.schoolName}
                        {(s.plan === 'Pro' || s.plan === 'Premium') && <ProBadge size="xs" animated={false} />}
                      </div>
                      {s.director && <div className="text-xs text-muted">{s.director}</div>}
                    </div>
                  </div>
                  <span className={cx('chip shrink-0', s.blocked ? 'bg-danger/15 text-danger' : 'bg-ok/15 text-ok')}>
                    {s.blocked ? 'Bloklangan' : 'Faol'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <Info label="Tarif" value={s.plan} />
                  <Info label="Telefon" value={s.phone || '—'} />
                  <Info label="Qo'shilgan" value={new Date(s.issuedAt).toLocaleDateString('uz')} />
                </div>

                {/* Pro kalit — faqat Pro mijozlar uchun */}
                {(s.plan === 'Pro' || s.plan === 'Premium') && s.key && (
                  <div className="rounded-lg border border-amber-300/40 bg-gradient-to-br from-amber-50 to-orange-50 p-2.5 text-xs dark:border-amber-500/20 dark:from-amber-900/15 dark:to-orange-900/15">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-amber-900 dark:text-amber-200">Pro kalit</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(s.key).catch(() => {})
                          toast.success('Pro kalit nusxalandi')
                        }}
                        className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
                        title="Nusxa olish"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <code className="block select-all break-all rounded bg-white/70 px-2 py-1 font-mono text-amber-950 dark:bg-black/20 dark:text-amber-100">
                      {s.key}
                    </code>
                  </div>
                )}

                {/* Login va parol (mijozga berilgan) */}
                <div className="space-y-1.5 rounded-lg border border-border bg-surface-2/60 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-14 shrink-0 text-muted">Login:</span>
                    <code className="flex-1 select-all truncate rounded bg-surface px-2 py-0.5 font-mono">{s.login || '—'}</code>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-14 shrink-0 text-muted">Parol:</span>
                    <code className="flex-1 select-all truncate rounded bg-surface px-2 py-0.5 font-mono">
                      {show ? (s.password || '—') : '•'.repeat(Math.min(10, (s.password ?? '').length) || 1)}
                    </code>
                    <button onClick={() => toggleReveal(s.licenseId)} className="btn btn-outline h-7 px-1.5">
                      {show ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {s.notes && (
                  <p className="rounded-lg bg-surface-2/40 p-2 text-xs text-muted">{s.notes}</p>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    onClick={() => sendCredentialsViaTelegram(s)}
                    className="btn hover-lift h-8 flex-1 bg-[#2AABEE] text-xs text-white hover:brightness-110"
                    title="Login va parolni Telegram orqali yuborish"
                  >
                    <Send size={13} /> Yuborish
                  </button>
                  <button
                    onClick={() => openForEdit(s.licenseId)}
                    className="btn btn-outline hover-lift h-8 px-2 text-xs"
                    title="Tahrirlash"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setSchoolBlocked(s.licenseId, !s.blocked)}
                    className={cx('btn hover-lift h-8 flex-1 text-xs', s.blocked ? 'btn-accent' : 'btn-outline')}
                  >
                    {s.blocked ? <><CircleCheck size={13} /> Ochish</> : <><Ban size={13} /> Bloklash</>}
                  </button>
                  <button onClick={() => setDelId(s.licenseId)} className="btn btn-outline hover-lift h-8 px-2 text-danger" title="O'chirish">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mijoz qo'shish/tahrirlash modal */}
      <Modal
        open={open}
        title={editId ? 'Mijozni tahrirlash' : "Yangi mijoz qo'shish"}
        onClose={() => setOpen(false)}
        width="max-w-lg"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn btn-outline">Bekor</button>
            <button onClick={save} className="btn btn-accent"><Save size={15} /> Saqlash</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Maktab nomi" className="sm:col-span-2">
            <TextField value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="1-son maktab" autoFocus />
          </Field>
          <Field label="Direktor (F.I.Sh.)">
            <TextField value={director} onChange={(e) => setDirector(e.target.value)} placeholder="Aliyev Vali" />
          </Field>
          <Field label="Telefon">
            <TextField value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Login (mijozga berilgan)" hint="Mijoz dasturga shu login bilan kiradi">
            <TextField value={login} onChange={(e) => setLogin(e.target.value)} placeholder="maktab1_zavuch" className="font-mono" />
          </Field>
          <Field label="Parol (mijozga berilgan)" hint="Mijoz dasturga shu parolni ishlatadi">
            <div className="flex gap-2">
              <TextField value={password} onChange={(e) => setPassword(e.target.value)} placeholder="xjmp24d9" className="font-mono" />
              <button onClick={randomPassword} className="btn btn-outline shrink-0" title="Tasodifiy parol">
                🎲
              </button>
            </div>
          </Field>
          <Field label="Tarif">
            <SelectField value={plan} onChange={(e) => {
              const v = e.target.value as 'Free' | 'Pro'
              setPlan(v)
              if (v === 'Pro' && !proKey) setProKey(generateProKey())
            }}>
              <option value="Free">Free (bepul)</option>
              <option value="Pro">Pro (to‘liq imkoniyatlar)</option>
            </SelectField>
          </Field>
          {plan === 'Pro' ? (
            <Field label="Pro aktivatsiya kaliti" hint="Mijoz Sozlamalar'da shuni kiritadi">
              <div className="flex gap-2">
                <TextField
                  value={proKey}
                  onChange={(e) => setProKey(e.target.value.toUpperCase())}
                  placeholder="JPRO-XXXX-XXXX-XXXX"
                  className="font-mono"
                />
                <button
                  type="button"
                  onClick={() => setProKey(generateProKey())}
                  className="btn btn-outline"
                  title="Yangi kalit"
                >
                  🎲
                </button>
              </div>
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Field label="Eslatma (ixtiyoriy)" className="sm:col-span-2" hint="To'lov miqdori, sana, boshqa izohlar">
            <TextField value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="2026-10-05: 500 000 so'm" />
          </Field>
        </div>
        <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-xs text-muted">
          💡 Siz kiritgan login va parolni mijozga Telegramda yuboring. Mijoz dasturni ochib,
          «Zavuch — Kirish» → «Birinchi kirish» oynasida shu login va parolni kiritadi.
        </p>
      </Modal>

      <Modal
        open={!!delId}
        title="O'chirishni tasdiqlang"
        onClose={() => setDelId(null)}
        width="max-w-sm"
        footer={
          <>
            <button onClick={() => setDelId(null)} className="btn btn-outline">Bekor</button>
            <button onClick={() => { if (delId) removeSchool(delId); setDelId(null); toast.success("O'chirildi") }} className="btn btn-danger">
              O'chirish
            </button>
          </>
        }
      >
        <p className="text-sm">Ushbu mijoz yozuvini ro'yxatdan o'chirmoqchimisiz?</p>
      </Modal>
    </div>
  )
}

/** Egasi o'z login va parolini o'zgartirishi */
function OwnerAccountCard() {
  const ownerAuth = useAuth((s) => s.ownerAuth)
  const change = useAuth((s) => s.ownerChangeCredentials)
  const toast = useToast()
  const [cur, setCur] = useState('')
  const [login, setLogin] = useState(ownerAuth?.login ?? '')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const save = async () => {
    setErr(null)
    if (pw && pw !== pw2) {
      setErr('Yangi parollar mos kelmadi')
      return
    }
    const e = await change(cur, login, pw || undefined)
    if (e) setErr(e)
    else {
      toast.success("Egasi hisobi yangilandi")
      setCur('')
      setPw('')
      setPw2('')
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <UserCog size={18} className="text-accent" /> Hisob xavfsizligi
      </h2>
      <p className="mb-3 text-sm text-muted">
        Egasi login va parolini o'zgartirish. Joriy login: <b className="text-ink">{ownerAuth?.login}</b>.
        Parol o'zgarsa, maxfiy imzo kaliti yangi parol bilan qayta shifrlanadi.
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

/** Egasining parolini tiklash kodi (JP-XXXX-XXXX-XXXX). Faqat admin kiritsa, tiklash mumkin bo'ladi. */
function OwnerRecoveryCard() {
  const genCode = useAuth((s) => s.genOwnerRecoveryCode)
  const hasRecovery = useAuth((s) => !!s.ownerKeysEncByRecovery)
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!pw) return
    setBusy(true)
    try {
      const c = await genCode(pw)
      setCode(c)
      setPw('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <KeyRound size={18} className="text-accent" /> Admin parolini tiklash kodi
        {hasRecovery && <span className="chip ml-1 bg-ok/15 text-ok">✓ sozlangan</span>}
      </h2>
      <p className="mb-3 text-sm text-muted">
        <b className="text-ink">Juda muhim:</b> admin parolini unutsa — faqat shu <b>tiklash kodi</b>
        orqali tiklash mumkin. Kod formati: <code>JP-XXXX-XXXX-XXXX</code>. Kod faqat bir marta ko'rsatiladi
        — Telegramda saqlang yoki qog'ozga yozib qo'ying. Keyinchalik yangi kod yaratsangiz — eski bekor bo'ladi.
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-outline">
          {hasRecovery ? <><KeyRound size={15} /> Yangi tiklash kodi yaratish</> : <><KeyRound size={15} /> Tiklash kodi yaratish</>}
        </button>
      ) : code ? (
        <div className="rounded-xl border border-ok/40 bg-ok/5 p-4">
          <p className="mb-2 text-sm font-semibold text-ok">✓ Kod yaratildi — HOZIR saqlab oling!</p>
          <code className="block select-all rounded-lg bg-surface px-3 py-2 text-center font-mono text-lg tracking-wider">
            {code}
          </code>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(code).then(() => toast.success('Kod nusxalandi'))
              }}
              className="btn btn-outline flex-1"
            >
              <Copy size={14} /> Nusxa olish
            </button>
            <button
              onClick={() => {
                setCode(null)
                setOpen(false)
              }}
              className="btn btn-accent flex-1"
            >
              <Check size={14} /> Saqlab oldim
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <Field label="Joriy admin paroli (tasdiq)">
            <TextField type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="btn btn-outline">Bekor</button>
            <button onClick={create} disabled={!pw || busy} className="btn btn-accent flex-1 disabled:opacity-50">
              <KeyRound size={15} /> {busy ? 'Yaratilmoqda...' : 'Yaratish'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

/** Faollik jurnali (audit log) — qurilmadagi oxirgi 200 ta hodisa */
function AuditLogCard() {
  const audit = useAuth((s) => s.audit)
  const clearAudit = useAuth((s) => s.clearAudit)
  const [expanded, setExpanded] = useState(false)
  const toast = useToast()
  const shown = expanded ? audit : audit.slice(0, 10)

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <History size={18} className="text-accent" /> Faollik jurnali
        </h2>
        <span className="chip">{audit.length}</span>
        <button
          onClick={() => {
            if (confirm('Butun faollik jurnalini tozalaysizmi?')) {
              clearAudit()
              toast.success('Jurnal tozalandi')
            }
          }}
          disabled={audit.length === 0}
          className="btn btn-outline ml-auto h-8 text-xs disabled:opacity-40"
        >
          <Eraser size={13} /> Tozalash
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">
        Oxirgi 200 ta hodisa shu qurilmada saqlanadi: kirishlar, hisob yaratish/bloklash, litsenziya faollashtirish, parol tiklash.
      </p>
      {audit.length === 0 ? (
        <p className="text-sm text-muted">Jurnal bo'sh.</p>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          {shown.map((e) => (
            <div key={e.id} className="flex items-baseline gap-2 rounded-md bg-surface-2/60 px-2.5 py-1.5">
              <span className="shrink-0 text-xs text-muted">{new Date(e.at).toLocaleString('uz')}</span>
              <span className="font-medium">{e.action}</span>
              {e.detail && <span className="text-xs text-muted">— {e.detail}</span>}
            </div>
          ))}
          {audit.length > 10 && (
            <button onClick={() => setExpanded((v) => !v)} className="mt-1 self-start text-xs text-accent hover:underline">
              {expanded ? "Qisqartirish" : `Yana ${audit.length - 10} ta ko'rsatish`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
