import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CHECKPOINT_DIR = path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine");
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

const ORCHESTRATOR_REPORT = "docs/audits/market_evidence_engine_v1/MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1/report.json";
const ORCHESTRATOR_ACTION_PLAN =
  "docs/audits/market_evidence_engine_v1/MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1/action_plan_manifest.jsonl";
const LANE_POLICY_REPORT = "docs/audits/market_evidence_engine_v1/MEE-CORE-REVIEW-LANE-POLICY-CONTRACT-V1/report.json";

const BATCH_PACKAGE_ID = "MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1";
const PUBLISH_PACKAGE_ID = "MEE-CORE-PUBLISH-GATE-CONTRACT-V1";
const RUNBOOK_PACKAGE_ID = "MEE-CORE-DAILY-RUNBOOK-V1";
const FINAL_PACKAGE_ID = "MEE-CORE-FOUNDATION-COMPLETE-V1";

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

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function readJsonl(relativePath) {
  return read(relativePath).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function ensureDirs() {
  for (const dir of [AUDIT_DIR, PLAN_DIR, CHECKPOINT_DIR, CONTRACT_DIR, SQL_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}

function writePackageArtifacts(packageId, report, markdown, planMarkdown, extra = {}) {
  const artifactDir = path.join(AUDIT_DIR, packageId);
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(path.join(artifactDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(AUDIT_DIR, `${packageId}.md`), markdown);
  if (planMarkdown) {
    writeFileSync(path.join(PLAN_DIR, `${packageId.replaceAll("-", "_")}.md`), planMarkdown);
  }
  if (extra.checkpointMarkdown) {
    writeFileSync(path.join(CHECKPOINT_DIR, `${packageId.replaceAll("-", "_")}.md`), extra.checkpointMarkdown);
  }
  if (extra.contractMarkdown) {
    writeFileSync(path.join(CONTRACT_DIR, `${packageId.replaceAll("-", "_")}.md`), extra.contractMarkdown);
  }
}

function makeBatchWorkflow(orchestrator, lanePolicy, actionRows) {
  const safeRows = actionRows.filter((row) => row.plan_status === "safe_internal_action");
  const applyRows = safeRows.map((row, index) => ({
    package_id: BATCH_PACKAGE_ID,
    row_index: index + 1,
    ...row,
  }));
  const manifestText = `${applyRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const manifestHash = sha256Text(manifestText);
  const valuesSql = applyRows
    .map((row) => `(${sqlLiteral(row.disposition_id)}::uuid, ${sqlLiteral(row.expected_updated_at)}::timestamptz)`)
    .join(",\n    ");
  const applyPayload = (row) =>
    JSON.stringify({
      package_id: BATCH_PACKAGE_ID,
      source_package_id: orchestrator.package_id,
      source_package_fingerprint: orchestrator.package_fingerprint_sha256,
      lane_policy_package_id: lanePolicy.package_id,
      lane_policy_fingerprint: lanePolicy.package_fingerprint_sha256,
      row_manifest_sha256: manifestHash,
      row_index: row.row_index,
      bucket: row.bucket,
      no_public_price_claim: true,
    });

  const applySql = `-- MEE_CORE_BATCH_REVIEW_ACTION_WORKFLOW_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: one batch of orchestrator safe internal review actions only.

begin;

${applyRows
  .map(
    (row) => `select *
from public.apply_market_evidence_review_action_v1(
  ${sqlLiteral(row.disposition_id)}::uuid,
  ${sqlLiteral(row.expected_updated_at)}::timestamptz,
  ${sqlLiteral(row.action_name)}::text,
  'system_batch_review_action_workflow'::text,
  ${sqlLiteral(row.reason_code)}::text,
  'MEE core batch workflow: safe internal post-ingest action from lane policy contract.'::text,
  ${sqlLiteral(applyPayload(row))}::jsonb
);`,
  )
  .join("\n\n")}

commit;
`;

  const preflightSql = `-- MEE_CORE_BATCH_REVIEW_ACTION_WORKFLOW_V1 preflight.
-- Must return eligible_target_rows = expected_target_rows before apply.

with targets(id, expected_updated_at) as (
  values
    ${valuesSql}
)
select
  'MEE_CORE_BATCH_REVIEW_ACTION_WORKFLOW_V1_PREFLIGHT'::text as package_id,
  ${applyRows.length}::int as expected_target_rows,
  count(*)::int as eligible_target_rows
from targets
join public.market_evidence_review_dispositions d
  on d.id = targets.id
 and d.updated_at is not distinct from targets.expected_updated_at
where d.review_status in ('pending', 'in_review')
  and d.evidence_lane = 'mixed_raw_slab'
  and d.review_lane in ('candidate_review', 'high_signal_review')
  and d.publication_gate_candidate = false
  and d.can_publish_price_directly = false
  and d.publishable = false
  and d.app_visible = false
  and d.market_truth = false
  and not exists (
    select 1
    from public.market_evidence_review_action_events e
    where e.disposition_id = d.id
      and e.action_payload ->> 'package_id' = '${BATCH_PACKAGE_ID}'
  );
`;

  const readbackSql = `-- MEE_CORE_BATCH_REVIEW_ACTION_WORKFLOW_V1 readback.
-- Run after explicit apply approval.

with targets(id) as (
  values
    ${applyRows.map((row) => `(${sqlLiteral(row.disposition_id)}::uuid)`).join(",\n    ")}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.id = e.disposition_id
  where e.action_payload ->> 'package_id' = '${BATCH_PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${manifestHash}'
), target_dispositions as (
  select d.*
  from public.market_evidence_review_dispositions d
  join targets t on t.id = d.id
)
select
  'MEE_CORE_BATCH_REVIEW_ACTION_WORKFLOW_V1_READBACK'::text as package_id,
  ${applyRows.length}::int as expected_target_rows,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where review_status = 'blocked' and review_disposition = 'review_split_required') as updated_target_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as target_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence%') as public_pricing_view_market_evidence_references;
`;

  const rollbackSql = `-- MEE_CORE_BATCH_REVIEW_ACTION_WORKFLOW_V1 rollback candidate.
-- Do not execute without explicit rollback approval.

begin;

with targets(id, expected_updated_at) as (
  values
    ${valuesSql}
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.id = e.disposition_id
  where e.action_payload ->> 'package_id' = '${BATCH_PACKAGE_ID}'
    and e.action_payload ->> 'row_manifest_sha256' = '${manifestHash}'
), deleted_events as (
  delete from public.market_evidence_review_action_events e
  using package_events pe
  where e.id = pe.id
  returning e.disposition_id
)
update public.market_evidence_review_dispositions d
set
  review_status = 'pending',
  review_disposition = case
    when d.review_lane = 'high_signal_review' then 'review_pending_high_signal'
    else 'review_pending_candidate'
  end,
  review_actor = 'system_seed_plan',
  reviewed_at = null,
  needs_review = true,
  publication_gate_candidate = false,
  can_publish_price_directly = false,
  publishable = false,
  app_visible = false,
  market_truth = false,
  updated_at = targets.expected_updated_at
from targets
where d.id = targets.id
  and exists (select 1 from deleted_events de where de.disposition_id = d.id);

commit;
`;

  const sqlHashes = {
    apply_sql_sha256: sha256Text(applySql),
    preflight_sql_sha256: sha256Text(preflightSql),
    readback_sql_sha256: sha256Text(readbackSql),
    rollback_sql_sha256: sha256Text(rollbackSql),
  };

  const reportPayload = {
    source_orchestrator: orchestrator.package_fingerprint_sha256,
    source_lane_policy: lanePolicy.package_fingerprint_sha256,
    safe_action_rows: applyRows.length,
    action_counts: { require_split: applyRows.length },
    row_manifest_sha256: manifestHash,
    sql_hashes: sqlHashes,
  };
  const report = {
    package_id: BATCH_PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: "plan_only_batch_review_action_workflow",
    package_fingerprint_sha256: sha256Json(reportPayload),
    workflow_status: "ready_for_single_safe_internal_apply_package",
    source: {
      orchestrator_package_id: orchestrator.package_id,
      orchestrator_fingerprint: orchestrator.package_fingerprint_sha256,
      lane_policy_package_id: lanePolicy.package_id,
      lane_policy_fingerprint: lanePolicy.package_fingerprint_sha256,
    },
    batch_plan: {
      safe_internal_action_rows: applyRows.length,
      actions: { require_split: applyRows.length },
      applies_public_pricing: false,
      creates_market_truth: false,
      sets_public_flags: false,
      one_approval_per_post_ingest_cycle: true,
    },
    next_recommendation: {
      package_id: PUBLISH_PACKAGE_ID,
      reason:
        "Batch review action workflow exists. The next foundation blocker is the separate publish gate contract.",
      allowed_scope:
        "Contract only. No DB writes, no provider calls, no public pricing, no pricing_observations, no identity/vault/image writes.",
    },
    hashes: {
      row_manifest_sha256: manifestHash,
      ...sqlHashes,
    },
    findings: [],
    boundary_proof: boundaryProof(),
  };

  writeFileSync(path.join(SQL_DIR, "mee_core_batch_review_action_workflow_v1_apply_candidate.sql"), applySql);
  writeFileSync(path.join(SQL_DIR, "mee_core_batch_review_action_workflow_v1_preflight.sql"), preflightSql);
  writeFileSync(path.join(SQL_DIR, "mee_core_batch_review_action_workflow_v1_readback.sql"), readbackSql);
  writeFileSync(path.join(SQL_DIR, "mee_core_batch_review_action_workflow_v1_rollback_candidate.sql"), rollbackSql);

  const artifactDir = path.join(AUDIT_DIR, BATCH_PACKAGE_ID);
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(path.join(artifactDir, "row_manifest.jsonl"), manifestText);

  const markdown = `# MEE Core Batch Review Action Workflow V1

Generated: ${report.generated_at}

Status: plan only

## Purpose

Convert post-ingest safe internal review actions into one auditable apply package instead of lane-by-lane approvals.

## Current Batch

- Safe internal action rows: \`${applyRows.length}\`
- Action: \`require_split\`
- Public pricing: \`false\`
- Market truth: \`false\`
- Public flags: \`false\`

## Files

- \`docs/sql/mee_core_batch_review_action_workflow_v1_preflight.sql\`
- \`docs/sql/mee_core_batch_review_action_workflow_v1_apply_candidate.sql\`
- \`docs/sql/mee_core_batch_review_action_workflow_v1_readback.sql\`
- \`docs/sql/mee_core_batch_review_action_workflow_v1_rollback_candidate.sql\`
`;

  writePackageArtifacts(
    BATCH_PACKAGE_ID,
    report,
    markdown,
    markdown,
    { checkpointMarkdown: markdown, contractMarkdown: markdown },
  );
  return report;
}

function makePublishGateContract(batchReport) {
  const gateRules = [
    "Only resolved review_confirmed_internal_candidate rows may be considered.",
    "Evidence lane must be raw_single or slab, never mixed_raw_slab.",
    "All public flags must still be false before publish-gate apply.",
    "Source mix, confidence, freshness, outlier rules, and replay references must be present.",
    "Reference metrics alone cannot publish.",
    "Active listing asking prices alone cannot publish as market truth.",
    "Publish gate writes require a separate future approval and must never be bundled with ingest or review actions.",
  ];
  const reportPayload = {
    gate_rules: gateRules,
    batch_workflow_fingerprint: batchReport.package_fingerprint_sha256,
    public_writes_allowed_now: false,
  };
  const report = {
    package_id: PUBLISH_PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: "contract_only_publish_gate",
    package_fingerprint_sha256: sha256Json(reportPayload),
    publish_gate_status: "contract_defined_no_public_apply",
    gate_rules: gateRules,
    current_allowed_public_writes: false,
    next_recommendation: {
      package_id: RUNBOOK_PACKAGE_ID,
      reason: "Publish gate contract exists. The final foundation blocker is the daily runbook.",
      allowed_scope:
        "Documentation/runbook only. No acquisition, no provider calls, no DB writes, no public pricing, no pricing_observations, no identity/vault/image writes.",
    },
    findings: [],
    boundary_proof: boundaryProof(),
  };
  const markdown = `# MEE Core Publish Gate Contract V1

Generated: ${report.generated_at}

Status: contract only

## Rule

Internal review does not publish pricing. Publication is a separate final gate.

## Minimum Gate Rules

${gateRules.map((rule) => `- ${rule}`).join("\n")}

## Current State

No public pricing writes are allowed by this contract.
`;
  writePackageArtifacts(
    PUBLISH_PACKAGE_ID,
    report,
    markdown,
    markdown,
    { checkpointMarkdown: markdown, contractMarkdown: markdown },
  );
  return report;
}

function makeRunbook(publishReport) {
  const steps = [
    "Run ingestion only after foundation checks pass.",
    "Run MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1.",
    "Review orchestrator summary and safe-action count.",
    "Run MEE-CORE-BATCH-REVIEW-ACTION-WORKFLOW-V1 preflight.",
    "Apply one safe internal review-action batch only when explicitly approved.",
    "Run batch readback and post-apply audit.",
    "Stop before public pricing unless a separate publish-gate package is prepared and approved.",
  ];
  const reportPayload = {
    steps,
    publish_gate_fingerprint: publishReport.package_fingerprint_sha256,
  };
  const report = {
    package_id: RUNBOOK_PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: "runbook_only_daily_operator_flow",
    package_fingerprint_sha256: sha256Json(reportPayload),
    runbook_status: "complete",
    steps,
    findings: [],
    boundary_proof: boundaryProof(),
  };
  const markdown = `# MEE Core Daily Runbook V1

Generated: ${report.generated_at}

Status: complete

## Daily Flow

${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Boundary

Ingest, review, and publish are separate phases. Public pricing is never bundled with ingest or review.
`;
  writePackageArtifacts(
    RUNBOOK_PACKAGE_ID,
    report,
    markdown,
    markdown,
    { checkpointMarkdown: markdown, contractMarkdown: markdown },
  );
  return report;
}

function makeFinalCheckpoint(batchReport, publishReport, runbookReport, lanePolicy) {
  const reportPayload = {
    completed_packages: [
      "MEE-CORE-POST-INGEST-REVIEW-ORCHESTRATOR-V1",
      lanePolicy.package_id,
      batchReport.package_id,
      publishReport.package_id,
      runbookReport.package_id,
    ],
    foundation_status: "complete",
    public_pricing_allowed: false,
  };
  const report = {
    package_id: FINAL_PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: "foundation_complete_checkpoint",
    package_fingerprint_sha256: sha256Json(reportPayload),
    foundation_status: "complete",
    completed_blockers: [
      "post_ingest_review_orchestrator",
      "lane_policy_contract",
      "batch_review_action_workflow",
      "publish_gate_contract",
      "runbook",
    ],
    still_not_allowed: [
      "public pricing writes without publish-gate apply",
      "pricing_observations writes from providers",
      "ebay_active_prices_latest writes from MEE review",
      "identity/vault/image writes from MEE",
      "treating active listings or reference metrics as market truth",
    ],
    next_operational_step:
      "Use the daily runbook. The current safe internal batch is 550 require_split rows, but it remains an explicit single batch apply decision.",
    findings: [],
    boundary_proof: boundaryProof(),
  };
  const markdown = `# MEE Core Foundation Complete V1

Generated: ${report.generated_at}

Foundation status: \`complete\`

## Completed Blockers

${report.completed_blockers.map((item) => `- ${item}`).join("\n")}

## Still Not Allowed

${report.still_not_allowed.map((item) => `- ${item}`).join("\n")}

## Next Operational Step

${report.next_operational_step}
`;
  writePackageArtifacts(FINAL_PACKAGE_ID, report, markdown, markdown, { checkpointMarkdown: markdown });
  return report;
}

function boundaryProof() {
  return {
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
  };
}

ensureDirs();
const orchestrator = readJson(ORCHESTRATOR_REPORT);
const lanePolicy = readJson(LANE_POLICY_REPORT);
const actionRows = readJsonl(ORCHESTRATOR_ACTION_PLAN);
const batchReport = makeBatchWorkflow(orchestrator, lanePolicy, actionRows);
const publishReport = makePublishGateContract(batchReport);
const runbookReport = makeRunbook(publishReport);
const finalReport = makeFinalCheckpoint(batchReport, publishReport, runbookReport, lanePolicy);

console.log(
  JSON.stringify(
    {
      package_id: finalReport.package_id,
      package_fingerprint_sha256: finalReport.package_fingerprint_sha256,
      foundation_status: finalReport.foundation_status,
      batch_workflow: {
        package_fingerprint_sha256: batchReport.package_fingerprint_sha256,
        safe_internal_action_rows: batchReport.batch_plan.safe_internal_action_rows,
      },
      publish_gate: {
        package_fingerprint_sha256: publishReport.package_fingerprint_sha256,
        current_allowed_public_writes: publishReport.current_allowed_public_writes,
      },
      runbook: {
        package_fingerprint_sha256: runbookReport.package_fingerprint_sha256,
        step_count: runbookReport.steps.length,
      },
      findings: finalReport.findings,
    },
    null,
    2,
  ),
);
