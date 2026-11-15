// Following a swimmer on this device (ADR 0006): the browser's push subscription, and the RPCs
// that tie it to swimmers. The subscription belongs to the device, not to an account.
import { supabase } from './supabase'

const BASE = import.meta.env.BASE_URL

/**
 * - `supported`: this browser can follow.
 * - `needsHomeScreen`: an iPhone or iPad in a browser tab; push only works from the Home Screen.
 * - `unsupported`: no push at all (including iOS in-app browsers); the bell is hidden.
 */
export type PushSupport = 'supported' | 'needsHomeScreen' | 'unsupported'

export function pushSupport(): PushSupport {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'supported'
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  // In-app browsers (WeChat, Facebook, Instagram, LINE, Google app, Snapchat, TikTok, LinkedIn,
  // X) can't add to the Home Screen; Safari, Chrome, Edge and Firefox on iOS 16.4+ can, from
  // their Share menu. Tokens match as each app writes them: "Name/1.2", "Instagram 300",
  // "[LinkedInApp]", "Twitter for iPhone", "musical_ly_32.0".
  const inApp =
    /\b(MicroMessenger|FBAN|FBAV|Line|GSA|Snapchat|BytedanceWebview)\/|\b(Instagram|LinkedInApp|Twitter)\b|\bmusical_ly_/.test(ua)
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !inApp && !standalone ? 'needsHomeScreen' : 'unsupported'
}

/** In development the worker is served from source as a module, so it needs a wider scope header (vite.config.ts). */
function register(): Promise<ServiceWorkerRegistration> {
  return import.meta.env.DEV
    ? navigator.serviceWorker.register(`${BASE}src/sw/sw.ts`, { type: 'module', scope: BASE })
    : navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE })
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(BASE)
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** The VAPID public key as the bytes PushManager wants. */
function serverKey(): Uint8Array<ArrayBuffer> {
  const base64 = import.meta.env.VITE_VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/**
 * Whether a subscription was made with this server key; one made with an old key can't be pushed to.
 * A browser that doesn't report the key counts as a match: only a proven mismatch replaces it.
 */
function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options?.applicationServerKey
  if (!current) return true
  const bytes = new Uint8Array(current)
  return bytes.length === key.length && bytes.every((byte, i) => byte === key[i])
}

/** Ids of the swimmers this device follows; none until it has a subscription. */
export async function followedSwimmers(): Promise<string[]> {
  if (pushSupport() !== 'supported' || Notification.permission !== 'granted') return []
  const subscription = await currentSubscription()
  if (!subscription) return []
  const { data, error } = await supabase.rpc('subscribed_swimmers', { p_endpoint: subscription.endpoint })
  if (error) throw error
  return data
}

/** Subscribes this device (once) and follows the swimmer. Needs notification permission. */
export async function followSwimmer(swimmerId: string): Promise<void> {
  await register()
  const registration = await navigator.serviceWorker.ready
  const key = serverKey()
  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !sameKey(subscription, key)) {
    // Made with another VAPID key: replace it, or the server's pushes would be refused.
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('push subscription without keys')
  // Sent every time: the keys travel with the endpoint, so a renewed subscription heals here.
  const { error } = await supabase.rpc('subscribe_to_swimmer', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_swimmer_id: swimmerId,
  })
  if (error) throw error
}

/** Stops this device following the swimmer. The subscription stays for the others it follows. */
export async function unfollowSwimmer(swimmerId: string): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  const { error } = await supabase.rpc('unsubscribe_from_swimmer', {
    p_endpoint: subscription.endpoint,
    p_swimmer_id: swimmerId,
  })
  if (error) throw error
}
