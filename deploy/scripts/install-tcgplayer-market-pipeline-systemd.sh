#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
ENV_DIR="${ENV_DIR:-/etc/grookai}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/tcgplayer-market-pricing.env}"
ACTIVATE_TIMER="${ACTIVATE_TIMER:-0}"
SERVICE_NAME="grookai-tcgplayer-market-pipeline.service"
TIMER_NAME="grookai-tcgplayer-market-pipeline.timer"
WEBHOOK_UNIT="grookai-operations-webhook@.service"
LEGACY_TIMER="grookai-tcgcsv-warehouse.timer"
LEGACY_SERVICE="grookai-tcgcsv-warehouse.service"

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

for required_file in \
  scripts/workers/tcgplayer_market_scheduled_runner_v1.mjs \
  scripts/ops/grookai_operations_webhook_v1.mjs \
  "deploy/systemd/${SERVICE_NAME}" \
  "deploy/systemd/${TIMER_NAME}" \
  "deploy/systemd/${WEBHOOK_UNIT}"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "Missing ${required_file}." >&2
    exit 1
  fi
done

if [[ ! -f "${ENV_FILE}" ]]; then
  sudo mkdir -p "${ENV_DIR}"
  echo "Missing ${ENV_FILE}." >&2
  echo "Create it from deploy/env/tcgplayer-market-pricing.env.example." >&2
  exit 1
fi

require_env_value "SUPABASE_DB_URL"
require_env_value "GROOKAI_OPERATIONS_WEBHOOK_URL"
require_env_value "GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

node --check scripts/workers/tcgplayer_market_scheduled_runner_v1.mjs
node --check scripts/ops/grookai_operations_webhook_v1.mjs
node scripts/workers/tcgplayer_market_scheduled_runner_v1.mjs \
  --dry-run \
  --mode="${TCGPLAYER_MARKET_SCHEDULE_MODE:-shadow}" \
  --out-root=.tmp/tcgplayer-market-scheduled-install-smoke
node scripts/ops/grookai_operations_webhook_v1.mjs \
  --dry-run \
  --unit="${SERVICE_NAME}" \
  --state-dir=.tmp/tcgplayer-market-webhook-install-smoke

sudo install -d -o grookai -g grookai /var/lib/grookai/market-pricing
sudo install -d -o grookai -g grookai /var/lib/grookai/operations-notifications

install_unit() {
  local source_file="$1"
  local target_name="$2"
  local temp_file
  temp_file="$(mktemp)"
  sed "s#^WorkingDirectory=.*#WorkingDirectory=${REPO_DIR}#" "${source_file}" > "${temp_file}"
  sudo cp "${temp_file}" "/etc/systemd/system/${target_name}"
  rm -f "${temp_file}"
}

install_unit "deploy/systemd/${SERVICE_NAME}" "${SERVICE_NAME}"
sudo cp "deploy/systemd/${TIMER_NAME}" "/etc/systemd/system/${TIMER_NAME}"
install_unit "deploy/systemd/${WEBHOOK_UNIT}" "${WEBHOOK_UNIT}"
sudo systemctl daemon-reload
sudo systemctl reset-failed "${SERVICE_NAME}" "${TIMER_NAME}" 2>/dev/null || true

if [[ "${ACTIVATE_TIMER}" != "1" ]]; then
  sudo systemctl disable --now "${TIMER_NAME}" 2>/dev/null || true
  echo "Units installed but timer left disabled. Set ACTIVATE_TIMER=1 only after shadow verification."
  exit 0
fi

if [[ "$(env_value TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN)" != "1" ]]; then
  echo "${ENV_FILE} must set TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN=1 before activation." >&2
  exit 1
fi
require_env_value "TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA"
expected_commit_sha="$(env_value TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA)"
actual_commit_sha="$(git rev-parse HEAD)"
if [[ ! "${expected_commit_sha}" =~ ^[a-f0-9]{40}$ ]]; then
  echo "${ENV_FILE} must contain a full lowercase expected commit SHA." >&2
  exit 1
fi
if [[ "${actual_commit_sha}" != "${expected_commit_sha}" ]]; then
  echo "Deployed commit ${actual_commit_sha} does not match ${expected_commit_sha}." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Live schedule activation requires a clean tracked checkout." >&2
  exit 1
fi
schedule_mode="$(env_value TCGPLAYER_MARKET_SCHEDULE_MODE)"
case "${schedule_mode}" in
  canary)
    require_env_value "TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION"
    if [[ -n "$(env_value TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT)" ]]; then
      echo "${ENV_FILE} must leave TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT empty in exact canary mode." >&2
      exit 1
    fi
    canary_definition="$(env_value TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION)"
    if [[ "${canary_definition}" = /* ]]; then
      canary_definition_path="${canary_definition}"
    else
      canary_definition_path="${REPO_DIR}/${canary_definition}"
    fi
    if [[ ! -f "${canary_definition_path}" ]]; then
      echo "Verified canary definition not found: ${canary_definition_path}" >&2
      exit 1
    fi
    ;;
  production)
    if [[ "$(env_value TCGPLAYER_MARKET_REPLACEMENT_VERIFIED)" != "1" ]]; then
      echo "${ENV_FILE} must set TCGPLAYER_MARKET_REPLACEMENT_VERIFIED=1 after shadow verification." >&2
      exit 1
    fi
    if [[ -n "$(env_value TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT)" ]]; then
      echo "${ENV_FILE} must leave TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT empty in production mode." >&2
      exit 1
    fi
    if [[ -n "$(env_value TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION)" ]]; then
      echo "${ENV_FILE} must leave TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION empty in production mode." >&2
      exit 1
    fi
    ;;
  *)
    echo "${ENV_FILE} must set TCGPLAYER_MARKET_SCHEDULE_MODE=canary or production before activation." >&2
    exit 1
    ;;
esac

# The combined pipeline now owns acquisition and publication. Retire only the
# standalone current-sync timer; historical backfill remains separately governed.
sudo systemctl disable --now "${LEGACY_TIMER}" "${LEGACY_SERVICE}" 2>/dev/null || true
sudo systemctl enable --now "${TIMER_NAME}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager
