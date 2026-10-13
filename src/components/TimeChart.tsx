import { useState, type PointerEvent } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { formatDate } from '../lib/dates'
import { formatTime } from '../lib/time'
import { chartScale, nearestPoint, type ChartBox, type ChartPoint } from '../lib/timeChart'
import { PersonalBestBadge, UnofficialBadge } from './swim'

// Drawn in these units and stretched to the card's width; the left margin holds "16:40.00".
const BOX: ChartBox = { width: 320, height: 168, top: 14, right: 14, bottom: 26, left: 48 }

/**
 * A mark is told apart by shape, not color: official is a filled dot on the line, a live-only
 * time a hollow dashed one off it (dashed means not yet official, as on the badges), and the
 * personal best carries a ring.
 */
function Mark({
  x,
  y,
  official,
  best,
  large = false,
}: {
  x: number
  y: number
  official: boolean
  best: boolean
  large?: boolean
}) {
  const r = large ? 6 : 4
  return (
    <>
      {best ? <circle cx={x} cy={y} r={r + 4.5} className="fill-none stroke-ink" strokeWidth={1.5} /> : null}
      {official ? (
        <circle cx={x} cy={y} r={r} className="fill-primary stroke-card" strokeWidth={1.5} />
      ) : (
        <circle cx={x} cy={y} r={r} className="fill-card stroke-ink" strokeWidth={1.5} strokeDasharray="2.5 2" />
      )}
    </>
  )
}

function LegendItem({ official, best, children }: { official: boolean; best: boolean; children: string }) {
  return (
    <span className="inline-flex items-center gap-xxs">
      <svg viewBox="0 0 22 22" aria-hidden="true" className="size-[22px] flex-none">
        <Mark x={11} y={11} official={official} best={best} />
      </svg>
      {children}
    </span>
  )
}

/**
 * One event's times over dates, faster higher. `points` come from `chartPointsOf`, oldest first.
 * The results listed under the chart say the same in words; the chart itself is one image with
 * a spoken summary. With a single time there is nothing to chart, and it is shown plainly.
 */
export function TimeChart({ event, points }: { event: string; points: readonly ChartPoint[] }) {
  const { m, lang, fill, pick } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (points.length === 0) return null
  const date = (iso: string) => formatDate(iso, lang)
  if (points.length === 1) {
    const only = points[0]!
    return (
      <p className="type-caption text-muted">
        {fill(m.chartSingleTime, {
          time: formatTime(only.cs),
          date: date(only.date),
        })}
      </p>
    )
  }

  const scale = chartScale(points, BOX)
  const placed = points.map((point) => ({
    point,
    x: scale.x(point.date),
    y: scale.y(point.cs),
  }))
  const selected = placed.find(({ point }) => point.entry.id === selectedId)
  // The spoken summary names the fastest official time, or the fastest of all when none is official.
  const counted = points.some((point) => point.official) ? points.filter((point) => point.official) : points
  const fastest = counted.reduce((a, b) => (b.cs < a.cs ? b : a))
  const [first, last] = [points[0]!, points.at(-1)!]

  const select = (event: PointerEvent<SVGSVGElement>) => {
    const frame = event.currentTarget.getBoundingClientRect()
    const hit = nearestPoint(
      placed,
      ((event.clientX - frame.left) / frame.width) * BOX.width,
      ((event.clientY - frame.top) / frame.height) * BOX.height,
    )
    if (hit) setSelectedId(hit.point.entry.id)
  }

  return (
    <figure className="flex flex-col gap-xs">
      <svg
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="img"
        aria-label={fill(m.chartSummary, {
          event,
          count: points.length,
          first: date(first.date),
          last: date(last.date),
          time: formatTime(fastest.cs),
          date: date(fastest.date),
        })}
        onPointerDown={select}
        className="w-full touch-manipulation cursor-pointer tabular select-none"
      >
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={BOX.left - 4}
              x2={BOX.width - BOX.right + 8}
              y1={scale.y(tick)}
              y2={scale.y(tick)}
              className="stroke-hairline"
            />
            <text x={BOX.left - 8} y={scale.y(tick) + 3.5} textAnchor="end" fontSize={10} className="fill-muted">
              {formatTime(tick)}
            </text>
          </g>
        ))}
        {first.date === last.date ? (
          <text x={scale.x(first.date)} y={BOX.height - 6} textAnchor="middle" fontSize={10} className="fill-muted">
            {date(first.date)}
          </text>
        ) : (
          <>
            <text x={BOX.left - 8} y={BOX.height - 6} fontSize={10} className="fill-muted">
              {date(first.date)}
            </text>
            <text x={BOX.width - 4} y={BOX.height - 6} textAnchor="end" fontSize={10} className="fill-muted">
              {date(last.date)}
            </text>
          </>
        )}
        {selected ? (
          <line
            x1={selected.x}
            x2={selected.x}
            y1={BOX.top - 8}
            y2={BOX.height - BOX.bottom + 6}
            className="stroke-muted"
            strokeDasharray="3 3"
          />
        ) : null}
        <polyline
          points={placed
            .filter(({ point }) => point.official)
            .map(({ x, y }) => `${x},${y}`)
            .join(' ')}
          className="fill-none stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {placed.map(({ point, x, y }) => (
          <Mark
            key={point.entry.id}
            x={x}
            y={y}
            official={point.official}
            best={point.best}
            large={point.entry.id === selectedId}
          />
        ))}
      </svg>
      <figcaption className="flex flex-col gap-xs">
        <div className="flex flex-wrap items-center gap-x-md gap-y-xxs type-caption text-secondary">
          <LegendItem official best={false}>
            {m.official}
          </LegendItem>
          {points.some((point) => !point.official) ? (
            <LegendItem official={false} best={false}>
              {m.unofficial}
            </LegendItem>
          ) : null}
          {points.some((point) => point.best) ? (
            <LegendItem official best>
              {m.personalBest}
            </LegendItem>
          ) : null}
        </div>
        <div
          aria-live="polite"
          className="flex min-h-11 flex-wrap items-center gap-x-sm gap-y-xxs rounded-md bg-canvas px-sm py-xs"
        >
          {selected ? (
            <>
              <span className="type-title tabular text-heading">{formatTime(selected.point.cs)}</span>
              <span className="type-body-sm text-secondary">
                {date(selected.point.date)} · {pick(selected.point.entry.meet.name, selected.point.entry.meet.name_zh)}
              </span>
              {selected.point.official ? null : <UnofficialBadge />}
              {selected.point.best ? <PersonalBestBadge badge="best" /> : null}
            </>
          ) : (
            <span className="type-caption text-muted">{m.chartHint}</span>
          )}
        </div>
      </figcaption>
    </figure>
  )
}
