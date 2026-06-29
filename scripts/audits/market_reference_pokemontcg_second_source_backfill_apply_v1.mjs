import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  buildPokemonTcgSecondSourceBackfillPlanV1,
  sha256V1,
} from "../../backend/pricing/market_reference_pokemontcg_second_source_backfill_plan_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-APPLY-V1";
export const EXPECTED_PACKAGE_FINGERPRINT = "ed2c4e8d233c5a7a770b7b01bbcc4cc76f584dca75470bb5c613ad05a7d1cb58";
export const APPROVAL_TEXT = "Approve real MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-APPLY-V1 apply only. Package fingerprint: ed2c4e8d233c5a7a770b7b01bbcc4cc76f584dca75470bb5c613ad05a7d1cb58. Manifest hash: e8a91143648af9076118642afb82da02be8e2086fc7f91995f7cc497afd713fc. Normalized artifact hash: 387d7dd270c26f1a0b5a4ad41506abe0b6d54a08f890c2f755b94d2c23d92eda. Scope: insert 10,720 market_reference_candidates rows and 10,720 market_reference_normalized_evidence rows for PokemonTCG.io second-source evidence only. Use candidate_hash to link normalized rows to inserted candidates. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No migrations. No global apply.";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const INPUTS = {
  manifest: "docs/audits/market_evidence_engine_v1/mee_09j_pokemontcg_second_source_consolidated_manifest_2026-06-25T19-54-58-427Z.json",
  normalized: "docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T19-55-05-157Z.json",
};

