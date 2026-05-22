begin;

create table if not exists public.collector_local_discovery_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  local_discovery_enabled boolean not null default false,
  area_label text,
  region_code text,
  country_code text,
  geohash_prefix text,
  radius_miles integer not null default 25,
  location_precision text not null default 'coarse',
  location_source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collector_local_discovery_area_label_check
    check (area_label is null or char_length(btrim(area_label)) between 2 and 120),
  constraint collector_local_discovery_region_code_check
    check (region_code is null or region_code = upper(region_code)),
  constraint collector_local_discovery_country_code_check
    check (country_code is null or country_code = upper(country_code)),
  constraint collector_local_discovery_geohash_prefix_check
    check (geohash_prefix is null or geohash_prefix ~ '^[0-9bcdefghjkmnpqrstuvwxyz]{3,5}$'),
  constraint collector_local_discovery_radius_check
    check (radius_miles in (5, 10, 25, 50, 100)),
  constraint collector_local_discovery_precision_check
    check (location_precision in ('coarse', 'region')),
  constraint collector_local_discovery_source_check
    check (location_source in ('manual', 'profile_import', 'system')),
  constraint collector_local_discovery_enabled_requires_area_check
    check (
      local_discovery_enabled = false
      or (
        area_label is not null
        and country_code is not null
        and (
          geohash_prefix is not null
          or region_code is not null
        )
      )
    )
);

comment on table public.collector_local_discovery_settings is
'LOCAL_COMMUNITY_FEED_V1 opt-in settings. Stores only coarse locality; never exact lat/lng, address, raw GPS, IP-derived location, or full geohash.';

comment on column public.collector_local_discovery_settings.local_discovery_enabled is
'Separate opt-in for nearby collector discovery. Public profile and vault sharing do not imply local discovery.';

comment on column public.collector_local_discovery_settings.geohash_prefix is
'Coarse geohash prefix only, constrained to 3-5 chars. Full geohashes and exact coordinates are forbidden by LOCAL_COMMUNITY_FEED_V1.';

create index if not exists idx_collector_local_discovery_enabled_area
on public.collector_local_discovery_settings (country_code, region_code, geohash_prefix)
where local_discovery_enabled is true;

create table if not exists public.collector_local_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint collector_local_blocks_no_self_check
    check (blocker_user_id <> blocked_user_id),
  constraint collector_local_blocks_reason_check
    check (reason is null or char_length(btrim(reason)) between 1 and 280)
);

comment on table public.collector_local_blocks is
'LOCAL_COMMUNITY_FEED_V1 safety gate. Feed read models must exclude rows where either collector blocks the other.';

create index if not exists idx_collector_local_blocks_blocked
on public.collector_local_blocks (blocked_user_id, created_at desc);

create table if not exists public.collector_local_mutes (
  muter_user_id uuid not null references auth.users(id) on delete cascade,
  muted_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (muter_user_id, muted_user_id),
  constraint collector_local_mutes_no_self_check
    check (muter_user_id <> muted_user_id),
  constraint collector_local_mutes_expiry_check
    check (expires_at is null or expires_at > created_at)
);

comment on table public.collector_local_mutes is
'LOCAL_COMMUNITY_FEED_V1 viewer-side feed safety gate. Muted collectors must be excluded from the muting viewer local feed.';

create index if not exists idx_collector_local_mutes_muted
on public.collector_local_mutes (muted_user_id, created_at desc);

drop trigger if exists trg_collector_local_discovery_settings_updated_at
on public.collector_local_discovery_settings;
create trigger trg_collector_local_discovery_settings_updated_at
before update on public.collector_local_discovery_settings
for each row execute function public.set_timestamp_updated_at();

alter table public.collector_local_discovery_settings enable row level security;
alter table public.collector_local_blocks enable row level security;
alter table public.collector_local_mutes enable row level security;

revoke all on table public.collector_local_discovery_settings from anon;
revoke all on table public.collector_local_discovery_settings from authenticated;
revoke all on table public.collector_local_blocks from anon;
revoke all on table public.collector_local_blocks from authenticated;
revoke all on table public.collector_local_mutes from anon;
revoke all on table public.collector_local_mutes from authenticated;

grant select, insert, update, delete on table public.collector_local_discovery_settings to authenticated;
grant select, insert, delete on table public.collector_local_blocks to authenticated;
grant select, insert, delete on table public.collector_local_mutes to authenticated;

drop policy if exists collector_local_discovery_settings_owner_select
on public.collector_local_discovery_settings;
create policy collector_local_discovery_settings_owner_select
on public.collector_local_discovery_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists collector_local_discovery_settings_owner_insert
on public.collector_local_discovery_settings;
create policy collector_local_discovery_settings_owner_insert
on public.collector_local_discovery_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists collector_local_discovery_settings_owner_update
on public.collector_local_discovery_settings;
create policy collector_local_discovery_settings_owner_update
on public.collector_local_discovery_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists collector_local_discovery_settings_owner_delete
on public.collector_local_discovery_settings;
create policy collector_local_discovery_settings_owner_delete
on public.collector_local_discovery_settings
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists collector_local_blocks_owner_select
on public.collector_local_blocks;
create policy collector_local_blocks_owner_select
on public.collector_local_blocks
for select
to authenticated
using (auth.uid() = blocker_user_id);

drop policy if exists collector_local_blocks_owner_insert
on public.collector_local_blocks;
create policy collector_local_blocks_owner_insert
on public.collector_local_blocks
for insert
to authenticated
with check (auth.uid() = blocker_user_id);

drop policy if exists collector_local_blocks_owner_delete
on public.collector_local_blocks;
create policy collector_local_blocks_owner_delete
on public.collector_local_blocks
for delete
to authenticated
using (auth.uid() = blocker_user_id);

drop policy if exists collector_local_mutes_owner_select
on public.collector_local_mutes;
create policy collector_local_mutes_owner_select
on public.collector_local_mutes
for select
to authenticated
using (auth.uid() = muter_user_id);

drop policy if exists collector_local_mutes_owner_insert
on public.collector_local_mutes;
create policy collector_local_mutes_owner_insert
on public.collector_local_mutes
for insert
to authenticated
with check (auth.uid() = muter_user_id);

drop policy if exists collector_local_mutes_owner_delete
on public.collector_local_mutes;
create policy collector_local_mutes_owner_delete
on public.collector_local_mutes
for delete
to authenticated
using (auth.uid() = muter_user_id);

create or replace function public.local_community_collectors_are_blocked_v1(
  p_viewer_user_id uuid,
  p_owner_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.collector_local_blocks b
    where (
      b.blocker_user_id = p_viewer_user_id
      and b.blocked_user_id = p_owner_user_id
    )
    or (
      b.blocker_user_id = p_owner_user_id
      and b.blocked_user_id = p_viewer_user_id
    )
  );
$$;

comment on function public.local_community_collectors_are_blocked_v1(uuid, uuid) is
'LOCAL_COMMUNITY_FEED_V1 helper for future feed RPCs. True when either collector blocks the other.';

revoke all on function public.local_community_collectors_are_blocked_v1(uuid, uuid) from public;
grant execute on function public.local_community_collectors_are_blocked_v1(uuid, uuid) to authenticated;

commit;
