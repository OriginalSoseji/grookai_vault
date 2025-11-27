-- Defines price_aggregates_v1 (materialized view) and price_index_v1 (view) for Grookai Pricing Index v1.

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'price_observations'
      AND column_name = 'card_print_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_matviews
      WHERE schemaname = 'public'
        AND matviewname = 'price_aggregates_v1'
    ) THEN
      EXECUTE $mv$
        CREATE MATERIALIZED VIEW public.price_aggregates_v1 AS
        WITH
          constants AS (
            SELECT current_timestamp AS ref_ts
          ),
          window_params AS (
            SELECT * FROM (
              VALUES
                ('30d'::text, interval '30 days'),
                ('90d'::text, interval '90 days'),
                ('365d'::text, interval '365 days')
            ) AS t(window_label, window_interval)
          ),
          base AS (
            SELECT
              po.card_print_id,
              po.price_usd,
              po.observed_at
            FROM public.price_observations po
            WHERE po.card_print_id IS NOT NULL
              AND po.price_usd IS NOT NULL
              AND po.observed_at IS NOT NULL
          )
        SELECT
          b.card_print_id,
          wp.window_label AS window,
          (c.ref_ts - wp.window_interval) AS window_start,
          c.ref_ts AS window_end,
          COUNT(*) AS sale_count,
          MIN(b.price_usd) AS floor_price,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY b.price_usd) AS median_price,
          AVG(b.price_usd) AS mean_price,
          stddev_pop(b.price_usd) AS volatility,
          (ARRAY_AGG(b.price_usd ORDER BY b.observed_at DESC))[1] AS last_sale_price,
          MAX(b.observed_at) AS last_sale_timestamp
        FROM constants c
        JOIN window_params wp ON true
        JOIN base b
          ON b.observed_at >= c.ref_ts - wp.window_interval
        GROUP BY
          b.card_print_id,
          wp.window_label,
          wp.window_interval,
          c.ref_ts
        HAVING COUNT(*) > 0;
      $mv$;
    END IF;

    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS price_aggregates_v1_card_print_id_window_idx
        ON public.price_aggregates_v1 (card_print_id, window);
    $idx$;

    EXECUTE $idx2$
      CREATE INDEX IF NOT EXISTS price_aggregates_v1_card_print_id_idx
        ON public.price_aggregates_v1 (card_print_id);
    $idx2$;

    EXECUTE $view$
      CREATE OR REPLACE VIEW public.price_index_v1 AS
      WITH ranked AS (
        SELECT
          pa.card_print_id,
          pa.window,
          pa.window_start,
          pa.window_end,
          pa.sale_count,
          pa.floor_price,
          pa.median_price,
          pa.mean_price,
          pa.volatility,
          pa.last_sale_price,
          pa.last_sale_timestamp,
          CASE
            WHEN pa.window = '30d' AND pa.sale_count >= 10 AND pa.volatility IS NOT NULL THEN 1
            WHEN pa.window = '30d' AND pa.sale_count >= 5 THEN 2
            WHEN pa.window = '90d' AND pa.sale_count >= 5 THEN 3
            WHEN pa.window = '365d' AND pa.sale_count >= 1 THEN 4
            ELSE 5
          END AS priority
        FROM public.price_aggregates_v1 pa
      )
      SELECT DISTINCT ON (card_print_id)
        card_print_id,
        median_price AS price,
        floor_price AS floor,
        volatility,
        CASE
          WHEN window = '30d' AND sale_count >= 10 AND volatility IS NOT NULL THEN 'HIGH'
          WHEN window IN ('30d', '90d') AND sale_count >= 5 THEN 'MEDIUM'
          WHEN window = '365d' AND sale_count >= 1 THEN 'LOW'
          ELSE 'LOW'
        END AS confidence,
        window AS window_used,
        sale_count,
        last_sale_price,
        last_sale_timestamp
      FROM ranked
      ORDER BY card_print_id, priority, window_end DESC;
    $view$;
  ELSE
    RAISE NOTICE 'Skipping price_aggregates_v1 creation: price_observations.card_print_id not present.';
  END IF;
END;
$guard$;
