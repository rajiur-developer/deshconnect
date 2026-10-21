create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  body text not null,
  image text not null default '/images/news/user.svg',
  category text not null check (category in ('national', 'district', 'health', 'education', 'sports', 'community')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  source text,
  status text not null default 'pending_review'
    check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_status_published_idx
  on public.news (status, published_at desc nulls last);
create index if not exists news_author_created_idx
  on public.news (author_id, created_at desc);

alter table public.news enable row level security;
revoke all on public.news from anon, authenticated;
grant select on public.news to anon, authenticated;
grant insert (slug, title, excerpt, body, image, category, author_id, source, status)
  on public.news to authenticated;
grant update (status, published_at, updated_at)
  on public.news to authenticated;

drop policy if exists news_public_read on public.news;
create policy news_public_read on public.news
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists news_author_read on public.news;
create policy news_author_read on public.news
  for select to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists news_staff_read on public.news;
create policy news_staff_read on public.news
  for select to authenticated
  using (public.is_current_user_staff());

drop policy if exists news_author_insert_pending on public.news;
create policy news_author_insert_pending on public.news
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'pending_review'
  );

drop policy if exists news_staff_update on public.news;
create policy news_staff_update on public.news
  for update to authenticated
  using (public.is_current_user_staff())
  with check (public.is_current_user_staff());

create or replace function public.set_news_published_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists news_set_published_at on public.news;
create trigger news_set_published_at
  before insert or update of status, published_at on public.news
  for each row execute function public.set_news_published_at();
