// Validation for the swimmer and meet forms. Forms hold what was typed, as strings; these
// functions say what is wrong with it and turn it into the values the database stores.

export type FieldError =
  | 'required'
  | 'slugFormat'
  | 'slugReserved'
  | 'dateInvalid'
  | 'dateInFuture'
  | 'endBeforeStart'
  | 'urlFormat'
  | 'positiveNumber'
  | 'laneNumber'
  | 'timeFormat'
  | 'dateOutsideMeet'

export type FieldErrors<Form> = Partial<Record<keyof Form, FieldError>>

export function hasErrors(errors: Partial<Record<string, FieldError>>): boolean {
  return Object.keys(errors).length > 0
}

/** Blank or whitespace-only text is stored as null. */
export function blankToNull(value: string): string | null {
  const text = value.trim()
  return text === '' ? null : text
}

/** True for a real calendar day written as "2026-11-14". */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// ---------------------------------------------------------------------------
// Swimmer
// ---------------------------------------------------------------------------

export type SwimmerForm = {
  name: string
  nameZh: string
  slug: string
  /** Private. ISO day or blank. */
  dateOfBirth: string
  /** Private. A `genders` code or blank. */
  genderCode: string
}

export const EMPTY_SWIMMER_FORM: SwimmerForm = { name: '', nameZh: '', slug: '', dateOfBirth: '', genderCode: '' }

/** Same rule as the `swimmers.slug` check constraint. */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Slugs that would collide with a route under /swimmers/. */
const RESERVED_SLUGS = new Set(['new'])

/** "Jayden C." -> "jayden-c". Gives "" when the name has no Latin letters or digits. */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateSwimmer(form: SwimmerForm, today: string): FieldErrors<SwimmerForm> {
  const errors: FieldErrors<SwimmerForm> = {}
  if (form.name.trim() === '') errors.name = 'required'

  const slug = form.slug.trim()
  if (slug === '') errors.slug = 'required'
  else if (!SLUG.test(slug)) errors.slug = 'slugFormat'
  else if (RESERVED_SLUGS.has(slug)) errors.slug = 'slugReserved'

  if (form.dateOfBirth !== '') {
    if (!isIsoDate(form.dateOfBirth)) errors.dateOfBirth = 'dateInvalid'
    else if (form.dateOfBirth > today) errors.dateOfBirth = 'dateInFuture'
  }
  return errors
}

export function swimmerValues(form: SwimmerForm) {
  return {
    display_name: form.name.trim(),
    display_name_zh: blankToNull(form.nameZh),
    slug: form.slug.trim(),
  }
}

export function swimmerPrivateValues(form: SwimmerForm) {
  return {
    date_of_birth: blankToNull(form.dateOfBirth),
    gender_code: blankToNull(form.genderCode),
  }
}

// ---------------------------------------------------------------------------
// Meet
// ---------------------------------------------------------------------------

export type MeetForm = {
  name: string
  nameZh: string
  courseCode: string
  startDate: string
  /** Blank means a one-day meet. */
  endDate: string
  location: string
  resultsUrl: string
  notes: string
}

export const EMPTY_MEET_FORM: MeetForm = {
  name: '',
  nameZh: '',
  courseCode: '',
  startDate: '',
  endDate: '',
  location: '',
  resultsUrl: '',
  notes: '',
}

export function validateMeet(form: MeetForm): FieldErrors<MeetForm> {
  const errors: FieldErrors<MeetForm> = {}
  if (form.name.trim() === '') errors.name = 'required'
  if (form.courseCode === '') errors.courseCode = 'required'

  if (form.startDate === '') errors.startDate = 'required'
  else if (!isIsoDate(form.startDate)) errors.startDate = 'dateInvalid'

  if (form.endDate !== '') {
    if (!isIsoDate(form.endDate)) errors.endDate = 'dateInvalid'
    else if (!errors.startDate && form.endDate < form.startDate) errors.endDate = 'endBeforeStart'
  }

  // Only http(s) links are followed when the meet is shown, so nothing else is accepted.
  const url = form.resultsUrl.trim()
  if (url !== '' && !/^https?:\/\/\S+$/i.test(url)) errors.resultsUrl = 'urlFormat'
  return errors
}

export function meetValues(form: MeetForm) {
  return {
    name: form.name.trim(),
    name_zh: blankToNull(form.nameZh),
    course_code: form.courseCode,
    start_date: form.startDate,
    end_date: form.endDate === '' ? form.startDate : form.endDate,
    location: blankToNull(form.location),
    results_url: blankToNull(form.resultsUrl),
    notes: blankToNull(form.notes),
  }
}
