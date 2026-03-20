# PRICING_OBSERVATION_LIVE_VALIDATION_V1

## Scope

This audit attempted one tightly controlled live validation pass for `PRICING_OBSERVATION_LAYER_V1` against real eBay Browse data.

Scope constraints followed:

- no schema changes during the run
- no pricing formula changes
- no scheduler or queue changes
- no UI changes
- max `5` target cards
- one pass only
- no manual retries after the first live 429

Runtime path exercised:

- `backend/pricing/run_pricing_observation_live_validation_v1.mjs`
- `backend/pricing/ebay_browse_prices_worker.mjs`
- `backend/pricing/pricing_observation_layer_v1.mjs`
- `public.pricing_observations`
- `public.v_pricing_observations_accepted`
- `public.card_print_active_prices`
- `public.card_print_latest_price_curve`

Run identifier:

- `live_validation_v1_20260319T211128552Z`

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
   - `card_print_id = 08b84048-c56e-491d-a79a-c9ff710fa32b`
   - `Hypno`
   - `set_code = ecard2`
   - `number_plain = H12`
   - pre-run `listing_count_hint = 1`

## Execution Summary

Pre-run budget snapshot from `get_ebay_browse_daily_budget_snapshot_v1`:

- `daily_budget = 4200`
- `consumed_calls = 259`
- `remaining_calls = 3941`
- `estimated_calls_per_job = 4`

The live runner began with the first target only:

- `Pikachu · sv02 · #62`

Observed live execution:

1. worker loaded the target `card_print`
2. worker built the search query:
   - `Pokemon TCG Pikachu Paldea Evolved SV02 62/193`
3. worker called:
   - `searchActiveListings(... limit=3)`
4. eBay returned:
   - HTTP `429`
   - message: `Too many requests. The request limit has been reached for the resource.`

Because the first real Browse search returned `429`, the runner stopped the validation slice immediately and did not continue to the remaining four targets.

Post-run budget snapshot:

- `consumed_calls = 260`
- `remaining_calls = 3940`

That proves the budget counter recorded the outbound Browse attempt even though no observations were persisted.

## Observation Ingestion Results

Validation queries scoped to `raw_payload.validation_run_id = 'live_validation_v1_20260319T211128552Z'` returned:

1. total observations
   - `0`

2. classification x mapping_status distribution
   - none

3. accepted rows where `mapping_status != 'mapped'`
   - `0`

4. accepted rows in `v_pricing_observations_accepted`
   - `0`

5. direct accepted rows in `pricing_observations`
   - `0`

Result:

- no live observations were persisted for this run
- no live accepted rows were created
- no accepted-lane integrity breach occurred
- the run did not reach the point where live listing classification could be audited from persisted rows

## Mapping + Classification Results

Because eBay returned `429` on the first live `searchActiveListings(...)` call, the run produced no persisted listing rows.

What is proven:

- the live validation wrapper correctly tagged the run and failed closed
- the production worker did not create any accepted observation without mapping proof
- the run stopped before broadening beyond the first target

What is not proven by this run:

- whether real live listings persist into `pricing_observations` correctly
- whether live accepted rows remain fully mapped under real traffic
- whether live slab / wrong-set / weak-title cases are classified correctly from actual eBay data

## Accepted Comp Review

No accepted live observations existed for the run.

Reviewed cards:

1. `modern_clean` (`Pikachu`, `sv02`, `62`)
   - accepted comps: `0`
   - active price row after run: unchanged, still null

2. `promo` (`Pikachu`, `swshp`, `020`)
   - accepted comps: `0`
   - active price row after run: unchanged, still null

Because the run stopped at the first `429`, there were no live accepted comps to manually review for trustworthiness.

## Price Explainability Review

No new persisted live observations existed, so no new downstream active price could be defended from accepted comps for this run.

Pre/post downstream state:

- `modern_clean` (`Pikachu sv02 62`)
  - before: no active price row
  - after: no active price row

- `promo` (`Pikachu swshp 020`)
  - before: no active price row
  - after: no active price row

- `ambiguous_name` (`Charizard base1 4`)
  - before: existing active row from older snapshot
  - after: unchanged

- `older_set` (`Gyarados base1 6`)
  - before: no active price row
  - after: no active price row

- `thinner_market` (`Hypno ecard2 H12`)
  - before: existing active row from earlier snapshot
  - after: unchanged

This run therefore did not prove live price explainability end to end.

## Risk Findings

1. Live validation is currently blocked by real eBay throttling even when the internal daily budget is not exhausted.
   - evidence: remaining internal budget was `3941`, but the first Browse search still returned HTTP `429`

2. The quota guard and the upstream eBay throttling window are not the same control surface.
   - evidence: one outbound call was consumed by the internal budget counter, but eBay still denied the request

3. The live validation wrapper behaved safely under failure.
   - evidence: it stopped after the first `429`, created no broad run, and did not insert any misleading accepted observations

4. Live end-to-end trust remains unproven.
   - evidence: there were zero persisted live observations and therefore zero live accepted comps to inspect

## Verdict

FAIL

Why:

- the run did not prove that live eBay listings persist into `pricing_observations`
- the run did not produce any accepted live comps to review
- the run did not prove downstream live price explainability
- the validation stopped correctly on the first real `429`, but that still means live trust has not yet been established

