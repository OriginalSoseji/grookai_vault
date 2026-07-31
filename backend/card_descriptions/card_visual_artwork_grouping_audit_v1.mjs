import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CARD_VISUAL_CORPUS_EXPECTED_BRANCH, sha256JsonV1 } from "./card_visual_corpus_v1_inventory.mjs";
import { CARD_VISUAL_ARTWORK_GROUPING_VERSION } from "./card_visual_artwork_grouping_v1.mjs";

export const CARD_VISUAL_ARTWORK_GROUPING_AUDIT_VERSION = "CARD_VISUAL_ARTWORK_GROUPING_AUDIT_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_GROUPING_DIR = "docs/audits/card_visual_artwork_grouping_v1_1/2026-07-21T16-45-14-932Z_grouping_424dbd1f2469";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_artwork_grouping_audit_v1";

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/g, "/");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseArtworkGroupingAuditArgsV1(argv = []) {
  return {
    groupingDir: parseFlag(argv, "grouping-dir") ?? DEFAULT_GROUPING_DIR,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    sampleSize: Number.parseInt(parseFlag(argv, "sample-size") ?? "25", 10),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/g, "-");
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function deterministicSample(rows, size, keySelector) {
  return [...rows]
    .sort((left, right) => {
      const leftKey = keySelector(left);
      const rightKey = keySelector(right);
      const hashComparison = sha256JsonV1(leftKey).localeCompare(sha256JsonV1(rightKey));
      return hashComparison || String(leftKey).localeCompare(String(rightKey));
    })
    .slice(0, Math.max(0, size));
}

function expectedGroupId(group) {
  const digest = sha256JsonV1({
    image_sha256: group.source_image_sha256,
    normalized_name: group.normalized_name,
    prompt_branch: group.prompt_branch,
  });
  return `cvag_${digest.slice(0, 24)}`;
}

function caseRow(category, key, details, checks) {
  const passed = Object.values(checks).every(Boolean);
  return {
    audit_version: CARD_VISUAL_ARTWORK_GROUPING_AUDIT_VERSION,
    audit_case_id: `cvaga_${sha256JsonV1({ category, key }).slice(0, 24)}`,
    category,
    policy_decision: passed ? "policy_correct" : "policy_failure",
    checks,
    details,
    reviewer_type: "deterministic_engineering_policy_review",
    human_visual_approval: false,
  };
}

export function buildArtworkGroupingAuditV1({ groups, memberships, conflicts, sampleSize = 25 }) {
  const findings = [];
  const groupById = new Map(groups.map((row) => [row.artwork_group_id, row]));
  const membersByGroup = new Map();
  for (const membership of memberships) {
    const rows = membersByGroup.get(membership.artwork_group_id) ?? [];
    rows.push(membership);
    membersByGroup.set(membership.artwork_group_id, rows);
  }

  for (const group of groups) {
    const members = membersByGroup.get(group.artwork_group_id) ?? [];
    const { artwork_group_hash: recordedHash, ...hashPayload } = group;
    if (group.artwork_group_id !== expectedGroupId(group)) findings.push(`unstable_group_id:${group.artwork_group_id}`);
    if (recordedHash !== sha256JsonV1(hashPayload)) findings.push(`group_hash_mismatch:${group.artwork_group_id}`);
    if (members.length !== group.member_count) findings.push(`member_count_mismatch:${group.artwork_group_id}`);
    if (uniqueSorted(members.map((row) => row.source_image_sha256)).length !== 1) findings.push(`image_span:${group.artwork_group_id}`);
    if (uniqueSorted(members.map((row) => row.grouping_evidence?.normalized_name)).length !== 1) findings.push(`name_span:${group.artwork_group_id}`);
    if (uniqueSorted(members.map((row) => row.prompt_branch)).length !== 1) findings.push(`branch_span:${group.artwork_group_id}`);
  }

  const memberIds = memberships.map((row) => row.card_print_id);
  if (new Set(memberIds).size !== memberIds.length) findings.push("duplicate_membership_ids");
  if (groups.length !== groupById.size) findings.push("duplicate_group_ids");
  for (const membership of memberships) {
    if (!groupById.has(membership.artwork_group_id)) findings.push(`missing_group:${membership.card_print_id}`);
  }

  const memberIdSet = new Set(memberIds);
  for (const conflict of conflicts) {
    if (memberIdSet.has(conflict.card_print_id)) findings.push(`conflict_membership_overlap:${conflict.card_print_id}`);
  }

  const multiGroups = groups.filter((row) => row.member_count > 1);
  const singletonGroups = groups.filter((row) => row.member_count === 1);
  const identityBuckets = new Map();
  for (const group of groups) {
    const key = `${group.normalized_name}\u001f${group.prompt_branch}`;
    const rows = identityBuckets.get(key) ?? [];
    rows.push(group);
    identityBuckets.set(key, rows);
  }
  const splitCandidates = [...identityBuckets.entries()]
    .map(([identityKey, rows]) => ({ identity_key: identityKey, groups: rows.sort((left, right) => left.artwork_group_id.localeCompare(right.artwork_group_id)) }))
    .filter((row) => uniqueSorted(row.groups.map((group) => group.source_image_sha256)).length > 1);

  const cases = [];
  for (const conflict of conflicts) {
    cases.push(caseRow("explicit_conflict", conflict.card_print_id, conflict, {
      absent_from_memberships: !memberIdSet.has(conflict.card_print_id),
      conflict_type_recorded: Boolean(conflict.conflict_type),
    }));
  }
  for (const group of deterministicSample(multiGroups, sampleSize, (row) => row.artwork_group_id)) {
    const members = membersByGroup.get(group.artwork_group_id) ?? [];
    cases.push(caseRow("multi_member_group", group.artwork_group_id, {
      artwork_group_id: group.artwork_group_id,
      normalized_name: group.normalized_name,
      prompt_branch: group.prompt_branch,
      source_image_sha256: group.source_image_sha256,
      member_card_print_ids: group.member_card_print_ids,
    }, {
      exact_member_count: members.length === group.member_count,
      exact_image_hash: uniqueSorted(members.map((row) => row.source_image_sha256)).length === 1,
      exact_normalized_name: uniqueSorted(members.map((row) => row.grouping_evidence?.normalized_name)).length === 1,
      exact_branch: uniqueSorted(members.map((row) => row.prompt_branch)).length === 1,
    }));
  }
  for (const group of deterministicSample(singletonGroups, sampleSize, (row) => row.artwork_group_id)) {
    const members = membersByGroup.get(group.artwork_group_id) ?? [];
    cases.push(caseRow("singleton_group", group.artwork_group_id, {
      artwork_group_id: group.artwork_group_id,
      normalized_name: group.normalized_name,
      prompt_branch: group.prompt_branch,
      source_image_sha256: group.source_image_sha256,
      card_print_id: members[0]?.card_print_id ?? null,
    }, {
      one_declared_member: group.member_count === 1,
      one_actual_member: members.length === 1,
      stable_group_id: group.artwork_group_id === expectedGroupId(group),
    }));
  }
  for (const split of deterministicSample(splitCandidates, sampleSize, (row) => row.identity_key)) {
    const imageHashes = uniqueSorted(split.groups.map((row) => row.source_image_sha256));
    cases.push(caseRow("same_name_different_image_split", split.identity_key, {
      identity_key: split.identity_key,
      artwork_group_ids: split.groups.map((row) => row.artwork_group_id),
      source_image_sha256_values: imageHashes,
    }, {
      repeated_identity: split.groups.length > 1,
      distinct_image_hashes: imageHashes.length > 1,
      groups_remain_separate: new Set(split.groups.map((row) => row.artwork_group_id)).size === split.groups.length,
    }));
  }

  const failedCases = cases.filter((row) => row.policy_decision !== "policy_correct");
  if (failedCases.length) findings.push(`failed_audit_cases:${failedCases.length}`);
  const expectedCaseCount = conflicts.length
    + Math.min(sampleSize, multiGroups.length)
    + Math.min(sampleSize, singletonGroups.length)
    + Math.min(sampleSize, splitCandidates.length);
  if (cases.length !== expectedCaseCount) findings.push(`audit_case_count_mismatch:${cases.length}:${expectedCaseCount}`);

  cases.sort((left, right) => left.category.localeCompare(right.category) || left.audit_case_id.localeCompare(right.audit_case_id));
  return {
    passed: findings.length === 0,
    findings,
    cases,
    counts: {
      artwork_groups: groups.length,
      memberships: memberships.length,
      explicit_conflicts: conflicts.length,
      multi_member_groups: multiGroups.length,
      singleton_groups: singletonGroups.length,
      same_name_different_image_candidates: splitCandidates.length,
      audit_cases: cases.length,
      policy_correct_cases: cases.length - failedCases.length,
      policy_failure_cases: failedCases.length,
    },
    sampled_cases_by_category: countBy(cases, (row) => row.category),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/u).filter((line) => line.trim()).map((line) => JSON.parse(line));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
}

function currentGitState() {
  const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  return { commit_sha: git(["rev-parse", "HEAD"]), branch: git(["branch", "--show-current"]), tracked_status_short: git(["status", "--short", "--untracked-files=no"]) };
}

async function verifyInputHashes(groupingDir, manifest) {
  const mismatches = [];
  for (const [file, expected] of Object.entries(manifest.files ?? {})) {
    const actual = sha256Buffer(await fs.readFile(path.join(groupingDir, file)));
    if (actual !== expected) mismatches.push({ file, expected, actual });
  }
  return mismatches;
}

function markdownReport(report) {
  const counts = report.audit.counts;
  return `# Card Visual Artwork Grouping Audit V1\n\nGenerated: ${report.created_at}\n\n## Verdict\n\n- Passed: \`${report.audit.passed}\`\n- Grouping commit: \`${report.run_plan.grouping_commit_sha}\`\n- Audit commit: \`${report.run_plan.audit_commit_sha}\`\n- Input hash mismatches: \`${report.input_hash_mismatches.length}\`\n- Artwork groups: \`${counts.artwork_groups}\`\n- Memberships: \`${counts.memberships}\`\n- Explicit conflicts reviewed: \`${counts.explicit_conflicts}\`\n- Multi-member groups in corpus: \`${counts.multi_member_groups}\`\n- Same-name/different-image candidates: \`${counts.same_name_different_image_candidates}\`\n- Audit cases: \`${counts.audit_cases}\`\n- Policy-correct cases: \`${counts.policy_correct_cases}\`\n- Policy failures: \`${counts.policy_failure_cases}\`\n\n## Sample Coverage\n\n${Object.entries(report.audit.sampled_cases_by_category).map(([key, value]) => `- ${key}: \`${value}\``).join("\n")}\n\n## Boundaries\n\nThis was a deterministic engineering policy audit, not human visual approval. No provider, database, approval, embedding, search projection, index, or public-read activity occurred.\n\n## Exact Next Gate\n\nIf this audit passes, lock Artwork Grouping V1.1 and build deterministic guarded search projection documents.\n`;
}

