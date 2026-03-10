-- HARDEN_VIEWS_SECURITY_INVOKER
-- Set security_invoker=true on public views currently missing it.
-- View SQL definitions are sourced from current DB via pg_get_viewdef().

CREATE OR REPLACE VIEW public.card_print_active_prices WITH (security_invoker=true) AS  SELECT cp.id AS card_print_id,
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
   FROM card_prints cp
     LEFT JOIN ebay_active_prices_latest lap ON lap.card_print_id = cp.id;;
CREATE OR REPLACE VIEW public.card_print_latest_price_curve WITH (security_invoker=true) AS  SELECT DISTINCT ON (card_print_id) id,
    card_print_id,
    created_at,
    nm_median,
    nm_floor,
    nm_samples,
    lp_median,
    lp_floor,
    lp_samples,
    mp_median,
    mp_floor,
    mp_samples,
    hp_median,
    hp_floor,
    hp_samples,
    dmg_median,
    dmg_floor,
    dmg_samples,
    confidence,
    listing_count,
    raw_json
   FROM card_print_price_curves
  ORDER BY card_print_id, created_at DESC;;
CREATE OR REPLACE VIEW public.card_prints_clean WITH (security_invoker=true) AS  SELECT id,
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
    squash_ws(strip_control(fix_mojibake_more(fix_mojibake_common(name)))) AS name_display,
    unaccent(squash_ws(strip_control(fix_mojibake_more(fix_mojibake_common(name))))) AS name_search
   FROM card_prints cp;;
CREATE OR REPLACE VIEW public.card_prints_public WITH (security_invoker=true) AS  SELECT set_code,
    number,
    name,
    rarity,
    image_url
   FROM card_prints;;
