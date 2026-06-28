import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function loadJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const packageId = "MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1";
const contractPath = "docs/contracts/MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1.md";
const runbookPath = "docs/runbooks/MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1.md";
const planPath = "docs/plans/market_evidence_engine_v1/MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1.md";
const scriptPlanPath = "docs/plans/market_evidence_engine_v1/mee_nightly_post_ingest_orchestrator_v1_script_plan.sh";
const preflightSqlPath = "docs/sql/mee_nightly_post_ingest_orchestrator_v1_preflight.sql";
const readbackSqlPath = "docs/sql/mee_nightly_post_ingest_orchestrator_v1_readback.sql";
const refreshSqlPath = "docs/sql/mee_lifecycle_rollup_summary_refresh_v1.sql";
const serviceCandidatePath = "deploy/systemd/grookai-mee-post-ingest.service.candidate";
const timerCandidatePath = "deploy/systemd/grookai-mee-post-ingest.timer.candidate";
const installerPath = "deploy/scripts/install-mee-post-ingest-systemd.sh";
const verifierPath = "deploy/scripts/verify-mee-post-ingest-systemd.sh";
const markdownPath = "docs/audits/market_evidence_engine_v1/MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1.md";
const manifestPath = "docs/audits/market_evidence_engine_v1/MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1/manifest.json";
const reportPath = "docs/audits/market_evidence_engine_v1/MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1/report.json";
const workerPath = "scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs";
const envExamplePath = "deploy/env/mee-nightly.env.example";

const artifacts = [
  contractPath,
  runbookPath,
  planPath,
  scriptPlanPath,
  workerPath,
  preflightSqlPath,
  readbackSqlPath,
  refreshSqlPath,
  serviceCandidatePath,
  timerCandidatePath,
  installerPath,
  verifierPath,
  envExamplePath,
  markdownPath,
  manifestPath,
  reportPath,
];

test("MEE nightly post-ingest orchestrator plan artifacts exist", () => {
  for (const artifactPath of artifacts) {
    assert.equal(existsSync(new URL(`../../${artifactPath}`, import.meta.url)), true, artifactPath);
    assert.equal(typeof sha256(read(artifactPath)), "string");
  }
});

test("MEE nightly post-ingest orchestrator has the required ordered phases", () => {
  const report = loadJson(reportPath);
  const expected = [
    "preflight_lock_and_context",
    "acquisition_completion_readback",
    "lifecycle_projection_plan",
    "lifecycle_projection_apply_gate",
    "candidate_cleanup_classification",
    "cleanup_event_seed_gate",
    "internal_readbacks",
    "blocker_policy_closeout",
    "lifecycle_rollup_summary_refresh",
    "publication_gate_recheck",
    "final_report",
  ];

  assert.equal(report.package_id, packageId);
  assert.equal(report.mode, "plan_plus_worker");
  assert.deepEqual(report.phase_order, expected);
  assert.deepEqual(loadJson(manifestPath).phase_order, expected);
});

test("MEE nightly post-ingest orchestrator boundaries stay non-public", () => {
  const report = loadJson(reportPath);
  const manifest = loadJson(manifestPath);

  for (const [key, value] of Object.entries(report.boundaries)) {
    assert.equal(value, false, `${key} must remain false`);
  }
  for (const [key, value] of Object.entries(manifest.boundaries)) {
    assert.equal(value, false, `${key} must remain false`);
  }
});

test("MEE nightly post-ingest SQL candidates are read-only", () => {
  for (const sqlPath of [preflightSqlPath, readbackSqlPath]) {
    const sql = read(sqlPath);
    assert.match(sql, /MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1/);
    assert.doesNotMatch(sql, /\binsert\s+into\b/i);
    assert.doesNotMatch(sql, /\bupdate\s+public\./i);
    assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
    assert.doesNotMatch(sql, /\bon\s+conflict\b/i);
    assert.doesNotMatch(sql, /\bselect\s+public\.apply_/i);
    assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
    assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  }
});

