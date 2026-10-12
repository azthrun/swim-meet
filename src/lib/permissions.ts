// Which edit controls a signed-in account may use. Mirrors the row level security policies,
// and is derived from data so no control has to be discovered by a failed write.

/** What the database says about one account, as fetched after sign-in. */
export type AccessFacts = {
  userId: string
  /** `profiles.is_admin` of this account. */
  isAdmin: boolean
  /** Every swimmer's owner. */
  swimmers: readonly { id: string; owner_id: string }[]
  /** `swimmer_editors` rows visible to this account. */
  editors: readonly { swimmer_id: string; user_id: string }[]
  /** Meets this account created. */
  createdMeetIds: readonly string[]
}

export type Access = {
  userId: string
  isAdmin: boolean
  /** Swimmers this account is the owner of. */
  owned: ReadonlySet<string>
  /** Swimmers an owner shared with this account. */
  shared: ReadonlySet<string>
  createdMeets: ReadonlySet<string>
}

/** A signed-out visitor has no access at all, written as null. */
export function deriveAccess(facts: AccessFacts | null): Access | null {
  if (!facts) return null
  return {
    userId: facts.userId,
    isAdmin: facts.isAdmin,
    owned: new Set(facts.swimmers.filter((s) => s.owner_id === facts.userId).map((s) => s.id)),
    shared: new Set(facts.editors.filter((e) => e.user_id === facts.userId).map((e) => e.swimmer_id)),
    createdMeets: new Set(facts.createdMeetIds),
  }
}

/** Any signed-in account may create a swimmer and becomes its owner. */
export function canAddSwimmer(access: Access | null): boolean {
  return access !== null
}

/** Name, slug, private fields and deletion: the owner or an admin. Shared editors may not. */
export function canManageSwimmer(access: Access | null, swimmerId: string): boolean {
  return access !== null && (access.isAdmin || access.owned.has(swimmerId))
}

/** Entries and results: any editor of the swimmer. */
export function canEditEntries(access: Access | null, swimmerId: string): boolean {
  return access !== null && (access.isAdmin || access.owned.has(swimmerId) || access.shared.has(swimmerId))
}

/** The swimmers out of `swimmerIds` whose entries this account may edit. */
export function editableSwimmers<T extends { id: string }>(access: Access | null, swimmers: readonly T[]): T[] {
  return swimmers.filter((swimmer) => canEditEntries(access, swimmer.id))
}

export function canAddMeet(access: Access | null): boolean {
  return access !== null
}

export function canEditMeet(access: Access | null, meetId: string): boolean {
  return access !== null && (access.isAdmin || access.createdMeets.has(meetId))
}

export function canDeleteMeet(access: Access | null): boolean {
  return access !== null && access.isAdmin
}
