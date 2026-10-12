import { describe, expect, it } from 'vitest'
import { seasonLabel, seasonOf } from './season'

describe('seasonOf', () => {
  it('starts a new season on September 1', () => {
    expect(seasonOf('2026-08-31')).toBe(2025)
    expect(seasonOf('2026-09-01')).toBe(2026)
    expect(seasonOf('2026-11-14')).toBe(2026)
    expect(seasonOf('2027-03-02')).toBe(2026)
  })
})

describe('seasonLabel', () => {
  it('names both years', () => {
    expect(seasonLabel(2026)).toBe('2026–27')
    expect(seasonLabel(2099)).toBe('2099–00')
  })
})
