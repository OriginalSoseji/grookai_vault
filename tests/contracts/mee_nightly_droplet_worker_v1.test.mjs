import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function exists(relativePath) {
  return existsSync(new URL(`../../${relativePath}`, import.meta.url));
}

const workerPath = "scripts/workers/mee_nightly_droplet_worker_v1.mjs";
const dbQueryHelperPath = "scripts/lib/market_evidence_db_query_v1.mjs";
const contractPath = "docs/contracts/MEE_NIGHTLY_DROPLET_WORKER_V1.md";
const runbookPath = "docs/runbooks/MEE_NIGHTLY_DROPLET_WORKER_V1.md";
const envPath = "deploy/env/mee-nightly.env.example";
const servicePath = "deploy/systemd/grookai-mee-nightly.service";
const timerPath = "deploy/systemd/grookai-mee-nightly.timer";
const cronPath = "deploy/cron/grookai-mee-nightly.cron";
const installerPath = "deploy/scripts/install-mee-nightly-systemd.sh";
const verifierPath = "deploy/scripts/verify-mee-nightly-systemd.sh";

test("MEE nightly droplet worker artifacts are present", () => {
  for (const artifactPath of [
    workerPath,
    dbQueryHelperPath,
    contractPath,
    runbookPath,
    envPath,
    servicePath,
    timerPath,
    cronPath,
    installerPath,
    verifierPath,
  ]) {
    assert.equal(exists(artifactPath), true, artifactPath);
  }
});

