#!/usr/bin/env bash
set -euo pipefail
MODE="${1:?install or enable required}"
SOURCE_DIR="${2:?qualified unit/script directory required}"
SERVICE=grookai-pokemon-discovery-intake.service
TIMER=grookai-pokemon-discovery-intake.timer
test "$(id -u)" = 0
test -f /etc/grookai/pokemon-discovery.env
test -f /etc/grookai/pokemon-discovery-policy.json
test -f /etc/grookai/pokemon-discovery-ca.pem
test -L /opt/grookai_pokemon_discovery_current
test -d /var/lib/grookai/pokemon-discovery/runs
case "$MODE" in
 install)
  test ! -e "/etc/systemd/system/$SERVICE"
  test ! -e "/etc/systemd/system/$TIMER"
  systemd-analyze verify "$SOURCE_DIR/$SERVICE" "$SOURCE_DIR/$TIMER"
  install -o root -g root -m 0644 "$SOURCE_DIR/$SERVICE" "/etc/systemd/system/$SERVICE"
  install -o root -g root -m 0644 "$SOURCE_DIR/$TIMER" "/etc/systemd/system/$TIMER"
  systemctl daemon-reload
  # Manual real-service execution and independent DB readback precede activation.
  ;;
 enable)
  test ! -e /var/lib/grookai/pokemon-discovery/inflight.json
  test "$(systemctl show "$SERVICE" --property=Result --value)" = success
  test "$(systemctl show "$SERVICE" --property=ExecMainStatus --value)" = 0
  cmp "$SOURCE_DIR/$SERVICE" "/etc/systemd/system/$SERVICE"
  cmp "$SOURCE_DIR/$TIMER" "/etc/systemd/system/$TIMER"
  /usr/bin/node --input-type=module -e '
   import fs from "node:fs"; import assert from "node:assert/strict";
   const root=fs.realpathSync("/opt/grookai_pokemon_discovery_current");
   const {verifyRuntimeRelease,sha256}=await import(root+"/backend/catalog/pokemon_warehouse_discovery_runtime_v1.mjs");
   const policy=JSON.parse(fs.readFileSync("/etc/grookai/pokemon-discovery-policy.json"));
   const bytes=fs.readFileSync(root+"/release-manifest.json");
   verifyRuntimeRelease(root,JSON.parse(bytes),policy.producer_commit);
   assert.equal(sha256(bytes),policy.release_manifest_sha256);assert.equal(policy.enabled,true);
   const last=JSON.parse(fs.readFileSync("/var/lib/grookai/pokemon-discovery/last-run.json"));
   assert.equal(last.status,"passed");assert.equal(last.producer_commit,policy.producer_commit);
   assert.ok(last.intake_job_id);assert.ok(Date.now()-Date.parse(last.finished_at)<3600000);
  '
  systemctl enable --now "$TIMER"
  systemctl list-timers "$TIMER" --no-pager
  ;;
 *) echo 'Expected install or enable' >&2; exit 2 ;;
esac
