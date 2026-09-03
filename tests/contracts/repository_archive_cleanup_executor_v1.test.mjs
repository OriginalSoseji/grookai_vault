import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  attachWorktreeFilesystemPlans,
  buildCleanupActions,
  executeCleanup,
  inventoryWorktreeReparsePoints,
  restoreRefs,
  validateAuthorization,
} from "../../scripts/repository/execute_archive_cleanup_v1.mjs";

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true }).trim();
}

function cleanupFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grookai-archive-cleanup-"));
  const repo = path.join(root, "repo");
  const remote = path.join(root, "remote.git");
  const worktree = path.join(root, "worktree");
  const linkTarget = path.join(root, "shared-node-modules");
  const preservationRoot = path.join(root, "preservation");
  fs.mkdirSync(repo);
  fs.mkdirSync(linkTarget);
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.email", "cleanup-test@grookai.local"]);
  git(repo, ["config", "user.name", "Grookai Cleanup Test"]);
  fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/\n");
  fs.writeFileSync(path.join(repo, "README.md"), "fixture\n");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", "fixture"]);
  git(repo, ["branch", "feature/example"]);
  git(root, ["init", "--bare", remote]);
  git(repo, ["remote", "add", "origin", remote]);
  git(repo, ["push", "origin", "main", "feature/example"]);
  git(repo, ["worktree", "add", worktree, "feature/example"]);
  fs.symlinkSync(linkTarget, path.join(worktree, "node_modules"), "junction");
  const sha = git(repo, ["rev-parse", "feature/example"]);
  const actions = buildCleanupActions([candidate({
    worktrees: [{ path: worktree, sha }],
  })]);
  actions.worktree_preservation_root = preservationRoot.replaceAll("\\", "/");
  actions.worktrees = attachWorktreeFilesystemPlans({
    worktrees: actions.worktrees,
    preservationRoot,
    producerSha: "b".repeat(40),
  });
  actions.counts.reparse_points = 1;
  const recoveryRefMap = new Map([
    ["refs/heads/feature/example", sha],
    ["refs/remotes/origin/feature/example", sha],
  ]);
  return { root, repo, remote, worktree, actions, recoveryRefMap, sha };
}

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

test("worktree filesystem plans preserve junction evidence outside the target", () => {
  const fixture = cleanupFixture();
  try {
    const points = inventoryWorktreeReparsePoints(fixture.worktree);
    assert.deepEqual(points, [{
      relative_path: "node_modules",
      link_target: path.join(fixture.root, "shared-node-modules"),
      entry_type: "symbolic_link_or_junction",
    }]);
    const [worktree] = fixture.actions.worktrees;
    assert.equal(worktree.filesystem.reparse_points.length, 1);
    assert.ok(worktree.filesystem.reparse_points[0].source_path.startsWith(
      fixture.worktree.replaceAll("\\", "/"),
    ));
    assert.ok(worktree.filesystem.reparse_points[0].preservation_path.startsWith(
      fixture.actions.worktree_preservation_root,
    ));
    assert.ok(!worktree.filesystem.failed_residual_path.startsWith(
      fixture.worktree.replaceAll("\\", "/"),
    ));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("executor relocates junctions before removing a worktree", () => {
  const fixture = cleanupFixture();
  try {
    const result = executeCleanup(fixture.repo, fixture.actions, fixture.recoveryRefMap);
    assert.equal(result.status, "completed");
    assert.equal(result.removed_worktrees, 1);
    assert.equal(result.preserved_reparse_points, 1);
    assert.equal(fs.existsSync(fixture.worktree), false);
    const point = fixture.actions.worktrees[0].filesystem.reparse_points[0];
    assert.equal(fs.lstatSync(point.preservation_path).isSymbolicLink(), true);
    assert.equal(fs.readlinkSync(point.preservation_path), point.link_target);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("rollback reconstructs an unregistered worktree and preserves its residual directory", () => {
  const fixture = cleanupFixture();
  try {
    const worktree = fixture.actions.worktrees[0];
    const point = worktree.filesystem.reparse_points[0];
    fs.mkdirSync(path.dirname(point.preservation_path), { recursive: true });
    fs.renameSync(point.source_path, point.preservation_path);
    git(fixture.repo, ["worktree", "remove", fixture.worktree]);
    fs.mkdirSync(fixture.worktree);
    fs.writeFileSync(path.join(fixture.worktree, "partial.txt"), "preserve me\n");
    git(fixture.repo, ["push", "--no-verify", "origin", ":refs/heads/feature/example"]);

    const rollback = restoreRefs(
      fixture.repo,
      fixture.actions,
      fixture.recoveryRefMap,
      [{
        worktree,
        moved_reparse_points: [point],
        removal_started: true,
        removed: false,
      }],
    );

    assert.equal(rollback.passed, true, rollback.failures.join("\n"));
    assert.equal(rollback.worktree_restorations[0].reconstructed, true);
    assert.equal(
      fs.readFileSync(path.join(worktree.filesystem.failed_residual_path, "partial.txt"), "utf8"),
      "preserve me\n",
    );
    assert.equal(fs.lstatSync(point.source_path).isSymbolicLink(), true);
    assert.equal(fs.readlinkSync(point.source_path), point.link_target);
    assert.equal(git(fixture.repo, ["rev-parse", "feature/example"]), fixture.sha);
    assert.equal(git(fixture.repo, ["ls-remote", "--heads", "origin", "feature/example"]),
      `${fixture.sha}\trefs/heads/feature/example`);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
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
  assert.match(source, /attemptedWorktrees\.push\(state\);\s+relocateReparsePoints\(worktree, state\)/);
  assert.match(source, /renameSync\(worktree\.path, residualPath\)[\s\S]+"worktree", "add"/);
  assert.match(source, /Immediate pre-mutation worktree filesystem inventory drifted/);
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

test("failed reparse attempt and exact manual restoration evidence reconcile", () => {
  const root = "docs/audits/repository_archive_cleanup_postrepair_dry_run_20260903";
  if (!fs.existsSync(root)) return;
  const execution = JSON.parse(fs.readFileSync(`${root}/cleanup_execution_plan.json`, "utf8"));
  const restoration = JSON.parse(
    fs.readFileSync(`${root}/manual_worktree_restoration_readback.json`, "utf8"),
  );
  const hashes = JSON.parse(fs.readFileSync(`${root}/artifact_hashes_v2.json`, "utf8"));
  assert.equal(execution.execution_status, "failed");
  assert.equal(execution.execution_result.failure_stage, "worktree_remove");
  assert.equal(execution.execution_result.rollback.passed, true);
  assert.equal(restoration.target_restoration.passed, true);
  assert.equal(restoration.target_restoration.local_branches_present, 203);
  assert.equal(restoration.target_restoration.remote_branches_present, 135);
  assert.equal(restoration.target_restoration.registered_worktrees_present, 39);
  assert.equal(restoration.boundaries.cleanup_retried, false);
  for (const [file, expected] of Object.entries(hashes.files)) {
    const actual = createHash("sha256")
      .update(fs.readFileSync(`${root}/${file}`))
      .digest("hex");
    assert.equal(actual, expected, `${file} failed-attempt hash must reconcile`);
  }
});
