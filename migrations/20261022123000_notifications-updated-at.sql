-- Notification read actions use the shared update helper, which records updated_at.
alter table public.notifications
  add column if not exists updated_at timestamptz not null default now();

grant update (read, updated_at) on public.notifications to authenticated;