CREATE OR REPLACE VIEW public.latest_card_prices_v WITH (security_invoker=true) AS  WITH ranked AS (
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
           FROM card_prices cp
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
  WHERE rn = 1;;
CREATE OR REPLACE VIEW public.v_best_prices_all WITH (security_invoker=true) AS  WITH base AS (
         SELECT DISTINCT ON (pr.card_id) pr.card_id,
            pr.market_price AS base_market,
            pr.source AS base_source,
            pr.ts AS base_ts
           FROM prices pr
          WHERE pr.currency = 'USD'::text AND pr.market_price IS NOT NULL
          ORDER BY pr.card_id, pr.ts DESC NULLS LAST
        ), cond AS (
         SELECT DISTINCT ON (cp.card_id, cp.condition_label) cp.card_id,
            cp.condition_label,
            cp.market_price AS cond_market,
            cp.source AS cond_source,
            cp.ts AS cond_ts
           FROM condition_prices cp
          WHERE cp.currency = 'USD'::text AND cp.market_price IS NOT NULL
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
          WHERE gp.currency = 'USD'::text AND gp.market_price IS NOT NULL
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
   FROM base
     FULL JOIN cond ON cond.card_id = base.card_id
     FULL JOIN grad ON grad.card_id = COALESCE(base.card_id, cond.card_id);;
CREATE OR REPLACE VIEW public.v_best_prices_all_gv_v1 WITH (security_invoker=true) AS  SELECT cap.card_print_id AS card_id,
    gv.grookai_value_nm::numeric(10,2) AS base_market,
        CASE
            WHEN gv.grookai_value_nm IS NULL THEN NULL::text
            ELSE 'grookai.value.v1'::text
        END AS base_source,
        CASE
            WHEN gv.grookai_value_nm IS NULL THEN NULL::timestamp with time zone
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
   FROM card_print_active_prices cap
     LEFT JOIN v_grookai_value_v1 gv ON gv.card_print_id = cap.card_print_id
  WHERE cap.card_print_id IS NOT NULL;;
CREATE OR REPLACE VIEW public.v_card_images WITH (security_invoker=true) AS  SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source
   FROM card_prints;;
CREATE OR REPLACE VIEW public.v_card_prices_usd WITH (security_invoker=true) AS  SELECT cp.id AS card_print_id,
    cp.set_code,
    cp.number,
    cp.name,
    cp.image_url,
    r.vault_value,
    r.sample_size,
    r.last_computed_at
   FROM card_prints cp
     LEFT JOIN card_price_rollups r ON r.card_print_id = cp.id AND r.currency = 'USD'::price_currency;;
CREATE OR REPLACE VIEW public.v_card_prints WITH (security_invoker=true) AS  SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source AS source,
    updated_at
   FROM card_prints cp;;
CREATE OR REPLACE VIEW public.v_card_prints_badges WITH (security_invoker=true) AS  SELECT v.id,
    v.name,
    v.number,
    v.set_code,
    v.source,
    v.image_url,
    v.image_best,
    v.image_alt_url,
    v.updated_at,
    cp.rarity,
    (NULLIF(cp.variants::text, 'null'::text)::jsonb ->> 'firstEdition'::text)::boolean AS first_edition,
    (NULLIF(cp.variants::text, 'null'::text)::jsonb ->> 'shadowless'::text)::boolean AS shadowless,
    (NULLIF(cp.variants::text, 'null'::text)::jsonb ->> 'holo'::text)::boolean AS holo,
    COALESCE((NULLIF(cp.variants::text, 'null'::text)::jsonb ->> 'reverse'::text)::boolean, (NULLIF(cp.variants::text, 'null'::text)::jsonb ->> 'reverseHolo'::text)::boolean) AS reverse_holo,
    (NULLIF(cp.variants::text, 'null'::text)::jsonb ->> 'stamped'::text)::boolean AS stamped,
    (NULLIF(cp.variants::text, 'null'::text)::jsonb ->> 'error'::text)::boolean AS error_variant,
    NULLIF(cp.variants::text, 'null'::text)::jsonb AS variants
   FROM v_card_prints v
     LEFT JOIN card_prints cp ON cp.set_code = v.set_code AND cp.number = v.number;;
CREATE OR REPLACE VIEW public.v_card_prints_canon WITH (security_invoker=true) AS  SELECT cp.id,
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
   FROM card_prints cp
     JOIN set_code_classification scc ON scc.set_code = cp.set_code AND scc.is_canon = true;;
CREATE OR REPLACE VIEW public.v_card_prints_noncanon WITH (security_invoker=true) AS  SELECT cp.id,
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
   FROM card_prints cp
     JOIN set_code_classification scc ON scc.set_code = cp.set_code AND scc.is_canon = false;;
CREATE OR REPLACE VIEW public.v_card_search WITH (security_invoker=true) AS  SELECT cp.id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.number AS number_raw,
    regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) AS number_digits,
        CASE
            WHEN regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) <> ''::text THEN lpad(regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text), 3, '0'::text)
            ELSE NULL::text
        END AS number_padded,
        CASE
            WHEN cp.number ~ '\\d+\\s*/\\s*\\d+'::text THEN (lpad(regexp_replace(cp.number, '^\\D*?(\\d+).*$'::text, '\\1'::text), 3, '0'::text) || '/'::text) || regexp_replace(cp.number, '^.*?/(\\d+).*$'::text, '\\1'::text)
            ELSE NULL::text
        END AS number_slashed,
    COALESCE(cp.rarity, NULL::text) AS rarity,
    COALESCE(cp.image_url, cp.image_alt_url) AS image_url,
    COALESCE(cp.image_url, cp.image_alt_url) AS thumb_url,
    COALESCE(cp.image_url, cp.image_alt_url) AS image_best,
    pr.latest_price_cents,
        CASE
            WHEN pr.latest_price_cents IS NOT NULL THEN pr.latest_price_cents::numeric / 100.0
            ELSE NULL::numeric
        END AS latest_price,
    lower(cp.name) AS name_lc,
    NULL::numeric AS search_rank
   FROM card_prints cp
     LEFT JOIN LATERAL ( SELECT round(COALESCE(p.price_mid, p.price_high, p.price_low) * 100::numeric)::integer AS latest_price_cents
           FROM latest_card_prices_v p
          WHERE p.card_id = cp.id
          ORDER BY (
                CASE
                    WHEN lower(COALESCE(p.condition, ''::text)) = ANY (ARRAY['nm'::text, 'near mint'::text, 'lp'::text, 'lightly played'::text, 'raw'::text]) THEN 0
                    ELSE 1
                END), p.observed_at DESC NULLS LAST
         LIMIT 1) pr ON true;;
