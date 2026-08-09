import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createReleaseCandidateSoakStateV1,
  evaluateReleaseCandidateSoakV1,
  prerequisiteProjectionDigestV1,
  RELEASE_CANDIDATE_SOAK_STATE_V1,
  RELEASE_CANDIDATE_SOAK_START_AUTHORITY_V1,
} from "../../scripts/audits/release_candidate_soak_v1.mjs";

const candidate = {
  source_commit: "a".repeat(40),
  web_deployment_id: "deployment-1",
  android_apk_sha256: "b".repeat(64),
  ios_ipa_sha256: "c".repeat(64),
};

function manifest({ ready = true } = {}) {
  return {
    final_candidate: {
      source_commit: candidate.source_commit,
      web: { deployment_id: candidate.web_deployment_id },
      android: { apk_sha256: candidate.android_apk_sha256 },
      ios_testflight: { ipa_sha256: candidate.ios_ipa_sha256 },
    },
    gates: [
      { id: "journey_a", status: ready ? "proven" : "partial" },
      { id: "final_72_hour_release_candidate_soak", status: "open" },
    ],
  };
}

function observation(observedAt, overrides = {}) {
  return {
    observed_at: observedAt,
    candidate_identity: candidate,
    runtime_health_ok: true,
    production_web_ok: true,
    data_truth_ok: true,
    privacy_authorization_ok: true,
    unresolved_p0_count: 0,
    launch_blocking_crash_count: 0,
    ...overrides,
  };
}

function soakState(overrides = {}) {
  return {
    ...createReleaseCandidateSoakStateV1({
      manifest: manifest(),
      startedAt: "2026-08-08T00:00:00.000Z",
      startRecordedAt: "2026-08-08T00:00:00.000Z",
      observations: [
        observation("2026-08-08T00:00:00.000Z"),
        observation("2026-08-09T00:00:00.000Z"),
        observation("2026-08-10T00:00:00.000Z"),
        observation("2026-08-11T00:00:00.000Z"),
      ],
    }),
    started_at: "2026-08-08T00:00:00.000Z",
    start_recorded_at: "2026-08-08T00:00:00.000Z",
    ...overrides,
  };
}

test("current manifest remains blocked and does not start a soak", async () => {
  const current = JSON.parse(
    await fs.readFile(
      path.resolve("docs/audits/release_completion_v1/completion_manifest_v1.json"),
      "utf8",
    ),
  );
  const result = evaluateReleaseCandidateSoakV1({ manifest: current });
  assert.equal(result.status, "blocked_prerequisites");
  assert.equal(result.start_allowed, false);
  assert.equal(result.final_report_allowed, false);
  assert.equal(result.soak, null);
  assert.ok(result.prerequisite_gate_ids.length > 0);
});

test("all non-soak gates must be proven before a soak can start", () => {
  const blocked = evaluateReleaseCandidateSoakV1({ manifest: manifest({ ready: false }) });
  assert.equal(blocked.status, "blocked_prerequisites");
  assert.deepEqual(blocked.prerequisite_gate_ids, ["journey_a"]);

  const ready = evaluateReleaseCandidateSoakV1({ manifest: manifest() });
  assert.equal(ready.status, "ready_to_start");
  assert.equal(ready.start_allowed, true);

  assert.throws(
    () =>
      createReleaseCandidateSoakStateV1({
        manifest: manifest({ ready: false }),
      }),
    /soak start is not authorized/,
  );
  const state = createReleaseCandidateSoakStateV1({ manifest: manifest() });
  assert.equal(state.schema_version, RELEASE_CANDIDATE_SOAK_STATE_V1);
  assert.equal(
    state.start_authorization.schema_version,
    RELEASE_CANDIDATE_SOAK_START_AUTHORITY_V1,
  );
  assert.equal(
    state.start_authorization.prerequisite_projection_sha256,
    prerequisiteProjectionDigestV1(
      state.start_authorization.prerequisite_projection,
    ),
  );
});

