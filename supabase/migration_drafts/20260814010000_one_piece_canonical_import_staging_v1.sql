begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.one_piece_canonical_import_batches (
  id uuid primary key,
  canary_plan_fingerprint_sha256 text not null unique,
  manifest_logical_sha256 text not null,
  migration_draft_sha256 text not null,
  plan_version text not null,
  schema_version text not null,
  producing_commit_sha text not null,
  producing_branch text not null,
  selected_group_id bigint not null,
  selected_group_name text not null,
  selected_group_released_on date not null,
  execution_mode text not null,
  authorized_durable_batch_rows integer not null,
  authorized_durable_staging_rows integer not null,
  row_counts jsonb not null,
  execution_boundaries jsonb not null,
  created_at timestamptz not null default now(),
  constraint one_piece_import_batches_plan_hash_check
    check (canary_plan_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  constraint one_piece_import_batches_manifest_hash_check
    check (manifest_logical_sha256 ~ '^[0-9a-f]{64}$'),
  constraint one_piece_import_batches_migration_hash_check
    check (migration_draft_sha256 ~ '^[0-9a-f]{64}$'),
  constraint one_piece_import_batches_commit_check
    check (producing_commit_sha ~ '^[0-9a-f]{40}$'),
  constraint one_piece_import_batches_mode_check
    check (execution_mode = 'rollback_only'),
  constraint one_piece_import_batches_zero_durable_batch_check
    check (authorized_durable_batch_rows = 0),
  constraint one_piece_import_batches_zero_durable_rows_check
    check (authorized_durable_staging_rows = 0)
);

create table public.one_piece_canonical_import_rows (
  id uuid primary key,
  batch_id uuid not null references public.one_piece_canonical_import_batches(id)
    on delete restrict,
  source_product_id bigint not null,
  source_group_id bigint not null,
  record_class text not null,
  single_card_kind text,
  language_key text not null,
  promotion_state text not null,
  row_ordinal integer not null,
  payload jsonb not null,
  payload_sha256 text not null,
  created_at timestamptz not null default now(),
  constraint one_piece_import_rows_record_class_check
    check (
      record_class in (
        'exact_single_card_candidate',
        'sealed_product_candidate',
        'ambiguous_quarantine'
      )
    ),
  constraint one_piece_import_rows_single_kind_check
    check (
      (record_class = 'exact_single_card_candidate'
        and single_card_kind in ('numbered_card', 'don_card'))
      or
      (record_class <> 'exact_single_card_candidate' and single_card_kind is null)
    ),
  constraint one_piece_import_rows_promotion_state_check
    check (
      promotion_state in (
        'current_candidate',
        'future_or_presale_hold',
        'inactive_source_hold',
        'separate_sealed_catalog',
        'quarantine'
      )
    ),
  constraint one_piece_import_rows_payload_hash_check
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint one_piece_import_rows_ordinal_check
    check (row_ordinal >= 0),
  constraint one_piece_import_rows_batch_product_key
    unique (batch_id, source_product_id),
  constraint one_piece_import_rows_batch_ordinal_key
    unique (batch_id, row_ordinal)
);

create index one_piece_canonical_import_rows_batch_idx
  on public.one_piece_canonical_import_rows (batch_id, row_ordinal);

create or replace function public.one_piece_canonical_import_reject_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'One Piece canonical import staging rows are immutable';
end;
$$;

create trigger one_piece_canonical_import_batches_immutable
before update or delete on public.one_piece_canonical_import_batches
for each row execute function public.one_piece_canonical_import_reject_mutation_v1();

create trigger one_piece_canonical_import_rows_immutable
before update or delete on public.one_piece_canonical_import_rows
for each row execute function public.one_piece_canonical_import_reject_mutation_v1();

alter table public.one_piece_canonical_import_batches enable row level security;
alter table public.one_piece_canonical_import_rows enable row level security;

create policy one_piece_import_batches_service_select
  on public.one_piece_canonical_import_batches
  for select
  to service_role
  using (auth.role() = 'service_role');

create policy one_piece_import_batches_service_insert
  on public.one_piece_canonical_import_batches
  for insert
  to service_role
  with check (auth.role() = 'service_role');

create policy one_piece_import_rows_service_select
  on public.one_piece_canonical_import_rows
  for select
  to service_role
  using (auth.role() = 'service_role');

create policy one_piece_import_rows_service_insert
  on public.one_piece_canonical_import_rows
  for insert
  to service_role
  with check (auth.role() = 'service_role');

revoke all on table public.one_piece_canonical_import_batches
  from public, anon, authenticated, service_role;
revoke all on table public.one_piece_canonical_import_rows
  from public, anon, authenticated, service_role;
revoke all on function public.one_piece_canonical_import_reject_mutation_v1()
  from public, anon, authenticated, service_role;

grant select, insert on table public.one_piece_canonical_import_batches
  to service_role;
grant select, insert on table public.one_piece_canonical_import_rows
  to service_role;

comment on table public.one_piece_canonical_import_batches is
  'Service-only immutable One Piece source-candidate batches. Staging is not canonical identity or publication authority.';
comment on table public.one_piece_canonical_import_rows is
  'Exact One Piece readiness-manifest payloads. Singles, DON, sealed, quarantine, language, and release state remain distinct.';

commit;
