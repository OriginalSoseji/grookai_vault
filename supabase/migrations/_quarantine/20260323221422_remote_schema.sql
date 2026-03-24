create extension if not exists "pg_cron" with schema "pg_catalog";
create extension if not exists "hypopg" with schema "extensions";
create extension if not exists "index_advisor" with schema "extensions";
drop extension if exists "unaccent";
create schema if not exists "admin";
create extension if not exists "unaccent" with schema "public";
drop policy "owner delete vault_items" on "public"."vault_items";
drop policy "owner insert vault_items" on "public"."vault_items";
drop policy "owner insert" on "public"."vault_items";
drop policy "owner read" on "public"."vault_items";
drop policy "owner select vault_items" on "public"."vault_items";
drop policy "owner update vault_items" on "public"."vault_items";
drop policy "owner update" on "public"."vault_items";
drop policy "vault_items owner delete" on "public"."vault_items";
drop policy "vault_items owner read" on "public"."vault_items";
drop policy "vault_items owner update" on "public"."vault_items";
drop policy "vault_items owner write" on "public"."vault_items";
drop function if exists "public"."resolve_active_vault_anchor_v1"(p_user_id uuid, p_card_print_id uuid, p_gv_id text, p_condition_label text, p_notes text, p_name text, p_set_name text, p_photo_url text, p_create_if_missing boolean);
drop view if exists "public"."card_prints_clean";
drop view if exists "public"."card_prints_public";
drop view if exists "public"."v_card_prices_usd";
drop view if exists "public"."v_card_pricing_ui_v1";
drop view if exists "public"."v_card_prints_badges";
drop view if exists "public"."v_card_prints_web_v1";
drop view if exists "public"."v_card_search";
drop view if exists "public"."v_cards_search_v2";
drop view if exists "public"."v_condition_snapshot_analyses_match_card_v1";
drop view if exists "public"."v_grookai_value_compare_v1_v2";
drop view if exists "public"."v_grookai_value_v1";
drop view if exists "public"."v_grookai_value_v2";
drop view if exists "public"."v_image_coverage_canon";
drop view if exists "public"."v_image_coverage_noncanon";
drop view if exists "public"."v_recently_added";
drop view if exists "public"."v_special_set_print_membership";
drop view if exists "public"."v_special_set_reconstruction_gate";
drop view if exists "public"."v_ticker_24h";
drop view if exists "public"."v_vault_items_web";
drop view if exists "public"."v_wishlist_items";
drop view if exists "public"."v_card_prints";
drop view if exists "public"."v_card_prints_canon";
drop view if exists "public"."v_card_prints_noncanon";
drop view if exists "public"."v_special_set_code_forks";
drop view if exists "public"."v_vault_items_ext";
drop view if exists "public"."v_vault_items";
drop view if exists "public"."v_best_prices_all_gv_v1";
drop view if exists "public"."v_card_images";
drop view if exists "public"."v_grookai_value_v1_1";
drop view if exists "public"."card_print_active_prices";
create table "admin"."import_runs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "kind" text not null,
    "scope" jsonb,
    "status" text not null default 'pending'::text,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "error" text
      );
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
alter table "public"."card_prints" alter column "number_plain" set default 
CASE
    WHEN (number IS NULL) THEN NULL::text
    WHEN (number ~ '^[A-Za-z][0-9]+$'::text) THEN upper(number)
    WHEN (number ~ '[0-9]'::text) THEN regexp_replace(regexp_replace(number, '/.*$'::text, ''::text), '[^0-9]'::text, ''::text, 'g'::text)
    ELSE number
END;
alter table "public"."pricing_jobs" add column "locked_at" timestamp with time zone;
alter table "public"."pricing_jobs" add column "locked_by" text;
alter table "public"."sets" add column "printed_set_abbrev" text;
alter table "public"."sets" add column "printed_total" integer;
alter table "public"."sets" add column "set_role" text;
CREATE INDEX import_runs_kind_created_at_idx ON admin.import_runs USING btree (kind, created_at DESC);
CREATE UNIQUE INDEX import_runs_pkey ON admin.import_runs USING btree (id);
CREATE INDEX import_runs_status_created_at_idx ON admin.import_runs USING btree (status, created_at DESC);
CREATE UNIQUE INDEX card_prints_gv_id_unique_idx ON public.card_prints USING btree (gv_id) WHERE (gv_id IS NOT NULL);
CREATE INDEX idx_justtcg_variant_price_snapshots_latest_order ON public.justtcg_variant_price_snapshots USING btree (variant_id, fetched_at DESC, created_at DESC, id DESC);
CREATE INDEX idx_sets_set_role ON public.sets USING btree (set_role);
alter table "admin"."import_runs" add constraint "import_runs_pkey" PRIMARY KEY using index "import_runs_pkey";
alter table "public"."sets" add constraint "sets_set_role_allowed_chk" CHECK (((set_role IS NULL) OR (set_role = ANY (ARRAY['expansion'::text, 'promotion_umbrella'::text, 'promo_single'::text, 'product_insert'::text, 'magazine'::text, 'tournament'::text])))) not valid;
alter table "public"."sets" validate constraint "sets_set_role_allowed_chk";
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION admin.import_prices_do(_payload jsonb, _bridge_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'admin', 'extensions'
AS $function$
declare
  rows jsonb := coalesce(_payload->'rows', '[]'::jsonb);
  item jsonb;
  inserted_count integer := 0;
  unmatched_count integer := 0;
  reason text;
  v_card_print_id uuid;
  v_value numeric;
  v_source_id text;
  v_observed_at timestamptz;
  v_currency price_currency;
  v_currency_text text;
  v_kind price_kind;
  v_kind_text text;
  v_qty integer;
  v_meta jsonb;
begin
  if _bridge_token is distinct from current_setting('app.bridge_token', true) then
    raise exception 'unauthorized bridge token';
  end if;

  if jsonb_typeof(rows) <> 'array' then
    rows := '[]'::jsonb;
  end if;

  for item in
    select value from jsonb_array_elements(rows) as t(value)
  loop
    reason := null;
    v_card_print_id := null;
    v_value := null;
    v_source_id := null;
    v_observed_at := now();
    v_currency := 'USD';
    v_kind := 'sold';
    v_qty := 1;
    v_meta := '{}'::jsonb;

    if jsonb_typeof(item) <> 'object' then
      reason := 'invalid_row_shape';
    end if;

    if reason is null then
      if coalesce(item->>'card_print_id', '') = '' then
        reason := 'missing_card_print_id';
      else
        begin
          v_card_print_id := (item->>'card_print_id')::uuid;
        exception
          when others then
            reason := 'invalid_card_print_id';
        end;
      end if;
    end if;

    if reason is null then
      if coalesce(item->>'value', '') = '' then
        reason := 'missing_value';
      else
        begin
          v_value := (item->>'value')::numeric;
          if v_value <= 0 then
            reason := 'invalid_value';
          end if;
        exception
          when others then
            reason := 'invalid_value';
        end;
      end if;
    end if;

    if reason is null then
      v_source_id := nullif(item->>'source_id', '');
      if v_source_id is null then
        reason := 'missing_source_id';
      elsif not exists (select 1 from price_sources where id = v_source_id) then
        reason := 'unknown_source_id';
      end if;
    end if;

    if reason is null and item ? 'observed_at' then
      begin
        v_observed_at := (item->>'observed_at')::timestamptz;
      exception
        when others then
          reason := 'invalid_observed_at';
      end;
    end if;

    if reason is null then
      v_currency_text := coalesce(nullif(item->>'currency', ''), 'USD');
      begin
        v_currency := v_currency_text::price_currency;
      exception
        when others then
          reason := 'invalid_currency';
      end;
    end if;

    if reason is null then
      v_kind_text := coalesce(nullif(item->>'kind', ''), 'sold');
      begin
        v_kind := v_kind_text::price_kind;
      exception
        when others then
          reason := 'invalid_kind';
      end;
    end if;

    if reason is null and item ? 'qty' then
      begin
        v_qty := (item->>'qty')::integer;
        if v_qty <= 0 then
          reason := 'invalid_qty';
        end if;
      exception
        when others then
          reason := 'invalid_qty';
      end;
    end if;

    if reason is null and item ? 'meta' then
      v_meta := coalesce(item->'meta', '{}'::jsonb);
    end if;

    if reason is null then
      begin
        insert into card_price_observations(
          card_print_id,
          source_id,
          observed_at,
          currency,
          value,
          kind,
          qty,
          meta
        )
        values (
          v_card_print_id,
          v_source_id,
          v_observed_at,
          v_currency,
          v_value,
          v_kind,
          v_qty,
          coalesce(v_meta, '{}'::jsonb)
        );
        inserted_count := inserted_count + 1;
      exception
        when foreign_key_violation then
          reason := 'insert_fk_violation';
        when others then
          reason := 'insert_error';
      end;
    end if;

    if reason is not null then
      unmatched_count := unmatched_count + 1;
      begin
        insert into unmatched_price_rows(raw_payload, reason)
        values (coalesce(item, '{}'::jsonb), reason);
      exception
        when others then
          -- swallow logging errors to avoid masking original failures
          null;
      end;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted_count', inserted_count,
    'unmatched_count', unmatched_count
  );
