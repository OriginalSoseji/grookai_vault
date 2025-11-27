create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "pg_trgm" with schema "extensions";

create schema if not exists "ingest";

create extension if not exists "unaccent" with schema "public";

create type "public"."price_currency" as enum ('USD', 'EUR', 'MXN');

create type "public"."price_kind" as enum ('listing', 'sold', 'floor', 'median', 'average', 'low', 'high', 'shop_sale');

create sequence "public"."card_price_observations_id_seq";

create sequence "public"."card_price_ticks_id_seq";

create sequence "public"."condition_prices_id_seq";

create sequence "public"."dev_audit_id_seq";

create sequence "public"."external_provider_stats_id_seq";

create sequence "public"."graded_prices_id_seq";

create sequence "public"."import_image_errors_id_seq";

create sequence "public"."job_logs_id_seq";

create sequence "public"."price_observations_id_seq";

create sequence "public"."price_rollup_config_id_seq";

create sequence "public"."prices_id_seq";

create sequence "public"."unmatched_price_rows_id_seq";


  create table "ingest"."card_prints_raw" (
    "game_code" text not null,
    "set_code" text,
    "name" text not null,
    "number" text,
    "variant_key" text default ''::text,
    "rarity" text,
    "image_url" text,
    "tcgplayer_id" text,
    "external_ids" jsonb default '{}'::jsonb,
    "source" text,
    "checksum" text,
    "loaded_at" timestamp with time zone default now()
      );



  create table "public"."_import_card_prints" (
    "game" text not null,
    "set_code" text not null,
    "external_id" text,
    "number" text not null,
    "name" text not null,
    "rarity" text,
    "supertype" text,
    "subtype" text,
    "image_url" text
      );



  create table "public"."_import_sets" (
    "game" text not null,
    "code" text not null,
    "name" text not null,
    "release_date" date,
    "logo_url" text,
    "symbol_url" text
      );



  create table "public"."alerts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "card_id" uuid not null,
    "rule" jsonb not null,
    "active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."alerts" enable row level security;


  create table "public"."app_settings" (
    "id" boolean not null default true,
    "allow_client_condition_edits" boolean not null default false,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."backup_card_prints_null_utc" (
    "id" uuid,
    "game_id" uuid,
    "set_id" uuid,
    "name" text,
    "number" text,
    "variant_key" text,
    "rarity" text,
    "image_url" text,
    "tcgplayer_id" text,
    "external_ids" jsonb,
    "updated_at" timestamp with time zone,
    "set_code" text,
    "number_plain" text
      );



  create table "public"."card_catalog" (
    "id" uuid not null default gen_random_uuid(),
    "set_code" text not null,
    "set_name" text not null,
    "card_number" text not null,
    "name" text not null,
    "rarity" text,
    "image_url" text not null,
    "released_at" date
      );


alter table "public"."card_catalog" enable row level security;


  create table "public"."card_price_observations" (
    "id" bigint not null default nextval('public.card_price_observations_id_seq'::regclass),
    "card_print_id" uuid not null,
    "source_id" text not null,
    "observed_at" timestamp with time zone not null default now(),
    "currency" public.price_currency not null default 'USD'::public.price_currency,
    "value" numeric(12,2) not null,
    "kind" public.price_kind not null,
    "qty" integer not null default 1,
    "meta" jsonb
      );



  create table "public"."card_price_rollups" (
    "card_print_id" uuid not null,
    "currency" public.price_currency not null default 'USD'::public.price_currency,
    "vault_value" numeric(12,2) not null,
    "last_computed_at" timestamp with time zone not null default now(),
    "sample_size" integer not null default 0,
    "method" text not null,
    "source_breakdown" jsonb
      );



  create table "public"."card_price_ticks" (
    "id" bigint not null default nextval('public.card_price_ticks_id_seq'::regclass),
    "card_print_id" uuid not null,
    "source" text not null,
    "currency" text not null default 'USD'::text,
    "market" numeric,
    "low" numeric,
    "mid" numeric,
    "high" numeric,
    "captured_at" timestamp with time zone not null default now()
      );


alter table "public"."card_price_ticks" enable row level security;


  create table "public"."card_prices" (
    "id" uuid not null default gen_random_uuid(),
    "card_print_id" uuid not null,
    "source" text not null,
    "currency" text not null default 'USD'::text,
    "low" numeric,
    "mid" numeric,
    "high" numeric,
    "market" numeric,
    "last_updated" timestamp with time zone not null default now()
      );


alter table "public"."card_prices" enable row level security;


  create table "public"."card_prints" (
    "id" uuid not null default gen_random_uuid(),
    "game_id" uuid not null default 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5'::uuid,
    "set_id" uuid not null,
    "name" text not null,
    "number" text,
    "variant_key" text default ''::text,
    "rarity" text,
    "image_url" text,
    "tcgplayer_id" text,
    "external_ids" jsonb default '{}'::jsonb,
    "updated_at" timestamp with time zone default now(),
    "set_code" text,
    "number_plain" text generated always as (regexp_replace(number, '[^0-9]'::text, ''::text, 'g'::text)) stored,
    "artist" text,
    "regulation_mark" text,
    "image_alt_url" text,
    "image_source" text,
    "variants" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "last_synced_at" timestamp with time zone,
    "print_identity_key" text,
    "ai_metadata" jsonb,
    "image_hash" text,
    "data_quality_flags" jsonb
      );


alter table "public"."card_prints" enable row level security;


  create table "public"."card_prints_backup_20251115" (
    "id" uuid,
    "game_id" uuid,
    "set_id" uuid,
    "name" text,
    "number" text,
    "variant_key" text,
    "rarity" text,
    "image_url" text,
    "tcgplayer_id" text,
    "external_ids" jsonb,
    "updated_at" timestamp with time zone,
    "set_code" text,
    "number_plain" text,
    "artist" text,
    "regulation_mark" text,
    "image_alt_url" text,
    "image_source" text,
    "variants" jsonb
      );



  create table "public"."cards" (
    "id" uuid not null default gen_random_uuid(),
    "game" text not null default 'pokemon'::text,
    "set_id" uuid,
    "number" text,
    "name" text not null,
    "variant" text,
    "tcgplayer_id" text,
    "image_url" text,
    "created_at" timestamp with time zone default now(),
    "rarity" text
      );


alter table "public"."cards" enable row level security;


  create table "public"."condition_multipliers" (
    "condition_label" text not null,
    "multiplier" numeric not null
      );



  create table "public"."condition_prices" (
    "id" bigint not null default nextval('public.condition_prices_id_seq'::regclass),
    "card_id" uuid not null,
    "condition_label" text not null,
    "currency" text not null default 'USD'::text,
    "market_price" numeric,
    "last_sold_price" numeric,
    "source" text,
    "ts" timestamp with time zone default now()
      );



  create table "public"."dev_audit" (
    "id" bigint not null default nextval('public.dev_audit_id_seq'::regclass),
    "ts" timestamp with time zone default now(),
    "actor" text,
    "endpoint" text,
    "payload" jsonb,
    "note" text
      );



  create table "public"."external_cache" (
    "cache_key" text not null,
    "provider" text not null,
    "endpoint" text not null,
    "query_hash" text not null,
    "payload" jsonb not null,
    "status" integer not null,
    "fetched_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone not null
      );



  create table "public"."external_provider_stats" (
    "id" bigint not null default nextval('public.external_provider_stats_id_seq'::regclass),
    "provider" text not null,
    "metric" text not null,
    "value" numeric not null,
    "window_label" text not null default '1d'::text,
    "observed_at" timestamp with time zone not null default now()
      );



  create table "public"."fx_daily" (
    "d" date not null,
    "usd_per_eur" numeric(12,6) not null,
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."games" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null,
    "slug" text
      );


alter table "public"."games" enable row level security;


  create table "public"."graded_prices" (
    "id" bigint not null default nextval('public.graded_prices_id_seq'::regclass),
    "card_id" uuid not null,
    "grade_company" text not null,
    "grade_value" numeric not null,
    "grade_label" text,
    "currency" text not null default 'USD'::text,
    "market_price" numeric,
    "last_sold_price" numeric,
    "pop_total" integer,
    "source" text,
    "ts" timestamp with time zone default now()
      );



  create table "public"."has_currency" (
    "exists" boolean
      );



  create table "public"."has_high" (
    "exists" boolean
      );



  create table "public"."has_low" (
    "exists" boolean
      );



  create table "public"."has_mid" (
    "exists" boolean
      );



  create table "public"."has_source" (
    "exists" boolean
      );



  create table "public"."import_image_errors" (
    "id" bigint not null default nextval('public.import_image_errors_id_seq'::regclass),
    "card_print_id" uuid,
    "set_code" text,
    "number" text,
    "source" text,
    "attempted_url" text,
    "err" text,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."job_logs" (
    "id" bigint not null default nextval('public.job_logs_id_seq'::regclass),
    "job_id" uuid not null,
    "at" timestamp with time zone not null default now(),
    "level" text not null default 'info'::text,
    "message" text,
    "meta" jsonb
      );



  create table "public"."jobs" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "payload" jsonb not null,
    "status" text not null default 'queued'::text,
    "attempts" integer not null default 0,
    "max_attempts" integer not null default 5,
    "last_error" text,
    "scheduled_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."listing_images" (
    "id" uuid not null default gen_random_uuid(),
    "listing_id" uuid not null,
    "image_url" text not null,
    "thumb_3x4_url" text,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."listing_images" enable row level security;


  create table "public"."listings" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null,
    "title" text,
    "description" text,
    "price_cents" integer,
    "currency" text default 'USD'::text,
    "condition" text,
    "visibility" text default 'public'::text,
    "status" text default 'active'::text,
    "location_city" text,
    "location_region" text,
    "location_country" text,
    "primary_image_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "card_print_id" uuid,
    "vault_item_id" uuid,
    "condition_tier" text,
    "quantity" integer default 1,
    "note" text,
    "image_url" text
      );


alter table "public"."listings" enable row level security;


  create table "public"."market_prices" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid not null,
    "price" numeric not null,
    "source" text not null default 'manual'::text,
    "fetched_at" timestamp with time zone not null default now()
      );


alter table "public"."market_prices" enable row level security;


  create table "public"."price_observations" (
    "id" bigint not null default nextval('public.price_observations_id_seq'::regclass),
    "print_id" uuid,
    "condition" text,
    "grade_agency" text,
    "grade_value" text,
    "grade_qualifier" text,
    "source" text not null,
    "listing_type" text,
    "currency" text not null default 'USD'::text,
    "price_usd" numeric(12,2) not null,
    "quantity" integer,
    "observed_at" timestamp with time zone not null,
    "imported_at" timestamp with time zone not null default now(),
    "set_code" text not null default ''::text,
    "number" text not null default ''::text,
    "variant" text not null default ''::text,
    "price_market" numeric,
    "price_mid" numeric,
    "price_low" numeric,
    "price_high" numeric
      );


alter table "public"."price_observations" enable row level security;


  create table "public"."price_observations_backup_20251115" (
    "id" bigint,
    "print_id" uuid,
    "condition" text,
    "grade_agency" text,
    "grade_value" text,
    "grade_qualifier" text,
    "source" text,
    "listing_type" text,
    "currency" text,
    "price_usd" numeric(12,2),
    "quantity" integer,
    "observed_at" timestamp with time zone,
    "imported_at" timestamp with time zone,
    "set_code" text,
    "number" text,
    "variant" text,
    "price_market" numeric,
    "price_mid" numeric,
    "price_low" numeric,
    "price_high" numeric
      );



  create table "public"."price_rollup_config" (
    "id" integer not null default nextval('public.price_rollup_config_id_seq'::regclass),
    "method" text not null default 'weighted_average'::text,
    "currency" public.price_currency not null default 'USD'::public.price_currency,
    "weights" jsonb not null
      );



  create table "public"."price_sources" (
    "id" text not null,
    "display_name" text not null,
    "is_active" boolean not null default true
      );



  create table "public"."prices" (
    "id" bigint not null default nextval('public.prices_id_seq'::regclass),
    "card_id" uuid not null,
    "ts" timestamp with time zone not null,
    "market_price" numeric(10,2),
    "source" text,
    "set_code" text,
    "number" text,
    "mapped_via" text,
    "currency" text not null default 'USD'::text,
    "name" text,
    "image_url" text
      );


alter table "public"."prices" enable row level security;


  create table "public"."scans" (
    "id" uuid not null default gen_random_uuid(),
    "vault_item_id" uuid not null,
    "images" jsonb not null,
    "device_meta" jsonb,
    "score" integer,
    "label" text,
    "confidence" numeric(4,2),
    "defects" jsonb,
    "created_at" timestamp with time zone default now(),
    "user_id" uuid
      );


alter table "public"."scans" enable row level security;


  create table "public"."set_sync_audit" (
    "id" bigint generated by default as identity not null,
    "run_at" timestamp with time zone not null default now(),
    "total_api" integer not null,
    "total_db" integer not null,
    "missing_count" integer not null,
    "extra_count" integer not null,
    "missing" jsonb not null default '[]'::jsonb,
    "extra" jsonb not null default '[]'::jsonb,
    "fix" jsonb
      );


alter table "public"."set_sync_audit" enable row level security;


  create table "public"."sets" (
    "id" uuid not null default gen_random_uuid(),
    "game" text not null default 'pokemon'::text,
    "code" text,
    "name" text,
    "release_date" date,
    "source" jsonb default '{}'::jsonb,
    "logo_url" text,
    "symbol_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_synced_at" timestamp with time zone
      );


alter table "public"."sets" enable row level security;


  create table "public"."unmatched_price_rows" (
    "id" bigint not null default nextval('public.unmatched_price_rows_id_seq'::regclass),
    "raw_payload" jsonb not null,
    "reason" text not null,
    "seen_at" timestamp with time zone not null default now()
      );


alter table "public"."unmatched_price_rows" enable row level security;


  create table "public"."vault_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "card_id" uuid not null,
    "qty" integer not null default 1,
    "acquisition_cost" numeric(10,2),
    "condition_label" text,
    "condition_score" integer,
    "is_graded" boolean default false,
    "grade_company" text,
    "grade_value" text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "name" text not null,
    "set_name" text,
    "photo_url" text,
    "market_price" numeric,
    "last_price_update" timestamp with time zone,
    "grade_label" text
      );


alter table "public"."vault_items" enable row level security;


  create table "public"."vault_items_backup_20251115" (
    "id" uuid,
    "user_id" uuid,
    "card_id" uuid,
    "qty" integer,
    "acquisition_cost" numeric(10,2),
    "condition_label" text,
    "condition_score" integer,
    "is_graded" boolean,
    "grade_company" text,
    "grade_value" text,
    "notes" text,
    "created_at" timestamp with time zone,
    "name" text,
    "set_name" text,
    "photo_url" text,
    "market_price" numeric,
    "last_price_update" timestamp with time zone,
    "grade_label" text
      );



  create table "public"."waitlist" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "source" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."waitlist" enable row level security;


  create table "public"."wishlist_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "card_id" uuid not null,
    "note" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."wishlist_items" enable row level security;

alter sequence "public"."card_price_observations_id_seq" owned by "public"."card_price_observations"."id";

alter sequence "public"."card_price_ticks_id_seq" owned by "public"."card_price_ticks"."id";

alter sequence "public"."condition_prices_id_seq" owned by "public"."condition_prices"."id";

alter sequence "public"."dev_audit_id_seq" owned by "public"."dev_audit"."id";

alter sequence "public"."external_provider_stats_id_seq" owned by "public"."external_provider_stats"."id";

alter sequence "public"."graded_prices_id_seq" owned by "public"."graded_prices"."id";

alter sequence "public"."import_image_errors_id_seq" owned by "public"."import_image_errors"."id";

alter sequence "public"."job_logs_id_seq" owned by "public"."job_logs"."id";

alter sequence "public"."price_observations_id_seq" owned by "public"."price_observations"."id";

alter sequence "public"."price_rollup_config_id_seq" owned by "public"."price_rollup_config"."id";

alter sequence "public"."prices_id_seq" owned by "public"."prices"."id";

alter sequence "public"."unmatched_price_rows_id_seq" owned by "public"."unmatched_price_rows"."id";

CREATE INDEX alerts_card_idx ON public.alerts USING btree (card_id);

CREATE UNIQUE INDEX alerts_pkey ON public.alerts USING btree (id);

CREATE INDEX alerts_user_idx ON public.alerts USING btree (user_id);

CREATE UNIQUE INDEX app_settings_pkey ON public.app_settings USING btree (id);

CREATE UNIQUE INDEX card_catalog_pkey ON public.card_catalog USING btree (id);

CREATE UNIQUE INDEX card_price_observations_pkey ON public.card_price_observations USING btree (id);

CREATE UNIQUE INDEX card_price_rollups_pkey ON public.card_price_rollups USING btree (card_print_id);

CREATE UNIQUE INDEX card_price_ticks_pkey ON public.card_price_ticks USING btree (id);

CREATE INDEX card_price_ticks_print_time_idx ON public.card_price_ticks USING btree (card_print_id, captured_at DESC);

CREATE UNIQUE INDEX card_prices_card_print_id_source_key ON public.card_prices USING btree (card_print_id, source);

CREATE UNIQUE INDEX card_prices_pkey ON public.card_prices USING btree (id);

CREATE INDEX card_prices_print_source_idx ON public.card_prices USING btree (card_print_id, source);

CREATE INDEX card_prices_updated_idx ON public.card_prices USING btree (last_updated);

CREATE UNIQUE INDEX card_prints_game_set_num_key ON public.card_prints USING btree (game_id, set_code, number);

CREATE INDEX card_prints_name_ci ON public.card_prints USING btree (lower(name));

CREATE INDEX card_prints_name_gin ON public.card_prints USING gin (to_tsvector('simple'::regconfig, COALESCE(name, ''::text)));

CREATE INDEX card_prints_name_trgm_idx ON public.card_prints USING gin (lower(name) extensions.gin_trgm_ops);

CREATE UNIQUE INDEX card_prints_pkey ON public.card_prints USING btree (id);

CREATE UNIQUE INDEX card_prints_print_identity_key_uq ON public.card_prints USING btree (print_identity_key) WHERE (print_identity_key IS NOT NULL);

