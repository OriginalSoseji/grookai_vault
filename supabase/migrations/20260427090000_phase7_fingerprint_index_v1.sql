create table if not exists public.card_fingerprint_index (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id),
  source_type text not null,
  source_url text null,
  image_path text null,
  hash_d bigint not null,
  hash_norm bigint null,
  algorithm_version text not null,
  computed_at timestamptz not null default now(),
  image_source text null,
  is_exact_image boolean not null default false,
  is_representative boolean not null default false,
  is_verified boolean not null default true,
  constraint card_fingerprint_index_source_type_check
    check (source_type in ('exact', 'alt', 'representative')),
  constraint card_fingerprint_index_exact_representative_check
    check (not (is_exact_image = true and is_representative = true))
);

create index if not exists idx_fingerprint_card_print_id
  on public.card_fingerprint_index (card_print_id);

create index if not exists idx_fingerprint_hash_d
  on public.card_fingerprint_index (hash_d);

create index if not exists idx_fingerprint_hash_norm
  on public.card_fingerprint_index (hash_norm);

comment on table public.card_fingerprint_index is
  'Phase 7A canonical card fingerprint index anchored to card_print_id. Separate from ingestion, identity, pricing, and condition fingerprint bindings.';

comment on column public.card_fingerprint_index.source_type is
  'Fingerprint source lane: exact, alt, or representative. Phase 7A worker does not populate representative rows.';

comment on column public.card_fingerprint_index.hash_d is
  'Signed int64 storage of the canonical 64-bit dHash.';

comment on column public.card_fingerprint_index.hash_norm is
  'Signed int64 storage of the scanner-normalized 64-bit dHash.';
