import { ChevronDown, ListFilter, Pencil, Timer, Users, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CourseBadge,
  Drop,
  PendingMark,
  PersonalBestBadge,
  RelayBadge,
  RelayTile,
  StandardLevelBadge,
  StatusBlock,
  UnofficialBadge,
  useEventLabel,
} from '../components/swim'
import { Modal } from '../components/feedback'
import { TimeChart } from '../components/TimeChart'
import { TimeEntrySheet } from '../components/TimeEntrySheet'
import { buttonClass, EmptyState, FilterSelect, iconButtonClass, Segmented, type Option } from '../components/ui'
import { useSheetEntry } from '../components/useSheetEntry'
import { usePendingResults } from '../data/PendingResultsContext'
import type { Entry } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { formatDate, formatDateRange, formatDay } from '../lib/dates'
import {
  byMeetOrder,
  dropAgainstSeed,
  groupBy,
  isRelay,
  newestFirst,
  personalBestBadge,
  shownTime,
} from '../lib/entries'
import { TIMED_FINAL } from '../lib/entryForms'
import { SWUM } from '../lib/personalBests'
import { seasonLabel, seasonOf } from '../lib/season'
import { shownLevel } from '../lib/standards'
import { formatTime } from '../lib/time'
import { chartPointsOf } from '../lib/timeChart'
import { useSwimmerContext } from './Swimmer'

const ALL = ''

/** The time or, when the entry was not simply swum, how it ended. */
function Outcome({ entry, relay }: { entry: Entry; relay: boolean }) {
  const { lookups } = useSwimmerContext()
  const { m } = useI18n()
  const time = shownTime(entry)
  const status = entry.result?.status_code ?? SWUM
  if (status !== SWUM) {
    return <StatusBlock statusCode={status} timeCs={time?.cs ?? null} lookups={lookups} />
  }
  return (
    <div className="flex flex-col items-end gap-xxs">
      {relay ? <span className="type-eyebrow text-muted uppercase">{m.teamTime}</span> : null}
      {time ? (
        <span className={`type-heading-2 tabular ${time.official ? 'text-heading' : 'text-secondary'}`}>
          {formatTime(time.cs)}
        </span>
      ) : (
        <span aria-label={m.noTimeYet} className="type-heading-2 text-faint">
          —
        </span>
      )}
      {time && !time.official ? <UnofficialBadge /> : null}
    </div>
  )
}

