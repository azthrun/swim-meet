import { useQuery } from '@tanstack/react-query'
import type { AccessFacts } from '../lib/permissions'
import type { SwimmerEditors } from '../lib/sharing'
import type { Tables } from './database.types'
import { supabase } from './supabase'

export type Course = Tables<'courses'>
export type Stroke = Tables<'strokes'>
export type Round = Tables<'rounds'>
export type ResultStatus = Tables<'result_statuses'>
export type Event = Tables<'events'>
export type Gender = Tables<'genders'>
export type Swimmer = Pick<Tables<'swimmers'>, 'id' | 'slug' | 'display_name' | 'display_name_zh'>
export type Meet = Pick<
  Tables<'meets'>,
  'id' | 'name' | 'name_zh' | 'course_code' | 'start_date' | 'end_date' | 'location' | 'results_url' | 'notes'
>
/** Never fetched for a signed-out visitor: see ADR 0002. */
export type SwimmerPrivate = Pick<Tables<'swimmer_private'>, 'date_of_birth' | 'gender_code'>
export type Result = Pick<Tables<'results'>, 'status_code' | 'live_time_cs' | 'official_time_cs' | 'notes'>

/** An entry with its meet and, once it has an outcome, its result. No result means upcoming. */
export type Entry = Pick<
  Tables<'entries'>,
  | 'id'
  | 'swimmer_id'
  | 'meet_id'
  | 'event_id'
  | 'round_code'
  | 'swim_date'
  | 'event_number'
  | 'heat'
  | 'lane'
  | 'seed_time_cs'
  | 'notes'
> & { meet: Meet; result: Result | null }

const SWIMMER_COLUMNS = 'id, slug, display_name, display_name_zh'
const MEET_COLUMNS = 'id, name, name_zh, course_code, start_date, end_date, location, results_url, notes'
const ENTRY_COLUMNS = `id, swimmer_id, meet_id, event_id, round_code, swim_date, event_number, heat, lane, seed_time_cs, notes,
  meet:meets!inner(${MEET_COLUMNS}),
  result:results(status_code, live_time_cs, official_time_cs, notes)`

// supabase-js reports failures as values; TanStack Query wants them thrown.
function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error
  return data as T
}

export type Lookups = {
  courses: Course[]
  strokes: Stroke[]
  rounds: Round[]
  statuses: ResultStatus[]
  events: Event[]
  course: Map<string, Course>
  stroke: Map<string, Stroke>
  round: Map<string, Round>
  status: Map<string, ResultStatus>
  event: Map<number, Event>
}

async function fetchLookups(): Promise<Lookups> {
  const [courses, strokes, rounds, statuses, events] = await Promise.all([
    supabase.from('courses').select('*').order('sort_order').then(unwrap),
    supabase.from('strokes').select('*').order('sort_order').then(unwrap),
    supabase.from('rounds').select('*').order('sort_order').then(unwrap),
    supabase.from('result_statuses').select('*').order('sort_order').then(unwrap),
    supabase.from('events').select('*').order('distance').then(unwrap),
  ])
  return {
    courses,
    strokes,
    rounds,
    statuses,
    events,
    course: new Map(courses.map((r) => [r.code, r])),
    stroke: new Map(strokes.map((r) => [r.code, r])),
    round: new Map(rounds.map((r) => [r.code, r])),
    status: new Map(statuses.map((r) => [r.code, r])),
    event: new Map(events.map((r) => [r.id, r])),
  }
}

/** Fixed vocabulary and the event catalog. Written by migrations only, so cached for the visit. */
export function useLookups() {
  return useQuery({ queryKey: ['lookups'], queryFn: fetchLookups, staleTime: Infinity })
}

export function useSwimmers() {
  return useQuery({
    queryKey: ['swimmers'],
    queryFn: async (): Promise<Swimmer[]> =>
      supabase.from('swimmers').select(SWIMMER_COLUMNS).order('display_name').then(unwrap),
  })
}

export type UpcomingMeet = { swimmer_id: string; meet: Meet }

/** One row per upcoming entry of any swimmer, for the "next meet" line on Home. */
export function useUpcomingMeets() {
  return useQuery({
    queryKey: ['upcoming-meets'],
    queryFn: async (): Promise<UpcomingMeet[]> => {
      const rows = await supabase
        .from('entries')
        .select(`swimmer_id, meet:meets!inner(${MEET_COLUMNS}), result:results(entry_id)`)
        .is('result', null)
        .then(unwrap)
      return rows.map(({ swimmer_id, meet }) => ({ swimmer_id, meet }))
    },
  })
}

/** Every entry of the given swimmers, with meets and results. */
export function useEntriesOfSwimmers(swimmerIds: string[] | undefined) {
  const ids = swimmerIds ? [...swimmerIds].sort() : undefined
  return useQuery({
    queryKey: ['entries', 'swimmers', ids],
    enabled: ids !== undefined,
    queryFn: async (): Promise<Entry[]> => {
      if (!ids || ids.length === 0) return []
      return supabase.from('entries').select(ENTRY_COLUMNS).in('swimmer_id', ids).then(unwrap)
    },
  })
}

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export type MeetWithEntries = { meet: Meet; entries: Entry[]; swimmers: Swimmer[] }

