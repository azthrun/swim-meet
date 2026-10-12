// Motivational standard levels as shown on screen. Which level a result reached is decided in
// the database (ADR 0002): it depends on the swimmer's age and gender, which never leave it.

import type { Entry } from '../data/queries'
import { SWUM } from './personalBests'

/** The level one result reached, as the database answers. */
export type StandardLevelRow = { entry_id: string; level_code: string }
/** How far one result is from the next level up, as the database answers. */
export type StandardGapRow = { entry_id: string; next_level_code: string; gap_cs: number }

export type StandardGap = { levelCode: string; gapCs: number }

export type Standards = {
  /** Level code per entry id. */
  levels: Map<string, string>
  /** Gap to the next level per entry id. Editors only; empty for everyone else. */
  gaps: Map<string, StandardGap>
}

export const NO_STANDARDS: Standards = { levels: new Map(), gaps: new Map() }

export function standardsOf(
  levels: readonly StandardLevelRow[] | undefined,
  gaps: readonly StandardGapRow[] | undefined,
): Standards {
  return {
    levels: new Map((levels ?? []).map((row) => [row.entry_id, row.level_code])),
    gaps: new Map(
      // A gap is a time still to drop, so anything that is not above zero is not one.
      (gaps ?? [])
        .filter((row) => row.gap_cs > 0)
        .map((row) => [row.entry_id, { levelCode: row.next_level_code, gapCs: row.gap_cs }]),
    ),
  }
}

/**
 * True when the level the database gave still describes the result on screen: an official time
 * from a swum result, with no save on its way. An unsaved edit shows as if saved, and the
 * database has not measured that time yet.
 */
function measured(entry: Entry, unsaved: boolean): boolean {
  return !unsaved && entry.result?.status_code === SWUM && entry.result.official_time_cs !== null
}

/** The level to show on a result, or null. */
export function shownLevel(entry: Entry, standards: Standards, unsaved = false): string | null {
  if (!measured(entry, unsaved)) return null
  return standards.levels.get(entry.id) ?? null
}

/** The gap to show beside a personal best, or null. None at the top level. */
export function shownGap(entry: Entry, standards: Standards, unsaved = false): StandardGap | null {
  if (!measured(entry, unsaved)) return null
  return standards.gaps.get(entry.id) ?? null
}
