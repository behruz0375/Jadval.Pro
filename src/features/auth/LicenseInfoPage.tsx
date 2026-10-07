import { BadgeCheck, Cpu, User, Phone, Send } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { ContactAdmin } from '@/components/ContactAdmin'
import { APP_VERSION } from '@/constants'

/**
 * Dastur ma'lumoti sahifasi: qurilma kodi, joriy foydalanuvchi, admin aloqa.
 * Litsenziya tizimi olib tashlangan — dastur login/parol bilan ishlaydi.
 */
export function LicenseInfoPage() {
  const machineCode = useAuth((s) => s.machineCode)
  const role = useAuth((s) => s.role)
  const roleLabel = useAuth((s) => s.roleLabel)
  const staff = useAuth((s) => s.staff)
  const ownerContact = useAuth((s) => s.ownerContact)

  const activeStaff = role === 'director' ? staff.director : role === 'deputy' ? staff.deputy : null

  return (
    <div className="fade-in mx-auto max-w-3xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
          <BadgeCheck size={20} />
        </div>
        <h1 className="text-lg font-bold">Dastur ma'lumoti</h1>
        <span className="chip ml-2 bg-ok/15 text-ok">{APP_VERSION}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Info icon={User} label="Rol" value={roleLabel()} />
        {activeStaff && <Info icon={User} label="Login" value={activeStaff.login} mono />}
        <Info icon={Cpu} label="Qurilma kodi" value={machineCode} mono />
      </div>

      <div className="mt-6 space-y-3">
        <h2 className="font-semibold">Admin bilan aloqa</h2>
        <p className="text-sm text-muted">
          Login/parol unutilsa, yangi hisob yoki qo'shimcha huquqlar kerak bo'lsa — admin bilan Telegram orqali bog'laning.
        </p>
        {ownerContact.telegram || ownerContact.phone ? (
          <ContactAdmin variant="default" />
        ) : (
          <p className="rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
            Admin aloqa ma'lumotini kiritmagan.
          </p>
        )}
      </div>
    </div>
  )
}

function Info({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Cpu | typeof Phone | typeof Send
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <Icon size={18} className="mt-0.5 text-accent" />
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className={`mt-0.5 break-all font-medium ${mono ? 'font-mono text-sm' : ''}`}>{value}</div>
      </div>
    </div>
  )
}
