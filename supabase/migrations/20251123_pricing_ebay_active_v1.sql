-- eBay active pricing schema (snapshots + latest) and pricing queue tables.
-- Guarded so it can be rerun safely on environments missing dependencies.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'card_prints'
  ) THEN
    EXECUTE $ddl$
      CREATE TABLE IF NOT EXISTS public.ebay_active_price_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        card_print_id uuid NOT NULL
          REFERENCES public.card_prints(id) ON DELETE CASCADE,
        source text NOT NULL DEFAULT 'ebay_browse',
        captured_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
        nm_floor numeric(12,2),
        nm_median numeric(12,2),
        lp_floor numeric(12,2),
        lp_median numeric(12,2),
        listing_count integer NOT NULL DEFAULT 0,
        raw_sample_count_nm integer NOT NULL DEFAULT 0,
        raw_sample_count_lp integer NOT NULL DEFAULT 0
      );
    $ddl$;

    EXECUTE $ddl$
      CREATE INDEX IF NOT EXISTS idx_eaps_card_print_time
        ON public.ebay_active_price_snapshots(card_print_id, captured_at DESC);
    $ddl$;

    EXECUTE $ddl$
      CREATE TABLE IF NOT EXISTS public.ebay_active_prices_latest (
        card_print_id uuid PRIMARY KEY
          REFERENCES public.card_prints(id) ON DELETE CASCADE,
        source text NOT NULL DEFAULT 'ebay_browse',
        nm_floor numeric(12,2),
        nm_median numeric(12,2),
        lp_floor numeric(12,2),
        lp_median numeric(12,2),
        listing_count integer NOT NULL DEFAULT 0,
        confidence numeric(3,2) NOT NULL DEFAULT 0.20,
        last_snapshot_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
      );
    $ddl$;

    EXECUTE $ddl$
      CREATE OR REPLACE VIEW public.card_print_active_prices AS
      SELECT
        cp.id AS card_print_id,
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
      FROM public.card_prints cp
      LEFT JOIN public.ebay_active_prices_latest lap
        ON lap.card_print_id = cp.id;
    $ddl$;

    EXECUTE $ddl$
      CREATE TABLE IF NOT EXISTS public.pricing_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        card_print_id uuid NOT NULL
          REFERENCES public.card_prints(id) ON DELETE CASCADE,
        priority text NOT NULL DEFAULT 'normal',
        reason text,
        status text NOT NULL DEFAULT 'pending',
        attempts integer NOT NULL DEFAULT 0,
        error text,
        requested_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
        started_at timestamptz,
        completed_at timestamptz
      );
    $ddl$;

    EXECUTE $ddl$
      CREATE INDEX IF NOT EXISTS idx_pricing_jobs_status_priority
        ON public.pricing_jobs(status, priority, requested_at);
    $ddl$;
  ELSE
    RAISE NOTICE '[pricing] card_prints table not found; skipping eBay active pricing migration.';
  END IF;
END
$migration$;
