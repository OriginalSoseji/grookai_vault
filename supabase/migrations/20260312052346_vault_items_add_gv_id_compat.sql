BEGIN;

-- 1) Add gv_id column to vault_items (compatibility phase: additive only)
ALTER TABLE public.vault_items
ADD COLUMN IF NOT EXISTS gv_id text;

-- 2) Backfill gv_id from the authoritative card_prints lane
UPDATE public.vault_items v
SET gv_id = cp.gv_id
FROM public.card_prints cp
WHERE cp.id = v.card_id
  AND v.gv_id IS NULL;

-- 3) Hard stop if any current vault row still lacks gv_id after backfill
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.vault_items
    WHERE gv_id IS NULL
  ) THEN
    RAISE EXCEPTION 'vault_items.gv_id backfill failed: NULL rows remain';
  END IF;
END $$;

-- 4) Enforce gv_id presence for all current/future vault rows
ALTER TABLE public.vault_items
ALTER COLUMN gv_id SET NOT NULL;

-- 5) Add lookup index on gv_id
CREATE INDEX IF NOT EXISTS vault_items_gv_id_idx
ON public.vault_items (gv_id);

-- 6) Add new ownership uniqueness lane for the future contract
CREATE UNIQUE INDEX IF NOT EXISTS uq_vault_items_user_gv_id
ON public.vault_items (user_id, gv_id);

COMMIT;
