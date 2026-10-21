-- A recipient can change the request status, but cannot rewrite either user ID.
revoke update on public.connections from authenticated;
grant update (status, updated_at) on public.connections to authenticated;
