// Sends record notifications (ADR 0006). Called only by the notify_new_record trigger on
// public.results through pg_net, with the hook secret in `x-hook-secret`.
//
// The payload names the swimmer and the kind of time. The device's service worker writes the
// text in its own language, so nothing here depends on who is reading.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Supabase Edge runtime global: keeps the worker alive for a promise after the response is sent.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

type Kind = 'live' | 'official'

interface Claimed {
  endpoint: string
  p256dh: string
  auth: string
  slug: string
  name: string
  name_zh: string | null
}

function serviceKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>
    if (parsed.default) return parsed.default
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), {
  auth: { persistSession: false },
})

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const CHUNK = 25

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Fire and forget: a gone device is removed, anything else is logged and not retried.
// Sent in chunks so a swimmer with many followers does not open hundreds of requests at once,
// and each chunk's gone devices are deleted with it, so no delete request grows past 25 endpoints.
async function send(claimed: Claimed[], kind: Kind): Promise<void> {
  const payload = (c: Claimed) => JSON.stringify({ kind, slug: c.slug, name: c.name, nameZh: c.name_zh })
  let sent = 0
  let gone = 0
  for (let start = 0; start < claimed.length; start += CHUNK) {
    const chunk = claimed.slice(start, start + CHUNK)
    const results = await Promise.allSettled(
      chunk.map((c) =>
        webpush.sendNotification({ endpoint: c.endpoint, keys: { p256dh: c.p256dh, auth: c.auth } }, payload(c), {
          TTL: 24 * 60 * 60,
          urgency: 'normal',
        }),
      ),
    )
    const chunkGone: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        sent++
        return
      }
      const status = (r.reason as { statusCode?: number }).statusCode
      // 404/410: the subscription is gone. 403: it no longer accepts our VAPID key, so it can never
      // be delivered again. Not 400, which could be our own bug rather than the device's.
      if (status === 404 || status === 410 || status === 403) chunkGone.push(chunk[i]!.endpoint)
      else console.error('push failed', status, (r.reason as Error).message)
    })
    if (chunkGone.length > 0) {
      gone += chunkGone.length
      const { error } = await supabase.from('push_endpoints').delete().in('endpoint', chunkGone)
      if (error) console.error('cleanup failed', error)
    }
  }
  console.log('record notification', { kind, claimed: claimed.length, sent, gone })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  let swimmerId: unknown
  let kind: unknown
  try {
    ;({ swimmer_id: swimmerId, kind } = await req.json())
  } catch {
    return new Response('bad body', { status: 400 })
  }
  if (typeof swimmerId !== 'string' || !UUID.test(swimmerId) || (kind !== 'live' && kind !== 'official')) {
    return new Response('bad body', { status: 400 })
  }

  // The RPC checks the secret and claims the devices that are due, in one call.
  const { data, error } = await supabase.rpc('claim_record_notification', {
    p_secret: req.headers.get('x-hook-secret') ?? '',
    p_swimmer_id: swimmerId,
    p_kind: kind,
  })
  if (error) {
    if (error.code === '42501') return new Response('forbidden', { status: 403 })
    console.error('claim failed', error)
    return new Response('claim failed', { status: 500 })
  }

  const claimed = (data ?? []) as Claimed[]
  // Answer as soon as the claim is made, and send afterwards: pg_net gives up after 10 seconds,
  // which a swimmer with hundreds of followers could take longer than.
  EdgeRuntime.waitUntil(send(claimed, kind as Kind).catch((e) => console.error('sending failed', e)))
  return Response.json({ claimed: claimed.length }, { status: 202 })
})
