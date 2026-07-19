-- Interior Design AI Studio — generations table
-- Run this in the Supabase SQL Editor (or via `supabase db push` if using the CLI).

create extension if not exists "pgcrypto";

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  style text not null check (style in ('Modern', 'Scandinavian', 'Industrial', 'Japandi', 'Luxury')),
  final_prompt text not null,
  image_url text,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

-- Gallery is always queried newest-first.
create index if not exists idx_generations_created_at on generations (created_at desc);

-- The backend uses the Supabase service-role key, which bypasses RLS
-- entirely — RLS is enabled anyway as defense-in-depth in case an anon/public
-- key is ever used against this table directly from a client.
alter table generations enable row level security;

drop policy if exists "Service role full access" on generations;
create policy "Service role full access"
  on generations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
