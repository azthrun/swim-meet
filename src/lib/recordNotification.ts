// What a record notification says and where it leads (ADR 0006). Shared by the service worker,
// which writes the text in the reader's language, and its tests. No DOM here: the service
// worker has none.
import type { Lang } from './dates'

export type RecordKind = 'live' | 'official'

/** The push payload the record-notification Edge Function sends. */
export type RecordPush = { kind: RecordKind; slug: string; name: string; nameZh: string | null }

export type RecordNotification = { title: string; body: string; tag: string; url: string }

const BODY: Record<Lang, Record<RecordKind, (name: string) => string>> = {
  en: {
    live: (name) => `${name} has a new Live result`,
    official: (name) => `${name} has a new Official result`,
  },
  zh: {
    live: (name) => `${name} 有新的现场成绩`,
    official: (name) => `${name} 有新的正式成绩`,
  },
}

/** The payload, or null when it is not one the Edge Function would send. */
export function parseRecordPush(data: unknown): RecordPush | null {
  if (typeof data !== 'object' || data === null) return null
  const { kind, slug, name, nameZh } = data as Record<string, unknown>
  if (kind !== 'live' && kind !== 'official') return null
  if (typeof slug !== 'string' || slug === '' || typeof name !== 'string' || name === '') return null
  if (nameZh !== null && nameZh !== undefined && typeof nameZh !== 'string') return null
  return { kind, slug, name, nameZh: nameZh || null }
}

/**
 * The app's language as copied for the service worker. The app always stores the language it
 * shows, so this matches the app; the device's language is only for when nothing was stored
 * (IndexedDB unavailable, or the app never opened in this browser). Anything Chinese reads
 * Chinese; everything else reads English.
 */
export function notificationLang(stored: unknown, deviceLanguage: string | undefined): Lang {
  if (stored === 'en' || stored === 'zh') return stored
  return deviceLanguage?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** The swimmer's Results tab, under the app's scope (which ends in a slash). */
export function resultsUrl(scope: string, slug: string): string {
  return `${scope}#/swimmers/${encodeURIComponent(slug)}/results`
}

/**
 * The notification for a push. One tag per swimmer and kind, so a second live time replaces the
 * first instead of stacking.
 */
export function recordNotification(push: RecordPush, lang: Lang, scope: string): RecordNotification {
  const name = (lang === 'zh' && push.nameZh) || push.name
  return {
    title: name,
    body: BODY[lang][push.kind](name),
    tag: `record:${push.slug}:${push.kind}`,
    url: resultsUrl(scope, push.slug),
  }
}

const FALLBACK_BODY: Record<Lang, string> = { en: 'New result', zh: '有新成绩' }

/** For a push whose payload is missing or unreadable: still a notification, never a silent push. */
export function fallbackNotification(lang: Lang, scope: string): RecordNotification {
  return { title: 'Swim Meet', body: FALLBACK_BODY[lang], tag: 'record', url: scope }
}
