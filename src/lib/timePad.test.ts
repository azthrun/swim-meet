import { describe, expect, it } from 'vitest'
import { MAX_PAD_DIGITS, padDigitsOf, padDisplay, pressBackspace, pressDigit, readPad } from './timePad'

const type = (keys: string, from = '') => [...keys].reduce(pressDigit, from)

describe('pressDigit', () => {
  it('fills the time from the right', () => {
    expect(padDisplay(type('1'))).toBe('0.01')
    expect(padDisplay(type('10'))).toBe('0.10')
    expect(padDisplay(type('105'))).toBe('1.05')
    expect(padDisplay(type('1053'))).toBe('10.53')
    expect(padDisplay(type('10532'))).toBe('1:05.32')
    expect(padDisplay(type('2841'))).toBe('28.41')
    expect(padDisplay(type('201532'))).toBe('20:15.32')
  })

  it('ignores leading zeros', () => {
    expect(type('0')).toBe('')
    expect(type('000')).toBe('')
    expect(type('0028')).toBe('28')
    expect(type('2800')).toBe('2800')
  })

  it('stops at the longest time the pad can hold', () => {
    expect(type('1234567')).toBe('123456')
    expect(type('9', '1'.repeat(MAX_PAD_DIGITS))).toBe('1'.repeat(MAX_PAD_DIGITS))
  })

  it('ignores anything that is not one digit', () => {
    expect(pressDigit('28', 'a')).toBe('28')
    expect(pressDigit('28', '41')).toBe('28')
    expect(pressDigit('28', '')).toBe('28')
  })
})

describe('pressBackspace', () => {
  it('takes the last digit back', () => {
    expect(pressBackspace('10532')).toBe('1053')
    expect(pressBackspace('1')).toBe('')
    expect(pressBackspace('')).toBe('')
  })
})

describe('padDisplay', () => {
  it('shows an empty clock when nothing is typed', () => {
    expect(padDisplay('')).toBe('0:00.00')
  })
})

describe('readPad', () => {
  it('reads typed digits as centiseconds', () => {
    expect(readPad('10532')).toEqual({ cs: 6532 })
    expect(readPad('2841')).toEqual({ cs: 2841 })
    expect(readPad('5')).toEqual({ cs: 5 })
    expect(readPad('5999')).toEqual({ cs: 5999 })
    expect(readPad('201532')).toEqual({ cs: 121532 })
  })

  it('treats nothing typed as no time, not as a mistake', () => {
    expect(readPad('')).toEqual({ cs: null })
  })

  it('rejects sixty seconds or more, with or without minutes', () => {
    expect(readPad('6000')).toEqual({ error: 'seconds' })
    expect(readPad('6532')).toEqual({ error: 'seconds' })
    expect(readPad('16532')).toEqual({ error: 'seconds' })
    expect(readPad('9999')).toEqual({ error: 'seconds' })
  })

  it('rejects zero', () => {
    expect(readPad('0')).toEqual({ error: 'zero' })
    expect(readPad('0000')).toEqual({ error: 'zero' })
  })
})

describe('padDigitsOf', () => {
  it('gives the digits that type a stored time', () => {
    expect(padDigitsOf(6532)).toBe('10532')
    expect(padDigitsOf(2841)).toBe('2841')
    expect(padDigitsOf(5)).toBe('5')
    expect(padDigitsOf(6000)).toBe('10000')
    expect(padDigitsOf(null)).toBe('')
  })

  it('round-trips through readPad', () => {
    for (const cs of [1, 50, 905, 2841, 5999, 6000, 6532, 121532]) {
      expect(readPad(padDigitsOf(cs))).toEqual({ cs })
    }
  })
})
