import { cx } from '@/utils'

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  className?: string
}) {
  return (
    <label className={cx('flex flex-col gap-1', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('input', props.className)} />
}

export function NumberField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" {...props} className={cx('input', props.className)} />
}

export function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx('input', props.className)} />
}
