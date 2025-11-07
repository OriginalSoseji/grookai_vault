-- Ensure vault_items has condition/grade intent columns
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS condition_label text;
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS is_graded boolean NOT NULL DEFAULT false;
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS grade_company text;
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS grade_value numeric(3,1);
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS grade_label text;

-- Ensure indexes on condition/graded tables that already exist (idempotent)
CREATE INDEX IF NOT EXISTS condition_prices_card_condition_ts
  ON public.condition_prices (card_id, condition_label, currency, ts DESC);

CREATE INDEX IF NOT EXISTS graded_prices_card_grade_ts
  ON public.graded_prices (card_id, grade_company, grade_value, currency, ts DESC);

-- Ensure multipliers table exists & defaults (safety if a prior insert was missed)
CREATE TABLE IF NOT EXISTS public.condition_multipliers (
  condition_label text PRIMARY KEY,
  multiplier      numeric NOT NULL
);
INSERT INTO public.condition_multipliers(condition_label, multiplier) VALUES
  ('NM', 1.00),
  ('LP', 0.85),
  ('MP', 0.70),
  ('HP', 0.55),
  ('DMG', 0.40)
ON CONFLICT (condition_label) DO NOTHING;

-- Recreate v_best_prices_all to match your existing card_id-based design (safe if already present)
DROP VIEW IF EXISTS public.v_best_prices_all;
CREATE VIEW public.v_best_prices_all AS
WITH
base AS (
  SELECT DISTINCT ON (pr.card_id)
    pr.card_id,
    pr.market_price AS base_market,
    pr.source       AS base_source,
    pr.ts           AS base_ts
  FROM public.prices pr
  WHERE pr.currency = 'USD' AND pr.market_price IS NOT NULL
  ORDER BY pr.card_id, pr.ts DESC NULLS LAST
),
cond AS (
  SELECT DISTINCT ON (cp.card_id, cp.condition_label)
    cp.card_id,
    cp.condition_label,
    cp.market_price AS cond_market,
    cp.source       AS cond_source,
    cp.ts           AS cond_ts
  FROM public.condition_prices cp
  WHERE cp.currency = 'USD' AND cp.market_price IS NOT NULL
  ORDER BY cp.card_id, cp.condition_label, cp.ts DESC NULLS LAST
),
grad AS (
  SELECT DISTINCT ON (gp.card_id, gp.grade_company, gp.grade_value)
    gp.card_id,
    gp.grade_company,
    gp.grade_value,
    gp.grade_label,
    gp.market_price AS grad_market,
    gp.source       AS grad_source,
    gp.ts           AS grad_ts
  FROM public.graded_prices gp
  WHERE gp.currency = 'USD' AND gp.market_price IS NOT NULL
  ORDER BY gp.card_id, gp.grade_company, gp.grade_value, gp.ts DESC NULLS LAST
)
SELECT
  COALESCE(grad.card_id, cond.card_id, base.card_id) AS card_id,
  base.base_market, base.base_source, base.base_ts,
  cond.condition_label, cond.cond_market, cond.cond_source, cond.cond_ts,
  grad.grade_company, grad.grade_value, grad.grade_label, grad.grad_market, grad.grad_source, grad.grad_ts
FROM base
FULL JOIN cond ON cond.card_id = base.card_id
FULL JOIN grad ON grad.card_id = COALESCE(base.card_id, cond.card_id);

-- Build v_vault_items_ext that exposes effective price/mode/source alongside v_vault_items
DROP VIEW IF EXISTS public.v_vault_items_ext;
CREATE VIEW public.v_vault_items_ext AS
SELECT
  vvi.*,
  vi.id              AS vault_item_id,
  vi.card_id,
  vi.condition_label,
  vi.is_graded,
  vi.grade_company,
  vi.grade_value,
  vi.grade_label,
  -- Effective price selection (graded > condition > derived > base)
  CASE
    WHEN vi.is_graded AND bp.grad_market IS NOT NULL THEN bp.grad_market
    WHEN bp.cond_market IS NOT NULL THEN bp.cond_market
    WHEN vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL THEN vvi.price * cm.multiplier
    ELSE vvi.price
  END AS effective_price,
  CASE
    WHEN vi.is_graded AND bp.grad_market IS NOT NULL THEN 'graded'
    WHEN bp.cond_market IS NOT NULL THEN 'condition'
    WHEN vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL THEN 'derived'
    ELSE 'base'
  END AS effective_mode,
  CASE
    WHEN vi.is_graded AND bp.grad_market IS NOT NULL THEN 'graded.market'
    WHEN bp.cond_market IS NOT NULL THEN 'condition.market'
    WHEN vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL THEN 'multiplier'
    ELSE 'base'
  END AS effective_source
FROM public.v_vault_items vvi
JOIN public.vault_items vi
  ON vi.id = vvi.id         -- v_vault_items is built from vault_items; keep same id
LEFT JOIN public.v_best_prices_all bp
  ON bp.card_id = vi.card_id
LEFT JOIN public.condition_multipliers cm
  ON cm.condition_label = vi.condition_label;
