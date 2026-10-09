-- Aligns the database with the R1 contracts (docs/CONTRACTS.md):
--   * profiles: avatar_url, updated_at              (contract `Profile`)
--   * rooms: description                            (contract `Room.description`, nullable, max 300)
--   * remove_room_member                            (contract `removeRoomMember`, owner only)
-- NOT applied to the hosted project yet: see docs/SUPABASE-HANDOFF.md.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column avatar_url text check (avatar_url is null or char_length(avatar_url) between 1 and 500),
  add column updated_at timestamptz not null default now();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rooms.description
-- ---------------------------------------------------------------------------
alter table public.rooms
  add column description text check (description is null or char_length(description) between 1 and 300);

grant update (name, life_period, description, theme) on public.rooms to authenticated;

-- a view can only gain columns at its end
create or replace view public.room_summaries with (security_invoker = true) as
  select r.id, r.owner_id, r.name, r.life_period, r.theme, r.invite_code, r.created_at, r.updated_at,
         (select count(*) from public.room_members m where m.room_id = r.id)::int as member_count,
         r.description
  from public.rooms r;

-- create_room gets an optional description (the old 3-argument version is replaced, calls with 3 arguments still work)
drop function public.create_room(text, text, text);

create function public.create_room(p_name text, p_life_period text, p_theme text default 'sunrise', p_description text default null)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.rooms (owner_id, name, life_period, theme, description)
      values (v_uid, p_name, p_life_period, p_theme, nullif(btrim(p_description), ''))
      returning * into v_room;
      exit;
    exception when unique_violation then
      -- two rooms drew the same invite code at the same instant: draw again
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  insert into public.room_members (room_id, user_id, role) values (v_room.id, v_uid, 'owner');
  return v_room;
end;
$$;

revoke all on function public.create_room(text, text, text, text) from public, anon;
grant execute on function public.create_room(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- remove_room_member (owner only)
--   caller is not the owner of the room (or the room is not visible to them) -> FORBIDDEN
--   target is the owner (including the owner removing themselves)            -> FORBIDDEN
--   target is not a member of this room                                      -> NOT_FOUND
-- The room row is locked first so removal and join_room cannot interleave.
-- Memories the removed person wrote stay in the room; they can no longer read or change anything in it
-- (every policy requires membership), and can join again with a valid invite code if there is space.
-- ---------------------------------------------------------------------------
create function public.remove_room_member(p_room_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  perform 1 from public.rooms where id = p_room_id for update;
  if not found or not public.is_room_owner(p_room_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select role into v_role from public.room_members where room_id = p_room_id and user_id = p_user_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_role = 'owner' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  delete from public.room_members where room_id = p_room_id and user_id = p_user_id;
  return p_user_id;
end;
$$;

revoke all on function public.remove_room_member(uuid, uuid) from public, anon;
grant execute on function public.remove_room_member(uuid, uuid) to authenticated;
