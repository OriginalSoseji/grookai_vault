# MEE-NIGHTLY-DROPLET-WORKER-V1

- Mode: `dry_run`
- Run key: `MEE-DROPLET-2026-06-27`
- Package fingerprint: `7e087d20fc80cc2ddb1780a53f9403c609105eb99df2a0230ebdd4c1ae84fce6`
- Findings: `0`

## Phase Plan

```json
[
  {
    "key": "preflight_fast_readback",
    "command": "node scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs",
    "run_only": false,
    "provider_calls": false,
    "db_writes": false,
    "skipped_in_dry_run": false
  },
  {
    "key": "listing_ingest",
    "command": "node scripts/audits/market_listing_nightly_ingest_run_v1.mjs --call-ceiling=4000 --run-key=MEE-DROPLET-2026-06-27",
    "run_only": false,
    "provider_calls": true,
    "db_writes": true,
    "skipped_in_dry_run": false
  },
  {
    "key": "lifecycle_projection_drain",
    "command": "node scripts/audits/market_evidence_lifecycle_post_drain_readback_v1.mjs",
    "run_only": false,
    "provider_calls": false,
    "db_writes": true,
    "skipped_in_dry_run": false
  },
  {
    "key": "quality_scoring_readback",
    "command": "node scripts/audits/market_evidence_quality_scoring_read_model_v1.mjs",
    "run_only": false,
    "provider_calls": false,
    "db_writes": false,
    "skipped_in_dry_run": false
  },
  {
    "key": "quality_gate_action_plan",
    "command": "node scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs",
    "run_only": false,
    "provider_calls": false,
    "db_writes": false,
    "skipped_in_dry_run": false
  },
  {
    "key": "quality_gate_action_preflight",
    "command": "supabase db query --linked -f docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_preflight.sql",
    "run_only": false,
    "provider_calls": false,
    "db_writes": false,
    "skipped_in_dry_run": false
  },
  {
    "key": "quality_gate_action_apply",
    "command": null,
    "run_only": true,
    "provider_calls": false,
    "db_writes": true,
    "skipped_in_dry_run": true
  },
  {
    "key": "quality_gate_action_readback",
    "command": "supabase db query --linked -f docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_readback.sql",
    "run_only": false,
    "provider_calls": false,
    "db_writes": false,
    "skipped_in_dry_run": false
  },
  {
    "key": "final_fast_readback",
    "command": "node scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs",
    "run_only": false,
    "provider_calls": false,
    "db_writes": false,
    "skipped_in_dry_run": false
  },
  {
    "key": "foundation_checkpoint",
    "command": "node scripts/audits/market_evidence_foundation_complete_v2.mjs",
    "run_only": false,
    "provider_calls": false,
    "db_writes": false,
    "skipped_in_dry_run": false
  }
]
```

## Execution

```json
[
  {
    "phase": "preflight_fast_readback",
    "command": "node scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs",
    "status": 0
  },
  {
    "phase": "listing_ingest",
    "command": "node scripts/audits/market_listing_nightly_ingest_run_v1.mjs --call-ceiling=4000 --run-key=MEE-DROPLET-2026-06-27",
    "status": 0
  },
  {
    "phase": "lifecycle_projection_drain",
    "command": "node scripts/audits/market_evidence_lifecycle_post_drain_readback_v1.mjs",
    "status": 0
  },
  {
    "phase": "quality_scoring_readback",
    "command": "node scripts/audits/market_evidence_quality_scoring_read_model_v1.mjs",
    "status": 0
  },
  {
    "phase": "quality_gate_action_plan",
    "command": "node scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs",
    "status": 0
  },
  {
    "phase": "quality_gate_action_preflight",
    "command": "supabase db query --linked -f docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_preflight.sql",
    "status": 0
  },
  {
    "phase": "quality_gate_action_apply",
    "skipped": true,
    "reason": "run_only_phase_skipped_in_dry_run"
  },
  {
    "phase": "quality_gate_action_readback",
    "command": "supabase db query --linked -f docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_readback.sql",
    "status": 0
  },
  {
    "phase": "final_fast_readback",
    "command": "node scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs",
    "status": 0
  },
  {
    "phase": "foundation_checkpoint",
    "command": "node scripts/audits/market_evidence_foundation_complete_v2.mjs",
    "status": 0
  }
]
```

## Boundary

```json
{
  "provider_calls": false,
  "db_writes": false,
  "public_pricing_views": false,
  "app_visible_pricing": false,
  "public_price_rollups": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "identity_table_writes": false,
  "vault_writes": false,
  "image_storage_writes": false,
  "migrations": false,
  "global_apply": false
}
```

## Findings

- none
