-- Grookai Vault — Wall (BASE TABLES)
-- Promoted from _hold to active migration sequence

-- listings: owner-posted items (for sale/trade/showcase)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text,
  description text,
  price_cents integer,
  currency text default 'USD',
  condition text,
  visibility text default 'public',
  status text default 'active',
  location_city text,
  location_region text,
  location_country text,
  primary_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- listing_images: multiple photos per listing
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  image_url text not null,
  thumb_3x4_url text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- FK (idempotent)
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

-- Indexes
create index if not exists idx_listings_owner on public.listings(owner_id);
create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_created_at on public.listings(created_at);
create index if not exists idx_listing_images_listing on public.listing_images(listing_id);
create index if not exists idx_listing_images_sort on public.listing_images(listing_id, sort_order);

-- Touch-up trigger to maintain updated_at
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

-- RLS is handled in a separate migration (listings_rls)

