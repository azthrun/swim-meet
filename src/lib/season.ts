// A swim season runs September 1 through August 31 and is named for both years: "2026–27".

/** The year a season starts in, for an ISO date such as "2026-11-14". */
export function seasonOf(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  return month >= 9 ? year : year - 1
}

export function seasonLabel(startYear: number): string {
  return `${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`
}
