import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-LISTING-STRICT-FILTERED-ROLLUP-APPLY-V1";
export const EXPECTED_SOURCE_PLAN_FINGERPRINT = "969085b81bd0397cc82c08c336720ef285aef04a4b32f9cbae16d37c351ff42f";
export const EXPECTED_SOURCE_STRICT_TITLE_AUDIT_FINGERPRINT = "7f5e73c2c9504291194b6f7ff269a3145ad6c9c1e075ceb012a79d3fa1417eec";
export const EXPECTED_ROLLUP_COUNT = 2243;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const PLAN_PREFIX = "mee_11y_market_listing_strict_filtered_rollup_plan_";

const BASE_ROLLUP_VERSION_BY_EVIDENCE_CLASS = {
  raw_single: "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1",
  slab: "MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1",
};

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function deterministicUuid(input) {
  const hash = sha256(input);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  const rollupVersionSuffix = argv.find((arg) => arg.startsWith("--rollup-version-suffix="))?.slice("--rollup-version-suffix=".length)
    ?? argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length)
    ?? null;
  return {
    apply: argv.includes("--apply"),
    readbackOnly: argv.includes("--readback-only"),
    allowDynamicPlan: argv.includes("--allow-dynamic-plan"),
    planPath: argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? null,
    approvedReportPath: argv.find((arg) => arg.startsWith("--approved-report="))?.slice("--approved-report=".length) ?? null,
    rollupVersionSuffix,
  };
}

function normalizeRollupVersionSuffix(raw) {
  if (!raw) return "";
  const suffix = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!suffix) throw new Error("[strict-filtered-rollup-apply] rollup version suffix normalized to empty");
  return suffix.slice(0, 80);
}

function rollupVersionMap(args) {
  const suffix = normalizeRollupVersionSuffix(args.rollupVersionSuffix);
  return Object.fromEntries(
    Object.entries(BASE_ROLLUP_VERSION_BY_EVIDENCE_CLASS).map(([evidenceClass, version]) => [
      evidenceClass,
      suffix ? `${version}__${suffix}` : version,
    ]),
  );
}

async function latestPlanPath() {
  const dir = path.join(REPO_ROOT, AUDIT_DIR);
  const files = await fs.readdir(dir);
  const candidates = files
    .filter((fileName) => fileName.startsWith(PLAN_PREFIX) && fileName.endsWith(".json"))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) throw new Error(`[strict-filtered-rollup-apply] no ${PLAN_PREFIX}*.json artifact found`);
  return path.join(dir, latest);
}

async function readPlan(filePath) {
  const resolved = path.resolve(REPO_ROOT, filePath ?? await latestPlanPath());
  const plan = JSON.parse(await fs.readFile(resolved, "utf8"));
  const rollupsPath = path.resolve(REPO_ROOT, plan.artifacts?.strict_filtered_rollups_json_path ?? "");
  if (!rollupsPath) throw new Error("[strict-filtered-rollup-apply] plan missing strict_filtered_rollups_json_path");
  const rollups = JSON.parse(await fs.readFile(rollupsPath, "utf8"));
  return { path: resolved, plan, rollupsPath, rollups };
}

