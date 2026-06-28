#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
SERVICE_NAME="grookai-mee-post-ingest.service"
TIMER_NAME="grookai-mee-post-ingest.timer"

cd "${REPO_DIR}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager

echo
echo "Recent post-ingest service logs:"
journalctl -u "${SERVICE_NAME}" -n 160 --no-pager

echo
echo "Latest post-ingest artifacts:"
ls -lt docs/audits/market_evidence_engine_v1/mee_nightly_post_ingest_orchestrator_v1_*.json 2>/dev/null | head -5 || true
ls -lt docs/audits/market_evidence_engine_v1/mee_nightly_post_ingest_orchestrator_v1_*.md 2>/dev/null | head -5 || true

echo
echo "Manual readback-only command:"
echo "node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run --execute-readbacks"

