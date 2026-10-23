DROP POLICY IF EXISTS chat_media_v2_sender_upload ON storage.objects;
CREATE POLICY chat_media_v2_sender_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'chat-media-v2'
    AND (storage.foldername(key))[1] = (SELECT auth.jwt() ->> 'sub')
  );