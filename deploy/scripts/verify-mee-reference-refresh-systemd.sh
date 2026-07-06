#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
SERVICE_NAME="grookai-mee-reference-refresh.service"
TIMER_NAME="grookai-mee-reference-refresh.timer"

cd "${REPO_DIR}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager

echo
echo "Recent reference refresh service logs:"
journalctl -u "${SERVICE_NAME}" -n 160 --no-pager

echo
echo "Latest reference refresh artifacts:"
ls -lt docs/audits/market_evidence_engine_v1/mee_reference_source_refresh_worker_v1_*.json 2>/dev/null | head -5 || true
ls -lt docs/audits/market_evidence_engine_v1/mee_reference_source_refresh_worker_v1_*.md 2>/dev/null | head -5 || true

echo
echo "Latest reference warehouse delta artifacts:"
ls -lt docs/audits/market_evidence_engine_v1/mee_reference_warehouse_delta_writer_v1_*.json 2>/dev/null | head -5 || true
ls -lt docs/audits/market_evidence_engine_v1/mee_reference_warehouse_delta_writer_v1_*.md 2>/dev/null | head -5 || true

echo
echo "Manual dry-run command:"
echo "node scripts/workers/mee_reference_source_refresh_worker_v1.mjs --dry-run"
echo "node scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs --dry-run"
