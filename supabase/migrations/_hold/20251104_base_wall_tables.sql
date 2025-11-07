-- Grookai Vault — Wall (BASE TABLES)
-- New baseline for Wall: tables first; views/materialized views come later.

-- listings: owner-posted items (for sale/trade/showcase)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text,
  description text,
  price_cents integer,
  currency text default 'USD',
  condition text,                 -- e.g., 'NM','LP','MP','HP','DMG','PSA10', etc.
  visibility text default 'public', -- 'public' | 'private' | 'friends' (future)
  status text default 'active',     -- 'active' | 'hidden' | 'sold'
  location_city text,
  location_region text,
  location_country text,
  primary_image_url text,         -- convenience pointer to the main image
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional: separate images table to support multiple photos per listing.
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  image_url text not null,
  thumb_3x4_url text,             -- e.g., 720x960 derivative
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Basic FKs (use NOT VALID so they won’t fail on existing bad data; you can VALIDATE later).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'listing_images_listing_id_fkey'
  ) then
    alter table public.listing_images
      add constraint listing_images_listing_id_fkey
      foreign key (listing_id) references public.listings(id) not valid;
  end if;
end $$;

-- Indexes (idempotent)
create index if not exists idx_listings_owner on public.listings(owner_id);
create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_created_at on public.listings(created_at);
create index if not exists idx_listing_images_listing on public.listing_images(listing_id);
create index if not exists idx_listing_images_sort on public.listing_images(listing_id, sort_order);

-- Touch-up trigger to maintain updated_at (optional but harmless if added twice)
do $$
begin
  if not exists (
    select 1 from pg_proc where proname = 'set_timestamp_updated_at'
  ) then
    create or replace function public.set_timestamp_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_listings_updated_at'
  ) then
    create trigger trg_listings_updated_at
    before update on public.listings
    for each row
    execute function public.set_timestamp_updated_at();
  end if;
end $$;

-- NOTE: RLS policies will be set in a later migration once usage is finalized.

