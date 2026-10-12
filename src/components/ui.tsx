import { ChevronDown, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../i18n/I18nContext'

type Ring = 'solid' | 'dashed'

const RING: Record<Ring, string> = {
  solid: 'border border-hairline',
  // Dashed means not yet official, on Unofficial and provisional badges alike.
  dashed: 'border border-dashed border-faint',
}

/** DreamBig BadgePill. `dot` takes an accent background class. */
export function BadgePill({
  tone = 'ink',
  dot,
  ring,
  title,
  children,
}: {
  tone?: 'ink' | 'primary'
  dot?: string
  ring?: Ring
  title?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className={`inline-flex flex-none items-center gap-[6px] rounded-full bg-card px-xs py-xxs type-eyebrow ${
        tone === 'primary' ? 'text-primary' : 'text-ink'
      } ${ring ? RING[ring] : ''}`}
    >
      {dot ? <span className={`size-[6px] rounded-full ${dot}`} /> : null}
      {children}
    </span>
  )
}

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'md' | 'lg'

/** Classes for a DreamBig pill Button, for use on a button or a link. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', fullWidth = false): string {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-on-primary active:bg-primary-active',
    secondary: 'bg-card text-ink shadow-soft',
  }
  const sizes: Record<ButtonSize, string> = { md: 'px-[20px] py-[9px]', lg: 'px-xl py-[13px]' }
  return `press inline-flex items-center justify-center gap-xs whitespace-nowrap rounded-full border border-transparent type-button no-underline disabled:cursor-not-allowed disabled:opacity-40 ${
    variants[variant]
  } ${sizes[size]} ${fullWidth ? 'w-full' : ''}`
}

/** Classes for the 44px circular DreamBig IconButton on a light surface. */
export const iconButtonClass =
  'press inline-flex size-11 flex-none items-center justify-center rounded-full border-0 bg-translucent text-ink'

/** DreamBig EmptyState: also used for failed-to-load and not-found. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-[10px] rounded-well border border-hairline bg-canvas p-xxl text-center">
      <span className="mb-xxs inline-flex size-14 items-center justify-center rounded-full bg-card text-faint">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h2 className="type-heading-3">{title}</h2>
      {children ? <p className="max-w-[380px] type-body-md text-muted">{children}</p> : null}
      {action ? <div className="mt-xs">{action}</div> : null}
    </div>
  )
}

export type Option = { value: string; label: string; title?: string }

/** Pill-shaped switch between a few views. */
export function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full bg-hairline p-xxs">
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={`h-11 flex-1 rounded-full border-0 type-button ${
              on ? 'bg-card text-ink shadow-soft' : 'bg-transparent text-muted'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** A filter shown as a secondary pill ("Course: All"), backed by a native select. */
export function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}) {
  const { m, fill } = useI18n()
  const current = options.find((option) => option.value === value)
  return (
    <label className={`relative has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${buttonClass('secondary')}`}>
      <span>{fill(m.labelValue, { label, value: current?.label ?? '' })}</span>
      <ChevronDown size={18} aria-hidden="true" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Bar({ className }: { className: string }) {
  return <span className={`block rounded-sm ${className}`} />
}

/** Placeholder cards while a list loads, with the message for screen readers and slow signal. */
export function ListSkeleton({ message }: { message: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-sm">
      <p role="status" className="type-caption text-muted">
        {message}
      </p>
      {['w-1/2', 'w-3/5', 'w-[45%]'].map((width) => (
        <div key={width} className="flex flex-col gap-sm rounded-card border border-hairline bg-card p-md">
          <Bar className={`h-5 bg-hairline ${width}`} />
          <Bar className="h-[14px] w-3/4 bg-canvas" />
          <span className="flex gap-sm">
            <Bar className="h-8 flex-1 bg-canvas" />
            <Bar className="h-8 flex-1 bg-canvas" />
          </span>
        </div>
      ))}
    </div>
  )
}
