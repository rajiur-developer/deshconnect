alter table public.profiles
  add column if not exists avatar_key text;

grant update (avatar_key) on public.profiles to authenticated;

alter table storage.objects enable row level security;

drop policy if exists profile_images_select_own on storage.objects;
create policy profile_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket = 'profile-images'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists profile_images_insert_own on storage.objects;
create policy profile_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket = 'profile-images'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists profile_images_update_own on storage.objects;
create policy profile_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket = 'profile-images'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket = 'profile-images'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

drop policy if exists profile_images_delete_own on storage.objects;
create policy profile_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket = 'profile-images'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

grant select, insert, update, delete on storage.objects to authenticated;
grant usage on schema storage to authenticated;
