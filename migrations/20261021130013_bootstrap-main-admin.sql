-- One-time bootstrap for the account the project owner identified as the first admin.
-- The migration runner wraps this file in a transaction, so a failure restores the trigger.
alter table public.profiles disable trigger profiles_guard_privileges;

update public.profiles
set role = 'admin'
where username = 'rajiurrahman21_810c53'
  and full_name = 'Main Admin'
  and role = 'user';

alter table public.profiles enable trigger profiles_guard_privileges;
