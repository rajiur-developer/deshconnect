alter table public.profiles
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  add constraint profiles_full_name_bounds check (length(btrim(full_name)) between 1 and 120);

create or replace function public.set_sample_record_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.user_id := auth.uid();
    elsif current_user = 'project_admin' and new.user_id is not null then
      null;
    else
      raise exception 'Sign in is required to create a record' using errcode = '42501';
    end if;
  elsif new.user_id is distinct from old.user_id and current_user <> 'project_admin' then
    raise exception 'Record ownership cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
