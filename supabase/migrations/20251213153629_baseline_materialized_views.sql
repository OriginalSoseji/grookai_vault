-- Grookai Vault Baseline - Post Materialized Views
-- Extracted so views/functions exist before materialized views.

CREATE MATERIALIZED VIEW public.latest_card_prices_mv AS
 SELECT card_id,
    NULL::text AS condition_label,
    price_low,
    price_mid,
    price_high,
    currency,
    observed_at,
    source,
    confidence,
    gi_algo_version
   FROM public.latest_card_prices_v
  WITH NO DATA;

CREATE MATERIALIZED VIEW public.latest_prices AS
 SELECT DISTINCT ON (print_id, COALESCE(condition, '_'::text), COALESCE(grade_agency, '_'::text), COALESCE(grade_value, '_'::text), source) print_id,
    condition,
    grade_agency,
    grade_value,
    source,
    price_usd,
    observed_at
   FROM public.price_observations po
  ORDER BY print_id, COALESCE(condition, '_'::text), COALESCE(grade_agency, '_'::text), COALESCE(grade_value, '_'::text), source, observed_at DESC
  WITH NO DATA;

CREATE MATERIALIZED VIEW public.wall_thumbs_3x4 AS
 WITH primary_img AS (
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
  WHERE ((l.visibility = 'public'::text) AND (l.status = 'active'::text))
  WITH NO DATA;

