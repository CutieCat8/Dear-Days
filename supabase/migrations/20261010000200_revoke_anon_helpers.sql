-- Signed-out visitors have no table access at all, so the helper functions used inside RLS policies are not
-- reachable through any policy for them. Supabase grants EXECUTE to anon by default; take it away so these
-- SECURITY DEFINER helpers are not callable at /rest/v1/rpc/* without signing in. `authenticated` keeps EXECUTE
-- because the RLS policies are evaluated with the caller's privileges.
revoke execute on function public.try_uuid(text) from anon, public;
revoke execute on function public.is_room_member(uuid) from anon, public;
revoke execute on function public.is_room_owner(uuid) from anon, public;
revoke execute on function public.shares_room_with(uuid) from anon, public;
revoke execute on function public.memory_room_id(uuid) from anon, public;
