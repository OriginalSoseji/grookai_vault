import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT,
  EXPECTED_MEE_09Q_CANDIDATE_COUNT,
  EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH,
  buildRemainingSingleSourceExactSourceBackfillPlanRowsV1,
  sha256V1,
} from "../../backend/pricing/market_reference_remaining_single_source_exact_source_backfill_plan_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-APPLY-V1";
export const SOURCE_BACKFILL_PLAN_FINGERPRINT = "7c9daf3aa23a5c366a12cc60add9c079d1a3e106c083f854d4551df4be0c1be0";
export const ACTIVE_LISTING_SCHEMA_MIGRATION_HASH = "9c3b473529416edf0798d510469e924b1b2da3229af960fd06de4954438ff807";
export const ACTIVE_LISTING_SCHEMA_PACKAGE_FINGERPRINT = "90dd41c35fe3bdeba555951963c57ad04b5970940d561adc3eedc3a23f22e7ab";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const FETCH_PREFIX = "mee_09q_remaining_single_source_exact_source_fetch_";
const MIGRATION_PATH = "supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql";

function parseArgs(argv) {
  const parsed = {
    apply: false,
    approvalText: "",
    chunkSize: 100,
    fetchArtifactPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") parsed.apply = true;
    else if (arg === "--approval-text") {
      parsed.approvalText = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--chunk-size=")) {
      parsed.chunkSize = Number(arg.slice("--chunk-size=".length));
    } else if (arg.startsWith("--fetch-artifact=")) {
      parsed.fetchArtifactPath = arg.slice("--fetch-artifact=".length);
    }
  }
  if (!Number.isInteger(parsed.chunkSize) || parsed.chunkSize < 1 || parsed.chunkSize > 500) {
    throw new Error("[remaining-single-source-backfill-apply] --chunk-size must be 1..500");
  }
  return parsed;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function read(relativePath) {
  return fs.readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

async function latestFetchArtifactPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const files = await fs.readdir(dir);
  const candidates = files
    .filter((fileName) => fileName.startsWith(FETCH_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[remaining-single-source-backfill-apply] no ${FETCH_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

async function readFetchArtifact(relativeOrAbsolutePath) {
  const resolved = path.resolve(REPO_ROOT, relativeOrAbsolutePath ?? await latestFetchArtifactPath());
  return {
    path: resolved,
    data: JSON.parse(await fs.readFile(resolved, "utf8")),
  };
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

async function remoteCollisionSummary(supabase, candidateRows) {
  const hashes = [...new Set(candidateRows.map((row) => row.candidate_hash))];
  const collisions = [];
  for (let index = 0; index < hashes.length; index += 100) {
    const chunk = hashes.slice(index, index + 100);
    const { data, error } = await supabase
      .from("market_reference_candidates")
      .select("id,source,candidate_hash,card_print_id,gv_id")
      .eq("source", "ebay_active")
      .in("candidate_hash", chunk);
    if (error) throw new Error(`[remaining-single-source-backfill-apply] collision check failed: ${error.message}`);
    collisions.push(...(data ?? []));
  }
  return {
    checked: true,
    candidate_hashes_checked: hashes.length,
    candidate_hash_collisions: collisions.length,
    collision_samples: collisions.slice(0, 25),
  };
}

async function remoteSchemaSummary(supabase) {
  const { data, error } = await supabase.rpc("exec_sql", {
    sql: `
      select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conrelid in ('public.market_reference_candidates'::regclass, 'public.market_reference_raw_snapshots'::regclass)
      and conname in (
        'market_reference_candidates_source_check',
        'market_reference_candidates_source_type_check',
        'market_reference_candidates_needs_review_check',
        'market_reference_candidates_no_direct_publish_check',
        'market_reference_raw_snapshots_source_check',
        'market_reference_raw_snapshots_object_type_check'
      )
      order by conname;
    `,
  });
  if (!error && Array.isArray(data)) return { checked: true, constraints: data };

  return {
    checked: false,
    reason: error?.message ?? "exec_sql rpc unavailable",
  };
}

async function remoteRowCountSummary(supabase) {
  const { count, error } = await supabase
    .from("market_reference_candidates")
    .select("id", { count: "exact", head: true })
    .eq("source", "ebay_active");
  if (error) throw new Error(`[remaining-single-source-backfill-apply] ebay_active count failed: ${error.message}`);
  return {
    checked: true,
    ebay_active_candidate_rows: count ?? 0,
  };
}

async function insertChunked(supabase, table, rows, { chunkSize, select = "id" }) {
  const inserted = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { data, error } = await supabase.from(table).insert(chunk).select(select);
    if (error) throw new Error(`[remaining-single-source-backfill-apply] insert failed for ${table}: ${error.message}`);
    inserted.push(...(data ?? []));
  }
  return inserted;
}

async function applyRows({ supabase, candidateRows, chunkSize }) {
  const inserted = await insertChunked(supabase, "market_reference_candidates", candidateInsertRows(candidateRows), {
    chunkSize,
    select: "id,source,candidate_hash",
  });
  return {
    market_reference_candidates_inserted: inserted.length,
    market_reference_normalized_evidence_inserted: 0,
  };
}

function approvalPrompt(report) {
  return `Approve real MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Candidate evidence manifest hash: ${report.candidate_evidence_manifest_hash_sha256}. Source package fingerprint: ${report.source_package_fingerprint_sha256}. Active-listing schema migration hash: ${report.active_listing_schema_migration_hash_sha256}. Scope: insert ${report.proposed_table_row_counts.market_reference_candidates} reviewed ebay_active active-listing candidate rows into market_reference_candidates only from MEE-09Q local fetched evidence. No raw snapshot writes. No normalized evidence writes. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

export async function buildRemainingSingleSourceExactSourceBackfillApplyReportV1({
  fetchArtifact,
  fetchArtifactPath = null,
  remoteCollision = { checked: false },
  remoteSchema = { checked: false },
  remoteRowCounts = { checked: false },
  apply = false,
  approvalText = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const rows = buildRemainingSingleSourceExactSourceBackfillPlanRowsV1({ fetchArtifact });
  const migrationHash = sha256V1(await read(MIGRATION_PATH));
  const candidateRows = rows.candidateRows;
  const candidateHashes = new Set(candidateRows.map((row) => `${row.source}:${row.candidate_hash}`));
  const candidateEvidenceManifestHash = fetchArtifact?.candidate_evidence_manifest_hash_sha256 ?? null;
  const sourcePackageFingerprint = fetchArtifact?.source_package_fingerprint_sha256 ?? null;
  const findings = [];

  if (candidateEvidenceManifestHash !== EXPECTED_MEE_09Q_CANDIDATE_EVIDENCE_MANIFEST_HASH) findings.push("candidate_evidence_manifest_hash_mismatch");
  if (sourcePackageFingerprint !== EXPECTED_MEE_09P_SOURCE_PACKAGE_FINGERPRINT) findings.push("source_package_fingerprint_mismatch");
  if (migrationHash !== ACTIVE_LISTING_SCHEMA_MIGRATION_HASH) findings.push("active_listing_schema_migration_hash_mismatch");
  if (candidateRows.length !== EXPECTED_MEE_09Q_CANDIDATE_COUNT) findings.push("candidate_row_count_mismatch");
  if (candidateRows.some((row) => row.source !== "ebay_active")) findings.push("unexpected_candidate_source");
  if (candidateRows.some((row) => row.source_type !== "active_listing")) findings.push("unexpected_candidate_source_type");
  if (candidateRows.some((row) => row.needs_review !== true)) findings.push("candidate_missing_review_gate");
  if (candidateRows.some((row) => row.can_publish_price_directly !== false)) findings.push("candidate_direct_publish_detected");
  if ((remoteCollision?.candidate_hash_collisions ?? 0) > 0) findings.push("remote_candidate_hash_collisions_detected");
  if (fetchArtifact?.ready_for_review_backfill_plan !== true) findings.push("fetch_artifact_not_ready_for_review_backfill_plan");
  if ((fetchArtifact?.findings ?? []).length > 0) findings.push("fetch_artifact_contains_findings");

  const packageFingerprint = sha256V1({
    package_id: PACKAGE_ID,
    source_backfill_plan_fingerprint: SOURCE_BACKFILL_PLAN_FINGERPRINT,
    candidate_evidence_manifest_hash: candidateEvidenceManifestHash,
    source_package_fingerprint: sourcePackageFingerprint,
    active_listing_schema_migration_hash: migrationHash,
    row_counts: {
      market_reference_candidates: candidateRows.length,
      market_reference_normalized_evidence: 0,
    },
    candidate_hashes_sha256: sha256V1([...candidateHashes].sort().join("\n")),
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

  const baseReport = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: apply ? "apply_requested" : "dry_run_report_only",
    package_fingerprint_sha256: packageFingerprint,
    source_backfill_plan_fingerprint_sha256: SOURCE_BACKFILL_PLAN_FINGERPRINT,
    active_listing_schema_migration_hash_sha256: migrationHash,
    active_listing_schema_package_fingerprint_sha256: ACTIVE_LISTING_SCHEMA_PACKAGE_FINGERPRINT,
    candidate_evidence_manifest_hash_sha256: candidateEvidenceManifestHash,
    source_package_fingerprint_sha256: sourcePackageFingerprint,
    proposed_table_row_counts: {
      market_reference_candidates: candidateRows.length,
      market_reference_normalized_evidence: 0,
    },
    row_hashes: {
      candidate_rows_hash: sha256V1(candidateRows),
    },
    input_artifacts: {
      fetch_artifact: fetchArtifactPath,
      migration: MIGRATION_PATH,
    },
    remote_collision_summary: remoteCollision,
    remote_schema_summary: remoteSchema,
    remote_row_count_summary: remoteRowCounts,
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
  const prompt = approvalPrompt(baseReport);
  baseReport.approval_text_matched = approvalText === prompt;
  if (apply && !baseReport.approval_text_matched) findings.push("approval_text_mismatch");
  baseReport.ready_for_apply = findings.length === 0;
  baseReport.approval_prompt_for_apply = prompt;
  return { report: baseReport, rows: { candidateRows } };
}

function renderMarkdown(report) {
  return [
    "# MEE-10C Remaining Single-Source Exact Source Backfill Apply",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready: \`${report.ready_for_apply}\``,
    `- Applied: \`${report.applied}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Candidate evidence manifest hash: \`${report.candidate_evidence_manifest_hash_sha256}\``,
    `- Active-listing schema migration hash: \`${report.active_listing_schema_migration_hash_sha256}\``,
    `- Candidate rows: \`${report.proposed_table_row_counts.market_reference_candidates}\``,
    `- Normalized rows: \`${report.proposed_table_row_counts.market_reference_normalized_evidence}\``,
    `- Remote candidate hash collisions: \`${report.remote_collision_summary?.candidate_hash_collisions ?? "unchecked"}\``,
    "",
    "## Boundary",
    "",
    "- No provider calls.",
    "- No source fetches.",
    "- No pricing observations writes.",
    "- No eBay latest price writes.",
    "- No public/app-visible pricing.",
    "- No price rollups.",
    "- No raw snapshot writes.",
    "- No normalized evidence writes.",
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
  const fetchArtifact = await readFetchArtifact(args.fetchArtifactPath);
  const supabase = createBackendClient();
  const initialRows = buildRemainingSingleSourceExactSourceBackfillPlanRowsV1({ fetchArtifact: fetchArtifact.data });
  const [collisionSummary, schemaSummary, rowCountSummary] = await Promise.all([
    remoteCollisionSummary(supabase, initialRows.candidateRows),
    remoteSchemaSummary(supabase),
    remoteRowCountSummary(supabase),
  ]);
  const { report, rows } = await buildRemainingSingleSourceExactSourceBackfillApplyReportV1({
    fetchArtifact: fetchArtifact.data,
    fetchArtifactPath: rel(fetchArtifact.path),
    remoteCollision: collisionSummary,
    remoteSchema: schemaSummary,
    remoteRowCounts: rowCountSummary,
    apply: args.apply,
    approvalText: args.approvalText,
    generatedAt,
  });

  if (args.apply && report.ready_for_apply) {
    try {
      report.apply_result = await applyRows({ supabase, candidateRows: rows.candidateRows, chunkSize: args.chunkSize });
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
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_10c_remaining_single_source_exact_source_backfill_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_10c_remaining_single_source_exact_source_backfill_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    mode: report.mode,
    ready: report.ready_for_apply,
    applied: report.applied,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    remote_collision_summary: report.remote_collision_summary,
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