CREATE INDEX card_prints_set_code_ci ON public.card_prints USING btree (lower(set_code));

CREATE INDEX card_prints_set_code_number_plain_idx ON public.card_prints USING btree (set_code, number_plain);

CREATE INDEX card_prints_set_id_idx ON public.card_prints USING btree (set_id);

CREATE INDEX card_prints_tcgplayer_id_idx ON public.card_prints USING btree (tcgplayer_id);

CREATE UNIQUE INDEX card_prints_uniq ON public.card_prints USING btree (game_id, set_id, number, COALESCE(variant_key, ''::text));

CREATE UNIQUE INDEX card_prints_uq_set_num_variant ON public.card_prints USING btree (set_id, number_plain, COALESCE(variant_key, ''::text));

CREATE INDEX cards_name_idx ON public.cards USING gin (to_tsvector('simple'::regconfig, COALESCE(name, ''::text)));

CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id);

CREATE INDEX cards_set_idx ON public.cards USING btree (set_id);

CREATE UNIQUE INDEX condition_multipliers_pkey ON public.condition_multipliers USING btree (condition_label);

CREATE INDEX condition_prices_card_condition_ts ON public.condition_prices USING btree (card_id, condition_label, currency, ts DESC);

CREATE UNIQUE INDEX condition_prices_card_id_condition_label_currency_ts_key ON public.condition_prices USING btree (card_id, condition_label, currency, ts);

CREATE UNIQUE INDEX condition_prices_pkey ON public.condition_prices USING btree (id);

CREATE INDEX cp_setnum_idx ON public.card_prints USING btree (set_code, number);

CREATE INDEX cpo_card_time_idx ON public.card_price_observations USING btree (card_print_id, observed_at DESC);

CREATE INDEX cpo_source_idx ON public.card_price_observations USING btree (source_id);

CREATE UNIQUE INDEX dev_audit_pkey ON public.dev_audit USING btree (id);

CREATE UNIQUE INDEX external_cache_pkey ON public.external_cache USING btree (cache_key);

CREATE UNIQUE INDEX external_provider_stats_pkey ON public.external_provider_stats USING btree (id);

CREATE UNIQUE INDEX fx_daily_pkey ON public.fx_daily USING btree (d);

CREATE UNIQUE INDEX games_code_key ON public.games USING btree (code);

CREATE UNIQUE INDEX games_pkey ON public.games USING btree (id);

CREATE UNIQUE INDEX games_slug_key ON public.games USING btree (slug);

CREATE INDEX graded_prices_card_grade_ts ON public.graded_prices USING btree (card_id, grade_company, grade_value, currency, ts DESC);

CREATE UNIQUE INDEX graded_prices_card_id_grade_company_grade_value_currency_ts_key ON public.graded_prices USING btree (card_id, grade_company, grade_value, currency, ts);

CREATE UNIQUE INDEX graded_prices_pkey ON public.graded_prices USING btree (id);

CREATE INDEX idx_card_prints_name ON public.card_prints USING btree (name);

CREATE INDEX idx_card_prints_name_trgm ON public.card_prints USING gin (name extensions.gin_trgm_ops);

CREATE INDEX idx_card_prints_set_no ON public.card_prints USING btree (set_id, number);

CREATE INDEX idx_card_prints_setnum ON public.card_prints USING btree (set_code, number);

CREATE INDEX idx_card_prints_setnumplain ON public.card_prints USING btree (set_code, number_plain);

CREATE INDEX idx_catalog_name_trgm ON public.card_catalog USING gin (name extensions.gin_trgm_ops);

CREATE INDEX idx_catalog_setname_trgm ON public.card_catalog USING gin (set_name extensions.gin_trgm_ops);

CREATE INDEX idx_cp_last_updated ON public.card_prices USING btree (last_updated DESC);

CREATE INDEX idx_cp_print_time ON public.card_prices USING btree (card_print_id, last_updated DESC) INCLUDE (low, mid, high, currency, source);

CREATE INDEX idx_external_cache_exp ON public.external_cache USING btree (expires_at);

CREATE INDEX idx_job_logs_job_time ON public.job_logs USING btree (job_id, at DESC);

CREATE INDEX idx_jobs_status_sched ON public.jobs USING btree (status, scheduled_at);

CREATE INDEX idx_listing_images_listing ON public.listing_images USING btree (listing_id);

CREATE INDEX idx_listing_images_sort ON public.listing_images USING btree (listing_id, sort_order);

CREATE INDEX idx_listings_created_at ON public.listings USING btree (created_at);

CREATE INDEX idx_listings_owner ON public.listings USING btree (owner_id);

CREATE INDEX idx_listings_status ON public.listings USING btree (status);

CREATE INDEX idx_market_prices_card_source_time ON public.market_prices USING btree (card_id, source, fetched_at DESC);

CREATE INDEX idx_market_prices_card_time ON public.market_prices USING btree (card_id, fetched_at DESC);

CREATE INDEX idx_price_obs_dim ON public.price_observations USING btree (condition, grade_agency, grade_value);

CREATE INDEX idx_price_obs_lookup ON public.price_observations USING btree (set_code, number, variant, observed_at DESC);

CREATE INDEX idx_price_obs_print ON public.price_observations USING btree (print_id, observed_at DESC);

CREATE INDEX idx_price_obs_print_observed ON public.price_observations USING btree (print_id, observed_at DESC);

CREATE INDEX idx_prices_card_ts ON public.prices USING btree (card_id, ts DESC);

CREATE INDEX idx_provider_stats_time ON public.external_provider_stats USING btree (provider, observed_at DESC);

CREATE INDEX idx_sets_code ON public.sets USING btree (code);

CREATE INDEX idx_vault_items_user_created ON public.vault_items USING btree (user_id, created_at DESC);

CREATE INDEX idx_vault_items_user_name ON public.vault_items USING btree (user_id, name);

CREATE UNIQUE INDEX import_image_errors_pkey ON public.import_image_errors USING btree (id);

CREATE UNIQUE INDEX job_logs_pkey ON public.job_logs USING btree (id);

CREATE UNIQUE INDEX jobs_pkey ON public.jobs USING btree (id);

CREATE UNIQUE INDEX listing_images_pkey ON public.listing_images USING btree (id);

CREATE UNIQUE INDEX listings_pkey ON public.listings USING btree (id);

CREATE UNIQUE INDEX market_prices_pkey ON public.market_prices USING btree (id);

CREATE INDEX price_observations_condition_grade_agency_grade_value_idx ON public.price_observations USING btree (condition, grade_agency, grade_value);

CREATE UNIQUE INDEX price_observations_pkey ON public.price_observations USING btree (id);

CREATE UNIQUE INDEX price_observations_print_id_condition_grade_agency_grade_va_key ON public.price_observations USING btree (print_id, condition, grade_agency, grade_value, source, observed_at);

CREATE INDEX price_observations_print_id_observed_at_idx ON public.price_observations USING btree (print_id, observed_at DESC);

CREATE UNIQUE INDEX price_rollup_config_pkey ON public.price_rollup_config USING btree (id);

CREATE UNIQUE INDEX price_sources_pkey ON public.price_sources USING btree (id);

CREATE INDEX prices_card_id_ts_idx ON public.prices USING btree (card_id, ts DESC);

CREATE INDEX prices_card_source_ts_idx ON public.prices USING btree (card_id, source, ts DESC);

CREATE INDEX prices_card_ts_idx ON public.prices USING btree (card_id, ts);

CREATE UNIQUE INDEX prices_pkey ON public.prices USING btree (id);

CREATE INDEX prices_set_number_idx ON public.prices USING btree (lower(set_code), lower(number));

CREATE INDEX prices_setnum_cur_ts_idx ON public.prices USING btree (lower(set_code), currency, ts DESC);

CREATE INDEX prices_setnum_currency_ts ON public.prices USING btree (lower(set_code), lower(regexp_replace(number, '[^0-9a-z]'::text, ''::text, 'g'::text)), currency, ts DESC);

CREATE INDEX scans_created_idx ON public.scans USING btree (created_at);

CREATE UNIQUE INDEX scans_pkey ON public.scans USING btree (id);

CREATE INDEX scans_vault_item_idx ON public.scans USING btree (vault_item_id);

CREATE UNIQUE INDEX set_sync_audit_pkey ON public.set_sync_audit USING btree (id);

CREATE UNIQUE INDEX sets_game_code_key ON public.sets USING btree (game, code);

CREATE UNIQUE INDEX sets_pkey ON public.sets USING btree (id);

CREATE UNIQUE INDEX sets_unique_game_code ON public.sets USING btree (game, code);

CREATE UNIQUE INDEX unmatched_price_rows_pkey ON public.unmatched_price_rows USING btree (id);

CREATE UNIQUE INDEX uq_card_prints_game_set_number ON public.card_prints USING btree (game_id, set_id, number);

CREATE UNIQUE INDEX uq_card_prints_setid_number ON public.card_prints USING btree (set_id, number);

CREATE UNIQUE INDEX uq_card_prints_setnum ON public.card_prints USING btree (set_code, number);

CREATE UNIQUE INDEX uq_catalog_setnum ON public.card_catalog USING btree (set_code, card_number);

CREATE UNIQUE INDEX uq_sets_code ON public.sets USING btree (code);

CREATE UNIQUE INDEX uq_user_card ON public.vault_items USING btree (user_id, card_id);

CREATE UNIQUE INDEX uq_vault_items_user_card ON public.vault_items USING btree (user_id, card_id);

CREATE UNIQUE INDEX uq_vault_user_card ON public.vault_items USING btree (user_id, card_id);

CREATE UNIQUE INDEX ux_condition_prices_card_condition_currency ON public.condition_prices USING btree (card_id, condition_label, currency);

CREATE UNIQUE INDEX ux_graded_prices_card_grade_currency ON public.graded_prices USING btree (card_id, grade_company, grade_value, currency);

CREATE INDEX vault_items_card_id_idx ON public.vault_items USING btree (card_id);

CREATE INDEX vault_items_card_idx ON public.vault_items USING btree (card_id);

CREATE INDEX vault_items_created_idx ON public.vault_items USING btree (created_at DESC);

CREATE UNIQUE INDEX vault_items_pkey ON public.vault_items USING btree (id);

CREATE INDEX vault_items_user_created_idx ON public.vault_items USING btree (user_id, created_at DESC);

CREATE INDEX vault_items_user_idx ON public.vault_items USING btree (user_id);

CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist USING btree (lower(email));

CREATE UNIQUE INDEX waitlist_pkey ON public.waitlist USING btree (id);

CREATE UNIQUE INDEX wishlist_items_pkey ON public.wishlist_items USING btree (id);

CREATE UNIQUE INDEX wishlist_items_user_id_card_id_key ON public.wishlist_items USING btree (user_id, card_id);

CREATE INDEX wishlist_user_idx ON public.wishlist_items USING btree (user_id);

alter table "public"."alerts" add constraint "alerts_pkey" PRIMARY KEY using index "alerts_pkey";

alter table "public"."app_settings" add constraint "app_settings_pkey" PRIMARY KEY using index "app_settings_pkey";

alter table "public"."card_catalog" add constraint "card_catalog_pkey" PRIMARY KEY using index "card_catalog_pkey";

alter table "public"."card_price_observations" add constraint "card_price_observations_pkey" PRIMARY KEY using index "card_price_observations_pkey";

alter table "public"."card_price_rollups" add constraint "card_price_rollups_pkey" PRIMARY KEY using index "card_price_rollups_pkey";

alter table "public"."card_price_ticks" add constraint "card_price_ticks_pkey" PRIMARY KEY using index "card_price_ticks_pkey";

alter table "public"."card_prices" add constraint "card_prices_pkey" PRIMARY KEY using index "card_prices_pkey";

alter table "public"."card_prints" add constraint "card_prints_pkey" PRIMARY KEY using index "card_prints_pkey";

alter table "public"."cards" add constraint "cards_pkey" PRIMARY KEY using index "cards_pkey";

alter table "public"."condition_multipliers" add constraint "condition_multipliers_pkey" PRIMARY KEY using index "condition_multipliers_pkey";

alter table "public"."condition_prices" add constraint "condition_prices_pkey" PRIMARY KEY using index "condition_prices_pkey";

alter table "public"."dev_audit" add constraint "dev_audit_pkey" PRIMARY KEY using index "dev_audit_pkey";

alter table "public"."external_cache" add constraint "external_cache_pkey" PRIMARY KEY using index "external_cache_pkey";

alter table "public"."external_provider_stats" add constraint "external_provider_stats_pkey" PRIMARY KEY using index "external_provider_stats_pkey";

alter table "public"."fx_daily" add constraint "fx_daily_pkey" PRIMARY KEY using index "fx_daily_pkey";

alter table "public"."games" add constraint "games_pkey" PRIMARY KEY using index "games_pkey";

alter table "public"."graded_prices" add constraint "graded_prices_pkey" PRIMARY KEY using index "graded_prices_pkey";

alter table "public"."import_image_errors" add constraint "import_image_errors_pkey" PRIMARY KEY using index "import_image_errors_pkey";

alter table "public"."job_logs" add constraint "job_logs_pkey" PRIMARY KEY using index "job_logs_pkey";

alter table "public"."jobs" add constraint "jobs_pkey" PRIMARY KEY using index "jobs_pkey";

alter table "public"."listing_images" add constraint "listing_images_pkey" PRIMARY KEY using index "listing_images_pkey";

alter table "public"."listings" add constraint "listings_pkey" PRIMARY KEY using index "listings_pkey";

alter table "public"."market_prices" add constraint "market_prices_pkey" PRIMARY KEY using index "market_prices_pkey";

alter table "public"."price_observations" add constraint "price_observations_pkey" PRIMARY KEY using index "price_observations_pkey";

alter table "public"."price_rollup_config" add constraint "price_rollup_config_pkey" PRIMARY KEY using index "price_rollup_config_pkey";

alter table "public"."price_sources" add constraint "price_sources_pkey" PRIMARY KEY using index "price_sources_pkey";

alter table "public"."prices" add constraint "prices_pkey" PRIMARY KEY using index "prices_pkey";

alter table "public"."scans" add constraint "scans_pkey" PRIMARY KEY using index "scans_pkey";

alter table "public"."set_sync_audit" add constraint "set_sync_audit_pkey" PRIMARY KEY using index "set_sync_audit_pkey";

alter table "public"."sets" add constraint "sets_pkey" PRIMARY KEY using index "sets_pkey";

alter table "public"."unmatched_price_rows" add constraint "unmatched_price_rows_pkey" PRIMARY KEY using index "unmatched_price_rows_pkey";

alter table "public"."vault_items" add constraint "vault_items_pkey" PRIMARY KEY using index "vault_items_pkey";

alter table "public"."waitlist" add constraint "waitlist_pkey" PRIMARY KEY using index "waitlist_pkey";

alter table "public"."wishlist_items" add constraint "wishlist_items_pkey" PRIMARY KEY using index "wishlist_items_pkey";

alter table "public"."ai_decision_logs" add constraint "ai_decision_logs_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE SET NULL not valid;

alter table "public"."ai_decision_logs" validate constraint "ai_decision_logs_card_print_id_fkey";

alter table "public"."alerts" add constraint "alerts_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE not valid;

alter table "public"."alerts" validate constraint "alerts_card_id_fkey";

alter table "public"."alerts" add constraint "alerts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."alerts" validate constraint "alerts_user_id_fkey";

alter table "public"."card_embeddings" add constraint "card_embeddings_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_embeddings" validate constraint "card_embeddings_card_print_id_fkey";

alter table "public"."card_price_observations" add constraint "card_price_observations_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_price_observations" validate constraint "card_price_observations_card_print_id_fkey";

alter table "public"."card_price_observations" add constraint "card_price_observations_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.price_sources(id) not valid;

alter table "public"."card_price_observations" validate constraint "card_price_observations_source_id_fkey";

alter table "public"."card_price_rollups" add constraint "card_price_rollups_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_price_rollups" validate constraint "card_price_rollups_card_print_id_fkey";

alter table "public"."card_price_ticks" add constraint "card_price_ticks_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_price_ticks" validate constraint "card_price_ticks_card_print_id_fkey";

alter table "public"."card_price_ticks" add constraint "card_price_ticks_source_check" CHECK ((source = ANY (ARRAY['tcgplayer'::text, 'cardmarket'::text]))) not valid;

alter table "public"."card_price_ticks" validate constraint "card_price_ticks_source_check";

alter table "public"."card_prices" add constraint "card_prices_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_prices" validate constraint "card_prices_card_print_id_fkey";

alter table "public"."card_prices" add constraint "card_prices_card_print_id_source_key" UNIQUE using index "card_prices_card_print_id_source_key";

alter table "public"."card_prices" add constraint "card_prices_source_check" CHECK ((source = ANY (ARRAY['tcgplayer'::text, 'cardmarket'::text]))) not valid;

alter table "public"."card_prices" validate constraint "card_prices_source_check";

alter table "public"."card_print_traits" add constraint "card_print_traits_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_print_traits" validate constraint "card_print_traits_card_print_id_fkey";

alter table "public"."card_prints" add constraint "card_prints_game_id_fkey" FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE not valid;

alter table "public"."card_prints" validate constraint "card_prints_game_id_fkey";

alter table "public"."card_prints" add constraint "card_prints_game_set_num_key" UNIQUE using index "card_prints_game_set_num_key";

alter table "public"."card_prints" add constraint "card_prints_image_source_check" CHECK ((image_source = ANY (ARRAY['tcgdex'::text, 'ptcg'::text]))) not valid;

alter table "public"."card_prints" validate constraint "card_prints_image_source_check";

alter table "public"."card_prints" add constraint "card_prints_set_id_fkey" FOREIGN KEY (set_id) REFERENCES public.sets(id) ON DELETE SET NULL not valid;

alter table "public"."card_prints" validate constraint "card_prints_set_id_fkey";

alter table "public"."card_prints" add constraint "uq_card_prints_setnum" UNIQUE using index "uq_card_prints_setnum";

alter table "public"."cards" add constraint "cards_set_id_fkey" FOREIGN KEY (set_id) REFERENCES public.sets(id) ON DELETE SET NULL not valid;

alter table "public"."cards" validate constraint "cards_set_id_fkey";

