import { ChevronDown, ChevronLeft, X } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'
import type { FieldError } from '../lib/forms'
import { CONTAINER } from './Layout'
import { iconButtonClass, type Option } from './ui'

// DreamBig TextInput chrome, grown to a 44px touch target. 16px type keeps iOS from zooming
// the page when a field takes focus.
const FIELD =
  'min-h-11 w-full rounded-xs border bg-card px-sm py-[6px] type-body-md text-ink transition-[box-shadow,border-color] placeholder:text-faint focus:shadow-soft disabled:bg-canvas disabled:text-muted'

export const fieldClass = (invalid: boolean) => `${FIELD} ${invalid ? 'border-accent-orange' : 'border-input'}`

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: FieldError
  children: ReactNode
}) {
  const { m } = useI18n()
  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <label htmlFor={id} className="type-caption text-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-note`} className="type-caption text-accent-orange">
          {m.fieldErrors[error]}
        </span>
      ) : hint ? (
        <span id={`${id}-note`} className="type-caption text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

type InputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'name' | 'type' | 'placeholder' | 'autoComplete' | 'inputMode' | 'disabled' | 'min' | 'max' | 'autoCapitalize' | 'lang'
>

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  invalid = false,
  ...input
}: InputProps & {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: FieldError
  /** Marks the field without a message of its own, as on a failed sign-in. */
  invalid?: boolean
}) {
  const id = useId()
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={fieldClass(Boolean(error) || invalid)}
        {...input}
      />
    </Field>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <Field id={id} label={label}>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`resize-y ${fieldClass(false)}`}
      />
    </Field>
  )
}

/** Select from the components sheet: TextInput chrome with a chevron. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  /** Shown as the blank choice. Left out, one of the options is always chosen. */
  placeholder?: string
  hint?: string
  error?: FieldError
}) {
  const id = useId()
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <span className="relative flex">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          className={`appearance-none pr-xxl ${fieldClass(Boolean(error))} ${value === '' ? 'text-faint' : ''}`}
        >
          {placeholder === undefined ? null : <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-sm -translate-y-1/2 text-muted"
        />
      </span>
    </Field>
  )
}

/** Goes back one page, or to `fallback` when the screen was opened from a link. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key === 'default' ? navigate(fallback, { replace: true }) : navigate(-1))
}

/** Title bar of a form screen: cancel or back, the title, and what goes under it. */
export function FormHeader({
  title,
  onLeave,
  leave = 'cancel',
  leaveLabel,
  aside,
  children,
}: {
  title: string
  onLeave: () => void
  leave?: 'cancel' | 'back'
  leaveLabel?: string
  aside?: ReactNode
  children?: ReactNode
}) {
  const { m } = useI18n()
  const Icon = leave === 'cancel' ? X : ChevronLeft
  return (
    <div className="flex-none border-b border-hairline bg-card">
      <div className={`flex flex-col gap-sm py-sm pr-md pl-xs ${CONTAINER}`}>
        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={onLeave}
            aria-label={leaveLabel ?? (leave === 'cancel' ? m.cancel : m.back)}
            className={iconButtonClass}
          >
            <Icon size={20} aria-hidden="true" />
          </button>
          <h1 className="flex-1 type-heading-2">{title}</h1>
          {aside}
        </div>
        {children}
      </div>
    </div>
  )
}

/** The bar a form's main action sits in, kept in reach at the bottom of the screen. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex-none border-t border-hairline bg-card">
      <div className={`flex flex-col gap-xs p-md ${CONTAINER}`}>{children}</div>
    </div>
  )
}

/** A white card holding one group of fields. */
export function FormSection({
  title,
  icon,
  featured = false,
  children,
}: {
  title: string
  icon?: ReactNode
  /** Warm paper fill, used to set the private fields apart. */
  featured?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`flex flex-col gap-md rounded-card border border-hairline p-lg ${featured ? 'bg-featured' : 'bg-card'}`}
    >
      <div className="flex items-center gap-xs">
        {icon}
        <h2 className="flex-1 type-title">{title}</h2>
      </div>
      {children}
    </section>
  )
}
