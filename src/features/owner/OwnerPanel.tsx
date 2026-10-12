import { useState, useEffect, useRef } from 'react'
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
  LogIn,
  Download,
  Upload,
  FileText,
  Clock,
  AlertTriangle,
  MessageSquare,
  Wrench,
  Package,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { useProject } from '@/store/project'
import { Field, TextField, SelectField } from '@/components/Field'
import { Modal } from '@/components/Modal'
import { cx, uid } from '@/utils'
import { generateProKey } from '@/features/pro/tier'
import { ProBadge } from '@/features/pro/ProBadge'
import { validateProject } from '@/engine/validate'
import type { Project } from '@/types'
import type { ValidationResult } from '@/engine/validate'

interface TemplateRecord {
  id: string
  name: string
  savedAt: string
  project: Project
}

export function OwnerPanel() {
  const schools = useAuth((s) => s.schools)
  const addCustomer = useAuth((s) => s.addCustomer)
  const provisionDirectorHere = useAuth((s) => s.provisionDirectorHere)
  const staffLogin = useAuth((s) => s.staffLogin)
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
  const [expiresAt, setExpiresAt] = useState('')
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

  const save = async () => {
    if (!schoolName.trim()) return toast.error('Maktab nomini kiriting')
    if (!login.trim()) return toast.error('Login kiriting')
    if (!password.trim()) return toast.error('Parolni kiriting')
    if (password.length < 4) return toast.error("Parol kamida 4 belgi bo'lsin")
    // Pro tanlangan va kalit yo'q bo'lsa — avto-generatsiya
    const key = plan === 'Pro' ? (proKey.trim() || generateProKey()) : ''
    const expiry = plan === 'Pro' && expiresAt ? new Date(expiresAt).toISOString() : undefined
    const isNew = !editId
    if (editId) {
      const err = updateCustomer(editId, { schoolName, director, phone, login, password, notes, plan, key, ...(expiry ? { expiresAt: expiry } : {}) })
      if (err) return toast.error(err)
      toast.success('Mijoz yangilandi')
    } else {
      const err = addCustomer({ schoolName, director, phone, login, password, notes, plan, key })
      if (err) return toast.error(err)
      // Pro muddatini belgilash (yangi mijoz)
      if (expiry) {
        const latest = useAuth.getState().schools
        if (latest[0]) updateCustomer(latest[0].licenseId, { expiresAt: expiry })
      }
      toast.success(plan === 'Pro' ? `Yangi Pro mijoz saqlandi. Kalit: ${key}` : 'Yangi mijoz saqlandi')
    }
    // MUHIM: shu qurilmada direktor hisobini ham sozlab beramiz —
    // admin chiqib → Zavuch bo'lib kirib testlab ko'ra oladi (scope o'zgartirmaydi).
    const perr = await provisionDirectorHere(login, password)
    if (perr) {
      toast.error('Direktor hisobini sozlashda xato: ' + perr)
    }
    // Yangi mijoz uchun — scope'ini tozalaymiz. Shu bilan admin'ning avvalgi
    // "oqib ketgan" ma'lumotlari (sinflar/o'qituvchilar/fanlar) bu mijozga ko'rinmaydi.
    if (isNew) {
      await useProject.getState().resetScope(`staff:${login.toLowerCase().trim()}`)
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
    setExpiresAt(s.expiresAt ? s.expiresAt.slice(0, 10) : '')
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
    setExpiresAt('')
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

  const proCust = schools.filter((s) => s.plan === 'Pro' || s.plan === 'Premium').length
  const thisWeekNew = schools.filter((s) => Date.now() - new Date(s.issuedAt).getTime() < 7 * 86400000).length
  const STATS = [
    { label: 'Jami mijozlar', value: schools.length, color: '#3b82f6', icon: Building2 },
    { label: 'Faol', value: active.length, color: '#22c55e', icon: CircleCheck },
    { label: 'Bloklangan', value: blocked.length, color: '#ef4444', icon: Ban },
    { label: 'Pro tarif', value: proCust, color: '#f59e0b', icon: Star },
    { label: 'Bu hafta yangi', value: thisWeekNew, color: '#8b5cf6', icon: TrendingUp },
  ]

  return (
    <div className="fade-in flex flex-col gap-5 p-4 pb-8 sm:p-5">
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* Pro kalit va eksport vositalari */}
      <BatchProKeyCard />
      <CustomerExportCard />
      <TelegramBatchCard />

      <AuditLogCard />

      {/* Shablonlar va diagnostika */}
      <TemplatesCard />
      <ProjectImportCard />
      <RemoteHelpCard />

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
                  <div className="flex flex-col items-end gap-1">
                    <span className={cx('chip shrink-0', s.blocked ? 'bg-danger/15 text-danger' : 'bg-ok/15 text-ok')}>
                      {s.blocked ? 'Bloklangan' : 'Faol'}
                    </span>
                    {(s.plan === 'Pro' || s.plan === 'Premium') && s.expiresAt && (() => {
                      const daysLeft = Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 86400000)
                      if (daysLeft < 0) return <span className="chip shrink-0 bg-danger/15 text-danger"><Clock size={10} /> Muddati tugagan</span>
                      if (daysLeft <= 7) return <span className="chip shrink-0 bg-warn/15 text-warn"><Clock size={10} /> {daysLeft} kun qoldi</span>
                      return null
                    })()}
                  </div>
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
                    onClick={async () => {
                      if (!s.login || !s.password) {
                        toast.error('Login/parol topilmadi')
                        return
                      }
                      const err = await provisionDirectorHere(s.login, s.password)
                      if (err) {
                        toast.error('Hisobni sozlashda xato: ' + err)
                        return
                      }
                      const loginErr = await staffLogin('director', s.login, s.password)
                      if (loginErr) {
                        toast.error('Zavuch loginida xato: ' + loginErr)
                        return
                      }
                      toast.success(`Zavuch sifatida kirdingiz — ${s.schoolName}`)
                    }}
                    className="btn hover-lift h-8 flex-1 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
                    title="Shu login/parol bilan Zavuch panelida testlab ko'rish"
                  >
                    <LogIn size={13} /> Sinab ko'rish
                  </button>
                  <button
                    onClick={async () => {
                      if (!s.login) {
                        toast.error('Login topilmadi')
                        return
                      }
                      if (!confirm(`${s.schoolName} mijoziga tegishli barcha jadval ma'lumotlari (sinflar, o'qituvchilar, fanlar, darslar) shu qurilmadan o'chiriladi. Bu amal faqat shu qurilmada ta'sir qiladi, mijozning o'z qurilmasidagi ma'lumotlariga tegmaydi. Davom etasizmi?`)) return
                      await useProject.getState().resetScope(`staff:${s.login.toLowerCase().trim()}`)
                      toast.success(`${s.schoolName} ma'lumotlari tozalandi`)
                    }}
                    className="btn btn-outline hover-lift h-8 px-2 text-xs text-amber-600 border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    title="Shu mijoz scope'idagi barcha jadval ma'lumotlarini tozalash (admin'ning avvalgi bug'li ma'lumotlarini olib tashlash uchun)"
                  >
                    <Eraser size={13} />
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
            <>
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
              <Field label="Pro muddati (tugash sanasi)" hint="Muddati o'tsa avtomatik Free ga tushadi">
                <TextField
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </Field>
            </>
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
        <p className="mt-2 rounded-lg bg-ok/5 px-3 py-2 text-xs text-ok">
          ✓ <b>Shu qurilmada ham</b>: saqlagandan so'ng «Chiqish» bosib Zavuch sifatida kirsangiz —
          aynan shu login/parol ishlaydi. Direktor hisobi avtomatik sozlanadi.
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

/** Faollik jurnali (audit log) — qurilmadagi oxirgi 200 ta hodisa — kengaytirilgan versiya */
function AuditLogCard() {
  const audit = useAuth((s) => s.audit)
  const clearAudit = useAuth((s) => s.clearAudit)
  const [expanded, setExpanded] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const toast = useToast()

  const filtered = audit.filter((e) => {
    if (searchQ && !`${e.action} ${e.detail ?? ''}`.toLowerCase().includes(searchQ.toLowerCase())) return false
    if (dateRange !== 'all') {
      const t = new Date(e.at).getTime()
      const now = Date.now()
      if (dateRange === 'today' && now - t > 86400000) return false
      if (dateRange === 'week' && now - t > 7 * 86400000) return false
      if (dateRange === 'month' && now - t > 30 * 86400000) return false
    }
    return true
  })
  const shown = expanded ? filtered : filtered.slice(0, 10)

  const actionColor = (action: string) => {
    if (action.includes('kirdi') || action.includes('Kirish')) return 'bg-ok/15 text-ok'
    if (action.includes('bloklandi') || action.includes('Bloklash')) return 'bg-danger/15 text-danger'
    if (action.includes('yaratildi') || action.includes('add')) return 'bg-accent/15 text-accent'
    if (action.includes('tiklandi') || action.includes('recover')) return 'bg-warn/15 text-warn'
    if (action.includes("o'chirildi") || action.includes('delete')) return 'bg-danger/15 text-danger'
    return 'bg-surface-2 text-muted'
  }

  const exportAuditCSV = () => {
    const header = 'Sana,Amal,Tafsilot'
    const rows = filtered.map((e) =>
      `"${new Date(e.at).toLocaleString('uz')}","${e.action}","${(e.detail ?? '').replace(/"/g, '""')}"`,
    )
    const csv = '﻿' + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jadvalpro-audit.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit CSV yuklandi')
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <History size={18} className="text-accent" /> Faollik jurnali
        </h2>
        <span className="chip">{filtered.length}/{audit.length}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Qidirish..."
              className="input h-8 w-40 pl-7 text-xs"
            />
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="input h-8 text-xs"
          >
            <option value="all">Barchasi</option>
            <option value="today">Bugun</option>
            <option value="week">Bu hafta</option>
            <option value="month">Bu oy</option>
          </select>
          <button
            onClick={exportAuditCSV}
            disabled={filtered.length === 0}
            className="btn btn-outline h-8 text-xs disabled:opacity-40"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => {
              if (confirm('Butun faollik jurnalini tozalaysizmi?')) {
                clearAudit()
                toast.success('Jurnal tozalandi')
              }
            }}
            disabled={audit.length === 0}
            className="btn btn-outline h-8 text-xs disabled:opacity-40"
          >
            <Eraser size={13} /> Tozalash
          </button>
        </div>
      </div>
      <p className="mb-3 text-sm text-muted">
        Oxirgi 200 ta hodisa shu qurilmada saqlanadi: kirishlar, hisob yaratish/bloklash, litsenziya faollashtirish, parol tiklash.
      </p>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {audit.length === 0 ? "Jurnal bo'sh." : 'Filtrga mos hodisa topilmadi.'}
        </p>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          {shown.map((e) => (
            <div key={e.id} className="flex items-baseline gap-2 rounded-md bg-surface-2/60 px-2.5 py-1.5">
              <span className="shrink-0 text-xs text-muted">{new Date(e.at).toLocaleString('uz')}</span>
              <span className={cx('chip text-[10px]', actionColor(e.action))}>{e.action}</span>
              {e.detail && <span className="text-xs text-muted">— {e.detail}</span>}
            </div>
          ))}
          {filtered.length > 10 && (
            <button onClick={() => setExpanded((v) => !v)} className="mt-1 self-start text-xs text-accent hover:underline">
              {expanded ? 'Qisqartirish' : `Yana ${filtered.length - 10} ta ko'rsatish`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ====================================================================
// Yangi kartalar (Feature 2-6, 9)
// ====================================================================

/** Feature 2: Batch Pro kalit generatsiya */
function BatchProKeyCard() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(10)
  const [keys, setKeys] = useState<string[]>([])

  const generate = () => {
    const k = Array.from({ length: Math.min(50, Math.max(1, qty)) }, () => generateProKey())
    setKeys(k)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(keys.join('\n')).then(() => toast.success('Barcha kalitlar nusxalandi'))
  }

  const exportCSV = () => {
    const csv = '﻿' + 'Kalit\n' + keys.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pro-keys.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV yuklandi')
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Package size={18} className="text-accent" /> Batch Pro kalitlar
      </h2>
      <p className="mb-3 text-sm text-muted">
        Bir nechta Pro aktivatsiya kalitini birdaniga yaratish. Kalitlar <code>JPRO-XXXX-XXXX-XXXX</code> formatida.
      </p>
      <button onClick={() => { setKeys([]); setOpen(true) }} className="btn btn-outline">
        <Zap size={15} /> Batch kalit yaratish
      </button>

      <Modal
        open={open}
        title="Batch Pro kalit yaratish"
        onClose={() => setOpen(false)}
        width="max-w-md"
        footer={
          keys.length > 0 ? (
            <>
              <button onClick={copyAll} className="btn btn-outline"><Copy size={14} /> Barchasini nusxalash</button>
              <button onClick={exportCSV} className="btn btn-accent"><Download size={14} /> CSV yuklab olish</button>
            </>
          ) : (
            <button onClick={generate} className="btn btn-accent"><Zap size={14} /> Yaratish</button>
          )
        }
      >
        {keys.length === 0 ? (
          <Field label="Soni (1-50)">
            <TextField
              type="number"
              min={1}
              max={50}
              value={String(qty)}
              onChange={(e) => setQty(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
            />
          </Field>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="mb-2 text-sm font-medium">{keys.length} ta kalit yaratildi:</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-2/60 p-2">
              {keys.map((k, i) => (
                <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-xs odd:bg-surface/60">
                  <code className="font-mono">{k}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(k).then(() => toast.success('Nusxalandi'))}
                    className="text-muted hover:text-accent"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/** Feature 3: Mijoz loyihasini ko'rish (import qilish) */
function ProjectImportCard() {
  const toast = useToast()
  const [stats, setStats] = useState<{
    schoolName: string
    classes: number
    subjects: number
    teachers: number
    rooms: number
    lessons: number
    timetables: number
  } | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Project
      if (!data.school || !data.classes) throw new Error('Noto\'g\'ri format')
      setStats({
        schoolName: data.school.name || 'Nomsiz',
        classes: data.classes?.length ?? 0,
        subjects: data.subjects?.length ?? 0,
        teachers: data.teachers?.length ?? 0,
        rooms: data.rooms?.length ?? 0,
        lessons: data.lessons?.length ?? 0,
        timetables: data.timetables?.length ?? 0,
      })
      setFileName(file.name)
    } catch {
      toast.error("Fayl o'qib bo'lmadi — noto'g'ri format")
      setStats(null)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <FileText size={18} className="text-accent" /> Mijoz loyihasini ko'rish
      </h2>
      <p className="mb-3 text-sm text-muted">
        Mijozning .jadvalpro yoki .json faylini yuklab, loyiha statistikasini ko'ring.
      </p>
      <label className="btn btn-outline cursor-pointer">
        <Upload size={15} /> Fayl tanlash
        <input
          ref={fileRef}
          type="file"
          accept=".jadvalpro,.json"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      {stats && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2/40 p-3">
          <p className="mb-2 text-sm font-medium">{fileName}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Info label="Maktab" value={stats.schoolName} />
            <Info label="Sinflar" value={String(stats.classes)} />
            <Info label="Fanlar" value={String(stats.subjects)} />
            <Info label="O'qituvchilar" value={String(stats.teachers)} />
            <Info label="Xonalar" value={String(stats.rooms)} />
            <Info label="Darslar" value={String(stats.lessons)} />
            <Info label="Jadvallar" value={String(stats.timetables)} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Feature 4: Jadval shablonlari */
function TemplatesCard() {
  const project = useProject((s) => s.project)
  const setProject = useProject((s) => s.setProject)
  const toast = useToast()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [name, setName] = useState('')
  const [showSave, setShowSave] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jadvalpro-templates')
      if (raw) setTemplates(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const persist = (t: TemplateRecord[]) => {
    setTemplates(t)
    try { localStorage.setItem('jadvalpro-templates', JSON.stringify(t)) } catch { /* ignore */ }
  }

  const saveTemplate = () => {
    if (!name.trim()) return toast.error('Shablon nomini kiriting')
    const rec: TemplateRecord = {
      id: uid('tpl_'),
      name: name.trim(),
      savedAt: new Date().toISOString(),
      project: structuredClone(project),
    }
    persist([rec, ...templates])
    toast.success(`"${name}" shablon sifatida saqlandi`)
    setName('')
    setShowSave(false)
  }

  const loadTemplate = (t: TemplateRecord) => {
    if (!confirm(`"${t.name}" shablonini joriy loyihaga yuklaysizmi? Joriy ma'lumotlar o'zgaradi.`)) return
    setProject(structuredClone(t.project))
    toast.success(`"${t.name}" shabloni yuklandi`)
  }

  const removeTemplate = (id: string) => {
    persist(templates.filter((t) => t.id !== id))
    toast.success("Shablon o'chirildi")
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <FileText size={18} className="text-accent" /> Jadval shablonlari
      </h2>
      <p className="mb-3 text-sm text-muted">
        Joriy loyihani shablon sifatida saqlang va keyin tezkor yuklang.
      </p>

      {showSave ? (
        <div className="mb-3 flex gap-2">
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shablon nomi"
            autoFocus
            className="flex-1"
          />
          <button onClick={saveTemplate} className="btn btn-accent"><Save size={14} /> Saqlash</button>
          <button onClick={() => setShowSave(false)} className="btn btn-outline">Bekor</button>
        </div>
      ) : (
        <button onClick={() => setShowSave(true)} className="btn btn-outline mb-3">
          <Save size={15} /> Joriy loyihani shablon sifatida saqlash
        </button>
      )}

      {templates.length === 0 ? (
        <p className="text-sm text-muted">Hali shablon yo'q.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/40 p-2.5 text-sm">
              <FileText size={16} className="shrink-0 text-accent" />
              <div className="flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted">{new Date(t.savedAt).toLocaleDateString('uz')}</div>
              </div>
              <button onClick={() => loadTemplate(t)} className="btn btn-outline h-7 text-xs">
                <Upload size={12} /> Yuklash
              </button>
              <button onClick={() => removeTemplate(t.id)} className="btn btn-outline h-7 px-1.5 text-danger">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Feature 5: Telegram batch xabar */
function TelegramBatchCard() {
  const schools = useAuth((s) => s.schools)
  const toast = useToast()
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null)
  const [sending, setSending] = useState(false)

  const withPhone = schools.filter((s) => s.phone && !s.blocked)

  const sendBatch = async () => {
    if (!message.trim()) return toast.error('Xabar matnini kiriting')
    if (withPhone.length === 0) return toast.error("Telefon raqami bor faol mijoz yo'q")
    setSending(true)
    setProgress({ sent: 0, total: withPhone.length })
    for (let i = 0; i < withPhone.length; i++) {
      const s = withPhone[i]
      const phone = s.phone.replace(/[\s\-()]/g, '')
      const encoded = encodeURIComponent(message.replace('{maktab}', s.schoolName).replace('{direktor}', s.director))
      window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank')
      setProgress({ sent: i + 1, total: withPhone.length })
      // Biroz kutish — brauzer har popup uchun blok qilmasligi uchun
      await new Promise((r) => setTimeout(r, 800))
    }
    setSending(false)
    toast.success(`${withPhone.length} ta mijozga Telegram link ochildi`)
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <MessageSquare size={18} className="text-accent" /> Telegram batch xabar
      </h2>
      <p className="mb-3 text-sm text-muted">
        Barcha faol mijozlarga (telefoni bor: {withPhone.length} ta) Telegram orqali xabar yuborish.
        <code className="ml-1 text-accent">{'{maktab}'}</code> va <code className="text-accent">{'{direktor}'}</code> o'rniga ma'lumot qo'yiladi.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Assalomu alaykum, {direktor}! {maktab} uchun yangilik bor..."
        rows={3}
        className="input mb-3 w-full resize-y text-sm"
      />
      {progress && (
        <div className="mb-3">
          <div className="mb-1 text-sm font-medium">Yuborildi: {progress.sent}/{progress.total}</div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(progress.sent / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      <button onClick={sendBatch} disabled={sending} className="btn btn-accent disabled:opacity-50">
        <Send size={15} /> {sending ? 'Yuborilmoqda...' : 'Barcha mijozlarga yuborish'}
      </button>
    </div>
  )
}

/** Feature 6: Mijozlar eksporti (CSV) */
function CustomerExportCard() {
  const schools = useAuth((s) => s.schools)
  const toast = useToast()

  const exportCSV = () => {
    const header = 'Maktab,Direktor,Telefon,Tarif,Login,Parol,Pro kalit,Qo\'shilgan,Bloklangan,Eslatma'
    const rows = schools.map((s) =>
      [
        s.schoolName,
        s.director,
        s.phone,
        s.plan,
        s.login ?? '',
        s.password ?? '',
        s.key,
        new Date(s.issuedAt).toLocaleDateString('uz'),
        s.blocked ? 'Ha' : "Yo'q",
        (s.notes ?? '').replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(','),
    )
    const csv = '﻿' + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jadvalpro-mijozlar.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV yuklandi')
  }

  const copyTable = () => {
    const header = 'Maktab\tDirektor\tTelefon\tTarif\tLogin\tParol\tKalit\tSana\tBlok\tEslatma'
    const rows = schools.map((s) =>
      [s.schoolName, s.director, s.phone, s.plan, s.login ?? '', s.password ?? '', s.key, new Date(s.issuedAt).toLocaleDateString('uz'), s.blocked ? 'Ha' : "Yo'q", s.notes ?? ''].join('\t'),
    )
    navigator.clipboard.writeText(header + '\n' + rows.join('\n')).then(() => toast.success('Jadval nusxalandi'))
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Download size={18} className="text-accent" /> Mijozlar eksporti
      </h2>
      <p className="mb-3 text-sm text-muted">
        Barcha mijozlar ro'yxatini CSV (Excel) formatida yuklab olish yoki clipboard ga nusxalash.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportCSV} disabled={schools.length === 0} className="btn btn-outline disabled:opacity-40">
          <Download size={15} /> Excel ga eksport ({schools.length})
        </button>
        <button onClick={copyTable} disabled={schools.length === 0} className="btn btn-outline disabled:opacity-40">
          <Copy size={15} /> Nusxa olish
        </button>
      </div>
    </div>
  )
}

/** Feature 9: Masofadan yordam — mijoz loyihasini tekshirish */
function RemoteHelpCard() {
  const toast = useToast()
  const [projectData, setProjectData] = useState<Project | null>(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Project
      if (!data.school || !data.classes) throw new Error('Noto\'g\'ri format')
      setProjectData(data)
      setFileName(file.name)
      setResult(null)
    } catch {
      toast.error("Fayl o'qib bo'lmadi — noto'g'ri format")
      setProjectData(null)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const runValidation = () => {
    if (!projectData) return
    const r = validateProject(projectData)
    setResult(r)
  }

  const downloadProject = () => {
    if (!projectData) return
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'project.jadvalpro'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Fayl yuklandi')
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Wrench size={18} className="text-accent" /> Masofadan yordam
      </h2>
      <p className="mb-3 text-sm text-muted">
        Mijozning loyiha faylini yuklab, xatolarni tekshiring va tuzatilgan faylni qaytaring.
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="btn btn-outline cursor-pointer">
          <Upload size={15} /> Loyiha faylini yuklash
          <input
            ref={fileRef}
            type="file"
            accept=".jadvalpro,.json"
            onChange={handleFile}
            className="hidden"
          />
        </label>
        {projectData && (
          <>
            <button onClick={runValidation} className="btn btn-accent">
              <AlertTriangle size={15} /> Xatolarni tekshirish
            </button>
            <button onClick={downloadProject} className="btn btn-outline">
              <Download size={15} /> Faylni yuklab olish
            </button>
          </>
        )}
      </div>
      {projectData && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2/40 p-3">
          <p className="mb-1 text-sm font-medium">{fileName} — {projectData.school.name || 'Nomsiz'}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-4">
            <Info label="Sinflar" value={String(projectData.classes.length)} />
            <Info label="Fanlar" value={String(projectData.subjects.length)} />
            <Info label="O'qituvchilar" value={String(projectData.teachers.length)} />
            <Info label="Darslar" value={String(projectData.lessons.length)} />
          </div>
        </div>
      )}
      {result && (
        <div className="mt-3 rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            {result.ok ? (
              <span className="chip bg-ok/15 text-ok"><Check size={12} /> Xato topilmadi</span>
            ) : (
              <span className="chip bg-danger/15 text-danger"><AlertTriangle size={12} /> {result.issues.filter((i) => i.severity === 'error').length} xato</span>
            )}
            {result.issues.filter((i) => i.severity === 'warning').length > 0 && (
              <span className="chip bg-warn/15 text-warn">{result.issues.filter((i) => i.severity === 'warning').length} ogohlantirish</span>
            )}
          </div>
          <p className="mb-2 text-xs text-muted">{result.summary}</p>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {result.issues.map((issue, i) => (
              <div
                key={i}
                className={cx(
                  'rounded-md px-2.5 py-1.5 text-xs',
                  issue.severity === 'error' ? 'bg-danger/10 text-danger' : issue.severity === 'warning' ? 'bg-warn/10 text-warn' : 'bg-surface-2 text-muted',
                )}
              >
                <span className="font-medium">{issue.message}</span>
                {issue.hint && <span className="ml-1 text-muted"> — {issue.hint}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
