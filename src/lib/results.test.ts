import { describe, expect, it } from 'vitest'
import type { Entry, Result } from '../data/queries'
import { SWUM } from './personalBests'
import {
  baseForSave,
  decideResultWrite,
  DQ,
  draftOf,
  EMPTY_DRAFT,
  nextEntryAfter,
  NO_SHOW,
  readDraft,
  readStoredPending,
  resultOfDraft,
  sameResult,
  SCRATCHED,
  statusAllowsTime,
  withPendingResults,
  withStatus,
  type PendingResult,
  type ResultDraft,
} from './results'

const result = (over: Partial<Result> = {}): Result => ({
  status_code: SWUM,
  live_time_cs: null,
  official_time_cs: null,
  notes: null,
  ...over,
})

const draft = (over: Partial<ResultDraft> = {}): ResultDraft => ({ ...EMPTY_DRAFT, ...over })

const pending = (over: Partial<PendingResult> = {}): PendingResult => ({
  entryId: 'e1',
  userId: 'u1',
  base: null,
  draft: draft({ live: '2948' }),
  label: '50 Freestyle 29.48',
  state: 'failed',
  ...over,
})

describe('status rules', () => {
  it('lets only swum and disqualified entries have a time', () => {
    expect(statusAllowsTime(SWUM)).toBe(true)
    expect(statusAllowsTime(DQ)).toBe(true)
    expect(statusAllowsTime(NO_SHOW)).toBe(false)
    expect(statusAllowsTime(SCRATCHED)).toBe(false)
  })

  it('clears both times when the status becomes No Show or Scratched', () => {
    const typed = draft({ live: '2948', official: '2951', notes: 'felt sick' })
    expect(withStatus(typed, NO_SHOW)).toEqual({ statusCode: NO_SHOW, live: '', official: '', notes: 'felt sick' })
    expect(withStatus(typed, SCRATCHED)).toEqual({ statusCode: SCRATCHED, live: '', official: '', notes: 'felt sick' })
  })

  it('keeps the times on a disqualification, and when going back to swum', () => {
    const typed = draft({ live: '2948', official: '2951' })
    expect(withStatus(typed, DQ)).toEqual({ ...typed, statusCode: DQ })
    expect(withStatus(withStatus(typed, DQ), SWUM)).toEqual(typed)
  })

  it('does not bring the times back after No Show', () => {
    const typed = draft({ live: '2948' })
    expect(withStatus(withStatus(typed, NO_SHOW), SWUM)).toEqual(draft())
  })
})

describe('draftOf', () => {
  it('starts an upcoming entry as swum with nothing typed', () => {
    expect(draftOf(null)).toEqual({ statusCode: SWUM, live: '', official: '', notes: '' })
  })

  it('turns stored times into pad digits, each keeping its own value', () => {
    expect(draftOf(result({ live_time_cs: 2948, official_time_cs: 6532, notes: 'leg 3' }))).toEqual({
      statusCode: SWUM,
      live: '2948',
      official: '10532',
      notes: 'leg 3',
    })
  })
})

describe('readDraft', () => {
  it('reads both times and trims the notes', () => {
    expect(readDraft(draft({ live: '2948', official: '10532', notes: '  leg 3 ' }))).toEqual({
      values: { status_code: SWUM, live_time_cs: 2948, official_time_cs: 6532, notes: 'leg 3' },
    })
  })

  it('reads swum with no time and no notes as nothing at all', () => {
    expect(readDraft(draft())).toEqual({ values: null })
    expect(readDraft(draft({ notes: '   ' }))).toEqual({ values: null })
  })

  it('reads a status or a note on its own as a result', () => {
    expect(readDraft(draft({ statusCode: DQ }))).toEqual({ values: result({ status_code: DQ }) })
    expect(readDraft(draft({ statusCode: NO_SHOW }))).toEqual({ values: result({ status_code: NO_SHOW }) })
    expect(readDraft(draft({ notes: 'goggles came off' }))).toEqual({ values: result({ notes: 'goggles came off' }) })
  })

  it('never saves a time with No Show or Scratched', () => {
    expect(readDraft({ statusCode: SCRATCHED, live: '2948', official: '2951', notes: '' })).toEqual({
      values: result({ status_code: SCRATCHED }),
    })
  })

  it('names the time that is impossible', () => {
    expect(readDraft(draft({ live: '6532' }))).toEqual({ error: { time: 'live', kind: 'seconds' } })
    expect(readDraft(draft({ live: '2948', official: '17000' }))).toEqual({
      error: { time: 'official', kind: 'seconds' },
    })
  })
})

