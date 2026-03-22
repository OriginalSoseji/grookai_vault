create or replace view public.v_card_pricing_ui_v1 as
 SELECT cp.id AS card_print_id,
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
   FROM (((card_prints cp
     LEFT JOIN v_justtcg_display_summary_v1 js ON ((js.card_print_id = cp.id)))
     LEFT JOIN v_grookai_value_v1_clean gv ON ((gv.card_print_id = cp.id)))
     LEFT JOIN v_justtcg_vs_ebay_pricing_v1 eb ON ((eb.card_print_id = cp.id)));
