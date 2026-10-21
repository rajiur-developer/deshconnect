-- Create the community posts table in InsForge before adding image support.
-- Location IDs are kept as UUID values here because those location tables are
-- provisioned independently from the community feature.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  image text,
  image_key text,
  reactions integer not null default 0 check (reactions >= 0),
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'pending', 'deleted')),
  division_id uuid,
  district_id uuid,
  upazila_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_created_idx
  on public.posts (status, created_at desc);
create index if not exists posts_author_created_idx
  on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (author_id, body, image, image_key, reactions, status,
  division_id, district_id, upazila_id) on public.posts to authenticated;
grant update (body, image, image_key, reactions, status, division_id,
  district_id, upazila_id, updated_at) on public.posts to authenticated;
grant delete on public.posts to authenticated;

drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select to anon, authenticated using (status = 'visible');

drop policy if exists posts_moderation_read on public.posts;
create policy posts_moderation_read on public.posts
  for select to authenticated using (public.is_current_user_staff());

drop policy if exists posts_insert_owner on public.posts;
create policy posts_insert_owner on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists posts_update_owner_or_staff on public.posts;
create policy posts_update_owner_or_staff on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_current_user_staff())
  with check (author_id = (select auth.uid()) or public.is_current_user_staff());

drop policy if exists posts_delete_owner_or_staff on public.posts;
create policy posts_delete_owner_or_staff on public.posts
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_current_user_staff());

-- Community posts retain the Storage object key for future image management.
alter table public.posts add column if not exists image_key text;

-- Community post images are visible wherever the post is visible.
drop policy if exists community_post_images_public_read on storage.objects;
create policy community_post_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket = 'profile-images');

grant select on storage.objects to anon, authenticated;
grant usage on schema storage to anon;

-- Moderators can review hidden posts and remove only images attached to posts.
drop policy if exists community_moderators_delete_post_images on storage.objects;
create policy community_moderators_delete_post_images on storage.objects
  for delete to authenticated
  using (
    bucket = 'profile-images'
    and exists (
      select 1 from public.profiles moderator
      where moderator.id = auth.uid() and moderator.role in ('admin', 'moderator')
    )
    and exists (
      select 1 from public.posts post
      where post.image like '%' || replace(storage.objects.key, '/', '%2F')
    )
  );
