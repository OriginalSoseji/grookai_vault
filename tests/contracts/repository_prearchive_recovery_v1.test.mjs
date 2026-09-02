import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import { evaluateRevalidatedCandidate } from "../../scripts/repository/build_prearchive_recovery_plan.mjs";

function candidate(overrides = {}) {
  return {
    group_id: "branch:feature/safe", branch_name: "feature/safe",
    local_refs: ["feature/safe"], remote_refs: [], worktrees: [],
    changed_domains: ["web"], exclusion_reasons: [], delete_authorized: false,
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    refs: [{ exists: true, sha_matches: true, relationship: { status: "contained_in_authority", patch_unique_commits: 0 } }],
    worktrees: [], openPullRequestStatus: "available", openPullRequests: [],
    repositoryStatus: "available", scheduledTaskStatus: "available",
    runningProcessStatus: "available", remoteHeadStatus: "available",
    automationReferences: [], ...overrides,
  };
}

test("clean and contained candidate is selected only for recovery", () => {
  const result = evaluateRevalidatedCandidate(candidate(), evidence());
  assert.equal(result.selection_status, "selected_for_recovery");
  assert.equal(result.delete_authorized, false);
});

test("moved, divergent, dirty, open-PR, and automated sources are excluded", () => {
  const moved = evaluateRevalidatedCandidate(candidate(), evidence({ refs: [{ exists: true, sha_matches: false, relationship: { status: "contained_in_authority" } }] }));
  assert.ok(moved.revalidation_exclusion_reasons.includes("named_ref_moved_since_packet"));
  const divergent = evaluateRevalidatedCandidate(candidate(), evidence({ refs: [{ exists: true, sha_matches: true, relationship: { status: "diverged_with_unique_patches" } }] }));
  assert.ok(divergent.revalidation_exclusion_reasons.includes("named_ref_not_recovery_safe"));
  const dirty = evaluateRevalidatedCandidate(candidate(), evidence({ worktrees: [{ exists: true, status_available: true, dirty: true, sha_matches: true, branch_matches: true, detached: false }] }));
  assert.ok(dirty.revalidation_exclusion_reasons.includes("worktree_not_clean"));
  const open = evaluateRevalidatedCandidate(candidate(), evidence({ openPullRequests: [{ number: 1 }] }));
  assert.ok(open.revalidation_exclusion_reasons.includes("current_open_pull_request"));
  const automated = evaluateRevalidatedCandidate(candidate(), evidence({ automationReferences: [{ reference_kind: "running_process" }] }));
  assert.ok(automated.revalidation_exclusion_reasons.includes("current_automation_reference"));
});

test("every unavailable inventory fails closed", () => {
  for (const field of ["openPullRequestStatus", "repositoryStatus", "scheduledTaskStatus", "runningProcessStatus"]) {
    const result = evaluateRevalidatedCandidate(candidate(), evidence({ [field]: "unavailable" }));
    assert.equal(result.selection_status, "excluded_after_revalidation", field);
  }
});

test("remote head inventory is required only for remote candidates", () => {
  const remote = evaluateRevalidatedCandidate(
    candidate({ remote_refs: ["origin/feature/safe"] }),
    evidence({ remoteHeadStatus: "unavailable" }),
  );
  assert.ok(remote.revalidation_exclusion_reasons.includes("remote_head_inventory_unavailable"));

  const localOnly = evaluateRevalidatedCandidate(
    candidate(),
    evidence({ remoteHeadStatus: "unavailable" }),
  );
  assert.equal(localOnly.selection_status, "selected_for_recovery");
});

test("planner constructs remote tracking refs under origin and verifies live authority", () => {
  const source = fs.readFileSync(
    "scripts/repository/build_prearchive_recovery_plan.mjs",
    "utf8",
  );
  assert.match(source, /refs\/remotes\/origin\/\$\{remoteBranchName\}/);
  assert.match(source, /liveAuthoritySha !== authoritySha/);
  assert.match(source, /\["rev-list", "--stdin"\]/);
  assert.doesNotMatch(source, /baseHeadShas\.some/);
  assert.match(source, /Incremental recovery must reference a standalone base bundle/);
  assert.match(source, /base-recovery-manifest-ref/);
});