test("a legacy state created before prerequisites opened cannot become valid later", () => {
  const state = soakState();
  delete state.start_authorization;
  const result = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state,
    asOf: "2026-08-11T00:00:00.000Z",
  });
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("soak_start_authorization_missing"));
});

test("a self-consistent authorization with an unproven start gate fails closed", () => {
  const state = soakState();
  state.start_authorization.prerequisite_projection.gates[0].status = "partial";
  state.start_authorization.prerequisite_projection_sha256 =
    prerequisiteProjectionDigestV1(
      state.start_authorization.prerequisite_projection,
    );
  const result = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state,
    asOf: "2026-08-11T00:00:00.000Z",
  });
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.includes(
      "soak_start_authorization_prerequisites_not_proven",
    ),
  );
  assert.ok(result.findings.includes("soak_prerequisite_authority_mismatch"));
});

test("tampered authorization and prerequisite drift fail closed", () => {
  const tamperedState = soakState();
  tamperedState.start_authorization.prerequisite_projection_sha256 = "0".repeat(64);
  const tampered = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state: tamperedState,
    asOf: "2026-08-11T00:00:00.000Z",
  });
  assert.ok(
    tampered.findings.includes("soak_start_authorization_digest_invalid"),
  );

  const driftedManifest = manifest();
  driftedManifest.gates[0].evidence = ["new-evidence-after-start"];
  const drifted = evaluateReleaseCandidateSoakV1({
    manifest: driftedManifest,
    state: soakState(),
    asOf: "2026-08-11T00:00:00.000Z",
  });
  assert.equal(drifted.status, "failed");
  assert.ok(drifted.findings.includes("soak_prerequisite_authority_mismatch"));
});

test("a backdated start is rejected", () => {
  const state = soakState({
    start_recorded_at: "2026-08-08T01:00:00.000Z",
  });
  const result = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state,
    asOf: "2026-08-08T02:00:00.000Z",
  });
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("soak_start_is_backdated_or_forward_dated"));
});

test("candidate identity cannot change during the soak", () => {
  const state = soakState({
    candidate_identity: { ...candidate, source_commit: "d".repeat(40) },
  });
  const result = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state,
    asOf: "2026-08-11T00:00:00.000Z",
  });
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("soak_candidate_identity_mismatch"));
});

test("a healthy incomplete window remains observing", () => {
  const state = soakState({
    observations: [
      observation("2026-08-08T00:00:00.000Z"),
      observation("2026-08-09T00:00:00.000Z"),
    ],
  });
  const result = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state,
    asOf: "2026-08-09T12:00:00.000Z",
  });
  assert.equal(result.status, "observing");
  assert.deepEqual(result.findings, []);
  assert.equal(result.final_report_allowed, false);
});

test("72 clean hours with bounded observations unlock the final report", () => {
  const result = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state: soakState(),
    asOf: "2026-08-11T00:00:00.000Z",
  });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.findings, []);
  assert.equal(result.soak.window_elapsed, true);
  assert.equal(result.soak.observation_count, 4);
  assert.equal(result.final_report_allowed, true);
});

test("unhealthy evidence and observation gaps fail closed", () => {
  const state = soakState({
    observations: [
      observation("2026-08-08T00:00:00.000Z"),
      observation("2026-08-10T00:00:00.000Z", {
        launch_blocking_crash_count: 1,
      }),
      observation("2026-08-11T00:00:00.000Z"),
    ],
  });
  const result = evaluateReleaseCandidateSoakV1({
    manifest: manifest(),
    state,
    asOf: "2026-08-11T00:00:00.000Z",
  });
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("unhealthy_soak_observation"));
  assert.ok(result.findings.includes("soak_observation_gap_exceeds_26_hours"));
  assert.equal(result.final_report_allowed, false);
});
