// The service worker, built on its own into dist/sw.js (vite.sw.config.ts) so it sits at the app's
// scope. It only shows record notifications and opens them: no caching, no fetch handler.
import { readLang } from '../lib/langStore'
import {
  fallbackNotification,
  notificationLang,
  parseRecordPush,
  recordNotification,
} from '../lib/recordNotification'

declare const self: ServiceWorkerGlobalScope

const scope = self.registration.scope

// Take over open pages at once, so a tap can steer the page that is already open.
self.addEventListener('install', () => void self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

async function show(data: unknown): Promise<void> {
  const push = parseRecordPush(data)
  const stored = await readLang().catch(() => undefined)
  const lang = notificationLang(stored, self.navigator.language)
  // Every push shows something: browsers punish silent ones (Safari may drop the subscription).
  const { title, body, tag, url } = push ? recordNotification(push, lang, scope) : fallbackNotification(lang, scope)
  await self.registration.showNotification(title, {
    body,
    tag,
    icon: `${scope}apple-touch-icon.png`,
    badge: `${scope}notification-badge.png`,
    data: { url },
  })
}

self.addEventListener('push', (event) => {
  let data: unknown
  try {
    data = event.data?.json()
  } catch {
    data = undefined // Not JSON: show() falls back to a plain notification.
  }
  event.waitUntil(show(data))
})

async function open(url: string): Promise<void> {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const page = windows.find((client) => client.url.startsWith(scope))
  if (page) {
    try {
      // Focus first: browsers only let a worker focus a window straight after the tap.
      const focused = await page.focus()
      await focused.navigate(url)
      return
    } catch {
      // A page that won't focus, or that this worker doesn't control, can't be steered; open a new one instead.
    }
  }
  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: unknown } | null)?.url
  event.waitUntil(open(typeof url === 'string' ? url : scope))
})
