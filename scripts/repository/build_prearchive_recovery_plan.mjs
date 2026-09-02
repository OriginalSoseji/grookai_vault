import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  scanRepositoryReferences,
  scanRunningProcessReferences,
  scanScheduledTaskReferences,
} from "./build_archive_candidate_packet.mjs";

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_CANDIDATE_PATH =
  "docs/audits/repository_archive_candidate_packet_20260902/archive_candidates.jsonl";
const DEFAULT_AUDIT_DIR = "docs/audits/repository_prearchive_recovery_20260902";
const DEFAULT_RECOVERY_ROOT = "C:/grookai_recovery_bundles";
const DEFAULT_RECOVERY_REPOSITORY =
  "OriginalSoseji/grookai-vault-reconciliation-recovery-20260902";

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function command(binary, args, { cwd, allowFailure = false, input } = {}) {
  try {
    return execFileSync(binary, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 512 * 1024 * 1024,
      input,
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function commandResult(binary, args, { cwd, input } = {}) {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 512 * 1024 * 1024,
    input,
  });
  return {
    status: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    error_code: result.error?.code ?? null,
  };
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

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))].sort();
}

function loadGitBackedFile(repoRoot, file, ref) {
  const localPath = path.join(repoRoot, file);
  if (existsSync(localPath)) return readFileSync(localPath, "utf8");
  const content = git(["show", `${ref}:${file}`], { cwd: repoRoot, allowFailure: true });
  if (content === null) throw new Error(`Unable to read ${file} from disk or ${ref}.`);
  return `${content}\n`;
}

function parseJsonl(value) {
  return value.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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
    const separator = line.indexOf(" ");
    const key = separator === -1 ? line : line.slice(0, separator);
    const data = separator === -1 ? true : line.slice(separator + 1);
    if (key === "worktree") row = { path: data, detached: false };
    else if (row && key === "HEAD") row.sha = data;
    else if (row && key === "branch") row.branch = data.replace("refs/heads/", "");
    else if (row && key === "detached") row.detached = true;
  }
  return rows;
}

function currentOpenPullRequests(repoRoot) {
  const result = commandResult(
    "gh",
    [
      "pr", "list", "--state", "open", "--limit", "1000", "--json",
      "number,headRefName,baseRefName,isDraft,title,url,state",
    ],
    { cwd: repoRoot },
  );
  if (result.status !== 0) return { status: "unavailable", rows: [] };
  return { status: "available", rows: JSON.parse(result.stdout || "[]") };
}

function currentRemoteHeads(repoRoot) {
  const result = commandResult("git", ["ls-remote", "--heads", "origin"], { cwd: repoRoot });
  if (result.status !== 0) return { status: "unavailable", rows: new Map() };
  const rows = new Map(
    result.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
      const [sha, ref] = line.split(/\s+/);
      return [ref.replace("refs/heads/", ""), sha];
    }),
  );
  return { status: "available", rows };
}

function refSha(repoRoot, ref) {
  const result = commandResult("git", ["rev-parse", "--verify", ref], { cwd: repoRoot });
  return result.status === 0 ? result.stdout : null;
}

function relationshipToAuthority(repoRoot, sha, authorityRef) {
  const ancestor = commandResult(
    "git",
    ["merge-base", "--is-ancestor", sha, authorityRef],
    { cwd: repoRoot },
  );
  if (ancestor.status === 0) return { status: "contained_in_authority", patch_unique_commits: 0 };
  if (ancestor.status !== 1) return { status: "unavailable", patch_unique_commits: null };
  const uniquePatches = commandResult(
    "git",
    [
      "log", "--cherry-pick", "--right-only", "--pretty=format:%H",
      `${authorityRef}...${sha}`,
    ],
    { cwd: repoRoot },
  );
  if (uniquePatches.status !== 0) return { status: "unavailable", patch_unique_commits: null };
  const rows = uniquePatches.stdout.split(/\r?\n/).filter(Boolean);
  return rows.length === 0
    ? { status: "patch_equivalent_to_authority", patch_unique_commits: 0 }
    : { status: "diverged_with_unique_patches", patch_unique_commits: rows.length };
}

