create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  email text not null,
  phone text,
  avatar text,
  bio text,
  division_id uuid,
  district_id uuid,
  upazila_id uuid,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  email_verified boolean not null default false,
  terms_accepted_at timestamptz,
  blood_group text,
  gender text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
alter table public.profiles enable row level security;

create or replace function public.is_current_user_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and role in ('admin', 'moderator')
  );
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
set row_security = off
as $$
begin
  if tg_op = 'INSERT' then
    new.role := 'user';
    new.status := 'active';
    new.email_verified := coalesce((auth.jwt()->>'email_verified')::boolean, false);
  elsif (new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.email_verified is distinct from old.email_verified)
      and not public.is_current_user_staff() then
    raise exception 'Only staff can change protected account fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_current_user_staff());
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = (select auth.uid()) or public.is_current_user_staff())
  with check (id = (select auth.uid()) or public.is_current_user_staff());

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select, insert on public.profiles to authenticated;
grant update (username, full_name, phone, avatar, bio, division_id, district_id, upazila_id, terms_accepted_at, blood_group, gender, date_of_birth, updated_at, role, status, email_verified)
  on public.profiles to authenticated;
grant execute on function public.is_current_user_staff() to authenticated;

create or replace view public.public_profiles as
  select id, username, full_name, avatar, bio, division_id, district_id, upazila_id, created_at
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;

alter table public.sample_records
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists sample_records_user_created_idx
  on public.sample_records (user_id, created_at desc);

create or replace function public.set_sample_record_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Sign in is required to create a record' using errcode = '42501';
    end if;
    new.user_id := auth.uid();
  elsif new.user_id is distinct from old.user_id then
    raise exception 'Record ownership cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists sample_records_set_owner on public.sample_records;
create trigger sample_records_set_owner
  before insert or update on public.sample_records
  for each row execute function public.set_sample_record_owner();

alter table public.sample_records enable row level security;
drop policy if exists sample_records_select_owner on public.sample_records;
create policy sample_records_select_owner on public.sample_records
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists sample_records_insert_owner on public.sample_records;
create policy sample_records_insert_owner on public.sample_records
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists sample_records_update_owner on public.sample_records;
create policy sample_records_update_owner on public.sample_records
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists sample_records_delete_owner on public.sample_records;
create policy sample_records_delete_owner on public.sample_records
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.sample_records from anon;
revoke all on public.sample_records from authenticated;
grant select (id, user_id, title, category, description, created_at) on public.sample_records to authenticated;
grant insert (title, category, description) on public.sample_records to authenticated;
grant update (title, category, description) on public.sample_records to authenticated;
grant delete on public.sample_records to authenticated;
