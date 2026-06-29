import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const ROW_MANIFEST = path.join(ARTIFACT_DIR, "row_manifest.jsonl");
const REPORT_JSON = path.join(ARTIFACT_DIR, "report.json");
const REPORT_MD = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
const PLAN_MD = path.join(PLAN_DIR, "MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1.md");
const READBACK_SQL_PATH = path.join(SQL_DIR, "mee_core_internal_classification_review_queue_audit_v1_readback.sql");

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

function parseSupabaseRows(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

function supabaseReadOnlyQuery(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-classification-audit-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const output = execFileSync("supabase", ["db", "query", "--linked", "-f", tempSql], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 40,
    });
    return parseSupabaseRows(output);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const readbackSql = `-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1 readback SQL.
-- Read-only audit for pending classification_review rows.

with classification_rows as (
  select
    d.id as disposition_id,
    d.card_print_id,
    d.gv_id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.rarity,
    cp.variant_key,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.needs_review,
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    d.evidence_summary,
    d.blocker_summary,
    d.source_mix,
    q.dashboard_queue,
    q.evidence_count,
    q.active_listing_evidence_count,
    q.reference_evidence_count,
    q.source_family_count,
    q.rollup_eligible_count,
    q.raw_single_count,
    q.slab_count,
    q.internal_rollup_candidate,
    s.quality_flag_count,
    s.exclusion_flag_count,
    s.model_eligible_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s on s.card_print_id = d.card_print_id
  left join public.card_prints cp on cp.id = d.card_print_id
  where d.review_lane = 'classification_review'
    and d.review_status = 'pending'
    and d.review_disposition = 'review_pending_classification_fix'
)
select
  'MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1'::text as package_id,
  (select count(*)::int from classification_rows) as pending_classification_rows,
  (select count(*)::int from classification_rows where needs_review = true) as needs_review_rows,
  (select count(*)::int from classification_rows where evidence_lane = 'classification_blocked') as classification_blocked_rows,
  (select count(*)::int from classification_rows where active_listing_evidence_count > 0 and reference_evidence_count = 0) as active_only_rows,
  (select count(*)::int from classification_rows where rollup_eligible_count = 0) as no_rollup_eligible_rows,
  (select count(*)::int from classification_rows where raw_single_count = 0 and slab_count = 0) as no_raw_or_slab_classification_rows,
  (select count(*)::int from classification_rows where exclusion_flag_count > 0) as exclusion_flagged_rows,
  (select count(*)::int from classification_rows where publishable or app_visible or market_truth or publication_gate_candidate or can_publish_price_directly) as public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
`;

const detailSql = `
with classification_rows as (
  select
    d.id as disposition_id,
    d.card_print_id,
    d.gv_id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.rarity,
    cp.variant_key,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.needs_review,
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    d.evidence_summary,
    d.blocker_summary,
    d.source_mix,
    q.dashboard_queue,
    q.evidence_count,
    q.active_listing_evidence_count,
    q.reference_evidence_count,
    q.source_family_count,
    q.rollup_eligible_count,
    q.raw_single_count,
    q.slab_count,
    q.internal_rollup_candidate,
    s.quality_flag_count,
    s.exclusion_flag_count,
    s.model_eligible_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s on s.card_print_id = d.card_print_id
  left join public.card_prints cp on cp.id = d.card_print_id
  where d.review_lane = 'classification_review'
    and d.review_status = 'pending'
    and d.review_disposition = 'review_pending_classification_fix'
)
select *
from classification_rows
order by gv_id;
`;

const summary = supabaseReadOnlyQuery(readbackSql)[0];
const rows = supabaseReadOnlyQuery(detailSql);

function recommendationFor(row) {
  const reasons = [];
  if (row.evidence_lane === "classification_blocked") reasons.push("classification_blocked evidence lane");
  if (Number(row.rollup_eligible_count) === 0) reasons.push("no rollup-eligible evidence");
  if (Number(row.raw_single_count) === 0 && Number(row.slab_count) === 0) {
    reasons.push("no raw_single/slab classification");
  }
  if (Number(row.exclusion_flag_count) > 0) reasons.push("exclusion flags present");

  const action = Number(row.exclusion_flag_count) > 0
    ? "inspect_exclusion_and_classification_rules"
    : "inspect_classification_rules";

  return {
    action,
    target_state: "blocked_until_classification_fixed",
    reasons,
    allowed_next_write_package: "future_explicit_review_action_apply_only",
    public_pricing_allowed: false,
  };
}

const manifestRows = rows.map((row, index) => ({
  package_id: PACKAGE_ID,
  row_index: index + 1,
  disposition_id: row.disposition_id,
  card_print_id: row.card_print_id,
  gv_id: row.gv_id,
  card: {
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    rarity: row.rarity,
    variant_key: row.variant_key,
  },
  review: {
    lane: row.review_lane,
    status: row.review_status,
    disposition: row.review_disposition,
    needs_review: row.needs_review,
    evidence_lane: row.evidence_lane,
    dashboard_queue: row.dashboard_queue,
  },
  evidence: {
    evidence_count: row.evidence_count,
    active_listing_evidence_count: row.active_listing_evidence_count,
    reference_evidence_count: row.reference_evidence_count,
    source_family_count: row.source_family_count,
    rollup_eligible_count: row.rollup_eligible_count,
    raw_single_count: row.raw_single_count,
    slab_count: row.slab_count,
    quality_flag_count: row.quality_flag_count,
    exclusion_flag_count: row.exclusion_flag_count,
    model_eligible_count: row.model_eligible_count,
    internal_rollup_candidate: row.internal_rollup_candidate,
  },
  boundary: {
    publishable: row.publishable,
    app_visible: row.app_visible,
    market_truth: row.market_truth,
    publication_gate_candidate: row.publication_gate_candidate,
    can_publish_price_directly: row.can_publish_price_directly,
  },
  recommendation: recommendationFor(row),
}));

const rowManifestText = `${manifestRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
const rowManifestHash = sha256Text(rowManifestText);
const readbackSqlHash = sha256Text(readbackSql);

const findings = [];
if (Number(summary.pending_classification_rows) !== 19) findings.push("pending_classification_row_count_changed");
if (Number(summary.needs_review_rows) !== Number(summary.pending_classification_rows)) findings.push("not_all_rows_need_review");
if (Number(summary.classification_blocked_rows) !== Number(summary.pending_classification_rows)) {
  findings.push("not_all_rows_classification_blocked");
}
if (Number(summary.public_flag_rows) !== 0) findings.push("public_flags_present");
if (Number(summary.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(summary.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_review_tables");
if (manifestRows.some((row) => row.boundary.publishable || row.boundary.app_visible || row.boundary.market_truth)) {
  findings.push("manifest_public_boundary_leak");
}

const reportPayload = {
  summary,
  row_manifest_sha256: rowManifestHash,
  row_count: manifestRows.length,
  queue_breakdown: {
    active_only_rows: summary.active_only_rows,
    no_rollup_eligible_rows: summary.no_rollup_eligible_rows,
    no_raw_or_slab_classification_rows: summary.no_raw_or_slab_classification_rows,
    exclusion_flagged_rows: summary.exclusion_flagged_rows,
  },
  recommendations: {
    inspect_classification_rules: manifestRows.filter((row) => row.recommendation.action === "inspect_classification_rules").length,
    inspect_exclusion_and_classification_rules: manifestRows.filter(
      (row) => row.recommendation.action === "inspect_exclusion_and_classification_rules",
    ).length,
  },
  gv_ids: manifestRows.map((row) => row.gv_id),
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "run_only_classification_review_queue_read_only_audit",
  package_fingerprint_sha256: sha256Json(reportPayload),
  audit: reportPayload,
  artifacts: {
    row_manifest: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1/row_manifest.jsonl",
    report_json: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1/report.json",
    report_md: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1.md",
    readback_sql: "docs/sql/mee_core_internal_classification_review_queue_audit_v1_readback.sql",
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_QUEUE_AUDIT_V1.md",
  },
  hashes: {
    row_manifest_sha256: rowManifestHash,
    readback_sql_sha256: readbackSqlHash,
  },
  next_recommendation: {
    package_id: "MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1",
    reason:
      "Every classification_review row is blocked before rollup eligibility because the evidence has not been safely classified as raw_single or slab. Decide whether to fix classification rules or mark specific rows blocked.",
    allowed_scope:
      "Plan only. No DB writes, no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
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
    "# MEE Core Internal Classification Review Queue Audit V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: run only, read-only audit",
    "",
    "## Summary",
    "",
    `- Pending classification rows: \`${value.audit.summary.pending_classification_rows}\``,
    `- Classification-blocked rows: \`${value.audit.summary.classification_blocked_rows}\``,
    `- Active-only rows: \`${value.audit.queue_breakdown.active_only_rows}\``,
    `- No rollup eligible rows: \`${value.audit.queue_breakdown.no_rollup_eligible_rows}\``,
    `- No raw/slab classification rows: \`${value.audit.queue_breakdown.no_raw_or_slab_classification_rows}\``,
    `- Exclusion-flagged rows: \`${value.audit.queue_breakdown.exclusion_flagged_rows}\``,
    `- Public flag rows: \`${value.audit.summary.public_flag_rows}\``,
    "",
    "## Recommendations",
    "",
    `- Inspect classification rules: \`${value.audit.recommendations.inspect_classification_rules}\` rows`,
    `- Inspect exclusion and classification rules: \`${value.audit.recommendations.inspect_exclusion_and_classification_rules}\` rows`,
    "",
    "## Blocked GV IDs",
    "",
    ...value.audit.gv_ids.map((gvId) => `- \`${gvId}\``),
    "",
    "## Next",
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

const planMd = `# MEE Core Internal Classification Review Queue Audit V1

Status: completed

## Purpose

Read-only audit of pending \`classification_review\` rows after low-signal monitor cleanup.

## Result

The queue is structurally blocked: rows have active-listing evidence but no safe raw/single or slab classification and no rollup eligibility. These rows must not move toward public pricing until classification is corrected or explicitly blocked.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(ROW_MANIFEST, rowManifestText);
writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, renderMarkdown(report));
writeFileSync(READBACK_SQL_PATH, readbackSql);
writeFileSync(PLAN_MD, planMd);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      audit: report.audit,
      next_recommendation: report.next_recommendation,
      hashes: report.hashes,
      findings: report.findings,
    },
    null,
    2,
  ),
);
