#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault}"
SERVICE_NAME="grookai-mee-nightly.service"
TIMER_NAME="grookai-mee-nightly.timer"

cd "${REPO_DIR}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager

echo
echo "Recent service logs:"
journalctl -u "${SERVICE_NAME}" -n 120 --no-pager

echo
echo "Latest worker artifacts:"
ls -lt docs/audits/market_evidence_engine_v1/mee_nightly_droplet_worker_v1_*.json 2>/dev/null | head -5 || true
ls -lt docs/audits/market_evidence_engine_v1/mee_nightly_droplet_worker_v1_*.md 2>/dev/null | head -5 || true

echo
echo "Manual dry-run command:"
echo "node scripts/workers/mee_nightly_droplet_worker_v1.mjs --dry-run"
