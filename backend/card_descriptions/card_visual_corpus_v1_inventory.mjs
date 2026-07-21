import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION = "CARD_VISUAL_CORPUS_SOURCE_INVENTORY_V1";
export const CARD_VISUAL_CORPUS_EXPECTED_BRANCH = "feature/card-visual-description-agent";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_corpus_v1";
const DEFAULT_DB_SOURCE_EXPORT = "docs/audits/card_visual_descriptions/2026-07-20T22-12-14-625Z_apply_readiness_recovery_4f20931ab564/ALL_1000_APPLY_READINESS_SAVED_SYSTEM_JSON.json";
const DEFAULT_DB_READBACK = "docs/audits/card_visual_description_artifact_apply_v1/2026-07-20T22-38-04-049Z_drain_750_5c9619060913/final_1000_db_coverage_readback.json";
const DEFAULT_OVERNIGHT_OUTCOME_INDEX = "docs/audits/card_visual_100_worker_overnight_100usd/2026-07-21T13-28-34.820Z_combined_reconciliation/OVERNIGHT_OUTCOME_INDEX.jsonl";
const DEFAULT_OVERNIGHT_RECONCILIATION = "docs/audits/card_visual_100_worker_overnight_100usd/2026-07-21T13-28-34.820Z_combined_reconciliation/COMBINED_RECONCILIATION.json";

const VALID_REVIEW_STATUSES = new Set(["pending", "needs_review"]);
const OUTCOME_CLASS_BY_TYPE = Object.freeze({
  generated_row: "valid",
  validation_failure: "quarantine",
  skipped_image: "image_skip",
  unprocessed: "unprocessed",
});

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

export function parseCorpusInventoryArgsV1(argv = []) {
  return {
    dbSourceExport: parseFlag(argv, "db-source-export") ?? DEFAULT_DB_SOURCE_EXPORT,
    dbReadback: parseFlag(argv, "db-readback") ?? DEFAULT_DB_READBACK,
    overnightOutcomeIndex: parseFlag(argv, "overnight-outcome-index") ?? DEFAULT_OVERNIGHT_OUTCOME_INDEX,
    overnightReconciliation: parseFlag(argv, "overnight-reconciliation") ?? DEFAULT_OVERNIGHT_RECONCILIATION,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    concurrency: Number.parseInt(parseFlag(argv, "concurrency") ?? "32", 10),
  };
}

export function stableJsonV1(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableJsonV1(entry)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJsonV1(value[key])}`).join(",")}}`;
}

export function sha256JsonV1(value) {
  return crypto.createHash("sha256").update(stableJsonV1(value)).digest("hex");
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

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row) ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
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

function sameNumber(actual, expected) {
  return Number(actual) === Number(expected);
}

function checkCount(findings, label, actual, expected) {
  if (!sameNumber(actual, expected)) findings.push(`${label}:expected=${expected}:actual=${actual}`);
}

function normalizeValidRecord({ source, ordinal, generatedRow, sourceArtifactPath, sourceArtifactSha256, descriptionId = null, runKey = null }) {
  const graph = generatedRow?.visual_attributes?.fact_graph ?? null;
  return {
    inventory_version: CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
    source,
    source_storage: source === "private_database_apply_1000" ? "private_database_with_saved_artifact" : "audit_artifact_only",
    source_ordinal: ordinal,
    card_print_id: generatedRow?.card_print_id ?? null,
    gv_id: generatedRow?.gv_id ?? null,
    name: generatedRow?.name ?? null,
    set_code: generatedRow?.set_code ?? null,
    number: generatedRow?.number ?? null,
    outcome_class: "valid",
    review_status: generatedRow?.review_status ?? null,
    prompt_branch: generatedRow?.prompt_branch ?? null,
    prompt_version: generatedRow?.prompt_version ?? null,
    schema_version: generatedRow?.output_schema_version ?? null,
    agent_version: generatedRow?.agent_version ?? null,
    model_version: generatedRow?.model_version ?? null,
    response_model_version: generatedRow?.response_model_version ?? null,
    image_sha256: generatedRow?.image_sha256 ?? null,
    description_version_key: generatedRow?.description_version_key ?? null,
    description_id: descriptionId,
    run_key: runKey,
    source_artifact_path: sourceArtifactPath,
    source_artifact_sha256: sourceArtifactSha256,
    generated_row_sha256: sha256JsonV1(generatedRow),
    fact_graph_sha256: graph ? sha256JsonV1(graph) : null,
    eligibility_tier: null,
    eligibility_status: "pending_policy",
    artwork_group_id: null,
    artwork_group_status: "pending_grouping",
  };
}