/** Resolves to null when no meet has that id. */
export function useMeet(meetId: string) {
  return useQuery({
    queryKey: ['meet', meetId],
    queryFn: async (): Promise<MeetWithEntries | null> => {
      // A malformed id can never match, and Postgres would reject it as an error.
      if (!UUID.test(meetId)) return null
      const meet = await supabase.from('meets').select(MEET_COLUMNS).eq('id', meetId).maybeSingle().then(unwrap)
      if (!meet) return null
      const entries: Entry[] = await supabase.from('entries').select(ENTRY_COLUMNS).eq('meet_id', meetId).then(unwrap)
      const ids = [...new Set(entries.map((e) => e.swimmer_id))]
      const swimmers = ids.length
        ? await supabase.from('swimmers').select(SWIMMER_COLUMNS).in('id', ids).then(unwrap)
        : []
      return { meet, entries, swimmers }
    },
  })
}

/** Every meet, newest first. Only editors need the whole list, to pick a meet for new entries. */
export function useMeets(enabled: boolean) {
  return useQuery({
    queryKey: ['meets'],
    enabled,
    queryFn: async (): Promise<Meet[]> =>
      supabase.from('meets').select(MEET_COLUMNS).order('start_date', { ascending: false }).then(unwrap),
  })
}

/** Resolves to null when no entry has that id. */
export function useEntry(entryId: string) {
  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: async (): Promise<Entry | null> => {
      if (!UUID.test(entryId)) return null
      return supabase.from('entries').select(ENTRY_COLUMNS).eq('id', entryId).maybeSingle().then(unwrap)
    },
  })
}

// Everything under ['account'] belongs to the signed-in account and is dropped at sign-out.
export const ACCOUNT_KEY = 'account'

/** What decides which edit controls an account sees. Runs only when signed in. */
export function useAccessFacts(userId: string | undefined) {
  return useQuery({
    queryKey: [ACCOUNT_KEY, userId, 'access'],
    enabled: userId !== undefined,
    queryFn: async (): Promise<AccessFacts> => {
      const id = userId!
      const [profile, swimmers, editors, meets] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', id).maybeSingle().then(unwrap),
        supabase.from('swimmers').select('id, owner_id').then(unwrap),
        supabase.from('swimmer_editors').select('swimmer_id, user_id').eq('user_id', id).then(unwrap),
        supabase.from('meets').select('id').eq('created_by', id).then(unwrap),
      ])
      return {
        userId: id,
        isAdmin: profile?.is_admin ?? false,
        swimmers,
        editors,
        createdMeetIds: meets.map((meet) => meet.id),
      }
    },
  })
}

/** Date of birth and gender. Resolves to null when none are recorded yet. */
export function useSwimmerPrivate(userId: string | undefined, swimmerId: string | undefined) {
  return useQuery({
    queryKey: [ACCOUNT_KEY, userId, 'swimmer-private', swimmerId],
    enabled: userId !== undefined && swimmerId !== undefined,
    // Private fields are read fresh for each visit to the settings screen and not kept around.
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<SwimmerPrivate | null> =>
      supabase
        .from('swimmer_private')
        .select('date_of_birth, gender_code')
        .eq('swimmer_id', swimmerId!)
        .maybeSingle()
        .then(unwrap),
  })
}

/**
 * The signed-in account's own display name. Never fetched for a signed-out visitor: `profiles`
 * is readable by signed-in accounts only. Resolves to null when the account has no profile row.
 */
export function useOwnDisplayName(userId: string | undefined) {
  return useQuery({
    queryKey: [ACCOUNT_KEY, userId, 'display-name'],
    enabled: userId !== undefined,
    queryFn: async (): Promise<string | null> => {
      const profile = await supabase.from('profiles').select('display_name').eq('id', userId!).maybeSingle().then(unwrap)
      return profile?.display_name ?? null
    },
  })
}

/**
 * Who can edit one swimmer: the owner and the accounts it is shared with, by display name.
 * For the owner and an admin only; the database shows anyone else no more than their own share.
 * Asks for the named accounts and nothing else: no emails, and no list of accounts.
 */
export function useSwimmerEditors(userId: string | undefined, swimmerId: string | undefined) {
  return useQuery({
    queryKey: [ACCOUNT_KEY, userId, 'swimmer-editors', swimmerId],
    enabled: userId !== undefined && swimmerId !== undefined,
    queryFn: async (): Promise<SwimmerEditors> => {
      const [swimmer, editors] = await Promise.all([
        supabase.from('swimmers').select('owner_id').eq('id', swimmerId!).single().then(unwrap),
        supabase.from('swimmer_editors').select('user_id').eq('swimmer_id', swimmerId!).then(unwrap),
      ])
      const editorIds = editors.map((editor) => editor.user_id)
      const profiles = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', [swimmer.owner_id, ...editorIds])
        .then(unwrap)
      return {
        ownerId: swimmer.owner_id,
        editorIds,
        names: Object.fromEntries(profiles.map((profile) => [profile.id, profile.display_name])),
      }
    },
  })
}

export function useGenders(enabled: boolean) {
  return useQuery({
    queryKey: ['genders'],
    enabled,
    staleTime: Infinity,
    queryFn: async (): Promise<Gender[]> => supabase.from('genders').select('*').order('sort_order').then(unwrap),
  })
}
