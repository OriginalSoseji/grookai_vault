

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "admin";


ALTER SCHEMA "admin" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "ingest";


ALTER SCHEMA "ingest" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."price_currency" AS ENUM (
    'USD',
    'EUR',
    'MXN'
);


ALTER TYPE "public"."price_currency" OWNER TO "postgres";


CREATE TYPE "public"."price_kind" AS ENUM (
    'listing',
    'sold',
    'floor',
    'median',
    'average',
    'low',
    'high',
    'shop_sale'
);


ALTER TYPE "public"."price_kind" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "admin"."import_prices_do"("_payload" "jsonb", "_bridge_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if _bridge_token is distinct from current_setting('app.bridge_token', true) then
    raise exception 'unauthorized';
  end if;
  -- TODO: perform the real inserts/updates using _payload
  return jsonb_build_object('ok', true, 'received', _payload);
end;
$$;


ALTER FUNCTION "admin"."import_prices_do"("_payload" "jsonb", "_bridge_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ingest"."merge_card_prints"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'ingest', 'public'
    AS $$
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
end$$;


ALTER FUNCTION "ingest"."merge_card_prints"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_append_price_tick"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
end $$;


ALTER FUNCTION "public"."_append_price_tick"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_wall_refresh_mv"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    BEGIN
      BEGIN
        REFRESH MATERIALIZED VIEW public.wall_thumbs_3x4;
      EXCEPTION WHEN OTHERS THEN
        -- best-effort in local/dev; ignore refresh failures
        NULL;
      END;
      RETURN NULL;
    END
    $$;


ALTER FUNCTION "public"."_wall_refresh_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid
$$;


ALTER FUNCTION "public"."auth_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."card_history"("_set_code" "text", "_number" "text", "_source" "text" DEFAULT 'tcgplayer'::"text", "_hours" integer DEFAULT 168) RETURNS TABLE("ts" timestamp with time zone, "market" numeric)
    LANGUAGE "sql"
    AS $$
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
$$;


ALTER FUNCTION "public"."card_history"("_set_code" "text", "_number" "text", "_source" "text", "_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_vault_values"("days_window" integer DEFAULT 30) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."compute_vault_values"("days_window" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_refresh_latest_card_prices"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."enqueue_refresh_latest_card_prices"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fill_price_obs_print_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.print_id is null then
    select id into new.print_id
    from public.card_prints
    where set_code = new.set_code and number = new.number
    order by id
    limit 1;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."fill_price_obs_print_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_mojibake_common"("t" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(t, 'ÃƒÂ©', 'Ã©', 'g'),
                              'ÃƒÂ¨', 'Ã¨', 'g'),
                            'ÃƒÂ¡', 'Ã¡', 'g'),
                          'ÃƒÂ±', 'Ã±', 'g'),
                        'Ã¢â‚¬â„¢', 'â€™', 'g')
$$;


ALTER FUNCTION "public"."fix_mojibake_common"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_mojibake_more"("t" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."fix_mojibake_more"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_prices_for_card"("p_card_id" "uuid") RETURNS TABLE("type" "text", "detail" "text", "price" numeric, "source" "text", "ts" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."get_all_prices_for_card"("p_card_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_market_price"("p_card_id" "uuid") RETURNS numeric
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select coalesce(mp.price, 0)
  from public.market_prices mp
  where mp.card_id = p_card_id
  order by mp.fetched_at desc
  limit 1;
$$;


ALTER FUNCTION "public"."get_market_price"("p_card_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gv_norm_name"("txt" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select regexp_replace(lower(unaccent(coalesce(txt,''))), '[^a-z0-9 ]', '', 'g')
$$;


ALTER FUNCTION "public"."gv_norm_name"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gv_num_int"("txt" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select nullif(regexp_replace(coalesce(txt,''), '^\D*?(\d+)(?:\/\d+)?\D*$', '\1'), '')::int
$_$;


ALTER FUNCTION "public"."gv_num_int"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gv_total_int"("txt" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select nullif(regexp_replace(coalesce(txt,''), '^\D*\d+\/(\d+)\D*$', '\1'), '')::int
$_$;


ALTER FUNCTION "public"."gv_total_int"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."job_log"("p_job_id" "uuid", "p_level" "text", "p_message" "text", "p_meta" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  insert into public.job_logs(job_id, level, message, meta)
  values (p_job_id, coalesce(p_level,'info'), p_message, p_meta);
$$;


ALTER FUNCTION "public"."job_log"("p_job_id" "uuid", "p_level" "text", "p_message" "text", "p_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_missing_price_sets"() RETURNS TABLE("set_code" "text", "missing" integer)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."list_missing_price_sets"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_set_codes"() RETURNS TABLE("set_code" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select distinct set_code
  from public.card_prints
  where set_code is not null
    and set_code <> 'UNCAT'
  order by set_code
$$;


ALTER FUNCTION "public"."list_set_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_jobs"("p_limit" integer DEFAULT 25) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."process_jobs"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_latest_card_prices_mv"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_latest_card_prices_mv"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_latest_prices"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  refresh materialized view concurrently public.latest_prices;
$$;


ALTER FUNCTION "public"."refresh_latest_prices"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_vault_market_prices"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.vault_items vi
  SET market_price   = lp.market_price,
      last_price_update = lp.ts
  FROM public.v_latest_prices lp
  WHERE vi.card_id = lp.card_id;
END;
$$;


ALTER FUNCTION "public"."refresh_vault_market_prices"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_vault_market_prices"("p_user" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  update public.vault_items vi
     set market_price     = lp.market_price,
         last_price_update = lp.ts
    from public.v_latest_prices lp
   where lp.card_id = vi.card_id
     and (p_user is null or vi.user_id = p_user);
$$;


ALTER FUNCTION "public"."refresh_vault_market_prices"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_vault_market_prices_all"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.refresh_vault_market_prices(null);
$$;


ALTER FUNCTION "public"."refresh_vault_market_prices_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_wall_thumbs_3x4"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_wall_thumbs_3x4"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_refresh_wall"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select (public.refresh_wall_thumbs_3x4(), 'ok')::text;
$$;


ALTER FUNCTION "public"."rpc_refresh_wall"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_set_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text", "p_card_id" "uuid", "p_market_price" numeric DEFAULT NULL::numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."rpc_set_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text", "p_card_id" "uuid", "p_market_price" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."card_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "card_print_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "low" numeric,
    "mid" numeric,
    "high" numeric,
    "market" numeric,
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "card_prices_source_check" CHECK (("source" = ANY (ARRAY['tcgplayer'::"text", 'cardmarket'::"text"])))
);


ALTER TABLE "public"."card_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_prints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" DEFAULT 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5'::"uuid" NOT NULL,
    "set_id" "uuid",
    "name" "text" NOT NULL,
    "number" "text",
    "variant_key" "text" DEFAULT ''::"text",
    "rarity" "text",
    "image_url" "text",
    "tcgplayer_id" "text",
    "external_ids" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "set_code" "text",
    "number_plain" "text" GENERATED ALWAYS AS ("regexp_replace"("number", '[^0-9]'::"text", ''::"text", 'g'::"text")) STORED,
    "artist" "text",
    "regulation_mark" "text",
    "image_alt_url" "text",
    "image_source" "text",
    "variants" "jsonb",
    CONSTRAINT "card_prints_image_source_check" CHECK (("image_source" = ANY (ARRAY['tcgdex'::"text", 'ptcg'::"text"])))
);


ALTER TABLE "public"."card_prints" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."latest_card_prices_v" AS
 WITH "ranked" AS (
         SELECT "cp"."id",
            "cp"."card_print_id",
            "cp"."source",
            "cp"."currency",
            "cp"."low",
            "cp"."mid",
            "cp"."high",
            "cp"."market",
            "cp"."last_updated",
            "row_number"() OVER (PARTITION BY "cp"."card_print_id" ORDER BY "cp"."last_updated" DESC) AS "rn"
           FROM "public"."card_prices" "cp"
        )
 SELECT "card_print_id" AS "card_id",
    "low" AS "price_low",
    "mid" AS "price_mid",
    "high" AS "price_high",
    "currency",
    "last_updated" AS "observed_at",
    "source",
    NULL::numeric AS "confidence",
    NULL::"text" AS "gi_algo_version",
    NULL::"text" AS "condition"
   FROM "ranked"
  WHERE ("rn" = 1);


ALTER VIEW "public"."latest_card_prices_v" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_card_search" AS
 SELECT "cp"."id",
    "cp"."name",
    "cp"."set_code",
    "cp"."number",
    "cp"."number" AS "number_raw",
    "regexp_replace"(COALESCE("cp"."number", ''::"text"), '[^0-9]'::"text", ''::"text", 'g'::"text") AS "number_digits",
        CASE
            WHEN ("regexp_replace"(COALESCE("cp"."number", ''::"text"), '[^0-9]'::"text", ''::"text", 'g'::"text") <> ''::"text") THEN "lpad"("regexp_replace"(COALESCE("cp"."number", ''::"text"), '[^0-9]'::"text", ''::"text", 'g'::"text"), 3, '0'::"text")
            ELSE NULL::"text"
        END AS "number_padded",
        CASE
            WHEN ("cp"."number" ~ '\\d+\\s*/\\s*\\d+'::"text") THEN (("lpad"("regexp_replace"("cp"."number", '^\\D*?(\\d+).*$'::"text", '\\1'::"text"), 3, '0'::"text") || '/'::"text") || "regexp_replace"("cp"."number", '^.*?/(\\d+).*$'::"text", '\\1'::"text"))
            ELSE NULL::"text"
        END AS "number_slashed",
    COALESCE("cp"."rarity", NULL::"text") AS "rarity",
    COALESCE("cp"."image_url", "cp"."image_alt_url") AS "image_url",
    COALESCE("cp"."image_url", "cp"."image_alt_url") AS "thumb_url",
    COALESCE("cp"."image_url", "cp"."image_alt_url") AS "image_best",
    "pr"."latest_price_cents",
        CASE
            WHEN ("pr"."latest_price_cents" IS NOT NULL) THEN (("pr"."latest_price_cents")::numeric / 100.0)
            ELSE NULL::numeric
        END AS "latest_price",
    "lower"("cp"."name") AS "name_lc",
    NULL::numeric AS "search_rank"
   FROM ("public"."card_prints" "cp"
     LEFT JOIN LATERAL ( SELECT ("round"((COALESCE("p"."price_mid", "p"."price_high", "p"."price_low") * (100)::numeric)))::integer AS "latest_price_cents"
           FROM "public"."latest_card_prices_v" "p"
          WHERE ("p"."card_id" = "cp"."id")
          ORDER BY
                CASE
                    WHEN ("lower"(COALESCE("p"."condition", ''::"text")) = ANY (ARRAY['nm'::"text", 'near mint'::"text", 'lp'::"text", 'lightly played'::"text", 'raw'::"text"])) THEN 0
                    ELSE 1
                END, "p"."observed_at" DESC NULLS LAST
         LIMIT 1) "pr" ON (true));


ALTER VIEW "public"."v_card_search" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_card_search" IS 'Stable app-facing search view. Guarantees image_best, image_url, thumb_url, number(+variants), and latest prices when available.';



CREATE OR REPLACE FUNCTION "public"."search_cards"("q" "text", "limit" integer DEFAULT 50, "offset" integer DEFAULT 0) RETURNS SETOF "public"."v_card_search"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT * FROM public.v_card_search
      WHERE (q IS NULL OR q = '' OR name ILIKE '%' || q || '%')
      ORDER BY name
      LIMIT  GREATEST(1, COALESCE("limit", 50))
      OFFSET GREATEST(0, COALESCE("offset", 0)); $$;


ALTER FUNCTION "public"."search_cards"("q" "text", "limit" integer, "offset" integer) OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_cards_search_v2" AS
 SELECT "id",
    "name",
    "number",
    "set_code",
    "rarity",
    NULL::"text" AS "supertype",
    NULL::"text"[] AS "subtypes",
    "public"."gv_norm_name"("name") AS "name_norm",
    "public"."gv_num_int"("number") AS "number_int",
    "public"."gv_total_int"("number") AS "total_int"
   FROM "public"."card_prints" "cp";


ALTER VIEW "public"."v_cards_search_v2" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_cards_in_set"("q" "text", "set_code" "text", "limit" integer DEFAULT 50) RETURNS SETOF "public"."v_cards_search_v2"
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."search_cards_in_set"("q" "text", "set_code" "text", "limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_auth_uid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_auth_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;


ALTER FUNCTION "public"."set_timestamp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_vault_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text") RETURNS "void"
    LANGUAGE "sql"
    AS $$
UPDATE public.vault_items
SET condition_label = p_condition_label,
    is_graded       = false,
    grade_company   = NULL,
    grade_value     = NULL,
    grade_label     = NULL
WHERE id = p_vault_item_id;
$$;


ALTER FUNCTION "public"."set_vault_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_vault_item_grade"("p_vault_item_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text") RETURNS "void"
    LANGUAGE "sql"
    AS $$
UPDATE public.vault_items
SET is_graded     = true,
    grade_company = p_grade_company,
    grade_value   = p_grade_value,
    grade_label   = p_grade_label
WHERE id = p_vault_item_id;
$$;


ALTER FUNCTION "public"."set_vault_item_grade"("p_vault_item_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."squash_ws"("text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select btrim(regexp_replace($1, '\s+', ' ', 'g'));
$_$;


ALTER FUNCTION "public"."squash_ws"("text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."strip_control"("text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select translate($1,
    chr(0)||chr(1)||chr(2)||chr(3)||chr(4)||chr(5)||chr(6)||chr(7)||
    chr(8)||chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(14)||chr(15)||
    chr(16)||chr(17)||chr(18)||chr(19)||chr(20)||chr(21)||chr(22)||chr(23)||
    chr(24)||chr(25)||chr(26)||chr(27)||chr(28)||chr(29)||chr(30)||chr(31)||
    chr(127),
    repeat(' ', 33)
  );
$_$;


ALTER FUNCTION "public"."strip_control"("text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."top_movers_24h"("limit_n" integer DEFAULT 25, "only_positive" boolean DEFAULT false) RETURNS TABLE("card_print_id" "uuid", "name" "text", "set_code" "text", "number" "text", "source" "text", "market_now" numeric, "market_24h" numeric, "pct_change_24h" numeric)
    LANGUAGE "sql"
    AS $$
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
$$;


ALTER FUNCTION "public"."top_movers_24h"("limit_n" integer, "only_positive" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_condition_price"("p_card_id" "uuid", "p_condition_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric DEFAULT NULL::numeric, "p_currency" "text" DEFAULT 'USD'::"text", "p_source" "text" DEFAULT 'manual'::"text", "p_ts" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "sql"
    AS $$
INSERT INTO public.condition_prices (card_id, condition_label, currency, market_price, last_sold_price, source, ts)
VALUES (p_card_id, p_condition_label, p_currency, p_market_price, p_last_sold_price, p_source, p_ts)
ON CONFLICT (card_id, condition_label, currency)
DO UPDATE SET
  market_price    = EXCLUDED.market_price,
  last_sold_price = EXCLUDED.last_sold_price,
  source          = EXCLUDED.source,
  ts              = EXCLUDED.ts;
$$;


ALTER FUNCTION "public"."upsert_condition_price"("p_card_id" "uuid", "p_condition_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_graded_price"("p_card_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric DEFAULT NULL::numeric, "p_currency" "text" DEFAULT 'USD'::"text", "p_source" "text" DEFAULT 'manual'::"text", "p_ts" timestamp with time zone DEFAULT "now"()) RETURNS "void"
    LANGUAGE "sql"
    AS $$
INSERT INTO public.graded_prices (card_id, grade_company, grade_value, grade_label, currency, market_price, last_sold_price, source, ts)
VALUES (p_card_id, p_grade_company, p_grade_value, p_grade_label, p_currency, p_market_price, p_last_sold_price, p_source, p_ts)
ON CONFLICT (card_id, grade_company, grade_value, currency)
DO UPDATE SET
  grade_label     = EXCLUDED.grade_label,
  market_price    = EXCLUDED.market_price,
  last_sold_price = EXCLUDED.last_sold_price,
  source          = EXCLUDED.source,
  ts              = EXCLUDED.ts;
$$;


ALTER FUNCTION "public"."upsert_graded_price"("p_card_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vault_add_item"("p_user_id" "uuid", "p_card_id" "uuid", "p_condition_label" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare v_id uuid;
begin
  insert into public.vault_items(user_id, card_id, condition_label)
  values (p_user_id, p_card_id, p_condition_label)
  returning id into v_id;
  return v_id;
end $$;


ALTER FUNCTION "public"."vault_add_item"("p_user_id" "uuid", "p_card_id" "uuid", "p_condition_label" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vault_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL,
    "qty" integer DEFAULT 1 NOT NULL,
    "acquisition_cost" numeric(10,2),
    "condition_label" "text",
    "condition_score" integer,
    "is_graded" boolean DEFAULT false,
    "grade_company" "text",
    "grade_value" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "set_name" "text",
    "photo_url" "text",
    "market_price" numeric,
    "last_price_update" timestamp with time zone,
    "grade_label" "text"
);


ALTER TABLE "public"."vault_items" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vault_add_or_increment"("p_card_id" "uuid", "p_delta_qty" integer, "p_condition_label" "text" DEFAULT 'NM'::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."vault_items"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  insert into public.vault_items (user_id, card_id, qty, condition_label, notes)
  values (auth.uid(), p_card_id, greatest(1, p_delta_qty), p_condition_label, nullif(p_notes, ''))
  on conflict (user_id, card_id)
  do update set
    qty = public.vault_items.qty + greatest(1, p_delta_qty),
    condition_label = coalesce(excluded.condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(excluded.notes, ''), public.vault_items.notes)
  returning *;
$$;


ALTER FUNCTION "public"."vault_add_or_increment"("p_card_id" "uuid", "p_delta_qty" integer, "p_condition_label" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vault_inc_qty"("item_id" "uuid", "inc" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.vault_items
  SET qty = qty + inc
  WHERE id = item_id;
END;
$$;


ALTER FUNCTION "public"."vault_inc_qty"("item_id" "uuid", "inc" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vault_post_to_wall"("vault_item_id" "uuid", "price_cents" integer, "quantity" integer, "condition" "text" DEFAULT NULL::"text", "note" "text" DEFAULT NULL::"text", "use_vault_image" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."vault_post_to_wall"("vault_item_id" "uuid", "price_cents" integer, "quantity" integer, "condition" "text", "note" "text", "use_vault_image" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wishlist_totals"() RETURNS TABLE("items" integer, "wishlist_value" numeric, "last_updated" timestamp with time zone)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."wishlist_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wishlist_totals_for"("p_user" "uuid") RETURNS TABLE("items" integer, "wishlist_value" numeric, "last_updated" timestamp with time zone)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."wishlist_totals_for"("p_user" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "admin"."import_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "text" NOT NULL,
    "scope" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "error" "text"
);


ALTER TABLE "admin"."import_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "ingest"."card_prints_raw" (
    "game_code" "text" NOT NULL,
    "set_code" "text",
    "name" "text" NOT NULL,
    "number" "text",
    "variant_key" "text" DEFAULT ''::"text",
    "rarity" "text",
    "image_url" "text",
    "tcgplayer_id" "text",
    "external_ids" "jsonb" DEFAULT '{}'::"jsonb",
    "source" "text",
    "checksum" "text",
    "loaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "ingest"."card_prints_raw" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_import_card_prints" (
    "game" "text" NOT NULL,
    "set_code" "text" NOT NULL,
    "external_id" "text",
    "number" "text" NOT NULL,
    "name" "text" NOT NULL,
    "rarity" "text",
    "supertype" "text",
    "subtype" "text",
    "image_url" "text"
);


ALTER TABLE "public"."_import_card_prints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_import_sets" (
    "game" "text" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "release_date" "date",
    "logo_url" "text",
    "symbol_url" "text"
);


ALTER TABLE "public"."_import_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL,
    "rule" "jsonb" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" boolean DEFAULT true NOT NULL,
    "allow_client_condition_edits" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backup_card_prints_null_utc" (
    "id" "uuid",
    "game_id" "uuid",
    "set_id" "uuid",
    "name" "text",
    "number" "text",
    "variant_key" "text",
    "rarity" "text",
    "image_url" "text",
    "tcgplayer_id" "text",
    "external_ids" "jsonb",
    "updated_at" timestamp with time zone,
    "set_code" "text",
    "number_plain" "text"
);


ALTER TABLE "public"."backup_card_prints_null_utc" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "set_code" "text" NOT NULL,
    "set_name" "text" NOT NULL,
    "card_number" "text" NOT NULL,
    "name" "text" NOT NULL,
    "rarity" "text",
    "image_url" "text" NOT NULL,
    "released_at" "date"
);


ALTER TABLE "public"."card_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_price_observations" (
    "id" bigint NOT NULL,
    "card_print_id" "uuid" NOT NULL,
    "source_id" "text" NOT NULL,
    "observed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "currency" "public"."price_currency" DEFAULT 'USD'::"public"."price_currency" NOT NULL,
    "value" numeric(12,2) NOT NULL,
    "kind" "public"."price_kind" NOT NULL,
    "qty" integer DEFAULT 1 NOT NULL,
    "meta" "jsonb"
);


ALTER TABLE "public"."card_price_observations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."card_price_observations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."card_price_observations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."card_price_observations_id_seq" OWNED BY "public"."card_price_observations"."id";



CREATE TABLE IF NOT EXISTS "public"."card_price_rollups" (
    "card_print_id" "uuid" NOT NULL,
    "currency" "public"."price_currency" DEFAULT 'USD'::"public"."price_currency" NOT NULL,
    "vault_value" numeric(12,2) NOT NULL,
    "last_computed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sample_size" integer DEFAULT 0 NOT NULL,
    "method" "text" NOT NULL,
    "source_breakdown" "jsonb"
);


ALTER TABLE "public"."card_price_rollups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card_price_ticks" (
    "id" bigint NOT NULL,
    "card_print_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "market" numeric,
    "low" numeric,
    "mid" numeric,
    "high" numeric,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "card_price_ticks_source_check" CHECK (("source" = ANY (ARRAY['tcgplayer'::"text", 'cardmarket'::"text"])))
);


ALTER TABLE "public"."card_price_ticks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."card_price_ticks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."card_price_ticks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."card_price_ticks_id_seq" OWNED BY "public"."card_price_ticks"."id";



CREATE OR REPLACE VIEW "public"."card_prints_clean" AS
 SELECT "id",
    "game_id",
    "set_id",
    "name",
    "number",
    "variant_key",
    "rarity",
    "image_url",
    "tcgplayer_id",
    "external_ids",
    "updated_at",
    "set_code",
    "number_plain",
    "artist",
    "regulation_mark",
    "image_alt_url",
    "image_source",
    "variants",
    "public"."squash_ws"("public"."strip_control"("public"."fix_mojibake_more"("public"."fix_mojibake_common"("name")))) AS "name_display",
    "public"."unaccent"("public"."squash_ws"("public"."strip_control"("public"."fix_mojibake_more"("public"."fix_mojibake_common"("name"))))) AS "name_search"
   FROM "public"."card_prints" "cp";


ALTER VIEW "public"."card_prints_clean" OWNER TO "postgres";


COMMENT ON VIEW "public"."card_prints_clean" IS 'card_prints with sanitized name_display and unaccented name_search';



CREATE OR REPLACE VIEW "public"."card_prints_public" AS
 SELECT "set_code",
    "number",
    "name",
    "rarity",
    "image_url"
   FROM "public"."card_prints";


ALTER VIEW "public"."card_prints_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game" "text" DEFAULT 'pokemon'::"text" NOT NULL,
    "set_id" "uuid",
    "number" "text",
    "name" "text" NOT NULL,
    "variant" "text",
    "tcgplayer_id" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rarity" "text"
);


ALTER TABLE "public"."cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."condition_multipliers" (
    "condition_label" "text" NOT NULL,
    "multiplier" numeric NOT NULL
);


ALTER TABLE "public"."condition_multipliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."condition_prices" (
    "id" bigint NOT NULL,
    "card_id" "uuid" NOT NULL,
    "condition_label" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "market_price" numeric,
    "last_sold_price" numeric,
    "source" "text",
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."condition_prices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."condition_prices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."condition_prices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."condition_prices_id_seq" OWNED BY "public"."condition_prices"."id";



CREATE TABLE IF NOT EXISTS "public"."dev_audit" (
    "id" bigint NOT NULL,
    "ts" timestamp with time zone DEFAULT "now"(),
    "actor" "text",
    "endpoint" "text",
    "payload" "jsonb",
    "note" "text"
);


ALTER TABLE "public"."dev_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dev_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dev_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dev_audit_id_seq" OWNED BY "public"."dev_audit"."id";



CREATE TABLE IF NOT EXISTS "public"."external_cache" (
    "cache_key" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "query_hash" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" integer NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."external_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_provider_stats" (
    "id" bigint NOT NULL,
    "provider" "text" NOT NULL,
    "metric" "text" NOT NULL,
    "value" numeric NOT NULL,
    "window_label" "text" DEFAULT '1d'::"text" NOT NULL,
    "observed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."external_provider_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."external_provider_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."external_provider_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."external_provider_stats_id_seq" OWNED BY "public"."external_provider_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."fx_daily" (
    "d" "date" NOT NULL,
    "usd_per_eur" numeric(12,6) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fx_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text"
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."graded_prices" (
    "id" bigint NOT NULL,
    "card_id" "uuid" NOT NULL,
    "grade_company" "text" NOT NULL,
    "grade_value" numeric NOT NULL,
    "grade_label" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "market_price" numeric,
    "last_sold_price" numeric,
    "pop_total" integer,
    "source" "text",
    "ts" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."graded_prices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."graded_prices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."graded_prices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."graded_prices_id_seq" OWNED BY "public"."graded_prices"."id";



CREATE TABLE IF NOT EXISTS "public"."has_currency" (
    "exists" boolean
);


ALTER TABLE "public"."has_currency" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."has_high" (
    "exists" boolean
);


ALTER TABLE "public"."has_high" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."has_low" (
    "exists" boolean
);


ALTER TABLE "public"."has_low" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."has_mid" (
    "exists" boolean
);


ALTER TABLE "public"."has_mid" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."has_source" (
    "exists" boolean
);


ALTER TABLE "public"."has_source" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_image_errors" (
    "id" bigint NOT NULL,
    "card_print_id" "uuid",
    "set_code" "text",
    "number" "text",
    "source" "text",
    "attempted_url" "text",
    "err" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."import_image_errors" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."import_image_errors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."import_image_errors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."import_image_errors_id_seq" OWNED BY "public"."import_image_errors"."id";



CREATE TABLE IF NOT EXISTS "public"."job_logs" (
    "id" bigint NOT NULL,
    "job_id" "uuid" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "level" "text" DEFAULT 'info'::"text" NOT NULL,
    "message" "text",
    "meta" "jsonb"
);


ALTER TABLE "public"."job_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."job_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."job_logs_id_seq" OWNED BY "public"."job_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 5 NOT NULL,
    "last_error" "text",
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."latest_card_prices_mv" AS
 SELECT "card_id",
    NULL::"text" AS "condition_label",
    "price_low",
    "price_mid",
    "price_high",
    "currency",
    "observed_at",
    "source",
    "confidence",
    "gi_algo_version"
   FROM "public"."latest_card_prices_v"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."latest_card_prices_mv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."price_observations" (
    "id" bigint NOT NULL,
    "print_id" "uuid",
    "condition" "text",
    "grade_agency" "text",
    "grade_value" "text",
    "grade_qualifier" "text",
    "source" "text" NOT NULL,
    "listing_type" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "price_usd" numeric(12,2) NOT NULL,
    "quantity" integer,
    "observed_at" timestamp with time zone NOT NULL,
    "imported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "set_code" "text" DEFAULT ''::"text" NOT NULL,
    "number" "text" DEFAULT ''::"text" NOT NULL,
    "variant" "text" DEFAULT ''::"text" NOT NULL,
    "price_market" numeric,
    "price_mid" numeric,
    "price_low" numeric,
    "price_high" numeric,
    CONSTRAINT "price_observations_condition_check" CHECK (("condition" = ANY (ARRAY['NM'::"text", 'LP'::"text", 'MP'::"text", 'HP'::"text", 'DMG'::"text"]))),
    CONSTRAINT "price_observations_grade_agency_check" CHECK (("grade_agency" = ANY (ARRAY['PSA'::"text", 'BGS'::"text", 'CGC'::"text", 'ACE'::"text", 'AGS'::"text"]))),
    CONSTRAINT "price_observations_listing_type_check" CHECK (("listing_type" = ANY (ARRAY['sold'::"text", 'list'::"text", 'auction'::"text"]))),
    CONSTRAINT "price_observations_price_usd_check" CHECK (("price_usd" >= (0)::numeric))
);


ALTER TABLE "public"."price_observations" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."latest_prices" AS
 SELECT DISTINCT ON ("print_id", COALESCE("condition", '_'::"text"), COALESCE("grade_agency", '_'::"text"), COALESCE("grade_value", '_'::"text"), "source") "print_id",
    "condition",
    "grade_agency",
    "grade_value",
    "source",
    "price_usd",
    "observed_at"
   FROM "public"."price_observations" "po"
  ORDER BY "print_id", COALESCE("condition", '_'::"text"), COALESCE("grade_agency", '_'::"text"), COALESCE("grade_value", '_'::"text"), "source", "observed_at" DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."latest_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "thumb_3x4_url" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."listing_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "title" "text",
    "description" "text",
    "price_cents" integer,
    "currency" "text" DEFAULT 'USD'::"text",
    "condition" "text",
    "visibility" "text" DEFAULT 'public'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "location_city" "text",
    "location_region" "text",
    "location_country" "text",
    "primary_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "card_print_id" "uuid",
    "vault_item_id" "uuid",
    "condition_tier" "text",
    "quantity" integer DEFAULT 1,
    "note" "text",
    "image_url" "text"
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "card_id" "uuid" NOT NULL,
    "price" numeric NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "market_prices_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."market_prices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."price_observations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."price_observations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."price_observations_id_seq" OWNED BY "public"."price_observations"."id";



CREATE TABLE IF NOT EXISTS "public"."price_rollup_config" (
    "id" integer NOT NULL,
    "method" "text" DEFAULT 'weighted_average'::"text" NOT NULL,
    "currency" "public"."price_currency" DEFAULT 'USD'::"public"."price_currency" NOT NULL,
    "weights" "jsonb" NOT NULL
);


ALTER TABLE "public"."price_rollup_config" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."price_rollup_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."price_rollup_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."price_rollup_config_id_seq" OWNED BY "public"."price_rollup_config"."id";



CREATE TABLE IF NOT EXISTS "public"."price_sources" (
    "id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."price_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prices" (
    "id" bigint NOT NULL,
    "card_id" "uuid" NOT NULL,
    "ts" timestamp with time zone NOT NULL,
    "market_price" numeric(10,2),
    "source" "text",
    "set_code" "text",
    "number" "text",
    "mapped_via" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "name" "text",
    "image_url" "text"
);


ALTER TABLE "public"."prices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."prices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."prices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."prices_id_seq" OWNED BY "public"."prices"."id";



CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vault_item_id" "uuid" NOT NULL,
    "images" "jsonb" NOT NULL,
    "device_meta" "jsonb",
    "score" integer,
    "label" "text",
    "confidence" numeric(4,2),
    "defects" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."set_sync_audit" (
    "id" bigint NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_api" integer NOT NULL,
    "total_db" integer NOT NULL,
    "missing_count" integer NOT NULL,
    "extra_count" integer NOT NULL,
    "missing" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "extra" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "fix" "jsonb"
);


ALTER TABLE "public"."set_sync_audit" OWNER TO "postgres";


ALTER TABLE "public"."set_sync_audit" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."set_sync_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game" "text" DEFAULT 'pokemon'::"text" NOT NULL,
    "code" "text",
    "name" "text",
    "release_date" "date",
    "source" "jsonb" DEFAULT '{}'::"jsonb",
    "logo_url" "text",
    "symbol_url" "text"
);


ALTER TABLE "public"."sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unmatched_price_rows" (
    "id" bigint NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "reason" "text" NOT NULL,
    "seen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."unmatched_price_rows" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."unmatched_price_rows_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."unmatched_price_rows_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."unmatched_price_rows_id_seq" OWNED BY "public"."unmatched_price_rows"."id";



CREATE OR REPLACE VIEW "public"."v_best_prices_all" AS
 WITH "base" AS (
         SELECT DISTINCT ON ("pr"."card_id") "pr"."card_id",
            "pr"."market_price" AS "base_market",
            "pr"."source" AS "base_source",
            "pr"."ts" AS "base_ts"
           FROM "public"."prices" "pr"
          WHERE (("pr"."currency" = 'USD'::"text") AND ("pr"."market_price" IS NOT NULL))
          ORDER BY "pr"."card_id", "pr"."ts" DESC NULLS LAST
        ), "cond" AS (
         SELECT DISTINCT ON ("cp"."card_id", "cp"."condition_label") "cp"."card_id",
            "cp"."condition_label",
            "cp"."market_price" AS "cond_market",
            "cp"."source" AS "cond_source",
            "cp"."ts" AS "cond_ts"
           FROM "public"."condition_prices" "cp"
          WHERE (("cp"."currency" = 'USD'::"text") AND ("cp"."market_price" IS NOT NULL))
          ORDER BY "cp"."card_id", "cp"."condition_label", "cp"."ts" DESC NULLS LAST
        ), "grad" AS (
         SELECT DISTINCT ON ("gp"."card_id", "gp"."grade_company", "gp"."grade_value") "gp"."card_id",
            "gp"."grade_company",
            "gp"."grade_value",
            "gp"."grade_label",
            "gp"."market_price" AS "grad_market",
            "gp"."source" AS "grad_source",
            "gp"."ts" AS "grad_ts"
           FROM "public"."graded_prices" "gp"
          WHERE (("gp"."currency" = 'USD'::"text") AND ("gp"."market_price" IS NOT NULL))
          ORDER BY "gp"."card_id", "gp"."grade_company", "gp"."grade_value", "gp"."ts" DESC NULLS LAST
        )
 SELECT COALESCE("grad"."card_id", "cond"."card_id", "base"."card_id") AS "card_id",
    "base"."base_market",
    "base"."base_source",
    "base"."base_ts",
    "cond"."condition_label",
    "cond"."cond_market",
    "cond"."cond_source",
    "cond"."cond_ts",
    "grad"."grade_company",
    "grad"."grade_value",
    "grad"."grade_label",
    "grad"."grad_market",
    "grad"."grad_source",
    "grad"."grad_ts"
   FROM (("base"
     FULL JOIN "cond" ON (("cond"."card_id" = "base"."card_id")))
     FULL JOIN "grad" ON (("grad"."card_id" = COALESCE("base"."card_id", "cond"."card_id"))));


ALTER VIEW "public"."v_best_prices_all" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_card_images" AS
 SELECT "id",
    "set_code",
    "number",
    "name",
    COALESCE("image_url", "image_alt_url") AS "image_best",
    "image_url",
    "image_alt_url",
    "image_source"
   FROM "public"."card_prints";


ALTER VIEW "public"."v_card_images" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_card_prices_usd" AS
 SELECT "cp"."id" AS "card_print_id",
    "cp"."set_code",
    "cp"."number",
    "cp"."name",
    "cp"."image_url",
    "r"."vault_value",
    "r"."sample_size",
    "r"."last_computed_at"
   FROM ("public"."card_prints" "cp"
     LEFT JOIN "public"."card_price_rollups" "r" ON ((("r"."card_print_id" = "cp"."id") AND ("r"."currency" = 'USD'::"public"."price_currency"))));


ALTER VIEW "public"."v_card_prices_usd" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_card_prints" AS
 SELECT "id",
    "set_code",
    "number",
    "name",
    COALESCE("image_url", "image_alt_url") AS "image_best",
    "image_url",
    "image_alt_url",
    "image_source" AS "source",
    "updated_at"
   FROM "public"."card_prints" "cp";


ALTER VIEW "public"."v_card_prints" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_card_prints_badges" AS
 SELECT "v"."id",
    "v"."name",
    "v"."number",
    "v"."set_code",
    "v"."source",
    "v"."image_url",
    "v"."image_best",
    "v"."image_alt_url",
    "v"."updated_at",
    "cp"."rarity",
    (((NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" ->> 'firstEdition'::"text"))::boolean AS "first_edition",
    (((NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" ->> 'shadowless'::"text"))::boolean AS "shadowless",
    (((NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" ->> 'holo'::"text"))::boolean AS "holo",
    COALESCE((((NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" ->> 'reverse'::"text"))::boolean, (((NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" ->> 'reverseHolo'::"text"))::boolean) AS "reverse_holo",
    (((NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" ->> 'stamped'::"text"))::boolean AS "stamped",
    (((NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" ->> 'error'::"text"))::boolean AS "error_variant",
    (NULLIF(("cp"."variants")::"text", 'null'::"text"))::"jsonb" AS "variants"
   FROM ("public"."v_card_prints" "v"
     LEFT JOIN "public"."card_prints" "cp" ON ((("cp"."set_code" = "v"."set_code") AND ("cp"."number" = "v"."number"))));


ALTER VIEW "public"."v_card_prints_badges" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_latest_price" AS
 SELECT DISTINCT ON ("card_print_id", "source") "card_print_id",
    "source",
    "currency",
    "market",
    "low",
    "mid",
    "high",
    "captured_at"
   FROM "public"."card_price_ticks"
  ORDER BY "card_print_id", "source", "captured_at" DESC;


ALTER VIEW "public"."v_latest_price" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_latest_price_by_card" AS
 SELECT "id",
    "card_id",
    "ts",
    "market_price",
    "source",
    "set_code",
    "number",
    "mapped_via",
    "rn"
   FROM ( SELECT "p_1"."id",
            "p_1"."card_id",
            "p_1"."ts",
            "p_1"."market_price",
            "p_1"."source",
            "p_1"."set_code",
            "p_1"."number",
            "p_1"."mapped_via",
            "row_number"() OVER (PARTITION BY "p_1"."card_id", "p_1"."source" ORDER BY "p_1"."ts" DESC) AS "rn"
           FROM "public"."prices" "p_1") "p"
  WHERE ("rn" = 1);


ALTER VIEW "public"."v_latest_price_by_card" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_latest_price_clean" AS
 SELECT "card_print_id",
    "source",
    "currency",
    "market",
    "mid",
    "low",
        CASE
            WHEN (("high" IS NOT NULL) AND ("mid" IS NOT NULL) AND ("high" > ("mid" * (50)::numeric))) THEN NULL::numeric
            ELSE "high"
        END AS "high",
    "captured_at"
   FROM ( SELECT DISTINCT ON ("card_price_ticks"."card_print_id", "card_price_ticks"."source") "card_price_ticks"."card_print_id",
            "card_price_ticks"."source",
            "card_price_ticks"."currency",
            "card_price_ticks"."market",
            "card_price_ticks"."low",
            "card_price_ticks"."mid",
            "card_price_ticks"."high",
            "card_price_ticks"."captured_at"
           FROM "public"."card_price_ticks"
          ORDER BY "card_price_ticks"."card_print_id", "card_price_ticks"."source", "card_price_ticks"."captured_at" DESC) "l";


ALTER VIEW "public"."v_latest_price_clean" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_latest_price_pref" AS
 SELECT "id",
    "card_id",
    "ts",
    "market_price",
    "source",
    "set_code",
    "number",
    "mapped_via",
    "rn"
   FROM ( SELECT "p"."id",
            "p"."card_id",
            "p"."ts",
            "p"."market_price",
            "p"."source",
            "p"."set_code",
            "p"."number",
            "p"."mapped_via",
            "row_number"() OVER (PARTITION BY "p"."card_id" ORDER BY
                CASE
                    WHEN ("p"."source" = 'tcgdex'::"text") THEN 1
                    WHEN ("p"."source" = 'tcgplayer'::"text") THEN 2
                    ELSE 9
                END, "p"."ts" DESC) AS "rn"
           FROM "public"."prices" "p") "q"
  WHERE ("rn" = 1);


ALTER VIEW "public"."v_latest_price_pref" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_latest_prices" WITH ("security_invoker"='true') AS
 SELECT DISTINCT ON ("card_id") "card_id",
    "market_price",
    "source",
    "ts"
   FROM "public"."prices"
  WHERE ("market_price" IS NOT NULL)
  ORDER BY "card_id", "ts" DESC;


ALTER VIEW "public"."v_latest_prices" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_vault_items" AS
 WITH "base" AS (
         SELECT "vi"."id",
            "vi"."user_id",
            "vi"."card_id",
            "vi"."qty",
            "vi"."acquisition_cost",
            "vi"."condition_label",
            "vi"."condition_score",
            "vi"."is_graded",
            "vi"."grade_company",
            "vi"."grade_value",
            "vi"."notes",
            "vi"."created_at",
            "vi"."name",
            "vi"."set_name",
            "vi"."photo_url",
            "vi"."market_price",
            "vi"."last_price_update",
            COALESCE("img"."name", "c"."name", '(unknown)'::"text") AS "card_name",
            "img"."set_code",
            "img"."number" AS "img_number",
            "c"."number" AS "c_number",
            "c"."variant",
            "c"."tcgplayer_id",
            "c"."game",
            "img"."image_url",
            "img"."image_best",
            "img"."image_alt_url"
           FROM (("public"."vault_items" "vi"
             LEFT JOIN "public"."cards" "c" ON (("c"."id" = "vi"."card_id")))
             LEFT JOIN "public"."v_card_images" "img" ON (("img"."id" = "vi"."card_id")))
        ), "norm" AS (
         SELECT "base"."id",
            "base"."user_id",
            "base"."card_id",
            "base"."qty",
            "base"."acquisition_cost",
            "base"."condition_label",
            "base"."condition_score",
            "base"."is_graded",
            "base"."grade_company",
            "base"."grade_value",
            "base"."notes",
            "base"."created_at",
            "base"."name",
            "base"."set_name",
            "base"."photo_url",
            "base"."market_price",
            "base"."last_price_update",
            "base"."card_name",
            "base"."set_code",
            "base"."img_number",
            "base"."c_number",
            "base"."variant",
            "base"."tcgplayer_id",
            "base"."game",
            "base"."image_url",
            "base"."image_best",
            "base"."image_alt_url",
            NULLIF("ltrim"("regexp_replace"("regexp_replace"(COALESCE("base"."img_number", "base"."c_number", ''::"text"), '/.*$'::"text", ''::"text"), '\D'::"text", ''::"text", 'g'::"text"), '0'::"text"), ''::"text") AS "card_digits",
            "lower"("regexp_replace"(COALESCE("base"."img_number", "base"."c_number", ''::"text"), '[^0-9a-z]'::"text", ''::"text", 'g'::"text")) AS "card_num_norm"
           FROM "base"
        )
 SELECT "n"."id",
    "n"."user_id",
    "n"."card_id",
    COALESCE("n"."qty", 1) AS "qty",
    COALESCE("n"."qty", 1) AS "quantity",
    "p"."market_price" AS "market_price_raw",
    NULLIF("p"."market_price", (0)::numeric) AS "market_price",
    NULLIF("p"."market_price", (0)::numeric) AS "price",
    ((COALESCE("n"."qty", 1))::numeric * "p"."market_price") AS "line_total_raw",
    ((COALESCE("n"."qty", 1))::numeric * NULLIF("p"."market_price", (0)::numeric)) AS "line_total",
    ((COALESCE("n"."qty", 1))::numeric * NULLIF("p"."market_price", (0)::numeric)) AS "total",
    "p"."price_source",
    "p"."price_ts",
    "n"."created_at",
    "n"."card_name" AS "name",
    COALESCE("n"."img_number", "n"."c_number") AS "number",
    "n"."set_code",
    "n"."variant",
    "n"."tcgplayer_id",
    "n"."game",
    NULL::"text" AS "rarity",
    "n"."image_url",
    "n"."image_best",
    "n"."image_alt_url"
   FROM ("norm" "n"
     LEFT JOIN LATERAL ( SELECT "pr"."market_price",
            "pr"."source" AS "price_source",
            "pr"."ts" AS "price_ts"
           FROM "public"."prices" "pr"
          WHERE (("lower"("pr"."set_code") = "lower"("n"."set_code")) AND ((NULLIF("ltrim"("regexp_replace"("pr"."number", '\D'::"text", ''::"text", 'g'::"text"), '0'::"text"), ''::"text") = "n"."card_digits") OR ("lower"("regexp_replace"("pr"."number", '[^0-9a-z]'::"text", ''::"text", 'g'::"text")) = "n"."card_num_norm")) AND ("pr"."currency" = 'USD'::"text") AND ("pr"."market_price" IS NOT NULL))
          ORDER BY "pr"."ts" DESC NULLS LAST
         LIMIT 1) "p" ON (true));


ALTER VIEW "public"."v_vault_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_recently_added" AS
 SELECT "id",
    "user_id",
    "card_id",
    "qty",
    "quantity",
    "market_price_raw",
    "market_price",
    "price",
    "line_total_raw",
    "line_total",
    "total",
    "price_source",
    "price_ts",
    "created_at",
    "name",
    "number",
    "set_code",
    "variant",
    "tcgplayer_id",
    "game",
    "rarity",
    "image_url",
    "image_best",
    "image_alt_url"
   FROM "public"."v_vault_items"
  ORDER BY "created_at" DESC
 LIMIT 100;


ALTER VIEW "public"."v_recently_added" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_ticker_24h" AS
 WITH "latest" AS (
         SELECT DISTINCT ON ("t"."card_print_id", "t"."source") "t"."card_print_id",
            "t"."source",
            "t"."market" AS "market_now",
            "t"."captured_at" AS "ts_now"
           FROM "public"."card_price_ticks" "t"
          ORDER BY "t"."card_print_id", "t"."source", "t"."captured_at" DESC
        ), "prev24" AS (
         SELECT DISTINCT ON ("t"."card_print_id", "t"."source") "t"."card_print_id",
            "t"."source",
            "t"."market" AS "market_24h",
            "t"."captured_at" AS "ts_24h"
           FROM "public"."card_price_ticks" "t"
          WHERE ("t"."captured_at" <= ("now"() - '24:00:00'::interval))
          ORDER BY "t"."card_print_id", "t"."source", "t"."captured_at" DESC
        )
 SELECT "p"."id" AS "card_print_id",
    "p"."name",
    "p"."set_code",
    "p"."number",
    "l"."source",
    "l"."market_now",
    "pr"."market_24h",
        CASE
            WHEN (("pr"."market_24h" IS NULL) OR ("pr"."market_24h" = (0)::numeric)) THEN NULL::numeric
            ELSE "round"((((100)::numeric * ("l"."market_now" - "pr"."market_24h")) / "pr"."market_24h"), 2)
        END AS "pct_change_24h",
    "l"."ts_now" AS "last_updated"
   FROM (("latest" "l"
     JOIN "public"."card_prints" "p" ON (("p"."id" = "l"."card_print_id")))
     LEFT JOIN "prev24" "pr" ON ((("pr"."card_print_id" = "l"."card_print_id") AND ("pr"."source" = "l"."source"))));


ALTER VIEW "public"."v_ticker_24h" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_vault_items_ext" AS
 SELECT "vvi"."id",
    "vvi"."user_id",
    "vvi"."card_id",
    "vvi"."qty",
    "vvi"."quantity",
    "vvi"."market_price_raw",
    "vvi"."market_price",
    "vvi"."price",
    "vvi"."line_total_raw",
    "vvi"."line_total",
    "vvi"."total",
    "vvi"."price_source",
    "vvi"."price_ts",
    "vvi"."created_at",
    "vvi"."name",
    "vvi"."number",
    "vvi"."set_code",
    "vvi"."variant",
    "vvi"."tcgplayer_id",
    "vvi"."game",
    "vvi"."rarity",
    "vvi"."image_url",
    "vvi"."image_best",
    "vvi"."image_alt_url",
    "vi"."id" AS "vault_item_id",
    "vi"."condition_label",
    "vi"."is_graded",
    "vi"."grade_company",
    "vi"."grade_value",
    "vi"."grade_label",
        CASE
            WHEN ("vi"."is_graded" AND ("bp"."grad_market" IS NOT NULL)) THEN "bp"."grad_market"
            WHEN ("bp"."cond_market" IS NOT NULL) THEN "bp"."cond_market"
            WHEN (("vvi"."price" IS NOT NULL) AND ("vi"."condition_label" IS NOT NULL) AND ("cm"."multiplier" IS NOT NULL)) THEN ("vvi"."price" * "cm"."multiplier")
            ELSE "vvi"."price"
        END AS "effective_price",
        CASE
            WHEN ("vi"."is_graded" AND ("bp"."grad_market" IS NOT NULL)) THEN 'graded'::"text"
            WHEN ("bp"."cond_market" IS NOT NULL) THEN 'condition'::"text"
            WHEN (("vvi"."price" IS NOT NULL) AND ("vi"."condition_label" IS NOT NULL) AND ("cm"."multiplier" IS NOT NULL)) THEN 'derived'::"text"
            ELSE 'base'::"text"
        END AS "effective_mode",
        CASE
            WHEN ("vi"."is_graded" AND ("bp"."grad_market" IS NOT NULL)) THEN 'graded.market'::"text"
            WHEN ("bp"."cond_market" IS NOT NULL) THEN 'condition.market'::"text"
            WHEN (("vvi"."price" IS NOT NULL) AND ("vi"."condition_label" IS NOT NULL) AND ("cm"."multiplier" IS NOT NULL)) THEN 'multiplier'::"text"
            ELSE 'base'::"text"
        END AS "effective_source"
   FROM ((("public"."v_vault_items" "vvi"
     JOIN "public"."vault_items" "vi" ON (("vi"."id" = "vvi"."id")))
     LEFT JOIN "public"."v_best_prices_all" "bp" ON (("bp"."card_id" = "vvi"."card_id")))
     LEFT JOIN "public"."condition_multipliers" "cm" ON (("cm"."condition_label" = "vi"."condition_label")));


ALTER VIEW "public"."v_vault_items_ext" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."wall_thumbs_3x4" AS
 WITH "primary_img" AS (
         SELECT "li"."id" AS "listing_id",
            COALESCE("li"."primary_image_url", "max"(
                CASE
                    WHEN ("li2"."sort_order" = 0) THEN "li2"."thumb_3x4_url"
                    ELSE NULL::"text"
                END)) AS "thumb_url"
           FROM ("public"."listings" "li"
             LEFT JOIN "public"."listing_images" "li2" ON (("li2"."listing_id" = "li"."id")))
          GROUP BY "li"."id", "li"."primary_image_url"
        )
 SELECT "l"."id",
    "l"."owner_id",
    "l"."card_print_id" AS "card_id",
    "l"."title",
    "l"."price_cents",
    "l"."currency",
    "l"."condition",
    "l"."status",
    "l"."created_at",
    "pi"."thumb_url"
   FROM ("public"."listings" "l"
     LEFT JOIN "primary_img" "pi" ON (("pi"."listing_id" = "l"."id")))
  WHERE (("l"."visibility" = 'public'::"text") AND ("l"."status" = 'active'::"text"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."wall_thumbs_3x4" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."wall_feed_view" AS
 SELECT "id" AS "listing_id",
    "owner_id",
    "card_id",
    "title",
    "price_cents",
    "currency",
    "condition",
    "status",
    "created_at",
    "thumb_url"
   FROM "public"."wall_thumbs_3x4" "w"
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."wall_feed_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_wall_feed" AS
 SELECT "listing_id",
    "owner_id",
    "card_id",
    "title",
    "price_cents",
    "currency",
    "condition",
    "status",
    "created_at",
    "thumb_url"
   FROM "public"."wall_feed_view";


ALTER VIEW "public"."v_wall_feed" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_wall_feed" IS 'Compat alias of wall_feed_view. Prefer public.wall_feed_view in all callers.';



CREATE TABLE IF NOT EXISTS "public"."wishlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wishlist_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_wishlist_items" AS
 SELECT "wi"."id",
    "wi"."user_id",
    "wi"."card_id",
    "c"."name",
    "c"."set_code" AS "set_name",
    "c"."number",
    COALESCE("lp"."market_price", (0)::numeric) AS "market_price",
    "c"."image_url",
    "wi"."created_at"
   FROM (("public"."wishlist_items" "wi"
     LEFT JOIN "public"."card_prints" "c" ON (("c"."id" = "wi"."card_id")))
     LEFT JOIN "public"."v_latest_price_pref" "lp" ON (("lp"."card_id" = "wi"."card_id")));


ALTER VIEW "public"."v_wishlist_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_wishlist_value_by_user" AS
 WITH "picked" AS (
         SELECT "wi"."user_id",
            ( SELECT "l"."market"
                   FROM "public"."v_latest_price_clean" "l"
                  WHERE ("l"."card_print_id" = "wi"."card_id")
                  ORDER BY
                        CASE "l"."source"
                            WHEN 'tcgplayer'::"text" THEN 1
                            ELSE 2
                        END, "l"."captured_at" DESC
                 LIMIT 1) AS "market",
            ( SELECT "l"."captured_at"
                   FROM "public"."v_latest_price_clean" "l"
                  WHERE ("l"."card_print_id" = "wi"."card_id")
                  ORDER BY
                        CASE "l"."source"
                            WHEN 'tcgplayer'::"text" THEN 1
                            ELSE 2
                        END, "l"."captured_at" DESC
                 LIMIT 1) AS "ts"
           FROM "public"."wishlist_items" "wi"
        )
 SELECT "user_id",
    ("count"(*))::integer AS "items",
    COALESCE("sum"("market"), (0)::numeric) AS "wishlist_value",
    "max"("ts") AS "last_updated"
   FROM "picked"
  GROUP BY "user_id";


ALTER VIEW "public"."v_wishlist_value_by_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waitlist_email_check" CHECK ((POSITION(('@'::"text") IN ("email")) > 1))
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."wall_feed_v" AS
 SELECT "listing_id",
    "owner_id",
    "card_id",
    "title",
    "price_cents",
    "currency",
    "condition",
    "status",
    "created_at",
    "thumb_url"
   FROM "public"."wall_feed_view";


ALTER VIEW "public"."wall_feed_v" OWNER TO "postgres";


COMMENT ON VIEW "public"."wall_feed_v" IS 'Compat alias of wall_feed_view. Prefer public.wall_feed_view in all callers.';



ALTER TABLE ONLY "public"."card_price_observations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."card_price_observations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."card_price_ticks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."card_price_ticks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."condition_prices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."condition_prices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dev_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dev_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."external_provider_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."external_provider_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."graded_prices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."graded_prices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."import_image_errors" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."import_image_errors_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."job_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."job_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."price_observations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."price_observations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."price_rollup_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."price_rollup_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."prices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."prices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."unmatched_price_rows" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."unmatched_price_rows_id_seq"'::"regclass");



ALTER TABLE ONLY "admin"."import_runs"
    ADD CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_catalog"
    ADD CONSTRAINT "card_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_price_observations"
    ADD CONSTRAINT "card_price_observations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_price_rollups"
    ADD CONSTRAINT "card_price_rollups_pkey" PRIMARY KEY ("card_print_id");



ALTER TABLE ONLY "public"."card_price_ticks"
    ADD CONSTRAINT "card_price_ticks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_prices"
    ADD CONSTRAINT "card_prices_card_print_id_source_key" UNIQUE ("card_print_id", "source");



ALTER TABLE ONLY "public"."card_prices"
    ADD CONSTRAINT "card_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_prints"
    ADD CONSTRAINT "card_prints_game_set_num_key" UNIQUE ("game_id", "set_code", "number");



ALTER TABLE ONLY "public"."card_prints"
    ADD CONSTRAINT "card_prints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."condition_multipliers"
    ADD CONSTRAINT "condition_multipliers_pkey" PRIMARY KEY ("condition_label");



ALTER TABLE ONLY "public"."condition_prices"
    ADD CONSTRAINT "condition_prices_card_id_condition_label_currency_ts_key" UNIQUE ("card_id", "condition_label", "currency", "ts");



ALTER TABLE ONLY "public"."condition_prices"
    ADD CONSTRAINT "condition_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dev_audit"
    ADD CONSTRAINT "dev_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_cache"
    ADD CONSTRAINT "external_cache_pkey" PRIMARY KEY ("cache_key");



ALTER TABLE ONLY "public"."external_provider_stats"
    ADD CONSTRAINT "external_provider_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fx_daily"
    ADD CONSTRAINT "fx_daily_pkey" PRIMARY KEY ("d");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."graded_prices"
    ADD CONSTRAINT "graded_prices_card_id_grade_company_grade_value_currency_ts_key" UNIQUE ("card_id", "grade_company", "grade_value", "currency", "ts");



ALTER TABLE ONLY "public"."graded_prices"
    ADD CONSTRAINT "graded_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_image_errors"
    ADD CONSTRAINT "import_image_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_logs"
    ADD CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_images"
    ADD CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_prices"
    ADD CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_observations"
    ADD CONSTRAINT "price_observations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_observations"
    ADD CONSTRAINT "price_observations_print_id_condition_grade_agency_grade_va_key" UNIQUE ("print_id", "condition", "grade_agency", "grade_value", "source", "observed_at");



ALTER TABLE ONLY "public"."price_rollup_config"
    ADD CONSTRAINT "price_rollup_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_sources"
    ADD CONSTRAINT "price_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."set_sync_audit"
    ADD CONSTRAINT "set_sync_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sets"
    ADD CONSTRAINT "sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unmatched_price_rows"
    ADD CONSTRAINT "unmatched_price_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card_prints"
    ADD CONSTRAINT "uq_card_prints_setnum" UNIQUE ("set_code", "number");



ALTER TABLE ONLY "public"."vault_items"
    ADD CONSTRAINT "uq_user_card" UNIQUE ("user_id", "card_id");



ALTER TABLE ONLY "public"."vault_items"
    ADD CONSTRAINT "uq_vault_user_card" UNIQUE ("user_id", "card_id");



ALTER TABLE ONLY "public"."vault_items"
    ADD CONSTRAINT "vault_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_user_id_card_id_key" UNIQUE ("user_id", "card_id");



CREATE INDEX "import_runs_kind_created_at_idx" ON "admin"."import_runs" USING "btree" ("kind", "created_at" DESC);



CREATE INDEX "import_runs_status_created_at_idx" ON "admin"."import_runs" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "alerts_card_idx" ON "public"."alerts" USING "btree" ("card_id");



CREATE INDEX "alerts_user_idx" ON "public"."alerts" USING "btree" ("user_id");



CREATE INDEX "card_price_ticks_print_time_idx" ON "public"."card_price_ticks" USING "btree" ("card_print_id", "captured_at" DESC);



CREATE INDEX "card_prices_print_source_idx" ON "public"."card_prices" USING "btree" ("card_print_id", "source");



CREATE INDEX "card_prices_updated_idx" ON "public"."card_prices" USING "btree" ("last_updated");



CREATE INDEX "card_prints_name_ci" ON "public"."card_prints" USING "btree" ("lower"("name"));



CREATE INDEX "card_prints_name_gin" ON "public"."card_prints" USING "gin" ("to_tsvector"('"simple"'::"regconfig", COALESCE("name", ''::"text")));



CREATE INDEX "card_prints_name_trgm_idx" ON "public"."card_prints" USING "gin" ("lower"("name") "extensions"."gin_trgm_ops");



CREATE INDEX "card_prints_set_code_ci" ON "public"."card_prints" USING "btree" ("lower"("set_code"));



CREATE UNIQUE INDEX "card_prints_uniq" ON "public"."card_prints" USING "btree" ("game_id", "set_id", "number", COALESCE("variant_key", ''::"text"));



CREATE INDEX "cards_name_idx" ON "public"."cards" USING "gin" ("to_tsvector"('"simple"'::"regconfig", COALESCE("name", ''::"text")));



CREATE INDEX "cards_set_idx" ON "public"."cards" USING "btree" ("set_id");



CREATE INDEX "condition_prices_card_condition_ts" ON "public"."condition_prices" USING "btree" ("card_id", "condition_label", "currency", "ts" DESC);



CREATE INDEX "cp_setnum_idx" ON "public"."card_prints" USING "btree" ("set_code", "number");



CREATE INDEX "cpo_card_time_idx" ON "public"."card_price_observations" USING "btree" ("card_print_id", "observed_at" DESC);



CREATE INDEX "cpo_source_idx" ON "public"."card_price_observations" USING "btree" ("source_id");



CREATE INDEX "graded_prices_card_grade_ts" ON "public"."graded_prices" USING "btree" ("card_id", "grade_company", "grade_value", "currency", "ts" DESC);



CREATE INDEX "idx_card_prints_name" ON "public"."card_prints" USING "btree" ("name");



CREATE INDEX "idx_card_prints_name_trgm" ON "public"."card_prints" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_card_prints_set_no" ON "public"."card_prints" USING "btree" ("set_id", "number");



CREATE INDEX "idx_card_prints_setnum" ON "public"."card_prints" USING "btree" ("set_code", "number");



CREATE INDEX "idx_card_prints_setnumplain" ON "public"."card_prints" USING "btree" ("set_code", "number_plain");



CREATE INDEX "idx_catalog_name_trgm" ON "public"."card_catalog" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_catalog_setname_trgm" ON "public"."card_catalog" USING "gin" ("set_name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_cp_last_updated" ON "public"."card_prices" USING "btree" ("last_updated" DESC);



CREATE INDEX "idx_cp_print_time" ON "public"."card_prices" USING "btree" ("card_print_id", "last_updated" DESC) INCLUDE ("low", "mid", "high", "currency", "source");



CREATE INDEX "idx_external_cache_exp" ON "public"."external_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_job_logs_job_time" ON "public"."job_logs" USING "btree" ("job_id", "at" DESC);



CREATE INDEX "idx_jobs_status_sched" ON "public"."jobs" USING "btree" ("status", "scheduled_at");



CREATE INDEX "idx_latest_prices_print" ON "public"."latest_prices" USING "btree" ("print_id");



CREATE INDEX "idx_listing_images_listing" ON "public"."listing_images" USING "btree" ("listing_id");



CREATE INDEX "idx_listing_images_sort" ON "public"."listing_images" USING "btree" ("listing_id", "sort_order");



CREATE INDEX "idx_listings_created_at" ON "public"."listings" USING "btree" ("created_at");



CREATE INDEX "idx_listings_owner" ON "public"."listings" USING "btree" ("owner_id");



CREATE INDEX "idx_listings_status" ON "public"."listings" USING "btree" ("status");



CREATE INDEX "idx_market_prices_card_source_time" ON "public"."market_prices" USING "btree" ("card_id", "source", "fetched_at" DESC);



CREATE INDEX "idx_market_prices_card_time" ON "public"."market_prices" USING "btree" ("card_id", "fetched_at" DESC);



CREATE INDEX "idx_price_obs_dim" ON "public"."price_observations" USING "btree" ("condition", "grade_agency", "grade_value");



CREATE INDEX "idx_price_obs_lookup" ON "public"."price_observations" USING "btree" ("set_code", "number", "variant", "observed_at" DESC);



CREATE INDEX "idx_price_obs_print" ON "public"."price_observations" USING "btree" ("print_id", "observed_at" DESC);



CREATE INDEX "idx_price_obs_print_observed" ON "public"."price_observations" USING "btree" ("print_id", "observed_at" DESC);



CREATE INDEX "idx_prices_card_ts" ON "public"."prices" USING "btree" ("card_id", "ts" DESC);



CREATE INDEX "idx_provider_stats_time" ON "public"."external_provider_stats" USING "btree" ("provider", "observed_at" DESC);



CREATE INDEX "idx_sets_code" ON "public"."sets" USING "btree" ("code");



CREATE INDEX "idx_vault_items_user_created" ON "public"."vault_items" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_vault_items_user_name" ON "public"."vault_items" USING "btree" ("user_id", "name");



CREATE INDEX "idx_wall_thumbs_created_at" ON "public"."wall_thumbs_3x4" USING "btree" ("created_at");



CREATE INDEX "price_observations_condition_grade_agency_grade_value_idx" ON "public"."price_observations" USING "btree" ("condition", "grade_agency", "grade_value");



CREATE INDEX "price_observations_print_id_observed_at_idx" ON "public"."price_observations" USING "btree" ("print_id", "observed_at" DESC);



CREATE INDEX "prices_card_id_ts_idx" ON "public"."prices" USING "btree" ("card_id", "ts" DESC);



CREATE INDEX "prices_card_source_ts_idx" ON "public"."prices" USING "btree" ("card_id", "source", "ts" DESC);



CREATE INDEX "prices_card_ts_idx" ON "public"."prices" USING "btree" ("card_id", "ts");



CREATE INDEX "prices_set_number_idx" ON "public"."prices" USING "btree" ("lower"("set_code"), "lower"("number"));



CREATE INDEX "prices_setnum_cur_ts_idx" ON "public"."prices" USING "btree" ("lower"("set_code"), "currency", "ts" DESC);



CREATE INDEX "prices_setnum_currency_ts" ON "public"."prices" USING "btree" ("lower"("set_code"), "lower"("regexp_replace"("number", '[^0-9a-z]'::"text", ''::"text", 'g'::"text")), "currency", "ts" DESC);



CREATE INDEX "scans_created_idx" ON "public"."scans" USING "btree" ("created_at");



CREATE INDEX "scans_vault_item_idx" ON "public"."scans" USING "btree" ("vault_item_id");



CREATE UNIQUE INDEX "sets_unique_game_code" ON "public"."sets" USING "btree" ("game", "code");



CREATE UNIQUE INDEX "uq_card_prints_game_set_number" ON "public"."card_prints" USING "btree" ("game_id", "set_id", "number");



CREATE UNIQUE INDEX "uq_card_prints_setid_number" ON "public"."card_prints" USING "btree" ("set_id", "number");



CREATE UNIQUE INDEX "uq_catalog_setnum" ON "public"."card_catalog" USING "btree" ("set_code", "card_number");



CREATE UNIQUE INDEX "uq_latest_card_prices_mv" ON "public"."latest_card_prices_mv" USING "btree" ("card_id", COALESCE("condition_label", ''::"text"));



CREATE UNIQUE INDEX "uq_sets_code" ON "public"."sets" USING "btree" ("code");



CREATE UNIQUE INDEX "uq_vault_items_user_card" ON "public"."vault_items" USING "btree" ("user_id", "card_id");



CREATE UNIQUE INDEX "ux_condition_prices_card_condition_currency" ON "public"."condition_prices" USING "btree" ("card_id", "condition_label", "currency");



CREATE UNIQUE INDEX "ux_graded_prices_card_grade_currency" ON "public"."graded_prices" USING "btree" ("card_id", "grade_company", "grade_value", "currency");



CREATE INDEX "vault_items_card_id_idx" ON "public"."vault_items" USING "btree" ("card_id");



CREATE INDEX "vault_items_card_idx" ON "public"."vault_items" USING "btree" ("card_id");



CREATE INDEX "vault_items_created_idx" ON "public"."vault_items" USING "btree" ("created_at" DESC);



CREATE INDEX "vault_items_user_created_idx" ON "public"."vault_items" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "vault_items_user_idx" ON "public"."vault_items" USING "btree" ("user_id");



CREATE UNIQUE INDEX "waitlist_email_unique" ON "public"."waitlist" USING "btree" ("lower"("email"));



CREATE INDEX "wishlist_user_idx" ON "public"."wishlist_items" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_alerts_set_uid" BEFORE INSERT ON "public"."alerts" FOR EACH ROW EXECUTE FUNCTION "public"."set_auth_uid"();



CREATE OR REPLACE TRIGGER "trg_append_price_tick" AFTER INSERT OR UPDATE ON "public"."card_prices" FOR EACH ROW EXECUTE FUNCTION "public"."_append_price_tick"();



CREATE OR REPLACE TRIGGER "trg_fill_price_obs_print_id" BEFORE INSERT ON "public"."price_observations" FOR EACH ROW EXECUTE FUNCTION "public"."fill_price_obs_print_id"();



CREATE OR REPLACE TRIGGER "trg_listings_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."set_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "trg_queue_refresh_latest_card_prices" AFTER INSERT OR DELETE OR UPDATE ON "public"."card_prices" FOR EACH STATEMENT EXECUTE FUNCTION "public"."enqueue_refresh_latest_card_prices"();



CREATE OR REPLACE TRIGGER "trg_scans_set_auth_uid" BEFORE INSERT ON "public"."scans" FOR EACH ROW EXECUTE FUNCTION "public"."set_auth_uid"();



CREATE OR REPLACE TRIGGER "trg_vault_items_set_uid" BEFORE INSERT ON "public"."vault_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_auth_uid"();



CREATE OR REPLACE TRIGGER "trg_wall_refresh_listing_images" AFTER INSERT OR DELETE OR UPDATE ON "public"."listing_images" FOR EACH STATEMENT EXECUTE FUNCTION "public"."_wall_refresh_mv"();



CREATE OR REPLACE TRIGGER "trg_wall_refresh_listings" AFTER INSERT OR DELETE OR UPDATE ON "public"."listings" FOR EACH STATEMENT EXECUTE FUNCTION "public"."_wall_refresh_mv"();



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_price_observations"
    ADD CONSTRAINT "card_price_observations_card_print_id_fkey" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_price_observations"
    ADD CONSTRAINT "card_price_observations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."price_sources"("id");



ALTER TABLE ONLY "public"."card_price_rollups"
    ADD CONSTRAINT "card_price_rollups_card_print_id_fkey" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_price_ticks"
    ADD CONSTRAINT "card_price_ticks_card_print_id_fkey" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_prices"
    ADD CONSTRAINT "card_prices_card_print_id_fkey" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_prints"
    ADD CONSTRAINT "card_prints_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."card_prints"
    ADD CONSTRAINT "card_prints_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vault_items"
    ADD CONSTRAINT "fk_vault_items_card" FOREIGN KEY ("card_id") REFERENCES "public"."card_prints"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."job_logs"
    ADD CONSTRAINT "job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_images"
    ADD CONSTRAINT "listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") NOT VALID;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_card_print_id_fkey" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") NOT VALID;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_owner_id_users_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") NOT VALID;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_vault_item_id_fkey" FOREIGN KEY ("vault_item_id") REFERENCES "public"."vault_items"("id") NOT VALID;



ALTER TABLE ONLY "public"."market_prices"
    ADD CONSTRAINT "market_prices_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."card_prints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_observations"
    ADD CONSTRAINT "price_observations_print_id_fkey" FOREIGN KEY ("print_id") REFERENCES "public"."card_prints"("id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."card_prints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_vault_item_id_fkey" FOREIGN KEY ("vault_item_id") REFERENCES "public"."vault_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_items"
    ADD CONSTRAINT "vault_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."card_prints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon can read card_prints" ON "public"."card_prints" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon can update card_prints (dev)" ON "public"."card_prints" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "anyone can read prices" ON "public"."market_prices" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."card_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."card_price_ticks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_price_ticks_read" ON "public"."card_price_ticks" FOR SELECT USING (true);



ALTER TABLE "public"."card_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_prices_read" ON "public"."card_prices" FOR SELECT USING (true);



ALTER TABLE "public"."card_prints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "card_prints_read" ON "public"."card_prints" FOR SELECT USING (true);



ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalog readable" ON "public"."sets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "catalog readable 2" ON "public"."card_prints" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gv_alerts_delete" ON "public"."alerts" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_alerts_insert" ON "public"."alerts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_alerts_select" ON "public"."alerts" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_alerts_update" ON "public"."alerts" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_scans_delete" ON "public"."scans" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_scans_insert" ON "public"."scans" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_scans_select" ON "public"."scans" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_scans_update" ON "public"."scans" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_vault_items_delete" ON "public"."vault_items" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_vault_items_insert" ON "public"."vault_items" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_vault_items_select" ON "public"."vault_items" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "gv_vault_items_update" ON "public"."vault_items" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."listing_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_images_owner_write" ON "public"."listing_images" USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_images"."listing_id") AND ("l"."owner_id" = "public"."auth_uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_images"."listing_id") AND ("l"."owner_id" = "public"."auth_uid"())))));



CREATE POLICY "listing_images_read_public" ON "public"."listing_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_images"."listing_id") AND ("l"."visibility" = 'public'::"text") AND ("l"."status" = 'active'::"text")))));



ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listings_owner_delete" ON "public"."listings" FOR DELETE USING (("owner_id" = "public"."auth_uid"()));



CREATE POLICY "listings_owner_insert" ON "public"."listings" FOR INSERT WITH CHECK (("owner_id" = "public"."auth_uid"()));



CREATE POLICY "listings_owner_read" ON "public"."listings" FOR SELECT USING (("owner_id" = "public"."auth_uid"()));



CREATE POLICY "listings_owner_update" ON "public"."listings" FOR UPDATE USING (("owner_id" = "public"."auth_uid"())) WITH CHECK (("owner_id" = "public"."auth_uid"()));



CREATE POLICY "listings_read_public" ON "public"."listings" FOR SELECT USING ((("visibility" = 'public'::"text") AND ("status" = 'active'::"text")));



ALTER TABLE "public"."market_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner delete vault_items" ON "public"."vault_items" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "owner insert" ON "public"."vault_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "owner insert vault_items" ON "public"."vault_items" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "owner read" ON "public"."vault_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner select vault_items" ON "public"."vault_items" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "owner update" ON "public"."vault_items" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner update vault_items" ON "public"."vault_items" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "price_obs_read_any" ON "public"."price_observations" FOR SELECT USING (true);



CREATE POLICY "price_obs_write_service_only" ON "public"."price_observations" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."price_observations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read all" ON "public"."card_prices" FOR SELECT USING (true);



CREATE POLICY "read audit" ON "public"."set_sync_audit" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_all_card_prints" ON "public"."card_prints" FOR SELECT TO "anon" USING (true);



CREATE POLICY "refdata_read" ON "public"."card_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "refdata_read" ON "public"."card_prints" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "refdata_read" ON "public"."cards" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "refdata_read" ON "public"."games" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "refdata_read" ON "public"."prices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "refdata_read" ON "public"."sets" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."set_sync_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unmatched_price_rows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "unmatched_read_auth" ON "public"."unmatched_price_rows" FOR SELECT USING (("auth"."role"() = ANY (ARRAY['authenticated'::"text", 'service_role'::"text"])));



CREATE POLICY "unmatched_write_service_only" ON "public"."unmatched_price_rows" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "update via function" ON "public"."card_prices" FOR UPDATE USING (true);



ALTER TABLE "public"."vault_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vault_items owner delete" ON "public"."vault_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vault_items owner read" ON "public"."vault_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vault_items owner update" ON "public"."vault_items" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vault_items owner write" ON "public"."vault_items" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waitlist_insert_public" ON "public"."waitlist" FOR INSERT TO "anon" WITH CHECK (true);



ALTER TABLE "public"."wishlist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wl_rw" ON "public"."wishlist_items" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "write via function" ON "public"."card_prices" FOR INSERT WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."card_price_ticks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."card_prices";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";









REVOKE ALL ON FUNCTION "admin"."import_prices_do"("_payload" "jsonb", "_bridge_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "admin"."import_prices_do"("_payload" "jsonb", "_bridge_token" "text") TO "anon";





































































































































































































































































GRANT ALL ON FUNCTION "public"."_append_price_tick"() TO "anon";
GRANT ALL ON FUNCTION "public"."_append_price_tick"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_append_price_tick"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_wall_refresh_mv"() TO "anon";
GRANT ALL ON FUNCTION "public"."_wall_refresh_mv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_wall_refresh_mv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."card_history"("_set_code" "text", "_number" "text", "_source" "text", "_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."card_history"("_set_code" "text", "_number" "text", "_source" "text", "_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."card_history"("_set_code" "text", "_number" "text", "_source" "text", "_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_vault_values"("days_window" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_vault_values"("days_window" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_vault_values"("days_window" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_refresh_latest_card_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_refresh_latest_card_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_refresh_latest_card_prices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fill_price_obs_print_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."fill_price_obs_print_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fill_price_obs_print_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_mojibake_common"("t" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fix_mojibake_common"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_mojibake_common"("t" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_mojibake_more"("t" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fix_mojibake_more"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_mojibake_more"("t" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_all_prices_for_card"("p_card_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_all_prices_for_card"("p_card_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_prices_for_card"("p_card_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_prices_for_card"("p_card_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_market_price"("p_card_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_market_price"("p_card_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_market_price"("p_card_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gv_norm_name"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."gv_norm_name"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gv_norm_name"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gv_num_int"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."gv_num_int"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gv_num_int"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gv_total_int"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."gv_total_int"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gv_total_int"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."job_log"("p_job_id" "uuid", "p_level" "text", "p_message" "text", "p_meta" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."job_log"("p_job_id" "uuid", "p_level" "text", "p_message" "text", "p_meta" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."job_log"("p_job_id" "uuid", "p_level" "text", "p_message" "text", "p_meta" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_missing_price_sets"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_missing_price_sets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_missing_price_sets"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_set_codes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_set_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_set_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_set_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_jobs"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."process_jobs"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_jobs"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_latest_card_prices_mv"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_latest_card_prices_mv"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_latest_card_prices_mv"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_latest_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_latest_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_latest_prices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices"("p_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices_all"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices_all"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_vault_market_prices_all"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_wall_thumbs_3x4"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_wall_thumbs_3x4"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_wall_thumbs_3x4"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_refresh_wall"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_refresh_wall"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_refresh_wall"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rpc_set_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text", "p_card_id" "uuid", "p_market_price" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rpc_set_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text", "p_card_id" "uuid", "p_market_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_set_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text", "p_card_id" "uuid", "p_market_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_set_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text", "p_card_id" "uuid", "p_market_price" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."card_prices" TO "anon";
GRANT ALL ON TABLE "public"."card_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."card_prices" TO "service_role";



GRANT ALL ON TABLE "public"."card_prints" TO "anon";
GRANT ALL ON TABLE "public"."card_prints" TO "authenticated";
GRANT ALL ON TABLE "public"."card_prints" TO "service_role";



GRANT ALL ON TABLE "public"."latest_card_prices_v" TO "anon";
GRANT ALL ON TABLE "public"."latest_card_prices_v" TO "authenticated";
GRANT ALL ON TABLE "public"."latest_card_prices_v" TO "service_role";



GRANT ALL ON TABLE "public"."v_card_search" TO "anon";
GRANT ALL ON TABLE "public"."v_card_search" TO "authenticated";
GRANT ALL ON TABLE "public"."v_card_search" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_cards"("q" "text", "limit" integer, "offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_cards"("q" "text", "limit" integer, "offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_cards"("q" "text", "limit" integer, "offset" integer) TO "service_role";



GRANT ALL ON TABLE "public"."v_cards_search_v2" TO "anon";
GRANT ALL ON TABLE "public"."v_cards_search_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."v_cards_search_v2" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_cards_in_set"("q" "text", "set_code" "text", "limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_cards_in_set"("q" "text", "set_code" "text", "limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_cards_in_set"("q" "text", "set_code" "text", "limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_auth_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_auth_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_auth_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_timestamp_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_vault_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_vault_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_vault_item_condition"("p_vault_item_id" "uuid", "p_condition_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_vault_item_grade"("p_vault_item_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_vault_item_grade"("p_vault_item_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_vault_item_grade"("p_vault_item_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."squash_ws"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."squash_ws"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."squash_ws"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strip_control"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."strip_control"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strip_control"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."top_movers_24h"("limit_n" integer, "only_positive" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."top_movers_24h"("limit_n" integer, "only_positive" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."top_movers_24h"("limit_n" integer, "only_positive" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_condition_price"("p_card_id" "uuid", "p_condition_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_condition_price"("p_card_id" "uuid", "p_condition_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_condition_price"("p_card_id" "uuid", "p_condition_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_graded_price"("p_card_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_graded_price"("p_card_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_graded_price"("p_card_id" "uuid", "p_grade_company" "text", "p_grade_value" numeric, "p_grade_label" "text", "p_market_price" numeric, "p_last_sold_price" numeric, "p_currency" "text", "p_source" "text", "p_ts" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_add_item"("p_user_id" "uuid", "p_card_id" "uuid", "p_condition_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vault_add_item"("p_user_id" "uuid", "p_card_id" "uuid", "p_condition_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_add_item"("p_user_id" "uuid", "p_card_id" "uuid", "p_condition_label" "text") TO "service_role";



GRANT ALL ON TABLE "public"."vault_items" TO "anon";
GRANT ALL ON TABLE "public"."vault_items" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_items" TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_add_or_increment"("p_card_id" "uuid", "p_delta_qty" integer, "p_condition_label" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vault_add_or_increment"("p_card_id" "uuid", "p_delta_qty" integer, "p_condition_label" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_add_or_increment"("p_card_id" "uuid", "p_delta_qty" integer, "p_condition_label" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_inc_qty"("item_id" "uuid", "inc" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vault_inc_qty"("item_id" "uuid", "inc" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_inc_qty"("item_id" "uuid", "inc" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_post_to_wall"("vault_item_id" "uuid", "price_cents" integer, "quantity" integer, "condition" "text", "note" "text", "use_vault_image" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vault_post_to_wall"("vault_item_id" "uuid", "price_cents" integer, "quantity" integer, "condition" "text", "note" "text", "use_vault_image" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_post_to_wall"("vault_item_id" "uuid", "price_cents" integer, "quantity" integer, "condition" "text", "note" "text", "use_vault_image" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."wishlist_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."wishlist_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."wishlist_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wishlist_totals_for"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wishlist_totals_for"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wishlist_totals_for"("p_user" "uuid") TO "service_role";
























GRANT ALL ON TABLE "public"."_import_card_prints" TO "anon";
GRANT ALL ON TABLE "public"."_import_card_prints" TO "authenticated";
GRANT ALL ON TABLE "public"."_import_card_prints" TO "service_role";



GRANT ALL ON TABLE "public"."_import_sets" TO "anon";
GRANT ALL ON TABLE "public"."_import_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."_import_sets" TO "service_role";



GRANT ALL ON TABLE "public"."alerts" TO "anon";
GRANT ALL ON TABLE "public"."alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."alerts" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."backup_card_prints_null_utc" TO "anon";
GRANT ALL ON TABLE "public"."backup_card_prints_null_utc" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_card_prints_null_utc" TO "service_role";



GRANT ALL ON TABLE "public"."card_catalog" TO "anon";
GRANT ALL ON TABLE "public"."card_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."card_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."card_price_observations" TO "anon";
GRANT ALL ON TABLE "public"."card_price_observations" TO "authenticated";
GRANT ALL ON TABLE "public"."card_price_observations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."card_price_observations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."card_price_observations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."card_price_observations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."card_price_rollups" TO "anon";
GRANT ALL ON TABLE "public"."card_price_rollups" TO "authenticated";
GRANT ALL ON TABLE "public"."card_price_rollups" TO "service_role";



GRANT ALL ON TABLE "public"."card_price_ticks" TO "anon";
GRANT ALL ON TABLE "public"."card_price_ticks" TO "authenticated";
GRANT ALL ON TABLE "public"."card_price_ticks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."card_price_ticks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."card_price_ticks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."card_price_ticks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."card_prints_clean" TO "anon";
GRANT ALL ON TABLE "public"."card_prints_clean" TO "authenticated";
GRANT ALL ON TABLE "public"."card_prints_clean" TO "service_role";



GRANT ALL ON TABLE "public"."card_prints_public" TO "anon";
GRANT ALL ON TABLE "public"."card_prints_public" TO "authenticated";
GRANT ALL ON TABLE "public"."card_prints_public" TO "service_role";



GRANT ALL ON TABLE "public"."cards" TO "anon";
GRANT ALL ON TABLE "public"."cards" TO "authenticated";
GRANT ALL ON TABLE "public"."cards" TO "service_role";



GRANT ALL ON TABLE "public"."condition_multipliers" TO "anon";
GRANT ALL ON TABLE "public"."condition_multipliers" TO "authenticated";
GRANT ALL ON TABLE "public"."condition_multipliers" TO "service_role";



GRANT ALL ON TABLE "public"."condition_prices" TO "anon";
GRANT ALL ON TABLE "public"."condition_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."condition_prices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."condition_prices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."condition_prices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."condition_prices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dev_audit" TO "anon";
GRANT ALL ON TABLE "public"."dev_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."dev_audit" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dev_audit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dev_audit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dev_audit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."external_cache" TO "anon";
GRANT ALL ON TABLE "public"."external_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."external_cache" TO "service_role";



GRANT ALL ON TABLE "public"."external_provider_stats" TO "anon";
GRANT ALL ON TABLE "public"."external_provider_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."external_provider_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."external_provider_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."external_provider_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."external_provider_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fx_daily" TO "anon";
GRANT ALL ON TABLE "public"."fx_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."fx_daily" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."graded_prices" TO "anon";
GRANT ALL ON TABLE "public"."graded_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."graded_prices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."graded_prices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."graded_prices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."graded_prices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."has_currency" TO "anon";
GRANT ALL ON TABLE "public"."has_currency" TO "authenticated";
GRANT ALL ON TABLE "public"."has_currency" TO "service_role";



GRANT ALL ON TABLE "public"."has_high" TO "anon";
GRANT ALL ON TABLE "public"."has_high" TO "authenticated";
GRANT ALL ON TABLE "public"."has_high" TO "service_role";



GRANT ALL ON TABLE "public"."has_low" TO "anon";
GRANT ALL ON TABLE "public"."has_low" TO "authenticated";
GRANT ALL ON TABLE "public"."has_low" TO "service_role";



GRANT ALL ON TABLE "public"."has_mid" TO "anon";
GRANT ALL ON TABLE "public"."has_mid" TO "authenticated";
GRANT ALL ON TABLE "public"."has_mid" TO "service_role";



GRANT ALL ON TABLE "public"."has_source" TO "anon";
GRANT ALL ON TABLE "public"."has_source" TO "authenticated";
GRANT ALL ON TABLE "public"."has_source" TO "service_role";



GRANT ALL ON TABLE "public"."import_image_errors" TO "anon";
GRANT ALL ON TABLE "public"."import_image_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."import_image_errors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."import_image_errors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."import_image_errors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."import_image_errors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."job_logs" TO "anon";
GRANT ALL ON TABLE "public"."job_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."job_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."latest_card_prices_mv" TO "anon";
GRANT ALL ON TABLE "public"."latest_card_prices_mv" TO "authenticated";
GRANT ALL ON TABLE "public"."latest_card_prices_mv" TO "service_role";



GRANT ALL ON TABLE "public"."price_observations" TO "anon";
GRANT ALL ON TABLE "public"."price_observations" TO "authenticated";
GRANT ALL ON TABLE "public"."price_observations" TO "service_role";



GRANT ALL ON TABLE "public"."latest_prices" TO "anon";
GRANT ALL ON TABLE "public"."latest_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."latest_prices" TO "service_role";



GRANT ALL ON TABLE "public"."listing_images" TO "anon";
GRANT ALL ON TABLE "public"."listing_images" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_images" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."market_prices" TO "anon";
GRANT ALL ON TABLE "public"."market_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."market_prices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."price_observations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."price_observations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."price_observations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."price_rollup_config" TO "anon";
GRANT ALL ON TABLE "public"."price_rollup_config" TO "authenticated";
GRANT ALL ON TABLE "public"."price_rollup_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."price_rollup_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."price_rollup_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."price_rollup_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."price_sources" TO "anon";
GRANT ALL ON TABLE "public"."price_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."price_sources" TO "service_role";



GRANT ALL ON TABLE "public"."prices" TO "anon";
GRANT ALL ON TABLE "public"."prices" TO "authenticated";
GRANT ALL ON TABLE "public"."prices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."set_sync_audit" TO "anon";
GRANT ALL ON TABLE "public"."set_sync_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."set_sync_audit" TO "service_role";



GRANT ALL ON SEQUENCE "public"."set_sync_audit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."set_sync_audit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."set_sync_audit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sets" TO "anon";
GRANT ALL ON TABLE "public"."sets" TO "authenticated";
GRANT ALL ON TABLE "public"."sets" TO "service_role";



GRANT ALL ON TABLE "public"."unmatched_price_rows" TO "anon";
GRANT ALL ON TABLE "public"."unmatched_price_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."unmatched_price_rows" TO "service_role";



GRANT ALL ON SEQUENCE "public"."unmatched_price_rows_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."unmatched_price_rows_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."unmatched_price_rows_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."v_best_prices_all" TO "anon";
GRANT ALL ON TABLE "public"."v_best_prices_all" TO "authenticated";
GRANT ALL ON TABLE "public"."v_best_prices_all" TO "service_role";



GRANT ALL ON TABLE "public"."v_card_images" TO "anon";
GRANT ALL ON TABLE "public"."v_card_images" TO "authenticated";
GRANT ALL ON TABLE "public"."v_card_images" TO "service_role";



GRANT ALL ON TABLE "public"."v_card_prices_usd" TO "anon";
GRANT ALL ON TABLE "public"."v_card_prices_usd" TO "authenticated";
GRANT ALL ON TABLE "public"."v_card_prices_usd" TO "service_role";



GRANT ALL ON TABLE "public"."v_card_prints" TO "anon";
GRANT ALL ON TABLE "public"."v_card_prints" TO "authenticated";
GRANT ALL ON TABLE "public"."v_card_prints" TO "service_role";



GRANT ALL ON TABLE "public"."v_card_prints_badges" TO "anon";
GRANT ALL ON TABLE "public"."v_card_prints_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."v_card_prints_badges" TO "service_role";



GRANT ALL ON TABLE "public"."v_latest_price" TO "anon";
GRANT ALL ON TABLE "public"."v_latest_price" TO "authenticated";
GRANT ALL ON TABLE "public"."v_latest_price" TO "service_role";



GRANT ALL ON TABLE "public"."v_latest_price_by_card" TO "anon";
GRANT ALL ON TABLE "public"."v_latest_price_by_card" TO "authenticated";
GRANT ALL ON TABLE "public"."v_latest_price_by_card" TO "service_role";



GRANT ALL ON TABLE "public"."v_latest_price_clean" TO "anon";
GRANT ALL ON TABLE "public"."v_latest_price_clean" TO "authenticated";
GRANT ALL ON TABLE "public"."v_latest_price_clean" TO "service_role";



GRANT ALL ON TABLE "public"."v_latest_price_pref" TO "anon";
GRANT ALL ON TABLE "public"."v_latest_price_pref" TO "authenticated";
GRANT ALL ON TABLE "public"."v_latest_price_pref" TO "service_role";



GRANT ALL ON TABLE "public"."v_latest_prices" TO "anon";
GRANT ALL ON TABLE "public"."v_latest_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."v_latest_prices" TO "service_role";



GRANT ALL ON TABLE "public"."v_vault_items" TO "anon";
GRANT ALL ON TABLE "public"."v_vault_items" TO "authenticated";
GRANT ALL ON TABLE "public"."v_vault_items" TO "service_role";



GRANT ALL ON TABLE "public"."v_recently_added" TO "anon";
GRANT ALL ON TABLE "public"."v_recently_added" TO "authenticated";
GRANT ALL ON TABLE "public"."v_recently_added" TO "service_role";



GRANT ALL ON TABLE "public"."v_ticker_24h" TO "anon";
GRANT ALL ON TABLE "public"."v_ticker_24h" TO "authenticated";
GRANT ALL ON TABLE "public"."v_ticker_24h" TO "service_role";



GRANT ALL ON TABLE "public"."v_vault_items_ext" TO "anon";
GRANT ALL ON TABLE "public"."v_vault_items_ext" TO "authenticated";
GRANT ALL ON TABLE "public"."v_vault_items_ext" TO "service_role";



GRANT ALL ON TABLE "public"."wall_thumbs_3x4" TO "anon";
GRANT ALL ON TABLE "public"."wall_thumbs_3x4" TO "authenticated";
GRANT ALL ON TABLE "public"."wall_thumbs_3x4" TO "service_role";



GRANT ALL ON TABLE "public"."wall_feed_view" TO "anon";
GRANT ALL ON TABLE "public"."wall_feed_view" TO "authenticated";
GRANT ALL ON TABLE "public"."wall_feed_view" TO "service_role";



GRANT ALL ON TABLE "public"."v_wall_feed" TO "anon";
GRANT ALL ON TABLE "public"."v_wall_feed" TO "authenticated";
GRANT ALL ON TABLE "public"."v_wall_feed" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist_items" TO "anon";
GRANT ALL ON TABLE "public"."wishlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."v_wishlist_items" TO "anon";
GRANT ALL ON TABLE "public"."v_wishlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."v_wishlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."v_wishlist_value_by_user" TO "anon";
GRANT ALL ON TABLE "public"."v_wishlist_value_by_user" TO "authenticated";
GRANT ALL ON TABLE "public"."v_wishlist_value_by_user" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "anon";
GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."wall_feed_v" TO "anon";
GRANT ALL ON TABLE "public"."wall_feed_v" TO "authenticated";
GRANT ALL ON TABLE "public"."wall_feed_v" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























