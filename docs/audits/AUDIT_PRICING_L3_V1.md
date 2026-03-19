# AUDIT_PRICING_L3_V1

Audit date: 2026-02-17 (read-only)

Scope: End-to-end pricing audit across UI reads, DB objects, workers/refresh paths, consistency/freshness behavior, and reproducibility.

## UI

### Where UI reads pricing now

1. Flutter card detail (`Grookai Value` panel)
- Query source: `card_print_active_prices`
- Evidence:
  - `lib/card_detail_screen.dart:52-56`
  - `lib/card_detail_screen.dart:385-390`
  - `lib/card_detail_screen.dart:404`
- Columns consumed in UI:
  - `nm_median`, `nm_floor`, `lp_median`, `listing_count`, `confidence`
- UI transforms:
  - hardcoded `USD` label formatting (`lib/card_detail_screen.dart:391-395`)
  - no timestamp shown (`updated_at`/`last_snapshot_at` are not rendered)

2. Flutter vault list
- Query source: `v_vault_items`
- Evidence:
  - `lib/main.dart:1384-1388`
- Note:
  - Tile UI does not render price fields, only qty/condition/name (`lib/main.dart:372-515`).

3. Web vault page
- Query source: `v_vault_items_ext`
- Evidence:
  - `apps/web/src/app/vault/page.tsx:32-35`
- Selected columns do not include price columns.

4. Live refresh request path from UI
- Direct insert to queue table from Flutter:
  - `lib/card_detail_screen.dart:88-92`
- Edge function also exists to queue jobs (not used by Flutter):
  - `supabase/functions/pricing-live-request/index.ts:39-47`

### UI -> DB chain (current)

- Card detail chain:
  - `CardDetailScreen` -> `card_print_active_prices` -> `ebay_active_prices_latest`
- Vault chain:
  - Flutter `v_vault_items` / Web `v_vault_items_ext` -> `v_best_prices_all` -> `prices`/`condition_prices`/`graded_prices`

Consequence: user-facing pricing is split across two independent pipelines.

## DB Objects

### Computation chains found

Chain A (active listing medians, currently user-facing in card detail)
- Worker writes:
  - `ebay_active_price_snapshots`
  - `ebay_active_prices_latest`
  - `card_print_price_curves`
- Read views:
  - `card_print_active_prices`
  - `card_print_latest_price_curve`

Chain B (legacy base/condition/graded pricing for vault views)
- Source tables:
  - `prices`, `condition_prices`, `graded_prices`
- Aggregation/view:
  - `v_best_prices_all`
- Consumers:
  - `v_vault_items`, `v_vault_items_ext`

Chain C (raw observations/rollup path)
- Source table:
  - `card_price_observations`
- Function:
  - `compute_vault_values(days_window)`
- Rollup table/view:
  - `card_price_rollups` -> `v_card_prices_usd`
- No direct UI read found.

### Key SQL object definitions (full, from repo)

1. `public.latest_card_prices_v`
- Source: `supabase/migrations/20251213153627_baseline_views.sql:7-32`
```sql
CREATE VIEW public.latest_card_prices_v AS
 WITH ranked AS (
         SELECT cp.id,
            cp.card_print_id,
            cp.source,
            cp.currency,
            cp.low,
            cp.mid,
            cp.high,
            cp.market,
            cp.last_updated,
            row_number() OVER (PARTITION BY cp.card_print_id ORDER BY cp.last_updated DESC) AS rn
           FROM public.card_prices cp
        )
 SELECT card_print_id AS card_id,
    low AS price_low,
    mid AS price_mid,
    high AS price_high,
    currency,
    last_updated AS observed_at,
    source,
    NULL::numeric AS confidence,
    NULL::text AS gi_algo_version,
    NULL::text AS condition
   FROM ranked
  WHERE (rn = 1);
```

