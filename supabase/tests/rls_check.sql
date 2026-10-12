-- RLS and integrity smoke check. Runs inside a transaction and rolls back, so it is safe
-- against the hosted database. Any failed expectation raises and aborts.
begin;
do $$
declare
  v_admin uuid := (select id from public.profiles where is_admin limit 1);
  v_admin_email text := (select u.email from auth.users u join public.profiles p on p.id = u.id where p.is_admin limit 1);
  v_other uuid := gen_random_uuid();
  v_long uuid := gen_random_uuid();
  v_swimmer uuid;
  v_meet uuid;
  v_entry uuid;
  v_bare uuid;
  v_bare_entry uuid;
  v_relay uuid;
  v_dq uuid;
  v_live uuid;
  v_slow uuid;
  v_level text;
  v_gap int;
  v_event int := (select id from public.events where course_code = 'SCY' and stroke_code = 'FREE' and distance = 50);
  v_lcm_event int := (select id from public.events where course_code = 'LCM' and stroke_code = 'FREE' and distance = 50);
  n int;
  ok boolean;
begin
  if v_admin is null then raise exception 'FAIL no admin profile to run the check as'; end if;

  -- a second, non-admin account
  insert into auth.users (id, instance_id, aud, role, email)
  values (v_other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-check@example.test');
  if not exists (select 1 from public.profiles where id = v_other and not is_admin) then raise exception 'FAIL profile trigger'; end if;

  -- an email whose local part is longer than a display name may be still gets a profile
  insert into auth.users (id, instance_id, aud, role, email)
  values (v_long, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', repeat('a', 60) || '@example.test');
  if (select char_length(display_name) from public.profiles where id = v_long) is distinct from 50 then raise exception 'FAIL long email profile'; end if;

  -- admin creates swimmer, private row, meet, entry, result
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.swimmers (slug, display_name) values ('rls-check', 'RLS Check') returning id into v_swimmer;
  insert into public.swimmer_private (swimmer_id, date_of_birth, gender_code) values (v_swimmer, '2015-01-01', 'M');
  insert into public.meets (name, course_code, start_date, end_date) values ('RLS Check Meet', 'SCY', '2026-01-10', '2026-01-11') returning id into v_meet;
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date) values (v_swimmer, v_meet, 'SCY', v_event, '2026-01-10') returning id into v_entry;
  insert into public.results (entry_id, official_time_cs) values (v_entry, 3012);
  if (select official_source from public.results where entry_id = v_entry) <> 'MANUAL' then raise exception 'FAIL official_source default'; end if;
  if (select time_cs from public.personal_bests where swimmer_id = v_swimmer) <> 3012 then raise exception 'FAIL personal_bests'; end if;

  -- integrity: wrong-course event, out-of-range date
  begin
    insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date) values (v_swimmer, v_meet, 'LCM', v_lcm_event, '2026-01-10');
    raise exception 'FAIL wrong-course event accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.entries (swimmer_id, meet_id, course_code, event_id, round_code, swim_date) values (v_swimmer, v_meet, 'SCY', v_event, 'FINAL', '2026-02-01');
    raise exception 'FAIL out-of-range date accepted';
  exception when check_violation then null; end;

  -- anon: reads public, not private; cannot write
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.swimmers where id = v_swimmer; if n <> 1 then raise exception 'FAIL anon read swimmers'; end if;
  select count(*) into n from public.results where entry_id = v_entry; if n <> 1 then raise exception 'FAIL anon read results'; end if;
  begin select count(*) into n from public.swimmer_private; raise exception 'FAIL anon read swimmer_private';
  exception when insufficient_privilege then null; end;
  begin select count(*) into n from public.profiles; raise exception 'FAIL anon read profiles';
  exception when insufficient_privilege then null; end;
  begin insert into public.meets (name, course_code, start_date, end_date) values ('x', 'SCY', '2026-01-10', '2026-01-10'); raise exception 'FAIL anon insert meet';
  exception when insufficient_privilege then null; end;
  begin update public.results set official_time_cs = 1 where entry_id = v_entry; raise exception 'FAIL anon update result';
  exception when insufficient_privilege then null; end;
  begin perform public.share_swimmer(v_swimmer, 'rls-check@example.test'); raise exception 'FAIL anon share';
  exception when insufficient_privilege then null; end;

  -- non-editor account: no private read, no edits, no self-promotion
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.swimmer_private; if n <> 0 then raise exception 'FAIL non-editor reads private'; end if;
  update public.results set official_time_cs = 1 where entry_id = v_entry; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL non-editor updates result'; end if;
  update public.swimmers set display_name = 'x' where id = v_swimmer; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL non-editor updates swimmer'; end if;
  update public.meets set name = 'x' where id = v_meet; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL non-creator updates meet'; end if;
  delete from public.entries where id = v_entry; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL non-editor deletes entry'; end if;
  begin insert into public.entries (swimmer_id, meet_id, course_code, event_id, round_code, swim_date) values (v_swimmer, v_meet, 'SCY', v_event, 'PRELIM', '2026-01-10'); raise exception 'FAIL non-editor inserts entry';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set is_admin = true where id = v_other; raise exception 'FAIL self-promotion';
  exception when insufficient_privilege then null; end;
  begin perform public.share_swimmer(v_swimmer, 'rls-check@example.test'); raise exception 'FAIL non-owner share';
  exception when insufficient_privilege then null; end;
  begin insert into public.swimmers (slug, display_name, owner_id) values ('stolen', 'x', v_admin); raise exception 'FAIL insert swimmer for someone else';
  exception when insufficient_privilege then null; end;

  -- owner shares; shared editor can now edit results but not the swimmer or meets
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.share_swimmer(v_swimmer, 'nobody@example.test') into ok; if ok then raise exception 'FAIL share unknown email'; end if;
  select public.share_swimmer(v_swimmer, 'RLS-Check@example.test') into ok; if not ok then raise exception 'FAIL share'; end if;
  select public.share_swimmer(v_swimmer, 'rls-check@example.test') into ok; if not ok then raise exception 'FAIL share again'; end if;
  select count(*) into n from public.swimmer_editors where swimmer_id = v_swimmer; if n <> 1 then raise exception 'FAIL sharing twice adds a row'; end if;
  -- sharing with the owner's own email finds the account and adds nobody
  select public.share_swimmer(v_swimmer, upper(v_admin_email)) into ok; if not ok then raise exception 'FAIL share with owner'; end if;
  select count(*) into n from public.swimmer_editors where swimmer_id = v_swimmer and user_id = v_admin; if n <> 0 then raise exception 'FAIL owner got a share row'; end if;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.results set live_time_cs = 3020 where entry_id = v_entry; get diagnostics n = row_count; if n <> 1 then raise exception 'FAIL shared editor cannot update result'; end if;
  select count(*) into n from public.swimmer_private where swimmer_id = v_swimmer; if n <> 1 then raise exception 'FAIL shared editor cannot read private'; end if;
  update public.swimmers set display_name = 'x' where id = v_swimmer; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL shared editor updates swimmer'; end if;
  delete from public.meets where id = v_meet; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL non-admin deletes meet'; end if;

  -- display name: own row only, not blank, 50 characters at most
  update public.profiles set display_name = repeat('陈', 50) where id = v_other; get diagnostics n = row_count; if n <> 1 then raise exception 'FAIL own display name'; end if;
  update public.profiles set display_name = 'x' where id = v_admin; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL changes another display name'; end if;
  begin update public.profiles set display_name = repeat('a', 51) where id = v_other; raise exception 'FAIL 51 character display name';
  exception when check_violation then null; end;
  begin update public.profiles set display_name = '   ' where id = v_other; raise exception 'FAIL blank display name';
  exception when check_violation then null; end;

  -- ---------------------------------------------------------------------------
  -- Motivational standard levels
  -- ---------------------------------------------------------------------------
  -- The swimmer is a boy born 2015-01-01 with a 30.12 in the SCY 50 Freestyle, at a meet that
  -- starts 2026-01-10. He is 11 that day: BB (30.49) reached, 2.03 off A (28.09).
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- results that never get a level: a relay, a disqualified swim, a live-only time
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date)
  values (v_swimmer, v_meet, 'SCY', (select id from public.events where course_code = 'SCY' and stroke_code = 'FREE_RELAY' and distance = 200), '2026-01-10') returning id into v_relay;
  insert into public.results (entry_id, official_time_cs) values (v_relay, 10000);
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date)
  values (v_swimmer, v_meet, 'SCY', (select id from public.events where course_code = 'SCY' and stroke_code = 'FREE' and distance = 100), '2026-01-10') returning id into v_dq;
  insert into public.results (entry_id, status_code, official_time_cs) values (v_dq, 'DQ', 5000);
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date)
  values (v_swimmer, v_meet, 'SCY', (select id from public.events where course_code = 'SCY' and stroke_code = 'FREE' and distance = 200), '2026-01-10') returning id into v_live;
  insert into public.results (entry_id, live_time_cs) values (v_live, 11000);
  -- slower than B (6:59.89): no level, and a gap to B
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date)
  values (v_swimmer, v_meet, 'SCY', (select id from public.events where course_code = 'SCY' and stroke_code = 'FREE' and distance = 500), '2026-01-10') returning id into v_slow;
  insert into public.results (entry_id, official_time_cs) values (v_slow, 42000);
  -- a swimmer with no private row at all
  insert into public.swimmers (slug, display_name) values ('rls-check-bare', 'RLS Check Bare') returning id into v_bare;
  insert into public.entries (swimmer_id, meet_id, course_code, event_id, swim_date) values (v_bare, v_meet, 'SCY', v_event, '2026-01-10') returning id into v_bare_entry;
  insert into public.results (entry_id, official_time_cs) values (v_bare_entry, 3012);

  -- an editor gets the level and the gap
  select level_code into v_level from public.standard_levels(v_swimmer) where entry_id = v_entry;
  if v_level is distinct from 'BB' then raise exception 'FAIL level, got %', v_level; end if;
  select count(*) into n from public.standard_levels(v_swimmer); if n <> 1 then raise exception 'FAIL relay, DQ, live-only or slower than B got a level'; end if;
  select next_level_code, gap_cs into v_level, v_gap from public.standard_gaps(v_swimmer) where entry_id = v_entry;
  if v_level is distinct from 'A' or v_gap is distinct from 203 then raise exception 'FAIL gap, got % %', v_gap, v_level; end if;
  select next_level_code, gap_cs into v_level, v_gap from public.standard_gaps(v_swimmer) where entry_id = v_slow;
  if v_level is distinct from 'B' or v_gap is distinct from 11 then raise exception 'FAIL gap to B, got % %', v_gap, v_level; end if;
  select count(*) into n from public.standard_gaps(v_swimmer); if n <> 2 then raise exception 'FAIL relay, DQ or live-only got a gap'; end if;
  select count(*) into n from public.standard_levels(v_bare); if n <> 0 then raise exception 'FAIL level without a private row'; end if;
  select count(*) into n from public.standard_gaps(v_bare); if n <> 0 then raise exception 'FAIL gap without a private row'; end if;

  -- signed out: the level, in two columns, and nothing else
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select level_code into v_level from public.standard_levels(v_swimmer) where entry_id = v_entry;
  if v_level is distinct from 'BB' then raise exception 'FAIL anon level, got %', v_level; end if;
  select count(*) into n from public.standard_levels(v_swimmer); if n <> 1 then raise exception 'FAIL anon level count'; end if;
  if (select array_agg(k order by k) from public.standard_levels(v_swimmer) l, jsonb_object_keys(to_jsonb(l)) k) <> array['entry_id', 'level_code'] then raise exception 'FAIL standard_levels returns more than entry and level'; end if;
  begin select count(*) into n from public.standard_gaps(v_swimmer); raise exception 'FAIL anon reads gaps';
  exception when insufficient_privilege then null; end;
  begin select count(*) into n from private.standard_progress(v_swimmer); raise exception 'FAIL anon reads standard_progress';
  exception when insufficient_privilege then null; end;

  -- a signed-in account that cannot edit the swimmer: the level, no gap
  reset role;
  delete from public.swimmer_editors where swimmer_id = v_swimmer and user_id = v_other;
  perform set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.standard_levels(v_swimmer); if n <> 1 then raise exception 'FAIL non-editor level'; end if;
  select count(*) into n from public.standard_gaps(v_swimmer); if n <> 0 then raise exception 'FAIL non-editor reads gaps'; end if;
  begin select count(*) into n from private.standard_progress(v_swimmer); raise exception 'FAIL non-editor reads standard_progress';
  exception when insufficient_privilege then null; end;

  -- age is the age on the first day of the meet, not on the day of the swim
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.entries set swim_date = '2026-01-11' where id = v_entry;
  -- turns 11 on the second day, the day he swims: still 10 & under, where 30.12 is an A (31.09)
  update public.swimmer_private set date_of_birth = '2015-01-11' where swimmer_id = v_swimmer;
  select level_code into v_level from public.standard_levels(v_swimmer) where entry_id = v_entry;
  if v_level is distinct from 'A' then raise exception 'FAIL 10 on the first day, got %', v_level; end if;
  select gap_cs into v_gap from public.standard_gaps(v_swimmer) where entry_id = v_entry;
  if v_gap is distinct from 23 then raise exception 'FAIL 10 & under gap, got %', v_gap; end if;
  -- turns 11 on the first day: 11-12
  update public.swimmer_private set date_of_birth = '2015-01-10' where swimmer_id = v_swimmer;
  select level_code into v_level from public.standard_levels(v_swimmer) where entry_id = v_entry;
  if v_level is distinct from 'BB' then raise exception 'FAIL 11 on the first day, got %', v_level; end if;
  -- 18 on the first day still has standards; 19 is older than the oldest age group
  update public.swimmer_private set date_of_birth = '2007-01-11' where swimmer_id = v_swimmer;
  select count(*) into n from public.standard_levels(v_swimmer); if n <> 0 then raise exception 'FAIL 30.12 is no level at 17-18'; end if;
  select count(*) into n from public.standard_gaps(v_swimmer) where entry_id = v_entry and next_level_code = 'B'; if n <> 1 then raise exception 'FAIL 18 on the first day has no standards'; end if;
  update public.swimmer_private set date_of_birth = '2007-01-10' where swimmer_id = v_swimmer;
  select count(*) into n from public.standard_gaps(v_swimmer); if n <> 0 then raise exception 'FAIL 19 on the first day has standards'; end if;
  -- the top level has no gap
  update public.swimmer_private set date_of_birth = '2015-01-01' where swimmer_id = v_swimmer;
  update public.results set official_time_cs = 2000 where entry_id = v_entry;
  select level_code into v_level from public.standard_levels(v_swimmer) where entry_id = v_entry;
  if v_level is distinct from 'AAAA' then raise exception 'FAIL top level, got %', v_level; end if;
  select count(*) into n from public.standard_gaps(v_swimmer) where entry_id = v_entry; if n <> 0 then raise exception 'FAIL gap at the top level'; end if;
  -- no level without a date of birth, or without a gender
  update public.swimmer_private set date_of_birth = null where swimmer_id = v_swimmer;
  select count(*) into n from public.standard_levels(v_swimmer); if n <> 0 then raise exception 'FAIL level without date of birth'; end if;
  select count(*) into n from public.standard_gaps(v_swimmer); if n <> 0 then raise exception 'FAIL gap without date of birth'; end if;
  update public.swimmer_private set date_of_birth = '2015-01-01', gender_code = null where swimmer_id = v_swimmer;
  select count(*) into n from public.standard_levels(v_swimmer); if n <> 0 then raise exception 'FAIL level without gender'; end if;

  reset role;
  raise notice 'RLS check passed';
end $$;
rollback;
