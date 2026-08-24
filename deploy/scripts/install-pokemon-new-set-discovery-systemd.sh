#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_pricing_current}"
ENV_FILE="${ENV_FILE:-/etc/grookai/tcgplayer-market-pricing.env}"
STATE_DIR="${STATE_DIR:-/var/lib/grookai/new-set-discovery}"
SERVICE_NAME="grookai-pokemon-new-set-discovery.service"
TIMER_NAME="grookai-pokemon-new-set-discovery.timer"

cd "${REPO_DIR}"

test -f "scripts/workers/pokemon_new_set_discovery_monitor_v1.mjs"
test -f "deploy/systemd/${SERVICE_NAME}"
test -f "deploy/systemd/${TIMER_NAME}"
test -f "${ENV_FILE}"
grep -q '^SUPABASE_DB_URL=' "${ENV_FILE}"

node --check scripts/workers/pokemon_new_set_discovery_monitor_v1.mjs
if DEPLOYED_COMMIT_SHA="$(git -C "${REPO_DIR}" rev-parse HEAD 2>/dev/null)"; then
  :
elif [[ -f "${REPO_DIR}/.release-sha" ]]; then
  DEPLOYED_COMMIT_SHA="$(tr -d '[:space:]' < "${REPO_DIR}/.release-sha")"
else
  echo "REPO_DIR must be a Git checkout or contain .release-sha" >&2
  exit 1
fi
[[ "${DEPLOYED_COMMIT_SHA}" =~ ^[0-9a-f]{40}$ ]] || {
  echo "deployed commit SHA is invalid" >&2
  exit 1
}

install -d -o grookai -g grookai -m 0750 "${STATE_DIR}"
temporary_service="$(mktemp)"
sed \
  -e "s#^WorkingDirectory=.*#WorkingDirectory=${REPO_DIR}#" \
  -e "s#^EnvironmentFile=.*#EnvironmentFile=${ENV_FILE}#" \
  -e "s#^Environment=POKEMON_NEW_SET_DISCOVERY_STATE_DIR=.*#Environment=POKEMON_NEW_SET_DISCOVERY_STATE_DIR=${STATE_DIR}#" \
  -e "s#^Environment=GROOKAI_DEPLOYED_COMMIT_SHA=.*#Environment=GROOKAI_DEPLOYED_COMMIT_SHA=${DEPLOYED_COMMIT_SHA}#" \
  -e "s#^ReadWritePaths=.*#ReadWritePaths=${STATE_DIR}#" \
  "deploy/systemd/${SERVICE_NAME}" > "${temporary_service}"
install -m 0644 "${temporary_service}" "/etc/systemd/system/${SERVICE_NAME}"
rm -f "${temporary_service}"
install -m 0644 "deploy/systemd/${TIMER_NAME}" "/etc/systemd/system/${TIMER_NAME}"

systemctl daemon-reload
systemctl reset-failed "${SERVICE_NAME}" "${TIMER_NAME}" 2>/dev/null || true
systemctl enable --now "${TIMER_NAME}"
systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager
