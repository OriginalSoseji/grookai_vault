import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const ROW_MANIFEST = path.join(ARTIFACT_DIR, "row_manifest.jsonl");
const REPORT_JSON = path.join(ARTIFACT_DIR, "report.json");
const REPORT_MD = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
const PLAN_MD = path.join(PLAN_DIR, "MEE_CORE_INTERNAL_HIGH_SIGNAL_REVIEW_QUEUE_AUDIT_V1.md");
const READBACK_SQL_PATH = path.join(SQL_DIR, "mee_core_internal_high_signal_review_queue_audit_v1_readback.sql");

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
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-high-signal-audit-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const output = execFileSync("supabase", ["db", "query", "--linked", "-f", tempSql], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 80,
    });
    return parseSupabaseRows(output);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const commonCte = `
with high_signal_rows as (
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
    s.model_eligible_count,
    s.publishable_count,
    s.app_visible_count,
    s.market_truth_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s on s.card_print_id = d.card_print_id
  left join public.card_prints cp on cp.id = d.card_print_id
  where d.review_lane = 'high_signal_review'
    and d.review_status = 'pending'
    and d.review_disposition = 'review_pending_high_signal'
)
`;

const readbackSql = `-- MEE_CORE_INTERNAL_HIGH_SIGNAL_REVIEW_QUEUE_AUDIT_V1 readback SQL.
-- Read-only audit for pending high_signal_review rows.

${commonCte}
select
  'MEE_CORE_INTERNAL_HIGH_SIGNAL_REVIEW_QUEUE_AUDIT_V1'::text as package_id,
  (select count(*)::int from high_signal_rows) as pending_high_signal_rows,
  (select count(*)::int from high_signal_rows where needs_review = true) as needs_review_rows,
  (select count(*)::int from high_signal_rows where internal_rollup_candidate = true) as internal_rollup_candidate_rows,
  (select count(*)::int from high_signal_rows where source_family_count >= 2) as source_family_ready_rows,
  (select count(*)::int from high_signal_rows where rollup_eligible_count >= 10) as rollup_threshold_ready_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'raw_single') as raw_single_lane_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'slab') as slab_lane_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'mixed_raw_slab') as mixed_raw_slab_lane_rows,
  (select count(*)::int from high_signal_rows where evidence_lane = 'reference_metric') as reference_metric_lane_rows,
  (select count(*)::int from high_signal_rows where active_listing_evidence_count > 0) as active_listing_involved_rows,
  (select count(*)::int from high_signal_rows where reference_evidence_count > 0) as reference_involved_rows,
  (select count(*)::int from high_signal_rows where active_listing_evidence_count = 0 and reference_evidence_count > 0) as reference_only_rows,
  (select count(*)::int from high_signal_rows where raw_single_count > 0 and slab_count > 0) as mixed_raw_slab_count_rows,
  (select count(*)::int from high_signal_rows where exclusion_flag_count > 0) as exclusion_flagged_rows,
  (select count(*)::int from high_signal_rows where quality_flag_count > 0) as quality_flagged_rows,
  (select count(*)::int from high_signal_rows where publishable or app_visible or market_truth or publication_gate_candidate or can_publish_price_directly) as public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
`;

const detailSql = `
${commonCte}
select *
from high_signal_rows
order by evidence_lane, gv_id;
`;

const laneSql = `
${commonCte}
select
  evidence_lane,
  count(*)::int as rows,
  sum(evidence_count)::int as evidence_count,
  sum(rollup_eligible_count)::int as rollup_eligible_count,
  sum(active_listing_evidence_count)::int as active_listing_evidence_count,
  sum(reference_evidence_count)::int as reference_evidence_count,
  sum(raw_single_count)::int as raw_single_count,
  sum(slab_count)::int as slab_count,
  sum(quality_flag_count)::int as quality_flag_count,
  sum(exclusion_flag_count)::int as exclusion_flag_count
from high_signal_rows
group by evidence_lane
order by rows desc, evidence_lane;
`;

const summary = supabaseReadOnlyQuery(readbackSql)[0];
const rows = supabaseReadOnlyQuery(detailSql);
const laneSummary = supabaseReadOnlyQuery(laneSql);

function recommendationFor(row) {
  const reasons = [];
  const evidenceLane = row.evidence_lane;
  if (Number(row.rollup_eligible_count) >= 10) reasons.push("rollup eligible threshold met");
  if (Number(row.source_family_count) >= 2) reasons.push("two or more source families");
  if (Number(row.active_listing_evidence_count) > 0) reasons.push("active listing evidence present");
  if (Number(row.reference_evidence_count) > 0) reasons.push("reference evidence present");
  if (Number(row.exclusion_flag_count) > 0) reasons.push("exclusion flags present");
  if (Number(row.quality_flag_count) > 0) reasons.push("quality flags present");

  if (evidenceLane === "mixed_raw_slab" || (Number(row.raw_single_count) > 0 && Number(row.slab_count) > 0)) {
    return {
      action: "plan_require_split",
      target_state: "blocked_until_raw_single_slab_split",
      allowed_next_write_action: "require_split",
      reasons,
      public_pricing_allowed: false,
    };
  }

  if (evidenceLane === "raw_single") {
    return {
      action: "plan_confirm_internal_raw_single_candidate",
      target_state: "resolved_internal_candidate_after_review",
      allowed_next_write_action: "confirm_internal_candidate",
      reasons,
      public_pricing_allowed: false,
    };
  }

  if (evidenceLane === "slab") {
    return {
      action: "plan_confirm_internal_slab_candidate",
      target_state: "resolved_internal_candidate_after_review",
      allowed_next_write_action: "confirm_internal_candidate",
      reasons,
      public_pricing_allowed: false,
    };
  }

  return {
    action: "plan_reference_crosscheck_or_hold",
    target_state: "blocked_until_market_evidence_or_reference_policy",
    allowed_next_write_action: "block_evidence_or_defer_more_evidence",
    reasons,
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
    publishable_count: row.publishable_count,
    app_visible_count: row.app_visible_count,
    market_truth_count: row.market_truth_count,
  },
  recommendation: recommendationFor(row),
}));

const rowManifestText = `${manifestRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
const rowManifestHash = sha256Text(rowManifestText);
const readbackSqlHash = sha256Text(readbackSql);

const recommendations = manifestRows.reduce((acc, row) => {
  acc[row.recommendation.action] = (acc[row.recommendation.action] ?? 0) + 1;
  return acc;
}, {});

const findings = [];
if (Number(summary.pending_high_signal_rows) !== rows.length) findings.push("summary_detail_row_count_mismatch");
if (Number(summary.needs_review_rows) !== Number(summary.pending_high_signal_rows)) findings.push("not_all_rows_need_review");
if (Number(summary.public_flag_rows) !== 0) findings.push("public_flags_present");
if (Number(summary.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(summary.public_pricing_view_references) !== 0) findings.push("public_pricing_view_references_review_tables");
if (manifestRows.some((row) => row.boundary.publishable || row.boundary.app_visible || row.boundary.market_truth)) {
  findings.push("manifest_public_boundary_leak");
}

const reportPayload = {
  summary,
  lane_summary: laneSummary,
  recommendations,
  row_manifest_sha256: rowManifestHash,
  row_count: manifestRows.length,
  target_gv_ids: manifestRows.map((row) => row.gv_id),
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "run_only_high_signal_review_queue_read_only_audit",
  package_fingerprint_sha256: sha256Json(reportPayload),
  audit: {
    summary,
    lane_summary: laneSummary,
    recommendations,
    row_count: manifestRows.length,
    sample_gv_ids: manifestRows.slice(0, 25).map((row) => row.gv_id),
  },
  next_recommendation: {
    package_id: "MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-ACTION-PLAN-V1",
    reason:
      "High-signal rows are internal candidates only. Split mixed raw/slab rows first, then plan separate confirm_internal_candidate packages for raw_single and slab lanes after review.",
    allowed_scope:
      "Plan only. No DB writes, no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
  },
  hashes: {
    row_manifest_sha256: rowManifestHash,
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
    "# MEE Core High Signal Review Queue Audit V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: run only, read-only audit",
    "",
    "## Summary",
    "",
    `- Pending high-signal rows: \`${value.audit.summary.pending_high_signal_rows}\``,
    `- Needs review rows: \`${value.audit.summary.needs_review_rows}\``,
    `- Internal rollup candidate rows: \`${value.audit.summary.internal_rollup_candidate_rows}\``,
    `- Raw single lane rows: \`${value.audit.summary.raw_single_lane_rows}\``,
    `- Slab lane rows: \`${value.audit.summary.slab_lane_rows}\``,
    `- Mixed raw/slab lane rows: \`${value.audit.summary.mixed_raw_slab_lane_rows}\``,
    `- Reference metric lane rows: \`${value.audit.summary.reference_metric_lane_rows}\``,
    `- Public flag rows: \`${value.audit.summary.public_flag_rows}\``,
    `- Pricing observation rows: \`${value.audit.summary.pricing_observations_count}\``,
    `- Public pricing view references: \`${value.audit.summary.public_pricing_view_references}\``,
    "",
    "## Lane Summary",
    "",
    ...value.audit.lane_summary.map(
      (row) =>
        `- ${row.evidence_lane}: \`${row.rows}\` rows, \`${row.rollup_eligible_count}\` rollup-eligible observations`,
    ),
    "",
    "## Recommendations",
    "",
    ...Object.entries(value.audit.recommendations).map(([key, count]) => `- ${key}: \`${count}\``),
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
  ].join("\n");
}

const planMd = `# MEE Core High Signal Review Queue Audit V1

Status: complete

## Purpose

Audit the current internal \`high_signal_review\` lane before any review actions are planned.

## Result

The audit found ${manifestRows.length} pending high-signal review rows. These remain internal-only and not public/app-visible.

## Next Step

Plan review actions by evidence lane:

- mixed raw/slab rows: \`require_split\`
- raw single rows: possible \`confirm_internal_candidate\`
- slab rows: possible \`confirm_internal_candidate\`
- reference metric rows: hold or defer until active-market policy is explicit
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
      hashes: report.hashes,
      findings: report.findings,
      next_recommendation: report.next_recommendation,
    },
    null,
    2,
  ),
);
