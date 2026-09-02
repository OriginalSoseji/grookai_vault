import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function command(binary, args, options = {}) {
  try {
    return execFileSync(binary, args, {
      cwd: options.cwd,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 256 * 1024 * 1024,
    }).trim();
  } catch (error) {
    if (options.allowFailure) return null;
    throw error;
  }
}

function git(args, options = {}) {
  return command("git", args, options);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
}

function classifyDomains(paths) {
  const domains = new Set();
  for (const value of paths) {
    if (value.startsWith("supabase/migrations/")) domains.add("migration");
    else if (value.startsWith("supabase/")) domains.add("supabase");
    else if (value.startsWith("apps/web/")) domains.add("web");
    else if (value.startsWith("lib/")) domains.add("flutter");
    else if (value.startsWith("ios/")) domains.add("ios");
    else if (value.startsWith("android/")) domains.add("android");
    else if (value.startsWith("backend/pricing/")) domains.add("pricing");
    else if (value.startsWith("backend/")) domains.add("backend");
    else if (value.startsWith(".github/workflows/")) domains.add("automation");
    else if (value.startsWith("docs/")) domains.add("documentation");
    else if (value.startsWith("scripts/")) domains.add("tooling");
    else if (value.startsWith("tests/") || value.startsWith("test/")) domains.add("tests");
    else domains.add("other");
  }
  return [...domains].sort();
}

function parseRefLines(value) {
  return value
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, sha] = line.split("\t");
      return { name, sha };
    });
}

function parseRemoteHeads(value) {
  return value
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [sha, ref] = line.split("\t");
      return { name: ref.replace("refs/heads/", ""), sha };
    });
}

function parseWorktrees(value) {
  const rows = [];
  let row = null;
  for (const line of `${value}\n`.split(/\r?\n/)) {
    if (!line) {
      if (row) rows.push(row);
      row = null;
      continue;
    }
    const space = line.indexOf(" ");
    const key = space === -1 ? line : line.slice(0, space);
    const data = space === -1 ? true : line.slice(space + 1);
    if (key === "worktree") row = { path: data, detached: false };
    else if (row && key === "HEAD") row.head = data;
    else if (row && key === "branch") row.branch = data.replace("refs/heads/", "");
    else if (row && key === "detached") row.detached = true;
    else if (row && key === "prunable") row.prunable = data;
  }
  return rows;
}

function collectWorktreeStatus(worktree) {
  const raw = git(
    ["-C", worktree.path, "status", "--porcelain=v1", "--untracked-files=normal"],
    { allowFailure: true },
  );
  if (raw === null) {
    return { status_available: false, dirty: null, change_count: null, change_records: [] };
  }
  const records = raw.split(/\r?\n/).filter(Boolean);
  return {
    status_available: true,
    dirty: records.length > 0,
    change_count: records.length,
    change_records: records.slice(0, 100),
    change_records_truncated: records.length > 100,
  };
}

