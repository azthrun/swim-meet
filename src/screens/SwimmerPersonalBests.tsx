import { Trophy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { StandardLevelBadge } from '../components/swim'
import { BadgePill, EmptyState, Segmented } from '../components/ui'
import { usePendingResults } from '../data/PendingResultsContext'
import { useI18n } from '../i18n/I18nContext'
import { formatDate } from '../lib/dates'
import { shownGap, shownLevel } from '../lib/standards'
import { formatTime } from '../lib/time'
import { useSwimmerContext } from './Swimmer'

const CELL = 'border-t border-l border-hairline'

/** One grid per course: strokes down, distances across. Relays never have a personal best. */
export function SwimmerPersonalBests() {
  const { swimmer, entries, lookups, bests, standards } = useSwimmerContext()
  const { m, lang, name, fill } = useI18n()
  const { pending } = usePendingResults()
  const [params, setParams] = useSearchParams()

  if (bests.best.size === 0 && bests.provisional.size === 0) {
    return (
      <EmptyState icon={Trophy} title={m.noPersonalBestsTitle}>
        {m.noPersonalBestsBody}
      </EmptyState>
    )
  }

  // Open on the course swum most recently unless the link names one.
  const latest = [...entries].sort((a, b) => b.swim_date.localeCompare(a.swim_date))[0]?.meet.course_code
  const requested = params.get('course')
  const course = lookups.course.get(requested ?? '') ?? lookups.course.get(latest ?? '') ?? lookups.courses[0]!

  const strokes = lookups.strokes.filter((stroke) => !stroke.is_relay)
  const events = lookups.events.filter(
    (event) => event.course_code === course.code && strokes.some((stroke) => stroke.code === event.stroke_code),
  )
  const distances = [...new Set(events.map((event) => event.distance))].sort((a, b) => a - b)

  return (
    <>
      <Segmented
        label={m.course}
        value={course.code}
        onChange={(code) => setParams({ course: code }, { replace: true })}
        options={lookups.courses.map((c) => ({ value: c.code, label: c.code, title: name(c) }))}
      />
      <div className="flex items-baseline gap-xs">
        <h2 className="flex-1 type-heading-3">{name(course)}</h2>
        <span className="type-caption text-muted">{m.officialTimesOnly}</span>
      </div>
      <div className="overflow-x-auto rounded-card border border-hairline bg-card">
        <table className="w-full border-collapse tabular">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 w-28 min-w-28 border-b border-hairline bg-canvas px-md py-sm text-left type-eyebrow text-muted uppercase"
              >
                {m.stroke}
              </th>
              {distances.map((distance) => (
                <th
                  key={distance}
                  scope="col"
                  className="min-w-24 border-b border-hairline bg-canvas p-sm text-left type-eyebrow text-muted"
                >
                  {distance}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strokes.map((stroke, row) => (
              <tr key={stroke.code}>
                <th
                  scope="row"
                  className={`sticky left-0 h-16 min-w-28 bg-card px-md py-sm text-left type-body-sm font-medium ${
                    row === 0 ? '' : 'border-t border-hairline'
                  }`}
                >
                  {name(stroke)}
                </th>
                {distances.map((distance) => {
                  const border = row === 0 ? 'border-l border-hairline' : CELL
                  const event = events.find((e) => e.stroke_code === stroke.code && e.distance === distance)
                  if (!event) {
                    return <td key={distance} aria-label={m.notAnEvent} className={`bg-canvas ${border}`} />
                  }
                  const best = bests.best.get(event.id)
                  const provisional = bests.provisional.get(event.id)
                  if (!best && !provisional) return <td key={distance} className={border} />
                  const bestEntry = best && entries.find((entry) => entry.id === best.entryId)
                  const unsaved = best ? pending.has(best.entryId) : false
                  const level = bestEntry ? shownLevel(bestEntry, standards, unsaved) : null
                  const gap = bestEntry ? shownGap(bestEntry, standards, unsaved) : null
                  return (
                    <td key={distance} className={`p-0 align-top ${border}`}>
                      <Link
                        to={`/swimmers/${swimmer.slug}/results?group=event&event=${event.id}`}
                        className="flex min-h-16 flex-col items-start gap-xxs px-sm py-xs text-heading no-underline"
                      >
                        {best ? (
                          <>
                            <span className="type-title">{formatTime(best.timeCs)}</span>
                            <span className="type-caption whitespace-nowrap text-muted">
                              {formatDate(best.swimDate, lang)}
                            </span>
                            <StandardLevelBadge code={level} lookups={lookups} />
                            {gap ? (
                              <span className="type-caption whitespace-nowrap text-secondary">
                                {fill(m.gapToLevel, {
                                  gap: formatTime(gap.gapCs),
                                  level: name(lookups.level.get(gap.levelCode)),
                                })}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                        {provisional ? (
                          <BadgePill ring="dashed" dot="bg-accent-green" title={m.provisionalPersonalBest}>
                            {formatTime(provisional.timeCs)}
                          </BadgePill>
                        ) : null}
                      </Link>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="type-caption text-muted">{m.pbHint}</p>
      <div className="flex flex-col gap-xs rounded-card border border-hairline bg-card p-md">
        <span className="type-eyebrow text-muted uppercase">{m.key}</span>
        <div className="flex items-center gap-sm type-caption text-secondary">
          <BadgePill ring="dashed" dot="bg-accent-green">
            {formatTime(2948)}
          </BadgePill>
          <span>{m.keyProvisional}</span>
        </div>
        {standards.levels.size > 0 ? (
          <div className="flex items-center gap-sm type-caption text-secondary">
            <StandardLevelBadge code={[...standards.levels.values()][0]!} lookups={lookups} />
            <span>{m.keyStandard}</span>
          </div>
        ) : null}
        {standards.gaps.size > 0 ? (
          <div className="flex items-center gap-sm type-caption text-secondary">
            <span className="flex-none whitespace-nowrap">
              {fill(m.gapToLevel, { gap: formatTime(84), level: name(lookups.level.get('A')) })}
            </span>
            <span>{m.keyGap}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-sm type-caption text-secondary">
          <span className="h-6 w-10 flex-none rounded-xs border border-hairline bg-canvas" />
          <span>{m.keyNotAnEvent}</span>
        </div>
      </div>
    </>
  )
}
