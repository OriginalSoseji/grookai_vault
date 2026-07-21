import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { CARD_VISUAL_CORPUS_EXPECTED_BRANCH, sha256JsonV1 } from "./card_visual_corpus_v1_inventory.mjs";
import { CARD_VISUAL_SEARCH_GOLD_JUDGMENT_VERSION, CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION } from "./card_visual_search_judgment_packet_v1.mjs";

export const CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_VERSION = "CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_PACKET_DIR = "docs/audits/card_visual_search_judgment_packet_v1/2026-07-21T18-02-26-067Z_packet_f4d102548641";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_search_calibration_evaluator_v1";
const RESULT_LABELS = new Set(["highly_relevant", "relevant", "acceptable_alternate", "not_relevant", "must_exclude"]);
const QUERY_DECISIONS = new Set(["results_judged", "valid_zero_result", "query_invalid"]);
const FAILURE_LABELS = new Set(["correct_result_missing", "incorrect_result_included", "correct_artwork_wrong_printing_expansion", "correct_cue_wrong_subject_role", "unsupported_inference", "alias_overreach", "count_mismatch", "representation_depicted_subject_confusion", "scene_subject_representation_confusion", "duplicate_artwork_crowding", "canonical_filter_violation", "evidence_explanation_mismatch", "valid_zero_result", "latency_budget_failure", "index_coverage_gap"]);
const DIFFICULT_FAMILIES = new Set(["subject_roles", "multi_subject_scenes", "objects_counts", "representation_cameo", "alias_intent", "printing_expansion", "negative_zero_result"]);
const POSITIVE_LABELS = new Set(["highly_relevant", "relevant", "acceptable_alternate"]);
const GAINS = { highly_relevant: 3, relevant: 2, acceptable_alternate: 1, not_relevant: 0, must_exclude: 0 };

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/gu, "/");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseCardVisualSearchCalibrationEvaluatorArgsV1(argv = []) {
  const judgmentValue = parseFlag(argv, "judgments");
  return {
    packetDir: parseFlag(argv, "packet-dir") ?? DEFAULT_PACKET_DIR,
    judgmentPaths: judgmentValue ? judgmentValue.split(",").map((value) => value.trim()).filter(Boolean) : [],
    adjudicationPath: parseFlag(argv, "adjudication"),
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    readinessOnly: argv.includes("--readiness-only"),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/gu, "-");
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const rows = [];
  const stream = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of stream) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
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

function sameStringSet(left, right) {
  return JSON.stringify([...new Set(left ?? [])].sort()) === JSON.stringify([...new Set(right ?? [])].sort());
}

function judgmentSignature(row) {
  return sha256JsonV1({
    query_decision: row.query_decision,
    failure_labels: [...new Set(row.failure_labels ?? [])].sort(),
    top_result_judgments: row.top_result_judgments.map((result) => ({ artwork_group_id: result.artwork_group_id, rank: result.rank, judgment: result.judgment })),
    source_candidate_judgment: row.source_candidate_judgment ? { artwork_group_id: row.source_candidate_judgment.artwork_group_id, judgment: row.source_candidate_judgment.judgment } : null,
  });
}

