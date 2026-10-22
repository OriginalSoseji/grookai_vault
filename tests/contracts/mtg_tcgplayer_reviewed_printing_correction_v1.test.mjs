import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildPlan,
  SCOPE,
  VERSION,
} from "../../scripts/audits/mtg_tcgplayer_reviewed_printing_correction_v1.mjs";

const migration = fs.readFileSync(new URL(
  "../../supabase/migrations/20261020220000_mtg_reviewed_printing_correction_bridge_v1.sql",
  import.meta.url,
), "utf8");
const publicationWorker = fs.readFileSync(new URL(
  "../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs",
  import.meta.url,
), "utf8");
const correctionWorker = fs.readFileSync(new URL(
  "../../scripts/audits/mtg_tcgplayer_reviewed_printing_correction_v1.mjs",
  import.meta.url,
), "utf8");
const workflow = fs.readFileSync(new URL(
  "../../.github/workflows/mtg-pricing-publication-runner.yml",
  import.meta.url,
), "utf8");

function scopeFixture({ corrected = false } = {}) {
  return {
    source: {
      source_sync_run_id: "ca5a216e-cd09-42dd-937a-efaec4243dc9",
      source_observation_id: "97a1cb06-76ad-42c9-826f-0f2e169e206f",
    },
    parent_mapping: {
      card_print_id: corrected ? SCOPE.target_parent_id : SCOPE.source_parent_id,
      meta: corrected ? { contract_version: VERSION } : {},
    },
    printing_mapping: {
      card_printing_id: corrected ? SCOPE.target_printing_id : SCOPE.source_printing_id,
      meta: corrected ? { contract_version: VERSION } : {},
    },
  };
}

test("reviewed correction plan binds the exact stale and target identities", () => {
  const plan = buildPlan(scopeFixture(), { commit_sha: "a".repeat(40), branch: "test" });
  assert.equal(plan.source_product_id, 269823);
  assert.equal(plan.prior_parent_id, SCOPE.source_parent_id);
  assert.equal(plan.target_parent_id, SCOPE.target_parent_id);
  assert.equal(plan.prior_printing_id, SCOPE.source_printing_id);
  assert.equal(plan.target_printing_id, SCOPE.target_printing_id);
  assert.equal(plan.selected_parent_updates, 1);
  assert.equal(plan.selected_printing_updates, 1);
  assert.equal(plan.selected_update_count, 2);
  assert.match(plan.required_approval, new RegExp(`^APPROVE_${VERSION}:[a-f0-9]{64}$`));
});

test("reviewed correction is replay-safe after both rows are exact", () => {
  const plan = buildPlan(scopeFixture({ corrected: true }), {
    commit_sha: "b".repeat(40), branch: "test",
  });
  assert.equal(plan.selected_update_count, 0);
});

test("V7 override requires the reviewed correction contract and keeps exact lineage", () => {
  assert.match(migration, /create or replace view public\.v_tcgplayer_market_qualification_candidates_v7/);
  assert.match(migration, /MTG_REVIEWED_PRINTING_CORRECTION_V1/);
  assert.match(migration, /reviewed_tcgplayer_printing_correction_v1/);
  assert.match(migration, /source_product_id'\s*=\s*candidate\.source_product_id::text/);
  assert.match(migration, /normalized_finish'\s*=\s*candidate\.normalized_finish_key/);
  assert.match(migration, /case when exact\.id is not null then null else candidate\.source_mapping_id/);
  assert.match(migration, /case when exact\.id is not null then null else candidate\.variant_assignment_id/);
  assert.match(publicationWorker, /v_tcgplayer_market_qualification_candidates_v7/);
  assert.match(publicationWorker, /TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_20/);
});

test("bounded writer updates only the two reviewed mapping rows", () => {
  assert.match(correctionWorker, /where id=\$3 and source='tcgplayer' and external_id=\$4 and active/);
  assert.match(correctionWorker, /where id=\$3::uuid and source='tcgplayer_market' and external_id=\$4 and active/);
  assert.match(correctionWorker, /begin isolation level serializable/);
  assert.match(correctionWorker, /pg_advisory_xact_lock/);
  assert.match(correctionWorker, /--schema-rehearsal/);
  assert.match(correctionWorker, /reviewed correction migration transaction wrapper drift/);
  assert.match(correctionWorker, /Exact \$\{APPROVAL_ENV\} acknowledgement is required/);
  assert.doesNotMatch(correctionWorker, /delete\s+from|truncate\s+/i);
});

test("workflow installs dependencies before testing and binds apply to rollback proof", () => {
  assert.match(
    workflow,
    /SUPABASE_URL: https:\/\/ycdxbpibncqcchqiihfz\.supabase\.co/,
  );
  assert.ok(
    workflow.indexOf("name: Install operator dependencies") <
      workflow.indexOf("name: Verify frozen repository boundary"),
  );
  assert.match(workflow, /expected_correction_dry_run_id:/);
  assert.match(workflow, /gh run download "\$EXPECTED_CORRECTION_DRY_RUN_ID"/);
  assert.match(workflow, /proof\.status !== 'rollback_verified'/);
  assert.match(workflow, /proof\.plan\?\.plan_fingerprint !== current\.plan\?\.plan_fingerprint/);
  assert.match(workflow, /proof\.plan\?\.selected_update_count !== 2/);
  assert.match(workflow, /\n {10}NODE\n {14}export MTG_REVIEWED_PRINTING_CORRECTION_APPROVAL=/);
  assert.doesNotMatch(workflow, /\n {14}NODE\n {14}export MTG_REVIEWED_PRINTING_CORRECTION_APPROVAL=/);
});
