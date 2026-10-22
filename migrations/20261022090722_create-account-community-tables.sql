-- Core account and community tables. These replace the development-only
-- file-backed data store used by the original prototype.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null default '' check (length(body) <= 2000),
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_places_user_place_unique unique (user_id, place_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null check (length(btrim(title)) between 1 and 160),
  body text not null check (length(btrim(body)) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_author_place_unique unique (place_id, author_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment', 'review', 'news', 'blood_request')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (length(btrim(reason)) between 1 and 200),
  details text,
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  actor_name text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  outcome text not null check (outcome in ('success', 'denied', 'error')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists saved_places_user_created_idx on public.saved_places (user_id, created_at desc);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc);
create index if not exists comments_author_created_idx on public.comments (author_id, created_at desc);
create index if not exists reviews_place_created_idx on public.reviews (place_id, created_at desc);
create index if not exists reviews_author_created_idx on public.reviews (author_id, created_at desc);
create index if not exists reports_reporter_created_idx on public.reports (reporter_id, created_at desc);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.notifications enable row level security;
alter table public.saved_places enable row level security;
alter table public.comments enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.notifications, public.saved_places, public.comments, public.reviews, public.reports, public.audit_logs from anon, authenticated;
grant select, insert, update (read) on public.notifications to authenticated;
grant select, insert, delete on public.saved_places to authenticated;
grant select on public.comments, public.reviews to anon, authenticated;
grant insert, update (body, status, updated_at), delete on public.comments to authenticated;
grant insert, update (rating, title, body, status, updated_at), delete on public.reviews to authenticated;
grant select, insert on public.reports to authenticated;
grant update (status, resolution, updated_at) on public.reports to authenticated;
grant select, insert on public.audit_logs to authenticated;

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own on public.notifications for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists notifications_staff_insert on public.notifications;
create policy notifications_staff_insert on public.notifications for insert to authenticated
  with check (public.is_current_user_staff());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists saved_places_owner_access on public.saved_places;
create policy saved_places_owner_access on public.saved_places for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists saved_places_owner_insert on public.saved_places;
create policy saved_places_owner_insert on public.saved_places for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists saved_places_owner_delete on public.saved_places;
create policy saved_places_owner_delete on public.saved_places for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments for select to anon, authenticated
  using (status = 'visible');
drop policy if exists comments_staff_read on public.comments;
create policy comments_staff_read on public.comments for select to authenticated
  using (public.is_current_user_staff());
drop policy if exists comments_author_insert on public.comments;
create policy comments_author_insert on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'visible');
drop policy if exists comments_author_update on public.comments;
create policy comments_author_update on public.comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and status = 'visible');
drop policy if exists comments_staff_update on public.comments;
create policy comments_staff_update on public.comments for update to authenticated
  using (public.is_current_user_staff())
  with check (public.is_current_user_staff());
drop policy if exists comments_author_delete on public.comments;
create policy comments_author_delete on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select to anon, authenticated
  using (status = 'visible');
drop policy if exists reviews_staff_read on public.reviews;
create policy reviews_staff_read on public.reviews for select to authenticated
  using (public.is_current_user_staff());
drop policy if exists reviews_author_insert on public.reviews;
create policy reviews_author_insert on public.reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'visible');
drop policy if exists reviews_author_update on public.reviews;
create policy reviews_author_update on public.reviews for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and status = 'visible');
drop policy if exists reviews_staff_update on public.reviews;
create policy reviews_staff_update on public.reviews for update to authenticated
  using (public.is_current_user_staff())
  with check (public.is_current_user_staff());
drop policy if exists reviews_author_delete on public.reviews;
create policy reviews_author_delete on public.reviews for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists reports_reporter_read on public.reports;
create policy reports_reporter_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));
drop policy if exists reports_staff_read on public.reports;
create policy reports_staff_read on public.reports for select to authenticated
  using (public.is_current_user_staff());
drop policy if exists reports_reporter_insert on public.reports;
create policy reports_reporter_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');
drop policy if exists reports_staff_update on public.reports;
create policy reports_staff_update on public.reports for update to authenticated
  using (public.is_current_user_staff())
  with check (public.is_current_user_staff());

drop policy if exists audit_logs_actor_insert on public.audit_logs;
create policy audit_logs_actor_insert on public.audit_logs for insert to authenticated
  with check (actor_id = (select auth.uid()));
drop policy if exists audit_logs_staff_read on public.audit_logs;
create policy audit_logs_staff_read on public.audit_logs for select to authenticated
  using (public.is_current_user_staff());
