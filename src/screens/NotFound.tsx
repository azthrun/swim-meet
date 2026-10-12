import { SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CONTAINER } from '../components/Layout'
import { buttonClass, EmptyState } from '../components/ui'
import { useI18n } from '../i18n/I18nContext'

/** Unknown swimmer, meet or page: the system's EmptyState with a link home. */
export function NotFoundState({ title, body }: { title: string; body: string }) {
  const { m } = useI18n()
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      action={
        <Link to="/" className={buttonClass('primary')}>
          {m.backToHome}
        </Link>
      }
    >
      {body}
    </EmptyState>
  )
}

export function NotFound() {
  const { m } = useI18n()
  return (
    <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>
      <NotFoundState title={m.pageNotFoundTitle} body={m.pageNotFoundBody} />
    </main>
  )
}