CREATE OR REPLACE VIEW public.v_cards_search_v2 WITH (security_invoker=true) AS  SELECT id,
    name,
    number,
    set_code,
    rarity,
    NULL::text AS supertype,
    NULL::text[] AS subtypes,
    gv_norm_name(name) AS name_norm,
    gv_num_int(number) AS number_int,
    gv_total_int(number) AS total_int
   FROM card_prints cp;;
CREATE OR REPLACE VIEW public.v_catalog_submissions_review_v1 WITH (security_invoker=true) AS  SELECT id,
    created_at,
    user_id,
    status,
    identity_scan_event_id,
    identity_snapshot_id,
    snapshot_id,
    COALESCE((signals -> 'ai'::text) ->> 'name'::text, (signals -> 'grookai_vision'::text) ->> 'name'::text) AS name,
    COALESCE((signals -> 'ai'::text) ->> 'collector_number'::text, (signals -> 'grookai_vision'::text) ->> 'number_raw'::text) AS collector_number,
    COALESCE(NULLIF((signals -> 'ai'::text) ->> 'printed_total'::text, ''::text)::integer, NULLIF((signals -> 'grookai_vision'::text) ->> 'printed_total'::text, ''::text)::integer) AS printed_total,
    COALESCE(NULLIF((signals -> 'ai'::text) ->> 'confidence'::text, ''::text)::double precision, NULLIF((signals -> 'grookai_vision'::text) ->> 'confidence_0_1'::text, ''::text)::double precision) AS confidence,
    signals
   FROM catalog_submissions_v1 cs;;
CREATE OR REPLACE VIEW public.v_condition_snapshot_analyses_match_card_v1 WITH (security_invoker=true) AS  WITH extracted AS (
         SELECT a.snapshot_id AS analysis_snapshot_id,
            a.analysis_key,
            a.analysis_version,
            a.created_at AS analysis_created_at,
            a.measurements #>> '{fingerprint,match,decision}'::text[] AS decision,
            a.measurements #>> '{fingerprint,match,debug,score}'::text[] AS raw_confidence,
            a.measurements #>> '{fingerprint,match,best_candidate_snapshot_id}'::text[] AS best_candidate_snapshot_id_raw
           FROM condition_snapshot_analyses a
        )
 SELECT e.analysis_snapshot_id,
    e.analysis_key,
    e.analysis_version,
    e.analysis_created_at,
    e.decision,
        CASE
            WHEN e.raw_confidence ~* '^-?[0-9]+(\\.[0-9]+)?([eE]-?[0-9]+)?$'::text THEN e.raw_confidence::numeric
            ELSE NULL::numeric
        END AS confidence_0_1,
    e.best_candidate_snapshot_id_raw,
    COALESCE(e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text, false) AS best_candidate_uuid_valid,
        CASE
            WHEN e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text THEN e.best_candidate_snapshot_id_raw::uuid
            ELSE NULL::uuid
        END AS best_candidate_snapshot_id,
    cs2.vault_item_id AS best_candidate_vault_item_id,
    cp.id AS best_candidate_card_print_id,
    cp.name AS best_candidate_name,
    cp.set_code AS best_candidate_set_code,
    cp.number AS best_candidate_number,
    cp.image_best AS best_candidate_image_best
   FROM extracted e
     LEFT JOIN condition_snapshots cs2 ON cs2.id =
        CASE
            WHEN e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text THEN e.best_candidate_snapshot_id_raw::uuid
            ELSE NULL::uuid
        END
     LEFT JOIN vault_items vi ON vi.id = cs2.vault_item_id
     LEFT JOIN v_card_prints cp ON cp.id = vi.card_id;;
