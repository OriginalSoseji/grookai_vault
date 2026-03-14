BEGIN;

CREATE OR REPLACE VIEW public.v_vault_items_ext AS
SELECT
  vvi.id,
  vvi.user_id,
  vvi.card_id,
  vvi.qty,
  vvi.quantity,
  vvi.market_price_raw,
  vvi.market_price,
  vvi.price,
  vvi.line_total_raw,
  vvi.line_total,
  vvi.total,
  vvi.price_source,
  vvi.price_ts,
  vvi.created_at,
  vvi.name,
  vvi.number,
  vvi.set_code,
  vvi.variant,
  vvi.tcgplayer_id,
  vvi.game,
  vvi.rarity,
  vvi.image_url,
  vvi.image_best,
  vvi.image_alt_url,
  vvi.image_source,
  vvi.image_back_source,
  vvi.image_back_url,
  vvi.image_url_first,
  vvi.image_url_second,
  vvi.gv_id,
  vi.id AS vault_item_id,
  vi.condition_label,
  vi.is_graded,
  vi.grade_company,
  vi.grade_value,
  vi.grade_label,
  cm.multiplier AS condition_multiplier,
  NULL::timestamp with time zone AS cm_updated_at,
  vvi.market_price_raw AS base_market,
  vvi.price_source AS base_source,
  vvi.price_ts AS base_ts,
  vi.condition_label AS bp_condition_label,
  NULL::numeric AS cond_market,
  NULL::text AS cond_source,
  NULL::timestamp with time zone AS cond_ts,
  vi.grade_company AS bp_grade_company,
  NULL::numeric AS bp_grade_value,
  vi.grade_label AS bp_grade_label,
  NULL::numeric AS grad_market,
  NULL::text AS grad_source,
  NULL::timestamp with time zone AS grad_ts,
  CASE
    WHEN (
      vvi.price IS NOT NULL
      AND vi.condition_label IS NOT NULL
      AND cm.multiplier IS NOT NULL
    ) THEN (vvi.price * cm.multiplier)
    ELSE vvi.price
  END AS effective_price,
  CASE
    WHEN (
      vvi.price IS NOT NULL
      AND vi.condition_label IS NOT NULL
      AND cm.multiplier IS NOT NULL
    ) THEN 'derived'::text
    ELSE 'base'::text
  END AS effective_mode,
  CASE
    WHEN (
      vvi.price IS NOT NULL
      AND vi.condition_label IS NOT NULL
      AND cm.multiplier IS NOT NULL
    ) THEN 'multiplier'::text
    ELSE 'base'::text
  END AS effective_source
FROM public.v_vault_items vvi
JOIN public.vault_items vi
  ON vi.id = vvi.id
 AND vi.archived_at IS NULL
LEFT JOIN public.condition_multipliers cm
  ON cm.condition_label = vi.condition_label;

COMMIT;
