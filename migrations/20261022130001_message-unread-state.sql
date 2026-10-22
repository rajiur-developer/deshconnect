create or replace function public.get_unread_message_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
  select c.id, count(m.id)
  from public.conversations c
  join public.connections edge
    on edge.status = 'accepted'
   and (
     (edge.requester_id = auth.uid() and edge.addressee_id = any(array_remove(c.participant_ids, auth.uid())))
     or (edge.addressee_id = auth.uid() and edge.requester_id = any(array_remove(c.participant_ids, auth.uid())))
   )
  left join public.messages m
    on m.conversation_id = c.id
   and m.sender_id <> auth.uid()
   and not (auth.uid() = any(m.read_by))
  where auth.uid() is not null
    and c.conversation_type = 'connection'
    and auth.uid() = any(c.participant_ids)
  group by c.id;
$$;

create or replace function public.mark_conversation_messages_read(target_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  affected_count integer;
begin
  if current_user_id is null or not exists (
    select 1
    from public.conversations c
    join public.connections edge
      on edge.status = 'accepted'
     and (
       (edge.requester_id = current_user_id and edge.addressee_id = any(array_remove(c.participant_ids, current_user_id)))
       or (edge.addressee_id = current_user_id and edge.requester_id = any(array_remove(c.participant_ids, current_user_id)))
     )
    where c.id = target_conversation_id
      and c.conversation_type = 'connection'
      and current_user_id = any(c.participant_ids)
  ) then
    raise exception 'Conversation is unavailable' using errcode = '42501';
  end if;

  update public.messages m
     set read_by = array_append(m.read_by, current_user_id)
   where m.conversation_id = target_conversation_id
     and m.sender_id <> current_user_id
     and not (current_user_id = any(m.read_by));
  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

revoke all on function public.get_unread_message_counts() from public, anon;
revoke all on function public.mark_conversation_messages_read(uuid) from public, anon;
grant execute on function public.get_unread_message_counts() to authenticated;
grant execute on function public.mark_conversation_messages_read(uuid) to authenticated;
