#!/usr/bin/env bash
# MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1 script plan.
# This is a non-installed plan artifact. It documents the future execution shape.

set -euo pipefail

: "${MEE_POST_INGEST_ALLOW_RUN:?MEE_POST_INGEST_ALLOW_RUN is required}"
: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${MEE_POST_INGEST_RUN_KEY:?MEE_POST_INGEST_RUN_KEY is required}"

if [[ "${MEE_POST_INGEST_ALLOW_RUN}" != "1" ]]; then
  echo "MEE_POST_INGEST_ALLOW_RUN must be 1"
  exit 20
fi

echo "planned phase: preflight_lock_and_context"
echo "planned phase: acquisition_completion_readback"
echo "planned phase: lifecycle_projection_plan"
echo "planned phase: lifecycle_projection_apply_gate"
echo "planned phase: candidate_cleanup_classification"
echo "planned phase: cleanup_event_seed_gate"
echo "planned phase: internal_readbacks"
echo "planned phase: blocker_policy_closeout"
echo "planned phase: publication_gate_recheck"
echo "planned phase: final_report"

echo "plan artifact only; no commands are executed from this file"
exit 0

