import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { EditorGate } from '../components/EditorGate'
import { SaveButton, SaveFailed } from '../components/feedback'
import { ActionBar, FormHeader, FormSection, TextField, useGoBack } from '../components/forms'
import { CONTAINER } from '../components/Layout'
import { LoadFailed } from '../components/swim'
import { useToast } from '../components/ToastContext'
import { ListSkeleton } from '../components/ui'
import { saveDisplayName, useSave } from '../data/mutations'
import { useOwnDisplayName } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import { displayNameValue, validateDisplayName, type FieldError } from '../lib/forms'

function EditProfileForm({ userId, displayName }: { userId: string; displayName: string }) {
  const { m, fill } = useI18n()
  const toast = useToast()
  const goBack = useGoBack('/')
  const save = useSave(saveDisplayName, (saved) => {
    toast(fill(m.profileSaved, { name: saved.displayName }))
    goBack()
  })
  const [typed, setTyped] = useState(displayName)
  const [error, setError] = useState<FieldError | null>(null)

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (save.isPending) return
    const found = validateDisplayName(typed)
    setError(found)
    if (found) return
    save.mutate({ userId, displayName: displayNameValue(typed) })
  }

  return (
    <>
      <FormHeader title={m.editProfile} onLeave={goBack} />
      <main className={`flex flex-1 flex-col gap-md p-md ${CONTAINER}`}>
        <form onSubmit={submit} noValidate>
          <FormSection title={m.profile}>
            <TextField
              label={m.displayName}
              hint={m.displayNameHint}
              autoComplete="nickname"
              value={typed}
              error={error ?? undefined}
              onChange={(value) => {
                setTyped(value)
                setError(null)
              }}
            />
          </FormSection>
          {/* Lets Enter in the field save, as the button sits outside the form. */}
          <button type="submit" hidden />
        </form>
      </main>
      <ActionBar>
        <SaveFailed error={save.error} onRetry={submit} saving={save.isPending} />
        {error ? <p className="text-center type-caption text-accent-orange">{m.fixFields}</p> : null}
        <SaveButton saving={save.isPending} icon={Check} onClick={submit}>
          {m.saveChanges}
        </SaveButton>
      </ActionBar>
    </>
  )
}

function EditProfileLoader() {
  const { m } = useI18n()
  const { userId } = useAuth()
  const displayName = useOwnDisplayName(userId)
  // Opened once, the form keeps what is being typed while the name refreshes behind it.
  const [initial, setInitial] = useState<string>()
  if (initial === undefined && displayName.data !== undefined) setInitial(displayName.data ?? '')

  if (userId && initial !== undefined) return <EditProfileForm userId={userId} displayName={initial} />
  return (
    <main className={`flex flex-1 flex-col px-md py-lg ${CONTAINER}`}>
      {displayName.isError ? (
        <LoadFailed onRetry={() => void displayName.refetch()} />
      ) : (
        <ListSkeleton message={m.loading} />
      )}
    </main>
  )
}

/** Edit profile: the signed-in account's own display name, and nothing else. */
export function EditProfile() {
  return (
    <EditorGate>
      <EditProfileLoader />
    </EditorGate>
  )
}
