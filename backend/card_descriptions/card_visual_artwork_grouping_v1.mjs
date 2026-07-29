import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CARD_VISUAL_CORPUS_EXPECTED_BRANCH, sha256JsonV1 } from "./card_visual_corpus_v1_inventory.mjs";

export const CARD_VISUAL_ARTWORK_GROUPING_VERSION = "CARD_VISUAL_ARTWORK_GROUPING_V1_1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_ELIGIBILITY_DIR = "docs/audits/card_visual_search_eligibility_v1_4/2026-07-21T16-32-41-129Z_eligibility_a206881f5a0b";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_artwork_grouping_v1_1";
export const CARD_VISUAL_ARTWORK_GROUPING_AUTHORITY = "exact_image_hash_same_canonical_name_and_branch";

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/g, "/");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const value = argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export function parseArtworkGroupingArgsV1(argv = []) {
  return {
    eligibilityDir: parseFlag(argv, "eligibility-dir") ?? DEFAULT_ELIGIBILITY_DIR,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
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

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

export function normalizeArtworkCanonicalNameV1(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019\u02bc\uff07]/gu, "'")
    .replace(/\s+/gu, " ")
    .replace(/[ -]+(ex|gx)$/u, " $1")
    .trim();
}

function groupingSignature(row) {
  return `${normalizeArtworkCanonicalNameV1(row.name)}\u001f${row.prompt_branch}`;
}

function stableArtworkGroupId(row) {
  const digest = sha256JsonV1({
    image_sha256: row.image_sha256,
    normalized_name: normalizeArtworkCanonicalNameV1(row.name),
    prompt_branch: row.prompt_branch,
  });
  return `cvag_${digest.slice(0, 24)}`;
}

function membershipRow(groupId, decision, inventory) {
  const projectionGuardKeys = decision.projection_guard_keys ?? [];
  const visibilityGuard = projectionGuardKeys.includes("image_or_text_visibility");
  return {
    artwork_group_id: groupId,
    card_print_id: decision.card_print_id,
    gv_id: decision.gv_id ?? inventory.gv_id ?? null,
    name: decision.name ?? inventory.name ?? null,
    prompt_branch: decision.prompt_branch,
    eligibility_tier: decision.tier,
    projection_guard_keys: [...projectionGuardKeys],
    artwork_fact_source: "own_image",
    variant_image_status: "available",
    print_marker_evidence_status: visibilityGuard ? "unreadable" : "not_observed",
    grouping_authority: CARD_VISUAL_ARTWORK_GROUPING_AUTHORITY,
    grouping_evidence: {
      image_sha256: inventory.image_sha256,
      normalized_name: normalizeArtworkCanonicalNameV1(decision.name ?? inventory.name),
      prompt_branch: decision.prompt_branch,
    },
    source_image_sha256: inventory.image_sha256,
    source_fact_graph_sha256: decision.source_fact_graph_sha256,
    source_generated_row_sha256: decision.source_generated_row_sha256,
    source_eligibility_decision_sha256: decision.decision_sha256,
    image_confidence: decision.confidence?.image_quality ?? null,
  };
}

function groupRow(members) {
  const sortedMembers = [...members].sort((left, right) => left.decision.card_print_id.localeCompare(right.decision.card_print_id));
  const first = sortedMembers[0];
  const groupId = stableArtworkGroupId({
    image_sha256: first.inventory.image_sha256,
    name: first.decision.name ?? first.inventory.name,
    prompt_branch: first.decision.prompt_branch,
  });
  const memberships = sortedMembers.map(({ decision, inventory }) => membershipRow(groupId, decision, inventory));
  const tier = sortedMembers.some(({ decision }) => decision.tier === "B") ? "B" : "A";
  const projectionGuards = uniqueSorted(sortedMembers.flatMap(({ decision }) => decision.projection_guard_keys ?? []));
  const group = {
    artwork_group_id: groupId,
    representative_card_print_id: sortedMembers[0].decision.card_print_id,
    member_count: memberships.length,
    membership_kind: memberships.length === 1 ? "singleton" : "shared_exact_image",
    normalized_name: normalizeArtworkCanonicalNameV1(first.decision.name ?? first.inventory.name),
    name_snapshot: first.decision.name ?? first.inventory.name,
    prompt_branch: first.decision.prompt_branch,
    source_image_sha256: first.inventory.image_sha256,
    eligibility_tier: tier,
    projection_guard_keys: projectionGuards,
    grouping_authority: CARD_VISUAL_ARTWORK_GROUPING_AUTHORITY,
    grouping_evidence: {
      image_sha256: first.inventory.image_sha256,
      normalized_name: normalizeArtworkCanonicalNameV1(first.decision.name ?? first.inventory.name),
      prompt_branch: first.decision.prompt_branch,
    },
    member_card_print_ids: memberships.map((row) => row.card_print_id),
    source_fact_graph_hashes: uniqueSorted(memberships.map((row) => row.source_fact_graph_sha256)),
    source_generated_row_hashes: uniqueSorted(memberships.map((row) => row.source_generated_row_sha256)),
  };
  group.artwork_group_hash = sha256JsonV1(group);
  return { group, memberships };
}

