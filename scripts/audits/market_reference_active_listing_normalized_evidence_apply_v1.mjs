import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  EXPECTED_ACTIVE_LISTING_INPUT_COUNT,
  MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION,
  buildMarketReferenceActiveListingNormalizationPlanV1,
} from "../../backend/pricing/market_reference_active_listing_normalization_plan_v1.mjs";
import { sha256V1 } from "../../backend/pricing/market_reference_remaining_single_source_exact_source_backfill_plan_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZED-EVIDENCE-APPLY-V1";
export const ACTIVE_LISTING_NORMALIZED_SCHEMA_MIGRATION_HASH = "0c7c9ef9b750036f1ed9a2a0e0144b77fa147175ee12c971d91d18b84ff31a90";
export const ACTIVE_LISTING_NORMALIZED_SCHEMA_PACKAGE_FINGERPRINT = "d1bf67580def34c834c68c2ae38b12bab178a503ac8861733f23330b2956f489";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const MIGRATION_PATH = "supabase/migrations/20260625030000_market_reference_active_listing_normalized_evidence_schema_v1.sql";

function parseArgs(argv) {
  const parsed = {
    apply: false,
    approvalText: "",
    chunkSize: 100,
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
  if (!Number.isInteger(parsed.chunkSize) || parsed.chunkSize < 1 || parsed.chunkSize > 500) {
    throw new Error("[active-listing-normalized-apply] --chunk-size must be 1..500");
  }
  return parsed;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function read(relativePath) {
  return fs.readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

async function fetchActiveListingCandidates(supabase) {
  const { data, error } = await supabase
    .from("market_reference_candidates")
    .select("id,card_print_id,gv_id,source,source_type,source_url,raw_title,raw_price,currency,condition_hint,finish_hint,observed_at,match_confidence_hint,exclusion_flags,needs_review,can_publish_price_directly,raw_payload")
    .eq("source", "ebay_active")
    .order("gv_id", { ascending: true });
  if (error) throw new Error(`[active-listing-normalized-apply] candidate read failed: ${error.message}`);
  return data ?? [];
}

async function remoteDuplicateSummary(supabase, normalizedRows) {
  const candidateIds = [...new Set(normalizedRows.map((row) => row.candidate_id).filter(Boolean))];
  const duplicates = [];
  for (let index = 0; index < candidateIds.length; index += 100) {
    const chunk = candidateIds.slice(index, index + 100);
    const { data, error } = await supabase
      .from("market_reference_normalized_evidence")
      .select("id,candidate_id,source,normalizer_version,model_disposition,model_eligible")
      .eq("source", "ebay_active")
      .eq("normalizer_version", MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION)
      .in("candidate_id", chunk);
    if (error) throw new Error(`[active-listing-normalized-apply] duplicate check failed: ${error.message}`);
    duplicates.push(...(data ?? []));
  }
  return {
    checked: true,
    candidate_ids_checked: candidateIds.length,
    duplicate_rows: duplicates.length,
    duplicate_samples: duplicates.slice(0, 25),
  };
}

async function remoteRowCountSummary(supabase) {
  const [all, eligible] = await Promise.all([
    supabase
      .from("market_reference_normalized_evidence")
      .select("id", { count: "exact", head: true })
      .eq("source", "ebay_active"),
    supabase
      .from("market_reference_normalized_evidence")
      .select("id", { count: "exact", head: true })
      .eq("source", "ebay_active")
      .eq("model_eligible", true),
  ]);
  if (all.error) throw new Error(`[active-listing-normalized-apply] row count failed: ${all.error.message}`);
  if (eligible.error) throw new Error(`[active-listing-normalized-apply] eligible row count failed: ${eligible.error.message}`);
  return {
    checked: true,
    ebay_active_normalized_rows: all.count ?? 0,
    ebay_active_model_eligible_rows: eligible.count ?? 0,
  };
}

function insertRows(normalizedRows) {
  return normalizedRows.map((row) => ({
    candidate_id: row.candidate_id,
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
    group_reference_median: null,
    normalized_payload: row.normalized_payload,
  }));
}

async function insertChunked(supabase, table, rows, { chunkSize, select = "id" }) {
  const inserted = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { data, error } = await supabase.from(table).insert(chunk).select(select);
    if (error) throw new Error(`[active-listing-normalized-apply] insert failed for ${table}: ${error.message}`);
    inserted.push(...(data ?? []));
  }
  return inserted;
}

async function applyRows({ supabase, normalizedRows, chunkSize }) {
  const inserted = await insertChunked(supabase, "market_reference_normalized_evidence", insertRows(normalizedRows), {
    chunkSize,
    select: "id,source,model_disposition,model_eligible",
  });
  return {
    market_reference_normalized_evidence_inserted: inserted.length,
    model_eligible_inserted: inserted.filter((row) => row.model_eligible === true).length,
  };
}

function approvalPrompt(report) {
  return `Approve real MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZED-EVIDENCE-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Row manifest hash: ${report.row_manifest_hash_sha256}. Active-listing normalized schema migration hash: ${report.active_listing_normalized_schema_migration_hash_sha256}. Scope: insert ${report.proposed_table_row_counts.market_reference_normalized_evidence} review-only ebay_active normalized evidence rows into market_reference_normalized_evidence only, with model_eligible=false for every row. No candidate writes. No raw snapshot writes. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

function rowManifest(normalizedRows) {
  return normalizedRows.map((row) => ({
    candidate_id: row.candidate_id,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
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
  }));
}

export async function buildMarketReferenceActiveListingNormalizedEvidenceApplyReportV1({
  candidates = [],
  duplicateSummary = { checked: false },
  rowCountSummary = { checked: false },
  apply = false,
  approvalText = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const plan = buildMarketReferenceActiveListingNormalizationPlanV1({ candidates });
  const normalizedRows = plan.normalized_evidence;
  const migrationHash = sha256V1(await read(MIGRATION_PATH));
  const manifest = rowManifest(normalizedRows);
  const rowManifestHash = sha256V1(manifest);
  const findings = [...plan.findings];

  if (migrationHash !== ACTIVE_LISTING_NORMALIZED_SCHEMA_MIGRATION_HASH) findings.push("active_listing_normalized_schema_migration_hash_mismatch");
  if (normalizedRows.length !== EXPECTED_ACTIVE_LISTING_INPUT_COUNT) findings.push("normalized_row_count_mismatch");
  if (normalizedRows.some((row) => row.source !== "ebay_active")) findings.push("unexpected_source_detected");
  if (normalizedRows.some((row) => row.model_eligible !== false)) findings.push("model_eligible_leak_detected");
  if (normalizedRows.some((row) => row.can_publish_price_directly === true)) findings.push("direct_publish_leak_detected");
  if (normalizedRows.some((row) => !row.candidate_id)) findings.push("candidate_id_missing");
  if ((duplicateSummary?.duplicate_rows ?? 0) > 0) findings.push("remote_duplicate_normalized_rows_detected");
  if ((rowCountSummary?.ebay_active_model_eligible_rows ?? 0) > 0) findings.push("existing_model_eligible_ebay_active_rows_detected");

  const packageFingerprint = sha256V1({
    package_id: PACKAGE_ID,
    active_listing_normalized_schema_migration_hash: migrationHash,
    row_manifest_hash: rowManifestHash,
    row_counts: {
      market_reference_normalized_evidence: normalizedRows.length,
      model_eligible: normalizedRows.filter((row) => row.model_eligible === true).length,
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      price_rollups: false,
    },
  });

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: apply ? "apply_requested" : "dry_run_report_only",
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    active_listing_normalized_schema_migration_hash_sha256: migrationHash,
    active_listing_normalized_schema_package_fingerprint_sha256: ACTIVE_LISTING_NORMALIZED_SCHEMA_PACKAGE_FINGERPRINT,
    normalizer_version: MARKET_REFERENCE_ACTIVE_LISTING_NORMALIZATION_PLAN_VERSION,
    proposed_table_row_counts: {
      market_reference_normalized_evidence: normalizedRows.length,
      model_eligible: normalizedRows.filter((row) => row.model_eligible === true).length,
    },
    disposition_counts: plan.counts.disposition_counts,
    quality_flag_counts: plan.counts.quality_flag_counts,
    duplicate_summary: duplicateSummary,
    remote_row_count_summary: rowCountSummary,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: apply && findings.length === 0,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    approval_required: true,
    approval_text_matched: false,
    findings,
    ready_for_apply: false,
    applied: false,
    apply_result: null,
  };
  const prompt = approvalPrompt(report);
  report.approval_text_matched = approvalText === prompt;
  if (apply && !report.approval_text_matched) findings.push("approval_text_mismatch");
  report.ready_for_apply = findings.length === 0;
  report.approval_prompt_for_apply = prompt;
  return { report, rows: { normalizedRows } };
}

function renderMarkdown(report) {
  return [
    "# MEE-10I Active Listing Normalized Evidence Apply",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready: \`${report.ready_for_apply}\``,
    `- Applied: \`${report.applied}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    `- Migration hash: \`${report.active_listing_normalized_schema_migration_hash_sha256}\``,
    `- Normalized rows: \`${report.proposed_table_row_counts.market_reference_normalized_evidence}\``,
    `- Model eligible rows: \`${report.proposed_table_row_counts.model_eligible}\``,
    `- Duplicate rows: \`${report.duplicate_summary?.duplicate_rows ?? "unchecked"}\``,
    "",
    "## Boundary",
    "",
    "- No provider calls.",
    "- No source fetches.",
    "- No pricing observations writes.",
    "- No eBay latest price writes.",
    "- No public/app-visible pricing.",
    "- No price rollups.",
    "- No candidate writes.",
    "- No raw snapshot writes.",
    "",
    "## Dispositions",
    "",
    "| Disposition | Rows |",
    "| --- | ---: |",
    ...Object.entries(report.disposition_counts ?? {}).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    report.approval_prompt_for_apply,
    "```",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const supabase = createBackendClient();
  const candidates = await fetchActiveListingCandidates(supabase);
  const plan = buildMarketReferenceActiveListingNormalizationPlanV1({ candidates });
  const [duplicateSummary, rowCountSummary] = await Promise.all([
    remoteDuplicateSummary(supabase, plan.normalized_evidence),
    remoteRowCountSummary(supabase),
  ]);
  const { report, rows } = await buildMarketReferenceActiveListingNormalizedEvidenceApplyReportV1({
    candidates,
    duplicateSummary,
    rowCountSummary,
    apply: args.apply,
    approvalText: args.approvalText,
    generatedAt,
  });

  if (args.apply && report.ready_for_apply) {
    try {
      report.apply_result = await applyRows({ supabase, normalizedRows: rows.normalizedRows, chunkSize: args.chunkSize });
      report.applied = true;
      report.boundary.db_writes = true;
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
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_10i_active_listing_normalized_evidence_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_10i_active_listing_normalized_evidence_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    mode: report.mode,
    ready: report.ready_for_apply,
    applied: report.applied,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    row_manifest_hash_sha256: report.row_manifest_hash_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    duplicate_summary: report.duplicate_summary,
    remote_row_count_summary: report.remote_row_count_summary,
    apply_result: report.apply_result,
    findings: report.findings,
    artifacts: { jsonPath: rel(jsonPath), mdPath: rel(mdPath) },
    approval_prompt_for_apply: report.approval_prompt_for_apply,
  }, null, 2));
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
