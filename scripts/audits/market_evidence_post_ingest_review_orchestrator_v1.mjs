import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const ROW_MANIFEST = path.join(ARTIFACT_DIR, "row_manifest.jsonl");
const ACTION_PLAN_JSONL = path.join(ARTIFACT_DIR, "action_plan_manifest.jsonl");
const REPORT_JSON = path.join(ARTIFACT_DIR, "report.json");
const REPORT_MD = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
const PLAN_MD = path.join(PLAN_DIR, "MEE_CORE_POST_INGEST_REVIEW_ORCHESTRATOR_V1.md");
const READBACK_SQL_PATH = path.join(SQL_DIR, "mee_core_post_ingest_review_orchestrator_v1_readback.sql");

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

function supabaseReadOnlyQuery(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-post-ingest-orchestrator-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const output = execFileSync("supabase", ["db", "query", "--linked", "-f", tempSql], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 100,
    });
    return parseRows(output);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const readbackSql = `-- MEE_CORE_POST_INGEST_REVIEW_ORCHESTRATOR_V1 readback SQL.
-- Read-only post-ingest review status. No provider calls, no writes, no public pricing.

with queue_rows as (
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
    d.review_actor,
    d.updated_at,
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    q.dashboard_queue,
    q.evidence_count,
    q.reference_evidence_count,
    q.active_listing_evidence_count,
    q.source_family_count,
    q.rollup_eligible_count,
    q.raw_single_count,
    q.slab_count,
    q.internal_rollup_candidate,
    q.publication_gate_handoff_candidate,
    s.quality_flag_count,
    s.exclusion_flag_count,
    s.model_eligible_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q
    on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s
    on s.card_print_id = d.card_print_id
  left join public.card_prints cp
    on cp.id = d.card_print_id
), current_status as (
  select
    review_lane,
    evidence_lane,
    review_status,
    review_disposition,
    needs_review,
    count(*)::int as rows
  from queue_rows
  group by 1,2,3,4,5
), public_boundary as (
  select
    count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from queue_rows
), object_counts as (
  select
    (select count(*)::int from public.market_evidence_observations) as lifecycle_observation_rows,
    (select count(*)::int from public.market_evidence_lifecycle_events) as lifecycle_event_rows,
    (select count(*)::int from public.market_evidence_review_dispositions) as review_disposition_rows,
    (select count(*)::int from public.market_evidence_review_action_events) as review_action_event_rows,
    (select count(*)::int from public.pricing_observations) as pricing_observations_count,
    (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence%') as public_pricing_view_market_evidence_references
)
select
  'MEE_CORE_POST_INGEST_REVIEW_ORCHESTRATOR_V1'::text as package_id,
  (select jsonb_agg(to_jsonb(current_status) order by review_lane, evidence_lane, review_status, review_disposition, needs_review) from current_status) as current_status,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  (select to_jsonb(object_counts) from object_counts) as object_counts;
`;

const detailSql = `
with queue_rows as (
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
    d.review_actor,
    d.updated_at,
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    q.dashboard_queue,
    q.evidence_count,
    q.reference_evidence_count,
    q.active_listing_evidence_count,
    q.source_family_count,
    q.rollup_eligible_count,
    q.raw_single_count,
    q.slab_count,
    q.internal_rollup_candidate,
    q.publication_gate_handoff_candidate,
    s.quality_flag_count,
    s.exclusion_flag_count,
    s.model_eligible_count
  from public.market_evidence_review_dispositions d
  left join public.v_market_evidence_review_dashboard_queue_v1 q
    on q.disposition_id = d.id
  left join public.v_market_evidence_card_signal_summary_v1 s
    on s.card_print_id = d.card_print_id
  left join public.card_prints cp
    on cp.id = d.card_print_id
)
select *
from queue_rows
order by review_lane, evidence_lane, review_status, review_disposition, gv_id;
`;

