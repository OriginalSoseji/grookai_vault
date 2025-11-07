create extension if not exists "pg_trgm" with schema "extensions";


create schema if not exists "ingest";

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


create type "public"."price_currency" as enum ('USD', 'EUR', 'MXN');

create type "public"."price_kind" as enum ('listing', 'sold', 'floor', 'median', 'average', 'low', 'high', 'shop_sale');

create sequence "public"."card_price_observations_id_seq";

create sequence "public"."card_price_ticks_id_seq";

create sequence "public"."import_image_errors_id_seq";

create sequence "public"."price_rollup_config_id_seq";

create sequence "public"."prices_id_seq";

alter table "public"."price_observations" drop constraint "chk_condition_or_grade";

alter table "public"."price_observations" drop constraint "uq_price_observations";

alter table "public"."vault_items" drop constraint "vault_items_condition_check";

alter table "public"."price_observations" drop constraint "price_observations_print_id_fkey";

drop view if exists "public"."v_recently_added";

drop view if exists "public"."v_vault_items_ext";

drop view if exists "public"."v_vault_items";

drop index if exists "public"."uq_price_observations";

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
    "id" bigint not null default nextval('card_price_observations_id_seq'::regclass),
    "card_print_id" uuid not null,
    "source_id" text not null,
    "observed_at" timestamp with time zone not null default now(),
    "currency" price_currency not null default 'USD'::price_currency,
    "value" numeric(12,2) not null,
    "kind" price_kind not null,
    "qty" integer not null default 1,
    "meta" jsonb
);


create table "public"."card_price_rollups" (
    "card_print_id" uuid not null,
    "currency" price_currency not null default 'USD'::price_currency,
    "vault_value" numeric(12,2) not null,
    "last_computed_at" timestamp with time zone not null default now(),
    "sample_size" integer not null default 0,
    "method" text not null,
    "source_breakdown" jsonb
);


