-- Lets the members of a room choose which photo memory hangs in which 3D picture frame.
-- A row pins one memory to one frame slot; frames without a row are still filled automatically by the app.

create table public.room_frame_slots (
  room_id uuid not null,
  slot_id text not null check (slot_id ~ '^[A-Za-z][A-Za-z0-9]{0,7}$'),
  memory_id uuid not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (room_id, slot_id),
  -- one memory hangs in at most one frame of a room
  constraint room_frame_slots_memory_key unique (room_id, memory_id),
  -- a frame can only show a memory of its own room; deleting the memory frees the frame
  constraint room_frame_slots_memory_fkey foreign key (memory_id, room_id)
    references public.memories (id, room_id) on delete cascade
);

alter table public.room_frame_slots enable row level security;

revoke all on public.room_frame_slots from anon, public;
grant select on public.room_frame_slots to authenticated;

-- members read; writes only go through set_frame_layout
create policy room_frame_slots_select_members on public.room_frame_slots for select to authenticated
  using (public.is_room_member(room_id));

-- ---------------------------------------------------------------------------
-- RPC: set_frame_layout. Any member saves the whole arrangement at once, as {"<slot id>": "<memory id>", ...}:
-- which photo memory hangs in which frame. Replaces the previous arrangement of the room in one transaction,
-- so two frames can swap photos without ever violating "one memory per frame".
-- An empty object gives every frame back to the automatic layout.
-- ---------------------------------------------------------------------------

create or replace function public.set_frame_layout(p_room_id uuid, p_layout jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pair record;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_room_member(p_room_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_layout is null or jsonb_typeof(p_layout) <> 'object' then
    raise exception 'VALIDATION_ERROR' using errcode = '22P02';
  end if;

  -- refuse an oversized layout before doing any work (a room has far fewer frames than this)
  if (select count(*) from jsonb_object_keys(p_layout)) > 40 then
    raise exception 'VALIDATION_ERROR' using errcode = '22P02';
  end if;

  -- serialise concurrent saves of the same room
  perform 1 from public.rooms where id = p_room_id for update;

  delete from public.room_frame_slots where room_id = p_room_id;

  for v_pair in select key, value from jsonb_each_text(p_layout) loop
    if v_pair.key !~ '^[A-Za-z][A-Za-z0-9]{0,7}$' or public.try_uuid(v_pair.value) is null then
      raise exception 'VALIDATION_ERROR' using errcode = '22P02';
    end if;
    -- frames show photos: the memory must belong to this room and have at least one photo
    if not exists (
      select 1 from public.memories m
      where m.id = public.try_uuid(v_pair.value) and m.room_id = p_room_id
        and exists (select 1 from public.memory_media mm where mm.memory_id = m.id)
    ) then
      raise exception 'VALIDATION_ERROR' using errcode = '22P02';
    end if;
    insert into public.room_frame_slots (room_id, slot_id, memory_id, updated_by)
    values (p_room_id, v_pair.key, public.try_uuid(v_pair.value), auth.uid());
  end loop;

  -- a duplicate memory hits room_frame_slots_memory_key (23505 → CONFLICT); also cap the size of the layout
  select count(*) into v_count from public.room_frame_slots where room_id = p_room_id;
  if v_count > 40 then
    raise exception 'VALIDATION_ERROR' using errcode = '22P02';
  end if;
end;
$$;

revoke all on function public.set_frame_layout(uuid, jsonb) from public, anon;
grant execute on function public.set_frame_layout(uuid, jsonb) to authenticated;
