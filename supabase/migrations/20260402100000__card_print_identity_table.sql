begin;

create table if not exists public.card_print_identity (
  id uuid not null default gen_random_uuid(),
  card_print_id uuid not null,
  identity_domain text not null,
  set_code_identity text not null,
  printed_number text not null,
  normalized_printed_name text null,
  source_name_raw text null,
  identity_payload jsonb not null default '{}'::jsonb,
  identity_key_version text not null,
  identity_key_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_print_identity_pkey primary key (id),
  constraint card_print_identity_card_print_id_fkey
    foreign key (card_print_id)
    references public.card_prints(id)
    on delete cascade,
  constraint card_print_identity_identity_domain_check
    check (
      identity_domain = any (
        array[
          'pokemon_eng_standard'::text,
          'pokemon_ba'::text,
          'pokemon_eng_special_print'::text,
          'pokemon_jpn'::text
        ]
      )
    ),
  constraint card_print_identity_identity_payload_object_check
    check (jsonb_typeof(identity_payload) = 'object')
);

comment on table public.card_print_identity is
  'Canonical printed-identity authority rows for card_prints under CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.';

comment on column public.card_print_identity.identity_domain is
  'Contract-governed identity domain such as pokemon_eng_standard or pokemon_ba.';

comment on column public.card_print_identity.set_code_identity is
  'Release or set code used by the identity law for the row.';

comment on column public.card_print_identity.printed_number is
  'Printed number token used by the identity law for the row.';

comment on column public.card_print_identity.normalized_printed_name is
  'Comparison-safe printed name used by domains that require a normalized identity-name lane.';

comment on column public.card_print_identity.source_name_raw is
  'Raw source-captured printed identity label when the governing domain contract requires it.';

comment on column public.card_print_identity.identity_payload is
  'Governed domain-specific identity dimensions that do not belong in universal columns.';

comment on column public.card_print_identity.identity_key_version is
  'Exact versioned identity law used to derive the canonical hash.';

comment on column public.card_print_identity.identity_key_hash is
  'Deterministic sha256 hash of the ordered canonical identity serialization for the row.';

commit;
