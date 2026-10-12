import { describe, expect, it } from 'vitest'
import {
  chosenInOrder,
  draftOfEntry,
  entryDrafts,
  entryValues,
  eventGroups,
  meetDays,
  newEntryDraft,
  seedIsPersonalBest,
  TIMED_FINAL,
  validateEntryDraft,
  type EntryDraft,
} from './entryForms'

const MEET = { start_date: '2026-11-14', end_date: '2026-11-15' }

const STROKES = [
  { code: 'BACK', sort_order: 2 },
  { code: 'FREE', sort_order: 1 },
  { code: 'FLY', sort_order: 4 },
  { code: 'FREE_RELAY', sort_order: 6 },
]

const EVENTS = [
  { id: 1, course_code: 'SCY', stroke_code: 'FREE', distance: 100 },
  { id: 2, course_code: 'SCY', stroke_code: 'FREE', distance: 50 },
  { id: 3, course_code: 'SCY', stroke_code: 'BACK', distance: 50 },
  { id: 4, course_code: 'SCY', stroke_code: 'FREE_RELAY', distance: 200 },
  { id: 5, course_code: 'LCM', stroke_code: 'FREE', distance: 50 },
  { id: 6, course_code: 'LCM', stroke_code: 'FLY', distance: 100 },
]

describe('meetDays', () => {
  it('lists every day of the meet', () => {
    expect(meetDays(MEET)).toEqual(['2026-11-14', '2026-11-15'])
    expect(meetDays({ start_date: '2026-11-14', end_date: '2026-11-14' })).toEqual(['2026-11-14'])
  })

  it('crosses a month and a year', () => {
    expect(meetDays({ start_date: '2026-12-30', end_date: '2027-01-01' })).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
    ])
  })

  it('gives nothing for dates it cannot read', () => {
    expect(meetDays({ start_date: '', end_date: '2026-11-15' })).toEqual([])
  })
})

describe('eventGroups', () => {
  it("offers only the meet's course, by stroke order then distance", () => {
    const groups = eventGroups(EVENTS, STROKES, 'SCY', new Set())
    expect(groups.map((g) => g.stroke.code)).toEqual(['FREE', 'BACK', 'FREE_RELAY'])
    expect(groups[0]!.choices.map((c) => c.distance)).toEqual([50, 100])
    expect(groups.flatMap((g) => g.choices.map((c) => c.eventId))).toEqual([2, 1, 3, 4])
  })

  it('leaves out strokes with no event in the course', () => {
    const groups = eventGroups(EVENTS, STROKES, 'LCM', new Set())
    expect(groups.map((g) => g.stroke.code)).toEqual(['FREE', 'FLY'])
  })

  it('marks events the swimmer is already entered in', () => {
    const groups = eventGroups(EVENTS, STROKES, 'SCY', new Set([1, 4]))
    const entered = groups.flatMap((g) => g.choices.filter((c) => c.entered).map((c) => c.eventId))
    expect(entered).toEqual([1, 4])
  })
})

describe('chosenInOrder', () => {
  it('keeps checklist order and never re-adds an entered event', () => {
    const groups = eventGroups(EVENTS, STROKES, 'SCY', new Set([1]))
    expect(chosenInOrder(groups, new Set([3, 1, 2]))).toEqual([2, 3])
  })

  it('ignores a choice left over from another course', () => {
    const groups = eventGroups(EVENTS, STROKES, 'SCY', new Set())
    expect(chosenInOrder(groups, new Set([5, 3]))).toEqual([3])
  })
})

describe('new entry defaults', () => {
  const bests = new Map([[2, { timeCs: 3012 }], [1, { timeCs: 6532 }]])

  it('starts on the first day of the meet as a timed final', () => {
    const draft = newEntryDraft(3, MEET, bests)
    expect(draft.swimDate).toBe('2026-11-14')
    expect(draft.roundCode).toBe(TIMED_FINAL)
    expect(draft).toMatchObject({ eventNumber: '', heat: '', lane: '', notes: '' })
  })

  it('pre-fills the seed time from the personal best', () => {
    expect(newEntryDraft(2, MEET, bests).seed).toBe('30.12')
    expect(newEntryDraft(1, MEET, bests).seed).toBe('1:05.32')
  })

  it('leaves the seed blank when there is no personal best, as for a relay', () => {
    expect(newEntryDraft(4, MEET, bests).seed).toBe('')
  })

  it('makes one row per chosen event and keeps rows already typed', () => {
    const typed: Record<number, EntryDraft> = {
      2: { ...newEntryDraft(2, MEET, bests), heat: '3', seed: '29.90' },
    }
    const drafts = entryDrafts([2, 3], MEET, bests, typed)
    expect(drafts.map((d) => d.eventId)).toEqual([2, 3])
    expect(drafts[0]).toMatchObject({ heat: '3', seed: '29.90' })
    expect(drafts[1]).toMatchObject({ heat: '', seed: '' })
  })

  it('knows whether the seed is still the personal best', () => {
    const draft = newEntryDraft(2, MEET, bests)
    expect(seedIsPersonalBest(draft, bests)).toBe(true)
    expect(seedIsPersonalBest({ ...draft, seed: '3012' }, bests)).toBe(true)
    expect(seedIsPersonalBest({ ...draft, seed: '29.90' }, bests)).toBe(false)
    expect(seedIsPersonalBest(newEntryDraft(3, MEET, bests), bests)).toBe(false)
  })
})

