# JUSTTCG UI PIVOT HANDOFF CHECKPOINT V1

Status: ACTIVE  
Type: Checkpoint / Handoff  
Scope: Captures the verified JustTCG pricing backend state, view pipeline, trust model, drift status, and UI-ready next phase.

## 1. CONTEXT

Grookai Vault completed a JustTCG pricing domain build and multi-source pricing comparison pipeline.

The goal was to:
- ingest JustTCG pricing safely without corrupting the existing eBay pricing architecture
- preserve variant-level pricing fidelity
- compare JustTCG and eBay signals
- derive a first Grookai Value decision layer
- expose UI-ready pricing surfaces
- reconcile drift by capturing view definitions in migrations

The next phase is now a UI pivot, not more backend exploration.

## 2. VERIFIED BACKEND STATE

### JustTCG source-domain tables
Verified production counts:
- `justtcg_variants = 112113`
- `justtcg_variant_price_snapshots = 112919`
- `justtcg_variant_prices_latest = 112113`

Integrity:
- no duplicate latest rows
- no orphan `card_print_id` references
- latest table is derived from snapshots, not directly ingested

### Ingestion workers created
- `backend/pricing/justtcg_domain_dry_run_worker_v1.mjs`
- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
- `backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs`

### JustTCG ingest result
Verified full run:
- `total_mapped_cards_read = 14064`
- `total_cards_returned = 14064`
- `total_variants_upserted = 112113`
- `total_snapshots_inserted = 112113`
- `unresolved_external_ids = []`
- `duplicate_variant_ids_detected = []`
- `cards_with_zero_variants = []`

## 3. VIEW PIPELINE (CURRENT INTENDED STATE)

The following view chain now exists as the multi-source pricing pipeline:

1. `public.v_justtcg_vs_ebay_pricing_v1`
   - card_print-level comparison surface
   - JustTCG side uses Near Mint only
   - eBay side uses existing NM median signal

2. `public.v_justtcg_vs_ebay_classified_v1`
   - adds `price_signal`
   - buckets:
     - `no_overlap`
     - `stable`
     - `spread`
     - `anomaly`

3. `public.v_justtcg_vs_ebay_valid_v1`
   - adds `is_valid_ebay_signal`
   - rule:
     - `null` = unknown / no overlap
     - `false` = abs(price_diff_pct) > 200
     - `true` = otherwise

4. `public.v_grookai_value_v1_clean`
   - first decision layer
   - behavior:
     - invalid eBay → fallback to JustTCG
     - stable → trust eBay
     - spread → midpoint between JustTCG and eBay
     - anomaly with JustTCG present → trust JustTCG

5. `public.v_justtcg_display_summary_v1`
   - UI-safe JustTCG summary
   - fields:
     - `nm_price`
     - `min_price`
     - `max_price`
     - `variant_count`

6. `public.v_card_pricing_ui_v1`
   - UI-facing pricing view
   - current intended behavior:
     - primary price = JustTCG NM if available
     - else eBay median if available
     - else null
     - primary source reflects the actual source used
   - includes:
     - `grookai_value`
     - JustTCG summary fields
     - eBay context fields

7. `public.v_grookai_value_v1_justtcg_bridge`
   - intermediate bridge / experimental comparison surface retained in system

## 4. PRICING / TRUST RESULTS

### Overlap analysis
- overlapping rows with both JustTCG + eBay = `1031`

### Signal distribution
- `no_overlap = 13599`
- `stable = 61`
- `spread = 327`
- `anomaly = 643`

### EBay validation results
- `valid_rows = 983`
- `invalid_rows = 48`
- `unknown_rows = 13599`

Interpretation:
- the system is mostly dealing with no-overlap coverage gaps
- only 48 rows are current high-confidence invalid eBay signals
- those 48 are identity alignment / resolver quality targets, not immediate UI blockers

### Grookai Value output
- rows with computed Grookai Value = `1031`

Important product stance:
- Grookai Value is still experimental / assistive
- JustTCG remains the trusted visible reference for now
- eBay is useful as supporting context and fallback
- Grookai Value should not replace JustTCG in the UI yet

