#!/usr/bin/env bash
set -euo pipefail

RELEASE_DIR="${RELEASE_DIR:?Set RELEASE_DIR to the clean immutable source release.}"
INSTALL_ROOT="${INSTALL_ROOT:-/usr/local/lib/grookai/ops}"
ENABLE_TIMER="${ENABLE_TIMER:-1}"
RUN_NOW="${RUN_NOW:-1}"
SCRIPT_NAME="grookai_immutable_release_retention_v1.sh"
SERVICE_NAME="grookai-immutable-release-retention.service"
TIMER_NAME="grookai-immutable-release-retention.timer"
CAPACITY_DROP_IN_NAME="capacity-target.conf"

[[ "${EUID}" -eq 0 ]] || { echo "installer must run as root" >&2; exit 1; }
[[ -d "$RELEASE_DIR/.git" ]] || { echo "RELEASE_DIR must be a Git checkout" >&2; exit 1; }
[[ -z "$(git -C "$RELEASE_DIR" status --porcelain)" ]] || {
  echo "RELEASE_DIR must have no tracked or untracked changes" >&2
  exit 1
}
for value in "$ENABLE_TIMER" "$RUN_NOW"; do
  [[ "$value" == "0" || "$value" == "1" ]] || {
    echo "ENABLE_TIMER and RUN_NOW must be 0 or 1" >&2
    exit 1
  }
done

source_script="$RELEASE_DIR/scripts/ops/$SCRIPT_NAME"
source_service="$RELEASE_DIR/deploy/systemd/$SERVICE_NAME"
source_timer="$RELEASE_DIR/deploy/systemd/$TIMER_NAME"
source_capacity_drop_in="$RELEASE_DIR/deploy/systemd/$SERVICE_NAME.d/$CAPACITY_DROP_IN_NAME"
for source_path in "$source_script" "$source_service" "$source_timer" "$source_capacity_drop_in"; do
  [[ -f "$source_path" ]] || { echo "missing install source: $source_path" >&2; exit 1; }
done

bash -n "$source_script"
bash "$source_script"
release_sha="$(git -C "$RELEASE_DIR" rev-parse HEAD)"
script_sha256="$(sha256sum "$source_script" | cut -d' ' -f1)"

install -d -o root -g root -m 0755 -- "$INSTALL_ROOT"
install -o root -g root -m 0755 -- "$source_script" "$INSTALL_ROOT/$SCRIPT_NAME"
install -o root -g root -m 0644 -- "$source_service" "/etc/systemd/system/$SERVICE_NAME"
install -o root -g root -m 0644 -- "$source_timer" "/etc/systemd/system/$TIMER_NAME"
install -d -o root -g root -m 0755 -- "/etc/systemd/system/$SERVICE_NAME.d"
install -o root -g root -m 0644 -- "$source_capacity_drop_in" \
  "/etc/systemd/system/$SERVICE_NAME.d/$CAPACITY_DROP_IN_NAME"
systemctl daemon-reload
systemctl disable --now "$TIMER_NAME" >/dev/null 2>&1 || true
systemctl reset-failed "$SERVICE_NAME" >/dev/null 2>&1 || true

if [[ "$RUN_NOW" == "1" ]]; then
  systemctl start "$SERVICE_NAME"
fi
if [[ "$ENABLE_TIMER" == "1" ]]; then
  systemctl enable --now "$TIMER_NAME"
fi

installed_sha256="$(sha256sum "$INSTALL_ROOT/$SCRIPT_NAME" | cut -d' ' -f1)"
[[ "$installed_sha256" == "$script_sha256" ]] || {
  echo "installed script hash mismatch" >&2
  exit 1
}

printf 'release_sha=%s\n' "$release_sha"
printf 'script_sha256=%s\n' "$script_sha256"
printf 'installed_sha256=%s\n' "$installed_sha256"
printf 'timer_enabled=%s\n' "$(systemctl is-enabled "$TIMER_NAME" 2>/dev/null || true)"
printf 'timer_active=%s\n' "$(systemctl is-active "$TIMER_NAME" 2>/dev/null || true)"
printf 'service_result=%s\n' "$(systemctl show "$SERVICE_NAME" -p Result --value)"
printf 'status=installed_verified\n'
