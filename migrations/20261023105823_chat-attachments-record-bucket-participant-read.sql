CREATE POLICY record_attachments_chat_participant_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'record-attachments'
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