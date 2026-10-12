// What the time entry sheet holds, and what saving it does to the `results` table.
// Per ADR 0001 a result row exists only while an entry has an outcome.

import type { Entry, Result } from '../data/queries'
import { SWUM } from './personalBests'
import type { SaveErrorKind } from './saveErrors'
import { padDigitsOf, readPad, type PadError } from './timePad'

export const DQ = 'DQ'
export const NO_SHOW = 'NS'
export const SCRATCHED = 'SCR'

/** Only a swum or disqualified entry has a time. Mirrors the check on `results`. */
export function statusAllowsTime(statusCode: string): boolean {
  return statusCode === SWUM || statusCode === DQ
}

export type TimeKind = 'live' | 'official'

/** The sheet as typed. Each time is the digits on the number pad and keeps its own value. */
export type ResultDraft = { statusCode: string; live: string; official: string; notes: string }

export const EMPTY_DRAFT: ResultDraft = { statusCode: SWUM, live: '', official: '', notes: '' }

export function draftOf(result: Result | null): ResultDraft {
  if (!result) return EMPTY_DRAFT
  return {
    statusCode: result.status_code,
    live: padDigitsOf(result.live_time_cs),
    official: padDigitsOf(result.official_time_cs),
    notes: result.notes ?? '',
  }
}

/** Choosing No Show or Scratched clears both times; Swum and DQ keep them. */
export function withStatus(draft: ResultDraft, statusCode: string): ResultDraft {
  if (statusAllowsTime(statusCode)) return { ...draft, statusCode }
  return { ...draft, statusCode, live: '', official: '' }
}

export type ResultValues = Result

export type DraftReading =
  /** `values` is null when the sheet is back to nothing: swum, no time, no notes. */
  { values: ResultValues | null; error?: undefined } | { values?: undefined; error: { time: TimeKind; kind: PadError } }

export function readDraft(draft: ResultDraft): DraftReading {
  const timed = statusAllowsTime(draft.statusCode)
  const live = readPad(timed ? draft.live : '')
  if (live.error) return { error: { time: 'live', kind: live.error } }
  const official = readPad(timed ? draft.official : '')
  if (official.error) return { error: { time: 'official', kind: official.error } }

  const notes = draft.notes.trim()
  if (draft.statusCode === SWUM && live.cs === null && official.cs === null && notes === '') return { values: null }
  return {
    values: {
      status_code: draft.statusCode,
      live_time_cs: live.cs,
      official_time_cs: official.cs,
      notes: notes === '' ? null : notes,
    },
  }
}

/** The draft as the result it would save, or null. Also null while a time is not valid. */
export function resultOfDraft(draft: ResultDraft): Result | null {
  return readDraft(draft).values ?? null
}

export type ResultWrite =
  | { kind: 'none' }
  /** The entry's first outcome. */
  | { kind: 'insert'; entryId: string; values: ResultValues; officialSource: 'MANUAL' | null }
  /** `officialSource` is left out when the official time did not change, so an imported time stays imported. */
  | { kind: 'update'; entryId: string; values: ResultValues; officialSource?: 'MANUAL' | null }
  /** Back to nothing: the entry is upcoming again. */
  | { kind: 'delete'; entryId: string }

/** What a save has to do, given the result the entry has now and the one the sheet holds. */
export function decideResultWrite(entryId: string, existing: Result | null, next: ResultValues | null): ResultWrite {
  if (!next) return existing ? { kind: 'delete', entryId } : { kind: 'none' }
  // A time typed here is a manual one.
  const source = next.official_time_cs === null ? null : 'MANUAL'
  if (!existing) return { kind: 'insert', entryId, values: next, officialSource: source }
  if (existing.official_time_cs === next.official_time_cs) return { kind: 'update', entryId, values: next }
  return { kind: 'update', entryId, values: next, officialSource: source }
}

export function sameResult(a: Result | null, b: Result | null): boolean {
  if (!a || !b) return a === b
  return (
    a.status_code === b.status_code &&
    a.live_time_cs === b.live_time_cs &&
    a.official_time_cs === b.official_time_cs &&
    (a.notes ?? '') === (b.notes ?? '')
  )
}

