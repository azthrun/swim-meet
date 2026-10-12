import { describe, expect, it } from 'vitest'
import { formatDrop, formatTime, parseTime } from './time'

describe('formatTime', () => {
  it('shows seconds and hundredths under a minute', () => {
    expect(formatTime(2841)).toBe('28.41')
    expect(formatTime(905)).toBe('9.05')
    expect(formatTime(50)).toBe('0.50')
  })

  it('shows minutes with zero-padded seconds from a minute up', () => {
    expect(formatTime(6532)).toBe('1:05.32')
    expect(formatTime(6000)).toBe('1:00.00')
    expect(formatTime(5999)).toBe('59.99')
  })

  it('keeps counting minutes past an hour', () => {
    expect(formatTime(121532)).toBe('20:15.32')
    expect(formatTime(366001)).toBe('61:00.01')
  })
})

describe('parseTime', () => {
  it('reads the formats it writes', () => {
    for (const cs of [50, 905, 2841, 5999, 6000, 6532, 121532]) {
      expect(parseTime(formatTime(cs))).toBe(cs)
    }
  })

  it('reads bare digits the way the number pad types them', () => {
    expect(parseTime('10532')).toBe(6532)
    expect(parseTime('2841')).toBe(2841)
    expect(parseTime('905')).toBe(905)
    expect(parseTime('5')).toBe(5)
    expect(parseTime('201532')).toBe(121532)
  })

  it('pads a single decimal digit and allows a missing fraction', () => {
    expect(parseTime('28.4')).toBe(2840)
    expect(parseTime('1:05')).toBe(6500)
    expect(parseTime('  1:05.32 ')).toBe(6532)
  })

  it('accepts more than 59 seconds only when there are no minutes', () => {
    expect(parseTime('65.32')).toBe(6532)
    expect(parseTime('6532')).toBe(6532)
    expect(parseTime('1:65.32')).toBeNull()
    expect(parseTime('16532')).toBeNull()
  })

  it('rejects anything that is not a positive time', () => {
    for (const bad of ['', '0', '0.00', 'abc', '1:2:3', '1.234', '-28.41', '1:', ':05', '28.']) {
      expect(parseTime(bad)).toBeNull()
    }
  })
})

describe('formatDrop', () => {
  it('marks a faster swim with a minus sign and a slower one with a plus', () => {
    expect(formatDrop(-64)).toBe('−0.64')
    expect(formatDrop(30)).toBe('+0.30')
    expect(formatDrop(-6210)).toBe('−1:02.10')
    expect(formatDrop(0)).toBe('0.00')
  })
})
