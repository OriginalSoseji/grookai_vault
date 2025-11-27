-- Stores per-seller eBay OAuth credentials for pricing ingestion.

CREATE TABLE IF NOT EXISTS public.ebay_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ebay_username text,
  marketplace_id text NOT NULL DEFAULT 'EBAY_US',
  access_token text NOT NULL,
  refresh_token text,
  access_token_expires_at timestamptz,
  scopes text[],
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ebay_accounts IS
  'Per-user eBay OAuth credentials + metadata for Seller Sync.';
COMMENT ON COLUMN public.ebay_accounts.user_id IS
  'FK to auth.users.id identifying the Grookai seller.';
COMMENT ON COLUMN public.ebay_accounts.marketplace_id IS
  'eBay marketplace site code (e.g., EBAY_US).';
COMMENT ON COLUMN public.ebay_accounts.access_token IS
  'Current OAuth access token for the seller account.';
COMMENT ON COLUMN public.ebay_accounts.refresh_token IS
  'OAuth refresh token when granted by eBay.';
COMMENT ON COLUMN public.ebay_accounts.access_token_expires_at IS
  'Timestamp when the current access token expires.';
COMMENT ON COLUMN public.ebay_accounts.last_sync_at IS
  'Last successful order ingestion time for this seller.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ebay_accounts_user_id_fkey'
      AND table_name = 'ebay_accounts'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.ebay_accounts
      ADD CONSTRAINT ebay_accounts_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ebay_accounts_user_id_idx
  ON public.ebay_accounts (user_id);

CREATE INDEX IF NOT EXISTS ebay_accounts_active_last_sync_idx
  ON public.ebay_accounts (is_active, last_sync_at);
