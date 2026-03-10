-- SECURITY_INVOKER_FORCESET_V1
-- Source-of-truth: remote pg_get_viewdef(public.<view>::regclass, true)

CREATE OR REPLACE VIEW public.v_special_set_code_forks
WITH (security_invoker=true)
AS
 WITH targets(set_code) AS (
         VALUES ('sv08.5'::text), ('sv10.5b'::text), ('sv10.5w'::text)
        )
 SELECT t.set_code AS target_set_code,
    array_agg(DISTINCT cp.set_code) FILTER (WHERE cp.set_code IS NOT NULL) AS fork_codes,
    count(*) AS total_rows,
    count(DISTINCT cp.set_code) > 1 AS fork_detected
   FROM targets t
     LEFT JOIN card_prints cp ON cp.set_code ~~* (t.set_code || '%'::text) OR cp.set_code ~~* (regexp_replace(t.set_code, '\\.'::text, ''::text, 'g'::text) || '%'::text)
     LEFT JOIN sets s ON cp.set_id = s.id
  WHERE s.code = t.set_code OR cp.set_code ~~* (t.set_code || '%'::text) OR cp.set_code ~~* (regexp_replace(t.set_code, '\\.'::text, ''::text, 'g'::text) || '%'::text)
  GROUP BY t.set_code;