alter table "public"."condition_prices" add constraint "condition_prices_card_id_condition_label_currency_ts_key" UNIQUE using index "condition_prices_card_id_condition_label_currency_ts_key";

alter table "public"."external_mappings" add constraint "external_mappings_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."external_mappings" validate constraint "external_mappings_card_print_id_fkey";

alter table "public"."games" add constraint "games_code_key" UNIQUE using index "games_code_key";

alter table "public"."games" add constraint "games_slug_key" UNIQUE using index "games_slug_key";

alter table "public"."graded_prices" add constraint "graded_prices_card_id_grade_company_grade_value_currency_ts_key" UNIQUE using index "graded_prices_card_id_grade_company_grade_value_currency_ts_key";

alter table "public"."job_logs" add constraint "job_logs_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE not valid;

alter table "public"."job_logs" validate constraint "job_logs_job_id_fkey";

alter table "public"."listing_images" add constraint "listing_images_listing_id_fkey" FOREIGN KEY (listing_id) REFERENCES public.listings(id) NOT VALID not valid;

alter table "public"."listing_images" validate constraint "listing_images_listing_id_fkey";

alter table "public"."listings" add constraint "listings_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) NOT VALID not valid;

alter table "public"."listings" validate constraint "listings_card_print_id_fkey";

alter table "public"."listings" add constraint "listings_owner_id_users_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) NOT VALID not valid;

alter table "public"."listings" validate constraint "listings_owner_id_users_fkey";

alter table "public"."listings" add constraint "listings_vault_item_id_fkey" FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) NOT VALID not valid;

alter table "public"."listings" validate constraint "listings_vault_item_id_fkey";

alter table "public"."market_prices" add constraint "market_prices_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."market_prices" validate constraint "market_prices_card_id_fkey";

alter table "public"."market_prices" add constraint "market_prices_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "public"."market_prices" validate constraint "market_prices_price_check";

alter table "public"."price_observations" add constraint "price_observations_condition_check" CHECK ((condition = ANY (ARRAY['NM'::text, 'LP'::text, 'MP'::text, 'HP'::text, 'DMG'::text]))) not valid;

alter table "public"."price_observations" validate constraint "price_observations_condition_check";

alter table "public"."price_observations" add constraint "price_observations_grade_agency_check" CHECK ((grade_agency = ANY (ARRAY['PSA'::text, 'BGS'::text, 'CGC'::text, 'ACE'::text, 'AGS'::text]))) not valid;

alter table "public"."price_observations" validate constraint "price_observations_grade_agency_check";

alter table "public"."price_observations" add constraint "price_observations_listing_type_check" CHECK ((listing_type = ANY (ARRAY['sold'::text, 'list'::text, 'auction'::text]))) not valid;

alter table "public"."price_observations" validate constraint "price_observations_listing_type_check";

alter table "public"."price_observations" add constraint "price_observations_price_usd_check" CHECK ((price_usd >= (0)::numeric)) not valid;

alter table "public"."price_observations" validate constraint "price_observations_price_usd_check";

alter table "public"."price_observations" add constraint "price_observations_print_id_condition_grade_agency_grade_va_key" UNIQUE using index "price_observations_print_id_condition_grade_agency_grade_va_key";

alter table "public"."price_observations" add constraint "price_observations_print_id_fkey" FOREIGN KEY (print_id) REFERENCES public.card_prints(id) DEFERRABLE INITIALLY DEFERRED not valid;

alter table "public"."price_observations" validate constraint "price_observations_print_id_fkey";

alter table "public"."prices" add constraint "prices_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."prices" validate constraint "prices_card_id_fkey";

alter table "public"."scans" add constraint "scans_vault_item_id_fkey" FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) ON DELETE CASCADE not valid;

alter table "public"."scans" validate constraint "scans_vault_item_id_fkey";

alter table "public"."sets" add constraint "sets_game_code_key" UNIQUE using index "sets_game_code_key";

alter table "public"."vault_items" add constraint "fk_vault_items_card" FOREIGN KEY (card_id) REFERENCES public.card_prints(id) DEFERRABLE INITIALLY DEFERRED not valid;

alter table "public"."vault_items" validate constraint "fk_vault_items_card";

alter table "public"."vault_items" add constraint "uq_user_card" UNIQUE using index "uq_user_card";

alter table "public"."vault_items" add constraint "uq_vault_user_card" UNIQUE using index "uq_vault_user_card";

alter table "public"."vault_items" add constraint "vault_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."vault_items" validate constraint "vault_items_user_id_fkey";

alter table "public"."waitlist" add constraint "waitlist_email_check" CHECK ((POSITION(('@'::text) IN (email)) > 1)) not valid;

alter table "public"."waitlist" validate constraint "waitlist_email_check";

alter table "public"."wishlist_items" add constraint "wishlist_items_card_id_fkey" FOREIGN KEY (card_id) REFERENCES public.card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."wishlist_items" validate constraint "wishlist_items_card_id_fkey";

alter table "public"."wishlist_items" add constraint "wishlist_items_user_id_card_id_key" UNIQUE using index "wishlist_items_user_id_card_id_key";

alter table "public"."wishlist_items" add constraint "wishlist_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."wishlist_items" validate constraint "wishlist_items_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION ingest.merge_card_prints()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'ingest', 'public'
AS $function$
begin
  insert into public.card_prints
    (game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id, external_ids, updated_at)
  select
    g.id,
    s.id,
    r.name,
    r.number,
    coalesce(r.variant_key,''),
    r.rarity,
    r.image_url,
    r.tcgplayer_id,
    r.external_ids,
    now()
  from ingest.card_prints_raw r
  join public.games g
    on g.code = r.game_code
  left join public.sets s
    on s.game = r.game_code and (s.code = r.set_code or r.set_code is null)
  on conflict (game_id, set_id, number, coalesce(variant_key,'')) do update
    set rarity       = excluded.rarity,
        image_url    = coalesce(excluded.image_url, public.card_prints.image_url),
        tcgplayer_id = coalesce(excluded.tcgplayer_id, public.card_prints.tcgplayer_id),
        external_ids = public.card_prints.external_ids || excluded.external_ids,
        updated_at   = now();
end$function$
;

CREATE OR REPLACE FUNCTION public._append_price_tick()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (TG_OP = 'INSERT')
     or (TG_OP = 'UPDATE' and (new.market is distinct from old.market
                               or new.low is distinct from old.low
                               or new.mid is distinct from old.mid
                               or new.high is distinct from old.high)) then
    insert into public.card_price_ticks(card_print_id, source, currency, market, low, mid, high, captured_at)
    values (new.card_print_id, new.source, new.currency, new.market, new.low, new.mid, new.high, now());
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public._wall_refresh_mv()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    BEGIN
      BEGIN
        REFRESH MATERIALIZED VIEW public.wall_thumbs_3x4;
      EXCEPTION WHEN OTHERS THEN
        -- best-effort in local/dev; ignore refresh failures
        NULL;
      END;
      RETURN NULL;
    END
    $function$
;

CREATE OR REPLACE FUNCTION public.auth_uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid
$function$
;

CREATE OR REPLACE FUNCTION public.card_history(_set_code text, _number text, _source text DEFAULT 'tcgplayer'::text, _hours integer DEFAULT 168)
 RETURNS TABLE(ts timestamp with time zone, market numeric)
 LANGUAGE sql
AS $function$
  select date_trunc('hour', t.captured_at) as ts,
         avg(t.market)::numeric as market
  from public.card_price_ticks t
  join public.card_prints p on p.id = t.card_print_id
  where p.set_code = _set_code
    and p.number   = _number
    and t.source   = _source
    and t.captured_at >= now() - (_hours || ' hours')::interval
  group by 1
  order by 1;
$function$
;

create or replace view "public"."card_prints_public" as  SELECT set_code,
    number,
    name,
    rarity,
    image_url
   FROM public.card_prints;


CREATE OR REPLACE FUNCTION public.compute_vault_values(days_window integer DEFAULT 30)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_weights      jsonb;
  v_method       text;
  v_currency     price_currency;
  v_usd_per_eur  numeric := 1.0;
begin
  -- latest config
  select weights, method, currency
    into v_weights, v_method, v_currency
  from price_rollup_config
  order by id desc
  limit 1;

  if v_weights  is null then v_weights  := '{}'::jsonb; end if;
  if v_method   is null then v_method   := 'weighted_average'; end if;
  if v_currency is null then v_currency := 'USD'::price_currency; end if;

  -- FX (optional; default=1 if table empty)
  select usd_per_eur into v_usd_per_eur
  from fx_daily order by d desc limit 1;
  if v_usd_per_eur is null then v_usd_per_eur := 1.0; end if;

  with src as (
    select
      card_print_id,
      source_id,
      case
        when v_currency = 'USD' and currency = 'EUR' then value / v_usd_per_eur
        else value
      end as value_adj
    from card_price_observations
    where observed_at >= now() - make_interval(days => days_window)
      and (
          currency = v_currency
       or (v_currency = 'USD' and currency = 'EUR')  -- include EUR, convert to USD
      )
      and kind in ('sold','floor','median','average','low','high','listing','shop_sale')
  ),
  windowed as (
    select
      card_print_id,
      source_id,
      avg(value_adj) as avg_val,
      count(*)       as n
    from src
    group by card_print_id, source_id
  ),
  weighted as (
    select
      w.card_print_id,
      sum(w.avg_val * coalesce((v_weights->>w.source_id)::numeric, 0)) as vv,
      sum(w.n) as total_n,
      jsonb_object_agg(
        w.source_id,
        jsonb_build_object('count', w.n, 'avg', round(w.avg_val::numeric, 2))
      ) as breakdown
    from windowed w
    group by w.card_print_id
  )
  insert into card_price_rollups as r
    (card_print_id, currency, vault_value, last_computed_at, sample_size, method, source_breakdown)
  select
    card_print_id, v_currency, round(vv::numeric, 2), now(), total_n, v_method, breakdown
  from weighted
  on conflict (card_print_id) do update
    set currency        = excluded.currency,      -- <<< important
        vault_value     = excluded.vault_value,
        last_computed_at= excluded.last_computed_at,
        sample_size     = excluded.sample_size,
        method          = excluded.method,
        source_breakdown= excluded.source_breakdown;
end
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_refresh_latest_card_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.jobs
    where name = 'refresh_latest_card_prices_mv'
      and status in ('queued','running')
  ) then
    insert into public.jobs(name, payload, status, scheduled_at)
    values (
      'refresh_latest_card_prices_mv',
      jsonb_build_object('reason', tg_op),
      'queued',
      now()
    );
  end if;
  return null;
end
$function$
;

CREATE OR REPLACE FUNCTION public.fill_price_obs_print_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.print_id is null then
    select id into new.print_id
    from public.card_prints
    where set_code = new.set_code and number = new.number
    order by id
    limit 1;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.fix_mojibake_common(t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(t, 'ÃƒÂ©', 'Ã©', 'g'),
                              'ÃƒÂ¨', 'Ã¨', 'g'),
                            'ÃƒÂ¡', 'Ã¡', 'g'),
                          'ÃƒÂ±', 'Ã±', 'g'),
                        'Ã¢â‚¬â„¢', 'â€™', 'g')
$function$
;

CREATE OR REPLACE FUNCTION public.fix_mojibake_more(t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(t, 'â€“', '–', 'g'),
                                'â€”', '—', 'g'),
                              'â€œ', '“', 'g'),
                            'â€\x9d', '”', 'g'),
                          'Â', '', 'g'),
           'Ãœ', 'Ü', 'g');
$function$
;

