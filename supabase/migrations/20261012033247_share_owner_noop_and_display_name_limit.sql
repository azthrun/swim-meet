-- Two guards the frontend already keeps, now kept by the database as well.

-- ---------------------------------------------------------------------------
-- Sharing a swimmer with its owner adds nobody
-- ---------------------------------------------------------------------------

-- The owner can edit without a share row, so sharing with the owner's own email is answered
-- "that account exists" and writes nothing. Before this, it left a swimmer_editors row for the owner.
create or replace function public.share_swimmer(p_swimmer_id uuid, p_email text) returns boolean
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
  if exists (select 1 from public.swimmers s where s.id = p_swimmer_id and s.owner_id = v_user) then
    return true;
  end if;
  insert into public.swimmer_editors (swimmer_id, user_id, created_by)
  values (p_swimmer_id, v_user, auth.uid())
  on conflict do nothing;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Display name: not blank, 50 characters at most
-- ---------------------------------------------------------------------------

-- A new account's name comes from its sign-up metadata or the local part of its email, which
-- may run to 64 characters. Cut to fit, so the check below can never refuse a new account.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(left(btrim(new.raw_user_meta_data ->> 'display_name'), 50)), ''),
      left(split_part(new.email, '@', 1), 50)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.profiles
  add constraint profiles_display_name_check
  check (btrim(display_name) <> '' and char_length(display_name) <= 50);
