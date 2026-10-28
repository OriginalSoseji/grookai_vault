import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = readFileSync(path.join(root, "scripts/ops/tcgplayer_market_artifact_retention_v1.sh"), "utf8");
const installer = readFileSync(path.join(root, "deploy/scripts/install-tcgplayer-market-pipeline-systemd.sh"), "utf8");
const service = readFileSync(path.join(root, "deploy/systemd/grookai-tcgplayer-market-artifact-retention.service"), "utf8");
const timer = readFileSync(path.join(root, "deploy/systemd/grookai-tcgplayer-market-artifact-retention.timer"), "utf8");

test("market artifact retention verifies archives before exact source removal", () => {
  for (const evidence of [
    "realpath -e", "source_manifest_sha256", "tar --zstd --compare",
    "zstd --test --quiet", "sha256sum --check --status",
    "rm -rf --one-file-system", "source_removal_status",
  ]) assert.ok(script.includes(evidence), evidence);
  assert.match(script, /TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-20/);
  assert.match(script, /\['completed', 'failed'\]/);
  assert.match(script, /minimum_age_hours=.*336/);
  assert.match(script, /target_free_bytes=.*25000000000/);
});

test("retention is installed and scheduled ahead of pricing", () => {
  assert.match(service, /User=root/);
  assert.match(service, /Before=grookai-tcgplayer-market-pipeline\.service/);
  assert.match(service, /--apply/);
  assert.match(timer, /OnCalendar=\*-\*-\* 00:30:00 UTC/);
  assert.match(installer, /RETENTION_SERVICE/);
  assert.match(installer, /enable --now "\$\{RETENTION_TIMER\}"/);
  assert.match(installer, /enable --now "\$\{TIMER_NAME\}"/);
});
