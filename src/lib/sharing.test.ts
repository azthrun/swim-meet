import { describe, expect, it } from 'vitest'
import { editorRows, shareEmail, shareOutcome, validateShareEmail, type SwimmerEditors } from './sharing'

const OWNER = 'user-owner'
const ANA = 'user-ana'
const BO = 'user-bo'

const editors = (over: Partial<SwimmerEditors> = {}): SwimmerEditors => ({
  ownerId: OWNER,
  editorIds: [BO, ANA],
  names: { [OWNER]: 'Terry', [ANA]: 'Ana', [BO]: 'Bo' },
  ...over,
})

describe('editorRows', () => {
  it('lists the owner first, marked as owner, then shared editors by display name', () => {
    expect(editorRows(editors(), OWNER)).toEqual([
      { userId: OWNER, name: 'Terry', isOwner: true, isYou: true },
      { userId: ANA, name: 'Ana', isOwner: false, isYou: false },
      { userId: BO, name: 'Bo', isOwner: false, isYou: false },
    ])
  })

  it('marks the signed-in account wherever it is on the list', () => {
    const rows = editorRows(editors(), 'user-admin')
    expect(rows.some((row) => row.isYou)).toBe(false)
    expect(editorRows(editors(), ANA).find((row) => row.isYou)?.userId).toBe(ANA)
  })

  it('lists the owner once even when a share row names them', () => {
    const rows = editorRows(editors({ editorIds: [OWNER, ANA, ANA] }), OWNER)
    expect(rows.map((row) => row.userId)).toEqual([OWNER, ANA])
  })

  it('has no name for an account without a readable profile', () => {
    const rows = editorRows(editors({ names: { [OWNER]: 'Terry', [ANA]: '  ' } }), OWNER)
    expect(rows.map((row) => row.name)).toEqual(['Terry', null, null])
  })

  it('carries nothing but ids and display names', () => {
    for (const row of editorRows(editors(), OWNER)) {
      expect(Object.keys(row).sort()).toEqual(['isOwner', 'isYou', 'name', 'userId'])
    }
  })
})

describe('shareOutcome', () => {
  const before = { ownerId: OWNER, editorIds: [ANA] }

  it('is shared when someone new is on the list afterwards', () => {
    expect(shareOutcome(true, before, { editorIds: [ANA, BO] })).toBe('shared')
  })

  it('is no such account when the database found nobody, and nothing changed', () => {
    expect(shareOutcome(false, before, { editorIds: [ANA] })).toBe('noAccount')
  })

  it('is already shared, not an error, when the account was on the list', () => {
    expect(shareOutcome(true, before, { editorIds: [ANA] })).toBe('alreadyShared')
  })

  it('is already shared when the email is the owner’s own', () => {
    expect(shareOutcome(true, before, { editorIds: [ANA, OWNER] })).toBe('alreadyShared')
  })

  it('is shared for the first editor of a swimmer', () => {
    expect(shareOutcome(true, { ownerId: OWNER, editorIds: [] }, { editorIds: [BO] })).toBe('shared')
  })
})

describe('validateShareEmail', () => {
  it('requires something typed', () => {
    expect(validateShareEmail('')).toBe('required')
    expect(validateShareEmail('   ')).toBe('required')
  })

  it('catches what is plainly not an email address', () => {
    for (const typed of ['ana', 'ana@', '@example.com', 'ana@example', 'ana b@example.com', 'ana@@example.com']) {
      expect(validateShareEmail(typed)).toBe('emailFormat')
    }
  })

  it('accepts an address, with spaces around it trimmed before it is sent', () => {
    expect(validateShareEmail('  Ana@Example.com ')).toBeNull()
    expect(shareEmail('  Ana@Example.com ')).toBe('Ana@Example.com')
  })
})
