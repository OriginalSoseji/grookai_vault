import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const worker = fs.readFileSync(
  new URL("../../scripts/workers/mtg_incremental_promotion_v1.mjs", import.meta.url),
  "utf8",
);
const payloadBuilder = fs.readFileSync(
  new URL("../../scripts/audits/mtg_canonical_catalog_canary_plan_v1.mjs", import.meta.url),
  "utf8",
);

test("MTG provenance preserves actual branch, detached SHA and dirty state", () => {
  const source = worker.match(/function captureMtgRepositoryV1\(runGit = git\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const capture = vm.runInNewContext(`(${source})`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mtg-provenance-"));
  const git = (...args) => execFileSync("git", ["-C", directory, ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  try {
    git("init", "--initial-branch=fixture");
    fs.writeFileSync(path.join(directory, "fixture.txt"), "original\n");
    git("add", "fixture.txt");
    git("-c", "user.name=Contract", "-c", "user.email=contract@example.invalid",
      "-c", "core.hooksPath=", "commit", "-m", "Isolated test fixture");
    const sha = git("rev-parse", "HEAD");
    assert.equal(capture(git).branch, "fixture");
    assert.equal(capture(git).detached_head, false);
    git("checkout", "--detach", sha);
    const detached = capture(git);
    assert.equal(detached.commit_sha, sha);
    assert.equal(detached.branch, "HEAD");
    assert.equal(detached.detached_head, true);
    assert.equal(detached.tracked_worktree_clean, true);
    fs.appendFileSync(path.join(directory, "fixture.txt"), "changed\n");
    assert.equal(capture(git).tracked_worktree_clean, false);
    assert.match(worker, /repository\.commit_sha !== options\.expectedHeadSha/);
    assert.match(worker, /!repository\.tracked_worktree_clean/);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("mtg-provenance-"));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("MTG incremental promotion uses existing canonical contracts dynamically", () => {
  assert.match(worker, /buildMtgCanonicalCandidateV1/);
  assert.match(worker, /buildMtgCanaryPayloadV1/);
  assert.match(worker, /buildMtgCanonicalSetPromotionContractV1/);
  assert.match(worker, /set:\$\{setCode\} game:paper lang:en/);
  assert.match(worker, /unique", "prints"/);
});

test("MTG incremental promotion blocks partial sets and external image pointers", () => {
  assert.match(worker, /Partial MTG set requires bounded repair/);
  assert.match(payloadBuilder, /image_url:\s*null/);
  assert.match(payloadBuilder, /image_pending_self_host/);
  assert.match(worker, /rollback absence proof failed/i);
  assert.match(worker, /Apply requires the exact clean frozen commit/);
  assert.doesNotMatch(worker, /\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
});

test("MTG plan status distinguishes absent, completed and future sets", () => {
  const initializer = worker.match(/let transactionResult = (\{[\s\S]*?\n    \});/);
  assert.ok(initializer, "worker retains the tested plan-result initializer");
  for (const [releaseEligible, shouldMutate, action, reason] of [
    [true, true, "plan_only", "eligible_absent_plan"],
    [true, false, "no_op", "already_exact_complete"],
    [false, false, "no_op", "future_release"],
  ]) {
    const result = vm.runInNewContext(`(${initializer[1]})`, {
      releaseEligible, shouldMutate,
    }, { timeout: 1000 });
    assert.equal(result.action, action);
    assert.equal(result.reason, reason);
  }
});
