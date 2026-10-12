import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/ToastContext'
import { useI18n } from '../i18n/I18nContext'
import { baseForSave, decideResultWrite, readStoredPending, resultOfDraft, type PendingResult } from '../lib/results'
import { saveErrorKind, saveErrorMessage } from '../lib/saveErrors'
import { writeResult } from './mutations'
import { PendingResultsContext, type PendingResults, type SaveResult } from './PendingResultsContext'
import type { Entry, MeetWithEntries, Result } from './queries'

const STORAGE_KEY = 'swim-meet.unsaved-results'
const LAST_SAVED_MS = 3500

function stored(): PendingResult[] {
  try {
    return readStoredPending(localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

// The write is done, so the screens show it without waiting on a refetch over pool signal.
function patchCachedResult(queryClient: QueryClient, entryId: string, result: Result | null): void {
  const patch = (entry: Entry) => (entry.id === entryId ? { ...entry, result } : entry)
  queryClient.setQueriesData<Entry[]>({ queryKey: ['entries'] }, (old) => old?.map(patch))
  queryClient.setQueriesData<MeetWithEntries | null>({ queryKey: ['meet'] }, (old) =>
    old ? { ...old, entries: old.entries.map(patch) } : old,
  )
  queryClient.setQueriesData<Entry | null>({ queryKey: ['entry'] }, (old) => (old ? patch(old) : old))
}

/**
 * Result saves from the time entry sheet. A save is shown at once and written behind the sheet,
 * which may have moved on or closed. One that fails is kept in local storage, typed digits and
 * all, until the editor retries or discards it. This is not an offline queue: nothing is retried
 * behind the editor's back.
 */
export function PendingResultsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const { m, fill } = useI18n()
  const toast = useToast()
  const [all, setAll] = useState(stored)
  const [lastSaved, setLastSaved] = useState<{ id: number; message: string } | null>(null)
  // The list as of now, for saves that finish long after the render that started them.
  const latest = useRef(all)

  const change = useCallback((next: (list: PendingResult[]) => PendingResult[]) => {
    latest.current = next(latest.current)
    setAll(latest.current)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current))
    } catch {
      // Private browsing: kept for this visit only.
    }
  }, [])

  useEffect(() => {
    if (!lastSaved) return
    const timer = setTimeout(() => setLastSaved(null), LAST_SAVED_MS)
    return () => clearTimeout(timer)
  }, [lastSaved])

  const run = useCallback(
    async (record: PendingResult): Promise<boolean> => {
      const { entryId } = record
      const others = (list: PendingResult[]) => list.filter((p) => p.entryId !== entryId)
      change((list) => [...others(list), { ...record, state: 'saving', error: undefined }])
      const next = resultOfDraft(record.draft)
      try {
        await writeResult(decideResultWrite(entryId, record.base, next))
      } catch (error) {
        const failed = { kind: saveErrorKind(error), message: saveErrorMessage(error) }
        change((list) => list.map((p) => (p.entryId === entryId ? { ...p, state: 'failed', error: failed } : p)))
        return false
      }
      patchCachedResult(queryClient, entryId, next)
      change(others)
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'lookups' })
      const message = fill(next ? m.resultSaved : m.resultCleared, { label: record.label })
      toast(message)
      setLastSaved({ id: Date.now(), message })
      return true
    },
    [change, queryClient, toast, fill, m],
  )

  const value = useMemo<PendingResults>(() => {
    const mine = all.filter((p) => p.userId === userId)
    return {
      pending: new Map(mine.map((p) => [p.entryId, p])),
      lastSaved: lastSaved?.message ?? null,
      save: async ({ entryId, serverResult, draft, label }: SaveResult) => {
        if (!userId) return false
        const prior = latest.current.find((p) => p.entryId === entryId && p.userId === userId)
        return run({ entryId, userId, base: baseForSave(serverResult, prior), draft, label, state: 'saving' })
      },
      retry: (entryIds) => {
        for (const p of latest.current) {
          if (p.userId === userId && p.state === 'failed' && (!entryIds || entryIds.includes(p.entryId))) void run(p)
        }
      },
      discard: (entryIds) =>
        change((list) =>
          list.filter((p) => !(p.userId === userId && p.state === 'failed' && entryIds.includes(p.entryId))),
        ),
    }
  }, [all, userId, lastSaved, run, change])

  return <PendingResultsContext.Provider value={value}>{children}</PendingResultsContext.Provider>
}