2. `public.card_print_active_prices`
- Source: `supabase/migrations/20251213153627_baseline_views.sql:87-103`
```sql
CREATE VIEW public.card_print_active_prices AS
 SELECT cp.id AS card_print_id,
    cp.set_id,
    cp.number_plain,
    cp.name,
    lap.source,
    lap.nm_floor,
    lap.nm_median,
    lap.lp_floor,
    lap.lp_median,
    lap.listing_count,
    lap.confidence,
    lap.last_snapshot_at,
    lap.updated_at
   FROM (public.card_prints cp
     LEFT JOIN public.ebay_active_prices_latest lap ON ((lap.card_print_id = cp.id)));
```

3. `public.card_print_latest_price_curve`
- Source: `supabase/migrations/20251213153627_baseline_views.sql:105-128`
```sql
CREATE VIEW public.card_print_latest_price_curve AS
 SELECT DISTINCT ON (card_print_id) id,
    card_print_id,
    created_at,
    nm_median,
    nm_floor,
    nm_samples,
    lp_median,
    lp_floor,
    lp_samples,
    mp_median,
    mp_floor,
    mp_samples,
    hp_median,
    hp_floor,
    hp_samples,
    dmg_median,
    dmg_floor,
    dmg_samples,
    confidence,
    listing_count,
    raw_json
   FROM public.card_print_price_curves
  ORDER BY card_print_id, created_at DESC;
```

4. `public.v_best_prices_all`
- Source: `supabase/migrations/20251213153627_baseline_views.sql:164-210`
```sql
CREATE VIEW public.v_best_prices_all AS
 WITH base AS (
         SELECT DISTINCT ON (pr.card_id) pr.card_id,
            pr.market_price AS base_market,
            pr.source AS base_source,
            pr.ts AS base_ts
           FROM public.prices pr
          WHERE ((pr.currency = 'USD'::text) AND (pr.market_price IS NOT NULL))
          ORDER BY pr.card_id, pr.ts DESC NULLS LAST
        ), cond AS (
         SELECT DISTINCT ON (cp.card_id, cp.condition_label) cp.card_id,
            cp.condition_label,
            cp.market_price AS cond_market,
            cp.source AS cond_source,
            cp.ts AS cond_ts
           FROM public.condition_prices cp
          WHERE ((cp.currency = 'USD'::text) AND (cp.market_price IS NOT NULL))
          ORDER BY cp.card_id, cp.condition_label, cp.ts DESC NULLS LAST
        ), grad AS (
         SELECT DISTINCT ON (gp.card_id, gp.grade_company, gp.grade_value) gp.card_id,
            gp.grade_company,
            gp.grade_value,
            gp.grade_label,
            gp.market_price AS grad_market,
            gp.source AS grad_source,
            gp.ts AS grad_ts
           FROM public.graded_prices gp
          WHERE ((gp.currency = 'USD'::text) AND (gp.market_price IS NOT NULL))
          ORDER BY gp.card_id, gp.grade_company, gp.grade_value, gp.ts DESC NULLS LAST
        )
 SELECT COALESCE(grad.card_id, cond.card_id, base.card_id) AS card_id,
    base.base_market,
    base.base_source,
    base.base_ts,
    cond.condition_label,
    cond.cond_market,
    cond.cond_source,
    cond.cond_ts,
    grad.grade_company,
    grad.grade_value,
    grad.grade_label,
    grad.grad_market,
    grad.grad_source,
    grad.grad_ts
   FROM ((base
     FULL JOIN cond ON ((cond.card_id = base.card_id)))
     FULL JOIN grad ON ((grad.card_id = COALESCE(base.card_id, cond.card_id))));
```

