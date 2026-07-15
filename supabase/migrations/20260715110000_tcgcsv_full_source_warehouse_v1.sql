-- Full TCGCSV source warehouse.
-- Internal reference mirror only. No public pricing, identity, vault, or app-facing writes.

create table if not exists public.tcgcsv_source_sync_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  sync_mode text not null,
  status text not null default 'planned',
  source_marker text,
  observed_on date,
  date_from date,
  date_to date,
  request_count integer not null default 0,
  category_count integer not null default 0,
  group_count integer not null default 0,
  product_count integer not null default 0,
  price_row_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  no_op_count integer not null default 0,
  failed_count integer not null default 0,
  artifact_root text,
  artifact_hash text,
  worker_version text not null,
  parser_version text not null,
  schema_contract_version text not null,
  git_commit_sha text,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tcgcsv_source_sync_runs_mode_check
    check (sync_mode in ('current_full_sync', 'historical_archive_discovery', 'historical_archive_backfill')),
  constraint tcgcsv_source_sync_runs_status_check
    check (status in (
      'planned',
      'running',
      'partial_success',
      'completed',
      'failed',
      'aborted_request_ceiling',
      'skipped_no_change'
    )),
  constraint tcgcsv_source_sync_runs_counts_check check (
    request_count >= 0
    and category_count >= 0
    and group_count >= 0
    and product_count >= 0
    and price_row_count >= 0
    and inserted_count >= 0
    and updated_count >= 0
    and no_op_count >= 0
    and failed_count >= 0
  )
);

create table if not exists public.tcgcsv_source_artifacts (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.tcgcsv_source_sync_runs(id) on delete set null,
  run_key text not null,
  artifact_kind text not null,
  request_url text,
  local_path text not null,
  sha256 text not null,
  byte_size bigint not null,
  fetched_at timestamptz,
  http_status integer,
  response_headers jsonb not null default '{}'::jsonb,
  observed_on date,
  category_id integer,
  group_id integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint tcgcsv_source_artifacts_kind_check
    check (artifact_kind in (
      'last_updated',
      'categories',
      'groups',
      'products',
      'prices',
      'historical_archive',
      'historical_extracted_prices',
      'run_summary'
    )),
  constraint tcgcsv_source_artifacts_byte_size_check check (byte_size >= 0),
  constraint tcgcsv_source_artifacts_http_status_check check (http_status is null or http_status between 100 and 599),
  constraint tcgcsv_source_artifacts_unique_hash unique (run_key, artifact_kind, local_path, sha256)
);

create table if not exists public.tcgcsv_source_categories (
  category_id integer primary key,
  name text,
  display_name text,
  seo_category_name text,
  category_description text,
  category_page_title text,
  sealed_label text,
  non_sealed_label text,
  condition_guide_url text,
  is_scannable boolean,
  popularity integer,
  is_direct boolean,
  source_modified_on text,
  raw_payload jsonb not null,
  payload_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_seen_run_id uuid references public.tcgcsv_source_sync_runs(id) on delete set null,
  source_active boolean not null default true,
  source_missing_since timestamptz,
  catalog_metadata_status text not null default 'current',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tcgcsv_source_categories_status_check
    check (catalog_metadata_status in ('current', 'missing_from_latest_source', 'historical_price_only'))
);

create table if not exists public.tcgcsv_source_groups (
  group_id integer primary key,
  category_id integer not null references public.tcgcsv_source_categories(category_id) on delete restrict,
  name text,
  abbreviation text,
  is_supplemental boolean,
  published_on text,
  source_modified_on text,
  raw_payload jsonb not null,
  payload_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_seen_run_id uuid references public.tcgcsv_source_sync_runs(id) on delete set null,
  source_active boolean not null default true,
  source_missing_since timestamptz,
  catalog_metadata_status text not null default 'current',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tcgcsv_source_groups_status_check
    check (catalog_metadata_status in ('current', 'missing_from_latest_source', 'historical_price_only'))
);