function normalizeGapRecord({ outcome, sourceArtifactSha256 = null }) {
  return {
    inventory_version: CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
    source: "overnight_artifact_harvest_10000",
    source_storage: "audit_artifact_only",
    source_ordinal: outcome.selected_index,
    card_print_id: outcome.card_print_id,
    gv_id: outcome.gv_id ?? null,
    name: outcome.name ?? null,
    set_code: null,
    number: null,
    outcome_class: OUTCOME_CLASS_BY_TYPE[outcome.outcome_type] ?? "unknown",
    review_status: null,
    prompt_branch: outcome.prompt_branch ?? null,
    prompt_version: null,
    schema_version: null,
    agent_version: null,
    model_version: null,
    response_model_version: null,
    image_sha256: null,
    description_version_key: null,
    description_id: null,
    run_key: outcome.run_key ?? null,
    source_artifact_path: outcome.per_card_artifact ?? null,
    source_artifact_sha256: sourceArtifactSha256,
    generated_row_sha256: null,
    fact_graph_sha256: null,
    failure_class: outcome.failure_class ?? null,
    eligibility_tier: "C",
    eligibility_status: "excluded_source_gap",
    artwork_group_id: null,
    artwork_group_status: "not_available",
  };
}

async function mapConcurrent(items, concurrency, mapper) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 128) {
    throw new Error("concurrency must be an integer between 1 and 128");
  }
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function loadDatabaseSource(args, sourceFileSha256) {
  const sourcePath = repoPath(args.dbSourceExport);
  const readbackPath = repoPath(args.dbReadback);
  const [sourceExport, readback] = await Promise.all([readJson(sourcePath), readJson(readbackPath)]);
  const findings = [];
  const sourceRecords = Array.isArray(sourceExport.records) ? sourceExport.records : [];
  const readbackRows = Array.isArray(readback.rows) ? readback.rows : [];
  const readbackById = new Map(readbackRows.map((row) => [row.source_card_print_id, row]));

  checkCount(findings, "database_source_record_count", sourceRecords.length, readback.summary?.source_count ?? 1000);
  checkCount(findings, "database_readback_row_count", readbackRows.length, readback.summary?.query_row_count ?? sourceRecords.length);
  if (!readback.summary?.reconciled) findings.push("database_readback_not_reconciled");

  const records = sourceRecords.map((record, index) => {
    const generatedRow = record.generated_row;
    const readbackRow = readbackById.get(record.card_print_id);
    if (!generatedRow) findings.push(`database_source_missing_generated_row:${record.card_print_id ?? index + 1}`);
    if (generatedRow?.card_print_id !== record.card_print_id) findings.push(`database_source_outer_inner_id_mismatch:${record.card_print_id}`);
    if (!readbackRow) findings.push(`database_readback_missing_id:${record.card_print_id}`);
    if (readbackRow && readbackRow.review_status !== generatedRow?.review_status) findings.push(`database_review_status_mismatch:${record.card_print_id}`);
    if (readbackRow && !readbackRow.is_current) findings.push(`database_row_not_current:${record.card_print_id}`);
    if (readbackRow?.approved_at || readbackRow?.approved_by) findings.push(`database_row_approved:${record.card_print_id}`);
    if (readbackRow?.embedding_input_hash || readbackRow?.embedding_model || readbackRow?.embedded_at) findings.push(`database_row_embedded:${record.card_print_id}`);
    return normalizeValidRecord({
      source: "private_database_apply_1000",
      ordinal: index + 1,
      generatedRow,
      sourceArtifactPath: posixRelative(sourcePath),
      sourceArtifactSha256: sourceFileSha256,
      descriptionId: readbackRow?.description_id ?? null,
      runKey: readbackRow?.run_key ?? null,
    });
  });

  for (const row of readbackRows) {
    if (!sourceRecords.some((record) => record.card_print_id === row.source_card_print_id)) {
      findings.push(`database_readback_extra_id:${row.source_card_print_id}`);
    }
  }
  return { records, findings, readbackSummary: readback.summary ?? null };
}

