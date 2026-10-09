-- Schema, RLS, RPC and Storage-policy tests. Run through scripts/test-db.sh (plain Postgres + bootstrap.sql stubs)
-- or against a local Supabase database. Every block raises on the first failed expectation.
\set ON_ERROR_STOP on

create schema if not exists t;
grant usage on schema t to public;

-- run `sql` as the current role and require it to fail with a message containing `expected`
create or replace function t.throws(sql text, expected text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlerrm like '%' || expected || '%' then return; end if;
    raise exception 'expected error containing "%" but got "%" for: %', expected, sqlerrm, sql;
  end;
  raise exception 'expected error containing "%" but statement succeeded: %', expected, sql;
end $$;

create or replace function t.eq(actual anyelement, expected anyelement, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
end $$;

-- user ids: owner, partner, third (joins late), outsider
select set_config('t.owner', '10000000-0000-4000-8000-0000000000a1', false),
       set_config('t.partner', '10000000-0000-4000-8000-0000000000a2', false),
       set_config('t.third', '10000000-0000-4000-8000-0000000000a3', false),
       set_config('t.outsider', '10000000-0000-4000-8000-0000000000a4', false);

create or replace function t.as_user(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', current_setting('t.' || p_user), true);
  execute 'set local role authenticated';
end $$;

create or replace function t.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

-- ---------------------------------------------------------------- 1. profiles from auth.users
insert into auth.users (id, email, raw_user_meta_data) values
  (current_setting('t.owner')::uuid, 'sea@example.com', '{"display_name":"Sea"}'),
  (current_setting('t.partner')::uuid, 'mint@example.com', '{}'),
  (current_setting('t.third')::uuid, 'third@example.com', '{"display_name":"  "}'),
  (current_setting('t.outsider')::uuid, 'out@example.com', '{"display_name":"Outsider"}');

do $$ begin
  perform t.eq((select display_name from public.profiles where user_id = current_setting('t.owner')::uuid), 'Sea', 'profile display_name from metadata');
  perform t.eq((select display_name from public.profiles where user_id = current_setting('t.partner')::uuid), 'mint', 'profile falls back to email prefix');
  perform t.eq((select display_name from public.profiles where user_id = current_setting('t.third')::uuid), 'third', 'blank display_name falls back');
end $$;

-- ---------------------------------------------------------------- 2. rooms: create, theme, invite code
begin;
select t.as_user('owner') as u \gset
do $$
declare r public.rooms;
begin
  r := public.create_room('University Days', 'Aug 2026 - May 2027', 'night');
  perform set_config('t.room', r.id::text, true);
  perform set_config('t.code', r.invite_code, true);
  perform t.eq(r.theme, 'night', 'theme saved');
  perform t.eq(r.invite_code ~ '^[A-Z2-9]{8}$', true, 'invite code format');
  perform t.eq((select member_count from public.room_summaries where id = r.id), 1, 'member_count after create');
  perform t.eq((select role from public.room_members where room_id = r.id and user_id = r.owner_id), 'owner', 'owner membership');
  perform t.throws($q$ select public.create_room('', 'x', 'sunrise') $q$, 'violates check constraint');
  perform t.throws($q$ select public.create_room('x', 'x', 'neon') $q$, 'violates check constraint');
end $$;
-- keep ids for later blocks
create temp table ctx as select current_setting('t.room') as room, current_setting('t.code') as code;
grant select on ctx to public;
commit;

-- ---------------------------------------------------------------- 3. privacy before joining
begin;
select t.as_user('outsider') as u \gset
do $$ begin
  perform t.eq((select count(*) from public.rooms), 0::bigint, 'outsider sees no rooms');
  perform t.eq((select count(*) from public.room_members), 0::bigint, 'outsider sees no members');
  perform t.eq((select count(*) from public.room_summaries), 0::bigint, 'outsider sees no summaries');
  perform t.throws($q$ insert into public.rooms (owner_id, name, life_period) values (auth.uid(), 'x', 'y') $q$, 'permission denied');
  perform t.throws($q$ insert into public.room_members (room_id, user_id, role) select id, auth.uid(), 'member' from public.rooms $q$, 'permission denied');
end $$;
select t.as_anon() as u \gset
do $$ begin
  perform t.throws($q$ select * from public.rooms $q$, 'permission denied');
  perform t.throws($q$ select public.join_room('AAAAAAAA') $q$, 'permission denied');
end $$;
rollback;

-- ---------------------------------------------------------------- 4. join: wrong code, success, full, idempotent
begin;
select t.as_user('partner') as u \gset
do $$
declare room uuid := (select room::uuid from ctx);
begin
  perform t.throws($q$ select public.join_room('ZZZZZZZZ') $q$, 'INVALID_INVITE_CODE');
  perform t.throws($q$ select public.join_room('short') $q$, 'INVALID_INVITE_CODE');
  perform t.eq(public.join_room(lower((select code from ctx))), room, 'join (case-insensitive code)');
  perform t.eq(public.join_room((select code from ctx)), room, 'joining twice is idempotent');
  perform t.eq((select member_count from public.room_summaries where id = room), 2, 'member_count after join');
  perform t.eq((select count(*) from public.room_members where room_id = room), 2::bigint, 'partner sees both members');
  perform t.eq((select display_name from public.profiles where user_id = current_setting('t.owner')::uuid), 'Sea', 'partner can read the owner profile');
end $$;
commit;

begin;
select t.as_user('third') as u \gset
do $$ begin
  perform t.throws(format('select public.join_room(%L)', (select code from ctx)), 'ROOM_FULL');
  perform t.eq((select count(*) from public.rooms), 0::bigint, 'rejected user still sees nothing');
end $$;
rollback;

-- direct inserts bypassing join_room are also refused by the capacity trigger (service-role / superuser path)
do $$ begin
  perform t.throws(format('insert into public.room_members (room_id, user_id, role) values (%L, %L, ''member'')', (select room from ctx), current_setting('t.third')), 'ROOM_FULL');
end $$;

-- ---------------------------------------------------------------- 5. room edits: owner only, identity fields locked
begin;
select t.as_user('partner') as u \gset
do $$ begin
  update public.rooms set name = 'Hijacked' where id = (select room::uuid from ctx);
  perform t.eq((select name from public.rooms where id = (select room::uuid from ctx)), 'University Days', 'member cannot rename');
  perform t.throws(format('update public.rooms set owner_id = %L where id = %L', current_setting('t.partner'), (select room from ctx)), 'permission denied');
  delete from public.rooms where id = (select room::uuid from ctx);
  perform t.eq((select count(*) from public.rooms), 1::bigint, 'member cannot delete room');
end $$;
rollback;

begin;
select t.as_user('owner') as u \gset
do $$ begin
  update public.rooms set name = 'University Days 2', theme = 'rose' where id = (select room::uuid from ctx);
  perform t.eq((select theme from public.rooms where id = (select room::uuid from ctx)), 'rose', 'owner changes theme');
  perform t.throws(format('update public.rooms set invite_code = %L where id = %L', 'AAAAAAAA', (select room from ctx)), 'permission denied');
  perform t.throws(format('update public.rooms set owner_id = %L where id = %L', current_setting('t.partner'), (select room from ctx)), 'permission denied');
  perform t.throws(format('update public.rooms set theme = ''neon'' where id = %L', (select room from ctx)), 'violates check constraint');
end $$;
rollback;

-- ---------------------------------------------------------------- 6. memories: text-only, photos, tags, cover, order
begin;
select t.as_user('owner') as u \gset
do $$
declare
  room uuid := (select room::uuid from ctx);
  mem uuid := '20000000-0000-4000-8000-000000000001';
  m1 uuid := '30000000-0000-4000-8000-000000000001';
  m2 uuid := '30000000-0000-4000-8000-000000000002';
  u uuid := current_setting('t.owner')::uuid;
  res jsonb;
  p text := room::text || '/' || u::text || '/' || mem::text || '/';
begin
  -- text-only memory, no mood, no tags
  res := public.save_memory(room, mem, jsonb_build_object(
    'title', 'First note', 'body', 'No photo today', 'memory_date', '2026-10-01', 'mood', null, 'period_label', null,
    'tags', '[]'::jsonb, 'media', jsonb_build_object('existing', '[]'::jsonb, 'added', '[]'::jsonb, 'removed_media_ids', '[]'::jsonb, 'order', '[]'::jsonb, 'cover', null)));
  perform t.eq((select author_id from public.memories where id = mem), u, 'author_id comes from the session');
  perform t.eq((select cover_media_id from public.memories where id = mem), null::uuid, 'text-only memory has no cover');

  -- add two photos + tags, second photo as cover, order [new2, new1]
  res := public.save_memory(room, mem, jsonb_build_object(
    'title', 'Doi Suthep', 'body', 'Sunrise', 'memory_date', '2026-10-02', 'mood', 'happy', 'period_label', 'Year 1',
    'tags', jsonb_build_array(jsonb_build_object('type', 'person', 'label', 'Sea'), jsonb_build_object('type', 'place', 'label', 'Doi Suthep'), jsonb_build_object('type', 'person', 'label', 'sea')),
    'media', jsonb_build_object(
      'existing', '[]'::jsonb,
      'added', jsonb_build_array(
        jsonb_build_object('client_id', 'c1', 'id', m1, 'storage_path', p || m1 || '.jpg', 'mime_type', 'image/jpeg', 'size_bytes', 1000, 'alt_text', 'one'),
        jsonb_build_object('client_id', 'c2', 'id', m2, 'storage_path', p || m2 || '.webp', 'mime_type', 'image/webp', 'size_bytes', 2000, 'alt_text', 'two')),
      'removed_media_ids', '[]'::jsonb,
      'order', jsonb_build_array(jsonb_build_object('kind', 'new', 'client_id', 'c2'), jsonb_build_object('kind', 'new', 'client_id', 'c1')),
      'cover', jsonb_build_object('kind', 'new', 'client_id', 'c2'))));
  perform t.eq((select position from public.memory_media where id = m2), 0, 'order: second photo first');
  perform t.eq((select position from public.memory_media where id = m1), 1, 'order: first photo second');
  perform t.eq((select cover_media_id from public.memories where id = mem), m2, 'cover set');
  perform t.eq((select count(*) from public.tags where room_id = room), 2::bigint, 'tags deduplicated case-insensitively');
  perform t.eq((select count(*) from public.memory_tags where memory_id = mem), 2::bigint, 'memory tags attached');

  -- reorder + drop the cover photo: cover clears, removed path returned, remaining position becomes 0
  res := public.save_memory(room, mem, jsonb_build_object(
    'title', 'Doi Suthep', 'body', 'Sunrise', 'memory_date', '2026-10-02', 'mood', 'happy', 'period_label', 'Year 1',
    'tags', jsonb_build_array(jsonb_build_object('type', 'place', 'label', 'Doi Suthep')),
    'media', jsonb_build_object(
      'existing', jsonb_build_array(jsonb_build_object('id', m1, 'alt_text', 'renamed')),
      'added', '[]'::jsonb,
      'removed_media_ids', jsonb_build_array(m2),
      'order', jsonb_build_array(jsonb_build_object('kind', 'existing', 'id', m1)),
      'cover', null)));
  perform t.eq(res -> 'removed_paths' ->> 0, p || m2 || '.webp', 'removed storage path returned for cleanup');
  perform t.eq((select position from public.memory_media where id = m1), 0, 'positions stay consecutive');
  perform t.eq((select alt_text from public.memory_media where id = m1), 'renamed', 'alt text updated');
  perform t.eq((select cover_media_id from public.memories where id = mem), null::uuid, 'cover cleared');
  perform t.eq((select count(*) from public.memory_tags where memory_id = mem), 1::bigint, 'removed tag detached');

  -- validation failures leave the previous data untouched (whole call is one transaction)
  perform t.throws(format($q$ select public.save_memory(%L, %L, %L::jsonb) $q$, room, mem,
    '{"title":"","body":"x","memory_date":"2026-10-02","tags":[],"media":{}}'), 'violates check constraint');
  perform t.throws(format($q$ select public.save_memory(%L, %L, %L::jsonb) $q$, room, mem,
    jsonb_build_object('title','t','body','b','memory_date','2026-10-02','tags','[]'::jsonb,'media', jsonb_build_object(
      'added', jsonb_build_array(jsonb_build_object('client_id','x','id',gen_random_uuid(),'storage_path','other-room/path.jpg','mime_type','image/jpeg','size_bytes',1,'alt_text','')),
      'order', jsonb_build_array(jsonb_build_object('kind','new','client_id','x'))))), 'FORBIDDEN');
  perform t.throws(format($q$ select public.save_memory(%L, %L, %L::jsonb) $q$, room, mem,
    jsonb_build_object('title','t','body','b','memory_date','2026-10-02','tags','[]'::jsonb,'media', jsonb_build_object(
      'added', jsonb_build_array(jsonb_build_object('client_id','x','id',gen_random_uuid(),'storage_path',p || 'big.jpg','mime_type','image/jpeg','size_bytes',99999999,'alt_text','')),
      'order', jsonb_build_array(jsonb_build_object('kind','new','client_id','x'))))), 'violates check constraint');
  perform t.throws(format($q$ select public.save_memory(%L, %L, %L::jsonb) $q$, room, mem,
    jsonb_build_object('title','t','body','b','memory_date','2026-10-02','tags','[]'::jsonb,'media', jsonb_build_object(
      'added', jsonb_build_array(jsonb_build_object('client_id','x','id',gen_random_uuid(),'storage_path',p || 'x.gif','mime_type','image/gif','size_bytes',10,'alt_text','')),
      'order', jsonb_build_array(jsonb_build_object('kind','new','client_id','x'))))), 'violates check constraint');
  perform t.eq((select title from public.memories where id = mem), 'Doi Suthep', 'failed saves did not change the memory');
  perform t.eq((select count(*) from public.memory_media where memory_id = mem), 1::bigint, 'failed saves did not change the photos');
end $$;

-- more than 8 photos is rejected
do $$
declare
  room uuid := (select room::uuid from ctx);
  mem uuid := '20000000-0000-4000-8000-000000000002';
  u uuid := current_setting('t.owner')::uuid;
  p text := room::text || '/' || u::text || '/' || mem::text || '/';
  added jsonb := '[]'::jsonb;
  ord jsonb := '[]'::jsonb;
  i int;
begin
  for i in 1..9 loop
    added := added || jsonb_build_object('client_id', 'c' || i, 'id', gen_random_uuid(), 'storage_path', p || i || '.jpg', 'mime_type', 'image/jpeg', 'size_bytes', 10, 'alt_text', '');
    ord := ord || jsonb_build_object('kind', 'new', 'client_id', 'c' || i);
  end loop;
  perform t.throws(format($q$ select public.save_memory(%L, %L, %L::jsonb) $q$, room, mem,
    jsonb_build_object('title','t','body','b','memory_date','2026-10-02','tags','[]'::jsonb,'media', jsonb_build_object('added', added, 'order', ord, 'cover', null))::text), 'violates check constraint');
  perform t.eq((select count(*) from public.memories where id = mem), 0::bigint, 'rejected memory was rolled back');
end $$;
commit;

-- ---------------------------------------------------------------- 7. who can read / change a memory
begin;
select t.as_user('partner') as u \gset
do $$
declare room uuid := (select room::uuid from ctx); mem uuid := '20000000-0000-4000-8000-000000000001';
begin
  perform t.eq((select count(*) from public.memories where room_id = room), 1::bigint, 'member reads memories');
  perform t.eq((select count(*) from public.memory_media where memory_id = mem), 1::bigint, 'member reads media rows');
  perform t.eq((select count(*) from public.tags where room_id = room), 2::bigint, 'member reads tags');
  perform t.throws(format($q$ select public.save_memory(%L, %L, '{"title":"x","body":"x","memory_date":"2026-10-02","tags":[],"media":{}}'::jsonb) $q$, room, mem), 'FORBIDDEN');
  perform t.throws(format($q$ update public.memories set title = 'x' where id = %L $q$, mem), 'permission denied');
  delete from public.memories where id = mem;
  perform t.eq((select count(*) from public.memories where id = mem), 1::bigint, 'member cannot delete the partner memory');
  -- partner writes their own memory; cannot pass a foreign author
  perform public.save_memory(room, '20000000-0000-4000-8000-000000000003', '{"title":"Mine","body":"x","memory_date":"2026-10-03","tags":[],"media":{}}'::jsonb);
  perform t.eq((select author_id from public.memories where id = '20000000-0000-4000-8000-000000000003'), current_setting('t.partner')::uuid, 'author is the caller');
end $$;
commit;

begin;
select t.as_user('outsider') as u \gset
do $$
declare room uuid := (select room::uuid from ctx); mem uuid := '20000000-0000-4000-8000-000000000001';
begin
  perform t.eq((select count(*) from public.memories), 0::bigint, 'outsider reads no memories');
  perform t.eq((select count(*) from public.memory_media), 0::bigint, 'outsider reads no media');
  perform t.eq((select count(*) from public.tags), 0::bigint, 'outsider reads no tags');
  perform t.eq((select count(*) from public.memory_tags), 0::bigint, 'outsider reads no memory tags');
  perform t.eq((select count(*) from public.list_memory_ids(room)), 0::bigint, 'outsider gets no gallery ids');
  perform t.throws(format($q$ select public.save_memory(%L, gen_random_uuid(), '{"title":"x","body":"x","memory_date":"2026-10-02","tags":[],"media":{}}'::jsonb) $q$, room), 'FORBIDDEN');
  perform t.eq((select count(*) from public.profiles where user_id <> auth.uid()), 0::bigint, 'outsider sees no other profiles');
end $$;
rollback;

-- ---------------------------------------------------------------- 8. gallery filters + pagination
begin;
select t.as_user('owner') as u \gset
do $$
declare
  room uuid := (select room::uuid from ctx);
  sea uuid := (select id from public.tags where room_id = room and type = 'person' and lower(label) = 'sea');
  place uuid := (select id from public.tags where room_id = room and type = 'place');
  i int;
begin
  for i in 1..25 loop
    perform public.save_memory(room, gen_random_uuid(), jsonb_build_object('title', 'Day ' || i, 'body', case when i % 5 = 0 then '100% sure_ok' else 'plain' end,
      'memory_date', (date '2026-01-01' + i)::text, 'mood', case when i % 3 = 0 then 'happy' when i % 3 = 1 then null else 'sad' end,
      'period_label', case when i <= 10 then 'A' else 'B' end, 'tags', case when i % 2 = 0 then jsonb_build_array(jsonb_build_object('type','person','label','Sea')) else '[]'::jsonb end,
      'media', '{}'::jsonb));
  end loop;
  -- 25 + 'Doi Suthep' + 'First'? (First note was replaced by the Doi Suthep update) + partner memory
  perform t.eq((select max(total) from public.list_memory_ids(room, p_limit := 10)), 27::bigint, 'total count');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_limit := 10, p_offset := 20)), 7::bigint, 'last page size');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_query := '100%')), 5::bigint, 'LIKE wildcards are escaped');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_query := 'sure_ok')), 5::bigint, 'underscore is literal');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_moods := array['happy'])), 9::bigint, 'mood filter');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_moods := array['happy'], p_include_no_mood := true)), 19::bigint, 'mood OR no-mood');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_person_tag_ids := array[sea])), 12::bigint, 'person tag filter');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_person_tag_ids := array[sea], p_place_tag_ids := array[place])), 0::bigint, 'tag groups are ANDed');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_date_from := '2026-01-05', p_date_to := '2026-01-07')), 3::bigint, 'inclusive date range');
  perform t.eq((select count(*) from public.list_memory_ids(room, p_period_label := 'A')), 10::bigint, 'period filter');
  perform t.eq((select id from public.list_memory_ids(room, p_sort := 'memory_date_asc', p_limit := 1)), (select id from public.memories where title = 'Day 1'), 'ascending sort');