CREATE OR REPLACE FUNCTION public.get_all_prices_for_card(p_card_id uuid)
 RETURNS TABLE(type text, detail text, price numeric, source text, ts timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
with base as (
  select pr.market_price, pr.source, pr.ts
  from public.prices pr
  where pr.card_id = p_card_id and pr.currency = 'USD'
  order by pr.ts desc nulls last
  limit 1
),
conds as (
  select cp.condition_label, cp.market_price, cp.source, cp.ts
  from public.condition_prices cp
  where cp.card_id = p_card_id and cp.currency = 'USD'
),
grades as (
  select gp.grade_company || ' ' || gp.grade_value || ' ' || coalesce(gp.grade_label,'') as detail,
         gp.market_price, gp.source, gp.ts
  from public.graded_prices gp
  where gp.card_id = p_card_id and gp.currency = 'USD'
),
mults as (
  select cm.condition_label, b.market_price * cm.multiplier as derived_price
  from base b cross join public.condition_multipliers cm
)
select 'base', null, b.market_price, b.source, b.ts from base b
union all
select 'condition', c.condition_label, c.market_price, c.source, c.ts from conds c
union all
select 'graded', g.detail, g.market_price, g.source, g.ts from grades g
union all
select 'derived', m.condition_label, m.derived_price, 'multiplier', null from mults m;
$function$
;

CREATE OR REPLACE FUNCTION public.get_market_price(p_card_id uuid)
 RETURNS numeric
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select coalesce(mp.price, 0)
  from public.market_prices mp
  where mp.card_id = p_card_id
  order by mp.fetched_at desc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.gv_norm_name(txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select regexp_replace(lower(unaccent(coalesce(txt,''))), '[^a-z0-9 ]', '', 'g')
$function$
;

CREATE OR REPLACE FUNCTION public.gv_num_int(txt text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select nullif(regexp_replace(coalesce(txt,''), '^\D*?(\d+)(?:\/\d+)?\D*$', '\1'), '')::int
$function$
;

CREATE OR REPLACE FUNCTION public.gv_total_int(txt text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select nullif(regexp_replace(coalesce(txt,''), '^\D*\d+\/(\d+)\D*$', '\1'), '')::int
$function$
;

CREATE OR REPLACE FUNCTION public.job_log(p_job_id uuid, p_level text, p_message text, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.job_logs(job_id, level, message, meta)
  values (p_job_id, coalesce(p_level,'info'), p_message, p_meta);
$function$
;

create or replace view "public"."latest_card_prices_v" as  WITH ranked AS (
         SELECT cp.id,
            cp.card_print_id,
            cp.source,
            cp.currency,
            cp.low,
            cp.mid,
            cp.high,
            cp.market,
            cp.last_updated,
            row_number() OVER (PARTITION BY cp.card_print_id ORDER BY cp.last_updated DESC) AS rn
           FROM public.card_prices cp
        )
 SELECT card_print_id AS card_id,
    low AS price_low,
    mid AS price_mid,
    high AS price_high,
    currency,
    last_updated AS observed_at,
    source,
    NULL::numeric AS confidence,
    NULL::text AS gi_algo_version,
    NULL::text AS condition
   FROM ranked
  WHERE (rn = 1);


create materialized view "public"."latest_prices" as  SELECT DISTINCT ON (print_id, COALESCE(condition, '_'::text), COALESCE(grade_agency, '_'::text), COALESCE(grade_value, '_'::text), source) print_id,
    condition,
    grade_agency,
    grade_value,
    source,
    price_usd,
    observed_at
   FROM public.price_observations po
  ORDER BY print_id, COALESCE(condition, '_'::text), COALESCE(grade_agency, '_'::text), COALESCE(grade_value, '_'::text), source, observed_at DESC;


CREATE OR REPLACE FUNCTION public.list_missing_price_sets()
 RETURNS TABLE(set_code text, missing integer)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  with all_prints as (
    select id as card_print_id, set_code
    from public.card_prints
    where set_code is not null
  ),
  priced as (
    select distinct card_print_id
    from public.v_latest_price_clean
  )
  select p.set_code, count(*)::int as missing
  from all_prints p
  left join priced x on x.card_print_id = p.card_print_id
  where x.card_print_id is null
  group by p.set_code
  order by p.set_code
$function$
;

CREATE OR REPLACE FUNCTION public.list_set_codes()
 RETURNS TABLE(set_code text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct set_code
  from public.card_prints
  where set_code is not null
    and set_code <> 'UNCAT'
  order by set_code
$function$
;

CREATE OR REPLACE FUNCTION public.process_jobs(p_limit integer DEFAULT 25)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_job     public.jobs%rowtype;
  v_handled int := 0;
begin
  loop
    with next as (
      select id
      from public.jobs
      where status = 'queued'
        and scheduled_at <= now()
      order by scheduled_at asc, created_at asc
      limit 1
      for update skip locked
    )
    update public.jobs j
       set status     = 'running',
           started_at = now(),
           attempts   = j.attempts + 1
     where j.id in (select id from next)
     returning j.* into v_job;

    if not found then
      exit;
    end if;

    begin
      perform public.job_log(v_job.id, 'info', 'Starting job', jsonb_build_object('name', v_job.name));

      if v_job.name = 'refresh_latest_card_prices_mv' then
        perform public.refresh_latest_card_prices_mv();
      else
        perform public.job_log(v_job.id, 'warning', 'Unknown job name; marking finished', jsonb_build_object('name', v_job.name));
      end if;

      update public.jobs
         set status = 'finished',
             finished_at = now()
       where id = v_job.id;

      v_handled := v_handled + 1;

    exception when others then
      update public.jobs
         set status = case when attempts < max_attempts then 'queued' else 'failed' end,
             last_error = left(sqlerrm, 1000),
             scheduled_at = now() + interval '1 minute'
       where id = v_job.id;

      perform public.job_log(v_job.id, 'error', 'Job failed', jsonb_build_object('error', sqlerrm));
    end;

    if v_handled >= p_limit then
      exit;
    end if;
  end loop;

  return v_handled;
end
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_latest_card_prices_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    perform 1
    from pg_indexes
    where schemaname='public'
      and tablename='latest_card_prices_mv'
      and indexname='uq_latest_card_prices_mv';

    if found then
      execute 'refresh materialized view concurrently public.latest_card_prices_mv';
    else
      execute 'refresh materialized view public.latest_card_prices_mv';
    end if;
  exception when others then
    -- Last-resort fallback to non-concurrent
    execute 'refresh materialized view public.latest_card_prices_mv';
  end;
end
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_latest_prices()
 RETURNS void
 LANGUAGE sql
AS $function$
  refresh materialized view concurrently public.latest_prices;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_vault_market_prices()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.vault_items vi
  SET market_price   = lp.market_price,
      last_price_update = lp.ts
  FROM public.v_latest_prices lp
  WHERE vi.card_id = lp.card_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_vault_market_prices(p_user uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  update public.vault_items vi
     set market_price     = lp.market_price,
         last_price_update = lp.ts
    from public.v_latest_prices lp
   where lp.card_id = vi.card_id
     and (p_user is null or vi.user_id = p_user);
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_vault_market_prices_all()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.refresh_vault_market_prices(null);
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_wall_thumbs_3x4()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform 1;
  -- Only refresh if the matview exists
  if exists (
    select 1 from pg_matviews
    where schemaname = 'public' and matviewname = 'wall_thumbs_3x4'
  ) then
    refresh materialized view concurrently public.wall_thumbs_3x4;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_refresh_wall()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select (public.refresh_wall_thumbs_3x4(), 'ok')::text;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_set_item_condition(p_vault_item_id uuid, p_condition_label text, p_card_id uuid, p_market_price numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- gate: temporary feature flag
  if not (select allow_client_condition_edits from app_settings limit 1) then
    raise exception 'Condition edits are currently disabled';
  end if;

  -- ownership check (adjust to your auth model if needed)
  -- example assumes vault_items has user_id and auth.uid() is available
  if exists (
    select 1 from public.vault_items vi
    where vi.id = p_vault_item_id
      and (vi.user_id is null or vi.user_id = auth.uid())
  ) then
    perform public.set_vault_item_condition(p_vault_item_id, p_condition_label);
    -- optional: store a condition price if provided
    if p_market_price is not null then
      perform public.upsert_condition_price(p_card_id, p_condition_label, p_market_price, null, 'USD', 'user');
    end if;
  else
    raise exception 'Not allowed';
  end if;
end;
$function$
;
create or replace view "public"."v_card_search" as  SELECT cp.id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.number AS number_raw,
    regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) AS number_digits,
        CASE
            WHEN (regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) <> ''::text) THEN lpad(regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text), 3, '0'::text)
            ELSE NULL::text
        END AS number_padded,
        CASE
            WHEN (cp.number ~ '\\d+\\s*/\\s*\\d+'::text) THEN ((lpad(regexp_replace(cp.number, '^\\D*?(\\d+).*$'::text, '\\1'::text), 3, '0'::text) || '/'::text) || regexp_replace(cp.number, '^.*?/(\\d+).*$'::text, '\\1'::text))
            ELSE NULL::text
        END AS number_slashed,
    COALESCE(cp.rarity, NULL::text) AS rarity,
    COALESCE(cp.image_url, cp.image_alt_url) AS image_url,
    COALESCE(cp.image_url, cp.image_alt_url) AS thumb_url,
    COALESCE(cp.image_url, cp.image_alt_url) AS image_best,
    pr.latest_price_cents,
        CASE
            WHEN (pr.latest_price_cents IS NOT NULL) THEN ((pr.latest_price_cents)::numeric / 100.0)
            ELSE NULL::numeric
        END AS latest_price,
    lower(cp.name) AS name_lc,
    NULL::numeric AS search_rank
   FROM (public.card_prints cp
     LEFT JOIN LATERAL ( SELECT (round((COALESCE(p.price_mid, p.price_high, p.price_low) * (100)::numeric)))::integer AS latest_price_cents
           FROM public.latest_card_prices_v p
          WHERE (p.card_id = cp.id)
          ORDER BY
                CASE
                    WHEN (lower(COALESCE(p.condition, ''::text)) = ANY (ARRAY['nm'::text, 'near mint'::text, 'lp'::text, 'lightly played'::text, 'raw'::text])) THEN 0
                    ELSE 1
                END, p.observed_at DESC NULLS LAST
         LIMIT 1) pr ON (true));

CREATE OR REPLACE FUNCTION public.search_cards(q text, "limit" integer DEFAULT 50, "offset" integer DEFAULT 0)
 RETURNS SETOF public.v_card_search
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT * FROM public.v_card_search
      WHERE (q IS NULL OR q = '' OR name ILIKE '%' || q || '%')
      ORDER BY name
      LIMIT  GREATEST(1, COALESCE("limit", 50))
      OFFSET GREATEST(0, COALESCE("offset", 0)); $function$
;

create or replace view "public"."v_cards_search_v2" as  SELECT id,
    name,
    number,
    set_code,
    rarity,
    NULL::text AS supertype,
    NULL::text[] AS subtypes,
    public.gv_norm_name(name) AS name_norm,
    public.gv_num_int(number) AS number_int,
    public.gv_total_int(number) AS total_int
   FROM public.card_prints cp;


CREATE OR REPLACE FUNCTION public.search_cards_in_set(q text, set_code text, "limit" integer DEFAULT 50)
 RETURNS SETOF public.v_cards_search_v2
 LANGUAGE sql
 STABLE
AS $function$
  with c as (
    select public.gv_num_int(q) as q_num, public.gv_norm_name(q) as q_name_norm
  )
  select v.*
  from public.v_cards_search_v2 v, c
  where v.set_code = set_code
    and (
      (c.q_num is not null and v.number_int = c.q_num)
      or (c.q_name_norm <> '' and v.name_norm % c.q_name_norm)
    )
  limit greatest("limit", 1)
$function$
;
CREATE OR REPLACE FUNCTION public.set_auth_uid()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    begin
      new.updated_at = now();
      return new;
    end;
    $function$
;

CREATE OR REPLACE FUNCTION public.set_vault_item_condition(p_vault_item_id uuid, p_condition_label text)
 RETURNS void
 LANGUAGE sql
AS $function$
UPDATE public.vault_items
SET condition_label = p_condition_label,
    is_graded       = false,
    grade_company   = NULL,
    grade_value     = NULL,
    grade_label     = NULL
WHERE id = p_vault_item_id;
$function$
;

CREATE OR REPLACE FUNCTION public.set_vault_item_grade(p_vault_item_id uuid, p_grade_company text, p_grade_value numeric, p_grade_label text)
 RETURNS void
 LANGUAGE sql
AS $function$
UPDATE public.vault_items
SET is_graded     = true,
    grade_company = p_grade_company,
    grade_value   = p_grade_value,
    grade_label   = p_grade_label
WHERE id = p_vault_item_id;
$function$
;

CREATE OR REPLACE FUNCTION public.squash_ws(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select btrim(regexp_replace($1, '\s+', ' ', 'g'));
$function$
;

CREATE OR REPLACE FUNCTION public.strip_control(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select translate($1,
    chr(0)||chr(1)||chr(2)||chr(3)||chr(4)||chr(5)||chr(6)||chr(7)||
    chr(8)||chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(14)||chr(15)||
    chr(16)||chr(17)||chr(18)||chr(19)||chr(20)||chr(21)||chr(22)||chr(23)||
    chr(24)||chr(25)||chr(26)||chr(27)||chr(28)||chr(29)||chr(30)||chr(31)||
    chr(127),
    repeat(' ', 33)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.top_movers_24h(limit_n integer DEFAULT 25, only_positive boolean DEFAULT false)
 RETURNS TABLE(card_print_id uuid, name text, set_code text, number text, source text, market_now numeric, market_24h numeric, pct_change_24h numeric)
 LANGUAGE sql
AS $function$
  with ranked as (
    select * from public.v_ticker_24h
    where pct_change_24h is not null
      and market_now is not null
  )
  select
    card_print_id, name, set_code, number, source,
    market_now, market_24h, pct_change_24h
  from ranked
  where (not only_positive) or pct_change_24h > 0
  order by abs(pct_change_24h) desc
  limit limit_n
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_condition_price(p_card_id uuid, p_condition_label text, p_market_price numeric, p_last_sold_price numeric DEFAULT NULL::numeric, p_currency text DEFAULT 'USD'::text, p_source text DEFAULT 'manual'::text, p_ts timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE sql
AS $function$
INSERT INTO public.condition_prices (card_id, condition_label, currency, market_price, last_sold_price, source, ts)
VALUES (p_card_id, p_condition_label, p_currency, p_market_price, p_last_sold_price, p_source, p_ts)
ON CONFLICT (card_id, condition_label, currency)
DO UPDATE SET
  market_price    = EXCLUDED.market_price,
  last_sold_price = EXCLUDED.last_sold_price,
  source          = EXCLUDED.source,
  ts              = EXCLUDED.ts;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_graded_price(p_card_id uuid, p_grade_company text, p_grade_value numeric, p_grade_label text, p_market_price numeric, p_last_sold_price numeric DEFAULT NULL::numeric, p_currency text DEFAULT 'USD'::text, p_source text DEFAULT 'manual'::text, p_ts timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE sql
AS $function$
INSERT INTO public.graded_prices (card_id, grade_company, grade_value, grade_label, currency, market_price, last_sold_price, source, ts)
VALUES (p_card_id, p_grade_company, p_grade_value, p_grade_label, p_currency, p_market_price, p_last_sold_price, p_source, p_ts)
ON CONFLICT (card_id, grade_company, grade_value, currency)
DO UPDATE SET
  grade_label     = EXCLUDED.grade_label,
  market_price    = EXCLUDED.market_price,
  last_sold_price = EXCLUDED.last_sold_price,
  source          = EXCLUDED.source,
  ts              = EXCLUDED.ts;
$function$
;

create or replace view "public"."v_best_prices_all" as  WITH base AS (
         SELECT DISTINCT ON (pr.card_id) pr.card_id,
            pr.market_price AS base_market,
            pr.source AS base_source,
            pr.ts AS base_ts
           FROM public.prices pr
          WHERE ((pr.currency = 'USD'::text) AND (pr.market_price IS NOT NULL))
          ORDER BY pr.card_id, pr.ts DESC NULLS LAST
        ), cond AS (
         SELECT DISTINCT ON (cp.card_id, cp.condition_label) cp.card_id,
            cp.condition_label,
            cp.market_price AS cond_market,
            cp.source AS cond_source,
            cp.ts AS cond_ts
           FROM public.condition_prices cp
          WHERE ((cp.currency = 'USD'::text) AND (cp.market_price IS NOT NULL))
          ORDER BY cp.card_id, cp.condition_label, cp.ts DESC NULLS LAST
        ), grad AS (
         SELECT DISTINCT ON (gp.card_id, gp.grade_company, gp.grade_value) gp.card_id,
            gp.grade_company,
            gp.grade_value,
            gp.grade_label,
            gp.market_price AS grad_market,
            gp.source AS grad_source,
            gp.ts AS grad_ts
           FROM public.graded_prices gp
          WHERE ((gp.currency = 'USD'::text) AND (gp.market_price IS NOT NULL))
          ORDER BY gp.card_id, gp.grade_company, gp.grade_value, gp.ts DESC NULLS LAST
        )
 SELECT COALESCE(grad.card_id, cond.card_id, base.card_id) AS card_id,
    base.base_market,
    base.base_source,
    base.base_ts,
    cond.condition_label,
    cond.cond_market,
    cond.cond_source,
    cond.cond_ts,
    grad.grade_company,
    grad.grade_value,
    grad.grade_label,
    grad.grad_market,
    grad.grad_source,
    grad.grad_ts
   FROM ((base
     FULL JOIN cond ON ((cond.card_id = base.card_id)))
     FULL JOIN grad ON ((grad.card_id = COALESCE(base.card_id, cond.card_id))));


create or replace view "public"."v_card_images" as  SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source
   FROM public.card_prints;


create or replace view "public"."v_card_prices_usd" as  SELECT cp.id AS card_print_id,
    cp.set_code,
    cp.number,
    cp.name,
    cp.image_url,
    r.vault_value,
    r.sample_size,
    r.last_computed_at
   FROM (public.card_prints cp
     LEFT JOIN public.card_price_rollups r ON (((r.card_print_id = cp.id) AND (r.currency = 'USD'::public.price_currency))));


create or replace view "public"."v_card_prints" as  SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source AS source,
    updated_at
   FROM public.card_prints cp;


create or replace view "public"."v_card_prints_badges" as  SELECT v.id,
    v.name,
    v.number,
    v.set_code,
    v.source,
    v.image_url,
    v.image_best,
    v.image_alt_url,
    v.updated_at,
    cp.rarity,
    (((NULLIF((cp.variants)::text, 'null'::text))::jsonb ->> 'firstEdition'::text))::boolean AS first_edition,
    (((NULLIF((cp.variants)::text, 'null'::text))::jsonb ->> 'shadowless'::text))::boolean AS shadowless,
    (((NULLIF((cp.variants)::text, 'null'::text))::jsonb ->> 'holo'::text))::boolean AS holo,
    COALESCE((((NULLIF((cp.variants)::text, 'null'::text))::jsonb ->> 'reverse'::text))::boolean, (((NULLIF((cp.variants)::text, 'null'::text))::jsonb ->> 'reverseHolo'::text))::boolean) AS reverse_holo,
    (((NULLIF((cp.variants)::text, 'null'::text))::jsonb ->> 'stamped'::text))::boolean AS stamped,
    (((NULLIF((cp.variants)::text, 'null'::text))::jsonb ->> 'error'::text))::boolean AS error_variant,
    (NULLIF((cp.variants)::text, 'null'::text))::jsonb AS variants
   FROM (public.v_card_prints v
     LEFT JOIN public.card_prints cp ON (((cp.set_code = v.set_code) AND (cp.number = v.number))));


create or replace view "public"."v_latest_price" as  SELECT DISTINCT ON (card_print_id, source) card_print_id,
    source,
    currency,
    market,
    low,
    mid,
    high,
    captured_at
   FROM public.card_price_ticks
  ORDER BY card_print_id, source, captured_at DESC;


create or replace view "public"."v_latest_price_by_card" as  SELECT id,
    card_id,
    ts,
    market_price,
    source,
    set_code,
    number,
    mapped_via,
    rn
   FROM ( SELECT p_1.id,
            p_1.card_id,
            p_1.ts,
            p_1.market_price,
            p_1.source,
            p_1.set_code,
            p_1.number,
            p_1.mapped_via,
            row_number() OVER (PARTITION BY p_1.card_id, p_1.source ORDER BY p_1.ts DESC) AS rn
           FROM public.prices p_1) p
  WHERE (rn = 1);


create or replace view "public"."v_latest_price_clean" as  SELECT card_print_id,
    source,
    currency,
    market,
    mid,
    low,
        CASE
            WHEN ((high IS NOT NULL) AND (mid IS NOT NULL) AND (high > (mid * (50)::numeric))) THEN NULL::numeric
            ELSE high
        END AS high,
    captured_at
   FROM ( SELECT DISTINCT ON (card_price_ticks.card_print_id, card_price_ticks.source) card_price_ticks.card_print_id,
            card_price_ticks.source,
            card_price_ticks.currency,
            card_price_ticks.market,
            card_price_ticks.low,
            card_price_ticks.mid,
            card_price_ticks.high,
            card_price_ticks.captured_at
           FROM public.card_price_ticks
          ORDER BY card_price_ticks.card_print_id, card_price_ticks.source, card_price_ticks.captured_at DESC) l;


create or replace view "public"."v_latest_price_pref" as  SELECT id,
    card_id,
    ts,
    market_price,
    source,
    set_code,
    number,
    mapped_via,
    rn
   FROM ( SELECT p.id,
            p.card_id,
            p.ts,
            p.market_price,
            p.source,
            p.set_code,
            p.number,
            p.mapped_via,
            row_number() OVER (PARTITION BY p.card_id ORDER BY
                CASE
                    WHEN (p.source = 'tcgdex'::text) THEN 1
                    WHEN (p.source = 'tcgplayer'::text) THEN 2
                    ELSE 9
                END, p.ts DESC) AS rn
           FROM public.prices p) q
  WHERE (rn = 1);


create or replace view "public"."v_latest_prices" as  SELECT DISTINCT ON (card_id) card_id,
    market_price,
    source,
    ts
   FROM public.prices
  WHERE (market_price IS NOT NULL)
  ORDER BY card_id, ts DESC;


create or replace view "public"."v_ticker_24h" as  WITH latest AS (
         SELECT DISTINCT ON (t.card_print_id, t.source) t.card_print_id,
            t.source,
            t.market AS market_now,
            t.captured_at AS ts_now
           FROM public.card_price_ticks t
          ORDER BY t.card_print_id, t.source, t.captured_at DESC
        ), prev24 AS (
         SELECT DISTINCT ON (t.card_print_id, t.source) t.card_print_id,
            t.source,
            t.market AS market_24h,
            t.captured_at AS ts_24h
           FROM public.card_price_ticks t
          WHERE (t.captured_at <= (now() - '24:00:00'::interval))
          ORDER BY t.card_print_id, t.source, t.captured_at DESC
        )
 SELECT p.id AS card_print_id,
    p.name,
    p.set_code,
    p.number,
    l.source,
    l.market_now,
    pr.market_24h,
        CASE
            WHEN ((pr.market_24h IS NULL) OR (pr.market_24h = (0)::numeric)) THEN NULL::numeric
            ELSE round((((100)::numeric * (l.market_now - pr.market_24h)) / pr.market_24h), 2)
        END AS pct_change_24h,
    l.ts_now AS last_updated
   FROM ((latest l
     JOIN public.card_prints p ON ((p.id = l.card_print_id)))
     LEFT JOIN prev24 pr ON (((pr.card_print_id = l.card_print_id) AND (pr.source = l.source))));


create or replace view "public"."v_vault_items" as  WITH base AS (
         SELECT vi.id,
            vi.user_id,
            vi.card_id,
            vi.qty,
            vi.acquisition_cost,
            vi.condition_label,
            vi.condition_score,
            vi.is_graded,
            vi.grade_company,
            vi.grade_value,
            vi.notes,
            vi.created_at,
            vi.name,
            vi.set_name,
            vi.photo_url,
            vi.market_price,
            vi.last_price_update,
            COALESCE(img.name, c.name, '(unknown)'::text) AS card_name,
            img.set_code,
            img.number AS img_number,
            c.number AS c_number,
            c.variant,
            c.tcgplayer_id,
            c.game,
            img.image_url,
            img.image_best,
            img.image_alt_url
           FROM ((public.vault_items vi
             LEFT JOIN public.cards c ON ((c.id = vi.card_id)))
             LEFT JOIN public.v_card_images img ON ((img.id = vi.card_id)))
        ), norm AS (
         SELECT base.id,
            base.user_id,
            base.card_id,
            base.qty,
            base.acquisition_cost,
            base.condition_label,
            base.condition_score,
            base.is_graded,
            base.grade_company,
            base.grade_value,
            base.notes,
            base.created_at,
            base.name,
            base.set_name,
            base.photo_url,
            base.market_price,
            base.last_price_update,
            base.card_name,
            base.set_code,
            base.img_number,
            base.c_number,
            base.variant,
            base.tcgplayer_id,
            base.game,
            base.image_url,
            base.image_best,
            base.image_alt_url,
            NULLIF(ltrim(regexp_replace(regexp_replace(COALESCE(base.img_number, base.c_number, ''::text), '/.*$'::text, ''::text), '\D'::text, ''::text, 'g'::text), '0'::text), ''::text) AS card_digits,
            lower(regexp_replace(COALESCE(base.img_number, base.c_number, ''::text), '[^0-9a-z]'::text, ''::text, 'g'::text)) AS card_num_norm
           FROM base
        )
 SELECT n.id,
    n.user_id,
    n.card_id,
    COALESCE(n.qty, 1) AS qty,
    COALESCE(n.qty, 1) AS quantity,
    p.market_price AS market_price_raw,
    NULLIF(p.market_price, (0)::numeric) AS market_price,
    NULLIF(p.market_price, (0)::numeric) AS price,
    ((COALESCE(n.qty, 1))::numeric * p.market_price) AS line_total_raw,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.market_price, (0)::numeric)) AS line_total,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.market_price, (0)::numeric)) AS total,
    p.price_source,
    p.price_ts,
    n.created_at,
    n.card_name AS name,
    COALESCE(n.img_number, n.c_number) AS number,
    n.set_code,
    n.variant,
    n.tcgplayer_id,
    n.game,
    NULL::text AS rarity,
    n.image_url,
    n.image_best,
    n.image_alt_url
   FROM (norm n
     LEFT JOIN LATERAL ( SELECT pr.market_price,
            pr.source AS price_source,
            pr.ts AS price_ts
           FROM public.prices pr
          WHERE ((lower(pr.set_code) = lower(n.set_code)) AND ((NULLIF(ltrim(regexp_replace(pr.number, '\D'::text, ''::text, 'g'::text), '0'::text), ''::text) = n.card_digits) OR (lower(regexp_replace(pr.number, '[^0-9a-z]'::text, ''::text, 'g'::text)) = n.card_num_norm)) AND (pr.currency = 'USD'::text) AND (pr.market_price IS NOT NULL))
          ORDER BY pr.ts DESC NULLS LAST
         LIMIT 1) p ON (true));


create or replace view "public"."v_vault_items_ext" as  SELECT vvi.id,
    vvi.user_id,
    vvi.card_id,
    vvi.qty,
    vvi.quantity,
    vvi.market_price_raw,
    vvi.market_price,
    vvi.price,
    vvi.line_total_raw,
    vvi.line_total,
    vvi.total,
    vvi.price_source,
    vvi.price_ts,
    vvi.created_at,
    vvi.name,
    vvi.number,
    vvi.set_code,
    vvi.variant,
    vvi.tcgplayer_id,
    vvi.game,
    vvi.rarity,
    vvi.image_url,
    vvi.image_best,
    vvi.image_alt_url,
    vi.id AS vault_item_id,
    vi.condition_label,
    vi.is_graded,
    vi.grade_company,
    vi.grade_value,
    vi.grade_label,
        CASE
            WHEN (vi.is_graded AND (bp.grad_market IS NOT NULL)) THEN bp.grad_market
            WHEN (bp.cond_market IS NOT NULL) THEN bp.cond_market
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN (vvi.price * cm.multiplier)
            ELSE vvi.price
        END AS effective_price,
        CASE
            WHEN (vi.is_graded AND (bp.grad_market IS NOT NULL)) THEN 'graded'::text
            WHEN (bp.cond_market IS NOT NULL) THEN 'condition'::text
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN 'derived'::text
            ELSE 'base'::text
        END AS effective_mode,
        CASE
            WHEN (vi.is_graded AND (bp.grad_market IS NOT NULL)) THEN 'graded.market'::text
            WHEN (bp.cond_market IS NOT NULL) THEN 'condition.market'::text
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN 'multiplier'::text
            ELSE 'base'::text
        END AS effective_source
   FROM (((public.v_vault_items vvi
     JOIN public.vault_items vi ON ((vi.id = vvi.id)))
     LEFT JOIN public.v_best_prices_all bp ON ((bp.card_id = vvi.card_id)))
     LEFT JOIN public.condition_multipliers cm ON ((cm.condition_label = vi.condition_label)));


create or replace view "public"."v_wishlist_items" as  SELECT wi.id,
    wi.user_id,
    wi.card_id,
    c.name,
    c.set_code AS set_name,
    c.number,
    COALESCE(lp.market_price, (0)::numeric) AS market_price,
    c.image_url,
    wi.created_at
   FROM ((public.wishlist_items wi
     LEFT JOIN public.card_prints c ON ((c.id = wi.card_id)))
     LEFT JOIN public.v_latest_price_pref lp ON ((lp.card_id = wi.card_id)));


create or replace view "public"."v_wishlist_value_by_user" as  WITH picked AS (
         SELECT wi.user_id,
            ( SELECT l.market
                   FROM public.v_latest_price_clean l
                  WHERE (l.card_print_id = wi.card_id)
                  ORDER BY
                        CASE l.source
                            WHEN 'tcgplayer'::text THEN 1
                            ELSE 2
                        END, l.captured_at DESC
                 LIMIT 1) AS market,
            ( SELECT l.captured_at
                   FROM public.v_latest_price_clean l
                  WHERE (l.card_print_id = wi.card_id)
                  ORDER BY
                        CASE l.source
                            WHEN 'tcgplayer'::text THEN 1
                            ELSE 2
                        END, l.captured_at DESC
                 LIMIT 1) AS ts
           FROM public.wishlist_items wi
        )
 SELECT user_id,
    (count(*))::integer AS items,
    COALESCE(sum(market), (0)::numeric) AS wishlist_value,
    max(ts) AS last_updated
   FROM picked
  GROUP BY user_id;


CREATE OR REPLACE FUNCTION public.vault_add_item(p_user_id uuid, p_card_id uuid, p_condition_label text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare v_id uuid;
begin
  insert into public.vault_items(user_id, card_id, condition_label)
  values (p_user_id, p_card_id, p_condition_label)
  returning id into v_id;
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.vault_add_or_increment(p_card_id uuid, p_delta_qty integer, p_condition_label text DEFAULT 'NM'::text, p_notes text DEFAULT NULL::text)
 RETURNS SETOF public.vault_items
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.vault_items (user_id, card_id, qty, condition_label, notes)
  values (auth.uid(), p_card_id, greatest(1, p_delta_qty), p_condition_label, nullif(p_notes, ''))
  on conflict (user_id, card_id)
  do update set
    qty = public.vault_items.qty + greatest(1, p_delta_qty),
    condition_label = coalesce(excluded.condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(excluded.notes, ''), public.vault_items.notes)
  returning *;
$function$
;

CREATE OR REPLACE FUNCTION public.vault_inc_qty(item_id uuid, inc integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.vault_items
  SET qty = qty + inc
  WHERE id = item_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.vault_post_to_wall(vault_item_id uuid, price_cents integer, quantity integer, condition text DEFAULT NULL::text, note text DEFAULT NULL::text, use_vault_image boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_uid uuid;
  v_cp uuid;
  v_cond text;
  v_img text;
  v_qty integer;
  v_price integer;
  v_listing uuid;
begin
  v_uid := public.auth_uid();
  if v_uid is null then
    raise exception 'auth required' using errcode = '28000';
  end if;
  if quantity is null or quantity <= 0 then
    raise exception 'quantity must be > 0' using errcode = '22023';
  end if;
  if price_cents is null or price_cents < 0 then
    raise exception 'price_cents must be >= 0' using errcode = '22023';
  end if;

  -- Validate vault ownership and resolve defaults
  select vi.card_print_id,
         coalesce(condition, vi.condition_tier) as cond_effective,
         case when use_vault_image then vi.image_url else null end as img_effective
    into v_cp, v_cond, v_img
  from public.vault_items vi
  where vi.id = vault_item_id and vi.owner_id = v_uid;

  if v_cp is null then
    raise exception 'vault_item not found or not owned' using errcode = '42501';
  end if;

  v_qty := quantity;
  v_price := price_cents;

  insert into public.listings (
    owner_id, card_print_id, vault_item_id, condition_tier, quantity, price_cents, note,
    visibility, status, image_url
  ) values (
    v_uid, v_cp, vault_item_id, v_cond, v_qty, v_price, note,
    'public', 'active', v_img
  ) returning id into v_listing;

  return v_listing;
end;
$function$
;

create materialized view "public"."wall_thumbs_3x4" as  WITH primary_img AS (
         SELECT li.id AS listing_id,
            COALESCE(li.primary_image_url, max(
                CASE
                    WHEN (li2.sort_order = 0) THEN li2.thumb_3x4_url
                    ELSE NULL::text
                END)) AS thumb_url
           FROM (public.listings li
             LEFT JOIN public.listing_images li2 ON ((li2.listing_id = li.id)))
          GROUP BY li.id, li.primary_image_url
        )
 SELECT l.id,
    l.owner_id,
    l.card_print_id AS card_id,
    l.title,
    l.price_cents,
    l.currency,
    l.condition,
    l.status,
    l.created_at,
    pi.thumb_url
   FROM (public.listings l
     LEFT JOIN primary_img pi ON ((pi.listing_id = l.id)))
  WHERE ((l.visibility = 'public'::text) AND (l.status = 'active'::text));


CREATE OR REPLACE FUNCTION public.wishlist_totals()
 RETURNS TABLE(items integer, wishlist_value numeric, last_updated timestamp with time zone)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  with picked as (
    select
      wi.user_id,
      l.market,
      l.captured_at as ts
    from public.wishlist_items wi
    left join lateral (
      select *
      from public.v_latest_price_clean l
      where l.card_print_id = wi.card_id
      order by case l.source when 'tcgplayer' then 1 else 2 end,
               l.captured_at desc
      limit 1
    ) l on true
    where wi.user_id = auth.uid()
  )
  select
    count(*)::int                       as items,
    coalesce(sum(market), 0)::numeric   as wishlist_value,
    max(ts)                             as last_updated
  from picked;
$function$
;

CREATE OR REPLACE FUNCTION public.wishlist_totals_for(p_user uuid)
 RETURNS TABLE(items integer, wishlist_value numeric, last_updated timestamp with time zone)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  with picked as (
    select
      wi.user_id,
      l.market,
      l.captured_at as ts
    from public.wishlist_items wi
    left join lateral (
      select *
      from public.v_latest_price_clean l
      where l.card_print_id = wi.card_id
      order by case l.source when 'tcgplayer' then 1 else 2 end,
               l.captured_at desc
      limit 1
    ) l on true
    where wi.user_id = p_user
  )
  select
    count(*)::int,
    coalesce(sum(market), 0)::numeric,
    max(ts)
  from picked;
$function$
;

create or replace view "public"."card_prints_clean" as  SELECT id,
    game_id,
    set_id,
    name,
    number,
    variant_key,
    rarity,
    image_url,
    tcgplayer_id,
    external_ids,
    updated_at,
    set_code,
    number_plain,
    artist,
    regulation_mark,
    image_alt_url,
    image_source,
    variants,
    public.squash_ws(public.strip_control(public.fix_mojibake_more(public.fix_mojibake_common(name)))) AS name_display,
    public.unaccent(public.squash_ws(public.strip_control(public.fix_mojibake_more(public.fix_mojibake_common(name))))) AS name_search
   FROM public.card_prints cp;


create materialized view "public"."latest_card_prices_mv" as  SELECT card_id,
    NULL::text AS condition_label,
    price_low,
    price_mid,
    price_high,
    currency,
    observed_at,
    source,
    confidence,
    gi_algo_version
   FROM public.latest_card_prices_v;


create or replace view "public"."v_recently_added" as  SELECT id,
    user_id,
    card_id,
    qty,
    quantity,
    market_price_raw,
    market_price,
    price,
    line_total_raw,
    line_total,
    total,
    price_source,
    price_ts,
    created_at,
    name,
    number,
    set_code,
    variant,
    tcgplayer_id,
    game,
    rarity,
    image_url,
    image_best,
    image_alt_url
   FROM public.v_vault_items
  ORDER BY created_at DESC
 LIMIT 100;


create or replace view "public"."wall_feed_view" as  SELECT id AS listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM public.wall_thumbs_3x4 w
  ORDER BY created_at DESC;


create or replace view "public"."v_wall_feed" as  SELECT listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM public.wall_feed_view;


create or replace view "public"."wall_feed_v" as  SELECT listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM public.wall_feed_view;


CREATE INDEX idx_latest_prices_print ON public.latest_prices USING btree (print_id);

CREATE INDEX idx_wall_thumbs_created_at ON public.wall_thumbs_3x4 USING btree (created_at);

CREATE UNIQUE INDEX uq_latest_card_prices_mv ON public.latest_card_prices_mv USING btree (card_id, COALESCE(condition_label, ''::text));

grant delete on table "public"."_import_card_prints" to "anon";

grant insert on table "public"."_import_card_prints" to "anon";

grant references on table "public"."_import_card_prints" to "anon";

grant select on table "public"."_import_card_prints" to "anon";

grant trigger on table "public"."_import_card_prints" to "anon";

grant truncate on table "public"."_import_card_prints" to "anon";

grant update on table "public"."_import_card_prints" to "anon";

grant delete on table "public"."_import_card_prints" to "authenticated";

grant insert on table "public"."_import_card_prints" to "authenticated";

grant references on table "public"."_import_card_prints" to "authenticated";

grant select on table "public"."_import_card_prints" to "authenticated";

grant trigger on table "public"."_import_card_prints" to "authenticated";

grant truncate on table "public"."_import_card_prints" to "authenticated";

grant update on table "public"."_import_card_prints" to "authenticated";

grant delete on table "public"."_import_card_prints" to "service_role";

grant insert on table "public"."_import_card_prints" to "service_role";

grant references on table "public"."_import_card_prints" to "service_role";

grant select on table "public"."_import_card_prints" to "service_role";

grant trigger on table "public"."_import_card_prints" to "service_role";

grant truncate on table "public"."_import_card_prints" to "service_role";

grant update on table "public"."_import_card_prints" to "service_role";

grant delete on table "public"."_import_sets" to "anon";

grant insert on table "public"."_import_sets" to "anon";

grant references on table "public"."_import_sets" to "anon";

grant select on table "public"."_import_sets" to "anon";

grant trigger on table "public"."_import_sets" to "anon";

grant truncate on table "public"."_import_sets" to "anon";

grant update on table "public"."_import_sets" to "anon";

grant delete on table "public"."_import_sets" to "authenticated";

grant insert on table "public"."_import_sets" to "authenticated";

grant references on table "public"."_import_sets" to "authenticated";

grant select on table "public"."_import_sets" to "authenticated";

grant trigger on table "public"."_import_sets" to "authenticated";

grant truncate on table "public"."_import_sets" to "authenticated";

grant update on table "public"."_import_sets" to "authenticated";

grant delete on table "public"."_import_sets" to "service_role";

grant insert on table "public"."_import_sets" to "service_role";

grant references on table "public"."_import_sets" to "service_role";

grant select on table "public"."_import_sets" to "service_role";

grant trigger on table "public"."_import_sets" to "service_role";

grant truncate on table "public"."_import_sets" to "service_role";

grant update on table "public"."_import_sets" to "service_role";

grant delete on table "public"."alerts" to "anon";

grant insert on table "public"."alerts" to "anon";

grant references on table "public"."alerts" to "anon";

grant select on table "public"."alerts" to "anon";

grant trigger on table "public"."alerts" to "anon";

grant truncate on table "public"."alerts" to "anon";

grant update on table "public"."alerts" to "anon";

grant delete on table "public"."alerts" to "authenticated";

grant insert on table "public"."alerts" to "authenticated";

grant references on table "public"."alerts" to "authenticated";

grant select on table "public"."alerts" to "authenticated";

grant trigger on table "public"."alerts" to "authenticated";

grant truncate on table "public"."alerts" to "authenticated";

grant update on table "public"."alerts" to "authenticated";

grant delete on table "public"."alerts" to "service_role";

grant insert on table "public"."alerts" to "service_role";

grant references on table "public"."alerts" to "service_role";

grant select on table "public"."alerts" to "service_role";

grant trigger on table "public"."alerts" to "service_role";

grant truncate on table "public"."alerts" to "service_role";

grant update on table "public"."alerts" to "service_role";

grant delete on table "public"."app_settings" to "anon";

grant insert on table "public"."app_settings" to "anon";

grant references on table "public"."app_settings" to "anon";

grant select on table "public"."app_settings" to "anon";

grant trigger on table "public"."app_settings" to "anon";

grant truncate on table "public"."app_settings" to "anon";

grant update on table "public"."app_settings" to "anon";

grant delete on table "public"."app_settings" to "authenticated";

grant insert on table "public"."app_settings" to "authenticated";

grant references on table "public"."app_settings" to "authenticated";

grant select on table "public"."app_settings" to "authenticated";

grant trigger on table "public"."app_settings" to "authenticated";

grant truncate on table "public"."app_settings" to "authenticated";

grant update on table "public"."app_settings" to "authenticated";

grant delete on table "public"."app_settings" to "service_role";

grant insert on table "public"."app_settings" to "service_role";

grant references on table "public"."app_settings" to "service_role";

grant select on table "public"."app_settings" to "service_role";

grant trigger on table "public"."app_settings" to "service_role";

grant truncate on table "public"."app_settings" to "service_role";

grant update on table "public"."app_settings" to "service_role";

grant delete on table "public"."backup_card_prints_null_utc" to "anon";

grant insert on table "public"."backup_card_prints_null_utc" to "anon";

grant references on table "public"."backup_card_prints_null_utc" to "anon";

grant select on table "public"."backup_card_prints_null_utc" to "anon";

grant trigger on table "public"."backup_card_prints_null_utc" to "anon";

grant truncate on table "public"."backup_card_prints_null_utc" to "anon";

grant update on table "public"."backup_card_prints_null_utc" to "anon";

grant delete on table "public"."backup_card_prints_null_utc" to "authenticated";

grant insert on table "public"."backup_card_prints_null_utc" to "authenticated";

grant references on table "public"."backup_card_prints_null_utc" to "authenticated";

grant select on table "public"."backup_card_prints_null_utc" to "authenticated";

grant trigger on table "public"."backup_card_prints_null_utc" to "authenticated";

grant truncate on table "public"."backup_card_prints_null_utc" to "authenticated";

grant update on table "public"."backup_card_prints_null_utc" to "authenticated";

grant delete on table "public"."backup_card_prints_null_utc" to "service_role";

grant insert on table "public"."backup_card_prints_null_utc" to "service_role";

grant references on table "public"."backup_card_prints_null_utc" to "service_role";

grant select on table "public"."backup_card_prints_null_utc" to "service_role";

grant trigger on table "public"."backup_card_prints_null_utc" to "service_role";

grant truncate on table "public"."backup_card_prints_null_utc" to "service_role";

grant update on table "public"."backup_card_prints_null_utc" to "service_role";

grant delete on table "public"."card_catalog" to "anon";

grant insert on table "public"."card_catalog" to "anon";

grant references on table "public"."card_catalog" to "anon";

grant select on table "public"."card_catalog" to "anon";

grant trigger on table "public"."card_catalog" to "anon";

grant truncate on table "public"."card_catalog" to "anon";

grant update on table "public"."card_catalog" to "anon";

grant delete on table "public"."card_catalog" to "authenticated";

grant insert on table "public"."card_catalog" to "authenticated";

grant references on table "public"."card_catalog" to "authenticated";

grant select on table "public"."card_catalog" to "authenticated";

grant trigger on table "public"."card_catalog" to "authenticated";

grant truncate on table "public"."card_catalog" to "authenticated";

grant update on table "public"."card_catalog" to "authenticated";

grant delete on table "public"."card_catalog" to "service_role";

grant insert on table "public"."card_catalog" to "service_role";

grant references on table "public"."card_catalog" to "service_role";

grant select on table "public"."card_catalog" to "service_role";

grant trigger on table "public"."card_catalog" to "service_role";

grant truncate on table "public"."card_catalog" to "service_role";

grant update on table "public"."card_catalog" to "service_role";

grant delete on table "public"."card_price_observations" to "anon";

grant insert on table "public"."card_price_observations" to "anon";

grant references on table "public"."card_price_observations" to "anon";

grant select on table "public"."card_price_observations" to "anon";

grant trigger on table "public"."card_price_observations" to "anon";

grant truncate on table "public"."card_price_observations" to "anon";

grant update on table "public"."card_price_observations" to "anon";

grant delete on table "public"."card_price_observations" to "authenticated";

grant insert on table "public"."card_price_observations" to "authenticated";

grant references on table "public"."card_price_observations" to "authenticated";

grant select on table "public"."card_price_observations" to "authenticated";

grant trigger on table "public"."card_price_observations" to "authenticated";

grant truncate on table "public"."card_price_observations" to "authenticated";

grant update on table "public"."card_price_observations" to "authenticated";

grant delete on table "public"."card_price_observations" to "service_role";

grant insert on table "public"."card_price_observations" to "service_role";

grant references on table "public"."card_price_observations" to "service_role";

grant select on table "public"."card_price_observations" to "service_role";

grant trigger on table "public"."card_price_observations" to "service_role";

grant truncate on table "public"."card_price_observations" to "service_role";

grant update on table "public"."card_price_observations" to "service_role";

grant delete on table "public"."card_price_rollups" to "anon";

grant insert on table "public"."card_price_rollups" to "anon";

grant references on table "public"."card_price_rollups" to "anon";

grant select on table "public"."card_price_rollups" to "anon";

grant trigger on table "public"."card_price_rollups" to "anon";

grant truncate on table "public"."card_price_rollups" to "anon";

grant update on table "public"."card_price_rollups" to "anon";

grant delete on table "public"."card_price_rollups" to "authenticated";

grant insert on table "public"."card_price_rollups" to "authenticated";

grant references on table "public"."card_price_rollups" to "authenticated";

grant select on table "public"."card_price_rollups" to "authenticated";

grant trigger on table "public"."card_price_rollups" to "authenticated";

grant truncate on table "public"."card_price_rollups" to "authenticated";

grant update on table "public"."card_price_rollups" to "authenticated";

grant delete on table "public"."card_price_rollups" to "service_role";

grant insert on table "public"."card_price_rollups" to "service_role";

grant references on table "public"."card_price_rollups" to "service_role";

grant select on table "public"."card_price_rollups" to "service_role";

grant trigger on table "public"."card_price_rollups" to "service_role";

grant truncate on table "public"."card_price_rollups" to "service_role";

grant update on table "public"."card_price_rollups" to "service_role";

grant delete on table "public"."card_price_ticks" to "anon";

grant insert on table "public"."card_price_ticks" to "anon";

grant references on table "public"."card_price_ticks" to "anon";

grant select on table "public"."card_price_ticks" to "anon";

grant trigger on table "public"."card_price_ticks" to "anon";

grant truncate on table "public"."card_price_ticks" to "anon";

grant update on table "public"."card_price_ticks" to "anon";

grant delete on table "public"."card_price_ticks" to "authenticated";

grant insert on table "public"."card_price_ticks" to "authenticated";

grant references on table "public"."card_price_ticks" to "authenticated";

grant select on table "public"."card_price_ticks" to "authenticated";

grant trigger on table "public"."card_price_ticks" to "authenticated";

grant truncate on table "public"."card_price_ticks" to "authenticated";

grant update on table "public"."card_price_ticks" to "authenticated";

grant delete on table "public"."card_price_ticks" to "service_role";

grant insert on table "public"."card_price_ticks" to "service_role";

grant references on table "public"."card_price_ticks" to "service_role";

grant select on table "public"."card_price_ticks" to "service_role";

grant trigger on table "public"."card_price_ticks" to "service_role";

grant truncate on table "public"."card_price_ticks" to "service_role";

grant update on table "public"."card_price_ticks" to "service_role";

grant delete on table "public"."card_prices" to "anon";

grant insert on table "public"."card_prices" to "anon";

grant references on table "public"."card_prices" to "anon";

grant select on table "public"."card_prices" to "anon";

grant trigger on table "public"."card_prices" to "anon";

grant truncate on table "public"."card_prices" to "anon";

grant update on table "public"."card_prices" to "anon";

grant delete on table "public"."card_prices" to "authenticated";

grant insert on table "public"."card_prices" to "authenticated";

grant references on table "public"."card_prices" to "authenticated";

grant select on table "public"."card_prices" to "authenticated";

grant trigger on table "public"."card_prices" to "authenticated";

grant truncate on table "public"."card_prices" to "authenticated";

grant update on table "public"."card_prices" to "authenticated";

grant delete on table "public"."card_prices" to "service_role";

grant insert on table "public"."card_prices" to "service_role";

grant references on table "public"."card_prices" to "service_role";

grant select on table "public"."card_prices" to "service_role";

grant trigger on table "public"."card_prices" to "service_role";

grant truncate on table "public"."card_prices" to "service_role";

grant update on table "public"."card_prices" to "service_role";

grant delete on table "public"."card_prints" to "anon";

grant insert on table "public"."card_prints" to "anon";

grant references on table "public"."card_prints" to "anon";

grant select on table "public"."card_prints" to "anon";

grant trigger on table "public"."card_prints" to "anon";

grant truncate on table "public"."card_prints" to "anon";

grant update on table "public"."card_prints" to "anon";

grant delete on table "public"."card_prints" to "authenticated";

grant insert on table "public"."card_prints" to "authenticated";

grant references on table "public"."card_prints" to "authenticated";

grant select on table "public"."card_prints" to "authenticated";

grant trigger on table "public"."card_prints" to "authenticated";

grant truncate on table "public"."card_prints" to "authenticated";

grant update on table "public"."card_prints" to "authenticated";

grant delete on table "public"."card_prints" to "service_role";

grant insert on table "public"."card_prints" to "service_role";

grant references on table "public"."card_prints" to "service_role";

grant select on table "public"."card_prints" to "service_role";

grant trigger on table "public"."card_prints" to "service_role";

grant truncate on table "public"."card_prints" to "service_role";

grant update on table "public"."card_prints" to "service_role";

grant delete on table "public"."card_prints_backup_20251115" to "anon";

grant insert on table "public"."card_prints_backup_20251115" to "anon";

grant references on table "public"."card_prints_backup_20251115" to "anon";

grant select on table "public"."card_prints_backup_20251115" to "anon";

grant trigger on table "public"."card_prints_backup_20251115" to "anon";

grant truncate on table "public"."card_prints_backup_20251115" to "anon";

grant update on table "public"."card_prints_backup_20251115" to "anon";

grant delete on table "public"."card_prints_backup_20251115" to "authenticated";

grant insert on table "public"."card_prints_backup_20251115" to "authenticated";

grant references on table "public"."card_prints_backup_20251115" to "authenticated";

grant select on table "public"."card_prints_backup_20251115" to "authenticated";

grant trigger on table "public"."card_prints_backup_20251115" to "authenticated";

grant truncate on table "public"."card_prints_backup_20251115" to "authenticated";

grant update on table "public"."card_prints_backup_20251115" to "authenticated";

grant delete on table "public"."card_prints_backup_20251115" to "service_role";

grant insert on table "public"."card_prints_backup_20251115" to "service_role";

grant references on table "public"."card_prints_backup_20251115" to "service_role";

grant select on table "public"."card_prints_backup_20251115" to "service_role";

grant trigger on table "public"."card_prints_backup_20251115" to "service_role";

grant truncate on table "public"."card_prints_backup_20251115" to "service_role";

grant update on table "public"."card_prints_backup_20251115" to "service_role";

grant delete on table "public"."cards" to "anon";

grant insert on table "public"."cards" to "anon";

grant references on table "public"."cards" to "anon";

grant select on table "public"."cards" to "anon";

grant trigger on table "public"."cards" to "anon";

grant truncate on table "public"."cards" to "anon";

grant update on table "public"."cards" to "anon";

grant delete on table "public"."cards" to "authenticated";

grant insert on table "public"."cards" to "authenticated";

grant references on table "public"."cards" to "authenticated";

grant select on table "public"."cards" to "authenticated";

grant trigger on table "public"."cards" to "authenticated";

grant truncate on table "public"."cards" to "authenticated";

grant update on table "public"."cards" to "authenticated";

grant delete on table "public"."cards" to "service_role";

grant insert on table "public"."cards" to "service_role";

grant references on table "public"."cards" to "service_role";

grant select on table "public"."cards" to "service_role";

grant trigger on table "public"."cards" to "service_role";

grant truncate on table "public"."cards" to "service_role";

grant update on table "public"."cards" to "service_role";

grant delete on table "public"."condition_multipliers" to "anon";

grant insert on table "public"."condition_multipliers" to "anon";

grant references on table "public"."condition_multipliers" to "anon";

grant select on table "public"."condition_multipliers" to "anon";

grant trigger on table "public"."condition_multipliers" to "anon";

grant truncate on table "public"."condition_multipliers" to "anon";

grant update on table "public"."condition_multipliers" to "anon";

grant delete on table "public"."condition_multipliers" to "authenticated";

grant insert on table "public"."condition_multipliers" to "authenticated";

grant references on table "public"."condition_multipliers" to "authenticated";

grant select on table "public"."condition_multipliers" to "authenticated";

grant trigger on table "public"."condition_multipliers" to "authenticated";

grant truncate on table "public"."condition_multipliers" to "authenticated";

grant update on table "public"."condition_multipliers" to "authenticated";

grant delete on table "public"."condition_multipliers" to "service_role";

grant insert on table "public"."condition_multipliers" to "service_role";

grant references on table "public"."condition_multipliers" to "service_role";

grant select on table "public"."condition_multipliers" to "service_role";

grant trigger on table "public"."condition_multipliers" to "service_role";

grant truncate on table "public"."condition_multipliers" to "service_role";

grant update on table "public"."condition_multipliers" to "service_role";

grant delete on table "public"."condition_prices" to "anon";

grant insert on table "public"."condition_prices" to "anon";

grant references on table "public"."condition_prices" to "anon";

grant select on table "public"."condition_prices" to "anon";

grant trigger on table "public"."condition_prices" to "anon";

grant truncate on table "public"."condition_prices" to "anon";

grant update on table "public"."condition_prices" to "anon";

grant delete on table "public"."condition_prices" to "authenticated";

grant insert on table "public"."condition_prices" to "authenticated";

grant references on table "public"."condition_prices" to "authenticated";

grant select on table "public"."condition_prices" to "authenticated";

grant trigger on table "public"."condition_prices" to "authenticated";

grant truncate on table "public"."condition_prices" to "authenticated";

grant update on table "public"."condition_prices" to "authenticated";

grant delete on table "public"."condition_prices" to "service_role";

grant insert on table "public"."condition_prices" to "service_role";

grant references on table "public"."condition_prices" to "service_role";

grant select on table "public"."condition_prices" to "service_role";

grant trigger on table "public"."condition_prices" to "service_role";

grant truncate on table "public"."condition_prices" to "service_role";

grant update on table "public"."condition_prices" to "service_role";

grant delete on table "public"."dev_audit" to "anon";

grant insert on table "public"."dev_audit" to "anon";

grant references on table "public"."dev_audit" to "anon";

grant select on table "public"."dev_audit" to "anon";

grant trigger on table "public"."dev_audit" to "anon";

grant truncate on table "public"."dev_audit" to "anon";

grant update on table "public"."dev_audit" to "anon";

grant delete on table "public"."dev_audit" to "authenticated";

grant insert on table "public"."dev_audit" to "authenticated";

grant references on table "public"."dev_audit" to "authenticated";

grant select on table "public"."dev_audit" to "authenticated";

grant trigger on table "public"."dev_audit" to "authenticated";

grant truncate on table "public"."dev_audit" to "authenticated";

grant update on table "public"."dev_audit" to "authenticated";

grant delete on table "public"."dev_audit" to "service_role";

grant insert on table "public"."dev_audit" to "service_role";

grant references on table "public"."dev_audit" to "service_role";

grant select on table "public"."dev_audit" to "service_role";

grant trigger on table "public"."dev_audit" to "service_role";

grant truncate on table "public"."dev_audit" to "service_role";

grant update on table "public"."dev_audit" to "service_role";

grant delete on table "public"."external_cache" to "anon";

grant insert on table "public"."external_cache" to "anon";

grant references on table "public"."external_cache" to "anon";

grant select on table "public"."external_cache" to "anon";

grant trigger on table "public"."external_cache" to "anon";

grant truncate on table "public"."external_cache" to "anon";

grant update on table "public"."external_cache" to "anon";

grant delete on table "public"."external_cache" to "authenticated";

grant insert on table "public"."external_cache" to "authenticated";

grant references on table "public"."external_cache" to "authenticated";

grant select on table "public"."external_cache" to "authenticated";

grant trigger on table "public"."external_cache" to "authenticated";

grant truncate on table "public"."external_cache" to "authenticated";

grant update on table "public"."external_cache" to "authenticated";

grant delete on table "public"."external_cache" to "service_role";

grant insert on table "public"."external_cache" to "service_role";

grant references on table "public"."external_cache" to "service_role";

grant select on table "public"."external_cache" to "service_role";

grant trigger on table "public"."external_cache" to "service_role";

grant truncate on table "public"."external_cache" to "service_role";

grant update on table "public"."external_cache" to "service_role";

grant delete on table "public"."external_provider_stats" to "anon";

grant insert on table "public"."external_provider_stats" to "anon";

grant references on table "public"."external_provider_stats" to "anon";

grant select on table "public"."external_provider_stats" to "anon";

grant trigger on table "public"."external_provider_stats" to "anon";

grant truncate on table "public"."external_provider_stats" to "anon";

grant update on table "public"."external_provider_stats" to "anon";

grant delete on table "public"."external_provider_stats" to "authenticated";

grant insert on table "public"."external_provider_stats" to "authenticated";

grant references on table "public"."external_provider_stats" to "authenticated";

grant select on table "public"."external_provider_stats" to "authenticated";

grant trigger on table "public"."external_provider_stats" to "authenticated";

grant truncate on table "public"."external_provider_stats" to "authenticated";

grant update on table "public"."external_provider_stats" to "authenticated";

grant delete on table "public"."external_provider_stats" to "service_role";

grant insert on table "public"."external_provider_stats" to "service_role";

grant references on table "public"."external_provider_stats" to "service_role";

grant select on table "public"."external_provider_stats" to "service_role";

grant trigger on table "public"."external_provider_stats" to "service_role";

grant truncate on table "public"."external_provider_stats" to "service_role";

grant update on table "public"."external_provider_stats" to "service_role";

grant delete on table "public"."fx_daily" to "anon";

grant insert on table "public"."fx_daily" to "anon";

grant references on table "public"."fx_daily" to "anon";

grant select on table "public"."fx_daily" to "anon";

grant trigger on table "public"."fx_daily" to "anon";

grant truncate on table "public"."fx_daily" to "anon";

grant update on table "public"."fx_daily" to "anon";

grant delete on table "public"."fx_daily" to "authenticated";

grant insert on table "public"."fx_daily" to "authenticated";

grant references on table "public"."fx_daily" to "authenticated";

grant select on table "public"."fx_daily" to "authenticated";

grant trigger on table "public"."fx_daily" to "authenticated";

grant truncate on table "public"."fx_daily" to "authenticated";

grant update on table "public"."fx_daily" to "authenticated";

grant delete on table "public"."fx_daily" to "service_role";

grant insert on table "public"."fx_daily" to "service_role";

grant references on table "public"."fx_daily" to "service_role";

grant select on table "public"."fx_daily" to "service_role";

grant trigger on table "public"."fx_daily" to "service_role";

grant truncate on table "public"."fx_daily" to "service_role";

grant update on table "public"."fx_daily" to "service_role";

grant delete on table "public"."games" to "anon";

grant insert on table "public"."games" to "anon";

grant references on table "public"."games" to "anon";

grant select on table "public"."games" to "anon";

grant trigger on table "public"."games" to "anon";

grant truncate on table "public"."games" to "anon";

grant update on table "public"."games" to "anon";

grant delete on table "public"."games" to "authenticated";

grant insert on table "public"."games" to "authenticated";

grant references on table "public"."games" to "authenticated";

grant select on table "public"."games" to "authenticated";

grant trigger on table "public"."games" to "authenticated";

grant truncate on table "public"."games" to "authenticated";

grant update on table "public"."games" to "authenticated";

grant delete on table "public"."games" to "service_role";

grant insert on table "public"."games" to "service_role";

grant references on table "public"."games" to "service_role";

grant select on table "public"."games" to "service_role";

grant trigger on table "public"."games" to "service_role";

grant truncate on table "public"."games" to "service_role";

grant update on table "public"."games" to "service_role";

grant delete on table "public"."graded_prices" to "anon";

grant insert on table "public"."graded_prices" to "anon";

grant references on table "public"."graded_prices" to "anon";

grant select on table "public"."graded_prices" to "anon";

grant trigger on table "public"."graded_prices" to "anon";

grant truncate on table "public"."graded_prices" to "anon";

grant update on table "public"."graded_prices" to "anon";

grant delete on table "public"."graded_prices" to "authenticated";

grant insert on table "public"."graded_prices" to "authenticated";

grant references on table "public"."graded_prices" to "authenticated";

grant select on table "public"."graded_prices" to "authenticated";

grant trigger on table "public"."graded_prices" to "authenticated";

grant truncate on table "public"."graded_prices" to "authenticated";

grant update on table "public"."graded_prices" to "authenticated";

grant delete on table "public"."graded_prices" to "service_role";

grant insert on table "public"."graded_prices" to "service_role";

grant references on table "public"."graded_prices" to "service_role";

grant select on table "public"."graded_prices" to "service_role";

grant trigger on table "public"."graded_prices" to "service_role";

grant truncate on table "public"."graded_prices" to "service_role";

grant update on table "public"."graded_prices" to "service_role";

grant delete on table "public"."has_currency" to "anon";

grant insert on table "public"."has_currency" to "anon";

grant references on table "public"."has_currency" to "anon";

grant select on table "public"."has_currency" to "anon";

grant trigger on table "public"."has_currency" to "anon";

grant truncate on table "public"."has_currency" to "anon";

grant update on table "public"."has_currency" to "anon";

grant delete on table "public"."has_currency" to "authenticated";

grant insert on table "public"."has_currency" to "authenticated";

grant references on table "public"."has_currency" to "authenticated";

grant select on table "public"."has_currency" to "authenticated";

grant trigger on table "public"."has_currency" to "authenticated";

grant truncate on table "public"."has_currency" to "authenticated";

grant update on table "public"."has_currency" to "authenticated";

grant delete on table "public"."has_currency" to "service_role";

grant insert on table "public"."has_currency" to "service_role";

grant references on table "public"."has_currency" to "service_role";

grant select on table "public"."has_currency" to "service_role";

grant trigger on table "public"."has_currency" to "service_role";

grant truncate on table "public"."has_currency" to "service_role";

grant update on table "public"."has_currency" to "service_role";

grant delete on table "public"."has_high" to "anon";

grant insert on table "public"."has_high" to "anon";

grant references on table "public"."has_high" to "anon";

grant select on table "public"."has_high" to "anon";

grant trigger on table "public"."has_high" to "anon";

grant truncate on table "public"."has_high" to "anon";

grant update on table "public"."has_high" to "anon";

grant delete on table "public"."has_high" to "authenticated";

grant insert on table "public"."has_high" to "authenticated";

grant references on table "public"."has_high" to "authenticated";

grant select on table "public"."has_high" to "authenticated";

grant trigger on table "public"."has_high" to "authenticated";

grant truncate on table "public"."has_high" to "authenticated";

grant update on table "public"."has_high" to "authenticated";

grant delete on table "public"."has_high" to "service_role";

grant insert on table "public"."has_high" to "service_role";

grant references on table "public"."has_high" to "service_role";

grant select on table "public"."has_high" to "service_role";

grant trigger on table "public"."has_high" to "service_role";

grant truncate on table "public"."has_high" to "service_role";

grant update on table "public"."has_high" to "service_role";

grant delete on table "public"."has_low" to "anon";

grant insert on table "public"."has_low" to "anon";

grant references on table "public"."has_low" to "anon";

grant select on table "public"."has_low" to "anon";

grant trigger on table "public"."has_low" to "anon";

grant truncate on table "public"."has_low" to "anon";

grant update on table "public"."has_low" to "anon";

grant delete on table "public"."has_low" to "authenticated";

grant insert on table "public"."has_low" to "authenticated";

grant references on table "public"."has_low" to "authenticated";

grant select on table "public"."has_low" to "authenticated";

grant trigger on table "public"."has_low" to "authenticated";

grant truncate on table "public"."has_low" to "authenticated";

grant update on table "public"."has_low" to "authenticated";

grant delete on table "public"."has_low" to "service_role";

grant insert on table "public"."has_low" to "service_role";

grant references on table "public"."has_low" to "service_role";

grant select on table "public"."has_low" to "service_role";

grant trigger on table "public"."has_low" to "service_role";

grant truncate on table "public"."has_low" to "service_role";

grant update on table "public"."has_low" to "service_role";

grant delete on table "public"."has_mid" to "anon";

grant insert on table "public"."has_mid" to "anon";

grant references on table "public"."has_mid" to "anon";

grant select on table "public"."has_mid" to "anon";

grant trigger on table "public"."has_mid" to "anon";

grant truncate on table "public"."has_mid" to "anon";

grant update on table "public"."has_mid" to "anon";

grant delete on table "public"."has_mid" to "authenticated";

grant insert on table "public"."has_mid" to "authenticated";

grant references on table "public"."has_mid" to "authenticated";

grant select on table "public"."has_mid" to "authenticated";

grant trigger on table "public"."has_mid" to "authenticated";

grant truncate on table "public"."has_mid" to "authenticated";

grant update on table "public"."has_mid" to "authenticated";

grant delete on table "public"."has_mid" to "service_role";

grant insert on table "public"."has_mid" to "service_role";

grant references on table "public"."has_mid" to "service_role";

grant select on table "public"."has_mid" to "service_role";

grant trigger on table "public"."has_mid" to "service_role";

grant truncate on table "public"."has_mid" to "service_role";

grant update on table "public"."has_mid" to "service_role";

grant delete on table "public"."has_source" to "anon";

grant insert on table "public"."has_source" to "anon";

grant references on table "public"."has_source" to "anon";

grant select on table "public"."has_source" to "anon";

grant trigger on table "public"."has_source" to "anon";

grant truncate on table "public"."has_source" to "anon";

grant update on table "public"."has_source" to "anon";

grant delete on table "public"."has_source" to "authenticated";

grant insert on table "public"."has_source" to "authenticated";

grant references on table "public"."has_source" to "authenticated";

grant select on table "public"."has_source" to "authenticated";

grant trigger on table "public"."has_source" to "authenticated";

grant truncate on table "public"."has_source" to "authenticated";

grant update on table "public"."has_source" to "authenticated";

grant delete on table "public"."has_source" to "service_role";

grant insert on table "public"."has_source" to "service_role";

grant references on table "public"."has_source" to "service_role";

grant select on table "public"."has_source" to "service_role";

grant trigger on table "public"."has_source" to "service_role";

grant truncate on table "public"."has_source" to "service_role";

grant update on table "public"."has_source" to "service_role";

grant delete on table "public"."import_image_errors" to "anon";

grant insert on table "public"."import_image_errors" to "anon";

grant references on table "public"."import_image_errors" to "anon";

grant select on table "public"."import_image_errors" to "anon";

grant trigger on table "public"."import_image_errors" to "anon";

grant truncate on table "public"."import_image_errors" to "anon";

grant update on table "public"."import_image_errors" to "anon";

grant delete on table "public"."import_image_errors" to "authenticated";

grant insert on table "public"."import_image_errors" to "authenticated";

grant references on table "public"."import_image_errors" to "authenticated";

grant select on table "public"."import_image_errors" to "authenticated";

grant trigger on table "public"."import_image_errors" to "authenticated";

grant truncate on table "public"."import_image_errors" to "authenticated";

grant update on table "public"."import_image_errors" to "authenticated";

grant delete on table "public"."import_image_errors" to "service_role";

grant insert on table "public"."import_image_errors" to "service_role";

grant references on table "public"."import_image_errors" to "service_role";

grant select on table "public"."import_image_errors" to "service_role";

grant trigger on table "public"."import_image_errors" to "service_role";

grant truncate on table "public"."import_image_errors" to "service_role";

grant update on table "public"."import_image_errors" to "service_role";

grant delete on table "public"."job_logs" to "anon";

grant insert on table "public"."job_logs" to "anon";

grant references on table "public"."job_logs" to "anon";

grant select on table "public"."job_logs" to "anon";

grant trigger on table "public"."job_logs" to "anon";

grant truncate on table "public"."job_logs" to "anon";

grant update on table "public"."job_logs" to "anon";

grant delete on table "public"."job_logs" to "authenticated";

grant insert on table "public"."job_logs" to "authenticated";

grant references on table "public"."job_logs" to "authenticated";

grant select on table "public"."job_logs" to "authenticated";

grant trigger on table "public"."job_logs" to "authenticated";

grant truncate on table "public"."job_logs" to "authenticated";

grant update on table "public"."job_logs" to "authenticated";

grant delete on table "public"."job_logs" to "service_role";

grant insert on table "public"."job_logs" to "service_role";

grant references on table "public"."job_logs" to "service_role";

grant select on table "public"."job_logs" to "service_role";

grant trigger on table "public"."job_logs" to "service_role";

grant truncate on table "public"."job_logs" to "service_role";

grant update on table "public"."job_logs" to "service_role";

grant delete on table "public"."jobs" to "anon";

grant insert on table "public"."jobs" to "anon";

grant references on table "public"."jobs" to "anon";

grant select on table "public"."jobs" to "anon";

grant trigger on table "public"."jobs" to "anon";

grant truncate on table "public"."jobs" to "anon";

grant update on table "public"."jobs" to "anon";

grant delete on table "public"."jobs" to "authenticated";

grant insert on table "public"."jobs" to "authenticated";

grant references on table "public"."jobs" to "authenticated";

grant select on table "public"."jobs" to "authenticated";

grant trigger on table "public"."jobs" to "authenticated";

grant truncate on table "public"."jobs" to "authenticated";

grant update on table "public"."jobs" to "authenticated";

grant delete on table "public"."jobs" to "service_role";

grant insert on table "public"."jobs" to "service_role";

grant references on table "public"."jobs" to "service_role";

grant select on table "public"."jobs" to "service_role";

grant trigger on table "public"."jobs" to "service_role";

grant truncate on table "public"."jobs" to "service_role";

grant update on table "public"."jobs" to "service_role";

grant delete on table "public"."listing_images" to "anon";

grant insert on table "public"."listing_images" to "anon";

grant references on table "public"."listing_images" to "anon";

grant select on table "public"."listing_images" to "anon";

grant trigger on table "public"."listing_images" to "anon";

grant truncate on table "public"."listing_images" to "anon";

grant update on table "public"."listing_images" to "anon";

grant delete on table "public"."listing_images" to "authenticated";

grant insert on table "public"."listing_images" to "authenticated";

grant references on table "public"."listing_images" to "authenticated";

grant select on table "public"."listing_images" to "authenticated";

grant trigger on table "public"."listing_images" to "authenticated";

grant truncate on table "public"."listing_images" to "authenticated";

grant update on table "public"."listing_images" to "authenticated";

grant delete on table "public"."listing_images" to "service_role";

grant insert on table "public"."listing_images" to "service_role";

grant references on table "public"."listing_images" to "service_role";

grant select on table "public"."listing_images" to "service_role";

grant trigger on table "public"."listing_images" to "service_role";

grant truncate on table "public"."listing_images" to "service_role";

grant update on table "public"."listing_images" to "service_role";

grant delete on table "public"."listings" to "anon";

grant insert on table "public"."listings" to "anon";

grant references on table "public"."listings" to "anon";

grant select on table "public"."listings" to "anon";

grant trigger on table "public"."listings" to "anon";

grant truncate on table "public"."listings" to "anon";

grant update on table "public"."listings" to "anon";

grant delete on table "public"."listings" to "authenticated";

grant insert on table "public"."listings" to "authenticated";

grant references on table "public"."listings" to "authenticated";

grant select on table "public"."listings" to "authenticated";

grant trigger on table "public"."listings" to "authenticated";

grant truncate on table "public"."listings" to "authenticated";

grant update on table "public"."listings" to "authenticated";

grant delete on table "public"."listings" to "service_role";

grant insert on table "public"."listings" to "service_role";

grant references on table "public"."listings" to "service_role";

grant select on table "public"."listings" to "service_role";

grant trigger on table "public"."listings" to "service_role";

grant truncate on table "public"."listings" to "service_role";

grant update on table "public"."listings" to "service_role";

grant delete on table "public"."market_prices" to "anon";

grant insert on table "public"."market_prices" to "anon";

grant references on table "public"."market_prices" to "anon";

grant select on table "public"."market_prices" to "anon";

grant trigger on table "public"."market_prices" to "anon";

grant truncate on table "public"."market_prices" to "anon";

grant update on table "public"."market_prices" to "anon";

grant delete on table "public"."market_prices" to "authenticated";

grant insert on table "public"."market_prices" to "authenticated";

grant references on table "public"."market_prices" to "authenticated";

grant select on table "public"."market_prices" to "authenticated";

grant trigger on table "public"."market_prices" to "authenticated";

grant truncate on table "public"."market_prices" to "authenticated";

grant update on table "public"."market_prices" to "authenticated";

grant delete on table "public"."market_prices" to "service_role";

grant insert on table "public"."market_prices" to "service_role";

grant references on table "public"."market_prices" to "service_role";

grant select on table "public"."market_prices" to "service_role";

grant trigger on table "public"."market_prices" to "service_role";

grant truncate on table "public"."market_prices" to "service_role";

grant update on table "public"."market_prices" to "service_role";

grant delete on table "public"."price_observations" to "anon";

grant insert on table "public"."price_observations" to "anon";

grant references on table "public"."price_observations" to "anon";

grant select on table "public"."price_observations" to "anon";

grant trigger on table "public"."price_observations" to "anon";

grant truncate on table "public"."price_observations" to "anon";

grant update on table "public"."price_observations" to "anon";

grant delete on table "public"."price_observations" to "authenticated";

grant insert on table "public"."price_observations" to "authenticated";

grant references on table "public"."price_observations" to "authenticated";

grant select on table "public"."price_observations" to "authenticated";

grant trigger on table "public"."price_observations" to "authenticated";

grant truncate on table "public"."price_observations" to "authenticated";

grant update on table "public"."price_observations" to "authenticated";

grant delete on table "public"."price_observations" to "service_role";

grant insert on table "public"."price_observations" to "service_role";

grant references on table "public"."price_observations" to "service_role";

grant select on table "public"."price_observations" to "service_role";

grant trigger on table "public"."price_observations" to "service_role";

grant truncate on table "public"."price_observations" to "service_role";

grant update on table "public"."price_observations" to "service_role";

grant delete on table "public"."price_observations_backup_20251115" to "anon";

grant insert on table "public"."price_observations_backup_20251115" to "anon";

grant references on table "public"."price_observations_backup_20251115" to "anon";

grant select on table "public"."price_observations_backup_20251115" to "anon";

grant trigger on table "public"."price_observations_backup_20251115" to "anon";

grant truncate on table "public"."price_observations_backup_20251115" to "anon";

grant update on table "public"."price_observations_backup_20251115" to "anon";

grant delete on table "public"."price_observations_backup_20251115" to "authenticated";

grant insert on table "public"."price_observations_backup_20251115" to "authenticated";

grant references on table "public"."price_observations_backup_20251115" to "authenticated";

grant select on table "public"."price_observations_backup_20251115" to "authenticated";

grant trigger on table "public"."price_observations_backup_20251115" to "authenticated";

grant truncate on table "public"."price_observations_backup_20251115" to "authenticated";

grant update on table "public"."price_observations_backup_20251115" to "authenticated";

grant delete on table "public"."price_observations_backup_20251115" to "service_role";

grant insert on table "public"."price_observations_backup_20251115" to "service_role";

grant references on table "public"."price_observations_backup_20251115" to "service_role";

grant select on table "public"."price_observations_backup_20251115" to "service_role";

grant trigger on table "public"."price_observations_backup_20251115" to "service_role";

grant truncate on table "public"."price_observations_backup_20251115" to "service_role";

grant update on table "public"."price_observations_backup_20251115" to "service_role";

grant delete on table "public"."price_rollup_config" to "anon";

grant insert on table "public"."price_rollup_config" to "anon";

grant references on table "public"."price_rollup_config" to "anon";

grant select on table "public"."price_rollup_config" to "anon";

grant trigger on table "public"."price_rollup_config" to "anon";

grant truncate on table "public"."price_rollup_config" to "anon";

grant update on table "public"."price_rollup_config" to "anon";

grant delete on table "public"."price_rollup_config" to "authenticated";

grant insert on table "public"."price_rollup_config" to "authenticated";

grant references on table "public"."price_rollup_config" to "authenticated";

grant select on table "public"."price_rollup_config" to "authenticated";

grant trigger on table "public"."price_rollup_config" to "authenticated";

grant truncate on table "public"."price_rollup_config" to "authenticated";

grant update on table "public"."price_rollup_config" to "authenticated";

grant delete on table "public"."price_rollup_config" to "service_role";

grant insert on table "public"."price_rollup_config" to "service_role";

grant references on table "public"."price_rollup_config" to "service_role";

grant select on table "public"."price_rollup_config" to "service_role";

grant trigger on table "public"."price_rollup_config" to "service_role";

grant truncate on table "public"."price_rollup_config" to "service_role";

grant update on table "public"."price_rollup_config" to "service_role";

grant delete on table "public"."price_sources" to "anon";

grant insert on table "public"."price_sources" to "anon";

grant references on table "public"."price_sources" to "anon";

grant select on table "public"."price_sources" to "anon";

grant trigger on table "public"."price_sources" to "anon";

grant truncate on table "public"."price_sources" to "anon";

grant update on table "public"."price_sources" to "anon";

grant delete on table "public"."price_sources" to "authenticated";

grant insert on table "public"."price_sources" to "authenticated";

grant references on table "public"."price_sources" to "authenticated";

grant select on table "public"."price_sources" to "authenticated";

grant trigger on table "public"."price_sources" to "authenticated";

grant truncate on table "public"."price_sources" to "authenticated";

grant update on table "public"."price_sources" to "authenticated";

grant delete on table "public"."price_sources" to "service_role";

grant insert on table "public"."price_sources" to "service_role";

grant references on table "public"."price_sources" to "service_role";

grant select on table "public"."price_sources" to "service_role";

grant trigger on table "public"."price_sources" to "service_role";

grant truncate on table "public"."price_sources" to "service_role";

grant update on table "public"."price_sources" to "service_role";

grant delete on table "public"."prices" to "anon";

grant insert on table "public"."prices" to "anon";

grant references on table "public"."prices" to "anon";

grant select on table "public"."prices" to "anon";

grant trigger on table "public"."prices" to "anon";

grant truncate on table "public"."prices" to "anon";

grant update on table "public"."prices" to "anon";

grant delete on table "public"."prices" to "authenticated";

grant insert on table "public"."prices" to "authenticated";

grant references on table "public"."prices" to "authenticated";

grant select on table "public"."prices" to "authenticated";

grant trigger on table "public"."prices" to "authenticated";

grant truncate on table "public"."prices" to "authenticated";

grant update on table "public"."prices" to "authenticated";

grant delete on table "public"."prices" to "service_role";

grant insert on table "public"."prices" to "service_role";

grant references on table "public"."prices" to "service_role";

grant select on table "public"."prices" to "service_role";

grant trigger on table "public"."prices" to "service_role";

grant truncate on table "public"."prices" to "service_role";

grant update on table "public"."prices" to "service_role";

grant delete on table "public"."scans" to "anon";

grant insert on table "public"."scans" to "anon";

grant references on table "public"."scans" to "anon";

grant select on table "public"."scans" to "anon";

grant trigger on table "public"."scans" to "anon";

grant truncate on table "public"."scans" to "anon";

grant update on table "public"."scans" to "anon";

grant delete on table "public"."scans" to "authenticated";

grant insert on table "public"."scans" to "authenticated";

grant references on table "public"."scans" to "authenticated";

grant select on table "public"."scans" to "authenticated";

grant trigger on table "public"."scans" to "authenticated";

grant truncate on table "public"."scans" to "authenticated";

grant update on table "public"."scans" to "authenticated";

grant delete on table "public"."scans" to "service_role";

grant insert on table "public"."scans" to "service_role";

grant references on table "public"."scans" to "service_role";

grant select on table "public"."scans" to "service_role";

grant trigger on table "public"."scans" to "service_role";

grant truncate on table "public"."scans" to "service_role";

grant update on table "public"."scans" to "service_role";

grant delete on table "public"."set_sync_audit" to "anon";

grant insert on table "public"."set_sync_audit" to "anon";

grant references on table "public"."set_sync_audit" to "anon";

grant select on table "public"."set_sync_audit" to "anon";

grant trigger on table "public"."set_sync_audit" to "anon";

grant truncate on table "public"."set_sync_audit" to "anon";

grant update on table "public"."set_sync_audit" to "anon";

grant delete on table "public"."set_sync_audit" to "authenticated";

grant insert on table "public"."set_sync_audit" to "authenticated";

grant references on table "public"."set_sync_audit" to "authenticated";

grant select on table "public"."set_sync_audit" to "authenticated";

grant trigger on table "public"."set_sync_audit" to "authenticated";

grant truncate on table "public"."set_sync_audit" to "authenticated";

grant update on table "public"."set_sync_audit" to "authenticated";

grant delete on table "public"."set_sync_audit" to "service_role";

grant insert on table "public"."set_sync_audit" to "service_role";

grant references on table "public"."set_sync_audit" to "service_role";

grant select on table "public"."set_sync_audit" to "service_role";

grant trigger on table "public"."set_sync_audit" to "service_role";

grant truncate on table "public"."set_sync_audit" to "service_role";

grant update on table "public"."set_sync_audit" to "service_role";

grant delete on table "public"."sets" to "anon";

grant insert on table "public"."sets" to "anon";

grant references on table "public"."sets" to "anon";

grant select on table "public"."sets" to "anon";

grant trigger on table "public"."sets" to "anon";

grant truncate on table "public"."sets" to "anon";

grant update on table "public"."sets" to "anon";

grant delete on table "public"."sets" to "authenticated";

grant insert on table "public"."sets" to "authenticated";

grant references on table "public"."sets" to "authenticated";

grant select on table "public"."sets" to "authenticated";

grant trigger on table "public"."sets" to "authenticated";

grant truncate on table "public"."sets" to "authenticated";

grant update on table "public"."sets" to "authenticated";

grant delete on table "public"."sets" to "service_role";

grant insert on table "public"."sets" to "service_role";

grant references on table "public"."sets" to "service_role";

grant select on table "public"."sets" to "service_role";

grant trigger on table "public"."sets" to "service_role";

grant truncate on table "public"."sets" to "service_role";

grant update on table "public"."sets" to "service_role";

grant delete on table "public"."unmatched_price_rows" to "anon";

grant insert on table "public"."unmatched_price_rows" to "anon";

grant references on table "public"."unmatched_price_rows" to "anon";

grant select on table "public"."unmatched_price_rows" to "anon";

grant trigger on table "public"."unmatched_price_rows" to "anon";

grant truncate on table "public"."unmatched_price_rows" to "anon";

grant update on table "public"."unmatched_price_rows" to "anon";

grant delete on table "public"."unmatched_price_rows" to "authenticated";

grant insert on table "public"."unmatched_price_rows" to "authenticated";

grant references on table "public"."unmatched_price_rows" to "authenticated";

grant select on table "public"."unmatched_price_rows" to "authenticated";

grant trigger on table "public"."unmatched_price_rows" to "authenticated";

grant truncate on table "public"."unmatched_price_rows" to "authenticated";

grant update on table "public"."unmatched_price_rows" to "authenticated";

grant delete on table "public"."unmatched_price_rows" to "service_role";

grant insert on table "public"."unmatched_price_rows" to "service_role";

grant references on table "public"."unmatched_price_rows" to "service_role";

grant select on table "public"."unmatched_price_rows" to "service_role";

grant trigger on table "public"."unmatched_price_rows" to "service_role";

grant truncate on table "public"."unmatched_price_rows" to "service_role";

grant update on table "public"."unmatched_price_rows" to "service_role";

grant delete on table "public"."vault_items" to "anon";

grant insert on table "public"."vault_items" to "anon";

grant references on table "public"."vault_items" to "anon";

grant select on table "public"."vault_items" to "anon";

grant trigger on table "public"."vault_items" to "anon";

grant truncate on table "public"."vault_items" to "anon";

grant update on table "public"."vault_items" to "anon";

grant delete on table "public"."vault_items" to "authenticated";

grant insert on table "public"."vault_items" to "authenticated";

grant references on table "public"."vault_items" to "authenticated";

grant select on table "public"."vault_items" to "authenticated";

grant trigger on table "public"."vault_items" to "authenticated";

grant truncate on table "public"."vault_items" to "authenticated";

grant update on table "public"."vault_items" to "authenticated";

grant delete on table "public"."vault_items" to "service_role";

grant insert on table "public"."vault_items" to "service_role";

grant references on table "public"."vault_items" to "service_role";

grant select on table "public"."vault_items" to "service_role";

grant trigger on table "public"."vault_items" to "service_role";

grant truncate on table "public"."vault_items" to "service_role";

grant update on table "public"."vault_items" to "service_role";

grant delete on table "public"."vault_items_backup_20251115" to "anon";

grant insert on table "public"."vault_items_backup_20251115" to "anon";

grant references on table "public"."vault_items_backup_20251115" to "anon";

grant select on table "public"."vault_items_backup_20251115" to "anon";

grant trigger on table "public"."vault_items_backup_20251115" to "anon";

grant truncate on table "public"."vault_items_backup_20251115" to "anon";

grant update on table "public"."vault_items_backup_20251115" to "anon";

grant delete on table "public"."vault_items_backup_20251115" to "authenticated";

grant insert on table "public"."vault_items_backup_20251115" to "authenticated";

grant references on table "public"."vault_items_backup_20251115" to "authenticated";

grant select on table "public"."vault_items_backup_20251115" to "authenticated";

grant trigger on table "public"."vault_items_backup_20251115" to "authenticated";

grant truncate on table "public"."vault_items_backup_20251115" to "authenticated";

grant update on table "public"."vault_items_backup_20251115" to "authenticated";

grant delete on table "public"."vault_items_backup_20251115" to "service_role";

grant insert on table "public"."vault_items_backup_20251115" to "service_role";

grant references on table "public"."vault_items_backup_20251115" to "service_role";

grant select on table "public"."vault_items_backup_20251115" to "service_role";

grant trigger on table "public"."vault_items_backup_20251115" to "service_role";

grant truncate on table "public"."vault_items_backup_20251115" to "service_role";

grant update on table "public"."vault_items_backup_20251115" to "service_role";

grant delete on table "public"."waitlist" to "anon";

grant insert on table "public"."waitlist" to "anon";

grant references on table "public"."waitlist" to "anon";

grant select on table "public"."waitlist" to "anon";

grant trigger on table "public"."waitlist" to "anon";

grant truncate on table "public"."waitlist" to "anon";

grant update on table "public"."waitlist" to "anon";

grant delete on table "public"."waitlist" to "authenticated";

grant insert on table "public"."waitlist" to "authenticated";

grant references on table "public"."waitlist" to "authenticated";

grant select on table "public"."waitlist" to "authenticated";

grant trigger on table "public"."waitlist" to "authenticated";

grant truncate on table "public"."waitlist" to "authenticated";

grant update on table "public"."waitlist" to "authenticated";

grant delete on table "public"."waitlist" to "service_role";

grant insert on table "public"."waitlist" to "service_role";

grant references on table "public"."waitlist" to "service_role";

grant select on table "public"."waitlist" to "service_role";

grant trigger on table "public"."waitlist" to "service_role";

grant truncate on table "public"."waitlist" to "service_role";

grant update on table "public"."waitlist" to "service_role";

grant delete on table "public"."wishlist_items" to "anon";

grant insert on table "public"."wishlist_items" to "anon";

grant references on table "public"."wishlist_items" to "anon";

grant select on table "public"."wishlist_items" to "anon";

grant trigger on table "public"."wishlist_items" to "anon";

grant truncate on table "public"."wishlist_items" to "anon";

grant update on table "public"."wishlist_items" to "anon";

grant delete on table "public"."wishlist_items" to "authenticated";

grant insert on table "public"."wishlist_items" to "authenticated";

grant references on table "public"."wishlist_items" to "authenticated";

grant select on table "public"."wishlist_items" to "authenticated";

grant trigger on table "public"."wishlist_items" to "authenticated";

grant truncate on table "public"."wishlist_items" to "authenticated";

grant update on table "public"."wishlist_items" to "authenticated";

grant delete on table "public"."wishlist_items" to "service_role";

grant insert on table "public"."wishlist_items" to "service_role";

grant references on table "public"."wishlist_items" to "service_role";

grant select on table "public"."wishlist_items" to "service_role";

grant trigger on table "public"."wishlist_items" to "service_role";

grant truncate on table "public"."wishlist_items" to "service_role";

grant update on table "public"."wishlist_items" to "service_role";


  create policy "gv_alerts_delete"
  on "public"."alerts"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_alerts_insert"
  on "public"."alerts"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_alerts_select"
  on "public"."alerts"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_alerts_update"
  on "public"."alerts"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "refdata_read"
  on "public"."card_catalog"
  as permissive
  for select
  to authenticated
using (true);



  create policy "card_price_ticks_read"
  on "public"."card_price_ticks"
  as permissive
  for select
  to public
using (true);



  create policy "card_prices_read"
  on "public"."card_prices"
  as permissive
  for select
  to public
using (true);



  create policy "read all"
  on "public"."card_prices"
  as permissive
  for select
  to public
using (true);



  create policy "update via function"
  on "public"."card_prices"
  as permissive
  for update
  to public
using (true);



  create policy "write via function"
  on "public"."card_prices"
  as permissive
  for insert
  to public
with check (true);



  create policy "anon can read card_prints"
  on "public"."card_prints"
  as permissive
  for select
  to anon
using (true);



  create policy "anon can update card_prints (dev)"
  on "public"."card_prints"
  as permissive
  for update
  to anon
using (true)
with check (true);



  create policy "card_prints_read"
  on "public"."card_prints"
  as permissive
  for select
  to public
using (true);



  create policy "catalog readable 2"
  on "public"."card_prints"
  as permissive
  for select
  to authenticated
using (true);



  create policy "read_all_card_prints"
  on "public"."card_prints"
  as permissive
  for select
  to anon
using (true);



  create policy "refdata_read"
  on "public"."card_prints"
  as permissive
  for select
  to authenticated
using (true);



  create policy "refdata_read"
  on "public"."cards"
  as permissive
  for select
  to authenticated
using (true);



  create policy "refdata_read"
  on "public"."games"
  as permissive
  for select
  to authenticated
using (true);



  create policy "listing_images_owner_write"
  on "public"."listing_images"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_images.listing_id) AND (l.owner_id = public.auth_uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_images.listing_id) AND (l.owner_id = public.auth_uid())))));



  create policy "listing_images_read_public"
  on "public"."listing_images"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_images.listing_id) AND (l.visibility = 'public'::text) AND (l.status = 'active'::text)))));



  create policy "listings_owner_delete"
  on "public"."listings"
  as permissive
  for delete
  to public