export function validateJudgmentSubmissionV1(rows, packet, { requireAllQueries = false, requiredFamilies = null, submissionName = "submission" } = {}) {
  const packetQueries = new Map(packet.queries.map((query) => [query.query_id, query]));
  const findings = [];
  const completed = new Map();
  const seen = new Set();
  let reviewerKey = null;

  for (const row of rows) {
    if (!packetQueries.has(row.query_id)) {
      findings.push(`unknown_query_id:${row.query_id}`);
      continue;
    }
    if (seen.has(row.query_id)) findings.push(`duplicate_query_id:${row.query_id}`);
    seen.add(row.query_id);
    if (row.packet_version !== packet.packet_version) findings.push(`packet_version_mismatch:${row.query_id}`);
    if (row.judgment_set_version !== packet.judgment_set_version) findings.push(`judgment_version_mismatch:${row.query_id}`);
    if (row.source_commit_sha !== packet.commit_sha) findings.push(`source_commit_mismatch:${row.query_id}`);
    if (row.source_run_key !== packet.run_key) findings.push(`source_run_key_mismatch:${row.query_id}`);
    if (!row.completed_at) continue;
    if (!String(row.reviewer_key ?? "").trim()) findings.push(`missing_reviewer_key:${row.query_id}`);
    else if (reviewerKey && reviewerKey !== row.reviewer_key) findings.push(`mixed_reviewer_keys:${row.query_id}`);
    else reviewerKey = row.reviewer_key;
    if (!QUERY_DECISIONS.has(row.query_decision)) findings.push(`invalid_query_decision:${row.query_id}`);
    if (row.query_decision === "query_invalid" && !String(row.notes ?? "").trim()) findings.push(`query_invalid_missing_note:${row.query_id}`);
    for (const failure of row.failure_labels ?? []) if (!FAILURE_LABELS.has(failure)) findings.push(`invalid_failure_label:${row.query_id}:${failure}`);

    const query = packetQueries.get(row.query_id);
    const expectedResults = query.top_results.map((result) => `${result.rank}:${result.artwork_group_id}`);
    const actualResults = (row.top_result_judgments ?? []).map((result) => `${result.rank}:${result.artwork_group_id}`);
    if (JSON.stringify(expectedResults) !== JSON.stringify(actualResults)) findings.push(`top_result_identity_mismatch:${row.query_id}`);
    for (const result of row.top_result_judgments ?? []) if (!RESULT_LABELS.has(result.judgment)) findings.push(`missing_or_invalid_result_judgment:${row.query_id}:${result.artwork_group_id}`);

    const expectedSource = query.source_candidate && !query.source_candidate.present_in_top_results ? query.source_candidate.artwork_group_id : null;
    const actualSource = row.source_candidate_judgment?.artwork_group_id ?? null;
    if (expectedSource !== actualSource) findings.push(`source_candidate_identity_mismatch:${row.query_id}`);
    if (expectedSource && !RESULT_LABELS.has(row.source_candidate_judgment?.judgment)) findings.push(`missing_or_invalid_source_judgment:${row.query_id}`);
    if (row.query_decision === "valid_zero_result") {
      const labels = [...(row.top_result_judgments ?? []).map((result) => result.judgment), row.source_candidate_judgment?.judgment].filter(Boolean);
      if (labels.some((label) => POSITIVE_LABELS.has(label))) findings.push(`valid_zero_has_positive_judgment:${row.query_id}`);
    }
    completed.set(row.query_id, row);
  }

  const requiredQueries = packet.queries.filter((query) => requireAllQueries || requiredFamilies?.has(query.family));
  for (const query of requiredQueries) if (!completed.has(query.query_id)) findings.push(`missing_completed_query:${query.query_id}`);
  return { submission_name: submissionName, valid: findings.length === 0, reviewer_key: reviewerKey, row_count: rows.length, completed_count: completed.size, completed, findings };
}

export function reconcileCalibrationJudgmentsV1(packet, submissions, adjudication = null) {
  const findings = [];
  const disagreements = [];
  const finalJudgments = new Map();
  const reviewerKeys = submissions.map((submission) => submission.reviewer_key).filter(Boolean);
  if (new Set(reviewerKeys).size !== reviewerKeys.length) findings.push("reviewer_keys_not_independent");

  for (const query of packet.queries) {
    const requiredReviews = DIFFICULT_FAMILIES.has(query.family) ? 2 : 1;
    const votes = submissions.map((submission) => submission.completed.get(query.query_id)).filter(Boolean);
    if (votes.length < requiredReviews) {
      findings.push(`insufficient_reviews:${query.query_id}:${votes.length}/${requiredReviews}`);
      continue;
    }
    const signatures = new Set(votes.map(judgmentSignature));
    if (signatures.size === 1) {
      finalJudgments.set(query.query_id, votes[0]);
      continue;
    }
    const adjudicated = adjudication?.completed.get(query.query_id);
    if (adjudicated) finalJudgments.set(query.query_id, adjudicated);
    else disagreements.push({ query_id: query.query_id, family: query.family, query_text: query.query_text, reviewer_keys: submissions.filter((submission) => submission.completed.has(query.query_id)).map((submission) => submission.reviewer_key), judgment_signatures: votes.map(judgmentSignature), status: "awaiting_adjudication" });
  }
  if (disagreements.length) findings.push(`unadjudicated_disagreements:${disagreements.length}`);
  return { reconciled: findings.length === 0 && finalJudgments.size === packet.queries.length, final_judgments: finalJudgments, disagreements, findings };
}

