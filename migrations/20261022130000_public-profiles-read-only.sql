-- Public profile data is exposed for reading only; writes must go through
-- the authenticated profiles table and its row-level policies.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