function sourceRow(candidate, kind, name) {
  return candidate.source_rows.find(
    (row) => row.source_kind === kind && row.source_name === name,
  );
}

function collectLiveEvidence(repoRoot, candidate, authorityRef, liveWorktrees, remoteHeads) {
  const refs = [];
  const worktrees = [];
  for (const localRef of candidate.local_refs) {
    const fullRef = `refs/heads/${localRef}`;
    const currentSha = refSha(repoRoot, fullRef);
    const expected = sourceRow(candidate, "local_branch", localRef);
    refs.push({
      ref_kind: "local_branch",
      display_ref: localRef,
      full_ref: fullRef,
      expected_sha: expected?.sha ?? null,
      current_sha: currentSha,
      exists: currentSha !== null,
      sha_matches: currentSha !== null && currentSha === expected?.sha,
      relationship: currentSha
        ? relationshipToAuthority(repoRoot, currentSha, authorityRef)
        : { status: "missing", patch_unique_commits: null },
    });
  }
  for (const remoteRef of candidate.remote_refs) {
    const remoteBranchName = remoteRef.replace(/^origin\//, "");
    const fullRef = `refs/remotes/origin/${remoteBranchName}`;
    const localTrackingSha = refSha(repoRoot, fullRef);
    const currentSha = remoteHeads.rows.get(remoteBranchName) ?? null;
    const expected = sourceRow(candidate, "remote_branch", remoteRef);
    refs.push({
      ref_kind: "remote_branch",
      display_ref: remoteRef,
      full_ref: fullRef,
      expected_sha: expected?.sha ?? null,
      current_sha: currentSha,
      local_tracking_sha: localTrackingSha,
      exists: currentSha !== null && localTrackingSha !== null,
      sha_matches:
        currentSha !== null &&
        currentSha === expected?.sha &&
        localTrackingSha === expected?.sha,
      relationship: currentSha
        ? relationshipToAuthority(repoRoot, currentSha, authorityRef)
        : { status: "missing", patch_unique_commits: null },
    });
  }
  for (const expectedWorktree of candidate.worktrees) {
    const live = liveWorktrees.find(
      (worktree) => normalizePath(worktree.path) === normalizePath(expectedWorktree.path),
    );
    const status = live
      ? commandResult(
          "git",
          ["-C", live.path, "status", "--porcelain=v1", "--untracked-files=normal"],
          { cwd: repoRoot },
        )
      : { status: null, stdout: "" };
    worktrees.push({
      path: expectedWorktree.path,
      expected_sha: expectedWorktree.sha,
      current_sha: live?.sha ?? null,
      expected_branch: candidate.branch_name,
      current_branch: live?.branch ?? null,
      exists: Boolean(live),
      detached: live?.detached ?? null,
      status_available: live ? status.status === 0 : false,
      dirty: live && status.status === 0 ? status.stdout.length > 0 : null,
      sha_matches: Boolean(live) && live.sha === expectedWorktree.sha,
      branch_matches: Boolean(live) && live.branch === candidate.branch_name,
    });
  }
  return { refs, worktrees };
}

export function evaluateRevalidatedCandidate(candidate, evidence) {
  const reasons = [];
  if (candidate.delete_authorized !== false) reasons.push("candidate_boundary_invalid");
  if (candidate.changed_domains.includes("migration")) reasons.push("migration_domain_present");
  if (candidate.exclusion_reasons.length > 0) reasons.push("prior_candidate_has_exclusions");
  if (evidence.openPullRequestStatus !== "available") reasons.push("open_pull_request_inventory_unavailable");
  if (evidence.repositoryStatus !== "available") reasons.push("repository_reference_inventory_unavailable");
  if (evidence.scheduledTaskStatus !== "available") reasons.push("scheduled_task_inventory_unavailable");
  if (evidence.runningProcessStatus !== "available") reasons.push("running_process_inventory_unavailable");
  if (candidate.remote_refs.length > 0 && evidence.remoteHeadStatus !== "available") reasons.push("remote_head_inventory_unavailable");
  if (evidence.openPullRequests.length > 0) reasons.push("current_open_pull_request");
  if (evidence.automationReferences.length > 0) reasons.push("current_automation_reference");
  if (evidence.refs.length === 0) reasons.push("no_named_refs_available");
  if (evidence.refs.some((ref) => !ref.exists)) reasons.push("named_ref_missing");
  if (evidence.refs.some((ref) => !ref.sha_matches)) reasons.push("named_ref_moved_since_packet");
  if (evidence.refs.some((ref) => !["contained_in_authority", "patch_equivalent_to_authority"].includes(ref.relationship.status))) {
    reasons.push("named_ref_not_recovery_safe");
  }
  if (evidence.worktrees.some((worktree) => !worktree.exists)) reasons.push("worktree_missing");
  if (evidence.worktrees.some((worktree) => !worktree.status_available)) reasons.push("worktree_status_unavailable");
  if (evidence.worktrees.some((worktree) => worktree.dirty !== false)) reasons.push("worktree_not_clean");
  if (evidence.worktrees.some((worktree) => !worktree.sha_matches)) reasons.push("worktree_head_moved_since_packet");
  if (evidence.worktrees.some((worktree) => !worktree.branch_matches || worktree.detached)) reasons.push("worktree_branch_changed");
  return {
    ...candidate,
    revalidation: evidence,
    selection_status: reasons.length === 0 ? "selected_for_recovery" : "excluded_after_revalidation",
    revalidation_exclusion_reasons: unique(reasons),
    delete_authorized: false,
  };
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

function summarize(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function writeJsonl(file, metadata, rows) {
  writeFileSync(
    file,
    [JSON.stringify({ record_type: "metadata", plan: metadata }), ...rows.map((row) => JSON.stringify({ record_type: "candidate", ...row }))].join("\n") + "\n",
  );
}

function verifyBundle(repoRoot, bundlePath) {
  const result = commandResult("git", ["bundle", "verify", bundlePath], { cwd: repoRoot });
  return { passed: result.status === 0, exit_code: result.status, error_code: result.error_code };
}

function bundleHeads(repoRoot, bundlePath) {
  const result = commandResult("git", ["bundle", "list-heads", bundlePath], { cwd: repoRoot });
  if (result.status !== 0) throw new Error("Unable to list base recovery bundle heads.");
  return result.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const [sha, ref] = line.split(/\s+/);
    return { sha, ref };
  });
}

function reachableFromAny(repoRoot, sha, baseHeadShas) {
  return baseHeadShas.some((baseSha) =>
    commandResult("git", ["merge-base", "--is-ancestor", sha, baseSha], { cwd: repoRoot }).status === 0,
  );
}

function renderReport({ metadata, recoveryManifest, remoteReadback, excluded }) {
  const exclusions = summarize(excluded.flatMap((row) => row.revalidation_exclusion_reasons));
  const exclusionRows = Object.entries(exclusions).map(([reason, count]) => `| \`${reason}\` | ${count} |`);
  const recoverySequence = recoveryManifest.base_recovery
    ? `1. Download and verify \`${recoveryManifest.base_recovery.bundle_file}\` from \`${recoveryManifest.base_recovery.release_tag}\`.
2. Import that base bundle into a recovery clone.
${recoveryManifest.supplement_required
    ? `3. Download, verify, and fetch \`${recoveryManifest.bundle_file}\` from \`${recoveryManifest.release_tag}\` into the same clone.\n4.`
    : "3."} Recreate the exact refs from the immutable \`recovery_refs\` map in \`recovery_bundle_manifest.json\`.`
    : `1. Download and verify \`${recoveryManifest.bundle_file}\` from \`${recoveryManifest.release_tag}\`.
2. Import the bundle into a recovery clone.
3. Recreate the exact refs from the immutable \`recovery_refs\` map in \`recovery_bundle_manifest.json\`.`;
  return `# Repository Pre-Archive Recovery And Execution Plan V1

## Boundary

This gate created and verified recovery evidence for an exact candidate set. It
did not remove a worktree, delete a branch, mutate a tag, close a PR, delete a
file, or write to the database or Storage.

**NO CLEANUP OR DELETION IS AUTHORIZED BY THIS PLAN.**

## Frozen Inputs

- Producer commit: \`${metadata.producer_sha}\`
- Authority ref: \`${metadata.authority_ref}\`
- Authority SHA: \`${metadata.authority_sha}\`
- Candidate packet SHA-256: \`${metadata.candidate_packet_sha256}\`
- Revalidation fingerprint: \`${metadata.selection_fingerprint}\`
- Input candidate groups: \`${metadata.counts.input_candidates}\`
- Selected for recovery: \`${metadata.counts.selected_for_recovery}\`
- Excluded after revalidation: \`${metadata.counts.excluded_after_revalidation}\`
- Frozen recovery refs: \`${recoveryManifest.recovery_ref_count}\`
- New refs requiring supplement objects: \`${recoveryManifest.bundle_ref_count}\`

## Recovery Proof

- Private recovery repository: \`${recoveryManifest.recovery_repository}\`
- Release: \`${recoveryManifest.release_tag}\`
- Release URL: ${remoteReadback.release_url}
- Bundle file: \`${recoveryManifest.bundle_file ?? "none; base bundle already contains all objects"}\`
- Bundle bytes: \`${recoveryManifest.bundle_bytes}\`
- Bundle SHA-256: \`${recoveryManifest.bundle_sha256}\`
- Recovery mode: \`${recoveryManifest.recovery_mode}\`
- Base bundle SHA-256: \`${recoveryManifest.base_recovery?.bundle_sha256 ?? "not_applicable"}\`
- Supersedes recovery release: \`${recoveryManifest.supersedes_release_tag ?? "none"}\`
- Local bundle verification: \`${recoveryManifest.local_bundle_verification.passed}\`
- Remote asset readback hash match: \`${remoteReadback.bundle_hash_matches}\`
- Downloaded bundle verification: \`${remoteReadback.downloaded_bundle_verification.passed}\`

## Recovery Sequence

${recoverySequence}

## Revalidation Policy

Every selected group retained its packet SHA, remained contained in or
patch-equivalent to current \`origin/main\`, had no dirty or moved worktree, no
current open PR, no automation reference, and no migration-domain change.

## Revalidation Exclusions

| Reason | Groups |
|---|---:|
${exclusionRows.join("\n") || "| None | 0 |"}

Complete records are preserved in \`prearchive_selection.jsonl\` and
\`prearchive_exclusions.jsonl\`.

## Exact Future Execution Sequence

The next gate remains destructive and requires explicit owner approval tied to
the selection fingerprint and recovery bundle hash above. A future executor
must recheck all evidence immediately before each mutation, stop on any drift,
change only the exact approved refs/worktrees, and prove restoration from the
downloaded bundle after execution.

No future approval may be inferred from creation of this recovery release.
`;
}