test("generated recovery artifacts reconcile and authorize no deletion", () => {
  const root = "docs/audits/repository_prearchive_recovery_20260902";
  if (!fs.existsSync(root)) return;
  const readJsonl = (file) => fs.readFileSync(`${root}/${file}`, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const records = readJsonl("prearchive_selection.jsonl");
  const metadata = records[0].plan;
  const selected = records.slice(1);
  const excluded = readJsonl("prearchive_exclusions.jsonl").slice(1);
  const recovery = JSON.parse(fs.readFileSync(`${root}/recovery_bundle_manifest.json`, "utf8"));
  const readback = JSON.parse(fs.readFileSync(`${root}/recovery_remote_readback.json`, "utf8"));
  const hashes = JSON.parse(fs.readFileSync(`${root}/artifact_hashes.json`, "utf8"));
  assert.equal(selected.length, metadata.counts.selected_for_recovery);
  assert.equal(excluded.length, metadata.counts.excluded_after_revalidation);
  assert.equal(selected.length + excluded.length, metadata.counts.input_candidates);
  assert.equal(selected.some((row) => row.delete_authorized !== false), false);
  assert.equal(selected.some((row) => row.revalidation_exclusion_reasons.length > 0), false);
  assert.equal(metadata.boundaries.worktree_removals, 0);
  assert.equal(metadata.boundaries.branch_deletions, 0);
  assert.equal(metadata.boundaries.delete_authorized_records, 0);
  assert.equal(recovery.delete_authorized, false);
  assert.equal(recovery.local_bundle_verification.passed, true);
  const recoveryMode = recovery.recovery_mode ?? "standalone_bundle";
  assert.ok([
    "standalone_bundle",
    "base_plus_incremental_supplement",
    "base_only_manifest",
  ].includes(recoveryMode));
  if (Array.isArray(recovery.recovery_refs)) {
    assert.equal(recovery.recovery_refs.length, recovery.recovery_ref_count);
    assert.equal(new Set(recovery.recovery_refs.map((row) => row.ref)).size, recovery.recovery_ref_count);
    assert.equal(recovery.recovery_refs.every((row) => /^[0-9a-f]{40}$/.test(row.sha)), true);
    assert.equal(metadata.counts.recovery_refs, recovery.recovery_ref_count);
  }
  if (recoveryMode === "base_only_manifest") {
    assert.equal(recovery.supplement_required, false);
    assert.equal(recovery.bundle_ref_count, 0);
    assert.equal(recovery.bundle_file, null);
    assert.equal(recovery.bundle_bytes, 0);
    assert.equal(recovery.bundle_sha256, null);
    assert.equal(recovery.bundle_prerequisite_count, 0);
    assert.equal(recovery.base_recovery.local_hash_matches, true);
    assert.equal(recovery.base_recovery.remote_bundle_digest_matches, true);
  }
  assert.equal(readback.status, "verified");
  assert.equal(readback.repository_visibility, "PRIVATE");
  assert.equal(readback.bundle_hash_matches, true);
  assert.equal(readback.manifest_hash_matches, true);
  assert.equal(readback.downloaded_bundle_verification.passed, true);
  for (const [file, expected] of Object.entries(hashes.files)) {
    const actual = createHash("sha256").update(fs.readFileSync(`${root}/${file}`)).digest("hex");
    assert.equal(actual, expected, `${file} hash must reconcile`);
  }
});

test("recovery planner contains no destructive repository operation", () => {
  const source = fs.readFileSync("scripts/repository/build_prearchive_recovery_plan.mjs", "utf8");
  assert.doesNotMatch(source, /git\(\["branch",\s*"-D"/);
  assert.doesNotMatch(source, /git\(\["worktree",\s*"remove"/);
  assert.doesNotMatch(source, /git\(\["push",[^\]]*"--delete"/);
  assert.doesNotMatch(source, /rmSync|unlinkSync|rmdirSync|Remove-Item/);
});
