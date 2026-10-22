create table if not exists public.platform_settings (
  id text primary key default 'platform' check (id = 'platform'),
  site_name text not null default 'DeshConnect',
  allow_public_posts boolean not null default true,
  require_news_approval boolean not null default true,
  donor_directory_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant select, insert, update on public.platform_settings to authenticated;
drop policy if exists platform_settings_staff_read on public.platform_settings;
create policy platform_settings_staff_read on public.platform_settings for select to authenticated using (public.is_current_user_staff());
drop policy if exists platform_settings_staff_insert on public.platform_settings;
create policy platform_settings_staff_insert on public.platform_settings for insert to authenticated with check (public.is_current_user_staff());
drop policy if exists platform_settings_staff_update on public.platform_settings;
create policy platform_settings_staff_update on public.platform_settings for update to authenticated using (public.is_current_user_staff()) with check (public.is_current_user_staff());
