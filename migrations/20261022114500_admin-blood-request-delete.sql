grant delete on public.blood_requests to authenticated;
drop policy if exists blood_requests_staff_delete on public.blood_requests;
create policy blood_requests_staff_delete on public.blood_requests for delete to authenticated
  using (public.is_current_user_staff());
