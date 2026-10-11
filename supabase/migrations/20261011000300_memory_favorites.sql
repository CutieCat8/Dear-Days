-- Personal favourites ("Highlights" book): each person stars the memories they want to keep close.
-- A row belongs to ONE user (not shared with the other member of the room) and is unique per user + memory.
-- The room id is stored with the row so the policy can check membership without a join.

create table public.memory_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  memory_id uuid not null,
  room_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, memory_id),
  -- a favourite can only point at a memory of its own room; deleting the memory removes the favourite
  constraint memory_favorites_memory_fkey foreign key (memory_id, room_id)
    references public.memories (id, room_id) on delete cascade
);

create index memory_favorites_room_idx on public.memory_favorites (room_id, user_id);

alter table public.memory_favorites enable row level security;

revoke all on public.memory_favorites from anon, public, authenticated;
grant select on public.memory_favorites to authenticated;

-- You only ever see your own favourites, and only while you are still a member of the room.
-- Writes go through set_memory_favorite (SECURITY DEFINER); there is no write policy.
create policy memory_favorites_select_own on public.memory_favorites for select to authenticated
  using (user_id = auth.uid() and public.is_room_member(room_id));

-- ---------------------------------------------------------------------------
-- RPC: set_memory_favorite. Stars (p_favorite = true) or un-stars a memory for the caller.
-- Idempotent: starring twice or un-starring something that is not starred is not an error.
-- Only members can star, and only memories of that room (anything else looks like a missing memory).
-- ---------------------------------------------------------------------------

create or replace function public.set_memory_favorite(p_room_id uuid, p_memory_id uuid, p_favorite boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_favorite is null then
    raise exception 'VALIDATION_ERROR' using errcode = '22P02';
  end if;
  if not public.is_room_member(p_room_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_favorite then
    if not exists (select 1 from public.memories m where m.id = p_memory_id and m.room_id = p_room_id) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    insert into public.memory_favorites (user_id, memory_id, room_id)
    values (auth.uid(), p_memory_id, p_room_id)
    on conflict (user_id, memory_id) do nothing;
  else
    delete from public.memory_favorites
    where user_id = auth.uid() and memory_id = p_memory_id and room_id = p_room_id;
  end if;
end;
$$;

revoke all on function public.set_memory_favorite(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_memory_favorite(uuid, uuid, boolean) to authenticated;