end;
$function$;
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
end$function$;
CREATE OR REPLACE FUNCTION public.admin_condition_snapshots_read_v1(p_snapshot_id uuid)
 RETURNS public.condition_snapshots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  rec public.condition_snapshots%rowtype;
begin
  select *
    into rec
  from public.condition_snapshots
  where id = p_snapshot_id;

  if not found then
    raise exception 'snapshot_not_found';
  end if;

  return rec;
end;
$function$;
CREATE OR REPLACE FUNCTION public.condition_snapshots_insert_v1(p_vault_item_id uuid, p_images jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  insert into public.condition_snapshots (
    vault_item_id,
    images,
    scan_quality,
    measurements,
    defects,
    confidence
  )
  values (
    p_vault_item_id,
    p_images,
    jsonb_build_object(
      'ok', false,
      'pending', true,
      'source', 'scanner_phase0'
    ),
    '{}'::jsonb,
    '{}'::jsonb,
    0
  )
  returning id into v_id;

  return v_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.gv_enqueue_condition_analysis_job_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.ingestion_jobs (job_type, payload)
  values (
    'condition_analysis_v1',
    jsonb_build_object(
      'snapshot_id', new.id::text,
      'analysis_version', 'v1',
      'analysis_keys', jsonb_build_array('v1_fingerprint', 'v2_centering', 'v1_scratches', 'v1_edges_corners'),
      'requested_by', 'db_trigger:condition_analysis_trigger_v1'
    )
  );

  return new;
end;
$function$;
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
$function$;
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
$function$;
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
$function$;
CREATE OR REPLACE FUNCTION public.refresh_vault_market_prices_all()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.refresh_vault_market_prices(null);
$function$;
CREATE OR REPLACE FUNCTION public.search_card_prints_v1(q text, limit_n integer DEFAULT 30)
 RETURNS TABLE(lane text, card_print_id uuid, set_code text, set_name text, printed_set_abbrev text, printed_total integer, number text, number_plain text, variant_key text, name text, print_identity_key text, image_url text)
 LANGUAGE sql
 STABLE
AS $function$
with input as (
  select
    q,
    upper(trim(q)) as q_norm
),
tokens as (
  select
    q_norm,
    regexp_matches(q_norm, '([A-Z0-9]+)') as all_tokens,
    regexp_replace(q_norm, '\s+', ' ', 'g') as q_compact
  from input
),
parsed as (
  select
    q_norm,
    q_compact,
    (regexp_matches(q_norm, '([A-Z0-9]+)'))[1] as leading_token,
    (regexp_matches(q_norm, '([0-9]+)(?:\s*/\s*([0-9]+))?'))[1] as number_plain,
    (regexp_matches(q_norm, '([0-9]+)(?:\s*/\s*([0-9]+))?'))[2] as fraction_total,
    trim(
      regexp_replace(
        q_norm,
        '([0-9]+)(\s*/\s*[0-9]+)?\s*$',
        '',
        'i'
      )
    ) as remainder
  from tokens
),
lanes_abbrev as (
  select
    'abbrev_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.sets s
    on s.printed_set_abbrev is not null
   and upper(s.printed_set_abbrev) = p.leading_token
  join public.card_prints cp
    on cp.set_code = s.code
   and cp.number_plain = p.number_plain
  where p.number_plain is not null
),
lanes_setcode as (
  select
    'setcode_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.sets s
    on s.code = p.leading_token
  join public.card_prints cp
    on cp.set_code = s.code
   and cp.number_plain = p.number_plain
  where p.number_plain is not null
),
lanes_name as (
  select
    'name_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.card_prints cp
    on cp.number_plain = p.number_plain
   and cp.name ilike p.remainder || '%'
  join public.sets s
    on s.code = cp.set_code
  where p.number_plain is not null
),
lanes_setname as (
  select
    'setname_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.sets s
    on s.name ilike p.remainder || '%'
  join public.card_prints cp
    on cp.set_code = s.code
   and cp.number_plain = p.number_plain
  where p.number_plain is not null
),
lanes_text as (
  select
    'text'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.card_prints cp
    on cp.name ilike '%' || p.q_norm || '%'
  join public.sets s
    on s.code = cp.set_code
  where p.number_plain is null
)
select *
from (
  select * from lanes_abbrev
  union all
  select * from lanes_setcode
  union all
  select * from lanes_name
  union all
  select * from lanes_setname
  union all
  select * from lanes_text
) as results
limit limit_n;
$function$;
CREATE OR REPLACE FUNCTION public.search_cards(q text, "limit" integer DEFAULT 50, "offset" integer DEFAULT 0)
 RETURNS SETOF public.v_card_search
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT * FROM public.v_card_search
      WHERE (q IS NULL OR q = '' OR name ILIKE '%' || q || '%')
      ORDER BY name
      LIMIT  GREATEST(1, COALESCE("limit", 50))
      OFFSET GREATEST(0, COALESCE("offset", 0)); $function$;
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
$function$;
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
$function$;
CREATE OR REPLACE FUNCTION public.vault_add_or_increment(p_card_id uuid, p_delta_qty integer, p_name text, p_condition_label text DEFAULT 'NM'::text, p_notes text DEFAULT NULL::text)
 RETURNS SETOF public.vault_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = '22004';
  end if;

  return query
  insert into public.vault_items (user_id, card_id, qty, name, condition_label, notes)
  values (
    v_uid,
    p_card_id,
    greatest(1, p_delta_qty),
    p_name,
    p_condition_label,
    nullif(p_notes, '')
  )
  on conflict (user_id, card_id)
  do update set
    qty = public.vault_items.qty + greatest(1, p_delta_qty),
    condition_label = coalesce(excluded.condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(excluded.notes, ''), public.vault_items.notes),
    name = coalesce(public.vault_items.name, excluded.name)
  returning *;
end;
$function$;
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
$function$;
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
$function$;
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
end $function$;
CREATE OR REPLACE FUNCTION public.admin_condition_assist_insert_failure_v1(p_snapshot_id uuid, p_attempted_snapshot_id uuid, p_analysis_version text, p_analysis_key text, p_error_code text, p_error_detail text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_id uuid;
begin
  select user_id into v_user_id from public.condition_snapshots where id = p_snapshot_id;
  -- acceptable if not found; user_id remains null

  insert into public.condition_analysis_failures (
    snapshot_id,
    attempted_snapshot_id,
    user_id,
    analysis_version,
    analysis_key,
    error_code,
    error_detail
  ) values (
    p_snapshot_id,
    coalesce(p_attempted_snapshot_id, p_snapshot_id),
    v_user_id,
    p_analysis_version,
    p_analysis_key,
    p_error_code,
    p_error_detail
  )
  returning id into v_id;

  return v_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_fingerprint_bind_v1(p_user_id uuid, p_fingerprint_key text, p_vault_item_id uuid, p_snapshot_id uuid, p_analysis_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.fingerprint_bindings (
    user_id,
    fingerprint_key,
    vault_item_id,
    snapshot_id,
    analysis_key
  ) values (
    p_user_id,
    p_fingerprint_key,
    p_vault_item_id,
    p_snapshot_id,
    p_analysis_key
  )
  on conflict (user_id, fingerprint_key) do update
    set vault_item_id = excluded.vault_item_id,
        snapshot_id   = excluded.snapshot_id,
        analysis_key  = excluded.analysis_key,
        last_seen_at  = now();
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_fingerprint_event_insert_v1(p_user_id uuid, p_analysis_key text, p_event_type text, p_snapshot_id uuid, p_fingerprint_key text DEFAULT NULL::text, p_vault_item_id uuid DEFAULT NULL::uuid, p_event_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.fingerprint_provenance_events (
    user_id,
    vault_item_id,
    snapshot_id,
    analysis_key,
    fingerprint_key,
    event_type,
    event_metadata
  ) values (
    p_user_id,
    p_vault_item_id,
    p_snapshot_id,
    p_analysis_key,
    p_fingerprint_key,
    p_event_type,
    coalesce(p_event_metadata, '{}'::jsonb)
  )
  on conflict (user_id, analysis_key, event_type) do nothing;
end;
$function$;
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
$function$;
create or replace view "public"."card_print_active_prices" as  SELECT cp.id AS card_print_id,
    cp.set_id,
    cp.number_plain,
    cp.name,
    lap.source,
    lap.nm_floor,
    lap.nm_median,
    lap.lp_floor,
    lap.lp_median,
    lap.listing_count,
    lap.confidence,
    lap.last_snapshot_at,
    lap.updated_at
   FROM (public.card_prints cp
     LEFT JOIN public.ebay_active_prices_latest lap ON ((lap.card_print_id = cp.id)));
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
$function$;
CREATE OR REPLACE FUNCTION public.condition_snapshots_insert_v1(p_id uuid, p_vault_item_id uuid, p_images jsonb, p_scan_quality jsonb, p_measurements jsonb, p_defects jsonb, p_confidence numeric, p_device_meta jsonb DEFAULT '{}'::jsonb, p_fingerprint_id uuid DEFAULT NULL::uuid, p_card_print_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  insert into public.condition_snapshots (
    id,
    vault_item_id,
    user_id,
    created_at,
    images,
    scan_quality,
    measurements,
    defects,
    confidence,
    device_meta,
    fingerprint_id,
    card_print_id
  )
  values (
    p_id,
    p_vault_item_id,
    v_uid,
    now(),
    coalesce(p_images, '{}'::jsonb),
    coalesce(p_scan_quality, '{}'::jsonb),
    coalesce(p_measurements, '{}'::jsonb),
    coalesce(p_defects, jsonb_build_object('items', jsonb_build_array(), 'version', 1)),
    coalesce(p_confidence, 0.0),
    coalesce(p_device_meta, '{}'::jsonb),
    p_fingerprint_id,
    p_card_print_id
  );

  return p_id;
end;
$function$;
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
$function$;
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
end $function$;
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
$function$;
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
$function$;
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
$function$;
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
$function$;
CREATE OR REPLACE FUNCTION public.gv_condition_snapshots_set_auth_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$function$;
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
$function$;
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
$function$;
CREATE OR REPLACE FUNCTION public.refresh_latest_prices()
 RETURNS void
 LANGUAGE sql
AS $function$
  refresh materialized view concurrently public.latest_prices;
$function$;
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
$function$;
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
$function$;
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
create or replace view "public"."v_card_pricing_ui_v1" as  SELECT cp.id AS card_print_id,
    COALESCE(js.nm_price, eb.ebay_median_price) AS primary_price,
        CASE
            WHEN (js.nm_price IS NOT NULL) THEN 'justtcg'::text
            WHEN (eb.ebay_median_price IS NOT NULL) THEN 'ebay'::text
            ELSE 'none'::text
        END AS primary_source,
    gv.grookai_value_v1_clean AS grookai_value,
    js.min_price,
    js.max_price,
    js.variant_count,
    eb.ebay_median_price,
    eb.ebay_listing_count
   FROM (((public.card_prints cp
     LEFT JOIN public.v_justtcg_display_summary_v1 js ON ((js.card_print_id = cp.id)))
     LEFT JOIN public.v_grookai_value_v1_clean gv ON ((gv.card_print_id = cp.id)))
     LEFT JOIN public.v_justtcg_vs_ebay_pricing_v1 eb ON ((eb.card_print_id = cp.id)));
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
create or replace view "public"."v_card_prints_canon" as  SELECT cp.id,
    cp.game_id,
    cp.set_id,
    cp.name,
    cp.number,
    cp.variant_key,
    cp.rarity,
    cp.image_url,
    cp.tcgplayer_id,
    cp.external_ids,
    cp.updated_at,
    cp.set_code,
    cp.number_plain,
    cp.artist,
    cp.regulation_mark,
    cp.image_alt_url,
    cp.image_source,
    cp.variants,
    cp.created_at,
    cp.last_synced_at,
    cp.print_identity_key,
    cp.ai_metadata,
    cp.image_hash,
    cp.data_quality_flags,
    cp.image_status,
    cp.image_res,
    cp.image_last_checked_at
   FROM (public.card_prints cp
     JOIN public.set_code_classification scc ON (((scc.set_code = cp.set_code) AND (scc.is_canon = true))));
create or replace view "public"."v_card_prints_noncanon" as  SELECT cp.id,
    cp.game_id,
    cp.set_id,
    cp.name,
    cp.number,
    cp.variant_key,
    cp.rarity,
    cp.image_url,
    cp.tcgplayer_id,
    cp.external_ids,
    cp.updated_at,
    cp.set_code,
    cp.number_plain,
    cp.artist,
    cp.regulation_mark,
    cp.image_alt_url,
    cp.image_source,
    cp.variants,
    cp.created_at,
    cp.last_synced_at,
    cp.print_identity_key,
    cp.ai_metadata,
    cp.image_hash,
    cp.data_quality_flags,
    cp.image_status,
    cp.image_res,
    cp.image_last_checked_at
   FROM (public.card_prints cp
     JOIN public.set_code_classification scc ON (((scc.set_code = cp.set_code) AND (scc.is_canon = false))));
create or replace view "public"."v_card_prints_web_v1" as  SELECT id AS card_print_id,
    set_id,
    set_code,
    name,
    number,
    number_plain,
    rarity,
    variant_key,
    image_url
   FROM public.card_prints cp;
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
create or replace view "public"."v_condition_snapshot_analyses_match_card_v1" as  WITH extracted AS (
         SELECT a.snapshot_id AS analysis_snapshot_id,
            a.analysis_key,
            a.analysis_version,
            a.created_at AS analysis_created_at,
            (a.measurements #>> '{fingerprint,match,decision}'::text[]) AS decision,
            (a.measurements #>> '{fingerprint,match,debug,score}'::text[]) AS raw_confidence,
            (a.measurements #>> '{fingerprint,match,best_candidate_snapshot_id}'::text[]) AS best_candidate_snapshot_id_raw
           FROM public.condition_snapshot_analyses a
        )
 SELECT e.analysis_snapshot_id,
    e.analysis_key,
    e.analysis_version,
    e.analysis_created_at,
    e.decision,
        CASE
            WHEN (e.raw_confidence ~* '^-?[0-9]+(\\.[0-9]+)?([eE]-?[0-9]+)?$'::text) THEN (e.raw_confidence)::numeric
            ELSE NULL::numeric
        END AS confidence_0_1,
    e.best_candidate_snapshot_id_raw,
    COALESCE((e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text), false) AS best_candidate_uuid_valid,
        CASE
            WHEN (e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN (e.best_candidate_snapshot_id_raw)::uuid
            ELSE NULL::uuid
        END AS best_candidate_snapshot_id,
    cs2.vault_item_id AS best_candidate_vault_item_id,
    cp.id AS best_candidate_card_print_id,
    cp.name AS best_candidate_name,
    cp.set_code AS best_candidate_set_code,
    cp.number AS best_candidate_number,
    cp.image_best AS best_candidate_image_best
   FROM (((extracted e
     LEFT JOIN public.condition_snapshots cs2 ON ((cs2.id =
        CASE
            WHEN (e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN (e.best_candidate_snapshot_id_raw)::uuid
            ELSE NULL::uuid
        END)))
     LEFT JOIN public.vault_items vi ON ((vi.id = cs2.vault_item_id)))
     LEFT JOIN public.v_card_prints cp ON ((cp.id = vi.card_id)));
create or replace view "public"."v_grookai_value_v1" as  WITH base AS (
         SELECT cap.card_print_id,
            cap.nm_floor,
            cap.nm_median,
            cap.listing_count,
            cap.confidence,
            (COALESCE(cap.listing_count, 0))::numeric AS listing_count_eff
           FROM public.card_print_active_prices cap
          WHERE (cap.card_print_id IS NOT NULL)
        ), calc AS (
         SELECT b.card_print_id,
            b.nm_floor,
            b.nm_median,
            b.listing_count,
            b.confidence,
            b.listing_count_eff,
            GREATEST((0)::numeric, LEAST((1)::numeric, ((b.listing_count_eff - (5)::numeric) / (35)::numeric))) AS w_liquidity,
                CASE
                    WHEN (b.confidence IS NULL) THEN (1)::numeric
                    ELSE (0.9 + (0.1 * (b.confidence)::numeric))
                END AS conf_factor
           FROM base b
        ), gv AS (
         SELECT c.card_print_id,
            c.nm_floor,
            c.nm_median,
            c.listing_count,
            c.confidence,
            c.listing_count_eff,
            c.w_liquidity,
            c.conf_factor,
            ((c.w_liquidity * (c.nm_median)::numeric) + (((1)::numeric - c.w_liquidity) * (c.nm_floor)::numeric)) AS gv_raw
           FROM calc c
        )
 SELECT card_print_id,
    nm_floor,
    nm_median,
    listing_count,
    confidence,
    w_liquidity,
    gv_raw,
    conf_factor,
        CASE
            WHEN ((nm_floor IS NULL) OR (nm_median IS NULL)) THEN NULL::numeric
            ELSE GREATEST(LEAST(nm_floor, nm_median), LEAST(GREATEST(nm_floor, nm_median), (gv_raw * conf_factor)))
        END AS grookai_value_nm
   FROM gv g;
create or replace view "public"."v_grookai_value_v1_1" as  WITH base AS (
         SELECT cap.card_print_id,
            cap.nm_floor,
            cap.nm_median,
            cap.listing_count,
            cap.confidence,
            (COALESCE(cap.listing_count, 0))::numeric AS listing_count_eff
           FROM public.card_print_active_prices cap
          WHERE (cap.card_print_id IS NOT NULL)
        ), calc AS (
         SELECT b.card_print_id,
            b.nm_floor,
            b.nm_median,
            b.listing_count,
            b.confidence,
            b.listing_count_eff,
                CASE
                    WHEN ((b.nm_floor IS NULL) OR (b.nm_median IS NULL)) THEN NULL::numeric
                    ELSE GREATEST((b.nm_floor)::numeric, ((b.nm_median)::numeric * 0.70))
                END AS effective_floor_nm,
            GREATEST((0)::numeric, LEAST((1)::numeric, ((b.listing_count_eff - (5)::numeric) / (35)::numeric))) AS w_liquidity,
                CASE
                    WHEN (b.confidence IS NULL) THEN (1)::numeric
                    ELSE (0.9 + (0.1 * (b.confidence)::numeric))
                END AS conf_factor
           FROM base b
        ), gv AS (
         SELECT c.card_print_id,
            c.nm_floor,
            c.nm_median,
            c.listing_count,
            c.confidence,
            c.listing_count_eff,
            c.effective_floor_nm,
            c.w_liquidity,
            c.conf_factor,
                CASE
                    WHEN (c.effective_floor_nm IS NULL) THEN NULL::numeric
                    ELSE ((c.w_liquidity * (c.nm_median)::numeric) + (((1)::numeric - c.w_liquidity) * c.effective_floor_nm))
                END AS gv_raw
           FROM calc c
        )
 SELECT card_print_id,
    nm_floor,
    nm_median,
    listing_count,
    confidence,
    effective_floor_nm,
    w_liquidity,
    gv_raw,
    conf_factor,
        CASE
            WHEN ((effective_floor_nm IS NULL) OR (nm_median IS NULL)) THEN NULL::numeric
            ELSE GREATEST(LEAST(effective_floor_nm, nm_median), LEAST(GREATEST(effective_floor_nm, nm_median), (gv_raw * conf_factor)))
        END AS grookai_value_nm,
    COALESCE((confidence)::numeric, NULL::numeric) AS confidence_out
   FROM gv g;
create or replace view "public"."v_grookai_value_v2" as  WITH base AS (
         SELECT cap.card_print_id,
            (cap.nm_floor)::numeric AS nm_floor,
            (cap.nm_median)::numeric AS nm_median,
            cap.listing_count,
            (cap.confidence)::numeric AS confidence,
            (COALESCE(cap.listing_count, 0))::numeric AS listing_count_eff
           FROM public.card_print_active_prices cap
          WHERE (cap.card_print_id IS NOT NULL)
        ), calc AS (
         SELECT b.card_print_id,
            b.nm_floor,
            b.nm_median,
            b.listing_count,
            b.confidence,
                CASE
                    WHEN ((b.nm_floor IS NULL) OR (b.nm_median IS NULL)) THEN NULL::numeric
                    ELSE LEAST(b.nm_median, GREATEST(b.nm_floor, (b.nm_median * 0.70)))
                END AS effective_floor_nm,
                CASE
                    WHEN ((b.nm_floor IS NULL) OR (b.nm_floor <= (0)::numeric) OR (b.nm_median IS NULL)) THEN NULL::numeric
                    ELSE (b.nm_median / NULLIF(b.nm_floor, (0)::numeric))
                END AS spread_ratio,
            GREATEST((0)::numeric, LEAST((1)::numeric, ((b.listing_count_eff - (5)::numeric) / (35)::numeric))) AS w_liquidity,
                CASE
                    WHEN ((b.nm_floor IS NULL) OR (b.nm_floor <= (0)::numeric) OR (b.nm_median IS NULL)) THEN 0.35
                    WHEN ((b.nm_median / b.nm_floor) <= 1.10) THEN 1.00
                    WHEN ((b.nm_median / b.nm_floor) <= 1.20) THEN 0.90
                    WHEN ((b.nm_median / b.nm_floor) <= 1.35) THEN 0.75
                    WHEN ((b.nm_median / b.nm_floor) <= 1.60) THEN 0.55
                    WHEN ((b.nm_median / b.nm_floor) <= 2.00) THEN 0.35
                    ELSE 0.20
                END AS w_spread,
                CASE
                    WHEN (b.confidence IS NULL) THEN (1)::numeric
                    ELSE (0.90 + (0.10 * GREATEST((0)::numeric, LEAST((1)::numeric, b.confidence))))
                END AS conf_factor
           FROM base b
        ), weighted AS (
         SELECT c.card_print_id,
            c.nm_floor,
            c.nm_median,
            c.listing_count,
            c.confidence,
            c.effective_floor_nm,
            c.spread_ratio,
            c.w_liquidity,
            c.w_spread,
            GREATEST((0)::numeric, LEAST((1)::numeric, (c.w_liquidity * c.w_spread))) AS w_median,
            c.conf_factor
           FROM calc c
        ), gv AS (
         SELECT w.card_print_id,
            w.nm_floor,
            w.nm_median,
            w.listing_count,
            w.confidence,
            w.effective_floor_nm,
            w.spread_ratio,
            w.w_liquidity,
            w.w_spread,
            w.w_median,
                CASE
                    WHEN ((w.effective_floor_nm IS NULL) OR (w.nm_median IS NULL)) THEN NULL::numeric
                    ELSE ((w.w_median * w.nm_median) + (((1)::numeric - w.w_median) * w.effective_floor_nm))
                END AS gv_raw,
            w.conf_factor
           FROM weighted w
        )
 SELECT card_print_id,
    nm_floor,
    nm_median,
    listing_count,
    confidence,
    effective_floor_nm,
    spread_ratio,
    w_liquidity,
    w_spread,
    w_median,
    gv_raw,
    conf_factor,
        CASE
            WHEN ((nm_floor IS NULL) OR (nm_median IS NULL)) THEN NULL::numeric
            ELSE GREATEST(LEAST(nm_floor, nm_median), LEAST(GREATEST(nm_floor, nm_median), (gv_raw * conf_factor)))
        END AS grookai_value_nm
   FROM gv g;
create or replace view "public"."v_image_coverage_canon" as  SELECT set_code,
    count(*) AS total,
    count(*) FILTER (WHERE (image_url IS NOT NULL)) AS with_images,
    count(*) FILTER (WHERE (image_url IS NULL)) AS missing_images,
    round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS coverage_percent
   FROM public.v_card_prints_canon
  GROUP BY set_code
  ORDER BY (round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2)), (count(*)) DESC;
create or replace view "public"."v_image_coverage_noncanon" as  SELECT set_code,
    count(*) AS total,
    count(*) FILTER (WHERE (image_url IS NOT NULL)) AS with_images,
    count(*) FILTER (WHERE (image_url IS NULL)) AS missing_images,
    round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS coverage_percent
   FROM public.v_card_prints_noncanon
  GROUP BY set_code
  ORDER BY (round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2)), (count(*)) DESC;
create or replace view "public"."v_special_set_code_forks" as  WITH targets(set_code) AS (
         VALUES ('sv08.5'::text), ('sv10.5b'::text), ('sv10.5w'::text)
        )
 SELECT t.set_code AS target_set_code,
    array_agg(DISTINCT cp.set_code) FILTER (WHERE (cp.set_code IS NOT NULL)) AS fork_codes,
    count(*) AS total_rows,
    (count(DISTINCT cp.set_code) > 1) AS fork_detected
   FROM ((targets t
     LEFT JOIN public.card_prints cp ON (((cp.set_code ~~* (t.set_code || '%'::text)) OR (cp.set_code ~~* (regexp_replace(t.set_code, '\\.'::text, ''::text, 'g'::text) || '%'::text)))))
     LEFT JOIN public.sets s ON ((cp.set_id = s.id)))
  WHERE ((s.code = t.set_code) OR (cp.set_code ~~* (t.set_code || '%'::text)) OR (cp.set_code ~~* (regexp_replace(t.set_code, '\\.'::text, ''::text, 'g'::text) || '%'::text)))
  GROUP BY t.set_code;
create or replace view "public"."v_special_set_print_membership" as  WITH targets(set_code) AS (
         VALUES ('sv08.5'::text), ('sv10.5b'::text), ('sv10.5w'::text)
        ), base AS (
         SELECT t.set_code AS target_set_code,
            s.id AS set_id,
            s.code AS set_code,
            cp.id AS card_print_id,
            cp.set_code AS card_set_code,
            cp.set_id AS card_set_id,
            cp.number,
            cp.number_plain,
            cp.variant_key,
            cp.print_identity_key,
            cp.image_url,
            cp.name,
            cp.external_ids,
            cp.created_at,
            cp.updated_at,
            count(*) OVER (PARTITION BY cp.set_code, cp.number_plain, COALESCE(cp.variant_key, ''::text)) AS variant_collision_count
           FROM ((targets t
             JOIN public.sets s ON ((s.code = t.set_code)))
             LEFT JOIN public.card_prints cp ON (((cp.set_code = s.code) OR (cp.set_id = s.id))))
        )
 SELECT target_set_code,
    set_id,
    set_code,
    card_print_id,
    card_set_code,
    card_set_id,
    number,
    number_plain,
    variant_key,
    print_identity_key,
    image_url,
    name,
    variant_collision_count,
    (card_set_id IS NULL) AS missing_set_id,
    ((number_plain IS NULL) OR (number_plain = ''::text)) AS missing_number_plain,
    ((print_identity_key IS NULL) OR (print_identity_key = ''::text)) AS missing_print_identity_key
   FROM base;
create or replace view "public"."v_special_set_reconstruction_gate" as  WITH targets(set_code) AS (
         VALUES ('sv08.5'::text), ('sv10.5b'::text), ('sv10.5w'::text)
        ), scc_target AS (
         SELECT t_1.set_code AS target_set_code,
            scc.set_code,
            scc.is_canon,
            scc.canon_source,
            scc.notes,
            scc.pokemonapi_set_id,
            scc.tcgdex_set_id,
            scc.canonical_set_code,
            scc.tcgdex_asset_code
           FROM (targets t_1
             LEFT JOIN public.set_code_classification scc ON ((scc.set_code = t_1.set_code)))
        ), anchor AS (
         SELECT st.target_set_code,
            COALESCE(st.canonical_set_code, st.set_code) AS anchor_set_code
           FROM scc_target st
        ), scc_anchor AS (
         SELECT a.target_set_code,
            scc.set_code,
            scc.is_canon,
            scc.canon_source,
            scc.notes,
            scc.pokemonapi_set_id,
            scc.tcgdex_set_id,
            scc.canonical_set_code,
            scc.tcgdex_asset_code
           FROM (anchor a
             LEFT JOIN public.set_code_classification scc ON (((scc.set_code = a.anchor_set_code) AND (scc.is_canon = true))))
        ), raws AS (
         SELECT r_1.set_code,
            r_1.raw_count_pokemonapi,
            r_1.distinct_ids_pokemonapi,
            r_1.raw_count_tcgdex,
            r_1.distinct_ids_tcgdex,
            r_1.pokemonapi_printed_total,
            r_1.tcgdex_printed_total,
            r_1.pokemonapi_ptcgo_code,
            r_1.overflow_detected,
            r_1.underflow_detected
           FROM public.v_special_set_raw_counts r_1
        ), forks AS (
         SELECT f_1.target_set_code,
            f_1.fork_codes,
            f_1.total_rows,
            f_1.fork_detected
           FROM public.v_special_set_code_forks f_1
        )
 SELECT t.set_code,
    ((sct.set_code IS NOT NULL) AND (sca.set_code IS NOT NULL)) AS classification_present,
    ((COALESCE(r.raw_count_pokemonapi, (0)::numeric) + COALESCE(r.raw_count_tcgdex, (0)::numeric)) > (0)::numeric) AS raw_present,
    (COALESCE(r.pokemonapi_printed_total, r.tcgdex_printed_total) IS NOT NULL) AS printed_total_known,
    COALESCE(f.fork_detected, false) AS fork_detected,
        CASE
            WHEN ((sct.set_code IS NULL) OR (sca.set_code IS NULL)) THEN 'BLOCKED: missing classification routing'::text
            WHEN ((COALESCE(r.raw_count_pokemonapi, (0)::numeric) + COALESCE(r.raw_count_tcgdex, (0)::numeric)) = (0)::numeric) THEN 'BLOCKED: missing raw data'::text
            WHEN (COALESCE(f.fork_detected, false) = true) THEN 'BLOCKED: fork detected'::text
            ELSE 'PASS'::text
        END AS status,
    r.raw_count_pokemonapi,
    r.raw_count_tcgdex,
    r.distinct_ids_pokemonapi,
    r.distinct_ids_tcgdex,
    r.pokemonapi_printed_total,
    r.tcgdex_printed_total,
    r.pokemonapi_ptcgo_code,
    r.overflow_detected,
    r.underflow_detected,
    f.fork_codes
   FROM ((((targets t
     LEFT JOIN scc_target sct ON ((sct.target_set_code = t.set_code)))
     LEFT JOIN scc_anchor sca ON ((sca.target_set_code = t.set_code)))
     LEFT JOIN raws r ON ((r.set_code = t.set_code)))
     LEFT JOIN forks f ON ((f.target_set_code = t.set_code)));
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
CREATE OR REPLACE FUNCTION public.vault_add_card_instance_v1(p_card_print_id uuid, p_quantity integer DEFAULT 1, p_condition_label text DEFAULT 'NM'::text, p_notes text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_set_name text DEFAULT NULL::text, p_photo_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_quantity integer := greatest(1, coalesce(p_quantity, 1));
  v_gv_id text;
  v_name text;
  v_set_name text;
  v_bucket public.vault_items%rowtype;
  v_instance public.vault_item_instances%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_card_print_id is null then
    raise exception 'p_card_print_id is required';
  end if;

  select
    cp.gv_id,
    coalesce(nullif(btrim(cp.name), ''), nullif(btrim(p_name), ''), 'Unknown card'),
    coalesce(nullif(btrim(s.name), ''), nullif(btrim(p_set_name), ''), '')
  into
    v_gv_id,
    v_name,
    v_set_name
  from public.card_prints cp
  left join public.sets s
    on s.id = cp.set_id
  where cp.id = p_card_print_id;

  if v_gv_id is null or btrim(v_gv_id) = '' then
    raise exception 'vault_card_print_missing_identity' using errcode = 'P0001';
  end if;

  for i in 1..v_quantity loop
    select *
    into v_instance
    from public.admin_vault_instance_create_v1(
      p_user_id => v_uid,
      p_card_print_id => p_card_print_id,
      p_condition_label => p_condition_label,
      p_notes => nullif(p_notes, ''),
      p_name => v_name,
      p_set_name => nullif(v_set_name, ''),
      p_photo_url => nullif(p_photo_url, '')
    );
  end loop;

  update public.vault_items
  set
    qty = public.vault_items.qty + v_quantity,
    condition_label = coalesce(p_condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(p_notes, ''), public.vault_items.notes)
  where user_id = v_uid
    and card_id = p_card_print_id
    and archived_at is null
  returning *
  into v_bucket;

  if not found then
    begin
      insert into public.vault_items (
        user_id,
        card_id,
        gv_id,
        qty,
        condition_label,
        notes,
        name,
        set_name,
        photo_url
      )
      values (
        v_uid,
        p_card_print_id,
        v_gv_id,
        v_quantity,
        p_condition_label,
        nullif(p_notes, ''),
        v_name,
        nullif(v_set_name, ''),
        nullif(p_photo_url, '')
      )
      returning *
      into v_bucket;
    exception
      when unique_violation then
        update public.vault_items
        set
          qty = public.vault_items.qty + v_quantity,
          condition_label = coalesce(p_condition_label, public.vault_items.condition_label),
          notes = coalesce(nullif(p_notes, ''), public.vault_items.notes)
        where user_id = v_uid
          and card_id = p_card_print_id
          and archived_at is null
        returning *
        into v_bucket;
    end;
  end if;

  return jsonb_build_object(
    'gv_vi_id', v_instance.gv_vi_id,
    'created_count', v_quantity,
    'legacy_vault_item_id', v_bucket.id,
    'bucket_qty', v_bucket.qty,
    'card_print_id', p_card_print_id
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.vault_archive_all_instances_v1(p_vault_item_id uuid DEFAULT NULL::uuid, p_card_print_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_card_print_id uuid := p_card_print_id;
  v_bucket public.vault_items%rowtype;
  v_archived_count integer := 0;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_vault_item_id is null and p_card_print_id is null then
    raise exception 'p_vault_item_id or p_card_print_id is required';
  end if;

  if p_vault_item_id is not null then
    select *
    into v_bucket
    from public.vault_items
    where id = p_vault_item_id
      and user_id = v_uid
      and archived_at is null
    for update;

    if found then
      if v_card_print_id is null then
        v_card_print_id := v_bucket.card_id;
      elsif v_bucket.card_id <> v_card_print_id then
        raise exception 'vault_item_card_mismatch' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if v_card_print_id is null then
    raise exception 'card_print_id_required_for_archive' using errcode = 'P0001';
  end if;

  update public.vault_item_instances
  set archived_at = v_now
  where user_id = v_uid
    and card_print_id = v_card_print_id
    and archived_at is null;

  get diagnostics v_archived_count = row_count;

  if v_archived_count <= 0 then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  if v_bucket.id is null then
    select *
    into v_bucket
    from public.vault_items
    where user_id = v_uid
      and card_id = v_card_print_id
      and archived_at is null
    for update;
  end if;

  if v_bucket.id is not null then
    update public.vault_items
    set
      qty = 0,
      archived_at = coalesce(archived_at, v_now)
    where id = v_bucket.id
      and user_id = v_uid
      and archived_at is null
    returning *
    into v_bucket;
  end if;

  return jsonb_build_object(
    'archived_count', v_archived_count,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', v_bucket.id,
    'bucket_qty', v_bucket.qty,
    'bucket_archived_at', v_bucket.archived_at
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.vault_archive_one_instance_v1(p_vault_item_id uuid DEFAULT NULL::uuid, p_card_print_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_card_print_id uuid := p_card_print_id;
  v_bucket public.vault_items%rowtype;
  v_instance public.vault_item_instances%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_vault_item_id is null and p_card_print_id is null then
    raise exception 'p_vault_item_id or p_card_print_id is required';
  end if;

  if p_vault_item_id is not null then
    select *
    into v_bucket
    from public.vault_items
    where id = p_vault_item_id
      and user_id = v_uid
      and archived_at is null
    for update;

    if found then
      if v_card_print_id is null then
        v_card_print_id := v_bucket.card_id;
      elsif v_bucket.card_id <> v_card_print_id then
        raise exception 'vault_item_card_mismatch' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if v_card_print_id is null then
    raise exception 'card_print_id_required_for_archive' using errcode = 'P0001';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where user_id = v_uid
    and card_print_id = v_card_print_id
    and archived_at is null
  order by created_at asc, id asc
  limit 1
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  update public.vault_item_instances
  set archived_at = v_now
  where id = v_instance.id
    and user_id = v_uid
    and archived_at is null;

  if not found then
    raise exception 'vault_instance_archive_failed' using errcode = 'P0001';
  end if;

  if not found and p_vault_item_id is null then
    null;
  end if;

  if v_bucket.id is null then
    select *
    into v_bucket
    from public.vault_items
    where user_id = v_uid
      and card_id = v_card_print_id
      and archived_at is null
    for update;
  end if;

  if v_bucket.id is not null then
    if coalesce(v_bucket.qty, 0) <= 1 then
      update public.vault_items
      set
        qty = 0,
        archived_at = coalesce(archived_at, v_now)
      where id = v_bucket.id
        and user_id = v_uid
        and archived_at is null
      returning *
      into v_bucket;
    else
      update public.vault_items
      set qty = v_bucket.qty - 1
      where id = v_bucket.id
        and user_id = v_uid
        and archived_at is null
      returning *
      into v_bucket;
    end if;
  end if;

  return jsonb_build_object(
    'archived_instance_id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', v_bucket.id,
    'bucket_qty', v_bucket.qty,
    'bucket_archived_at', v_bucket.archived_at
  );
end;
$function$;
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
create or replace view "public"."v_best_prices_all_gv_v1" as  SELECT cap.card_print_id AS card_id,
    (gv.grookai_value_nm)::numeric(10,2) AS base_market,
        CASE
            WHEN (gv.grookai_value_nm IS NULL) THEN NULL::text
            ELSE 'grookai.value.v1_1'::text
        END AS base_source,
        CASE
            WHEN (gv.grookai_value_nm IS NULL) THEN NULL::timestamp with time zone
            ELSE COALESCE(cap.last_snapshot_at, cap.updated_at)
        END AS base_ts,
    NULL::text AS condition_label,
    NULL::numeric AS cond_market,
    NULL::text AS cond_source,
    NULL::timestamp with time zone AS cond_ts,
    NULL::text AS grade_company,
    NULL::numeric AS grade_value,
    NULL::text AS grade_label,
    NULL::numeric AS grad_market,
    NULL::text AS grad_source,
    NULL::timestamp with time zone AS grad_ts
   FROM (public.card_print_active_prices cap
     LEFT JOIN public.v_grookai_value_v1_1 gv ON ((gv.card_print_id = cap.card_print_id)))
  WHERE (cap.card_print_id IS NOT NULL);
create or replace view "public"."v_grookai_value_compare_v1_v2" as  WITH ids AS (
         SELECT v_grookai_value_v1.card_print_id
           FROM public.v_grookai_value_v1
        UNION
         SELECT v_grookai_value_v1_1.card_print_id
           FROM public.v_grookai_value_v1_1
        UNION
         SELECT v_grookai_value_v2.card_print_id
           FROM public.v_grookai_value_v2
        )
 SELECT ids.card_print_id,
    COALESCE(v2.nm_floor, v1_1.nm_floor, v1.nm_floor) AS nm_floor,
    COALESCE(v2.nm_median, v1_1.nm_median, v1.nm_median) AS nm_median,
    COALESCE(v2.listing_count, v1_1.listing_count, v1.listing_count) AS listing_count,
    COALESCE(v2.confidence, v1_1.confidence, v1.confidence) AS confidence,
    v1.grookai_value_nm AS v1_value,
    v1_1.grookai_value_nm AS v1_1_value,
    v2.grookai_value_nm AS v2_value,
        CASE
            WHEN ((v1.grookai_value_nm IS NULL) OR (v2.grookai_value_nm IS NULL)) THEN NULL::numeric
            ELSE (v2.grookai_value_nm - v1.grookai_value_nm)
        END AS delta_v1_to_v2,
        CASE
            WHEN ((v1_1.grookai_value_nm IS NULL) OR (v2.grookai_value_nm IS NULL)) THEN NULL::numeric
            ELSE (v2.grookai_value_nm - v1_1.grookai_value_nm)
        END AS delta_v1_1_to_v2,
    v2.spread_ratio AS spread_ratio_v2
   FROM (((ids
     LEFT JOIN public.v_grookai_value_v1 v1 ON ((v1.card_print_id = ids.card_print_id)))
     LEFT JOIN public.v_grookai_value_v1_1 v1_1 ON ((v1_1.card_print_id = ids.card_print_id)))
     LEFT JOIN public.v_grookai_value_v2 v2 ON ((v2.card_print_id = ids.card_print_id)));
create or replace view "public"."v_vault_items" as  WITH base AS (
         SELECT vi.id,
            vi.user_id,
            vi.card_id,
            vi.gv_id,
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
            cp.name AS cp_name,
            cp.set_code,
            cp.number AS cp_number,
            cp.variant_key,
            cp.tcgplayer_id,
            cp.rarity,
            img.image_url AS card_image_url,
            img.image_best,
            img.image_alt_url,
            vi.image_source,
            vi.image_url,
            vi.image_back_source,
            vi.image_back_url
           FROM ((public.vault_items vi
             LEFT JOIN public.card_prints cp ON ((cp.id = vi.card_id)))
             LEFT JOIN public.v_card_images img ON ((img.id = vi.card_id)))
          WHERE (vi.archived_at IS NULL)
        ), norm AS (
         SELECT base.id,
            base.user_id,
            base.card_id,
            base.gv_id,
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
            COALESCE(base.cp_name, '(unknown)'::text) AS card_name,
            base.set_code,
            base.cp_number,
            base.variant_key,
            base.tcgplayer_id,
            base.rarity,
            COALESCE(base.image_url, base.card_image_url) AS image_url,
            base.image_best,
            base.image_alt_url,
            base.image_source,
            base.image_back_source,
            base.image_back_url,
            NULLIF(ltrim(regexp_replace(regexp_replace(COALESCE(base.cp_number, ''::text), '/.*$'::text, ''::text), '\D'::text, ''::text, 'g'::text), '0'::text), ''::text) AS card_digits,
            lower(regexp_replace(COALESCE(base.cp_number, ''::text), '[^0-9a-z]'::text, ''::text, 'g'::text)) AS card_num_norm
           FROM base
        )
 SELECT n.id,
    n.user_id,
    n.card_id,
    n.qty,
    COALESCE(n.qty, 1) AS quantity,
    p.base_market AS market_price_raw,
    NULLIF(p.base_market, (0)::numeric) AS market_price,
    NULLIF(p.base_market, (0)::numeric) AS price,
    ((COALESCE(n.qty, 1))::numeric * p.base_market) AS line_total_raw,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.base_market, (0)::numeric)) AS line_total,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.base_market, (0)::numeric)) AS total,
    p.base_source AS price_source,
    p.base_ts AS price_ts,
    n.created_at,
    n.card_name AS name,
    n.cp_number AS number,
    n.set_code,
    n.variant_key AS variant,
    n.tcgplayer_id,
    NULL::text AS game,
    n.card_num_norm,
    n.card_digits,
    n.set_name,
    n.photo_url,
    n.image_url,
    n.image_best,
    n.image_alt_url,
    n.image_source,
    n.image_back_source,
    n.image_back_url,
    COALESCE(n.image_url, n.image_alt_url, n.image_best, n.photo_url) AS image_url_first,
    COALESCE(n.image_alt_url, n.image_url, n.image_best, n.photo_url) AS image_url_second,
    n.gv_id,
    n.rarity
   FROM (norm n
     LEFT JOIN public.v_best_prices_all_gv_v1 p ON ((p.card_id = n.card_id)));
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
    vvi.image_source,
    vvi.image_back_source,
    vvi.image_back_url,
    vvi.image_url_first,
    vvi.image_url_second,
    vvi.gv_id,
    vi.id AS vault_item_id,
    vi.condition_label,
    vi.is_graded,
    vi.grade_company,
    vi.grade_value,
    vi.grade_label,
    cm.multiplier AS condition_multiplier,
    NULL::timestamp with time zone AS cm_updated_at,
    vvi.market_price_raw AS base_market,
    vvi.price_source AS base_source,
    vvi.price_ts AS base_ts,
    vi.condition_label AS bp_condition_label,
    NULL::numeric AS cond_market,
    NULL::text AS cond_source,
    NULL::timestamp with time zone AS cond_ts,
    vi.grade_company AS bp_grade_company,
    NULL::numeric AS bp_grade_value,
    vi.grade_label AS bp_grade_label,
    NULL::numeric AS grad_market,
    NULL::text AS grad_source,
    NULL::timestamp with time zone AS grad_ts,
        CASE
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN (vvi.price * cm.multiplier)
            ELSE vvi.price
        END AS effective_price,
        CASE
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN 'derived'::text
            ELSE 'base'::text
        END AS effective_mode,
        CASE
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN 'multiplier'::text
            ELSE 'base'::text
        END AS effective_source
   FROM ((public.v_vault_items vvi
     JOIN public.vault_items vi ON (((vi.id = vvi.id) AND (vi.archived_at IS NULL))))
     LEFT JOIN public.condition_multipliers cm ON ((cm.condition_label = vi.condition_label)));
create or replace view "public"."v_vault_items_web" as  SELECT vvie.id,
    vvie.user_id,
    vvie.card_id,
    vvie.qty,
    vvie.quantity,
    vvie.market_price_raw,
    vvie.market_price,
    vvie.price,
    vvie.line_total_raw,
    vvie.line_total,
    vvie.total,
    vvie.price_source,
    vvie.price_ts,
    vvie.created_at,
    vvie.name,
    vvie.number,
    vvie.set_code,
    s.name AS set_name,
    traits.supertype,
    traits.types,
    traits.card_category,
    traits.national_dex,
    vvie.variant,
    vvie.tcgplayer_id,
    vvie.game,
    vvie.rarity,
    vvie.image_url,
    vvie.vault_item_id,
    vvie.condition_label,
    vvie.is_graded,
    vvie.grade_company,
    vvie.grade_value,
    vvie.grade_label,
    vvie.condition_multiplier,
    vvie.cm_updated_at,
    vvie.base_market,
    vvie.base_source,
    vvie.base_ts,
    vvie.bp_condition_label,
    vvie.cond_market,
    vvie.cond_source,
    vvie.cond_ts,
    vvie.bp_grade_company,
    vvie.bp_grade_value,
    vvie.bp_grade_label,
    vvie.grad_market,
    vvie.grad_source,
    vvie.grad_ts,
    vvie.effective_price,
    vvie.effective_mode,
    vvie.effective_source,
    vvie.gv_id
   FROM ((public.v_vault_items_ext vvie
     LEFT JOIN public.sets s ON ((s.code = vvie.set_code)))
     LEFT JOIN LATERAL ( SELECT cpt.supertype,
            cpt.types,
            cpt.card_category,
            cpt.national_dex
           FROM public.card_print_traits cpt
          WHERE ((cpt.card_print_id = vvie.card_id) AND ((cpt.supertype IS NOT NULL) OR (cpt.types IS NOT NULL) OR (cpt.card_category IS NOT NULL) OR (cpt.national_dex IS NOT NULL)))
          ORDER BY
                CASE cpt.source
                    WHEN 'manual'::text THEN 0
                    WHEN 'import'::text THEN 1
                    WHEN 'ai'::text THEN 2
                    ELSE 3
                END, cpt.id DESC
         LIMIT 1) traits ON (true));
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
    card_num_norm,
    card_digits,
    set_name,
    photo_url,
    image_url,
    image_best,
    image_alt_url,
    image_source,
    image_back_source,
    image_back_url,
    image_url_first,
    image_url_second,
    gv_id,
    rarity
   FROM public.v_vault_items
  ORDER BY created_at DESC
 LIMIT 100;
grant select on table "public"."ebay_active_prices_latest" to "anon";
grant select on table "public"."ebay_active_prices_latest" to "authenticated";
grant insert on table "public"."pricing_watch" to "authenticated";
grant select on table "public"."pricing_watch" to "authenticated";
grant update on table "public"."pricing_watch" to "authenticated";
create policy "sets_public_read_anon"
  on "public"."sets"
  as permissive
  for select
  to anon
using (true);
CREATE TRIGGER trg_condition_analysis_enqueue_v1 AFTER INSERT ON public.condition_snapshots FOR EACH ROW EXECUTE FUNCTION public.gv_enqueue_condition_analysis_job_v1();
create policy "identity-images read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'identity-images'::text));
create policy "identity-images service write"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using ((bucket_id = 'identity-images'::text))
with check ((bucket_id = 'identity-images'::text));
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
create policy "users-can-delete-own-user-card-images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'user-card-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "users-can-read-own-user-card-images"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'user-card-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "users-can-upload-user-card-images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'user-card-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