function plannedActionFor(row) {
  const common = {
    disposition_id: row.disposition_id,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    review_lane: row.review_lane,
    evidence_lane: row.evidence_lane,
    review_status: row.review_status,
    review_disposition: row.review_disposition,
    expected_updated_at: row.updated_at,
    public_pricing_allowed: false,
  };

  if (
    row.review_lane === "low_signal_monitor" &&
    row.needs_review === true &&
    ["pending", "in_review", "resolved"].includes(row.review_status)
  ) {
    return {
      ...common,
      bucket: "auto_safe_monitor_low_signal",
      action_name: "confirm_monitor_only",
      reason_code: null,
      review_actor: "system_post_ingest_review_orchestrator",
      plan_status: "safe_internal_action",
    };
  }

  if (
    row.review_lane === "classification_review" &&
    row.review_status === "pending" &&
    row.review_disposition === "review_pending_classification_fix" &&
    row.evidence_lane === "classification_blocked"
  ) {
    return {
      ...common,
      bucket: "auto_safe_request_reclassification",
      action_name: "request_reclassification",
      reason_code: "classification_noise",
      review_actor: "system_post_ingest_review_orchestrator",
      plan_status: "safe_internal_action",
    };
  }

  if (
    row.evidence_lane === "mixed_raw_slab" &&
    ["pending", "in_review"].includes(row.review_status) &&
    ["high_signal_review", "candidate_review"].includes(row.review_lane)
  ) {
    return {
      ...common,
      bucket: "auto_safe_require_raw_slab_split",
      action_name: "require_split",
      reason_code: "mixed_raw_slab_requires_split",
      review_actor: "system_post_ingest_review_orchestrator",
      plan_status: "safe_internal_action",
    };
  }

  if (
    row.review_lane === "reference_only_review" &&
    row.review_status === "pending" &&
    row.evidence_lane === "reference_metric"
  ) {
    return {
      ...common,
      bucket: "policy_hold_reference_only",
      action_name: "defer_active_market_evidence",
      reason_code: "reference_only_no_market_support",
      review_actor: "system_post_ingest_review_orchestrator",
      plan_status: "hold_until_lane_policy_contract",
    };
  }

  if (
    row.review_lane === "high_signal_review" &&
    row.review_status === "pending" &&
    row.evidence_lane === "reference_metric"
  ) {
    return {
      ...common,
      bucket: "policy_hold_reference_metric_high_signal",
      action_name: "defer_more_evidence",
      reason_code: "reference_only_no_market_support",
      review_actor: "system_post_ingest_review_orchestrator",
      plan_status: "hold_until_lane_policy_contract",
    };
  }

  if (
    ["high_signal_review", "candidate_review"].includes(row.review_lane) &&
    row.review_status === "pending" &&
    ["raw_single", "slab"].includes(row.evidence_lane)
  ) {
    const reason = row.evidence_lane === "raw_single"
      ? "approved_internal_raw_single_signal"
      : "approved_internal_slab_signal";
    return {
      ...common,
      bucket: "human_review_internal_candidate",
      action_name: "confirm_internal_candidate",
      reason_code: reason,
      review_actor: "system_post_ingest_review_orchestrator",
      plan_status: "hold_for_reviewer_or_lane_policy",
    };
  }

  if (row.review_status === "blocked" || row.review_status === "resolved") {
    return {
      ...common,
      bucket: "no_action_terminal_or_already_routed",
      action_name: null,
      reason_code: null,
      review_actor: null,
      plan_status: "no_action",
    };
  }

  return {
    ...common,
    bucket: "policy_hold_unclassified_candidate_review",
    action_name: "defer_more_evidence",
    reason_code: "manual_hold",
    review_actor: "system_post_ingest_review_orchestrator",
    plan_status: "hold_until_lane_policy_contract",
  };
}

const readback = supabaseReadOnlyQuery(readbackSql)[0];
const rows = supabaseReadOnlyQuery(detailSql);
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
    evidence_lane: row.evidence_lane,
    status: row.review_status,
    disposition: row.review_disposition,
    needs_review: row.needs_review,
    dashboard_queue: row.dashboard_queue,
  },
  evidence: {
    evidence_count: row.evidence_count,
    reference_evidence_count: row.reference_evidence_count,
    active_listing_evidence_count: row.active_listing_evidence_count,
    source_family_count: row.source_family_count,
    rollup_eligible_count: row.rollup_eligible_count,
    raw_single_count: row.raw_single_count,
    slab_count: row.slab_count,
    internal_rollup_candidate: row.internal_rollup_candidate,
    quality_flag_count: row.quality_flag_count,
    exclusion_flag_count: row.exclusion_flag_count,
    model_eligible_count: row.model_eligible_count,
  },
  boundary: {
    publication_gate_candidate: row.publication_gate_candidate,
    can_publish_price_directly: row.can_publish_price_directly,
    publishable: row.publishable,
    app_visible: row.app_visible,
    market_truth: row.market_truth,
    publication_gate_handoff_candidate: row.publication_gate_handoff_candidate,
  },
  plan: plannedActionFor(row),
}));

