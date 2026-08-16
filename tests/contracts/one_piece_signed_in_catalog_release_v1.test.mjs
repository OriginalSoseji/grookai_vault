import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  evaluateOnePieceSignedInCatalogReleasePlanV1,
  evaluateOnePieceSignedInCatalogReleaseReadbackV1,
  ONE_PIECE_SIGNED_IN_MOBILE_BUILD_V1,
} from "../../backend/pricing/one_piece_signed_in_catalog_release_v1.mjs";
import { ONE_PIECE_EXPECTED_COUNTS_V1 } from "../../backend/pricing/one_piece_signed_in_catalog_readiness_v1.mjs";

const counts = Object.fromEntries(
  Object.entries(ONE_PIECE_EXPECTED_COUNTS_V1).filter(([field]) => field !== "active_sealed_release_members"),
);

function deployment() {
  return {
    web: { production_status: "ready", commit_sha: "a".repeat(40) },
    android: {
      artifact_status: "signed",
      artifact_sha256: "b".repeat(64),
      commit_sha: "a".repeat(40),
      version_code: "297",
    },
    ios: {
      distribution_status: "in_beta_testing",
      build_number: "297",
      commit_sha: "a".repeat(40),
    },
  };
}

test("release plan requires all three exact deployed client proofs", () => {
  assert.equal(ONE_PIECE_SIGNED_IN_MOBILE_BUILD_V1, "297");
  const ready = evaluateOnePieceSignedInCatalogReleasePlanV1({
    before: { release_control: { release_status: "hidden" }, counts },
    deployment: deployment(),
  });
  assert.equal(ready.ready_for_apply, true);

  for (const platform of ["web", "android", "ios"]) {
    const broken = deployment();
    broken[platform] = {};
    assert.equal(
      evaluateOnePieceSignedInCatalogReleasePlanV1({
        before: { release_control: { release_status: "hidden" }, counts },
        deployment: broken,
      }).ready_for_apply,
      false,
    );
  }

  for (const buildNumber of ["289", "290", "291", "292", "999"]) {
    const stale = deployment();
    stale.android.version_code = buildNumber;
    stale.ios.build_number = buildNumber;
    assert.equal(
      evaluateOnePieceSignedInCatalogReleasePlanV1({
        before: { release_control: { release_status: "hidden" }, counts },
        deployment: stale,
      }).ready_for_apply,
      false,
    );
  }
});

test("release readback proves one-row mutation and catalog immutability", () => {
  const input = {
    before: {
      release_control: { release_status: "hidden" },
      counts,
      catalog_fingerprint: "one-piece",
      non_one_piece_fingerprint: "other",
    },
    after: {
      release_control: {
        release_status: "signed_in",
        evidence: { activation_plan_fingerprint_sha256: "plan" },
      },
      counts,
      catalog_fingerprint: "one-piece",
      non_one_piece_fingerprint: "other",
    },
    anonymous: { counts: { games: 0, sets: 0, card_prints: 0 } },
    authenticated: {
      counts: {
        ...counts,
        direct_card_matches: 1,
        legacy_search_matches: 1,
        sealed_pricing_rows: 100,
      },
    },
    privileges: {
      active_sealed_release_members: 332,
      anonymous_sealed_rpc_execute: false,
    },
    updatedRows: 1,
    activationPlanFingerprint: "plan",
  };
  assert.equal(evaluateOnePieceSignedInCatalogReleaseReadbackV1(input).release_active, true);
  input.after.catalog_fingerprint = "changed";
  assert.equal(evaluateOnePieceSignedInCatalogReleaseReadbackV1(input).release_active, false);
});

test("durable runner is restricted to the single release-control row", () => {
  const runner = fs.readFileSync(
    new URL("../../scripts/audits/one_piece_signed_in_catalog_release_v1.mjs", import.meta.url),
    "utf8",
  );
  const policy = fs.readFileSync(
    new URL("../../backend/pricing/one_piece_signed_in_catalog_release_v1.mjs", import.meta.url),
    "utf8",
  );
  const source = `${runner}\n${policy}`;
  assert.match(source, /where game_code = 'one_piece' and release_status = 'hidden'/i);
  assert.match(source, /release_status = 'signed_in'/i);
  assert.match(source, /activation_plan_fingerprint_sha256/i);
  assert.match(source, /testflight_build_not_ready/);
  assert.match(source, /deployment_commit_mismatch/);
  assert.match(runner, /release_control_updates: 1/);
  assert.doesNotMatch(runner, /release_control_updates: args\.mode/);
  assert.match(runner, /if \(committed\) \{[\s\S]*restoreReleaseControl/);
  assert.doesNotMatch(source, /insert\s+into/i);
  assert.doesNotMatch(source, /delete\s+from/i);
  assert.doesNotMatch(source, /update\s+public\.(?!catalog_game_release_controls)/i);
});