create table "public"."card_price_ticks" (
    "id" bigint not null default nextval('card_price_ticks_id_seq'::regclass),
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

create table "public"."import_image_errors" (
    "id" bigint not null default nextval('import_image_errors_id_seq'::regclass),
    "card_print_id" uuid,
    "set_code" text,
    "number" text,
    "source" text,
    "attempted_url" text,
    "err" text,
    "created_at" timestamp with time zone default now()
);


create table "public"."market_prices" (
    "id" uuid not null default gen_random_uuid(),
    "card_id" uuid not null,
    "price" numeric not null,
    "source" text not null default 'manual'::text,
    "fetched_at" timestamp with time zone not null default now()
);


alter table "public"."market_prices" enable row level security;

create table "public"."price_rollup_config" (
    "id" integer not null default nextval('price_rollup_config_id_seq'::regclass),
    "method" text not null default 'weighted_average'::text,
    "currency" price_currency not null default 'USD'::price_currency,
    "weights" jsonb not null
);


create table "public"."price_sources" (
    "id" text not null,
    "display_name" text not null,
    "is_active" boolean not null default true
);


create table "public"."prices" (
    "id" bigint not null default nextval('prices_id_seq'::regclass),
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
    "symbol_url" text
);


alter table "public"."sets" enable row level security;

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

alter table "public"."card_prints" add column "artist" text;

alter table "public"."card_prints" add column "external_ids" jsonb default '{}'::jsonb;

alter table "public"."card_prints" add column "game_id" uuid not null default 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5'::uuid;

alter table "public"."card_prints" add column "image_alt_url" text;

alter table "public"."card_prints" add column "image_source" text;

alter table "public"."card_prints" add column "image_url" text;

alter table "public"."card_prints" add column "name" text not null;

alter table "public"."card_prints" add column "number" text;

alter table "public"."card_prints" add column "number_plain" text generated always as (regexp_replace(number, '[^0-9]'::text, ''::text, 'g'::text)) stored;

alter table "public"."card_prints" add column "rarity" text;

alter table "public"."card_prints" add column "regulation_mark" text;

alter table "public"."card_prints" add column "set_code" text;

alter table "public"."card_prints" add column "set_id" uuid;

alter table "public"."card_prints" add column "tcgplayer_id" text;

alter table "public"."card_prints" add column "updated_at" timestamp with time zone default now();

alter table "public"."card_prints" add column "variant_key" text default ''::text;

alter table "public"."card_prints" add column "variants" jsonb;

alter table "public"."card_prints" alter column "id" set default gen_random_uuid();

alter table "public"."card_prints" enable row level security;

alter table "public"."price_observations" add column "number" text not null default ''::text;

alter table "public"."price_observations" add column "price_high" numeric;

alter table "public"."price_observations" add column "price_low" numeric;

alter table "public"."price_observations" add column "price_market" numeric;

alter table "public"."price_observations" add column "price_mid" numeric;

alter table "public"."price_observations" add column "set_code" text not null default ''::text;

alter table "public"."price_observations" add column "variant" text not null default ''::text;

alter table "public"."price_observations" alter column "print_id" drop not null;

alter table "public"."vault_items" drop column "condition";

alter table "public"."vault_items" drop column "grade";

alter table "public"."vault_items" add column "acquisition_cost" numeric(10,2);

alter table "public"."vault_items" add column "condition_score" integer;

alter table "public"."vault_items" add column "last_price_update" timestamp with time zone;

alter table "public"."vault_items" add column "market_price" numeric;

alter table "public"."vault_items" add column "name" text not null;

alter table "public"."vault_items" add column "notes" text;

alter table "public"."vault_items" add column "photo_url" text;

alter table "public"."vault_items" add column "qty" integer not null default 1;

alter table "public"."vault_items" add column "set_name" text;

alter table "public"."vault_items" alter column "card_id" set data type uuid using "card_id"::uuid;

alter table "public"."vault_items" alter column "grade_value" set data type text using "grade_value"::text;

alter table "public"."vault_items" alter column "is_graded" drop not null;

alter sequence "public"."card_price_observations_id_seq" owned by "public"."card_price_observations"."id";

alter sequence "public"."card_price_ticks_id_seq" owned by "public"."card_price_ticks"."id";

alter sequence "public"."import_image_errors_id_seq" owned by "public"."import_image_errors"."id";

alter sequence "public"."price_rollup_config_id_seq" owned by "public"."price_rollup_config"."id";

alter sequence "public"."prices_id_seq" owned by "public"."prices"."id";

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

CREATE INDEX card_prints_set_code_ci ON public.card_prints USING btree (lower(set_code));

CREATE UNIQUE INDEX card_prints_uniq ON public.card_prints USING btree (game_id, set_id, number, COALESCE(variant_key, ''::text));

CREATE INDEX cards_name_idx ON public.cards USING gin (to_tsvector('simple'::regconfig, COALESCE(name, ''::text)));

CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id);

CREATE INDEX cards_set_idx ON public.cards USING btree (set_id);

CREATE INDEX cp_setnum_idx ON public.card_prints USING btree (set_code, number);

CREATE INDEX cpo_card_time_idx ON public.card_price_observations USING btree (card_print_id, observed_at DESC);

CREATE INDEX cpo_source_idx ON public.card_price_observations USING btree (source_id);

CREATE UNIQUE INDEX fx_daily_pkey ON public.fx_daily USING btree (d);

CREATE UNIQUE INDEX games_code_key ON public.games USING btree (code);

CREATE UNIQUE INDEX games_pkey ON public.games USING btree (id);

CREATE UNIQUE INDEX games_slug_key ON public.games USING btree (slug);

CREATE INDEX idx_card_prints_name ON public.card_prints USING btree (name);

CREATE INDEX idx_card_prints_name_trgm ON public.card_prints USING gin (name gin_trgm_ops);

CREATE INDEX idx_card_prints_set_no ON public.card_prints USING btree (set_id, number);

CREATE INDEX idx_card_prints_setnum ON public.card_prints USING btree (set_code, number);

CREATE INDEX idx_card_prints_setnumplain ON public.card_prints USING btree (set_code, number_plain);

CREATE INDEX idx_catalog_name_trgm ON public.card_catalog USING gin (name gin_trgm_ops);

CREATE INDEX idx_catalog_setname_trgm ON public.card_catalog USING gin (set_name gin_trgm_ops);