5. `public.compute_vault_values(days_window integer DEFAULT 30)`
- Source: `supabase/migrations/20251213153626_baseline_functions.sql:70-145`
```sql
CREATE FUNCTION public.compute_vault_values(days_window integer DEFAULT 30) RETURNS void
    LANGUAGE plpgsql
    AS $$
declare
  v_weights      jsonb;
  v_method       text;
  v_currency     price_currency;
  v_usd_per_eur  numeric := 1.0;
begin
  -- latest config
  select weights, method, currency
    into v_weights, v_method, v_currency
  from price_rollup_config
  order by id desc
  limit 1;

  if v_weights  is null then v_weights  := '{}'::jsonb; end if;
  if v_method   is null then v_method   := 'weighted_average'; end if;
  if v_currency is null then v_currency := 'USD'::price_currency; end if;

  -- FX (optional; default=1 if table empty)
  select usd_per_eur into v_usd_per_eur
  from fx_daily order by d desc limit 1;
  if v_usd_per_eur is null then v_usd_per_eur := 1.0; end if;

  with src as (
    select
      card_print_id,
      source_id,
      case
        when v_currency = 'USD' and currency = 'EUR' then value / v_usd_per_eur
        else value
      end as value_adj
    from card_price_observations
    where observed_at >= now() - make_interval(days => days_window)
      and (
          currency = v_currency
       or (v_currency = 'USD' and currency = 'EUR')  -- include EUR, convert to USD
      )
      and kind in ('sold','floor','median','average','low','high','listing','shop_sale')
  ),
  windowed as (
    select
      card_print_id,
      source_id,
      avg(value_adj) as avg_val,
      count(*)       as n
    from src
    group by card_print_id, source_id
  ),
  weighted as (
    select
      w.card_print_id,
      sum(w.avg_val * coalesce((v_weights->>w.source_id)::numeric, 0)) as vv,
      sum(w.n) as total_n,
      jsonb_object_agg(
        w.source_id,
        jsonb_build_object('count', w.n, 'avg', round(w.avg_val::numeric, 2))
      ) as breakdown
    from windowed w
    group by w.card_print_id
  )
  insert into card_price_rollups as r
    (card_print_id, currency, vault_value, last_computed_at, sample_size, method, source_breakdown)
  select
    card_print_id, v_currency, round(vv::numeric, 2), now(), total_n, v_method, breakdown
  from weighted
  on conflict (card_print_id) do update
    set currency        = excluded.currency,
        vault_value     = excluded.vault_value,
        last_computed_at= excluded.last_computed_at,
        sample_size     = excluded.sample_size,
        method          = excluded.method,
        source_breakdown= excluded.source_breakdown;
end
$$;
```

6. `public.process_jobs(p_limit integer DEFAULT 25)`
- Source: `supabase/migrations/20251213153626_baseline_functions.sql:388-450`
```sql
CREATE FUNCTION public.process_jobs(p_limit integer DEFAULT 25) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_job     public.jobs%rowtype;
  v_handled int := 0;
begin
  loop
    with next as (
      select id
      from public.jobs
      where status = 'queued'
        and scheduled_at <= now()
      order by scheduled_at asc, created_at asc
      limit 1
      for update skip locked
    )
    update public.jobs j
       set status     = 'running',
           started_at = now(),
           attempts   = j.attempts + 1
     where j.id in (select id from next)
     returning j.* into v_job;

    if not found then
      exit;
    end if;

    begin
      perform public.job_log(v_job.id, 'info', 'Starting job', jsonb_build_object('name', v_job.name));

      if v_job.name = 'refresh_latest_card_prices_mv' then
        perform public.refresh_latest_card_prices_mv();
      else
        perform public.job_log(v_job.id, 'warning', 'Unknown job name; marking finished', jsonb_build_object('name', v_job.name));
      end if;

      update public.jobs
         set status = 'finished',
             finished_at = now()
       where id = v_job.id;

      v_handled := v_handled + 1;

    exception when others then
      update public.jobs
         set status = case when attempts < max_attempts then 'queued' else 'failed' end,
             last_error = left(sqlerrm, 1000),
             scheduled_at = now() + interval '1 minute'
       where id = v_job.id;

      perform public.job_log(v_job.id, 'error', 'Job failed', jsonb_build_object('error', sqlerrm));
    end;

    if v_handled >= p_limit then
      exit;
    end if;
  end loop;

  return v_handled;
end
$$;
```

