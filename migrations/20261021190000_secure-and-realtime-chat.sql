-- Keep ordinary member chats gated by an accepted connection. Blood chats are
-- started from a specific public donor/request listing and remain separate.
alter table public.conversations
  add column if not exists conversation_type text not null default 'connection';
alter table public.conversations
  add column if not exists blood_target_type text;
alter table public.conversations
  add column if not exists blood_target_id uuid;

alter table public.conversations
  drop constraint if exists conversations_conversation_type_check;
alter table public.conversations
  add constraint conversations_conversation_type_check
  check (conversation_type in ('connection', 'blood'));

drop policy if exists conversations_insert_allowed on public.conversations;
create policy conversations_insert_allowed on public.conversations
  for insert to authenticated with check (
    auth.uid() = any(participant_ids)
    and cardinality(participant_ids) = 2
    and (
      (
        conversation_type = 'connection'
        and exists (
          select 1 from public.connections edge
          where edge.status = 'accepted'
            and (
              (edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(participant_ids, auth.uid())))
              or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(participant_ids, auth.uid())))
            )
        )
      )
      or (
        conversation_type = 'blood' and blood_target_id is not null
        and (
          (blood_target_type = 'donor' and exists (
            select 1 from public.blood_donors donor
            where donor.id = blood_target_id and donor.consent_listed = true
              and donor.user_id = any(array_remove(participant_ids, auth.uid()))
          ))
          or (blood_target_type = 'request' and exists (
            select 1 from public.blood_requests request
            where request.id = blood_target_id and request.status = 'active'
              and request.requester_id = any(array_remove(participant_ids, auth.uid()))
          ))
        )
      )
    )
  );

drop policy if exists messages_read_own on public.messages;
create policy messages_read_own on public.messages for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() = any(c.participant_ids)
      and (
        c.conversation_type = 'blood'
        or exists (
          select 1 from public.connections edge
          where edge.status = 'accepted'
            and (
              (edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
              or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
            )
        )
      )
  )
);

drop policy if exists messages_insert_auth on public.messages;
create policy messages_insert_auth on public.messages for insert to authenticated with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() = any(c.participant_ids)
      and (
        c.conversation_type = 'blood'
        or exists (
          select 1 from public.connections edge
          where edge.status = 'accepted'
            and (
              (edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
              or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
            )
        )
      )
  )
);

insert into realtime.channels (pattern, description, enabled)
values ('chat:%', 'Private chat events for conversation participants', true)
on conflict (pattern) do update
set description = excluded.description, enabled = excluded.enabled;

alter table realtime.channels enable row level security;
drop policy if exists chat_participants_subscribe on realtime.channels;
create policy chat_participants_subscribe on realtime.channels
  for select to authenticated
  using (
    pattern = 'chat:%'
    and exists (
      select 1 from public.conversations c
      where c.id = nullif(split_part(realtime.channel_name(), ':', 2), '')::uuid
        and auth.uid() = any(c.participant_ids)
        and (
          c.conversation_type = 'blood'
          or exists (
            select 1 from public.connections edge
            where edge.status = 'accepted'
              and (
                (edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
                or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
              )
          )
        )
    )
  );

create or replace function public.publish_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform realtime.publish(
    'chat:' || new.conversation_id::text,
    'new_message',
    jsonb_build_object(
      'id', new.id,
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id,
      'body', new.body,
      'created_at', new.created_at
    )
  );
  return new;
end;
$$;

drop trigger if exists publish_chat_message_after_insert on public.messages;
create trigger publish_chat_message_after_insert
  after insert on public.messages
  for each row execute function public.publish_chat_message();
