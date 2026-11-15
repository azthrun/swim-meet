-- Record notifications (ADR 0006): a device subscribes to a swimmer, and gets a Web Push when
-- that swimmer's result first gets a live or an official time.
--
-- A device is its push endpoint. Anon and signed-in callers cannot touch these tables and go
-- through the subscribe RPCs; the Edge Function, as service role, claims through an RPC and
-- deletes the endpoints the push service reports gone.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.push_endpoints (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.record_subscriptions (
  endpoint text not null references public.push_endpoints (endpoint) on delete cascade,
  swimmer_id uuid not null references public.swimmers (id) on delete cascade,
  last_live_sent_at timestamptz,
  last_official_sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (endpoint, swimmer_id)
);
create index record_subscriptions_swimmer_id_idx on public.record_subscriptions (swimmer_id);

alter table public.push_endpoints enable row level security;
alter table public.record_subscriptions enable row level security;
revoke all on public.push_endpoints from anon, authenticated;
revoke all on public.record_subscriptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Hook secret: the trigger sends it, the Edge Function checks it through claim_record_notification.
-- Generated here, so it is never written down anywhere but Vault.
-- ---------------------------------------------------------------------------

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'record_notification_hook_secret',
  'Shared secret between the results trigger and the record-notification Edge Function'
)
where not exists (select 1 from vault.secrets where name = 'record_notification_hook_secret');

create function private.record_notification_hook_secret() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'record_notification_hook_secret';
$$;
revoke all on function private.record_notification_hook_secret() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Subscribe RPCs (anon and signed-in). Knowing an endpoint is what proves the device.
-- ---------------------------------------------------------------------------

-- Only the browser push services, so the Edge Function never posts to any other address.
create function private.is_push_endpoint(p_endpoint text) returns boolean
language sql immutable set search_path = '' as $$
  select char_length(p_endpoint) <= 1024
    and p_endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/';
$$;