CREATE INDEX idx_market_prices_card_source_time ON public.market_prices USING btree (card_id, source, fetched_at DESC);

CREATE INDEX idx_market_prices_card_time ON public.market_prices USING btree (card_id, fetched_at DESC);

CREATE INDEX idx_price_obs_lookup ON public.price_observations USING btree (set_code, number, variant, observed_at DESC);

CREATE INDEX idx_price_obs_print ON public.price_observations USING btree (print_id, observed_at DESC);

CREATE INDEX idx_prices_card_ts ON public.prices USING btree (card_id, ts DESC);

CREATE INDEX idx_sets_code ON public.sets USING btree (code);

CREATE INDEX idx_vault_items_user_created ON public.vault_items USING btree (user_id, created_at DESC);

CREATE INDEX idx_vault_items_user_name ON public.vault_items USING btree (user_id, name);

CREATE UNIQUE INDEX import_image_errors_pkey ON public.import_image_errors USING btree (id);

CREATE UNIQUE INDEX market_prices_pkey ON public.market_prices USING btree (id);

CREATE INDEX price_observations_condition_grade_agency_grade_value_idx ON public.price_observations USING btree (condition, grade_agency, grade_value);

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

CREATE UNIQUE INDEX sets_pkey ON public.sets USING btree (id);

CREATE UNIQUE INDEX sets_unique_game_code ON public.sets USING btree (game, code);

CREATE UNIQUE INDEX uq_card_prints_game_set_number ON public.card_prints USING btree (game_id, set_id, number);

CREATE UNIQUE INDEX uq_card_prints_setid_number ON public.card_prints USING btree (set_id, number);

CREATE UNIQUE INDEX uq_card_prints_setnum ON public.card_prints USING btree (set_code, number);

CREATE UNIQUE INDEX uq_catalog_setnum ON public.card_catalog USING btree (set_code, card_number);

CREATE UNIQUE INDEX uq_sets_code ON public.sets USING btree (code);

CREATE UNIQUE INDEX uq_user_card ON public.vault_items USING btree (user_id, card_id);

CREATE UNIQUE INDEX uq_vault_items_user_card ON public.vault_items USING btree (user_id, card_id);

CREATE UNIQUE INDEX uq_vault_user_card ON public.vault_items USING btree (user_id, card_id);

CREATE INDEX vault_items_card_id_idx ON public.vault_items USING btree (card_id);

CREATE INDEX vault_items_card_idx ON public.vault_items USING btree (card_id);

CREATE INDEX vault_items_created_idx ON public.vault_items USING btree (created_at DESC);

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

alter table "public"."cards" add constraint "cards_pkey" PRIMARY KEY using index "cards_pkey";

alter table "public"."fx_daily" add constraint "fx_daily_pkey" PRIMARY KEY using index "fx_daily_pkey";

alter table "public"."games" add constraint "games_pkey" PRIMARY KEY using index "games_pkey";

alter table "public"."import_image_errors" add constraint "import_image_errors_pkey" PRIMARY KEY using index "import_image_errors_pkey";

alter table "public"."market_prices" add constraint "market_prices_pkey" PRIMARY KEY using index "market_prices_pkey";

alter table "public"."price_rollup_config" add constraint "price_rollup_config_pkey" PRIMARY KEY using index "price_rollup_config_pkey";

alter table "public"."price_sources" add constraint "price_sources_pkey" PRIMARY KEY using index "price_sources_pkey";

alter table "public"."prices" add constraint "prices_pkey" PRIMARY KEY using index "prices_pkey";

alter table "public"."scans" add constraint "scans_pkey" PRIMARY KEY using index "scans_pkey";

alter table "public"."set_sync_audit" add constraint "set_sync_audit_pkey" PRIMARY KEY using index "set_sync_audit_pkey";

alter table "public"."sets" add constraint "sets_pkey" PRIMARY KEY using index "sets_pkey";

alter table "public"."waitlist" add constraint "waitlist_pkey" PRIMARY KEY using index "waitlist_pkey";

alter table "public"."wishlist_items" add constraint "wishlist_items_pkey" PRIMARY KEY using index "wishlist_items_pkey";

