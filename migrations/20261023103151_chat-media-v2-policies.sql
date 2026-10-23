ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;

CREATE POLICY chat_media_v2_participant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'chat-media-v2'
    AND EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.attachment_key = storage.objects.key
        AND auth.uid() = ANY(c.participant_ids)
        AND (
          c.conversation_type = 'blood'
          OR EXISTS (
            SELECT 1
            FROM public.connections edge
            WHERE edge.status = 'accepted'
              AND (
                (edge.requester_id = auth.uid() AND edge.addressee_id = ANY(array_remove(c.participant_ids, auth.uid())))
                OR (edge.addressee_id = auth.uid() AND edge.requester_id = ANY(array_remove(c.participant_ids, auth.uid())))
              )
          )
        )
    )
  );

CREATE POLICY chat_media_v2_sender_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'chat-media-v2'
    AND (storage.foldername(key))[1] = (SELECT auth.uid()::text)
    AND (storage.foldername(key))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND storage.filename(key) ~* '\.(jpe?g|png|webp|webm|mp4|m4a|mp3|ogg|wav|aac)$'
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = (storage.foldername(key))[2]::uuid
        AND auth.uid() = ANY(c.participant_ids)
        AND (
          c.conversation_type = 'blood'
          OR EXISTS (
            SELECT 1
            FROM public.connections edge
            WHERE edge.status = 'accepted'
              AND (
                (edge.requester_id = auth.uid() AND edge.addressee_id = ANY(array_remove(c.participant_ids, auth.uid())))
                OR (edge.addressee_id = auth.uid() AND edge.requester_id = ANY(array_remove(c.participant_ids, auth.uid())))
              )
          )
        )
    )
  );

CREATE POLICY chat_media_v2_sender_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'chat-media-v2'
    AND (storage.foldername(key))[1] = (SELECT auth.uid()::text)
  );