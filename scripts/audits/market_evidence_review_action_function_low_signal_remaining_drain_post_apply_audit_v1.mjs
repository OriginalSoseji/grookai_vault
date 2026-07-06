import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-POST-APPLY-AUDIT-V1";
const SOURCE_PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1";
const SOURCE_PACKAGE_FINGERPRINT = "b21c27179f29d96b26fcad410753a1b9555c23ae236d7e5616f3172c29b3f031";
const ROW_MANIFEST_HASH = "c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050";
const EXPECTED_TARGET_ROWS = 219;

const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SOURCE_ARTIFACT_DIR = path.join(AUDIT_DIR, SOURCE_PACKAGE_ID);
const SOURCE_REPORT = path.join(SOURCE_ARTIFACT_DIR, "report.json");
const SOURCE_ROW_MANIFEST = path.join(SOURCE_ARTIFACT_DIR, "row_manifest.jsonl");
const READBACK_SQL_PATH = path.join(
  REPO_ROOT,
  "docs",
  "sql",
  "mee_core_internal_review_action_function_low_signal_remaining_drain_v1_readback.sql",
);

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

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256Text(JSON.stringify(stable(value)));
}

function supabaseFileQuery(filePath) {
  const output = execFileSync("supabase", ["db", "query", "--linked", "-f", filePath], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 80,
  });
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseSqlQuery(sql) {
  const output = execFileSync("supabase", ["db", "query", "--linked", sql], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

const sourceReport = JSON.parse(readFileSync(SOURCE_REPORT, "utf8"));
const rowManifestText = readFileSync(SOURCE_ROW_MANIFEST, "utf8");
const readbackSql = readFileSync(READBACK_SQL_PATH, "utf8");
const manifestRows = rowManifestText.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const rowManifestHash = sha256Text(rowManifestText);
const readbackSqlHash = sha256Text(readbackSql);
const readback = supabaseFileQuery(READBACK_SQL_PATH)[0];
const statusRows = supabaseSqlQuery(`
select
  review_lane,
  review_status,
  review_disposition,
  needs_review,
  publishable,
  app_visible,
  market_truth,
  count(*)::int as rows
from public.market_evidence_review_dispositions
group by 1,2,3,4,5,6,7
order by 1,2,3,4;
`);

const findings = [];
if (sourceReport.package_id !== SOURCE_PACKAGE_ID) findings.push("source_package_id_mismatch");
if (sourceReport.package_fingerprint_sha256 !== SOURCE_PACKAGE_FINGERPRINT) findings.push("source_package_fingerprint_mismatch");
if (rowManifestHash !== ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");
if (manifestRows.length !== EXPECTED_TARGET_ROWS) findings.push("source_manifest_row_count_mismatch");
if (new Set(manifestRows.map((row) => row.before.id)).size !== EXPECTED_TARGET_ROWS) {
  findings.push("source_manifest_duplicate_disposition_ids");
}
if (Number(readback?.expected_target_rows) !== EXPECTED_TARGET_ROWS) findings.push("readback_expected_target_rows_mismatch");
if (Number(readback?.matching_action_event_rows) !== EXPECTED_TARGET_ROWS) findings.push("matching_action_event_rows_mismatch");
if (Number(readback?.distinct_event_disposition_rows) !== EXPECTED_TARGET_ROWS) {
  findings.push("distinct_event_disposition_rows_mismatch");
}
if (Number(readback?.updated_target_rows) !== EXPECTED_TARGET_ROWS) findings.push("updated_target_rows_mismatch");
if (Number(readback?.remaining_eligible_low_signal_rows) !== 0) findings.push("remaining_eligible_low_signal_rows_present");
if (Number(readback?.event_public_flag_rows) !== 0) findings.push("event_public_flags_present");
if (Number(readback?.target_public_flag_rows) !== 0) findings.push("target_public_flags_present");
if (Number(readback?.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(readback?.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_review_tables");

const lowSignalStatus = statusRows.filter((row) => row.review_lane === "low_signal_monitor");
const reportPayload = {
  source: {
    package_id: SOURCE_PACKAGE_ID,
    package_fingerprint_sha256: SOURCE_PACKAGE_FINGERPRINT,
    row_manifest_sha256: ROW_MANIFEST_HASH,
  },
  readback,
  low_signal_status: lowSignalStatus,
  remaining_review_status: statusRows,
  target_disposition_count: manifestRows.length,
  target_gv_ids: manifestRows.map((row) => row.before.gv_id),
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "run_only_low_signal_remaining_drain_post_apply_audit_read_only",
  package_fingerprint_sha256: sha256Json(reportPayload),
  source: reportPayload.source,
  audit: {
    expected_target_rows: readback.expected_target_rows,
    matching_action_event_rows: readback.matching_action_event_rows,
    distinct_event_disposition_rows: readback.distinct_event_disposition_rows,
    updated_target_rows: readback.updated_target_rows,
    remaining_eligible_low_signal_rows: readback.remaining_eligible_low_signal_rows,
    event_public_flag_rows: readback.event_public_flag_rows,
    target_public_flag_rows: readback.target_public_flag_rows,
    pricing_observations_count: readback.pricing_observations_count,
    public_pricing_view_references: readback.public_pricing_view_references,
    low_signal_status: lowSignalStatus,
    remaining_review_status: statusRows,
  },
  next_recommendation: {
    package_id: "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1",
    reason:
      "Low-signal monitor rows are fully resolved. Audit classification_review next because classification defects should be blocked or corrected before high-signal or publication-gate work.",
    allowed_scope:
      "Read-only audit and plan only for classification_review rows; no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  },
  hashes: {
    source_row_manifest_sha256: rowManifestHash,
    readback_sql_sha256: readbackSqlHash,
  },
  findings,
  boundary_proof: {
    db_writes: false,
    function_invocation: false,
    action_event_inserts: false,
    disposition_updates: false,
    provider_calls: false,
    source_fetches: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
};

function renderMarkdown(value) {
  return [
    "# MEE Core Low Signal Remaining Drain Post Apply Audit V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: run only, read-only audit",
    "",
    "## Source",
    "",
    `- Source package: \`${value.source.package_id}\``,
    `- Source package fingerprint: \`${value.source.package_fingerprint_sha256}\``,
    `- Source row manifest hash: \`${value.source.row_manifest_sha256}\``,
    "",
    "## Readback",
    "",
    `- Expected target rows: \`${value.audit.expected_target_rows}\``,
    `- Matching action event rows: \`${value.audit.matching_action_event_rows}\``,
    `- Distinct event disposition rows: \`${value.audit.distinct_event_disposition_rows}\``,
    `- Updated target disposition rows: \`${value.audit.updated_target_rows}\``,
    `- Remaining eligible low-signal rows: \`${value.audit.remaining_eligible_low_signal_rows}\``,
    `- Event public flag rows: \`${value.audit.event_public_flag_rows}\``,
    `- Target public flag rows: \`${value.audit.target_public_flag_rows}\``,
    `- Pricing observation rows: \`${value.audit.pricing_observations_count}\``,
    `- Public pricing view references: \`${value.audit.public_pricing_view_references}\``,
    "",
    "## Low Signal Status",
    "",
    ...value.audit.low_signal_status.map(
      (row) =>
        `- ${row.review_status}/${row.review_disposition}, needs_review=${row.needs_review}: \`${row.rows}\``,
    ),
    "",
    "## Next Recommendation",
    "",
    `- Package: \`${value.next_recommendation.package_id}\``,
    `- Reason: ${value.next_recommendation.reason}`,
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
  ].join("\n");
}

const planMd = `# MEE Core Low Signal Remaining Drain Post Apply Audit V1

Status: completed

## Purpose

Audit the full remaining-drain apply for \`low_signal_monitor\` rows after invoking \`confirm_monitor_only\` for all 219 eligible rows.

## Result

The drain is clean when the report has no findings, 219 matching package events, 219 updated target dispositions, zero remaining eligible low-signal rows, and zero public/pricing boundary rows.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_REMAINING_DRAIN_POST_APPLY_AUDIT_V1.md"), planMd);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      source: report.source,
      audit: report.audit,
      next_recommendation: report.next_recommendation,
      hashes: report.hashes,
      findings: report.findings,
    },
    null,
    2,
  ),
);
