import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, SaveButton } from '../components/feedback'
import { TextField } from '../components/forms'
import { CONTAINER } from '../components/Layout'
import { useI18n } from '../i18n/I18nContext'
import { saveErrorKind } from '../lib/saveErrors'

type Failure = 'credentials' | 'noSignal' | 'other'

/** Email and password. There is no sign-up: accounts are created by the admin. */
export function SignIn() {
  const { m } = useI18n()
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)

  // Back to the page the visitor came from, never to another site.
  const from = (location.state as { from?: unknown } | null)?.from
  const target = typeof from === 'string' && from.startsWith('/') && !from.startsWith('/sign-in') ? from : '/'

  if (status === 'signedIn') return <Navigate to={target} replace />

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    // Read from the form itself: a password manager can fill fields without React hearing of it.
    const filled = new FormData(event.currentTarget)
    const typedEmail = String(filled.get('email') ?? email).trim()
    const typedPassword = String(filled.get('password') ?? password)
    if (typedEmail === '' || typedPassword === '') return
    setBusy(true)
    setFailure(null)
    signIn(typedEmail, typedPassword)
      .then(() => navigate(target, { replace: true }))
      .catch((error: unknown) => {
        const status = (error as { status?: number } | null)?.status
        setFailure(saveErrorKind(error) === 'noSignal' ? 'noSignal' : status === 400 ? 'credentials' : 'other')
        setBusy(false)
      })
  }

  const wrong = failure === 'credentials'
  return (
    <main className={`flex flex-1 flex-col px-md py-xxl ${CONTAINER}`}>
      <form
        onSubmit={submit}
        noValidate
        className="mx-auto flex w-full max-w-[420px] flex-col gap-md rounded-well border border-hairline bg-card p-lg shadow-soft"
      >
        <div className="flex flex-col gap-[6px]">
          <h1 className="type-heading-2">{m.signIn}</h1>
          <p className="type-body-sm text-muted">{m.signInIntro}</p>
        </div>
        {failure ? <Alert>{m.signInErrors[failure]}</Alert> : null}
        <TextField
          label={m.email}
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          placeholder={m.emailPlaceholder}
          value={email}
          onChange={setEmail}
          invalid={wrong}
        />
        <TextField
          label={m.password}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          invalid={wrong}
        />
        <SaveButton saving={busy} savingLabel={m.signingIn}>
          {m.signIn}
        </SaveButton>
        <p className="text-center type-caption text-muted">{m.accountsByAdmin}</p>
      </form>
    </main>
  )
}