describe('decideResultWrite', () => {
  const values = result({ live_time_cs: 2948 })

  it('inserts the row on the first save', () => {
    expect(decideResultWrite('e1', null, values)).toEqual({
      kind: 'insert',
      entryId: 'e1',
      values,
      officialSource: null,
    })
  })

  it('updates the row on later saves', () => {
    const next = result({ live_time_cs: 2950 })
    expect(decideResultWrite('e1', values, next)).toEqual({ kind: 'update', entryId: 'e1', values: next })
  })

  it('deletes the row when everything is cleared, so the entry is upcoming again', () => {
    expect(decideResultWrite('e1', values, null)).toEqual({ kind: 'delete', entryId: 'e1' })
  })

  it('does nothing when there was no row and there is still nothing', () => {
    expect(decideResultWrite('e1', null, null)).toEqual({ kind: 'none' })
  })

  it('marks an official time typed here as manual', () => {
    const official = result({ official_time_cs: 2951 })
    expect(decideResultWrite('e1', null, official)).toMatchObject({ kind: 'insert', officialSource: 'MANUAL' })
    expect(decideResultWrite('e1', values, { ...values, official_time_cs: 2951 })).toMatchObject({
      kind: 'update',
      officialSource: 'MANUAL',
    })
    expect(decideResultWrite('e1', official, { ...official, official_time_cs: 2940 })).toMatchObject({
      kind: 'update',
      officialSource: 'MANUAL',
    })
  })

  it('leaves the source alone when the official time did not change', () => {
    const official = result({ official_time_cs: 2951 })
    const write = decideResultWrite('e1', official, { ...official, notes: 'new note' })
    expect(write.kind).toBe('update')
    expect('officialSource' in write).toBe(false)
  })

  it('clears the source with the official time', () => {
    const official = result({ live_time_cs: 2948, official_time_cs: 2951 })
    expect(decideResultWrite('e1', official, { ...official, official_time_cs: null })).toMatchObject({
      kind: 'update',
      officialSource: null,
    })
  })
})

describe('sameResult', () => {
  it('compares outcome, times and notes', () => {
    expect(sameResult(null, null)).toBe(true)
    expect(sameResult(null, result())).toBe(false)
    expect(sameResult(result({ notes: null }), result({ notes: '' }))).toBe(true)
    expect(sameResult(result({ live_time_cs: 2948 }), result({ live_time_cs: 2949 }))).toBe(false)
  })
})

describe('baseForSave', () => {
  it('uses what the database returned when nothing is pending', () => {
    const server = result({ live_time_cs: 2948 })
    expect(baseForSave(server, undefined)).toBe(server)
    expect(baseForSave(null, undefined)).toBeNull()
  })

  it('assumes a failed first save may have landed', () => {
    const prior = pending({ base: null, draft: draft({ live: '2948' }) })
    expect(baseForSave(null, prior)).toEqual(result({ live_time_cs: 2948 }))
    // So clearing the sheet afterwards deletes instead of doing nothing.
    expect(decideResultWrite('e1', baseForSave(null, prior), null).kind).toBe('delete')
  })

  it('keeps the row a failed save started from', () => {
    const base = result({ official_time_cs: 2951 })
    expect(baseForSave(null, pending({ base, draft: draft({ official: '2940' }) }))).toBe(base)
  })
})

