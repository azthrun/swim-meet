-- Core schema for swim-meet: lookups, event catalog, people, meets, entries, results,
-- motivational standards, row level security, and sharing RPCs.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lookups (bilingual, written by migrations only)
-- ---------------------------------------------------------------------------

create table public.courses (
  code text primary key,
  name_en text not null,
  name_zh text not null,
  sort_order smallint not null
);

create table public.strokes (
  code text primary key,
  name_en text not null,
  name_zh text not null,
  is_relay boolean not null default false,
  sort_order smallint not null
);

create table public.rounds (
  code text primary key,
  name_en text not null,
  name_zh text not null,
  sort_order smallint not null
);

create table public.result_statuses (
  code text primary key,
  name_en text not null,
  name_zh text not null,
  sort_order smallint not null
);

create table public.genders (
  code text primary key,
  name_en text not null,
  name_zh text not null,
  sort_order smallint not null
);

-- sort_order ascends with speed: a higher value is a faster standard.
create table public.standard_levels (
  code text primary key,
  name_en text not null,
  name_zh text not null,
  sort_order smallint not null
);

create table public.age_groups (
  code text primary key,
  name_en text not null,
  name_zh text not null,
  min_age smallint not null,
  max_age smallint not null,
  sort_order smallint not null,
  check (max_age >= min_age)
);

insert into public.courses (code, name_en, name_zh, sort_order) values
  ('SCY', 'Short Course Yards', '短池（码）', 1),
  ('SCM', 'Short Course Meters', '短池（米）', 2),
  ('LCM', 'Long Course Meters', '长池（米）', 3);

insert into public.strokes (code, name_en, name_zh, is_relay, sort_order) values
  ('FREE', 'Freestyle', '自由泳', false, 1),
  ('BACK', 'Backstroke', '仰泳', false, 2),
  ('BREAST', 'Breaststroke', '蛙泳', false, 3),
  ('FLY', 'Butterfly', '蝶泳', false, 4),
  ('IM', 'Individual Medley', '个人混合泳', false, 5),
  ('FREE_RELAY', 'Freestyle Relay', '自由泳接力', true, 6),
  ('MEDLEY_RELAY', 'Medley Relay', '混合泳接力', true, 7);

insert into public.rounds (code, name_en, name_zh, sort_order) values
  ('TIMED_FINAL', 'Timed Final', '计时决赛', 1),
  ('PRELIM', 'Prelim', '预赛', 2),
  ('FINAL', 'Final', '决赛', 3),
  ('SWIM_OFF', 'Swim-off', '附加赛', 4);

insert into public.result_statuses (code, name_en, name_zh, sort_order) values
  ('SWUM', 'Swum', '完赛', 1),
  ('DQ', 'Disqualified', '犯规', 2),
  ('NS', 'No Show', '未参赛', 3),
  ('SCR', 'Scratched', '退赛', 4);

insert into public.genders (code, name_en, name_zh, sort_order) values
  ('F', 'Female', '女', 1),
  ('M', 'Male', '男', 2);

insert into public.standard_levels (code, name_en, name_zh, sort_order) values
  ('B', 'B', 'B', 1),
  ('BB', 'BB', 'BB', 2),
  ('A', 'A', 'A', 3),
  ('AA', 'AA', 'AA', 4),
  ('AAA', 'AAA', 'AAA', 5),
  ('AAAA', 'AAAA', 'AAAA', 6);

insert into public.age_groups (code, name_en, name_zh, min_age, max_age, sort_order) values
  ('10U', '10 & Under', '10岁及以下', 0, 10, 1),
  ('11_12', '11-12', '11-12岁', 11, 12, 2),
  ('13_14', '13-14', '13-14岁', 13, 14, 3),
  ('15_16', '15-16', '15-16岁', 15, 16, 4),
  ('17_18', '17-18', '17-18岁', 17, 18, 5);

-- ---------------------------------------------------------------------------
-- Event catalog: the valid course x stroke x distance combinations
-- ---------------------------------------------------------------------------

create table public.events (
  id integer generated always as identity primary key,
  course_code text not null references public.courses (code),
  stroke_code text not null references public.strokes (code),
  distance smallint not null check (distance > 0),
  unique (course_code, stroke_code, distance),
  unique (id, course_code)
);

