-- pricing_jobs_live_requests_v1

-- Ensure RLS is enabled for pricing_jobs (idempotent)
alter table public.pricing_jobs enable row level security;

-- Allow authenticated users to enqueue live price jobs
create policy if not exists "insert_pricing_jobs_from_app"
  on public.pricing_jobs
  for insert
  with check (auth.role() = 'authenticated');