7. `public.refresh_latest_card_prices_mv()`
- Source: `supabase/migrations/20251213153626_baseline_functions.sql:455-477`
```sql
CREATE FUNCTION public.refresh_latest_card_prices_mv() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  begin
    perform 1
    from pg_indexes
    where schemaname='public'
      and tablename='latest_card_prices_mv'
      and indexname='uq_latest_card_prices_mv';

    if found then
      execute 'refresh materialized view concurrently public.latest_card_prices_mv';
    else
      execute 'refresh materialized view public.latest_card_prices_mv';
    end if;
  exception when others then
    execute 'refresh materialized view public.latest_card_prices_mv';
  end;
end
$$;
```

8. `public.v_vault_items`
- Source: `supabase/migrations/20251213153627_baseline_views.sql:509-613`
```sql
CREATE VIEW public.v_vault_items AS
 WITH base AS (
         SELECT vi.id,
            vi.user_id,
            vi.card_id,
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
            COALESCE(img.name, c.name, '(unknown)'::text) AS card_name,
            img.set_code,
            img.number AS img_number,
            c.number AS c_number,
            c.variant,
            c.tcgplayer_id,
            c.game,
            img.image_url AS card_image_url,
            img.image_best,
            img.image_alt_url,
            vi.image_source,
            vi.image_url,
            vi.image_back_source,
            vi.image_back_url
           FROM ((public.vault_items vi
             LEFT JOIN public.cards c ON ((c.id = vi.card_id)))
             LEFT JOIN public.v_card_images img ON ((img.id = vi.card_id)))
        ), norm AS (
         SELECT base.id,
            base.user_id,
            base.card_id,
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
            base.card_name,
            base.set_code,
            base.img_number,
            base.c_number,
            base.variant,
            base.tcgplayer_id,
            base.game,
            base.image_url,
            base.image_best,
            base.image_alt_url,
            base.image_source,
            base.image_back_source,
            base.image_back_url,
            NULLIF(ltrim(regexp_replace(regexp_replace(COALESCE(base.img_number, base.c_number, ''::text), '/.*$'::text, ''::text), '\D'::text, ''::text, 'g'::text), '0'::text), ''::text) AS card_digits,
            lower(regexp_replace(COALESCE(base.img_number, base.c_number, ''::text), '[^0-9a-z]'::text, ''::text, 'g'::text)) AS card_num_norm
           FROM base
        )
 SELECT n.id,
    n.user_id,
    n.card_id,
    COALESCE(n.qty, 1) AS qty,
    COALESCE(n.qty, 1) AS quantity,
    p.base_market AS market_price_raw,
    NULLIF(p.base_market, (0)::numeric) AS market_price,
    NULLIF(p.base_market, (0)::numeric) AS price,
    ((COALESCE(n.qty, 1))::numeric * p.base_market) AS line_total_raw,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.base_market, (0)::numeric)) AS line_total,
    ((COALESCE(n.qty, 1))::numeric * NULLIF(p.base_market, (0)::numeric)) AS total,
    p.base_source AS price_source,
    p.base_ts AS price_ts,
    n.created_at,
    n.card_name AS name,
    COALESCE(n.img_number, n.c_number) AS number,
    n.set_code,
    n.variant,
    n.tcgplayer_id,
    n.game,
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
    COALESCE(n.image_alt_url, n.image_url, n.image_best, n.photo_url) AS image_url_second
   FROM (norm n
     LEFT JOIN public.v_best_prices_all p ON ((p.card_id = n.card_id)));
```

