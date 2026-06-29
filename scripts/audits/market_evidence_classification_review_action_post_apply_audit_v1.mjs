import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-POST-APPLY-AUDIT-V1";
const SOURCE_PACKAGE_ID = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1";
const SOURCE_PACKAGE_FINGERPRINT = "18c7e2a590956b473f0989b19b5c9ebc9a88806fd5b0efb2bf8a8f71e0326f00";
const ROW_MANIFEST_HASH = "87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc";
const APPLY_SQL_HASH = "cba22496f117b140a32d26b1eac7442a0892497c31eea750053ea6893009f7f7";
const EXPECTED_TARGET_ROWS = 19;

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
  "mee_core_internal_classification_review_action_plan_v1_readback.sql",
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

function parseRows(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseFileQuery(filePath) {
  const output = execFileSync("supabase", ["db", "query", "--linked", "-f", filePath], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 80,
  });
  return parseRows(output);
}

function supabaseSqlQuery(sql) {
  const output = execFileSync("supabase", ["db", "query", "--linked", sql], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40,
  });
  return parseRows(output);
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
if (sourceReport.package_fingerprint_sha256 !== SOURCE_PACKAGE_FINGERPRINT) {
  findings.push("source_package_fingerprint_mismatch");
}
if (sourceReport.hashes?.apply_sql_sha256 !== APPLY_SQL_HASH) findings.push("source_apply_sql_hash_mismatch");
if (rowManifestHash !== ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");
if (manifestRows.length !== EXPECTED_TARGET_ROWS) findings.push("source_manifest_row_count_mismatch");
if (new Set(manifestRows.map((row) => row.disposition_id)).size !== EXPECTED_TARGET_ROWS) {
  findings.push("source_manifest_duplicate_disposition_ids");
}
if (Number(readback?.expected_target_rows) !== EXPECTED_TARGET_ROWS) findings.push("readback_expected_target_rows_mismatch");
if (Number(readback?.matching_action_event_rows) !== EXPECTED_TARGET_ROWS) {
  findings.push("matching_action_event_rows_mismatch");
}
if (Number(readback?.distinct_event_disposition_rows) !== EXPECTED_TARGET_ROWS) {
  findings.push("distinct_event_disposition_rows_mismatch");
}
if (Number(readback?.updated_target_rows) !== EXPECTED_TARGET_ROWS) findings.push("updated_target_rows_mismatch");
if (Number(readback?.remaining_pending_classification_review_rows) !== 0) {
  findings.push("remaining_pending_classification_review_rows_present");
}
if (Number(readback?.event_public_flag_rows) !== 0) findings.push("event_public_flags_present");
if (Number(readback?.target_public_flag_rows) !== 0) findings.push("target_public_flags_present");
if (Number(readback?.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(readback?.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_review_tables");

const classificationStatus = statusRows.filter((row) => row.review_lane === "classification_review");
const reportPayload = {
  source: {
    package_id: SOURCE_PACKAGE_ID,
    package_fingerprint_sha256: SOURCE_PACKAGE_FINGERPRINT,
    row_manifest_sha256: ROW_MANIFEST_HASH,
    apply_sql_sha256: APPLY_SQL_HASH,
  },
  readback,
  classification_status: classificationStatus,
  remaining_review_status: statusRows,
  target_disposition_count: manifestRows.length,
  target_gv_ids: manifestRows.map((row) => row.gv_id),
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "run_only_classification_review_action_post_apply_audit_read_only",
  package_fingerprint_sha256: sha256Json(reportPayload),
  source: reportPayload.source,
  audit: {
    expected_target_rows: readback.expected_target_rows,
    matching_action_event_rows: readback.matching_action_event_rows,
    distinct_event_disposition_rows: readback.distinct_event_disposition_rows,
    updated_target_rows: readback.updated_target_rows,
    remaining_pending_classification_review_rows: readback.remaining_pending_classification_review_rows,
    event_public_flag_rows: readback.event_public_flag_rows,
    target_public_flag_rows: readback.target_public_flag_rows,
    pricing_observations_count: readback.pricing_observations_count,
    public_pricing_view_references: readback.public_pricing_view_references,
    classification_status: classificationStatus,
    remaining_review_status: statusRows,
  },
  next_recommendation: {
    package_id: "MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1",
    reason:
      "Classification-blocked rows are now routed to reclassification. Audit high-signal review rows next because they are the next closest lane to future publication-gate handoff, while still remaining internal-only.",
    allowed_scope:
      "Read-only audit and plan only for high_signal_review rows; no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
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
    "# MEE Core Classification Review Action Post Apply Audit V1",
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
    `- Apply SQL hash: \`${value.source.apply_sql_sha256}\``,
    "",
    "## Readback",
    "",
    `- Expected target rows: \`${value.audit.expected_target_rows}\``,
    `- Matching action event rows: \`${value.audit.matching_action_event_rows}\``,
    `- Distinct event disposition rows: \`${value.audit.distinct_event_disposition_rows}\``,
    `- Updated target disposition rows: \`${value.audit.updated_target_rows}\``,
    `- Remaining pending classification-review rows: \`${value.audit.remaining_pending_classification_review_rows}\``,
    `- Event public flag rows: \`${value.audit.event_public_flag_rows}\``,
    `- Target public flag rows: \`${value.audit.target_public_flag_rows}\``,
    `- Pricing observation rows: \`${value.audit.pricing_observations_count}\``,
    `- Public pricing view references: \`${value.audit.public_pricing_view_references}\``,
    "",
    "## Classification Status",
    "",
    ...value.audit.classification_status.map(
      (row) =>
        `- ${row.review_status}/${row.review_disposition}, needs_review=${row.needs_review}: \`${row.rows}\``,
    ),
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
    "## Next Recommendation",
    "",
    `- Package: \`${value.next_recommendation.package_id}\``,
    `- Reason: ${value.next_recommendation.reason}`,
    `- Allowed scope: ${value.next_recommendation.allowed_scope}`,
    "",
  ].join("\n");
}

const planMd = `# MEE Core Classification Review Action Post Apply Audit V1

Status: complete

## Result

The approved classification-review action package inserted exactly ${readback.matching_action_event_rows} review action events and updated exactly ${readback.updated_target_rows} matching dispositions.

Remaining pending classification-review rows: ${readback.remaining_pending_classification_review_rows}.

## Boundary

No public pricing, pricing observations, app-visible pricing, identity, vault, image, provider, migration, merge, or global apply activity was performed by this audit.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(
  path.join(PLAN_DIR, "MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_POST_APPLY_AUDIT_V1.md"),
  planMd,
);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      audit: report.audit,
      findings: report.findings,
      next_recommendation: report.next_recommendation,
    },
    null,
    2,
  ),
);
