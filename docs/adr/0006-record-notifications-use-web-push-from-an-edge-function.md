# Record notifications use Web Push sent from an Edge Function

A device that follows a swimmer gets a notification when that swimmer's result first gets a live or an official time. It is sent with Web Push (VAPID): free, built into browsers, and needs no account or email, so signed-out visitors can follow a swimmer too. Email (needs an address and a confirmation step) and ntfy or Telegram (needs a separate app) were the other options. A trigger on `results` calls the `record-notification` Edge Function through `pg_net` as soon as the write commits. A GitHub Actions job polling for new times was the other way to send, but it would be minutes late and use up Actions minutes.

## Consequences

- A subscription belongs to a device, not an account. Someone signed in follows a swimmer on each device separately, and an editor's own device is notified about the times they post.
- On iPhone, push only works from the site added to the Home Screen (iOS 16.4+), and tapping a notification opens that Home Screen app, not Safari.
- The notification payload is `{ kind, slug, name, nameZh }` (`nameZh` may be null): only the swimmer's names, slug, and the kind of time. The service worker writes the text in the device's language, so the server stores no language.
- A device gets at most one notification per swimmer and kind every 10 minutes. The function claims due devices and marks them sent in one statement, so a bulk import of official times sends once, not once per result.
- A live and an official time arriving in the same write send a single Official notification.
- A device follows at most 50 swimmers, and a swimmer has at most 500 following devices, which bounds how many pushes one new time can fan out to.
- The tables are closed to anon and signed-in callers. Devices use the `subscribe_to_swimmer` / `unsubscribe_from_swimmer` / `subscribed_swimmers` RPCs, where knowing the endpoint is the proof. The function, as service role, claims through `claim_record_notification` and deletes the endpoints the push service reports gone (404/410/403). Endpoints must belong to a known browser push service, so the function can never be made to post anywhere else.
- The trigger and the function share a secret that the migration generated straight into Vault. The function has JWT checking off and checks the secret through `claim_record_notification`, the only RPC it calls.
- The VAPID key pair is set by the owner as Edge Function secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). The public key is also published in `.env` for the site. A new key pair invalidates every existing subscription.
- Sending is fire-and-forget: a failure is logged and not retried, and a device the push service reports gone (404/410), or that no longer accepts our VAPID key (403), is deleted. A 400 is only logged, since it could be our own bug.
- The function answers as soon as it has claimed the devices and sends afterwards, so `pg_net`'s 10-second timeout never cuts a large fan-out short.
- A failure to queue a notification never blocks saving a result: the trigger logs a warning and lets the write through. Each queued call costs a subtransaction, which is fine at this site's size: a write queuing more than ~64 calls in one transaction only slows other sessions' snapshots until it commits.
