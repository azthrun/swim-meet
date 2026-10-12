-- Motivational standard levels, computed where date of birth lives (ADR 0002).
-- Callers get an entry and a level code; date of birth, gender, age and age group stay here.

-- ---------------------------------------------------------------------------
-- The one place that reads swimmer_private for standards
-- ---------------------------------------------------------------------------

-- One row per official, swum, individual result of the swimmer that has standards to be
-- measured against: the fastest level it reached, and the next level up with how far off it is.
-- Age is the age on the first day of the meet. No row when date of birth or gender is missing,
-- when the swimmer is older than the oldest age group, or when the event has no standards for
-- the age group. Takes a swimmer and nothing else, so a caller cannot try other dates or times.
create function private.standard_progress(p_swimmer_id uuid)
returns table (entry_id uuid, level_code text, next_level_code text, gap_cs integer)
language sql stable security definer set search_path = '' as $$
  with swum as (
    select e.id as entry_id, e.event_id, r.official_time_cs as time_cs, sp.gender_code,
      extract(year from age(m.start_date, sp.date_of_birth))::integer as age
    from public.entries e
    join public.results r on r.entry_id = e.id
    join public.meets m on m.id = e.meet_id
    join public.events ev on ev.id = e.event_id
    join public.strokes s on s.code = ev.stroke_code
    join public.swimmer_private sp on sp.swimmer_id = e.swimmer_id
    where e.swimmer_id = p_swimmer_id
      and r.status_code = 'SWUM'
      and r.official_time_cs is not null
      and not s.is_relay
      and sp.date_of_birth is not null
      and sp.gender_code is not null
  ),
  cuts as (
    select w.entry_id, w.time_cs, ms.level_code, ms.time_cs as cut_cs, sl.sort_order
    from swum w
    join public.age_groups ag on w.age between ag.min_age and ag.max_age
    join public.motivational_standards ms
      on ms.event_id = w.event_id and ms.age_group_code = ag.code and ms.gender_code = w.gender_code
    join public.standard_levels sl on sl.code = ms.level_code
  )
  select w.entry_id, reached.level_code, upward.level_code, upward.gap_cs
  from swum w
  left join lateral (
    select c.level_code from cuts c
    where c.entry_id = w.entry_id and c.time_cs <= c.cut_cs
    order by c.sort_order desc limit 1
  ) reached on true
  left join lateral (
    select c.level_code, c.time_cs - c.cut_cs as gap_cs from cuts c
    where c.entry_id = w.entry_id and c.time_cs > c.cut_cs
    order by c.sort_order limit 1
  ) upward on true
  where reached.level_code is not null or upward.level_code is not null;
$$;

revoke execute on function private.standard_progress(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What the API may ask
-- ---------------------------------------------------------------------------

-- Public: the level each result reached. A result slower than B is left out.
create function public.standard_levels(p_swimmer_id uuid)
returns table (entry_id uuid, level_code text)
language sql stable security definer set search_path = '' as $$
  select p.entry_id, p.level_code
  from private.standard_progress(p_swimmer_id) p
  where p.level_code is not null;
$$;

-- Editors only: the gap to the next level. A result's time less its gap is a standard's time,
-- and motivational_standards is public, so a gap names the age group and gender outright.
-- Editors can read both already; anyone else gets no rows.
create function public.standard_gaps(p_swimmer_id uuid)
returns table (entry_id uuid, next_level_code text, gap_cs integer)
language sql stable security definer set search_path = '' as $$
  select p.entry_id, p.next_level_code, p.gap_cs
  from private.standard_progress(p_swimmer_id) p
  where p.next_level_code is not null
    and private.can_edit_swimmer(p_swimmer_id);
$$;

revoke execute on function public.standard_levels(uuid) from public;
revoke execute on function public.standard_gaps(uuid) from public, anon;
grant execute on function public.standard_levels(uuid) to anon, authenticated;
grant execute on function public.standard_gaps(uuid) to authenticated;
