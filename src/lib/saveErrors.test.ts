import { describe, expect, it } from 'vitest'
import { saveErrorKind, saveErrorMessage } from './saveErrors'

const unique = (constraint: string) => ({
  code: '23505',
  message: `duplicate key value violates unique constraint "${constraint}"`,
  details: 'Key already exists.',
})

describe('saveErrorKind', () => {
  it('names the three duplicates the database guards against', () => {
    expect(saveErrorKind(unique('entries_swimmer_id_meet_id_event_id_round_code_key'))).toBe('duplicateEntry')
    expect(saveErrorKind(unique('meets_name_start_date_key'))).toBe('duplicateMeet')
    expect(saveErrorKind(unique('swimmers_slug_key'))).toBe('slugTaken')
  })

  it('does not guess at a duplicate it does not know', () => {
    expect(saveErrorKind(unique('entries_pkey'))).toBe('unknown')
  })

  it('reads the date range triggers', () => {
    expect(
      saveErrorKind({
        code: '23514',
        message: 'swim_date 2026-11-20 is outside the meet dates 2026-11-14 to 2026-11-15',
      }),
    ).toBe('swimDateOutsideMeet')
    expect(saveErrorKind({ code: '23514', message: 'meet dates would exclude existing entries' })).toBe(
      'meetDatesExcludeEntries',
    )
  })

  it('knows a meet with entries cannot be deleted or change course', () => {
    expect(
      saveErrorKind({
        code: '23503',
        message:
          'update or delete on table "meets" violates foreign key constraint "entries_meet_id_course_code_fkey" on table "entries"',
      }),
    ).toBe('meetHasEntries')
  })

  it('treats a refused or empty write as not allowed', () => {
    expect(saveErrorKind({ code: '42501', message: 'new row violates row-level security policy' })).toBe('notAllowed')
    expect(saveErrorKind({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })).toBe(
      'notAllowed',
    )
  })

  it('notices an expired session', () => {
    expect(saveErrorKind({ code: 'PGRST301', message: 'JWT expired' })).toBe('sessionExpired')
  })

  it('calls an unanswered request no signal', () => {
    expect(saveErrorKind({ code: '', message: 'TypeError: Failed to fetch' })).toBe('noSignal')
    expect(saveErrorKind({ code: '', message: 'TypeError: Load failed' })).toBe('noSignal')
    expect(saveErrorKind({ code: '', message: 'TimeoutError: The operation timed out.' })).toBe('noSignal')
    expect(saveErrorKind({ code: '', message: 'AbortError: signal is aborted without reason' })).toBe('noSignal')
    expect(saveErrorKind(new TypeError('Failed to fetch'))).toBe('noSignal')
    expect(saveErrorKind({ name: 'AuthRetryableFetchError', message: '', status: 0 })).toBe('noSignal')
  })

  it('falls back to unknown', () => {
    expect(saveErrorKind({ code: '22003', message: 'smallint out of range' })).toBe('unknown')
    expect(saveErrorKind(null)).toBe('unknown')
  })
})

describe('saveErrorMessage', () => {
  it("returns the database's own words", () => {
    expect(saveErrorMessage({ code: '22003', message: 'smallint out of range' })).toBe('smallint out of range')
    expect(saveErrorMessage(undefined)).toBe('')
  })
})
