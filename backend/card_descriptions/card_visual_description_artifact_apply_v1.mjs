import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildDescriptionVersionKeyV1,
  stableJson,
  validateVisualDescriptionPayloadV1,
} from "./card_visual_description_agent_v1.mjs";

const { Client } = pg;

export const CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_VERSION = "CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_V1";
export const CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS = 25;
export const CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_BRANCH = "feature/card-visual-description-agent";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_SOURCE_RUN_DIR = "docs/audits/card_visual_descriptions/2026-07-20T16-50-53-215Z_harvest_55a8ffe10c92";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_description_artifact_apply_v1";
const REQUIRED_SOURCE_FILES = Object.freeze([
  "generated_outputs.jsonl",
  "summary.json",
  "run_plan.json",
  "RECONCILIATION_REPORT.json",
  "ALL_500_SAVED_SYSTEM_JSON.json",
]);
const ALLOWED_REVIEW_STATUSES = new Set(["pending", "needs_review"]);

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/g, "/");
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Buffer(Buffer.from(stableJson(value)));
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/g, "-");
}

function integer(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer`);
  return parsed;
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseArtifactApplyArgsV1(argv = []) {
  const apply = argv.includes("--apply");
  const plan = argv.includes("--plan") || !apply;
  if (apply && argv.includes("--plan")) throw new Error("choose exactly one of --plan or --apply");
  const maxCards = integer(parseFlag(argv, "max-cards") ?? CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS, "max-cards");
  if (maxCards < 1 || maxCards > CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS) {
    throw new Error(`max-cards must be between 1 and ${CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS}`);
  }
  return {
    mode: plan ? "plan" : "apply",
    maxCards,
    sourceRunDir: parseFlag(argv, "source-run-dir") ?? DEFAULT_SOURCE_RUN_DIR,
    outputDir: parseFlag(argv, "output-dir"),
    planPath: parseFlag(argv, "plan-path"),
    expectedPlanSha256: parseFlag(argv, "expected-plan-sha256"),
    envFile: parseFlag(argv, "env-file"),
    verifyIdempotency: argv.includes("--verify-idempotency"),
  };
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

export function currentGitStateV1() {
  return {
    commit_sha: gitValue(["rev-parse", "HEAD"]),
    branch: gitValue(["branch", "--show-current"]),
    tracked_status_short: gitValue(["status", "--short", "--untracked-files=no"]),
  };
}

function loadEnvironment(envFile) {
  const candidates = [
    envFile,
    path.join(REPO_ROOT, ".env.local"),
    path.resolve(REPO_ROOT, "../grookai_vault/.env.local"),
    path.join(REPO_ROOT, ".env"),
  ].filter(Boolean);
  for (const candidate of candidates) dotenv.config({ path: candidate, quiet: true, override: false });
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function createClient() {
  const value = connectionString();
  if (!value) throw new Error("Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL");
  return new Client({ connectionString: value });
}

function sourceCardContext(row) {
  return {
    id: row.card_print_id,
    name: row.name,
    set_name: row.set_name,
    set_code: row.set_code,
    number: row.number,
    gv_id: row.gv_id,
    supertype: row.card_supertype,
    subtype: row.card_subtype,
    category: row.card_category,
    pokemon_name: row.pokemon_name,
    trainer_name: row.trainer_name,
  };
}

export function validateArtifactRowForApplyV1(row) {
  const findings = [];
  if (!row || typeof row !== "object" || Array.isArray(row)) findings.push("row_not_object");
  if (!ALLOWED_REVIEW_STATUSES.has(row?.review_status)) findings.push("review_status_not_applyable");
  if (String(row?.prompt_branch ?? "").toLowerCase() === "energy") findings.push("energy_branch_not_allowed");
  if (!row?.card_print_id) findings.push("card_print_id_missing");
  if (!row?.gv_id) findings.push("gv_id_missing");
  if (!row?.image_sha256 || !/^[0-9a-f]{64}$/.test(row.image_sha256)) findings.push("image_sha256_invalid");
  if (!row?.visual_attributes?.fact_graph) findings.push("fact_graph_missing");
  if (row?.embedding || row?.embedding_model || row?.embedded_at) findings.push("embedding_payload_not_allowed");
  if (row?.approved_at || row?.approved_by || row?.review_status === "approved") findings.push("approval_payload_not_allowed");
  if (findings.length === 0) {
    const validation = validateVisualDescriptionPayloadV1(row, sourceCardContext(row));
    findings.push(...validation.findings.map((finding) => `payload:${finding}`));
    const expectedVersionKey = buildDescriptionVersionKeyV1(row);
    if (row.description_version_key !== expectedVersionKey) findings.push("description_version_key_mismatch");
  }
  return { ok: findings.length === 0, findings };
}

export function aggregateImportedUsageV1(rows) {
  const sum = (field) => rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
  const responseVersions = [...new Set(rows.map((row) => row.response_model_version).filter(Boolean))].sort();
  return {
    request_count: sum("request_count"),
    retry_count: sum("retry_count"),
    input_tokens: sum("input_tokens"),
    output_tokens: sum("output_tokens"),
    total_tokens: sum("total_tokens"),
    cached_input_tokens: sum("cached_input_tokens"),
    reasoning_output_tokens: sum("reasoning_output_tokens"),
    estimated_cost_usd: Number(sum("estimated_cost_usd").toFixed(10)),
    response_model_versions: responseVersions,
  };
}

export function buildArtifactApplyFingerprintV1(value) {
  return sha256Json(value);
}

export function classifyArtifactApplyStateV1(rows) {
  const duplicateRows = rows.filter((row) => row.duplicate_description_id);
  const currentRows = rows.filter((row) => row.current_description_id);
  const approvedRows = rows.filter((row) => row.current_review_status === "approved");
  const idempotentRows = rows.filter((row) => row.duplicate_run_key && row.duplicate_run_key === row.expected_run_key);
  let decision = "insert";
  if (approvedRows.length) decision = "blocked_approved_current";
  else if (duplicateRows.length === rows.length && idempotentRows.length === rows.length) decision = "idempotent";
  else if (duplicateRows.length) decision = "blocked_duplicate_drift";
  else if (currentRows.length) decision = "blocked_current_drift";
  return {
    decision,
    duplicate_count: duplicateRows.length,
    current_count: currentRows.length,
    approved_current_count: approvedRows.length,
    idempotent_count: idempotentRows.length,
  };
}

async function verifySourceArtifacts(sourceRunDir) {
  const manifestPath = path.join(sourceRunDir, "artifact_hashes.json");
  const manifest = await readJson(manifestPath);
  const entries = Object.entries(manifest.files ?? {});
  const findings = [];
  const verified = [];
  for (const [relativePath, expectedSha256] of entries) {
    const absolutePath = path.join(sourceRunDir, relativePath);
    let actualSha256 = null;
    try {
      actualSha256 = sha256Buffer(await fs.readFile(absolutePath));
    } catch {
      findings.push(`source_file_missing:${relativePath}`);
      continue;
    }
    if (actualSha256 !== expectedSha256) findings.push(`source_hash_mismatch:${relativePath}`);
    verified.push({ path: relativePath, expected_sha256: expectedSha256, actual_sha256: actualSha256 });
  }
  if (entries.length !== Number(manifest.file_count)) findings.push("source_manifest_file_count_mismatch");
  for (const required of REQUIRED_SOURCE_FILES) {
    if (!Object.hasOwn(manifest.files ?? {}, required)) findings.push(`source_manifest_required_file_missing:${required}`);
  }
  if (findings.length) throw new Error(`SOURCE_ARTIFACT_VERIFICATION_FAILED: ${findings.join(",")}`);

  const generatedRows = await readJsonl(path.join(sourceRunDir, "generated_outputs.jsonl"));
  const summary = await readJson(path.join(sourceRunDir, "summary.json"));
  const sourcePlan = await readJson(path.join(sourceRunDir, "run_plan.json"));
  const reconciliation = await readJson(path.join(sourceRunDir, "RECONCILIATION_REPORT.json"));
  const rowFindings = [];
  const seenIds = new Set();
  for (const [index, row] of generatedRows.entries()) {
    const validation = validateArtifactRowForApplyV1(row);
    if (!validation.ok) rowFindings.push(`line_${index + 1}:${validation.findings.join("|")}`);
    if (seenIds.has(row.card_print_id)) rowFindings.push(`duplicate_card_print_id:${row.card_print_id}`);
    seenIds.add(row.card_print_id);
  }
  if (generatedRows.length !== Number(summary.validated_count)) rowFindings.push("generated_count_summary_mismatch");
  const sourceDatabaseWrites = sourcePlan.boundary?.database_writes ?? sourcePlan.boundary?.db_writes;
  if (sourceDatabaseWrites !== false) rowFindings.push("source_run_database_write_boundary_not_false");
  if (reconciliation.reconciliation_mismatches?.length > 0 || reconciliation.stop_findings?.length > 0) {
    rowFindings.push("source_reconciliation_has_findings");
  }
  if (rowFindings.length) throw new Error(`SOURCE_ROWS_NOT_APPLYABLE: ${rowFindings.slice(0, 20).join(",")}`);

  return {
    manifest,
    manifest_sha256: sha256Buffer(await fs.readFile(manifestPath)),
    verified_file_count: verified.length,
    required_file_hashes: Object.fromEntries(REQUIRED_SOURCE_FILES.map((name) => [name, manifest.files[name]])),
    generatedRows,
    summary,
    sourcePlan,
    reconciliation,
  };
}

function rowVersionArrays(rows) {
  return [
    rows.map((row) => row.card_print_id),
    rows.map((row) => row.image_sha256),
    rows.map((row) => row.prompt_version),
    rows.map((row) => row.output_schema_version),
    rows.map((row) => row.agent_version),
    rows.map((row) => row.model_version),
  ];
}

async function queryDatabaseState(client, rows, expectedRunKey = null, lockCanonical = false) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.card_print_id);
  const canonicalSql = `select id::text, gv_id, name, set_code, number, image_path, image_url,
      representative_image_url, image_hash, image_status
     from public.card_prints where id = any($1::uuid[])
     ${lockCanonical ? "for update" : ""}`;
  const canonical = await client.query(canonicalSql, [ids]);
  const current = await client.query(
    `select id::text, card_print_id::text, review_status, is_current, run_id::text
     from public.card_print_visual_descriptions
     where card_print_id = any($1::uuid[]) and is_current is true`,
    [ids],
  );
  const duplicate = await client.query(
    `with source(card_print_id,image_sha256,prompt_version,output_schema_version,agent_version,model_version) as (
       select * from unnest($1::uuid[],$2::text[],$3::text[],$4::text[],$5::text[],$6::text[])
     )
     select d.id::text, d.card_print_id::text, d.run_id::text, r.run_key
     from source s
     join public.card_print_visual_descriptions d
       on d.card_print_id=s.card_print_id and d.image_sha256=s.image_sha256
      and d.prompt_version=s.prompt_version and d.output_schema_version=s.output_schema_version
      and d.agent_version=s.agent_version and d.model_version=s.model_version
     left join public.card_visual_description_runs r on r.id=d.run_id`,
    rowVersionArrays(rows),
  );
  const canonicalById = new Map(canonical.rows.map((row) => [row.id, row]));
  const currentById = new Map(current.rows.map((row) => [row.card_print_id, row]));
  const duplicateById = new Map(duplicate.rows.map((row) => [row.card_print_id, row]));
  return rows.map((row, sourceIndex) => {
    const card = canonicalById.get(row.card_print_id) ?? null;
    const currentRow = currentById.get(row.card_print_id) ?? null;
    const duplicateRow = duplicateById.get(row.card_print_id) ?? null;
    return {
      source_index: sourceIndex,
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      canonical_exists: Boolean(card),
      canonical_gv_id: card?.gv_id ?? null,
      canonical_name: card?.name ?? null,
      canonical_set_code: card?.set_code ?? null,
      canonical_number: card?.number ?? null,
      canonical_image_path: card?.image_path ?? null,
      canonical_image_hash: card?.image_hash ?? null,
      canonical_image_status: card?.image_status ?? null,
      image_path_matches: card?.image_path === row.image_source_key,
      identity_matches: Boolean(card)
        && card.gv_id === row.gv_id
        && card.name === row.name
        && card.set_code === row.set_code
        && String(card.number) === String(row.number),
      current_description_id: currentRow?.id ?? null,
      current_review_status: currentRow?.review_status ?? null,
      duplicate_description_id: duplicateRow?.id ?? null,
      duplicate_run_id: duplicateRow?.run_id ?? null,
      duplicate_run_key: duplicateRow?.run_key ?? null,
      expected_run_key: expectedRunKey,
    };
  });
}

function canonicalProjection(stateRows) {
  return stateRows.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.canonical_gv_id,
    name: row.canonical_name,
    set_code: row.canonical_set_code,
    number: row.canonical_number,
    image_path: row.canonical_image_path,
    image_hash: row.canonical_image_hash,
    image_status: row.canonical_image_status,
  }));
}

function assertCanonicalMatch(stateRows) {
  const findings = [];
  for (const row of stateRows) {
    if (!row.canonical_exists) findings.push(`canonical_missing:${row.card_print_id}`);
    if (!row.identity_matches) findings.push(`canonical_identity_mismatch:${row.card_print_id}`);
    if (!row.image_path_matches) findings.push(`canonical_image_path_mismatch:${row.card_print_id}`);
  }
  if (findings.length) throw new Error(`CANONICAL_PREFLIGHT_FAILED: ${findings.join(",")}`);
}

function selectedMetadata(row, sourceLineNumber) {
  return {
    selection_order: sourceLineNumber,
    source_line_number: sourceLineNumber,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    prompt_branch: row.prompt_branch,
    review_status: row.review_status,
    image_source: row.image_source,
    image_source_key: row.image_source_key,
    image_sha256: row.image_sha256,
    description_version_key: row.description_version_key,
    source_row_sha256: sha256Json(row),
  };
}

function buildDatabaseArtifactHashes(planBase) {
  return {
    artifact_apply_version: CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_VERSION,
    source_manifest_sha256: planBase.source.manifest_sha256,
    source_generated_outputs_sha256: planBase.source.required_file_hashes["generated_outputs.jsonl"],
    selected_rows_sha256: planBase.selection.selected_rows_sha256,
    canonical_pre_apply_sha256: planBase.database_preflight.canonical_snapshot_sha256,
    apply_plan_fingerprint_sha256: planBase.apply_plan_fingerprint_sha256,
  };
}

export async function buildArtifactApplyPlanV1({ sourceRunDir, outputDir, maxCards, client, gitState }) {
  if (gitState.branch !== CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_BRANCH) {
    throw new Error(`WRONG_BRANCH: expected ${CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_BRANCH}, got ${gitState.branch}`);
  }
  if (gitState.tracked_status_short) throw new Error(`TRACKED_WORKTREE_NOT_CLEAN: ${gitState.tracked_status_short}`);
  const source = await verifySourceArtifacts(sourceRunDir);
  const allState = await queryDatabaseState(client, source.generatedRows);
  assertCanonicalMatch(allState);
  const eligible = allState.filter((state) => !state.current_description_id && !state.duplicate_description_id);
  if (eligible.length < maxCards) throw new Error(`INSUFFICIENT_APPLYABLE_ROWS: requested=${maxCards} eligible=${eligible.length}`);
  const selectedStates = eligible.slice(0, maxCards);
  const selectedRows = selectedStates.map((state) => source.generatedRows[state.source_index]);
  const selectionMetadata = selectedRows.map((row) => selectedMetadata(row, source.generatedRows.indexOf(row) + 1));
  const selectedRowsSha256 = sha256Json(selectedRows);
  const canonicalSnapshot = canonicalProjection(selectedStates);
  const usage = aggregateImportedUsageV1(selectedRows);
  const fingerprintInput = {
    version: CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_VERSION,
    producing_commit_sha: gitState.commit_sha,
    source_manifest_sha256: source.manifest_sha256,
    source_generated_outputs_sha256: source.required_file_hashes["generated_outputs.jsonl"],
    selected_rows_sha256: selectedRowsSha256,
    canonical_pre_apply_sha256: sha256Json(canonicalSnapshot),
    selected_card_print_ids: selectedRows.map((row) => row.card_print_id),
  };
  const applyPlanFingerprint = buildArtifactApplyFingerprintV1(fingerprintInput);
  const runKey = sha256Json({ apply_plan_fingerprint_sha256: applyPlanFingerprint, purpose: "artifact_to_database_apply" });
  const plan = {
    version: CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_VERSION,
    mode: "apply_from_validated_artifact",
    created_at: nowIso(),
    producing_commit_sha: gitState.commit_sha,
    branch: gitState.branch,
    tracked_worktree_clean: true,
    run_key: runKey,
    apply_plan_fingerprint_sha256: applyPlanFingerprint,
    fingerprint_input: fingerprintInput,
    source: {
      run_directory: posixRelative(sourceRunDir),
      source_run_key: source.sourcePlan.run_key,
      source_producing_commit_sha: source.sourcePlan.commit_sha,
      manifest_sha256: source.manifest_sha256,
      manifest_file_count: source.verified_file_count,
      required_file_hashes: source.required_file_hashes,
      validated_source_rows: source.generatedRows.length,
      source_provider: source.sourcePlan.provider,
      source_model_version: source.sourcePlan.model_version,
      source_image_detail: source.sourcePlan.image_detail,
      prompt_version: source.sourcePlan.prompt_version,
      output_schema_version: source.sourcePlan.output_schema_version,
      agent_version: source.sourcePlan.agent_version,
      pricing_snapshot: source.summary.pricing_snapshot,
    },
    selection: {
      policy: "first_source_order_rows_with_exact_canonical_image_path_and_no_existing_visual_version",
      hard_cap: CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS,
      selected_count: selectedRows.length,
      eligible_count: eligible.length,
      selected_rows_sha256: selectedRowsSha256,
      selected_card_print_ids: selectedRows.map((row) => row.card_print_id),
      rows: selectionMetadata,
      status_counts: Object.fromEntries([...ALLOWED_REVIEW_STATUSES].map((status) => [status, selectedRows.filter((row) => row.review_status === status).length])),
      branch_counts: Object.fromEntries([...new Set(selectedRows.map((row) => row.prompt_branch))].sort().map((branch) => [branch, selectedRows.filter((row) => row.prompt_branch === branch).length])),
      energy_count: selectedRows.filter((row) => String(row.prompt_branch).toLowerCase() === "energy").length,
    },
    imported_source_usage: usage,
    apply_execution_usage: {
      provider_request_count: 0,
      retry_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
    },
    database_preflight: {
      existing_current_count: selectedStates.filter((row) => row.current_description_id).length,
      existing_duplicate_version_count: selectedStates.filter((row) => row.duplicate_description_id).length,
      approved_current_count: selectedStates.filter((row) => row.current_review_status === "approved").length,
      canonical_snapshot_sha256: sha256Json(canonicalSnapshot),
      canonical_rows: canonicalSnapshot,
    },
    boundaries: {
      database_target: ["public.card_visual_description_runs", "public.card_print_visual_descriptions"],
      provider_calls: false,
      regenerate_outputs: false,
      approvals: false,
      embeddings: false,
      public_reads: false,
      canonical_identity_writes: false,
      downstream_integrations: false,
      energy_cards: false,
    },
  };
  plan.database_artifact_hashes = buildDatabaseArtifactHashes(plan);

  await writeJson(path.join(outputDir, "source_hash_verification.json"), {
    verified: true,
    source_manifest_sha256: source.manifest_sha256,
    verified_file_count: source.verified_file_count,
    required_file_hashes: source.required_file_hashes,
  });
  await writeJson(path.join(outputDir, "pre_apply_db_snapshot.json"), plan.database_preflight);
  await writeJsonl(path.join(outputDir, "selected_rows.jsonl"), selectedRows);
  await writeJson(path.join(outputDir, "run_plan.json"), plan);
  const planSha256 = sha256Buffer(await fs.readFile(path.join(outputDir, "run_plan.json")));
  await writeJson(path.join(outputDir, "command_metadata.json"), {
    version: CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_VERSION,
    mode: "plan",
    created_at: nowIso(),
    command: `node scripts/audits/card_visual_description_artifact_apply_v1.mjs --plan --max-cards=${maxCards} --source-run-dir=${posixRelative(sourceRunDir)}`,
    secrets_included: false,
    provider_calls: 0,
    database_writes: 0,
    run_plan_sha256: planSha256,
  });
  return { plan, planSha256, selectedRows, source };
}

function persistedProjectionFromSource(row) {
  return {
    card_print_id: row.card_print_id,
    image_source: row.image_source,
    image_source_key: row.image_source_key,
    image_sha256: row.image_sha256,
    image_width: row.image_width ?? null,
    image_height: row.image_height ?? null,
    image_mime_type: row.image_mime_type,
    prompt_version: row.prompt_version,
    output_schema_version: row.output_schema_version,
    agent_version: row.agent_version,
    model_version: row.model_version,
    response_model_version: row.response_model_version ?? null,
    image_detail: row.image_detail,
    request_count: Number(row.request_count ?? 0),
    retry_count: Number(row.retry_count ?? 0),
    input_tokens: Number(row.input_tokens ?? 0),
    output_tokens: Number(row.output_tokens ?? 0),
    total_tokens: Number(row.total_tokens ?? 0),
    cached_input_tokens: Number(row.cached_input_tokens ?? 0),
    reasoning_output_tokens: Number(row.reasoning_output_tokens ?? 0),
    estimated_cost_usd: Number(row.estimated_cost_usd ?? 0),
    artwork_description: row.artwork_description,
    card_surface_and_printing_cues: row.card_surface_and_printing_cues,
    visual_attributes: row.visual_attributes,
    semantic_tags: row.semantic_tags,
    identity_input_confidence: Number(row.identity_input_confidence),
    description_confidence: Number(row.description_confidence),
    attribute_confidence: Number(row.attribute_confidence),
    image_quality_score: Number(row.image_quality_score),
    review_status: row.review_status,
    quality_flags: row.quality_flags,
  };
}

function persistedProjectionFromDatabase(row) {
  return persistedProjectionFromSource(row);
}

async function insertRunLedger(client, plan, selectedRows, outputDir) {
  const usage = plan.imported_source_usage;
  const responseVersions = usage.response_model_versions;
  const source = plan.source;
  const pricingSnapshot = {
    ...source.pricing_snapshot,
    artifact_import: {
      version: CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_VERSION,
      source_usage_preserved: true,
      provider_calls_during_apply: 0,
      apply_cost_usd: 0,
    },
  };
  const result = await client.query(
    `insert into public.card_visual_description_runs (
       run_key, mode, status, requested_limit, eligible_count, attempted_count,
       validated_count, failed_count, skipped_count, needs_review_count,
       prompt_version, output_schema_version, agent_version, model_version,
       response_model_version, response_model_versions, request_count, retry_count,
       input_tokens, output_tokens, total_tokens, cached_input_tokens,
       reasoning_output_tokens, estimated_cost_usd, pricing_snapshot,
       max_run_cost_usd, max_cards, stop_reason, artifact_directory,
       artifact_hashes, started_at, finished_at
     ) values (
       $1, 'apply', 'running', $2, $2, $2, $2, 0, 0, $3,
       $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, $13, $14, $15, $16,
       $17, $18::jsonb, 0, $2, 'artifact_import_no_provider_calls', $19, $20::jsonb,
       now(), now()
     )
     on conflict (run_key) do update set
       status=excluded.status,
       artifact_directory=excluded.artifact_directory,
       artifact_hashes=excluded.artifact_hashes,
       pricing_snapshot=excluded.pricing_snapshot,
       finished_at=now()
     returning id::text`,
    [
      plan.run_key,
      selectedRows.length,
      selectedRows.filter((row) => row.review_status === "needs_review").length,
      source.prompt_version,
      source.output_schema_version,
      source.agent_version,
      source.source_model_version,
      responseVersions.length === 1 ? responseVersions[0] : null,
      responseVersions,
      usage.request_count,
      usage.retry_count,
      usage.input_tokens,
      usage.output_tokens,
      usage.total_tokens,
      usage.cached_input_tokens,
      usage.reasoning_output_tokens,
      usage.estimated_cost_usd,
      JSON.stringify(pricingSnapshot),
      posixRelative(outputDir),
      JSON.stringify(plan.database_artifact_hashes),
    ],
  );
  return result.rows[0].id;
}

async function insertDescriptionRow(client, row, runId) {
  const values = persistedProjectionFromSource(row);
  const result = await client.query(
    `insert into public.card_print_visual_descriptions (
       card_print_id, run_id, image_source, image_source_key, image_sha256,
       image_width, image_height, image_mime_type, prompt_version,
       output_schema_version, agent_version, model_version, response_model_version,
       image_detail, request_count, retry_count, input_tokens, output_tokens,
       total_tokens, cached_input_tokens, reasoning_output_tokens, estimated_cost_usd,
       artwork_description, card_surface_and_printing_cues, visual_attributes,
       semantic_tags, identity_input_confidence, description_confidence,
       attribute_confidence, image_quality_score, review_status, quality_flags,
       is_current, supersedes_description_id
     ) values (
       $1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
       $17,$18,$19,$20,$21,$22,$23,$24,$25::jsonb,$26::text[],$27,$28,$29,$30,
       $31,$32::text[],true,null
     ) returning id::text`,
    [
      values.card_print_id, runId, values.image_source, values.image_source_key,
      values.image_sha256, values.image_width, values.image_height, values.image_mime_type,
      values.prompt_version, values.output_schema_version, values.agent_version,
      values.model_version, values.response_model_version, values.image_detail,
      values.request_count, values.retry_count, values.input_tokens, values.output_tokens,
      values.total_tokens, values.cached_input_tokens, values.reasoning_output_tokens,
      values.estimated_cost_usd, values.artwork_description,
      values.card_surface_and_printing_cues, JSON.stringify(values.visual_attributes),
      values.semantic_tags, values.identity_input_confidence, values.description_confidence,
      values.attribute_confidence, values.image_quality_score, values.review_status,
      values.quality_flags,
    ],
  );
  return result.rows[0].id;
}

async function executeArtifactApplyTransaction(client, { plan, selectedRows, outputDir }) {
  await client.query("begin");
  try {
    const state = await queryDatabaseState(client, selectedRows, plan.run_key, true);
    assertCanonicalMatch(state);
    const canonicalHash = sha256Json(canonicalProjection(state));
    if (canonicalHash !== plan.database_preflight.canonical_snapshot_sha256) {
      throw new Error("CANONICAL_SNAPSHOT_DRIFT");
    }
    const classification = classifyArtifactApplyStateV1(state);
    if (classification.decision === "idempotent") {
      await client.query("commit");
      return { decision: "idempotent", inserted_count: 0, duplicate_count: selectedRows.length, run_key: plan.run_key };
    }
    if (classification.decision !== "insert") {
      throw new Error(`APPLY_STATE_BLOCKED: ${classification.decision}`);
    }
    const runId = await insertRunLedger(client, plan, selectedRows, outputDir);
    const inserted = [];
    for (const row of selectedRows) inserted.push(await insertDescriptionRow(client, row, runId));
    await client.query(
      `update public.card_visual_description_runs
       set status='completed', finished_at=now(), error_summary=null
       where id=$1::uuid`,
      [runId],
    );
    await client.query("commit");
    return { decision: "inserted", inserted_count: inserted.length, duplicate_count: 0, run_id: runId, run_key: plan.run_key, inserted_description_ids: inserted };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function captureSchemaSecurityReadback(client) {
  const tables = ["card_visual_description_runs", "card_print_visual_descriptions"];
  const migration = await client.query(
    `select version from supabase_migrations.schema_migrations where version='20260715120000'`,
  );
  const rls = await client.query(
    `select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`,
    [tables],
  );
  const policies = await client.query(
    `select tablename, policyname, roles, cmd from pg_policies
     where schemaname='public' and tablename=any($1::text[]) order by tablename,policyname`,
    [tables],
  );
  const grants = await client.query(
    `select table_name, grantee, array_agg(privilege_type order by privilege_type) privileges
     from information_schema.role_table_grants
     where table_schema='public' and table_name=any($1::text[])
     group by table_name,grantee order by table_name,grantee`,
    [tables],
  );
  const forbiddenGrants = grants.rows.filter((row) => ["PUBLIC", "anon", "authenticated"].includes(row.grantee));
  return {
    migration_20260715120000_present: migration.rows.length === 1,
    tables: rls.rows,
    policies: policies.rows,
    grants: grants.rows,
    forbidden_app_role_grants: forbiddenGrants,
    verified: migration.rows.length === 1
      && rls.rows.length === 2
      && rls.rows.every((row) => row.rls_enabled)
      && policies.rows.length === 0
      && forbiddenGrants.length === 0,
  };
}

async function captureApplyReadback(client, plan, selectedRows) {
  const ids = selectedRows.map((row) => row.card_print_id);
  const descriptions = await client.query(
    `select d.*, cp.gv_id, cp.name, cp.set_code, cp.number, cp.image_path,
       r.run_key, r.status as run_status
     from public.card_print_visual_descriptions d
     join public.card_prints cp on cp.id=d.card_print_id
     left join public.card_visual_description_runs r on r.id=d.run_id
     where d.card_print_id=any($1::uuid[])
       and d.image_sha256=any($2::text[])
       and d.prompt_version=$3 and d.output_schema_version=$4
       and d.agent_version=$5 and d.model_version=$6
     order by array_position($1::uuid[],d.card_print_id)`,
    [ids, selectedRows.map((row) => row.image_sha256), plan.source.prompt_version, plan.source.output_schema_version, plan.source.agent_version, plan.source.source_model_version],
  );
  const run = await client.query(
    `select * from public.card_visual_description_runs where run_key=$1`,
    [plan.run_key],
  );
  return { captured_at: nowIso(), run: run.rows[0] ?? null, descriptions: descriptions.rows };
}

function reconcileApply(plan, selectedRows, readback, canonicalBeforeHash, canonicalAfterHash, security) {
  const mismatches = [];
  if (readback.descriptions.length !== selectedRows.length) mismatches.push("description_count_mismatch");
  const dbById = new Map(readback.descriptions.map((row) => [row.card_print_id, row]));
  for (const row of selectedRows) {
    const dbRow = dbById.get(row.card_print_id);
    if (!dbRow) {
      mismatches.push(`missing_description:${row.card_print_id}`);
      continue;
    }
    if (sha256Json(persistedProjectionFromSource(row)) !== sha256Json(persistedProjectionFromDatabase(dbRow))) {
      mismatches.push(`persisted_payload_mismatch:${row.card_print_id}`);
    }
    if (!dbRow.is_current) mismatches.push(`not_current:${row.card_print_id}`);
    if (dbRow.run_key !== plan.run_key) mismatches.push(`run_key_mismatch:${row.card_print_id}`);
    if (dbRow.approved_at || dbRow.approved_by || dbRow.review_status === "approved") mismatches.push(`approval_boundary_broken:${row.card_print_id}`);
    if (dbRow.embedding || dbRow.embedding_input_hash || dbRow.embedding_model || dbRow.embedding_dimensions || dbRow.embedded_at) {
      mismatches.push(`embedding_boundary_broken:${row.card_print_id}`);
    }
  }
  const usage = plan.imported_source_usage;
  const run = readback.run;
  if (!run || run.status !== "completed") mismatches.push("run_ledger_not_completed");
  if (run && Number(run.validated_count) !== selectedRows.length) mismatches.push("run_validated_count_mismatch");
  for (const field of ["request_count", "retry_count", "input_tokens", "output_tokens", "total_tokens", "cached_input_tokens", "reasoning_output_tokens"]) {
    if (run && Number(run[field]) !== Number(usage[field])) mismatches.push(`run_${field}_mismatch`);
  }
  if (run && Number(run.estimated_cost_usd) !== Number(usage.estimated_cost_usd)) mismatches.push("run_cost_mismatch");
  if (run && sha256Json(run.artifact_hashes) !== sha256Json(plan.database_artifact_hashes)) mismatches.push("run_artifact_hashes_mismatch");
  if (canonicalBeforeHash !== canonicalAfterHash) mismatches.push("canonical_snapshot_changed");
  if (!security.verified) mismatches.push("schema_security_verification_failed");
  return {
    reconciled: mismatches.length === 0,
    mismatches,
    selected_count: selectedRows.length,
    saved_count: readback.descriptions.length,
    unique_saved_card_print_ids: new Set(readback.descriptions.map((row) => row.card_print_id)).size,
    review_status_counts: Object.fromEntries([...ALLOWED_REVIEW_STATUSES].map((status) => [status, readback.descriptions.filter((row) => row.review_status === status).length])),
    approved_count: readback.descriptions.filter((row) => row.review_status === "approved").length,
    embedded_count: readback.descriptions.filter((row) => row.embedding || row.embedding_input_hash || row.embedded_at).length,
    imported_source_usage: usage,
    apply_execution_usage: plan.apply_execution_usage,
    canonical_before_sha256: canonicalBeforeHash,
    canonical_after_sha256: canonicalAfterHash,
    schema_security_verified: security.verified,
  };
}

async function writeArtifactHashManifest(outputDir) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const files = {};
  for (const entry of entries.filter((item) => item.isFile() && item.name !== "artifact_hashes.json").sort((a, b) => a.name.localeCompare(b.name))) {
    files[entry.name] = sha256Buffer(await fs.readFile(path.join(outputDir, entry.name)));
  }
  const manifest = {
    artifact_kind: "card_visual_description_artifact_apply_audit_hash_manifest",
    hash_algorithm: "sha256",
    generated_at: nowIso(),
    file_count: Object.keys(files).length,
    files,
  };
  await writeJson(path.join(outputDir, "artifact_hashes.json"), manifest);
  return manifest;
}

function buildMarkdownReport({ plan, applyResult, idempotencyResult, reconciliation, security, outputDir }) {
  const rows = plan.selection.rows.map((row) => `| ${row.selection_order} | ${row.gv_id} | ${row.name} | ${row.review_status} |`).join("\n");
  return `# Card Visual Description Artifact Apply V1\n\nGenerated: ${nowIso()}\n\n## Result\n\n- Producing commit: \`${plan.producing_commit_sha}\`\n- Run key: \`${plan.run_key}\`\n- Inserted rows: \`${applyResult.inserted_count}\`\n- Idempotency replay: \`${idempotencyResult?.decision ?? "not_run"}\`\n- Reconciled: \`${reconciliation.reconciled}\`\n- Pending: \`${reconciliation.review_status_counts.pending}\`\n- Needs review: \`${reconciliation.review_status_counts.needs_review}\`\n- Approved: \`${reconciliation.approved_count}\`\n- Embedded: \`${reconciliation.embedded_count}\`\n- Provider calls during apply: \`0\`\n- New model cost during apply: \`$0\`\n- Imported source cost: \`$${plan.imported_source_usage.estimated_cost_usd}\`\n- Schema/RLS verified: \`${security.verified}\`\n- Audit directory: \`${posixRelative(outputDir)}\`\n\n## Applied Rows\n\n| # | GV-ID | Card | Status |\n| --- | --- | --- | --- |\n${rows}\n\n## Boundaries\n\nNo canonical identity rows were modified. No generated row was approved. No embeddings, provider calls, public reads, or downstream integrations were performed.\n`;
}

