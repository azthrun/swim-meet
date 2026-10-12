import { Check, LoaderCircle, RotateCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { saveErrorKind, saveErrorMessage } from '../lib/saveErrors'
import { ToastContext } from './ToastContext'
import { buttonClass } from './ui'

const TOAST_MS = 3500

/** DreamBig Toast, pinned bottom-centre above a form's action bar. Says what was saved, then goes away. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)

  const show = useCallback((message: string) => setToast({ id: Date.now(), message }), [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[104px] z-50 flex justify-center px-md"
      >
        {toast ? (
          <div className="inline-flex items-center gap-[10px] rounded-well border border-hairline bg-card px-md py-sm type-body-sm text-ink shadow-soft">
            <Check size={16} aria-hidden="true" className="flex-none text-accent-green" />
            <span>{toast.message}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}

/** A warning that stays put: 2px orange ring, the focus-ring width. */
export function Alert({ title, children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-sm rounded-card border-2 border-accent-orange bg-card px-md py-sm">
      <TriangleAlert size={20} aria-hidden="true" className="mt-[2px] flex-none text-accent-orange" />
      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
        {title ? <span className="type-body-sm font-semibold">{title}</span> : null}
        {children ? <span className="type-caption break-words text-secondary">{children}</span> : null}
      </div>
      {action}
    </div>
  )
}

/**
 * A failed write. Stays on screen until it is retried; the form behind it keeps what was typed.
 * Renders nothing while there is no error.
 */
export function SaveFailed({ error, onRetry, saving }: { error: unknown; onRetry: () => void; saving: boolean }) {
  const { m } = useI18n()
  const ref = useRef<HTMLDivElement>(null)

  // The save button may be a screen away from where the banner appears.
  useEffect(() => {
    if (error) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [error])

  if (!error) return null
  const kind = saveErrorKind(error)
  const { title, body } = m.saveErrors[kind]
  const detail = kind === 'unknown' ? saveErrorMessage(error) : ''
  return (
    <div ref={ref} className="scroll-m-md">
      <Alert
        title={title}
        action={
          <button type="button" onClick={onRetry} disabled={saving} className={`flex-none ${buttonClass('primary')}`}>
            <RotateCw size={18} aria-hidden="true" className={saving ? 'animate-spin' : ''} />
            {m.retry}
          </button>
        }
      >
        {body}
        {detail ? ` (${detail})` : null}
      </Alert>
    </div>
  )
}

/** The primary action of a form. Shows that a save is under way and cannot be sent twice. */
export function SaveButton({
  saving,
  icon: Icon,
  children,
  disabled = false,
  variant = 'primary',
  savingLabel,
  onClick,
}: {
  saving: boolean
  /** Said while busy, in place of "Saving…". */
  savingLabel?: string
  icon?: LucideIcon
  children: ReactNode
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  /** Left out, the button submits the form it is in. */
  onClick?: () => void
}) {
  const { m } = useI18n()
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={saving || disabled}
      aria-busy={saving}
      className={buttonClass(variant, 'lg', true)}
    >
      {saving ? (
        <LoaderCircle size={18} aria-hidden="true" className="animate-spin" />
      ) : Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : null}
      {saving ? (savingLabel ?? m.saving) : children}
    </button>
  )
}

/** DreamBig Modal on the native dialog, which traps focus and closes on Escape. */
export function Modal({
  title,
  children,
  actions,
  onClose,
}: {
  title: string
  children: ReactNode
  actions: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the scrim lands on the dialog element itself.
        if (event.target === ref.current) onClose()
      }}
      className="m-auto w-[480px] max-w-[calc(100vw-48px)] rounded-well border-0 bg-card p-0 text-ink shadow-modal backdrop:bg-[rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-col gap-[14px] p-lg">
        <h2 id={titleId} className="type-heading-3">
          {title}
        </h2>
        <div className="flex flex-col gap-sm type-body-sm text-secondary">{children}</div>
        <div className="mt-xxs flex flex-col gap-xs">{actions}</div>
      </div>
    </dialog>
  )
}
