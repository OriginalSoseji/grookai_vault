import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  evaluateStoreReleaseReadinessV1,
  readPngDimensions,
} from "../../scripts/audits/store_release_readiness_v1.mjs";

test("cross-store metadata preserves package, privacy, support, deletion, and review access contracts", () => {
  const google = JSON.parse(
    fs.readFileSync("docs/release/google_play_android_1_0.json", "utf8"),
  );
  const safety = fs.readFileSync(
    "docs/release/google_play_data_safety_android_1_0.md",
    "utf8",
  );

  assert.equal(google.package_name, "com.grookai.vault");
  assert.equal(google.store_listing.privacy_policy_url, "https://grookaivault.com/privacy");
  assert.equal(google.store_listing.support_url, "https://grookaivault.com/support");
  assert.equal(
    google.store_listing.account_deletion_url,
    "https://grookaivault.com/account/delete",
  );
  assert.equal(google.app_access.restricted_features, true);
  assert.equal(google.content.contains_ads, false);
  assert.match(safety, /encrypted in transit/i);
  assert.match(safety, /request deletion/i);
});

test("store readiness reports external and asset blockers without invalidating valid repository metadata", async () => {
  const result = await evaluateStoreReleaseReadinessV1();

  assert.equal(result.repository_contract_valid, true);
  assert.equal(result.release_submission_ready, false);
  assert.equal(result.status, "EXTERNAL_OR_ASSET_BLOCKED");
  assert.ok(result.missing_assets.length >= 1);
  assert.ok(
    result.missing_assets.includes(
      "artifacts/app_store/screenshots/prepared/ipad_pro_129_01_search.png",
    ),
  );
  assert.deepEqual(result.invalid_asset_dimensions, []);
  assert.ok(result.blockers.includes("apple_console_not_verified"));
  assert.ok(result.blockers.includes("google_play_developer_account_unavailable"));
  assert.deepEqual(result.findings, []);
});

test("store media audit reads PNG dimensions from the file header", async () => {
  assert.deepEqual(await readPngDimensions("apps/web/public/grookai-logo-512.png"), {
    width: 512,
    height: 512,
  });
});
