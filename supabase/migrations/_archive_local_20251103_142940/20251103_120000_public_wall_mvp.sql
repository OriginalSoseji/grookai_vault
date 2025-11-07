-- Public Wall MVP (seller listings) — schema, RLS, view
-- Date: 2025-11-03

-- 1) Tables
create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  location_city text,
  location_country text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete cascade,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  condition text not null check (condition in ('NM','LP','MP','HP','DMG','PSA','BGS','CGC')),
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'active' check (status in ('active','reserved','sold','hidden')),
  quantity int not null default 1 check (quantity >= 0),
  is_trade boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) Indexes
create index if not exists listings_idx_active on public.listings(status);
create index if not exists listings_idx_card_print on public.listings(card_print_id);
create index if not exists listings_idx_condition_price on public.listings(condition, price_cents);
create index if not exists listings_idx_status_created on public.listings(status, created_at desc);
create index if not exists listing_photos_idx_listing_position on public.listing_photos(listing_id, position);

-- 3) RLS
alter table public.seller_profiles enable row level security;
alter table public.listings        enable row level security;
alter table public.listing_photos  enable row level security;

-- Policies: public read of active listings only
drop policy if exists "listings_read_active" on public.listings;
create policy "listings_read_active"
on public.listings for select
to anon, authenticated
using (status = 'active');

-- Policies: public read of listing photos where parent listing is active
drop policy if exists "listing_photos_read_active_parent" on public.listing_photos;
create policy "listing_photos_read_active_parent"
on public.listing_photos for select
to anon, authenticated
using (exists (
  select 1 from public.listings l
  where l.id = listing_photos.listing_id and l.status = 'active'
));

-- Seller can manage their own profile
drop policy if exists "seller_profiles_own_crud" on public.seller_profiles;
create policy "seller_profiles_own_crud"
on public.seller_profiles for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Public read seller profiles only when they have active listings
drop policy if exists "seller_profiles_read_with_active_listing" on public.seller_profiles;
create policy "seller_profiles_read_with_active_listing"
on public.seller_profiles for select
to anon, authenticated
using (exists (
  select 1 from public.listings l
  where l.seller_id = seller_profiles.id and l.status = 'active'
));

-- Seller can manage their own listings
drop policy if exists "listings_owner_crud" on public.listings;
create policy "listings_owner_crud"
on public.listings for all
to authenticated
using (exists (
  select 1 from public.seller_profiles sp
  where sp.id = listings.seller_id and sp.user_id = auth.uid()
))
with check (exists (
  select 1 from public.seller_profiles sp
  where sp.id = listings.seller_id and sp.user_id = auth.uid()
));

-- Seller can manage their own listing photos
drop policy if exists "listing_photos_owner_crud" on public.listing_photos;
create policy "listing_photos_owner_crud"
on public.listing_photos for all
to authenticated
using (exists (
  select 1 from public.listings l
  join public.seller_profiles sp on sp.id = l.seller_id
  where l.id = listing_photos.listing_id and sp.user_id = auth.uid()
))
with check (exists (
  select 1 from public.listings l
  join public.seller_profiles sp on sp.id = l.seller_id
  where l.id = listing_photos.listing_id and sp.user_id = auth.uid()
));

-- (Optional hardening) default deny for writes except owner via above policies
-- No extra grants required; RLS enforces ownership checks.

-- 4) Read-optimized view: public.wall_feed_v
-- Columns: listing_id, card_print_id, condition, price_cents, currency, quantity, is_trade, created_at,
--          seller_display_name, seller_avatar_url, primary_photo_url,
--          set_code, card_number, card_name, rarity, mv_price_mid
drop view if exists public.wall_feed_v;
create or replace view public.wall_feed_v as
with primary_photo as (
  select lp.listing_id, lp.url as primary_photo_url
  from (
    select listing_id, url,
           row_number() over (partition by listing_id order by position asc, created_at asc, id asc) as rn
    from public.listing_photos
  ) lp where rn = 1
)
select
  l.id                as listing_id,
  l.card_print_id     as card_print_id,
  l.condition         as condition,
  l.price_cents       as price_cents,
  l.currency          as currency,
  l.quantity          as quantity,
  l.is_trade          as is_trade,
  l.created_at        as created_at,
  sp.display_name     as seller_display_name,
  sp.avatar_url       as seller_avatar_url,
  pp.primary_photo_url as primary_photo_url,
  cp.set_code         as set_code,
  cp.number           as card_number,
  cp.name             as card_name,
  cp.rarity           as rarity,
  mv.price_mid        as mv_price_mid,
  mv.observed_at      as mv_observed_at
from public.listings l
join public.seller_profiles sp on sp.id = l.seller_id
join public.card_prints cp     on cp.id = l.card_print_id
left join primary_photo pp     on pp.listing_id = l.id
left join public.latest_card_prices_mv mv
       on mv.card_id = l.card_print_id
      and (mv.condition_label = l.condition or mv.condition_label is null)
where l.status = 'active'
order by l.created_at desc;

grant select on public.wall_feed_v to anon, authenticated, service_role;

-- 5) Notes
-- This MVP exposes read access only via view; underlying tables are RLS-protected.
