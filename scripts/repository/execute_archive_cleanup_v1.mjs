import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { revalidateCandidateSet } from "./build_prearchive_recovery_plan.mjs";

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_SELECTION =
  "docs/audits/repository_prearchive_recovery_20260902/prearchive_selection.jsonl";
const DEFAULT_RECOVERY_MANIFEST =
  "docs/audits/repository_prearchive_recovery_20260902/recovery_bundle_manifest.json";
const DEFAULT_RECOVERY_READBACK =
  "docs/audits/repository_prearchive_recovery_20260902/recovery_remote_readback.json";
const DEFAULT_RECOVERY_HASHES =
  "docs/audits/repository_prearchive_recovery_20260902/artifact_hashes.json";
const DEFAULT_OUT_DIR = "docs/audits/repository_archive_cleanup_execution_20260902";
const DEFAULT_RECOVERY_ROOT = "C:/grookai_recovery_bundles";

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function commandResult(binary, args, { cwd, input } = {}) {
  const result = spawnSync(binary, args, {
    cwd,
    input,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 512 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    error_code: result.error?.code ?? null,
  };
}

function command(binary, args, options = {}) {
  const result = commandResult(binary, args, options);
  if (result.status !== 0) {
    throw new Error(
      `${binary} ${args.join(" ")} failed: ${result.stderr || result.error_code || result.status}`,
    );
  }
  return result.stdout;
}

function git(repoRoot, args, options = {}) {
  return command("git", args, { cwd: repoRoot, ...options });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadGitBackedText(repoRoot, file, ref) {
  const absolute = path.isAbsolute(file) ? file : path.resolve(repoRoot, file);
  if (existsSync(absolute)) return readFileSync(absolute, "utf8");
  if (path.isAbsolute(file)) throw new Error(`Required local file is unavailable: ${file}`);
  return git(repoRoot, ["show", `${ref}:${file.replaceAll("\\", "/")}`]);
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/\/$/, "").toLowerCase();
}

function assertHash(label, actual, expected) {
  if (!expected || actual !== expected) {
    throw new Error(`${label} hash mismatch.`);
  }
}

function verifyBundle(repoRoot, bundlePath) {
  const result = commandResult("git", ["bundle", "verify", bundlePath], { cwd: repoRoot });
  return {
    passed: result.status === 0,
    exit_code: result.status,
    error_code: result.error_code,
  };
}

function verifyReleaseAsset(repoRoot, repository, releaseTag, file, expectedHash, expectedBytes) {
  const release = JSON.parse(gitHub(repoRoot, [
    "release", "view", releaseTag, "--repo", repository,
    "--json", "url,tagName,assets",
  ]));
  const asset = release.assets.find((candidate) => candidate.name === file);
  const passed =
    asset?.digest === `sha256:${expectedHash}` &&
    asset?.size === expectedBytes;
  if (!passed) throw new Error(`Recovery release ${releaseTag} does not match ${file}.`);
  return { release_url: release.url, digest_matches: true, size_matches: true };
}

function gitHub(repoRoot, args) {
  return command("gh", args, { cwd: repoRoot });
}

function assertPrivateRecoveryRepository(repoRoot, repository) {
  const record = JSON.parse(gitHub(repoRoot, [
    "repo", "view", repository, "--json", "nameWithOwner,visibility,url",
  ]));
  if (record.visibility !== "PRIVATE") {
    throw new Error("Recovery repository is not private.");
  }
  return record;
}

function assertSafeBranch(repoRoot, branch) {
  const result = commandResult("git", ["check-ref-format", "--branch", branch], { cwd: repoRoot });
  if (result.status !== 0 || branch === "main" || branch === "master") {
    throw new Error(`Unsafe cleanup branch target: ${branch}`);
  }
}

export function buildCleanupActions(candidates) {
  const localBranches = unique(candidates.flatMap((candidate) => candidate.local_refs));
  const remoteBranches = unique(candidates.flatMap((candidate) =>
    candidate.remote_refs.map((remote) => remote.replace(/^origin\//, ""))));
  const worktrees = [...new Map(candidates.flatMap((candidate) =>
    candidate.worktrees.map((worktree) => [normalizePath(worktree.path), {
      path: worktree.path,
      branch: candidate.branch_name,
      sha: worktree.sha,
    }]))).values()].sort((a, b) => a.path.localeCompare(b.path));
  return {
    local_branches: localBranches,
    remote_branches: remoteBranches,
    worktrees,
    counts: {
      candidate_groups: candidates.length,
      local_branches: localBranches.length,
      remote_branches: remoteBranches.length,
      worktrees: worktrees.length,
    },
  };
}

function authorizationCore(plan) {
  return {
    selection_fingerprint: plan.selection_fingerprint,
    execution_fingerprint: plan.execution_fingerprint,
    base_bundle_sha256: plan.recovery.base_bundle_sha256,
    supplement_bundle_sha256: plan.recovery.supplement_bundle_sha256,
    action_manifest_sha256: plan.action_manifest_sha256,
    action_counts: plan.actions.counts,
  };
}

export function validateAuthorization(authorization, plan) {
  const reasons = [];
  if (authorization?.schema_version !== "GROOKAI_REPOSITORY_ARCHIVE_CLEANUP_AUTHORIZATION_V1") {
    reasons.push("authorization_schema_mismatch");
  }
  if (authorization?.execute_authorized !== true) reasons.push("execution_not_authorized");
  if (!authorization?.approved_by || !authorization?.approved_at || !authorization?.approval_statement) {
    reasons.push("owner_approval_evidence_missing");
  }
  for (const [field, expected] of Object.entries(authorizationCore(plan))) {
    if (JSON.stringify(authorization?.[field]) !== JSON.stringify(expected)) {
      reasons.push(`${field}_mismatch`);
    }
  }
  return { passed: reasons.length === 0, reasons: unique(reasons) };
}

function actionManifest(actions) {
  return {
    local_branches: actions.local_branches,
    remote_branches: actions.remote_branches,
    worktrees: actions.worktrees,
  };
}

function writeJsonl(file, metadata, rows) {
  writeFileSync(
    file,
    [JSON.stringify({ record_type: "metadata", ...metadata }), ...rows.map((row) =>
      JSON.stringify({ record_type: "candidate", ...row }))].join("\n") + "\n",
  );
}

function artifactHashes(outDir, files, producerSha) {
  return {
    schema_version: "GROOKAI_REPOSITORY_ARCHIVE_CLEANUP_ARTIFACT_HASHES_V1",
    generated_at: new Date().toISOString(),
    producer_sha: producerSha,
    files: Object.fromEntries(files.map((file) => [
      file,
      sha256(readFileSync(path.join(outDir, file))),
    ])),
  };
}

function renderCheckpoint(plan, authorization) {
  return `# Repository Archive Cleanup Execution Checkpoint V1

Status: ${plan.mode === "execute" ? plan.execution_status : "READY FOR EXACT OWNER AUTHORIZATION"}

Date: 2026-09-02 (America/Denver)

## Boundary

This packet is an exact, fail-closed cleanup plan. A dry run performs no branch,
worktree, tag, pull-request, filesystem, database, or Storage mutation.

## Frozen Selection

- Authority at dry run: \`${plan.authority_ref}\` at \`${plan.authority_sha}\`
- Selection fingerprint: \`${plan.selection_fingerprint}\`
- Execution fingerprint: \`${plan.execution_fingerprint}\`
- Action manifest SHA-256: \`${plan.action_manifest_sha256}\`
- Candidate groups: \`${plan.actions.counts.candidate_groups}\`
- Local branches: \`${plan.actions.counts.local_branches}\`
- Remote branches: \`${plan.actions.counts.remote_branches}\`
- Clean linked worktrees: \`${plan.actions.counts.worktrees}\`

## Recovery Chain

- Base release: \`${plan.recovery.base_release_tag}\`
- Base bundle SHA-256: \`${plan.recovery.base_bundle_sha256}\`
- Supplement release: \`${plan.recovery.supplement_release_tag}\`
- Supplement bundle SHA-256: \`${plan.recovery.supplement_bundle_sha256}\`
- Local bundle verification: \`${plan.recovery.local_verification_passed}\`
- Private remote digest verification: \`${plan.recovery.remote_verification_passed}\`

## Live Revalidation

- Passed groups: \`${plan.revalidation.passed_groups}\`
- Drifted groups: \`${plan.revalidation.drifted_groups}\`
- Inventory failures: \`${plan.revalidation.inventory_failures}\`

## Authorization

- Execute authorized: \`${authorization.passed}\`
- Reasons: \`${authorization.reasons.join(", ") || "none"}\`

## Execution Order

1. Repeat complete live revalidation immediately before mutation.
2. Delete the exact remote branches in one atomic push.
3. Remove only the exact clean registered worktrees.
4. Delete local refs in one transactional \`git update-ref\` operation.
5. Verify every target is absent and every non-target boundary remains untouched.
6. On failure, restore remote and local refs to their frozen SHAs and reconstruct
   only worktrees removed by this execution.

## What Must Never Be Broken

- No target may move between approval and execution.
- No dirty, active, open-PR, automation-referenced, migration-bearing, protected,
  or unverified source may be removed.
- No tag, PR, artifact, database row, Storage object, deployment, or product data
  is in scope.
- Recovery releases and bundles remain immutable.

## Explicit Next Gate

Provide an owner authorization artifact matching every value in
\`cleanup_execution_plan.json\`. General permission or creation of this packet
does not authorize destructive execution.
`;
}

function localRefSha(repoRoot, ref) {
  const result = commandResult("git", ["rev-parse", "--verify", ref], { cwd: repoRoot });
  return result.status === 0 ? result.stdout : null;
}

function remoteHeadMap(repoRoot) {
  const result = commandResult("git", ["ls-remote", "--heads", "origin"], { cwd: repoRoot });
  if (result.status !== 0) throw new Error("Remote branch readback is unavailable.");
  return new Map(result.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const [sha, ref] = line.split(/\s+/);
    return [ref.replace("refs/heads/", ""), sha];
  }));
}

function registeredWorktreePaths(repoRoot) {
  const rows = git(repoRoot, ["worktree", "list", "--porcelain"])
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => normalizePath(line.slice("worktree ".length)));
  return new Set(rows);
}

function verifyTargetsAbsent(repoRoot, actions) {
  const remoteHeads = remoteHeadMap(repoRoot);
  const registeredPaths = registeredWorktreePaths(repoRoot);
  const remaining = {
    local_branches: actions.local_branches.filter((branch) =>
      localRefSha(repoRoot, `refs/heads/${branch}`) !== null),
    remote_branches: actions.remote_branches.filter((branch) => remoteHeads.has(branch)),
    worktrees: actions.worktrees.filter((worktree) =>
      registeredPaths.has(normalizePath(worktree.path))).map((worktree) => worktree.path),
  };
  return {
    passed: Object.values(remaining).every((rows) => rows.length === 0),
    remaining,
  };
}

function restoreRefs(repoRoot, actions, recoveryRefMap, removedWorktrees) {
  const failures = [];
  const missingLocalBranches = [];
  for (const branch of actions.local_branches) {
    const ref = `refs/heads/${branch}`;
    const expected = recoveryRefMap.get(ref);
    const current = localRefSha(repoRoot, ref);
    if (current === null) missingLocalBranches.push({ ref, expected });
    else if (current !== expected) failures.push(`local_ref_changed:${ref}`);
  }
  if (missingLocalBranches.length > 0) {
    const localInput = [
      "start",
      ...missingLocalBranches.map(({ ref, expected }) => `create ${ref} ${expected}`),
      "prepare",
      "commit",
      "",
    ];
    const result = commandResult("git", ["update-ref", "--stdin"], {
      cwd: repoRoot,
      input: localInput.join("\n"),
    });
    if (result.status !== 0) failures.push("local_ref_restore_failed");
  }

  let remoteHeads;
  try {
    remoteHeads = remoteHeadMap(repoRoot);
  } catch {
    remoteHeads = new Map();
    failures.push("remote_restore_inventory_unavailable");
  }
  const remoteSpecs = [];
  for (const branch of actions.remote_branches) {
    const expected = recoveryRefMap.get(`refs/remotes/origin/${branch}`);
    const current = remoteHeads.get(branch) ?? null;
    if (current === null) remoteSpecs.push(`${expected}:refs/heads/${branch}`);
    else if (current !== expected) failures.push(`remote_ref_changed:${branch}`);
  }
  if (remoteSpecs.length > 0) {
    const result = commandResult("git", ["push", "--atomic", "origin", ...remoteSpecs], {
      cwd: repoRoot,
    });
    if (result.status !== 0) failures.push("remote_ref_restore_failed");
  }
  for (const worktree of [...removedWorktrees].reverse()) {
    if (!existsSync(worktree.path)) {
      const result = commandResult("git", ["worktree", "add", worktree.path, worktree.branch], {
        cwd: repoRoot,
      });
      if (result.status !== 0) failures.push(`worktree_restore_failed:${worktree.path}`);
    }
  }
  return { passed: failures.length === 0, failures };
}

function executeCleanup(repoRoot, actions, recoveryRefMap) {
  const removedWorktrees = [];
  try {
    if (actions.remote_branches.length > 0) {
      command("git", ["push", "--atomic", "origin", "--delete", ...actions.remote_branches], {
        cwd: repoRoot,
      });
    }
    for (const worktree of actions.worktrees) {
      command("git", ["worktree", "remove", worktree.path], { cwd: repoRoot });
      removedWorktrees.push(worktree);
    }
    const localInput = ["start"];
    for (const branch of actions.local_branches) {
      const sha = recoveryRefMap.get(`refs/heads/${branch}`);
      localInput.push(`delete refs/heads/${branch} ${sha}`);
    }
    localInput.push("prepare", "commit", "");
    command("git", ["update-ref", "--stdin"], {
      cwd: repoRoot,
      input: localInput.join("\n"),
    });
    const readback = verifyTargetsAbsent(repoRoot, actions);
    if (!readback.passed) throw new Error("Post-execution target absence readback failed.");
    return {
      status: "completed",
      rollback_attempted: false,
      removed_worktrees: removedWorktrees.length,
      readback,
    };
  } catch (error) {
    const rollback = restoreRefs(repoRoot, actions, recoveryRefMap, removedWorktrees);
    throw new Error(
      `Cleanup failed and rollback was attempted (${rollback.passed ? "passed" : rollback.failures.join(",")}): ${error.message}`,
    );
  }
}

export function main() {
  const repoRoot = path.resolve(argument("repo-root", process.cwd()));
  const authorityRef = argument("authority", "origin/main");
  const selectionFile = argument("selection", DEFAULT_SELECTION);
  const recoveryManifestFile = argument("recovery-manifest", DEFAULT_RECOVERY_MANIFEST);
  const recoveryReadbackFile = argument("recovery-readback", DEFAULT_RECOVERY_READBACK);
  const recoveryHashesFile = argument("recovery-hashes", DEFAULT_RECOVERY_HASHES);
  const recoveryRoot = path.resolve(argument("recovery-root", DEFAULT_RECOVERY_ROOT));
  const outDir = path.resolve(repoRoot, argument("out-dir", DEFAULT_OUT_DIR));
  const execute = hasFlag("execute");
  const authorizationPath = argument("authorization");

  const producerSha = git(repoRoot, ["rev-parse", "HEAD"]);
  const selectionRecords = loadGitBackedText(repoRoot, selectionFile, authorityRef)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const selectionMetadata = selectionRecords[0]?.plan;
  const candidates = selectionRecords.slice(1).map(({ record_type, ...candidate }) => candidate);
  const recoveryManifest = JSON.parse(
    loadGitBackedText(repoRoot, recoveryManifestFile, authorityRef),
  );
  const recoveryReadback = JSON.parse(
    loadGitBackedText(repoRoot, recoveryReadbackFile, authorityRef),
  );
  const recoveryHashes = JSON.parse(
    loadGitBackedText(repoRoot, recoveryHashesFile, authorityRef),
  );

  if (!selectionMetadata || candidates.length !== selectionMetadata.counts.selected_for_recovery) {
    throw new Error("Frozen selection count does not reconcile.");
  }
  if (candidates.some((candidate) =>
    candidate.delete_authorized !== false ||
    candidate.selection_status !== "selected_for_recovery" ||
    candidate.revalidation_exclusion_reasons.length > 0)) {
    throw new Error("Frozen selection contains an unauthorized or excluded candidate.");
  }
  if (
    recoveryManifest.selection_fingerprint !== selectionMetadata.selection_fingerprint ||
    recoveryManifest.selected_group_count !== candidates.length ||
    recoveryManifest.delete_authorized !== false ||
    recoveryReadback.status !== "verified" ||
    !recoveryReadback.bundle_hash_matches ||
    !recoveryReadback.manifest_hash_matches ||
    !recoveryReadback.downloaded_bundle_verification?.passed
  ) {
    throw new Error("Recovery manifest and frozen selection do not reconcile.");
  }
  const recoveryAuditDir = path.posix.dirname(recoveryManifestFile.replaceAll("\\", "/"));
  for (const [file, expected] of Object.entries(recoveryHashes.files)) {
    assertHash(
      file,
      sha256(loadGitBackedText(repoRoot, `${recoveryAuditDir}/${file}`, authorityRef)),
      expected,
    );
  }

  const recoveryRepository = recoveryManifest.recovery_repository;
  const recoveryRepo = assertPrivateRecoveryRepository(repoRoot, recoveryRepository);
  const base = recoveryManifest.base_recovery;
  if (!base) throw new Error("Cleanup requires the verified standalone-plus-supplement chain.");
  const baseBundlePath = path.join(recoveryRoot, base.release_tag, base.bundle_file);
  const supplementBundlePath = path.join(
    recoveryRoot,
    recoveryManifest.release_tag,
    recoveryManifest.bundle_file,
  );
  for (const [label, file, expectedHash, expectedBytes] of [
    ["base bundle", baseBundlePath, base.bundle_sha256, base.bundle_bytes],
    ["supplement bundle", supplementBundlePath, recoveryManifest.bundle_sha256, recoveryManifest.bundle_bytes],
  ]) {
    if (!existsSync(file) || statSync(file).size !== expectedBytes) {
      throw new Error(`${label} is unavailable or has the wrong size.`);
    }
    assertHash(label, sha256(readFileSync(file)), expectedHash);
    if (!verifyBundle(repoRoot, file).passed) throw new Error(`${label} failed git bundle verification.`);
  }
  const baseRemote = verifyReleaseAsset(
    repoRoot, recoveryRepository, base.release_tag, base.bundle_file,
    base.bundle_sha256, base.bundle_bytes,
  );
  const supplementRemote = verifyReleaseAsset(
    repoRoot, recoveryRepository, recoveryManifest.release_tag,
    recoveryManifest.bundle_file, recoveryManifest.bundle_sha256,
    recoveryManifest.bundle_bytes,
  );

  const actions = buildCleanupActions(candidates);
  for (const branch of [...actions.local_branches, ...actions.remote_branches]) {
    assertSafeBranch(repoRoot, branch);
  }
  const currentBranch = git(repoRoot, ["branch", "--show-current"]);
  if (actions.local_branches.includes(currentBranch)) {
    throw new Error("The current executor branch is present in the cleanup target set.");
  }

  const live = revalidateCandidateSet({ repoRoot, candidates, authorityRef });
  const drifted = live.evaluated.filter((candidate) =>
    candidate.selection_status !== "selected_for_recovery");
  const inventoryFailures = Object.values({
    open_pull_requests: live.openPullRequests.status,
    remote_heads: live.remoteHeads.status,
    repository_references: live.repositoryReferences.status,
    scheduled_tasks: live.scheduledTasks.status,
    running_processes: live.runningProcesses.status,
  }).filter((status) => status !== "available").length;
  if (drifted.length > 0 || inventoryFailures > 0) {
    throw new Error(`Cleanup revalidation failed for ${drifted.length} groups.`);
  }

  const actionManifestSha = sha256(`${JSON.stringify(actionManifest(actions))}\n`);
  const executionCore = {
    authority_ref: authorityRef,
    authority_sha: live.authoritySha,
    selection_fingerprint: selectionMetadata.selection_fingerprint,
    base_bundle_sha256: base.bundle_sha256,
    supplement_bundle_sha256: recoveryManifest.bundle_sha256,
    action_manifest_sha256: actionManifestSha,
    action_counts: actions.counts,
  };
  const executionFingerprint = sha256(`${JSON.stringify(executionCore)}\n`);
  const plan = {
    schema_version: "GROOKAI_REPOSITORY_ARCHIVE_CLEANUP_EXECUTION_PLAN_V1",
    generated_at: new Date().toISOString(),
    producer_sha: producerSha,
    mode: execute ? "execute" : "dry_run",
    execution_status: execute ? "not_started" : "not_executed",
    authority_ref: authorityRef,
    authority_sha: live.authoritySha,
    selection_fingerprint: selectionMetadata.selection_fingerprint,
    execution_fingerprint: executionFingerprint,
    action_manifest_sha256: actionManifestSha,
    actions,
    revalidation: {
      passed_groups: live.evaluated.length - drifted.length,
      drifted_groups: drifted.length,
      inventory_failures: inventoryFailures,
    },
    recovery: {
      repository: recoveryRepository,
      repository_visibility: recoveryRepo.visibility,
      base_release_tag: base.release_tag,
      base_bundle_sha256: base.bundle_sha256,
      base_release_url: baseRemote.release_url,
      supplement_release_tag: recoveryManifest.release_tag,
      supplement_bundle_sha256: recoveryManifest.bundle_sha256,
      supplement_release_url: supplementRemote.release_url,
      local_verification_passed: true,
      remote_verification_passed: true,
    },
    boundaries: {
      tag_mutations: 0,
      pull_request_mutations: 0,
      artifact_deletions: 0,
      database_writes: 0,
      storage_writes: 0,
      deployments: 0,
    },
  };
  const authorization = authorizationPath
    ? validateAuthorization(readJson(path.resolve(repoRoot, authorizationPath)), plan)
    : { passed: false, reasons: ["authorization_artifact_not_supplied"] };
  if (execute && !authorization.passed) {
    throw new Error(`Execution authorization failed: ${authorization.reasons.join(", ")}`);
  }

  mkdirSync(outDir, { recursive: true });
  const planPath = path.join(outDir, "cleanup_execution_plan.json");
  writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  writeJsonl(
    path.join(outDir, "cleanup_live_revalidation.jsonl"),
    {
      schema_version: "GROOKAI_REPOSITORY_ARCHIVE_CLEANUP_REVALIDATION_V1",
      generated_at: plan.generated_at,
      producer_sha: producerSha,
      execution_fingerprint: executionFingerprint,
    },
    live.evaluated,
  );
  writeFileSync(
    path.join(outDir, "CLEANUP_EXECUTION_CHECKPOINT_V1.md"),
    renderCheckpoint(plan, authorization),
  );

  if (execute) {
    const secondPass = revalidateCandidateSet({ repoRoot, candidates, authorityRef });
    const secondPassDrift = secondPass.evaluated.filter((candidate) =>
      candidate.selection_status !== "selected_for_recovery");
    if (secondPass.authoritySha !== plan.authority_sha || secondPassDrift.length > 0) {
      throw new Error("Immediate pre-mutation revalidation drifted from the authorized plan.");
    }
    const recoveryRefMap = new Map(
      recoveryManifest.recovery_refs.map((record) => [record.ref, record.sha]),
    );
    const executionResult = executeCleanup(repoRoot, actions, recoveryRefMap);
    plan.execution_status = executionResult.status;
    plan.execution_readback = executionResult.readback;
    plan.completed_at = new Date().toISOString();
    writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
    writeFileSync(
      path.join(outDir, "CLEANUP_EXECUTION_CHECKPOINT_V1.md"),
      renderCheckpoint(plan, authorization),
    );
  }

  const hashFiles = [
    "cleanup_execution_plan.json",
    "cleanup_live_revalidation.jsonl",
    "CLEANUP_EXECUTION_CHECKPOINT_V1.md",
  ];
  writeFileSync(
    path.join(outDir, "artifact_hashes.json"),
    `${JSON.stringify(artifactHashes(outDir, hashFiles, producerSha), null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify({ plan, authorization }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) main();
