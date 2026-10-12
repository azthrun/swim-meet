import { describe, expect, it } from 'vitest'
import {
  EMPTY_MEET_FORM,
  EMPTY_SWIMMER_FORM,
  blankToNull,
  hasErrors,
  isIsoDate,
  meetValues,
  slugify,
  swimmerPrivateValues,
  swimmerValues,
  validateMeet,
  validateSwimmer,
  withoutErrors,
  type MeetForm,
  type SwimmerForm,
} from './forms'

const TODAY = '2026-10-11'

describe('isIsoDate', () => {
  it('accepts real days only', () => {
    expect(isIsoDate('2026-11-14')).toBe(true)
    expect(isIsoDate('2024-02-29')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('11/14/2026')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})

describe('slugify', () => {
  it('makes a slug the database accepts', () => {
    expect(slugify('Jayden')).toBe('jayden')
    expect(slugify('  Jayden C. ')).toBe('jayden-c')
    expect(slugify('José')).toBe('jose')
    expect(slugify('Mary-Ann  2')).toBe('mary-ann-2')
  })

  it('gives nothing for a name with no Latin letters', () => {
    expect(slugify('陈杰')).toBe('')
  })
})

describe('validateSwimmer', () => {
  const swimmer = (over: Partial<SwimmerForm> = {}): SwimmerForm => ({
    ...EMPTY_SWIMMER_FORM,
    name: 'Jayden',
    slug: 'jayden',
    ...over,
  })

  it('passes with only a name and a slug', () => {
    expect(validateSwimmer(swimmer(), TODAY)).toEqual({})
    expect(hasErrors(validateSwimmer(swimmer(), TODAY))).toBe(false)
  })

  it('requires a name and a slug', () => {
    expect(validateSwimmer(swimmer({ name: '  ', slug: '' }), TODAY)).toEqual({ name: 'required', slug: 'required' })
  })

  it('holds the slug to the database rule', () => {
    for (const slug of ['Jayden', 'jay den', 'jayden-', '-jayden', 'jay--den', 'jay_den', '陈']) {
      expect(validateSwimmer(swimmer({ slug }), TODAY).slug).toBe('slugFormat')
    }
    expect(validateSwimmer(swimmer({ slug: 'jayden-2' }), TODAY).slug).toBeUndefined()
  })

  it('keeps slugs off the routes under /swimmers/', () => {
    expect(validateSwimmer(swimmer({ slug: 'new' }), TODAY).slug).toBe('slugReserved')
  })

  it('checks a date of birth only when one is given', () => {
    expect(validateSwimmer(swimmer({ dateOfBirth: '2015-03-09' }), TODAY).dateOfBirth).toBeUndefined()
    expect(validateSwimmer(swimmer({ dateOfBirth: TODAY }), TODAY).dateOfBirth).toBeUndefined()
    expect(validateSwimmer(swimmer({ dateOfBirth: '2026-10-12' }), TODAY).dateOfBirth).toBe('dateInFuture')
    expect(validateSwimmer(swimmer({ dateOfBirth: '2015-02-30' }), TODAY).dateOfBirth).toBe('dateInvalid')
  })
})

describe('swimmer values', () => {
  it('trims, and stores blanks as null', () => {
    const form: SwimmerForm = { name: ' Jayden ', nameZh: ' ', slug: ' jayden ', dateOfBirth: '', genderCode: '' }
    expect(swimmerValues(form)).toEqual({ display_name: 'Jayden', display_name_zh: null, slug: 'jayden' })
    expect(swimmerPrivateValues(form)).toEqual({ date_of_birth: null, gender_code: null })
  })

  it('keeps the private fields apart from the public ones', () => {
    const form: SwimmerForm = { name: 'Jayden', nameZh: '杰', slug: 'jayden', dateOfBirth: '2015-03-09', genderCode: 'M' }
    expect(Object.keys(swimmerValues(form))).toEqual(['display_name', 'display_name_zh', 'slug'])
    expect(swimmerPrivateValues(form)).toEqual({ date_of_birth: '2015-03-09', gender_code: 'M' })
  })
})

describe('validateMeet', () => {
  const meet = (over: Partial<MeetForm> = {}): MeetForm => ({
    ...EMPTY_MEET_FORM,
    name: 'Shark Invitational',
    courseCode: 'SCY',
    startDate: '2026-11-14',
    ...over,
  })

  it('passes with a name, a course and a start date', () => {
    expect(validateMeet(meet())).toEqual({})
  })

  it('requires those three', () => {
    expect(validateMeet(EMPTY_MEET_FORM)).toEqual({ name: 'required', courseCode: 'required', startDate: 'required' })
  })

  it('wants the end on or after the start', () => {
    expect(validateMeet(meet({ endDate: '2026-11-14' })).endDate).toBeUndefined()
    expect(validateMeet(meet({ endDate: '2026-11-15' })).endDate).toBeUndefined()
    expect(validateMeet(meet({ endDate: '2026-11-13' })).endDate).toBe('endBeforeStart')
  })

  it('reports a bad start date once, not as a bad range too', () => {
    expect(validateMeet(meet({ startDate: 'soon', endDate: '2026-11-13' }))).toEqual({ startDate: 'dateInvalid' })
  })

  it('accepts only http and https live results links', () => {
    expect(validateMeet(meet({ resultsUrl: 'https://example.com/live' })).resultsUrl).toBeUndefined()
    expect(validateMeet(meet({ resultsUrl: ' http://example.com ' })).resultsUrl).toBeUndefined()
    expect(validateMeet(meet({ resultsUrl: 'example.com' })).resultsUrl).toBe('urlFormat')
    expect(validateMeet(meet({ resultsUrl: 'javascript:alert(1)' })).resultsUrl).toBe('urlFormat')
  })
})

describe('meetValues', () => {
  it('makes a blank end date the same day as the start', () => {
    const values = meetValues({ ...EMPTY_MEET_FORM, name: ' Shark ', courseCode: 'SCY', startDate: '2026-11-14' })
    expect(values).toEqual({
      name: 'Shark',
      name_zh: null,
      course_code: 'SCY',
      start_date: '2026-11-14',
      end_date: '2026-11-14',
      location: null,
      results_url: null,
      notes: null,
    })
  })
})

describe('withoutErrors', () => {
  it('drops the error of a field once it is edited and keeps the rest', () => {
    const errors = { name: 'required', slug: 'slugFormat' } as const
    expect(withoutErrors<SwimmerForm>(errors, { name: 'J' })).toEqual({ slug: 'slugFormat' })
    expect(withoutErrors<SwimmerForm>(errors, { name: 'J', slug: 'j' })).toEqual({})
    expect(withoutErrors<SwimmerForm>(errors, { nameZh: '杰' })).toEqual(errors)
  })
})

describe('blankToNull', () => {
  it('trims', () => {
    expect(blankToNull('  a ')).toBe('a')
    expect(blankToNull('   ')).toBeNull()
  })
})
