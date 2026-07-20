#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import {
  buildDescriptionRowV1,
  buildEmbeddingInputV1,
  generateVisualDescriptionPayloadV1,
  sha256,
  validateCardImageProvenanceV1,
  validateVisualDescriptionPayloadV1,
} from "../../backend/card_descriptions/card_visual_description_agent_v1.mjs";

const DEFAULT_SOURCE_RUN_DIR = "docs/audits/card_visual_descriptions/2026-07-20T19-11-36-562Z_harvest_71eceb32b2dd";
const DEFAULT_MAX_RETRY_COST_USD = 0.03;

function parseArgs(argv) {
  const args = {
    sourceRunDir: DEFAULT_SOURCE_RUN_DIR,
    outputDir: null,
    retryProvider: false,
    maxRetryCostUsd: DEFAULT_MAX_RETRY_COST_USD,
  };
  for (const value of argv) {
    if (value.startsWith("--source-run-dir=")) args.sourceRunDir = value.slice("--source-run-dir=".length);
    else if (value.startsWith("--output-dir=")) args.outputDir = value.slice("--output-dir=".length);
    else if (value === "--retry-provider") args.retryProvider = true;
    else if (value.startsWith("--max-retry-cost-usd=")) args.maxRetryCostUsd = Number(value.slice("--max-retry-cost-usd=".length));
    else throw new Error(`unknown argument: ${value}`);
  }
  if (!Number.isFinite(args.maxRetryCostUsd) || args.maxRetryCostUsd <= 0) throw new Error("max retry cost must be positive");
  return args;
}

