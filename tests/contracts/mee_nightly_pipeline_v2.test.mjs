import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("V2 pipeline uses exact artifact handoffs and run-scoped projection", () => {
  const script = read("scripts/workers/market_listing_nightly_pipeline_v2.mjs");
  assert.match(script, /--dry-run=\$\{artifactFrom\(state, "dry_run_plan"\)\}/);
  assert.match(script, /--batch-plan=\$\{artifactFrom\(state, "daily_batch_plan"\)\}/);
  assert.match(script, /--fetch=\$\{artifactFrom\(state, "daily_batch_fetch"\)\}/);
  assert.match(script, /--plan=\$\{artifactFrom\(state, "daily_batch_backfill_plan"\)\}/);
  assert.match(script, /source_acquisition_run/);
  assert.match(script, /provider phase was already attempted.*refusing to refetch/);
  assert.match(script, /provider phase previously failed.*refusing to refetch automatically/);
  assert.match(script, /provider phase attempt was recorded without a final local result/);
  assert.match(script, /ledger_status:\s*"started"/);
  assert.match(script, /latestUnfinishedPipeline/);
  assert.match(script, /cursor_recorded/);
});

test("V2 pipeline preserves non-public and non-destructive boundaries", () => {
  const script = read("scripts/workers/market_listing_nightly_pipeline_v2.mjs");
  assert.match(script, /public_pricing_writes:\s*false/);
  assert.match(script, /app_visible_pricing_writes:\s*false/);
  assert.match(script, /canonical_identity_writes:\s*false/);
  assert.match(script, /deletes:\s*false/);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\btruncate\b/i);
});

test("immutable release installer leaves the timer disabled by default", () => {
  const installer = read("deploy/scripts/install-mee-nightly-release-v2.sh");
  assert.match(installer, /ENABLE_TIMER="\$\{ENABLE_TIMER:-0\}"/);
  assert.match(installer, /status --porcelain --untracked-files=no/);
  assert.match(installer, /ln -sfn/);
  assert.match(installer, /systemctl disable --now/);
  assert.match(installer, /if \[\[ "\$\{ENABLE_TIMER\}" == "1" \]\]/);
});

test("nightly service writes artifacts outside the release checkout", () => {
  const service = read("deploy/systemd/grookai-mee-nightly.service");
  assert.match(service, /MEE_RUNTIME_ARTIFACT_ROOT=\/var\/lib\/grookai\/mee\/audits/);
});
