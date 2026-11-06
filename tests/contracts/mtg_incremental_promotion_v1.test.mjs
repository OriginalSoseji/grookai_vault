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
  assert.match(worker, /include_variations", "true"/);
});

test("MTG incremental promotion extends only fully accounted partial sets", () => {
  assert.match(worker, /Partial MTG set has unaccounted canonical parents/);
  assert.match(worker, /Retained MTG \$\{name\} drift/);
  assert.match(worker, /eligible_partial_extension_plan/);
  assert.match(payloadBuilder, /image_url:\s*null/);
  assert.match(payloadBuilder, /image_pending_self_host/);
  assert.match(worker, /rollback absence proof failed/i);
  assert.match(worker, /Apply requires --expected-execution-counts-sha256/);
  assert.match(worker, /"--expected-execution-counts-sha256="\.length/);
  assert.match(worker, /Expected execution counts do not match the frozen MTG delta/);
  assert.match(worker, /Apply requires the exact clean frozen commit/);
  assert.doesNotMatch(worker, /\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
});

test("MTG plan status distinguishes absent, completed and future sets", () => {
  const initializer = worker.match(/let transactionResult = (\{[\s\S]*?\n    \});/);
  assert.ok(initializer, "worker retains the tested plan-result initializer");
  for (const [releaseEligible, shouldMutate, databaseState, action, reason] of [
    [true, true, "absent", "plan_only", "eligible_absent_plan"],
    [true, true, "partial_or_drifted", "plan_only", "eligible_partial_extension_plan"],
    [true, false, "exact_complete", "no_op", "already_exact_complete"],
    [false, false, "absent", "no_op", "future_release"],
  ]) {
    const result = vm.runInNewContext(`(${initializer[1]})`, {
      releaseEligible, shouldMutate, databaseState,
    }, { timeout: 1000 });
    assert.equal(result.action, action);
    assert.equal(result.reason, reason);
  }
});

test("MTG partial extension retains existing parents and selects related rows only", () => {
  const source = worker.match(
    /function selectMtgPromotionRowsV1\(rows, parentIds, includeSet = false\) \{[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(source);
  const selectRows = vm.runInNewContext(`(${source})`);
  const rows = {
    sets: [{ id: "set" }],
    card_prints: [{ id: "a" }, { id: "b" }],
    card_print_identity: [
      { id: "ia", card_print_id: "a" },
      { id: "ib", card_print_id: "b" },
    ],
    card_printings: [
      { id: "pa", card_print_id: "a" },
      { id: "pb", card_print_id: "b" },
    ],
    external_mappings: [
      { external_id: "sa", card_print_id: "a" },
      { external_id: "sb", card_print_id: "b" },
    ],
    external_printing_mappings: [
      { external_id: "1:normal", card_printing_id: "pa" },
      { external_id: "2:normal", card_printing_id: "pb" },
    ],
  };
  const selected = selectRows(rows, new Set(["b"]), false);
  assert.deepEqual(JSON.parse(JSON.stringify(selected)), {
    sets: [],
    card_prints: [{ id: "b" }],
    card_print_identity: [{ id: "ib", card_print_id: "b" }],
    card_printings: [{ id: "pb", card_print_id: "b" }],
    external_mappings: [{ external_id: "sb", card_print_id: "b" }],
    external_printing_mappings: [{ external_id: "2:normal", card_printing_id: "pb" }],
  });
});

test("MTG partial extension preserves an existing set release date but rejects identity drift", () => {
  const source = worker.match(
    /function assertExistingSetCompatibleV1\(actual, planned\) \{[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(source);
  const assertCompatible = vm.runInNewContext(`(${source})`);
  const base = {
    id: "set-id", game: "mtg", code: "fdc", name: "Foundations Commander",
    set_role: null, identity_domain_default: "mtg_eng_paper_print",
    identity_model: "standard",
    source: { scryfall: { id: "source-set", code: "fdc", set_type: "commander" } },
  };
  assert.doesNotThrow(() => assertCompatible(
    { ...base, release_date: "2024-11-15" },
    { ...base, release_date: "2026-10-02" },
  ));
  assert.throws(() => assertCompatible(base, { ...base, name: "Other" }), /identity drift/);
});
