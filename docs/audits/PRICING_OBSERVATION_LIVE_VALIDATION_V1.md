# PRICING_OBSERVATION_LIVE_VALIDATION_V1

## Scope

This audit records the latest tightly controlled live validation attempt for `PRICING_OBSERVATION_LAYER_V1`.

Scope constraints followed:

- no schema changes
- no pricing formula changes
- no classifier changes
- no scheduler or queue changes
- no UI changes
- max `5` deterministic target cards
- one pass only
- stop on the first real `429`

Runtime path exercised:

- `backend/pricing/run_pricing_observation_live_validation_v1.mjs`
- `backend/pricing/ebay_browse_prices_worker.mjs`
- `backend/pricing/pricing_observation_layer_v1.mjs`
- `public.pricing_observations`
- `public.v_pricing_observations_accepted`
- `public.card_print_active_prices`
- `public.card_print_latest_price_curve`
- `apps/web/src/lib/pricing/getCardPricingComps.ts`
- `apps/web/src/lib/pricing/getPricingTrustState.ts`

This run supersedes the earlier failed live attempt from `2026-03-19` and establishes whether a fresh UTC-day budget window changed the live outcome.

Run identifier:

- `live_validation_v1_20260320T145326406Z`

## Targets Used

The runner selected these deterministic canonical targets from the linked project before making any eBay calls:

1. `modern_clean`
   - `card_print_id = f26bdc12-2e68-441a-81a3-466922ab21b8`
   - `Pikachu`
   - `set_code = sv02`
   - `number_plain = 62`

2. `promo`
   - `card_print_id = df470d58-0ba7-46d4-ac01-38bcf3c1706e`
   - `Pikachu`
   - `set_code = swshp`
   - `number_plain = 020`

3. `ambiguous_name`
   - `card_print_id = daaa53ec-35d7-414b-a27c-f55748936699`
   - `Charizard`
   - `set_code = base1`
   - `number_plain = 4`

4. `older_set`
   - `card_print_id = 4300206c-277b-4a0a-956e-e06020131ca0`
   - `Gyarados`
   - `set_code = base1`
   - `number_plain = 6`

5. `thinner_market`
   - `card_print_id = 0f01dabe-ae58-4b32-836d-80386cb4f7e7`
   - `Iron Boulder ex`
   - `set_code = sv05`
   - `number_plain = 217`
   - pre-run `listing_count_hint = 1`

## Execution Summary

Pre-run budget snapshot from `get_ebay_browse_daily_budget_snapshot_v1`:

- `usage_date = 2026-03-20`
- `daily_budget = 4200`
- `consumed_calls = 1011`
- `remaining_calls = 3189`
- `estimated_calls_per_job = 4`

This established that the internal daily quota guard was not exhausted and that one tiny validation slice was still allowed.

Observed live execution:

1. runner selected the first target only:
   - `Pikachu · sv02 · #62`
2. worker loaded the `card_print`
3. worker built the search query:
   - `Pokemon TCG Pikachu Paldea Evolved SV02 62/193`
4. worker called:
   - `searchActiveListings(... limit=3)`
5. eBay returned:
   - HTTP `429`
   - message: `Too many requests. The request limit has been reached for the resource.`
6. runner stopped immediately after that first failure and did not continue to the remaining targets

Post-run budget snapshot:

- `consumed_calls = 1012`
- `remaining_calls = 3188`

What that proves:

- the internal Grookai Browse budget guard allowed the run
- the first real outbound Browse call was counted
- upstream eBay throttling still denied the request before any observation persistence occurred

## Observation Ingestion Results

Validation queries scoped to `raw_payload.validation_run_id = 'live_validation_v1_20260320T145326406Z'` returned:

1. total observations
   - `0`

2. classification x mapping_status distribution
   - none

3. accepted rows where `mapping_status != 'mapped'`
   - `0`

4. accepted rows in `v_pricing_observations_accepted`
   - `0`

5. accepted rows directly in `pricing_observations`
   - `0`

Result:

- no live observations were persisted for this run
- no accepted rows were created
- no accepted-lane integrity breach occurred
- the run did not reach live listing classification or comp selection

## Mapping + Classification Results

Because eBay returned `429` on the first live `searchActiveListings(...)` call, there were no persisted live rows to audit.

What is proven:

- the wrapper tagged the run correctly
- the worker failed closed
- no unmapped or weakly classified rows entered the accepted lane
- no listing reached aggregation without first existing in the observation layer

What is not proven by this run:

- that real live listings persist into `pricing_observations`
- that live mapped rows classify correctly under actual eBay traffic
- that real live accepted rows remain fully mapped under actual eBay traffic

## Accepted Comp Review

No accepted live observations existed for the run.

Reviewed cards:

1. `modern_clean` (`Pikachu`, `sv02`, `62`)
   - accepted comps: `0`
   - active price row after run: unchanged, still null
   - latest curve row after run: null

2. `promo` (`Pikachu`, `swshp`, `020`)
   - accepted comps: `0`
   - active price row after run: unchanged, still null
   - latest curve row after run: null

Because the run stopped at the first `429`, there were no accepted live comps to inspect for slab rejection, wrong-set filtering, or plausibility.

## Price Explainability Review

No new persisted live observations existed, so no new downstream active price could be defended from accepted comps for this run.

Read-only trust-surface check for the first target card (`Pikachu sv02 62`) through:

- `apps/web/src/lib/pricing/getCardPricingComps.ts`
- `apps/web/src/lib/pricing/getPricingTrustState.ts`

returned:

- `accepted_count = 0`
- `staged_count = 0`
- `rejected_count = 0`
- `marketState = none`
- `confidenceLabel = none`
- `freshnessLabel = unknown`
- `trustSummaryText = "No accepted live comps yet"`

That proves the current card-detail trust surface remains honest under blocked live ingestion. It does not fabricate confidence or imply accepted live comps that do not exist.

## Risk Findings

1. Live validation remains blocked by upstream eBay throttling even when the internal daily budget is healthy.
   - evidence: `remaining_calls = 3189` before the run, but the first Browse call still returned HTTP `429`

2. This is now a repeated cross-day live result, not a one-off same-window failure.
   - evidence: the previous live attempt on `2026-03-19` also failed on the first Browse call with `429`
   - evidence: the current run occurred on `2026-03-20` with a fresh `usage_date` and still failed immediately

3. The internal quota guard and upstream eBay throttle are separate control surfaces.
   - evidence: Grookai consumed one internal budget unit, but eBay still denied the request

4. The live validation path is operationally safe under failure.
   - evidence: runner stopped after the first `429`
   - evidence: no broad validation run continued
   - evidence: no misleading accepted observations were created

5. Live trust is still unproven.
   - evidence: zero persisted live observations
   - evidence: zero accepted live comps
   - evidence: zero new explainable live price outputs

## Verdict

BLOCKED_BY_THROTTLE

Why:

- the run did not prove live observation persistence
- the run did not produce any accepted live comps
- the run did not prove live mapping, classification, or explainable price formation from real eBay data
- the system failed closed safely
- the blocking condition was upstream eBay `429` throttling on the first live Browse call, not a proven product-logic failure inside the observation layer
