import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ACQUISITION_FILES = [
  "scripts/audits/gv_id_public_coverage_audit_v1.mjs",
  "scripts/audits/image_truth_trainer_kit_mcd_404_pass_v1.mjs",
  "scripts/audits/image_truth_v1_img20a_trainer_kit_malie_fallback_audit.mjs",
  "scripts/audits/image_truth_v1_img20b_trainer_kit_residual_tcgcollector_audit.mjs",
  "scripts/audits/jpn_pikachu_promo_end_to_end_apply_v1.mjs",
  "scripts/audits/jpn_pikachu_promo_gap_audit_v1.mjs",
  "scripts/audits/self_hosted_images_wh05a_trainer_kit_runtime_upload_dry_run.mjs",
  "scripts/audits/self_hosted_images_wh06a_mcdonalds_runtime_upload_dry_run.mjs",
  "scripts/audits/self_hosted_images_wh06b_mcdonalds_dextcg_upload_dry_run.mjs",
  "scripts/audits/self_hosted_images_wh06c_mcdonalds_dextcg_storage_upload_apply.mjs",
  "scripts/audits/self_hosted_images_wh10c_pokemontcg_residual_parent_source_storage_upload_apply.mjs",
  "scripts/audits/self_hosted_images_wh11a_residual_parent_source_upload_dry_run.mjs",
  "scripts/audits/self_hosted_images_wh11b_residual_parent_source_storage_upload_apply.mjs",
  "scripts/audits/self_hosted_images_wh12a_mfb_parent_source_upload_dry_run.mjs",
  "scripts/audits/self_hosted_images_wh12b_mfb_parent_source_storage_upload_apply.mjs",
  "scripts/audits/self_hosted_images_wh16a_ex55_tcgcollector_upload_dry_run.mjs",
  "scripts/audits/self_hosted_images_wh16b_ex55_tcgcollector_storage_upload_apply.mjs",
  "scripts/audits/tcgplayer_market_canary_image_repair_v1.mjs",
  "scripts/audits/tcgplayer_market_canary_verify_v1.mjs",
  "scripts/ingest/new_set_release_ingest_v1.mjs",
];

test("audit HTTPS acquisition never disables certificate validation", () => {
  for (const file of ACQUISITION_FILES) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']0["']/, file);
    assert.doesNotMatch(
      source,
      /new\s+https\.Agent\(\{\s*rejectUnauthorized:\s*false/,
      file,
    );

    for (const match of source.matchAll(/rejectUnauthorized:\s*false/g)) {
      const context = source.slice(Math.max(0, match.index - 220), match.index + 80);
      assert.match(context, /(?:new\s+Client|function\s+sslConfig)/, file);
    }
  }
});

test("pinned PostgreSQL bootstrap verifies the peer before chain inspection", () => {
  const source = readFileSync("scripts/audits/self_hosted_images_wh22_common.mjs", "utf8");
  assert.doesNotMatch(source, /rejectUnauthorized:\s*false/);
  assert.match(source, /verified_no_credentials_then_pinned_ca_reconnect/);
  assert.match(source, /assertPinnedSupabaseTlsChain\(chain, descriptor\)/);
});
