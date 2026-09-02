import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_LEDGER_PATH =
  "docs/audits/repository_postmerge_disposition_20260902/postmerge_disposition_ledger.jsonl";
const DEFAULT_OUTPUT_DIR = "docs/audits/repository_archive_candidate_packet_20260902";
const ARCHIVE_READY_DISPOSITIONS = new Set([
  "contained_in_main",
  "patch_equivalent_to_main",
]);
const PROTECTED_BRANCHES = new Set([
  "main",
  "integration/reconciled-main-v1",
  "docs/repository-postmerge-disposition-v1",
  "docs/repository-archive-candidate-packet-v1",
]);

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function command(binary, args, { cwd, allowFailure = false, input } = {}) {
  try {
    return execFileSync(binary, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 256 * 1024 * 1024,
      input,
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function git(args, options = {}) {
  return command("git", args, options);
}

function commandResult(binary, args, { cwd, input } = {}) {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 256 * 1024 * 1024,
    input,
  });
  return {
    status: result.status,
    stdout: result.stdout?.trim() ?? "",
    error_code: result.error?.code ?? null,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))].sort();
}

function parseJsonArray(value) {
  if (!value) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function loadSourceLedger(repoRoot, ledgerPath, ledgerRef) {
  if (existsSync(path.join(repoRoot, ledgerPath))) {
    return readFileSync(path.join(repoRoot, ledgerPath), "utf8");
  }
  const fromGit = git(["show", `${ledgerRef}:${ledgerPath}`], { cwd: repoRoot, allowFailure: true });
  if (fromGit === null) {
    throw new Error(`Unable to read source ledger at ${ledgerPath} or ${ledgerRef}:${ledgerPath}`);
  }
  return `${fromGit}\n`;
}

export function buildBranchGroups(rows) {
  const groups = new Map();

  for (const row of rows) {
    let branchName = null;
    if (row.source_kind === "local_branch") branchName = row.source_name;
    if (row.source_kind === "remote_branch") {
      branchName = row.source_name.replace(/^origin\//, "");
    }
    if (row.source_kind === "worktree") branchName = row.branch ?? null;

    const key = branchName
      ? `branch:${branchName}`
      : `detached:${normalizePath(row.source_name)}:${row.sha}`;
    if (!groups.has(key)) {
      groups.set(key, {
        group_id: key,
        branch_name: branchName,
        detached: branchName === null || row.detached === true,
        rows: [],
      });
    }
    groups.get(key).rows.push(row);
  }

  return [...groups.values()]
    .map((group) => {
      const worktreeRows = group.rows.filter((row) => row.source_kind === "worktree");
      const pullRequests = new Map();
      for (const pullRequest of group.rows.flatMap((row) => row.pull_requests ?? [])) {
        pullRequests.set(pullRequest.number, pullRequest);
      }
      return {
        group_id: group.group_id,
        branch_name: group.branch_name,
        detached: group.detached,
        local_refs: unique(
          group.rows
            .filter((row) => row.source_kind === "local_branch")
            .map((row) => row.source_name),
        ),
        remote_refs: unique(
          group.rows
            .filter((row) => row.source_kind === "remote_branch")
            .map((row) => row.source_name),
        ),
        worktrees: worktreeRows.map((row) => ({
          path: row.source_name,
          sha: row.sha,
          dirty: row.dirty,
          status_available: row.status_available,
          detached: row.detached === true,
        })),
        source_shas: unique(group.rows.map((row) => row.sha)),
        dispositions: unique(group.rows.map((row) => row.disposition)),
        relationships: unique(group.rows.map((row) => row.relationship)),
        changed_domains: unique(group.rows.flatMap((row) => row.changed_domains ?? [])),
        pull_requests: [...pullRequests.values()].sort((a, b) => a.number - b.number),
        source_rows: group.rows.map((row) => ({
          source_kind: row.source_kind,
          source_name: row.source_name,
          sha: row.sha,
          disposition: row.disposition,
          relationship: row.relationship,
          dirty: row.dirty ?? null,
          status_available: row.status_available ?? null,
          delete_authorized: false,
        })),
      };
    })
    .sort((a, b) => a.group_id.localeCompare(b.group_id));
}

function referenceTokens(groups) {
  const tokenMap = new Map();
  for (const group of groups) {
    const tokens = [
      group.branch_name,
      ...group.worktrees.map((worktree) => normalizePath(worktree.path)),
    ].filter((token) => token && token.length >= 5 && token !== "main");
    for (const token of tokens) {
      const normalized = normalizePath(token);
      if (!tokenMap.has(normalized)) tokenMap.set(normalized, new Set());
      tokenMap.get(normalized).add(group.group_id);
    }
  }
  return tokenMap;
}

export function matchReferences(value, tokenMap) {
  const normalizedValue = normalizePath(value);
  const matches = [];
  for (const [token, groupIds] of tokenMap) {
    let matched = false;
    let offset = normalizedValue.indexOf(token);
    while (offset !== -1) {
      const before = offset === 0 ? "" : normalizedValue[offset - 1];
      const afterOffset = offset + token.length;
      const after = afterOffset >= normalizedValue.length ? "" : normalizedValue[afterOffset];
      const pathToken = /^[a-z]:\//.test(token) || token.startsWith("/");
      const validBefore = pathToken || before === "" || !/[a-z0-9_.\/-]/i.test(before);
      const validAfter = pathToken
        ? after === "" || /[\\/\s"',;:)}\]]/.test(after)
        : after === "" || !/[a-z0-9_.\/-]/i.test(after);
      if (validBefore && validAfter) {
        matched = true;
        break;
      }
      offset = normalizedValue.indexOf(token, offset + 1);
    }
    if (!matched) continue;
    for (const groupId of groupIds) matches.push({ group_id: groupId, matched_token: token });
  }
  return matches;
}

export function scanRepositoryReferences(repoRoot, groups, authorityRef = "HEAD") {
  const tokenMap = referenceTokens(groups);
  const files = git(
    ["ls-tree", "-r", "--name-only", authorityRef, "--", ".github", "scripts", "package.json"],
    { cwd: repoRoot },
  ).split(/\r?\n/).filter(Boolean);
  const findings = [];

  const grepResult = commandResult(
    "git",
    [
      "grep",
      "-n",
      "-I",
      "-i",
      "-F",
      "-f",
      "-",
      authorityRef,
      "--",
      ".github",
      "scripts",
      "package.json",
    ],
    {
      cwd: repoRoot,
      input: `${[...tokenMap.keys()].join("\n")}\n`,
    },
  );
  if (![0, 1].includes(grepResult.status)) {
    return {
      status: "unavailable",
      scanned_ref: authorityRef,
      scanned_file_count: files.length,
      error_code: grepResult.error_code ?? `git_grep_exit_${grepResult.status ?? "unknown"}`,
      findings: [],
    };
  }
  for (const resultLine of grepResult.stdout.split(/\r?\n/).filter(Boolean)) {
    const lineWithoutRef = resultLine.startsWith(`${authorityRef}:`)
      ? resultLine.slice(authorityRef.length + 1)
      : resultLine;
    const firstSeparator = lineWithoutRef.indexOf(":");
    const secondSeparator = lineWithoutRef.indexOf(":", firstSeparator + 1);
    if (firstSeparator === -1 || secondSeparator === -1) continue;
    const file = lineWithoutRef.slice(0, firstSeparator);
    const line = Number(lineWithoutRef.slice(firstSeparator + 1, secondSeparator));
    const content = lineWithoutRef.slice(secondSeparator + 1);
    for (const match of matchReferences(content, tokenMap)) {
      findings.push({
        ...match,
        reference_kind: "repository_active_code",
        file,
        line,
      });
    }
  }

  return {
    status: "available",
    scanned_ref: authorityRef,
    scanned_file_count: files.length,
    findings,
  };
}

export function scanScheduledTaskReferences(groups) {
  const tokenMap = referenceTokens(groups);
  const script = [
    "$rows = @()",
    "Get-ScheduledTask | ForEach-Object {",
    "  $task = $_",
    "  foreach ($action in @($task.Actions)) {",
    "    $rows += [pscustomobject]@{ task_path=$task.TaskPath; task_name=$task.TaskName; execute=$action.Execute; arguments=$action.Arguments; working_directory=$action.WorkingDirectory }",
    "  }",
    "}",
    "$rows | ConvertTo-Json -Depth 5 -Compress",
  ].join("; ");
  const raw = command("powershell.exe", ["-NoProfile", "-Command", script], { allowFailure: true });
  if (raw === null) return { status: "unavailable", findings: [] };

  const findings = [];
  for (const task of parseJsonArray(raw)) {
    for (const [field, value] of [
      ["execute", task.execute],
      ["arguments", task.arguments],
      ["working_directory", task.working_directory],
    ]) {
      for (const match of matchReferences(value, tokenMap)) {
        findings.push({
          ...match,
          reference_kind: "windows_scheduled_task",
          task_path: task.task_path,
          task_name: task.task_name,
          matched_field: field,
        });
      }
    }
  }
  return { status: "available", findings };
}

export function scanRunningProcessReferences(groups) {
  const tokenMap = referenceTokens(groups);
  const script = [
    "Get-CimInstance Win32_Process",
    "Select-Object ProcessId,Name,CommandLine",
    "ConvertTo-Json -Depth 3 -Compress",
  ].join(" | ");
  const raw = command("powershell.exe", ["-NoProfile", "-Command", script], { allowFailure: true });
  if (raw === null) return { status: "unavailable", findings: [] };

  const findings = [];
  for (const process of parseJsonArray(raw)) {
    for (const match of matchReferences(process.CommandLine, tokenMap)) {
      findings.push({
        ...match,
        reference_kind: "running_process",
        process_id: process.ProcessId,
        process_name: process.Name,
      });
    }
  }
  return { status: "available", findings };
}

function findingsByGroup(...inventories) {
  const grouped = new Map();
  for (const inventory of inventories) {
    for (const finding of inventory.findings) {
      if (!grouped.has(finding.group_id)) grouped.set(finding.group_id, []);
      grouped.get(finding.group_id).push(finding);
    }
  }
  return grouped;
}

export function evaluateArchiveGroup(group, context) {
  const reasons = [];
  const currentOpenPullRequests = context.openPullRequests.filter(
    (pullRequest) => pullRequest.headRefName === group.branch_name,
  );
  const references = context.referencesByGroup.get(group.group_id) ?? [];
  const referenceKinds = new Set(references.map((reference) => reference.reference_kind));

  if (!group.branch_name) reasons.push("missing_branch_identity");
  if (group.detached || group.worktrees.some((worktree) => worktree.detached)) {
    reasons.push("detached_source");
  }
  if (PROTECTED_BRANCHES.has(group.branch_name)) reasons.push("protected_branch_or_restore_point");
  if (group.source_rows.some((row) => row.source_name === "origin/main")) {
    reasons.push("protected_authority");
  }
  if (
    group.dispositions.some((disposition) =>
      [
        "accepted_reconciliation_restore_point",
        "active_disposition_report",
        "contained_historical_evidence",
        "protected_authority",
        "reconciled_source_evidence",
      ].includes(disposition),
    )
  ) {
    reasons.push("protected_provenance_or_historical_evidence");
  }
  if (
    group.worktrees.some(
      (worktree) => worktree.dirty !== false || worktree.status_available !== true,
    )
  ) {
    reasons.push("dirty_or_unreadable_worktree");
  }
  if (group.changed_domains.includes("migration")) reasons.push("migration_bearing_source");
  if (currentOpenPullRequests.length > 0) reasons.push("open_pull_request");
  if (!group.dispositions.every((disposition) => ARCHIVE_READY_DISPOSITIONS.has(disposition))) {
    reasons.push("non_archive_ready_disposition");
  }
  if (referenceKinds.has("repository_active_code")) reasons.push("repository_automation_reference");
  if (referenceKinds.has("windows_scheduled_task")) reasons.push("scheduled_task_reference");
  if (referenceKinds.has("running_process")) reasons.push("running_process_reference");
  if (context.repositoryStatus !== "available") {
    reasons.push("repository_reference_inventory_unavailable");
  }
  if (context.openPullRequestStatus !== "available") {
    reasons.push("open_pull_request_inventory_unavailable");
  }
  if (context.scheduledTaskStatus !== "available") {
    reasons.push("scheduled_task_inventory_unavailable");
  }
  if (context.runningProcessStatus !== "available") {
    reasons.push("running_process_inventory_unavailable");
  }

  const exclusionReasons = unique(reasons);
  return {
    ...group,
    current_open_pull_requests: currentOpenPullRequests,
    automation_references: references,
    classification: exclusionReasons.length === 0 ? "owner_review_candidate" : "excluded",
    exclusion_reasons: exclusionReasons,
    proposed_actions: {
      pre_archive_bundle_required: true,
      remove_clean_worktrees_after_explicit_owner_approval: group.worktrees.map(
        (worktree) => worktree.path,
      ),
      archive_local_branches_after_explicit_owner_approval: group.local_refs,
      archive_remote_branches_after_explicit_owner_approval: group.remote_refs,
      delete_authorized: false,
    },
    delete_authorized: false,
  };
}

function readCurrentOpenPullRequests(repoRoot, sourceMetadata) {
  const raw = command(
    "gh",
    [
      "pr",
      "list",
      "--state",
      "open",
      "--limit",
      "1000",
      "--json",
      "number,headRefName,baseRefName,isDraft,title,url,state",
    ],
    { cwd: repoRoot, allowFailure: true },
  );
  if (raw === null) {
    return {
      status: "unavailable",
      rows: [],
      source_ledger_snapshot_count: sourceMetadata.open_pull_requests?.length ?? 0,
    };
  }
  return { status: "available", rows: parseJsonArray(raw) };
}

function summarizeBy(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function actionShape(record) {
  const parts = [];
  if (record.worktrees.length > 0) parts.push(`${record.worktrees.length} worktree`);
  if (record.local_refs.length > 0) parts.push(`${record.local_refs.length} local`);
  if (record.remote_refs.length > 0) parts.push(`${record.remote_refs.length} remote`);
  return parts.join(", ") || "no named ref";
}

function renderReport({ metadata, candidates, exclusions, automationInventory }) {
  const candidateRows = candidates.map(
    (record, index) =>
      `| ${index + 1} | \`${record.branch_name}\` | ${actionShape(record)} | ${record.dispositions.join(", ")} |`,
  );
  const exclusionCounts = summarizeBy(exclusions.flatMap((record) => record.exclusion_reasons));
  const exclusionRows = Object.entries(exclusionCounts).map(
    ([reason, count]) => `| \`${reason}\` | ${count} |`,
  );

  return `# Repository Archive Candidate Packet V1

## Decision Boundary

This packet is a read-only planning artifact. It authorizes no branch deletion,
worktree removal, tag mutation, directory cleanup, PR closure, database write,
or Storage write.

**NO DELETION IS AUTHORIZED.**

## Provenance

- Generated: \`${metadata.generated_at}\`
- Frozen repository SHA: \`${metadata.authority_sha}\`
- Frozen branch: \`${metadata.authority_branch}\`
- Source ledger: \`${metadata.source_ledger_path}\`
- Source ledger SHA-256: \`${metadata.source_ledger_sha256}\`
- Source groups reviewed: \`${metadata.counts.total_groups}\`
- Owner-review candidates: \`${metadata.counts.candidates}\`
- Protected exclusions: \`${metadata.counts.exclusions}\`

## Automation Readback

| Inventory | Status | Findings |
|---|---:|---:|
| Repository active code | ${automationInventory.repository.status} | ${automationInventory.repository.findings.length} |
| Windows scheduled tasks | ${automationInventory.scheduled_tasks.status} | ${automationInventory.scheduled_tasks.findings.length} |
| Running processes | ${automationInventory.running_processes.status} | ${automationInventory.running_processes.findings.length} |

Only file names, task identities, process identities, and matched tokens are
retained. Task arguments and process command lines are not persisted.

## Owner-Review Candidates

These sources are clean in the source ledger, contain no migration domain, have
no current open PR, are main-contained or patch-equivalent, and have no detected
active automation reference. They remain proposals only.

| # | Branch | Proposed action shape | Source disposition |
|---:|---|---|---|
${candidateRows.join("\n") || "| - | None | - | - |"}

Machine-readable detail, including every underlying source row and proposed
action, is in \`archive_candidates.jsonl\`.

## Protected Exclusions

| Exclusion reason | Branch groups |
|---|---:|
${exclusionRows.join("\n")}

Every excluded group and its complete reason set is in
\`archive_exclusions.jsonl\`.

## Candidate Rules

A branch group can appear as a candidate only when all of these are proven:

1. It has a named, non-protected branch.
2. Every grouped source is \`contained_in_main\` or \`patch_equivalent_to_main\`.
3. Every linked worktree was clean and readable in the source ledger.
4. No grouped source contains migration-domain changes.
5. No current open pull request uses the branch.
6. No active repository code, Windows scheduled task, or running process refers
   to the branch or its worktree paths.

Uncertainty always becomes an exclusion, never a candidate.

## Future Destructive Gate

This packet deliberately stops before cleanup. Any later archive execution must
be a separately authorized project that:

1. Freezes exact candidate IDs and hashes.
2. Creates and verifies a fresh off-machine recovery bundle.
3. Rechecks clean state, Git containment, open PRs, scheduled tasks, running
   processes, and repository automation references.
4. Receives explicit owner approval for the exact action plan.
5. Changes only the approved clean worktrees and refs.
6. Verifies restoration from the recovery bundle and confirms no active system
   was affected.
`;
}

function writeJsonl(file, metadata, rows) {
  const content = [
    JSON.stringify({ record_type: "metadata", packet: metadata }),
    ...rows.map((row) => JSON.stringify({ record_type: "branch_group", ...row })),
  ].join("\n") + "\n";
  writeFileSync(file, content);
}

export function main() {
  const repoRoot = path.resolve(argument("repo-root", process.cwd()));
  const sourceLedgerPath = argument("source-ledger", DEFAULT_LEDGER_PATH);
  const sourceLedgerRef = argument("source-ledger-ref", "origin/main");
  const outputDirRelative = argument("out-dir", DEFAULT_OUTPUT_DIR);
  const outputDir = path.resolve(repoRoot, outputDirRelative);
  const sourceLedgerText = loadSourceLedger(repoRoot, sourceLedgerPath, sourceLedgerRef);
  const sourceRecords = sourceLedgerText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const sourceMetadata = sourceRecords.find((record) => record.record_type === "metadata")?.ledger;
  if (!sourceMetadata) throw new Error("Source disposition ledger is missing metadata.");
  const sourceRows = sourceRecords
    .filter((record) => record.record_type === "source")
    .map(({ record_type, ...row }) => row);
  const groups = buildBranchGroups(sourceRows);
  const authoritySha = git(["rev-parse", "HEAD"], { cwd: repoRoot });
  const authorityBranch = git(["branch", "--show-current"], { cwd: repoRoot });
  const openPullRequests = readCurrentOpenPullRequests(repoRoot, sourceMetadata);
  const repository = scanRepositoryReferences(repoRoot, groups, "HEAD");
  const scheduledTasks = scanScheduledTaskReferences(groups);
  const runningProcesses = scanRunningProcessReferences(groups);
  const referencesByGroup = findingsByGroup(repository, scheduledTasks, runningProcesses);

  const evaluated = groups.map((group) =>
    evaluateArchiveGroup(group, {
      openPullRequests: openPullRequests.rows,
      referencesByGroup,
      repositoryStatus: repository.status,
      openPullRequestStatus: openPullRequests.status,
      scheduledTaskStatus: scheduledTasks.status,
      runningProcessStatus: runningProcesses.status,
    }),
  );
  const candidates = evaluated.filter((record) => record.classification === "owner_review_candidate");
  const exclusions = evaluated.filter((record) => record.classification === "excluded");
  const metadata = {
    schema_version: "GROOKAI_REPOSITORY_ARCHIVE_CANDIDATE_PACKET_V1",
    generated_at: new Date().toISOString(),
    authority_sha: authoritySha,
    authority_branch: authorityBranch,
    source_ledger_path: sourceLedgerPath,
    source_ledger_ref: sourceLedgerRef,
    source_ledger_sha256: sha256(sourceLedgerText),
    open_pull_request_inventory_status: openPullRequests.status,
    counts: {
      source_rows: sourceRows.length,
      total_groups: groups.length,
      candidates: candidates.length,
      exclusions: exclusions.length,
      candidate_action_shapes: summarizeBy(candidates.map(actionShape)),
      exclusion_reasons: summarizeBy(exclusions.flatMap((record) => record.exclusion_reasons)),
    },
    boundaries: {
      source_deletions: 0,
      worktree_removals: 0,
      branch_mutations: 0,
      tag_mutations: 0,
      pull_request_mutations: 0,
      database_writes: 0,
      storage_writes: 0,
      delete_authorized_records: 0,
    },
    next_gate: "explicitly_authorized_pre_archive_recovery_and_execution_plan",
  };
  const automationInventory = {
    schema_version: "GROOKAI_REPOSITORY_AUTOMATION_REFERENCE_INVENTORY_V1",
    generated_at: metadata.generated_at,
    authority_sha: authoritySha,
    repository,
    scheduled_tasks: scheduledTasks,
    running_processes: runningProcesses,
    persisted_data_boundary:
      "No task arguments or process command lines are persisted in this artifact.",
  };

  mkdirSync(outputDir, { recursive: true });
  writeJsonl(path.join(outputDir, "archive_candidates.jsonl"), metadata, candidates);
  writeJsonl(path.join(outputDir, "archive_exclusions.jsonl"), metadata, exclusions);
  writeFileSync(
    path.join(outputDir, "automation_reference_findings.json"),
    `${JSON.stringify(automationInventory, null, 2)}\n`,
  );
  writeFileSync(
    path.join(outputDir, "REPOSITORY_ARCHIVE_CANDIDATE_PACKET_V1.md"),
    renderReport({ metadata, candidates, exclusions, automationInventory }),
  );

  const hashFiles = [
    "REPOSITORY_ARCHIVE_CANDIDATE_PACKET_V1.md",
    "archive_candidates.jsonl",
    "archive_exclusions.jsonl",
    "automation_reference_findings.json",
  ];
  const hashes = Object.fromEntries(
    hashFiles.map((file) => [file, sha256(readFileSync(path.join(outputDir, file)))]),
  );
  writeFileSync(
    path.join(outputDir, "artifact_hashes.json"),
    `${JSON.stringify({
      schema_version: "GROOKAI_REPOSITORY_ARCHIVE_CANDIDATE_ARTIFACT_HASHES_V1",
      generated_at: metadata.generated_at,
      authority_sha: authoritySha,
      files: hashes,
    }, null, 2)}\n`,
  );

  process.stdout.write(`${JSON.stringify({ metadata, output_dir: outputDirRelative }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
