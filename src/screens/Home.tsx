import { ChevronRight, Plus, Users } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CONTAINER } from '../components/Layout'
import { CourseBadge, LoadFailed } from '../components/swim'
import { buttonClass, EmptyState, ListSkeleton } from '../components/ui'
import { useLookups, useSwimmers, useUpcomingMeets, type Meet } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { formatDateRange } from '../lib/dates'
import { canAddSwimmer } from '../lib/permissions'

/** The soonest meet each swimmer has an upcoming entry in. */
function nextMeets(upcoming: { swimmer_id: string; meet: Meet }[]): Map<string, Meet> {
  const next = new Map<string, Meet>()
  for (const { swimmer_id, meet } of upcoming) {
    const current = next.get(swimmer_id)
    if (!current || meet.start_date < current.start_date) next.set(swimmer_id, meet)
  }
  return next
}

export function Home() {
  const { m, lang, fill, pick } = useI18n()
  const swimmers = useSwimmers()
  const upcoming = useUpcomingMeets()
  const lookups = useLookups()
  const { status, access } = useAuth()

  // With one swimmer only, Home is skipped and opens that swimmer. A signed-in account stays,
  // because Home is where a swimmer is added.
  if (swimmers.data?.length === 1 && status === 'signedOut') {
    return <Navigate to={`/swimmers/${swimmers.data[0]!.slug}`} replace />
  }

  const failed = swimmers.isError || upcoming.isError || lookups.isError
  // Whether Home is skipped depends on being signed in, so wait to know.
  const ready = swimmers.data && upcoming.data && lookups.data && status !== 'loading'
  const next = nextMeets(upcoming.data ?? [])

  return (
    <main className={`flex flex-1 flex-col gap-md px-md py-lg ${CONTAINER}`}>
      <h1 className="type-heading-2">{m.swimmers}</h1>
      {failed ? (
        <LoadFailed
          onRetry={() => {
            for (const query of [swimmers, upcoming, lookups]) if (query.isError) void query.refetch()
          }}
        />
      ) : !ready ? (
        <ListSkeleton message={m.loading} />
      ) : swimmers.data.length === 0 ? (
        <EmptyState icon={Users} title={m.noSwimmersTitle}>
          {m.noSwimmersBody}
        </EmptyState>
      ) : (
        <ul className="grid gap-sm md:grid-cols-2">
          {swimmers.data.map((swimmer) => {
            const meet = next.get(swimmer.id)
            return (
              <li key={swimmer.id}>
                <Link
                  to={`/swimmers/${swimmer.slug}`}
                  className="flex min-h-[88px] items-center gap-md rounded-card border border-hairline bg-card p-md text-ink no-underline"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-xs">
                    <span className="type-heading-3 text-heading">
                      {pick(swimmer.display_name, swimmer.display_name_zh)}
                    </span>
                    {meet ? (
                      <span className="flex flex-wrap items-center gap-xs type-body-sm text-muted">
                        <span>
                          {fill(m.nextMeet, {
                            meet: pick(meet.name, meet.name_zh),
                            dates: formatDateRange(meet.start_date, meet.end_date, lang),
                          })}
                        </span>
                        <CourseBadge code={meet.course_code} lookups={lookups.data} />
                      </span>
                    ) : (
                      <span className="type-body-sm text-faint">{m.noMeetScheduled}</span>
                    )}
                  </span>
                  <ChevronRight size={20} aria-hidden="true" className="flex-none text-faint" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {ready && !failed && canAddSwimmer(access) ? (
        <div className="flex flex-col pt-xs md:items-start">
          <Link to="/swimmers/new" className={buttonClass('primary', 'lg', true)}>
            <Plus size={18} aria-hidden="true" />
            {m.addSwimmer}
          </Link>
        </div>
      ) : null}
    </main>
  )
}
