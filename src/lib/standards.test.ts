import { describe, expect, it } from 'vitest'
import type { Entry, Result } from '../data/queries'
import { NO_STANDARDS, shownGap, shownLevel, standardsOf } from './standards'

function entry(id: string, result: Partial<Result> | null): Entry {
  return {
    id,
    result: result && { status_code: 'SWUM', live_time_cs: null, official_time_cs: 3012, notes: null, ...result },
  } as Entry
}

const standards = standardsOf(
  [
    { entry_id: 'a', level_code: 'BB' },
    { entry_id: 'top', level_code: 'AAAA' },
  ],
  [
    { entry_id: 'a', next_level_code: 'A', gap_cs: 84 },
    { entry_id: 'slow', next_level_code: 'B', gap_cs: 310 },
  ],
)

describe('shownLevel', () => {
  it('shows the level the database gave an official, swum result', () => {
    expect(shownLevel(entry('a', {}), standards)).toBe('BB')
  })

  it('shows nothing for a result the database gave no level', () => {
    expect(shownLevel(entry('slow', {}), standards)).toBeNull()
    expect(shownLevel(entry('a', {}), NO_STANDARDS)).toBeNull()
  })

  it('shows nothing once the result on screen is no longer an official, swum one', () => {
    expect(shownLevel(entry('a', null), standards)).toBeNull()
    expect(shownLevel(entry('a', { status_code: 'DQ' }), standards)).toBeNull()
    expect(shownLevel(entry('a', { official_time_cs: null, live_time_cs: 2990 }), standards)).toBeNull()
  })

  it('shows nothing while a save is on its way: that time has not been measured', () => {
    expect(shownLevel(entry('a', {}), standards, true)).toBeNull()
  })
})

describe('shownGap', () => {
  it('gives the next level and how far off it is', () => {
    expect(shownGap(entry('a', {}), standards)).toEqual({ levelCode: 'A', gapCs: 84 })
  })

  it('gives a gap to the first level for a result that reached none', () => {
    expect(shownGap(entry('slow', {}), standards)).toEqual({ levelCode: 'B', gapCs: 310 })
  })

  it('gives none at the top level', () => {
    expect(shownLevel(entry('top', {}), standards)).toBe('AAAA')
    expect(shownGap(entry('top', {}), standards)).toBeNull()
  })

  it('gives none for an unsaved or unofficial result', () => {
    expect(shownGap(entry('a', {}), standards, true)).toBeNull()
    expect(shownGap(entry('a', { official_time_cs: null, live_time_cs: 2990 }), standards)).toBeNull()
  })
})

describe('standardsOf', () => {
  it('is empty until the database has answered', () => {
    expect(standardsOf(undefined, undefined)).toEqual(NO_STANDARDS)
  })

  it('drops a gap that is not a time still to drop', () => {
    const { gaps } = standardsOf([], [{ entry_id: 'a', next_level_code: 'A', gap_cs: 0 }])
    expect(gaps.size).toBe(0)
  })
})
