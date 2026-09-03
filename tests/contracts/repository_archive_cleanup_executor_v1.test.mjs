import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import {
  buildCleanupActions,
  validateAuthorization,
} from "../../scripts/repository/execute_archive_cleanup_v1.mjs";

function candidate(overrides = {}) {
  return {
    branch_name: "feature/example",
    local_refs: ["feature/example"],
    remote_refs: ["origin/feature/example"],
    worktrees: [{ path: "C:/worktrees/example", sha: "a".repeat(40) }],
    ...overrides,
  };
}

function plan() {
  return {
    selection_fingerprint: "selection-v1",
    execution_fingerprint: "execution-v1",
    action_manifest_sha256: "actions-v1",
    actions: {
      counts: {
        candidate_groups: 1,
        local_branches: 1,
        remote_branches: 1,
        worktrees: 1,
      },
    },
    recovery: {
      base_bundle_sha256: "base-v1",
      supplement_bundle_sha256: "supplement-v1",
    },
  };
}

test("cleanup actions are exact, deduplicated, and preserve worktree identity", () => {
  const actions = buildCleanupActions([
    candidate(),
    candidate({
      branch_name: "feature/remote-only",
      local_refs: [],
      remote_refs: ["origin/feature/remote-only"],
      worktrees: [],
    }),
  ]);
  assert.deepEqual(actions.local_branches, ["feature/example"]);
  assert.deepEqual(actions.remote_branches, ["feature/example", "feature/remote-only"]);
  assert.deepEqual(actions.worktrees, [{
    path: "C:/worktrees/example",
    branch: "feature/example",
    sha: "a".repeat(40),
  }]);
  assert.deepEqual(actions.counts, {
    candidate_groups: 2,
    local_branches: 1,
    remote_branches: 2,
    worktrees: 1,
  });
});

test("authorization must bind every fingerprint, hash, count, and owner field", () => {
  const expectedPlan = plan();
  const valid = {
    schema_version: "GROOKAI_REPOSITORY_ARCHIVE_CLEANUP_AUTHORIZATION_V1",
    execute_authorized: true,
    approved_by: "owner",
    approved_at: "2026-09-02T00:00:00Z",
    approval_statement: "Exact cleanup approved.",
    selection_fingerprint: "selection-v1",
    execution_fingerprint: "execution-v1",
    base_bundle_sha256: "base-v1",
    supplement_bundle_sha256: "supplement-v1",
    action_manifest_sha256: "actions-v1",
    action_counts: expectedPlan.actions.counts,
  };
  assert.deepEqual(validateAuthorization(valid, expectedPlan), { passed: true, reasons: [] });
  const invalid = validateAuthorization({ ...valid, execution_fingerprint: "changed" }, expectedPlan);
  assert.equal(invalid.passed, false);
  assert.ok(invalid.reasons.includes("execution_fingerprint_mismatch"));
});

test("general permission cannot unlock destructive execution", () => {
  const result = validateAuthorization({
    schema_version: "GROOKAI_REPOSITORY_ARCHIVE_CLEANUP_AUTHORIZATION_V1",
    execute_authorized: true,
    approved_by: "owner",
    approved_at: "2026-09-02T00:00:00Z",
    approval_statement: "Continue.",
  }, plan());
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes("selection_fingerprint_mismatch"));
  assert.ok(result.reasons.includes("execution_fingerprint_mismatch"));
  assert.ok(result.reasons.includes("action_manifest_sha256_mismatch"));
});

test("executor is dry-run by default and destructive commands remain guarded", () => {
  const source = fs.readFileSync("scripts/repository/execute_archive_cleanup_v1.mjs", "utf8");
  assert.match(source, /const execute = hasFlag\("execute"\)/);
  assert.match(source, /if \(execute && !authorization\.passed\)/);
  assert.match(source, /if \(execute\) \{\s+const secondPass/);
  assert.match(source, /execFileSync\(\s+"git",\s+\["show", `\$\{ref\}:\$\{file/);
  assert.match(source, /--force-with-lease=refs\/heads\/\$\{branch\}:\$\{recoveryRefMap/);
  assert.match(source, /"push", "--no-verify", "--atomic", \.\.\.leases, "origin", \.\.\.deletions/);
  assert.match(source, /"push", "--no-verify", "--atomic", "origin", \.\.\.remoteSpecs/);
  assert.match(source, /"status", "--porcelain=v1", "--untracked-files=no"/);
  assert.match(source, /Tracked working tree must match HEAD before cleanup planning or execution/);
  assert.match(source, /failure_stage: failureStage/);
  assert.match(source, /## Execution Result/);
  assert.match(source, /"update-ref", "--stdin"/);
  assert.match(source, /plan\.execution_result = executionResult/);
  assert.match(source, /persisted execution and rollback evidence must be reviewed/);
  assert.match(source, /producer_sha: producerSha,\s+authority_ref/);
  assert.doesNotMatch(source, /reset", "--hard|clean", "-f|push", "--force/);
  assert.doesNotMatch(source, /rmSync|unlinkSync|rmdirSync|Remove-Item/);
});

test("generated dry-run artifacts reconcile when present", () => {
  const root = "docs/audits/repository_archive_cleanup_execution_20260902";
  if (!fs.existsSync(root)) return;
  const execution = JSON.parse(fs.readFileSync(`${root}/cleanup_execution_plan.json`, "utf8"));
  const records = fs.readFileSync(`${root}/cleanup_live_revalidation.jsonl`, "utf8")
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const hashes = JSON.parse(fs.readFileSync(`${root}/artifact_hashes.json`, "utf8"));
  assert.equal(execution.mode, "dry_run");
  assert.equal(execution.execution_status, "not_executed");
  assert.equal(execution.revalidation.drifted_groups, 0);
  assert.equal(execution.revalidation.inventory_failures, 0);
  assert.equal(records.length - 1, execution.actions.counts.candidate_groups);
  for (const [file, expected] of Object.entries(hashes.files)) {
    const actual = createHash("sha256")
      .update(fs.readFileSync(`${root}/${file}`))
      .digest("hex");
    assert.equal(actual, expected, `${file} hash must reconcile`);
  }
});
