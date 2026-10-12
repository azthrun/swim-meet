import { Check, RotateCw, UserMinus, UserPlus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Alert, Modal, SaveButton, SaveFailed } from '../components/feedback'
import { FormSection, TextField } from '../components/forms'
import { useToast } from '../components/ToastContext'
import { Bar, buttonClass } from '../components/ui'
import { shareSwimmer, unshareSwimmer, useSave } from '../data/mutations'
import { useSwimmerEditors, type Swimmer } from '../data/queries'
import { useI18n } from '../i18n/I18nContext'
import type { FieldError } from '../lib/forms'
import { canRemoveEditor, canShareSwimmer } from '../lib/permissions'
import { editorRows, shareEmail, validateShareEmail, type EditorRow, type ShareOutcome } from '../lib/sharing'

/** Remove an editor: a confirmation in the system's Modal. */
function RemoveEditorModal({
  swimmer,
  editor,
  name,
  onClose,
}: {
  swimmer: Swimmer
  editor: EditorRow
  name: string
  onClose: () => void
}) {
  const { m, fill, pick } = useI18n()
  const toast = useToast()
  const remove = useSave(unshareSwimmer, () => {
    toast(fill(m.editorRemoved, { name }))
    onClose()
  })
  const submit = () => {
    if (!remove.isPending) remove.mutate({ swimmerId: swimmer.id, userId: editor.userId })
  }

  return (
    <Modal
      title={fill(m.removeEditorConfirm, { name })}
      onClose={() => (remove.isPending ? undefined : onClose())}
      actions={
        <>
          <SaveFailed error={remove.error} onRetry={submit} saving={remove.isPending} />
          <SaveButton saving={remove.isPending} savingLabel={m.removing} icon={UserMinus} onClick={submit}>
            {m.remove}
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
      {fill(m.removeEditorBody, { name, swimmer: pick(swimmer.display_name, swimmer.display_name_zh) })}
    </Modal>
  )
}

/**
 * Who can edit this swimmer, share by email, and remove an editor. For the owner and an admin.
 * People are listed by display name only. The one email ever on screen is the one just typed
 * here: none is read from the database, and there is no way to look accounts up.
 */
export function SwimmerSharing({ swimmer }: { swimmer: Swimmer }) {
  const { m, fill } = useI18n()
  const { userId, access } = useAuth()
  const toast = useToast()
  const allowed = canShareSwimmer(access, swimmer.id)
  const editors = useSwimmerEditors(allowed ? userId : undefined, swimmer.id)

  const [email, setEmail] = useState('')
  // The field as it stands when an answer comes back: it may have been retyped while sharing.
  const typed = useRef('')
  const type = (value: string) => {
    typed.current = value
    setEmail(value)
  }
  const [error, setError] = useState<FieldError | null>(null)
  // What the last share did, said next to the field until the next one is typed.
  const [done, setDone] = useState<{ outcome: Exclude<ShareOutcome, 'noAccount'>; email: string } | null>(null)
  const [removing, setRemoving] = useState<EditorRow | null>(null)

  const share = useSave(shareSwimmer, (sent, outcome) => {
    const unchanged = shareEmail(typed.current) === sent.email
    if (outcome === 'noAccount') {
      if (unchanged) setError('noAccount')
      return
    }
    setDone({ outcome, email: sent.email })
    if (unchanged) type('')
    if (outcome === 'shared') toast(fill(m.sharedWith, { email: sent.email }))
  })

  if (!allowed) return null

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (share.isPending) return
    const found = validateShareEmail(email)
    setError(found)
    setDone(null)
    if (found) return
    share.mutate({ swimmerId: swimmer.id, email: shareEmail(email) })
  }

  const nameOf = (row: EditorRow) => {
    const name = row.name ?? m.unnamedAccount
    return row.isYou ? fill(m.nameYou, { name }) : name
  }

  return (
    <FormSection title={m.whoCanEdit}>
      {editors.isError ? (
        <Alert
          title={m.editorsLoadFailed}
          action={
            <button
              type="button"
              onClick={() => void editors.refetch()}
              className={`min-h-11 flex-none ${buttonClass('primary')}`}
            >
              <RotateCw size={18} aria-hidden="true" />
              {m.tryAgain}
            </button>
          }
        />
      ) : !editors.data ? (
        <div aria-busy="true" className="flex min-h-14 flex-col justify-center gap-xs">
          <span role="status" className="sr-only">
            {m.loading}
          </span>
          <Bar className="h-4 w-2/5 bg-hairline" />
        </div>
      ) : (
        <ul className="flex flex-col">
          {editorRows(editors.data, userId).map((row) => (
            <li key={row.userId} className="flex min-h-14 items-center gap-sm border-b border-hairline py-xxs">
              <span className="min-w-0 flex-1 type-body-sm break-words">{nameOf(row)}</span>
              {row.isOwner ? (
                <span className="flex-none type-caption text-muted">{m.owner}</span>
              ) : canRemoveEditor(access, swimmer.id, row) ? (
                <button
                  type="button"
                  onClick={() => setRemoving(row)}
                  aria-label={fill(m.removeEditorNamed, { name: nameOf(row) })}
                  className={`min-h-11 flex-none ${buttonClass('secondary')}`}
                >
                  {m.remove}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="type-body-sm text-secondary">{m.sharingGrants}</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-md">
        <TextField
          label={m.shareByEmail}
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          value={email}
          error={error ?? undefined}
          onChange={(value) => {
            type(value)
            setError(null)
            setDone(null)
          }}
        />
        {done ? (
          <p role="status" className="flex items-start gap-xs type-body-sm break-words text-ink">
            <Check size={16} aria-hidden="true" className="mt-[2px] flex-none text-accent-green" />
            <span className="min-w-0">
              {fill(done.outcome === 'shared' ? m.sharedWith : m.alreadyShared, { email: done.email })}
            </span>
          </p>
        ) : null}
        <SaveFailed error={share.error} onRetry={submit} saving={share.isPending} />
        <SaveButton saving={share.isPending} savingLabel={m.sharing} icon={UserPlus} variant="secondary">
          {m.share}
        </SaveButton>
      </form>

      {removing ? (
        <RemoveEditorModal
          swimmer={swimmer}
          editor={removing}
          name={removing.name ?? m.unnamedAccount}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </FormSection>
  )
}
