-- The public image-read policies already restrict anonymous access to the
-- profile-images bucket. Give anon the schema/table privileges needed for
-- InsForge Storage to evaluate those policies and mint signed read URLs.
grant usage on schema storage to anon;
grant select on storage.objects to anon;
