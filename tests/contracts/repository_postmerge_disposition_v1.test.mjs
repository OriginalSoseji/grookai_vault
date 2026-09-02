import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import { classifyDisposition } from "../../scripts/repository/build_postmerge_disposition_ledger.mjs";

const cleanAnalysis = {
  relationship: "ancestor",
  patch_unique_commits: 0,
  patch_equivalent_commits: 0,
  changed_domains: [],
};

test("post-merge disposition protects authority and dirty worktrees", () => {
  const authority = classifyDisposition({
    sourceKind: "remote_branch",
    sourceName: "origin/main",
    branch: "main",
    dirty: false,
    detached: false,
    analysis: cleanAnalysis,
    openPullRequests: [],
  });
  assert.equal(authority.disposition, "protected_authority");

  const staleLocalMain = classifyDisposition({
    sourceKind: "local_branch",
    sourceName: "main",
    branch: "main",
    dirty: false,
    detached: false,
    analysis: {
      ...cleanAnalysis,
      relationship: "diverged",
      changed_domains: ["migration"],
    },
    openPullRequests: [],
  });
  assert.equal(staleLocalMain.disposition, "preserved_migration_review");

  const dirty = classifyDisposition({
    sourceKind: "worktree",
    sourceName: "C:/dirty",
    branch: "feature/dirty",
    dirty: true,
    detached: false,
    analysis: cleanAnalysis,
    openPullRequests: [],
  });
  assert.equal(dirty.disposition, "preserved_dirty_or_unreadable");
  assert.equal(dirty.recovery_value, "critical");

  const activeReport = classifyDisposition({
    sourceKind: "worktree",
    sourceName: "C:/report",
    branch: "docs/report",
    dirty: true,
    detached: false,
    analysis: cleanAnalysis,
    openPullRequests: [],
    activeReportBranch: true,
  });
  assert.equal(activeReport.disposition, "active_disposition_report");
});

test("post-merge disposition never treats migrations or open PRs as archive-ready", () => {
  const migration = classifyDisposition({
    sourceKind: "remote_branch",
    sourceName: "feature/migration",
    branch: "feature/migration",
    dirty: false,
    detached: false,
    analysis: { ...cleanAnalysis, relationship: "diverged", changed_domains: ["migration"] },
    openPullRequests: [{ number: 1 }],
  });
  assert.equal(migration.disposition, "open_pr_migration_gate");
  assert.equal(migration.recommended_action, "retain_open_until_domain_gate_resolves");

  const humanCalibration = classifyDisposition({
    sourceKind: "remote_branch",
    sourceName: "agent/visual-search-lab-runtime-fix",
    branch: "agent/visual-search-lab-runtime-fix",
    dirty: false,
    detached: false,
    analysis: {
      ...cleanAnalysis,
      relationship: "diverged",
      patch_unique_commits: 0,
      patch_equivalent_commits: 4,
      changed_domains: ["migration", "web"],
    },
    openPullRequests: [{ number: 118 }],
  });
  assert.equal(humanCalibration.disposition, "open_pr_human_calibration_gate");
});

test("contained clean branches are recommendations only, never deletion authority", () => {
  const contained = classifyDisposition({
    sourceKind: "remote_branch",
    sourceName: "feature/merged",
    branch: "feature/merged",
    dirty: false,
    detached: false,
    analysis: cleanAnalysis,
    openPullRequests: [],
  });
  assert.equal(contained.disposition, "contained_in_main");
  assert.equal(contained.recommended_action, "future_archive_candidate_after_owner_confirmation");

  const source = fs.readFileSync(
    "scripts/repository/build_postmerge_disposition_ledger.mjs",
    "utf8",
  );
  assert.match(source, /delete_authorized: false/);
  assert.doesNotMatch(source, /git\(\["branch",\s*"-D"/);
  assert.doesNotMatch(source, /git\(\["worktree",\s*"remove"/);
  assert.doesNotMatch(source, /git\(\["push",[^\]]*"--delete"/);
});

test("generated disposition artifacts reconcile and authorize no deletion", () => {
  const root = "docs/audits/repository_postmerge_disposition_20260902";
  const records = fs.readFileSync(`${root}/postmerge_disposition_ledger.jsonl`, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const metadata = records.find((record) => record.record_type === "metadata").ledger;
  const rows = records
    .filter((record) => record.record_type === "source")
    .map(({ record_type, ...row }) => row);
  const ledger = { ...metadata, rows };
  const hashes = JSON.parse(fs.readFileSync(`${root}/artifact_hashes.json`, "utf8"));

  assert.equal(ledger.rows.length, ledger.counts.total_rows);
  assert.equal(
    Object.values(ledger.counts.source_kind).reduce((sum, count) => sum + count, 0),
    ledger.rows.length,
  );
  assert.equal(ledger.rows.filter((row) => row.delete_authorized !== false).length, 0);
  assert.equal(ledger.boundaries.source_deletions, 0);
  assert.equal(ledger.boundaries.worktree_removals, 0);
  assert.equal(ledger.dirty_worktree_comparison.exact_path_set_match, true);
  assert.equal(ledger.open_pull_requests.length, 2);

  for (const [file, expected] of Object.entries(hashes.files)) {
    const actual = createHash("sha256").update(fs.readFileSync(`${root}/${file}`)).digest("hex");
    assert.equal(actual, expected, `${file} hash must reconcile`);
  }
});
