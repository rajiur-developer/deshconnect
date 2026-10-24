grant select, insert, update, delete on public.institutions to authenticated;

drop policy if exists institutions_staff_access on public.institutions;
create policy institutions_staff_access on public.institutions for all to authenticated
  using (public.is_current_user_staff()) with check (public.is_current_user_staff());
