ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_for uuid[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS messages_read_own ON public.messages;
CREATE POLICY messages_read_own ON public.messages FOR SELECT TO authenticated USING (
  NOT (auth.uid() = ANY(deleted_for))
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids)
      AND (
        c.conversation_type = 'blood'
        OR EXISTS (
          SELECT 1 FROM public.connections edge
          WHERE edge.status = 'accepted'
            AND (
              (edge.requester_id = auth.uid() AND edge.addressee_id = ANY(array_remove(c.participant_ids, auth.uid())))
              OR (edge.addressee_id = auth.uid() AND edge.requester_id = ANY(array_remove(c.participant_ids, auth.uid())))
            )
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.hide_chat_message_for_current_user(target_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.messages m
  SET deleted_for = array_append(m.deleted_for, current_user_id)
  FROM public.conversations c
  WHERE m.id = target_message_id
    AND m.conversation_id = c.id
    AND current_user_id = ANY(c.participant_ids)
    AND NOT (current_user_id = ANY(m.deleted_for))
    AND c.conversation_type = 'connection'
    AND EXISTS (
      SELECT 1 FROM public.connections edge
      WHERE edge.status = 'accepted'
        AND (
          (edge.requester_id = current_user_id AND edge.addressee_id = ANY(array_remove(c.participant_ids, current_user_id)))
          OR (edge.addressee_id = current_user_id AND edge.requester_id = ANY(array_remove(c.participant_ids, current_user_id)))
        )
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.hide_chat_message_for_current_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hide_chat_message_for_current_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_expired_blood_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.blood_requests
  WHERE needed_by::timestamp + INTERVAL '60 hours'
    <= (now() AT TIME ZONE 'Asia/Dhaka');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expired_blood_requests() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_blood_requests() TO anon;