using ((owner_id = public.auth_uid()));



  create policy "listings_owner_insert"
  on "public"."listings"
  as permissive
  for insert
  to public
with check ((owner_id = public.auth_uid()));



  create policy "listings_owner_read"
  on "public"."listings"
  as permissive
  for select
  to public
using ((owner_id = public.auth_uid()));



  create policy "listings_owner_update"
  on "public"."listings"
  as permissive
  for update
  to public
using ((owner_id = public.auth_uid()))
with check ((owner_id = public.auth_uid()));



  create policy "listings_read_public"
  on "public"."listings"
  as permissive
  for select
  to public
using (((visibility = 'public'::text) AND (status = 'active'::text)));



  create policy "anyone can read prices"
  on "public"."market_prices"
  as permissive
  for select
  to authenticated
using (true);



  create policy "price_obs_read_any"
  on "public"."price_observations"
  as permissive
  for select
  to public
using (true);



  create policy "price_obs_write_service_only"
  on "public"."price_observations"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "refdata_read"
  on "public"."prices"
  as permissive
  for select
  to authenticated
using (true);



  create policy "gv_scans_delete"
  on "public"."scans"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_scans_insert"
  on "public"."scans"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_scans_select"
  on "public"."scans"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_scans_update"
  on "public"."scans"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "read audit"
  on "public"."set_sync_audit"
  as permissive
  for select
  to authenticated
