begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.mtg_canonical_import_batches (
  id uuid primary key,
  payload_fingerprint_sha256 text not null unique,
  plan_version text not null,
  source_bulk_sha256 text not null,
  foundation_migration_sha256 text not null,
  producing_commit_sha text not null,
  producing_branch text not null,
  selected_set_code text not null,
  selected_set_name text not null,
  status text not null default 'staged',
  row_counts jsonb not null,
  execution_boundaries jsonb not null,
  created_at timestamptz not null default now(),
  constraint mtg_canonical_import_batches_payload_hash_check
    check (payload_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  constraint mtg_canonical_import_batches_source_hash_check
    check (source_bulk_sha256 ~ '^[0-9a-f]{64}$'),
  constraint mtg_canonical_import_batches_foundation_hash_check
    check (foundation_migration_sha256 ~ '^[0-9a-f]{64}$'),
  constraint mtg_canonical_import_batches_commit_check
    check (producing_commit_sha ~ '^[0-9a-f]{40}$'),
  constraint mtg_canonical_import_batches_status_check
    check (status in ('staged', 'promotion_ready', 'promoted', 'superseded'))
);

create table if not exists public.mtg_canonical_import_rows (
  id uuid primary key,
  batch_id uuid not null references public.mtg_canonical_import_batches(id)
    on delete restrict,
  entity_type text not null,
  row_key text not null,
  row_ordinal integer not null,
  payload jsonb not null,
  payload_sha256 text not null,
  created_at timestamptz not null default now(),
  constraint mtg_canonical_import_rows_entity_type_check
    check (
      entity_type in (
        'sets',
        'card_prints',
        'card_print_identity',
        'card_printings',
        'external_mappings',
        'external_printing_mappings'
      )
    ),
  constraint mtg_canonical_import_rows_payload_hash_check
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint mtg_canonical_import_rows_ordinal_check
    check (row_ordinal >= 0),
  constraint mtg_canonical_import_rows_batch_entity_key_key
    unique (batch_id, entity_type, row_key),
  constraint mtg_canonical_import_rows_batch_entity_ordinal_key
    unique (batch_id, entity_type, row_ordinal)
);

create index if not exists mtg_canonical_import_rows_batch_idx
  on public.mtg_canonical_import_rows (batch_id, entity_type, row_ordinal);

alter table public.mtg_canonical_import_batches enable row level security;
alter table public.mtg_canonical_import_rows enable row level security;

drop policy if exists mtg_canonical_import_batches_service_role_all
  on public.mtg_canonical_import_batches;
create policy mtg_canonical_import_batches_service_role_all
  on public.mtg_canonical_import_batches
  for all
  to service_role
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists mtg_canonical_import_rows_service_role_all
  on public.mtg_canonical_import_rows;
create policy mtg_canonical_import_rows_service_role_all
  on public.mtg_canonical_import_rows
  for all
  to service_role
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on table public.mtg_canonical_import_batches
  from public, anon, authenticated;
revoke all on table public.mtg_canonical_import_rows
  from public, anon, authenticated;

grant select, insert on table public.mtg_canonical_import_batches
  to service_role;
grant select, insert on table public.mtg_canonical_import_rows
  to service_role;

comment on table public.mtg_canonical_import_batches is
  'Service-only immutable MTG canonical candidate batches. Staging does not create canonical card rows or app visibility.';
comment on table public.mtg_canonical_import_rows is
  'Exact fingerprinted row payloads awaiting a separately governed canonical promotion.';

commit;
