-- DISPOSABLE OFFLINE FIXTURE ONLY. A deliberately minimal typed projection of:
-- 20260715110000_tcgcsv_full_source_warehouse_v1.sql,
-- 20260728010000_tcgplayer_market_publication_v1.sql,
-- 20260304070000_printing_layer_v1.sql and baseline_init canonical game/card/set columns.
-- It omits unrelated columns, migrations, RLS, triggers and production writers.
-- The integration test separately installs the UNMODIFIED application RPC from
-- 20261001203000_jungle_edition_price_reader_integration_v1.sql.
-- This is SQL export qualification, NOT full-schema or Jungle release proof.

create table public.games (id uuid primary key, code text not null unique);
create table public.sets (id uuid primary key, code text not null, game text not null);
create table public.card_prints (
  id uuid primary key, gv_id text not null unique, name text not null,
  game_id uuid not null references public.games(id), set_id uuid references public.sets(id)
);
create table public.card_printings (
  id uuid primary key, card_print_id uuid not null references public.card_prints(id),
  printing_gv_id text not null unique, finish_key text not null,
  unique(card_print_id,finish_key)
);
create table public.tcgcsv_source_sync_runs (
  id uuid primary key, finished_at timestamptz, status text not null,
  sync_mode text not null, failed_count integer not null
);
create table public.market_price_pipeline_runs (
  id uuid primary key, run_key text not null, source_sync_run_id uuid references public.tcgcsv_source_sync_runs(id),
  selected_count integer not null, eligible_count integer not null, snapshot_count integer not null,
  excluded_count integer not null, quarantined_count integer not null, delayed_count integer not null,
  suppressed_count integer not null, completed_at timestamptz, created_at timestamptz not null,
  run_mode text not null, state text not null, reconciliation_state text not null
);
create table public.market_price_publication_sets (
  id uuid primary key, run_id uuid not null references public.market_price_pipeline_runs(id),
  publication_state text not null
);
create table public.market_price_current_publication (
  singleton boolean primary key check(singleton),
  run_id uuid not null references public.market_price_pipeline_runs(id),
  publication_set_id uuid not null references public.market_price_publication_sets(id)
);
create table public.tcgcsv_source_groups (group_id integer primary key, name text not null);
create table public.tcgcsv_source_products (
  product_id integer primary key, category_id integer, group_id integer, name text not null
);
create table public.tcgcsv_source_price_daily_observations (
  id uuid primary key, product_id integer not null, category_id integer, group_id integer,
  subtype_name text not null, source_price_row_identity text not null,
  currency text not null, payload_hash text not null
);
create table public.market_price_qualification_decisions (
  id uuid primary key, run_id uuid not null references public.market_price_pipeline_runs(id),
  source_observation_id uuid not null references public.tcgcsv_source_price_daily_observations(id),
  source_sync_run_id uuid references public.tcgcsv_source_sync_runs(id), source_product_id integer not null,
  source_subtype_name text not null, currency text, source_row_hash text not null,
  source_artifact_hash text, source_price_row_identity text not null,
  card_print_id uuid references public.card_prints(id), card_printing_id uuid references public.card_printings(id),
  market_price numeric, decision text not null, eligible boolean not null, publication_lane text not null,
  reason_codes text[] not null, evidence jsonb not null default '{}',
  freshness_result text, evaluated_at timestamptz not null default now()
);
create table public.external_mappings (id bigint primary key, meta jsonb not null default '{}');
create table public.market_price_publication_snapshots (
  id uuid primary key, provenance_id uuid not null unique,
  run_id uuid not null references public.market_price_pipeline_runs(id),
  publication_set_id uuid not null references public.market_price_publication_sets(id),
  qualification_decision_id uuid not null references public.market_price_qualification_decisions(id),
  card_print_id uuid not null references public.card_prints(id),
  card_printing_id uuid not null references public.card_printings(id),
  gv_id text not null, printing_gv_id text not null, finish_key text not null,
  currency text not null check(currency='USD'), market_price numeric not null check(market_price>0),
  low_price numeric, mid_price numeric, high_price numeric, direct_low_price numeric,
  source_mapping_id bigint references public.external_mappings(id), source_observed_on date not null,
  source_sync_finished_at timestamptz not null, published_at timestamptz not null,
  freshness_state text not null, publication_state text not null, edition_assignment_id uuid
);
create table public.card_printing_truth_reviews (
  id uuid primary key, card_printing_id uuid not null references public.card_printings(id),
  active boolean not null, public_visibility text not null
);
create table public.jungle_edition_identity_links_v1 (
  legacy_card_print_id uuid, card_print_id uuid, state text
);
-- Conservative fixture-only dependency. No edition row may become eligible.
create function public.jungle_edition_price_row_valid_v1(jsonb) returns boolean
language sql immutable as 'select false';
create table public.mv_market_listing_active_ask_current_v1 (
  card_printing_id uuid primary key, lowest_active_ask numeric, listing_count integer, observed_at timestamptz
);
-- Deliberately unrelated and never granted to the export role.
create table public.pricing_completion_private_probe (id integer primary key, private_value text);

