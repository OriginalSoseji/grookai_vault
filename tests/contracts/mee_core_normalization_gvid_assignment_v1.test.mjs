import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function exists(relativePath) {
  return existsSync(new URL(`../../${relativePath}`, import.meta.url));
}

const assignmentAuditPath = "scripts/audits/market_evidence_normalization_gvid_assignment_audit_v1.mjs";
const normalizationRunnerPath = "scripts/audits/market_evidence_normalization_only_runner_v1.mjs";
const candidatePlanPath = "scripts/audits/market_listing_card_candidate_rollup_plan_v1.mjs";
const nightlyIngestPath = "scripts/audits/market_listing_nightly_ingest_run_v1.mjs";
const workerPath = "scripts/workers/mee_nightly_droplet_worker_v1.mjs";
const envExamplePath = "deploy/env/mee-nightly.env.example";
const contractPath = "docs/contracts/MEE_NIGHTLY_DROPLET_WORKER_V1.md";
const runbookPath = "docs/runbooks/MEE_NIGHTLY_DROPLET_WORKER_V1.md";

test("normalization/GVID foundation artifacts exist", () => {
  for (const file of [assignmentAuditPath, normalizationRunnerPath, candidatePlanPath, nightlyIngestPath]) {
    assert.equal(exists(file), true, file);
  }
});

test("assignment audit proves candidate to card_print_id to gv_id without public pricing writes", () => {
  const script = read(assignmentAuditPath);

  assert.match(script, /MEE-NORMALIZATION-GVID-ASSIGNMENT-AUDIT-V1/);
  assert.match(script, /market_listing_price_events/);
  assert.match(script, /market_listing_card_candidates/);
  assert.match(script, /card_prints/);
  assert.match(script, /card_print_id/);
  assert.match(script, /canonical_gv_id/);
  assert.match(script, /price_events_without_candidate/);
  assert.match(script, /candidate_rows_missing_card_print_id/);
  assert.match(script, /listing_candidates_not_projected_to_lifecycle/);
  assert.match(script, /v_market_evidence_normalization_assignment_queue_v1/);
  assert.match(script, /pricing_observations_writes:\s*false/);
  assert.match(script, /ebay_active_prices_latest_writes:\s*false/);
  assert.match(script, /public_pricing_views:\s*false/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.match(script, /identity_table_writes:\s*false/);
});

test("normalization-only runner has no provider acquisition phases", () => {
  const script = read(normalizationRunnerPath);

  assert.match(script, /MEE-NORMALIZATION-ONLY-RUNNER-V1/);
  assert.match(script, /market_evidence_normalization_gvid_assignment_audit_v1\.mjs/);
  assert.match(script, /market_listing_card_candidate_rollup_plan_v1\.mjs/);
  assert.match(script, /market_listing_card_candidate_rollup_apply_v1\.mjs/);
  assert.match(script, /market_evidence_lifecycle_remaining_drain_v1\.mjs/);
  assert.doesNotMatch(script, /market_listing_acquisition_daily_batch_fetch_v1\.mjs/);
  assert.doesNotMatch(script, /EBAY_BROWSE_ACCESS_TOKEN/);
  assert.match(script, /provider_calls:\s*false/);
  assert.match(script, /dry_run_db_write_phase/);
});

test("candidate planning supports run keys while nightly ingestion resolves the acquisition key dynamically", () => {
  const candidatePlan = read(candidatePlanPath);
  const nightlyIngest = read(nightlyIngestPath);

  assert.match(candidatePlan, /--run-key=/);
  assert.match(candidatePlan, /args\.runKey/);
  assert.match(candidatePlan, /resolvedRunKey/);
  assert.match(candidatePlan, /source_run_key:\s*resolvedRunKey/);
  assert.match(nightlyIngest, /market_listing_card_candidate_rollup_plan_v1\.mjs"/);
  assert.doesNotMatch(nightlyIngest, /market_listing_card_candidate_rollup_plan_v1\.mjs", "--run-key=\{runKey\}"/);
});

test("nightly worker has provider-call budget gates and normalization-only mode", () => {
  const worker = read(workerPath);
  const env = read(envExamplePath);
  const contract = read(contractPath);
  const runbook = read(runbookPath);
  const pkg = JSON.parse(read("package.json"));

  assert.match(worker, /MEE_NIGHTLY_PROVIDER_CALLS_ENABLED/);
  assert.match(worker, /MEE_NIGHTLY_NORMALIZATION_ONLY/);
  assert.match(worker, /MEE_NIGHTLY_MAX_CALL_CEILING/);
  assert.match(worker, /provider_calls_disabled/);
  assert.match(worker, /call_ceiling_exceeds_max/);
  assert.match(worker, /normalization_only_skips_provider_phase/);
  assert.match(worker, /market_evidence_normalization_only_runner_v1\.mjs/);

  assert.match(env, /MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=0/);
  assert.match(env, /MEE_NIGHTLY_NORMALIZATION_ONLY=0/);
  assert.match(env, /MEE_NIGHTLY_MAX_CALL_CEILING=4000/);
  assert.match(contract, /Provider acquisition requires `MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1`/);
  assert.match(runbook, /No-call normalization-only run/);

  assert.equal(pkg.scripts["mee:normalization:gvid-audit"], "node scripts/audits/market_evidence_normalization_gvid_assignment_audit_v1.mjs");
  assert.equal(pkg.scripts["mee:normalization:dry-run"], "node scripts/audits/market_evidence_normalization_only_runner_v1.mjs");
  assert.equal(pkg.scripts["mee:normalization:run"], "node scripts/audits/market_evidence_normalization_only_runner_v1.mjs --run");
});
