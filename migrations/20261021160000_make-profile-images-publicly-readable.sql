-- Profile photos are public profile data, so anyone viewing a profile can load its image.
drop policy if exists profile_images_public_read on storage.objects;
create policy profile_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket = 'profile-images');

grant select on storage.objects to anon, authenticated;
grant usage on schema storage to anon;

create or replace view public.public_profiles as
  -- Keep the existing public view column order and append the new key column.
  select id, username, full_name, avatar, bio, division_id, district_id, upazila_id, created_at, avatar_key
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;
