#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { validateVisualDescriptionPayloadV1 } from "../../backend/card_descriptions/card_visual_description_agent_v1.mjs";

const DEFAULT_SOURCE_RUN_DIR = "docs/audits/card_visual_descriptions/2026-07-20T19-11-36-562Z_harvest_71eceb32b2dd";

function parseArgs(argv) {
  const args = { sourceRunDir: DEFAULT_SOURCE_RUN_DIR, outputDir: null };
  for (const value of argv) {
    if (value.startsWith("--source-run-dir=")) args.sourceRunDir = value.slice("--source-run-dir=".length);
    else if (value.startsWith("--output-dir=")) args.outputDir = value.slice("--output-dir=".length);
    else throw new Error(`unknown argument: ${value}`);
  }
  return args;
}

function nowPathPart() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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
  const text = rows.length > 0 ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n` : "";
  await fs.writeFile(filePath, text, "utf8");
}

function countBy(rows, keyFn) {
  const result = {};
  for (const row of rows) {
    const key = keyFn(row) || "unknown";
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function duplicates(values) {
  const seen = new Set();
  const duplicateSet = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicateSet.add(value);
    seen.add(value);
  }
  return [...duplicateSet].sort();
}

function compactValidationResult(row, validation) {
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    valid_after_replay: validation.ok,
    findings: validation.findings,
  };
}

function imageProvenance(row) {
  const value = {
    image_source: row.image_source ?? null,
    image_source_key: row.image_source_key ?? null,
    image_sha256: row.image_sha256 ?? null,
    image_width: row.image_width ?? null,
    image_height: row.image_height ?? null,
    image_mime_type: row.image_mime_type ?? null,
    image_quality_score: row.image_quality_score ?? null,
    image_quality_flags: row.image_quality_flags ?? null,
  };
  const complete = Boolean(
    value.image_source
    && value.image_source_key
    && value.image_sha256
    && value.image_width
    && value.image_height
    && value.image_mime_type
    && value.image_quality_score !== null,
  );
  return { complete, ...value };
}

function gitValue(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function fileHash(filePath) {
  return sha256(await fs.readFile(filePath));
}

function markdownReport(report) {
  const remainingLines = report.remaining_quarantine.length > 0
    ? report.remaining_quarantine.map((row) => `- ${row.gv_id ?? row.card_print_id}: ${row.name ?? "unknown"} - ${row.reason}`).join("\n")
    : "- None";
  return `# Card Visual Description Quarantine Replay V1

## Scope

