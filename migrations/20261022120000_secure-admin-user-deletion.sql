create or replace function public.admin_delete_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  requester_role text;
  target_role text;
  deleted_count integer;
begin
  select role into requester_role from public.profiles where id = auth.uid();
  if requester_role is distinct from 'admin' then
    raise exception 'Only administrators can delete accounts' using errcode = '42501';
  end if;
  select role into target_role from public.profiles where id = target_user_id;
  if target_role is null then return false; end if;
  if target_role = 'admin' then
    raise exception 'Administrator accounts cannot be deleted through this action' using errcode = '42501';
  end if;
  delete from auth.users where id = target_user_id;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
