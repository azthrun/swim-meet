import { Check, Lock, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { EditorGate } from '../components/EditorGate'
import { SaveButton, SaveFailed } from '../components/feedback'
import { ActionBar, FormHeader, FormSection, SelectField, TextField, useGoBack } from '../components/forms'
import { CONTAINER } from '../components/Layout'
import { LoadFailed } from '../components/swim'
import { useToast } from '../components/ToastContext'
import { ListSkeleton } from '../components/ui'
import { deleteSwimmer, newId, saveSwimmer, useSave } from '../data/mutations'
import {
  useGenders,
  useSwimmerPrivate,
  useSwimmers,
  type Gender,
  type Swimmer,
  type SwimmerPrivate,
} from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { todayIso } from '../lib/dates'
import {
  EMPTY_SWIMMER_FORM,
  hasErrors,
  slugify,
  swimmerPrivateValues,
  swimmerValues,
  validateSwimmer,
  type FieldErrors,
  type SwimmerForm,
} from '../lib/forms'
import { canManageSwimmer } from '../lib/permissions'
import { NotFoundState } from './NotFound'

function DeleteSwimmer({ swimmer }: { swimmer: Swimmer }) {
  const { m, fill } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const name = swimmer.display_name
  const remove = useSave(deleteSwimmer, () => {
    toast(fill(m.swimmerDeleted, { name }))
    navigate('/', { replace: true })
  })
  const [typed, setTyped] = useState('')

  const confirmed = typed.trim() === name
  const submit = () => {
    if (!confirmed || remove.isPending) return
    remove.mutate(swimmer.id)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <FormSection title={m.deleteSwimmer}>
        <p className="type-body-sm text-secondary">{fill(m.deleteSwimmerBody, { name })}</p>
        <TextField
          label={fill(m.typeToConfirm, { name })}
          placeholder={name}
          autoComplete="off"
          autoCapitalize="none"
          value={typed}
          onChange={setTyped}
        />
        <SaveFailed error={remove.error} onRetry={submit} saving={remove.isPending} />
        <SaveButton saving={remove.isPending} savingLabel={m.deleting} icon={Trash2} variant="secondary" disabled={!confirmed}>
          {m.deleteSwimmer}
        </SaveButton>
      </FormSection>
    </form>
  )
}

/** Swimmer settings, and Add swimmer: the same form without the delete section. */
function SwimmerEditor({
  swimmer,
  privateRow,
  genders,
}: {
  /** Left out when adding a swimmer. */
  swimmer?: Swimmer
  privateRow: SwimmerPrivate | null
  genders: Gender[]
}) {
  const { m, fill, name, pick } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSave(saveSwimmer, ({ values }) => {
    toast(fill(swimmer ? m.swimmerSaved : m.swimmerAdded, { name: values.display_name }))
    navigate(`/swimmers/${values.slug}`, { replace: true })
  })
  const goBack = useGoBack(swimmer ? `/swimmers/${swimmer.slug}` : '/')

  const [id] = useState(() => swimmer?.id ?? newId())
  const [form, setForm] = useState<SwimmerForm>(() =>
    swimmer
      ? {
          name: swimmer.display_name,
          nameZh: swimmer.display_name_zh ?? '',
          slug: swimmer.slug,
          dateOfBirth: privateRow?.date_of_birth ?? '',
          genderCode: privateRow?.gender_code ?? '',
        }
      : EMPTY_SWIMMER_FORM,
  )
  // A new swimmer's slug follows the name until the editor types one.
  const [slugTyped, setSlugTyped] = useState(Boolean(swimmer))
  const [errors, setErrors] = useState<FieldErrors<SwimmerForm>>({})

  const set = (patch: Partial<SwimmerForm>) => setForm((current) => ({ ...current, ...patch }))

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (save.isPending) return
    const found = validateSwimmer(form, todayIso())
    setErrors(found)
    if (hasErrors(found)) return
    const values = swimmerValues(form)
    const privateValues = swimmerPrivateValues(form)
    // A private row is written once there is something in it, and from then on kept current.
    const writePrivate = privateRow !== null || privateValues.date_of_birth !== null || privateValues.gender_code !== null
    save.mutate({ id, isNew: !swimmer, values, privateValues: writePrivate ? privateValues : undefined })
  }

  return (
    <>
      <FormHeader
        title={swimmer ? m.swimmerSettings : m.addSwimmer}
        leave={swimmer ? 'back' : 'cancel'}
        leaveLabel={
          swimmer ? fill(m.backTo, { name: pick(swimmer.display_name, swimmer.display_name_zh) }) : undefined
        }
        onLeave={goBack}
      />
      <main className={`flex flex-1 flex-col gap-md p-md ${CONTAINER}`}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-md">
          <FormSection title={m.profile}>
            <TextField
              label={m.name}
              hint={m.swimmerNameHint}
              autoComplete="off"
              value={form.name}
              error={errors.name}
              onChange={(value) => set(slugTyped ? { name: value } : { name: value, slug: slugify(value) })}
            />
            <TextField
              label={m.chineseNameOptional}
              lang="zh-Hans"
              autoComplete="off"
              value={form.nameZh}
              onChange={(value) => set({ nameZh: value })}
            />
            <TextField
              label={m.urlSlug}
              hint={m.urlSlugHint}
              autoComplete="off"
              autoCapitalize="none"
              value={form.slug}
              error={errors.slug}
              onChange={(value) => {
                setSlugTyped(true)
                set({ slug: value })
              }}
            />
          </FormSection>

          <FormSection
            title={m.private}
            featured
            icon={<Lock size={20} aria-hidden="true" className="flex-none text-secondary" />}
          >
            <p className="type-body-sm text-secondary">{m.privateBody}</p>
            <TextField
              label={m.dateOfBirth}
              type="date"
              max={todayIso()}
              autoComplete="off"
              value={form.dateOfBirth}
              error={errors.dateOfBirth}
              onChange={(value) => set({ dateOfBirth: value })}
            />
            <SelectField
              label={m.gender}
              placeholder={m.choose}
              value={form.genderCode}
              onChange={(value) => set({ genderCode: value })}
              options={genders.map((gender) => ({ value: gender.code, label: name(gender) }))}
            />
          </FormSection>
          {/* Lets Enter in a field save, as the button sits outside the form. */}
          <button type="submit" hidden />
        </form>

        {swimmer ? <DeleteSwimmer swimmer={swimmer} /> : null}
      </main>
      <ActionBar>
        <SaveFailed error={save.error} onRetry={submit} saving={save.isPending} />
        {hasErrors(errors) ? <p className="text-center type-caption text-accent-orange">{m.fixFields}</p> : null}
        <SaveButton saving={save.isPending} icon={swimmer ? Check : Plus} onClick={submit}>
          {swimmer ? m.saveChanges : m.addSwimmer}
        </SaveButton>
      </ActionBar>
    </>
  )
}

