create table public.sample_records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.sample_records enable row level security;

insert into public.sample_records (title, category, description)
values
  ('Welcome to Desh Connect', 'announcement', 'Sample announcement record for checking database storage.'),
  ('Blood donation directory', 'service', 'Sample service record; replace or remove it from the InsForge dashboard.'),
  ('Explore Bangladesh', 'tourism', 'Sample tourism record for validating table data management.');
