-- Allow staff to review the notification queue in admin tools.
grant select on public.notifications to authenticated;
drop policy if exists notifications_staff_read on public.notifications;
create policy notifications_staff_read on public.notifications for select to authenticated
  using (public.is_current_user_staff());
