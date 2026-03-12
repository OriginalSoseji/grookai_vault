BEGIN;

-- Drop dependent views first so v_vault_items can change shape safely
DROP VIEW IF EXISTS public.v_recently_added;
DROP VIEW IF EXISTS public.v_vault_items_web;
DROP VIEW IF EXISTS public.v_vault_items_ext;
DROP VIEW IF EXISTS public.v_vault_items;

-- Recreate root vault read view on the card_prints lane
CREATE VIEW public.v_vault_items AS
WITH base AS (
  SELECT
    vi.id,
    vi.user_id,
    vi.card_id,
    vi.gv_id,
    vi.qty,
    vi.acquisition_cost,
    vi.condition_label,
    vi.condition_score,
    vi.is_graded,
    vi.grade_company,
    vi.grade_value,
    vi.notes,
    vi.created_at,
    vi.name,
    vi.set_name,
    vi.photo_url,
    vi.market_price,
    vi.last_price_update,

    cp.name AS cp_name,
    cp.set_code,
    cp.number AS cp_number,
    cp.variant_key,
    cp.tcgplayer_id,
    cp.rarity,

    img.image_url AS card_image_url,
    img.image_best,
    img.image_alt_url,

    vi.image_source,
    vi.image_url,
    vi.image_back_source,
    vi.image_back_url
  FROM public.vault_items vi
  LEFT JOIN public.card_prints cp
    ON cp.id = vi.card_id
  LEFT JOIN public.v_card_images img
    ON img.id = vi.card_id
),
norm AS (
  SELECT
    base.id,
    base.user_id,
    base.card_id,
    base.gv_id,
    base.qty,
    base.acquisition_cost,
    base.condition_label,
    base.condition_score,
    base.is_graded,
    base.grade_company,
    base.grade_value,
    base.notes,
    base.created_at,
    base.name,
    base.set_name,
    base.photo_url,
    base.market_price,
    base.last_price_update,

    COALESCE(base.cp_name, '(unknown)') AS card_name,
    base.set_code,
    base.cp_number,
    base.variant_key,
    base.tcgplayer_id,
    base.rarity,

    COALESCE(base.image_url, base.card_image_url) AS image_url,
    base.image_best,
    base.image_alt_url,
    base.image_source,
    base.image_back_source,
    base.image_back_url,

    NULLIF(
      ltrim(
        regexp_replace(
          regexp_replace(COALESCE(base.cp_number, ''), '/.*$', ''),
          '\D',
          '',
          'g'
        ),
        '0'
      ),
      ''
    ) AS card_digits,

    lower(
      regexp_replace(
        COALESCE(base.cp_number, ''),
        '[^0-9a-z]',
        '',
        'g'
      )
    ) AS card_num_norm
  FROM base
)
SELECT
  n.id,
  n.user_id,
  n.card_id,
  n.qty,
  COALESCE(n.qty, 1) AS quantity,
  p.base_market AS market_price_raw,
  NULLIF(p.base_market, 0::numeric) AS market_price,
  NULLIF(p.base_market, 0::numeric) AS price,
  (COALESCE(n.qty, 1)::numeric * p.base_market) AS line_total_raw,
  (COALESCE(n.qty, 1)::numeric * NULLIF(p.base_market, 0::numeric)) AS line_total,
  (COALESCE(n.qty, 1)::numeric * NULLIF(p.base_market, 0::numeric)) AS total,
  p.base_source AS price_source,
  p.base_ts AS price_ts,
  n.created_at,
  n.card_name AS name,
  n.cp_number AS number,
  n.set_code,
  n.variant_key AS variant,
  n.tcgplayer_id,
  NULL::text AS game,
  n.card_num_norm,
  n.card_digits,
  n.set_name,
  n.photo_url,
  n.image_url,
  n.image_best,
  n.image_alt_url,
  n.image_source,
  n.image_back_source,
  n.image_back_url,
  COALESCE(n.image_url, n.image_alt_url, n.image_best, n.photo_url) AS image_url_first,
  COALESCE(n.image_alt_url, n.image_url, n.image_best, n.photo_url) AS image_url_second,
  n.gv_id,
  n.rarity
