alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages(id) on delete set null,
  add column if not exists reactions jsonb not null default '[]'::jsonb;

create index if not exists messages_reply_to_message_id_idx
  on public.messages (reply_to_message_id)
  where reply_to_message_id is not null;

create or replace function public.toggle_message_reaction(target_message_id uuid, target_emoji text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_conversation_id uuid;
  current_reactions jsonb;
  has_reaction boolean;
  next_reactions jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if target_emoji not in ('👍', '❤️', '😂', '😮', '😢', '🙏') then
    raise exception 'Unsupported reaction' using errcode = '22023';
  end if;

  select m.conversation_id, coalesce(m.reactions, '[]'::jsonb)
    into target_conversation_id, current_reactions
    from public.messages m
    where m.id = target_message_id
    for update;

  if target_conversation_id is null or not exists (
    select 1
    from public.conversations c
    join public.connections edge on edge.status = 'accepted'
      and ((edge.requester_id = current_user_id and edge.addressee_id = any(array_remove(c.participant_ids, current_user_id)))
        or (edge.addressee_id = current_user_id and edge.requester_id = any(array_remove(c.participant_ids, current_user_id))))
    where c.id = target_conversation_id
      and c.conversation_type = 'connection'
      and current_user_id = any(c.participant_ids)
  ) then
    raise exception 'Message is unavailable' using errcode = '42501';
  end if;

  has_reaction := exists (
    select 1 from jsonb_array_elements(current_reactions) reaction
    where reaction->>'userId' = current_user_id::text and reaction->>'emoji' = target_emoji
  );

  select coalesce(jsonb_agg(reaction), '[]'::jsonb)
    into next_reactions
    from jsonb_array_elements(current_reactions) reaction
    where not (reaction->>'userId' = current_user_id::text and reaction->>'emoji' = target_emoji);

  if not has_reaction then
    next_reactions := next_reactions || jsonb_build_array(jsonb_build_object('userId', current_user_id, 'emoji', target_emoji));
  end if;

  update public.messages set reactions = next_reactions where id = target_message_id;
  return next_reactions;
end;
$$;

revoke all on function public.toggle_message_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;
