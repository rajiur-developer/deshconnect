create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('place', 'news')),
  value text not null,
  name text not null check (length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_categories_section_value_unique unique (section, value)
);

create unique index if not exists content_categories_section_name_unique
  on public.content_categories (section, lower(name));
create index if not exists content_categories_section_name_idx
  on public.content_categories (section, name);

insert into public.content_categories (section, value, name) values
  ('place', 'heritage', 'Heritage'),
  ('place', 'beach', 'Beach & Sea'),
  ('place', 'hill', 'Hills & Trekking'),
  ('place', 'forest', 'Forest & Wildlife'),
  ('place', 'river', 'Rivers & Wetlands'),
  ('place', 'park', 'Parks & Nature'),
  ('place', 'city', 'City Highlights'),
  ('news', 'national', 'National'),
  ('news', 'district', 'District'),
  ('news', 'health', 'Health'),
  ('news', 'education', 'Education'),
  ('news', 'sports', 'Sports'),
  ('news', 'community', 'Community')
on conflict (section, value) do update set name = excluded.name;

alter table public.content_categories enable row level security;
revoke all on public.content_categories from anon, authenticated;
grant select on public.content_categories to anon, authenticated;
grant insert, update, delete on public.content_categories to authenticated;

drop policy if exists content_categories_public_read on public.content_categories;
create policy content_categories_public_read
  on public.content_categories for select to anon, authenticated
  using (true);

drop policy if exists content_categories_admin_insert on public.content_categories;
create policy content_categories_admin_insert
  on public.content_categories for insert to authenticated
  with check (public.is_current_user_admin());

drop policy if exists content_categories_admin_update on public.content_categories;
create policy content_categories_admin_update
  on public.content_categories for update to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists content_categories_admin_delete on public.content_categories;
create policy content_categories_admin_delete
  on public.content_categories for delete to authenticated
  using (public.is_current_user_admin());