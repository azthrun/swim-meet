import { createContext, useContext } from 'react'
import type { PendingResult, ResultDraft } from '../lib/results'
import type { Result } from './queries'

export type SaveResult = {
  entryId: string
  /** The result the entry has in the database, as loaded. */
  serverResult: Result | null
  draft: ResultDraft
  /** What is being saved, in words: "50 Freestyle 29.48", or just the event when clearing. */
  label: string
}

export type PendingResults = {
  /** This account's saves that have not reached the database, by entry id. Empty when signed out. */
  pending: ReadonlyMap<string, PendingResult>
  /** The last save that went through, for a few seconds, for screens the toast cannot reach. */
  lastSaved: string | null
  /** Shows the result at once and writes it. Resolves to whether it was saved; never rejects. */
  save: (save: SaveResult) => Promise<boolean>
  /** Tries the failed saves again. Nothing does this on its own. */
  retry: (entryIds?: readonly string[]) => void
  /** Forgets failed saves without saving them. */
  discard: (entryIds: readonly string[]) => void
}

export const PendingResultsContext = createContext<PendingResults | null>(null)

export function usePendingResults(): PendingResults {
  const value = useContext(PendingResultsContext)
  if (!value) throw new Error('usePendingResults must be used inside PendingResultsProvider')
  return value
}