test("MEE nightly post-ingest derived refresh is bounded and non-public", () => {
  const sql = read(refreshSqlPath);
  const worker = read(workerPath);
  const envExample = read(envExamplePath);

  assert.match(sql, /refresh materialized view public\.mv_market_evidence_lifecycle_rollup_summary_v1/i);
  assert.match(sql, /MEE-LIFECYCLE-ROLLUP-SUMMARY-REFRESH-V1/);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bpricing_observations\b/i);
  assert.doesNotMatch(sql, /\bebay_active_prices_latest\b/i);
  assert.match(worker, /lifecycle_rollup_summary_refresh/);
  assert.match(worker, /MEE_POST_INGEST_ALLOW_DERIVED_REFRESH/);
  assert.match(worker, /derived_refresh_gate_closed/);
  assert.match(envExample, /MEE_POST_INGEST_ALLOW_DERIVED_REFRESH=1/);
});

test("MEE nightly post-ingest systemd candidates are separate from acquisition", () => {
  const service = read(serviceCandidatePath);
  const timer = read(timerCandidatePath);
  const installer = read(installerPath);
  const verifier = read(verifierPath);
  const runbook = read(runbookPath);
  const envExample = read(envExamplePath);

  assert.match(service, /grookai-mee-post-ingest/);
  assert.match(service, /After=network-online\.target grookai-mee-nightly\.service/);
  assert.match(service, /WorkingDirectory=\/opt\/grookai_vault_mee_nightly/);
  assert.match(service, /EnvironmentFile=\/etc\/grookai\/mee-nightly\.env/);
  assert.match(service, /mee_nightly_post_ingest_orchestrator_v1\.mjs --run/);
  assert.match(timer, /OnCalendar=\*-\*-\* 03:35:00/);
  assert.match(timer, /RandomizedDelaySec=600/);
  assert.match(installer, /REPO_DIR="\$\{REPO_DIR:-\/opt\/grookai_vault_mee_nightly\}"/);
  assert.match(installer, /MEE_POST_INGEST_ALLOW_INTERNAL_WRITES" "0"/);
  assert.match(installer, /mee_nightly_post_ingest_orchestrator_v1\.mjs --dry-run --execute-readbacks/);
  assert.match(installer, /systemctl enable --now "\$\{TIMER_NAME\}"/);
  assert.match(verifier, /journalctl -u "\$\{SERVICE_NAME\}"/);
  assert.match(verifier, /mee_nightly_post_ingest_orchestrator_v1_\*\.json/);
  assert.match(runbook, /No eBay token is required for this post-ingest layer\./);
  assert.match(envExample, /MEE_POST_INGEST_ALLOW_RUN=1/);
  assert.match(envExample, /MEE_POST_INGEST_ALLOW_INTERNAL_WRITES=0/);
  assert.match(envExample, /MEE_POST_INGEST_ALLOW_DERIVED_REFRESH=1/);
});

test("MEE nightly post-ingest script plan is inert documentation", () => {
  const scriptPlan = read(scriptPlanPath);

  assert.match(scriptPlan, /plan artifact only/);
  assert.match(scriptPlan, /preflight_lock_and_context/);
  assert.match(scriptPlan, /publication_gate_recheck/);
  assert.doesNotMatch(scriptPlan, /supabase db query/);
  assert.doesNotMatch(scriptPlan, /node scripts\/audits/);
});

test("MEE nightly post-ingest worker is gated and provider-free", () => {
  const worker = read(workerPath);
  const pkg = loadJson("package.json");

  assert.match(worker, /MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1/);
  assert.match(worker, /MEE_POST_INGEST_ALLOW_RUN/);
  assert.match(worker, /MEE_POST_INGEST_ALLOW_INTERNAL_WRITES/);
  assert.match(worker, /internal_write_gate_closed/);
  assert.match(worker, /provider_calls: false/);
  assert.match(worker, /source_fetches: false/);
  assert.match(worker, /pricing_observations_writes: false/);
  assert.match(worker, /ebay_active_prices_latest_writes: false/);
  assert.match(worker, /public_price_rollups: false/);
  assert.doesNotMatch(worker, /EBAY_BROWSE_ACCESS_TOKEN/);
  assert.doesNotMatch(worker, /EBAY_CLIENT_ID/);
  assert.doesNotMatch(worker, /fetch\(/);
  assert.equal(
    pkg.scripts["mee:nightly:post-ingest:dry-run"],
    "node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run",
  );
  assert.equal(
    pkg.scripts["mee:nightly:post-ingest:readbacks"],
    "node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run --execute-readbacks",
  );
  assert.equal(
    pkg.scripts["mee:nightly:post-ingest:run"],
    "node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --run",
  );
});