async function loadOvernightSource(args, expected) {
  const outcomePath = repoPath(args.overnightOutcomeIndex);
  const outcomes = await readJsonl(outcomePath);
  const findings = [];

  const records = await mapConcurrent(outcomes, args.concurrency, async (outcome) => {
    const expectedClass = OUTCOME_CLASS_BY_TYPE[outcome.outcome_type];
    if (!expectedClass) findings.push(`unknown_overnight_outcome_type:${outcome.selected_index}:${outcome.outcome_type}`);

    let artifact = null;
    let artifactHash = null;
    if (outcome.per_card_artifact) {
      const artifactPath = repoPath(outcome.per_card_artifact);
      const bytes = await fs.readFile(artifactPath);
      artifactHash = sha256Buffer(bytes);
      artifact = JSON.parse(bytes.toString("utf8"));
      if (artifact.selected_index !== outcome.selected_index) findings.push(`overnight_artifact_index_mismatch:${outcome.card_print_id}`);
      if (artifact.outcome_type !== outcome.outcome_type) findings.push(`overnight_artifact_outcome_mismatch:${outcome.card_print_id}`);
      if (artifact.card?.id && artifact.card.id !== outcome.card_print_id) findings.push(`overnight_artifact_card_id_mismatch:${outcome.card_print_id}`);
    } else if (outcome.outcome_type !== "unprocessed") {
      findings.push(`overnight_artifact_missing:${outcome.card_print_id}`);
    }

    if (outcome.outcome_type === "generated_row") {
      const generatedRow = artifact?.generated_row;
      if (!generatedRow) findings.push(`overnight_generated_row_missing:${outcome.card_print_id}`);
      if (generatedRow?.card_print_id !== outcome.card_print_id) findings.push(`overnight_generated_id_mismatch:${outcome.card_print_id}`);
      if (generatedRow?.review_status !== outcome.review_status) findings.push(`overnight_review_status_mismatch:${outcome.card_print_id}`);
      return normalizeValidRecord({
        source: "overnight_artifact_harvest_10000",
        ordinal: outcome.selected_index,
        generatedRow,
        sourceArtifactPath: outcome.per_card_artifact,
        sourceArtifactSha256: artifactHash,
        runKey: outcome.run_key ?? null,
      });
    }

    return normalizeGapRecord({ outcome, sourceArtifactSha256: artifactHash });
  });

  checkCount(findings, "overnight_selected_count", records.length, expected.counts?.selected ?? 10000);
  const actualOutcomes = countBy(records, (row) => row.outcome_class);
  checkCount(findings, "overnight_valid_count", actualOutcomes.valid ?? 0, expected.counts?.generated_rows ?? 0);
  checkCount(findings, "overnight_quarantine_count", actualOutcomes.quarantine ?? 0, expected.counts?.validation_failures ?? 0);
  checkCount(findings, "overnight_image_skip_count", actualOutcomes.image_skip ?? 0, expected.counts?.skipped_images ?? 0);
  checkCount(findings, "overnight_unprocessed_count", actualOutcomes.unprocessed ?? 0, expected.counts?.unprocessed ?? 0);
  return { records, findings };
}

