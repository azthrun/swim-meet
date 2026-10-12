// Personal best selection, per GLOSSARY.md: a swimmer's fastest official time in an event
// from a swum, individual result. Mirrors the `personal_bests` database view.

export const SWUM = 'SWUM'

/** One swimmer's result, reduced to what personal best selection needs. */
export type PersonalBestCandidate = {
  entryId: string
  eventId: number
  swimDate: string
  isRelay: boolean
  statusCode: string
  officialTimeCs: number | null
  liveTimeCs: number | null
}

export type PersonalBest = { entryId: string; timeCs: number; swimDate: string }

export type PersonalBests = {
  /** Personal best per event id. */
  best: Map<number, PersonalBest>
  /** Provisional personal best per event id: a live time that beats `best`, not yet official. */
  provisional: Map<number, PersonalBest>
}

// Faster wins; on a tie the earlier swim keeps it.
function beats(a: PersonalBest, b: PersonalBest | undefined): boolean {
  if (!b) return true
  if (a.timeCs !== b.timeCs) return a.timeCs < b.timeCs
  return a.swimDate < b.swimDate
}

/** Candidates must all belong to the same swimmer. */
export function selectPersonalBests(candidates: readonly PersonalBestCandidate[]): PersonalBests {
  const eligible = candidates.filter((c) => c.statusCode === SWUM && !c.isRelay)

  const best = new Map<number, PersonalBest>()
  for (const c of eligible) {
    if (c.officialTimeCs === null) continue
    const next = { entryId: c.entryId, timeCs: c.officialTimeCs, swimDate: c.swimDate }
    if (beats(next, best.get(c.eventId))) best.set(c.eventId, next)
  }

  const provisional = new Map<number, PersonalBest>()
  for (const c of eligible) {
    if (c.officialTimeCs !== null || c.liveTimeCs === null) continue
    const official = best.get(c.eventId)
    if (official && c.liveTimeCs >= official.timeCs) continue
    const next = { entryId: c.entryId, timeCs: c.liveTimeCs, swimDate: c.swimDate }
    if (beats(next, provisional.get(c.eventId))) provisional.set(c.eventId, next)
  }

  return { best, provisional }
}
