# Market Evidence Engine Core V1

Status: candidate

Date: 2026-06-26

## Objective

Define the provider-agnostic lifecycle that every market signal must follow before it can influence public pricing in Grookai.

This contract is not an eBay coverage plan, not a public pricing rollout, and not a price-every-card objective. It is the core lifecycle for evidence intake, preservation, normalization, matching, classification, quality gating, internal rollup, and final publication gating.

## Core Principle

A provider does not create price truth. A provider creates evidence.

Grookai owns acquisition records, raw evidence preservation, normalization, matching, confidence, eligibility, rollups, publication gates, and replay/audit.

## Required Lifecycle

Every market observation must move through these stages in order:

1. `acquired`
2. `raw_stored`
3. `normalized`
4. `matched`
5. `classified`
6. `quality_gated`
7. `rollup_eligible`
8. `rolled_up_internal`
9. `publishable`
10. `app_visible`

No row may skip stages. No provider-specific shortcut may bypass this lifecycle.

## Evidence Source Types

Allowed source-type families:

- `reference`: catalog/reference prices or price-like source records, such as TCGCSV and PokemonTCG.io. These may provide signals but cannot directly become market truth.
- `active_listing`: active marketplace asking-price observations, such as eBay Browse API listings. These are asking prices only, not sold comps.
- `sold_comp`: future sold/completed transaction evidence, if a compliant provider exists. Not implemented in this package.
- `manual_review`: future human-reviewed evidence entry. Manual review can promote state only when audit payloads preserve who/when/why.
- `internal_projection`: future internal model output. It is downstream of evidence and must not become public without explicit publication gates.

Providers are adapters into the lifecycle. Providers are not pricing authorities.

## Normalized Observation Shape

Every normalized observation, regardless of provider, must be representable with:

- `source`
- `source_type`
- `source_record_id`
- `source_url`
- `acquisition_run_id`
- `raw_snapshot_id`
- `observed_at`
- `normalized_at`
- `currency`
- `price_amount`
- `price_kind`: `reference`, `active_ask`, `sold_comp`, `manual`, or `internal_projection`
- `listing_status` where applicable
- `listing_format` where applicable
- `condition_bucket`
- `finish_bucket`
- `evidence_class`: `raw_single`, `slab`, `sealed`, `lot_or_bulk`, `ambiguous`, `reference_metric`, or `blocked`
- `seller_key` where applicable
- `candidate_card_print_id`
- `candidate_gv_id`
- `match_confidence`
- `match_reasons`
- `exclusion_flags`
- `quality_flags`
- `lifecycle_state`
- `state_history`
- `model_eligible`
- `rollup_eligible`
- `publishable`
- `app_visible`
- `market_truth`

The current schema stores much of this in lane-specific tables and JSON payloads. A future implementation should make the shared lifecycle state queryable without losing provider-specific payloads.

## Matching Confidence Model

Matching must be explicit and explainable.

Minimum confidence states:

- `unmatched`: no card identity candidate.
- `weak_candidate`: possible candidate, insufficient title/set/number/finish evidence.
- `candidate`: enough identity evidence for internal review, not rollup eligible by default.
- `strong_candidate`: high title/set/number/finish agreement, still review-only unless quality gates pass.
- `reviewed_match`: human or deterministic review confirmed the match.
- `rejected_match`: candidate is known wrong.

Required matching payload:

- `match_version`
- `match_confidence` from `0` to `1`
- `match_status`
- `positive_evidence`
- `negative_evidence`
- `ambiguous_tokens`
- `blocked_reasons`

## Classification Model

Classification must happen after matching and before quality gating.

Required classification dimensions:

- market lane: `reference`, `active_listing`, `sold_comp`, `manual_review`
- object lane: `raw_single`, `slab`, `sealed`, `lot_or_bulk`, `accessory`, `ambiguous`
- card lane: ordinary, variant, promo, deck replica, stamp/signature, print-run lane, unknown
- condition lane: normalized condition bucket or `unknown`
- finish lane: normal, holo, reverse holo, foil family, unknown
- currency lane: USD or excluded until currency normalization exists

