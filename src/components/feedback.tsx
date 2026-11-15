import { BellOff, Check, LoaderCircle, RotateCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { saveErrorKind } from '../lib/saveErrors'
import { ToastContext, type ToastTone } from './ToastContext'
import { buttonClass } from './ui'

const TOAST_MS = 3500

const TOAST_ICON: Record<ToastTone, { icon: LucideIcon; className: string }> = {
  done: { icon: Check, className: 'text-accent-green' },
  off: { icon: BellOff, className: 'text-muted' },
  error: { icon: TriangleAlert, className: 'text-accent-orange' },
}

/** DreamBig Toast, pinned bottom-centre above a form's action bar. Says what was saved, then goes away. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null)

  const show = useCallback(
    (message: string, tone: ToastTone = 'done') => setToast({ id: Date.now(), message, tone }),
    [],
  )
  const ToastIcon = toast ? TOAST_ICON[toast.tone].icon : null

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
        {toast && ToastIcon ? (
          <div className="inline-flex items-center gap-[10px] rounded-well border border-hairline bg-card px-md py-sm type-body-sm text-ink shadow-soft">
            <ToastIcon size={16} aria-hidden="true" className={`flex-none ${TOAST_ICON[toast.tone].className}`} />
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
    if (!error) return
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    // The database's own words are for whoever debugs this, not for the editor's screen.
    if (saveErrorKind(error) === 'unknown') console.error(error)
  }, [error])

  if (!error) return null
  const { title, body } = m.saveErrors[saveErrorKind(error)]
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

/**
 * DreamBig bottom sheet on the native dialog, for a short explanation and its actions.
 * `steps` are rows led by an icon tile; `note` is the small print under them.
 */
export function Sheet({
  title,
  children,
  steps,
  note,
  actions,
  onClose,
}: {
  title: string
  children?: ReactNode
  steps: { icon: LucideIcon; text: string }[]
  note?: string
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
      className="mx-auto mt-auto mb-0 max-h-[100dvh] w-full max-w-[min(480px,100vw)] overflow-y-auto rounded-t-well border-0 bg-card p-0 text-ink shadow-modal backdrop:bg-[rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-col gap-sm px-md pt-xs pb-[max(var(--spacing-md),env(safe-area-inset-bottom))]">
        <span aria-hidden="true" className="mx-auto h-[4px] w-9 rounded-full bg-hairline" />
        <h2 id={titleId} className="type-heading-3">
          {title}
        </h2>
        {children ? <p className="type-body-sm text-secondary">{children}</p> : null}
        <ul className="flex flex-col gap-xs">
          {steps.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-sm type-body-sm">
              <span className="inline-flex size-8 flex-none items-center justify-center rounded-sm bg-canvas">
                <Icon size={16} aria-hidden="true" />
              </span>
              {text}
            </li>
          ))}
        </ul>
        {note ? <p className="type-caption text-muted">{note}</p> : null}
        <div className="mt-xxs flex flex-col gap-xs">{actions}</div>
      </div>
    </dialog>
  )
}
