// Sharing a swimmer: who is on the list of people who can edit, and what a share attempt did.
// The database never hands out an email address or a list of accounts, so everything here
// works from account ids and display names.

import type { FieldError } from './forms'

/** What the database says about who can edit one swimmer. Readable by its owner and an admin. */
export type SwimmerEditors = {
  ownerId: string
  /** `swimmer_editors.user_id` of this swimmer. */
  editorIds: readonly string[]
  /** `profiles.display_name` by account id, for the accounts above. */
  names: Readonly<Record<string, string>>
}

export type EditorRow = {
  userId: string
  /** Null when the account has no profile row to read a name from. */
  name: string | null
  isOwner: boolean
  /** The signed-in account itself. */
  isYou: boolean
}

/** The owner first, then each shared editor by display name. */
export function editorRows(editors: SwimmerEditors, userId: string | undefined): EditorRow[] {
  const row = (id: string, isOwner: boolean): EditorRow => ({
    userId: id,
    name: editors.names[id]?.trim() || null,
    isOwner,
    isYou: id === userId,
  })
  // The owner can edit without being shared with, so a share row for them adds nobody.
  const shared = [...new Set(editors.editorIds)]
    .filter((id) => id !== editors.ownerId)
    .map((id) => row(id, false))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.userId.localeCompare(b.userId))
  return [row(editors.ownerId, true), ...shared]
}

export type ShareOutcome =
  /** A person was added to the list. */
  | 'shared'
  /** The account exists and could already edit: nothing changed, and that is not an error. */
  | 'alreadyShared'
  /** No account has that email: nothing changed. */
  | 'noAccount'

/**
 * Reads what `share_swimmer` did. It answers only "an account has that email", so whether
 * anyone was added is told from the editor list before and after.
 */
export function shareOutcome(
  found: boolean,
  before: Pick<SwimmerEditors, 'ownerId' | 'editorIds'>,
  after: Pick<SwimmerEditors, 'editorIds'>,
): ShareOutcome {
  if (!found) return 'noAccount'
  const had = new Set([before.ownerId, ...before.editorIds])
  return after.editorIds.some((id) => !had.has(id)) ? 'shared' : 'alreadyShared'
}

/** The email as it is sent: trimmed. The database compares it without regard to case. */
export function shareEmail(typed: string): string {
  return typed.trim()
}

/** Catches an empty field or an obvious typo before asking the database. */
export function validateShareEmail(typed: string): FieldError | null {
  const email = shareEmail(typed)
  if (email === '') return 'required'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'emailFormat'
}
