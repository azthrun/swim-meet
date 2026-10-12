import { ArrowRight, Check, Lock, Plus, Users } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { EditorGate } from '../components/EditorGate'
import { EntryFields } from '../components/entry'
import { SaveButton, SaveFailed } from '../components/feedback'
import { ActionBar, FormHeader, useGoBack } from '../components/forms'
import { CONTAINER } from '../components/Layout'
import { CourseBadge, LoadFailed, useEventLabel } from '../components/swim'
import { useToast } from '../components/ToastContext'
import { buttonClass, EmptyState, ListSkeleton } from '../components/ui'
import { createEntries, newId, useSave, type NewEntry } from '../data/mutations'
import {
  useEntriesOfSwimmers,
  useLookups,
  useMeets,
  useSwimmers,
  type Lookups,
  type Meet,
  type Swimmer,
} from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { formatDateRange, todayIso } from '../lib/dates'
import { personalBestsOf } from '../lib/entries'
import {
  chosenInOrder,
  entryDrafts,
  entryValues,
  eventGroups,
  seedIsPersonalBest,
  validateEntryDraft,
  type EntryDraft,
} from '../lib/entryForms'
import { hasErrors, withoutErrors, type FieldErrors } from '../lib/forms'
import { editableSwimmers } from '../lib/permissions'
import { MeetFormBody } from './MeetForm'

const STEPS = 3

const RADIO_CARD =
  'flex cursor-pointer items-center gap-sm rounded-card border border-hairline bg-card px-md has-checked:border-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary'
const RADIO = 'size-5 flex-none accent-primary'

