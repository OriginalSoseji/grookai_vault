-- Grookai Vault Baseline - Post Views
-- Extracted so functions exist before views.

SET search_path TO public, extensions;


CREATE VIEW public.latest_card_prices_v AS
 WITH ranked AS (
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


CREATE VIEW public.v_card_search AS
 SELECT cp.id,
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


CREATE VIEW public.v_cards_search_v2 AS
 SELECT id,
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


CREATE VIEW public.card_print_active_prices AS
 SELECT cp.id AS card_print_id,
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


CREATE VIEW public.card_print_latest_price_curve AS
 SELECT DISTINCT ON (card_print_id) id,
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
   FROM public.card_print_price_curves
  ORDER BY card_print_id, created_at DESC;


CREATE VIEW public.card_prints_clean AS
 SELECT id,
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
    extensions.unaccent(public.squash_ws(public.strip_control(public.fix_mojibake_more(public.fix_mojibake_common(name))))) AS name_search
   FROM public.card_prints cp;


CREATE VIEW public.card_prints_public AS
 SELECT set_code,
    number,
    name,
    rarity,
    image_url
   FROM public.card_prints;


CREATE VIEW public.v_best_prices_all AS
 WITH base AS (
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


CREATE VIEW public.v_card_images AS
 SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source
   FROM public.card_prints;


CREATE VIEW public.v_card_prices_usd AS
 SELECT cp.id AS card_print_id,
    cp.set_code,
    cp.number,
    cp.name,
    cp.image_url,
    r.vault_value,
    r.sample_size,
    r.last_computed_at
   FROM (public.card_prints cp
     LEFT JOIN public.card_price_rollups r ON (((r.card_print_id = cp.id) AND (r.currency = 'USD'::public.price_currency))));


CREATE VIEW public.v_card_prints AS
 SELECT id,
    set_code,
    number,
    name,
    COALESCE(image_url, image_alt_url) AS image_best,
    image_url,
    image_alt_url,
    image_source AS source,
    updated_at
   FROM public.card_prints cp;


CREATE VIEW public.v_card_prints_badges AS
 SELECT v.id,
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


CREATE VIEW public.v_card_prints_canon AS
 SELECT cp.id,
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


CREATE VIEW public.v_card_prints_noncanon AS
 SELECT cp.id,
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


CREATE VIEW public.v_image_coverage_canon AS
 SELECT set_code,
    count(*) AS total,
    count(*) FILTER (WHERE (image_url IS NOT NULL)) AS with_images,
    count(*) FILTER (WHERE (image_url IS NULL)) AS missing_images,
    round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS coverage_percent
   FROM public.v_card_prints_canon
  GROUP BY set_code
  ORDER BY (round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2)), (count(*)) DESC;


CREATE VIEW public.v_image_coverage_noncanon AS
 SELECT set_code,
    count(*) AS total,
    count(*) FILTER (WHERE (image_url IS NOT NULL)) AS with_images,
    count(*) FILTER (WHERE (image_url IS NULL)) AS missing_images,
    round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS coverage_percent
   FROM public.v_card_prints_noncanon
  GROUP BY set_code
  ORDER BY (round(((100.0 * (count(*) FILTER (WHERE (image_url IS NOT NULL)))::numeric) / (NULLIF(count(*), 0))::numeric), 2)), (count(*)) DESC;


CREATE VIEW public.v_latest_price AS
 SELECT DISTINCT ON (card_print_id, source) card_print_id,
    source,
    currency,
    market,
    low,
    mid,
    high,
    captured_at
   FROM public.card_price_ticks
  ORDER BY card_print_id, source, captured_at DESC;


CREATE VIEW public.v_latest_price_by_card AS
 SELECT id,
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


CREATE VIEW public.v_latest_price_clean AS
 SELECT card_print_id,
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


CREATE VIEW public.v_latest_price_pref AS
 SELECT id,
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


CREATE VIEW public.v_latest_prices WITH (security_invoker='true') AS
 SELECT DISTINCT ON (card_id) card_id,
    market_price,
    source,
    ts
   FROM public.prices
  WHERE (market_price IS NOT NULL)
  ORDER BY card_id, ts DESC;


CREATE VIEW public.v_pokemonapi_contract_audit AS
 WITH pokemonapi_raw AS (
         SELECT ri.id AS raw_import_id,
            ri.payload,
            (ri.payload ->> 'id'::text) AS card_id,
            (ri.payload ->> '_kind'::text) AS kind,
            (ri.payload -> 'images'::text) AS images,
            COALESCE(((ri.payload -> 'set'::text) ->> 'id'::text), (ri.payload ->> 'set'::text), (ri.payload ->> '_set_external_id'::text)) AS api_set_id
           FROM public.raw_imports ri
          WHERE (ri.source = 'pokemonapi'::text)
        ), parsed AS (
         SELECT pokemonapi_raw.raw_import_id,
            pokemonapi_raw.kind,
            pokemonapi_raw.card_id,
            pokemonapi_raw.images,
            pokemonapi_raw.api_set_id,
            (pokemonapi_raw.kind IS NULL) AS missing_kind,
            ((pokemonapi_raw.kind = 'card'::text) AND (pokemonapi_raw.card_id IS NULL)) AS missing_card_id,
            ((pokemonapi_raw.kind = 'card'::text) AND (pokemonapi_raw.api_set_id IS NULL)) AS missing_set_id,
            ((pokemonapi_raw.kind = 'card'::text) AND (pokemonapi_raw.card_id IS NOT NULL) AND (pokemonapi_raw.card_id !~ '^[A-Za-z0-9]+-[0-9]+$'::text)) AS malformed_card_id,
            ((pokemonapi_raw.kind = 'card'::text) AND (pokemonapi_raw.images IS NULL)) AS missing_images_field
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
            (s.pokemonapi_set_id IS NULL) AS unknown_set_id
           FROM (parsed p
             LEFT JOIN public.set_code_classification s ON (((s.pokemonapi_set_id = p.api_set_id) AND (s.is_canon = true))))
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
  GROUP BY COALESCE(canonical_set_code, api_set_id), api_set_id;


CREATE VIEW public.v_vault_items AS
 WITH base AS (
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
    NULLIF(p.base_market, (0)::numeric) AS market_price,
    NULLIF(p.base_market, (0)::numeric) AS price,
    ((COALESCE(n.qty, 1))::numeric * p.base_market) AS line_total_raw,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.base_market, (0)::numeric)) AS line_total,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.base_market, (0)::numeric)) AS total,
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
   FROM (norm n
     LEFT JOIN public.v_best_prices_all p ON ((p.card_id = n.card_id)));


