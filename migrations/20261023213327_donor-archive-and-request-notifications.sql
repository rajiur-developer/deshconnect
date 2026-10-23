ALTER TABLE public.blood_donors
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

GRANT UPDATE ON public.blood_donors TO authenticated;
DROP POLICY IF EXISTS blood_donors_staff_update ON public.blood_donors;
CREATE POLICY blood_donors_staff_update ON public.blood_donors
  FOR UPDATE TO authenticated
  USING (public.is_current_user_staff())
  WITH CHECK (public.is_current_user_staff());

CREATE OR REPLACE VIEW public.public_blood_donors AS
SELECT id, user_id, blood_group, availability, preferred_contact, donation_count,
       consent_listed, division_id, district_id, upazila_id, created_at, updated_at,
       phone, whatsapp
FROM public.blood_donors
WHERE consent_listed = true
  AND consent_contact = true
  AND consent_expiry >= now()
  AND archived_at IS NULL;

GRANT SELECT ON public.public_blood_donors TO anon, authenticated;

DROP POLICY IF EXISTS conversations_insert_allowed ON public.conversations;
CREATE POLICY conversations_insert_allowed ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = ANY(participant_ids)
    AND cardinality(participant_ids) = 2
    AND (
      (
        conversation_type = 'connection'
        AND EXISTS (
          SELECT 1 FROM public.connections AS edge
          WHERE edge.status = 'accepted'
            AND (
              (edge.requester_id = auth.uid() AND edge.addressee_id = ANY(array_remove(participant_ids, auth.uid())))
              OR (edge.addressee_id = auth.uid() AND edge.requester_id = ANY(array_remove(participant_ids, auth.uid())))
            )
        )
      )
      OR (
        conversation_type = 'blood'
        AND blood_target_id IS NOT NULL
        AND (
          (
            blood_target_type = 'donor'
            AND EXISTS (
              SELECT 1 FROM public.public_blood_donors AS donor
              WHERE donor.id = blood_target_id
                AND donor.user_id = ANY(array_remove(participant_ids, auth.uid()))
            )
          )
          OR (
            blood_target_type = 'request'
            AND EXISTS (
              SELECT 1 FROM public.blood_requests AS request
              WHERE request.id = blood_target_id
                AND request.status = 'active'
                AND request.requester_id = ANY(array_remove(participant_ids, auth.uid()))
            )
          )
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.notify_donors_on_blood_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, href)
  SELECT DISTINCT donor.user_id,
         'New blood request',
         format('A new %s blood request was submitted and is awaiting admin review.', NEW.blood_group),
         '/blood-donation'
  FROM public.blood_donors AS donor
  WHERE donor.user_id <> NEW.requester_id
    AND donor.consent_listed = true
    AND donor.consent_contact = true
    AND donor.consent_expiry >= now()
    AND donor.archived_at IS NULL;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_donors_on_blood_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS blood_request_notify_registered_donors ON public.blood_requests;
CREATE TRIGGER blood_request_notify_registered_donors
  AFTER INSERT ON public.blood_requests
  FOR EACH ROW
  WHEN (NEW.status = 'under_review')
  EXECUTE FUNCTION public.notify_donors_on_blood_request();