9. `public.v_vault_items_ext`
- Source: `supabase/migrations/20251213153627_baseline_views.sql:730-803`
```sql
CREATE VIEW public.v_vault_items_ext AS
 SELECT vvi.id,
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
    NULL::text AS rarity,
    vvi.image_url,
    vvi.image_best,
    vvi.image_alt_url,
    vvi.image_source,
    vvi.image_back_source,
    vvi.image_back_url,
    vvi.image_url_first,
    vvi.image_url_second,
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
            WHEN (vi.is_graded AND (bp.grad_market IS NOT NULL)) THEN bp.grad_market
            WHEN (bp.cond_market IS NOT NULL) THEN bp.cond_market
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN (vvi.price * cm.multiplier)
            ELSE vvi.price
        END AS effective_price,
        CASE
            WHEN (vi.is_graded AND (bp.grad_market IS NOT NULL)) THEN 'graded'::text
            WHEN (bp.cond_market IS NOT NULL) THEN 'condition'::text
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN 'derived'::text
            ELSE 'base'::text
        END AS effective_mode,
        CASE
            WHEN (vi.is_graded AND (bp.grad_market IS NOT NULL)) THEN 'graded.market'::text
            WHEN (bp.cond_market IS NOT NULL) THEN 'condition.market'::text
            WHEN ((vvi.price IS NOT NULL) AND (vi.condition_label IS NOT NULL) AND (cm.multiplier IS NOT NULL)) THEN 'multiplier'::text
            ELSE 'base'::text
        END AS effective_source
   FROM (((public.v_vault_items vvi
     JOIN public.vault_items vi ON ((vi.id = vvi.id)))
     LEFT JOIN public.v_best_prices_all bp ON ((bp.card_id = vvi.card_id)))
     LEFT JOIN public.condition_multipliers cm ON ((cm.condition_label = vi.condition_label)));
```

## Workers

### Refresh/queue path actually running for card detail

1. Queue insert
- Flutter inserts `pricing_jobs` row directly (`priority='user'`, `reason='live_price_request'`):
  - `lib/card_detail_screen.dart:88-92`

2. Runner claims and executes jobs
- `pricing_job_runner_v1` claims oldest pending by `requested_at` only:
  - `backend/pricing/pricing_job_runner_v1.mjs:52-57`
- Worker launched per job:
  - `backend/pricing/pricing_job_runner_v1.mjs:107-124`
- Status updates:
  - done/failed/retryable update paths at `backend/pricing/pricing_job_runner_v1.mjs:127-148`, `:210-227`
- 429 handling contract:
  - child exits `42` on 429, runner requeues and applies 60s backoff (`backend/pricing/pricing_job_runner_v1.mjs:214-224`, `backend/pricing/ebay_browse_prices_worker.mjs:837-841`)

3. Pricing worker behavior
- eBay search + per-listing details fetch + condition bucketing + medians/floors:
  - `backend/pricing/ebay_browse_prices_worker.mjs:670-759`
- Writes snapshots/latest/curve:
  - `backend/pricing/ebay_browse_prices_worker.mjs:768-807`

### Additional worker surface found

- `pricing_queue_worker.mjs` has explicit priority sorting (`user`, `vault`, `rarity_auto`, ...):
  - `backend/pricing/pricing_queue_worker.mjs:13-19`, `:54-63`, `:81-83`
- But default backend scripts point to `pricing_job_runner_v1`, not `pricing_queue_worker`:
  - `backend/package.json:6-7`

### Legacy/parallel refresh surfaces

- DB job queue exists for `card_prices` -> `latest_card_prices_mv` refresh via trigger and `process_jobs()`:
  - trigger enqueue: `supabase/migrations/20251213153632_baseline_triggers.sql:12`
  - enqueue function: `supabase/migrations/20251213153626_baseline_functions.sql:150-171`
  - processor: `supabase/migrations/20251213153626_baseline_functions.sql:388-450`
- This path is separate from card-detail `ebay_active_prices_latest` updates.

## Latency Path

Why refresh can be slow in current implementation:

1. Queue claim policy is FIFO by request time in default runner
- `pricing_job_runner_v1` claims `pending` ordered by `requested_at asc`, no priority weighting:
  - `backend/pricing/pricing_job_runner_v1.mjs:52-57`
- UI writes `priority='user'`, but default runner does not use it:
  - `lib/card_detail_screen.dart:90`

2. Optional priority-aware worker exists but is not default execution path
- Priority sorting logic exists in `pricing_queue_worker`:
  - `backend/pricing/pricing_queue_worker.mjs:13-19`, `:54-63`
- Default scripts run `pricing_job_runner_v1`:
  - `backend/package.json:6-7`

