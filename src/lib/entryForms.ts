// Adding entries in bulk and editing one: which events can be chosen, what a new entry
// starts out as, and what is wrong with a row as typed.

import { blankToNull, isIsoDate, type FieldErrors } from './forms'
import { formatTime, parseTime } from './time'

export const TIMED_FINAL = 'TIMED_FINAL'

/** Largest value a Postgres smallint holds; event number, heat and lane are smallints. */
const SMALLINT_MAX = 32767

type MeetDates = { start_date: string; end_date: string }
type CatalogEvent = { id: number; course_code: string; stroke_code: string; distance: number }
type CatalogStroke = { code: string; sort_order: number }

/** One entry as typed. Everything but the date and round may be left blank. */
export type EntryDraft = {
  eventId: number
  swimDate: string
  roundCode: string
  eventNumber: string
  heat: string
  lane: string
  /** Seed time as typed: "1:05.32", "28.41" or bare digits. */
  seed: string
  notes: string
}

/** Every day of a meet, first to last. */
export function meetDays(meet: MeetDates): string[] {
  if (!isIsoDate(meet.start_date) || !isIsoDate(meet.end_date)) return []
  const days: string[] = []
  const day = new Date(`${meet.start_date}T00:00:00Z`)
  // A meet is a few consecutive days; the cap only guards against bad data.
  while (days.length < 60) {
    const iso = day.toISOString().slice(0, 10)
    if (iso > meet.end_date) break
    days.push(iso)
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return days
}

export type EventChoice = { eventId: number; distance: number; entered: boolean }
export type EventGroup<S> = { stroke: S; choices: EventChoice[] }

/**
 * The checklist for step 2: the events valid for a course, grouped by stroke in lookup order.
 * `entered` marks events the swimmer already has an entry for at this meet.
 */
export function eventGroups<S extends CatalogStroke>(
  events: readonly CatalogEvent[],
  strokes: readonly S[],
  courseCode: string,
  enteredEventIds: ReadonlySet<number>,
): EventGroup<S>[] {
  return [...strokes]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((stroke) => ({
      stroke,
      choices: events
        .filter((event) => event.course_code === courseCode && event.stroke_code === stroke.code)
        .sort((a, b) => a.distance - b.distance)
        .map((event) => ({ eventId: event.id, distance: event.distance, entered: enteredEventIds.has(event.id) })),
    }))
    .filter((group) => group.choices.length > 0)
}

/** The newly chosen events in checklist order, leaving out any that are already entered. */
export function chosenInOrder<S>(groups: readonly EventGroup<S>[], chosen: ReadonlySet<number>): number[] {
  return groups.flatMap((group) =>
    group.choices.filter((choice) => !choice.entered && chosen.has(choice.eventId)).map((choice) => choice.eventId),
  )
}

/**
 * A new entry's starting values: swum on the meet's first day as a timed final, with the
 * seed time pre-filled from the personal best when there is one.
 */
export function newEntryDraft(
  eventId: number,
  meet: MeetDates,
  bests: ReadonlyMap<number, { timeCs: number }>,
): EntryDraft {
  const best = bests.get(eventId)
  return {
    eventId,
    swimDate: meet.start_date,
    roundCode: TIMED_FINAL,
    eventNumber: '',
    heat: '',
    lane: '',
    seed: best ? formatTime(best.timeCs) : '',
    notes: '',
  }
}

/** One draft per chosen event. A row already being filled in keeps what was typed. */
export function entryDrafts(
  eventIds: readonly number[],
  meet: MeetDates,
  bests: ReadonlyMap<number, { timeCs: number }>,
  typed: Readonly<Record<number, EntryDraft>> = {},
): EntryDraft[] {
  return eventIds.map((eventId) => typed[eventId] ?? newEntryDraft(eventId, meet, bests))
}

/** True when the seed as typed is the personal best. */
export function seedIsPersonalBest(draft: EntryDraft, bests: ReadonlyMap<number, { timeCs: number }>): boolean {
  const best = bests.get(draft.eventId)
  return best !== undefined && parseTime(draft.seed) === best.timeCs
}

type SavedEntry = {
  event_id: number
  swim_date: string
  round_code: string
  event_number: number | null
  heat: number | null
  lane: number | null
  seed_time_cs: number | null
  notes: string | null
}

export function draftOfEntry(entry: SavedEntry): EntryDraft {
  return {
    eventId: entry.event_id,
    swimDate: entry.swim_date,
    roundCode: entry.round_code,
    eventNumber: entry.event_number === null ? '' : String(entry.event_number),
    heat: entry.heat === null ? '' : String(entry.heat),
    lane: entry.lane === null ? '' : String(entry.lane),
    seed: entry.seed_time_cs === null ? '' : formatTime(entry.seed_time_cs),
    notes: entry.notes ?? '',
  }
}

/** Reads a whole number in [min, smallint max]; null when blank, NaN when it is not one. */
function parseCount(value: string, min: number): number | null {
  const text = value.trim()
  if (text === '') return null
  if (!/^\d+$/.test(text)) return NaN
  const n = Number(text)
  return n >= min && n <= SMALLINT_MAX ? n : NaN
}

export function validateEntryDraft(draft: EntryDraft, meet: MeetDates): FieldErrors<EntryDraft> {
  const errors: FieldErrors<EntryDraft> = {}

  if (draft.swimDate === '') errors.swimDate = 'required'
  else if (!isIsoDate(draft.swimDate)) errors.swimDate = 'dateInvalid'
  else if (draft.swimDate < meet.start_date || draft.swimDate > meet.end_date) errors.swimDate = 'dateOutsideMeet'

  if (draft.roundCode === '') errors.roundCode = 'required'
  if (Number.isNaN(parseCount(draft.eventNumber, 1))) errors.eventNumber = 'positiveNumber'
  if (Number.isNaN(parseCount(draft.heat, 1))) errors.heat = 'positiveNumber'
  // Lane 0 exists in ten-lane pools.
  if (Number.isNaN(parseCount(draft.lane, 0))) errors.lane = 'laneNumber'
  if (draft.seed.trim() !== '' && parseTime(draft.seed) === null) errors.seed = 'timeFormat'
  return errors
}

/** The columns an editor fills in, from a draft that passed validation. */
export function entryValues(draft: EntryDraft) {
  return {
    swim_date: draft.swimDate,
    round_code: draft.roundCode,
    event_number: parseCount(draft.eventNumber, 1),
    heat: parseCount(draft.heat, 1),
    lane: parseCount(draft.lane, 0),
    seed_time_cs: draft.seed.trim() === '' ? null : parseTime(draft.seed),
    notes: blankToNull(draft.notes),
  }
}
