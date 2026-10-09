-- Dear Days: Row Level Security, RPC functions and private Storage.
--
-- Model (docs/CONTRACTS.md + proposal):
--   * only room members can read a room, its memories, photos and tags; non-members see nothing
--   * a memory is created/edited/deleted only by its author; the room owner manages name/theme/delete room
--   * memberships are never written by clients: create_room() makes the owner row, join_room() adds the second person
--   * photos live in the private bucket `memory-media`; paths are  {room_id}/{uploader_id}/{memory_id}/{media_id}.{ext}
--
-- Policies call SECURITY DEFINER helpers (is_room_member ...) so they never query a table whose own policy calls
-- back into them: no recursive RLS.

-- ---------------------------------------------------------------------------
-- helpers (definer = bypass RLS inside the helper only; fixed empty search_path)
-- ---------------------------------------------------------------------------

create or replace function public.try_uuid(p_text text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m where m.room_id = p_room_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_room_owner(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m where m.room_id = p_room_id and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

create or replace function public.shares_room_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members mine
    join public.room_members theirs on theirs.room_id = mine.room_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  );
$$;

create or replace function public.memory_room_id(p_memory_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select room_id from public.memories where id = p_memory_id;
$$;

revoke all on function public.try_uuid(text), public.is_room_member(uuid), public.is_room_owner(uuid),
  public.shares_room_with(uuid), public.memory_room_id(uuid) from public;
grant execute on function public.try_uuid(text), public.is_room_member(uuid), public.is_room_owner(uuid),
  public.shares_room_with(uuid), public.memory_room_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- table privileges: nothing for anon; authenticated gets only what RLS then narrows down
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.rooms, public.room_members, public.memories,
  public.memory_media, public.tags, public.memory_tags from anon, authenticated, public;

grant select on public.profiles, public.rooms, public.room_members, public.memories,
  public.memory_media, public.tags, public.memory_tags to authenticated;
grant update (display_name, bio) on public.profiles to authenticated;
grant update (name, life_period, theme) on public.rooms to authenticated;
grant delete on public.rooms, public.memories to authenticated;
-- Everything else (create room, join, save memory/photos/tags) goes through the RPC functions below.

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.memories enable row level security;
alter table public.memory_media enable row level security;
alter table public.tags enable row level security;
alter table public.memory_tags enable row level security;

-- profiles: your own, and the people you share a room with (to show names)
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.shares_room_with(user_id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- rooms: members read; only the owner edits (name/life_period/theme, enforced by column grants) or deletes
create policy rooms_select_members on public.rooms for select to authenticated
  using (public.is_room_member(id));
create policy rooms_update_owner on public.rooms for update to authenticated
  using (owner_id = auth.uid() and public.is_room_owner(id))
  with check (owner_id = auth.uid());
create policy rooms_delete_owner on public.rooms for delete to authenticated
  using (owner_id = auth.uid() and public.is_room_owner(id));

-- room_members: members can see who is in their room. No insert/update/delete policy: only create_room/join_room write.
create policy room_members_select on public.room_members for select to authenticated
  using (public.is_room_member(room_id));

-- memories: members read; the author deletes (writes go through save_memory)
create policy memories_select_members on public.memories for select to authenticated
  using (public.is_room_member(room_id));
create policy memories_delete_author on public.memories for delete to authenticated
  using (author_id = auth.uid() and public.is_room_member(room_id));

-- media / tags / memory_tags: read-only for members
create policy memory_media_select on public.memory_media for select to authenticated
  using (public.is_room_member(public.memory_room_id(memory_id)));
create policy tags_select_members on public.tags for select to authenticated
  using (public.is_room_member(room_id));
create policy memory_tags_select_members on public.memory_tags for select to authenticated
  using (public.is_room_member(room_id));

-- room list with member_count (runs with the caller's rights, so RLS applies)
create view public.room_summaries with (security_invoker = true) as
  select r.id, r.owner_id, r.name, r.life_period, r.theme, r.invite_code, r.created_at, r.updated_at,
         (select count(*) from public.room_members m where m.room_id = r.id)::int as member_count
  from public.rooms r;
revoke all on public.room_summaries from anon, public;
grant select on public.room_summaries to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create_room
-- ---------------------------------------------------------------------------

create or replace function public.create_room(p_name text, p_life_period text, p_theme text default 'sunrise')
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
      insert into public.rooms (owner_id, name, life_period, theme)
      values (v_uid, p_name, p_life_period, p_theme)
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

-- ---------------------------------------------------------------------------
-- RPC: join_room. One atomic operation: code check + already-member + capacity.
-- Clients cannot list rooms they are not in, so codes cannot be harvested; a wrong code only returns an error.
-- ---------------------------------------------------------------------------

create or replace function public.join_room(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_invite_code, '')));
  v_room_id uuid;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if v_code !~ '^[A-Z2-9]{8}$' then
    raise exception 'INVALID_INVITE_CODE' using errcode = 'P0001';
  end if;

  -- lock the room row: concurrent joins queue here, so the capacity check below never races
  select id into v_room_id from public.rooms where invite_code = v_code for update;
  if v_room_id is null then
    raise exception 'INVALID_INVITE_CODE' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.room_members where room_id = v_room_id and user_id = v_uid) then
    return v_room_id; -- already in this room: idempotent
  end if;

  -- room_members_capacity trigger raises ROOM_FULL when two people are already in
  insert into public.room_members (room_id, user_id, role) values (v_room_id, v_uid, 'member');
  return v_room_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: save_memory. Create or update a memory with its photos and tags in ONE transaction.
--
-- p_input = {
--   title, body, memory_date, mood, period_label,
--   tags:  [{ type, label }],
--   media: {
--     existing: [{ id, alt_text }],
--     added:    [{ client_id, id, storage_path, mime_type, size_bytes, alt_text }],   -- files are already uploaded
--     removed_media_ids: [uuid],
--     order:  [{ kind: 'existing', id } | { kind: 'new', client_id }],
--     cover:  { kind, id | client_id } | null
--   }
-- }
-- Returns { memory_id, removed_paths } so the caller can delete the removed Storage objects AFTER this succeeded.
-- ---------------------------------------------------------------------------

create or replace function public.save_memory(p_room_id uuid, p_memory_id uuid, p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.memories;
  v_media jsonb := coalesce(p_input -> 'media', '{}'::jsonb);
  v_removed_ids uuid[] := coalesce(
    (select array_agg((value)::uuid) from jsonb_array_elements_text(coalesce(v_media -> 'removed_media_ids', '[]'::jsonb))),
    '{}'
  );
  v_removed_paths text[] := '{}';
  v_prefix text;
  v_item jsonb;
  v_id uuid;
  v_idx int := 0;
  v_cover jsonb := v_media -> 'cover';
  v_cover_id uuid := null;
  v_tag jsonb;
  v_tag_id uuid;
  v_tag_ids uuid[] := '{}';
  v_order_ids uuid[] := '{}';
  v_count int;
  v_found int;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_room_member(p_room_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into v_existing from public.memories where id = p_memory_id for update;
  if found then
    if v_existing.room_id <> p_room_id then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_existing.author_id <> v_uid then
      raise exception 'FORBIDDEN' using errcode = 'P0001';
    end if;
    update public.memories set
      title = p_input ->> 'title',
      body = p_input ->> 'body',
      memory_date = (p_input ->> 'memory_date')::date,
      mood = nullif(p_input ->> 'mood', ''),
      period_label = nullif(p_input ->> 'period_label', '')
    where id = p_memory_id;
  else
    insert into public.memories (id, room_id, author_id, title, body, memory_date, mood, period_label)
    values (
      p_memory_id, p_room_id, v_uid,
      p_input ->> 'title', p_input ->> 'body', (p_input ->> 'memory_date')::date,
      nullif(p_input ->> 'mood', ''), nullif(p_input ->> 'period_label', '')
    );
  end if;

  v_prefix := p_room_id::text || '/' || v_uid::text || '/' || p_memory_id::text || '/';

  -- 1) removed photos: only this memory's own rows; remember their Storage paths for the caller
  if cardinality(v_removed_ids) > 0 then
    with gone as (
      delete from public.memory_media where memory_id = p_memory_id and id = any (v_removed_ids) returning storage_path
    )
    select coalesce(array_agg(storage_path), '{}') into v_removed_paths from gone;
  end if;

  -- 2) kept photos: alt text only
  for v_item in select * from jsonb_array_elements(coalesce(v_media -> 'existing', '[]'::jsonb)) loop
    update public.memory_media set alt_text = coalesce(v_item ->> 'alt_text', '')
    where id = (v_item ->> 'id')::uuid and memory_id = p_memory_id;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  end loop;

  -- 3) new photos (already uploaded): the path must sit inside this user/memory folder
  for v_item in select * from jsonb_array_elements(coalesce(v_media -> 'added', '[]'::jsonb)) loop
    if left(v_item ->> 'storage_path', char_length(v_prefix)) <> v_prefix then
      raise exception 'FORBIDDEN' using errcode = 'P0001';
    end if;
    insert into public.memory_media (id, memory_id, storage_path, alt_text, mime_type, size_bytes, position)
    values (
      (v_item ->> 'id')::uuid, p_memory_id, v_item ->> 'storage_path', coalesce(v_item ->> 'alt_text', ''),
      v_item ->> 'mime_type', (v_item ->> 'size_bytes')::bigint,
      7 - v_idx % 8 -- temporary slot; real positions are assigned below (unique check is deferred)
    );
    v_idx := v_idx + 1;
  end loop;

  -- 4) order: every photo of the memory appears exactly once; positions become 0..n-1
  v_idx := 0;
  for v_item in select * from jsonb_array_elements(coalesce(v_media -> 'order', '[]'::jsonb)) loop
    if v_item ->> 'kind' = 'existing' then
      v_id := (v_item ->> 'id')::uuid;
    else
      select (a ->> 'id')::uuid into v_id
      from jsonb_array_elements(coalesce(v_media -> 'added', '[]'::jsonb)) a
      where a ->> 'client_id' = v_item ->> 'client_id';
    end if;
    if v_id is null then
      raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end if;
    v_order_ids := v_order_ids || v_id;
    update public.memory_media set position = v_idx where id = v_id and memory_id = p_memory_id;
    v_idx := v_idx + 1;
  end loop;

  select count(*) into v_count from public.memory_media where memory_id = p_memory_id;
  select count(*) into v_found from public.memory_media where memory_id = p_memory_id and id = any (v_order_ids);
  if v_count > 8 or v_count <> v_idx or v_found <> v_count then
    raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
  end if;

  -- 5) cover
  if v_cover is not null and jsonb_typeof(v_cover) = 'object' then
    if v_cover ->> 'kind' = 'existing' then
      v_cover_id := (v_cover ->> 'id')::uuid;
    else
      select (a ->> 'id')::uuid into v_cover_id
      from jsonb_array_elements(coalesce(v_media -> 'added', '[]'::jsonb)) a
      where a ->> 'client_id' = v_cover ->> 'client_id';
    end if;
  end if;
  update public.memories set cover_media_id = v_cover_id where id = p_memory_id; -- FK (cover, memory) rejects a foreign photo

  -- 6) tags: reuse (case-insensitive) or create inside this room, then replace the memory's set
  for v_tag in select * from jsonb_array_elements(coalesce(p_input -> 'tags', '[]'::jsonb)) loop
    insert into public.tags (room_id, type, label)
    values (p_room_id, v_tag ->> 'type', btrim(v_tag ->> 'label'))
    on conflict (room_id, type, (lower(label))) do update set label = public.tags.label
    returning id into v_tag_id;
    v_tag_ids := v_tag_ids || v_tag_id;
  end loop;
  delete from public.memory_tags where memory_id = p_memory_id and tag_id <> all (v_tag_ids);
  insert into public.memory_tags (memory_id, tag_id, room_id)
  select p_memory_id, t, p_room_id from unnest(v_tag_ids) t
  on conflict do nothing;

  return jsonb_build_object('memory_id', p_memory_id, 'removed_paths', to_jsonb(v_removed_paths));
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: upsert_tags. Create-or-reuse tags inside one room (case-insensitive), for any member.
-- ---------------------------------------------------------------------------

