# MEE Nightly Post-Ingest Orchestrator V1

## Purpose

This contract defines the automated Market Evidence Engine post-ingest workflow that runs after acquisition has already completed.

It does not acquire evidence. It does not publish prices. It only organizes already-ingested internal evidence through lifecycle projection, cleanup classification, internal readbacks, blocker-policy closeout, and final non-public publication-gate recheck.

## Boundary

Allowed:

- Read existing `market_reference_*`, `market_listing_*`, and `market_evidence_*` internal tables.
- Project eligible new evidence into the provider-agnostic lifecycle tables when a future apply package is explicitly approved.
- Classify candidate cleanup outcomes using deterministic internal policies.
- Seed append-only internal cleanup events when a future apply package is explicitly approved.
- Run internal readbacks and produce local audit artifacts.
- Refresh derived internal materialized read models needed for publication-gate review.
- Recheck the publication gate as an internal readiness signal only.

Not allowed:

- Provider calls.
- Source fetches.
- Public pricing.
- App-visible pricing.
- Public price rollups.
- `pricing_observations` writes.
- `ebay_active_prices_latest` writes.
- Identity, card print, vault, image, or storage writes.
- Schema migrations.
- Global apply.

## Required Phase Order

1. `preflight_lock_and_context`
2. `acquisition_completion_readback`
3. `lifecycle_projection_plan`
4. `lifecycle_projection_apply_gate`
5. `candidate_cleanup_classification`
6. `cleanup_event_seed_gate`
7. `internal_readbacks`
8. `blocker_policy_closeout`
9. `lifecycle_rollup_summary_refresh`
10. `publication_gate_recheck`
11. `final_report`

No phase may run before its predecessor passes.

## Required States

The post-ingest orchestrator may only advance internal records to or through these non-public states:

- `raw_stored`
- `normalized`
- `matched`
- `classified`
- `quality_gated`
- `rollup_eligible`
- internal cleanup states such as `quarantined`, `needs_matcher_reclassify`, `needs_special_lane_policy`, and `needs_high_value_review`

The orchestrator must not mark a row `publishable`, `app_visible`, or `market_truth`.

## Idempotency

Every run must have a stable run key and package fingerprint. Re-running the same post-ingest package must either:

- prove the same rows already exist and skip safely, or
- stop before writing anything.

The default behavior is stop-on-existing-targets. Skip mode can be introduced later, but it must still produce row-level readback proof.

## Failure Guards

The workflow must stop immediately if any of the following occur:

- Missing required environment.
- Unable to acquire the orchestration lock.
- Acquisition run is incomplete or ambiguous.
- Lifecycle stage order mismatch.
- Duplicate target evidence risk.
- Cleanup event target already has a conflicting event.
- Public-boundary leak.
- Any `publishable`, `app_visible`, or `market_truth` flag appears in the post-ingest result.
- Any readback count differs from the package manifest.
- Derived materialized read-model refresh fails.
- Any phase timeout occurs.

## Publication Boundary

Publication remains a separate downstream project. The final recheck can identify internal candidates, but it cannot publish them or make them app-visible.
