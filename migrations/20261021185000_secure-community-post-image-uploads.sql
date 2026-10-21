-- Community attachments are intentionally public content, but uploads and
-- owner deletes remain restricted to the authenticated user's own key prefix.
drop policy if exists community_post_images_insert_own on storage.objects;
create policy community_post_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket = 'community-post-images'
    and (storage.foldername(key))[1] = (select (auth.jwt() ->> 'sub'))
  );

drop policy if exists community_post_images_delete_own on storage.objects;
create policy community_post_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket = 'community-post-images'
    and (storage.foldername(key))[1] = (select (auth.jwt() ->> 'sub'))
  );

drop policy if exists community_moderators_delete_post_images on storage.objects;
create policy community_moderators_delete_post_images on storage.objects
  for delete to authenticated
  using (
    bucket = 'community-post-images'
    and public.is_current_user_staff()
    and exists (
      select 1 from public.posts post
      where post.image_key = storage.objects.key
    )
  );