async function readApprovedReport(filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(REPO_ROOT, filePath);
  const report = JSON.parse(await fs.readFile(resolved, "utf8"));
  const rowPath = path.resolve(REPO_ROOT, report.row_file_path ?? "");
  if (!rowPath) throw new Error("[strict-filtered-rollup-apply] approved report missing row_file_path");
  const rows = (await fs.readFile(rowPath, "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  return { path: resolved, report, rowPath, rows };
}

function toDbRow(row, generatedAt, versionsByEvidenceClass, sourcePlanFingerprint, sourceStrictTitleAuditFingerprint) {
  const rollupVersion = versionsByEvidenceClass[row.evidence_class];
  if (!rollupVersion) throw new Error(`[strict-filtered-rollup-apply] unsupported evidence_class: ${row.evidence_class}`);
  return {
    id: deterministicUuid(`market_listing_strict_filtered_rollup:${rollupVersion}:manual:${row.card_print_id}`),
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    source: "ebay_active",
    rollup_version: rollupVersion,
    rollup_window: "manual",
    listing_count: row.listing_count,
    seller_count: row.seller_count,
    median_active_ask: row.median_active_ask,
    trimmed_low_active_ask: row.trimmed_low_active_ask,
    trimmed_high_active_ask: row.trimmed_high_active_ask,
    minimum_active_ask: row.minimum_active_ask,
    maximum_active_ask: row.maximum_active_ask,
    currency: "USD",
    stale_listing_count: 0,
    reviewed_candidate_count: 0,
    exclusion_counts: {},
    rollup_payload: {
      evidence_class: row.evidence_class,
      q25: row.q25,
      q75: row.q75,
      p95: row.p95,
      strict_title_filtered: true,
      review_bucket: row.review_bucket,
      sample_titles: row.sample_titles ?? [],
      source_plan_fingerprint_sha256: sourcePlanFingerprint,
      source_strict_title_audit_fingerprint_sha256: sourceStrictTitleAuditFingerprint,
      review_only: true,
    },
    needs_review: true,
    publishable: false,
    app_visible: false,
    market_truth: false,
    generated_at: generatedAt,
    created_at: generatedAt,
  };
}

async function supabaseRequest(factory) {
  const result = await factory();
  if (result.error) throw new Error(result.error.message);
  return result;
}

async function existingRollupCollisions(supabase, rows) {
  const cardPrintIds = [...new Set(rows.map((row) => row.card_print_id).filter(Boolean))];
  const plannedIds = new Set(rows.map((row) => row.id));
  const plannedKeys = new Set(rows.map((row) => `${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`));
  const found = [];
  for (let index = 0; index < cardPrintIds.length; index += 100) {
    const chunk = cardPrintIds.slice(index, index + 100);
    const { data } = await supabaseRequest(() => supabase
      .from("market_listing_rollups")
      .select("id,source,rollup_version,rollup_window,card_print_id")
      .eq("source", "ebay_active")
      .in("card_print_id", chunk));
    found.push(...(data ?? []));
  }
  const idCollisions = found.filter((row) => plannedIds.has(row.id));
  const keyCollisions = found.filter((row) => plannedKeys.has(`${row.source}:${row.rollup_version}:${row.rollup_window}:${row.card_print_id}`));
  return {
    checked: true,
    rollup_id_collision_count: idCollisions.length,
    rollup_key_collision_count: keyCollisions.length,
    rollup_id_collision_samples: idCollisions.slice(0, 10),
    rollup_key_collision_samples: keyCollisions.slice(0, 10),
  };
}

function validatePlan(plan, dbRows, collision, args) {
  const findings = [];
  if (!args.allowDynamicPlan && plan.package_fingerprint_sha256 !== EXPECTED_SOURCE_PLAN_FINGERPRINT) findings.push("source_plan_fingerprint_mismatch");
  if (plan.source_strict_title_audit_fingerprint_sha256 !== EXPECTED_SOURCE_STRICT_TITLE_AUDIT_FINGERPRINT) findings.push("source_strict_title_audit_fingerprint_mismatch");
  if (!args.allowDynamicPlan && dbRows.length !== EXPECTED_ROLLUP_COUNT) findings.push(`rollup_count_mismatch:${dbRows.length}`);
  if ((plan.findings ?? []).filter((finding) => finding !== "strict_title_filter_excluded_candidate_rows").length > 0) findings.push("source_plan_contains_unexpected_findings");
  if (dbRows.some((row) => row.needs_review !== true || row.publishable !== false || row.app_visible !== false || row.market_truth !== false)) {
    findings.push("rollup_visibility_boundary_violation");
  }
  if (dbRows.some((row) => row.rollup_payload?.strict_title_filtered !== true)) findings.push("strict_title_filtered_payload_missing");
  if (!args.readbackOnly && (collision?.rollup_id_collision_count ?? 0) > 0) findings.push("rollup_id_collisions_detected");
  if (!args.readbackOnly && (collision?.rollup_key_collision_count ?? 0) > 0) findings.push("rollup_key_collisions_detected");
  if (!args.apply && !args.readbackOnly) findings.push("apply_flag_missing");
  return findings;
}

function validateApprovedReport(approved, dbRows, collision, args) {
  const findings = [];
  const rowManifestHash = sha256(dbRows.map(stable).map((row) => JSON.stringify(row)).join("\n"));
  const rollupVersions = [...new Set(dbRows.map((row) => row.rollup_version))].sort();
  const packagePayload = {
    package_id: PACKAGE_ID,
    source_plan_fingerprint_sha256: approved.report.source_plan_fingerprint_sha256,
    source_strict_title_audit_fingerprint_sha256: approved.report.source_strict_title_audit_fingerprint_sha256,
    row_manifest_hash_sha256: rowManifestHash,
    proposed_table_row_counts: { market_listing_rollups: dbRows.length },
    rollup_versions: rollupVersions,
  };
  const packageFingerprint = sha256(packagePayload);

  if (approved.report.package_fingerprint_sha256 !== packageFingerprint) findings.push("approved_report_package_fingerprint_mismatch");
  if (approved.report.row_manifest_hash_sha256 !== rowManifestHash) findings.push("approved_report_row_manifest_hash_mismatch");
  if (approved.report.source_plan_fingerprint_sha256 !== EXPECTED_SOURCE_PLAN_FINGERPRINT) findings.push("source_plan_fingerprint_mismatch");
  if (approved.report.source_strict_title_audit_fingerprint_sha256 !== EXPECTED_SOURCE_STRICT_TITLE_AUDIT_FINGERPRINT) findings.push("source_strict_title_audit_fingerprint_mismatch");
  if (dbRows.length !== EXPECTED_ROLLUP_COUNT) findings.push(`rollup_count_mismatch:${dbRows.length}`);
  if (dbRows.some((row) => row.needs_review !== true || row.publishable !== false || row.app_visible !== false || row.market_truth !== false)) {
    findings.push("rollup_visibility_boundary_violation");
  }
  if (dbRows.some((row) => row.rollup_payload?.strict_title_filtered !== true)) findings.push("strict_title_filtered_payload_missing");
  if (!args.readbackOnly && (collision?.rollup_id_collision_count ?? 0) > 0) findings.push("rollup_id_collisions_detected");
  if (!args.readbackOnly && (collision?.rollup_key_collision_count ?? 0) > 0) findings.push("rollup_key_collisions_detected");
  if (!args.apply && !args.readbackOnly) findings.push("apply_flag_missing");
  return { findings, rowManifestHash, packageFingerprint, rollupVersions };
}

async function insertRows(supabase, rows) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    const { data } = await supabaseRequest(() => supabase
      .from("market_listing_rollups")
      .insert(chunk)
      .select("id"));
    inserted += data?.length ?? chunk.length;
  }
  return inserted;
}

