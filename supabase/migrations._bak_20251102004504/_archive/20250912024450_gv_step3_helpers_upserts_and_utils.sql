-- Ensure uniqueness we rely on for UPSERTs
-- (safe if they already exist; otherwise created now)
CREATE UNIQUE INDEX IF NOT EXISTS ux_condition_prices_card_condition_currency
  ON public.condition_prices (card_id, condition_label, currency);

CREATE UNIQUE INDEX IF NOT EXISTS ux_graded_prices_card_grade_currency
  ON public.graded_prices (card_id, grade_company, grade_value, currency);

-- Upsert a condition price for a card_id + condition + currency
CREATE OR REPLACE FUNCTION public.upsert_condition_price(
  p_card_id uuid,
  p_condition_label text,
  p_market_price numeric,
  p_last_sold_price numeric DEFAULT NULL,
  p_currency text DEFAULT 'USD',
  p_source text DEFAULT 'manual',
  p_ts timestamptz DEFAULT now()
) RETURNS void
LANGUAGE sql AS $$
INSERT INTO public.condition_prices (card_id, condition_label, currency, market_price, last_sold_price, source, ts)
VALUES (p_card_id, p_condition_label, p_currency, p_market_price, p_last_sold_price, p_source, p_ts)
ON CONFLICT (card_id, condition_label, currency)
DO UPDATE SET
  market_price    = EXCLUDED.market_price,
  last_sold_price = EXCLUDED.last_sold_price,
  source          = EXCLUDED.source,
  ts              = EXCLUDED.ts;
$$;

-- Upsert a graded price for a card_id + (company, value) + currency
CREATE OR REPLACE FUNCTION public.upsert_graded_price(
  p_card_id uuid,
  p_grade_company text,
  p_grade_value numeric,
  p_grade_label text,
  p_market_price numeric,
  p_last_sold_price numeric DEFAULT NULL,
  p_currency text DEFAULT 'USD',
  p_source text DEFAULT 'manual',
  p_ts timestamptz DEFAULT now()
) RETURNS void
LANGUAGE sql AS $$
INSERT INTO public.graded_prices (card_id, grade_company, grade_value, grade_label, currency, market_price, last_sold_price, source, ts)
VALUES (p_card_id, p_grade_company, p_grade_value, p_grade_label, p_currency, p_market_price, p_last_sold_price, p_source, p_ts)
ON CONFLICT (card_id, grade_company, grade_value, currency)
DO UPDATE SET
  grade_label     = EXCLUDED.grade_label,
  market_price    = EXCLUDED.market_price,
  last_sold_price = EXCLUDED.last_sold_price,
  source          = EXCLUDED.source,
  ts              = EXCLUDED.ts;
$$;

-- Convenience: set just the condition on a vault item
CREATE OR REPLACE FUNCTION public.set_vault_item_condition(
  p_vault_item_id uuid,
  p_condition_label text
) RETURNS void
LANGUAGE sql AS $$
UPDATE public.vault_items
SET condition_label = p_condition_label,
    is_graded       = false,
    grade_company   = NULL,
    grade_value     = NULL,
    grade_label     = NULL
WHERE id = p_vault_item_id;
$$;

-- Convenience: set graded state on a vault item
CREATE OR REPLACE FUNCTION public.set_vault_item_grade(
  p_vault_item_id uuid,
  p_grade_company text,
  p_grade_value numeric,
  p_grade_label text
) RETURNS void
LANGUAGE sql AS $$
UPDATE public.vault_items
SET is_graded     = true,
    grade_company = p_grade_company,
    grade_value   = p_grade_value,
    grade_label   = p_grade_label
WHERE id = p_vault_item_id;
$$;