end $$;
rollback;

-- upsert_tags: members only, reuse is case-insensitive
begin;
select t.as_user('partner') as u \gset
do $$ begin
  perform t.eq((select count(*) from public.upsert_tags((select room::uuid from ctx), '[{"type":"person","label":"SEA"},{"type":"place","label":"Cafe"}]'::jsonb)), 2::bigint, 'upsert_tags returns rows');
  perform t.eq((select count(*) from public.tags where room_id = (select room::uuid from ctx) and type = 'person' and lower(label) = 'sea'), 1::bigint, 'upsert_tags reuses an existing tag');
end $$;
commit;
begin;
select t.as_user('outsider') as u \gset
do $$ begin
  perform t.throws(format('select * from public.upsert_tags(%L, ''[{"type":"person","label":"x"}]''::jsonb)', (select room from ctx)), 'FORBIDDEN');
end $$;
rollback;

-- ---------------------------------------------------------------- 9. cross-room tag integrity (service path)
do $$
declare
  other_room uuid;
  mem uuid := '20000000-0000-4000-8000-000000000001';
  tag uuid;
begin
  insert into public.rooms (owner_id, name, life_period) values (current_setting('t.outsider')::uuid, 'Other', 'x') returning id into other_room;
  insert into public.tags (room_id, type, label) values (other_room, 'person', 'Someone') returning id into tag;
  perform t.throws(format('insert into public.memory_tags (memory_id, tag_id, room_id) values (%L, %L, %L)', mem, tag, (select room from ctx)), 'violates foreign key constraint');
  delete from public.rooms where id = other_room;