export function classifyDisposition({
  sourceKind,
  sourceName,
  branch,
  dirty,
  detached,
  analysis,
  openPullRequests,
  priorDisposition,
  activeReportBranch = false,
}) {
  const branchName = branch || sourceName;
  if (branchName === "main" || sourceName === "origin/main") {
    return {
      disposition: "protected_authority",
      recovery_value: "critical",
      recommended_action: "retain_and_fast_forward_local_authority_only",
      reason: "Production authority is protected.",
    };
  }
  if (activeReportBranch) {
    return {
      disposition: "active_disposition_report",
      recovery_value: "high",
      recommended_action: "retain_until_report_is_merged",
      reason: "This is the active branch and worktree generating the disposition report.",
    };
  }
  if (dirty === true || dirty === null) {
    return {
      disposition: "preserved_dirty_or_unreadable",
      recovery_value: "critical",
      recommended_action: "retain_untouched_until_explicit_owner_review",
      reason: dirty === true
        ? "Worktree contains local changes."
        : "Worktree status could not be read safely.",
    };
  }
  if (branchName === "integration/reconciled-main-v1") {
    return {
      disposition: "accepted_reconciliation_restore_point",
      recovery_value: "critical",
      recommended_action: "retain_named_restore_point",
      reason: "This branch is the accepted pre-merge reconciliation restore point.",
    };
  }
  if (openPullRequests.length > 0) {
    const humanCalibrationGate = openPullRequests.some((pullRequest) => pullRequest.number === 118);
    const migration = analysis.changed_domains.includes("migration");
    return {
      disposition: humanCalibrationGate
        ? "open_pr_human_calibration_gate"
        : migration
          ? "open_pr_migration_gate"
          : "open_pr_deferred_gate",
      recovery_value: "critical",
      recommended_action: "retain_open_until_domain_gate_resolves",
      reason: humanCalibrationGate
        ? "The open Visual Search pull request remains behind its human-calibration gate."
        : migration
          ? "An open pull request contains migration history requiring its own governed gate."
          : "An open pull request remains intentionally deferred.",
    };
  }
  if (analysis.relationship === "equal" || analysis.relationship === "ancestor") {
    return {
      disposition: detached ? "contained_historical_evidence" : "contained_in_main",
      recovery_value: detached ? "high" : "low",
      recommended_action: detached
        ? "retain_as_historical_evidence"
        : "future_archive_candidate_after_owner_confirmation",
      reason: "The source commit is equal to or contained in current main.",
    };
  }
  if (analysis.patch_unique_commits === 0 && analysis.patch_equivalent_commits > 0) {
    return {
      disposition: "patch_equivalent_to_main",
      recovery_value: "medium",
      recommended_action: "future_archive_candidate_after_owner_confirmation",
      reason: "Git patch comparison found no source-only patch outside current main.",
    };
  }
  if (analysis.changed_domains.includes("migration")) {
    return {
      disposition: "preserved_migration_review",
      recovery_value: "high",
      recommended_action: "retain_for_manual_migration_review",
      reason: "Unmerged migration changes cannot be archived automatically.",
    };
  }
  if (String(priorDisposition ?? "").startsWith("capability_reconciled")) {
    return {
      disposition: "reconciled_source_evidence",
      recovery_value: "high",
      recommended_action: "retain_as_reconciliation_evidence",
      reason: "The source contributed reconciled capability and remains provenance evidence.",
    };
  }
  if (detached) {
    return {
      disposition: "unmerged_detached_history",
      recovery_value: "high",
      recommended_action: "retain_as_historical_evidence",
      reason: "Detached unmerged history remains a recovery source.",
    };
  }
  return {
    disposition: "preserved_deferred_project",
    recovery_value: "medium",
    recommended_action: "retain_until_domain_necessity_review",
    reason: `${sourceKind} contains source-only work not proven safe to archive.`,
  };
}

