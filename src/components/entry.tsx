import { Trash2 } from 'lucide-react'
import type { Entry, Lookups, Meet } from '../data/queries'
import { deleteEntry, useSave } from '../data/mutations'
import { useI18n } from '../i18n/I18nContext'
import { formatDay } from '../lib/dates'
import { meetDays, type EntryDraft } from '../lib/entryForms'
import type { FieldErrors } from '../lib/forms'
import { Modal, SaveButton, SaveFailed } from './feedback'
import { SelectField, TextField } from './forms'
import { useEventLabel } from './swim'
import { useToast } from './ToastContext'
import { buttonClass } from './ui'

/** The fields of one entry: a row of Add entries step 3, and the whole of Edit entry. */
export function EntryFields({
  draft,
  errors,
  onChange,
  meet,
  lookups,
  seedHint,
}: {
  draft: EntryDraft
  errors: FieldErrors<EntryDraft>
  onChange: (patch: Partial<EntryDraft>) => void
  meet: Pick<Meet, 'start_date' | 'end_date'>
  lookups: Lookups
  seedHint?: string
}) {
  const { m, lang, name } = useI18n()
  const days = meetDays(meet)
  // An entry is always inside its meet's dates, so this only guards against odd data.
  if (draft.swimDate !== '' && !days.includes(draft.swimDate)) days.push(draft.swimDate)

  return (
    <>
      <div className="grid grid-cols-2 items-start gap-sm">
        <SelectField
          label={m.date}
          value={draft.swimDate}
          error={errors.swimDate}
          onChange={(value) => onChange({ swimDate: value })}
          options={days.map((day) => ({ value: day, label: formatDay(day, lang) }))}
        />
        <SelectField
          label={m.round}
          value={draft.roundCode}
          error={errors.roundCode}
          onChange={(value) => onChange({ roundCode: value })}
          options={lookups.rounds.map((round) => ({ value: round.code, label: name(round) }))}
        />
      </div>
      <div className="grid grid-cols-3 items-start gap-sm">
        <TextField
          label={m.eventNumber}
          inputMode="numeric"
          autoComplete="off"
          placeholder="—"
          value={draft.eventNumber}
          error={errors.eventNumber}
          onChange={(value) => onChange({ eventNumber: value })}
        />
        <TextField
          label={m.heatLabel}
          inputMode="numeric"
          autoComplete="off"
          placeholder="—"
          value={draft.heat}
          error={errors.heat}
          onChange={(value) => onChange({ heat: value })}
        />
        <TextField
          label={m.laneLabel}
          inputMode="numeric"
          autoComplete="off"
          placeholder="—"
          value={draft.lane}
          error={errors.lane}
          onChange={(value) => onChange({ lane: value })}
        />
      </div>
      <TextField
        label={m.seedTime}
        inputMode="decimal"
        autoComplete="off"
        placeholder={m.seedTimePlaceholder}
        hint={seedHint}
        value={draft.seed}
        error={errors.seed}
        onChange={(value) => onChange({ seed: value })}
      />
      <TextField
        label={m.notes}
        autoComplete="off"
        placeholder={m.optional}
        value={draft.notes}
        onChange={(value) => onChange({ notes: value })}
      />
    </>
  )
}

/** Delete entry: a confirmation in the system's Modal. */
export function DeleteEntryModal({ entry, lookups, onClose }: { entry: Entry; lookups: Lookups; onClose: () => void }) {
  const { m, fill, pick } = useI18n()
  const toast = useToast()
  const event = useEventLabel(lookups)(entry.event_id)
  const remove = useSave(deleteEntry, () => {
    toast(fill(m.entryDeleted, { event }))
    onClose()
  })
  const submit = () => {
    if (!remove.isPending) remove.mutate(entry.id)
  }

  return (
    <Modal
      title={fill(m.deleteEntryConfirm, { event })}
      onClose={() => (remove.isPending ? undefined : onClose())}
      actions={
        <>
          <SaveFailed error={remove.error} onRetry={submit} saving={remove.isPending} />
          <SaveButton saving={remove.isPending} savingLabel={m.deleting} icon={Trash2} onClick={submit}>
            {m.deleteEntry}
          </SaveButton>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={onClose}
            className={buttonClass('secondary', 'lg', true)}
          >
            {m.cancel}
          </button>
        </>
      }
    >
      {fill(m.deleteEntryBody, { meet: pick(entry.meet.name, entry.meet.name_zh) })}
    </Modal>
  )
}
