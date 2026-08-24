import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateProductionBackendFinalCandidateManifestV1,
  PRODUCTION_BACKEND_FINAL_CANDIDATE_MANIFEST_V1,
} from "../../scripts/audits/production_backend_final_candidate_manifest_v1.mjs";

const SHA = "a".repeat(40);

function manifest() {
  const workloads = Object.fromEntries(
    [
      "control_plane",
      "tcgplayer_source",
      "mee",
      "pricing_publication",
      "new_set_discovery",
    ].map((name) => [name, { expected_commit_sha: SHA, rollback_unit: `${name}.service` }]),
  );
  return {
    schema_version: PRODUCTION_BACKEND_FINAL_CANDIDATE_MANIFEST_V1,
    candidate: {
      source_commit_sha: SHA,
      branch: "main",
      tracked_worktree_clean: true,
      frozen_at: "2026-08-24T00:00:00.000Z",
    },
    prerequisites: {
      supabase_security: "passed",
      supabase_capacity: "passed",
      backup_restore: "passed",
      load_and_failure: "passed",
      same_candidate_clients: "passed",
    },
    database: {
      migration_ledger_head: "20260824174500",
      candidate_migrations: [
        {
          version: "20260824174500",
          sha256: "b".repeat(64),
          rollback_class: "reversible",
          rollback_proof: "evidence/rollback.json",
        },
      ],
    },
    workloads,
    rollback: {
      previous_source_commit_sha: "c".repeat(40),
      previous_web_deployment_id: "web-previous",
      previous_android_build_id: "android-previous",
      previous_ios_build_id: "ios-previous",
      database_restore_required: false,
      tested: true,
    },
    boundaries: { public_rollout: false, destructive_data_action: false },
  };
}

test("a complete immutable release manifest permits canary start", () => {
  const result = evaluateProductionBackendFinalCandidateManifestV1(manifest());
  assert.equal(result.canary_start_allowed, true);
  assert.deepEqual(result.findings, []);
});

test("unproven capacity and restore block canary start", () => {
  const input = manifest();
  input.prerequisites.supabase_capacity = "blocked";
  input.prerequisites.backup_restore = "blocked";
  const result = evaluateProductionBackendFinalCandidateManifestV1(input);
  assert.ok(result.findings.includes("prerequisite_supabase_capacity_not_passed"));
  assert.ok(result.findings.includes("prerequisite_backup_restore_not_passed"));
});

test("worker commit drift blocks the final candidate", () => {
  const input = manifest();
  input.workloads.mee.expected_commit_sha = "d".repeat(40);
  const result = evaluateProductionBackendFinalCandidateManifestV1(input);
  assert.ok(result.findings.includes("workload_mee_commit_mismatch"));
});

test("untested rollback or restore-dependent rollback blocks canary", () => {
  const input = manifest();
  input.rollback.tested = false;
  input.rollback.database_restore_required = true;
  const result = evaluateProductionBackendFinalCandidateManifestV1(input);
  assert.ok(result.findings.includes("rollback_not_tested"));
  assert.ok(result.findings.includes("rollback_requires_database_restore"));
});