function Loading() {
  const { m } = useI18n()
  return (
    <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>
      <ListSkeleton message={m.loading} />
    </main>
  )
}

function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>
      <LoadFailed onRetry={onRetry} />
    </main>
  )
}

function AddSwimmerForm() {
  const genders = useGenders(true)
  if (genders.isError) return <Failed onRetry={() => void genders.refetch()} />
  if (!genders.data) return <Loading />
  return <SwimmerEditor privateRow={null} genders={genders.data} />
}

export function AddSwimmer() {
  return (
    <EditorGate>
      <AddSwimmerForm />
    </EditorGate>
  )
}

function SwimmerSettingsForm({ swimmer }: { swimmer: Swimmer }) {
  const { userId } = useAuth()
  const genders = useGenders(true)
  const privateRow = useSwimmerPrivate(userId, swimmer.id)
  if (genders.isError || privateRow.isError) {
    return (
      <Failed
        onRetry={() => {
          for (const query of [genders, privateRow]) if (query.isError) void query.refetch()
        }}
      />
    )
  }
  if (!genders.data || privateRow.data === undefined) return <Loading />
  // Keyed by id so the form is not rebuilt, and nothing typed is lost, when the list refreshes.
  return <SwimmerEditor key={swimmer.id} swimmer={swimmer} privateRow={privateRow.data} genders={genders.data} />
}

/** Owner or admin only: name, slug, the private fields, and deleting the swimmer. */
export function SwimmerSettings() {
  const { slug } = useParams()
  const { m } = useI18n()
  const swimmers = useSwimmers()
  // Once found, the swimmer is followed by id: saving a new slug, or deleting, changes the list
  // under this screen a moment before it navigates away.
  const [seenId, setSeenId] = useState<string>()
  const bySlug = swimmers.data?.find((s) => s.slug === slug)
  if (bySlug && bySlug.id !== seenId) setSeenId(bySlug.id)
  const swimmer = bySlug ?? swimmers.data?.find((s) => s.id === seenId)

  if (swimmers.isError) return <Failed onRetry={() => void swimmers.refetch()} />
  if (!swimmers.data || (!swimmer && seenId)) return <Loading />
  if (!swimmer) {
    return (
      <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>
        <NotFoundState title={m.swimmerNotFoundTitle} body={m.swimmerNotFoundBody} />
      </main>
    )
  }
  return (
    <EditorGate allowed={(access) => canManageSwimmer(access, swimmer.id)}>
      <SwimmerSettingsForm swimmer={swimmer} />
    </EditorGate>
  )
}