using (true);



  create policy "catalog readable"
  on "public"."sets"
  as permissive
  for select
  to authenticated
using (true);



  create policy "refdata_read"
  on "public"."sets"
  as permissive
  for select
  to authenticated
using (true);



  create policy "unmatched_read_auth"
  on "public"."unmatched_price_rows"
  as permissive
  for select
  to public
using ((auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text])));



  create policy "unmatched_write_service_only"
  on "public"."unmatched_price_rows"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "gv_vault_items_delete"
  on "public"."vault_items"
  as permissive
  for delete
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_vault_items_insert"
  on "public"."vault_items"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_vault_items_select"
  on "public"."vault_items"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "gv_vault_items_update"
  on "public"."vault_items"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "owner delete vault_items"
  on "public"."vault_items"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "owner insert vault_items"
  on "public"."vault_items"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "owner insert"
  on "public"."vault_items"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "owner read"
  on "public"."vault_items"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "owner select vault_items"
  on "public"."vault_items"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "owner update vault_items"
  on "public"."vault_items"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "owner update"
  on "public"."vault_items"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "vault_items owner delete"
  on "public"."vault_items"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "vault_items owner read"
  on "public"."vault_items"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "vault_items owner update"
  on "public"."vault_items"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "vault_items owner write"
  on "public"."vault_items"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "waitlist_insert_public"
  on "public"."waitlist"
  as permissive
  for insert
  to anon
