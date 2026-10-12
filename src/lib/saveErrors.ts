// Turns a failed write into something an editor can act on. The database is the judge of
// duplicates and date ranges; this only reads its verdict.

export type SaveErrorKind =
  /** The request never got an answer: no signal, or it timed out. */
  | 'noSignal'
  | 'duplicateEntry'
  | 'duplicateMeet'
  | 'slugTaken'
  | 'swimDateOutsideMeet'
  | 'meetDatesExcludeEntries'
  | 'meetHasEntries'
  | 'sessionExpired'
  | 'notAllowed'
  | 'unknown'

type ErrorLike = { code?: unknown; message?: unknown; details?: unknown; status?: unknown; name?: unknown }

const text = (value: unknown) => (typeof value === 'string' ? value : '')

/** The database's own words, for the cases this file does not recognise. */
export function saveErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  return text((error as ErrorLike | null)?.message)
}

export function saveErrorKind(error: unknown): SaveErrorKind {
  const e = (error ?? {}) as ErrorLike
  const code = text(e.code)
  const said = `${text(e.message)} ${text(e.details)}`

  if (code === '23505') {
    if (said.includes('entries_swimmer_id_meet_id_event_id_round_code_key')) return 'duplicateEntry'
    if (said.includes('meets_name_start_date_key')) return 'duplicateMeet'
    if (said.includes('swimmers_slug_key')) return 'slugTaken'
    return 'unknown'
  }
  if (code === '23514') {
    if (said.includes('outside the meet dates')) return 'swimDateOutsideMeet'
    if (said.includes('would exclude existing entries')) return 'meetDatesExcludeEntries'
    return 'unknown'
  }
  // Entries point at their meet and its course, so neither can go while entries remain.
  if (code === '23503' && said.includes('entries_meet_id_course_code_fkey')) return 'meetHasEntries'
  // PGRST116: the write matched no row, which is how row level security says no to an update.
  if (code === '42501' || code === 'PGRST116') return 'notAllowed'
  if (code === 'PGRST301' || code === 'PGRST303' || e.status === 401) return 'sessionExpired'

  // supabase-js reports a failed fetch as an error with no code.
  const name = text(e.name)
  if (
    /failed to fetch|networkerror|load failed|network request failed|timed? ?out|abort/i.test(`${name} ${said}`) ||
    name === 'AuthRetryableFetchError' ||
    (code === '' && e.status === undefined && error instanceof Error)
  ) {
    return 'noSignal'
  }
  return 'unknown'
}
