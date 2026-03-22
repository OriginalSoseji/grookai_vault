create or replace view public.v_justtcg_vs_ebay_pricing_v1 as
 WITH justtcg_by_card_print AS (
         SELECT jvpl.card_print_id,
            (avg(jvpl.price))::numeric(12,2) AS justtcg_avg_price,
            (count(*))::integer AS justtcg_variant_count
           FROM justtcg_variant_prices_latest jvpl
          WHERE ((jvpl.price IS NOT NULL) AND (jvpl.condition = 'Near Mint'::text))
          GROUP BY jvpl.card_print_id
        ), ebay_by_card_print AS (
         SELECT eapl.card_print_id,
            eapl.nm_median AS ebay_median_price,
            eapl.listing_count AS ebay_listing_count
           FROM ebay_active_prices_latest eapl
        )
 SELECT COALESCE(jt.card_print_id, eb.card_print_id) AS card_print_id,
    jt.justtcg_avg_price,
    jt.justtcg_variant_count,
    eb.ebay_median_price,
    eb.ebay_listing_count,
        CASE
            WHEN ((jt.justtcg_avg_price IS NULL) OR (eb.ebay_median_price IS NULL)) THEN NULL::numeric(12,2)
            ELSE ((jt.justtcg_avg_price - eb.ebay_median_price))::numeric(12,2)
        END AS price_diff,
        CASE
            WHEN ((jt.justtcg_avg_price IS NULL) OR (eb.ebay_median_price IS NULL) OR (eb.ebay_median_price = (0)::numeric)) THEN NULL::numeric(12,2)
            ELSE (round((((jt.justtcg_avg_price - eb.ebay_median_price) / eb.ebay_median_price) * 100.0), 2))::numeric(12,2)
        END AS price_diff_pct
   FROM (justtcg_by_card_print jt
     FULL JOIN ebay_by_card_print eb ON ((eb.card_print_id = jt.card_print_id)));

create or replace view public.v_justtcg_vs_ebay_classified_v1 as
 SELECT card_print_id,
    justtcg_avg_price,
    justtcg_variant_count,
    ebay_median_price,
    ebay_listing_count,
    price_diff,
    price_diff_pct,
        CASE
            WHEN (price_diff_pct IS NULL) THEN 'no_overlap'::text
            WHEN (abs(price_diff_pct) < (10)::numeric) THEN 'stable'::text
            WHEN ((abs(price_diff_pct) >= (10)::numeric) AND (abs(price_diff_pct) <= (50)::numeric)) THEN 'spread'::text
            WHEN (abs(price_diff_pct) > (50)::numeric) THEN 'anomaly'::text
            ELSE NULL::text
        END AS price_signal
   FROM v_justtcg_vs_ebay_pricing_v1;

create or replace view public.v_justtcg_vs_ebay_valid_v1 as
 SELECT card_print_id,
    justtcg_avg_price,
    justtcg_variant_count,
    ebay_median_price,
    ebay_listing_count,
    price_diff,
    price_diff_pct,
    price_signal,
        CASE
            WHEN (price_diff_pct IS NULL) THEN NULL::boolean
            WHEN (abs(price_diff_pct) > (200)::numeric) THEN false
            ELSE true
        END AS is_valid_ebay_signal
   FROM v_justtcg_vs_ebay_classified_v1;

create or replace view public.v_grookai_value_v1_clean as
 SELECT card_print_id,
    justtcg_avg_price,
    justtcg_variant_count,
    ebay_median_price,
    ebay_listing_count,
    price_diff,
    price_diff_pct,
    price_signal,
    is_valid_ebay_signal,
        CASE
            WHEN (is_valid_ebay_signal = false) THEN justtcg_avg_price
            WHEN (price_signal = 'stable'::text) THEN ebay_median_price
            WHEN ((price_signal = 'spread'::text) AND (justtcg_avg_price IS NOT NULL) AND (ebay_median_price IS NOT NULL)) THEN ((justtcg_avg_price + ebay_median_price) / (2)::numeric)
            WHEN ((price_signal = 'anomaly'::text) AND (justtcg_avg_price IS NOT NULL)) THEN justtcg_avg_price
            ELSE NULL::numeric
        END AS grookai_value_v1_clean
   FROM v_justtcg_vs_ebay_valid_v1;

create or replace view public.v_justtcg_display_summary_v1 as
 SELECT card_print_id,
    (avg(price) FILTER (WHERE (condition = 'Near Mint'::text)))::numeric(12,2) AS nm_price,
    (min(price))::numeric(12,2) AS min_price,
    (max(price))::numeric(12,2) AS max_price,
    count(*) AS variant_count
   FROM justtcg_variant_prices_latest
  WHERE (price IS NOT NULL)
  GROUP BY card_print_id;

create or replace view public.v_card_pricing_ui_v1 as
 SELECT cp.id AS card_print_id,
    js.nm_price AS primary_price,
    'justtcg'::text AS primary_source,
    gv.grookai_value_v1_clean AS grookai_value,
    js.min_price,
    js.max_price,
    js.variant_count,
    eb.ebay_median_price,
    eb.ebay_listing_count
   FROM (((card_prints cp
     LEFT JOIN v_justtcg_display_summary_v1 js ON ((js.card_print_id = cp.id)))
     LEFT JOIN v_grookai_value_v1_clean gv ON ((gv.card_print_id = cp.id)))
     LEFT JOIN v_justtcg_vs_ebay_pricing_v1 eb ON ((eb.card_print_id = cp.id)));

create or replace view public.v_grookai_value_v1_justtcg_bridge as
 SELECT card_print_id,
    justtcg_avg_price,
    ebay_median_price,
    price_diff,
    price_diff_pct,
    price_signal,
        CASE
            WHEN (price_signal = 'stable'::text) THEN ebay_median_price
            WHEN ((price_signal = 'spread'::text) AND (justtcg_avg_price IS NOT NULL) AND (ebay_median_price IS NOT NULL)) THEN ((justtcg_avg_price + ebay_median_price) / (2)::numeric)
            WHEN ((price_signal = 'anomaly'::text) AND (justtcg_avg_price IS NOT NULL)) THEN justtcg_avg_price
            ELSE NULL::numeric
        END AS grookai_value_v1
   FROM v_justtcg_vs_ebay_classified_v1;
