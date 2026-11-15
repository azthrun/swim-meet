import { describe, expect, it } from 'vitest'
import {
  fallbackNotification,
  notificationLang,
  parseRecordPush,
  recordNotification,
  resultsUrl,
} from './recordNotification'

const SCOPE = 'https://azthrun.github.io/swim-meet/'
const jayden = { kind: 'live', slug: 'jayden', name: 'Jayden', nameZh: '杰登' } as const

describe('parseRecordPush', () => {
  it('takes the payload the Edge Function sends', () => {
    expect(parseRecordPush(jayden)).toEqual(jayden)
    expect(parseRecordPush({ ...jayden, kind: 'official', nameZh: null })).toEqual({
      ...jayden,
      kind: 'official',
      nameZh: null,
    })
  })

  it('treats a missing or empty Chinese name as none', () => {
    expect(parseRecordPush({ kind: 'live', slug: 'jayden', name: 'Jayden' })?.nameZh).toBeNull()
    expect(parseRecordPush({ ...jayden, nameZh: '' })?.nameZh).toBeNull()
  })

  it('rejects anything else', () => {
    for (const data of [
      null,
      'Jayden',
      { ...jayden, kind: 'split' },
      { ...jayden, slug: '' },
      { ...jayden, name: 42 },
      { ...jayden, nameZh: 7 },
    ]) {
      expect(parseRecordPush(data)).toBeNull()
    }
  })
})

describe('notificationLang', () => {
  it("follows the app's choice", () => {
    expect(notificationLang('zh', 'en-US')).toBe('zh')
    expect(notificationLang('en', 'zh-CN')).toBe('en')
  })

  it("falls back to the device's language", () => {
    expect(notificationLang(undefined, 'zh-Hans-CN')).toBe('zh')
    expect(notificationLang(undefined, 'zh-TW')).toBe('zh')
    expect(notificationLang('fr', 'fr-FR')).toBe('en')
    expect(notificationLang(undefined, undefined)).toBe('en')
  })
})

describe('recordNotification', () => {
  it('says whose result is new and which kind', () => {
    expect(recordNotification(jayden, 'en', SCOPE)).toEqual({
      title: 'Jayden',
      body: 'Jayden has a new Live result',
      tag: 'record:jayden:live',
      url: 'https://azthrun.github.io/swim-meet/#/swimmers/jayden/results',
    })
    expect(recordNotification({ ...jayden, kind: 'official' }, 'en', SCOPE).body).toBe(
      'Jayden has a new Official result',
    )
  })

  it("uses the Chinese name in Chinese, and the English one when there's none", () => {
    expect(recordNotification(jayden, 'zh', SCOPE)).toMatchObject({ title: '杰登', body: '杰登 有新的现场成绩' })
    expect(recordNotification({ ...jayden, kind: 'official', nameZh: null }, 'zh', SCOPE)).toMatchObject({
      title: 'Jayden',
      body: 'Jayden 有新的正式成绩',
    })
  })

  it('keeps one notification per swimmer and kind', () => {
    expect(recordNotification({ ...jayden, kind: 'official' }, 'zh', SCOPE).tag).toBe('record:jayden:official')
  })
})

describe('resultsUrl', () => {
  it("opens the swimmer's Results tab", () => {
    expect(resultsUrl('/swim-meet/', 'mia-li')).toBe('/swim-meet/#/swimmers/mia-li/results')
    expect(resultsUrl('/swim-meet/', 'a b')).toBe('/swim-meet/#/swimmers/a%20b/results')
  })
})

describe('fallbackNotification', () => {
  it("says there is a new result in the reader's language and opens the app", () => {
    expect(fallbackNotification('en', SCOPE)).toEqual({ title: 'Swim Meet', body: 'New result', tag: 'record', url: SCOPE })
    expect(fallbackNotification('zh', SCOPE)).toEqual({ title: 'Swim Meet', body: '有新成绩', tag: 'record', url: SCOPE })
  })
})
