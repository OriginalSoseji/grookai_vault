# MEE_CORE_BATCH_REVIEW_ACTION_WORKFLOW_APPLY_V1

## Scope

Approved remote apply for `MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1`.

This apply executed only:

- `docs/sql/mee_core_batch_review_action_workflow_v1_apply_candidate.sql`

Approved package fingerprint:

- `39ce2ce20a6896b7e4558eeab97a263aed45127cbe092631b74251166ef8aa89`

Approved apply SQL hash:

- `e39091c11747b4382c03aabb827cab3e6ca74a5c1c66a819561d63c3dadba5c4`

## Preflight

Preflight query:

- `docs/sql/mee_core_batch_review_action_workflow_v1_preflight.sql`

Result:

- `eligible_target_rows`: `550`
- `expected_target_rows`: `550`

## Apply

Apply command:

```bash
supabase db query --linked -f docs\sql\mee_core_batch_review_action_workflow_v1_apply_candidate.sql
```

The SQL invoked `public.apply_market_evidence_review_action_v1` for the approved `require_split` review actions only.

## Readback

Readback query:

- `docs/sql/mee_core_batch_review_action_workflow_v1_readback.sql`

Result:

- `matching_action_event_rows`: `550`
- `distinct_event_disposition_rows`: `550`
- `updated_target_rows`: `550`
- `expected_target_rows`: `550`
- `event_public_flag_rows`: `0`
- `target_public_flag_rows`: `0`
- `pricing_observations_count`: `0`
- `public_pricing_view_market_evidence_references`: `0`

## Boundary Proof

No provider calls were made.

No source fetches were made.

No public pricing views were changed.

No app-visible pricing was written.

No public price rollups were written.

No `pricing_observations` rows were written.

No `ebay_active_prices_latest` rows were written.

No identity, vault, image, or storage tables were touched.

No migrations were applied.

No deletes, upserts, merges, or global apply were performed.

## Outcome

The safe internal `require_split` queue was cleared for the 550 approved rows. These rows are now blocked for split handling instead of remaining pending high-signal review noise.
