# MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1

- Mode: `dry_run_plan_only`
- Run key: `MEE-TCGDEX-POST-LIFECYCLE-READBACK-FAST-02-2026-06-28`
- Package fingerprint: `7f6269d43069b6cc5025d707712d1fd5818771fe537c9026b23c6a0f71bf5e57`
- Findings: `0`

## Phase Plan

```json
[
  {
    "key": "preflight_readback",
    "mode": "readback",
    "command": "supabase db query --linked -f docs/sql/mee_nightly_post_ingest_orchestrator_v1_preflight.sql",
    "read_only": true,
    "local_artifacts": false,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "fast_post_ingest_review_readback",
    "mode": "readback",
    "command": "supabase db query --linked -f docs/sql/mee_core_fast_post_ingest_review_readback_v1.sql",
    "read_only": true,
    "local_artifacts": false,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "lifecycle_projection_plan",
    "mode": "plan",
    "command": "node scripts/audits/market_evidence_lifecycle_backfill_batch_plan_v1.mjs",
    "read_only": true,
    "local_artifacts": true,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "lifecycle_projection_apply_gate",
    "mode": "internal_write",
    "command": "node scripts/audits/market_evidence_lifecycle_remaining_drain_v1.mjs --continue",
    "read_only": false,
    "local_artifacts": false,
    "internal_writes": true,
    "executes_in_dry_run": false,
    "executes_with_readbacks": false,
    "requires_internal_write_gate": true
  },
  {
    "key": "candidate_cleanup_classification_preflight",
    "mode": "readback",
    "command": "supabase db query --linked -f docs/sql/mee_candidate_evidence_cleanup_policy_v1_preflight.sql",
    "read_only": true,
    "local_artifacts": false,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "cleanup_event_seed_preflight",
    "mode": "readback",
    "command": "supabase db query --linked -f docs/sql/mee_candidate_cleanup_event_seed_v1_preflight.sql",
    "read_only": true,
    "local_artifacts": false,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "cleanup_event_seed_apply_gate",
    "mode": "internal_write_sql_directory",
    "command": "supabase db query --linked -f docs/sql/mee_candidate_cleanup_event_seed_v1/*.sql",
    "read_only": false,
    "local_artifacts": false,
    "internal_writes": true,
    "executes_in_dry_run": false,
    "executes_with_readbacks": false,
    "requires_internal_write_gate": true
  },
  {
    "key": "cleanup_event_seed_readback",
    "mode": "readback",
    "command": "supabase db query --linked -f docs/sql/mee_candidate_cleanup_event_seed_v1_readback.sql",
    "read_only": true,
    "local_artifacts": false,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "blocker_policy_closeout",
    "mode": "readback",
    "command": "supabase db query --linked -f docs/sql/mee_blocker_policy_closeout_v1_readback.sql",
    "read_only": true,
    "local_artifacts": false,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "publication_gate_recheck",
    "mode": "readback",
    "command": "supabase db query --linked -f docs/sql/mee_nightly_post_ingest_orchestrator_v1_readback.sql",
    "read_only": true,
    "local_artifacts": false,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  },
  {
    "key": "foundation_checkpoint",
    "mode": "checkpoint",
    "command": "node scripts/audits/market_evidence_foundation_complete_v2.mjs",
    "read_only": true,
    "local_artifacts": true,
    "internal_writes": false,
    "executes_in_dry_run": false,
    "executes_with_readbacks": true,
    "requires_internal_write_gate": false
  }
]
```

## Execution

```json
[
  {
    "phase": "preflight_readback",
    "mode": "readback",
    "command": "postgres_direct_query docs/sql/mee_nightly_post_ingest_orchestrator_v1_preflight.sql",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  },
  {
    "phase": "fast_post_ingest_review_readback",
    "mode": "readback",
    "command": "postgres_direct_query docs/sql/mee_core_fast_post_ingest_review_readback_v1.sql",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  },
  {
    "phase": "lifecycle_projection_plan",
    "mode": "plan",
    "skipped": true,
    "reason": "legacy_lifecycle_planner_disabled",
    "internal_writes": false
  },
  {
    "phase": "lifecycle_projection_apply_gate",
    "mode": "internal_write",
    "skipped": true,
    "reason": "internal_write_gate_closed",
    "internal_writes": true
  },
  {
    "phase": "candidate_cleanup_classification_preflight",
    "mode": "readback",
    "command": "postgres_direct_query docs/sql/mee_candidate_evidence_cleanup_policy_v1_preflight.sql",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  },
  {
    "phase": "cleanup_event_seed_preflight",
    "mode": "readback",
    "command": "postgres_direct_query docs/sql/mee_candidate_cleanup_event_seed_v1_preflight.sql",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  },
  {
    "phase": "cleanup_event_seed_apply_gate",
    "mode": "internal_write_sql_directory",
    "skipped": true,
    "reason": "internal_write_gate_closed",
    "internal_writes": true
  },
  {
    "phase": "cleanup_event_seed_readback",
    "mode": "readback",
    "command": "postgres_direct_query docs/sql/mee_candidate_cleanup_event_seed_v1_readback.sql",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  },
  {
    "phase": "blocker_policy_closeout",
    "mode": "readback",
    "command": "postgres_direct_query docs/sql/mee_blocker_policy_closeout_v1_readback.sql",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  },
  {
    "phase": "publication_gate_recheck",
    "mode": "readback",
    "command": "postgres_direct_query docs/sql/mee_nightly_post_ingest_orchestrator_v1_readback.sql",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  },
  {
    "phase": "foundation_checkpoint",
    "mode": "checkpoint",
    "command": "node scripts/audits/market_evidence_foundation_complete_v2.mjs",
    "status": 0,
    "stderr_tail": "",
    "internal_writes": false,
    "read_only": true
  }
]
```

## Boundary

```json
{
  "provider_calls": false,
  "source_fetches": false,
  "db_writes": false,
  "function_invocation": false,
  "public_pricing": false,
  "app_visible_pricing": false,
  "public_price_rollups": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "identity_writes": false,
  "card_print_writes": false,
  "vault_writes": false,
  "image_storage_writes": false,
  "migrations": false,
  "global_apply": false
}
```

## Findings

- none
