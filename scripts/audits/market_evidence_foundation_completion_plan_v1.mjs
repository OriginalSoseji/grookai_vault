import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-FOUNDATION-COMPLETION-PLAN-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const REPORT_JSON = path.join(ARTIFACT_DIR, "report.json");
const REPORT_MD = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
const PLAN_MD = path.join(PLAN_DIR, "MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1.md");
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, "MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1.md");
const READBACK_SQL_PATH = path.join(SQL_DIR, "mee_core_foundation_completion_plan_v1_readback.sql");

const SOURCE_REPORTS = {
  core_checkpoint: "docs/checkpoints/market_evidence_engine/MARKET_EVIDENCE_ENGINE_CORE_V1.md",
  classification_post_apply:
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-POST-APPLY-AUDIT-V1/report.json",
  high_signal_audit:
    "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-HIGH-SIGNAL-REVIEW-QUEUE-AUDIT-V1/report.json",
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
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-foundation-completion-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const output = execFileSync("supabase", ["db", "query", "--linked", "-f", tempSql], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 80,
    });
    return parseRows(output);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const readbackSql = `-- MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1 readback SQL.
-- Read-only foundation status. No provider calls, no writes, no public pricing.

with disposition_status as (
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
), public_boundary as (
  select
    count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from public.market_evidence_review_dispositions
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
  'MEE_CORE_FOUNDATION_COMPLETION_PLAN_V1'::text as package_id,
  (select jsonb_agg(to_jsonb(disposition_status) order by review_lane, review_status, review_disposition, needs_review) from disposition_status) as disposition_status,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary,
  (select to_jsonb(object_counts) from object_counts) as object_counts;
`;

const readback = supabaseReadOnlyQuery(readbackSql)[0];
const classificationPostApply = readJson(SOURCE_REPORTS.classification_post_apply);
const highSignalAudit = readJson(SOURCE_REPORTS.high_signal_audit);
const coreCheckpointText = read(SOURCE_REPORTS.core_checkpoint);
const sourceHashes = Object.fromEntries(
  Object.entries(SOURCE_REPORTS).map(([key, relativePath]) => [key, sha256Text(read(relativePath))]),
);

const completed = [
  {
    id: "core_lifecycle_contract",
    status: "complete",
    proof: "MARKET_EVIDENCE_ENGINE_CORE_V1 checkpoint defines provider-agnostic lifecycle and boundaries.",
  },
  {
    id: "lifecycle_tables_and_read_models",
    status: "complete",
    proof: `${readback.object_counts.lifecycle_observation_rows} lifecycle observations and ${readback.object_counts.lifecycle_event_rows} lifecycle events are present.`,
  },
  {
    id: "review_dispositions",
    status: "complete",
    proof: `${readback.object_counts.review_disposition_rows} internal review dispositions exist.`,
  },
  {
    id: "review_action_audit_trail",
    status: "complete",
    proof: `${readback.object_counts.review_action_event_rows} review action events exist and remain internal-only.`,
  },
  {
    id: "low_signal_internal_cleanup",
    status: "complete",
    proof: "Low-signal monitor lane is resolved/monitor_only from prior drain audit.",
  },
  {
    id: "classification_blocked_routing",
    status: "complete",
    proof: `${classificationPostApply.audit.updated_target_rows} classification rows routed to review_reclassify; ${classificationPostApply.audit.remaining_pending_classification_review_rows} pending classification rows remain.`,
  },
  {
    id: "high_signal_queue_audit",
    status: "complete",
    proof: `${highSignalAudit.audit.row_count} high-signal rows audited and separated by evidence lane.`,
  },
];

const blockers = [
  {
    id: "post_ingest_review_orchestrator",
    status: "blocking",
    required_next_package: "MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1",
    reason:
      "Without this, every ingest reopens manual lane-by-lane approvals. The orchestrator must produce one deterministic status/readback and one safe internal review-action plan.",
  },
  {
    id: "lane_policy_contract",
    status: "blocking",
    required_next_package: "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1",
    reason:
      "The policy for low-signal, classification-blocked, mixed raw/slab, reference-only, high-signal raw-single/slab, and candidate-review lanes must be explicit and reusable.",
  },
  {
    id: "batch_review_action_workflow",
    status: "blocking",
    required_next_package: "MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1",
    reason:
      "Internal review actions need one post-ingest apply package with preflight, readback, rollback, and public-boundary guards.",
  },
  {
    id: "publish_gate_contract",
    status: "blocking",
    required_next_package: "MEE-CORE-PUBLISH-GATE-CONTRACT-V1",
    reason:
      "No internal signal can become public until a separate publication gate defines freshness, confidence, source mix, evidence-lane, review-status, and replay requirements.",
  },
  {
    id: "runbook",
    status: "blocking",
    required_next_package: "MEE-CORE-DAILY-RUNBOOK-V1",
    reason:
      "The operator flow must be ingestion -> orchestrator -> safe internal review actions -> audit -> stop before publish unless separately approved.",
  },
];

