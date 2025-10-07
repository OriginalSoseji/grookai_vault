CREATE OR REPLACE VIEW public.v_vault_items_ext AS
SELECT
  vvi.*,                      -- includes card_id already
  vi.id             AS vault_item_id,
  vi.condition_label,
  vi.is_graded,
  vi.grade_company,
  vi.grade_value,
  vi.grade_label,
  -- Effective price selection (graded > condition > derived > base)
  CASE
    WHEN vi.is_graded AND bp.grad_market IS NOT NULL THEN bp.grad_market
    WHEN bp.cond_market IS NOT NULL THEN bp.cond_market
    WHEN vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL
      THEN vvi.price * cm.multiplier
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
  ON vi.id = vvi.id
LEFT JOIN public.v_best_prices_all bp
  ON bp.card_id = vvi.card_id       -- use vvi.card_id to avoid duplicate column
LEFT JOIN public.condition_multipliers cm
  ON cm.condition_label = vi.condition_label;