export function reconcileCorpusRecordsV1({ databaseRecords, overnightRecords, sourceFindings = [] }) {
  const findings = [...sourceFindings];
  const allRecords = [...databaseRecords, ...overnightRecords];
  const databaseIds = databaseRecords.map((row) => row.card_print_id);
  const overnightIds = overnightRecords.map((row) => row.card_print_id);
  const databaseDuplicateIds = duplicates(databaseIds);
  const overnightDuplicateIds = duplicates(overnightIds);
  const databaseIdSet = new Set(databaseIds);
  const sourceOverlapIds = [...new Set(overnightIds.filter((id) => databaseIdSet.has(id)))].sort();

  if (databaseDuplicateIds.length) findings.push(`database_duplicate_ids:${databaseDuplicateIds.length}`);
  if (overnightDuplicateIds.length) findings.push(`overnight_duplicate_ids:${overnightDuplicateIds.length}`);
  if (sourceOverlapIds.length) findings.push(`cross_source_overlap_ids:${sourceOverlapIds.length}`);

  const validRows = allRecords.filter((row) => row.outcome_class === "valid");
  const coverageGaps = allRecords.filter((row) => row.outcome_class !== "valid");
  for (const row of validRows) {
    if (!VALID_REVIEW_STATUSES.has(row.review_status)) findings.push(`invalid_review_status:${row.card_print_id}:${row.review_status}`);
    if (row.prompt_branch === "energy") findings.push(`energy_branch_in_valid_corpus:${row.card_print_id}`);
    if (!row.fact_graph_sha256) findings.push(`missing_fact_graph_hash:${row.card_print_id}`);
    if (!row.generated_row_sha256) findings.push(`missing_generated_row_hash:${row.card_print_id}`);
  }
  for (const row of allRecords) {
    if (row.prompt_branch === "energy") findings.push(`energy_branch_in_inventory:${row.card_print_id}`);
  }

  const counts = {
    source_rows_total: allRecords.length,
    unique_card_print_ids: new Set(allRecords.map((row) => row.card_print_id)).size,
    database_source_rows: databaseRecords.length,
    overnight_source_rows: overnightRecords.length,
    valid_rows_total: validRows.length,
    unique_valid_card_print_ids: new Set(validRows.map((row) => row.card_print_id)).size,
    coverage_gaps_total: coverageGaps.length,
    source_overlap_count: sourceOverlapIds.length,
    approved_rows: validRows.filter((row) => row.review_status === "approved").length,
    energy_rows: allRecords.filter((row) => row.prompt_branch === "energy").length,
  };

  return {
    reconciled: findings.length === 0,
    findings,
    counts,
    distributions: {
      outcomes: countBy(allRecords, (row) => row.outcome_class),
      review_statuses: countBy(validRows, (row) => row.review_status),
      valid_prompt_branches: countBy(validRows, (row) => row.prompt_branch),
      prompt_versions: countBy(validRows, (row) => row.prompt_version),
      schema_versions: countBy(validRows, (row) => row.schema_version),
      agent_versions: countBy(validRows, (row) => row.agent_version),
      model_versions: countBy(validRows, (row) => row.model_version),
      source_storage: countBy(allRecords, (row) => row.source_storage),
    },
    duplicate_ids: {
      database: databaseDuplicateIds,
      overnight: overnightDuplicateIds,
      cross_source_overlap: sourceOverlapIds,
    },
    records: allRecords,
    validRows,
    coverageGaps,
  };
}

function markdownReport(report) {
  const d = report.reconciliation.distributions;
  const c = report.reconciliation.counts;
  const findings = report.reconciliation.findings.length
    ? report.reconciliation.findings.map((item) => `- ${item}`).join("\n")
    : "- None";
  return `# Card Visual Corpus V1 Source Inventory\n\nGenerated: ${report.created_at}\n\n## Result\n\n- Reconciled: \`${report.reconciliation.reconciled}\`\n- Contract-lock commit: \`${report.run_plan.commit_sha}\`\n- Source rows: \`${c.source_rows_total}\`\n- Unique card-print IDs: \`${c.unique_card_print_ids}\`\n- Structurally valid candidates: \`${c.valid_rows_total}\`\n- Coverage gaps: \`${c.coverage_gaps_total}\`\n- Cross-source overlaps: \`${c.source_overlap_count}\`\n- Approved rows: \`${c.approved_rows}\`\n- Energy rows: \`${c.energy_rows}\`\n\n## Outcome Classes\n\n| Outcome | Count |\n| --- | ---: |\n${Object.entries(d.outcomes).map(([key, value]) => `| ${key} | ${value} |`).join("\n")}\n\n## Valid Review Statuses\n\n| Status | Count |\n| --- | ---: |\n${Object.entries(d.review_statuses).map(([key, value]) => `| ${key} | ${value} |`).join("\n")}\n\n## Valid Branches\n\n| Branch | Count |\n| --- | ---: |\n${Object.entries(d.valid_prompt_branches).map(([key, value]) => `| ${key} | ${value} |`).join("\n")}\n\n## Findings\n\n${findings}\n\n## Boundaries\n\nThis inventory used existing saved artifacts and a captured database readback. It made no provider calls, opened no database connection, wrote no database rows, created no embeddings, approved no descriptions, derived no Tier A/B/C eligibility, and assigned no artwork groups.\n\n## Exact Next Gate\n\nDefine and test the deterministic Tier A/B/C eligibility policy against this exact valid-candidate manifest, while artwork grouping remains a separate fail-closed task.\n`;
}

