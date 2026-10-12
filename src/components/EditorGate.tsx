import { LogIn, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import type { Access } from '../lib/permissions'
import { CONTAINER } from './Layout'
import { LoadFailed } from './swim'
import { buttonClass, EmptyState, ListSkeleton } from './ui'

/**
 * Wraps an editor screen. A signed-out visitor is pointed at sign-in, and an account that may
 * not use the screen is told so, before any form is shown.
 */
export function EditorGate({
  allowed,
  children,
}: {
  /** Decides from the account's access. Left out, any signed-in account may pass. */
  allowed?: (access: Access) => boolean
  children: ReactNode
}) {
  const { m } = useI18n()
  const { status, access, accessLoading, accessFailed, retryAccess } = useAuth()
  const location = useLocation()

  let body: ReactNode
  if (status === 'loading' || (status === 'signedIn' && accessLoading)) {
    body = <ListSkeleton message={m.loading} />
  } else if (status === 'signedOut') {
    body = (
      <EmptyState
        icon={LogIn}
        title={m.signInToEditTitle}
        action={
          <Link
            to="/sign-in"
            state={{ from: location.pathname + location.search }}
            className={buttonClass('primary')}
          >
            {m.signIn}
          </Link>
        }
      >
        {m.signInToEditBody}
      </EmptyState>
    )
  } else if (accessFailed) {
    body = <LoadFailed onRetry={retryAccess} />
  } else if (!access || (allowed && !allowed(access))) {
    body = (
      <EmptyState
        icon={ShieldAlert}
        title={m.notAllowedTitle}
        action={
          <Link to="/" className={buttonClass('primary')}>
            {m.backToHome}
          </Link>
        }
      >
        {m.notAllowedBody}
      </EmptyState>
    )
  } else {
    return children
  }
  return <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>{body}</main>
}