const freeze = {
  acquisition_frozen_until_foundation_complete: true,
  public_pricing_frozen_until_publish_gate: true,
  app_visible_pricing_frozen_until_publish_gate: true,
  pricing_observations_writes_allowed: false,
  ebay_active_prices_latest_writes_allowed: false,
  identity_vault_image_writes_allowed: false,
};

const next_sequence = [
  "MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1 plan only",
  "MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1 plan only",
  "MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1 schema/plan only if needed",
  "MEE-CORE-PUBLISH-GATE-CONTRACT-V1 plan only",
  "MEE-CORE-DAILY-RUNBOOK-V1",
];

const findings = [];
if (!coreCheckpointText.includes("No provider can skip stages.")) findings.push("core_checkpoint_missing_no_skip_rule");
if (Number(readback.object_counts.pricing_observations_count) !== 0) findings.push("pricing_observations_present");
if (Number(readback.object_counts.public_pricing_view_market_evidence_references) !== 0) {
  findings.push("public_pricing_view_references_market_evidence");
}
for (const [key, value] of Object.entries(readback.public_boundary)) {
  if (Number(value) !== 0) findings.push(`public_boundary_${key}_present`);
}

const reportPayload = {
  completed,
  blockers,
  freeze,
  next_sequence,
  readback,
  source_hashes: sourceHashes,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_foundation_completion_freeze_and_next_sequence",
  package_fingerprint_sha256: sha256Json(reportPayload),
  foundation_status: "not_complete",
  completed,
  blockers,
  freeze,
  next_sequence,
  readback,
  source_hashes: sourceHashes,
  hashes: {
    readback_sql_sha256: sha256Text(readbackSql),
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
    "# MEE Core Foundation Completion Plan V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    `Foundation status: \`${value.foundation_status}\``,
    "",
    "## Decision",
    "",
    "Do not run more acquisition and do not build public pricing until the foundation blockers below are complete.",
    "",
    "## Completed",
    "",
    ...value.completed.map((item) => `- ${item.id}: ${item.proof}`),
    "",
    "## Blocking Foundation Completion",
    "",
    ...value.blockers.map((item) => `- ${item.id}: ${item.reason} Next package: \`${item.required_next_package}\``),
    "",
    "## Freeze",
    "",
    ...Object.entries(value.freeze).map(([key, val]) => `- ${key}: \`${val}\``),
    "",
    "## Next Sequence",
    "",
    ...value.next_sequence.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Current Queue Status",
    "",
    ...value.readback.disposition_status.map(
      (row) =>
        `- ${row.review_lane}/${row.review_status}/${row.review_disposition}, needs_review=${row.needs_review}: \`${row.rows}\``,
    ),
    "",
    "## Public Boundary",
    "",
    ...Object.entries(value.readback.public_boundary).map(([key, val]) => `- ${key}: \`${val}\``),
    "",
    "## Findings",
    "",
    value.findings.length === 0 ? "- None" : value.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
  ].join("\n");
}

const planMd = `# MEE Core Foundation Completion Plan V1

Status: plan only

## Why This Exists

The Market Evidence Engine foundation is not complete just because the tables exist. It is complete only when the post-ingest operator loop is deterministic, low-friction, auditable, and still blocked from public pricing.

## Foundation Completion Criteria

- A post-ingest review orchestrator exists.
- Review lane policies are explicit and deterministic.
- Batch review actions can be planned, applied, read back, and rolled back as one package.
- A publish gate contract exists and is separate from internal review.
- A daily runbook exists.

## Current Decision

Freeze acquisition and public pricing work until the completion blockers are handled.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CHECKPOINT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, renderMarkdown(report));
writeFileSync(PLAN_MD, planMd);
writeFileSync(CHECKPOINT_MD, renderMarkdown(report));
writeFileSync(READBACK_SQL_PATH, readbackSql);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      foundation_status: report.foundation_status,
      blockers: report.blockers.map((item) => item.id),
      next_sequence: report.next_sequence,
      findings: report.findings,
      hashes: report.hashes,
    },
    null,
    2,
  ),
);
