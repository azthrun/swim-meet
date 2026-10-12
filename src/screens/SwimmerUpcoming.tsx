import { CalendarClock, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CourseBadge, LiveResultsLink, MeetPlace, RelayBadge, RelayTile, useEventLabel } from '../components/swim'
import { EmptyState } from '../components/ui'
import type { Entry } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { formatDateRangeWithDays, formatDay } from '../lib/dates'
import { byMeetOrder, groupBy, isRelay } from '../lib/entries'
import { formatTime } from '../lib/time'
import { useSwimmerContext } from './Swimmer'

const TIMED_FINAL = 'TIMED_FINAL'

export function SwimmerUpcoming() {
  const { entries, lookups } = useSwimmerContext()
  const { m, lang, fill, plural, name, pick } = useI18n()
  const eventLabel = useEventLabel(lookups)

  // An entry with no result is upcoming.
  const upcoming = entries.filter((entry) => !entry.result)
  const meets = [...groupBy(upcoming, (entry) => entry.meet_id).values()].sort((a, b) =>
    a[0]!.meet.start_date.localeCompare(b[0]!.meet.start_date),
  )

  if (upcoming.length === 0) {
    return (
      <EmptyState icon={CalendarClock} title={m.noUpcomingTitle}>
        {m.noUpcomingBody}
      </EmptyState>
    )
  }

  const details = (entry: Entry) =>
    [
      entry.round_code === TIMED_FINAL ? null : name(lookups.round.get(entry.round_code)),
      formatDay(entry.swim_date, lang),
      entry.event_number === null ? null : `#${entry.event_number}`,
      entry.heat === null ? null : fill(m.heat, { n: entry.heat }),
      entry.lane === null ? null : fill(m.lane, { n: entry.lane }),
    ]
      .filter(Boolean)
      .join(' · ')

  return (
    <>
      <p className="type-caption text-muted">
        {fill(m.upcomingSummary, {
          meets: plural(m.meetCount, meets.length),
          entries: plural(m.entryCount, upcoming.length),
        })}
      </p>
      <div className="grid items-start gap-md lg:grid-cols-2">
        {meets.map((meetEntries) => {
          const meet = meetEntries[0]!.meet
          return (
            <section key={meet.id} className="overflow-hidden rounded-card border border-hairline bg-card">
              <div className="flex flex-col gap-xs p-md">
                <Link to={`/meets/${meet.id}`} className="flex min-h-11 items-center gap-xs text-heading no-underline">
                  <h2 className="flex-1 type-heading-3">{pick(meet.name, meet.name_zh)}</h2>
                  <ChevronRight size={20} aria-hidden="true" className="flex-none text-faint" />
                </Link>
                <div className="flex flex-wrap items-center gap-xs type-body-sm text-secondary">
                  <CourseBadge code={meet.course_code} lookups={lookups} />
                  <span>{formatDateRangeWithDays(meet.start_date, meet.end_date, lang)}</span>
                </div>
                <MeetPlace meet={meet} />
                <LiveResultsLink meet={meet} />
              </div>
              <ol>
                {[...meetEntries].sort(byMeetOrder).map((entry) => {
                  const relay = isRelay(entry, lookups)
                  return (
                    <li key={entry.id} className="flex items-start gap-md border-t border-hairline p-md">
                      {relay ? <RelayTile /> : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
                        <span className="flex flex-wrap items-center gap-xs">
                          <span className="type-title text-heading">{eventLabel(entry.event_id)}</span>
                          {relay ? <RelayBadge /> : null}
                        </span>
                        <span className="type-caption text-muted">{details(entry)}</span>
                        {entry.notes ? (
                          <span className="type-caption text-secondary">{fill(m.note, { text: entry.notes })}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-xxs">
                        <span className="type-eyebrow text-muted uppercase">{m.seed}</span>
                        {entry.seed_time_cs === null ? (
                          <span aria-label={m.noSeedTime} className="type-heading-3 text-faint">
                            —
                          </span>
                        ) : (
                          <span className="type-heading-3 tabular text-heading">{formatTime(entry.seed_time_cs)}</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>
    </>
  )
}
