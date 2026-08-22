import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  MTG_SIGNED_IN_EXPECTED_COUNTS_V1,
  MTG_SIGNED_IN_MINIMUM_MOBILE_BUILD_V1,
  evaluateMtgSignedInReleasePlanV1,
  evaluateMtgSignedInReleaseReadbackV1,
} from "../../backend/pricing/mtg_signed_in_catalog_release_v1.mjs";

const counts = {
  ...MTG_SIGNED_IN_EXPECTED_COUNTS_V1,
  current_pricing_rows: 500,
};
const deployment = {
  web: { production_status: "ready", commit_sha: "a".repeat(40) },
  android: {
    artifact_status: "signed",
    artifact_sha256: "b".repeat(64),
    commit_sha: "a".repeat(40),
    version_code: "300",
  },
  ios: {
    distribution_status: "in_beta_testing",
    commit_sha: "a".repeat(40),
    build_number: "300",
  },
};

test("release requires exact complete catalog, pricing, and client proof", () => {
  assert.equal(MTG_SIGNED_IN_MINIMUM_MOBILE_BUILD_V1, 298);
  const ready = evaluateMtgSignedInReleasePlanV1({
    before: { release_control: { release_status: "hidden" }, counts },
    deployment,
  });
  assert.equal(ready.ready_for_apply, true);

  assert.equal(
    evaluateMtgSignedInReleasePlanV1({
      before: { release_control: { release_status: "hidden" }, counts },
      deployment: {
        ...deployment,
        ios: { ...deployment.ios, build_number: "299" },
      },
    }).ready_for_apply,
    false,
  );

  for (const field of Object.keys(MTG_SIGNED_IN_EXPECTED_COUNTS_V1)) {
    const brokenCounts = { ...counts, [field]: 0 };
    assert.equal(
      evaluateMtgSignedInReleasePlanV1({
        before: {
          release_control: { release_status: "hidden" },
          counts: brokenCounts,
        },
        deployment,
      }).ready_for_apply,
      false,
    );
  }
});

test("readback requires anonymous denial and authenticated catalog, faces, search, and pricing", () => {
  const input = {
    before: {
      release_control: { release_status: "hidden" },
      counts,
      catalog_fingerprint: "mtg",
      non_mtg_fingerprint: "other",
    },
    after: {
      release_control: {
        release_status: "signed_in",
        evidence: { activation_plan_fingerprint_sha256: "plan" },
      },
      counts,
      catalog_fingerprint: "mtg",
      non_mtg_fingerprint: "other",
    },
    anonymous: {
      counts: { games: 0, sets: 0, card_prints: 0, image_faces: 0 },
    },
    authenticated: {
      counts: {
        ...counts,
        direct_card_matches: 1,
        direct_face_matches: 1,
        search_matches: 1,
        pricing_rows: 1,
      },
    },
    updatedRows: 1,
    activationPlanFingerprint: "plan",
  };
  assert.equal(
    evaluateMtgSignedInReleaseReadbackV1(input).release_active,
    true,
  );
  input.anonymous.counts.card_prints = 1;
  assert.equal(
    evaluateMtgSignedInReleaseReadbackV1(input).release_active,
    false,
  );
});

test("release runner is restricted to one release-control update and automatic restoration", () => {
  const runner = fs.readFileSync(
    new URL(
      "../../scripts/audits/mtg_signed_in_catalog_release_v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    runner,
    /where game_code = 'mtg' and release_status = 'hidden'/i,
  );
  assert.match(runner, /release_control_updates: 1/);
  assert.match(runner, /restoreReleaseControl/);
  assert.doesNotMatch(runner, /insert\s+into/i);
  assert.doesNotMatch(runner, /delete\s+from/i);
  assert.doesNotMatch(
    runner,
    /update\s+public\.(?!catalog_game_release_controls)/i,
  );

  const workflow = fs.readFileSync(
    new URL(
      "../../.github/workflows/mtg-signed-in-catalog-release.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(workflow, /android_version_code:/);
  assert.match(workflow, /ios_build_number:/);
  assert.match(workflow, /inputs\.android_version_code/);
  assert.match(workflow, /inputs\.ios_build_number/);
  assert.doesNotMatch(workflow, /version-code=298|build-number=298/);
});

test("anonymous release readback never invokes authenticated-only image surfaces", () => {
  const runner = fs.readFileSync(
    new URL(
      "../../scripts/audits/mtg_signed_in_catalog_release_v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  const start = runner.indexOf("async function captureRoleVisibility");
  const end = runner.indexOf("\nasync function ", start + 1);
  const captureRoleVisibility = runner.slice(start, end);
  const authenticatedBranch = captureRoleVisibility.indexOf(
    'if (role === "authenticated")',
  );

  assert.ok(start >= 0, "captureRoleVisibility must exist");
  assert.ok(authenticatedBranch >= 0, "authenticated readback branch must exist");
  assert.ok(
    captureRoleVisibility.indexOf("from public.card_print_image_faces") >
      authenticatedBranch,
    "the private image-face table must only be read as authenticated",
  );
  assert.ok(
    captureRoleVisibility.indexOf(
      "from public.get_card_print_image_faces_v1",
    ) > authenticatedBranch,
    "the private image-face RPC must only be invoked as authenticated",
  );
});
