-- Friends: usernames, friend requests and the friends list (Friends & Rooms page).
--   * profiles.username: unique public handle, a-z 0-9 . _ (3..30, starts and ends with a letter or digit).
--     Generated at sign-up and backfilled for existing accounts; the owner can change it (column grant + RLS).
--   * friendships: one row per pair. pending = request sent, accepted = friends. Declining or removing deletes the row.
--     Clients never write the table: send_friend_request / respond_friend_request / remove_friendship do.
--   * profiles become readable for friends and for the two people in a pending request (to show names).
-- Being friends gives no access to rooms or memories; joining a room still needs its invite code.
-- NOT applied to the hosted project yet: Sea pushes it after review (docs/TEAM-ONBOARDING.md, section 6).

-- ---------------------------------------------------------------------------
-- usernames
-- ---------------------------------------------------------------------------

-- A free username built from p_base (e.g. the e-mail local part): lowercased, invalid characters dropped,
-- '.1234' style suffix when taken. Internal: used by the sign-up trigger and the backfill only.
create or replace function public.unique_username(p_base text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_slug text;
  v_candidate text;
  v_attempt int := 0;
begin
  v_slug := lower(coalesce(p_base, ''));
  v_slug := regexp_replace(v_slug, '[^a-z0-9._]', '', 'g');
  v_slug := regexp_replace(left(v_slug, 24), '^[._]+|[._]+$', '', 'g');
  if char_length(v_slug) < 3 then
    v_slug := 'friend';
  end if;

  v_candidate := v_slug;
  while exists (select 1 from public.profiles where username = v_candidate) loop
    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'could not find a free username for %', v_slug;
    end if;
    v_candidate := v_slug || '.' || lpad(floor(random() * 10000)::int::text, 4, '0');
  end loop;
  return v_candidate;
end;
$$;

alter table public.profiles add column username text
  check (username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$');

do $$
declare
  r record;
begin
  for r in
    select p.user_id, split_part(coalesce(u.email, p.display_name), '@', 1) as base
    from public.profiles p
    left join auth.users u on u.id = p.user_id
    where p.username is null
    order by p.created_at
  loop
    update public.profiles set username = public.unique_username(r.base) where user_id = r.user_id;
  end loop;
end $$;

alter table public.profiles alter column username set not null;
create unique index profiles_username_key on public.profiles (username);

-- sign-up: same as before, plus a username (the requested one if valid and free, else one from the e-mail)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text;
  wanted text;
  handle text;
begin
  name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if name is null then
    name := split_part(coalesce(new.email, 'friend'), '@', 1);
  end if;

  wanted := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if wanted ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' and not exists (select 1 from public.profiles where username = wanted) then
    handle := wanted;
  else
    handle := public.unique_username(split_part(coalesce(new.email, name), '@', 1));
  end if;

  insert into public.profiles (user_id, display_name, username)
  values (new.id, left(coalesce(nullif(name, ''), 'friend'), 50), handle);
  return new;
end;
$$;

grant update (display_name, bio, username) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (user_id) on delete cascade,
  addressee_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  check ((status = 'accepted') = (responded_at is not null))
);

-- one row per pair, whichever direction it was sent in
create unique index friendships_pair_key on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

revoke all on public.friendships from anon, authenticated, public;
grant select on public.friendships to authenticated;
alter table public.friendships enable row level security;

create policy friendships_select_own on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

-- true when the caller and p_user_id are friends or one has a pending request to the other
create or replace function public.has_friendship_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = p_user_id)
       or (f.addressee_id = auth.uid() and f.requester_id = p_user_id)
  );
$$;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.shares_room_with(user_id) or public.has_friendship_with(user_id));

-- ---------------------------------------------------------------------------
-- RPC: send_friend_request(username)
--   no session -> UNAUTHENTICATED; unknown username -> NOT_FOUND; yourself -> VALIDATION_ERROR
--   already friends, or you already asked -> CONFLICT
--   they already asked you -> their request is accepted (no second row)
-- Returns { friendship_id, status }.
-- ---------------------------------------------------------------------------

create or replace function public.send_friend_request(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := lower(ltrim(btrim(coalesce(p_username, '')), '@'));
  v_target uuid;
  v_row public.friendships;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select user_id into v_target from public.profiles where username = v_handle;
  if v_target is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_target = v_uid then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  select * into v_row from public.friendships
  where least(requester_id, addressee_id) = least(v_uid, v_target)
    and greatest(requester_id, addressee_id) = greatest(v_uid, v_target)
  for update;

  if found then
    if v_row.status = 'pending' and v_row.addressee_id = v_uid then
      update public.friendships set status = 'accepted', responded_at = now() where id = v_row.id;
      return jsonb_build_object('friendship_id', v_row.id, 'status', 'accepted');
    end if;
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  begin
    insert into public.friendships (requester_id, addressee_id) values (v_uid, v_target) returning * into v_row;
  exception when unique_violation then
    -- the other person sent theirs at the same instant
    raise exception 'CONFLICT' using errcode = 'P0001';
  end;
  return jsonb_build_object('friendship_id', v_row.id, 'status', v_row.status);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: respond_friend_request(id, accept). Only the addressee of a pending request; anything else -> NOT_FOUND.
-- Accept -> accepted; decline -> the row is deleted (they may ask again later).
-- ---------------------------------------------------------------------------

create or replace function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  perform 1 from public.friendships
  where id = p_friendship_id and addressee_id = v_uid and status = 'pending'
  for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now() where id = p_friendship_id;
  else
    delete from public.friendships where id = p_friendship_id;
  end if;
  return p_friendship_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: remove_friendship(id). Either person: unfriend, or cancel a request you sent / received.
-- Not one of the two people (or no such row) -> NOT_FOUND.
-- ---------------------------------------------------------------------------

create or replace function public.remove_friendship(p_friendship_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  delete from public.friendships where id = p_friendship_id and v_uid in (requester_id, addressee_id);
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return p_friendship_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- privileges
-- ---------------------------------------------------------------------------

revoke all on function public.unique_username(text) from public, anon, authenticated;

revoke all on function public.has_friendship_with(uuid) from public, anon;
grant execute on function public.has_friendship_with(uuid) to authenticated;

revoke all on function public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.remove_friendship(uuid) from public, anon;
grant execute on function public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.remove_friendship(uuid) to authenticated;
