import { CircleUser, LogOut, RotateCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { usePendingResults } from '../data/PendingResultsContext'
import { PendingResultsProvider } from '../data/PendingResultsProvider'
import { useI18n } from '../i18n/I18nContext'
import type { Lang } from '../lib/dates'
import { Alert, Modal, ToastProvider } from './feedback'
import { buttonClass, iconButtonClass } from './ui'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中文' },
]

/** Content column: full width on a phone, centred on desktop. */
export const CONTAINER = 'mx-auto w-full max-w-desktop'

function LanguageToggle() {
  const { lang, setLang, m } = useI18n()
  return (
    <div role="group" aria-label={m.language} className="inline-flex rounded-full bg-canvas">
      {LANGS.map(({ value, label }) => {
        const on = value === lang
        return (
          <button
            key={value}
            type="button"
            lang={value === 'zh' ? 'zh-Hans' : 'en'}
            aria-pressed={on}
            onClick={() => setLang(value)}
            className={`h-11 min-w-14 rounded-full border-0 px-sm type-button ${
              on ? 'bg-card text-ink shadow-soft' : 'bg-transparent text-muted'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** The account button and its menu: who is signed in, and sign out. */
function AccountMenu() {
  const { m, fill } = useI18n()
  const { email, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        aria-label={m.account}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={iconButtonClass}
      >
        <CircleUser size={20} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={m.account}
          className="absolute top-full right-0 z-40 mt-xs flex w-64 max-w-[calc(100vw-32px)] flex-col gap-xs rounded-card border border-hairline bg-card p-xs shadow-modal"
        >
          <span className="px-sm pt-xs type-caption break-all text-muted">
            {email ? fill(m.signedInAs, { email }) : m.signedIn}
          </span>
          {failed ? <Alert title={m.signOutFailed} /> : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setFailed(false)
              signOut().catch(() => setFailed(true))
            }}
            className="press flex min-h-11 items-center gap-sm rounded-sm border-0 bg-transparent px-sm text-left type-button text-ink active:bg-canvas"
          >
            <LogOut size={18} aria-hidden="true" />
            {m.signOut}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Times that failed to save, on every screen until they are saved or discarded: the sheet that
 * typed them may be long closed.
 */
function UnsavedResults() {
  const { m, fill, plural } = useI18n()
  const { pending, retry, discard } = usePendingResults()
  const [confirming, setConfirming] = useState(false)
  const failed = [...pending.values()].filter((p) => p.state === 'failed')
  if (failed.length === 0) return null

  const reason = failed.find((p) => p.error)?.error
  const ids = failed.map((p) => p.entryId)
  return (
    <div className={`flex-none px-md pt-md ${CONTAINER}`}>
      <Alert
        title={plural(m.timesNotSaved, failed.length)}
        action={
          <div className="flex flex-none flex-col items-stretch gap-xxs">
            <button type="button" onClick={() => retry(ids)} className={buttonClass('primary')}>
              <RotateCw size={18} aria-hidden="true" />
              {m.retry}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="min-h-11 border-0 bg-transparent type-caption text-secondary underline"
            >
              {m.discard}
            </button>
          </div>
        }
      >
        {failed.map((p) => p.label).join(' · ')}. {reason ? `${m.saveErrors[reason.kind].title} ` : null}
        {m.keptOnPhone}
      </Alert>
      {confirming ? (
        <Modal
          title={plural(m.discardUnsaved, failed.length)}
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  discard(ids)
                  setConfirming(false)
                }}
                className={buttonClass('primary', 'lg', true)}
              >
                <Trash2 size={18} aria-hidden="true" />
                {m.discard}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={buttonClass('secondary', 'lg', true)}
              >
                {m.cancel}
              </button>
            </>
          }
        >
          {fill(m.discardUnsavedBody, { labels: failed.map((p) => p.label).join(' · ') })}
        </Modal>
      ) : null}
    </div>
  )
}

export function Layout() {
  const { m } = useI18n()
  const { status } = useAuth()
  const location = useLocation()
  return (
    <ToastProvider>
      <PendingResultsProvider>
        <div className="flex min-h-dvh flex-col bg-canvas text-ink">
          <header className="flex-none border-b border-hairline bg-card">
            <div className={`flex h-[60px] items-center gap-sm px-md ${CONTAINER}`}>
              <Link
                to="/"
                className="flex-1 text-[length:var(--size-title)] leading-none font-bold tracking-[-0.8px] text-heading no-underline"
              >
                {m.appName}
              </Link>
              <LanguageToggle />
              {status === 'signedIn' ? <AccountMenu /> : null}
              {status === 'signedOut' && location.pathname !== '/sign-in' ? (
                <Link
                  to="/sign-in"
                  state={{ from: location.pathname + location.search }}
                  className="inline-flex min-h-11 flex-none items-center px-xs type-button text-ink no-underline"
                >
                  {m.signIn}
                </Link>
              ) : null}
            </div>
          </header>
          <UnsavedResults />
          <Outlet />
        </div>
      </PendingResultsProvider>
    </ToastProvider>
  )
}