3. Per-job external work is serial and can be heavy
- One Browse search + up to 50 sequential item-detail calls per card:
  - `backend/pricing/ebay_browse_prices_worker.mjs:670`, `:675-689`
- No intra-job parallel fetch of item details is implemented.

4. 429 handling introduces explicit backoff at runner level
- 429 exit contract triggers requeue plus `60_000ms` backoff:
  - `backend/pricing/ebay_browse_prices_worker.mjs:837-841`
  - `backend/pricing/pricing_job_runner_v1.mjs:214-224`

5. Live queue timing evidence (read-only sample on 2026-02-17)
- `pricing_jobs` wait time (`requested_at -> started_at`) in sampled history:
  - done p50: ~3.26 days, p95: ~34.73 days
  - failed p50: ~33.36 days
- runtime (`started_at -> completed_at`) remains short:
  - done p50: ~16.8s, p95: ~65.0s
  - failed p50: ~0.76s

## Consistency

### Truth Table (NM/LP/MP/HP/DMG)

| Condition | Representation | Transform stage | Current UI usage |
|---|---|---|---|
| NM | `nm_median`, `nm_floor`, `nm_samples` | bucketed from listing text + trimmed median (`trimForMedian`) | shown in card detail (`nm_median`, `nm_floor`) |
| LP | `lp_median`, `lp_floor`, `lp_samples` | bucketed from listing text; unknown listings may fall into LP (`unknown_as_lp`) | shown in card detail (`lp_median`) |
| MP | `mp_median`, `mp_floor`, `mp_samples` | bucketed from listing text | not shown in card detail |
| HP | `hp_median`, `hp_floor`, `hp_samples` | bucketed from listing text | not shown in card detail |
| DMG | `dmg_median`, `dmg_floor`, `dmg_samples` | bucketed from listing text | not shown in card detail |

Evidence:
- condition bucket patterns and fallback to LP:
  - `backend/pricing/ebay_browse_prices_worker.mjs:66-124`, `:443-461`, `:476-478`
- median trimming and confidence:
  - `backend/pricing/ebay_browse_prices_worker.mjs:496-525`

### Condition Monotonicity

Contract check: whether NM >= LP >= MP >= HP >= DMG is enforced.

Finding: not enforced.
- No monotonic clamp/check exists in worker or SQL object definitions.
- Worker only does fallback if one of NM/LP is missing, not order enforcement when both exist:
  - `backend/pricing/ebay_browse_prices_worker.mjs:528-533`, `:591-598`
- Live read-only evidence (2026-02-17):
  - `card_print_latest_price_curve` rows analyzed: 199
  - rows violating at least one monotonic comparator: 129 (64.8%)
  - violation counts: `lp>nm: 80`, `mp>lp: 43`, `hp>mp: 22`, `dmg>hp: 24`

### Why LP > NM can happen in current logic

1. LP fallback classification for unknown listings
- Listings that look like the right card but have no explicit condition are forced to LP.
- Evidence: `backend/pricing/ebay_browse_prices_worker.mjs:476-478`

2. No monotonic post-processing
- Medians are computed independently per bucket and stored as-is.
- Evidence: `backend/pricing/ebay_browse_prices_worker.mjs:723-759`

3. Sparse or noisy bucket samples
- Trimming only removes min/max when sample size >= 6; small samples remain unstable.
- Evidence: `backend/pricing/ebay_browse_prices_worker.mjs:496-500`

4. Asymmetric guardrail
- LP floor gets guardrail logic, other buckets do not.
- Evidence: `backend/pricing/ebay_browse_prices_worker.mjs:739-746`

## Freshness

### Freshness Contract (implemented)

Fields in play:
- `card_print_active_prices` exposes `last_snapshot_at`, `updated_at` from `ebay_active_prices_latest`:
  - `supabase/migrations/20251213153627_baseline_views.sql:99-103`
- `card_print_latest_price_curve` exposes `created_at`:
  - `supabase/migrations/20251213153627_baseline_views.sql:108`, `:127-128`
