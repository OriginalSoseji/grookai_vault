#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${RELEASE_DIR:?Set RELEASE_DIR to an immutable checked-out release directory.}"
CURRENT_LINK="${CURRENT_LINK:-/opt/grookai_mee_current}"
ENV_FILE="${ENV_FILE:-/etc/grookai/mee-nightly.env}"
ARTIFACT_ROOT="${MEE_RUNTIME_ARTIFACT_ROOT:-/var/lib/grookai/mee/audits}"
ENABLE_TIMER="${ENABLE_TIMER:-0}"
SERVICE_NAME="grookai-mee-nightly.service"
TIMER_NAME="grookai-mee-nightly.timer"
RETENTION_SERVICE_NAME="grookai-mee-artifact-retention.service"
RETENTION_TIMER_NAME="grookai-mee-artifact-retention.timer"

if [[ ! -d "${RELEASE_DIR}/.git" ]]; then
  echo "RELEASE_DIR must be a Git checkout." >&2
  exit 1
fi
if [[ -n "$(git -C "${RELEASE_DIR}" status --porcelain --untracked-files=no)" ]]; then
  echo "RELEASE_DIR has tracked changes; refusing deployment." >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing protected environment file: ${ENV_FILE}" >&2
  exit 1
fi

release_sha="$(git -C "${RELEASE_DIR}" rev-parse HEAD)"
sudo install -d -o grookai -g grookai -m 0750 "${ARTIFACT_ROOT}"
sudo install -d -o grookai -g grookai -m 0750 "$(dirname "${ARTIFACT_ROOT}")/archive/runtime"
sudo -u grookai npm --prefix "${RELEASE_DIR}" ci
sudo -u grookai env MEE_RUNTIME_ARTIFACT_ROOT="${ARTIFACT_ROOT}" \
  node "${RELEASE_DIR}/scripts/workers/market_listing_nightly_pipeline_v2.mjs" \
  --dry-run --run-key="MEE-DEPLOY-PREFLIGHT-${release_sha:0:12}"

previous_target="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
sudo ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}.next"
sudo mv -Tf "${CURRENT_LINK}.next" "${CURRENT_LINK}"

tmp_service="$(mktemp)"
sed "s#^WorkingDirectory=.*#WorkingDirectory=${CURRENT_LINK}#" \
  "${RELEASE_DIR}/deploy/systemd/${SERVICE_NAME}" > "${tmp_service}"
sudo install -o root -g root -m 0644 "${tmp_service}" "/etc/systemd/system/${SERVICE_NAME}"
rm -f "${tmp_service}"
sudo install -o root -g root -m 0644 \
  "${RELEASE_DIR}/deploy/systemd/${TIMER_NAME}" "/etc/systemd/system/${TIMER_NAME}"
sudo install -o root -g root -m 0644 \
  "${RELEASE_DIR}/deploy/systemd/${RETENTION_SERVICE_NAME}" "/etc/systemd/system/${RETENTION_SERVICE_NAME}"
sudo install -o root -g root -m 0644 \
  "${RELEASE_DIR}/deploy/systemd/${RETENTION_TIMER_NAME}" "/etc/systemd/system/${RETENTION_TIMER_NAME}"
sudo systemctl daemon-reload
sudo systemctl disable --now "${TIMER_NAME}"
sudo systemctl disable --now "${RETENTION_TIMER_NAME}"
sudo systemctl reset-failed "${SERVICE_NAME}" "${RETENTION_SERVICE_NAME}" 2>/dev/null || true

if [[ "${ENABLE_TIMER}" == "1" ]]; then
  sudo systemctl enable --now "${RETENTION_TIMER_NAME}" "${TIMER_NAME}"
fi

printf 'release_sha=%s\nprevious_target=%s\ncurrent_target=%s\ntimer_enabled=%s\n' \
  "${release_sha}" "${previous_target}" "$(readlink -f "${CURRENT_LINK}")" "${ENABLE_TIMER}"