/** A save that has not reached the database: under way, or failed and kept on the phone. */
export type PendingResult = {
  entryId: string
  /** The account that typed it. */
  userId: string
  /** The result the database is believed to hold. Decides insert, update or delete. */
  base: Result | null
  draft: ResultDraft
  /** The entry's event, so the save can be put into words in whichever language is on screen. */
  eventId?: number
  /** What is being saved, in words, as it read when typed: "50 Freestyle 29.48". */
  label: string
  state: 'saving' | 'failed'
  error?: { kind: SaveErrorKind; message: string }
}

/**
 * The result to decide a new save against. A failed save may still have landed, its answer lost
 * to bad signal, so when it would have created the row the row is assumed to be there:
 * clearing the sheet then deletes instead of doing nothing.
 */
export function baseForSave(serverResult: Result | null, prior: PendingResult | undefined): Result | null {
  if (!prior) return serverResult
  return prior.base ?? resultOfDraft(prior.draft)
}

/** Entries as the editor should see them: each pending save shown as if it had landed. */
export function withPendingResults(entries: readonly Entry[], pending: ReadonlyMap<string, PendingResult>): Entry[] {
  if (pending.size === 0) return entries as Entry[]
  return entries.map((entry) => {
    const save = pending.get(entry.id)
    return save ? { ...entry, result: resultOfDraft(save.draft) } : entry
  })
}

/** The entry "Save and next" moves to: the next one in meet order that this account may edit. */
export function nextEntryAfter<T extends { id: string }>(
  ordered: readonly T[],
  currentId: string,
  canEdit: (entry: T) => boolean = () => true,
): T | null {
  const at = ordered.findIndex((entry) => entry.id === currentId)
  if (at === -1) return null
  return ordered.slice(at + 1).find(canEdit) ?? null
}

const isText = (value: unknown): value is string => typeof value === 'string'
const isTime = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isInteger(value) && value > 0)

function storedResult(value: unknown): Result | null | undefined {
  if (value === null) return null
  if (typeof value !== 'object') return undefined
  const r = value as Record<string, unknown>
  if (!isText(r.status_code) || !isTime(r.live_time_cs) || !isTime(r.official_time_cs)) return undefined
  if (r.notes !== null && !isText(r.notes)) return undefined
  return {
    status_code: r.status_code,
    live_time_cs: r.live_time_cs,
    official_time_cs: r.official_time_cs,
    notes: r.notes,
  }
}

/**
 * Reads the saves kept in local storage. A save that was under way when the page went away
 * comes back as failed: nobody saw it succeed. Anything unreadable is dropped.
 */
export function readStoredPending(json: string | null): PendingResult[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(json ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((item: unknown): PendingResult[] => {
    if (typeof item !== 'object' || item === null) return []
    const p = item as Record<string, unknown>
    const draft = p.draft as Record<string, unknown> | null | undefined
    const base = storedResult(p.base)
    if (!isText(p.entryId) || !isText(p.userId) || !isText(p.label) || base === undefined) return []
    if (typeof draft !== 'object' || draft === null) return []
    if (!isText(draft.statusCode) || !isText(draft.notes)) return []
    if (!isText(draft.live) || !isText(draft.official) || !/^\d*$/.test(draft.live + draft.official)) return []
    const error = p.error as Record<string, unknown> | null | undefined
    return [
      {
        entryId: p.entryId,
        userId: p.userId,
        base,
        draft: { statusCode: draft.statusCode, live: draft.live, official: draft.official, notes: draft.notes },
        ...(typeof p.eventId === 'number' && Number.isInteger(p.eventId) ? { eventId: p.eventId } : {}),
        label: p.label,
        state: 'failed',
        ...(error && isText(error.kind) && isText(error.message)
          ? { error: { kind: error.kind as SaveErrorKind, message: error.message } }
          : {}),
      },
    ]
  })
}