create function public.subscribe_to_swimmer(
  p_endpoint text, p_p256dh text, p_auth text, p_swimmer_id uuid
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_push_endpoint(p_endpoint) then
    raise exception 'not a push endpoint' using errcode = '22023';
  end if;
  if p_p256dh !~ '^[A-Za-z0-9_-]{80,100}=*$' or p_auth !~ '^[A-Za-z0-9_-]{16,32}=*$' then
    raise exception 'bad push keys' using errcode = '22023';
  end if;
  -- Lock the swimmer row too, so two devices at once cannot both pass the per-swimmer cap.
  -- `no key update` still lets the subscription insert's foreign key check through.
  perform 1 from public.swimmers where id = p_swimmer_id for no key update;
  if not found then
    raise exception 'swimmer % does not exist', p_swimmer_id using errcode = '23503';
  end if;

  insert into public.push_endpoints (endpoint, p256dh, auth)
  values (p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();

  -- Lock the endpoint row so two calls at once cannot both pass the cap.
  perform 1 from public.push_endpoints where endpoint = p_endpoint for update;
  -- The caps only stop a new subscription; resubscribing an existing one always works.
  -- 500 devices per swimmer bounds how many pushes one new time can fan out to.
  if not exists (
    select 1 from public.record_subscriptions where endpoint = p_endpoint and swimmer_id = p_swimmer_id
  ) then
    if (select count(*) from public.record_subscriptions where endpoint = p_endpoint) >= 50 then
      raise exception 'a device can follow at most 50 swimmers' using errcode = '54000';
    end if;
    if (select count(*) from public.record_subscriptions where swimmer_id = p_swimmer_id) >= 500 then
      raise exception 'a swimmer can have at most 500 following devices' using errcode = '54000';
    end if;
  end if;

  insert into public.record_subscriptions (endpoint, swimmer_id)
  values (p_endpoint, p_swimmer_id)
  on conflict do nothing;
end;
$$;

create function public.unsubscribe_from_swimmer(p_endpoint text, p_swimmer_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Lock the endpoint row first, as subscribe does: the same lock order cannot deadlock, and a
  -- subscribe at the same time cannot add a subscription to an endpoint about to be deleted.
  perform 1 from public.push_endpoints where endpoint = p_endpoint for update;
  delete from public.record_subscriptions where endpoint = p_endpoint and swimmer_id = p_swimmer_id;
  -- An endpoint that follows nobody is not kept.
  delete from public.push_endpoints p
  where p.endpoint = p_endpoint
    and not exists (select 1 from public.record_subscriptions s where s.endpoint = p.endpoint);
end;
$$;

create function public.subscribed_swimmers(p_endpoint text) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select swimmer_id from public.record_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.subscribe_to_swimmer(text, text, text, uuid) from public;
revoke all on function public.unsubscribe_from_swimmer(text, uuid) from public;
revoke all on function public.subscribed_swimmers(text) from public;
grant execute on function public.subscribe_to_swimmer(text, text, text, uuid) to anon, authenticated;
grant execute on function public.unsubscribe_from_swimmer(text, uuid) to anon, authenticated;
grant execute on function public.subscribed_swimmers(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Edge Function RPC (service role only)
-- ---------------------------------------------------------------------------

-- Checks the hook secret, then claims every subscription of the swimmer not sent this kind in
-- the last 10 minutes, marking it sent in the same statement so concurrent calls never double up.
create function public.claim_record_notification(p_secret text, p_swimmer_id uuid, p_kind text)
returns table (endpoint text, p256dh text, auth text, slug text, name text, name_zh text)
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text := private.record_notification_hook_secret();
begin
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'bad hook secret' using errcode = '42501';
  end if;
  if p_kind not in ('live', 'official') then
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;

  return query
  with claimed as (
    update public.record_subscriptions s
    set last_live_sent_at = case when p_kind = 'live' then now() else s.last_live_sent_at end,
        last_official_sent_at = case when p_kind = 'official' then now() else s.last_official_sent_at end
    where s.swimmer_id = p_swimmer_id
      and coalesce(case when p_kind = 'live' then s.last_live_sent_at else s.last_official_sent_at end, '-infinity')
          < now() - interval '10 minutes'
    returning s.endpoint
  )
  select p.endpoint, p.p256dh, p.auth, sw.slug, sw.display_name, sw.display_name_zh
  from claimed c
  join public.push_endpoints p on p.endpoint = c.endpoint
  join public.swimmers sw on sw.id = p_swimmer_id;
end;
$$;

revoke all on function public.claim_record_notification(text, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_record_notification(text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Trigger: a time going from empty to filled on a swum result
-- ---------------------------------------------------------------------------

create function private.notify_new_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  v_swimmer uuid;
begin
  if new.status_code <> 'SWUM' then
    return null;
  end if;
  -- Official wins when both arrive in one write: one notification, the one that matters more.
  if new.official_time_cs is not null and (tg_op = 'INSERT' or old.official_time_cs is null) then
    v_kind := 'official';
  elsif new.live_time_cs is not null and (tg_op = 'INSERT' or old.live_time_cs is null) then
    v_kind := 'live';
  else
    return null;
  end if;

  select e.swimmer_id into v_swimmer from public.entries e where e.id = new.entry_id;
  -- Only call the function when someone follows this swimmer.
  if not exists (select 1 from public.record_subscriptions s where s.swimmer_id = v_swimmer) then
    return null;
  end if;

  -- A notification failing must never stop the result from being saved.
  begin
    -- pg_net queues the request and sends it only if this transaction commits.
    perform net.http_post(
      url := 'https://vjmkdwlluakdbvtvoucn.supabase.co/functions/v1/record-notification',
      body := jsonb_build_object('swimmer_id', v_swimmer, 'kind', v_kind),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hook-secret', private.record_notification_hook_secret()
      ),
      timeout_milliseconds := 10000
    );
  exception when others then
    raise warning 'record notification not queued: %', sqlerrm;
  end;
  return null;
end;
$$;

create trigger notify_new_record after insert or update of live_time_cs, official_time_cs, status_code
  on public.results
  for each row execute function private.notify_new_record();
