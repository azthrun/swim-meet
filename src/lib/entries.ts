import type { Entry, Lookups } from '../data/queries'
import { selectPersonalBests, SWUM, type PersonalBests } from './personalBests'

export type ShownTime = { cs: number; official: boolean }

/** The official time, or the live time when that is all there is. */
export function shownTime(entry: Entry): ShownTime | null {
  const result = entry.result
  if (!result) return null
  if (result.official_time_cs !== null) return { cs: result.official_time_cs, official: true }
  if (result.live_time_cs !== null) return { cs: result.live_time_cs, official: false }
  return null
}

/** Shown time minus seed time for a swum result; negative is faster. */
export function dropAgainstSeed(entry: Entry): number | null {
  const time = shownTime(entry)
  if (!time || entry.seed_time_cs === null || entry.result?.status_code !== SWUM) return null
  return time.cs - entry.seed_time_cs
}

export function isRelay(entry: Entry, lookups: Lookups): boolean {
  const event = lookups.event.get(entry.event_id)
  return lookups.stroke.get(event?.stroke_code ?? '')?.is_relay ?? false
}

/** Meet order: by day, then event number, with unnumbered entries last. */
export function byMeetOrder(a: Entry, b: Entry): number {
  return (
    a.swim_date.localeCompare(b.swim_date) ||
    (a.event_number ?? Infinity) - (b.event_number ?? Infinity) ||
    a.event_id - b.event_id
  )
}

/** Personal bests of one swimmer, from all of that swimmer's entries. */
export function personalBestsOf(entries: readonly Entry[], lookups: Lookups): PersonalBests {
  return selectPersonalBests(
    entries.flatMap((entry) =>
      entry.result
        ? [
            {
              entryId: entry.id,
              eventId: entry.event_id,
              swimDate: entry.swim_date,
              isRelay: isRelay(entry, lookups),
              statusCode: entry.result.status_code,
              officialTimeCs: entry.result.official_time_cs,
              liveTimeCs: entry.result.live_time_cs,
            },
          ]
        : [],
    ),
  )
}

export type PersonalBestBadge = 'best' | 'provisional' | null

export function personalBestBadge(entry: Entry, bests: PersonalBests | undefined): PersonalBestBadge {
  if (bests?.best.get(entry.event_id)?.entryId === entry.id) return 'best'
  if (bests?.provisional.get(entry.event_id)?.entryId === entry.id) return 'provisional'
  return null
}

export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const group = groups.get(k)
    if (group) group.push(item)
    else groups.set(k, [item])
  }
  return groups
}