end $$;

-- ---------------------------------------------------------------- 10. Storage policies (private bucket)
begin;
select t.as_user('owner') as u \gset
do $$
declare
  room text := (select room from ctx);
  mine text := room || '/' || current_setting('t.owner') || '/mem/a.jpg';
  theirs text := room || '/' || current_setting('t.partner') || '/mem/b.jpg';
begin
  insert into storage.objects (bucket_id, name) values ('memory-media', mine);
  perform t.throws(format('insert into storage.objects (bucket_id, name) values (''memory-media'', %L)', theirs), 'row-level security');
  perform t.throws(format('insert into storage.objects (bucket_id, name) values (''memory-media'', %L)', gen_random_uuid() || '/' || current_setting('t.owner') || '/mem/c.jpg'), 'row-level security');
  perform t.throws(format('insert into storage.objects (bucket_id, name) values (''public-bucket'', %L)', mine), 'row-level security');
end $$;
commit;

begin;
select t.as_user('partner') as u \gset
do $$
declare
  room text := (select room from ctx);
  mine text := room || '/' || current_setting('t.partner') || '/mem/b.jpg';
begin
  perform t.eq((select count(*) from storage.objects), 1::bigint, 'member reads the partner object');
  insert into storage.objects (bucket_id, name) values ('memory-media', mine);
  delete from storage.objects where name like '%/' || current_setting('t.owner') || '/%';
  perform t.eq((select count(*) from storage.objects), 2::bigint, 'member cannot delete the partner object');