function assertPrivateRecoveryRepository(repoRoot, repository) {
  const record = JSON.parse(command("gh", ["repo", "view", repository, "--json", "nameWithOwner,visibility,url"], { cwd: repoRoot }));
  if (record.visibility !== "PRIVATE") throw new Error(`Recovery repository ${repository} must remain private.`);
  return record;
}

function publishAndReadBack({ repoRoot, repository, releaseTag, assetPaths, readbackDir }) {
  const releaseList = commandResult(
    "gh",
    ["release", "list", "--repo", repository, "--limit", "1000", "--json", "tagName"],
    { cwd: repoRoot },
  );
  if (releaseList.status !== 0) throw new Error("Recovery release inventory is unavailable.");
  const existing = JSON.parse(releaseList.stdout || "[]").some(
    (release) => release.tagName === releaseTag,
  );
  if (existing) throw new Error(`Recovery release ${releaseTag} already exists.`);
  mkdirSync(readbackDir, { recursive: true });
  command("gh", [
    "release", "create", releaseTag, ...assetPaths,
    "--repo", repository,
    "--title", `Repository pre-archive recovery ${releaseTag}`,
    "--notes", "Private recovery assets for a non-destructive archive execution plan. No deletion is authorized.",
  ], { cwd: repoRoot });
  const release = JSON.parse(command("gh", ["release", "view", releaseTag, "--repo", repository, "--json", "url,assets,tagName"], { cwd: repoRoot }));
  command("gh", ["release", "download", releaseTag, "--repo", repository, "--dir", readbackDir], { cwd: repoRoot });
  return release;
}

