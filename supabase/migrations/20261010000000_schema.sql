-- Dear Days: core schema (tables, constraints, indexes, triggers).
-- Source of truth: docs/CONTRACTS.md + src/lib/contracts/schemas.ts (snake_case at the database boundary).
-- RLS, RPC functions and Storage live in 20261010000100_security.sql.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 8-char invite code from an unambiguous alphabet (no 0/O/1/I), unique across rooms.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 symbols: 256 % 32 = 0, so no modulo bias
  code text;
  bytes bytea;
  i int;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  bio text check (bio is null or char_length(bio) <= 160),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rooms + membership
-- ---------------------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  life_period text not null check (char_length(btrim(life_period)) between 1 and 80),
  theme text not null default 'sunrise' check (theme in ('sunrise', 'rose', 'night')),
  invite_code text not null default public.generate_invite_code() check (invite_code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_invite_code_key unique (invite_code)
);
create index rooms_owner_idx on public.rooms (owner_id);

create trigger rooms_set_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_idx on public.room_members (user_id);
-- exactly one owner per room
create unique index room_members_one_owner_idx on public.room_members (room_id) where role = 'owner';

-- A room holds at most two people. The trigger locks the room row first, so concurrent joins are serialised and
-- the count below is always current. Frontend counts are never the guard.
create or replace function public.enforce_room_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.rooms where id = new.room_id for update;
  if (select count(*) from public.room_members where room_id = new.room_id) >= 2 then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger room_members_capacity before insert on public.room_members
  for each row execute function public.enforce_room_capacity();

-- identity fields never change after creation (no ownership / invite-code hijacking through UPDATE)
create or replace function public.rooms_immutable_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.owner_id <> old.owner_id or new.invite_code <> old.invite_code or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_FIELD' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger rooms_immutable before update on public.rooms
  for each row execute function public.rooms_immutable_fields();

-- ---------------------------------------------------------------------------
-- memories, media, tags
-- ---------------------------------------------------------------------------

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  memory_date date not null,
  mood text check (mood is null or mood in ('awful', 'stressed', 'sad', 'relaxed', 'happy', 'excited')),
  period_label text check (period_label is null or char_length(period_label) <= 80),
  cover_media_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_id_room_key unique (id, room_id)
);
create index memories_room_date_idx on public.memories (room_id, memory_date desc, created_at desc);
create index memories_room_updated_idx on public.memories (room_id, updated_at desc);
create index memories_author_idx on public.memories (author_id);
create index memories_search_idx on public.memories using gin ((title || ' ' || body) extensions.gin_trgm_ops);

create trigger memories_set_updated_at before update on public.memories
  for each row execute function public.set_updated_at();

create or replace function public.memories_immutable_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.room_id <> old.room_id or new.author_id <> old.author_id or new.created_at <> old.created_at then
    raise exception 'IMMUTABLE_FIELD' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger memories_immutable before update on public.memories
  for each row execute function public.memories_immutable_fields();

create table public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 500),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  -- position 0..7 + unique(memory_id, position) = at most 8 photos per memory; save_memory keeps them consecutive
  position int not null check (position between 0 and 7),
  created_at timestamptz not null default now(),
  constraint memory_media_storage_path_key unique (storage_path),
  constraint memory_media_position_key unique (memory_id, position) deferrable initially deferred,
  constraint memory_media_id_memory_key unique (id, memory_id)
);
create index memory_media_memory_idx on public.memory_media (memory_id, position);

-- the cover must be one of the memory's own photos; deleting that photo clears only the cover column
alter table public.memories
  add constraint memories_cover_fkey foreign key (cover_media_id, id)
  references public.memory_media (id, memory_id) on delete set null (cover_media_id) deferrable initially deferred;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  type text not null check (type in ('person', 'place')),
  label text not null check (char_length(label) between 1 and 50 and label = btrim(label)),
  created_at timestamptz not null default now(),
  constraint tags_id_room_key unique (id, room_id)
);
-- one tag per (room, type, case-insensitive label)
create unique index tags_room_type_label_key on public.tags (room_id, type, lower(label));

create table public.memory_tags (
  memory_id uuid not null,
  tag_id uuid not null,
  room_id uuid not null,
  primary key (memory_id, tag_id),
  -- a tag can only be attached to a memory of the same room
  constraint memory_tags_memory_fkey foreign key (memory_id, room_id) references public.memories (id, room_id) on delete cascade,
  constraint memory_tags_tag_fkey foreign key (tag_id, room_id) references public.tags (id, room_id) on delete cascade
);
create index memory_tags_tag_idx on public.memory_tags (tag_id, memory_id);

-- ---------------------------------------------------------------------------
-- new auth user -> profile
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text;
begin
  name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if name is null then
    name := split_part(coalesce(new.email, 'friend'), '@', 1);
  end if;
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(nullif(name, ''), 'friend'), 50));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
