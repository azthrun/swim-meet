import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ResultWrite } from '../lib/results'
import type { TablesInsert } from './database.types'
import { supabase } from './supabase'

// Without a limit, a write on a dead connection looks like "saving" for as long as the
// phone cares to wait. Past this, it is reported as failed and can be retried.
const WRITE_TIMEOUT_MS = 15_000

const timeout = () => AbortSignal.timeout(WRITE_TIMEOUT_MS)

function check({ error }: { error: unknown }): void {
  if (error) throw error
}

/** A fresh id for a row about to be created. */
export function newId(): string {
  return crypto.randomUUID()
}

// Creates are upserts on an id chosen by the form. If the answer to a create is lost to bad
// signal, the retry lands on the same row instead of making a second one or tripping over the first.

type SwimmerValues = Pick<TablesInsert<'swimmers'>, 'display_name' | 'display_name_zh' | 'slug'>
type SwimmerPrivateValues = Pick<TablesInsert<'swimmer_private'>, 'date_of_birth' | 'gender_code'>

export type SaveSwimmer = {
  id: string
  isNew: boolean
  values: SwimmerValues
  /** Left out when there is nothing private to write. */
  privateValues?: SwimmerPrivateValues
}

export async function saveSwimmer({ id, isNew, values, privateValues }: SaveSwimmer): Promise<void> {
  if (isNew) {
    check(await supabase.from('swimmers').upsert({ id, ...values }, { onConflict: 'id' }).abortSignal(timeout()))
  } else {
    check(await supabase.from('swimmers').update(values).eq('id', id).select('id').abortSignal(timeout()).single())
  }
  if (privateValues) {
    check(
      await supabase
        .from('swimmer_private')
        .upsert({ swimmer_id: id, ...privateValues }, { onConflict: 'swimmer_id' })
        .abortSignal(timeout()),
    )
  }
}

type MeetValues = Pick<
  TablesInsert<'meets'>,
  'name' | 'name_zh' | 'course_code' | 'start_date' | 'end_date' | 'location' | 'results_url' | 'notes'
>

export type SaveMeet = { id: string; isNew: boolean; values: MeetValues }

export async function saveMeet({ id, isNew, values }: SaveMeet): Promise<void> {
  if (isNew) {
    check(await supabase.from('meets').upsert({ id, ...values }, { onConflict: 'id' }).abortSignal(timeout()))
  } else {
    check(await supabase.from('meets').update(values).eq('id', id).select('id').abortSignal(timeout()).single())
  }
}

type EntryValues = Pick<
  TablesInsert<'entries'>,
  'swim_date' | 'round_code' | 'event_number' | 'heat' | 'lane' | 'seed_time_cs' | 'notes'
>

export type NewEntry = EntryValues &
  Pick<TablesInsert<'entries'>, 'swimmer_id' | 'meet_id' | 'course_code' | 'event_id'> & { id: string }

/** Creates every entry in one request: all of them are saved, or none. */
export async function createEntries(entries: NewEntry[]): Promise<void> {
  check(await supabase.from('entries').upsert(entries, { onConflict: 'id' }).abortSignal(timeout()))
}

export async function updateEntry({ id, values }: { id: string; values: EntryValues }): Promise<void> {
  check(await supabase.from('entries').update(values).eq('id', id).select('id').abortSignal(timeout()).single())
}

type Deletable = 'swimmers' | 'meets' | 'entries'

// Row level security answers a delete it refuses with "nothing deleted", not an error, and a
// retried delete finds nothing either. Looking again tells the two apart.
async function deleteRow(table: Deletable, id: string): Promise<void> {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id').abortSignal(timeout())
  if (error) throw error
  if (data.length > 0) return
  const still = await supabase.from(table).select('id').eq('id', id).abortSignal(timeout()).maybeSingle()
  if (still.error) throw still.error
  if (still.data) throw { code: '42501', message: `delete on ${table} was not allowed` }
}

/** Deletes the swimmer with every entry and result. */
export const deleteSwimmer = (id: string) => deleteRow('swimmers', id)
export const deleteMeet = (id: string) => deleteRow('meets', id)
export const deleteEntry = (id: string) => deleteRow('entries', id)

/**
 * Carries out what `decideResultWrite` decided. Insert and update are both upserts on the
 * entry, so a retry after a lost answer lands on the same row, and so does a save made after
 * another editor created or cleared it.
 */
export async function writeResult(write: ResultWrite): Promise<void> {
  if (write.kind === 'none') return
  if (write.kind === 'delete') {
    const { data, error } = await supabase
      .from('results')
      .delete()
      .eq('entry_id', write.entryId)
      .select('entry_id')
      .abortSignal(timeout())
    if (error) throw error
    if (data.length > 0) return
    // As in deleteRow: nothing deleted is either already gone or refused.
    const still = await supabase
      .from('results')
      .select('entry_id')
      .eq('entry_id', write.entryId)
      .abortSignal(timeout())
      .maybeSingle()
    if (still.error) throw still.error
    if (still.data) throw { code: '42501', message: 'delete on results was not allowed' }
    return
  }
  const row: TablesInsert<'results'> = { entry_id: write.entryId, ...write.values }
  if (write.officialSource !== undefined) {
    row.official_source = write.officialSource
    row.official_imported_at = null
  }
  check(await supabase.from('results').upsert(row, { onConflict: 'entry_id' }).abortSignal(timeout()))
}

// How long "saving" may wait for the screens behind the form to catch up with the write.
const REFRESH_WAIT_MS = 5_000

/**
 * A write with its saving / saved / failed state. Nothing is retried behind the editor's back:
 * a failure stays on screen until they retry it.
 */
export function useSave<Variables>(
  write: (variables: Variables) => Promise<void>,
  /** Runs once the write is saved, even if the form that asked for it has left the screen. */
  onSaved?: (variables: Variables) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: write,
    // "Saved" waits for the refetch, so the screen the editor lands on already shows the change.
    // The wait is capped: on bad signal the write is done even if the refresh is not.
    // The lookups are written by migrations only and never change under a write.
    onSuccess: async (_data, variables) => {
      await Promise.race([
        queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'lookups' }),
        new Promise<void>((resolve) => setTimeout(resolve, REFRESH_WAIT_MS)),
      ])
      onSaved?.(variables)
    },
  })
}
