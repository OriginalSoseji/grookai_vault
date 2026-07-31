import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function source(relativePath) {
  return fs.readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const PIPELINE = source(
  "scripts/workers/tcgplayer_market_pipeline_v1.mjs",
);
const PUBLICATION = source(
  "scripts/workers/tcgplayer_market_publication_worker_v1.mjs",
);
const SCHEDULE = source(
  "scripts/workers/tcgplayer_market_scheduled_runner_v1.mjs",
);
const INSTALLER = source(
  "deploy/scripts/install-tcgplayer-market-pipeline-systemd.sh",
);
const VERIFIER = source(
  "deploy/scripts/verify-tcgplayer-market-pipeline-systemd.sh",
);
const ENV_EXAMPLE = source(
  "deploy/env/tcgplayer-market-pricing.env.example",
);
const PERFORMANCE = source(
  "scripts/audits/tcgplayer_market_read_performance_v1.mjs",
);
const COVERAGE = source(
  "scripts/audits/tcgplayer_market_coverage_v1.mjs",
);

test("full production publication cannot be activated with a row limit", () => {
  assert.match(
    PIPELINE,
    /production mode forbids --publication-limit; full rollout must evaluate the complete eligible scope/,
  );
  assert.match(
    PUBLICATION,
    /production mode forbids --limit; full rollout must evaluate the complete eligible scope/,
  );
  assert.match(
    SCHEDULE,
    /scheduled production mode forbids publication limits/,
  );
});

test("live schedules require an exact clean deployed commit", () => {
  assert.match(SCHEDULE, /TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA/);
  assert.match(SCHEDULE, /scheduled producing commit mismatch/);
  assert.match(SCHEDULE, /live schedule requires a clean tracked worktree/);
  assert.match(SCHEDULE, /expected_commit_sha:\s*args\.expectedCommitSha/);
  assert.match(ENV_EXAMPLE, /TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA=/);
});

test("systemd production activation enforces full scope and exact provenance", () => {
  assert.match(INSTALLER, /require_env_value "TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA"/);
  assert.match(INSTALLER, /does not match/);
  assert.match(INSTALLER, /clean tracked checkout/);
  assert.match(INSTALLER, /leave TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT empty in production mode/);
  assert.match(INSTALLER, /leave TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION empty in production mode/);
  assert.match(VERIFIER, /missing_or_invalid_expected_commit_sha/);
  assert.match(VERIFIER, /deployed_commit_mismatch/);
  assert.match(VERIFIER, /deployed_tracked_worktree_dirty/);
  assert.match(VERIFIER, /production_publication_limit_not_empty/);
  assert.match(VERIFIER, /production_canary_definition_not_empty/);
});

test("production performance uses bounded representative request batches", () => {
  assert.match(PERFORMANCE, /maxRepresentativeBatch:\s*200/);
  assert.match(PERFORMANCE, /--max-representative-batch/);
  assert.match(PERFORMANCE, /maxRepresentativeBatch < 50/);
  assert.match(PERFORMANCE, /maxRepresentativeBatch > 500/);
  assert.match(PERFORMANCE, /parent_grid_representative/);
  assert.match(PERFORMANCE, /printing_batch_representative/);
  assert.doesNotMatch(PERFORMANCE, /parent_grid_all_current/);
  assert.doesNotMatch(PERFORMANCE, /printing_batch_all_current/);
});

test("shadow coverage and current-publication scope have separate gates", () => {
  assert.match(COVERAGE, /--require-coverage-pass/);
  assert.match(COVERAGE, /summary\.coverage_status !== "passed"/);
  assert.match(COVERAGE, /summary\.status !== "passed"/);
});
