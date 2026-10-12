import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Which entry the time entry sheet is open on. Kept in the URL, so the phone's back gesture
 * closes the sheet instead of leaving the screen behind it.
 */
export function useSheetEntry() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const opened = (location.state as { sheet?: boolean } | null)?.sheet === true

  const go = (entryId: string | null, replace: boolean, state?: { sheet: true }) => {
    const next = new URLSearchParams(params)
    if (entryId) next.set('entry', entryId)
    else next.delete('entry')
    setParams(next, { replace, state })
  }

  return {
    entryId: params.get('entry'),
    open: (entryId: string) => go(entryId, false, { sheet: true }),
    /** "Save and next": the sheet stays one step of history deep however far it walks. */
    advance: (entryId: string) => go(entryId, true, opened ? { sheet: true } : undefined),
    // Opened from a link there is no step to take back.
    close: () => (opened ? navigate(-1) : go(null, true)),
  }
}
