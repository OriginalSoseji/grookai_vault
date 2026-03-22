# FAILURE_SIMULATION

## Scope

Repository-grounded simulation of what breaks if JustTCG is integrated into the current pricing system incorrectly.

Files inspected:

- `supabase/migrations/20251213153627_baseline_views.sql`
- `supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql`
- `supabase/migrations/20260315233000_reconcile_pricing_compatibility_lane_to_v1_1.sql`
- `supabase/migrations/20260319150000_pricing_observations_v1.sql`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/lib/pricing/getReferencePricing.ts`
- `docs/contracts/PRICING_SURFACE_CONTRACT_V1.md`

## Scenario 1: Inject JustTCG into `card_print_active_prices`

### Failure

`card_print_active_prices` is the eBay-shaped compatibility seam for the active value engine.

If JustTCG is injected there:

- multiple vendor variants must be flattened into one row
- or the view grain changes and downstream views break
- `source` becomes misleading because the columns still mean eBay NM/LP bucket semantics

### Long-Term Impact

- silent truth contamination
- Grookai Value starts computing on vendor aggregate data not designed for that lane
- web/mobile surfaces show mixed-source values without a real isolation boundary

## Scenario 2: Flatten JustTCG variant -> `card_print`

### Failure

A JustTCG variant represents condition + printing oriented market state.

Flattening that to one `card_print` value discards:

- which printing was used
- which condition was used
- whether the chosen variant was representative

### Long-Term Impact

- arbitrary or blended price selection
- impossible auditability later
- reference data starts masquerading as a clean canonical card price

## Scenario 3: Merge sources without isolation

### Failure

If eBay truth and JustTCG aggregates are merged into the same storage or read surface:

- scheduler freshness semantics stop meaning one thing
- `listing_count` and `confidence` stop being comparable
- `base_source` stops communicating a single truth path
- product code cannot safely reason about what kind of evidence produced the number

### Long-Term Impact

- permanent pricing contamination
- loss of explainability
- future debugging becomes source-forensics instead of deterministic review

## Scenario 4: Write JustTCG vendor aggregates into `pricing_observations`

### Failure

`pricing_observations` is a listing observation gate with `accepted + mapped` semantics.

If JustTCG aggregate prices are written there:

- vendor aggregates get mislabeled as accepted listing observations
- observation-layer truth guarantees become false

### Long-Term Impact

- accepted observations no longer mean accepted listings
- every downstream trust guarantee becomes suspect

## Failure Simulation Conclusion

All incorrect integration paths fail in the same direction:

- variant meaning gets collapsed
- truth and reference lanes get mixed
- active card-level aggregation is forced to carry data it was not designed to represent

The safe boundary remains:

- map cards safely
- keep JustTCG pricing outside existing truth tables
- build any JustTCG pricing domain in isolation