alter table "public"."alerts" add constraint "alerts_card_id_fkey" FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE not valid;

alter table "public"."alerts" validate constraint "alerts_card_id_fkey";

alter table "public"."alerts" add constraint "alerts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."alerts" validate constraint "alerts_user_id_fkey";

alter table "public"."card_price_observations" add constraint "card_price_observations_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_price_observations" validate constraint "card_price_observations_card_print_id_fkey";

alter table "public"."card_price_observations" add constraint "card_price_observations_source_id_fkey" FOREIGN KEY (source_id) REFERENCES price_sources(id) not valid;

alter table "public"."card_price_observations" validate constraint "card_price_observations_source_id_fkey";

alter table "public"."card_price_rollups" add constraint "card_price_rollups_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_price_rollups" validate constraint "card_price_rollups_card_print_id_fkey";

alter table "public"."card_price_ticks" add constraint "card_price_ticks_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_price_ticks" validate constraint "card_price_ticks_card_print_id_fkey";

alter table "public"."card_price_ticks" add constraint "card_price_ticks_source_check" CHECK ((source = ANY (ARRAY['tcgplayer'::text, 'cardmarket'::text]))) not valid;

alter table "public"."card_price_ticks" validate constraint "card_price_ticks_source_check";

alter table "public"."card_prices" add constraint "card_prices_card_print_id_fkey" FOREIGN KEY (card_print_id) REFERENCES card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."card_prices" validate constraint "card_prices_card_print_id_fkey";

alter table "public"."card_prices" add constraint "card_prices_card_print_id_source_key" UNIQUE using index "card_prices_card_print_id_source_key";

alter table "public"."card_prices" add constraint "card_prices_source_check" CHECK ((source = ANY (ARRAY['tcgplayer'::text, 'cardmarket'::text]))) not valid;

alter table "public"."card_prices" validate constraint "card_prices_source_check";

alter table "public"."card_prints" add constraint "card_prints_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;

alter table "public"."card_prints" validate constraint "card_prints_game_id_fkey";

alter table "public"."card_prints" add constraint "card_prints_game_set_num_key" UNIQUE using index "card_prints_game_set_num_key";

alter table "public"."card_prints" add constraint "card_prints_image_source_check" CHECK ((image_source = ANY (ARRAY['tcgdex'::text, 'ptcg'::text]))) not valid;

alter table "public"."card_prints" validate constraint "card_prints_image_source_check";

alter table "public"."card_prints" add constraint "card_prints_set_id_fkey" FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE SET NULL not valid;

alter table "public"."card_prints" validate constraint "card_prints_set_id_fkey";

alter table "public"."card_prints" add constraint "uq_card_prints_setnum" UNIQUE using index "uq_card_prints_setnum";

alter table "public"."cards" add constraint "cards_set_id_fkey" FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE SET NULL not valid;

alter table "public"."cards" validate constraint "cards_set_id_fkey";

alter table "public"."games" add constraint "games_code_key" UNIQUE using index "games_code_key";

alter table "public"."games" add constraint "games_slug_key" UNIQUE using index "games_slug_key";

alter table "public"."market_prices" add constraint "market_prices_card_id_fkey" FOREIGN KEY (card_id) REFERENCES card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."market_prices" validate constraint "market_prices_card_id_fkey";

alter table "public"."market_prices" add constraint "market_prices_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "public"."market_prices" validate constraint "market_prices_price_check";

alter table "public"."price_observations" add constraint "price_observations_print_id_condition_grade_agency_grade_va_key" UNIQUE using index "price_observations_print_id_condition_grade_agency_grade_va_key";

alter table "public"."prices" add constraint "prices_card_id_fkey" FOREIGN KEY (card_id) REFERENCES card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."prices" validate constraint "prices_card_id_fkey";

alter table "public"."scans" add constraint "scans_vault_item_id_fkey" FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE not valid;

alter table "public"."scans" validate constraint "scans_vault_item_id_fkey";

alter table "public"."vault_items" add constraint "fk_vault_items_card" FOREIGN KEY (card_id) REFERENCES card_prints(id) DEFERRABLE INITIALLY DEFERRED not valid;

