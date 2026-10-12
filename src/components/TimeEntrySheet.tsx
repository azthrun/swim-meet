import { ArrowRight, Check, CircleSlash, Delete, LoaderCircle, RotateCw, TriangleAlert, UserX, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { usePendingResults } from '../data/PendingResultsContext'
import type { Entry, Lookups, Swimmer } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { dropAgainstSeed, personalBestBadge, personalBestsOf } from '../lib/entries'
import {
  draftOf,
  NO_SHOW,
  readDraft,
  sameResult,
  statusAllowsTime,
  withStatus,
  type ResultDraft,
  type TimeKind,
} from '../lib/results'
import { formatTime } from '../lib/time'
import { padDisplay, pressBackspace, pressDigit, readPad } from '../lib/timePad'
import { Alert, SaveButton } from './feedback'
import { fieldClass } from './forms'
import { Drop, PersonalBestBadge, useEventLabel, usePendingLabel, useResultLabel, useStatusLabel } from './swim'
import { buttonClass, iconButtonClass } from './ui'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'] as const

// The sheet is as tall as the screen allows and the pad takes up the slack: keys are 60px where
// there is room and shrink toward 44px before anything has to scroll.
const PAD =
  'grid min-h-[200px] max-h-[264px] flex-[1_1_264px] grid-cols-3 grid-rows-4 gap-xs short:min-h-[194px] short:gap-[6px]'
const KEY = 'press flex h-full min-h-11 items-center justify-center rounded-card border-0'
const DIGIT_KEY = `${KEY} bg-canvas type-heading-2 tabular text-heading active:bg-hairline`
const EDIT_KEY = `${KEY} bg-card type-button text-secondary shadow-[inset_0_0_0_1px_var(--border-hairline)] active:bg-canvas`

type Props = {
  /** The entry as loaded, without any pending save laid over it. */
  entry: Entry
  swimmer: Swimmer
  lookups: Lookups
  /** Every entry of this swimmer as shown on screen, to tell whether the time is a personal best. */
  history: readonly Entry[] | undefined
  /** Where "Save and next" goes. Null at the end of the meet; left out, there is no such button. */
  next?: Entry | null
  onClose: () => void
  onNext: (entryId: string) => void
}

/**
 * The time entry sheet: a bottom sheet with its own number pad, for one hand at the pool.
 * Built on the native dialog, which traps focus and closes on Escape.
 */
export function TimeEntrySheet(props: Props) {
  const { entry, onClose } = props
  const { pending } = usePendingResults()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Kept across "Save and next": a run of live times, or a run of official ones.
  const [kind, setKind] = useState<TimeKind>(() =>
    (pending.get(entry.id)?.draft ?? draftOf(entry.result)).official === '' ? 'live' : 'official',
  )

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the scrim lands on the dialog element itself.
        if (event.target === ref.current) onClose()
      }}
      className="mx-auto mt-auto mb-0 max-h-none w-full max-w-[min(480px,100vw)] rounded-t-well border-0 bg-card p-0 text-ink shadow-modal backdrop:bg-[rgba(0,0,0,0.28)]"
    >
      <SheetBody key={entry.id} {...props} titleId={titleId} kind={kind} setKind={setKind} />
    </dialog>
  )
}

