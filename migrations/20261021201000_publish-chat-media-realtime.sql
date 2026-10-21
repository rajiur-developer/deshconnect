-- The following migration replaces this function for its authorization rules;
-- restore attachment metadata in realtime payloads after it has been applied.
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
