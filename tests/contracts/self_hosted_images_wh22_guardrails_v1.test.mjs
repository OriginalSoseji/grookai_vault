import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ALLOWED_APPLY_COLUMNS,
  POINTER_MUTATION_CONTRACT,
  assetDefinitions,
  rowDefinitions,
} from "../../scripts/audits/self_hosted_images_wh22_common.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("WH22 has an explicit 24-row governed scope and 21 unique high-quality assets", () => {
  const assets = assetDefinitions();
  const rows = rowDefinitions();

  assert.equal(rows.length, 24);
  assert.equal(assets.length, 21);
  assert.equal(new Set(assets.map((asset) => asset.asset_id)).size, 21);
  assert.equal(new Set(assets.map((asset) => asset.target_storage_path)).size, 21);
  assert.equal(assets.filter((asset) => asset.initial_storage_disposition === "new_upload").length, 19);
  assert.equal(assets.filter((asset) => asset.initial_storage_disposition === "reuse_existing_first_party").length, 2);
  assert.ok(rows.every((row) => !row.gv_id.startsWith("GV-TCGP-") && !row.gv_id.includes("E7TEST")));
  assert.ok(assets.every((asset) => asset.expected.width >= 600 && asset.expected.height >= 825));
  assert.ok(assets.every((asset) => /^[a-f0-9]{64}$/.test(asset.expected.sha256)));
});

test("WH22 representative rows intentionally share only their verified base assets", () => {
  const assets = new Map(assetDefinitions().map((asset) => [asset.asset_id, asset]));
  const rows = rowDefinitions();
  const representatives = rows.filter((row) => row.image_claim_role === "representative_shared_stamp");

  assert.equal(representatives.length, 3);
  for (const representative of representatives) {
    const asset = assets.get(representative.asset_id);
    assert.ok(asset);
    assert.ok(rows.some((row) => row.gv_id === asset.owner_gv_id && row.asset_id === representative.asset_id));
  }
});

test("WH22 proposed values are role- and state-minimal", () => {
  const rows = rowDefinitions();
  for (const row of rows) {
    if (row.image_claim_role === "representative_shared_stamp") {
      assert.equal(row.expected_current_image_status, row.proposed_image_status);
      continue;
    }
    if (["GV-PK-AQ-H27", "GV-PK-AQ-H29"].includes(row.gv_id)) {
      assert.equal(row.expected_current_image_status, "exact");
      assert.equal(row.proposed_image_status, "exact");
      continue;
    }
    assert.equal(row.expected_current_image_status, "missing");
    assert.equal(row.proposed_image_status, "exact");
  }
});

test("WH22 mutation contract has the smallest role-aware hosted/fallback column union", () => {
  assert.deepEqual(ALLOWED_APPLY_COLUMNS, [
    "image_source",
    "image_path",
    "image_status",
    "image_url",
    "representative_image_url",
  ]);
  assert.equal(POINTER_MUTATION_CONTRACT.atomicity, "single_24_row_transaction");
  assert.equal(POINTER_MUTATION_CONTRACT.failure_recovery, "database_transaction_rollback");
  assert.ok(!ALLOWED_APPLY_COLUMNS.includes("image_note"));
  assert.ok(!ALLOWED_APPLY_COLUMNS.includes("image_alt_url"));
});

test("WH22 apply scripts require explicit approval and prohibit storage overwrite", () => {
  const storageApply = source("scripts/audits/self_hosted_images_wh22b_residual_governed_storage_upload_apply.mjs");
  const pointerApply = source("scripts/audits/self_hosted_images_wh22d_residual_governed_db_pointer_apply.mjs");

  assert.match(storageApply, /if \(arg === '--apply'\) args\.apply = true/);
  assert.match(storageApply, /args\.fingerprint !== plan\.fingerprint/);
  assert.match(storageApply, /args\.planHash !== plan\.storage_plan_hash/);
  assert.match(storageApply, /upsert: false/);
  assert.match(storageApply, /downloadStorageImage/);

  assert.match(pointerApply, /if \(arg === '--apply'\) args\.apply = true/);
  assert.match(pointerApply, /args\.fingerprint !== plan\.fingerprint/);
  assert.match(pointerApply, /args\.pointerPlanHash !== plan\.pointer_plan_hash/);
  assert.match(pointerApply, /args\.mutationContractHash !== plan\.mutation_contract_hash/);
  assert.match(pointerApply, /await client\.query\('begin'\)/);
  assert.match(pointerApply, /for update/);
  assert.match(pointerApply, /await client\.query\('rollback'\)/);
  assert.match(pointerApply, /to_jsonb\(cp\) = \$\$\{beforeParam\}::jsonb/);
  assert.match(pointerApply, /Post-apply full readback mismatch/);
  assert.match(pointerApply, /connectVerifiedDbClient/);
});

test("WH22 database TLS bootstrap is pinned before credentials are used", () => {
  const common = source("scripts/audits/self_hosted_images_wh22_common.mjs");
  assert.match(common, /807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa/);
  assert.match(common, /303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea/);
  assert.match(common, /Supabase Root 2021 CA/);
  assert.match(common, /leaf\?\.subject_cn !== descriptor\.host/);
  assert.match(common, /assertPinnedSupabaseTlsChain\(chain, descriptor\)/);
  assert.match(common, /rejectUnauthorized: true/);
});
