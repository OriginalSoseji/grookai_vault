-- 2) Condition prices table
create table if not exists public.condition_prices (
  id bigserial primary key,
  card_id uuid not null,
  condition_label text not null,
  currency text not null default 'USD',
  market_price numeric,
  last_sold_price numeric,
  source text,
  ts timestamptz default now(),
  unique(card_id, condition_label, currency, ts)
);
create index if not exists condition_prices_card_condition_ts
  on public.condition_prices (card_id, condition_label, currency, ts desc);

-- 3) Graded prices table
create table if not exists public.graded_prices (
  id bigserial primary key,
  card_id uuid not null,
  grade_company text not null,
  grade_value numeric not null,
  grade_label text,
  currency text not null default 'USD',
  market_price numeric,
  last_sold_price numeric,
  pop_total int,
  source text,
  ts timestamptz default now(),
  unique(card_id, grade_company, grade_value, currency, ts)
);
create index if not exists graded_prices_card_grade_ts
  on public.graded_prices (card_id, grade_company, grade_value, currency, ts desc);

-- 4) Condition multipliers
create table if not exists public.condition_multipliers (
  condition_label text primary key,
  multiplier numeric not null
);
insert into public.condition_multipliers(condition_label, multiplier) values
  ('NM', 1.00),
  ('LP', 0.85),
  ('MP', 0.70),
  ('HP', 0.55),
  ('DMG', 0.40)
on conflict (condition_label) do nothing;

-- 5) Best prices across base/condition/graded
drop view if exists public.v_best_prices_all;

-- Resilient creation: use full definition if public.prices exists; otherwise a fallback
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r','v','m')
      AND c.relname = 'prices'
  ) THEN
    EXECUTE $FULL$
      CREATE VIEW public.v_best_prices_all AS
      WITH
      base AS (
        SELECT DISTINCT ON (pr.card_id)
          pr.card_id,
          pr.market_price::numeric(10,2) AS base_market,
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
          cp.market_price::numeric(10,2) AS cond_market,
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
          gp.market_price::numeric(10,2) AS grad_market,
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
      FULL JOIN grad ON grad.card_id = COALESCE(base.card_id, cond.card_id)
    $FULL$;
  ELSE
    EXECUTE $FALLBACK$
      CREATE VIEW public.v_best_prices_all AS
      WITH
      base AS (
        SELECT
          NULL::uuid        AS card_id,
          NULL::numeric(10,2)     AS base_market,
          NULL::text        AS base_source,
          NULL::timestamptz AS base_ts
        WHERE 1=0
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
      FULL JOIN grad ON grad.card_id = COALESCE(base.card_id, cond.card_id)
    $FALLBACK$;
  END IF;
END
$$;