function relevanceLabelMap(query, judgment) {
  const result = new Map(judgment.top_result_judgments.map((entry) => [entry.artwork_group_id, entry.judgment]));
  if (judgment.source_candidate_judgment) result.set(judgment.source_candidate_judgment.artwork_group_id, judgment.source_candidate_judgment.judgment);
  const sourceGroup = query.source_candidate?.artwork_group_id;
  if (sourceGroup && query.source_candidate.present_in_top_results && !result.has(sourceGroup)) throw new Error(`source candidate missing top-result judgment: ${query.query_id}`);
  return result;
}

function dcg(gains) {
  return gains.reduce((sum, gain, index) => sum + ((2 ** gain) - 1) / Math.log2(index + 2), 0);
}

function aggregateMetrics(items) {
  let relevantReturned10 = 0;
  let returned10 = 0;
  let relevantGold = 0;
  let relevantAt10 = 0;
  let relevantAt25 = 0;
  let reciprocalRank = 0;
  let ndcgSum = 0;
  let unsupported = 0;
  let predictedGoldAgreement = 0;
  const tierByRank = {};
  const failureCounts = {};

  for (const { query, judgment } of items) {
    const labels = relevanceLabelMap(query, judgment);
    const positiveGroups = [...labels].filter(([, label]) => POSITIVE_LABELS.has(label)).map(([groupId]) => groupId);
    relevantGold += positiveGroups.length;
    const ranks = new Map(query.top_results.map((result) => [result.artwork_group_id, result.rank]));
    if (query.source_candidate?.artwork_group_id && !ranks.has(query.source_candidate.artwork_group_id) && query.source_candidate.rank) ranks.set(query.source_candidate.artwork_group_id, query.source_candidate.rank);
    relevantAt10 += positiveGroups.filter((groupId) => (ranks.get(groupId) ?? Infinity) <= 10).length;
    relevantAt25 += positiveGroups.filter((groupId) => (ranks.get(groupId) ?? Infinity) <= 25).length;
    const positiveRanks = positiveGroups.map((groupId) => ranks.get(groupId)).filter((rank) => rank > 0).sort((left, right) => left - right);
    reciprocalRank += positiveRanks.length ? 1 / positiveRanks[0] : 0;

    const top = query.top_results.slice(0, 10);
    const gains = top.map((result) => GAINS[labels.get(result.artwork_group_id)] ?? 0);
    relevantReturned10 += gains.filter((gain) => gain > 0).length;
    returned10 += top.length;
    unsupported += top.filter((result) => labels.get(result.artwork_group_id) === "must_exclude").length;
    const ideal = [...labels.values()].map((label) => GAINS[label] ?? 0).sort((left, right) => right - left).slice(0, 10);
    const idealDcg = dcg(ideal);
    ndcgSum += idealDcg ? dcg(gains) / idealDcg : (top.length === 0 ? 1 : 0);
    const predictedZero = query.result_count === 0;
    const goldZero = judgment.query_decision === "valid_zero_result";
    if (predictedZero === goldZero) predictedGoldAgreement += 1;
    for (const result of top) {
      const key = `${result.rank}:${result.eligibility_tier}`;
      tierByRank[key] = (tierByRank[key] ?? 0) + 1;
    }
    for (const failure of judgment.failure_labels ?? []) failureCounts[failure] = (failureCounts[failure] ?? 0) + 1;
  }
  const count = items.length;
  return {
    queries: count,
    precision_at_10: returned10 ? relevantReturned10 / returned10 : null,
    recall_at_10: relevantGold ? relevantAt10 / relevantGold : null,
    recall_at_25: relevantGold ? relevantAt25 / relevantGold : null,
    ndcg_at_10: count ? ndcgSum / count : null,
    mean_reciprocal_rank: count ? reciprocalRank / count : null,
    valid_zero_result_accuracy: count ? predictedGoldAgreement / count : null,
    unsupported_match_rate: returned10 ? unsupported / returned10 : null,
    subject_role_confusion_rate: count ? ((failureCounts.correct_cue_wrong_subject_role ?? 0) + (failureCounts.representation_depicted_subject_confusion ?? 0) + (failureCounts.scene_subject_representation_confusion ?? 0)) / count : null,
    count_constraint_violation_rate: count ? (failureCounts.count_mismatch ?? 0) / count : null,
    canonical_filter_violation_rate: count ? (failureCounts.canonical_filter_violation ?? 0) / count : null,
    wrong_printing_expansion_rate: count ? (failureCounts.correct_artwork_wrong_printing_expansion ?? 0) / count : null,
    explanation_validity_rate: count ? 1 - ((failureCounts.evidence_explanation_mismatch ?? 0) / count) : null,
    duplicate_artwork_rate_top_10: 0,
    relevant_gold_groups: relevantGold,
    returned_result_slots_top_10: returned10,
    failure_counts: Object.fromEntries(Object.entries(failureCounts).sort(([left], [right]) => left.localeCompare(right))),
    tier_distribution_by_rank: Object.fromEntries(Object.entries(tierByRank).sort(([left], [right]) => left.localeCompare(right))),
  };
}

