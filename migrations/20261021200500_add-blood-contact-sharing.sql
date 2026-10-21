alter table public.blood_requests
  add column if not exists phone text,
  add column if not exists whatsapp text;

-- A public donor listing includes contact details only when the donor opted in
-- to both public listing and contact sharing, and the consent is still current.
create or replace view public.public_blood_donors as
select id, user_id, blood_group, availability, preferred_contact, donation_count,
       consent_listed, division_id, district_id, upazila_id, created_at, updated_at,
       phone, whatsapp
from public.blood_donors
where consent_listed = true and consent_contact = true and consent_expiry >= now();

grant select on public.public_blood_donors to anon, authenticated;
grant select (phone, whatsapp) on public.blood_requests to anon, authenticated;