with check (true);



  create policy "wl_rw"
  on "public"."wishlist_items"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER trg_alerts_set_uid BEFORE INSERT ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.set_auth_uid();

CREATE TRIGGER trg_append_price_tick AFTER INSERT OR UPDATE ON public.card_prices FOR EACH ROW EXECUTE FUNCTION public._append_price_tick();

CREATE TRIGGER trg_queue_refresh_latest_card_prices AFTER INSERT OR DELETE OR UPDATE ON public.card_prices FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_refresh_latest_card_prices();

CREATE TRIGGER trg_wall_refresh_listing_images AFTER INSERT OR DELETE OR UPDATE ON public.listing_images FOR EACH STATEMENT EXECUTE FUNCTION public._wall_refresh_mv();

CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

CREATE TRIGGER trg_wall_refresh_listings AFTER INSERT OR DELETE OR UPDATE ON public.listings FOR EACH STATEMENT EXECUTE FUNCTION public._wall_refresh_mv();

CREATE TRIGGER trg_fill_price_obs_print_id BEFORE INSERT ON public.price_observations FOR EACH ROW EXECUTE FUNCTION public.fill_price_obs_print_id();

CREATE TRIGGER trg_scans_set_auth_uid BEFORE INSERT ON public.scans FOR EACH ROW EXECUTE FUNCTION public.set_auth_uid();

CREATE TRIGGER trg_vault_items_set_uid BEFORE INSERT ON public.vault_items FOR EACH ROW EXECUTE FUNCTION public.set_auth_uid();


  create policy "scans delete own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'scans'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "scans insert own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'scans'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "scans read own"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'scans'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "scans update own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'scans'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'scans'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
