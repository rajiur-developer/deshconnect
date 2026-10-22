-- Delivery receipts and owner-only message controls for connection chats.
alter table public.messages
  add column if not exists delivered_to uuid[] not null default '{}',
  add column if not exists edited_at timestamptz;

revoke update on public.messages from authenticated;
grant update (body, edited_at) on public.messages to authenticated;
grant delete on public.messages to authenticated;

drop policy if exists messages_sender_edit_own on public.messages;
create policy messages_sender_edit_own on public.messages for update to authenticated
  using (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() = any(c.participant_ids)
      and c.conversation_type = 'connection'
      and exists (select 1 from public.connections edge where edge.status = 'accepted'
        and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
          or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))))
  ))
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() = any(c.participant_ids)
      and c.conversation_type = 'connection'
      and exists (select 1 from public.connections edge where edge.status = 'accepted'
        and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
          or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))))
  ));

drop policy if exists messages_sender_delete_own on public.messages;
create policy messages_sender_delete_own on public.messages for delete to authenticated
  using (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() = any(c.participant_ids)
      and c.conversation_type = 'connection'
      and exists (select 1 from public.connections edge where edge.status = 'accepted'
        and ((edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
          or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))))
  ));

create or replace function public.mark_conversation_messages_delivered(target_conversation_id uuid)
returns integer
language plpgsql security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  affected_count integer;
begin
  if current_user_id is null or not exists (
    select 1 from public.conversations c
    join public.connections edge on edge.status = 'accepted'
      and ((edge.requester_id = current_user_id and edge.addressee_id = any(array_remove(c.participant_ids, current_user_id)))
        or (edge.addressee_id = current_user_id and edge.requester_id = any(array_remove(c.participant_ids, current_user_id))))
    where c.id = target_conversation_id and c.conversation_type = 'connection'
      and current_user_id = any(c.participant_ids)
  ) then
    raise exception 'Conversation is unavailable' using errcode = '42501';
  end if;
  update public.messages m
    set delivered_to = array_append(m.delivered_to, current_user_id)
    where m.conversation_id = target_conversation_id and m.sender_id <> current_user_id
      and not (current_user_id = any(m.delivered_to));
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

revoke all on function public.mark_conversation_messages_delivered(uuid) from public, anon;
grant execute on function public.mark_conversation_messages_delivered(uuid) to authenticated;

create or replace function public.publish_chat_message_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  row_data jsonb;
  target_conversation_id uuid;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
    target_conversation_id := old.conversation_id;
  else
    row_data := to_jsonb(new);
    target_conversation_id := new.conversation_id;
  end if;
  perform realtime.publish('chat:' || target_conversation_id::text,
    case when tg_op = 'DELETE' then 'message_deleted' else 'message_updated' end,
    jsonb_build_object('operation', tg_op, 'record', row_data));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists publish_chat_message_change on public.messages;
create trigger publish_chat_message_change after update or delete on public.messages
  for each row execute function public.publish_chat_message_change();
