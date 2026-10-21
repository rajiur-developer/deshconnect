-- Keep Storage RLS aligned with the dedicated public community bucket, while
-- retaining moderation access to attachments on older posts in profile-images.
drop policy if exists community_post_images_public_read on storage.objects;
create policy community_post_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket = 'community-post-images');

drop policy if exists community_moderators_delete_legacy_post_images on storage.objects;
create policy community_moderators_delete_legacy_post_images on storage.objects
  for delete to authenticated
  using (
    bucket = 'profile-images'
    and public.is_current_user_staff()
    and exists (
      select 1 from public.posts post
      where post.image_key = storage.objects.key
        and post.image like '%/buckets/profile-images/%'
    )
  );