export function groupArtworkCandidatesV1(decisions, inventoryRows) {
  const inventoryById = new Map(inventoryRows.map((row) => [row.card_print_id, row]));
  const eligible = decisions.filter((row) => row.search_eligible && ["A", "B"].includes(row.tier));
  const conflicts = [];
  const buckets = new Map();

  for (const decision of eligible) {
    const inventory = inventoryById.get(decision.card_print_id);
    const sourceEvidenceComplete = Boolean(
      inventory
      && inventory.outcome_class === "valid"
      && inventory.image_sha256
      && decision.name
      && decision.prompt_branch
      && decision.source_fact_graph_sha256
      && decision.source_generated_row_sha256
      && decision.decision_sha256
    );
    if (decision.energy_card_detected || decision.prompt_branch === "energy") {
      conflicts.push({
        card_print_id: decision.card_print_id,
        gv_id: decision.gv_id ?? null,
        name: decision.name ?? inventory?.name ?? null,
        conflict_type: "energy_card_not_groupable",
        image_sha256: inventory?.image_sha256 ?? null,
        normalized_name: normalizeArtworkCanonicalNameV1(decision.name ?? inventory?.name),
        prompt_branch: decision.prompt_branch,
        decision_sha256: decision.decision_sha256 ?? null,
      });
      continue;
    }
    if (!sourceEvidenceComplete) {
      conflicts.push({
        card_print_id: decision.card_print_id,
        gv_id: decision.gv_id ?? null,
        conflict_type: "incomplete_grouping_source_evidence",
        image_sha256: inventory?.image_sha256 ?? null,
        normalized_name: normalizeArtworkCanonicalNameV1(decision.name ?? inventory?.name),
        prompt_branch: decision.prompt_branch,
        decision_sha256: decision.decision_sha256,
      });
      continue;
    }
    const rows = buckets.get(inventory.image_sha256) ?? [];
    rows.push({ decision, inventory });
    buckets.set(inventory.image_sha256, rows);
  }

  const groups = [];
  const memberships = [];
  for (const [imageSha256, members] of [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const signatures = uniqueSorted(members.map(({ decision }) => groupingSignature(decision)));
    if (signatures.length !== 1) {
      const collisionMembers = members.map(({ decision }) => ({
        card_print_id: decision.card_print_id,
        gv_id: decision.gv_id ?? null,
        name: decision.name ?? null,
        normalized_name: normalizeArtworkCanonicalNameV1(decision.name),
        prompt_branch: decision.prompt_branch,
        decision_sha256: decision.decision_sha256,
      })).sort((left, right) => left.card_print_id.localeCompare(right.card_print_id));
      for (const member of collisionMembers) {
        conflicts.push({
          ...member,
          conflict_type: "image_hash_cross_identity_collision",
          image_sha256: imageSha256,
          collision_signatures: signatures,
          collision_card_print_ids: collisionMembers.map((row) => row.card_print_id),
        });
      }
      continue;
    }
    const built = groupRow(members);
    groups.push(built.group);
    memberships.push(...built.memberships);
  }

  groups.sort((left, right) => left.artwork_group_id.localeCompare(right.artwork_group_id));
  memberships.sort((left, right) => left.card_print_id.localeCompare(right.card_print_id));
  conflicts.sort((left, right) => left.card_print_id.localeCompare(right.card_print_id));
  return { eligible, groups, memberships, conflicts };
}

export function reconcileArtworkGroupingV1(result, decisions) {
  const findings = [];
  const eligibleIds = result.eligible.map((row) => row.card_print_id).sort();
  const memberIds = result.memberships.map((row) => row.card_print_id).sort();
  const conflictIds = result.conflicts.map((row) => row.card_print_id).sort();
  const accountedIds = [...memberIds, ...conflictIds].sort();
  const duplicateMemberIds = duplicates(memberIds);
  const duplicateConflictIds = duplicates(conflictIds);
  const conflictIdSet = new Set(conflictIds);
  const overlapIds = memberIds.filter((id) => conflictIdSet.has(id));
  if (JSON.stringify(eligibleIds) !== JSON.stringify(accountedIds)) findings.push("eligible_accounting_mismatch");
  if (duplicateMemberIds.length) findings.push(`duplicate_memberships:${duplicateMemberIds.length}`);
  if (duplicateConflictIds.length) findings.push(`duplicate_conflicts:${duplicateConflictIds.length}`);
  if (overlapIds.length) findings.push(`membership_conflict_overlap:${overlapIds.length}`);
  const groupIds = new Set(result.groups.map((row) => row.artwork_group_id));
  const duplicateGroupIds = duplicates(result.groups.map((row) => row.artwork_group_id));
  if (duplicateGroupIds.length) findings.push(`duplicate_artwork_groups:${duplicateGroupIds.length}`);
  const missingGroups = result.memberships.filter((row) => !groupIds.has(row.artwork_group_id));
  if (missingGroups.length) findings.push(`memberships_missing_group:${missingGroups.length}`);
  const tierCMembers = result.memberships.filter((row) => row.eligibility_tier === "C");
  if (tierCMembers.length) findings.push(`tier_c_memberships:${tierCMembers.length}`);
  const energyMembers = result.memberships.filter((membership) => decisions.find((row) => row.card_print_id === membership.card_print_id)?.energy_card_detected);
  if (energyMembers.length) findings.push(`energy_memberships:${energyMembers.length}`);
  for (const group of result.groups) {
    const members = result.memberships.filter((row) => row.artwork_group_id === group.artwork_group_id);
    if (members.length !== group.member_count) findings.push(`group_member_count_mismatch:${group.artwork_group_id}`);
    if (uniqueSorted(members.map((row) => row.grouping_evidence.normalized_name)).length !== 1) findings.push(`group_name_span:${group.artwork_group_id}`);
    if (uniqueSorted(members.map((row) => row.prompt_branch)).length !== 1) findings.push(`group_branch_span:${group.artwork_group_id}`);
    if (uniqueSorted(members.map((row) => row.source_image_sha256)).length !== 1) findings.push(`group_image_span:${group.artwork_group_id}`);
    const { artwork_group_hash: expected, ...payload } = group;
    if (expected !== sha256JsonV1(payload)) findings.push(`group_hash_mismatch:${group.artwork_group_id}`);
  }
  return {
    reconciled: findings.length === 0,
    findings,
    counts: {
      source_decisions: decisions.length,
      eligible_rows: result.eligible.length,
      artwork_groups: result.groups.length,
      memberships: result.memberships.length,
      conflict_rows: result.conflicts.length,
      singleton_groups: result.groups.filter((row) => row.member_count === 1).length,
      multi_member_groups: result.groups.filter((row) => row.member_count > 1).length,
      multi_member_memberships: result.groups.filter((row) => row.member_count > 1).reduce((sum, row) => sum + row.member_count, 0),
      duplicate_memberships: duplicateMemberIds.length,
      duplicate_conflicts: duplicateConflictIds.length,
      duplicate_artwork_groups: duplicateGroupIds.length,
      membership_conflict_overlap: overlapIds.length,
      tier_c_memberships: tierCMembers.length,
      energy_memberships: energyMembers.length,
    },
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/u).filter((line) => line.trim()).map(JSON.parse);
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

function markdownReport(report) {
  const counts = report.reconciliation.counts;
  return `# Card Visual Artwork Grouping V1.1\n\nGenerated: ${report.created_at}\n\n## Result\n\n- Reconciled: \`${report.reconciliation.reconciled}\`\n- Producing commit: \`${report.run_plan.commit_sha}\`\n- Eligible rows: \`${counts.eligible_rows}\`\n- Artwork groups: \`${counts.artwork_groups}\`\n- Memberships: \`${counts.memberships}\`\n- Explicit conflict rows: \`${counts.conflict_rows}\`\n- Singleton groups: \`${counts.singleton_groups}\`\n- Multi-member groups: \`${counts.multi_member_groups}\`\n- Multi-member memberships: \`${counts.multi_member_memberships}\`\n- Tier C memberships: \`${counts.tier_c_memberships}\`\n- Energy memberships: \`${counts.energy_memberships}\`\n- Findings: \`${report.reconciliation.findings.length}\`\n\n## Authority\n\nRows merge only when source image SHA-256, normalized canonical name, and prompt branch all agree. Cross-identity image collisions are explicit conflicts. Same-name rows with different images remain separate.\n\n## Boundaries\n\nNo provider calls, database connections or writes, approvals, embeddings, search projections, index writes, or public reads occurred.\n\n## Exact Next Gate\n\nAudit every collision plus deterministic multi-member, singleton, and same-name split samples. Do not build search projections until that audit passes.\n`;
}

async function hashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return { artifact_kind: "card_visual_artwork_grouping_v1_1_hash_manifest", hash_algorithm: "sha256", generated_at: nowIso(), directory: posixRelative(outputDir), file_count: files.length, files: entries };
}

export async function runArtworkGroupingV1(args = parseArtworkGroupingArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);
  const eligibilityDir = repoPath(args.eligibilityDir);
  const eligibilityReportPath = path.join(eligibilityDir, "ELIGIBILITY_RECONCILIATION.json");
  const decisionsPath = path.join(eligibilityDir, "eligibility_decisions.jsonl");
  const [eligibilityReport, decisions] = await Promise.all([readJson(eligibilityReportPath), readJsonl(decisionsPath)]);
  if (!eligibilityReport.reconciled) throw new Error("eligibility source is not reconciled");
  if (eligibilityReport.version !== "CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4") throw new Error(`unexpected eligibility version: ${eligibilityReport.version}`);
  const inventoryDir = repoPath(eligibilityReport.run_plan.inventory_dir);
  const inventoryPath = path.join(inventoryDir, "corpus_inventory.jsonl");
  const inventoryRows = await readJsonl(inventoryPath);
  const inputHashes = {
    eligibility_report: sha256Buffer(await fs.readFile(eligibilityReportPath)),
    eligibility_decisions: sha256Buffer(await fs.readFile(decisionsPath)),
    corpus_inventory: sha256Buffer(await fs.readFile(inventoryPath)),
  };
  const runKey = sha256JsonV1({ version: CARD_VISUAL_ARTWORK_GROUPING_VERSION, commit_sha: git.commit_sha, input_hashes: inputHashes });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_grouping_${runKey.slice(0, 12)}`);
  const runPlan = {
    version: CARD_VISUAL_ARTWORK_GROUPING_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    eligibility_dir: posixRelative(eligibilityDir),
    eligibility_run_key: eligibilityReport.run_plan.run_key,
    inventory_dir: posixRelative(inventoryDir),
    input_hashes_sha256: inputHashes,
    grouping_authority: CARD_VISUAL_ARTWORK_GROUPING_AUTHORITY,
    boundaries: { provider_calls: false, database_connection: false, database_writes: false, approvals: false, embeddings: false, search_projections: false, index_writes: false, public_reads: false },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);
  const grouped = groupArtworkCandidatesV1(decisions, inventoryRows);
  const reconciliation = reconcileArtworkGroupingV1(grouped, decisions);
  const report = { version: CARD_VISUAL_ARTWORK_GROUPING_VERSION, created_at: nowIso(), run_plan: runPlan, reconciliation };
  const files = ["run_plan.json", "artwork_groups.jsonl", "artwork_group_memberships.jsonl", "artwork_group_conflicts.jsonl", "ARTWORK_GROUPING_RECONCILIATION.json", "ARTWORK_GROUPING_RECONCILIATION.md"];
  await writeJsonl(path.join(outputDir, "artwork_groups.jsonl"), grouped.groups);
  await writeJsonl(path.join(outputDir, "artwork_group_memberships.jsonl"), grouped.memberships);
  await writeJsonl(path.join(outputDir, "artwork_group_conflicts.jsonl"), grouped.conflicts);
  await writeJson(path.join(outputDir, "ARTWORK_GROUPING_RECONCILIATION.json"), report);
  await fs.writeFile(path.join(outputDir, "ARTWORK_GROUPING_RECONCILIATION.md"), markdownReport(report));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await hashManifest(outputDir, files));
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runArtworkGroupingV1(parseArtworkGroupingArgsV1(argv));
  const counts = result.report.reconciliation.counts;
  console.log(`[card-visual-artwork-grouping] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-artwork-grouping] eligible_rows=${counts.eligible_rows}`);
  console.log(`[card-visual-artwork-grouping] artwork_groups=${counts.artwork_groups}`);
  console.log(`[card-visual-artwork-grouping] conflict_rows=${counts.conflict_rows}`);
  console.log(`[card-visual-artwork-grouping] reconciled=${result.report.reconciliation.reconciled}`);
  if (!result.report.reconciliation.reconciled) process.exitCode = 1;
}
