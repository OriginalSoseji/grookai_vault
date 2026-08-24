import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE runtime retention preserves evidence before exact source removal", () => {
  const script = read("scripts/ops/mee_runtime_artifact_retention_v1.sh");
  assert.match(script, /MEE_RUNTIME_ARTIFACT_RETENTION_V1/);
  assert.match(script, /mee_11l_market_listing_acquisition_daily_batch_fetch_/);
  assert.match(script, /mee_11m_market_listing_acquisition_daily_batch_backfill_plan_/);
  assert.match(script, /sha256sum/);
  assert.match(script, /zstd --test/);
  assert.match(script, /tar --zstd --compare/);
  assert.match(script, /source_removal_status.*authorized_pending/);
  assert.match(script, /source_removal_status.*completed_verified/);
  assert.match(script, /rm -rf --one-file-system -- "\$source_real"/);
});

test("MEE retention is serialized, alerted, and scheduled before acquisition", () => {
  const service = read("deploy/systemd/grookai-mee-artifact-retention.service");
  const timer = read("deploy/systemd/grookai-mee-artifact-retention.timer");
  const installer = read("deploy/scripts/install-mee-nightly-release-v2.sh");
  assert.match(service, /flock -n \/tmp\/grookai-mee-nightly\.lock/);
  assert.match(service, /OnFailure=grookai-operations-webhook@%n\.service/);
  assert.match(service, /mee_runtime_artifact_retention_v1\.sh --apply/);
  assert.match(timer, /OnCalendar=\*-\*-\* 01:45:00 UTC/);
  assert.match(installer, /grookai-mee-artifact-retention\.timer/);
  assert.match(installer, /archive\/runtime/);
});