insert into public.events (course_code, stroke_code, distance)
select c.course_code, c.stroke_code, d.distance
from (values
  ('SCY', 'FREE', array[25, 50, 100, 200, 500, 1000, 1650]),
  ('SCM', 'FREE', array[25, 50, 100, 200, 400, 800, 1500]),
  ('LCM', 'FREE', array[50, 100, 200, 400, 800, 1500]),
  ('SCY', 'BACK', array[25, 50, 100, 200]),
  ('SCM', 'BACK', array[25, 50, 100, 200]),
  ('LCM', 'BACK', array[50, 100, 200]),
  ('SCY', 'BREAST', array[25, 50, 100, 200]),
  ('SCM', 'BREAST', array[25, 50, 100, 200]),
  ('LCM', 'BREAST', array[50, 100, 200]),
  ('SCY', 'FLY', array[25, 50, 100, 200]),
  ('SCM', 'FLY', array[25, 50, 100, 200]),
  ('LCM', 'FLY', array[50, 100, 200]),
  ('SCY', 'IM', array[100, 200, 400]),
  ('SCM', 'IM', array[100, 200, 400]),
  ('LCM', 'IM', array[200, 400]),
  ('SCY', 'FREE_RELAY', array[100, 200, 400, 800]),
  ('SCM', 'FREE_RELAY', array[100, 200, 400, 800]),
  ('LCM', 'FREE_RELAY', array[200, 400, 800]),
  ('SCY', 'MEDLEY_RELAY', array[100, 200, 400]),
  ('SCM', 'MEDLEY_RELAY', array[100, 200, 400]),
  ('LCM', 'MEDLEY_RELAY', array[200, 400])
) as c (course_code, stroke_code, distances)
cross join lateral unnest(c.distances) as d (distance)
order by array_position(array['SCY', 'SCM', 'LCM'], c.course_code),
         (select sort_order from public.strokes where code = c.stroke_code),
         d.distance;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.swimmers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null,
  display_name_zh text,
  owner_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null
);
create index swimmers_owner_id_idx on public.swimmers (owner_id);

-- Kept apart from swimmers because swimmers is world-readable and RLS is row level only.
create table public.swimmer_private (
  swimmer_id uuid primary key references public.swimmers (id) on delete cascade,
  date_of_birth date,
  gender_code text references public.genders (code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null
);

create table public.swimmer_editors (
  swimmer_id uuid not null references public.swimmers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (swimmer_id, user_id)
);
create index swimmer_editors_user_id_idx on public.swimmer_editors (user_id);

-- ---------------------------------------------------------------------------
-- Meets, entries, results
-- ---------------------------------------------------------------------------

create table public.meets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_zh text,
  course_code text not null references public.courses (code),
  start_date date not null,
  end_date date not null,
  location text,
  results_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  check (end_date >= start_date),
  unique (name, start_date),
  unique (id, course_code)
);
create index meets_start_date_idx on public.meets (start_date);

-- course_code is copied from the meet so the composite keys can guarantee
-- that an entry's event belongs to the meet's course.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.swimmers (id) on delete cascade,
  meet_id uuid not null,
  course_code text not null,
  event_id integer not null,
  round_code text not null default 'TIMED_FINAL' references public.rounds (code),
  swim_date date not null,
  event_number smallint check (event_number > 0),
  heat smallint check (heat > 0),
  lane smallint check (lane >= 0),
  seed_time_cs integer check (seed_time_cs > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (meet_id, course_code) references public.meets (id, course_code),
  foreign key (event_id, course_code) references public.events (id, course_code),
  unique (swimmer_id, meet_id, event_id, round_code)
);
create index entries_meet_id_idx on public.entries (meet_id);
create index entries_event_id_idx on public.entries (event_id);
create index entries_swimmer_date_idx on public.entries (swimmer_id, swim_date);

-- Times are integer centiseconds. A result row exists once an entry has an outcome.
create table public.results (
  entry_id uuid primary key references public.entries (id) on delete cascade,
  status_code text not null default 'SWUM' references public.result_statuses (code),
  live_time_cs integer check (live_time_cs > 0),
  official_time_cs integer check (official_time_cs > 0),
  official_source text check (official_source in ('MANUAL', 'IMPORT')),
  official_imported_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  check (status_code in ('SWUM', 'DQ') or (live_time_cs is null and official_time_cs is null)),
  check (official_time_cs is null or official_source is not null)
);

-- ---------------------------------------------------------------------------
-- Motivational standards
-- ---------------------------------------------------------------------------

create table public.motivational_standards (
  event_id integer not null references public.events (id),
  age_group_code text not null references public.age_groups (code),
  gender_code text not null references public.genders (code),
  level_code text not null references public.standard_levels (code),
  time_cs integer not null check (time_cs > 0),
  primary key (event_id, age_group_code, gender_code, level_code)
);

