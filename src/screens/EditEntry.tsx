import { Check } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { EditorGate } from '../components/EditorGate'
import { EntryFields } from '../components/entry'
import { SaveButton, SaveFailed } from '../components/feedback'
import { ActionBar, FormHeader, useGoBack } from '../components/forms'
import { CONTAINER } from '../components/Layout'
import { CourseBadge, LoadFailed, useEventLabel } from '../components/swim'
import { useToast } from '../components/ToastContext'
import { ListSkeleton } from '../components/ui'
import { updateEntry, useSave } from '../data/mutations'
import { useEntriesOfSwimmers, useEntry, useLookups, useSwimmers, type Entry, type Lookups } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { personalBestsOf } from '../lib/entries'
import { draftOfEntry, entryValues, seedIsPersonalBest, validateEntryDraft, type EntryDraft } from '../lib/entryForms'
import { hasErrors, type FieldErrors } from '../lib/forms'
import { canEditEntries } from '../lib/permissions'
import { NotFoundState } from './NotFound'

function EditEntryForm({ entry, lookups, swimmerName }: { entry: Entry; lookups: Lookups; swimmerName: string }) {
  const { m, fill, pick } = useI18n()
  const toast = useToast()
  const event = useEventLabel(lookups)(entry.event_id)
  const goBack = useGoBack(`/meets/${entry.meet_id}`)
  const save = useSave(updateEntry, () => {
    toast(fill(m.entrySaved, { event }))
    goBack()
  })
  const history = useEntriesOfSwimmers([entry.swimmer_id])
  const bests = useMemo(() => personalBestsOf(history.data ?? [], lookups).best, [history.data, lookups])

  const [draft, setDraft] = useState<EntryDraft>(() => draftOfEntry(entry))
  const [errors, setErrors] = useState<FieldErrors<EntryDraft>>({})

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (save.isPending) return
    const found = validateEntryDraft(draft, entry.meet)
    setErrors(found)
    if (hasErrors(found)) return
    save.mutate({ id: entry.id, values: entryValues(draft) })
  }

  return (
    <>
      <FormHeader title={m.editEntry} onLeave={goBack} />
      <main className={`flex flex-1 flex-col gap-md p-md ${CONTAINER}`}>
        <div className="flex flex-col gap-xxs">
          <span className="type-body-sm text-secondary">
            {swimmerName ? `${swimmerName} · ` : ''}
            {pick(entry.meet.name, entry.meet.name_zh)}
          </span>
          <span className="flex items-center gap-xs type-caption text-muted">
            <CourseBadge code={entry.meet.course_code} lookups={lookups} />
            {m.editEntryHint}
          </span>
        </div>
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-col gap-sm rounded-card border border-hairline bg-card p-md"
        >
          <h2 className="type-title">{event}</h2>
          <EntryFields
            draft={draft}
            errors={errors}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            meet={entry.meet}
            lookups={lookups}
            seedHint={seedIsPersonalBest(draft, bests) ? m.seedIsPersonalBest : undefined}
          />
          <button type="submit" hidden />
        </form>
      </main>
      <ActionBar>
        <SaveFailed error={save.error} onRetry={submit} saving={save.isPending} />
        {hasErrors(errors) ? <p className="text-center type-caption text-accent-orange">{m.fixFields}</p> : null}
        <SaveButton saving={save.isPending} icon={Check} onClick={submit}>
          {m.saveEntry}
        </SaveButton>
      </ActionBar>
    </>
  )
}

/** Edit entry: the Add entries step 3 row, for one entry. The event itself cannot change. */
export function EditEntry() {
  const { entryId = '' } = useParams()
  const { m, pick } = useI18n()
  const lookups = useLookups()
  const swimmers = useSwimmers()
  const entry = useEntry(entryId)

  const wrap = (body: ReactNode) => <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>{body}</main>

  if (entry.isError || lookups.isError) {
    return wrap(
      <LoadFailed
        onRetry={() => {
          for (const query of [entry, lookups]) if (query.isError) void query.refetch()
        }}
      />,
    )
  }
  if (entry.data === null) return wrap(<NotFoundState title={m.entryNotFoundTitle} body={m.entryNotFoundBody} />)
  if (!entry.data || !lookups.data) return wrap(<ListSkeleton message={m.loading} />)

  const data = entry.data
  const swimmer = swimmers.data?.find((s) => s.id === data.swimmer_id)
  return (
    <EditorGate allowed={(access) => canEditEntries(access, data.swimmer_id)}>
      {/* Keyed by id: a background refresh of the entry must not wipe what is being typed. */}
      <EditEntryForm
        key={data.id}
        entry={data}
        lookups={lookups.data}
        swimmerName={swimmer ? pick(swimmer.display_name, swimmer.display_name_zh) : ''}
      />
    </EditorGate>
  )
}