function recoveryRelease(repoRoot, repository, releaseTag) {
  return JSON.parse(command(
    "gh",
    ["release", "view", releaseTag, "--repo", repository, "--json", "url,assets,tagName"],
    { cwd: repoRoot },
  ));
}

export function main() {
  const repoRoot = path.resolve(argument("repo-root", process.cwd()));
  const authorityRef = argument("authority", "origin/main");
  const candidatePath = argument("candidate-packet", DEFAULT_CANDIDATE_PATH);
  const candidateRef = argument("candidate-ref", "origin/main");
  const auditDirRelative = argument("audit-dir", DEFAULT_AUDIT_DIR);
  const recoveryRoot = path.resolve(argument("recovery-root", DEFAULT_RECOVERY_ROOT));
  const recoveryRepository = argument("recovery-repo", DEFAULT_RECOVERY_REPOSITORY);
  const releaseTag = argument("release-tag");
  const supersedesReleaseTag = argument("supersedes-release-tag");
  const baseRecoveryManifestPath = argument("base-recovery-manifest");
  const publishRecovery = hasFlag("publish-recovery");
  if (publishRecovery && !releaseTag) throw new Error("--release-tag is required with --publish-recovery.");

  const producerSha = git(["rev-parse", "HEAD"], { cwd: repoRoot });
  const authoritySha = git(["rev-parse", authorityRef], { cwd: repoRoot });
  const candidateText = loadGitBackedFile(repoRoot, candidatePath, candidateRef);
  const candidateRecords = parseJsonl(candidateText);
  const packetMetadata = candidateRecords[0]?.packet;
  const candidates = candidateRecords.filter((record) => record.record_type === "branch_group").map(({ record_type, ...record }) => record);
  if (!packetMetadata || candidates.length !== packetMetadata.counts.candidates) throw new Error("Candidate packet count does not reconcile.");

  const openPullRequests = currentOpenPullRequests(repoRoot);
  const remoteHeads = currentRemoteHeads(repoRoot);
  const authorityBranchName = authorityRef.replace(/^origin\//, "");
  const liveAuthoritySha = remoteHeads.rows.get(authorityBranchName) ?? null;
  if (remoteHeads.status !== "available" || liveAuthoritySha !== authoritySha) {
    throw new Error("Local authority does not match the live remote authority head.");
  }
  const repositoryReferences = scanRepositoryReferences(repoRoot, candidates, authorityRef);
  const scheduledTasks = scanScheduledTaskReferences(candidates);
  const runningProcesses = scanRunningProcessReferences(candidates);
  const references = findingsByGroup(repositoryReferences, scheduledTasks, runningProcesses);
  const liveWorktrees = parseWorktrees(git(["worktree", "list", "--porcelain"], { cwd: repoRoot }));
  const evaluated = candidates.map((candidate) => {
    const live = collectLiveEvidence(
      repoRoot,
      candidate,
      authorityRef,
      liveWorktrees,
      remoteHeads,
    );
    return evaluateRevalidatedCandidate(candidate, {
      ...live,
      openPullRequestStatus: openPullRequests.status,
      openPullRequests: openPullRequests.rows.filter((pullRequest) => pullRequest.headRefName === candidate.branch_name),
      repositoryStatus: repositoryReferences.status,
      scheduledTaskStatus: scheduledTasks.status,
      runningProcessStatus: runningProcesses.status,
      remoteHeadStatus: remoteHeads.status,
      automationReferences: references.get(candidate.group_id) ?? [],
    });
  });
  const selected = evaluated.filter((row) => row.selection_status === "selected_for_recovery");
  const excluded = evaluated.filter((row) => row.selection_status !== "selected_for_recovery");
  if (selected.length === 0) throw new Error("No candidate survived live revalidation.");

  const selectionCore = selected.map((row) => ({
    group_id: row.group_id,
    branch_name: row.branch_name,
    refs: row.revalidation.refs.map((ref) => ({ full_ref: ref.full_ref, sha: ref.current_sha })),
    worktrees: row.revalidation.worktrees.map((worktree) => ({ path: worktree.path, sha: worktree.current_sha, branch: worktree.current_branch })),
  }));
  const selectionFingerprint = sha256(`${JSON.stringify(selectionCore)}\n`);
  const recoveryRefMap = new Map([[`refs/remotes/${authorityRef}`, authoritySha]]);
  for (const row of selected) {
    for (const ref of row.revalidation.refs) recoveryRefMap.set(ref.full_ref, ref.current_sha);
  }
  const recoveryRefs = [...recoveryRefMap.entries()]
    .map(([ref, sha]) => ({ ref, sha }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
  let baseRecovery = null;
  let bundleRefs = recoveryRefs.map((record) => record.ref);
  let bundlePrerequisiteShas = [];
  if (baseRecoveryManifestPath) {
    const baseManifest = JSON.parse(
      loadGitBackedFile(repoRoot, baseRecoveryManifestPath, "HEAD"),
    );
    const baseBundlePath = path.join(
      recoveryRoot,
      baseManifest.release_tag,
      baseManifest.bundle_file,
    );
    if (!existsSync(baseBundlePath)) throw new Error("Base recovery bundle is unavailable locally.");
    const baseHash = sha256(readFileSync(baseBundlePath));
    const baseVerification = verifyBundle(repoRoot, baseBundlePath);
    if (baseHash !== baseManifest.bundle_sha256 || !baseVerification.passed) {
      throw new Error("Base recovery bundle failed local readback.");
    }
    const heads = bundleHeads(repoRoot, baseBundlePath);
    const headShas = unique(heads.map((head) => head.sha));
    const supplementRefs = recoveryRefs.filter(
      (record) => !reachableFromAny(repoRoot, record.sha, headShas),
    );
    bundleRefs = supplementRefs.map((record) => record.ref);
    bundlePrerequisiteShas = supplementRefs.length > 0 ? headShas : [];
    baseRecovery = {
      release_tag: baseManifest.release_tag,
      bundle_file: baseManifest.bundle_file,
      bundle_sha256: baseManifest.bundle_sha256,
      bundle_bytes: baseManifest.bundle_bytes,
      bundle_head_count: heads.length,
      local_hash_matches: true,
      local_bundle_verification: baseVerification,
      recovery_repository: baseManifest.recovery_repository,
      remote_release_url: null,
      remote_bundle_digest_matches: false,
    };
  }
  const recoveryDir = path.join(recoveryRoot, releaseTag ?? `plan-${selectionFingerprint.slice(0, 12)}`);
  mkdirSync(recoveryDir, { recursive: true });
  const supplementRequired = bundleRefs.length > 0;
  const bundleFile = supplementRequired
    ? `grookai-prearchive-${baseRecovery ? "supplement-" : ""}${selectionFingerprint.slice(0, 16)}.bundle`
    : null;
  const bundlePath = bundleFile ? path.join(recoveryDir, bundleFile) : null;
  const bundleRevisions = [
    ...bundleRefs,
    ...bundlePrerequisiteShas.map((sha) => `^${sha}`),
  ];
  if (supplementRequired) {
    const bundleCreate = commandResult("git", ["bundle", "create", bundlePath, "--stdin"], { cwd: repoRoot, input: `${bundleRevisions.join("\n")}\n` });
    if (bundleCreate.status !== 0) {
      throw new Error(
        `Git bundle creation failed with exit ${bundleCreate.status}: ${bundleCreate.stderr || "no diagnostic"}`,
      );
    }
  }
  const localBundleVerification = supplementRequired
    ? verifyBundle(repoRoot, bundlePath)
    : baseRecovery.local_bundle_verification;
  if (!localBundleVerification.passed) throw new Error("Local Git bundle verification failed.");

  const recoveryManifest = {
    schema_version: "GROOKAI_REPOSITORY_PREARCHIVE_RECOVERY_MANIFEST_V1",
    generated_at: new Date().toISOString(), producer_sha: producerSha,
    authority_ref: authorityRef, authority_sha: authoritySha,
    selection_fingerprint: selectionFingerprint, candidate_packet_sha256: sha256(candidateText),
    selected_group_count: selected.length, excluded_group_count: excluded.length,
    recovery_mode: !baseRecovery
      ? "standalone_bundle"
      : supplementRequired
        ? "base_plus_incremental_supplement"
        : "base_only_manifest",
    recovery_ref_count: recoveryRefs.length,
    recovery_refs: recoveryRefs,
    base_recovery: baseRecovery,
    bundle_ref_count: bundleRefs.length, bundle_refs: bundleRefs,
    bundle_prerequisite_count: bundlePrerequisiteShas.length,
    supplement_required: supplementRequired,
    bundle_file: bundleFile,
    bundle_bytes: supplementRequired ? statSync(bundlePath).size : 0,
    bundle_sha256: supplementRequired ? sha256(readFileSync(bundlePath)) : null,
    local_bundle_verification: localBundleVerification,
    recovery_repository: recoveryRepository, release_tag: releaseTag ?? null,
    supersedes_release_tag: supersedesReleaseTag ?? null,
    delete_authorized: false,
  };
  const bundleManifestFile = bundleFile
    ? `${bundleFile}.manifest.json`
    : `grookai-prearchive-manifest-${selectionFingerprint.slice(0, 16)}.json`;
  const bundleManifestPath = path.join(recoveryDir, bundleManifestFile);
  writeFileSync(bundleManifestPath, `${JSON.stringify(recoveryManifest, null, 2)}\n`);

  let remoteReadback = {
    status: "not_published", release_url: "not_published",
    bundle_hash_matches: false, manifest_hash_matches: false,
    downloaded_bundle_verification: { passed: false },
  };
  if (publishRecovery) {
    const recoveryRepo = assertPrivateRecoveryRepository(repoRoot, recoveryRepository);
    if (baseRecovery) {
      if (baseRecovery.recovery_repository !== recoveryRepository) {
        throw new Error("Base recovery repository does not match the active private recovery repository.");
      }
      const baseRelease = recoveryRelease(
        repoRoot,
        recoveryRepository,
        baseRecovery.release_tag,
      );
      const baseBundleAsset = baseRelease.assets.find(
        (asset) => asset.name === baseRecovery.bundle_file,
      );
      baseRecovery.remote_release_url = baseRelease.url;
      baseRecovery.remote_bundle_digest_matches =
        baseBundleAsset?.digest === `sha256:${baseRecovery.bundle_sha256}` &&
        baseBundleAsset?.size === baseRecovery.bundle_bytes;
      if (!baseRecovery.remote_bundle_digest_matches) {
        throw new Error("Base recovery release bundle digest or size does not reconcile.");
      }
      writeFileSync(bundleManifestPath, `${JSON.stringify(recoveryManifest, null, 2)}\n`);
    }
    const readbackDir = path.join(recoveryDir, "remote_readback");
    const assetPaths = supplementRequired
      ? [bundlePath, bundleManifestPath]
      : [bundleManifestPath];
    const release = publishAndReadBack({ repoRoot, repository: recoveryRepository, releaseTag, assetPaths, readbackDir });
    const downloadedBundle = bundleFile ? path.join(readbackDir, bundleFile) : null;
    const downloadedManifest = path.join(readbackDir, bundleManifestFile);
    remoteReadback = {
      status: "verified", repository_visibility: recoveryRepo.visibility,
      recovery_mode: recoveryManifest.recovery_mode,
      release_url: release.url, release_tag: release.tagName,
      asset_names: release.assets.map((asset) => asset.name).sort(),
      readback_directory: normalizePath(readbackDir),
      bundle_sha256: supplementRequired
        ? sha256(readFileSync(downloadedBundle))
        : baseRecovery.bundle_sha256,
      bundle_hash_matches: supplementRequired
        ? sha256(readFileSync(downloadedBundle)) === recoveryManifest.bundle_sha256
        : baseRecovery.remote_bundle_digest_matches,
      manifest_sha256: sha256(readFileSync(downloadedManifest)),
      manifest_hash_matches: sha256(readFileSync(downloadedManifest)) === sha256(readFileSync(bundleManifestPath)),
      downloaded_bundle_verification: supplementRequired
        ? verifyBundle(repoRoot, downloadedBundle)
        : {
            ...baseRecovery.local_bundle_verification,
            evidence_source: "verified_base_bundle_and_remote_asset_digest",
          },
    };
    if (!remoteReadback.bundle_hash_matches || !remoteReadback.manifest_hash_matches || !remoteReadback.downloaded_bundle_verification.passed) {
      throw new Error("Remote recovery readback did not reconcile.");
    }
  }

  const metadata = {
    schema_version: "GROOKAI_REPOSITORY_PREARCHIVE_SELECTION_V1",
    generated_at: recoveryManifest.generated_at, producer_sha: producerSha,
    authority_ref: authorityRef, authority_sha: authoritySha,
    candidate_packet_path: candidatePath,
    candidate_packet_sha256: recoveryManifest.candidate_packet_sha256,
    selection_fingerprint: selectionFingerprint,
    inventory_status: {
      open_pull_requests: openPullRequests.status,
      repository_references: repositoryReferences.status,
      scheduled_tasks: scheduledTasks.status,
      running_processes: runningProcesses.status,
      remote_heads: remoteHeads.status,
    },
    counts: {
      input_candidates: candidates.length, selected_for_recovery: selected.length,
      excluded_after_revalidation: excluded.length,
      recovery_refs: recoveryRefs.length,
      supplement_refs: bundleRefs.length,
      exclusion_reasons: summarize(excluded.flatMap((row) => row.revalidation_exclusion_reasons)),
    },
    boundaries: {
      worktree_removals: 0, branch_deletions: 0, tag_mutations: 0,
      pull_request_mutations: 0, database_writes: 0, storage_writes: 0,
      delete_authorized_records: 0,
    },
    next_gate: "explicit_owner_approval_of_exact_cleanup_execution_fingerprint",
  };

  const auditDir = path.resolve(repoRoot, auditDirRelative);
  mkdirSync(auditDir, { recursive: true });
  writeJsonl(path.join(auditDir, "prearchive_selection.jsonl"), metadata, selected);
  writeJsonl(path.join(auditDir, "prearchive_exclusions.jsonl"), metadata, excluded);
  writeFileSync(path.join(auditDir, "revalidation_summary.json"), `${JSON.stringify({
    ...metadata,
    reference_finding_counts: {
      repository: repositoryReferences.findings.length,
      scheduled_tasks: scheduledTasks.findings.length,
      running_processes: runningProcesses.findings.length,
    },
  }, null, 2)}\n`);
  writeFileSync(path.join(auditDir, "recovery_bundle_manifest.json"), `${JSON.stringify(recoveryManifest, null, 2)}\n`);
  writeFileSync(path.join(auditDir, "recovery_remote_readback.json"), `${JSON.stringify(remoteReadback, null, 2)}\n`);
  writeFileSync(path.join(auditDir, "PREARCHIVE_RECOVERY_AND_EXECUTION_PLAN_V1.md"), renderReport({ metadata, recoveryManifest, remoteReadback, excluded }));
  const hashFiles = [
    "PREARCHIVE_RECOVERY_AND_EXECUTION_PLAN_V1.md", "prearchive_selection.jsonl",
    "prearchive_exclusions.jsonl", "revalidation_summary.json",
    "recovery_bundle_manifest.json", "recovery_remote_readback.json",
  ];
  writeFileSync(path.join(auditDir, "artifact_hashes.json"), `${JSON.stringify({
    schema_version: "GROOKAI_REPOSITORY_PREARCHIVE_ARTIFACT_HASHES_V1",
    generated_at: metadata.generated_at, producer_sha: producerSha,
    files: Object.fromEntries(hashFiles.map((file) => [file, sha256(readFileSync(path.join(auditDir, file)))])),
  }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ metadata, recoveryManifest, remoteReadback }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) main();
