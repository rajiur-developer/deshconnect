create table if not exists public.role_permission_overrides (
  role text primary key check (role in ('user', 'moderator', 'admin')),
  actions text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.role_permission_overrides enable row level security;
revoke all on public.role_permission_overrides from anon, authenticated;
grant select, insert, update on public.role_permission_overrides to authenticated;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists role_permission_overrides_select_staff on public.role_permission_overrides;
create policy role_permission_overrides_select_staff
  on public.role_permission_overrides for select to authenticated
  using (public.is_current_user_staff());

drop policy if exists role_permission_overrides_insert_admin on public.role_permission_overrides;
create policy role_permission_overrides_insert_admin
  on public.role_permission_overrides for insert to authenticated
  with check (public.is_current_user_admin());

drop policy if exists role_permission_overrides_update_admin on public.role_permission_overrides;
create policy role_permission_overrides_update_admin
  on public.role_permission_overrides for update to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());