async function createHashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) {
    entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  }
  return {
    artifact_kind: "card_visual_corpus_v1_source_inventory_hash_manifest",
    hash_algorithm: "sha256",
    generated_at: nowIso(),
    directory: posixRelative(outputDir),
    file_count: files.length,
    files: entries,
  };
}

export async function runCorpusInventoryV1(args = parseCorpusInventoryArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);

  const sourcePaths = {
    database_saved_export: repoPath(args.dbSourceExport),
    database_readback: repoPath(args.dbReadback),
    overnight_outcome_index: repoPath(args.overnightOutcomeIndex),
    overnight_reconciliation: repoPath(args.overnightReconciliation),
  };
  const sourceHashes = {};
  for (const [key, filePath] of Object.entries(sourcePaths)) {
    sourceHashes[key] = sha256Buffer(await fs.readFile(filePath));
  }

  const runKey = sha256JsonV1({
    version: CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
    commit_sha: git.commit_sha,
    source_hashes: sourceHashes,
  });
  const outputDir = args.outputDir
    ? repoPath(args.outputDir)
    : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_inventory_${runKey.slice(0, 12)}`);
  const runPlan = {
    version: CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    sources: Object.fromEntries(Object.entries(sourcePaths).map(([key, value]) => [key, posixRelative(value)])),
    source_hashes_sha256: sourceHashes,
    concurrency: args.concurrency,
    boundaries: {
      provider_calls: false,
      database_connection: false,
      database_writes: false,
      approvals: false,
      embeddings: false,
      eligibility_derivation: false,
      artwork_grouping: false,
      public_reads: false,
    },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);

  const overnightExpected = await readJson(sourcePaths.overnight_reconciliation);
  const [database, overnight] = await Promise.all([
    loadDatabaseSource(args, sourceHashes.database_saved_export),
    loadOvernightSource(args, overnightExpected),
  ]);
  const reconciliation = reconcileCorpusRecordsV1({
    databaseRecords: database.records,
    overnightRecords: overnight.records,
    sourceFindings: [...database.findings, ...overnight.findings],
  });

  const report = {
    version: CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
    created_at: nowIso(),
    run_plan: runPlan,
    database_readback_authority: {
      type: "captured_readback_artifact",
      captured_at: database.readbackSummary?.captured_at ?? null,
      live_database_query_performed: false,
      reconciled: database.readbackSummary?.reconciled ?? false,
    },
    reconciliation: {
      reconciled: reconciliation.reconciled,
      findings: reconciliation.findings,
      counts: reconciliation.counts,
      distributions: reconciliation.distributions,
      duplicate_ids: reconciliation.duplicate_ids,
    },
    pending_next_layers: {
      eligibility_policy: "not_run",
      artwork_grouping: "not_run",
      database_apply: "not_authorized",
      search_index: "not_built",
      embeddings: "not_authorized",
    },
  };

  const files = [
    "run_plan.json",
    "corpus_inventory.jsonl",
    "corpus_valid_candidates.jsonl",
    "corpus_coverage_gaps.jsonl",
    "CORPUS_SOURCE_RECONCILIATION.json",
    "CORPUS_SOURCE_RECONCILIATION.md",
  ];
  await writeJsonl(path.join(outputDir, "corpus_inventory.jsonl"), reconciliation.records);
  await writeJsonl(path.join(outputDir, "corpus_valid_candidates.jsonl"), reconciliation.validRows);
  await writeJsonl(path.join(outputDir, "corpus_coverage_gaps.jsonl"), reconciliation.coverageGaps);
  await writeJson(path.join(outputDir, "CORPUS_SOURCE_RECONCILIATION.json"), report);
  await writeText(path.join(outputDir, "CORPUS_SOURCE_RECONCILIATION.md"), markdownReport(report));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await createHashManifest(outputDir, files));

  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseCorpusInventoryArgsV1(argv);
  const result = await runCorpusInventoryV1(args);
  console.log(`[card-visual-corpus-inventory] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-corpus-inventory] source_rows=${result.report.reconciliation.counts.source_rows_total}`);
  console.log(`[card-visual-corpus-inventory] valid_candidates=${result.report.reconciliation.counts.valid_rows_total}`);
  console.log(`[card-visual-corpus-inventory] coverage_gaps=${result.report.reconciliation.counts.coverage_gaps_total}`);
  console.log(`[card-visual-corpus-inventory] reconciled=${result.report.reconciliation.reconciled}`);
  if (!result.report.reconciliation.reconciled) process.exitCode = 1;
}
