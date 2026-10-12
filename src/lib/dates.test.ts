import { describe, expect, it } from 'vitest'
import { formatDate, formatDateRange, formatDateRangeWithDays, formatDay } from './dates'

const today = '2026-10-11'

describe('date formatting', () => {
  it('formats a single day', () => {
    expect(formatDate('2026-11-14', 'en', today)).toBe('Nov 14')
    expect(formatDate('2026-11-14', 'zh', today)).toBe('11月14日')
    expect(formatDay('2026-11-14', 'en', false, today)).toBe('Sat, Nov 14')
    expect(formatDay('2026-11-14', 'en', true, today)).toBe('Saturday, Nov 14')
    expect(formatDay('2026-11-14', 'zh', true, today)).toBe('11月14日 周六')
  })

  it('formats a range inside one month', () => {
    expect(formatDateRange('2026-11-14', '2026-11-15', 'en', today)).toBe('Nov 14–15')
    expect(formatDateRange('2026-11-14', '2026-11-15', 'zh', today)).toBe('11月14日–15日')
    expect(formatDateRangeWithDays('2026-11-14', '2026-11-15', 'en', today)).toBe('Sat–Sun, Nov 14–15')
    expect(formatDateRangeWithDays('2026-11-14', '2026-11-15', 'zh', today)).toBe(
      '11月14日–15日（周六–周日）',
    )
  })

  it('formats a range across months and a one-day range', () => {
    expect(formatDateRange('2026-10-31', '2026-11-01', 'en', today)).toBe('Oct 31 – Nov 1')
    expect(formatDateRange('2026-10-31', '2026-11-01', 'zh', today)).toBe('10月31日–11月1日')
    expect(formatDateRange('2026-11-14', '2026-11-14', 'en', today)).toBe('Nov 14')
    expect(formatDateRangeWithDays('2026-11-14', '2026-11-14', 'en', today)).toBe('Sat, Nov 14')
  })

  it('adds the year outside the current year', () => {
    expect(formatDate('2025-11-15', 'en', today)).toBe('Nov 15, 2025')
    expect(formatDate('2025-11-15', 'zh', today)).toBe('2025年11月15日')
    expect(formatDateRange('2025-11-15', '2025-11-16', 'en', today)).toBe('Nov 15–16, 2025')
  })
})