describe('withPendingResults', () => {
  const entry = (id: string, r: Result | null) => ({ id, result: r }) as Entry

  it('shows a pending save as if it had landed, and leaves the rest alone', () => {
    const entries = [entry('e1', null), entry('e2', result({ live_time_cs: 3000 }))]
    const shown = withPendingResults(entries, new Map([['e1', pending()]]))
    expect(shown[0]!.result).toEqual(result({ live_time_cs: 2948 }))
    expect(shown[1]).toBe(entries[1])
  })

  it('shows a pending clear as upcoming', () => {
    const entries = [entry('e1', result({ live_time_cs: 2948 }))]
    const shown = withPendingResults(entries, new Map([['e1', pending({ draft: draft() })]]))
    expect(shown[0]!.result).toBeNull()
  })

  it('returns the same list when nothing is pending', () => {
    const entries = [entry('e1', null)]
    expect(withPendingResults(entries, new Map())).toBe(entries)
  })
})

describe('nextEntryAfter', () => {
  const ordered = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('moves to the entry after the current one', () => {
    expect(nextEntryAfter(ordered, 'a')).toEqual({ id: 'b' })
    expect(nextEntryAfter(ordered, 'c')).toEqual({ id: 'd' })
  })

  it('has nowhere to go from the last entry', () => {
    expect(nextEntryAfter(ordered, 'd')).toBeNull()
  })

  it('skips entries of swimmers this account may not edit', () => {
    const mine = (entry: { id: string }) => entry.id !== 'b' && entry.id !== 'c'
    expect(nextEntryAfter(ordered, 'a', mine)).toEqual({ id: 'd' })
    expect(nextEntryAfter(ordered, 'a', () => false)).toBeNull()
  })

  it('never wraps around or guesses from an unknown entry', () => {
    expect(nextEntryAfter(ordered, 'zzz')).toBeNull()
    expect(nextEntryAfter([], 'a')).toBeNull()
  })
})

describe('readStoredPending', () => {
  it('brings back what was kept, as failed', () => {
    const kept = [pending({ state: 'saving', error: { kind: 'noSignal', message: 'Failed to fetch' } })]
    expect(readStoredPending(JSON.stringify(kept))).toEqual([{ ...kept[0], state: 'failed' }])
  })

  it('keeps the event, so the save can be named in either language', () => {
    expect(readStoredPending(JSON.stringify([pending({ eventId: 12 })]))[0]!.eventId).toBe(12)
    // Kept before events were recorded, or tampered with: the label as typed is all there is.
    expect(readStoredPending(JSON.stringify([pending()]))[0]).not.toHaveProperty('eventId')
    expect(readStoredPending(JSON.stringify([{ ...pending(), eventId: '12' }]))[0]).not.toHaveProperty('eventId')
  })

  it('keeps the typed digits exactly', () => {
    const [back] = readStoredPending(JSON.stringify([pending({ draft: draft({ live: '10532', notes: 'leg 3' }) })]))
    expect(back!.draft).toEqual(draft({ live: '10532', notes: 'leg 3' }))
    expect(resultOfDraft(back!.draft)).toEqual(result({ live_time_cs: 6532, notes: 'leg 3' }))
  })

  it('drops anything it cannot read', () => {
    expect(readStoredPending(null)).toEqual([])
    expect(readStoredPending('not json')).toEqual([])
    expect(readStoredPending('{"entryId":"e1"}')).toEqual([])
    expect(readStoredPending(JSON.stringify([{ entryId: 'e1' }, null, 3]))).toEqual([])
    expect(readStoredPending(JSON.stringify([{ ...pending(), draft: { ...draft(), live: '1:05' } }]))).toEqual([])
    expect(readStoredPending(JSON.stringify([{ ...pending(), base: { status_code: SWUM } }]))).toEqual([])
  })
})
