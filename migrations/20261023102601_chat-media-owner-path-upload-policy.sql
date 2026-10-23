DROP POLICY IF EXISTS chat_media_sender_upload ON storage.objects;
CREATE POLICY chat_media_sender_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'chat-media'
    AND (storage.foldername(key))[1] = (SELECT auth.uid()::text)
    AND (storage.foldername(key))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND storage.filename(key) ~* '\.(jpe?g|png|webp|webm|mp4|m4a|mp3|ogg|wav|aac)$'
  );

DROP FUNCTION IF EXISTS public.can_upload_chat_media(uuid);