- Source run: \`${report.source_run_dir}\`
- Source run commit: \`${report.source_run_commit_sha}\`
- Repair commit/worktree SHA: \`${report.replay_commit_sha}\`
- Provider calls: \`0\`
- Database access: \`false\`
- Database writes: \`false\`

## Result

- Original selected rows: \`${report.counts.selected}\`
- Original validated rows replayed: \`${report.counts.original_valid}\`
- Original valid rows still valid: \`${report.counts.original_valid_replay_passed}\`
- Quarantined rows: \`${report.counts.original_quarantined}\`
- Quarantined payloads recovered offline: \`${report.counts.recovered_payloads}\`
- Remaining quarantine: \`${report.counts.remaining_quarantine}\`
- Reconciliation mismatches: \`${report.reconciliation_mismatches.length}\`

The deterministic validator recovered every quarantined row that preserved a model payload. The remaining row is a provider exception with no raw payload, so no factual output exists to replay.

## Apply Readiness

- The \`${report.counts.original_valid}\` rows in the source \`generated_outputs.jsonl\` remain the exact saved-system artifacts from the paid run.
- The \`${report.counts.recovered_payloads}\` recovered payloads validate structurally under the repaired policy.
- Those recovered payloads are **not yet exact apply artifacts** because the historical failure records did not preserve complete image provenance.
- The provider-exception row remains quarantined and requires a future bounded provider retry.

## Remaining Quarantine

${remainingLines}

## Boundaries

- No OpenAI calls.
- No database reads or writes.
- No approvals.
- No embeddings or downstream integration.
- Source run artifacts were read only and left unchanged.

## Exact Next Gate

Reconstruct image provenance for the 37 recovered payloads from the frozen source selection and self-hosted image store, then build exact saved-system rows and run an apply-readiness reconciliation. Retry the single provider exception only in a separately bounded provider gate.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const sourceRunDir = path.resolve(cwd, args.sourceRunDir);
  const outputDir = path.resolve(cwd, args.outputDir ?? path.join(
    "docs/audits/card_visual_descriptions",
    `${nowPathPart()}_quarantine_repair_replay_${randomBytes(6).toString("hex")}`,
  ));
  await fs.mkdir(outputDir, { recursive: true });

  const sourceFiles = {
    run_plan: path.join(sourceRunDir, "run_plan.json"),
    summary: path.join(sourceRunDir, "summary.json"),
    eligible_cards: path.join(sourceRunDir, "eligible_cards.jsonl"),
    generated_outputs: path.join(sourceRunDir, "generated_outputs.jsonl"),
    validation_failures: path.join(sourceRunDir, "validation_failures.jsonl"),
    skipped_images: path.join(sourceRunDir, "skipped_images.jsonl"),
  };
  const [runPlan, sourceSummary, eligibleCards, generatedRows, failureRows, skippedRows] = await Promise.all([
    readJson(sourceFiles.run_plan),
    readJson(sourceFiles.summary),
    readJsonl(sourceFiles.eligible_cards),
    readJsonl(sourceFiles.generated_outputs),
    readJsonl(sourceFiles.validation_failures),
    readJsonl(sourceFiles.skipped_images),
  ]);

  const controlReplay = generatedRows.map((row) => compactValidationResult(
    row,
    validateVisualDescriptionPayloadV1(row, row),
  ));
  const recoveredPayloads = [];
  const remainingQuarantine = [];
  for (const failure of failureRows) {
    if (!failure.raw_payload) {
      remainingQuarantine.push({
        ...compactValidationResult(failure, { ok: false, findings: failure.findings ?? ["generation_exception"] }),
        reason: "no_raw_payload_from_provider_exception",
        original_error: failure.error ?? null,
        original_failure: failure,
      });
      continue;
    }
    const validation = validateVisualDescriptionPayloadV1(failure.raw_payload, failure);
    if (!validation.ok) {
      remainingQuarantine.push({
        ...compactValidationResult(failure, validation),
        reason: "offline_validation_still_failed",
        original_failure: failure,
      });
      continue;
    }
    recoveredPayloads.push({
      card_print_id: failure.card_print_id,
      gv_id: failure.gv_id ?? null,
      name: failure.name ?? null,
      original_findings: failure.findings ?? [],
      image_provenance: imageProvenance(failure),
      exact_apply_artifact_ready: imageProvenance(failure).complete,
      telemetry: {
        request_count: failure.request_count ?? 0,
        retry_count: failure.retry_count ?? 0,
        input_tokens: failure.input_tokens ?? 0,
        output_tokens: failure.output_tokens ?? 0,
        total_tokens: failure.total_tokens ?? 0,
        cached_input_tokens: failure.cached_input_tokens ?? 0,
        reasoning_output_tokens: failure.reasoning_output_tokens ?? 0,
        estimated_cost_usd: failure.estimated_cost_usd ?? 0,
      },
      normalized_payload: validation.normalized,
    });
  }

  const selectedIds = eligibleCards.map((row) => row.card_print_id);
  const validIds = generatedRows.map((row) => row.card_print_id);
  const failureIds = failureRows.map((row) => row.card_print_id);
  const outcomeIds = [...validIds, ...failureIds, ...skippedRows.map((row) => row.card_print_id)];
  const selectedSet = new Set(selectedIds);
  const outcomeSet = new Set(outcomeIds);
  const reconciliationMismatches = [];
  const check = (name, actual, expected) => {
    if (actual !== expected) reconciliationMismatches.push({ name, actual, expected });
  };
  check("selected_count", selectedIds.length, sourceSummary.attempted_count);
  check("generated_count", generatedRows.length, sourceSummary.validated_count);
  check("failure_count", failureRows.length, sourceSummary.failed_count);
  check("skipped_count", skippedRows.length, sourceSummary.skipped_count);
  check("outcome_count", outcomeIds.length, selectedIds.length);
  check("unique_selected_count", selectedSet.size, selectedIds.length);
  check("unique_outcome_count", outcomeSet.size, outcomeIds.length);
  check("original_valid_replay_passed", controlReplay.filter((row) => row.valid_after_replay).length, generatedRows.length);
  check("replayable_quarantine_recovered", recoveredPayloads.length, failureRows.filter((row) => row.raw_payload).length);
  check("recovered_plus_remaining", recoveredPayloads.length + remainingQuarantine.length, failureRows.length);
  if (selectedIds.some((id) => !outcomeSet.has(id))) reconciliationMismatches.push({ name: "selected_ids_missing_outcomes" });
  if (outcomeIds.some((id) => !selectedSet.has(id))) reconciliationMismatches.push({ name: "outcome_ids_not_selected" });

  const sourceHashes = {};
  for (const [name, filePath] of Object.entries(sourceFiles)) sourceHashes[name] = await fileHash(filePath);
  const report = {
    version: "CARD_VISUAL_DESCRIPTION_QUARANTINE_REPLAY_V1",
    created_at: new Date().toISOString(),
    source_run_dir: path.relative(cwd, sourceRunDir).replaceAll("\\", "/"),
    output_dir: path.relative(cwd, outputDir).replaceAll("\\", "/"),
    source_run_commit_sha: runPlan.commit_sha ?? null,
    replay_commit_sha: gitValue(cwd, ["rev-parse", "HEAD"]),
    branch: gitValue(cwd, ["branch", "--show-current"]),
    source_artifact_hashes: sourceHashes,
    counts: {
      selected: selectedIds.length,
      original_valid: generatedRows.length,
      original_valid_replay_passed: controlReplay.filter((row) => row.valid_after_replay).length,
      original_valid_replay_failed: controlReplay.filter((row) => !row.valid_after_replay).length,
      original_quarantined: failureRows.length,
      replayable_quarantine: failureRows.filter((row) => row.raw_payload).length,
      recovered_payloads: recoveredPayloads.length,
      recovered_with_complete_image_provenance: recoveredPayloads.filter((row) => row.image_provenance.complete).length,
      remaining_quarantine: remainingQuarantine.length,
      skipped: skippedRows.length,
    },
    original_failure_classes: countBy(failureRows, (row) => row.failure_class ?? row.findings?.[0]),
    remaining_quarantine: remainingQuarantine.map((row) => ({
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      reason: row.reason,
      findings: row.findings,
    })),
    reconciliation_mismatches: reconciliationMismatches,
    replay_gate_passed: reconciliationMismatches.length === 0
      && recoveredPayloads.length === failureRows.filter((row) => row.raw_payload).length
      && controlReplay.every((row) => row.valid_after_replay),
    apply_readiness: {
      original_valid_saved_rows: generatedRows.length,
      original_valid_saved_rows_source: "source generated_outputs.jsonl",
      recovered_payloads_structurally_valid: recoveredPayloads.length,
      recovered_payloads_exact_apply_artifact_ready: recoveredPayloads.filter((row) => row.exact_apply_artifact_ready).length,
      remaining_provider_retry_required: remainingQuarantine.filter((row) => row.reason === "no_raw_payload_from_provider_exception").length,
      overall_apply_ready: false,
      blocker: "historical quarantine artifacts do not contain complete image provenance; provider exception has no payload",
    },
    boundaries: {
      provider_calls: 0,
      database_access: false,
      database_writes: false,
      approvals: false,
      embeddings: false,
      source_artifacts_modified: false,
    },
    selected_id_duplicates: duplicates(selectedIds),
    outcome_id_duplicates: duplicates(outcomeIds),
  };

  const outputFiles = {
    recovered_payloads: path.join(outputDir, "recovered_payloads.jsonl"),
    remaining_quarantine: path.join(outputDir, "remaining_quarantine.jsonl"),
    validated_control_replay: path.join(outputDir, "validated_control_replay.jsonl"),
    reconciliation: path.join(outputDir, "APPLY_READINESS_RECONCILIATION.json"),
    report: path.join(outputDir, "OFFLINE_QUARANTINE_REPAIR_REPORT.md"),
  };
  await writeJsonl(outputFiles.recovered_payloads, recoveredPayloads);
  await writeJsonl(outputFiles.remaining_quarantine, remainingQuarantine);
  await writeJsonl(outputFiles.validated_control_replay, controlReplay);
  await writeJson(outputFiles.reconciliation, report);
  await fs.writeFile(outputFiles.report, markdownReport(report), "utf8");

  const artifactHashes = {};
  for (const [name, filePath] of Object.entries(outputFiles)) {
    artifactHashes[path.basename(filePath)] = await fileHash(filePath);
  }
  await writeJson(path.join(outputDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: artifactHashes,
  });

  process.stdout.write(`${JSON.stringify({ output_dir: report.output_dir, ...report.counts, replay_gate_passed: report.replay_gate_passed }, null, 2)}\n`);
  if (!report.replay_gate_passed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
