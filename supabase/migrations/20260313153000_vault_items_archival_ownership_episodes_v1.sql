BEGIN;

ALTER TABLE public.vault_items
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.vault_items
SET
  qty = 0,
  archived_at = COALESCE(archived_at, now())
WHERE archived_at IS NULL
  AND qty <= 0;

ALTER TABLE public.vault_items
DROP CONSTRAINT IF EXISTS uq_user_card;

ALTER TABLE public.vault_items
DROP CONSTRAINT IF EXISTS uq_vault_user_card;

DROP INDEX IF EXISTS public.uq_vault_items_user_card;
DROP INDEX IF EXISTS public.uq_vault_items_user_gv_id;

CREATE INDEX IF NOT EXISTS idx_vault_items_user_archived_at
ON public.vault_items (user_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_vault_items_active_user_created
ON public.vault_items (user_id, created_at DESC)
WHERE archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vault_items_active_user_card
ON public.vault_items (user_id, card_id)
WHERE archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vault_items_active_user_gv_id
ON public.vault_items (user_id, gv_id)
WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.vault_items_unshare_on_archive_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.shared_cards
  WHERE user_id = NEW.user_id
    AND (card_id = NEW.card_id OR gv_id = NEW.gv_id);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_vault_items_unshare_on_archive ON public.vault_items;

CREATE TRIGGER trg_vault_items_unshare_on_archive
AFTER UPDATE OF archived_at ON public.vault_items
FOR EACH ROW
WHEN (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL)
EXECUTE FUNCTION public.vault_items_unshare_on_archive_fn();

CREATE OR REPLACE FUNCTION public.vault_add_or_increment(
  p_card_id uuid,
  p_delta_qty integer,
  p_condition_label text DEFAULT 'NM'::text,
  p_notes text DEFAULT NULL::text
) RETURNS SETOF public.vault_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_result public.vault_items%ROWTYPE;
  v_gv_id text;
  v_name text;
  v_set_name text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '28000';
  END IF;

  SELECT
    cp.gv_id,
    COALESCE(NULLIF(btrim(cp.name), ''), 'Unknown card'),
    NULLIF(btrim(s.name), '')
  INTO
    v_gv_id,
    v_name,
    v_set_name
  FROM public.card_prints cp
  LEFT JOIN public.sets s
    ON s.id = cp.set_id
  WHERE cp.id = p_card_id;

  IF v_gv_id IS NULL OR btrim(v_gv_id) = '' THEN
    RAISE EXCEPTION 'vault_card_print_missing_identity' USING errcode = 'P0001';
  END IF;

  UPDATE public.vault_items
  SET
    qty = public.vault_items.qty + GREATEST(1, p_delta_qty),
    condition_label = COALESCE(p_condition_label, public.vault_items.condition_label),
    notes = COALESCE(NULLIF(p_notes, ''), public.vault_items.notes)
  WHERE user_id = v_uid
    AND card_id = p_card_id
    AND archived_at IS NULL
  RETURNING * INTO v_result;

  IF FOUND THEN
    RETURN NEXT v_result;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.vault_items (
      user_id,
      card_id,
      gv_id,
      qty,
      condition_label,
      notes,
      name,
      set_name
    )
    VALUES (
      v_uid,
      p_card_id,
      v_gv_id,
      GREATEST(1, p_delta_qty),
      p_condition_label,
      NULLIF(p_notes, ''),
      v_name,
      v_set_name
    )
    RETURNING * INTO v_result;
  EXCEPTION
    WHEN unique_violation THEN
      UPDATE public.vault_items
      SET
        qty = public.vault_items.qty + GREATEST(1, p_delta_qty),
        condition_label = COALESCE(p_condition_label, public.vault_items.condition_label),
        notes = COALESCE(NULLIF(p_notes, ''), public.vault_items.notes)
      WHERE user_id = v_uid
        AND card_id = p_card_id
        AND archived_at IS NULL
      RETURNING * INTO v_result;
  END;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vault_add_or_increment_failed' USING errcode = 'P0001';
  END IF;

  RETURN NEXT v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vault_inc_qty(item_id uuid, inc integer)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_qty integer;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '28000';
  END IF;

  IF inc = 0 THEN
    RETURN;
  END IF;

  SELECT qty
  INTO v_qty
  FROM public.vault_items
  WHERE id = item_id
    AND user_id = v_uid
    AND archived_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vault_item_not_found_or_not_owned' USING errcode = 'P0001';
  END IF;

  IF v_qty <= 0 OR v_qty + inc <= 0 THEN
    UPDATE public.vault_items
    SET
      qty = 0,
      archived_at = COALESCE(archived_at, now())
    WHERE id = item_id
      AND user_id = v_uid
      AND archived_at IS NULL;

    RETURN;
  END IF;

  UPDATE public.vault_items
  SET qty = v_qty + inc
  WHERE id = item_id
    AND user_id = v_uid
    AND archived_at IS NULL;
END;
$function$;

DROP VIEW IF EXISTS public.v_recently_added;
DROP VIEW IF EXISTS public.v_vault_items_web;
DROP VIEW IF EXISTS public.v_vault_items_ext;
DROP VIEW IF EXISTS public.v_vault_items;

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
  WHERE vi.archived_at IS NULL
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
 AND vi.archived_at IS NULL
LEFT JOIN public.v_best_prices_all_gv_v1 bp
  ON bp.card_id = vvi.card_id
LEFT JOIN public.condition_multipliers cm
  ON cm.condition_label = vi.condition_label;

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
  traits.supertype,
  traits.types,
  traits.card_category,
  traits.national_dex,
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
  ON s.code = vvie.set_code
LEFT JOIN LATERAL (
  SELECT
    cpt.supertype,
    cpt.types,
    cpt.card_category,
    cpt.national_dex
  FROM public.card_print_traits cpt
  WHERE cpt.card_print_id = vvie.card_id
    AND (
      cpt.supertype IS NOT NULL
      OR cpt.types IS NOT NULL
      OR cpt.card_category IS NOT NULL
      OR cpt.national_dex IS NOT NULL
    )
  ORDER BY
    CASE cpt.source
      WHEN 'manual' THEN 0
      WHEN 'import' THEN 1
      WHEN 'ai' THEN 2
      ELSE 3
    END,
    cpt.id DESC
  LIMIT 1
) traits
  ON TRUE;

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