alter table "public"."vault_items" validate constraint "fk_vault_items_card";

alter table "public"."vault_items" add constraint "uq_user_card" UNIQUE using index "uq_user_card";

alter table "public"."vault_items" add constraint "uq_vault_user_card" UNIQUE using index "uq_vault_user_card";

alter table "public"."vault_items" add constraint "vault_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."vault_items" validate constraint "vault_items_user_id_fkey";

alter table "public"."waitlist" add constraint "waitlist_email_check" CHECK ((POSITION(('@'::text) IN (email)) > 1)) not valid;

alter table "public"."waitlist" validate constraint "waitlist_email_check";

alter table "public"."wishlist_items" add constraint "wishlist_items_card_id_fkey" FOREIGN KEY (card_id) REFERENCES card_prints(id) ON DELETE CASCADE not valid;

alter table "public"."wishlist_items" validate constraint "wishlist_items_card_id_fkey";

alter table "public"."wishlist_items" add constraint "wishlist_items_user_id_card_id_key" UNIQUE using index "wishlist_items_user_id_card_id_key";

alter table "public"."wishlist_items" add constraint "wishlist_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."wishlist_items" validate constraint "wishlist_items_user_id_fkey";

alter table "public"."price_observations" add constraint "price_observations_print_id_fkey" FOREIGN KEY (print_id) REFERENCES card_prints(id) DEFERRABLE INITIALLY DEFERRED not valid;

alter table "public"."price_observations" validate constraint "price_observations_print_id_fkey";

set check_function_bodies = off;

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
   FROM card_prints;


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

create or replace view "public"."v_card_images" as  SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source
   FROM card_prints;


create or replace view "public"."v_card_prices_usd" as  SELECT cp.id AS card_print_id,
    cp.set_code,
    cp.number,
    cp.name,
    cp.image_url,
    r.vault_value,
    r.sample_size,
    r.last_computed_at
   FROM (card_prints cp
     LEFT JOIN card_price_rollups r ON (((r.card_print_id = cp.id) AND (r.currency = 'USD'::price_currency))));


create or replace view "public"."v_card_prints" as  SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source AS source,
    updated_at
   FROM card_prints cp;


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
   FROM (v_card_prints v
     LEFT JOIN card_prints cp ON (((cp.set_code = v.set_code) AND (cp.number = v.number))));


create or replace view "public"."v_card_search" as  SELECT id,
    set_code,
    number,
    name,
    rarity,
    COALESCE(image_url, image_alt_url) AS image_best
   FROM card_prints;


create or replace view "public"."v_latest_price" as  SELECT DISTINCT ON (card_print_id, source) card_print_id,
    source,
    currency,
    market,
    low,
    mid,
    high,
    captured_at
   FROM card_price_ticks
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
           FROM prices p_1) p
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
           FROM card_price_ticks
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
           FROM prices p) q
  WHERE (rn = 1);


create or replace view "public"."v_latest_prices" as  SELECT DISTINCT ON (card_id) card_id,
    market_price,
    source,
    ts
   FROM prices
  WHERE (market_price IS NOT NULL)
  ORDER BY card_id, ts DESC;


create or replace view "public"."v_ticker_24h" as  WITH latest AS (
         SELECT DISTINCT ON (t.card_print_id, t.source) t.card_print_id,
            t.source,
            t.market AS market_now,
            t.captured_at AS ts_now
           FROM card_price_ticks t
          ORDER BY t.card_print_id, t.source, t.captured_at DESC
        ), prev24 AS (
         SELECT DISTINCT ON (t.card_print_id, t.source) t.card_print_id,
            t.source,
            t.market AS market_24h,
            t.captured_at AS ts_24h
           FROM card_price_ticks t
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
     JOIN card_prints p ON ((p.id = l.card_print_id)))
     LEFT JOIN prev24 pr ON (((pr.card_print_id = l.card_print_id) AND (pr.source = l.source))));


