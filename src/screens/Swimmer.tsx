import { ChevronLeft, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CONTAINER } from '../components/Layout'
import { LoadFailed } from '../components/swim'
import { Bar, iconButtonClass, ListSkeleton } from '../components/ui'
import { useEntriesOfSwimmers, useLookups, useSwimmers, type Entry, type Lookups, type Swimmer } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { personalBestsOf } from '../lib/entries'
import type { PersonalBests } from '../lib/personalBests'
import { canEditEntries, canManageSwimmer } from '../lib/permissions'
import { NotFoundState } from './NotFound'

export type SwimmerContext = {
  swimmer: Swimmer
  /** Every entry of this swimmer, upcoming and finished. */
  entries: Entry[]
  lookups: Lookups
  bests: PersonalBests
  /** True when the signed-in account may add, edit and delete this swimmer's entries. */
  canEdit: boolean
}

export function useSwimmerContext() {
  return useOutletContext<SwimmerContext>()
}

/** Swimmer header and tabs; the tab screens render inside once the data is in. */
export function SwimmerScreen() {
  const { slug } = useParams()
  const { m, pick } = useI18n()
  const swimmers = useSwimmers()
  const lookups = useLookups()
  const { status, access } = useAuth()
  const swimmer = swimmers.data?.find((s) => s.slug === slug)
  const entries = useEntriesOfSwimmers(swimmer ? [swimmer.id] : undefined)

  const bests = useMemo(
    () => (entries.data && lookups.data ? personalBestsOf(entries.data, lookups.data) : undefined),
    [entries.data, lookups.data],
  )

  const failed = swimmers.isError || lookups.isError || entries.isError
  const notFound = swimmers.data !== undefined && !swimmer
  const tabs = [
    { to: 'upcoming', label: m.upcoming },
    { to: 'results', label: m.results },
    { to: 'personal-bests', label: m.personalBests },
  ]

  if (notFound) {
    return (
      <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>
        <NotFoundState title={m.swimmerNotFoundTitle} body={m.swimmerNotFoundBody} />
      </main>
    )
  }

  return (
    <>
      <div className="flex-none border-b border-hairline bg-card">
        <div className={CONTAINER}>
          <div className="flex min-h-[60px] items-center gap-xs py-xs pr-md pl-xs">
            {/* Home redirects a visitor here when there is only one swimmer, so there is nothing to go back to. */}
            {swimmers.data && (swimmers.data.length > 1 || status === 'signedIn') ? (
              <Link to="/" aria-label={m.backToSwimmers} className={iconButtonClass}>
                <ChevronLeft size={20} aria-hidden="true" />
              </Link>
            ) : (
              <span className="w-xs" />
            )}
            {swimmer ? (
              <h1 className="flex-1 type-heading-1">{pick(swimmer.display_name, swimmer.display_name_zh)}</h1>
            ) : failed ? null : (
              <Bar className="h-9 w-2/5 bg-hairline" />
            )}
            {swimmer && canManageSwimmer(access, swimmer.id) ? (
              <Link
                to={`/swimmers/${swimmer.slug}/settings`}
                aria-label={m.swimmerSettings}
                className={iconButtonClass}
              >
                <Settings size={20} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          <nav aria-label={m.swimmerSections} className="flex px-xs">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                replace
                className={({ isActive }) =>
                  `flex min-h-12 flex-1 items-center justify-center border-b-2 text-center type-button no-underline md:flex-none md:px-lg ${
                    isActive ? 'border-primary text-heading' : 'border-transparent text-muted'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <main className={`flex flex-1 flex-col gap-md p-md ${CONTAINER}`}>
        {failed ? (
          <LoadFailed
            onRetry={() => {
              for (const query of [swimmers, lookups, entries]) if (query.isError) void query.refetch()
            }}
          />
        ) : swimmer && entries.data && lookups.data && bests ? (
          <Outlet
            context={
              {
                swimmer,
                entries: entries.data,
                lookups: lookups.data,
                bests,
                canEdit: canEditEntries(access, swimmer.id),
              } satisfies SwimmerContext
            }
          />
        ) : (
          <ListSkeleton message={m.loading} />
        )}
      </main>
    </>
  )
}