export function SwimmerResults() {
  const { swimmer, entries, loadedEntries, lookups, bests, standards, canEdit } = useSwimmerContext()
  const { m, lang, fill, name, pick } = useI18n()
  const { pending } = usePendingResults()
  const sheet = useSheetEntry()
  const eventLabel = useEventLabel(lookups)
  const [params, setParams] = useSearchParams()
  // An event card shows its latest result; the chart and all results open in a modal.
  const [details, setDetails] = useState<{ eventId: number; historyOpen: boolean } | null>(null)
  const historyId = useId()

  const group = params.get('group') === 'event' ? 'event' : 'meet'
  const course = params.get('course') ?? ALL
  const stroke = params.get('stroke') ?? ALL
  const season = params.get('season') ?? ALL
  const eventId = params.get('event') ?? ALL

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === ALL || (key === 'group' && value === 'meet')) next.delete(key)
    else next.set(key, value)
    // Picking a course or stroke by hand leaves the single-event view.
    if (key === 'course' || key === 'stroke') next.delete('event')
    setParams(next, { replace: true })
  }

  // Editors only. The sheet works from the entry as loaded, and has no "next" outside a meet.
  const sheetEntry = canEdit ? loadedEntries.find((entry) => entry.id === sheet.entryId) : undefined
  const timeEntrySheet = sheetEntry ? (
    <TimeEntrySheet
      entry={sheetEntry}
      swimmer={swimmer}
      lookups={lookups}
      history={entries}
      onClose={sheet.close}
      onNext={sheet.advance}
    />
  ) : null

  const results = entries.filter((entry) => entry.result)
  const strokeOf = (entry: Entry) => lookups.event.get(entry.event_id)?.stroke_code
  const shown = results.filter(
    (entry) =>
      (course === ALL || entry.meet.course_code === course) &&
      (stroke === ALL || strokeOf(entry) === stroke) &&
      (season === ALL || String(seasonOf(entry.swim_date)) === season) &&
      (eventId === ALL || String(entry.event_id) === eventId),
  )

  if (results.length === 0) {
    return (
      <>
        <EmptyState icon={Timer} title={m.noResultsTitle}>
          {m.noResultsBody}
        </EmptyState>
        {timeEntrySheet}
      </>
    )
  }

  const all: Option = { value: ALL, label: m.all }
  const seasons = [...new Set(results.map((entry) => seasonOf(entry.swim_date)))].sort((a, b) => b - a)
  const filtered = course !== ALL || stroke !== ALL || season !== ALL || eventId !== ALL

  const notes = (entry: Entry) => entry.result?.notes || entry.notes
  const badges = (entry: Entry, long: boolean) => {
    const drop = dropAgainstSeed(entry)
    const badge = personalBestBadge(entry, bests)
    const state = pending.get(entry.id)?.state
    const level = shownLevel(entry, standards, state !== undefined)
    if (drop === null && !badge && !level && !state) return null
    return (
      <div className="flex flex-wrap items-center gap-sm">
        {drop === null ? null : <Drop deltaCs={drop} long={long} />}
        <PersonalBestBadge badge={badge} />
        <StandardLevelBadge code={level} lookups={lookups} />
        <PendingMark state={state} />
      </div>
    )
  }
  const editButton = (entry: Entry) =>
    canEdit ? (
      <button
        type="button"
        onClick={() => sheet.open(entry.id)}
        aria-label={fill(m.editResultNamed, { event: eventLabel(entry.event_id) })}
        className={iconButtonClass}
      >
        <Pencil size={20} aria-hidden="true" />
      </button>
    ) : null

  const byMeet = () =>
    [...groupBy(shown, (entry) => entry.meet_id).values()]
      .sort((a, b) => b[0]!.meet.start_date.localeCompare(a[0]!.meet.start_date))
      .map((meetEntries) => {
        const meet = meetEntries[0]!.meet
        return (
          <section key={meet.id} className="flex flex-col gap-xs">
            <div className="flex flex-wrap items-center gap-xs py-xs">
              <Link to={`/meets/${meet.id}`} className="type-heading-3 text-heading no-underline">
                <h2 className="type-heading-3">{pick(meet.name, meet.name_zh)}</h2>
              </Link>
              <CourseBadge code={meet.course_code} lookups={lookups} />
              <span className="type-body-sm text-muted">{formatDateRange(meet.start_date, meet.end_date, lang)}</span>
            </div>
            <ol className="overflow-hidden rounded-card border border-hairline bg-card">
              {[...meetEntries].sort(byMeetOrder).map((entry) => {
                const relay = isRelay(entry, lookups)
                const note = notes(entry)
                return (
                  <li key={entry.id} className="flex flex-col gap-sm border-t border-hairline p-md first:border-t-0">
                    <div className="flex items-start gap-md">
                      {relay ? <RelayTile /> : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
                        <span className="flex flex-wrap items-center gap-xs">
                          <span className="type-title text-heading">{eventLabel(entry.event_id)}</span>
                          {relay ? <RelayBadge /> : null}
                        </span>
                        <span className="type-caption text-muted">
                          {name(lookups.round.get(entry.round_code))} · {formatDay(entry.swim_date, lang)}
                        </span>
                      </div>
                      <Outcome entry={entry} relay={relay} />
                    </div>
                    {canEdit ? (
                      <div className="flex items-center justify-between gap-sm">
                        {badges(entry, true) ?? <span />}
                        {editButton(entry)}
                      </div>
                    ) : (
                      badges(entry, true)
                    )}
                    {note ? (
                      <div className="flex items-center gap-xs type-caption text-secondary">
                        {relay ? <Users size={16} aria-hidden="true" className="flex-none text-muted" /> : null}
                        <span>{note}</span>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })

  // One event's results as a list row; `linkMeet` is off on the card, where the whole card is a button.
  const eventRow = (entry: Entry, relay: boolean, linkMeet: boolean) => {
    const note = notes(entry)
    const meetLine = `${formatDate(entry.swim_date, lang)} · ${pick(entry.meet.name, entry.meet.name_zh)}`
    return (
      <div className="flex items-start gap-md">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-xs">
          {linkMeet ? (
            <Link to={`/meets/${entry.meet.id}`} className="type-body-sm text-secondary no-underline">
              {meetLine}
            </Link>
          ) : (
            <span className="type-body-sm text-secondary">{meetLine}</span>
          )}
          {entry.round_code === TIMED_FINAL ? null : (
            <span className="type-caption text-muted">{name(lookups.round.get(entry.round_code))}</span>
          )}
          {badges(entry, false)}
          {note ? <span className="type-caption text-secondary">{note}</span> : null}
        </div>
        <div className="flex flex-col items-end gap-xs">
          <Outcome entry={entry} relay={relay} />
          {editButton(entry)}
        </div>
      </div>
    )
  }

  const eventGroups = groupBy(shown, (entry) => entry.event_id)
  const titleOf = (id: number, entries: readonly Entry[]) => `${eventLabel(id)} ${entries[0]!.meet.course_code}`

  const byEvent = () => {
    const order = (id: number) => {
      const event = lookups.event.get(id)
      return [
        lookups.course.get(event?.course_code ?? '')?.sort_order ?? 0,
        lookups.stroke.get(event?.stroke_code ?? '')?.sort_order ?? 0,
        event?.distance ?? 0,
      ]
    }
    return [...eventGroups.entries()]
      .sort(([a], [b]) => {
        const [x, y] = [order(a), order(b)]
        return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!
      })
      .map(([id, eventEntries]) => {
        const relay = isRelay(eventEntries[0]!, lookups)
        const best = bests.best.get(id)
        const latest = newestFirst(eventEntries)[0]!
        return (
          // The whole card opens the event's details; the content sits over the button and lets taps
          // through, except on the edit button.
          <section
            key={id}
            className="relative overflow-hidden rounded-card border border-hairline bg-card has-[>button:hover]:bg-canvas"
          >
            <button
              type="button"
              onClick={() => setDetails({ eventId: id, historyOpen: relay })}
              aria-label={fill(m.showDetailsNamed, { event: titleOf(id, eventEntries) })}
              className="absolute inset-0 cursor-pointer rounded-card focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            />
            <div className="pointer-events-none relative">
              <div className="flex flex-wrap items-center gap-xs border-b border-hairline p-md">
                {relay ? <RelayTile /> : null}
                <h2 className="type-heading-3">{eventLabel(id)}</h2>
                <CourseBadge code={eventEntries[0]!.meet.course_code} lookups={lookups} />
                {relay ? (
                  <>
                    <RelayBadge />
                    <span className="basis-full type-caption text-muted">{m.relaysNeverCount}</span>
                  </>
                ) : (
                  <div className="ml-auto flex flex-col items-end">
                    <span className="type-eyebrow text-muted uppercase">{m.personalBest}</span>
                    {best ? (
                      <span className="type-title tabular text-heading">{formatTime(best.timeCs)}</span>
                    ) : (
                      <span aria-label={m.noneYet} className="type-title text-faint">
                        —
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="p-md [&_button]:pointer-events-auto">{eventRow(latest, relay, false)}</div>
            </div>
          </section>
        )
      })
  }

  const detailsEntries = details ? eventGroups.get(details.eventId) : undefined
  const detailsModal = () => {
    if (!details || !detailsEntries) return null
    const id = details.eventId
    const relay = isRelay(detailsEntries[0]!, lookups)
    const best = bests.best.get(id)
    const title = titleOf(id, detailsEntries)
    // A relay time is the team's, so it has no history to chart.
    const points = relay ? [] : chartPointsOf(detailsEntries, bests)
    const close = () => setDetails(null)
    return (
      <Modal
        title={title}
        onClose={close}
        actions={
          <button type="button" onClick={close} className={buttonClass('secondary')}>
            {m.close}
          </button>
        }
      >
        {relay ? (
          <span className="type-caption text-muted">{m.relaysNeverCount}</span>
        ) : (
          <>
            <span className="flex items-baseline justify-between gap-sm">
              <span className="type-eyebrow text-muted uppercase">{m.personalBest}</span>
              {best ? (
                <span className="type-title tabular text-heading">{formatTime(best.timeCs)}</span>
              ) : (
                <span aria-label={m.noneYet} className="type-title text-faint">
                  —
                </span>
              )}
            </span>
            {points.length === 0 ? (
              <p className="type-caption text-muted">{m.noChartYet}</p>
            ) : (
              <TimeChart event={title} points={points} />
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => setDetails({ ...details, historyOpen: !details.historyOpen })}
          aria-expanded={details.historyOpen}
          aria-controls={historyId}
          className="flex items-center justify-between gap-sm border-t border-hairline pt-sm type-title text-heading"
        >
          {fill(m.allResultsCount, { count: detailsEntries.length })}
          <ChevronDown
            size={20}
            aria-hidden="true"
            className={`flex-none transition-transform ${details.historyOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <ol id={historyId} hidden={!details.historyOpen}>
          {newestFirst(detailsEntries).map((entry) => (
            <li key={entry.id} className="border-t border-hairline py-sm first:border-t-0 first:pt-0">
              {eventRow(entry, relay, true)}
            </li>
          ))}
        </ol>
      </Modal>
    )
  }

  return (
    <>
      <Segmented
        label={m.groupResults}
        value={group}
        onChange={(value) => set('group', value)}
        options={[
          { value: 'meet', label: m.byMeet },
          { value: 'event', label: m.byEvent },
        ]}
      />
      <div className="flex flex-wrap gap-xs">
        <FilterSelect
          label={m.filterCourse}
          value={course}
          onChange={(value) => set('course', value)}
          options={[all, ...lookups.courses.map((c) => ({ value: c.code, label: c.code }))]}
        />
        <FilterSelect
          label={m.filterStroke}
          value={stroke}
          onChange={(value) => set('stroke', value)}
          options={[all, ...lookups.strokes.map((s) => ({ value: s.code, label: name(s) }))]}
        />
        <FilterSelect
          label={m.filterSeason}
          value={season}
          onChange={(value) => set('season', value)}
          options={[all, ...seasons.map((year) => ({ value: String(year), label: seasonLabel(year) }))]}
        />
        {eventId === ALL ? null : (
          <button type="button" onClick={() => set('event', ALL)} className={buttonClass('secondary')}>
            {fill(m.labelValue, { label: m.filterEvent, value: eventLabel(Number(eventId)) })}
            <X size={18} aria-label={m.clearFilters} />
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={ListFilter}
          title={m.noMatchTitle}
          action={
            filtered ? (
              <button
                type="button"
                onClick={() => setParams(group === 'event' ? { group } : {}, { replace: true })}
                className={buttonClass('primary')}
              >
                {m.clearFilters}
              </button>
            ) : null
          }
        >
          {m.noMatchBody}
        </EmptyState>
      ) : (
        <div className="grid items-start gap-md lg:grid-cols-2">{group === 'event' ? byEvent() : byMeet()}</div>
      )}
      {detailsModal()}
      {timeEntrySheet}
    </>
  )
}
