import { CalendarPlus, ChevronLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CONTAINER } from '../components/Layout'
import {
  CourseBadge,
  Drop,
  LiveResultsLink,
  LoadFailed,
  MeetPlace,
  PersonalBestBadge,
  RelayBadge,
  RelayTile,
  StatusBlock,
  UnofficialBadge,
  useEventLabel,
} from '../components/swim'
import { Bar, EmptyState, iconButtonClass, ListSkeleton } from '../components/ui'
import { useEntriesOfSwimmers, useLookups, useMeet, type Entry, type Lookups, type Swimmer } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { formatDateRangeWithDays, formatDay } from '../lib/dates'
import { byMeetOrder, dropAgainstSeed, groupBy, isRelay, personalBestBadge, personalBestsOf } from '../lib/entries'
import { SWUM, type PersonalBests } from '../lib/personalBests'
import { formatTime } from '../lib/time'
import { NotFoundState } from './NotFound'

function TimeCell({ label, timeCs, official }: { label: string; timeCs: number | null; official: boolean }) {
  const { m } = useI18n()
  return (
    <div className="flex flex-col gap-xxs">
      <span className="type-eyebrow text-muted uppercase">{label}</span>
      {timeCs === null ? (
        <span aria-label={m.noTimeYet} className="type-heading-2 text-faint">
          —
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-xs">
          <span className={`type-heading-2 tabular ${official ? 'text-heading' : 'text-secondary'}`}>
            {formatTime(timeCs)}
          </span>
          {official ? null : <UnofficialBadge />}
        </span>
      )}
    </div>
  )
}

