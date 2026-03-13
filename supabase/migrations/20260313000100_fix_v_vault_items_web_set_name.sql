BEGIN;

DROP VIEW IF EXISTS public.v_vault_items_web;

CREATE VIEW public.v_vault_items_web AS
SELECT
  vvie.id,
  vvie.user_id,
  vvie.card_id,
  vvie.qty,
  vvie.quantity,
  vvie.market_price_raw,
  vvie.market_price,
  vvie.price,
  vvie.line_total_raw,
  vvie.line_total,
  vvie.total,
  vvie.price_source,
  vvie.price_ts,
  vvie.created_at,
  vvie.name,
  vvie.number,
  vvie.set_code,
  s.name AS set_name,
  vvie.variant,
  vvie.tcgplayer_id,
  vvie.game,
  vvie.rarity,
  vvie.image_url,
  vvie.vault_item_id,
  vvie.condition_label,
  vvie.is_graded,
  vvie.grade_company,
  vvie.grade_value,
  vvie.grade_label,
  vvie.condition_multiplier,
  vvie.cm_updated_at,
  vvie.base_market,
  vvie.base_source,
  vvie.base_ts,
  vvie.bp_condition_label,
  vvie.cond_market,
  vvie.cond_source,
  vvie.cond_ts,
  vvie.bp_grade_company,
  vvie.bp_grade_value,
  vvie.bp_grade_label,
  vvie.grad_market,
  vvie.grad_source,
  vvie.grad_ts,
  vvie.effective_price,
  vvie.effective_mode,
  vvie.effective_source,
  vvie.gv_id
FROM public.v_vault_items_ext vvie
LEFT JOIN public.sets s
  ON s.code = vvie.set_code;

COMMIT;