CREATE VIEW public.v_recently_added AS
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
   FROM public.v_vault_items vvi
  ORDER BY created_at DESC
 LIMIT 100;


CREATE VIEW public.v_tcgdex_contract_audit AS
 WITH tcgdex_raw AS (
         SELECT ri.id AS raw_import_id,
            ri.payload,
            ((ri.payload -> 'card'::text) ->> 'id'::text) AS card_id,
            COALESCE(((ri.payload -> 'card'::text) ->> 'localId'::text), (ri.payload ->> 'localId'::text)) AS local_id,
            (ri.payload ->> 'set_external_id'::text) AS set_external_id
           FROM public.raw_imports ri
          WHERE (ri.source = 'tcgdex'::text)
        ), parsed AS (
         SELECT tcgdex_raw.raw_import_id,
            tcgdex_raw.card_id,
            tcgdex_raw.local_id,
            tcgdex_raw.set_external_id,
            ((tcgdex_raw.card_id IS NULL) OR (tcgdex_raw.local_id IS NULL)) AS missing_identity,
            ((tcgdex_raw.card_id IS NOT NULL) AND (tcgdex_raw.card_id !~ '^[A-Za-z0-9]+-[A-Za-z0-9]+$'::text)) AS malformed_id,
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
            (s.tcgdex_set_id IS NULL) AS unknown_set_id
           FROM (parsed p
             LEFT JOIN public.set_code_classification s ON ((s.tcgdex_set_id = p.tcgdex_set_id_extracted)))
        )
 SELECT COALESCE(canonical_set_code, tcgdex_set_id_extracted) AS canonical_set_code,
    tcgdex_set_id_extracted AS tcgdex_set_id,
    count(*) AS total_rows,
    count(*) FILTER (WHERE missing_identity) AS missing_identity_count,
    count(*) FILTER (WHERE malformed_id) AS malformed_id_count,
    count(*) FILTER (WHERE unknown_set_id) AS unknown_set_id_count
   FROM classified
  GROUP BY COALESCE(canonical_set_code, tcgdex_set_id_extracted), tcgdex_set_id_extracted;


CREATE VIEW public.v_ticker_24h AS
 WITH latest AS (
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


CREATE VIEW public.v_vault_items_ext AS
 SELECT vvi.id,
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




CREATE VIEW public.v_wishlist_items AS
 SELECT wi.id,
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


CREATE VIEW public.v_wishlist_value_by_user AS
 WITH picked AS (
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