export function computeCalibrationMetricsV1(packet, finalJudgments) {
  if (finalJudgments.size !== packet.queries.length) throw new Error(`official metrics require ${packet.queries.length} final judgments, found ${finalJudgments.size}`);
  const items = packet.queries.map((query) => ({ query, judgment: finalJudgments.get(query.query_id) }));
  const invalid = items.filter(({ judgment }) => judgment.query_decision === "query_invalid");
  if (invalid.length) throw new Error(`official metrics blocked by ${invalid.length} invalid queries`);
  const byFamily = {};
  for (const family of [...new Set(packet.queries.map((query) => query.family))].sort()) byFamily[family] = aggregateMetrics(items.filter(({ query }) => query.family === family));
  return { version: CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_VERSION, judgment_set_version: packet.judgment_set_version, global: aggregateMetrics(items), by_family: byFamily };
}

function markdownReadiness(report) {
  return `# Card Visual Search Calibration Evaluator V1\n\n- Ready for judgment import: \`${report.ready_for_judgment_import}\`\n- Calibration queries: \`${report.packet.calibration_queries}\`\n- Holdout queries exposed: \`${report.packet.holdout_queries}\`\n- Result slots: \`${report.packet.top_result_slots}\`\n- Images resolved: \`${report.packet.resolved_images}/${report.packet.required_images}\`\n- Imported submissions: \`${report.submission_count}\`\n- Official metrics: \`${report.official_metrics_status}\`\n\nNo provider, database, embedding, persistent-index, holdout, or public-search activity occurred.\n`;
}

async function hashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return { artifact_kind: "card_visual_search_calibration_evaluator_v1_hash_manifest", hash_algorithm: "sha256", generated_at: nowIso(), directory: posixRelative(outputDir), file_count: files.length, files: entries };
}

async function loadVerifiedPacket(packetDir) {
  const manifest = await readJson(path.join(packetDir, "artifact_hashes.json"));
  const mismatches = [];
  for (const [file, expected] of Object.entries(manifest.files ?? {})) {
    const actual = sha256Buffer(await fs.readFile(path.join(packetDir, file)));
    if (actual !== expected) mismatches.push(file);
  }
  if (mismatches.length) throw new Error(`packet hash mismatches: ${mismatches.join(",")}`);
  const report = await readJson(path.join(packetDir, "JUDGMENT_PACKET_REPORT.json"));
  const packet = await readJson(path.join(packetDir, "calibration_review_packet.json"));
  if (report.reconciled !== true || packet.packet_version !== CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION || packet.judgment_set_version !== CARD_VISUAL_SEARCH_GOLD_JUDGMENT_VERSION) throw new Error("judgment packet is not the reconciled active V1 packet");
  if (packet.calibration_query_count !== 200 || packet.holdout_query_count !== 0 || packet.queries.length !== 200) throw new Error("judgment packet calibration/holdout boundary mismatch");
  return { packet, report, manifest };
}