create index if not exists tcgcsv_source_groups_category_idx
  on public.tcgcsv_source_groups(category_id);

create table if not exists public.tcgcsv_source_products (
  product_id integer primary key,
  category_id integer,
  group_id integer,
  name text,
  clean_name text,
  image_url text,
  source_url text,
  source_modified_on text,
  image_count integer,
  presale_info jsonb,
  extended_data jsonb,
  raw_payload jsonb not null,
  payload_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_seen_run_id uuid references public.tcgcsv_source_sync_runs(id) on delete set null,
  source_active boolean not null default true,
  source_missing_since timestamptz,
  catalog_metadata_status text not null default 'current',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tcgcsv_source_products_status_check
    check (catalog_metadata_status in ('current', 'missing_from_latest_source', 'historical_price_only'))
);

create index if not exists tcgcsv_source_products_category_group_idx
  on public.tcgcsv_source_products(category_id, group_id);

create index if not exists tcgcsv_source_products_group_idx
  on public.tcgcsv_source_products(group_id);

create table if not exists public.tcgcsv_source_group_fetch_status (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.tcgcsv_source_sync_runs(id) on delete cascade,
  run_key text not null,
  observed_on date,
  category_id integer,
  group_id integer,
  fetch_stage text not null,
  status text not null,
  request_url text,
  artifact_path text,
  row_count integer not null default 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tcgcsv_source_group_fetch_status_stage_check
    check (fetch_stage in ('groups', 'products', 'prices', 'historical_prices')),
  constraint tcgcsv_source_group_fetch_status_status_check
    check (status in ('planned', 'running', 'completed', 'failed', 'skipped')),
  constraint tcgcsv_source_group_fetch_status_row_count_check check (row_count >= 0),
  constraint tcgcsv_source_group_fetch_status_unique_stage unique (run_key, fetch_stage, category_id, group_id, observed_on)
);

create index if not exists tcgcsv_source_group_fetch_status_run_idx
  on public.tcgcsv_source_group_fetch_status(run_key, status);

create table if not exists public.tcgcsv_source_price_daily_observations (
  id uuid primary key default gen_random_uuid(),
  source_price_row_identity text not null,
  product_id integer not null,
  category_id integer,
  group_id integer,
  subtype_name text not null,
  subtype_name_normalized text not null,
  observed_on date not null,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  market_price numeric,
  direct_low_price numeric,
  currency text not null default 'USD',
  raw_payload jsonb not null,
  payload_hash text not null,
  source_archive_path text,
  source_artifact_id uuid references public.tcgcsv_source_artifacts(id) on delete set null,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  first_seen_run_id uuid references public.tcgcsv_source_sync_runs(id) on delete set null,
  last_seen_run_id uuid references public.tcgcsv_source_sync_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tcgcsv_source_price_daily_observations_price_check check (
    (low_price is null or low_price >= 0)
    and (mid_price is null or mid_price >= 0)
    and (high_price is null or high_price >= 0)
    and (market_price is null or market_price >= 0)
    and (direct_low_price is null or direct_low_price >= 0)
  ),
  constraint tcgcsv_source_price_daily_observations_unique_day
    unique (source_price_row_identity, observed_on)
);

create index if not exists tcgcsv_source_price_daily_product_idx
  on public.tcgcsv_source_price_daily_observations(product_id, observed_on desc);

create index if not exists tcgcsv_source_price_daily_category_day_idx
  on public.tcgcsv_source_price_daily_observations(category_id, observed_on desc);

create or replace view public.v_tcgcsv_source_sync_latest_status as
select
  id,
  run_key,
  sync_mode,
  status,
  source_marker,
  observed_on,
  date_from,
  date_to,
  request_count,
  category_count,
  group_count,
  product_count,
  price_row_count,
  inserted_count,
  updated_count,
  no_op_count,
  failed_count,
  artifact_root,
  artifact_hash,
  worker_version,
  parser_version,
  schema_contract_version,
  git_commit_sha,
  started_at,
  finished_at,
  error,
  payload,
  created_at