function parseArgs(argv) {
  const parsed = {
    apply: false,
    approvalText: "",
    chunkSize: 500,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") parsed.apply = true;
    else if (arg === "--approval-text") {
      parsed.approvalText = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--chunk-size=")) {
      parsed.chunkSize = Number(arg.slice("--chunk-size=".length));
    }
  }
  if (!Number.isInteger(parsed.chunkSize) || parsed.chunkSize < 1 || parsed.chunkSize > 1000) {
    throw new Error("[pokemontcg-second-source-backfill-apply] --chunk-size must be 1..1000");
  }
  return parsed;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function read(relativePath) {
  return fs.readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

async function remoteCollisionSummary(supabase, candidateRows) {
  const collisions = [];
  const hashes = [...new Set(candidateRows.map((row) => row.candidate_hash))];
  for (let index = 0; index < hashes.length; index += 100) {
    const chunk = hashes.slice(index, index + 100);
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await supabase
        .from("market_reference_candidates")
        .select("id,source,candidate_hash,card_print_id,gv_id")
        .eq("source", "pokemontcg_io_reference")
        .in("candidate_hash", chunk);
      data = response.data;
      error = response.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
    if (error) throw new Error(`[pokemontcg-second-source-backfill-apply] collision check failed: ${error.message}`);
    collisions.push(...(data ?? []));
  }
  return {
    checked: true,
    candidate_hashes_checked: hashes.length,
    candidate_hash_collisions: collisions.length,
    collision_samples: collisions.slice(0, 25),
  };
}

async function loadPlan({ supabase, generatedAt }) {
  const manifestText = await read(INPUTS.manifest);
  const normalizedText = await read(INPUTS.normalized);
  const manifest = JSON.parse(manifestText);
  const normalizedArtifact = JSON.parse(normalizedText);
  const initialPlan = buildPokemonTcgSecondSourceBackfillPlanV1({
    manifest,
    normalizedArtifact,
    manifestHash: sha256V1(manifestText),
    normalizedHash: sha256V1(normalizedText),
    generatedAt,
  });
  const remoteSummary = await remoteCollisionSummary(supabase, initialPlan.rows.candidateRows);
  return buildPokemonTcgSecondSourceBackfillPlanV1({
    manifest,
    normalizedArtifact,
    manifestHash: sha256V1(manifestText),
    normalizedHash: sha256V1(normalizedText),
    generatedAt,
    remoteCollisionSummary: remoteSummary,
  });
}

async function insertChunked(supabase, table, rows, { chunkSize, select = "id" }) {
  const inserted = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { data, error } = await supabase.from(table).insert(chunk).select(select);
    if (error) throw new Error(`[pokemontcg-second-source-backfill-apply] insert failed for ${table}: ${error.message}`);
    inserted.push(...(data ?? []));
  }
  return inserted;
}

function candidateInsertRows(candidateRows) {
  return candidateRows.map((row) => ({
    acquisition_run_id: null,
    raw_snapshot_id: null,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    source: row.source,
    source_type: row.source_type,
    source_url: row.source_url,
    raw_title: row.raw_title,
    raw_price: row.raw_price,
    currency: row.currency,
    condition_hint: row.condition_hint,
    finish_hint: row.finish_hint,
    observed_at: row.observed_at,
    match_confidence_hint: row.match_confidence_hint,
    exclusion_flags: row.exclusion_flags,
    needs_review: row.needs_review,
    can_publish_price_directly: row.can_publish_price_directly,
    raw_payload: row.raw_payload,
    candidate_hash: row.candidate_hash,
  }));
}

function normalizedInsertRows(normalizedRows, candidateIdByKey) {
  return normalizedRows.map((row) => ({
    candidate_id: candidateIdByKey.get(`${row.source}:${row.candidate_hash}`),
    card_print_id: row.card_print_id,
    source: row.source,
    normalizer_version: row.normalizer_version,
    metric_key: row.metric_key,
    metric_family: row.metric_family,
    normalized_price: row.normalized_price,
    normalized_currency: row.normalized_currency,
    model_disposition: row.model_disposition,
    model_eligible: row.model_eligible,
    evidence_quality_score: row.evidence_quality_score,
    weight_hint: row.weight_hint,
    quality_flags: row.quality_flags,
    group_reference_median: row.group_reference_median,
    normalized_payload: row.normalized_payload,
  }));
}

async function applyRows({ supabase, plan, chunkSize }) {
  const candidateRows = candidateInsertRows(plan.rows.candidateRows);
  const insertedCandidates = await insertChunked(supabase, "market_reference_candidates", candidateRows, {
    chunkSize,
    select: "id,source,candidate_hash",
  });
  const candidateIdByKey = new Map(insertedCandidates.map((row) => [`${row.source}:${row.candidate_hash}`, row.id]));
  const normalizedRows = normalizedInsertRows(plan.rows.normalizedRows, candidateIdByKey);
  if (normalizedRows.some((row) => !row.candidate_id)) {
    throw new Error("[pokemontcg-second-source-backfill-apply] normalized row missing inserted candidate_id");
  }
  const insertedNormalized = await insertChunked(supabase, "market_reference_normalized_evidence", normalizedRows, {
    chunkSize,
    select: "id",
  });
  return {
    market_reference_candidates_inserted: insertedCandidates.length,
    market_reference_normalized_evidence_inserted: insertedNormalized.length,
  };
}

function reportWithoutRows({ plan, args, applied, applyResult, generatedAt }) {
  const { rows, ...withoutRows } = plan;
  const findings = [...withoutRows.findings];
  if (withoutRows.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (args.apply && args.approvalText !== APPROVAL_TEXT) findings.push("approval_text_mismatch");
  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: args.apply ? "apply_requested" : "dry_run_report_only",
    package_fingerprint_sha256: withoutRows.package_fingerprint_sha256,
    expected_package_fingerprint_sha256: EXPECTED_PACKAGE_FINGERPRINT,
    manifest_hash_sha256: withoutRows.manifest_hash_sha256,
    normalized_artifact_hash_sha256: withoutRows.normalized_artifact_hash_sha256,
    proposed_table_row_counts: withoutRows.proposed_table_row_counts,
    remote_collision_summary: withoutRows.remote_collision_summary,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: args.apply && findings.length === 0,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      migrations: false,
    },
    approval_required: true,
    approval_text_matched: args.approvalText === APPROVAL_TEXT,
    findings,
    ready_for_apply: findings.length === 0,
    applied,
    apply_result: applyResult,
  };
}

function renderMarkdown(report) {
  return [
    "# MEE-09L PokemonTCG.io Second Source Backfill Apply",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready: \`${report.ready_for_apply}\``,
    `- Applied: \`${report.applied}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Candidate rows: \`${report.proposed_table_row_counts.market_reference_candidates}\``,
    `- Normalized rows: \`${report.proposed_table_row_counts.market_reference_normalized_evidence}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const supabase = createBackendClient();
  const plan = await loadPlan({ supabase, generatedAt });
  let report = reportWithoutRows({ plan, args, applied: false, applyResult: null, generatedAt });

  if (args.apply && report.ready_for_apply) {
    try {
      const applyResult = await applyRows({ supabase, plan, chunkSize: args.chunkSize });
      report = reportWithoutRows({ plan, args, applied: true, applyResult, generatedAt });
    } catch (error) {
      report.findings.push(`apply_failed:${error.message}`);
      report.ready_for_apply = false;
      report.applied = false;
      process.exitCode = 1;
    }
  } else if (args.apply) {
    process.exitCode = 1;
  }

  await fs.mkdir(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09l_pokemontcg_second_source_backfill_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09l_pokemontcg_second_source_backfill_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    mode: report.mode,
    ready: report.ready_for_apply,
    applied: report.applied,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    apply_result: report.apply_result,
    findings: report.findings,
    artifacts: { jsonPath: rel(jsonPath), mdPath: rel(mdPath) },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
