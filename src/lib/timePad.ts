// The number pad of the time entry sheet. What is typed is a string of digits that fills a
// time from the right: hundredths, then seconds, then minutes. "10532" is 1:05.32.

/** Two digits each of hundredths, seconds and minutes: up to 99:59.99. */
export const MAX_PAD_DIGITS = 6

/** Adds a digit on the right. Leading zeros and digits past the limit are ignored. */
export function pressDigit(digits: string, digit: string): string {
  if (!/^\d$/.test(digit)) return digits
  if (digits === '' && digit === '0') return digits
  if (digits.length >= MAX_PAD_DIGITS) return digits
  return digits + digit
}

export function pressBackspace(digits: string): string {
  return digits.slice(0, -1)
}

function parts(digits: string): { minutes: string; seconds: string; hundredths: string } {
  const padded = digits.padStart(4, '0')
  return { minutes: padded.slice(0, -4), seconds: padded.slice(-4, -2), hundredths: padded.slice(-2) }
}

/** What the display shows while typing: "2841" -> "28.41", "10532" -> "1:05.32", "" -> "0:00.00". */
export function padDisplay(digits: string): string {
  if (digits === '') return '0:00.00'
  const { minutes, seconds, hundredths } = parts(digits)
  if (minutes === '') return `${Number(seconds)}.${hundredths}`
  return `${Number(minutes)}:${seconds}.${hundredths}`
}

export type PadError =
  /** Sixty seconds or more, which no clock shows. */
  | 'seconds'
  /** Digits that add up to no time at all. */
  | 'zero'

export type PadTime = { cs: number | null; error?: undefined } | { cs?: undefined; error: PadError }

/** The typed digits as centiseconds. Nothing typed is no time, which is not an error. */
export function readPad(digits: string): PadTime {
  if (digits === '') return { cs: null }
  const { minutes, seconds, hundredths } = parts(digits)
  if (Number(seconds) >= 60) return { error: 'seconds' }
  const cs = Number(minutes) * 6000 + Number(seconds) * 100 + Number(hundredths)
  if (cs === 0) return { error: 'zero' }
  return { cs }
}

/** The digits that type a stored time: 6532 -> "10532". */
export function padDigitsOf(cs: number | null): string {
  if (cs === null || cs <= 0) return ''
  const total = Math.round(cs)
  const minutes = Math.floor(total / 6000)
  const rest = String(total % 6000).padStart(4, '0')
  return String(Number(`${minutes}${rest}`))
}
