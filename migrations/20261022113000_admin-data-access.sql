-- Staff need scoped access for moderation and administration workflows.
grant select, insert, update, delete on public.places, public.businesses, public.government_services to authenticated;
grant select on public.institutions to authenticated;
grant select, delete on public.blood_donors to authenticated;
grant select on public.connections to authenticated;
grant insert on public.divisions, public.districts, public.upazilas to authenticated;

alter table public.places enable row level security;
alter table public.businesses enable row level security;
alter table public.government_services enable row level security;
alter table public.institutions enable row level security;
alter table public.blood_donors enable row level security;
alter table public.connections enable row level security;
alter table public.divisions enable row level security;
alter table public.districts enable row level security;
alter table public.upazilas enable row level security;

drop policy if exists places_staff_access on public.places;
create policy places_staff_access on public.places for all to authenticated
  using (public.is_current_user_staff()) with check (public.is_current_user_staff());
drop policy if exists businesses_staff_access on public.businesses;
create policy businesses_staff_access on public.businesses for all to authenticated
  using (public.is_current_user_staff()) with check (public.is_current_user_staff());
drop policy if exists government_services_staff_access on public.government_services;
create policy government_services_staff_access on public.government_services for all to authenticated
  using (public.is_current_user_staff()) with check (public.is_current_user_staff());
drop policy if exists institutions_staff_read on public.institutions;
create policy institutions_staff_read on public.institutions for select to authenticated
  using (public.is_current_user_staff());
drop policy if exists blood_donors_staff_read on public.blood_donors;
create policy blood_donors_staff_read on public.blood_donors for select to authenticated
  using (public.is_current_user_staff());
drop policy if exists blood_donors_staff_delete on public.blood_donors;
create policy blood_donors_staff_delete on public.blood_donors for delete to authenticated
  using (public.is_current_user_staff());
drop policy if exists connections_staff_read on public.connections;
create policy connections_staff_read on public.connections for select to authenticated
  using (public.is_current_user_staff());

drop policy if exists divisions_staff_insert on public.divisions;
create policy divisions_staff_insert on public.divisions for insert to authenticated
  with check (public.is_current_user_staff());
drop policy if exists districts_staff_insert on public.districts;
create policy districts_staff_insert on public.districts for insert to authenticated
  with check (public.is_current_user_staff());
drop policy if exists upazilas_staff_insert on public.upazilas;
create policy upazilas_staff_insert on public.upazilas for insert to authenticated
  with check (public.is_current_user_staff());