from (
  select
    r.*,
    row_number() over (
      partition by r.sync_mode
      order by r.created_at desc, r.id desc
    ) as rn
  from public.tcgcsv_source_sync_runs r
) ranked
where rn = 1;

alter table public.tcgcsv_source_sync_runs enable row level security;
alter table public.tcgcsv_source_artifacts enable row level security;
alter table public.tcgcsv_source_categories enable row level security;
alter table public.tcgcsv_source_groups enable row level security;
alter table public.tcgcsv_source_products enable row level security;
alter table public.tcgcsv_source_group_fetch_status enable row level security;
alter table public.tcgcsv_source_price_daily_observations enable row level security;

drop policy if exists tcgcsv_source_sync_runs_service_role_all on public.tcgcsv_source_sync_runs;
create policy tcgcsv_source_sync_runs_service_role_all
  on public.tcgcsv_source_sync_runs for all to service_role using (true) with check (true);

drop policy if exists tcgcsv_source_artifacts_service_role_all on public.tcgcsv_source_artifacts;
create policy tcgcsv_source_artifacts_service_role_all
  on public.tcgcsv_source_artifacts for all to service_role using (true) with check (true);

drop policy if exists tcgcsv_source_categories_service_role_all on public.tcgcsv_source_categories;
create policy tcgcsv_source_categories_service_role_all
  on public.tcgcsv_source_categories for all to service_role using (true) with check (true);

drop policy if exists tcgcsv_source_groups_service_role_all on public.tcgcsv_source_groups;
create policy tcgcsv_source_groups_service_role_all
  on public.tcgcsv_source_groups for all to service_role using (true) with check (true);

drop policy if exists tcgcsv_source_products_service_role_all on public.tcgcsv_source_products;
create policy tcgcsv_source_products_service_role_all
  on public.tcgcsv_source_products for all to service_role using (true) with check (true);

drop policy if exists tcgcsv_source_group_fetch_status_service_role_all on public.tcgcsv_source_group_fetch_status;
create policy tcgcsv_source_group_fetch_status_service_role_all
  on public.tcgcsv_source_group_fetch_status for all to service_role using (true) with check (true);

drop policy if exists tcgcsv_source_price_daily_observations_service_role_all on public.tcgcsv_source_price_daily_observations;
create policy tcgcsv_source_price_daily_observations_service_role_all
  on public.tcgcsv_source_price_daily_observations for all to service_role using (true) with check (true);

revoke all on public.tcgcsv_source_sync_runs from public, anon, authenticated;
revoke all on public.tcgcsv_source_artifacts from public, anon, authenticated;
revoke all on public.tcgcsv_source_categories from public, anon, authenticated;
revoke all on public.tcgcsv_source_groups from public, anon, authenticated;
revoke all on public.tcgcsv_source_products from public, anon, authenticated;
revoke all on public.tcgcsv_source_group_fetch_status from public, anon, authenticated;
revoke all on public.tcgcsv_source_price_daily_observations from public, anon, authenticated;
revoke all on public.v_tcgcsv_source_sync_latest_status from public, anon, authenticated;

grant select, insert, update on public.tcgcsv_source_sync_runs to service_role;
grant select, insert on public.tcgcsv_source_artifacts to service_role;
grant select, insert, update on public.tcgcsv_source_categories to service_role;
grant select, insert, update on public.tcgcsv_source_groups to service_role;
grant select, insert, update on public.tcgcsv_source_products to service_role;
grant select, insert, update on public.tcgcsv_source_group_fetch_status to service_role;
grant select, insert, update on public.tcgcsv_source_price_daily_observations to service_role;
grant select on public.v_tcgcsv_source_sync_latest_status to service_role;
