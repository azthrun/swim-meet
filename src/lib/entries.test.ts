import { describe, expect, it } from 'vitest'
import type { Entry } from '../data/queries'
import { newestFirst } from './entries'

function entry(id: string, swimDate: string, eventNumber: number | null = null): Entry {
  return { id, event_id: 1, swim_date: swimDate, event_number: eventNumber, heat: null, lane: null } as Entry
}

describe('newestFirst', () => {
  it('puts the latest day first, whatever order the entries come in', () => {
    const sorted = newestFirst([entry('sep', '2026-09-12'), entry('oct', '2026-10-03'), entry('aug', '2026-08-01')])
    expect(sorted.map((e) => e.id)).toEqual(['oct', 'sep', 'aug'])
  })

  it('puts the later swim of a day first: a final after its prelim', () => {
    const sorted = newestFirst([entry('prelim', '2026-10-03', 4), entry('final', '2026-10-03', 24)])
    expect(sorted.map((e) => e.id)).toEqual(['final', 'prelim'])
  })

  it('leaves the list it is given alone', () => {
    const entries = [entry('sep', '2026-09-12'), entry('oct', '2026-10-03')]
    newestFirst(entries)
    expect(entries.map((e) => e.id)).toEqual(['sep', 'oct'])
  })
})
