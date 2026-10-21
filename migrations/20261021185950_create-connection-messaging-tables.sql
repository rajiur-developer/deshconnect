-- Connection requests and private conversations used by the existing app.
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_distinct_users check (requester_id <> addressee_id),
  constraint connections_unique_pair unique (requester_id, addressee_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_ids uuid[] not null,
  conversation_type text not null default 'connection' check (conversation_type in ('connection', 'blood')),
  blood_target_type text,
  blood_target_id uuid,
  updated_at timestamptz not null default now(),
  constraint conversations_two_distinct_participants check (
    cardinality(participant_ids) = 2 and participant_ids[1] <> participant_ids[2]
  )
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  read_by uuid[] not null default '{}',
  attachment_key text,
  attachment_mime_type text,
  attachment_type text check (attachment_type in ('image', 'audio')),
  created_at timestamptz not null default now(),
  constraint messages_content_required check (length(btrim(body)) > 0 or attachment_key is not null),
  constraint messages_attachment_metadata_complete check (
    (attachment_key is null and attachment_mime_type is null and attachment_type is null)
    or (attachment_key is not null and attachment_mime_type is not null and attachment_type is not null)
  )
);

create index if not exists connections_requester_status_idx on public.connections (requester_id, status, created_at desc);
create index if not exists connections_addressee_status_idx on public.connections (addressee_id, status, created_at desc);
create index if not exists conversations_participants_gin_idx on public.conversations using gin (participant_ids);
create unique index if not exists conversations_connection_pair_idx
  on public.conversations (least(participant_ids[1], participant_ids[2]), greatest(participant_ids[1], participant_ids[2]))
  where conversation_type = 'connection';
create unique index if not exists connections_pair_ordered_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index if not exists messages_attachment_key_idx on public.messages (attachment_key) where attachment_key is not null;

alter table public.connections enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select, insert, update, delete on public.connections to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, update on public.messages to authenticated;
revoke all on public.connections, public.conversations, public.messages from anon;

drop policy if exists connections_participant_read on public.connections;
create policy connections_participant_read on public.connections for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
drop policy if exists connections_requester_insert on public.connections;
create policy connections_requester_insert on public.connections for insert to authenticated
  with check (auth.uid() = requester_id and status = 'pending');
drop policy if exists connections_addressee_respond on public.connections;
create policy connections_addressee_respond on public.connections for update to authenticated
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status in ('accepted', 'rejected'));
drop policy if exists connections_requester_cancel on public.connections;
create policy connections_requester_cancel on public.connections for delete to authenticated
  using (auth.uid() = requester_id and status = 'pending');

drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations for select to authenticated
  using (auth.uid() = any(participant_ids));
drop policy if exists conversations_insert_allowed on public.conversations;
create policy conversations_insert_allowed on public.conversations for insert to authenticated
  with check (
    auth.uid() = any(participant_ids) and cardinality(participant_ids) = 2
    and conversation_type = 'connection'
    and exists (
      select 1 from public.connections edge
      where edge.status = 'accepted'
        and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(participant_ids, auth.uid())))
          or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(participant_ids, auth.uid())))
        )
    )
  );

drop policy if exists messages_read_own on public.messages;
create policy messages_read_own on public.messages for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() = any(c.participant_ids)
      and (c.conversation_type = 'blood' or exists (
        select 1 from public.connections edge where edge.status = 'accepted'
          and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
            or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
          )
      ))
  )
);
drop policy if exists messages_insert_auth on public.messages;
create policy messages_insert_auth on public.messages for insert to authenticated with check (
  auth.uid() = sender_id and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() = any(c.participant_ids)
      and (c.conversation_type = 'blood' or exists (
        select 1 from public.connections edge where edge.status = 'accepted'
          and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
            or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
          )
      ))
  )
);

-- Keep chat media private and restrict writes to image/audio object names in
-- the sender's conversation folder.
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
drop policy if exists chat_media_participant_read on storage.objects;
create policy chat_media_participant_read on storage.objects for select to authenticated
  using (
    bucket = 'chat-media'
    and exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.attachment_key = storage.objects.key
        and auth.uid() = any(c.participant_ids)
        and (c.conversation_type = 'blood' or exists (
          select 1 from public.connections edge
          where edge.status = 'accepted'
            and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
              or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
            )
        ))
    )
  );
drop policy if exists chat_media_sender_upload on storage.objects;
create policy chat_media_sender_upload on storage.objects for insert to authenticated
  with check (
    bucket = 'chat-media'
    and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub')
    and (storage.foldername(key))[2] ~ '^[0-9a-fA-F-]{36}$'
    and storage.filename(key) ~* '\.(jpe?g|png|webp|webm|mp4|m4a|mp3|ogg|wav|aac)$'
    and exists (
      select 1 from public.conversations c
      where c.id = (storage.foldername(key))[2]::uuid
        and auth.uid() = any(c.participant_ids)
        and (c.conversation_type = 'blood' or exists (
          select 1 from public.connections edge
          where edge.status = 'accepted'
            and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
              or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
            )
        ))
    )
  );
drop policy if exists chat_media_sender_delete on storage.objects;
create policy chat_media_sender_delete on storage.objects for delete to authenticated
  using (bucket = 'chat-media' and (storage.foldername(key))[1] = (select auth.jwt() ->> 'sub'));

create or replace function public.publish_chat_message()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform realtime.publish('chat:' || new.conversation_id::text, 'new_message', jsonb_build_object(
    'id', new.id, 'conversation_id', new.conversation_id, 'sender_id', new.sender_id,
    'body', new.body, 'attachment_key', new.attachment_key,
    'attachment_mime_type', new.attachment_mime_type, 'attachment_type', new.attachment_type,
    'created_at', new.created_at
  ));
  return new;
end;
$$;
drop trigger if exists publish_chat_message_after_insert on public.messages;
create trigger publish_chat_message_after_insert after insert on public.messages
  for each row execute function public.publish_chat_message();