insert into public.games values
 ('00000000-0000-4000-8000-000000000008','pokemon'),
 ('00000000-0000-4000-8000-000000000009','onepiece');
insert into public.sets values
 ('00000000-0000-4000-8000-000000000010','fixture-pokemon','pokemon'),
 ('00000000-0000-4000-8000-000000000011','fixture-onepiece','onepiece');
insert into public.card_prints values
 ('00000000-0000-4000-8000-000000000101','GV-PK-FIXTURE-001','Two finishes','00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000010'),
 ('00000000-0000-4000-8000-000000000102','GV-PK-FIXTURE-002','No children','00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000010'),
 ('00000000-0000-4000-8000-000000000103','GV-PK-FIXTURE-003','No quote','00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000010'),
 ('00000000-0000-4000-8000-000000000104','GV-OP-FIXTURE-001','Out of scope','00000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000011');
insert into public.card_printings values
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','GV-PK-FIXTURE-001-HOLO','holo'),
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000101','GV-PK-FIXTURE-001-REVERSE','reverse'),
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000103','GV-PK-FIXTURE-003-NORMAL','normal');
insert into public.tcgcsv_source_sync_runs values ('00000000-0000-4000-8000-000000000002',now()-interval '1 hour','completed','current_full_sync',0);
insert into public.market_price_pipeline_runs values
 ('00000000-0000-4000-8000-000000000001','fixture-current','00000000-0000-4000-8000-000000000002',8,2,2,0,6,0,0,now()-interval '30 minutes',now()-interval '2 hours','production','verified','reconciled');
insert into public.market_price_publication_sets values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','published');
insert into public.market_price_current_publication values (true,'00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
insert into public.tcgcsv_source_groups values (10,'Fixture source group');
insert into public.tcgcsv_source_products select 100+n,3,10,'Source fixture '||n from generate_series(1,8) n;
insert into public.tcgcsv_source_price_daily_observations
 select ('00000000-0000-4000-8000-'||lpad((1000+n)::text,12,'0'))::uuid,
  100+n,3,10,'Holofoil','fixture-row-'||n,'USD',repeat('a',64) from generate_series(1,8) n;
insert into public.market_price_qualification_decisions
 (id,run_id,source_observation_id,source_sync_run_id,source_product_id,source_subtype_name,currency,
  source_row_hash,source_artifact_hash,source_price_row_identity,card_print_id,card_printing_id,market_price,
  decision,eligible,publication_lane,reason_codes,evidence,freshness_result)
 select ('00000000-0000-4000-8000-'||lpad((2000+n)::text,12,'0'))::uuid,
  '00000000-0000-4000-8000-000000000001',('00000000-0000-4000-8000-'||lpad((1000+n)::text,12,'0'))::uuid,
  '00000000-0000-4000-8000-000000000002',100+n,'Holofoil','USD',repeat('a',64),repeat('b',64),'fixture-row-'||n,
  case when n>6 then '00000000-0000-4000-8000-000000000101'::uuid end,
  case when n>6 then ('00000000-0000-4000-8000-'||lpad((194+n)::text,12,'0'))::uuid end,
  10+n,case when n>6 then 'publish' else 'quarantine' end,n>6,case when n>6 then 'current' else 'quarantine' end,
  case when n>6 then '{}'::text[] else array[(array['missing_active_source_mapping','missing_printed_number_evidence',
   'missing_canonical_printing_identity','missing_positive_market_price','cosmos_assignment_required','special_variant_v1_1'])[n]] end,
  '{"category_id":3,"product_scope_result":"in_scope"}'::jsonb,'fresh'
 from generate_series(1,8) n;
insert into public.external_mappings values (1,'{}');
insert into public.market_price_publication_snapshots
 (id,provenance_id,run_id,publication_set_id,qualification_decision_id,card_print_id,card_printing_id,
  gv_id,printing_gv_id,finish_key,currency,market_price,source_mapping_id,source_observed_on,
  source_sync_finished_at,published_at,freshness_state,publication_state)
 select ('00000000-0000-4000-8000-'||lpad((3000+n)::text,12,'0'))::uuid,
  ('00000000-0000-4000-8000-'||lpad((4000+n)::text,12,'0'))::uuid,
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',
  ('00000000-0000-4000-8000-'||lpad((2006+n)::text,12,'0'))::uuid,
  p.card_print_id,p.id,'GV-PK-FIXTURE-001',p.printing_gv_id,p.finish_key,'USD',17+n,1,current_date,
  now()-case when n=1 then interval '1 hour' else interval '48 hours' end,
  now()-interval '30 minutes','fresh','published'
 from generate_series(1,2) n join public.card_printings p
 on p.id=('00000000-0000-4000-8000-'||lpad((200+n)::text,12,'0'))::uuid;