async function readbackCount(supabase, rows) {
  let total = 0;
  const ids = rows.map((row) => row.id);
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { count } = await supabaseRequest(() => supabase
      .from("market_listing_rollups")
      .select("id", { count: "exact", head: true })
      .in("id", chunk));
    total += count ?? 0;
  }
  return total;
}

function approvalPrompt(report) {
  return `Approve real ${PACKAGE_ID} apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Row manifest hash: ${report.row_manifest_hash_sha256}. Source plan fingerprint: ${report.source_plan_fingerprint_sha256}. Source strict title audit fingerprint: ${report.source_strict_title_audit_fingerprint_sha256}. Scope: insert ${report.proposed_table_row_counts.market_listing_rollups} strict-filtered internal-only market_listing_rollups rows using rollup versions ${report.rollup_versions.join(" and ")} only. All rows must keep needs_review=true, publishable=false, app_visible=false, and market_truth=false. No provider calls. No source fetches. No market_listing_card_candidates writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-12B Strict Filtered Rollup Apply Readiness",
    "",
    `- Applied by this invocation: \`${report.applied}\``,
    `- Ready for apply approval: \`${report.ready_for_apply_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    "",
    "## Proposed Rows",
    "",
    "```json",
    JSON.stringify(report.proposed_table_row_counts, null, 2),
    "```",
    "",
    "## Collision Check",
    "",
    "```json",
    JSON.stringify(report.collision_summary, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Approval Prompt",
    "",
    "```text",
    report.approval_prompt_for_next_step,
    "```",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const versionsByEvidenceClass = rollupVersionMap(args);
  const approved = await readApprovedReport(args.approvedReportPath);
  const source = approved ?? await readPlan(args.planPath);
  const plan = approved ? null : source.plan;
  const planPath = approved ? source.path : source.path;
  const rollupsPath = approved ? source.rowPath : source.rollupsPath;
  const sourcePlanFingerprint = approved ? source.report.source_plan_fingerprint_sha256 : plan.package_fingerprint_sha256;
  const sourceStrictTitleAuditFingerprint = approved
    ? source.report.source_strict_title_audit_fingerprint_sha256
    : plan.source_strict_title_audit_fingerprint_sha256;
  const dbRows = approved
    ? source.rows
    : source.rollups.rows.map((row) => toDbRow(
      row,
      generatedAt,
      versionsByEvidenceClass,
      sourcePlanFingerprint,
      sourceStrictTitleAuditFingerprint,
    ));

  const rowManifestHash = sha256(dbRows.map(stable).map((row) => JSON.stringify(row)).join("\n"));
  const packagePayload = {
    package_id: PACKAGE_ID,
    source_plan_fingerprint_sha256: sourcePlanFingerprint,
    source_strict_title_audit_fingerprint_sha256: sourceStrictTitleAuditFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    proposed_table_row_counts: { market_listing_rollups: dbRows.length },
    rollup_versions: [...new Set(dbRows.map((row) => row.rollup_version))].sort(),
  };
  const packageFingerprint = sha256(packagePayload);

  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const rowPath = approved
    ? source.rowPath
    : path.join(REPO_ROOT, AUDIT_DIR, `mee_12b_market_listing_strict_filtered_rollup_apply_rows_${stamp}.jsonl`);
  if (!approved) writeFileSync(rowPath, `${dbRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const supabase = createBackendClient();
  const collisionSummary = await existingRollupCollisions(supabase, dbRows);
  const approvedValidation = approved ? validateApprovedReport(source, dbRows, collisionSummary, args) : null;
  const findings = approvedValidation?.findings ?? validatePlan(plan, dbRows, collisionSummary, args);
  const readyForApplyApproval = findings.length === 1 && findings[0] === "apply_flag_missing";
  let inserted = 0;
  let readback = { market_listing_rollups: 0 };

  if (args.apply) {
    if (findings.length) throw new Error(`[strict-filtered-rollup-apply] blocked by findings: ${findings.join(", ")}`);
    inserted = await insertRows(supabase, dbRows);
    readback = { market_listing_rollups: await readbackCount(supabase, dbRows) };
    if (readback.market_listing_rollups !== dbRows.length) findings.push("readback_count_mismatch");
  } else if (args.readbackOnly) {
    readback = { market_listing_rollups: await readbackCount(supabase, dbRows) };
  }

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: args.apply ? "strict_filtered_rollup_apply" : "strict_filtered_rollup_apply_readiness_no_writes",
    applied: args.apply,
    ready_for_apply_approval: readyForApplyApproval,
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    source_plan_fingerprint_sha256: packagePayload.source_plan_fingerprint_sha256,
    source_strict_title_audit_fingerprint_sha256: packagePayload.source_strict_title_audit_fingerprint_sha256,
    source_plan_path: rel(planPath),
    source_rollups_path: rel(rollupsPath),
    row_file_path: rel(rowPath),
    proposed_table_row_counts: {
      market_listing_rollups: dbRows.length,
    },
    rollup_versions: packagePayload.rollup_versions,
    collision_summary: collisionSummary,
    inserted_table_row_counts: {
      market_listing_rollups: inserted,
    },
    readback_table_row_counts: readback,
    boundary: {
      provider_calls: false,
      source_fetches: false,
      market_listing_card_candidates_writes: false,
      market_listing_rollups_writes: args.apply,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      card_prints_writes: false,
      card_printings_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      migrations: false,
    },
    findings,
  };
  report.approval_prompt_for_next_step = approvalPrompt(report);

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12b_market_listing_strict_filtered_rollup_apply_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12b_market_listing_strict_filtered_rollup_apply_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    applied: report.applied,
    ready_for_apply_approval: report.ready_for_apply_approval,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    row_manifest_hash_sha256: report.row_manifest_hash_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    collision_summary: report.collision_summary,
    findings: report.findings,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
      rowPath: rel(rowPath),
    },
    approval_prompt_for_next_step: report.approval_prompt_for_next_step,
  }, null, 2));

  if (args.apply && findings.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
