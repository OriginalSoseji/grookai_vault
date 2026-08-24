#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
env_file=/etc/grookai/production-control-plane.env
release_link=/opt/grookai_control_plane_current

if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file" >&2
  exit 1
fi
if [[ ! -L "$release_link" && ! -d "$release_link" ]]; then
  echo "Missing $release_link" >&2
  exit 1
fi

install -d -o grookai -g grookai -m 0750 /var/lib/grookai/production-control-plane/current
install -m 0644 \
  "$repo_root/deploy/systemd/grookai-production-control-plane.service" \
  /etc/systemd/system/grookai-production-control-plane.service
install -m 0644 \
  "$repo_root/deploy/systemd/grookai-production-control-plane.timer" \
  /etc/systemd/system/grookai-production-control-plane.timer

systemctl daemon-reload
systemctl enable --now grookai-production-control-plane.timer
systemctl start grookai-production-control-plane.service
systemctl is-active --quiet grookai-production-control-plane.timer