describe('validateEntryDraft', () => {
  const draft = (over: Partial<EntryDraft> = {}): EntryDraft => ({ ...newEntryDraft(2, MEET, new Map()), ...over })

  it('passes with only the defaults', () => {
    expect(validateEntryDraft(draft(), MEET)).toEqual({})
  })

  it('passes with everything filled in', () => {
    const full = draft({ eventNumber: '12', heat: '3', lane: '4', seed: '30.12', notes: 'leg 3' })
    expect(validateEntryDraft(full, MEET)).toEqual({})
  })

  it('requires a date inside the meet', () => {
    expect(validateEntryDraft(draft({ swimDate: '' }), MEET).swimDate).toBe('required')
    expect(validateEntryDraft(draft({ swimDate: '2026-11-13' }), MEET).swimDate).toBe('dateOutsideMeet')
    expect(validateEntryDraft(draft({ swimDate: '2026-11-16' }), MEET).swimDate).toBe('dateOutsideMeet')
    expect(validateEntryDraft(draft({ swimDate: '2026-11-15' }), MEET).swimDate).toBeUndefined()
    expect(validateEntryDraft(draft({ swimDate: 'Saturday' }), MEET).swimDate).toBe('dateInvalid')
  })

  it('wants whole numbers from 1 for event number and heat', () => {
    for (const bad of ['0', '-1', '1.5', 'A', '40000']) {
      expect(validateEntryDraft(draft({ eventNumber: bad }), MEET).eventNumber).toBe('positiveNumber')
      expect(validateEntryDraft(draft({ heat: bad }), MEET).heat).toBe('positiveNumber')
    }
  })

  it('allows lane 0 but not a negative lane', () => {
    expect(validateEntryDraft(draft({ lane: '0' }), MEET).lane).toBeUndefined()
    expect(validateEntryDraft(draft({ lane: '-1' }), MEET).lane).toBe('laneNumber')
    expect(validateEntryDraft(draft({ lane: 'four' }), MEET).lane).toBe('laneNumber')
  })

  it('rejects a seed that is not a time', () => {
    expect(validateEntryDraft(draft({ seed: '1:65.00' }), MEET).seed).toBe('timeFormat')
    expect(validateEntryDraft(draft({ seed: 'fast' }), MEET).seed).toBe('timeFormat')
    expect(validateEntryDraft(draft({ seed: ' 10532 ' }), MEET).seed).toBeUndefined()
  })
})

describe('entryValues', () => {
  it('stores blanks as null and the seed in centiseconds', () => {
    const blank = entryValues(newEntryDraft(2, MEET, new Map()))
    expect(blank).toEqual({
      swim_date: '2026-11-14',
      round_code: TIMED_FINAL,
      event_number: null,
      heat: null,
      lane: null,
      seed_time_cs: null,
      notes: null,
    })
    const full = entryValues({
      eventId: 2,
      swimDate: '2026-11-15',
      roundCode: 'PRELIM',
      eventNumber: ' 12 ',
      heat: '3',
      lane: '0',
      seed: '1:05.32',
      notes: ' leg 3 ',
    })
    expect(full).toEqual({
      swim_date: '2026-11-15',
      round_code: 'PRELIM',
      event_number: 12,
      heat: 3,
      lane: 0,
      seed_time_cs: 6532,
      notes: 'leg 3',
    })
  })

  it('round-trips a saved entry through the edit form', () => {
    const saved = {
      event_id: 2,
      swim_date: '2026-11-15',
      round_code: 'FINAL',
      event_number: 27,
      heat: null,
      lane: 5,
      seed_time_cs: 9280,
      notes: null,
    }
    const draft = draftOfEntry(saved)
    expect(draft).toMatchObject({ eventId: 2, eventNumber: '27', heat: '', lane: '5', seed: '1:32.80', notes: '' })
    expect(entryValues(draft)).toEqual({
      swim_date: saved.swim_date,
      round_code: saved.round_code,
      event_number: saved.event_number,
      heat: saved.heat,
      lane: saved.lane,
      seed_time_cs: saved.seed_time_cs,
      notes: saved.notes,
    })
  })
})
