-- Community location IDs use application slugs such as "div-rangpur" and
-- "dis-thakurgaon", so they must not be parsed as PostgreSQL UUID values.
alter table public.posts
  alter column division_id type text using division_id::text,
  alter column district_id type text using district_id::text,
  alter column upazila_id type text using upazila_id::text;
