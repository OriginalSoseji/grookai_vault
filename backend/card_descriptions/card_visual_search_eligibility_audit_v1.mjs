import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CARD_VISUAL_CORPUS_EXPECTED_BRANCH, sha256JsonV1 } from "./card_visual_corpus_v1_inventory.mjs";
import { CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION } from "./card_visual_search_eligibility_v1.mjs";

export const CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_VERSION = "CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_V1_1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_ELIGIBILITY_DIR = "docs/audits/card_visual_search_eligibility_v1_3/2026-07-21T16-27-41-733Z_eligibility_9c39e1521be3";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_search_eligibility_audit_v1_1";
const INCLUDED_BRANCHES = Object.freeze(["pokemon", "trainer", "stadium", "item_tool_supporter"]);

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/g, "/");
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/g, "-");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseEligibilityAuditArgsV1(argv = []) {
  return {
    eligibilityDir: parseFlag(argv, "eligibility-dir") ?? DEFAULT_ELIGIBILITY_DIR,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    seed: parseFlag(argv, "seed") ?? "CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_V1",
  };
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function gitValue(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function currentGitState() {
  return {
    commit_sha: gitValue(["rev-parse", "HEAD"]),
    branch: gitValue(["branch", "--show-current"]),
    tracked_status_short: gitValue(["status", "--short", "--untracked-files=no"]),
  };
}

function deterministicRank(seed, stratum, decision) {
  return sha256Buffer(`${seed}:${stratum}:${decision.decision_sha256}:${decision.card_print_id}`);
}

function buildStrata(decisions) {
  const guards = [...new Set(decisions.filter((row) => row.tier === "B").flatMap((row) => row.projection_guard_keys))].sort();
  const criticalReasons = [...new Set(decisions
    .filter((row) => row.tier === "C")
    .flatMap((row) => row.critical_reasons)
    .filter((reason) => !reason.startsWith("source_gap:")))].sort();
  const sourceGaps = [...new Set(decisions
    .filter((row) => row.tier === "C")
    .flatMap((row) => row.critical_reasons)
    .filter((reason) => reason.startsWith("source_gap:")))].sort();
  return [
    ...INCLUDED_BRANCHES.map((branch) => ({ key: `tier_a_branch:${branch}`, quota: 2, match: (row) => row.tier === "A" && row.prompt_branch === branch })),
    ...INCLUDED_BRANCHES.map((branch) => ({ key: `tier_b_branch:${branch}`, quota: 2, match: (row) => row.tier === "B" && row.prompt_branch === branch })),
    ...guards.map((guard) => ({ key: `tier_b_guard:${guard}`, quota: 2, match: (row) => row.tier === "B" && row.projection_guard_keys.includes(guard) })),
    ...criticalReasons.map((reason) => ({ key: `tier_c_reason:${reason}`, quota: 3, match: (row) => row.tier === "C" && row.critical_reasons.includes(reason) })),
    ...sourceGaps.map((reason) => ({ key: `tier_c_gap:${reason}`, quota: 2, match: (row) => row.tier === "C" && row.critical_reasons.includes(reason) })),
  ];
}

export function selectEligibilityAuditSampleV1(decisions, seed = CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_VERSION) {
  const strata = buildStrata(decisions);
  const selected = new Map();
  const coverage = [];

  for (const stratum of strata) {
    const candidates = decisions
      .filter(stratum.match)
      .sort((a, b) => deterministicRank(seed, stratum.key, a).localeCompare(deterministicRank(seed, stratum.key, b)));
    const picks = candidates.slice(0, Math.min(stratum.quota, candidates.length));
    for (const decision of picks) {
      const current = selected.get(decision.card_print_id) ?? { decision, strata: [] };
      current.strata.push(stratum.key);
      selected.set(decision.card_print_id, current);
    }
    coverage.push({
      stratum: stratum.key,
      requested: stratum.quota,
      available: candidates.length,
      selected: picks.length,
      card_print_ids: picks.map((row) => row.card_print_id),
      satisfied: picks.length === Math.min(stratum.quota, candidates.length) && picks.length > 0,
    });
  }

  const sample = [...selected.values()]
    .map((entry) => ({ ...entry.decision, audit_strata: [...entry.strata].sort() }))
    .sort((a, b) => a.card_print_id.localeCompare(b.card_print_id));
  return { sample, coverage };
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row) ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function decisionHashIsValid(decision) {
  const { decision_sha256: expected, audit_strata: _auditStrata, ...payload } = decision;
  return expected === sha256JsonV1(payload);
}

async function enrichSampleWithSourceEvidence(sample, inventoryRows, inventoryPlan) {
  const inventoryById = new Map(inventoryRows.map((row) => [row.card_print_id, row]));
  const dbExport = await readJson(repoPath(inventoryPlan.sources.database_saved_export));
  const databaseGeneratedRows = new Map((dbExport.records ?? []).map((record) => [record.card_print_id, record.generated_row]));
  const enriched = [];
  for (const decision of sample) {
    const inventory = inventoryById.get(decision.card_print_id);
    let generatedRow = null;
    if (inventory?.outcome_class === "valid") {
      if (inventory.source === "private_database_apply_1000") generatedRow = databaseGeneratedRows.get(decision.card_print_id) ?? null;
      else generatedRow = (await readJson(repoPath(inventory.source_artifact_path))).generated_row ?? null;
    }
    const graph = generatedRow?.visual_attributes?.fact_graph;
    enriched.push({
      ...decision,
      source_artifact_path: inventory?.source_artifact_path ?? null,
      source_artifact_sha256: inventory?.source_artifact_sha256 ?? null,
      source_image_sha256: inventory?.image_sha256 ?? null,
      source_description_id: inventory?.description_id ?? null,
      image_source: generatedRow?.image_source ?? decision.image_source ?? null,
      image_source_key: generatedRow?.image_source_key ?? null,
      observations_count: graph?.observations?.length ?? null,
      typed_facts_count: graph?.typed_facts?.length ?? null,
      source_evidence_status: generatedRow ? "loaded_and_hash_bound" : inventory?.outcome_class === "valid" ? "missing" : "source_gap",
    });
  }
  return enriched;
}

function markdownPacket(report, rows) {
  const table = rows.map((row, index) => {
    const guards = row.projection_guard_keys.join(", ") || "none";
    const reasons = row.critical_reasons.join(", ") || row.review_reasons.join(", ") || "clean";
    return `| ${index + 1} | ${row.tier} | ${row.gv_id ?? "-"} | ${String(row.name ?? "-").replace(/\|/g, "\\|")} | ${row.prompt_branch ?? "-"} | ${guards} | ${String(reasons).replace(/\|/g, "\\|")} |`;
  }).join("\n");
  return `# Card Visual Search Eligibility V1 Audit Packet\n\nGenerated: ${report.created_at}\n\n## Scope\n\nThis is a deterministic policy audit sample. It does not approve descriptions or visual facts. Review asks only whether the eligibility tier and guard/reason are defensible from the preserved source evidence.\n\n- Sample rows: \`${rows.length}\`\n- Covered strata: \`${report.counts.strata_satisfied}/${report.counts.strata_total}\`\n- Tier A sample: \`${report.distributions.tiers.A ?? 0}\`\n- Tier B sample: \`${report.distributions.tiers.B ?? 0}\`\n- Tier C sample: \`${report.distributions.tiers.C ?? 0}\`\n- Reconciled: \`${report.reconciled}\`\n\n## Review Decisions\n\nAllowed row-level decisions:\n\n- policy_correct\n- tier_too_permissive\n- tier_too_strict\n- guard_missing\n- guard_unnecessary\n- source_evidence_mismatch\n\n## Sample\n\n| # | Tier | GV-ID | Card | Branch | Guards | Reason |\n| ---: | --- | --- | --- | --- | --- | --- |\n${table}\n\n## Boundaries\n\nNo provider calls, database connections or writes, approvals, embeddings, artwork grouping, projections, index writes, or public reads occurred.\n`;
}

async function createHashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return {
    artifact_kind: "card_visual_search_eligibility_audit_v1_hash_manifest",
    hash_algorithm: "sha256",
    generated_at: nowIso(),
    directory: posixRelative(outputDir),
    file_count: files.length,
    files: entries,
  };
}

export async function runEligibilityAuditV1(args = parseEligibilityAuditArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);

  const eligibilityDir = repoPath(args.eligibilityDir);
  const reportPath = path.join(eligibilityDir, "ELIGIBILITY_RECONCILIATION.json");
  const decisionsPath = path.join(eligibilityDir, "eligibility_decisions.jsonl");
  const [eligibilityReport, decisions] = await Promise.all([readJson(reportPath), readJsonl(decisionsPath)]);
  if (!eligibilityReport.reconciled) throw new Error("eligibility source is not reconciled");
  if (eligibilityReport.version !== CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION) throw new Error("unexpected eligibility version");

  const inventoryDir = repoPath(eligibilityReport.run_plan.inventory_dir);
  const inventoryPath = path.join(inventoryDir, "corpus_inventory.jsonl");
  const inventoryReport = await readJson(path.join(inventoryDir, "CORPUS_SOURCE_RECONCILIATION.json"));
  const inventoryRows = await readJsonl(inventoryPath);
  const inputHashes = {
    eligibility_report: sha256Buffer(await fs.readFile(reportPath)),
    eligibility_decisions: sha256Buffer(await fs.readFile(decisionsPath)),
    corpus_inventory: sha256Buffer(await fs.readFile(inventoryPath)),
  };
  const runKey = sha256JsonV1({ version: CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_VERSION, commit_sha: git.commit_sha, seed: args.seed, input_hashes: inputHashes });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_audit_${runKey.slice(0, 12)}`);
  const runPlan = {
    version: CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    eligibility_dir: posixRelative(eligibilityDir),
    eligibility_run_key: eligibilityReport.run_plan.run_key,
    seed: args.seed,
    input_hashes_sha256: inputHashes,
    boundaries: {
      provider_calls: false,
      database_connection: false,
      database_writes: false,
      approvals: false,
      embeddings: false,
      artwork_grouping: false,
      search_projections: false,
      index_writes: false,
      public_reads: false,
    },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);

  const selection = selectEligibilityAuditSampleV1(decisions, args.seed);
  const findings = [];
  const unsatisfied = selection.coverage.filter((row) => !row.satisfied);
  if (unsatisfied.length) findings.push(`unsatisfied_strata:${unsatisfied.map((row) => row.stratum).join(",")}`);
  if (new Set(selection.sample.map((row) => row.card_print_id)).size !== selection.sample.length) findings.push("duplicate_sample_ids");
  const badDecisionHashes = selection.sample.filter((row) => !decisionHashIsValid(row));
  if (badDecisionHashes.length) findings.push(`bad_decision_hashes:${badDecisionHashes.length}`);
  const enrichedSample = await enrichSampleWithSourceEvidence(selection.sample, inventoryRows, inventoryReport.run_plan);
  const missingSourceEvidence = enrichedSample.filter((row) => row.source_outcome === "valid" && row.source_evidence_status !== "loaded_and_hash_bound");
  if (missingSourceEvidence.length) findings.push(`missing_source_evidence:${missingSourceEvidence.length}`);

  const reviewTemplate = enrichedSample.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    tier: row.tier,
    audit_strata: row.audit_strata,
    review_decision: null,
    reviewer_key: null,
    reviewed_at: null,
    notes: null,
  }));
  const report = {
    version: CARD_VISUAL_SEARCH_ELIGIBILITY_AUDIT_VERSION,
    created_at: nowIso(),
    run_plan: runPlan,
    reconciled: findings.length === 0,
    findings,
    counts: {
      source_decisions: decisions.length,
      sample_rows: enrichedSample.length,
      unique_sample_ids: new Set(enrichedSample.map((row) => row.card_print_id)).size,
      strata_total: selection.coverage.length,
      strata_satisfied: selection.coverage.filter((row) => row.satisfied).length,
      bad_decision_hashes: badDecisionHashes.length,
      missing_source_evidence: missingSourceEvidence.length,
    },
    distributions: {
      tiers: countBy(enrichedSample, (row) => row.tier),
      branches: countBy(enrichedSample, (row) => row.prompt_branch),
      source_outcomes: countBy(enrichedSample, (row) => row.source_outcome),
    },
    coverage: selection.coverage,
    human_review_status: "awaiting_stratified_policy_review",
  };

  const files = [
    "run_plan.json",
    "eligibility_audit_sample.jsonl",
    "eligibility_audit_review_template.jsonl",
    "AUDIT_SAMPLE_RECONCILIATION.json",
    "ELIGIBILITY_POLICY_AUDIT_PACKET.md",
  ];
  await writeJsonl(path.join(outputDir, "eligibility_audit_sample.jsonl"), enrichedSample);
  await writeJsonl(path.join(outputDir, "eligibility_audit_review_template.jsonl"), reviewTemplate);
  await writeJson(path.join(outputDir, "AUDIT_SAMPLE_RECONCILIATION.json"), report);
  await writeText(path.join(outputDir, "ELIGIBILITY_POLICY_AUDIT_PACKET.md"), markdownPacket(report, enrichedSample));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await createHashManifest(outputDir, files));
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runEligibilityAuditV1(parseEligibilityAuditArgsV1(argv));
  console.log(`[card-visual-eligibility-audit] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-eligibility-audit] sample_rows=${result.report.counts.sample_rows}`);
  console.log(`[card-visual-eligibility-audit] strata=${result.report.counts.strata_satisfied}/${result.report.counts.strata_total}`);
  console.log(`[card-visual-eligibility-audit] reconciled=${result.report.reconciled}`);
  if (!result.report.reconciled) process.exitCode = 1;
}
