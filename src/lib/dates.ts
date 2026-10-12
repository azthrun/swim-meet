// Dates are plain ISO days ("2026-11-14") with no time zone, so they are formatted in UTC.

export type Lang = 'en' | 'zh'

const EN_DASH = '–'
const LOCALE: Record<Lang, string> = { en: 'en-US', zh: 'zh-CN' }

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

function part(iso: string, lang: Lang, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: 'UTC', ...options }).format(toDate(iso))
}

const year = (iso: string) => iso.slice(0, 4)
const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7)

/** Today as an ISO day in the viewer's own time zone. */
export function todayIso(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

function monthDay(iso: string, lang: Lang): string {
  return part(iso, lang, { month: 'short', day: 'numeric' })
}

/** "Sat" / "周六", or "Saturday" with `long`. */
function weekday(iso: string, lang: Lang, long = false): string {
  return part(iso, lang, { weekday: long && lang === 'en' ? 'long' : 'short' })
}

// The year is left out for dates in the current year, as in the design draft.
function withYear(text: string, iso: string, lang: Lang, today: string): string {
  if (year(iso) === year(today)) return text
  return lang === 'zh' ? `${year(iso)}年${text}` : `${text}, ${year(iso)}`
}

/** "Nov 14" / "11月14日". */
export function formatDate(iso: string, lang: Lang, today = todayIso()): string {
  return withYear(monthDay(iso, lang), iso, lang, today)
}

/** "Sat, Nov 14" / "11月14日 周六"; `long` gives "Saturday, Nov 14". */
export function formatDay(iso: string, lang: Lang, long = false, today = todayIso()): string {
  const text =
    lang === 'zh'
      ? `${monthDay(iso, lang)} ${weekday(iso, lang)}`
      : `${weekday(iso, lang, long)}, ${monthDay(iso, lang)}`
  return withYear(text, iso, lang, today)
}

/** "Nov 14–15" / "11月14日–15日". A one-day range reads as a single date. */
export function formatDateRange(start: string, end: string, lang: Lang, today = todayIso()): string {
  if (start === end) return formatDate(start, lang, today)
  let text: string
  if (sameMonth(start, end)) {
    const endDay = part(end, lang, { day: 'numeric' })
    text = `${monthDay(start, lang)}${EN_DASH}${endDay}`
  } else {
    const sep = lang === 'zh' ? EN_DASH : ` ${EN_DASH} `
    text = `${monthDay(start, lang)}${sep}${monthDay(end, lang)}`
  }
  return withYear(text, end, lang, today)
}

/** "Sat–Sun, Nov 14–15" / "11月14日–15日（周六–周日）". */
export function formatDateRangeWithDays(start: string, end: string, lang: Lang, today = todayIso()): string {
  if (start === end) return formatDay(start, lang, false, today)
  const days = `${weekday(start, lang)}${EN_DASH}${weekday(end, lang)}`
  const range = formatDateRange(start, end, lang, today)
  return lang === 'zh' ? `${range}（${days}）` : `${days}, ${range}`
}
