import { Check, Lock, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { EditorGate } from '../components/EditorGate'
import { Modal, SaveButton, SaveFailed } from '../components/feedback'
import { ActionBar, FormHeader, FormSection, TextAreaField, TextField, useGoBack } from '../components/forms'
import { CONTAINER } from '../components/Layout'
import { CourseBadge, LoadFailed } from '../components/swim'
import { useToast } from '../components/ToastContext'
import { buttonClass, ListSkeleton } from '../components/ui'
import { deleteMeet, newId, saveMeet, useSave } from '../data/mutations'
import { useLookups, useMeet, type Lookups, type Meet } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import {
  EMPTY_MEET_FORM,
  hasErrors,
  meetValues,
  validateMeet,
  type FieldErrors,
  type MeetForm as MeetFormState,
} from '../lib/forms'
import { canDeleteMeet, canEditMeet } from '../lib/permissions'
import { NotFoundState } from './NotFound'

function DeleteMeet({ meet, entryCount, onDeleted }: { meet: Meet; entryCount: number; onDeleted: () => void }) {
  const { m, fill, plural, pick } = useI18n()
  const toast = useToast()
  const name = pick(meet.name, meet.name_zh)
  const remove = useSave(deleteMeet, () => {
    toast(fill(m.meetDeleted, { name }))
    onDeleted()
  })
  const [asking, setAsking] = useState(false)
  const submit = () => {
    if (!remove.isPending) remove.mutate(meet.id)
  }

  return (
    <FormSection title={m.deleteMeet}>
      <p className="type-body-sm text-secondary">
        {entryCount > 0
          ? fill(m.deleteMeetBlocked, { entries: plural(m.entryCount, entryCount) })
          : m.deleteMeetBody}
      </p>
      <button
        type="button"
        disabled={entryCount > 0}
        onClick={() => setAsking(true)}
        className={buttonClass('secondary', 'lg', true)}
      >
        <Trash2 size={18} aria-hidden="true" />
        {m.deleteMeet}
      </button>
      {asking ? (
        <Modal
          title={fill(m.deleteMeetConfirm, { name })}
          onClose={() => (remove.isPending ? undefined : setAsking(false))}
          actions={
            <>
              <SaveFailed error={remove.error} onRetry={submit} saving={remove.isPending} />
              <SaveButton saving={remove.isPending} savingLabel={m.deleting} icon={Trash2} onClick={submit}>
                {m.deleteMeet}
              </SaveButton>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => setAsking(false)}
                className={buttonClass('secondary', 'lg', true)}
              >
                {m.cancel}
              </button>
            </>
          }
        >
          {m.cannotBeUndone}
        </Modal>
      ) : null}
    </FormSection>
  )
}

/**
 * The meet form, for a new meet or an existing one. Used as its own screen to edit a meet,
 * and inside Add entries to create one without leaving.
 */
