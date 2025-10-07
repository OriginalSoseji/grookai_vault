CREATE TABLE IF NOT EXISTS public.condition_prices (
  set_code        text        NOT NULL,
  number          text        NOT NULL,
  condition_label text        NOT NULL,
  market_price    numeric,
  last_sold_price numeric,
  currency        text        NOT NULL DEFAULT 'USD',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (set_code, number, condition_label)
);
CREATE INDEX IF NOT EXISTS idx_condition_prices_card
  ON public.condition_prices (set_code, number);

CREATE TABLE IF NOT EXISTS public.graded_prices (
  set_code        text        NOT NULL,
  number          text        NOT NULL,
  grade_company   text        NOT NULL,
  grade_value     numeric(3,1),
  grade_label     text,
  market_price    numeric,
  last_sold_price numeric,
  currency        text        NOT NULL DEFAULT 'USD',
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_graded_prices_unique
  ON public.graded_prices (set_code, number, grade_company, grade_label, grade_value);
CREATE INDEX IF NOT EXISTS idx_graded_prices_card
  ON public.graded_prices (set_code, number);

CREATE TABLE IF NOT EXISTS public.condition_multipliers (
  condition_label text PRIMARY KEY,
  multiplier      numeric NOT NULL
);
INSERT INTO public.condition_multipliers (condition_label, multiplier) VALUES
  ('NM', 1.00), ('LP', 0.85), ('MP', 0.70), ('HP', 0.50), ('DMG', 0.30)
ON CONFLICT (condition_label) DO NOTHING;