FROM norm n
LEFT JOIN public.v_best_prices_all_gv_v1 p
  ON p.card_id = n.card_id;

-- Recreate dependent view: v_vault_items_ext
CREATE VIEW public.v_vault_items_ext AS
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
  bp.base_market,
  bp.base_source,
  bp.base_ts,
  bp.condition_label AS bp_condition_label,
  bp.cond_market,
  bp.cond_source,
  bp.cond_ts,
  bp.grade_company AS bp_grade_company,
  bp.grade_value AS bp_grade_value,
  bp.grade_label AS bp_grade_label,
  bp.grad_market,
  bp.grad_source,
  bp.grad_ts,
  CASE
    WHEN (vi.is_graded AND bp.grad_market IS NOT NULL) THEN bp.grad_market
    WHEN (bp.cond_market IS NOT NULL) THEN bp.cond_market
    WHEN (vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL) THEN (vvi.price * cm.multiplier)
    ELSE vvi.price
  END AS effective_price,
  CASE
    WHEN (vi.is_graded AND bp.grad_market IS NOT NULL) THEN 'graded'::text
    WHEN (bp.cond_market IS NOT NULL) THEN 'condition'::text
    WHEN (vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL) THEN 'derived'::text
    ELSE 'base'::text
  END AS effective_mode,
  CASE
    WHEN (vi.is_graded AND bp.grad_market IS NOT NULL) THEN 'graded.market'::text
    WHEN (bp.cond_market IS NOT NULL) THEN 'condition.market'::text
    WHEN (vvi.price IS NOT NULL AND vi.condition_label IS NOT NULL AND cm.multiplier IS NOT NULL) THEN 'multiplier'::text
    ELSE 'base'::text
  END AS effective_source
FROM public.v_vault_items vvi
JOIN public.vault_items vi
  ON vi.id = vvi.id
LEFT JOIN public.v_best_prices_all_gv_v1 bp
  ON bp.card_id = vvi.card_id
LEFT JOIN public.condition_multipliers cm
  ON cm.condition_label = vi.condition_label;

-- Recreate dependent view: v_vault_items_web
CREATE VIEW public.v_vault_items_web AS
SELECT
  id,
  user_id,
  card_id,
  qty,
  quantity,
  market_price_raw,
  market_price,
  price,
  line_total_raw,
  line_total,
  total,
  price_source,
  price_ts,
  created_at,
  name,
  number,
  set_code,
  variant,
  tcgplayer_id,
  game,
  rarity,
  image_url,
  vault_item_id,
  condition_label,
  is_graded,
  grade_company,
  grade_value,
  grade_label,
  condition_multiplier,
  cm_updated_at,
  base_market,
  base_source,
  base_ts,
  bp_condition_label,
  cond_market,
  cond_source,
  cond_ts,
  bp_grade_company,
  bp_grade_value,
  bp_grade_label,
  grad_market,
  grad_source,
  grad_ts,
  effective_price,
  effective_mode,
  effective_source,
  gv_id
FROM public.v_vault_items_ext;

-- Recreate dependent view: v_recently_added
CREATE VIEW public.v_recently_added AS
SELECT
  id,
  user_id,
  card_id,
  qty,
  quantity,
  market_price_raw,
  market_price,
  price,
  line_total_raw,
  line_total,
  total,
  price_source,
  price_ts,
  created_at,
  name,
  number,
  set_code,
  variant,
  tcgplayer_id,
  game,
  card_num_norm,
  card_digits,
  set_name,
  photo_url,
  image_url,
  image_best,
  image_alt_url,
  image_source,
  image_back_source,
  image_back_url,
  image_url_first,
  image_url_second,
  gv_id,
  rarity
FROM public.v_vault_items
ORDER BY created_at DESC
LIMIT 100;

COMMIT;
