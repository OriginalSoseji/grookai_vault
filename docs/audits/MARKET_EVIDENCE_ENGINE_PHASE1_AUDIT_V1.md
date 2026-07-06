# MARKET_EVIDENCE_ENGINE_PHASE1_AUDIT_V1

## Status

Audit complete. No database writes, migrations, provider calls, or scraping were performed.

## Scope

This audit restarts the Market Evidence Engine workstream after the mobile/Dex build merge. It checks the current repo state against the active pricing evidence contract before adding any new provider or ingestion behavior.

Branch:

- `codex/market-evidence-engine-v1`

Relevant active contracts and checkpoints:

- `docs/contracts/PRICING_EVIDENCE_ENGINE_V1.md`
- `docs/contracts/PRICING_CONTRACT_INDEX.md`
- `docs/contracts/PRICING_UI_CONTRACT_V1.md`
- `docs/contracts/JUSTTCG_DISPLAY_CONTRACT_V1.md`
- `docs/contracts/MARKET_ANALYSIS_FOUNDATION_CONTRACT_V1.md`
- `docs/contracts/WAREHOUSE_CONTRACT_V1.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_INDEX.md`

## Current Lane State

### Market Truth

The strict observation lane still exists:

- `public.pricing_observations`
- `public.v_pricing_observations_accepted`
- `backend/pricing/pricing_observation_layer_v1.mjs`

The accepted view remains properly gated:

- `classification = 'accepted'`
- `mapping_status = 'mapped'`

That matches the core invariant: accepted and mapped observations are the only market-truth evidence gate.

### Reference

The JustTCG reference helper exists:

- `apps/web/src/lib/pricing/getReferencePricing.ts`

The helper is read-only and explicitly states it does not write to Grookai storage, does not feed `pricing_observations`, and does not return values that should be treated as raw market truth.

### Projection

The projection helper exists:

- `apps/web/src/lib/pricing/getPricingProjectionState.ts`

It consumes `ReferencePricing` and keeps projection labels separate from current market price. This matches the three-lane model at the code-helper level.

### Market Analysis

The market analysis foundation contract requires a single resolver:

- `getCardMarketAnalysisModel(cardPrintId, duration)`

This remains the right extension point for richer analysis. The page should not independently assemble pricing truth.

## Findings

### Finding 1: Pricing Resume Is Stale

`docs/system/RESUME_PRICING_V1.md` says the next objective is `REFERENCE_PRICING_LAYER_V1`.

The checkpoint index now records that reference pricing is already implemented in `PRICING_CHECKPOINT_12_REFERENCE_LAYER_IMPLEMENTATION.md`. The same index also records the warehouse contract as the later checkpoint.

Impact:

- A future pricing restart can choose the wrong next task.
- The team may accidentally re-implement the reference lane instead of hardening evidence ingestion and UI lane labeling.

Recommended fix:

- Update the resume artifact so the next objective is Market Evidence Engine hardening, not initial reference layer implementation.

### Finding 2: UI Contract And Evidence Contract Need Reconciliation

`PRICING_EVIDENCE_ENGINE_V1` says reference providers must not silently become Market Truth.

`PRICING_UI_CONTRACT_V1` says JustTCG is primary by source hierarchy. `JUSTTCG_DISPLAY_CONTRACT_V1` allows a simple JustTCG reference price, but it also requires reference labeling and warns against implying final truth.

The current card pricing rail renders a generic `Pricing` block and, when a price exists, labels it only as:

- `* Market reference`

This is too ambiguous for the newer evidence model. It does not clearly distinguish:

- `Reference pricing: JustTCG`
- `Market data: eBay`
- `Pricing unavailable`

Impact:

- Users can read a JustTCG reference value as Grookai market truth.
- The UI can appear to violate the evidence contract even if the backend lanes remain separate.

Recommended fix:

- Keep JustTCG display allowed, but rename the visible label by source.
- Use `Reference pricing: JustTCG` for JustTCG.
- Use `Market data: eBay` for eBay.
- Never use a generic `Market reference` label for both.

### Finding 3: `v_card_pricing_ui_v1` Is A Mixed Display View

`v_card_pricing_ui_v1` currently exposes:

- `primary_price`
- `primary_source`
- `grookai_value`
- JustTCG range fields
- eBay median/listing fields

The latest migration uses:

```sql
COALESCE(js.nm_price, eb.ebay_median_price) AS primary_price
```

with `primary_source` marking whether the price came from JustTCG or eBay.

This is acceptable only if every consuming UI treats `primary_source` as mandatory for labeling. The current component accepts `primary_price` as enough to render the main number and does not show a source-specific label.

Impact:

- The view shape is usable, but the consumer contract is under-specified.
- Any future app/web consumer can accidentally display `primary_price` as a generic price.

Recommended fix:

- Add contract tests around the pricing rail label behavior.
- Consider renaming UI model fields in the TypeScript layer to force source-aware handling, such as `displayPrice` plus `displayPriceLane`.
- Do not change the DB view until a separate migration plan is approved.

### Finding 4: Warehouse Checkpoint Numbering Drift

`WAREHOUSE_CONTRACT_V1.md` references:

- `PRICING_CHECKPOINT_13_EBAY_WAREHOUSE_INGESTION_STRATEGY_V1`

The pricing checkpoint index currently lists:

- `PRICING_CHECKPOINT_14_WAREHOUSE_CONTRACT_V1.md`

No checkpoint 13 file was found in the pricing checkpoint directory.

Impact:

- Handoff instructions are harder to trust.
- Future implementation can chase a missing artifact.

Recommended fix:

- Either add the missing checkpoint 13 artifact or update the warehouse contract reference to the actual checkpoint file.

### Finding 5: Market Evidence Engine Should Not Start With New Sources

The evidence contract allows future free, free-tier, CSV, uploaded-export, and manual/admin evidence, but it does not authorize any source implementation by itself.

Given the current UI labeling gap and checkpoint drift, adding a new provider now would increase ambiguity.

Impact:

- More data sources would make the lane-label problem worse.
- Any provider work would be harder to certify because display semantics are not fully locked.

Recommended fix:

- First harden lane labels and tests.
- Then implement the warehouse/evidence acquisition plan.

## Recommended Next Work

### MEE-01: Pricing Lane Governance Reconciliation

Goal:

- Make existing pricing displays comply with the active evidence engine before adding more data.

Scope:

- Update `RESUME_PRICING_V1.md`.
- Reconcile the missing/stale checkpoint references.
- Make card pricing rail labels source-specific.
- Add tests that prevent source-agnostic pricing labels from returning.

No migrations required.

### MEE-02: Evidence Warehouse Implementation Plan

Goal:

- Turn `WAREHOUSE_CONTRACT_V1` into an implementation-ready plan without applying it yet.

Scope:

- Define raw listing warehouse schema.
- Define normalized listing schema.
- Define replay flow into `pricing_observations`.
- Define throttle-safe ingestion runner behavior.
- Define proof queries.

Migration planning only. No apply.

### MEE-03: Controlled Live eBay Validation Pass

Goal:

- Re-run the existing live validation wrapper when source availability allows it.

Scope:

- Use current demand-driven queue policy.
- Confirm live eBay listings persist into `pricing_observations`.
- Confirm accepted rows remain mapped.
- Confirm pricing UI can explain accepted comps.

No broad backfill.

## Decision

The next real step should be `MEE-01`, not provider acquisition.

Reason:

- The market/reference/projection split exists in backend helpers.
- The display layer still has ambiguous labeling.
- Governance docs have stale checkpoint pointers.
- New evidence sources should wait until existing lane labels are impossible to misread.