CREATE OR REPLACE VIEW public.v_special_set_print_membership
WITH (security_invoker=true)
AS
 WITH targets(set_code) AS (
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
            count(*) OVER (PARTITION BY cp.set_code, cp.number_plain, (COALESCE(cp.variant_key, ''::text))) AS variant_collision_count
           FROM targets t
             JOIN sets s ON s.code = t.set_code
             LEFT JOIN card_prints cp ON cp.set_code = s.code OR cp.set_id = s.id
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
    card_set_id IS NULL AS missing_set_id,
    number_plain IS NULL OR number_plain = ''::text AS missing_number_plain,
    print_identity_key IS NULL OR print_identity_key = ''::text AS missing_print_identity_key
   FROM base;

CREATE OR REPLACE VIEW public.v_special_set_raw_counts
WITH (security_invoker=true)
AS
 WITH targets(set_code) AS (
         VALUES ('sv08.5'::text), ('sv10.5b'::text), ('sv10.5w'::text)
        ), classify AS (
         SELECT t.set_code,
            scc.pokemonapi_set_id,
            scc.tcgdex_set_id
           FROM targets t
             LEFT JOIN set_code_classification scc ON scc.set_code = t.set_code
        ), raw_cards AS (
         SELECT r.id,
            r.source,
            r.payload,
            COALESCE((r.payload -> 'set'::text) ->> 'id'::text, (r.payload -> 'set'::text) ->> 'code'::text, r.payload ->> 'set_id'::text, r.payload ->> 'setId'::text, r.payload ->> 'setCode'::text, (r.payload -> 'card'::text) ->> 'setId'::text, r.payload ->> 'set_external_id'::text, r.payload ->> '_set_external_id'::text) AS set_ref,
            COALESCE(r.payload ->> '_external_id'::text, r.payload ->> 'id'::text, (r.payload -> 'card'::text) ->> 'id'::text, (r.payload -> 'card'::text) ->> '_id'::text) AS external_card_id
           FROM raw_imports r
          WHERE (r.payload ->> '_kind'::text) = 'card'::text
        ), raw_sets AS (
         SELECT r.source,
            r.payload
           FROM raw_imports r
          WHERE (r.payload ->> '_kind'::text) = 'set'::text
        ), counts AS (
         SELECT c.set_code,
            ( SELECT count(*)::numeric AS count
                   FROM raw_cards rc
                  WHERE rc.source = 'pokemonapi'::text AND rc.set_ref = c.pokemonapi_set_id) AS raw_count_pokemonapi,
            ( SELECT count(DISTINCT rc.external_card_id)::numeric AS count
                   FROM raw_cards rc
                  WHERE rc.source = 'pokemonapi'::text AND rc.set_ref = c.pokemonapi_set_id) AS distinct_ids_pokemonapi,
            ( SELECT count(*)::numeric AS count
                   FROM raw_cards rc
                  WHERE rc.source = 'tcgdex'::text AND rc.set_ref = c.tcgdex_set_id) AS raw_count_tcgdex,
            ( SELECT count(DISTINCT rc.external_card_id)::numeric AS count
                   FROM raw_cards rc
                  WHERE rc.source = 'tcgdex'::text AND rc.set_ref = c.tcgdex_set_id) AS distinct_ids_tcgdex,
            ( SELECT (rs.payload ->> 'printedTotal'::text)::integer AS int4
                   FROM raw_sets rs
                  WHERE rs.source = 'pokemonapi'::text AND (rs.payload ->> '_external_id'::text) = c.pokemonapi_set_id
                 LIMIT 1) AS pokemonapi_printed_total,
            NULL::integer AS tcgdex_printed_total,
            ( SELECT rs.payload ->> 'ptcgoCode'::text
                   FROM raw_sets rs
                  WHERE rs.source = 'pokemonapi'::text AND (rs.payload ->> '_external_id'::text) = c.pokemonapi_set_id
                 LIMIT 1) AS pokemonapi_ptcgo_code
           FROM classify c
        )
 SELECT set_code,
    raw_count_pokemonapi,
    distinct_ids_pokemonapi,
    raw_count_tcgdex,
    distinct_ids_tcgdex,
    pokemonapi_printed_total,
    tcgdex_printed_total,
    pokemonapi_ptcgo_code,
    (raw_count_pokemonapi + raw_count_tcgdex) > COALESCE(pokemonapi_printed_total, 0)::numeric AS overflow_detected,
    (raw_count_pokemonapi + raw_count_tcgdex) < COALESCE(pokemonapi_printed_total, 0)::numeric AS underflow_detected
   FROM counts;

CREATE OR REPLACE VIEW public.v_vault_items_web
WITH (security_invoker=true)
AS
 SELECT id,
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
    vault_item_id,
    condition_label,
    is_graded,
    grade_company,
    grade_value,
    grade_label,
    condition_multiplier,
    cm_updated_at,
    base_market,
    base_source,
    base_ts,
    bp_condition_label,
    cond_market,
    cond_source,
    cond_ts,
    bp_grade_company,
    bp_grade_value,
    bp_grade_label,
    grad_market,
    grad_source,
    grad_ts,
    effective_price,
    effective_mode,
    effective_source
   FROM v_vault_items_ext;

CREATE OR REPLACE VIEW public.v_special_set_reconstruction_gate
WITH (security_invoker=true)
AS
 WITH targets(set_code) AS (
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
           FROM targets t_1
             LEFT JOIN set_code_classification scc ON scc.set_code = t_1.set_code
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
           FROM anchor a
             LEFT JOIN set_code_classification scc ON scc.set_code = a.anchor_set_code AND scc.is_canon = true
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
           FROM v_special_set_raw_counts r_1
        ), forks AS (
         SELECT f_1.target_set_code,
            f_1.fork_codes,
            f_1.total_rows,
            f_1.fork_detected
           FROM v_special_set_code_forks f_1
        )
 SELECT t.set_code,
    sct.set_code IS NOT NULL AND sca.set_code IS NOT NULL AS classification_present,
    (COALESCE(r.raw_count_pokemonapi, 0::numeric) + COALESCE(r.raw_count_tcgdex, 0::numeric)) > 0::numeric AS raw_present,
    COALESCE(r.pokemonapi_printed_total, r.tcgdex_printed_total) IS NOT NULL AS printed_total_known,
    COALESCE(f.fork_detected, false) AS fork_detected,
        CASE
            WHEN sct.set_code IS NULL OR sca.set_code IS NULL THEN 'BLOCKED: missing classification routing'::text
            WHEN (COALESCE(r.raw_count_pokemonapi, 0::numeric) + COALESCE(r.raw_count_tcgdex, 0::numeric)) = 0::numeric THEN 'BLOCKED: missing raw data'::text
            WHEN COALESCE(f.fork_detected, false) = true THEN 'BLOCKED: fork detected'::text
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
   FROM targets t
     LEFT JOIN scc_target sct ON sct.target_set_code = t.set_code
     LEFT JOIN scc_anchor sca ON sca.target_set_code = t.set_code
     LEFT JOIN raws r ON r.set_code = t.set_code
     LEFT JOIN forks f ON f.target_set_code = t.set_code;

CREATE OR REPLACE VIEW public.v_sets_display
WITH (security_invoker=true)
AS
 SELECT id,
    game,
    code AS canonical_set_code,
    name,
    COALESCE(( SELECT sc.set_code
           FROM set_code_classification sc
          WHERE sc.is_canon = false AND sc.canonical_set_code = s.code AND sc.set_code ~~ '%-GG'::text
         LIMIT 1), code) AS display_set_code
   FROM sets s;

CREATE OR REPLACE VIEW public.v_card_prints_web_v1
WITH (security_invoker=true)
AS
 SELECT id AS card_print_id,
    set_id,
    set_code,
    name,
    number,
    number_plain,
    rarity,
    variant_key,
    image_url
   FROM card_prints cp;

CREATE OR REPLACE VIEW public.v_promotion_umbrella_preflight_v1
WITH (security_invoker=true)
AS
 WITH tcgdex_sets AS (
         SELECT (r.payload -> 'set'::text) ->> 'id'::text AS set_code,
            (r.payload -> 'set'::text) ->> 'name'::text AS set_name,
            NULLIF(((r.payload -> 'set'::text) -> 'cardCount'::text) ->> 'official'::text, ''::text)::integer AS official_count
           FROM raw_imports r
          WHERE r.source = 'tcgdex'::text AND (r.payload ->> '_kind'::text) = 'set'::text
        ), tcgdex_cards AS (
         SELECT r.payload ->> '_set_external_id'::text AS set_code,
            r.payload ->> '_external_id'::text AS external_id,
            split_part(r.payload ->> '_external_id'::text, '-'::text, 1) AS origin_lane,
            (r.payload -> 'card'::text) ->> 'localId'::text AS local_id,
            (r.payload -> 'card'::text) ->> 'name'::text AS card_name
           FROM raw_imports r
          WHERE r.source = 'tcgdex'::text AND (r.payload ->> '_kind'::text) = 'card'::text
        ), agg AS (
         SELECT c.set_code,
            count(*) AS raw_card_count,
            count(DISTINCT c.origin_lane) AS origin_lane_count,
            bool_or(c.local_id ~ '^[0-9]+$'::text) AS has_numeric_local_id,
            bool_or(NOT c.local_id ~ '^[0-9]+$'::text) AS has_non_numeric_local_id,
            count(*) FILTER (WHERE c.local_id IS NOT NULL) AS rows_with_local_id
           FROM tcgdex_cards c
          GROUP BY c.set_code
        ), name_collisions AS (
         SELECT c.set_code,
            count(*) AS collision_rows
           FROM ( SELECT tcgdex_cards.set_code,
                    tcgdex_cards.local_id,
                    count(DISTINCT tcgdex_cards.card_name) AS distinct_names
                   FROM tcgdex_cards
                  WHERE tcgdex_cards.local_id IS NOT NULL
                  GROUP BY tcgdex_cards.set_code, tcgdex_cards.local_id
                 HAVING count(DISTINCT tcgdex_cards.card_name) > 1) x
             JOIN tcgdex_cards c ON c.set_code = x.set_code AND c.local_id = x.local_id
          GROUP BY c.set_code
        )
 SELECT s.set_code,
    s.set_name,
    s.official_count,
    COALESCE(a.raw_card_count, 0::bigint) AS raw_card_count,
    s.official_count IS NOT NULL AND COALESCE(a.raw_card_count, 0::bigint) > s.official_count AS checklist_mismatch,
    COALESCE(a.origin_lane_count, 0::bigint) > 1 AS multi_origin_lanes,
    COALESCE(a.has_numeric_local_id, false) AND COALESCE(a.has_non_numeric_local_id, false) AS mixed_numbering,
    COALESCE(nc.collision_rows, 0::bigint) > 0 AS name_collision,
    COALESCE(a.origin_lane_count, 0::bigint) AS origin_lane_count,
    COALESCE(nc.collision_rows, 0::bigint) AS name_collision_rows
   FROM tcgdex_sets s
     LEFT JOIN agg a ON a.set_code = s.set_code
     LEFT JOIN name_collisions nc ON nc.set_code = s.set_code;


