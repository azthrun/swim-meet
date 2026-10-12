import { describe, expect, it } from 'vitest'
import {
  canAddMeet,
  canAddSwimmer,
  canDeleteMeet,
  canEditEntries,
  canEditMeet,
  canManageSwimmer,
  canRemoveEditor,
  canShareSwimmer,
  deriveAccess,
  editableSwimmers,
  type AccessFacts,
} from './permissions'

const ME = 'user-me'
const OTHER = 'user-other'

const facts = (over: Partial<AccessFacts> = {}): AccessFacts => ({
  userId: ME,
  isAdmin: false,
  swimmers: [
    { id: 'mine', owner_id: ME },
    { id: 'shared', owner_id: OTHER },
    { id: 'theirs', owner_id: OTHER },
  ],
  editors: [{ swimmer_id: 'shared', user_id: ME }],
  createdMeetIds: ['my-meet'],
  ...over,
})

describe('signed out', () => {
  const access = deriveAccess(null)

  it('has no access', () => {
    expect(access).toBeNull()
  })

  it('may use no edit control', () => {
    expect(canAddSwimmer(access)).toBe(false)
    expect(canManageSwimmer(access, 'mine')).toBe(false)
    expect(canEditEntries(access, 'mine')).toBe(false)
    expect(canAddMeet(access)).toBe(false)
    expect(canEditMeet(access, 'my-meet')).toBe(false)
    expect(canDeleteMeet(access)).toBe(false)
    expect(editableSwimmers(access, [{ id: 'mine' }])).toEqual([])
  })
})

describe('owner', () => {
  const access = deriveAccess(facts())

  it('manages and edits entries of an owned swimmer', () => {
    expect(canManageSwimmer(access, 'mine')).toBe(true)
    expect(canEditEntries(access, 'mine')).toBe(true)
  })

  it('may not touch a swimmer owned by someone else and not shared', () => {
    expect(canManageSwimmer(access, 'theirs')).toBe(false)
    expect(canEditEntries(access, 'theirs')).toBe(false)
  })

  it('may add swimmers and meets', () => {
    expect(canAddSwimmer(access)).toBe(true)
    expect(canAddMeet(access)).toBe(true)
  })
})

describe('shared editor', () => {
  const access = deriveAccess(facts())

  it('edits entries but does not manage the swimmer', () => {
    expect(canEditEntries(access, 'shared')).toBe(true)
    expect(canManageSwimmer(access, 'shared')).toBe(false)
  })

  it('ignores editor rows that belong to other accounts', () => {
    const owner = deriveAccess(
      facts({ editors: [{ swimmer_id: 'theirs', user_id: OTHER }] }),
    )
    expect(canEditEntries(owner, 'theirs')).toBe(false)
  })

  it('lists only the swimmers it can edit', () => {
    const swimmers = [{ id: 'mine' }, { id: 'shared' }, { id: 'theirs' }]
    expect(editableSwimmers(access, swimmers).map((s) => s.id)).toEqual(['mine', 'shared'])
  })
})

describe('meets', () => {
  it('are edited by their creator and deleted by no one but an admin', () => {
    const access = deriveAccess(facts())
    expect(canEditMeet(access, 'my-meet')).toBe(true)
    expect(canEditMeet(access, 'other-meet')).toBe(false)
    expect(canDeleteMeet(access)).toBe(false)
  })
})

describe('admin', () => {
  const access = deriveAccess(facts({ isAdmin: true, editors: [], createdMeetIds: [] }))

  it('may use every control', () => {
    expect(canManageSwimmer(access, 'theirs')).toBe(true)
    expect(canEditEntries(access, 'theirs')).toBe(true)
    expect(canEditMeet(access, 'other-meet')).toBe(true)
    expect(canDeleteMeet(access)).toBe(true)
    expect(editableSwimmers(access, [{ id: 'theirs' }])).toHaveLength(1)
  })
})

describe('sharing', () => {
  const owner = { isOwner: true }
  const editor = { isOwner: false }

  it('is hidden from a signed-out visitor', () => {
    expect(canShareSwimmer(null, 'mine')).toBe(false)
    expect(canRemoveEditor(null, 'mine', editor)).toBe(false)
  })

  it('is for the owner of the swimmer', () => {
    const access = deriveAccess(facts())
    expect(canShareSwimmer(access, 'mine')).toBe(true)
    expect(canRemoveEditor(access, 'mine', editor)).toBe(true)
  })

  it('is never shown to a shared editor, who may not share further', () => {
    const access = deriveAccess(facts())
    expect(canEditEntries(access, 'shared')).toBe(true)
    expect(canShareSwimmer(access, 'shared')).toBe(false)
    expect(canRemoveEditor(access, 'shared', editor)).toBe(false)
  })

  it('is hidden for a swimmer the account has nothing to do with', () => {
    expect(canShareSwimmer(deriveAccess(facts()), 'theirs')).toBe(false)
  })

  it('is for an admin on every swimmer', () => {
    const access = deriveAccess(facts({ isAdmin: true }))
    expect(canShareSwimmer(access, 'theirs')).toBe(true)
    expect(canRemoveEditor(access, 'theirs', editor)).toBe(true)
  })

  it('never lets the owner be removed, not even by an admin', () => {
    expect(canRemoveEditor(deriveAccess(facts()), 'mine', owner)).toBe(false)
    expect(canRemoveEditor(deriveAccess(facts({ isAdmin: true })), 'theirs', owner)).toBe(false)
  })
})