CREATE OR REPLACE VIEW public.v_condition_snapshot_latest_analysis WITH (security_invoker=true) AS  SELECT DISTINCT ON (snapshot_id) snapshot_id,
    analysis_version,
    analysis_key,
    scan_quality,
    measurements,
    defects,
    confidence,
    created_at
   FROM condition_snapshot_analyses a
  ORDER BY snapshot_id, created_at DESC, id DESC;;
CREATE OR REPLACE VIEW public.v_grookai_value_v1 WITH (security_invoker=true) AS  WITH base AS (
         SELECT cap.card_print_id,
            cap.nm_floor,
            cap.nm_median,
            cap.listing_count,
            cap.confidence,
            COALESCE(cap.listing_count, 0)::numeric AS listing_count_eff
           FROM card_print_active_prices cap
          WHERE cap.card_print_id IS NOT NULL
        ), calc AS (
         SELECT b.card_print_id,
            b.nm_floor,
            b.nm_median,
            b.listing_count,
            b.confidence,
            b.listing_count_eff,
            GREATEST(0::numeric, LEAST(1::numeric, (b.listing_count_eff - 5::numeric) / 35::numeric)) AS w_liquidity,
                CASE
                    WHEN b.confidence IS NULL THEN 1::numeric
                    ELSE 0.9 + 0.1 * b.confidence::numeric
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
            c.w_liquidity * c.nm_median::numeric + (1::numeric - c.w_liquidity) * c.nm_floor::numeric AS gv_raw
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
            WHEN nm_floor IS NULL OR nm_median IS NULL THEN NULL::numeric
            ELSE GREATEST(LEAST(nm_floor, nm_median), LEAST(GREATEST(nm_floor, nm_median), gv_raw * conf_factor))
        END AS grookai_value_nm
   FROM gv g;;
CREATE OR REPLACE VIEW public.v_grookai_value_v1_1 WITH (security_invoker=true) AS  WITH base AS (
         SELECT cap.card_print_id,
            cap.nm_floor,
            cap.nm_median,
            cap.listing_count,
            cap.confidence,
            COALESCE(cap.listing_count, 0)::numeric AS listing_count_eff
           FROM card_print_active_prices cap
          WHERE cap.card_print_id IS NOT NULL
        ), calc AS (
         SELECT b.card_print_id,
            b.nm_floor,
            b.nm_median,
            b.listing_count,
            b.confidence,
            b.listing_count_eff,
                CASE
                    WHEN b.nm_floor IS NULL OR b.nm_median IS NULL THEN NULL::numeric
                    ELSE GREATEST(b.nm_floor::numeric, b.nm_median::numeric * 0.70)
                END AS effective_floor_nm,
            GREATEST(0::numeric, LEAST(1::numeric, (b.listing_count_eff - 5::numeric) / 35::numeric)) AS w_liquidity,
                CASE
                    WHEN b.confidence IS NULL THEN 1::numeric
                    ELSE 0.9 + 0.1 * b.confidence::numeric
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
                    WHEN c.effective_floor_nm IS NULL THEN NULL::numeric
                    ELSE c.w_liquidity * c.nm_median::numeric + (1::numeric - c.w_liquidity) * c.effective_floor_nm
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
            WHEN effective_floor_nm IS NULL OR nm_median IS NULL THEN NULL::numeric
            ELSE GREATEST(LEAST(effective_floor_nm, nm_median), LEAST(GREATEST(effective_floor_nm, nm_median), gv_raw * conf_factor))
        END AS grookai_value_nm,
    COALESCE(confidence::numeric, NULL::numeric) AS confidence_out
   FROM gv g;;
CREATE OR REPLACE VIEW public.v_image_coverage_canon WITH (security_invoker=true) AS  SELECT set_code,
    count(*) AS total,
    count(*) FILTER (WHERE image_url IS NOT NULL) AS with_images,
    count(*) FILTER (WHERE image_url IS NULL) AS missing_images,
    round(100.0 * count(*) FILTER (WHERE image_url IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 2) AS coverage_percent
   FROM v_card_prints_canon
  GROUP BY set_code
  ORDER BY (round(100.0 * count(*) FILTER (WHERE image_url IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 2)), (count(*)) DESC;;
CREATE OR REPLACE VIEW public.v_image_coverage_noncanon WITH (security_invoker=true) AS  SELECT set_code,
    count(*) AS total,
    count(*) FILTER (WHERE image_url IS NOT NULL) AS with_images,
    count(*) FILTER (WHERE image_url IS NULL) AS missing_images,
    round(100.0 * count(*) FILTER (WHERE image_url IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 2) AS coverage_percent
   FROM v_card_prints_noncanon
  GROUP BY set_code
  ORDER BY (round(100.0 * count(*) FILTER (WHERE image_url IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 2)), (count(*)) DESC;;
CREATE OR REPLACE VIEW public.v_latest_price WITH (security_invoker=true) AS  SELECT DISTINCT ON (card_print_id, source) card_print_id,
    source,
    currency,
    market,
    low,
    mid,
    high,
    captured_at
   FROM card_price_ticks
  ORDER BY card_print_id, source, captured_at DESC;;
CREATE OR REPLACE VIEW public.v_latest_price_by_card WITH (security_invoker=true) AS  SELECT id,
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
  WHERE rn = 1;;
CREATE OR REPLACE VIEW public.v_latest_price_clean WITH (security_invoker=true) AS  SELECT card_print_id,
    source,
    currency,
    market,
    mid,
    low,
        CASE
            WHEN high IS NOT NULL AND mid IS NOT NULL AND high > (mid * 50::numeric) THEN NULL::numeric
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
          ORDER BY card_price_ticks.card_print_id, card_price_ticks.source, card_price_ticks.captured_at DESC) l;;
CREATE OR REPLACE VIEW public.v_latest_price_pref WITH (security_invoker=true) AS  SELECT id,
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
            row_number() OVER (PARTITION BY p.card_id ORDER BY (
                CASE
                    WHEN p.source = 'tcgdex'::text THEN 1
                    WHEN p.source = 'tcgplayer'::text THEN 2
                    ELSE 9
                END), p.ts DESC) AS rn
           FROM prices p) q
  WHERE rn = 1;;
CREATE OR REPLACE VIEW public.v_pokemonapi_contract_audit WITH (security_invoker=true) AS  WITH pokemonapi_raw AS (
         SELECT ri.id AS raw_import_id,
            ri.payload,
            ri.payload ->> 'id'::text AS card_id,
            ri.payload ->> '_kind'::text AS kind,
            ri.payload -> 'images'::text AS images,
            COALESCE((ri.payload -> 'set'::text) ->> 'id'::text, ri.payload ->> 'set'::text, ri.payload ->> '_set_external_id'::text) AS api_set_id
           FROM raw_imports ri
          WHERE ri.source = 'pokemonapi'::text
        ), parsed AS (
         SELECT pokemonapi_raw.raw_import_id,
            pokemonapi_raw.kind,
            pokemonapi_raw.card_id,
            pokemonapi_raw.images,
            pokemonapi_raw.api_set_id,
            pokemonapi_raw.kind IS NULL AS missing_kind,
            pokemonapi_raw.kind = 'card'::text AND pokemonapi_raw.card_id IS NULL AS missing_card_id,
            pokemonapi_raw.kind = 'card'::text AND pokemonapi_raw.api_set_id IS NULL AS missing_set_id,
            pokemonapi_raw.kind = 'card'::text AND pokemonapi_raw.card_id IS NOT NULL AND pokemonapi_raw.card_id !~ '^[A-Za-z0-9]+-[0-9]+$'::text AS malformed_card_id,
            pokemonapi_raw.kind = 'card'::text AND pokemonapi_raw.images IS NULL AS missing_images_field
           FROM pokemonapi_raw
        ), classified AS (
         SELECT p.raw_import_id,
            p.kind,
            p.card_id,
            p.images,
            p.api_set_id,
            p.missing_kind,
            p.missing_card_id,
            p.missing_set_id,
            p.malformed_card_id,
            p.missing_images_field,
            s.canonical_set_code,
            s.pokemonapi_set_id AS classified_api_set_id,
            s.pokemonapi_set_id IS NULL AS unknown_set_id
           FROM parsed p
             LEFT JOIN set_code_classification s ON s.pokemonapi_set_id = p.api_set_id AND s.is_canon = true
        )
 SELECT COALESCE(canonical_set_code, api_set_id) AS canonical_set_code,
    api_set_id AS pokemonapi_set_id,
    count(*) AS total_rows,
    count(*) FILTER (WHERE missing_kind) AS missing_kind_count,
    count(*) FILTER (WHERE missing_card_id) AS missing_card_id_count,
    count(*) FILTER (WHERE missing_set_id) AS missing_set_id_count,
    count(*) FILTER (WHERE malformed_card_id) AS malformed_card_id_count,
    count(*) FILTER (WHERE missing_images_field) AS missing_images_field_count,
    count(*) FILTER (WHERE unknown_set_id) AS unknown_set_id_count
   FROM classified
  GROUP BY (COALESCE(canonical_set_code, api_set_id)), api_set_id;;
CREATE OR REPLACE VIEW public.v_recently_added WITH (security_invoker=true) AS  SELECT id,
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
    image_url_second
   FROM v_vault_items vvi
  ORDER BY created_at DESC
 LIMIT 100;;
CREATE OR REPLACE VIEW public.v_tcgdex_contract_audit WITH (security_invoker=true) AS  WITH tcgdex_raw AS (
         SELECT ri.id AS raw_import_id,
            ri.payload,
            (ri.payload -> 'card'::text) ->> 'id'::text AS card_id,
            COALESCE((ri.payload -> 'card'::text) ->> 'localId'::text, ri.payload ->> 'localId'::text) AS local_id,
            ri.payload ->> 'set_external_id'::text AS set_external_id
           FROM raw_imports ri
          WHERE ri.source = 'tcgdex'::text
        ), parsed AS (
         SELECT tcgdex_raw.raw_import_id,
            tcgdex_raw.card_id,
            tcgdex_raw.local_id,
            tcgdex_raw.set_external_id,
            tcgdex_raw.card_id IS NULL OR tcgdex_raw.local_id IS NULL AS missing_identity,
            tcgdex_raw.card_id IS NOT NULL AND tcgdex_raw.card_id !~ '^[A-Za-z0-9]+-[A-Za-z0-9]+$'::text AS malformed_id,
            COALESCE(split_part(tcgdex_raw.card_id, '-'::text, 1), tcgdex_raw.set_external_id) AS tcgdex_set_id_extracted
           FROM tcgdex_raw
        ), classified AS (
         SELECT p.raw_import_id,
            p.card_id,
            p.local_id,
            p.set_external_id,
            p.missing_identity,
            p.malformed_id,
            p.tcgdex_set_id_extracted,
            s.canonical_set_code,
            s.tcgdex_set_id AS classified_tcgdex_set_id,
            s.tcgdex_set_id IS NULL AS unknown_set_id
           FROM parsed p
             LEFT JOIN set_code_classification s ON s.tcgdex_set_id = p.tcgdex_set_id_extracted
        )
 SELECT COALESCE(canonical_set_code, tcgdex_set_id_extracted) AS canonical_set_code,
    tcgdex_set_id_extracted AS tcgdex_set_id,
    count(*) AS total_rows,
    count(*) FILTER (WHERE missing_identity) AS missing_identity_count,
    count(*) FILTER (WHERE malformed_id) AS malformed_id_count,
    count(*) FILTER (WHERE unknown_set_id) AS unknown_set_id_count
   FROM classified
  GROUP BY (COALESCE(canonical_set_code, tcgdex_set_id_extracted)), tcgdex_set_id_extracted;;
CREATE OR REPLACE VIEW public.v_ticker_24h WITH (security_invoker=true) AS  WITH latest AS (
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
          WHERE t.captured_at <= (now() - '24:00:00'::interval)
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
            WHEN pr.market_24h IS NULL OR pr.market_24h = 0::numeric THEN NULL::numeric
            ELSE round(100::numeric * (l.market_now - pr.market_24h) / pr.market_24h, 2)
        END AS pct_change_24h,
    l.ts_now AS last_updated
   FROM latest l
     JOIN card_prints p ON p.id = l.card_print_id
     LEFT JOIN prev24 pr ON pr.card_print_id = l.card_print_id AND pr.source = l.source;;
CREATE OR REPLACE VIEW public.v_vault_items WITH (security_invoker=true) AS  WITH base AS (
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
            img.image_url AS card_image_url,
            img.image_best,
            img.image_alt_url,
            vi.image_source,
            vi.image_url,
            vi.image_back_source,
            vi.image_back_url
           FROM vault_items vi
             LEFT JOIN cards c ON c.id = vi.card_id
             LEFT JOIN v_card_images img ON img.id = vi.card_id
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
            base.image_source,
            base.image_back_source,
            base.image_back_url,
            NULLIF(ltrim(regexp_replace(regexp_replace(COALESCE(base.img_number, base.c_number, ''::text), '/.*$'::text, ''::text), '\D'::text, ''::text, 'g'::text), '0'::text), ''::text) AS card_digits,
            lower(regexp_replace(COALESCE(base.img_number, base.c_number, ''::text), '[^0-9a-z]'::text, ''::text, 'g'::text)) AS card_num_norm
           FROM base
        )
 SELECT n.id,
    n.user_id,
    n.card_id,
    COALESCE(n.qty, 1) AS qty,
    COALESCE(n.qty, 1) AS quantity,
    p.base_market AS market_price_raw,
    NULLIF(p.base_market, 0::numeric) AS market_price,
    NULLIF(p.base_market, 0::numeric) AS price,
    COALESCE(n.qty, 1)::numeric * p.base_market AS line_total_raw,
    COALESCE(n.qty, 1)::numeric * NULLIF(p.base_market, 0::numeric) AS line_total,
    COALESCE(n.qty, 1)::numeric * NULLIF(p.base_market, 0::numeric) AS total,
    p.base_source AS price_source,
    p.base_ts AS price_ts,
    n.created_at,
    n.card_name AS name,
    COALESCE(n.img_number, n.c_number) AS number,
    n.set_code,
    n.variant,
    n.tcgplayer_id,
    n.game,
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
    COALESCE(n.image_alt_url, n.image_url, n.image_best, n.photo_url) AS image_url_second
   FROM norm n
     LEFT JOIN v_best_prices_all_gv_v1 p ON p.card_id = n.card_id;;
CREATE OR REPLACE VIEW public.v_vault_items_ext WITH (security_invoker=true) AS  SELECT vvi.id,
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
    NULL::text AS rarity,
    vvi.image_url,
    vvi.image_best,
    vvi.image_alt_url,
    vvi.image_source,
    vvi.image_back_source,
    vvi.image_back_url,
    vvi.image_url_first,
    vvi.image_url_second,
    vi.id AS vault_item_id,
    vi.condition_label,
    vi.is_graded,
    vi.grade_company,
    vi.grade_value,
    vi.grade_label,
    cm.multiplier AS condition_multiplier,
    NULL::timestamp with time zone AS cm_updated_at,
    bp.base_market,
    bp.base_source,
    bp.base_ts,
    bp.condition_label AS bp_condition_label,
    bp.cond_market,
    bp.cond_source,
    bp.cond_ts,
    bp.grade_company AS bp_grade_company,
    bp.grade_value AS bp_grade_value,
    bp.grade_label AS bp_grade_label,
    bp.grad_market,
    bp.grad_source,
    bp.grad_ts,
        CASE
            WHEN vi.is_graded AND bp.grad_market IS NOT NULL THEN bp.grad_market
            WHEN bp.cond_market IS NOT NULL THEN bp.cond_market
            WHEN vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL THEN vvi.price * cm.multiplier
            ELSE vvi.price
        END AS effective_price,
        CASE
            WHEN vi.is_graded AND bp.grad_market IS NOT NULL THEN 'graded'::text
            WHEN bp.cond_market IS NOT NULL THEN 'condition'::text
            WHEN vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL THEN 'derived'::text
            ELSE 'base'::text
        END AS effective_mode,
        CASE
            WHEN vi.is_graded AND bp.grad_market IS NOT NULL THEN 'graded.market'::text
            WHEN bp.cond_market IS NOT NULL THEN 'condition.market'::text
            WHEN vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL THEN 'multiplier'::text
            ELSE 'base'::text
        END AS effective_source
   FROM v_vault_items vvi
     JOIN vault_items vi ON vi.id = vvi.id
     LEFT JOIN v_best_prices_all_gv_v1 bp ON bp.card_id = vvi.card_id
     LEFT JOIN condition_multipliers cm ON cm.condition_label = vi.condition_label;;
CREATE OR REPLACE VIEW public.v_wall_feed WITH (security_invoker=true) AS  SELECT listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM wall_feed_view;;
CREATE OR REPLACE VIEW public.v_wishlist_items WITH (security_invoker=true) AS  SELECT wi.id,
    wi.user_id,
    wi.card_id,
    c.name,
    c.set_code AS set_name,
    c.number,
    COALESCE(lp.market_price, 0::numeric) AS market_price,
    c.image_url,
    wi.created_at
   FROM wishlist_items wi
     LEFT JOIN card_prints c ON c.id = wi.card_id
     LEFT JOIN v_latest_price_pref lp ON lp.card_id = wi.card_id;;
CREATE OR REPLACE VIEW public.v_wishlist_value_by_user WITH (security_invoker=true) AS  WITH picked AS (
         SELECT wi.user_id,
            ( SELECT l.market
                   FROM v_latest_price_clean l
                  WHERE l.card_print_id = wi.card_id
                  ORDER BY (
                        CASE l.source
                            WHEN 'tcgplayer'::text THEN 1
                            ELSE 2
                        END), l.captured_at DESC
                 LIMIT 1) AS market,
            ( SELECT l.captured_at
                   FROM v_latest_price_clean l
                  WHERE l.card_print_id = wi.card_id
                  ORDER BY (
                        CASE l.source
                            WHEN 'tcgplayer'::text THEN 1
                            ELSE 2
                        END), l.captured_at DESC
                 LIMIT 1) AS ts
           FROM wishlist_items wi
        )
 SELECT user_id,
    count(*)::integer AS items,
    COALESCE(sum(market), 0::numeric) AS wishlist_value,
    max(ts) AS last_updated
   FROM picked
  GROUP BY user_id;;
CREATE OR REPLACE VIEW public.wall_feed_v WITH (security_invoker=true) AS  SELECT listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM wall_feed_view;;
CREATE OR REPLACE VIEW public.wall_feed_view WITH (security_invoker=true) AS  SELECT id AS listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM wall_thumbs_3x4 w
  ORDER BY created_at DESC;;
