create schema if not exists ingest;

create table if not exists ingest.tcgplayer_products_stage (
  id bigserial primary key,
  imported_at timestamptz not null default now(),
  batch_id text not null,
  tcgplayer_id text not null,
  product_line text,
  set_name text,
  set_code_hint text,
  number text,
  name text,
  rarity text,
  variant text,
  condition_hint text,
  language text,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_tcgplayer_stage_batch_id
  on ingest.tcgplayer_products_stage (batch_id);

create index if not exists idx_tcgplayer_stage_tcgplayer_id
  on ingest.tcgplayer_products_stage (tcgplayer_id);

create index if not exists idx_tcgplayer_stage_set_number
  on ingest.tcgplayer_products_stage (set_code_hint, number);
