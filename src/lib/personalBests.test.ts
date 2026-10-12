import { describe, expect, it } from 'vitest'
import { selectPersonalBests, type PersonalBestCandidate } from './personalBests'

let nextId = 0
function result(over: Partial<PersonalBestCandidate>): PersonalBestCandidate {
  nextId += 1
  return {
    entryId: `e${nextId}`,
    eventId: 1,
    swimDate: '2026-11-14',
    isRelay: false,
    statusCode: 'SWUM',
    officialTimeCs: null,
    liveTimeCs: null,
    ...over,
  }
}

describe('selectPersonalBests', () => {
  it('picks the fastest official time per event', () => {
    const { best } = selectPersonalBests([
      result({ entryId: 'slow', eventId: 1, officialTimeCs: 3100 }),
      result({ entryId: 'fast', eventId: 1, officialTimeCs: 3012 }),
      result({ entryId: 'other', eventId: 2, officialTimeCs: 9280 }),
    ])
    expect(best.get(1)).toEqual({ entryId: 'fast', timeCs: 3012, swimDate: '2026-11-14' })
    expect(best.get(2)?.entryId).toBe('other')
    expect(best.size).toBe(2)
  })

  it('keeps the earlier swim when two times tie', () => {
    const { best } = selectPersonalBests([
      result({ entryId: 'later', officialTimeCs: 3012, swimDate: '2026-12-01' }),
      result({ entryId: 'earlier', officialTimeCs: 3012, swimDate: '2026-11-14' }),
    ])
    expect(best.get(1)?.entryId).toBe('earlier')
  })

  it('never counts relays, disqualified swims or other statuses', () => {
    const { best, provisional } = selectPersonalBests([
      result({ isRelay: true, officialTimeCs: 100 }),
      result({ statusCode: 'DQ', officialTimeCs: 100, liveTimeCs: 100 }),
      result({ statusCode: 'NS' }),
      result({ statusCode: 'SCR' }),
      result({ entryId: 'counts', officialTimeCs: 3012 }),
    ])
    expect(best.get(1)?.entryId).toBe('counts')
    expect(provisional.size).toBe(0)
  })

  it('ignores a live time when choosing the personal best', () => {
    const { best } = selectPersonalBests([
      result({ entryId: 'official', officialTimeCs: 3012 }),
      result({ entryId: 'live', liveTimeCs: 2948 }),
    ])
    expect(best.get(1)?.entryId).toBe('official')
  })

  it('marks a live time that beats the personal best as provisional', () => {
    const { provisional } = selectPersonalBests([
      result({ officialTimeCs: 3012 }),
      result({ entryId: 'live', liveTimeCs: 2948, swimDate: '2026-11-15' }),
    ])
    expect(provisional.get(1)).toEqual({ entryId: 'live', timeCs: 2948, swimDate: '2026-11-15' })
  })

  it('has no provisional when the live time is equal or slower', () => {
    const { provisional } = selectPersonalBests([
      result({ officialTimeCs: 3012 }),
      result({ liveTimeCs: 3012 }),
      result({ liveTimeCs: 3100 }),
    ])
    expect(provisional.size).toBe(0)
  })

  it('treats a first live time in an event as provisional', () => {
    const { best, provisional } = selectPersonalBests([result({ entryId: 'first', liveTimeCs: 2948 })])
    expect(best.size).toBe(0)
    expect(provisional.get(1)?.entryId).toBe('first')
  })

  it('keeps only the fastest of several provisional live times', () => {
    const { provisional } = selectPersonalBests([
      result({ officialTimeCs: 3012 }),
      result({ entryId: 'prelim', liveTimeCs: 2990 }),
      result({ entryId: 'final', liveTimeCs: 2948 }),
    ])
    expect(provisional.get(1)?.entryId).toBe('final')
  })

  it('uses the official time once a result has both', () => {
    const { best, provisional } = selectPersonalBests([
      result({ officialTimeCs: 3012 }),
      result({ entryId: 'confirmed', liveTimeCs: 2948, officialTimeCs: 2951 }),
    ])
    expect(best.get(1)).toMatchObject({ entryId: 'confirmed', timeCs: 2951 })
    expect(provisional.size).toBe(0)
  })

  it('returns nothing for no results', () => {
    const { best, provisional } = selectPersonalBests([])
    expect(best.size).toBe(0)
    expect(provisional.size).toBe(0)
  })
})
