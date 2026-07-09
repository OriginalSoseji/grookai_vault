#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
ENV_DIR="${ENV_DIR:-/etc/grookai}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/mee-nightly.env}"
SERVICE_NAME="grookai-mee-nightly.service"
TIMER_NAME="grookai-mee-nightly.timer"

cd "${REPO_DIR}"

env_value() {
  local key="$1"
  awk -F= -v key="${key}" '
    $1 == key {
      value = substr($0, length(key) + 2)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' "${ENV_FILE}"
}

require_env_value() {
  local key="$1"
  local value
  value="$(env_value "${key}")"
  if [[ -z "${value}" ]]; then
    echo "${ENV_FILE} must contain a non-empty ${key}." >&2
    exit 1
  fi
}

if [[ ! -f "scripts/workers/mee_nightly_droplet_worker_v1.mjs" ]]; then
  echo "Missing worker script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  sudo mkdir -p "${ENV_DIR}"
  if [[ -f "deploy/env/mee-nightly.env" ]]; then
    sudo cp "deploy/env/mee-nightly.env" "${ENV_FILE}"
    sudo chmod 600 "${ENV_FILE}"
  else
    echo "Missing ${ENV_FILE}." >&2
    echo "Create it from deploy/env/mee-nightly.env.example and fill secrets before installing." >&2
    exit 1
  fi
fi

if ! grep -q '^MEE_NIGHTLY_ALLOW_RUN=1$' "${ENV_FILE}"; then
  echo "${ENV_FILE} must contain MEE_NIGHTLY_ALLOW_RUN=1." >&2
  exit 1
fi

require_env_value "SUPABASE_URL"
require_env_value "SUPABASE_DB_URL"

if [[ -z "$(env_value SUPABASE_SECRET_KEY)" ]]; then
  echo "${ENV_FILE} must contain SUPABASE_SECRET_KEY." >&2
  exit 1
fi

if [[ -z "$(env_value EBAY_BROWSE_ACCESS_TOKEN)" && -z "$(env_value EBAY_CLIENT_ID)" ]]; then
  echo "${ENV_FILE} must contain EBAY_BROWSE_ACCESS_TOKEN or EBAY_CLIENT_ID/EBAY_CLIENT_SECRET." >&2
  exit 1
fi

if [[ -n "$(env_value EBAY_CLIENT_ID)" && -z "$(env_value EBAY_CLIENT_SECRET)" ]]; then
  echo "${ENV_FILE} has EBAY_CLIENT_ID but is missing EBAY_CLIENT_SECRET." >&2
  exit 1
fi

if [[ "$(env_value MEE_NIGHTLY_NORMALIZATION_ONLY)" != "1" && "$(env_value MEE_NIGHTLY_PROVIDER_CALLS_ENABLED)" != "1" ]]; then
  echo "${ENV_FILE} must contain MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1 for eBay acquisition runs." >&2
  echo "Set MEE_NIGHTLY_NORMALIZATION_ONLY=1 only when intentionally running no-provider reprocessing." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

npm ci

node scripts/workers/mee_nightly_droplet_worker_v1.mjs --dry-run --skip-provider --skip-apply

tmp_service="$(mktemp)"
sed "s#^WorkingDirectory=.*#WorkingDirectory=${REPO_DIR}#" "deploy/systemd/${SERVICE_NAME}" > "${tmp_service}"
sudo cp "${tmp_service}" "/etc/systemd/system/${SERVICE_NAME}"
rm -f "${tmp_service}"
sudo cp "deploy/systemd/${TIMER_NAME}" "/etc/systemd/system/${TIMER_NAME}"
sudo systemctl daemon-reload
sudo systemctl disable --now \
  grookai-justtcg-refresh.timer grookai-justtcg-refresh.service \
  grookai-pricing-refresh.timer grookai-pricing-refresh.service \
  grookai-mee-post-ingest.timer grookai-mee-post-ingest.service 2>/dev/null || true
for retired_unit in \
  grookai-justtcg-refresh.timer grookai-justtcg-refresh.service \
  grookai-pricing-refresh.timer grookai-pricing-refresh.service \
  grookai-mee-post-ingest.timer grookai-mee-post-ingest.service; do
  sudo rm -f "/etc/systemd/system/${retired_unit}"
  sudo ln -s /dev/null "/etc/systemd/system/${retired_unit}"
done
sudo systemctl daemon-reload
sudo systemctl reset-failed \
  grookai-justtcg-refresh.timer grookai-justtcg-refresh.service \
  grookai-pricing-refresh.timer grookai-pricing-refresh.service \
  grookai-mee-post-ingest.timer grookai-mee-post-ingest.service \
  "${SERVICE_NAME}" 2>/dev/null || true
sudo systemctl enable --now "${TIMER_NAME}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager
