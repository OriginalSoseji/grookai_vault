-- Adds eBay-specific metadata fields to price_observations and ensures the
-- `ebay_self` price source exists. Safe to rerun (guards + IF NOT EXISTS).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'price_observations'
  ) THEN
    ALTER TABLE public.price_observations
      ADD COLUMN IF NOT EXISTS marketplace_id text,
      ADD COLUMN IF NOT EXISTS order_id text,
      ADD COLUMN IF NOT EXISTS order_line_item_id text,
      ADD COLUMN IF NOT EXISTS shipping_amount numeric(12,2),
      ADD COLUMN IF NOT EXISTS seller_location text,
      ADD COLUMN IF NOT EXISTS raw_payload jsonb;

    -- Allow modern listing types (auction, fixed price, best offer, legacy lowercase values).
    IF EXISTS (
      SELECT 1
      FROM information_schema.constraint_column_usage
      WHERE table_schema = 'public'
        AND table_name = 'price_observations'
        AND constraint_name = 'price_observations_listing_type_check'
    ) THEN
      ALTER TABLE public.price_observations
        DROP CONSTRAINT price_observations_listing_type_check;
    END IF;

    ALTER TABLE public.price_observations
      ADD CONSTRAINT price_observations_listing_type_check CHECK (
        listing_type IS NULL OR listing_type = ANY (
          ARRAY[
            'sold','list','auction',
            'SOLD','LIST','AUCTION',
            'FIXED_PRICE','BEST_OFFER','AUCTION_WITH_BIN'
          ]
        )
      );

    COMMENT ON COLUMN public.price_observations.marketplace_id IS
      'Marketplace identifier for the observation (e.g., EBAY_US).';
    COMMENT ON COLUMN public.price_observations.order_id IS
      'Source order identifier (e.g., eBay orderId).';
    COMMENT ON COLUMN public.price_observations.order_line_item_id IS
      'Source line-level identifier for the order item.';
    COMMENT ON COLUMN public.price_observations.shipping_amount IS
      'Shipping amount (same currency as currency column).';
    COMMENT ON COLUMN public.price_observations.seller_location IS
      'Seller region/country code captured from the order.';
    COMMENT ON COLUMN public.price_observations.raw_payload IS
      'Raw JSON payload for debugging/traceability.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'price_sources'
  ) THEN
    INSERT INTO public.price_sources (id, display_name, is_active)
    VALUES ('ebay_self', 'eBay - Self Sales', true)
    ON CONFLICT (id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          is_active = true;
  END IF;
END $$;