create or replace function public.upsert_tags(p_room_id uuid, p_tags jsonb)
returns setof public.tags
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag jsonb;
  v_row public.tags;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_room_member(p_room_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  for v_tag in select * from jsonb_array_elements(coalesce(p_tags, '[]'::jsonb)) loop
    insert into public.tags (room_id, type, label)
    values (p_room_id, v_tag ->> 'type', btrim(v_tag ->> 'label'))
    on conflict (room_id, type, (lower(label))) do update set label = public.tags.label
    returning * into v_row;
    return next v_row;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- list_memory_ids: filtered + paginated ids for the gallery (SECURITY INVOKER: RLS decides what is visible).
-- Filters: AND between groups, OR inside a group (docs/CONTRACTS.md).
-- ---------------------------------------------------------------------------

create or replace function public.list_memory_ids(
  p_room_id uuid,
  p_query text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_moods text[] default null,
  p_include_no_mood boolean default false,
  p_person_tag_ids uuid[] default null,
  p_place_tag_ids uuid[] default null,
  p_period_label text default null,
  p_sort text default 'memory_date_desc',
  p_limit int default 20,
  p_offset int default 0
)
returns table (id uuid, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.id, count(*) over () as total
  from public.memories m
  where m.room_id = p_room_id
    and (p_query is null or p_query = '' or (m.title || ' ' || m.body) ilike
         '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (p_date_from is null or m.memory_date >= p_date_from)
    and (p_date_to is null or m.memory_date <= p_date_to)
    and ((p_moods is null and not p_include_no_mood)
         or m.mood = any (coalesce(p_moods, '{}'))
         or (p_include_no_mood and m.mood is null))
    and (p_person_tag_ids is null or cardinality(p_person_tag_ids) = 0 or exists (
          select 1 from public.memory_tags mt where mt.memory_id = m.id and mt.tag_id = any (p_person_tag_ids)))
    and (p_place_tag_ids is null or cardinality(p_place_tag_ids) = 0 or exists (
          select 1 from public.memory_tags mt where mt.memory_id = m.id and mt.tag_id = any (p_place_tag_ids)))
    and (p_period_label is null or p_period_label = '' or m.period_label = p_period_label)
  order by
    case when p_sort = 'memory_date_asc' then m.memory_date end asc,
    case when p_sort = 'memory_date_desc' then m.memory_date end desc,
    case when p_sort = 'updated_at_desc' then m.updated_at end desc,
    m.created_at desc,
    m.id
  limit greatest(least(p_limit, 50), 1)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.create_room(text, text, text), public.join_room(text), public.upsert_tags(uuid, jsonb),
  public.save_memory(uuid, uuid, jsonb), public.list_memory_ids(uuid, text, date, date, text[], boolean, uuid[], uuid[], text, text, int, int)
  from public, anon;
grant execute on function public.create_room(text, text, text), public.join_room(text), public.upsert_tags(uuid, jsonb),
  public.save_memory(uuid, uuid, jsonb), public.list_memory_ids(uuid, text, date, date, text[], boolean, uuid[], uuid[], text, text, int, int)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket + policies. Path = {room_id}/{uploader_id}/{memory_id}/{file}
--   read   : any member of the room
--   upload : a member, only into their own {uploader_id} folder
--   delete : the uploader, or the room owner (needed to clean up when the room is deleted)
-- No public access and no update policy (objects are immutable; replace = new object).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-media', 'memory-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy memory_media_objects_read on storage.objects for select to authenticated
  using (
    bucket_id = 'memory-media'
    and public.is_room_member(public.try_uuid((storage.foldername(name))[1]))
  );

create policy memory_media_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'memory-media'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_room_member(public.try_uuid((storage.foldername(name))[1]))
  );

create policy memory_media_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'memory-media'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_room_owner(public.try_uuid((storage.foldername(name))[1]))
    )
  );

-- internal functions are not callable through the API
revoke all on function public.handle_new_user(), public.generate_invite_code(), public.set_updated_at(),
  public.enforce_room_capacity(), public.rooms_immutable_fields(), public.memories_immutable_fields()
  from public, anon, authenticated;
