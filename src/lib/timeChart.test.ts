import { describe, expect, it } from 'vitest'
import type { Entry, Result } from '../data/queries'
import type { PersonalBests } from './personalBests'
import { chartPointsOf, chartScale, nearestPoint, timeTicks } from './timeChart'

function entry(id: string, swimDate: string, result: Partial<Result> | null): Entry {
  return {
    id,
    event_id: 1,
    swim_date: swimDate,
    event_number: null,
    heat: null,
    lane: null,
    result: result && { status_code: 'SWUM', live_time_cs: null, official_time_cs: null, notes: null, ...result },
  } as Entry
}

const bests = (entryId: string): PersonalBests => ({
  best: new Map([[1, { entryId, timeCs: 3012, swimDate: '2026-10-03' }]]),
  provisional: new Map(),
})

describe('chartPointsOf', () => {
  it('draws swum results oldest first, whatever order they come in', () => {
    const points = chartPointsOf(
      [
        entry('oct', '2026-10-03', { official_time_cs: 3012 }),
        entry('sep', '2026-09-12', { official_time_cs: 3150 }),
      ],
      undefined,
    )
    expect(points.map((point) => [point.entry.id, point.date, point.cs])).toEqual([
      ['sep', '2026-09-12', 3150],
      ['oct', '2026-10-03', 3012],
    ])
  })

  it('leaves out disqualified swims, no shows, scratches and upcoming entries', () => {
    const points = chartPointsOf(
      [
        entry('dq', '2026-09-12', { status_code: 'DQ', official_time_cs: 2900 }),
        entry('ns', '2026-09-12', { status_code: 'NS' }),
        entry('scr', '2026-09-12', { status_code: 'SCR' }),
        entry('upcoming', '2026-11-01', null),
        entry('untimed', '2026-09-13', {}),
        entry('swum', '2026-10-03', { official_time_cs: 3012 }),
      ],
      undefined,
    )
    expect(points.map((point) => point.entry.id)).toEqual(['swum'])
  })

  it('tells a live-only time from an official one, and prefers the official', () => {
    const points = chartPointsOf(
      [
        entry('live', '2026-09-12', { live_time_cs: 3160 }),
        entry('both', '2026-10-03', { live_time_cs: 3020, official_time_cs: 3012 }),
      ],
      undefined,
    )
    expect(points.map((point) => [point.cs, point.official])).toEqual([
      [3160, false],
      [3012, true],
    ])
  })

  it('marks the personal best and nothing else', () => {
    const points = chartPointsOf(
      [
        entry('sep', '2026-09-12', { official_time_cs: 3150 }),
        entry('oct', '2026-10-03', { official_time_cs: 3012 }),
        // Faster, and not official: not the personal best.
        entry('live', '2026-10-17', { live_time_cs: 2990 }),
      ],
      bests('oct'),
    )
    expect(points.map((point) => point.best)).toEqual([false, true, false])
  })
})

describe('chartScale', () => {
  const box = { width: 320, height: 160, top: 10, right: 10, bottom: 20, left: 40 }
  const points = [
    { date: '2026-09-12', cs: 3150 },
    { date: '2026-09-22', cs: 3200 },
    { date: '2026-10-02', cs: 3012 },
  ]

  it('puts the faster time higher', () => {
    const { y } = chartScale(points, box)
    expect(y(3012)).toBeLessThan(y(3150))
    expect(y(3150)).toBeLessThan(y(3200))
  })

  it('runs from the first date at the left edge to the last at the right, in step with the days', () => {
    const { x } = chartScale(points, box)
    expect(x('2026-09-12')).toBe(40)
    expect(x('2026-10-02')).toBe(310)
    expect(x('2026-09-22')).toBe(175)
  })

  it('keeps every point inside the frame, off its edges', () => {
    const { y } = chartScale(points, box)
    for (const point of points) {
      expect(y(point.cs)).toBeGreaterThan(10)
      expect(y(point.cs)).toBeLessThan(140)
    }
  })

  it('centers swims that all fall on one day', () => {
    const { x } = chartScale(
      [
        { date: '2026-10-03', cs: 3100 },
        { date: '2026-10-03', cs: 3012 },
      ],
      box,
    )
    expect(x('2026-10-03')).toBe(175)
  })

  it('still has a height when every time is the same', () => {
    const { y, ticks } = chartScale(
      [
        { date: '2026-09-12', cs: 3012 },
        { date: '2026-10-03', cs: 3012 },
      ],
      box,
    )
    expect(y(3012)).toBe(75)
    expect(ticks.length).toBeGreaterThan(0)
  })

  it('has ticks inside the range it draws', () => {
    const { y, ticks } = chartScale(points, box)
    expect(ticks.length).toBeGreaterThan(0)
    for (const tick of ticks) {
      expect(y(tick)).toBeGreaterThanOrEqual(10)
      expect(y(tick)).toBeLessThanOrEqual(140)
    }
  })
})

describe('timeTicks', () => {
  it('counts in round steps, no more than asked for', () => {
    expect(timeTicks(2990, 3230)).toEqual([3000, 3100, 3200])
    expect(timeTicks(3002, 3022)).toEqual([3005, 3010, 3015, 3020])
    expect(timeTicks(41000, 45500)).toEqual([42000, 43500, 45000])
  })
})

describe('nearestPoint', () => {
  const placed = [
    { id: 'a', x: 40, y: 100 },
    { id: 'b', x: 175, y: 120 },
    { id: 'c', x: 180, y: 30 },
  ]

  it('picks the closest point to the tap', () => {
    expect(nearestPoint(placed, 60, 90)?.id).toBe('a')
    expect(nearestPoint(placed, 300, 20)?.id).toBe('c')
  })

  it('tells apart two points close in date by how high the tap was', () => {
    expect(nearestPoint(placed, 178, 110)?.id).toBe('b')
    expect(nearestPoint(placed, 178, 40)?.id).toBe('c')
  })

  it('has nothing to pick when there are no points', () => {
    expect(nearestPoint([], 10, 10)).toBeNull()
  })
})