end $$;
commit;

begin;
select t.as_user('outsider') as u \gset
do $$ begin
  perform t.eq((select count(*) from storage.objects), 0::bigint, 'non-member reads no objects');
  perform t.throws(format('insert into storage.objects (bucket_id, name) values (''memory-media'', %L)', (select room from ctx) || '/' || current_setting('t.outsider') || '/m/x.jpg'), 'row-level security');
end $$;
rollback;

begin;
select t.as_user('owner') as u \gset
do $$ begin
  delete from storage.objects where name like '%/' || current_setting('t.partner') || '/%';
  perform t.eq((select count(*) from storage.objects), 1::bigint, 'room owner can delete members objects (room cleanup)');
end $$;
commit;

select 'private bucket flags', (select public from storage.buckets where id = 'memory-media') as is_public,
       (select file_size_limit from storage.buckets where id = 'memory-media') as limit_bytes;

-- ---------------------------------------------------------------- 11. deletes cascade
begin;
select t.as_user('partner') as u \gset
do $$ begin
  delete from public.memories where id = '20000000-0000-4000-8000-000000000003';
  perform t.eq((select count(*) from public.memories where id = '20000000-0000-4000-8000-000000000003'), 0::bigint, 'author deletes own memory');
end $$;
commit;

begin;
select t.as_user('owner') as u \gset
do $$ begin
  delete from public.rooms where id = (select room::uuid from ctx);
end $$;
reset role;
do $$ begin
  perform t.eq((select count(*) from public.memories where room_id = (select room::uuid from ctx)), 0::bigint, 'room delete cascades memories');
  perform t.eq((select count(*) from public.memory_media), 0::bigint, 'room delete cascades media rows');
  perform t.eq((select count(*) from public.room_members where room_id = (select room::uuid from ctx)), 0::bigint, 'room delete cascades members');
end $$;
commit;

\echo 'ALL DATABASE TESTS PASSED'