## 5. COVERAGE INSIGHT (IMPORTANT FOR UI)

If `primary_price` is null for JustTCG in some rows, that does NOT mean JustTCG lacks Near Mint pricing globally.

The verified root cause for sampled rows was:
- those specific `card_print_id`s had no `source = 'justtcg'` mapping in `external_mappings`
- therefore no JustTCG rows existed in `justtcg_variant_prices_latest`
- therefore `v_justtcg_display_summary_v1` had no row
- therefore UI correctly fell back to eBay

Translation:
- these are coverage gaps, not pipeline bugs

## 6. DRIFT / MIGRATION STATUS

The chat created churn by allowing direct prod view edits during exploration.
This was later reconciled and validated.

Final validated migration state:
- `supabase db reset --local` passed
- migration preflight passed
- local rebuild proved replayability

Important final migration:
- `supabase/migrations/20260321123000_finalize_justtcg_grookai_views_v1.sql`

This file is the effective final forward migration for the JustTCG / Grookai view layer built in this session.

Historical note:
Earlier reconcile migrations remain as history:
- `20260321113000_reconcile_justtcg_grookai_value_views_v1.sql`
- `20260321120000_reconcile_current_prod_justtcg_grookai_value_views_v2.sql`

Do not rename applied migrations.  
Do not create cosmetic filler migrations for timestamp gaps.  
Future changes must be forward-only.

## 7. UX / PRODUCT STANCE FOR THE NEXT CHAT

The next chat should assume:

### Do NOT reopen backend unless required
Backend state is stable enough for a UI pivot.

### Current UI pricing philosophy
- show JustTCG as the primary visible price when present
- show eBay as fallback when JustTCG is unavailable
- keep Grookai Value present but secondary / experimental
- avoid clutter
- preserve access to richer reference data on demand, not by default

### Desired UX principle
- default view should be simple
- expanded / detailed pricing should be optional
- rich reference data should remain available without dominating the main card UI

### Important anti-drift reminder
No direct prod schema/view edits in the next chat.  
Any UI-facing backend tweak must go through migration-first discipline.

## 8. RECOMMENDED UI STARTING POINT FOR NEXT CHAT

The next chat should focus on these questions only:

1. What should the default pricing card show?
   - JustTCG NM?
   - eBay fallback?
   - Grookai Value badge as secondary?

2. How should “beta / experimental” Grookai Value be labeled?
   - subtle
   - not misleading
   - easy to ignore if needed

3. How should richer reference details be revealed?
   - tap to expand
   - bottom sheet
   - detail row
   - hover/accordion (web)

4. How should missing JustTCG coverage be communicated?
   - silently fallback to eBay
   - or show “market reference unavailable” only in detailed mode

5. How should vendor-oriented context appear without clutter?
   - range
   - listing count
   - source badge
   - only when expanded

## 9. INVARIANTS TO CARRY FORWARD

- JustTCG is non-canonical
- source isolation is mandatory
- variants are first-class pricing units
- snapshots are append-only
- latest is derived
- no source is trusted alone
- identity must precede pricing
- Grookai Value is not yet the primary visible price
- UI simplicity > showing every reference field by default
- no direct prod schema/view edits without migration first

## 10. HANDOFF SUMMARY (SHORT VERSION)

Use this exact handoff summary at the top of the next chat:

> We completed the JustTCG pricing domain backend.  
> JustTCG ingestion, latest builder, comparison views, validation views, Grookai Value clean view, and display summary view are all built and replayable.  
> Production and repo are reconciled via the final migration chain, with `20260321123000_finalize_justtcg_grookai_views_v1.sql` acting as the effective final forward migration for this session’s view layer.  
> Current stance: JustTCG remains the primary trusted visible reference, Grookai Value is secondary/experimental, eBay is fallback/supporting context.  
> We are now pivoting to UI only: simple default pricing display, optional detail expansion, no backend drift, no direct prod edits.

## 11. DONE CRITERIA FOR THIS CHECKPOINT

This checkpoint is complete if:
- the file is created
- it captures the current backend truth
- it clearly directs the next chat into UI mode
- it prevents reopening backend drift questions unless a true bug is found
