import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  PINNED_EXECUTION_PRODUCER_SHA,
  PINNED_EXECUTION_SUMMARY_SHA256,
  PINNED_ROLLBACK_PROOF_SHA256,
  evaluateIndependentFoundationPostRollbackV1,
  parseArgs,
  verifyExecutionArtifacts,
} from "../../scripts/audits/one_piece_canonical_catalog_foundation_post_rollback_v1.mjs";

const DIR = "docs/audits/pricing/one_piece_canonical_catalog_foundation_rollback_v1/" +
  "production_rollback_attempt_2_v1";
const SCRIPT =
  "scripts/audits/one_piece_canonical_catalog_foundation_post_rollback_v1.mjs";

function load(name) {
  return fs.readFileSync(`${DIR}/${name}`);
}

test("independent verifier requires explicit mode and exact producer SHA", () => {
  assert.throws(() => parseArgs([]), /verify-post-rollback/);
  assert.throws(() => parseArgs(["--verify-post-rollback"]), /expected-head-sha/);
  const args = parseArgs([
    "--verify-post-rollback",
    `--expected-head-sha=${"b".repeat(40)}`,
  ]);
  assert.equal(args.verify, true);
});

test("successful execution artifacts remain pinned and internally reconciled", () => {
  const bodies = Object.fromEntries([
    "summary.json", "run_plan.json", "transaction_proof.json", "protected_before.json",
    "post_rollback_readback.json", "artifact_hashes.json", "REPORT.md",
  ].map((name) => [name, load(name)]));
  const summary = JSON.parse(bodies["summary.json"]);
  const transactionProof = JSON.parse(bodies["transaction_proof.json"]);
  const hashes = JSON.parse(bodies["artifact_hashes.json"]);
  assert.equal(summary.repository.commit_sha, PINNED_EXECUTION_PRODUCER_SHA);
  assert.equal(summary.rollback_proof_sha256, PINNED_ROLLBACK_PROOF_SHA256);
  assert.equal(PINNED_EXECUTION_SUMMARY_SHA256.length, 64);
  assert.deepEqual(verifyExecutionArtifacts({
    bodies,
    hashes,
    summary,
    transactionProof,
  }), []);
});

test("independent evaluation rejects game, constraint, and protected-count residue", () => {
  const baseline = JSON.parse(load("protected_before.json"));
  const executionPost = JSON.parse(load("post_rollback_readback.json"));
  assert.deepEqual(evaluateIndependentFoundationPostRollbackV1({
    baseline,
    executionPost,
    production: structuredClone(executionPost),
  }), []);
  const residue = structuredClone(executionPost);
  residue.game_code_count = 1;
  residue.protected_counts.games += 1;
  residue.identity_domain_constraint += " one_piece_eng_print";
  const findings = evaluateIndependentFoundationPostRollbackV1({
    baseline,
    executionPost,
    production: residue,
  });
  assert.equal(findings.includes("game_code_count_not_zero"), true);
  assert.equal(findings.includes("independent_protected_count_changed:games"), true);
  assert.equal(findings.includes("independent_production_constraint_changed"), true);
});

test("independent verifier is read-only and writes its run plan before database access", () => {
  const source = fs.readFileSync(SCRIPT, "utf8");
  assert.match(source, /run_plan_written_before_database_access:\s*true/);
  assert.match(source, /fresh_read_only_post_rollback_verification/);
  assert.doesNotMatch(source,
    /client\.query\s*\(\s*[`"']\s*(?:insert|update|delete|truncate|alter|drop|create|commit)\b/i);
});