function Wizard({
  swimmers,
  meets,
  lookups,
  initialSwimmerId,
  initialMeetId,
}: {
  /** Only the swimmers this account may add entries for. */
  swimmers: Swimmer[]
  meets: Meet[]
  lookups: Lookups
  initialSwimmerId: string | undefined
  initialMeetId: string | undefined
}) {
  const { m, lang, fill, plural, name, pick } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const eventLabel = useEventLabel(lookups)
  const [params, setParams] = useSearchParams()

  const [swimmerId, setSwimmerId] = useState(initialSwimmerId)
  const [meetId, setMeetId] = useState(initialMeetId)
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set())
  // Rows the editor has touched, by event id. Untouched rows are worked out from the defaults.
  const [typed, setTyped] = useState<Record<number, EntryDraft>>({})
  const [errors, setErrors] = useState<Record<number, FieldErrors<EntryDraft>>>({})
  const [creatingMeet, setCreatingMeet] = useState(false)
  const [showEarlier, setShowEarlier] = useState(false)
  // The events being created, held still while the save and the refresh after it run.
  const [submitted, setSubmitted] = useState<number[] | null>(null)
  // One id per event for the life of this screen, so a retried create lands on the same rows.
  const ids = useRef(new Map<number, string>())

  const swimmer = swimmers.find((s) => s.id === swimmerId)
  const meet = meets.find((x) => x.id === meetId)
  const history = useEntriesOfSwimmers(swimmer ? [swimmer.id] : undefined)
  const goBack = useGoBack(swimmer ? `/swimmers/${swimmer.slug}/upcoming` : '/')

  const save = useSave(createEntries, (rows) => {
    toast(plural(m.entriesCreated, rows.length))
    navigate(swimmer ? `/swimmers/${swimmer.slug}/upcoming` : '/', { replace: true })
  })

  const bests = useMemo(() => personalBestsOf(history.data ?? [], lookups).best, [history.data, lookups])
  const groups = useMemo(() => {
    if (!meet || !history.data) return []
    const entered = new Set(history.data.filter((entry) => entry.meet_id === meet.id).map((entry) => entry.event_id))
    return eventGroups(lookups.events, lookups.strokes, meet.course_code, entered)
  }, [meet, history.data, lookups])
  const ordered = submitted ?? chosenInOrder(groups, chosen)
  const drafts = meet ? entryDrafts(ordered, meet, bests, typed) : []

  const reachable = !swimmer || !meet ? 1 : ordered.length === 0 ? 2 : STEPS
  const step = Math.max(1, Math.min(Number(params.get('step')) || 1, reachable))
  const goTo = (next: number) => {
    const search = new URLSearchParams(params)
    search.set('step', String(next))
    setParams(search)
  }

  const reset = () => {
    setChosen(new Set())
    setTyped({})
    setErrors({})
    ids.current.clear()
  }
  const pickSwimmer = (id: string) => {
    if (id !== swimmerId) reset()
    setSwimmerId(id)
  }
  const pickMeet = (id: string) => {
    if (id !== meetId) reset()
    setMeetId(id)
  }

  if (creatingMeet) {
    return (
      <MeetFormBody
        lookups={lookups}
        onCancel={() => setCreatingMeet(false)}
        onSaved={(id) => {
          pickMeet(id)
          setCreatingMeet(false)
        }}
      />
    )
  }

  const submit = () => {
    if (save.isPending || !swimmer || !meet) return
    const found: Record<number, FieldErrors<EntryDraft>> = {}
    for (const draft of drafts) {
      const rowErrors = validateEntryDraft(draft, meet)
      if (hasErrors(rowErrors)) found[draft.eventId] = rowErrors
    }
    setErrors(found)
    if (Object.keys(found).length > 0) return
    const rows: NewEntry[] = drafts.map((draft) => {
      let id = ids.current.get(draft.eventId)
      if (!id) ids.current.set(draft.eventId, (id = newId()))
      return {
        id,
        swimmer_id: swimmer.id,
        meet_id: meet.id,
        course_code: meet.course_code,
        event_id: draft.eventId,
        ...entryValues(draft),
      }
    })
    setSubmitted(ordered)
    save.mutate(rows, { onError: () => setSubmitted(null) })
  }

  const today = todayIso()
  const listedMeets = showEarlier ? meets : meets.filter((x) => x.end_date >= today || x.id === meetId)
  const earlierCount = meets.length - listedMeets.length
  const swimmerName = swimmer ? pick(swimmer.display_name, swimmer.display_name_zh) : ''
  const meetName = meet ? pick(meet.name, meet.name_zh) : ''

  let body: ReactNode
  let bar: ReactNode
  if (step === 1) {
    body = (
      <div className="flex flex-col gap-lg pt-xs">
        <fieldset className="flex min-w-0 flex-col gap-xs border-0 p-0">
          <legend className="pb-xs type-title">{m.swimmer}</legend>
          {swimmers.map((s) => (
            <label key={s.id} className={`min-h-14 type-body-md ${RADIO_CARD}`}>
              <input
                type="radio"
                name="swimmer"
                checked={s.id === swimmerId}
                onChange={() => pickSwimmer(s.id)}
                className={RADIO}
              />
              {pick(s.display_name, s.display_name_zh)}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex min-w-0 flex-col gap-xs border-0 p-0">
          <legend className="pb-xs type-title">{m.meet}</legend>
          {listedMeets.length === 0 ? <p className="type-body-sm text-muted">{m.noMeetsToPick}</p> : null}
          {listedMeets.map((x) => (
            <label key={x.id} className={`min-h-16 py-sm ${RADIO_CARD}`}>
              <input
                type="radio"
                name="meet"
                checked={x.id === meetId}
                onChange={() => pickMeet(x.id)}
                className={RADIO}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-xxs">
                <span className="type-body-md font-medium">{pick(x.name, x.name_zh)}</span>
                <span className="flex flex-wrap items-center gap-xs type-caption text-muted">
                  <CourseBadge code={x.course_code} lookups={lookups} />
                  {[formatDateRange(x.start_date, x.end_date, lang), x.location].filter(Boolean).join(' · ')}
                </span>
              </span>
            </label>
          ))}
          <div className="flex flex-wrap gap-xs pt-xxs">
            <button type="button" onClick={() => setCreatingMeet(true)} className={buttonClass('secondary')}>
              <Plus size={18} aria-hidden="true" />
              {m.createNewMeet}
            </button>
            {earlierCount > 0 ? (
              <button type="button" onClick={() => setShowEarlier(true)} className={buttonClass('secondary')}>
                {m.showEarlierMeets}
              </button>
            ) : null}
          </div>
        </fieldset>
      </div>
    )
    bar = (
      <button
        type="button"
        disabled={!swimmer || !meet}
        onClick={() => goTo(2)}
        className={buttonClass('primary', 'lg', true)}
      >
        {m.nextEvents}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    )
  } else if (history.isError) {
    body = <LoadFailed onRetry={() => void history.refetch()} />
  } else if (!history.data || !meet) {
    body = <ListSkeleton message={m.loading} />
  } else if (step === 2) {
    body = (
      <>
        <div className="flex flex-col gap-xxs">
          <span className="type-body-sm text-secondary">
            {swimmerName} · {meetName}
          </span>
          <span className="flex items-center gap-xs type-caption text-muted">
            <CourseBadge code={meet.course_code} lookups={lookups} />
            {fill(m.eventsForCourse, { course: name(lookups.course.get(meet.course_code)) })}
          </span>
        </div>
        {groups.map((group) => (
          <fieldset key={group.stroke.code} className="flex min-w-0 flex-col gap-xs border-0 p-0">
            <legend className="pb-xs type-body-sm font-semibold">{name(group.stroke)}</legend>
            <div className="grid grid-cols-3 gap-xs sm:grid-cols-4 md:grid-cols-6">
              {group.choices.map((choice) => {
                const on = chosen.has(choice.eventId)
                return (
                  <label
                    key={choice.eventId}
                    title={choice.entered ? m.alreadyEntered : undefined}
                    className={`flex min-h-12 items-center gap-xs rounded-md border px-sm type-body-sm tabular has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                      choice.entered
                        ? 'border-hairline bg-canvas text-muted'
                        : on
                          ? 'cursor-pointer border-primary bg-card font-medium'
                          : 'cursor-pointer border-input bg-card'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={choice.entered || on}
                      disabled={choice.entered}
                      onChange={() => {
                        const next = new Set(chosen)
                        if (on) next.delete(choice.eventId)
                        else next.add(choice.eventId)
                        setChosen(next)
                      }}
                      className={`size-[18px] flex-none ${choice.entered ? 'accent-muted' : 'accent-primary'}`}
                    />
                    {choice.distance}
                    {choice.entered ? (
                      <>
                        <Lock size={12} aria-hidden="true" className="flex-none" />
                        <span className="sr-only">{m.alreadyEntered}</span>
                      </>
                    ) : null}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
      </>
    )
    bar = (
      <>
        <span className="text-center type-caption text-muted">{plural(m.newEventsChosen, ordered.length)}</span>
        <button
          type="button"
          disabled={ordered.length === 0}
          onClick={() => goTo(3)}
          className={buttonClass('primary', 'lg', true)}
        >
          {m.nextDetails}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </>
    )
  } else {
    body = (
      <>
        <div className="flex flex-col gap-xxs">
          <span className="type-body-sm text-secondary">
            {swimmerName} · {meetName}
          </span>
          <p className="type-caption text-muted">{m.onlyDateRequired}</p>
        </div>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="grid items-start gap-md lg:grid-cols-2"
        >
          {drafts.map((draft) => (
            <section
              key={draft.eventId}
              className="flex flex-col gap-sm rounded-card border border-hairline bg-card p-md"
            >
              <h2 className="type-title">{eventLabel(draft.eventId)}</h2>
              <EntryFields
                draft={draft}
                errors={errors[draft.eventId] ?? {}}
                onChange={(patch) => {
                  setTyped((current) => ({ ...current, [draft.eventId]: { ...draft, ...patch } }))
                  setErrors((current) => {
                    const next = { ...current }
                    const left = withoutErrors(current[draft.eventId] ?? {}, patch)
                    if (hasErrors(left)) next[draft.eventId] = left
                    else delete next[draft.eventId]
                    return next
                  })
                }}
                meet={meet}
                lookups={lookups}
                seedHint={
                  seedIsPersonalBest(draft, bests)
                    ? m.seedFromPersonalBest
                    : bests.has(draft.eventId)
                      ? undefined
                      : m.noPersonalBestToPrefill
                }
              />
            </section>
          ))}
          <button type="submit" hidden />
        </form>
      </>
    )
    bar = (
      <>
        <SaveFailed error={save.error} onRetry={submit} saving={save.isPending} />
        {Object.keys(errors).length > 0 ? (
          <p className="text-center type-caption text-accent-orange">{m.fixFields}</p>
        ) : null}
        <SaveButton saving={save.isPending} icon={Check} onClick={submit}>
          {plural(m.createEntries, drafts.length)}
        </SaveButton>
      </>
    )
  }

  return (
    <>
      <FormHeader
        title={m.addEntries}
        leave={step === 1 ? 'cancel' : 'back'}
        onLeave={step === 1 ? goBack : () => navigate(-1)}
        aside={<span className="type-caption text-muted">{fill(m.stepOf, { n: step, total: STEPS })}</span>}
      >
        <div aria-hidden="true" className="grid grid-cols-3 gap-xxs pl-sm">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-hairline'}`} />
          ))}
        </div>
      </FormHeader>
      <main className={`flex flex-1 flex-col gap-md p-md ${CONTAINER}`}>{body}</main>
      {bar ? <ActionBar>{bar}</ActionBar> : null}
    </>
  )
}

function AddEntriesFlow() {
  const { m } = useI18n()
  const { access } = useAuth()
  const [params] = useSearchParams()
  const lookups = useLookups()
  const swimmers = useSwimmers()
  const meets = useMeets(true)

  const wrap = (body: ReactNode) => <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>{body}</main>

  if (lookups.isError || swimmers.isError || meets.isError) {
    return wrap(
      <LoadFailed
        onRetry={() => {
          for (const query of [lookups, swimmers, meets]) if (query.isError) void query.refetch()
        }}
      />,
    )
  }
  if (!lookups.data || !swimmers.data || !meets.data) return wrap(<ListSkeleton message={m.loading} />)

  const editable = editableSwimmers(access, swimmers.data)
  if (editable.length === 0) {
    return wrap(
      <EmptyState
        icon={Users}
        title={m.noEditableSwimmersTitle}
        action={
          <Link to="/" className={buttonClass('primary')}>
            {m.backToHome}
          </Link>
        }
      >
        {m.noEditableSwimmersBody}
      </EmptyState>,
    )
  }

  // Opened from a swimmer or a meet, that one is already picked. A lone swimmer always is.
  const asked = editable.find((s) => s.slug === params.get('swimmer'))
  const initialSwimmer = asked ?? (editable.length === 1 ? editable[0] : undefined)
  const initialMeet = meets.data.find((x) => x.id === params.get('meet'))
  return (
    <Wizard
      swimmers={editable}
      meets={meets.data}
      lookups={lookups.data}
      initialSwimmerId={initialSwimmer?.id}
      initialMeetId={initialMeet?.id}
    />
  )
}

/** Add entries in bulk: swimmer and meet, then events, then one row of details per event. */
export function AddEntries() {
  return (
    <EditorGate>
      <AddEntriesFlow />
    </EditorGate>
  )
}
