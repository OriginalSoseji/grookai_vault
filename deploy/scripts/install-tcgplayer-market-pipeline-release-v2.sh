#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${RELEASE_DIR:?Set RELEASE_DIR to an immutable checked-out release directory.}"
CURRENT_LINK="${CURRENT_LINK:-/opt/grookai_pricing_current}"
ENV_FILE="${TCGPLAYER_MARKET_ENV_FILE:-/etc/grookai/tcgplayer-market-pricing.env}"
ENABLE_TIMER="${ENABLE_TIMER:-0}"
SERVICE_NAME="grookai-tcgplayer-market-pipeline.service"
TIMER_NAME="grookai-tcgplayer-market-pipeline.timer"

[[ -d "${RELEASE_DIR}/.git" ]] || { echo "RELEASE_DIR must be a Git checkout." >&2; exit 1; }
[[ -z "$(git -C "${RELEASE_DIR}" status --porcelain --untracked-files=no)" ]] || {
  echo "RELEASE_DIR has tracked changes; refusing deployment." >&2
  exit 1
}
[[ -f "${ENV_FILE}" ]] || { echo "Missing protected environment file: ${ENV_FILE}" >&2; exit 1; }

release_sha="$(git -C "${RELEASE_DIR}" rev-parse HEAD)"
for key in TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA TCGPLAYER_MARKET_EXPECTED_COMMIT_SHA; do
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sudo sed -i "s|^${key}=.*|${key}=${release_sha}|" "${ENV_FILE}"
  else
    printf '%s=%s\n' "${key}" "${release_sha}" | sudo tee -a "${ENV_FILE}" >/dev/null
  fi
done
sudo -u grookai npm --prefix "${RELEASE_DIR}" ci
sudo -u grookai node --check "${RELEASE_DIR}/scripts/workers/tcgplayer_market_publication_worker_v1.mjs"
sudo -u grookai node --check "${RELEASE_DIR}/scripts/workers/tcgplayer_market_scheduled_runner_v1.mjs"
sudo -u grookai node --check "${RELEASE_DIR}/scripts/ops/tcgplayer_market_interrupted_run_recovery_v1.mjs"

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
sudo systemctl daemon-reload
sudo systemctl disable --now "${TIMER_NAME}"
sudo systemctl reset-failed "${SERVICE_NAME}" 2>/dev/null || true
if [[ "${ENABLE_TIMER}" == "1" ]]; then
  sudo systemctl enable --now "${TIMER_NAME}"
fi

printf 'release_sha=%s\nprevious_target=%s\ncurrent_target=%s\ntimer_enabled=%s\n' \
  "${release_sha}" "${previous_target}" "$(readlink -f "${CURRENT_LINK}")" "${ENABLE_TIMER}"