- `v_vault_items` exposes `price_ts` from legacy `prices.ts`:
  - `supabase/migrations/20251213153627_baseline_views.sql:591-593`

What UI shows:
- card detail does not display any freshness timestamp.
- vault views currently do not display pricing timestamps either.

### Freshness observed (read-only sample on 2026-02-17)

`ebay_active_prices_latest` / `card_print_latest_price_curve`:
- total rows: 199
- latest timestamp: `2026-02-14T17:27:22Z`
- older than 1 day: 199/199
- older than 7 days: 198/199
- older than 30 days: 197/199

Evidence source: live read-only select counts and max/min timestamps via backend service-role client.

## Repro Harness

### Selected real `card_print_id`s (from live DB, 2026-02-17)

1. High-liquidity modern
- `27428a87-1bf5-48c7-bf3d-2792e8e34bb4` (`Leafy Camo Poncho`, listing_count 147)

2. Low-liquidity
- `4ae4c224-9bae-4961-b441-0b3a573be988` (`Charizard`, listing_count 2)

3. Known inversion (`LP > NM`)
- `2549245f-caff-4cbb-9a75-6b2767322a30` (`Box of Disaster`, NM 4.15 vs LP 4.92)

### SQL: latest condition outputs and freshness

```sql
with target(card_print_id, label) as (
  values
    ('27428a87-1bf5-48c7-bf3d-2792e8e34bb4'::uuid, 'high_liquidity'),
    ('4ae4c224-9bae-4961-b441-0b3a573be988'::uuid, 'low_liquidity'),
    ('2549245f-caff-4cbb-9a75-6b2767322a30'::uuid, 'lp_gt_nm_case')
)
select
  t.label,
  cp.id as card_print_id,
  cp.name,
  cp.set_code,
  cp.number,
  ap.nm_median,
  ap.lp_median,
  ap.listing_count,
  ap.last_snapshot_at,
  ap.updated_at,
  c.created_at as curve_created_at,
  c.nm_median as curve_nm,
  c.lp_median as curve_lp,
  c.mp_median as curve_mp,
  c.hp_median as curve_hp,
  c.dmg_median as curve_dmg,
  c.confidence
from target t
join public.card_prints cp on cp.id = t.card_print_id
left join public.card_print_active_prices ap on ap.card_print_id = t.card_print_id
left join public.card_print_latest_price_curve c on c.card_print_id = t.card_print_id
order by t.label;
```

### SQL: monotonic checks on latest curve table

```sql
select
  card_print_id,
  nm_median,
  lp_median,
  mp_median,
  hp_median,
  dmg_median,
  listing_count,
  created_at,
  (lp_median is not null and nm_median is not null and lp_median > nm_median) as lp_gt_nm,
  (mp_median is not null and lp_median is not null and mp_median > lp_median) as mp_gt_lp,
  (hp_median is not null and mp_median is not null and hp_median > mp_median) as hp_gt_mp,
  (dmg_median is not null and hp_median is not null and dmg_median > hp_median) as dmg_gt_hp
from public.card_print_latest_price_curve
where card_print_id in (
  '27428a87-1bf5-48c7-bf3d-2792e8e34bb4'::uuid,
  '4ae4c224-9bae-4961-b441-0b3a573be988'::uuid,
  '2549245f-caff-4cbb-9a75-6b2767322a30'::uuid
);
```

### SQL: compare current view chain and legacy chain side-by-side

```sql
with target(card_print_id) as (
  values
    ('27428a87-1bf5-48c7-bf3d-2792e8e34bb4'::uuid),
    ('4ae4c224-9bae-4961-b441-0b3a573be988'::uuid),
    ('2549245f-caff-4cbb-9a75-6b2767322a30'::uuid)
)
select
  t.card_print_id,
  ap.nm_median,
  ap.lp_median,
  ap.updated_at as active_updated_at,
  bp.base_market,
  bp.base_ts,
  bp.condition_label,
  bp.cond_market,
  bp.cond_ts
from target t
left join public.card_print_active_prices ap on ap.card_print_id = t.card_print_id
left join public.v_best_prices_all bp on bp.card_id = t.card_print_id
order by t.card_print_id, bp.condition_label nulls first;
```