-- ---------------------------------------------------------------------------
-- Access helpers (security definer, kept out of the exposed schema)
-- ---------------------------------------------------------------------------

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create function private.owns_swimmer(p_swimmer_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.swimmers s
    where s.id = p_swimmer_id and s.owner_id = auth.uid()
  );
$$;

create function private.can_edit_swimmer(p_swimmer_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
    or private.owns_swimmer(p_swimmer_id)
    or exists (
      select 1 from public.swimmer_editors e
      where e.swimmer_id = p_swimmer_id and e.user_id = auth.uid()
    );
$$;

create function private.can_edit_entry(p_entry_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_edit_swimmer(
    (select e.swimmer_id from public.entries e where e.id = p_entry_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function private.set_audit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger set_audit before insert or update on public.swimmers
  for each row execute function private.set_audit();
create trigger set_audit before insert or update on public.swimmer_private
  for each row execute function private.set_audit();
create trigger set_audit before insert or update on public.meets
  for each row execute function private.set_audit();
create trigger set_audit before insert or update on public.entries
  for each row execute function private.set_audit();
create trigger set_audit before insert or update on public.results
  for each row execute function private.set_audit();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_updated_at before update on public.profiles
  for each row execute function private.touch_updated_at();

create function private.entries_before_write() returns trigger
language plpgsql set search_path = '' as $$
declare
  m record;
begin
  select course_code, start_date, end_date into m from public.meets where id = new.meet_id;
  if not found then
    raise exception 'meet % does not exist', new.meet_id using errcode = '23503';
  end if;
  new.course_code := m.course_code;
  if new.swim_date < m.start_date or new.swim_date > m.end_date then
    raise exception 'swim_date % is outside the meet dates % to %',
      new.swim_date, m.start_date, m.end_date using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger entries_before_write before insert or update on public.entries
  for each row execute function private.entries_before_write();

create function private.meets_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.entries e
    where e.meet_id = new.id
      and (e.swim_date < new.start_date or e.swim_date > new.end_date)
  ) then
    raise exception 'meet dates would exclude existing entries' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger meets_before_update before update of start_date, end_date on public.meets
  for each row execute function private.meets_before_update();

create function private.results_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.official_time_cs is null then
    new.official_source := null;
    new.official_imported_at := null;
  elsif new.official_source is null then
    new.official_source := 'MANUAL';
  end if;
  return new;
end;
$$;

create trigger results_before_write before insert or update on public.results
  for each row execute function private.results_before_write();

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- The first account becomes the admin when no admin exists yet.
update public.profiles set is_admin = true
where id = (select u.id from auth.users u order by u.created_at limit 1)
  and not exists (select 1 from public.profiles p where p.is_admin);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- Best official, swum, individual time per swimmer and event.
create view public.personal_bests with (security_invoker = true) as
select distinct on (e.swimmer_id, e.event_id)
  e.swimmer_id,
  e.event_id,
  r.official_time_cs as time_cs,
  e.id as entry_id,
  e.meet_id,
  e.swim_date
from public.entries e
join public.results r on r.entry_id = e.id
join public.events ev on ev.id = e.event_id
join public.strokes s on s.code = ev.stroke_code
where r.status_code = 'SWUM'
  and r.official_time_cs is not null
  and not s.is_relay
order by e.swimmer_id, e.event_id, r.official_time_cs, e.swim_date;

-- ---------------------------------------------------------------------------
-- Sharing RPCs
-- ---------------------------------------------------------------------------

-- Returns false when no account has that email; never exposes a user list.
create function public.share_swimmer(p_swimmer_id uuid, p_email text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if not (private.owns_swimmer(p_swimmer_id) or private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_user is null then
    return false;
  end if;
  insert into public.swimmer_editors (swimmer_id, user_id, created_by)
  values (p_swimmer_id, v_user, auth.uid())
  on conflict do nothing;
  return true;
end;
$$;

create function public.unshare_swimmer(p_swimmer_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (private.owns_swimmer(p_swimmer_id) or private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.swimmer_editors
  where swimmer_id = p_swimmer_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.share_swimmer(uuid, text) from public, anon;
revoke execute on function public.unshare_swimmer(uuid, uuid) from public, anon;
grant execute on function public.share_swimmer(uuid, text) to authenticated;
grant execute on function public.unshare_swimmer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.courses, public.strokes, public.rounds, public.result_statuses, public.genders,
  public.standard_levels, public.age_groups, public.events, public.motivational_standards,
  public.swimmers, public.meets, public.entries, public.results, public.personal_bests
to anon, authenticated;

grant select on public.profiles, public.swimmer_private, public.swimmer_editors to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, update, delete on
  public.swimmers, public.swimmer_private, public.meets, public.entries, public.results
to authenticated;
grant insert, delete on public.swimmer_editors to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.courses enable row level security;
alter table public.strokes enable row level security;
alter table public.rounds enable row level security;
alter table public.result_statuses enable row level security;
alter table public.genders enable row level security;
alter table public.standard_levels enable row level security;
alter table public.age_groups enable row level security;
alter table public.events enable row level security;
alter table public.motivational_standards enable row level security;
alter table public.profiles enable row level security;
alter table public.swimmers enable row level security;
alter table public.swimmer_private enable row level security;
alter table public.swimmer_editors enable row level security;
alter table public.meets enable row level security;
alter table public.entries enable row level security;
alter table public.results enable row level security;

create policy "public read" on public.courses for select to anon, authenticated using (true);
create policy "public read" on public.strokes for select to anon, authenticated using (true);
create policy "public read" on public.rounds for select to anon, authenticated using (true);
create policy "public read" on public.result_statuses for select to anon, authenticated using (true);
create policy "public read" on public.genders for select to anon, authenticated using (true);
create policy "public read" on public.standard_levels for select to anon, authenticated using (true);
create policy "public read" on public.age_groups for select to anon, authenticated using (true);
create policy "public read" on public.events for select to anon, authenticated using (true);
create policy "public read" on public.motivational_standards for select to anon, authenticated using (true);

create policy "signed-in read" on public.profiles for select to authenticated using (true);
create policy "update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "public read" on public.swimmers for select to anon, authenticated using (true);
create policy "create as owner" on public.swimmers for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "owner or admin update" on public.swimmers for update to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin())
  with check (owner_id = (select auth.uid()) or private.is_admin());
create policy "owner or admin delete" on public.swimmers for delete to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin());

create policy "editors read" on public.swimmer_private for select to authenticated
  using (private.can_edit_swimmer(swimmer_id));
create policy "owner or admin insert" on public.swimmer_private for insert to authenticated
  with check (private.owns_swimmer(swimmer_id) or private.is_admin());
create policy "owner or admin update" on public.swimmer_private for update to authenticated
  using (private.owns_swimmer(swimmer_id) or private.is_admin())
  with check (private.owns_swimmer(swimmer_id) or private.is_admin());
create policy "owner or admin delete" on public.swimmer_private for delete to authenticated
  using (private.owns_swimmer(swimmer_id) or private.is_admin());

create policy "owner, admin or self read" on public.swimmer_editors for select to authenticated
  using (user_id = (select auth.uid()) or private.owns_swimmer(swimmer_id) or private.is_admin());
create policy "owner or admin insert" on public.swimmer_editors for insert to authenticated
  with check (private.owns_swimmer(swimmer_id) or private.is_admin());
create policy "owner, admin or self delete" on public.swimmer_editors for delete to authenticated
  using (user_id = (select auth.uid()) or private.owns_swimmer(swimmer_id) or private.is_admin());

create policy "public read" on public.meets for select to anon, authenticated using (true);
create policy "signed-in insert" on public.meets for insert to authenticated with check (true);
create policy "creator or admin update" on public.meets for update to authenticated
  using (created_by = (select auth.uid()) or private.is_admin())
  with check (created_by = (select auth.uid()) or private.is_admin());
create policy "admin delete" on public.meets for delete to authenticated
  using (private.is_admin());

create policy "public read" on public.entries for select to anon, authenticated using (true);
create policy "editors insert" on public.entries for insert to authenticated
  with check (private.can_edit_swimmer(swimmer_id));
create policy "editors update" on public.entries for update to authenticated
  using (private.can_edit_swimmer(swimmer_id))
  with check (private.can_edit_swimmer(swimmer_id));
create policy "editors delete" on public.entries for delete to authenticated
  using (private.can_edit_swimmer(swimmer_id));

create policy "public read" on public.results for select to anon, authenticated using (true);
create policy "editors insert" on public.results for insert to authenticated
  with check (private.can_edit_entry(entry_id));
create policy "editors update" on public.results for update to authenticated
  using (private.can_edit_entry(entry_id))
  with check (private.can_edit_entry(entry_id));
create policy "editors delete" on public.results for delete to authenticated
  using (private.can_edit_entry(entry_id));
