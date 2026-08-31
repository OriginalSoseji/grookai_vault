import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("MEE reference refresh systemd timer is separate from eBay and post-ingest", () => {
  const service = read("deploy/systemd/grookai-mee-reference-refresh.service.candidate");
  const timer = read("deploy/systemd/grookai-mee-reference-refresh.timer.candidate");
  const install = read("deploy/scripts/install-mee-reference-refresh-systemd.sh");
  const verify = read("deploy/scripts/verify-mee-reference-refresh-systemd.sh");

  assert.match(service, /WorkingDirectory=\/opt\/grookai_mee_current/);
  assert.match(service, /MEE_RUNTIME_ARTIFACT_ROOT=\/var\/lib\/grookai\/mee\/audits/);
  assert.match(service, /RuntimeDirectory=grookai-mee/);
  assert.match(service, /flock -n \/run\/grookai-mee\/reference-refresh\.lock/);
  assert.match(service, /MemoryHigh=1G/);
  assert.match(service, /MemoryMax=1536M/);
  assert.match(service, /ProtectSystem=full/);
  assert.match(service, /ReadWritePaths=\/var\/lib\/grookai\/mee/);
  assert.doesNotMatch(service, /\/tmp\/grookai-mee-reference-refresh\.lock/);
  assert.match(service, /"\$artifact_root"\/mee_06a_/);
  assert.match(install, /REPO_DIR="\$\{REPO_DIR:-\/opt\/grookai_mee_current\}"/);

  assert.match(service, /market_evidence_engine_query_plan_v1\.mjs/);
  assert.match(service, /reference_limit="\$\{MEE_NIGHTLY_REFERENCE_LIMIT:-5000\}"/);
  assert.match(service, /reference_sources="\$\{MEE_REFERENCE_REFRESH_SOURCES:-pokemontcg_io_reference\}"/);
  assert.match(service, /market_evidence_engine_overnight_worklist_v1\.mjs --limit="\$reference_limit" --out-dir="\$artifact_root"/);
  assert.match(service, /market_evidence_engine_query_plan_v1\.mjs --limit="\$reference_limit" --out-dir="\$artifact_root"/);
  assert.match(service, /market_evidence_engine_acquisition_batch_v1\.mjs/);
  assert.match(service, /market_evidence_engine_acquisition_batch_v1\.mjs --sources="\$reference_sources" --limit="\$reference_limit" --out-dir="\$artifact_root"/);
  assert.match(service, /mee_reference_source_refresh_worker_v1\.mjs --run/);
  assert.match(service, /mee_reference_source_refresh_worker_v1\.mjs --run --sources="\$reference_sources" --limit="\$reference_limit"/);
  assert.match(service, /market_evidence_engine_normalized_reference_v1\.mjs/);
  assert.match(service, /mee_reference_warehouse_delta_writer_v1\.mjs --run/);
  assert.doesNotMatch(service, /--sources=pokemontcg_io_reference,tcgcsv_reference/);
  assert.doesNotMatch(service, /--sources=.*tcgdex_tcgplayer_reference/);
  assert.doesNotMatch(service, /market_listing_nightly_ingest_run_v1/);
  assert.match(timer, /OnCalendar=\*-\*-\* 02:45:00/);
  assert.match(install, /MEE_REFERENCE_REFRESH_ALLOW_RUN/);
  assert.match(install, /MEE_REFERENCE_REFRESH_ALLOW_PROVIDER_CALLS/);
  assert.match(install, /MEE_REFERENCE_REFRESH_ALLOW_INTERNAL_WRITES"\s+"0"/);
  assert.match(install, /MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN"\s+"1"/);
  assert.match(install, /MEE_NIGHTLY_REFERENCE_LIMIT"\s+"5000"/);
  assert.match(install, /MEE_REFERENCE_REFRESH_SOURCES"\s+"pokemontcg_io_reference"/);
  assert.match(install, /export MEE_RUNTIME_ARTIFACT_ROOT="\$\{artifact_root\}"/);
  assert.match(install, /market_evidence_engine_overnight_worklist_v1\.mjs --limit="\$\{reference_limit\}" --out-dir="\$\{artifact_root\}"/);
  assert.match(install, /market_evidence_engine_query_plan_v1\.mjs --limit="\$\{reference_limit\}" --out-dir="\$\{artifact_root\}"/);
  assert.match(install, /market_evidence_engine_acquisition_batch_v1\.mjs --sources="\$\{reference_sources\}" --limit="\$\{reference_limit\}" --out-dir="\$\{artifact_root\}"/);
  assert.match(install, /market_evidence_engine_normalized_reference_v1\.mjs/);
  assert.match(install, /mee_reference_source_refresh_worker_v1\.mjs --dry-run --sources="\$\{reference_sources\}" --limit="\$\{reference_limit\}"/);
  assert.match(install, /mee_reference_warehouse_delta_writer_v1\.mjs --dry-run/);
  assert.match(verify, /journalctl -u "\$\{SERVICE_NAME\}"/);
  assert.match(verify, /mee_reference_warehouse_delta_writer_v1_/);
});

test("MEE reference acquisition adapters share the external runtime artifact root", () => {
  for (const artifact of [
    "scripts/audits/market_evidence_engine_query_plan_v1.mjs",
    "scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs",
    "scripts/audits/market_evidence_engine_pokemontcg_io_reference_acquisition_v1.mjs",
    "scripts/audits/market_evidence_engine_tcgcsv_reference_acquisition_v1.mjs",
  ]) {
    const source = read(artifact);
    assert.match(source, /resolveMeeAuditRootV1/);
    assert.match(source, /DEFAULT_OUT_DIR = resolveMeeAuditRootV1\(REPO_ROOT\)/);
  }

  const tcgcsv = read("scripts/audits/market_evidence_engine_tcgcsv_reference_acquisition_v1.mjs");
  assert.match(tcgcsv, /DEFAULT_CACHE_DIR = path\.join\(DEFAULT_OUT_DIR, 'tcgcsv_reference_cache_v1'\)/);
});

test("every reference refresh stage honors the external runtime artifact root", () => {
  for (const scriptPath of [
    "scripts/audits/market_evidence_engine_query_plan_v1.mjs",
    "scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs",
    "scripts/audits/market_evidence_engine_normalized_reference_v1.mjs",
    "scripts/workers/mee_reference_source_refresh_worker_v1.mjs",
    "scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs",
    "scripts/workers/mee_reference_refresh_phase_ledger_v1.mjs",
  ]) {
    assert.match(read(scriptPath), /resolveMeeAuditRootV1/, scriptPath);
  }
});

test("MEE publication bridge view is internal-only and never public pricing", () => {
  const sql = read("docs/sql/mee_publication_bridge_internal_v1_view.sql");
  const readback = read("docs/sql/mee_publication_bridge_internal_v1_readback.sql");

  assert.match(sql, /v_market_evidence_publication_bridge_candidates_v1/);
  assert.match(sql, /ready_internal_bridge_candidate/);
  assert.match(sql, /median_active_ask as candidate_primary_price/);
  assert.match(sql, /false as can_publish_price_directly/);
  assert.match(sql, /false as publishable/);
  assert.match(sql, /false as app_visible/);
  assert.match(sql, /false as market_truth/);
  assert.match(sql, /grant select on public\.v_market_evidence_publication_bridge_candidates_v1 to service_role/);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.pricing_observations/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.ebay_active_prices_latest/i);
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+view\s+public\.v_card_pricing_ui_v1/i);
  assert.match(readback, /public_boundary_leaks/);
});

test("MEE reference refresh and publication bridge artifacts are present", () => {
  for (const artifact of [
    "deploy/systemd/grookai-mee-reference-refresh.service.candidate",
    "deploy/systemd/grookai-mee-reference-refresh.timer.candidate",
    "deploy/scripts/install-mee-reference-refresh-systemd.sh",
    "deploy/scripts/verify-mee-reference-refresh-systemd.sh",
    "docs/sql/mee_publication_bridge_internal_v1_view.sql",
    "docs/sql/mee_publication_bridge_internal_v1_readback.sql",
  ]) {
    assert.equal(existsSync(new URL(`../../${artifact}`, import.meta.url)), true, artifact);
  }
});