test("MEE nightly droplet worker defaults to dry-run and gates live runs", () => {
  const script = read(workerPath);

  assert.match(script, /MEE-NIGHTLY-DROPLET-WORKER-V1/);
  assert.match(script, /DEFAULT_CALL_CEILING\s*=\s*4000/);
  assert.match(script, /const dryRun = argv\.includes\("--dry-run"\) \|\| !run/);
  assert.match(script, /MEE_NIGHTLY_ALLOW_RUN !== "1"/);
  assert.match(script, /SUPABASE_DB_URL_present/);
  assert.match(script, /MEE_NIGHTLY_PROVIDER_CALLS_ENABLED/);
  assert.match(script, /MEE_NIGHTLY_NORMALIZATION_ONLY/);
  assert.match(script, /call_ceiling_exceeds_max/);
  assert.match(script, /market_evidence_db_query_v1\.mjs/);
  assert.match(script, /ensureSupabaseShimDir/);
  assert.match(script, /npx --yes supabase/);
  assert.match(script, /nightly_worker_lock_not_acquired/);
  assert.match(script, /pg_try_advisory_lock\(hashtext/);
  assert.match(script, /pg_advisory_unlock\(hashtext/);
});

test("MEE nightly droplet worker includes the full internal MEE phase chain", () => {
  const script = read(workerPath);

  for (const phrase of [
    "preflight_fast_readback",
    "listing_ingest",
    "lifecycle_projection_drain",
    "quality_scoring_readback",
    "quality_gate_action_plan",
    "quality_gate_action_preflight",
    "quality_gate_action_apply",
    "quality_gate_action_readback",
    "final_fast_readback",
    "foundation_checkpoint",
    "market_listing_nightly_ingest_run_v1.mjs",
    "market_evidence_lifecycle_remaining_drain_v1.mjs",
    "market_evidence_quality_scoring_read_model_v1.mjs",
    "market_evidence_quality_gate_remaining_candidate_actions_v1.mjs",
    "mee_core_quality_gate_remaining_candidate_actions_v1_apply_candidate.sql",
  ]) {
    assert.match(script, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("MEE nightly droplet worker keeps public pricing boundaries sealed", () => {
  const script = read(workerPath);
  const contract = read(contractPath);

  for (const content of [script, contract]) {
    assert.match(content, /pricing_observations/i);
    assert.match(content, /ebay_active_prices_latest/i);
    assert.match(content, /public_pricing/i);
    assert.match(content, /app_visible/i);
    assert.match(content, /identity/i);
    assert.match(content, /vault/i);
    assert.match(content, /image/i);
  }

  assert.match(script, /pricing_observations_writes:\s*false/);
  assert.match(script, /ebay_active_prices_latest_writes:\s*false/);
  assert.match(script, /public_pricing_views:\s*false/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.match(script, /public_price_rollups:\s*false/);
  assert.match(script, /identity_table_writes:\s*false/);
  assert.match(script, /vault_writes:\s*false/);
  assert.match(script, /image_storage_writes:\s*false/);
  assert.match(script, /migrations:\s*false/);
  assert.match(script, /global_apply:\s*false/);
});

test("MEE nightly droplet deployment templates schedule the worker at 3am window", () => {
  const service = read(servicePath);
  const timer = read(timerPath);
  const cron = read(cronPath);
  const env = read(envPath);
  const installer = read(installerPath);
  const verifier = read(verifierPath);
  const pkg = JSON.parse(read("package.json"));

  assert.match(service, /User=grookai/);
  assert.match(service, /WorkingDirectory=\/opt\/grookai_vault_mee_nightly/);
  assert.match(service, /EnvironmentFile=\/etc\/grookai\/mee-nightly\.env/);
  assert.match(service, /Environment=MEE_NIGHTLY_REQUIRE_DIRECT_DB=1/);
  assert.match(service, /\/usr\/bin\/flock -n \/tmp\/grookai-mee-nightly\.lock/);
  assert.match(service, /mee_nightly_droplet_worker_v1\.mjs --run/);
  assert.match(service, /\$\$\{MEE_NIGHTLY_CALL_CEILING:-4000\}/);
  assert.match(timer, /OnCalendar=\*-\*-\* 03:15:00/);
  assert.match(timer, /RandomizedDelaySec=900/);
  assert.match(cron, /15 3 \* \* \*/);
  assert.match(env, /MEE_NIGHTLY_ALLOW_RUN=1/);
  assert.match(env, /MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=0/);
  assert.match(env, /MEE_NIGHTLY_NORMALIZATION_ONLY=0/);
  assert.match(env, /MEE_NIGHTLY_MAX_CALL_CEILING=4000/);
  assert.match(env, /SUPABASE_DB_URL=/);
  assert.match(env, /EBAY_CLIENT_ID/);
  assert.match(env, /EBAY_CLIENT_SECRET/);
  assert.match(installer, /set -euo pipefail/);
  assert.match(installer, /REPO_DIR="\$\{REPO_DIR:-\/opt\/grookai_vault_mee_nightly\}"/);
  assert.match(installer, /require_env_value "SUPABASE_URL"/);
  assert.match(installer, /require_env_value "SUPABASE_DB_URL"/);
  assert.match(installer, /env_value SUPABASE_SECRET_KEY/);
  assert.match(installer, /env_value EBAY_CLIENT_ID/);
  assert.match(installer, /source "\$\{ENV_FILE\}"/);
  assert.match(
    installer,
    /node scripts\/workers\/mee_nightly_droplet_worker_v1\.mjs --dry-run --skip-provider --skip-apply/,
  );
  assert.match(installer, /sed "s#\^WorkingDirectory=\.\*#WorkingDirectory=\$\{REPO_DIR\}#"/);
  assert.match(installer, /grookai-justtcg-refresh\.timer/);
  assert.match(installer, /grookai-mee-post-ingest\.timer/);
  assert.match(installer, /systemctl enable --now "\$\{TIMER_NAME\}"/);
  assert.match(installer, /MEE_NIGHTLY_ALLOW_RUN=1/);
  assert.match(verifier, /journalctl -u "\$\{SERVICE_NAME\}"/);
  assert.match(verifier, /mee_nightly_droplet_worker_v1_\*\.json/);
  assert.equal(pkg.scripts["mee:nightly:droplet:dry-run"], "node scripts/workers/mee_nightly_droplet_worker_v1.mjs --dry-run");
  assert.equal(pkg.scripts["mee:nightly:droplet:run"], "node scripts/workers/mee_nightly_droplet_worker_v1.mjs --run");
});
