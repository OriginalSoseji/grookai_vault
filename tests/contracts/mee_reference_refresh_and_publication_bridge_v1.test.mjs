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

  assert.match(service, /market_evidence_engine_query_plan_v1\.mjs/);
  assert.match(service, /market_evidence_engine_acquisition_batch_v1\.mjs/);
  assert.match(service, /mee_reference_source_refresh_worker_v1\.mjs --run/);
  assert.match(service, /market_evidence_engine_normalized_reference_v1\.mjs/);
  assert.match(service, /mee_reference_warehouse_delta_writer_v1\.mjs --run/);
  assert.match(service, /--sources=pokemontcg_io_reference,tcgcsv_reference/);
  assert.doesNotMatch(service, /--sources=.*tcgdex_tcgplayer_reference/);
  assert.doesNotMatch(service, /market_listing_nightly_ingest_run_v1/);
  assert.match(timer, /OnCalendar=\*-\*-\* 02:45:00/);
  assert.match(install, /MEE_REFERENCE_REFRESH_ALLOW_RUN/);
  assert.match(install, /MEE_REFERENCE_REFRESH_ALLOW_PROVIDER_CALLS/);
  assert.match(install, /MEE_REFERENCE_REFRESH_ALLOW_INTERNAL_WRITES"\s+"0"/);
  assert.match(install, /MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN"\s+"1"/);
  assert.match(install, /market_evidence_engine_query_plan_v1\.mjs/);
  assert.match(install, /market_evidence_engine_acquisition_batch_v1\.mjs/);
  assert.match(install, /market_evidence_engine_normalized_reference_v1\.mjs/);
  assert.match(install, /mee_reference_warehouse_delta_writer_v1\.mjs --dry-run/);
  assert.match(verify, /journalctl -u "\$\{SERVICE_NAME\}"/);
  assert.match(verify, /mee_reference_warehouse_delta_writer_v1_/);
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