function countBy(rows, key) {
  const result = {};
  for (const row of rows) {
    const value = row[key] ?? "unknown";
    result[value] = (result[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function markdownTable(counts) {
  return Object.entries(counts).map(([name, count]) => `| ${name} | ${count} |`).join("\n");
}

async function main() {
  const authorityArg = argument("authority", "origin/main");
  const outDir = path.resolve(argument("out-dir", "docs/audits/repository_postmerge_disposition_20260902"));
  const priorLedgerPath = path.resolve(
    argument(
      "prior-ledger",
      "docs/audits/repository_reconciliation_20260902/final_source_ledger.json",
    ),
  );
  const authoritySha = git(["rev-parse", authorityArg]);
  const currentBranch = git(["symbolic-ref", "--quiet", "--short", "HEAD"], {
    allowFailure: true,
  });
  const priorLedger = JSON.parse(readFileSync(priorLedgerPath, "utf8"));
  const priorBySource = new Map(
    priorLedger.rows.map((row) => [
      `${row.source_kind}:${normalizePath(row.source_name)}`,
      row,
    ]),
  );
  const priorBySha = new Map();
  for (const row of priorLedger.rows) {
    if (!priorBySha.has(row.sha)) priorBySha.set(row.sha, row);
  }

  const localBranches = parseRefLines(
    git(["for-each-ref", "--format=%(refname:short)%09%(objectname)", "refs/heads"]),
  );
  const remoteBranches = parseRemoteHeads(git(["ls-remote", "--heads", "origin"]));
  const worktrees = parseWorktrees(git(["worktree", "list", "--porcelain"]))
    .map((worktree) => ({ ...worktree, ...collectWorktreeStatus(worktree) }));
  const pullRequests = JSON.parse(command("gh", [
    "pr",
    "list",
    "--state",
    "all",
    "--limit",
    "1000",
    "--json",
    "number,title,headRefName,baseRefName,state,isDraft,mergedAt,closedAt,mergeCommit,url",
  ]));
  const pullRequestsByHead = new Map();
  for (const pullRequest of pullRequests) {
    const rows = pullRequestsByHead.get(pullRequest.headRefName) ?? [];
    rows.push(pullRequest);
    pullRequestsByHead.set(pullRequest.headRefName, rows);
  }

  const analysisBySha = new Map();
  const cachedAnalysisBySha = new Map();
  const existingJsonLedgerPath = path.join(outDir, "postmerge_disposition_ledger.json");
  const existingJsonlLedgerPath = path.join(outDir, "postmerge_disposition_ledger.jsonl");
  let existingLedger = null;
  if (existsSync(existingJsonLedgerPath)) {
    existingLedger = JSON.parse(readFileSync(existingJsonLedgerPath, "utf8"));
  } else if (existsSync(existingJsonlLedgerPath)) {
    const records = readFileSync(existingJsonlLedgerPath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    existingLedger = {
      ...records.find((record) => record.record_type === "metadata")?.ledger,
      rows: records.filter((record) => record.record_type === "source").map(({ record_type, ...row }) => row),
    };
  }
  if (existingLedger) {
    if (existingLedger.authority_sha === authoritySha) {
      for (const row of existingLedger.rows ?? []) {
        if (cachedAnalysisBySha.has(row.sha)) continue;
        cachedAnalysisBySha.set(row.sha, {
          relationship: row.relationship,
          authority_only_commits: row.authority_only_commits,
          source_only_commits: row.source_only_commits,
          patch_unique_commits: row.patch_unique_commits,
          patch_equivalent_commits: row.patch_equivalent_commits,
          changed_path_count: row.changed_path_count,
          changed_paths: row.changed_paths,
          changed_paths_truncated: row.changed_paths_truncated,
          changed_domains: row.changed_domains,
        });
      }
    }
  }
  function analyzeSha(sha) {
    if (analysisBySha.has(sha)) return analysisBySha.get(sha);
    if (cachedAnalysisBySha.has(sha)) {
      const cached = cachedAnalysisBySha.get(sha);
      analysisBySha.set(sha, cached);
      return cached;
    }
    let relationship = "diverged";
    if (sha === authoritySha) relationship = "equal";
    else if (git(["merge-base", "--is-ancestor", sha, authoritySha], { allowFailure: true }) !== null) {
      relationship = "ancestor";
    } else if (git(["merge-base", "--is-ancestor", authoritySha, sha], { allowFailure: true }) !== null) {
      relationship = "descendant";
    }
    const countsText = git(["rev-list", "--left-right", "--count", `${authoritySha}...${sha}`], {
      allowFailure: true,
    });
    const counts = countsText ? countsText.split(/\s+/).map(Number) : [null, null];
    let patchUniqueCommits = 0;
    let patchEquivalentCommits = 0;
    if (relationship === "descendant" || relationship === "diverged") {
      const cherry = git(["cherry", authoritySha, sha], { allowFailure: true });
      if (cherry === null) {
        patchUniqueCommits = null;
        patchEquivalentCommits = null;
      } else {
        for (const line of cherry.split(/\r?\n/).filter(Boolean)) {
          if (line.startsWith("+")) patchUniqueCommits += 1;
          if (line.startsWith("-")) patchEquivalentCommits += 1;
        }
      }
    }
    let changedPaths = [];
    if (relationship === "descendant" || relationship === "diverged") {
      const mergeBase = git(["merge-base", authoritySha, sha], { allowFailure: true });
      const base = mergeBase || "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
      const output = git(["diff", "--no-renames", "--name-only", base, sha], { allowFailure: true });
      changedPaths = output ? output.split(/\r?\n/).filter(Boolean) : [];
    }
    const prior = priorBySha.get(sha);
    const changedDomains = classifyDomains(changedPaths);
    for (const domain of prior?.changed_domains ?? []) changedDomains.push(domain);
    const result = {
      relationship,
      authority_only_commits: counts[0],
      source_only_commits: counts[1],
      patch_unique_commits: patchUniqueCommits,
      patch_equivalent_commits: patchEquivalentCommits,
      changed_path_count: changedPaths.length || prior?.changed_path_count || 0,
      changed_paths: changedPaths.slice(0, 250),
      changed_paths_truncated: changedPaths.length > 250,
      changed_domains: [...new Set(changedDomains)].sort(),
    };
    analysisBySha.set(sha, result);
    return result;
  }

  const worktreesByBranch = new Map();
  for (const worktree of worktrees) {
    if (!worktree.branch) continue;
    const rows = worktreesByBranch.get(worktree.branch) ?? [];
    rows.push(worktree);
    worktreesByBranch.set(worktree.branch, rows);
  }

  function branchRow(sourceKind, sourceName, sha) {
    const analysis = analyzeSha(sha);
    const linkedWorktrees = worktreesByBranch.get(sourceName) ?? [];
    const pullRequestsForBranch = pullRequestsByHead.get(sourceName) ?? [];
    const openPullRequests = pullRequestsForBranch.filter((row) => row.state === "OPEN");
    const prior = priorBySource.get(`${sourceKind}:${normalizePath(sourceName)}`);
    const decision = classifyDisposition({
      sourceKind,
      sourceName: sourceKind === "remote_branch" ? `origin/${sourceName}` : sourceName,
      branch: sourceName,
      dirty: linkedWorktrees.some((row) => row.dirty === true)
        ? true
        : linkedWorktrees.some((row) => row.dirty === null)
          ? null
          : false,
      detached: false,
      analysis,
      openPullRequests,
      priorDisposition: prior?.final_disposition,
      activeReportBranch: sourceName === currentBranch,
    });
    return {
      source_kind: sourceKind,
      source_name: sourceName,
      sha,
      ...analysis,
      pull_requests: pullRequestsForBranch,
      linked_worktrees: linkedWorktrees.map((row) => ({
        path: row.path,
        dirty: row.dirty,
        status_available: row.status_available,
      })),
      prior_final_disposition: prior?.final_disposition ?? null,
      ...decision,
      delete_authorized: false,
    };
  }

  const branchRows = [
    ...remoteBranches.map((row) => branchRow("remote_branch", row.name, row.sha)),
    ...localBranches.map((row) => branchRow("local_branch", row.name, row.sha)),
  ];
  const worktreeRows = worktrees.map((worktree) => {
    const analysis = analyzeSha(worktree.head);
    const openPullRequests = worktree.branch
      ? (pullRequestsByHead.get(worktree.branch) ?? []).filter((row) => row.state === "OPEN")
      : [];
    const prior = priorBySource.get(`worktree:${normalizePath(worktree.path)}`);
    const decision = classifyDisposition({
      sourceKind: "worktree",
      sourceName: worktree.path,
      branch: worktree.branch,
      dirty: worktree.dirty,
      detached: worktree.detached,
      analysis,
      openPullRequests,
      priorDisposition: prior?.final_disposition,
      activeReportBranch: worktree.branch === currentBranch,
    });
    return {
      source_kind: "worktree",
      source_name: worktree.path,
      branch: worktree.branch ?? null,
      sha: worktree.head,
      detached: worktree.detached,
      prunable: worktree.prunable ?? null,
      status_available: worktree.status_available,
      dirty: worktree.dirty,
      change_count: worktree.change_count,
      change_records: worktree.change_records,
      change_records_truncated: worktree.change_records_truncated ?? false,
      ...analysis,
      open_pull_requests: openPullRequests,
      prior_final_disposition: prior?.final_disposition ?? null,
      ...decision,
      delete_authorized: false,
    };
  });

  const rows = [...branchRows, ...worktreeRows];
  const openPullRequests = pullRequests.filter((row) => row.state === "OPEN");
  const dirtyWorktrees = worktreeRows.filter(
    (row) => row.dirty !== false && row.disposition !== "active_disposition_report",
  );
  const priorDirtyPaths = new Set(
    priorLedger.rows
      .filter((row) => row.source_kind === "worktree" && row.dirty === true)
      .map((row) => normalizePath(row.source_name)),
  );
  const currentDirtyPaths = new Set(dirtyWorktrees.map((row) => normalizePath(row.source_name)));
  const newDirtyWorktrees = [...currentDirtyPaths].filter((value) => !priorDirtyPaths.has(value));
  const noLongerDirtyWorktrees = [...priorDirtyPaths].filter((value) => !currentDirtyPaths.has(value));
  const ledger = {
    schema_version: "GROOKAI_REPOSITORY_POSTMERGE_DISPOSITION_LEDGER_V1",
    generated_at: new Date().toISOString(),
    authority_ref: authorityArg,
    authority_sha: authoritySha,
    active_report_branch: currentBranch,
    prior_ledger: path.relative(process.cwd(), priorLedgerPath).replaceAll("\\", "/"),
    prior_ledger_sha256: sha256(readFileSync(priorLedgerPath)),
    recovery: {
      private_repository: "OriginalSoseji/grookai-vault-reconciliation-recovery-20260902",
      release: "reconciliation-20260902T054000Z",
      bundle_sha256: "72620b82363074027bc6a62d826329c46f5bb1fdc9bb7ffac3a385c5a311f441",
      premerge_main_tag: "reconciliation-20260902-premerge-main",
      candidate_tag: "reconciliation-20260902-candidate",
    },
    boundaries: {
      source_deletions: 0,
      worktree_removals: 0,
      branch_rewrites: 0,
      database_writes: 0,
      storage_writes: 0,
      delete_authorized_rows: 0,
    },
    counts: {
      local_branches: localBranches.length,
      remote_branches: remoteBranches.length,
      worktrees: worktrees.length,
      total_rows: rows.length,
      unique_source_shas: analysisBySha.size,
      open_pull_requests: openPullRequests.length,
      dirty_or_unreadable_worktrees: dirtyWorktrees.length,
      prior_preserved_dirty_worktrees: priorDirtyPaths.size,
      new_dirty_worktrees_since_preservation: newDirtyWorktrees.length,
      no_longer_dirty_worktrees_since_preservation: noLongerDirtyWorktrees.length,
      dispositions: countBy(rows, "disposition"),
      recovery_value: countBy(rows, "recovery_value"),
      source_kind: countBy(rows, "source_kind"),
    },
    open_pull_requests: openPullRequests,
    dirty_worktree_comparison: {
      prior_preserved_paths: [...priorDirtyPaths].sort(),
      current_paths: [...currentDirtyPaths].sort(),
      new_since_preservation: newDirtyWorktrees.sort(),
      no_longer_dirty_since_preservation: noLongerDirtyWorktrees.sort(),
      exact_path_set_match:
        newDirtyWorktrees.length === 0 && noLongerDirtyWorktrees.length === 0,
    },
    dirty_or_unreadable_worktrees: dirtyWorktrees.map((row) => ({
      path: row.source_name,
      branch: row.branch,
      sha: row.sha,
      dirty: row.dirty,
      status_available: row.status_available,
      change_count: row.change_count,
      change_records: row.change_records,
    })),
    rows,
  };

  mkdirSync(outDir, { recursive: true });
  const ledgerPath = path.join(outDir, "postmerge_disposition_ledger.jsonl");
  const { rows: ledgerRows, ...ledgerMetadata } = ledger;
  const ledgerRecords = [
    JSON.stringify({ record_type: "metadata", ledger: ledgerMetadata }),
    ...ledgerRows.map((row) => JSON.stringify({ record_type: "source", ...row })),
  ];
  writeFileSync(ledgerPath, `${ledgerRecords.join("\n")}\n`);
  if (existsSync(existingJsonLedgerPath)) rmSync(existingJsonLedgerPath);
  const report = `# Repository Post-Merge Disposition Report V1

Status: COMPLETE - NON-DESTRUCTIVE CLASSIFICATION ONLY

Date: 2026-09-02 (America/Denver)

## Authority

- Current authority: \`${authorityArg}\`
- Authority SHA: \`${authoritySha}\`
- Recovery repository: \`${ledger.recovery.private_repository}\`
- Recovery release: \`${ledger.recovery.release}\`
- Recovery bundle SHA-256: \`${ledger.recovery.bundle_sha256}\`

## Inventory

| Source kind | Count |
| --- | ---: |
${markdownTable(ledger.counts.source_kind)}

- Unique source SHAs: \`${ledger.counts.unique_source_shas}\`
- Open pull requests: \`${ledger.counts.open_pull_requests}\`
- Dirty or unreadable worktrees: \`${ledger.counts.dirty_or_unreadable_worktrees}\`
- Preserved dirty-worktree path set unchanged: \`${ledger.dirty_worktree_comparison.exact_path_set_match}\`

## Dispositions

| Disposition | Count |
| --- | ---: |
${markdownTable(ledger.counts.dispositions)}

Every row has \`delete_authorized: false\`. Archive recommendations are planning
metadata only and do not authorize deleting a branch, tag, worktree, directory,
artifact, pull request, or recovery object.

## Open Pull Requests

${openPullRequests.map((row) => `- #${row.number} \`${row.headRefName}\`: ${row.title} (${row.isDraft ? "draft" : "open"})`).join("\n") || "- None"}

## Dirty Or Unreadable Worktrees

${dirtyWorktrees.map((row) => `- \`${row.source_name}\` - branch \`${row.branch ?? "detached"}\` - ${row.dirty === true ? `${row.change_count} status records` : "status unavailable"}`).join("\n") || "- None"}

These worktrees remain untouched. Their original preservation snapshots and the
off-machine recovery bundle remain the restoration authority.

## Decisions

1. Keep \`main\`, both reconciliation tags, the private recovery release, and
   \`integration/reconciled-main-v1\` as named restore points.
2. Keep dirty, unreadable, detached-unmerged, migration-bearing, and open-PR
   sources unchanged.
3. Treat contained or patch-equivalent clean branches only as future archive
   candidates. No deletion is approved by this report.
4. Keep PR #118 deferred behind the Visual Search human-calibration gate.
5. Keep PR #219 deferred behind the unapplied MTG sealed migration gate.
6. Do not remove worktrees until a separate owner-approved archival execution
   proves every selected source is clean, contained, restorable, and absent from
   active automation.

## Next Gate

Create an owner-readable archival candidate packet from only clean,
main-contained sources. That packet may propose branch/worktree cleanup but must
not execute deletion. Active work, dirty worktrees, migration history, detached
recovery points, open PRs, and named reconciliation restore points remain out of
scope.
`;
  const reportPath = path.join(outDir, "REPOSITORY_POSTMERGE_DISPOSITION_REPORT_V1.md");
  writeFileSync(reportPath, report);
  const hashes = {
    schema_version: "GROOKAI_REPOSITORY_POSTMERGE_DISPOSITION_ARTIFACT_HASHES_V1",
    generated_at: new Date().toISOString(),
    files: {
      "postmerge_disposition_ledger.jsonl": sha256(readFileSync(ledgerPath)),
      "REPOSITORY_POSTMERGE_DISPOSITION_REPORT_V1.md": sha256(readFileSync(reportPath)),
    },
  };
  writeFileSync(path.join(outDir, "artifact_hashes.json"), `${JSON.stringify(hashes, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ authority_sha: authoritySha, ...ledger.counts }, null, 2)}\n`);
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