const actionPlanRows = manifestRows.filter((row) => row.plan.action_name !== null);
const actionPlanText = `${actionPlanRows.map((row) => JSON.stringify(row.plan)).join("\n")}\n`;
const rowManifestText = `${manifestRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
const rowManifestHash = sha256Text(rowManifestText);
const actionPlanHash = sha256Text(actionPlanText);
const readbackSqlHash = sha256Text(readbackSql);

function countBy(rowsToCount, keyFn) {
  return rowsToCount.reduce((acc, row) => {
    const key = keyFn(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

const bucketCounts = countBy(manifestRows, (row) => row.plan.bucket);
const planStatusCounts = countBy(manifestRows, (row) => row.plan.plan_status);
const actionCounts = countBy(actionPlanRows, (row) => row.plan.action_name);

const safeInternalActionRows = actionPlanRows.filter((row) => row.plan.plan_status === "safe_internal_action");
const heldRows = actionPlanRows.filter((row) => row.plan.plan_status !== "safe_internal_action");

const findings = [];
if (Number(readback.object_counts.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(readback.object_counts.public_pricing_view_market_evidence_references) !== 0) {
  findings.push("public_pricing_view_references_market_evidence");
}
for (const [key, value] of Object.entries(readback.public_boundary)) {
  if (Number(value) !== 0) findings.push(`public_boundary_${key}_present`);
}
if (manifestRows.some((row) => row.boundary.publishable || row.boundary.app_visible || row.boundary.market_truth)) {
  findings.push("manifest_public_boundary_leak");
}
if (safeInternalActionRows.some((row) => row.plan.action_name === "confirm_internal_candidate")) {
  findings.push("confirm_internal_candidate_marked_auto_safe");
}

const reportPayload = {
  current_status: readback.current_status,
  object_counts: readback.object_counts,
  public_boundary: readback.public_boundary,
  bucket_counts: bucketCounts,
  plan_status_counts: planStatusCounts,
  action_counts: actionCounts,
  row_manifest_sha256: rowManifestHash,
  action_plan_sha256: actionPlanHash,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_post_ingest_review_orchestrator",
  package_fingerprint_sha256: sha256Json(reportPayload),
  orchestrator_status: "plan_only_ready",
  current_status: readback.current_status,
  object_counts: readback.object_counts,
  public_boundary: readback.public_boundary,
  action_plan: {
    row_count: actionPlanRows.length,
    safe_internal_action_count: safeInternalActionRows.length,
    held_action_count: heldRows.length,
    bucket_counts: bucketCounts,
    plan_status_counts: planStatusCounts,
    action_counts: actionCounts,
    safe_internal_action_scope:
      "Only monitor low-signal, request reclassification, and require raw/slab split are auto-safe internal review actions.",
    held_scope:
      "Reference metric, raw_single/slab confirmation, and candidate-review actions require lane policy or reviewer approval.",
  },
  next_recommendation: {
    package_id: "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1",
    reason:
      "The orchestrator can now classify post-ingest review rows, but lane policy must be explicit before it can generate one approved apply package for recurring use.",
    allowed_scope:
      "Plan only. No acquisition, no provider calls, no DB writes, no public pricing, no pricing_observations, no identity/vault/image writes.",
  },
  hashes: {
    row_manifest_sha256: rowManifestHash,
    action_plan_manifest_sha256: actionPlanHash,
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
    "# MEE Core Post-Ingest Review Orchestrator V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only",
    "",
    "## Purpose",
    "",
    "Replace manual lane-by-lane post-ingest cleanup with one deterministic internal review status and action grouping.",
    "",
    "## Action Plan",
    "",
    `- Action plan rows: \`${value.action_plan.row_count}\``,
    `- Safe internal action rows: \`${value.action_plan.safe_internal_action_count}\``,
    `- Held action rows: \`${value.action_plan.held_action_count}\``,
    "",
    "## Buckets",
    "",
    ...Object.entries(value.action_plan.bucket_counts).map(([key, count]) => `- ${key}: \`${count}\``),
    "",
    "## Actions",
    "",
    ...Object.entries(value.action_plan.action_counts).map(([key, count]) => `- ${key}: \`${count}\``),
    "",
    "## Current Status",
    "",
    ...value.current_status.map(
      (row) =>
        `- ${row.review_lane}/${row.evidence_lane}/${row.review_status}/${row.review_disposition}, needs_review=${row.needs_review}: \`${row.rows}\``,
    ),
    "",
    "## Boundary",
    "",
    ...Object.entries(value.public_boundary).map(([key, count]) => `- ${key}: \`${count}\``),
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
  ].join("\n");
}

const planMd = `# MEE Core Post-Ingest Review Orchestrator V1

Status: plan only

## Why This Exists

This package converts the current MEE review lanes into one deterministic post-ingest status and action grouping. It does not ingest, does not call providers, does not invoke review actions, and does not publish prices.

## Safe Internal Actions

The orchestrator may classify these as safe internal actions for a future batch apply package:

- low-signal monitor -> \`confirm_monitor_only\`
- classification blocked -> \`request_reclassification\`
- mixed raw/slab -> \`require_split\`

## Held Actions

These remain held until the lane policy contract is explicit:

- reference metric rows
- raw-single/slab internal candidate confirmation
- candidate review rows
- any unknown/manual hold bucket
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(ROW_MANIFEST, rowManifestText);
writeFileSync(ACTION_PLAN_JSONL, actionPlanText);
writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, renderMarkdown(report));
writeFileSync(PLAN_MD, planMd);
writeFileSync(READBACK_SQL_PATH, readbackSql);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      orchestrator_status: report.orchestrator_status,
      action_plan: report.action_plan,
      hashes: report.hashes,
      findings: report.findings,
      next_recommendation: report.next_recommendation,
    },
    null,
    2,
  ),
);
