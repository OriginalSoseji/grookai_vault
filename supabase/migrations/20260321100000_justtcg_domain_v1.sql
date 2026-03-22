create table if not exists public.justtcg_variants (
  variant_id text not null,
  card_print_id uuid not null,
  condition text not null,
  printing text not null,
  language text,
  created_at timestamptz not null default now(),
  constraint justtcg_variants_pkey primary key (variant_id),
  constraint justtcg_variants_card_print_id_fkey
    foreign key (card_print_id) references public.card_prints(id),
  constraint justtcg_variants_variant_id_check
    check (btrim(variant_id) <> ''),
  constraint justtcg_variants_condition_check
    check (btrim(condition) <> ''),
  constraint justtcg_variants_printing_check
    check (btrim(printing) <> ''),
  constraint justtcg_variants_language_check
    check (language is null or btrim(language) <> '')
);

create table if not exists public.justtcg_variant_price_snapshots (
  id uuid not null default gen_random_uuid(),
  variant_id text not null,
  card_print_id uuid not null,
  price numeric(12,2),
  avg_price numeric(12,2),
  price_change_24h numeric(12,4),
  price_change_7d numeric(12,4),
  fetched_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint justtcg_variant_price_snapshots_pkey primary key (id),
  constraint justtcg_variant_price_snapshots_variant_id_fkey
    foreign key (variant_id) references public.justtcg_variants(variant_id),
  constraint justtcg_variant_price_snapshots_card_print_id_fkey
    foreign key (card_print_id) references public.card_prints(id),
  constraint justtcg_variant_price_snapshots_variant_id_check
    check (btrim(variant_id) <> ''),
  constraint justtcg_variant_price_snapshots_raw_payload_check
    check (jsonb_typeof(raw_payload) = 'object')
);

create table if not exists public.justtcg_variant_prices_latest (
  variant_id text not null,
  card_print_id uuid not null,
  condition text not null,
  printing text not null,
  language text,
  price numeric(12,2),
  avg_price numeric(12,2),
  price_change_24h numeric(12,4),
  price_change_7d numeric(12,4),
  updated_at timestamptz not null,
  constraint justtcg_variant_prices_latest_pkey primary key (variant_id),
  constraint justtcg_variant_prices_latest_variant_id_fkey
    foreign key (variant_id) references public.justtcg_variants(variant_id),
  constraint justtcg_variant_prices_latest_card_print_id_fkey
    foreign key (card_print_id) references public.card_prints(id),
  constraint justtcg_variant_prices_latest_variant_id_check
    check (btrim(variant_id) <> ''),
  constraint justtcg_variant_prices_latest_condition_check
    check (btrim(condition) <> ''),
  constraint justtcg_variant_prices_latest_printing_check
    check (btrim(printing) <> ''),
  constraint justtcg_variant_prices_latest_language_check
    check (language is null or btrim(language) <> '')
);

create index if not exists idx_justtcg_variants_card_print_id
  on public.justtcg_variants (card_print_id);

create index if not exists idx_justtcg_variant_price_snapshots_variant_fetched_at
  on public.justtcg_variant_price_snapshots (variant_id, fetched_at desc);

create index if not exists idx_justtcg_variant_price_snapshots_card_print_fetched_at
  on public.justtcg_variant_price_snapshots (card_print_id, fetched_at desc);

create index if not exists idx_justtcg_variant_prices_latest_card_print_id
  on public.justtcg_variant_prices_latest (card_print_id);