async function hashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return { artifact_kind: "card_visual_artwork_grouping_audit_v1_hash_manifest", hash_algorithm: "sha256", generated_at: nowIso(), directory: posixRelative(outputDir), file_count: files.length, files: entries };
}

export async function runArtworkGroupingAuditV1(args = parseArtworkGroupingAuditArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);
  if (!Number.isInteger(args.sampleSize) || args.sampleSize < 1) throw new Error("sample-size must be a positive integer");

  const groupingDir = repoPath(args.groupingDir);
  const [groupingReport, groups, memberships, conflicts, groupingHashes] = await Promise.all([
    readJson(path.join(groupingDir, "ARTWORK_GROUPING_RECONCILIATION.json")),
    readJsonl(path.join(groupingDir, "artwork_groups.jsonl")),
    readJsonl(path.join(groupingDir, "artwork_group_memberships.jsonl")),
    readJsonl(path.join(groupingDir, "artwork_group_conflicts.jsonl")),
    readJson(path.join(groupingDir, "artifact_hashes.json")),
  ]);
  if (!groupingReport.reconciliation?.reconciled) throw new Error("grouping input is not reconciled");
  if (groupingReport.version !== CARD_VISUAL_ARTWORK_GROUPING_VERSION) throw new Error(`unexpected grouping version: ${groupingReport.version}`);
  const inputHashMismatches = await verifyInputHashes(groupingDir, groupingHashes);
  const audit = buildArtworkGroupingAuditV1({ groups, memberships, conflicts, sampleSize: args.sampleSize });
  if (inputHashMismatches.length) {
    audit.passed = false;
    audit.findings.push(`input_hash_mismatches:${inputHashMismatches.length}`);
  }

  const runKey = sha256JsonV1({
    version: CARD_VISUAL_ARTWORK_GROUPING_AUDIT_VERSION,
    audit_commit_sha: git.commit_sha,
    grouping_run_key: groupingReport.run_plan.run_key,
    grouping_hash_manifest_sha256: sha256JsonV1(groupingHashes),
    sample_size: args.sampleSize,
  });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_audit_${runKey.slice(0, 12)}`);
  const runPlan = {
    version: CARD_VISUAL_ARTWORK_GROUPING_AUDIT_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    audit_commit_sha: git.commit_sha,
    grouping_commit_sha: groupingReport.run_plan.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    grouping_dir: posixRelative(groupingDir),
    grouping_run_key: groupingReport.run_plan.run_key,
    sample_size_per_category: args.sampleSize,
    reviewer_type: "deterministic_engineering_policy_review",
    human_visual_approval: false,
    boundaries: { provider_calls: false, database_connection: false, database_writes: false, approvals: false, embeddings: false, search_projections: false, index_writes: false, public_reads: false },
  };
  const report = { version: CARD_VISUAL_ARTWORK_GROUPING_AUDIT_VERSION, created_at: nowIso(), run_plan: runPlan, input_hash_mismatches: inputHashMismatches, audit };
  const files = ["run_plan.json", "artwork_grouping_audit_cases.jsonl", "ARTWORK_GROUPING_AUDIT.json", "ARTWORK_GROUPING_AUDIT.md"];
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);
  await writeJsonl(path.join(outputDir, "artwork_grouping_audit_cases.jsonl"), audit.cases);
  await writeJson(path.join(outputDir, "ARTWORK_GROUPING_AUDIT.json"), report);
  await fs.writeFile(path.join(outputDir, "ARTWORK_GROUPING_AUDIT.md"), markdownReport(report));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await hashManifest(outputDir, files));
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runArtworkGroupingAuditV1(parseArtworkGroupingAuditArgsV1(argv));
  console.log(`[card-visual-artwork-grouping-audit] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-artwork-grouping-audit] cases=${result.report.audit.counts.audit_cases}`);
  console.log(`[card-visual-artwork-grouping-audit] passed=${result.report.audit.passed}`);
  if (!result.report.audit.passed) process.exitCode = 1;
}
