# INSERTION_POINT_DECISION

## Scope

Repository-grounded decision on the safe insertion point for JustTCG inside the current Grookai architecture.

Files inspected:

- `docs/audits/PRICING_LAYER_AUDIT.md`
- `docs/audits/JUSTTCG_MAPPING_AUDIT.md`
- `docs/audits/INGESTION_PATTERN_AUDIT.md`
- `docs/audits/VARIANT_SUPPORT_AUDIT.md`
- `docs/audits/JUSTTCG_SCHEMA_GAP.md`
- `docs/audits/INTEGRATION_BREAKPOINTS.md`
- `docs/audits/AGGREGATION_CONSTRAINTS.md`
- `apps/web/src/lib/pricing/getReferencePricing.ts`
- `docs/contracts/JUSTTCG_BATCH_LOOKUP_CONTRACT_V1.md`

## Decision

JustTCG belongs:

- after canonical card mapping
- outside the existing pricing truth tables
- outside the existing Grookai Value aggregation path

## Exact Insertion Layer

Safe insertion point:

```text
external_mappings(source='tcgplayer')
-> external_mappings(source='justtcg')
-> NEW ISOLATED JUSTTCG SOURCE DOMAIN
-> OPTIONAL REFERENCE READ MODEL / UI PROJECTION
```

Not safe:

- `pricing_observations`
- `ebay_active_price_snapshots`
- `ebay_active_prices_latest`
- `card_print_active_prices`
- `v_grookai_value_v1*`
- `v_best_prices_all_gv_v1`

## Why This Is The Only Safe Boundary

### 1. Mapping is already solved at card level

The repo already has a safe boundary for:

- `tcgplayerId` bridge lookup
- `justtcg` card id persistence

### 2. Pricing truth lane is observation-backed and eBay-shaped

Current truth pricing requires:

- accepted + mapped listing observations
- eBay-derived raw bucket summaries
- one effective base row per `card_print`

JustTCG variant data is vendor aggregate data, not listing observations.

### 3. JustTCG variants require isolated semantics

JustTCG pricing is variant-driven and carries dimensions not present in the active truth lane:

- condition
- printing
- language
- vendor aggregate history/statistics

That means JustTCG must live in its own source domain before any read projection consumes it.

## Required Architectural Changes

Required if JustTCG pricing is integrated beyond card mapping:

- new isolated JustTCG pricing layer: YES
- new schema for isolated variant/history storage: YES
- source isolation from eBay truth lane: YES
- direct insertion into current pricing tables: NO

## Safe Operational Interpretation

The repo is safe to proceed with JustTCG only under these constraints:

- keep JustTCG card mapping in `external_mappings`
- keep JustTCG pricing outside the truth lane
- treat JustTCG as a separate source domain and reference lane
- do not collapse vendor variants into current card-level truth tables

## Final L3 Verdict

```text
JUSTTCG_INTEGRATION_STATUS:

* Variant Layer: REQUIRED
* Source Isolation: REQUIRED
* Required Schema Change: YES
* Safe to Proceed: YES (with constraints)
* Blockers: NONE
```

Meaning:

- safe to proceed does not mean "merge into current pricing tables"
- safe to proceed means "add a new isolated JustTCG domain after mapping and keep it out of existing truth aggregation"
