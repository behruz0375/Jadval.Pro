// ============================================================
// ContactAdmin — Telegram orqali adminga murojaat qilish uchun
// reusable UI blok (login/activate/account ekranlarida ishlatiladi)
// ============================================================
import { Send, Phone, ShoppingBag, MessageCircle } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useToast } from '@/store/toast'
import { useT } from '@/i18n'
import { telegramUrl } from '@/utils'
import { cx } from '@/utils'

interface Props {
  /** Avtomatik nusxalanadigan matn (bo'lsa) */
  message?: string
  /** Katta "Sotib olish" rejimi — buy call-to-action */
  variant?: 'default' | 'buy' | 'compact'
  /** Ustki label (sarlavha) */
  label?: string
  className?: string
}

export function ContactAdmin({ message, variant = 'default', label, className }: Props) {
  const ownerContact = useAuth((s) => s.ownerContact)
  const toast = useToast()
  const t = useT()

  const open = async () => {
    if (message) {
      try {
        await navigator.clipboard.writeText(message)
        toast.success(t("Xabar nusxalandi — Telegramga joylang"))
      } catch {
        /* clipboard yo'q bo'lsa — jim o'tkazamiz */
      }
    }
    const url = telegramUrl(ownerContact.telegram)
    if (!url) {
      toast.error(t("Admin aloqa ma'lumoti kiritilmagan"))
      return
    }
    window.open(url, '_blank')
  }

  const hasAnyContact = Boolean(ownerContact.telegram) || Boolean(ownerContact.phone)
  if (!hasAnyContact && variant !== 'buy') {
    return (
      <div className={cx('rounded-lg border border-dashed border-border bg-surface-2/40 p-3 text-center text-xs text-muted', className)}>
        {t("Admin aloqa ma'lumotini kiritmagan — dastur egasiga murojaat qiling.")}
      </div>
    )
  }

  if (variant === 'buy') {
    return (
      <div className={cx('rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-4', className)}>
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-accent" />
          <h3 className="font-semibold">{t('Dasturni sotib olish')}</h3>
        </div>
        <p className="mt-2 text-sm text-muted">
          {t("JadvalPro — maktab uchun dars jadvali tuzuvchi dastur. To'lov qilib, admindan login, parol va faollashtirish kalitini oling.")}
        </p>
        {ownerContact.telegram ? (
          <button onClick={open} className="btn hover-lift mt-3 w-full bg-[#2AABEE] text-white hover:brightness-110">
            <Send size={16} /> {t('Adminga Telegramda yozish')}
          </button>
        ) : (
          <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-center text-xs text-warn">
            {t("Admin Telegram manzilini kiritmagan — joriy maktabda sozlang.")}
          </p>
        )}
        {ownerContact.phone && (
          <a
            href={`tel:${ownerContact.phone.replace(/\s/g, '')}`}
            className="btn btn-outline hover-lift mt-2 w-full"
          >
            <Phone size={15} /> {ownerContact.phone}
          </a>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cx('flex flex-wrap items-center justify-center gap-2 text-xs', className)}>
        {label && <span className="text-muted">{t(label)}</span>}
        {ownerContact.telegram && (
          <button onClick={open} className="inline-flex items-center gap-1 rounded-md bg-[#2AABEE]/15 px-2 py-1 text-[#2AABEE] hover:bg-[#2AABEE]/25">
            <Send size={13} /> {t('Adminga yozish')}
          </button>
        )}
        {ownerContact.phone && (
          <a href={`tel:${ownerContact.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 rounded-md bg-ok/15 px-2 py-1 text-ok hover:bg-ok/25">
            <Phone size={12} /> {ownerContact.phone}
          </a>
        )}
      </div>
    )
  }

  // default
  return (
    <div className={cx('rounded-xl border border-border bg-surface-2/60 p-3', className)}>
      {label && (
        <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <MessageCircle size={13} /> {t(label)}
        </p>
      )}
      {ownerContact.telegram && (
        <button onClick={open} className="btn hover-lift w-full bg-[#2AABEE] text-white hover:brightness-110">
          <Send size={16} /> {t('Adminga Telegramda yozish')}
        </button>
      )}
      {ownerContact.phone && (
        <a
          href={`tel:${ownerContact.phone.replace(/\s/g, '')}`}
          className="btn btn-outline hover-lift mt-2 w-full"
        >
          <Phone size={15} /> {ownerContact.phone}
        </a>
      )}
    </div>
  )
}
