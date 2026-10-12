// Times are integer centiseconds everywhere except at the edge of the screen.

const MINUS = '−'

/** 6532 -> "1:05.32", 2841 -> "28.41". */
export function formatTime(cs: number): string {
  const total = Math.round(Math.abs(cs))
  const minutes = Math.floor(total / 6000)
  const seconds = Math.floor((total % 6000) / 100)
  const hundredths = String(total % 100).padStart(2, '0')
  if (minutes === 0) return `${seconds}.${hundredths}`
  return `${minutes}:${String(seconds).padStart(2, '0')}.${hundredths}`
}

/**
 * Reads a time as typed. Accepts "1:05.32", "28.41", "28.4", and bare digits as the number
 * pad produces them ("10532" is 1:05.32). Returns null for anything that is not a time.
 */
export function parseTime(input: string): number | null {
  const text = input.trim()
  let minutes = 0
  let seconds: number
  let hundredths: number
  let hasMinutes: boolean

  if (/^\d+$/.test(text)) {
    const digits = text.padStart(4, '0')
    hundredths = Number(digits.slice(-2))
    seconds = Number(digits.slice(-4, -2))
    hasMinutes = digits.length > 4
    if (hasMinutes) minutes = Number(digits.slice(0, -4))
  } else {
    const match = /^(?:(\d+):)?(\d{1,2})(?:\.(\d{1,2}))?$/.exec(text)
    if (!match) return null
    hasMinutes = match[1] !== undefined
    if (hasMinutes) minutes = Number(match[1])
    seconds = Number(match[2])
    hundredths = Number((match[3] ?? '').padEnd(2, '0'))
  }

  if (hasMinutes && seconds >= 60) return null
  const cs = minutes * 6000 + seconds * 100 + hundredths
  return cs > 0 ? cs : null
}

/** Difference against the seed time: -64 -> "−0.64" (faster), 30 -> "+0.30" (slower). */
export function formatDrop(deltaCs: number): string {
  if (deltaCs === 0) return formatTime(0)
  return `${deltaCs < 0 ? MINUS : '+'}${formatTime(deltaCs)}`
}
