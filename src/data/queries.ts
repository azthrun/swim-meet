import { useQuery } from '@tanstack/react-query'
import type { Tables } from './database.types'
import { supabase } from './supabase'

export type Course = Tables<'courses'>
export type Stroke = Tables<'strokes'>
export type Round = Tables<'rounds'>
export type ResultStatus = Tables<'result_statuses'>
export type Event = Tables<'events'>
export type Swimmer = Pick<Tables<'swimmers'>, 'id' | 'slug' | 'display_name' | 'display_name_zh'>
export type Meet = Pick<
  Tables<'meets'>,
  'id' | 'name' | 'name_zh' | 'course_code' | 'start_date' | 'end_date' | 'location' | 'results_url' | 'notes'
>
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

export type MeetWithEntries = { meet: Meet; entries: Entry[]; swimmers: Swimmer[] }

/** Resolves to null when no meet has that id. */
export function useMeet(meetId: string) {
  return useQuery({
    queryKey: ['meet', meetId],
    queryFn: async (): Promise<MeetWithEntries | null> => {
      // A malformed id can never match, and Postgres would reject it as an error.
      if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(meetId)) return null
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
