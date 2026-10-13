// The time history chart of one event: which results become points, where each point sits,
// and which point a tap means. An event belongs to one course, so a chart never mixes courses.

import type { Entry } from '../data/queries'
import { byMeetOrder, shownTime } from './entries'
import { SWUM, type PersonalBests } from './personalBests'

export type ChartPoint = {
  entry: Entry
  date: string
  cs: number
  /** False for a live time that has no official time yet. */
  official: boolean
  /** True on the result that is the event's personal best. */
  best: boolean
}

/**
 * One event's results as chart points, oldest first. Only swum results with a time are drawn:
 * a disqualified swim has a time too, and it is left out with no shows and scratches.
 */
export function chartPointsOf(entries: readonly Entry[], bests: PersonalBests | undefined): ChartPoint[] {
  return [...entries].sort(byMeetOrder).flatMap((entry): ChartPoint[] => {
    const time = shownTime(entry)
    if (!time || entry.result?.status_code !== SWUM) return []
    return [
      {
        entry,
        date: entry.swim_date,
        cs: time.cs,
        official: time.official,
        best: bests?.best.get(entry.event_id)?.entryId === entry.id,
      },
    ]
  })
}

export type ChartBox = { width: number; height: number; top: number; right: number; bottom: number; left: number }

export type ChartScale = {
  /** Left to right is earlier to later. */
  x: (date: string) => number
  /** Faster is higher: a lower time gets a smaller y. */
  y: (cs: number) => number
  /** Times to draw a grid line and a label at, fastest first. */
  ticks: number[]
}

const DAY_MS = 86_400_000
const dayOf = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS

// Steps a time axis may count in, in centiseconds: 0.01 s up to 5 min.
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 1500, 3000, 6000, 12000, 30000]

/** Round times across a range, at most `most` of them. */
export function timeTicks(fromCs: number, toCs: number, most = 4): number[] {
  const step = STEPS.find((s) => Math.floor(toCs / s) - Math.ceil(fromCs / s) + 1 <= most) ?? STEPS.at(-1)!
  const ticks: number[] = []
  for (let tick = Math.ceil(fromCs / step) * step; tick <= toCs; tick += step) ticks.push(tick)
  return ticks
}

export function chartScale(points: readonly Pick<ChartPoint, 'date' | 'cs'>[], box: ChartBox): ChartScale {
  const days = points.map((point) => dayOf(point.date))
  const firstDay = Math.min(...days)
  const span = Math.max(...days) - firstDay
  const fastest = Math.min(...points.map((point) => point.cs))
  const slowest = Math.max(...points.map((point) => point.cs))
  // Room above the fastest and below the slowest, so no point sits on the frame.
  const margin = Math.max(Math.ceil((slowest - fastest) * 0.15), 10)
  const [from, to] = [Math.max(fastest - margin, 0), slowest + margin]

  const plotWidth = box.width - box.left - box.right
  const plotHeight = box.height - box.top - box.bottom
  return {
    // Every swim on one day: the middle of the chart.
    x: (date) => box.left + (span === 0 ? plotWidth / 2 : ((dayOf(date) - firstDay) / span) * plotWidth),
    y: (cs) => box.top + ((cs - from) / (to - from)) * plotHeight,
    ticks: timeTicks(from, to),
  }
}

/** The point a tap at (x, y) means: the closest one. Null when there is none. */
export function nearestPoint<T extends { x: number; y: number }>(placed: readonly T[], x: number, y: number): T | null {
  let nearest: T | null = null
  let least = Infinity
  for (const point of placed) {
    const distance = (point.x - x) ** 2 + (point.y - y) ** 2
    if (distance < least) [nearest, least] = [point, distance]
  }
  return nearest
}
