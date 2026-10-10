-- Tighten table privileges. Supabase grants every privilege on a new public table or view to `authenticated` by default,
-- and 20261011000000_room_frame_slots.sql only revoked them from `anon` and `public`. Row Level Security already stopped
-- writes to room_frame_slots (no write policy), but the privileges themselves (INSERT, UPDATE, DELETE, TRUNCATE, ...)
-- were still there, and TRUNCATE is not subject to RLS. The room_summaries view had the same defaults.
-- Both are read-only for signed-in users; room_frame_slots is only written by set_frame_layout (SECURITY DEFINER).
-- Same shape as the grants of the other tables in 20261010000100_security.sql. Removes no data.

revoke all on public.room_frame_slots from authenticated;
grant select on public.room_frame_slots to authenticated;

revoke all on public.room_summaries from authenticated;
grant select on public.room_summaries to authenticated;
