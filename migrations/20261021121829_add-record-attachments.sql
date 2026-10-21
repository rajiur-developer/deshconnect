alter table public.sample_records
  add column if not exists attachment_url text,
  add column if not exists attachment_key text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size bigint;

revoke all on public.sample_records from authenticated;
grant select (id, user_id, title, category, description, created_at,
  attachment_url, attachment_key, attachment_name, attachment_mime_type, attachment_size)
  on public.sample_records to authenticated;
grant insert (title, category, description, attachment_url, attachment_key,
  attachment_name, attachment_mime_type, attachment_size)
  on public.sample_records to authenticated;
grant update (title, category, description) on public.sample_records to authenticated;
grant delete on public.sample_records to authenticated;

alter table storage.objects enable row level security;

create policy record_attachments_select_own on storage.objects
  for select to authenticated
  using (
    bucket = 'record-attachments'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

create policy record_attachments_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket = 'record-attachments'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

create policy record_attachments_update_own on storage.objects
  for update to authenticated
  using (
    bucket = 'record-attachments'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket = 'record-attachments'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

create policy record_attachments_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket = 'record-attachments'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
  );

grant select, insert, update, delete on storage.objects to authenticated;
grant usage on schema storage to authenticated;