function SheetBody({
  entry,
  swimmer,
  lookups,
  history,
  next,
  onClose,
  onNext,
  titleId,
  kind,
  setKind,
}: Props & { titleId: string; kind: TimeKind; setKind: (kind: TimeKind) => void }) {
  const { m, fill, plural, name, pick } = useI18n()
  const { pending, lastSaved, save, retry } = usePendingResults()
  const event = useEventLabel(lookups)(entry.event_id)
  const statusLabel = useStatusLabel(lookups)
  const resultLabel = useResultLabel(lookups)
  const labelOf = usePendingLabel()
  const notesId = useId()

  const mine = pending.get(entry.id)
  const [draft, setDraft] = useState<ResultDraft>(() => mine?.draft ?? draftOf(entry.result))
  // A failed save takes over the sheet until the editor chooses to change what was typed.
  const [editing, setEditing] = useState(false)
  const saving = mine?.state === 'saving'
  const failed = mine?.state === 'failed' && !editing

  // A save outlives this entry's turn in the sheet; only the turn that asked may close it.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const edit = (change: (draft: ResultDraft) => ResultDraft) => {
    setDraft(change)
    setEditing(true)
  }

  const timed = statusAllowsTime(draft.statusCode)
  const reading = readDraft(draft)
  const values = reading.values ?? null
  const active = readPad(draft[kind])
  const padOff = !timed || saving

  // The rules live in personalBests.ts: lay the typed result over the history and ask them.
  const preview: Entry = { ...entry, result: values }
  const earned = history?.some((e) => e.id === entry.id)
    ? personalBestBadge(
        preview,
        personalBestsOf(
          history.map((e) => (e.id === entry.id ? preview : e)),
          lookups,
        ),
      )
    : null
  // Each time shows the badge it can earn: a live time is provisional, an official one is the best.
  const badge = earned === (kind === 'live' ? 'provisional' : 'best') ? earned : null
  const drop = dropAgainstSeed({
    ...entry,
    result: {
      status_code: draft.statusCode,
      live_time_cs: kind === 'live' ? (active.cs ?? null) : null,
      official_time_cs: kind === 'official' ? (active.cs ?? null) : null,
      notes: null,
    },
  })

  const label = resultLabel(entry.event_id, values)

  const hasResult = entry.result !== null || mine !== undefined
  const unchanged = !mine && !reading.error && sameResult(values, entry.result)
  // Nothing typed for an upcoming entry is nothing to save.
  const canSave = !reading.error && !saving && (values !== null || hasResult)

  const submit = (thenNext: boolean) => {
    if (!canSave) return
    const move = () => (thenNext && next ? onNext(next.id) : onClose())
    if (unchanged) return move()
    setEditing(false)
    const saved = save({ entryId: entry.id, serverResult: entry.result, draft, eventId: entry.event_id, label })
    if (thenNext && next) return move()
    // Plain Save waits here, so a failure is met with the pad still under the thumb.
    void saved.then((ok) => {
      if (ok && alive.current) onClose()
    })
  }

  const press = (key: (typeof KEYS)[number]) => {
    if (padOff) return
    edit((d) => ({
      ...d,
      [kind]: key === 'clear' ? '' : key === 'backspace' ? pressBackspace(d[kind]) : pressDigit(d[kind], key),
    }))
  }

  // The pad also answers a real keyboard, except while the notes field has it.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
    if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number])
    else if (e.key === 'Backspace') press('backspace')
  }

  const facts = [
    entry.event_number === null ? null : `#${entry.event_number}`,
    name(lookups.round.get(entry.round_code)),
    entry.heat === null ? null : fill(m.heat, { n: entry.heat }),
    entry.lane === null ? null : fill(m.lane, { n: entry.lane }),
  ].filter(Boolean)

  const others = [...pending.values()].filter((p) => p.entryId !== entry.id)
  const failedOthers = others.filter((p) => p.state === 'failed')
  const savingOther = others.find((p) => p.state === 'saving')

  const kindLabel = { live: m.liveTime, official: m.officialTime }
  const padError = active.error
    ? m.padErrors[active.error]
    : reading.error
      ? fill(m.otherTimeInvalid, { type: kindLabel[reading.error.time] })
      : null
  const StatusIcon = draft.statusCode === NO_SHOW ? UserX : CircleSlash

  return (
    <div
      onKeyDown={onKeyDown}
      className="flex h-[calc(100dvh-48px)] max-h-[800px] flex-col gap-sm px-md pt-xs pb-md short:h-[calc(100dvh-16px)] short:gap-xs"
    >
      <span aria-hidden="true" className="h-1 w-10 flex-none self-center rounded-full bg-input" />

      <div className="flex flex-none items-start gap-xs">
        <div className="flex min-w-0 flex-1 flex-col gap-xxs">
          <h2 id={titleId} className="type-title">
            {pick(swimmer.display_name, swimmer.display_name_zh)} · {event}
          </h2>
          <span className="type-caption text-muted">
            {facts.join(' · ')} ·{' '}
            {entry.seed_time_cs === null ? (
              m.noSeedTime
            ) : (
              <>
                {m.seed} <span className="tabular">{formatTime(entry.seed_time_cs)}</span>
              </>
            )}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label={m.close} className={iconButtonClass}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Saves made from entries the sheet has already moved on from. */}
      {failedOthers.length > 0 ? (
        <div
          role="alert"
          className="flex flex-none items-center gap-sm rounded-card border-2 border-accent-orange px-sm py-xs"
        >
          <TriangleAlert size={20} aria-hidden="true" className="flex-none text-accent-orange" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="type-body-sm font-semibold">{plural(m.timesNotSaved, failedOthers.length)}</span>
            <span className="truncate type-caption text-secondary">{failedOthers.map(labelOf).join(' · ')}</span>
          </span>
          <button
            type="button"
            onClick={() => retry(failedOthers.map((p) => p.entryId))}
            className={`flex-none ${buttonClass('primary')}`}
          >
            <RotateCw size={18} aria-hidden="true" />
            {m.retry}
          </button>
        </div>
      ) : (
        <p
          role="status"
          className="flex flex-none items-center justify-center gap-xs type-caption text-secondary empty:hidden"
        >
          {savingOther ? (
            <>
              <LoaderCircle size={16} aria-hidden="true" className="flex-none animate-spin" />
              {fill(m.savingNamed, { label: labelOf(savingOther) })}
            </>
          ) : lastSaved ? (
            <>
              <Check size={16} aria-hidden="true" className="flex-none text-accent-green" />
              {lastSaved}
            </>
          ) : null}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-sm overflow-y-auto short:gap-xs">
        <div
          role="radiogroup"
          aria-label={m.timeType}
          className={`flex flex-none rounded-full bg-canvas p-xxs ${timed ? '' : 'opacity-40'}`}
        >
          {(['live', 'official'] as const).map((option) => {
            const on = option === kind
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!timed || saving}
                onClick={() => setKind(option)}
                className={`h-11 flex-1 rounded-full border-0 type-button ${
                  on ? 'bg-card text-ink shadow-soft' : 'bg-transparent text-muted'
                }`}
              >
                {kindLabel[option]}
              </button>
            )
          })}
        </div>

        {failed ? null : (
          <div
            role="radiogroup"
            aria-label={m.status}
            className="grid flex-none grid-cols-4 gap-xxs rounded-md bg-canvas p-xxs"
          >
            {lookups.statuses.map((status) => {
              const on = status.code === draft.statusCode
              return (
                <button
                  key={status.code}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={name(status)}
                  disabled={saving}
                  onClick={() => edit((d) => withStatus(d, status.code))}
                  className={`h-11 rounded-sm border-0 px-xxs type-body-sm ${
                    on ? 'bg-card font-medium text-ink shadow-soft' : 'bg-transparent text-secondary'
                  }`}
                >
                  {statusLabel(status.code)}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex min-h-[122px] flex-none flex-col items-center justify-center gap-xs rounded-well border border-hairline px-md py-sm short:min-h-[92px] short:gap-xxs short:py-xs">
          {timed ? (
            <>
              <output
                aria-live="polite"
                aria-label={`${kindLabel[kind]} ${padDisplay(draft[kind])}`}
                className={`type-display-1 tabular short:text-[48px] ${draft[kind] === '' ? 'text-faint' : 'text-heading'}`}
              >
                {padDisplay(draft[kind])}
              </output>
              {padError ? (
                <span role="alert" className="type-caption font-semibold text-accent-orange">
                  {padError}
                </span>
              ) : values === null && hasResult ? (
                <span className="text-center type-caption text-secondary">{m.clearsResult}</span>
              ) : draft[kind] === '' ? (
                <span className="type-caption text-muted">{m.typeDigitsHint}</span>
              ) : drop === null && !badge ? null : (
                <div className="flex flex-wrap items-center justify-center gap-sm">
                  {drop === null ? null : <Drop deltaCs={drop} />}
                  <PersonalBestBadge badge={badge} />
                </div>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-xs type-heading-2 text-secondary">
                <StatusIcon size={24} aria-hidden="true" />
                {name(lookups.status.get(draft.statusCode))}
              </span>
              <span className="type-caption text-muted">{m.noTimeForEntry}</span>
            </>
          )}
        </div>

        <div
          role="group"
          aria-label={m.numberPad}
          aria-disabled={padOff}
          className={`${PAD} ${padOff ? 'opacity-40' : ''}`}
        >
          {KEYS.map((key) =>
            key === 'clear' ? (
              <button key={key} type="button" disabled={padOff} onClick={() => press(key)} className={EDIT_KEY}>
                {m.clear}
              </button>
            ) : key === 'backspace' ? (
              <button
                key={key}
                type="button"
                disabled={padOff}
                onClick={() => press(key)}
                aria-label={m.backspace}
                className={EDIT_KEY}
              >
                <Delete size={28} aria-hidden="true" />
              </button>
            ) : (
              <button key={key} type="button" disabled={padOff} onClick={() => press(key)} className={DIGIT_KEY}>
                {key}
              </button>
            ),
          )}
        </div>

        {failed && mine ? (
          <div className="flex-none">
            <Alert title={mine.error ? m.saveErrors[mine.error.kind].title : m.notSavedYet}>
              {fill(m.keptUntilSaved, { label: labelOf(mine) })}
            </Alert>
          </div>
        ) : saving && mine ? (
          <p
            role="status"
            className="flex min-h-11 flex-none items-center justify-center gap-xs type-body-sm text-secondary"
          >
            <LoaderCircle size={16} aria-hidden="true" className="flex-none animate-spin" />
            {fill(m.savingNamed, { label: labelOf(mine) })}
          </p>
        ) : (
          <div className="flex flex-none flex-col gap-[6px]">
            <label htmlFor={notesId} className="type-caption text-secondary short:sr-only">
              {m.notes}
            </label>
            <input
              id={notesId}
              value={draft.notes}
              onChange={(e) => edit((d) => ({ ...d, notes: e.target.value }))}
              autoComplete="off"
              enterKeyHint="done"
              placeholder={m.notesPlaceholder}
              className={fieldClass(false)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-none gap-xs">
        {failed ? (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`${buttonClass('secondary', 'lg', true)} px-sm!`}
            >
              {m.keepEditing}
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              className={`${buttonClass('primary', 'lg', true)} px-sm!`}
            >
              <RotateCw size={18} aria-hidden="true" />
              {m.retrySave}
            </button>
          </>
        ) : (
          <>
            {next === undefined ? null : (
              <button
                type="button"
                disabled={!canSave || next === null}
                onClick={() => submit(true)}
                className={`${buttonClass('secondary', 'lg', true)} px-sm!`}
              >
                {m.saveAndNext}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
            <SaveButton saving={saving} icon={Check} disabled={!canSave} onClick={() => submit(false)}>
              {m.save}
            </SaveButton>
          </>
        )}
      </div>
    </div>
  )
}