function nowPathPart() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function gitValue(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, rows.length ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n` : "", "utf8");
}

function fileSafeStamp() {
  return `${nowPathPart()}_apply_readiness_recovery_${randomBytes(6).toString("hex")}`;
}

function telemetryFromFailure(failure) {
  return {
    response_model_version: failure.response_model_version ?? null,
    image_detail: failure.image_detail ?? null,
    request_count: failure.request_count ?? 0,
    retry_count: failure.retry_count ?? 0,
    usage: {
      input_tokens: failure.input_tokens ?? 0,
      output_tokens: failure.output_tokens ?? 0,
      total_tokens: failure.total_tokens ?? 0,
      cached_input_tokens: failure.cached_input_tokens ?? 0,
      reasoning_output_tokens: failure.reasoning_output_tokens ?? 0,
    },
    estimated_cost_usd: failure.estimated_cost_usd ?? 0,
  };
}

function rowBuilderArgs(runPlan) {
  return {
    provider: "openai",
    modelVersion: runPlan.model_version,
    imageDetail: runPlan.image_detail,
    promptVersion: runPlan.prompt_version,
    outputSchemaVersion: runPlan.output_schema_version,
    agentVersion: runPlan.agent_version,
    maxRetries: runPlan.max_retries ?? 1,
    openaiRequestTimeoutMs: runPlan.openai_request_timeout_ms ?? 180000,
    pricingSnapshot: runPlan.pricing_snapshot,
  };
}

function enrichSavedRow(row, card) {
  return {
    ...row,
    gv_id: card.gv_id,
    name: card.name,
    set_code: card.set_code,
    set_name: card.set_name,
    number: card.number,
    v2_stress_role: card.v2_stress_role ?? null,
    v2_stress_reason: card.v2_stress_reason ?? null,
    high_value_rank: card.high_value_rank ?? null,
    high_value_metric_usd: card.high_value_metric_usd ?? null,
    high_value_metric_source: card.high_value_metric_source ?? null,
    high_value_selection_score: card.high_value_selection_score ?? null,
    high_value_selection_reason: card.high_value_selection_reason ?? null,
    high_value_selection_signals: card.high_value_selection_signals ?? null,
    high_value_artwork_key: card.high_value_artwork_key ?? null,
    embedding_input_hash_preview: sha256(buildEmbeddingInputV1(row)),
  };
}

async function fetchCardImageRows(client, cardPrintIds) {
  const rows = [];
  for (let index = 0; index < cardPrintIds.length; index += 100) {
    const chunk = cardPrintIds.slice(index, index + 100);
    const { data, error } = await client
      .from("card_prints")
      .select("id,gv_id,image_url,image_alt_url,representative_image_url,image_path,image_source,image_status")
      .in("id", chunk);
    if (error) throw new Error(`card_prints image provenance query failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function mapConcurrent(values, concurrency, mapper) {
  const output = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return output;
}

function provenanceStatus(failure, image, card) {
  const historicalHash = failure.image_sha256 ?? null;
  const hashMatches = historicalHash ? historicalHash === image.image_sha256 : null;
  const exactIdentitySource = String(card.image_source ?? "").toLowerCase() === "identity"
    && String(card.image_status ?? "").toLowerCase() === "exact";
  return {
    card_print_id: card.card_print_id,
    gv_id: card.gv_id,
    image_source: image.image_source,
    image_source_key: image.image_source_key,
    image_sha256: image.image_sha256,
    image_width: image.image_width,
    image_height: image.image_height,
    image_mime_type: image.image_mime_type,
    image_quality_score: image.image_quality_score,
    image_quality_flags: image.quality_flags,
    canonical_image_source: card.image_source ?? null,
    canonical_image_status: card.image_status ?? null,
    historical_image_sha256: historicalHash,
    historical_hash_match: hashMatches,
    provenance_basis: historicalHash
      ? "historical_failure_hash_match"
      : exactIdentitySource
        ? "reconstructed_from_current_exact_identity_source"
        : "reconstructed_from_current_canonical_source",
    historical_model_image_cryptographically_linked: hashMatches === true,
    current_saved_row_provenance_complete: Boolean(
      image.image_source
      && image.image_source_key
      && image.image_sha256
      && image.image_width
      && image.image_height
      && image.image_mime_type,
    ),
  };
}

function savedExportRecord(card, row, failure = null) {
  return {
    card_print_id: card.card_print_id,
    gv_id: card.gv_id,
    name: card.name,
    outcome_type: row ? "generated_row" : "validation_failure",
    generated_row: row,
    raw_failed_payload: row ? null : failure?.raw_payload ?? null,
    failure: row ? null : failure,
  };
}

async function hashFile(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

function reportMarkdown(report) {
  return `# Card Visual Description Apply-Readiness Recovery V1

## Result

- Selected: \`${report.counts.selected}\`
- Original saved rows preserved: \`${report.counts.original_saved_rows}\`
- Quarantined payload rows reconstructed: \`${report.counts.reconstructed_rows}\`
- Image provenance resolutions: \`${report.counts.image_provenance_resolved}\`
- Historical image hash links: \`${report.counts.historical_hash_linked}\`
- Current exact identity sources: \`${report.counts.current_exact_identity_sources}\`
- Remaining outcomes: \`${report.counts.remaining_outcomes}\`
- Provider retry attempted: \`${report.provider_retry.attempted}\`
- Provider retry status: \`${report.provider_retry.status}\`
- Reconciliation mismatches: \`${report.reconciliation_mismatches.length}\`

## Interpretation

The recovered payloads now have complete current saved-row image provenance. Historical model-request hashes were not preserved for those failures, so current provenance reconstruction is recorded separately from cryptographic historical linkage.

## Boundaries

- Database reads: Supabase REST metadata only.
- Database writes: none.
- Storage reads: self-hosted canonical images only.
- Approvals: none.
- Embeddings: none.

## Exact Next Gate

${report.exact_next_gate}
`;
}

async function main() {
  dotenv.config({ path: ".env.local", quiet: true });
  dotenv.config({ path: ".env", quiet: true });
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const branch = gitValue(cwd, ["branch", "--show-current"]);
  const commitSha = gitValue(cwd, ["rev-parse", "HEAD"]);
  const trackedStatus = gitValue(cwd, ["status", "--short", "--untracked-files=no"]);
  if (branch !== "feature/card-visual-description-agent") throw new Error(`unexpected branch: ${branch}`);
  if (args.retryProvider && trackedStatus) throw new Error("provider retry requires a clean tracked worktree");

  const sourceRunDir = path.resolve(cwd, args.sourceRunDir);
  const outputDir = path.resolve(cwd, args.outputDir ?? path.join("docs/audits/card_visual_descriptions", fileSafeStamp()));
  await fs.mkdir(outputDir, { recursive: true });

  const [runPlan, sourceSummary, eligibleCards, originalSavedRows, originalFailures] = await Promise.all([
    readJson(path.join(sourceRunDir, "run_plan.json")),
    readJson(path.join(sourceRunDir, "summary.json")),
    readJsonl(path.join(sourceRunDir, "eligible_cards.jsonl")),
    readJsonl(path.join(sourceRunDir, "generated_outputs.jsonl")),
    readJsonl(path.join(sourceRunDir, "validation_failures.jsonl")),
  ]);
  const retryCandidates = originalFailures.filter((failure) => !failure.raw_payload);
  if (retryCandidates.length !== 1) throw new Error(`expected one provider retry candidate, found ${retryCandidates.length}`);

  const recoveryPlan = {
    version: "CARD_VISUAL_DESCRIPTION_APPLY_READINESS_RECOVERY_V1",
    created_at: new Date().toISOString(),
    commit_sha: commitSha,
    branch,
    tracked_worktree_clean: trackedStatus === "",
    source_run_dir: path.relative(cwd, sourceRunDir).replaceAll("\\", "/"),
    source_run_commit_sha: runPlan.commit_sha,
    selected_card_print_ids: eligibleCards.map((card) => card.card_print_id),
    provenance_recovery_card_print_ids: originalFailures.filter((failure) => failure.raw_payload).map((failure) => failure.card_print_id),
    provider_retry_card_print_ids: retryCandidates.map((failure) => failure.card_print_id),
    provider_retry_requested: args.retryProvider,
    provider: "openai",
    model: runPlan.model_version,
    image_detail: runPlan.image_detail,
    prompt_version: runPlan.prompt_version,
    schema_version: runPlan.output_schema_version,
    max_retry_cost_usd: args.maxRetryCostUsd,
    boundary: {
      database_writes: false,
      approvals: false,
      embeddings: false,
      downstream_integrations: false,
    },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), recoveryPlan);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase URL and secret key are required for read-only provenance recovery");
  const client = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const targetIds = originalFailures.map((failure) => failure.card_print_id);
  const imageRows = await fetchCardImageRows(client, targetIds);
  const imageRowById = new Map(imageRows.map((row) => [row.id, row]));
  const eligibleById = new Map(eligibleCards.map((card) => [card.card_print_id, card]));
  const cards = targetIds.map((id) => ({
    ...eligibleById.get(id),
    ...imageRowById.get(id),
    card_print_id: id,
  }));
  const missingMetadata = cards.filter((card) => !card.id || !card.card_print_id);
  if (missingMetadata.length) throw new Error(`missing card image metadata for ${missingMetadata.length} cards`);

  const imageResults = await mapConcurrent(cards, 10, async (card) => ({
    card,
    image: await validateCardImageProvenanceV1(card),
  }));
  const imageFailures = imageResults.filter((entry) => !entry.image.ok);
  const imageById = new Map(imageResults.filter((entry) => entry.image.ok).map((entry) => [entry.card.card_print_id, entry.image]));
  const cardById = new Map(cards.map((card) => [card.card_print_id, card]));
  const failureById = new Map(originalFailures.map((failure) => [failure.card_print_id, failure]));
  const builderArgs = rowBuilderArgs(runPlan);
  const reconstructedRows = [];
  const provenanceManifest = [];
  const reconstructionFailures = [];
  for (const failure of originalFailures.filter((entry) => entry.raw_payload)) {
    const card = cardById.get(failure.card_print_id);
    const image = imageById.get(failure.card_print_id);
    if (!image) {
      reconstructionFailures.push({ card_print_id: failure.card_print_id, gv_id: failure.gv_id, reason: "image_provenance_unavailable" });
      continue;
    }
    const validation = validateVisualDescriptionPayloadV1(failure.raw_payload, card);
    if (!validation.ok) {
      reconstructionFailures.push({ card_print_id: failure.card_print_id, gv_id: failure.gv_id, reason: "payload_revalidation_failed", findings: validation.findings });
      continue;
    }
    const row = enrichSavedRow(buildDescriptionRowV1(
      card,
      image,
      validation.normalized,
      builderArgs,
      telemetryFromFailure(failure),
    ), card);
    reconstructedRows.push(row);
    provenanceManifest.push(provenanceStatus(failure, image, card));
  }

  let providerRetry = {
    requested: args.retryProvider,
    attempted: false,
    status: args.retryProvider ? "not_attempted" : "not_requested",
    card_print_id: retryCandidates[0].card_print_id,
    gv_id: retryCandidates[0].gv_id,
    estimated_cost_usd: 0,
    reason: null,
  };
  let retriedRow = null;
  let retryFailure = retryCandidates[0];
  if (args.retryProvider) {
    if (!process.env.OPENAI_API_KEY) {
      providerRetry = { ...providerRetry, status: "blocked_missing_openai_api_key", reason: "OPENAI_API_KEY is not configured" };
    } else {
      const card = cardById.get(retryCandidates[0].card_print_id);
      const image = imageById.get(retryCandidates[0].card_print_id);
      if (!image) {
        providerRetry = { ...providerRetry, status: "blocked_missing_image_provenance", reason: "canonical image could not be resolved" };
      } else {
        providerRetry.attempted = true;
        try {
          const generation = await generateVisualDescriptionPayloadV1(card, image, builderArgs);
          providerRetry.estimated_cost_usd = generation.telemetry.estimated_cost_usd ?? 0;
          const validation = validateVisualDescriptionPayloadV1(generation.payload, card);
          if (!validation.ok) {
            providerRetry.status = "validation_failed";
            providerRetry.reason = validation.findings;
            retryFailure = { ...retryCandidates[0], raw_payload: generation.payload, findings: validation.findings };
          } else if (providerRetry.estimated_cost_usd > args.maxRetryCostUsd) {
            providerRetry.status = "cost_ceiling_exceeded_after_single_call";
            providerRetry.reason = `actual cost ${providerRetry.estimated_cost_usd} exceeded ${args.maxRetryCostUsd}`;
            retryFailure = { ...retryCandidates[0], raw_payload: generation.payload, findings: [providerRetry.status] };
          } else {
            retriedRow = enrichSavedRow(buildDescriptionRowV1(card, image, validation.normalized, builderArgs, generation.telemetry), card);
            provenanceManifest.push(provenanceStatus(retryCandidates[0], image, card));
            providerRetry.status = "validated";
            retryFailure = null;
          }
        } catch (error) {
          providerRetry.status = "provider_exception";
          providerRetry.reason = error.message;
          providerRetry.estimated_cost_usd = error.telemetry?.estimated_cost_usd ?? 0;
        }
      }
    }
  }

  const rowById = new Map([
    ...originalSavedRows.map((row) => [row.card_print_id, row]),
    ...reconstructedRows.map((row) => [row.card_print_id, row]),
    ...(retriedRow ? [[retriedRow.card_print_id, retriedRow]] : []),
  ]);
  const finalFailureById = new Map();
  for (const failure of originalFailures) {
    if (!rowById.has(failure.card_print_id)) finalFailureById.set(failure.card_print_id, failure.card_print_id === retryCandidates[0].card_print_id ? retryFailure : failure);
  }
  const savedSystemExport = eligibleCards.map((card) => savedExportRecord(
    card,
    rowById.get(card.card_print_id) ?? null,
    finalFailureById.get(card.card_print_id) ?? null,
  ));

  const reconciliationMismatches = [];
  const check = (name, actual, expected) => {
    if (actual !== expected) reconciliationMismatches.push({ name, actual, expected });
  };
  check("selected", eligibleCards.length, sourceSummary.attempted_count);
  check("original_saved_rows", originalSavedRows.length, sourceSummary.validated_count);
  check("reconstructed_rows", reconstructedRows.length, originalFailures.filter((failure) => failure.raw_payload).length - reconstructionFailures.length);
  check("export_records", savedSystemExport.length, eligibleCards.length);
  check("unique_export_ids", new Set(savedSystemExport.map((record) => record.card_print_id)).size, eligibleCards.length);
  check("rows_plus_failures", rowById.size + finalFailureById.size, eligibleCards.length);

  const currentExactIdentitySources = provenanceManifest.filter((entry) =>
    entry.provenance_basis === "reconstructed_from_current_exact_identity_source").length;
  const report = {
    version: "CARD_VISUAL_DESCRIPTION_APPLY_READINESS_RECOVERY_V1",
    created_at: new Date().toISOString(),
    commit_sha: commitSha,
    branch,
    source_run_commit_sha: runPlan.commit_sha,
    counts: {
      selected: eligibleCards.length,
      original_saved_rows: originalSavedRows.length,
      original_quarantined: originalFailures.length,
      image_provenance_resolved: imageResults.filter((entry) => entry.image.ok).length,
      image_provenance_failed: imageFailures.length,
      reconstructed_rows: reconstructedRows.length,
      reconstruction_failures: reconstructionFailures.length,
      historical_hash_linked: provenanceManifest.filter((entry) => entry.historical_model_image_cryptographically_linked).length,
      current_exact_identity_sources: currentExactIdentitySources,
      remaining_outcomes: finalFailureById.size,
      saved_system_rows: rowById.size,
    },
    provider_retry: providerRetry,
    image_failures: imageFailures.map((entry) => ({
      card_print_id: entry.card.card_print_id,
      gv_id: entry.card.gv_id,
      reason: entry.image.reason,
      error: entry.image.error ?? null,
    })),
    reconstruction_failures: reconstructionFailures,
    reconciliation_mismatches: reconciliationMismatches,
    apply_readiness: {
      all_outcomes_have_saved_rows: rowById.size === eligibleCards.length,
      current_image_provenance_complete_for_reconstructed_rows: provenanceManifest
        .filter((entry) => reconstructedRows.some((row) => row.card_print_id === entry.card_print_id))
        .every((entry) => entry.current_saved_row_provenance_complete),
      historical_model_image_hashes_available_for_reconstructed_rows: provenanceManifest
        .filter((entry) => reconstructedRows.some((row) => row.card_print_id === entry.card_print_id))
        .every((entry) => entry.historical_model_image_cryptographically_linked),
      overall_ready_for_database_apply: rowById.size === eligibleCards.length
        && reconstructionFailures.length === 0
        && reconciliationMismatches.length === 0,
    },
    boundary: recoveryPlan.boundary,
    exact_next_gate: rowById.size === eligibleCards.length
      ? "Run a 250-row artifact-to-database apply/readback canary with all rows pending or needs_review."
      : providerRetry.status === "blocked_missing_openai_api_key"
        ? "Configure OPENAI_API_KEY and rerun this frozen recovery with --retry-provider; do not repeat the 37 provenance recoveries through the model."
        : "Resolve the remaining provider/image failures, then rerun reconciliation before any database apply.",
  };

  const files = {
    reconstructed_rows: path.join(outputDir, "reconstructed_saved_rows.jsonl"),
    provenance_manifest: path.join(outputDir, "image_provenance_manifest.jsonl"),
    remaining_failures: path.join(outputDir, "remaining_failures.jsonl"),
    saved_system_export: path.join(outputDir, "ALL_1000_APPLY_READINESS_SAVED_SYSTEM_JSON.json"),
    reconciliation: path.join(outputDir, "APPLY_READINESS_RECONCILIATION.json"),
    report: path.join(outputDir, "APPLY_READINESS_RECOVERY_REPORT.md"),
  };
  await writeJsonl(files.reconstructed_rows, reconstructedRows);
  await writeJsonl(files.provenance_manifest, provenanceManifest);
  await writeJsonl(files.remaining_failures, [...finalFailureById.values()].filter(Boolean));
  await writeJson(files.saved_system_export, { version: report.version, records: savedSystemExport });
  await writeJson(files.reconciliation, report);
  await fs.writeFile(files.report, reportMarkdown(report), "utf8");
  const hashes = {};
  for (const filePath of [path.join(outputDir, "run_plan.json"), ...Object.values(files)]) {
    hashes[path.basename(filePath)] = await hashFile(filePath);
  }
  await writeJson(path.join(outputDir, "artifact_hashes.json"), { hash_algorithm: "sha256", artifacts: hashes });

  process.stdout.write(`${JSON.stringify({ output_dir: path.relative(cwd, outputDir).replaceAll("\\", "/"), ...report.counts, provider_retry: providerRetry, reconciliation_mismatches: reconciliationMismatches.length }, null, 2)}\n`);
  if (reconciliationMismatches.length || reconstructionFailures.length || imageFailures.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
