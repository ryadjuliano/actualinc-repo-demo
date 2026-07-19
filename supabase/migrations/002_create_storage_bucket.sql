-- Storage bucket for generated interior design images.
-- Public read (so <img src> works directly from the gallery) — writes are
-- restricted to the service role, which is all the backend ever uses.

insert into storage.buckets (id, name, public)
values ('generations', 'generations', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for generations" on storage.objects;
create policy "Public read access for generations"
  on storage.objects
  for select
  using (bucket_id = 'generations');

drop policy if exists "Service role can upload generations" on storage.objects;
create policy "Service role can upload generations"
  on storage.objects
  for insert
  with check (bucket_id = 'generations' and auth.role() = 'service_role');
