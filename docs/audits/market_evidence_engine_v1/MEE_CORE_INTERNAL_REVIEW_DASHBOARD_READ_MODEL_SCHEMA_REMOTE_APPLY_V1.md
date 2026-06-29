# MEE Core Internal Review Dashboard Read Model Schema Remote Apply V1

Applied: 2026-06-26

Approval:

`MEE-CORE-INTERNAL-REVIEW-DASHBOARD-READ-MODEL-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY`

## Scope

Executed the approved internal-only dashboard read-model SQL candidate against linked Supabase project `ycdxbpibncqcchqiihfz` only:

```bash
supabase db query --linked -f docs/sql/mee_core_internal_review_dashboard_read_model_v1_view_candidates.sql
```

Approved SQL hash:

`65f203935d8ed436e8fbf88c5c8548438940b16761e88c52c06b8a6c6e131c0e`

Verified local file hash before apply:

`65F203935D8ED436E8FBF88C5C8548438940B16761E88C52C06B8A6C6E131C0E`

## Objects Created

- `public.v_market_evidence_review_dashboard_queue_v1`
- `public.v_market_evidence_review_dashboard_status_summary_v1`
- `public.v_market_evidence_review_dashboard_blocker_queue_v1`

## View Readback

All three approved views exist remotely:

```json
{
  "queue_view_count": 1,
  "status_summary_view_count": 1,
  "blocker_queue_view_count": 1
}
```

## Queue Readback

```json
[
  { "dashboard_queue": "reference_only_queue", "card_count": 915, "handoff_candidate_count": 0, "publishable_count": 0, "app_visible_count": 0, "market_truth_count": 0 },
  { "dashboard_queue": "mixed_raw_slab_split_queue", "card_count": 574, "handoff_candidate_count": 0, "publishable_count": 0, "app_visible_count": 0, "market_truth_count": 0 },
  { "dashboard_queue": "standard_candidate_review", "card_count": 460, "handoff_candidate_count": 0, "publishable_count": 0, "app_visible_count": 0, "market_truth_count": 0 },
  { "dashboard_queue": "low_signal_monitor", "card_count": 156, "handoff_candidate_count": 0, "publishable_count": 0, "app_visible_count": 0, "market_truth_count": 0 },
  { "dashboard_queue": "classification_blocked_queue", "card_count": 19, "handoff_candidate_count": 0, "publishable_count": 0, "app_visible_count": 0, "market_truth_count": 0 },
  { "dashboard_queue": "unknown_evidence_review", "card_count": 18, "handoff_candidate_count": 0, "publishable_count": 0, "app_visible_count": 0, "market_truth_count": 0 },
  { "dashboard_queue": "high_signal_candidate_queue", "card_count": 10, "handoff_candidate_count": 0, "publishable_count": 0, "app_visible_count": 0, "market_truth_count": 0 }
]
```

Queue total proof:

```json
{
  "queue_rows": 2152,
  "blocker_rows": 1526,
  "handoff_candidate_rows": 0,
  "public_flag_rows": 0
}
```

## Boundary Readback

```json
{
  "pricing_observations_count": 0,
  "public_pricing_view_references": 0,
  "dashboard_public_flag_rows": 0
}
```

Grant readback returned `postgres` and `service_role` grants for the views. No `anon` or `authenticated` grants were returned.

## Explicit Non-Actions

- No evidence backfill.
- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No public price rollups.
- No identity-table writes.
- No vault writes.
- No image/storage writes.
- No deletes.
- No upserts.
- No merges.
- No `db push`.
- No global apply.