function EntryCard({
  entry,
  lookups,
  swimmer,
  bests,
}: {
  entry: Entry
  lookups: Lookups
  /** Set when more than one swimmer is at the meet. */
  swimmer: Swimmer | undefined
  bests: PersonalBests | undefined
}) {
  const { m, fill, name, pick } = useI18n()
  const eventLabel = useEventLabel(lookups)
  const relay = isRelay(entry, lookups)
  const result = entry.result
  const status = result?.status_code ?? SWUM
  const note = result?.notes || entry.notes
  const drop = dropAgainstSeed(entry)
  const badge = personalBestBadge(entry, bests)

  const seed =
    entry.seed_time_cs === null ? (
      relay ? null : (
        m.noSeedTime
      )
    ) : (
      <>
        {m.seed} <span className="tabular">{formatTime(entry.seed_time_cs)}</span>
      </>
    )
  const facts = [
    name(lookups.round.get(entry.round_code)),
    entry.heat === null ? null : fill(m.heat, { n: entry.heat }),
    entry.lane === null ? null : fill(m.lane, { n: entry.lane }),
  ].filter(Boolean)

  return (
    <article className="flex flex-col gap-sm rounded-card border border-hairline bg-card p-md">
      <div className="flex items-start gap-sm">
        {relay ? <RelayTile /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-xxs">
          {swimmer ? (
            <span className="type-caption font-semibold text-secondary">
              {pick(swimmer.display_name, swimmer.display_name_zh)}
            </span>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-xs">
            {entry.event_number === null ? null : (
              <span className="type-caption tabular text-muted">#{entry.event_number}</span>
            )}
            <h3 className="type-title">{eventLabel(entry.event_id)}</h3>
            {relay ? <RelayBadge /> : null}
          </div>
          <span className="type-caption text-muted">
            {facts.join(' · ')}
            {seed ? <> · {seed}</> : null}
          </span>
          {note ? <span className="type-caption text-secondary">{note}</span> : null}
        </div>
      </div>
      {status !== SWUM && result ? (
        <StatusBlock
          statusCode={status}
          timeCs={result.official_time_cs ?? result.live_time_cs}
          lookups={lookups}
          align="start"
        />
      ) : (
        <div className="grid grid-cols-2 gap-sm">
          <TimeCell label={relay ? m.liveTeamTime : m.live} timeCs={result?.live_time_cs ?? null} official={false} />
          <TimeCell
            label={relay ? m.officialTeamTime : m.official}
            timeCs={result?.official_time_cs ?? null}
            official
          />
        </div>
      )}
      {drop === null && !badge ? null : (
        <div className="flex flex-wrap items-center gap-sm">
          {drop === null ? null : <Drop deltaCs={drop} />}
          <PersonalBestBadge badge={badge} />
        </div>
      )}
    </article>
  )
}

/** The meet-day screen: every tracked swimmer's entries, by day and event number. */
export function MeetScreen() {
  const { meetId = '' } = useParams()
  const { m, lang, name, pick } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const lookups = useLookups()
  const meet = useMeet(meetId)
  // Personal bests need each swimmer's whole history, not just this meet.
  const history = useEntriesOfSwimmers(meet.data?.swimmers.map((swimmer) => swimmer.id))

  const bests = useMemo(() => {
    if (!history.data || !lookups.data) return undefined
    const perSwimmer = new Map<string, PersonalBests>()
    for (const [swimmerId, entries] of groupBy(history.data, (entry) => entry.swimmer_id)) {
      perSwimmer.set(swimmerId, personalBestsOf(entries, lookups.data))
    }
    return perSwimmer
  }, [history.data, lookups.data])

  const failed = meet.isError || lookups.isError
  const data = meet.data
  // Opened from a link there is no page to go back to, so go home instead.
  const back = () => (location.key === 'default' ? navigate('/') : navigate(-1))
  const backButton = (
    <button type="button" onClick={back} aria-label={m.back} className={iconButtonClass}>
      <ChevronLeft size={20} aria-hidden="true" />
    </button>
  )

  if (failed) {
    return (
      <main className={`flex flex-1 flex-col gap-md px-md py-lg ${CONTAINER}`}>
        <LoadFailed
          title={m.meetLoadFailedTitle}
          onRetry={() => {
            for (const query of [meet, lookups]) if (query.isError) void query.refetch()
          }}
        />
      </main>
    )
  }

  if (data === null) {
    return (
      <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>
        <NotFoundState title={m.meetNotFoundTitle} body={m.meetNotFoundBody} />
      </main>
    )
  }

  if (!data || !lookups.data) {
    return (
      <>
        <div className="flex-none border-b border-hairline bg-card">
          <div className={`flex flex-col gap-sm p-md ${CONTAINER}`}>
            <Bar className="h-7 w-[70%] bg-hairline" />
            <Bar className="h-4 w-[55%] bg-hairline" />
            <Bar className="h-4 w-[45%] bg-hairline" />
          </div>
        </div>
        <main className={`flex flex-1 flex-col p-md ${CONTAINER}`}>
          <ListSkeleton message={m.loadingMeet} />
        </main>
      </>
    )
  }

  const swimmerById = new Map(data.swimmers.map((swimmer) => [swimmer.id, swimmer]))
  const days = [...groupBy([...data.entries].sort(byMeetOrder), (entry) => entry.swim_date).entries()]

  return (
    <>
      <div className="flex-none border-b border-hairline bg-card">
        <div className={`flex flex-col gap-xs px-md pt-sm pb-md ${CONTAINER}`}>
          <div className="-ml-sm flex items-center gap-xs">
            {backButton}
            <h1 className="flex-1 type-heading-2">{pick(data.meet.name, data.meet.name_zh)}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-xs type-body-sm text-secondary">
            <CourseBadge code={data.meet.course_code} lookups={lookups.data} />
            <span>
              {name(lookups.data.course.get(data.meet.course_code))} ·{' '}
              {formatDateRangeWithDays(data.meet.start_date, data.meet.end_date, lang)}
            </span>
          </div>
          <MeetPlace meet={data.meet} />
          <LiveResultsLink meet={data.meet} />
          {data.meet.notes ? <p className="type-body-sm text-secondary">{data.meet.notes}</p> : null}
        </div>
      </div>
      <main className={`flex flex-1 flex-col gap-sm p-md ${CONTAINER}`}>
        {days.length === 0 ? (
          <EmptyState icon={CalendarPlus} title={m.noEntriesTitle}>
            {m.noEntriesBody}
          </EmptyState>
        ) : (
          days.map(([day, entries]) => (
            <section key={day} className="flex flex-col gap-sm">
              <h2 className="pt-xs type-title">{formatDay(day, lang, true)}</h2>
              <div className="grid items-start gap-sm md:grid-cols-2">
                {entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    lookups={lookups.data}
                    swimmer={data.swimmers.length > 1 ? swimmerById.get(entry.swimmer_id) : undefined}
                    bests={bests?.get(entry.swimmer_id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  )
}
