-- Pricing Engine V3.1: price curves (full condition curve) + latest view
-- Simplified migration: always create table/index/view (replay-safe).

CREATE TABLE IF NOT EXISTS public.card_print_price_curves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_print_id uuid NOT NULL
    REFERENCES public.card_prints(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  nm_median numeric,
  nm_floor numeric,
  nm_samples integer,
  lp_median numeric,
  lp_floor numeric,
  lp_samples integer,
  mp_median numeric,
  mp_floor numeric,
  mp_samples integer,
  hp_median numeric,
  hp_floor numeric,
  hp_samples integer,
  dmg_median numeric,
  dmg_floor numeric,
  dmg_samples integer,
  confidence numeric,
  listing_count integer,
  raw_json jsonb
);

CREATE INDEX IF NOT EXISTS card_print_price_curves_print_time_idx
  ON public.card_print_price_curves(card_print_id, created_at DESC);

CREATE OR REPLACE VIEW public.card_print_latest_price_curve AS
SELECT DISTINCT ON (card_print_id)
  *
FROM public.card_print_price_curves
ORDER BY card_print_id, created_at DESC;