export async function runCardVisualSearchCalibrationEvaluatorV1(args = parseCardVisualSearchCalibrationEvaluatorArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);
  if (!args.readinessOnly && !args.judgmentPaths.length) throw new Error("provide --judgments=<primary.jsonl>[,<secondary.jsonl>] or use --readiness-only");
  if (args.readinessOnly && (args.judgmentPaths.length || args.adjudicationPath)) throw new Error("readiness-only cannot import judgments");
  const packetDir = repoPath(args.packetDir);
  const { packet, report: packetReport } = await loadVerifiedPacket(packetDir);
  const inputHashes = { packet_manifest: sha256Buffer(await fs.readFile(path.join(packetDir, "artifact_hashes.json"))), packet: sha256Buffer(await fs.readFile(path.join(packetDir, "calibration_review_packet.json"))) };
  const runKey = sha256JsonV1({ version: CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_VERSION, commit_sha: git.commit_sha, packet_run_key: packet.run_key, readiness_only: args.readinessOnly, input_hashes: inputHashes, judgment_paths: args.judgmentPaths, adjudication_path: args.adjudicationPath });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_${args.readinessOnly ? "readiness" : "evaluation"}_${runKey.slice(0, 12)}`);
  const runPlan = { version: CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_VERSION, created_at: nowIso(), run_key: runKey, commit_sha: git.commit_sha, branch: git.branch, packet_dir: posixRelative(packetDir), packet_run_key: packet.run_key, readiness_only: args.readinessOnly, judgment_paths: args.judgmentPaths.map(posixRelative), adjudication_path: args.adjudicationPath ? posixRelative(args.adjudicationPath) : null, input_hashes_sha256: inputHashes, boundaries: { provider_calls: false, database_connection: false, database_writes: false, approvals: false, embeddings: false, persistent_index_writes: false, holdout_exposed: false, holdout_executed: false, public_reads: false } };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);

  const readiness = { version: CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_VERSION, created_at: nowIso(), run_plan: runPlan, ready_for_judgment_import: packetReport.reconciled === true && packet.image_resolution.missing_image_ids.length === 0, packet: { calibration_queries: packet.calibration_query_count, holdout_queries: packet.holdout_query_count, top_result_slots: packetReport.top_result_slots, required_images: packet.image_resolution.required_card_ids, resolved_images: packet.image_resolution.resolved_images }, difficult_families: [...DIFFICULT_FAMILIES].sort(), submission_count: args.judgmentPaths.length, official_metrics_status: args.readinessOnly ? "not_run_awaiting_human_judgments" : "pending_validation" };
  const files = ["run_plan.json", "CALIBRATION_EVALUATOR_READINESS.json", "CALIBRATION_EVALUATOR_READINESS.md"];
  await writeJson(path.join(outputDir, "CALIBRATION_EVALUATOR_READINESS.json"), readiness);
  await fs.writeFile(path.join(outputDir, "CALIBRATION_EVALUATOR_READINESS.md"), markdownReadiness(readiness));

  if (!args.readinessOnly) {
    const submissions = [];
    for (let index = 0; index < args.judgmentPaths.length; index += 1) {
      const rows = await readJsonl(repoPath(args.judgmentPaths[index]));
      submissions.push(validateJudgmentSubmissionV1(rows, packet, { requireAllQueries: index === 0, requiredFamilies: index === 0 ? null : DIFFICULT_FAMILIES, submissionName: `submission_${index + 1}` }));
    }
    let adjudication = null;
    if (args.adjudicationPath) adjudication = validateJudgmentSubmissionV1(await readJsonl(repoPath(args.adjudicationPath)), packet, { submissionName: "adjudication" });
    const validationReport = { valid: submissions.every((submission) => submission.valid) && (!adjudication || adjudication.valid), submissions: submissions.map(({ completed, ...submission }) => submission), adjudication: adjudication ? (({ completed, ...value }) => value)(adjudication) : null };
    await writeJson(path.join(outputDir, "JUDGMENT_VALIDATION.json"), validationReport);
    files.push("JUDGMENT_VALIDATION.json");
    if (validationReport.valid) {
      const reconciliation = reconcileCalibrationJudgmentsV1(packet, submissions, adjudication);
      await writeJsonl(path.join(outputDir, "ADJUDICATION_QUEUE.jsonl"), reconciliation.disagreements);
      await writeJson(path.join(outputDir, "JUDGMENT_RECONCILIATION.json"), { reconciled: reconciliation.reconciled, final_judgment_count: reconciliation.final_judgments.size, disagreement_count: reconciliation.disagreements.length, findings: reconciliation.findings });
      files.push("ADJUDICATION_QUEUE.jsonl", "JUDGMENT_RECONCILIATION.json");
      if (reconciliation.reconciled) {
        await writeJson(path.join(outputDir, "CALIBRATION_METRICS.json"), computeCalibrationMetricsV1(packet, reconciliation.final_judgments));
        files.push("CALIBRATION_METRICS.json");
      }
    }
  }
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await hashManifest(outputDir, files));
  return { outputDir, readiness };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runCardVisualSearchCalibrationEvaluatorV1(parseCardVisualSearchCalibrationEvaluatorArgsV1(argv));
  console.log(`[card-visual-search-calibration-evaluator] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-search-calibration-evaluator] ready=${result.readiness.ready_for_judgment_import}`);
  console.log(`[card-visual-search-calibration-evaluator] submissions=${result.readiness.submission_count}`);
  console.log(`[card-visual-search-calibration-evaluator] official_metrics=${result.readiness.official_metrics_status}`);
}
