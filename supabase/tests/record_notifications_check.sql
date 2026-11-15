-- Record notifications check (ADR 0006). Runs inside a transaction and rolls back, so it is safe
-- against the hosted database: pg_net only sends what a committed transaction queued, so nothing
-- here ever reaches the Edge Function. Any failed expectation raises and aborts.
begin;
do $$
declare
  v_admin uuid := (select id from public.profiles where is_admin limit 1);
  v_swimmer uuid;
  v_quiet uuid;
  v_meet uuid;
  v_entry uuid;
  v_entry2 uuid;
  v_event int := (select id from public.events where course_code = 'SCY' and stroke_code = 'FREE' and distance = 50);
  v_event2 int := (select id from public.events where course_code = 'SCY' and stroke_code = 'FREE' and distance = 100);
  v_ep text := 'https://fcm.googleapis.com/fcm/send/notify-check';
  v_p256dh text := 'B' || repeat('a', 86);
  v_auth text := repeat('b', 22);
  v_secret text := private.record_notification_hook_secret();
  n int;
begin
  if v_admin is null then raise exception 'FAIL no admin profile to run the check as'; end if;
  if v_secret is null then raise exception 'FAIL no hook secret in Vault'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.swimmers (slug, display_name, display_name_zh) values ('notify-check', 'Notify Check', '通知') returning id into v_swimmer;
  insert into public.swimmers (slug, display_name) values ('notify-check-quiet', 'Quiet') returning id into v_quiet;
  insert into public.meets (name, course_code, start_date, end_date) values ('Notify Check Meet', 'SCY', '2026-01-10', '2026-01-11') returning id into v_meet;
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date) values (v_swimmer, v_meet, 'SCY', v_event, '2026-01-10') returning id into v_entry;
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date) values (v_swimmer, v_meet, 'SCY', v_event2, '2026-01-10') returning id into v_entry2;

  -- anon subscribes; cannot read the tables or claim
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  perform public.subscribe_to_swimmer(v_ep, v_p256dh, v_auth, v_swimmer);
  perform public.subscribe_to_swimmer(v_ep, v_p256dh, v_auth, v_swimmer);
  select count(*) into n from public.subscribed_swimmers(v_ep); if n <> 1 then raise exception 'FAIL subscribe twice, got %', n; end if;
  begin perform public.subscribe_to_swimmer('https://evil.example.com/x', v_p256dh, v_auth, v_swimmer); raise exception 'FAIL non-push endpoint accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.subscribe_to_swimmer(v_ep, 'short', v_auth, v_swimmer); raise exception 'FAIL bad keys accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.subscribe_to_swimmer(v_ep, v_p256dh, v_auth, gen_random_uuid()); raise exception 'FAIL unknown swimmer accepted';
  exception when foreign_key_violation then null; end;
  begin select count(*) into n from public.record_subscriptions; raise exception 'FAIL anon reads subscriptions';
  exception when insufficient_privilege then null; end;
  begin select count(*) into n from public.push_endpoints; raise exception 'FAIL anon reads endpoints';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_record_notification(v_secret, v_swimmer, 'live'); raise exception 'FAIL anon claims';
  exception when insufficient_privilege then null; end;
  begin perform private.record_notification_hook_secret(); raise exception 'FAIL anon reads the hook secret';
  exception when insufficient_privilege then null; end;

  -- signed-in callers are no different
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin select count(*) into n from public.record_subscriptions; raise exception 'FAIL signed-in reads subscriptions';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_record_notification(v_secret, v_swimmer, 'live'); raise exception 'FAIL signed-in claims';
  exception when insufficient_privilege then null; end;

  -- the trigger: queues a call only when a time goes from empty to filled on a swum result.
  -- Written as the signed-in admin, as the site does; the trigger runs as its own definer. Only the
  -- table owner can read the pg_net queue, so each read drops the role and takes it back after.
  -- Only calls naming this check's swimmers are counted, since other sessions may be queueing
  -- their own; the body is matched as bytes, as theirs may not be JSON.
  insert into public.results (entry_id, live_time_cs) values (v_entry, 3050);
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 1 then raise exception 'FAIL live insert queued %', n; end if;
  if (select convert_from(body, 'utf8')::jsonb from net.http_request_queue
      where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 order by id desc limit 1) is distinct from
     (jsonb_build_object('swimmer_id', v_swimmer, 'kind', 'live')) then
    raise exception 'FAIL live payload';
  end if;
  if (select (url, headers->>'x-hook-secret') from net.http_request_queue
      where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 order by id desc limit 1) is distinct from
     ('https://vjmkdwlluakdbvtvoucn.supabase.co/functions/v1/record-notification'::text, v_secret) then
    raise exception 'FAIL call url or hook secret';
  end if;
  set local role authenticated;
  update public.results set live_time_cs = 3040 where entry_id = v_entry;
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 1 then raise exception 'FAIL live correction queued'; end if;
  set local role authenticated;
  update public.results set notes = 'x' where entry_id = v_entry;
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 1 then raise exception 'FAIL notes change queued'; end if;
  set local role authenticated;
  update public.results set official_time_cs = 3041 where entry_id = v_entry;
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 2 then raise exception 'FAIL official after live not queued'; end if;
  if (select convert_from(body, 'utf8')::jsonb from net.http_request_queue
      where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 order by id desc limit 1) is distinct from
     (jsonb_build_object('swimmer_id', v_swimmer, 'kind', 'official')) then
    raise exception 'FAIL official payload';
  end if;
  set local role authenticated;
  update public.results set official_time_cs = 3042 where entry_id = v_entry;
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 2 then raise exception 'FAIL official correction queued'; end if;
  -- both at once: one call, official
  set local role authenticated;
  insert into public.results (entry_id, live_time_cs, official_time_cs) values (v_entry2, 6000, 6001);
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 3 then raise exception 'FAIL both at once queued %', n - 2; end if;
  if (select convert_from(body, 'utf8')::jsonb from net.http_request_queue
      where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 order by id desc limit 1) is distinct from
     (jsonb_build_object('swimmer_id', v_swimmer, 'kind', 'official')) then
    raise exception 'FAIL both at once is not official';
  end if;
  -- a DQ with a time is silent, and so is turning it back into a swim with the same time;
  -- clearing and refilling a time is a new time
  set local role authenticated;
  update public.results set official_time_cs = null, live_time_cs = null where entry_id = v_entry2;
  update public.results set status_code = 'DQ', live_time_cs = 6100 where entry_id = v_entry2;
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 3 then raise exception 'FAIL DQ queued'; end if;
  set local role authenticated;
  update public.results set status_code = 'SWUM' where entry_id = v_entry2;
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 3 then raise exception 'FAIL DQ back to SWUM queued'; end if;
  set local role authenticated;
  update public.results set live_time_cs = null where entry_id = v_entry2;
  update public.results set live_time_cs = 6200 where entry_id = v_entry2;
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 4 then raise exception 'FAIL refilled time not queued'; end if;
  -- nobody follows this swimmer: no call
  set local role authenticated;
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date) values (v_quiet, v_meet, 'SCY', v_event, '2026-01-10') returning id into v_entry2;
  insert into public.results (entry_id, live_time_cs) values (v_entry2, 3000);
  reset role;
  select count(*) into n from net.http_request_queue where position(convert_to(v_swimmer::text, 'utf8') in body) > 0 or position(convert_to(v_quiet::text, 'utf8') in body) > 0;
  if n <> 4 then raise exception 'FAIL unfollowed swimmer queued'; end if;

  -- claim (service role): wrong secret refused; then once per 10 minutes per kind
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  set local role service_role;
  begin perform public.claim_record_notification('wrong', v_swimmer, 'live'); raise exception 'FAIL wrong secret claims';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_record_notification(v_secret, v_swimmer, 'bogus'); raise exception 'FAIL bogus kind claims';
  exception when invalid_parameter_value then null; end;
  select count(*) into n from public.claim_record_notification(v_secret, v_swimmer, 'live') where slug = 'notify-check' and name_zh = '通知';
  if n <> 1 then raise exception 'FAIL first live claim, got %', n; end if;
  select count(*) into n from public.claim_record_notification(v_secret, v_swimmer, 'live'); if n <> 0 then raise exception 'FAIL live claimed twice in 10 minutes'; end if;
  select count(*) into n from public.claim_record_notification(v_secret, v_swimmer, 'official'); if n <> 1 then raise exception 'FAIL official throttled by live'; end if;
  update public.record_subscriptions set last_live_sent_at = now() - interval '11 minutes' where endpoint = v_ep;
  select count(*) into n from public.claim_record_notification(v_secret, v_swimmer, 'live'); if n <> 1 then raise exception 'FAIL live not due after 10 minutes'; end if;
  -- the function removes a gone endpoint, and its subscriptions with it
  delete from public.push_endpoints where endpoint = v_ep;
  select count(*) into n from public.record_subscriptions where endpoint = v_ep; if n <> 0 then raise exception 'FAIL endpoint delete left subscriptions'; end if;

  -- the cap: 50 swimmers per device, and resubscribing at the cap still works
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  perform public.subscribe_to_swimmer(v_ep, v_p256dh, v_auth, v_swimmer);
  reset role;
  insert into public.swimmers (slug, display_name, owner_id)
  select 'notify-check-filler-' || g, 'Filler', v_admin from generate_series(1, 49) g;
  insert into public.record_subscriptions (endpoint, swimmer_id)
  select v_ep, id from public.swimmers where slug like 'notify-check-filler-%';
  select count(*) into n from public.record_subscriptions where endpoint = v_ep; if n <> 50 then raise exception 'FAIL cap setup, got %', n; end if;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  perform public.subscribe_to_swimmer(v_ep, v_p256dh, v_auth, v_swimmer);
  begin perform public.subscribe_to_swimmer(v_ep, v_p256dh, v_auth, v_quiet); raise exception 'FAIL 51st swimmer accepted';
  exception when program_limit_exceeded then null; end;

  -- the cap: 500 devices per swimmer, and resubscribing at the cap still works
  reset role;
  insert into public.push_endpoints (endpoint, p256dh, auth)
  select 'https://fcm.googleapis.com/fcm/send/notify-check-' || g, v_p256dh, v_auth from generate_series(1, 499) g;
  insert into public.record_subscriptions (endpoint, swimmer_id)
  select 'https://fcm.googleapis.com/fcm/send/notify-check-' || g, v_swimmer from generate_series(1, 499) g;
  select count(*) into n from public.record_subscriptions where swimmer_id = v_swimmer; if n <> 500 then raise exception 'FAIL swimmer cap setup, got %', n; end if;
  set local role anon;
  begin perform public.subscribe_to_swimmer(v_ep || '-new', v_p256dh, v_auth, v_swimmer); raise exception 'FAIL 501st device accepted';
  exception when program_limit_exceeded then null; end;
  perform public.subscribe_to_swimmer('https://fcm.googleapis.com/fcm/send/notify-check-1', v_p256dh, v_auth, v_swimmer);

  -- unsubscribing the last swimmer removes the endpoint
  perform public.unsubscribe_from_swimmer(v_ep, v_swimmer);
  select count(*) into n from public.subscribed_swimmers(v_ep); if n <> 49 then raise exception 'FAIL unsubscribe, got %', n; end if;
  reset role;
  delete from public.record_subscriptions where endpoint = v_ep and swimmer_id <> v_quiet;
  insert into public.record_subscriptions (endpoint, swimmer_id) values (v_ep, v_quiet);
  set local role anon;
  perform public.unsubscribe_from_swimmer(v_ep, v_quiet);
  reset role;
  if exists (select 1 from public.push_endpoints where endpoint = v_ep) then raise exception 'FAIL empty endpoint kept'; end if;

  raise notice 'Record notifications check passed';
end $$;
rollback;
