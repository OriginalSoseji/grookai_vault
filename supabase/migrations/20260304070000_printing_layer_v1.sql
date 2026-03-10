-- Printing layer v1
-- Derived from remote schema-only DDL:
-- docs/release/DDL_REMOTE_printing_layer_schema_only.sql

create table if not exists public.finish_keys (
  key text not null,
  label text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  constraint finish_keys_pkey primary key (key)
);

create table if not exists public.card_printings (
  id uuid not null default gen_random_uuid(),
  card_print_id uuid not null,
  finish_key text not null,
  created_at timestamptz not null default now(),
  constraint card_printings_pkey primary key (id),
  constraint card_printings_card_print_id_finish_key_key unique (card_print_id, finish_key),
  constraint card_printings_card_print_id_fkey foreign key (card_print_id)
    references public.card_prints(id) on delete restrict,
  constraint card_printings_finish_key_fkey foreign key (finish_key)
    references public.finish_keys(key) on delete restrict
);

create table if not exists public.external_printing_mappings (
  id uuid not null default gen_random_uuid(),
  card_printing_id uuid not null,
  source text not null,
  external_id text not null,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  constraint external_printing_mappings_pkey primary key (id),
  constraint external_printing_mappings_source_external_id_key unique (source, external_id),
  constraint external_printing_mappings_card_printing_id_fkey foreign key (card_printing_id)
    references public.card_printings(id) on delete restrict
);

create table if not exists public.premium_parallel_eligibility (
  set_code text not null,
  number text not null,
  finish_key text not null default 'pokeball'::text,
  constraint premium_parallel_eligibility_pkey primary key (set_code, number, finish_key)
);
