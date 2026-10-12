import { CalendarClock, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DeleteEntryModal } from '../components/entry'
import { CourseBadge, LiveResultsLink, MeetPlace, RelayBadge, RelayTile, useEventLabel } from '../components/swim'
import { buttonClass, EmptyState, iconButtonClass } from '../components/ui'
import type { Entry } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { formatDateRangeWithDays, formatDay } from '../lib/dates'
import { byMeetOrder, groupBy, isRelay } from '../lib/entries'
import { TIMED_FINAL } from '../lib/entryForms'
import { formatTime } from '../lib/time'
import { useSwimmerContext } from './Swimmer'

export function SwimmerUpcoming() {
  const { swimmer, entries, lookups, canEdit } = useSwimmerContext()
  const { m, lang, fill, plural, name, pick } = useI18n()
  const eventLabel = useEventLabel(lookups)
  const [deleting, setDeleting] = useState<Entry | null>(null)

  const addEntries = canEdit ? (
    <Link to={`/entries/new?swimmer=${swimmer.slug}`} className={buttonClass('primary', 'lg', true)}>
      <Plus size={18} aria-hidden="true" />
      {m.addEntries}
    </Link>
  ) : null

  // An entry with no result is upcoming.
  const upcoming = entries.filter((entry) => !entry.result)
  const meets = [...groupBy(upcoming, (entry) => entry.meet_id).values()].sort((a, b) =>
    a[0]!.meet.start_date.localeCompare(b[0]!.meet.start_date),
  )

  if (upcoming.length === 0) {
    return (
      <>
        {addEntries}
        <EmptyState icon={CalendarClock} title={m.noUpcomingTitle}>
          {m.noUpcomingBody}
        </EmptyState>
      </>
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
      {addEntries}
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
                  const label = eventLabel(entry.event_id)
                  const row = (
                    <div className="flex items-start gap-md">
                      {relay ? <RelayTile /> : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
                        <span className="flex flex-wrap items-center gap-xs">
                          <span className="type-title text-heading">{label}</span>
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
                    </div>
                  )
                  if (!canEdit) {
                    return (
                      <li key={entry.id} className="border-t border-hairline p-md">
                        {row}
                      </li>
                    )
                  }
                  return (
                    <li key={entry.id} className="flex flex-col gap-xs border-t border-hairline px-md pt-md pb-xs">
                      {row}
                      <div className="flex justify-end gap-xs">
                        <Link
                          to={`/entries/${entry.id}/edit`}
                          aria-label={fill(m.editEntryNamed, { event: label })}
                          className={iconButtonClass}
                        >
                          <Pencil size={20} aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleting(entry)}
                          aria-label={fill(m.deleteEntryNamed, { event: label })}
                          className={iconButtonClass}
                        >
                          <Trash2 size={20} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>
      {deleting ? <DeleteEntryModal entry={deleting} lookups={lookups} onClose={() => setDeleting(null)} /> : null}
    </>
  )
}
