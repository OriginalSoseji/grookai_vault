import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  evaluateProductionSameCandidateClientGateV1,
  PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1,
  REQUIRED_CLIENT_JOURNEYS_V1,
} from "../../scripts/audits/production_same_candidate_client_gate_v1.mjs";

const SOURCE_SHA = "a".repeat(40);

function passingManifest() {
  const checks = Object.fromEntries(
    REQUIRED_CLIENT_JOURNEYS_V1.map((journey) => [journey, "passed"]),
  );
  const artifact = (platform) => ({
    source_commit_sha: SOURCE_SHA,
    build_id: `${platform}-build-1`,
    built_at: "2026-08-24T01:00:00.000Z",
    ...(platform === "web"
      ? { deployment_url: "https://grookaivault.com" }
      : { binary_sha256: "b".repeat(64) }),
  });
  const journey = () => ({
    source_commit_sha: SOURCE_SHA,
    observed_at: "2026-08-24T02:00:00.000Z",
    database_reconciliation: "passed",
    checks: { ...checks },
    evidence_paths: ["evidence.json"],
  });
  return {
    schema_version: PRODUCTION_SAME_CANDIDATE_CLIENT_GATE_V1,
    candidate: {
      source_commit_sha: SOURCE_SHA,
      frozen_at: "2026-08-24T00:00:00.000Z",
    },
    artifacts: {
      web: artifact("web"),
      android: artifact("android"),
      ios: artifact("ios"),
    },
    journeys: {
      web: journey(),
      android: journey(),
      ios: journey(),
    },
    boundaries: {
      production_database_writes: false,
      public_rollout: false,
    },
  };
}

test("one source commit with complete cross-platform journeys passes", async () => {
  const result = await evaluateProductionSameCandidateClientGateV1(
    passingManifest(),
    { verifyEvidencePaths: false },
  );
  assert.equal(result.gate_passed, true);
  assert.deepEqual(result.findings, []);
});

test("a platform built from another commit fails closed", async () => {
  const manifest = passingManifest();
  manifest.artifacts.ios.source_commit_sha = "c".repeat(40);
  const result = await evaluateProductionSameCandidateClientGateV1(manifest, {
    verifyEvidencePaths: false,
  });
  assert.equal(result.gate_passed, false);
  assert.ok(result.findings.includes("ios_source_commit_mismatch"));
});

test("a missing client journey fails closed", async () => {
  const manifest = passingManifest();
  manifest.journeys.android.checks.pricing = "not_run";
  const result = await evaluateProductionSameCandidateClientGateV1(manifest, {
    verifyEvidencePaths: false,
  });
  assert.ok(result.findings.includes("android_pricing_not_passed"));
});

test("stale evidence and unreconciled mutations fail closed", async () => {
  const manifest = passingManifest();
  manifest.journeys.web.observed_at = "2026-08-23T23:59:00.000Z";
  manifest.journeys.web.database_reconciliation = "failed";
  const result = await evaluateProductionSameCandidateClientGateV1(manifest, {
    verifyEvidencePaths: false,
  });
  assert.ok(result.findings.includes("web_journey_predates_candidate"));
  assert.ok(
    result.findings.includes("web_database_reconciliation_not_passed"),
  );
});

test("missing evidence files fail when path verification is enabled", async () => {
  const result = await evaluateProductionSameCandidateClientGateV1(
    passingManifest(),
    { repoRoot: process.cwd(), verifyEvidencePaths: true },
  );
  assert.equal(result.gate_passed, false);
  assert.ok(result.findings.includes("evidence_paths_missing"));
  assert.equal(result.missing_evidence_paths.length, 3);
});

test("governed mobile builds embed their immutable source commit", async () => {
  const [androidApk, androidRelease, iosCloud, buildIdentity, crashReporting] =
    await Promise.all([
      fs.readFile(".github/workflows/flutter-build-apk.yml", "utf8"),
      fs.readFile(".github/workflows/release.yml", "utf8"),
      fs.readFile("ios/ci_scripts/ci_post_clone.sh", "utf8"),
      fs.readFile(
        "lib/services/diagnostics/app_build_identity.dart",
        "utf8",
      ),
      fs.readFile(
        "lib/services/diagnostics/grookai_crash_reporting_service.dart",
        "utf8",
      ),
    ]);

  for (const workflow of [androidApk, androidRelease]) {
    assert.match(workflow, /GROOKAI_SOURCE_COMMIT_SHA="\$GITHUB_SHA"/);
    assert.match(workflow, /GROOKAI_BUILD_RUN_ID="\$GITHUB_RUN_ID"/);
  }
  assert.match(iosCloud, /CI_COMMIT:\?CI_COMMIT is required/);
  assert.match(iosCloud, /GROOKAI_SOURCE_COMMIT_SHA=\$\{CI_COMMIT\}/);
  assert.match(buildIdentity, /String\.fromEnvironment/);
  assert.match(crashReporting, /grookai_source_commit_sha/);
  assert.match(crashReporting, /grookai_build_run_id/);
});
