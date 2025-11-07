-- Grookai Vault — RLS for listings
-- Enable RLS and add sane defaults:
-- - Anyone can read PUBLIC, ACTIVE listings (feed/search).
-- - Only owner can insert/update/delete their own rows.

-- Ensure tables exist (no-op if already present)
-- NOTE: This does not create tables; assumes 20251104_base_wall_tables.sql exists.

-- Enable RLS
alter table if exists public.listings enable row level security;
alter table if exists public.listing_images enable row level security;

-- Helper function: current user id (works with PostgREST/Supabase auth.jwt())
create or replace function public.auth_uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid
$$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='listings'
  ) then
    drop policy if exists listings_read_public on public.listings;
    create policy listings_read_public
    on public.listings
    for select
    using (visibility = 'public' and status = 'active');

    -- OWNER write policies
    drop policy if exists listings_owner_insert on public.listings;
    create policy listings_owner_insert
    on public.listings
    for insert
    with check (owner_id = public.auth_uid());

    drop policy if exists listings_owner_update on public.listings;
    create policy listings_owner_update
    on public.listings
    for update
    using (owner_id = public.auth_uid())
    with check (owner_id = public.auth_uid());

    drop policy if exists listings_owner_delete on public.listings;
    create policy listings_owner_delete
    on public.listings
    for delete
    using (owner_id = public.auth_uid());
  end if;
end $$;

-- listing_images: tie to listings ownership
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='listing_images'
  ) then
    drop policy if exists listing_images_read_public on public.listing_images;
    create policy listing_images_read_public
    on public.listing_images
    for select
    using (exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.visibility = 'public'
        and l.status = 'active'
    ));

    drop policy if exists listing_images_owner_write on public.listing_images;
    create policy listing_images_owner_write
    on public.listing_images
    for all
    using (exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.owner_id = public.auth_uid()
    ))
    with check (exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.owner_id = public.auth_uid()
    ));
  end if;
end $$;

-- Optional: allow service role to bypass RLS where appropriate
-- (Supabase service role bypasses RLS by default via JWT role.)