export function MeetFormBody({
  meet,
  entryCount = 0,
  lookups,
  onCancel,
  onSaved,
  onDeleted,
}: {
  /** Left out for a new meet. */
  meet?: Meet
  /** Entries the meet already has: more than none locks the course. */
  entryCount?: number
  lookups: Lookups
  onCancel: () => void
  onSaved: (meetId: string) => void
  /** Given when this account may delete the meet. */
  onDeleted?: () => void
}) {
  const { m, fill, plural, name } = useI18n()
  const toast = useToast()
  const [id] = useState(() => meet?.id ?? newId())
  const save = useSave(saveMeet, ({ values }) => {
    toast(fill(meet ? m.meetSaved : m.meetCreated, { name: values.name }))
    onSaved(id)
  })

  const [form, setForm] = useState<MeetFormState>(() =>
    meet
      ? {
          name: meet.name,
          nameZh: meet.name_zh ?? '',
          courseCode: meet.course_code,
          startDate: meet.start_date,
          endDate: meet.end_date,
          location: meet.location ?? '',
          resultsUrl: meet.results_url ?? '',
          notes: meet.notes ?? '',
        }
      : EMPTY_MEET_FORM,
  )
  const [errors, setErrors] = useState<FieldErrors<MeetFormState>>({})
  const set = (patch: Partial<MeetFormState>) => setForm((current) => ({ ...current, ...patch }))

  const courseLocked = Boolean(meet) && entryCount > 0

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (save.isPending) return
    const found = validateMeet(form)
    setErrors(found)
    if (hasErrors(found)) return
    save.mutate({ id, isNew: !meet, values: meetValues(form) })
  }

  return (
    <>
      <FormHeader title={meet ? m.editMeet : m.newMeet} onLeave={onCancel} />
      <main className={`flex flex-1 flex-col gap-md px-md py-lg ${CONTAINER}`}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-md">
          <TextField
            label={m.name}
            placeholder={meet ? undefined : m.meetNamePlaceholder}
            autoComplete="off"
            value={form.name}
            error={errors.name}
            onChange={(value) => set({ name: value })}
          />
          <TextField
            label={m.chineseNameOptional}
            lang="zh-Hans"
            autoComplete="off"
            value={form.nameZh}
            onChange={(value) => set({ nameZh: value })}
          />

          {courseLocked ? (
            <div className="flex flex-col gap-[6px]">
              <span className="type-caption text-secondary">{m.course}</span>
              <div className="flex min-h-11 items-center gap-sm rounded-xs border border-hairline bg-canvas px-sm">
                <CourseBadge code={form.courseCode} lookups={lookups} />
                <span className="flex-1 type-body-sm">{name(lookups.course.get(form.courseCode))}</span>
                <Lock size={16} aria-hidden="true" className="flex-none text-muted" />
              </div>
              <span className="type-caption text-muted">
                {fill(m.courseLocked, { entries: plural(m.entryCount, entryCount) })}
              </span>
            </div>
          ) : (
            <fieldset className="flex min-w-0 flex-col gap-[6px] border-0 p-0">
              <legend className="pb-[6px] type-caption text-secondary">{m.course}</legend>
              <div className="grid grid-cols-3 gap-xxs rounded-md bg-hairline p-xxs">
                {lookups.courses.map((course) => (
                  <label
                    key={course.code}
                    className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-sm px-xxs text-center text-secondary has-checked:bg-card has-checked:text-ink has-checked:shadow-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
                  >
                    <input
                      type="radio"
                      name="course"
                      value={course.code}
                      checked={form.courseCode === course.code}
                      onChange={() => set({ courseCode: course.code })}
                      className="sr-only"
                    />
                    <span className="type-button">{course.code}</span>
                    <span className="type-eyebrow text-muted">{name(course)}</span>
                  </label>
                ))}
              </div>
              {errors.courseCode ? (
                <span className="type-caption text-accent-orange">{m.fieldErrors[errors.courseCode]}</span>
              ) : null}
            </fieldset>
          )}

          <div className="grid grid-cols-2 items-start gap-sm">
            <TextField
              label={m.startDate}
              type="date"
              value={form.startDate}
              error={errors.startDate}
              onChange={(value) => set({ startDate: value })}
            />
            <TextField
              label={m.endDate}
              type="date"
              min={form.startDate || undefined}
              hint={m.endDateHint}
              value={form.endDate}
              error={errors.endDate}
              onChange={(value) => set({ endDate: value })}
            />
          </div>
          <TextField
            label={m.locationOptional}
            placeholder={meet ? undefined : m.locationPlaceholder}
            autoComplete="off"
            value={form.location}
            onChange={(value) => set({ location: value })}
          />
          <TextField
            label={m.liveResultsLinkOptional}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoComplete="off"
            placeholder="https://"
            value={form.resultsUrl}
            error={errors.resultsUrl}
            onChange={(value) => set({ resultsUrl: value })}
          />
          <TextAreaField label={m.notesOptional} value={form.notes} onChange={(value) => set({ notes: value })} />
          {/* Lets Enter in a field save, as the button sits outside the form. */}
          <button type="submit" hidden />
        </form>

        {meet && onDeleted ? <DeleteMeet meet={meet} entryCount={entryCount} onDeleted={onDeleted} /> : null}
      </main>
      <ActionBar>
        <SaveFailed error={save.error} onRetry={submit} saving={save.isPending} />
        {hasErrors(errors) ? <p className="text-center type-caption text-accent-orange">{m.fixFields}</p> : null}
        <SaveButton saving={save.isPending} icon={meet ? Check : Plus} onClick={submit}>
          {meet ? m.saveMeet : m.createMeet}
        </SaveButton>
      </ActionBar>
    </>
  )
}

function EditMeetForm({ meetId }: { meetId: string }) {
  const { m } = useI18n()
  const { access } = useAuth()
  const navigate = useNavigate()
  const lookups = useLookups()
  const meet = useMeet(meetId)
  const goBack = useGoBack(`/meets/${meetId}`)
  // A deleted meet is gone from the data a moment before this screen navigates away.
  const [seen, setSeen] = useState(false)
  if (meet.data && !seen) setSeen(true)

  const wrap = (body: ReactNode) => (
    <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>{body}</main>
  )

  if (meet.isError || lookups.isError) {
    return wrap(
      <LoadFailed
        title={m.meetLoadFailedTitle}
        onRetry={() => {
          for (const query of [meet, lookups]) if (query.isError) void query.refetch()
        }}
      />,
    )
  }
  if (meet.data === null && !seen) {
    return wrap(<NotFoundState title={m.meetNotFoundTitle} body={m.meetNotFoundBody} />)
  }
  if (!meet.data || !lookups.data) return wrap(<ListSkeleton message={m.loadingMeet} />)

  return (
    <EditorGate allowed={(a) => canEditMeet(a, meetId)}>
      <MeetFormBody
        key={meetId}
        meet={meet.data.meet}
        entryCount={meet.data.entries.length}
        lookups={lookups.data}
        onCancel={goBack}
        onSaved={goBack}
        onDeleted={canDeleteMeet(access) ? () => navigate('/', { replace: true }) : undefined}
      />
    </EditorGate>
  )
}

export function EditMeet() {
  const { meetId = '' } = useParams()
  return <EditMeetForm key={meetId} meetId={meetId} />
}
