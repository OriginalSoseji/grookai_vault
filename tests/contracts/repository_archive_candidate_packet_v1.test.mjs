import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import {
  buildBranchGroups,
  evaluateArchiveGroup,
  matchReferences,
} from "../../scripts/repository/build_archive_candidate_packet.mjs";

const noReferences = new Map();

function context(overrides = {}) {
  return {
    openPullRequests: [],
    referencesByGroup: noReferences,
    scheduledTaskStatus: "available",
    runningProcessStatus: "available",
    ...overrides,
  };
}

function row(overrides = {}) {
  return {
    source_kind: "local_branch",
    source_name: "feature/contained",
    sha: "a".repeat(40),
    relationship: "ancestor",
    changed_domains: ["web"],
    pull_requests: [],
    disposition: "contained_in_main",
    delete_authorized: false,
    ...overrides,
  };
}

test("branch groups deduplicate local, remote, and worktree records", () => {
  const groups = buildBranchGroups([
    row(),
    row({ source_kind: "remote_branch", source_name: "origin/feature/contained" }),
    row({
      source_kind: "worktree",
      source_name: "C:/work/contained",
      branch: "feature/contained",
      dirty: false,
      status_available: true,
    }),
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].local_refs, ["feature/contained"]);
  assert.deepEqual(groups[0].remote_refs, ["origin/feature/contained"]);
  assert.equal(groups[0].worktrees.length, 1);
});

test("worktree path matching does not confuse sibling path prefixes", () => {
  const tokenMap = new Map([
    ["c:/grookai_vault", new Set(["branch:root"])],
  ]);

  assert.equal(matchReferences("node C:/grookai_vault/script.mjs", tokenMap).length, 1);
  assert.equal(matchReferences("node C:/grookai_vault_launch/script.mjs", tokenMap).length, 0);
});

test("only clean contained or patch-equivalent groups become candidates", () => {
  const [group] = buildBranchGroups([row()]);
  const result = evaluateArchiveGroup(group, context());

  assert.equal(result.classification, "owner_review_candidate");
  assert.deepEqual(result.exclusion_reasons, []);
  assert.equal(result.delete_authorized, false);
  assert.equal(result.proposed_actions.delete_authorized, false);
});

test("migration, dirty, detached, open-PR, and automation sources are excluded", () => {
  const [migration] = buildBranchGroups([row({ changed_domains: ["migration"] })]);
  assert.ok(evaluateArchiveGroup(migration, context()).exclusion_reasons.includes("migration_bearing_source"));

  const [dirty] = buildBranchGroups([
    row({
      source_kind: "worktree",
      source_name: "C:/work/dirty",
      branch: "feature/dirty",
      dirty: true,
      status_available: true,
    }),
  ]);
  assert.ok(evaluateArchiveGroup(dirty, context()).exclusion_reasons.includes("dirty_or_unreadable_worktree"));

  const [detached] = buildBranchGroups([
    row({
      source_kind: "worktree",
      source_name: "C:/work/detached",
      branch: null,
      detached: true,
      dirty: false,
      status_available: true,
    }),
  ]);
  assert.ok(evaluateArchiveGroup(detached, context()).exclusion_reasons.includes("detached_source"));

  const [open] = buildBranchGroups([row({ source_name: "feature/open" })]);
  assert.ok(
    evaluateArchiveGroup(
      open,
      context({ openPullRequests: [{ number: 1, headRefName: "feature/open" }] }),
    ).exclusion_reasons.includes("open_pull_request"),
  );

  const [automated] = buildBranchGroups([row({ source_name: "feature/automated" })]);
  const referencesByGroup = new Map([
    [automated.group_id, [{ reference_kind: "windows_scheduled_task" }]],
  ]);
  assert.ok(
    evaluateArchiveGroup(automated, context({ referencesByGroup })).exclusion_reasons.includes(
      "scheduled_task_reference",
    ),
  );
});

test("unavailable host inventories fail closed", () => {
  const [group] = buildBranchGroups([row()]);
  const result = evaluateArchiveGroup(
    group,
    context({ scheduledTaskStatus: "unavailable", runningProcessStatus: "unavailable" }),
  );
  assert.equal(result.classification, "excluded");
  assert.ok(result.exclusion_reasons.includes("scheduled_task_inventory_unavailable"));
  assert.ok(result.exclusion_reasons.includes("running_process_inventory_unavailable"));
});

test("generated packet reconciles and authorizes no deletion", () => {
  const root = "docs/audits/repository_archive_candidate_packet_20260902";
  const readJsonl = (file) => fs.readFileSync(`${root}/${file}`, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const candidateRecords = readJsonl("archive_candidates.jsonl");
  const exclusionRecords = readJsonl("archive_exclusions.jsonl");
  const metadata = candidateRecords[0].packet;
  const candidates = candidateRecords.slice(1);
  const exclusions = exclusionRecords.slice(1);
  const hashes = JSON.parse(fs.readFileSync(`${root}/artifact_hashes.json`, "utf8"));

  assert.equal(candidates.length, metadata.counts.candidates);
  assert.equal(exclusions.length, metadata.counts.exclusions);
  assert.equal(candidates.length + exclusions.length, metadata.counts.total_groups);
  assert.equal(candidates.some((record) => record.delete_authorized !== false), false);
  assert.equal(exclusions.some((record) => record.delete_authorized !== false), false);
  assert.equal(candidates.some((record) => record.changed_domains.includes("migration")), false);
  assert.equal(candidates.some((record) => record.current_open_pull_requests.length > 0), false);
  assert.equal(candidates.some((record) => record.automation_references.length > 0), false);
  assert.equal(candidates.some((record) => record.exclusion_reasons.length > 0), false);
  assert.equal(exclusions.some((record) => record.exclusion_reasons.length === 0), false);
  assert.equal(metadata.boundaries.source_deletions, 0);
  assert.equal(metadata.boundaries.worktree_removals, 0);
  assert.equal(metadata.boundaries.delete_authorized_records, 0);

  for (const [file, expected] of Object.entries(hashes.files)) {
    const actual = createHash("sha256").update(fs.readFileSync(`${root}/${file}`)).digest("hex");
    assert.equal(actual, expected, `${file} hash must reconcile`);
  }
});

test("packet generator contains no destructive Git or filesystem operation", () => {
  const source = fs.readFileSync(
    "scripts/repository/build_archive_candidate_packet.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /git\(\["branch",\s*"-D"/);
  assert.doesNotMatch(source, /git\(\["worktree",\s*"remove"/);
  assert.doesNotMatch(source, /git\(\["push",[^\]]*"--delete"/);
  assert.doesNotMatch(source, /rmSync|unlinkSync|rmdirSync|Remove-Item/);
});