export async function runArtifactApplyPlanV1(args) {
  loadEnvironment(args.envFile);
  const gitState = currentGitStateV1();
  const sourceRunDir = repoPath(args.sourceRunDir);
  const outputDir = args.outputDir
    ? repoPath(args.outputDir)
    : path.join(repoPath(DEFAULT_OUTPUT_ROOT), `${safeTimestamp()}_plan_${gitState.commit_sha.slice(0, 12)}`);
  const client = createClient();
  await client.connect();
  try {
    const result = await buildArtifactApplyPlanV1({ sourceRunDir, outputDir, maxCards: args.maxCards, client, gitState });
    return { ...result, outputDir };
  } finally {
    await client.end();
  }
}

export async function runArtifactApplyV1(args) {
  if (!args.planPath) throw new Error("--plan-path is required for --apply");
  if (!args.expectedPlanSha256 || !/^[0-9a-f]{64}$/.test(args.expectedPlanSha256)) {
    throw new Error("--expected-plan-sha256=<64 lowercase hex characters> is required for --apply");
  }
  loadEnvironment(args.envFile);
  const planPath = repoPath(args.planPath);
  const outputDir = path.dirname(planPath);
  const actualPlanSha256 = sha256Buffer(await fs.readFile(planPath));
  if (actualPlanSha256 !== args.expectedPlanSha256) throw new Error("RUN_PLAN_HASH_MISMATCH");
  const plan = await readJson(planPath);
  const gitState = currentGitStateV1();
  if (gitState.branch !== plan.branch || gitState.commit_sha !== plan.producing_commit_sha) throw new Error("FROZEN_GIT_STATE_MISMATCH");
  if (gitState.tracked_status_short) throw new Error(`TRACKED_WORKTREE_NOT_CLEAN: ${gitState.tracked_status_short}`);
  if (plan.selection.selected_count > CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS) throw new Error("PLAN_ROW_CAP_EXCEEDED");
  if (plan.selection.energy_count !== 0) throw new Error("PLAN_CONTAINS_ENERGY_CARD");
  const sourceRunDir = repoPath(plan.source.run_directory);
  const source = await verifySourceArtifacts(sourceRunDir);
  if (source.manifest_sha256 !== plan.source.manifest_sha256) throw new Error("SOURCE_MANIFEST_DRIFT");
  const sourceById = new Map(source.generatedRows.map((row) => [row.card_print_id, row]));
  const selectedRows = plan.selection.rows.map((metadata) => sourceById.get(metadata.card_print_id));
  if (selectedRows.some((row) => !row)) throw new Error("PLANNED_SOURCE_ROW_MISSING");
  if (sha256Json(selectedRows) !== plan.selection.selected_rows_sha256) throw new Error("SELECTED_ROWS_HASH_MISMATCH");
  for (const [index, row] of selectedRows.entries()) {
    if (sha256Json(row) !== plan.selection.rows[index].source_row_sha256) throw new Error(`SOURCE_ROW_HASH_MISMATCH:${row.card_print_id}`);
  }

  const client = createClient();
  await client.connect();
  try {
    const beforeState = await queryDatabaseState(client, selectedRows, plan.run_key);
    assertCanonicalMatch(beforeState);
    const beforeCanonicalHash = sha256Json(canonicalProjection(beforeState));
    const applyResult = await executeArtifactApplyTransaction(client, { plan, selectedRows, outputDir });
    const idempotencyResult = args.verifyIdempotency
      ? await executeArtifactApplyTransaction(client, { plan, selectedRows, outputDir })
      : null;
    const readback = await captureApplyReadback(client, plan, selectedRows);
    const afterState = await queryDatabaseState(client, selectedRows, plan.run_key);
    const afterCanonicalHash = sha256Json(canonicalProjection(afterState));
    const security = await captureSchemaSecurityReadback(client);
    const reconciliation = reconcileApply(plan, selectedRows, readback, beforeCanonicalHash, afterCanonicalHash, security);
    if (applyResult.decision !== "inserted" && applyResult.decision !== "idempotent") reconciliation.mismatches.push("apply_decision_invalid");
    if (args.verifyIdempotency && idempotencyResult?.decision !== "idempotent") reconciliation.mismatches.push("idempotency_replay_failed");
    reconciliation.reconciled = reconciliation.mismatches.length === 0;

    await writeJson(path.join(outputDir, "apply_result.json"), applyResult);
    if (idempotencyResult) await writeJson(path.join(outputDir, "idempotency_result.json"), idempotencyResult);
    await writeJson(path.join(outputDir, "db_readback.json"), readback);
    await writeJson(path.join(outputDir, "ALL_25_SAVED_DATABASE_JSON.json"), readback.descriptions);
    await writeJson(path.join(outputDir, "schema_rls_grant_readback.json"), security);
    await writeJson(path.join(outputDir, "boundary_proof.json"), {
      canonical_snapshot_unchanged: beforeCanonicalHash === afterCanonicalHash,
      approved_rows: reconciliation.approved_count,
      embedded_rows: reconciliation.embedded_count,
      provider_calls_during_apply: 0,
      model_cost_during_apply_usd: 0,
      public_app_role_grants: security.forbidden_app_role_grants,
      database_tables_written: plan.boundaries.database_target,
    });
    await writeJson(path.join(outputDir, "RECONCILIATION_REPORT.json"), reconciliation);
    await writeText(path.join(outputDir, "RECONCILIATION_REPORT.md"), `# Reconciliation\n\n- reconciled: ${reconciliation.reconciled}\n- mismatches: ${reconciliation.mismatches.length}\n- selected: ${reconciliation.selected_count}\n- saved: ${reconciliation.saved_count}\n- unique IDs: ${reconciliation.unique_saved_card_print_ids}\n`);
    await writeJson(path.join(outputDir, "command_metadata.json"), {
      version: CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_VERSION,
      mode: "apply",
      created_at: nowIso(),
      command: `node scripts/audits/card_visual_description_artifact_apply_v1.mjs --apply --plan-path=${posixRelative(planPath)} --expected-plan-sha256=<recorded_sha256> --verify-idempotency`,
      secrets_included: false,
      provider_calls: 0,
      database_writes: applyResult.inserted_count,
      frozen_commit_sha: plan.producing_commit_sha,
      run_plan_sha256: actualPlanSha256,
    });
    await writeText(path.join(outputDir, "CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_REPORT.md"), buildMarkdownReport({ plan, applyResult, idempotencyResult, reconciliation, security, outputDir }));
    const artifactHashes = await writeArtifactHashManifest(outputDir);
    if (!reconciliation.reconciled) throw new Error(`POST_APPLY_RECONCILIATION_FAILED: ${reconciliation.mismatches.join(",")}`);
    return { plan, outputDir, applyResult, idempotencyResult, reconciliation, security, artifactHashes };
  } finally {
    await client.end();
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArtifactApplyArgsV1(argv);
  if (args.mode === "plan") {
    const result = await runArtifactApplyPlanV1(args);
    console.log(`[card-visual-artifact-apply] mode=plan`);
    console.log(`[card-visual-artifact-apply] output_dir=${posixRelative(result.outputDir)}`);
    console.log(`[card-visual-artifact-apply] selected=${result.plan.selection.selected_count}`);
    console.log(`[card-visual-artifact-apply] run_plan_sha256=${result.planSha256}`);
    return result;
  }
  const result = await runArtifactApplyV1(args);
  console.log(`[card-visual-artifact-apply] mode=apply`);
  console.log(`[card-visual-artifact-apply] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-artifact-apply] inserted=${result.applyResult.inserted_count}`);
  console.log(`[card-visual-artifact-apply] idempotency=${result.idempotencyResult?.decision ?? "not_run"}`);
  console.log(`[card-visual-artifact-apply] reconciled=${result.reconciliation.reconciled}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