Expected signal:
- `lp_gt_nm_case` should show `lp_median > nm_median` in active/curve outputs.
- legacy `v_best_prices_all` may be null or unrelated for same IDs, proving split pipelines.

## Findings

Ranked by confidence.

1. Split-brain pricing architecture is active in production (High confidence)
- Card detail uses eBay active listing path; vault views use legacy base/condition/graded path.
- Evidence:
  - `lib/card_detail_screen.dart:52-56`
  - `lib/main.dart:1384-1388`
  - `apps/web/src/app/vault/page.tsx:33-35`
  - `supabase/migrations/20251213153627_baseline_views.sql:87-103`, `:164-210`, `:509-613`, `:730-803`

2. Monotonic condition ordering is not enforced (High confidence)
- No enforcement in worker/SQL, and violations are common in live data.
- Evidence:
  - code: `backend/pricing/ebay_browse_prices_worker.mjs:591-759`
  - live sample: 129/199 latest curves violate at least one monotonic relation.

3. LP inflation risk is built into classification rules (High confidence)
- Unknown-but-matching listings are assigned to LP.
- Evidence:
  - `backend/pricing/ebay_browse_prices_worker.mjs:476-478`

4. Freshness is stale with no user-visible staleness indicator (High confidence)
- All 199 active rows older than 1 day on 2026-02-17; UI does not display freshness timestamps.
- Evidence:
  - view columns exist (`supabase/migrations/20251213153627_baseline_views.sql:99-103`)
  - UI omission (`lib/card_detail_screen.dart:384-500`)

5. Queue latency can be very high despite short per-job runtime (High confidence)
- Pricing jobs show multi-day to multi-week wait from request to start (p95 ~34.7 days for done jobs in sample).
- Evidence:
  - claim behavior `backend/pricing/pricing_job_runner_v1.mjs:52-57`
  - read-only live sample stats computed from `pricing_jobs` timestamps.

6. Priority field is written by UI but ignored by the default runner (High confidence)
- UI writes `priority='user'`; default runner sorts by `requested_at`, not priority.
- Evidence:
  - `lib/card_detail_screen.dart:88-91`
  - `backend/pricing/pricing_job_runner_v1.mjs:52-57`
  - alternate priority-aware worker exists but is not default script target (`backend/pricing/pricing_queue_worker.mjs:54-83`, `backend/package.json:6-7`).

7. Legacy observation/index contract in docs is not present as DB objects in repo (High confidence)
- `price_aggregates_v1` and `price_index_v1` are documented in contract but not defined in migrations.
- Evidence:
  - doc: `docs/contracts/PRICING_INDEX_V1_CONTRACT.md:10-17`
  - repo search: no hits in `supabase/migrations` for object definitions.

8. Raw-observation sold pipeline and active-listing pipeline are not currently unified (Medium-high confidence)
- `price_observations` workers exist but are phase/skeleton and currently not driving UI value.
- Evidence:
  - workers annotate mapping TODO/null id behavior:
    - `backend/ebay/ebay_self_orders_worker.mjs:3-7`, `:103`
    - `backend/ebay/ebay_sellers_sync_worker.mjs:3-5`, `:94`, `:200-203`
  - UI path still reads `card_print_active_prices` (`lib/card_detail_screen.dart:52-56`).

## Next Actions (Hypotheses only, no code changes)

1. Hypothesis H1 (High confidence): most wrong-number complaints are from non-monotonic condition medians plus LP fallback classification, not from rendering bugs.
2. Hypothesis H2 (High confidence): most slow-refresh complaints are queue-ops related (runner availability + FIFO waits), not computation runtime (runtime is usually seconds to ~1 minute).
3. Hypothesis H3 (Medium-high confidence): user trust issues are amplified by missing freshness display despite stale data being common.
4. Hypothesis H4 (Medium confidence): pricing confusion persists until one canonical value source is selected per UI surface (or both are clearly labeled as different models).