Classification never publishes. It only prepares evidence for gates.

## Quality Gate Rules

Quality gates determine whether evidence can contribute to internal rollups.

Hard blockers:

- wrong identity
- foreign-language mismatch when English physical market is required
- lot/bulk/choose-your-card/menu listings
- sealed products when raw singles are expected
- custom/proxy/fake listings
- non-USD until currency normalization exists
- missing price
- negative price or shipping
- incomplete identity evidence for special lanes
- stale evidence outside the rollup window
- source-specific policy violation

Review-required conditions:

- high variance
- single-source reference evidence
- slab/raw ambiguity
- special promo or deck-replica lane
- print-run lane evidence missing lane-specific terms
- seller concentration
- low listing count
- low seller count

## Rollup Eligibility Rules

Evidence may become `rollup_eligible` only when:

- it is raw-stored and normalized,
- it has a candidate or reviewed match,
- it is classified,
- quality gates are passed,
- currency is supported,
- evidence class matches the rollup lane,
- source type is allowed for that rollup version,
- exclusion flags do not block the lane,
- all calculations are versioned and replayable.

Rollup input rows must be filtered before medians or ranges are calculated.

## Internal Rollup Rules

Internal rollups must include:

- source family
- rollup version
- rollup window
- input evidence query version
- filtering version
- listing/evidence count
- seller/source count
- median or reference median
- low/high bands
- exclusion summary
- sample evidence references
- `needs_review=true`
- `publishable=false`
- `app_visible=false`
- `market_truth=false`

Internal rollups are not public pricing.

## Publish Gate Rules

Only a separate publication contract may move a rollup beyond internal state.

Minimum publish gate requirements:

- all lifecycle stages completed in order,
- rollup is internal and replayable,
- rollup source policy allows publication,
- enough independent evidence for the lane,
- confidence and quality thresholds pass,
- no hard blockers,
- review status explicitly allows promotion,
- publication payload explains source family and limitations,
- public view is changed only by an approved publication migration or apply package.

No current Market Evidence Engine warehouse row is publishable under this core contract.

## App-Visible Rules

`app_visible` is the final state. It requires `publishable=true`, plus UI-specific labeling and disclaimer rules.

Active listings must be labeled as active asking-price evidence, not sold value. Reference evidence must be labeled as reference evidence, not market truth. Internal model output must be labeled as Grookai-derived and must cite underlying evidence families.

## Replay And Audit Requirements

Every run must preserve:

- contract name and hash
- source adapter name and version
- acquisition run key
- provider request artifacts or source input artifacts
- raw payload hashes
- normalizer version
- matcher version
- classifier version
- quality gate version
- rollup version
- publication gate version when applicable
- input row counts
- output row counts
- blocked/excluded counts
- boundary proof: no forbidden writes
- final readback report

Any promoted public price must be traceable back to raw evidence and gate decisions.

## Current-State Audit Summary

Remote schema verified on 2026-06-26:

- `market_reference_*` tables exist for acquisition runs, raw snapshots, candidates, normalized evidence, coverage reports, and internal reference signal rollups.
- `market_listing_*` tables exist for acquisition runs, query cache, raw snapshots, observations, seller snapshots, card candidates, price events, and internal listing rollups.
- All `market_reference_*` and `market_listing_*` policies are service-role-only.
- Current public pricing view `public.v_card_pricing_ui_v1` reads `card_prints` plus legacy `ebay_active_prices_latest`; it does not read `market_reference_*` or `market_listing_*`.
- `pricing_observations` currently has zero rows.
- `market_reference_candidates` and `market_listing_card_candidates` are all `needs_review=true` and `can_publish_price_directly=false`.
- `market_reference_signal_rollups` and `market_listing_rollups` are all `needs_review=true`, `publishable=false`, `app_visible=false`, and `market_truth=false`.