create or replace view "public"."v_wishlist_items" as  SELECT wi.id,
    wi.user_id,
    wi.card_id,
    c.name,
    c.set_code AS set_name,
    c.number,
    COALESCE(lp.market_price, (0)::numeric) AS market_price,
    c.image_url,
    wi.created_at
   FROM ((wishlist_items wi
     LEFT JOIN card_prints c ON ((c.id = wi.card_id)))
     LEFT JOIN v_latest_price_pref lp ON ((lp.card_id = wi.card_id)));


create or replace view "public"."v_wishlist_value_by_user" as  WITH picked AS (
         SELECT wi.user_id,
            ( SELECT l.market
                   FROM v_latest_price_clean l
                  WHERE (l.card_print_id = wi.card_id)
                  ORDER BY
                        CASE l.source
                            WHEN 'tcgplayer'::text THEN 1
                            ELSE 2
                        END, l.captured_at DESC
                 LIMIT 1) AS market,
            ( SELECT l.captured_at
                   FROM v_latest_price_clean l
                  WHERE (l.card_print_id = wi.card_id)
                  ORDER BY
                        CASE l.source
                            WHEN 'tcgplayer'::text THEN 1
                            ELSE 2
                        END, l.captured_at DESC
                 LIMIT 1) AS ts
           FROM wishlist_items wi
        )
 SELECT user_id,
    (count(*))::integer AS items,
    COALESCE(sum(market), (0)::numeric) AS wishlist_value,
    max(ts) AS last_updated
   FROM picked
  GROUP BY user_id;


CREATE OR REPLACE FUNCTION public.vault_add_or_increment(p_card_id uuid, p_delta_qty integer, p_condition_label text DEFAULT 'NM'::text, p_notes text DEFAULT NULL::text)
 RETURNS SETOF vault_items
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

CREATE OR REPLACE FUNCTION public.refresh_latest_prices()
 RETURNS void
 LANGUAGE sql
AS $function$
  refresh materialized view concurrently public.latest_prices;
$function$
;

create or replace view "public"."v_best_prices_all" as  WITH base AS (
         SELECT DISTINCT ON (pr.card_id) pr.card_id,
            pr.market_price AS base_market,
            pr.source AS base_source,
            pr.ts AS base_ts
           FROM prices pr
          WHERE ((pr.currency = 'USD'::text) AND (pr.market_price IS NOT NULL))
          ORDER BY pr.card_id, pr.ts DESC NULLS LAST
        ), cond AS (
         SELECT DISTINCT ON (cp.card_id, cp.condition_label) cp.card_id,
            cp.condition_label,
            cp.market_price AS cond_market,
            cp.source AS cond_source,
            cp.ts AS cond_ts
           FROM condition_prices cp
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
           FROM graded_prices gp
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
           FROM ((vault_items vi
             LEFT JOIN cards c ON ((c.id = vi.card_id)))
             LEFT JOIN v_card_images img ON ((img.id = vi.card_id)))
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
           FROM prices pr
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
   FROM (((v_vault_items vvi
     JOIN vault_items vi ON ((vi.id = vvi.id)))
     LEFT JOIN v_best_prices_all bp ON ((bp.card_id = vvi.card_id)))
     LEFT JOIN condition_multipliers cm ON ((cm.condition_label = vi.condition_label)));


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
   FROM v_vault_items
  ORDER BY created_at DESC
 LIMIT 100;


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


create policy "anyone can read prices"
on "public"."market_prices"
as permissive
for select
to authenticated
using (true);


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


CREATE TRIGGER trg_alerts_set_uid BEFORE INSERT ON public.alerts FOR EACH ROW EXECUTE FUNCTION set_auth_uid();

CREATE TRIGGER trg_append_price_tick AFTER INSERT OR UPDATE ON public.card_prices FOR EACH ROW EXECUTE FUNCTION _append_price_tick();

CREATE TRIGGER trg_fill_price_obs_print_id BEFORE INSERT ON public.price_observations FOR EACH ROW EXECUTE FUNCTION fill_price_obs_print_id();

CREATE TRIGGER trg_scans_set_auth_uid BEFORE INSERT ON public.scans FOR EACH ROW EXECUTE FUNCTION set_auth_uid();

CREATE TRIGGER trg_vault_items_set_uid BEFORE INSERT ON public.vault_items FOR EACH ROW EXECUTE FUNCTION set_auth_uid();