Current counts at audit time:

| Area | Count |
| --- | ---: |
| `market_reference_acquisition_runs` | 5 |
| `market_reference_raw_snapshots` | 10,788 |
| `market_reference_candidates` | 21,760 |
| `market_reference_normalized_evidence` | 21,745 |
| `market_reference_signal_rollups` | 1,986 |
| `market_listing_acquisition_runs` | 3 |
| `market_listing_raw_snapshots` | 130,686 |
| `market_listing_observations` | 130,686 |
| `market_listing_card_candidates` | 108,600 |
| `market_listing_rollups` | 4,518 |
| `pricing_observations` | 0 |
| `ebay_active_prices_latest` | 1,690 |

## Gap Analysis

Existing strengths:

- Raw preservation exists for reference and active-listing lanes.
- Candidate and rollup gates are currently safe by default.
- Service-role-only policies are in place.
- Public pricing does not consume new Market Evidence Engine warehouses.
- Existing tests cover many acquisition, normalization, backfill, and rollup paths.

Missing core pieces:

- No single provider-agnostic lifecycle state table or view.
- Lifecycle state is implicit in table placement and flags, not explicitly recorded as ordered transitions.
- Reference and listing lanes have different normalized shapes.
- Listing observations do not have a first-class normalized evidence table equivalent to `market_reference_normalized_evidence`.
- State transition history is not centralized.
- Matching confidence semantics differ by lane.
- Classification is partly stored in JSON payloads, not a shared model.
- Publication gates are defensive flags, but there is no explicit promotion workflow from internal rollup to publishable to app-visible.
- Replay proof is spread across audit artifacts, run rows, and scripts instead of one lifecycle readback report.

## Implementation Plan

Phase 1: lifecycle read model only.

- Create a read-only audit script that projects existing `market_reference_*` and `market_listing_*` rows into the ten lifecycle states.
- Do not create tables.
- Do not write DB rows.
- Produce a gap report showing which stages are explicit, inferred, or missing.

Phase 2: lifecycle schema candidate.

- Design service-role-only lifecycle tables or views:
  - `market_evidence_lifecycle_events`
  - `market_evidence_normalized_observations`
  - `market_evidence_publication_candidates`
- Keep provider payloads in provider warehouses.
- Store state transitions append-only.

Phase 3: provider adapter contract.

- Define adapter output requirements for reference, active listing, sold comp, and manual review providers.
- Require adapters to emit acquisition artifacts, raw payload hashes, and normalized observation candidates.

Phase 4: promotion contract.

- Define a separate `MARKET_EVIDENCE_PUBLICATION_GATE_V1`.
- Only that contract may create publishable/app-visible records or change public pricing views.

Phase 5: verification.

- Add contract tests proving:
  - no provider adapter writes public pricing,
  - no lifecycle stage can skip prior stages,
  - all rollups remain internal unless a publication gate is invoked,
  - public views do not consume internal warehouses without a publication contract.

## Verification Plan

Required checks:

- Query remote schema for all `market_reference_*`, `market_listing_*`, `pricing_observations`, `ebay_active_prices_latest`, and `v_card_pricing_ui_v1` objects.
- Query flag distributions for candidates and rollups.
- Confirm public pricing view dependencies.
- Confirm RLS policies remain service-role-only.
- Run existing contract tests for source registry, normalization, warehouse schema, listing acquisition, strict filtering, and nightly wrapper.
- Add a future lifecycle readback test once the read model exists.

## Hard Boundaries

This contract does not allow:

- optimizing card coverage,
- improving eBay query targeting,
- public pricing,
- app-visible pricing,
- `pricing_observations` writes,
- `ebay_active_prices_latest` writes,
- public price rollups,
- identity-table writes,
- vault writes,
- image/storage writes,
- deletes,
- merges,
- migrations,
- treating active listings as market truth,
- treating reference APIs as market truth.

