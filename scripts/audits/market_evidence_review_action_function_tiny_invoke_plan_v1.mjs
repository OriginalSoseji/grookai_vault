import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

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

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJsonb(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function sqlTimestamptz(value) {
  if (value === null || value === undefined) return "null::timestamptz";
  return `${sqlLiteral(value)}::timestamptz`;
}

function supabaseReadOnlyQuery(sql) {
  let output = "";
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      output = execFileSync("supabase", ["db", "query", "--linked", sql], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 20,
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 1500);
    }
  }
  if (lastError) throw lastError;
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

const selectedRows = supabaseReadOnlyQuery(`
select
  id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  review_actor,
  reviewed_at,
  review_payload,
  needs_review,
  publication_gate_candidate,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth,
  updated_at
from public.market_evidence_review_dispositions
where review_lane = 'low_signal_monitor'
  and review_status = 'resolved'
  and review_disposition = 'monitor_only'
  and publication_gate_candidate = false
  and can_publish_price_directly = false
  and publishable = false
  and app_visible = false
  and market_truth = false
order by updated_at asc, id asc
limit 1;
`);

if (selectedRows.length !== 1) {
  throw new Error(`Expected exactly one selected row, got ${selectedRows.length}`);
}

const selected = selectedRows[0];
const target = {
  package_id: PACKAGE_ID,
  action_name: "confirm_monitor_only",
  review_actor: "system_tiny_invoke_plan",
  reason_code: null,
  review_note: "MEE core tiny invoke proof: confirm low_signal_monitor monitor_only remains internal only.",
  before: selected,
  expected_after: {
    review_status: "resolved",
    review_disposition: "monitor_only",
    needs_review: false,
    publication_gate_candidate: false,
    can_publish_price_directly: false,
    publishable: false,
    app_visible: false,
    market_truth: false,
    action_event_delta: 1,
  },
};

const rowManifest = `${JSON.stringify(stable(target))}\n`;
const rowManifestHash = sha256Text(rowManifest);
const actionPayload = {
  package_id: PACKAGE_ID,
  row_manifest_sha256: rowManifestHash,
  target_disposition_id: selected.id,
  action_name: "confirm_monitor_only",
  plan_only_generated: true,
};

const applySql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 exactly once for one low_signal_monitor row.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  ${sqlLiteral(selected.id)}::uuid,
  ${sqlTimestamptz(selected.updated_at)},
  'confirm_monitor_only'::text,
  'system_tiny_invoke_plan'::text,
  null::text,
  ${sqlLiteral(target.review_note)}::text,
  ${sqlJsonb(actionPayload)}
);

commit;
`;

const rollbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 rollback candidate.
-- Do not execute unless the approved tiny invoke apply has run and rollback is explicitly approved.
-- Restores the single target disposition row to the captured before-state and removes only the matching package-tagged action event.

begin;

delete from public.market_evidence_review_action_events
where disposition_id = ${sqlLiteral(selected.id)}::uuid
  and action_name = 'confirm_monitor_only'
  and action_payload ->> 'package_id' = '${PACKAGE_ID}'
  and action_payload ->> 'row_manifest_sha256' = ${sqlLiteral(rowManifestHash)}
returning id as deleted_action_event_id;

update public.market_evidence_review_dispositions
set
  review_status = ${sqlLiteral(selected.review_status)},
  review_disposition = ${sqlLiteral(selected.review_disposition)},
  review_actor = ${sqlLiteral(selected.review_actor)},
  reviewed_at = ${sqlTimestamptz(selected.reviewed_at)},
  review_payload = ${sqlJsonb(selected.review_payload ?? {})},
  needs_review = ${Boolean(selected.needs_review)}::boolean,
  publication_gate_candidate = false,
  can_publish_price_directly = false,
  publishable = false,
  app_visible = false,
  market_truth = false,
  updated_at = ${sqlTimestamptz(selected.updated_at)}
where id = ${sqlLiteral(selected.id)}::uuid
returning
  id,
  review_status,
  review_disposition,
  review_actor,
  reviewed_at,
  needs_review,
  updated_at;

commit;
`;

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 readback SQL.
-- Use after an explicitly approved tiny invoke apply.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_EVENT_READBACK'::text as package_id,
  count(*)::int as matching_action_event_rows
from public.market_evidence_review_action_events
where disposition_id = ${sqlLiteral(selected.id)}::uuid
  and action_name = 'confirm_monitor_only'
  and action_payload ->> 'package_id' = '${PACKAGE_ID}'
  and action_payload ->> 'row_manifest_sha256' = ${sqlLiteral(rowManifestHash)};

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_DISPOSITION_READBACK'::text as package_id,
  id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  review_actor,
  needs_review,
  publication_gate_candidate,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth
from public.market_evidence_review_dispositions
where id = ${sqlLiteral(selected.id)}::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_BOUNDARY_READBACK'::text as package_id,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review_action_events%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions where id = ${sqlLiteral(selected.id)}::uuid and (publishable or app_visible or market_truth)) as target_public_flag_rows;
`;

const preflightSql = `-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 preflight SQL.
-- Read-only. Use immediately before any approved apply to verify the optimistic-lock target still matches.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_PREFLIGHT'::text as package_id,
  count(*)::int as eligible_target_rows
from public.market_evidence_review_dispositions
where id = ${sqlLiteral(selected.id)}::uuid
  and updated_at is not distinct from ${sqlTimestamptz(selected.updated_at)}
  and review_lane = 'low_signal_monitor'
  and review_status = 'resolved'
  and review_disposition = 'monitor_only'
  and publication_gate_candidate = false
  and can_publish_price_directly = false
  and publishable = false
  and app_visible = false
  and market_truth = false;
`;

const applyHash = sha256Text(applySql);
const rollbackHash = sha256Text(rollbackSql);
const readbackHash = sha256Text(readbackSql);
const preflightHash = sha256Text(preflightSql);
const reportPayload = {
  target,
  row_manifest_sha256: rowManifestHash,
  apply_sql_sha256: applyHash,
  rollback_sql_sha256: rollbackHash,
  readback_sql_sha256: readbackHash,
  preflight_sql_sha256: preflightHash,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_tiny_review_action_function_invoke",
  package_fingerprint_sha256: sha256Json(reportPayload),
  target: {
    disposition_id: selected.id,
    card_print_id: selected.card_print_id,
    gv_id: selected.gv_id,
    review_lane: selected.review_lane,
    evidence_lane: selected.evidence_lane,
    review_status: selected.review_status,
    review_disposition: selected.review_disposition,
    updated_at: selected.updated_at,
    action_name: "confirm_monitor_only",
  },
  hashes: {
    row_manifest_sha256: rowManifestHash,
    apply_sql_sha256: applyHash,
    rollback_sql_sha256: rollbackHash,
    readback_sql_sha256: readbackHash,
    preflight_sql_sha256: preflightHash,
  },
  artifacts: {
    row_manifest: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/row_manifest.jsonl`,
    apply_sql: "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_apply_candidate.sql",
    rollback_sql: "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_rollback_candidate.sql",
    readback_sql: "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_readback.sql",
    preflight_sql: "docs/sql/mee_core_internal_review_action_function_tiny_invoke_v1_preflight.sql",
    report_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}/report.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_ID}.md`,
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1.md",
  },
  findings: [],
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
    deletes_executed: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
};

function renderMarkdown(value) {
  return [
    "# MEE Core Internal Review Action Function Tiny Invoke Plan V1",
    "",
    `Generated: ${value.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Target",
    "",
    `- Disposition: \`${value.target.disposition_id}\``,
    `- Card print: \`${value.target.card_print_id}\``,
    `- GVID: \`${value.target.gv_id}\``,
    `- Lane: \`${value.target.review_lane}\` / \`${value.target.evidence_lane}\``,
    `- Current state: \`${value.target.review_status}\` / \`${value.target.review_disposition}\``,
    `- Action: \`${value.target.action_name}\``,
    "",
    "## Hashes",
    "",
    `- Row manifest: \`${value.hashes.row_manifest_sha256}\``,
    `- Apply SQL: \`${value.hashes.apply_sql_sha256}\``,
    `- Rollback SQL: \`${value.hashes.rollback_sql_sha256}\``,
    `- Readback SQL: \`${value.hashes.readback_sql_sha256}\``,
    `- Preflight SQL: \`${value.hashes.preflight_sql_sha256}\``,
    "",
    "## Boundary",
    "",
    "No DB writes, function invocation, action event inserts, disposition updates, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, executed deletes, upserts, merges, migrations, or global apply.",
    "",
  ].join("\n");
}

const planMd = `# MEE Core Internal Review Action Function Tiny Invoke Plan V1

Status: plan only

## Objective

Prepare the smallest possible controlled invocation package for \`public.apply_market_evidence_review_action_v1\`.

## Selected Action

\`confirm_monitor_only\` against exactly one \`low_signal_monitor\` disposition that is already \`resolved / monitor_only\`.

## Safety

- The apply SQL is not executed by this plan.
- The apply SQL includes the captured \`expected_updated_at\` optimistic-lock value.
- The action payload is package-tagged for exact readback and rollback targeting.
- The rollback candidate targets only the package-tagged action event and captured disposition row.

## Next Step After This Plan

Approve a tiny apply only if the preflight SQL still returns \`eligible_target_rows = 1\`.
`;

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

writeFileSync(path.join(ARTIFACT_DIR, "row_manifest.jsonl"), rowManifest);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_ID}.md`), renderMarkdown(report));
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1.md"), planMd);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_tiny_invoke_v1_apply_candidate.sql"), applySql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_tiny_invoke_v1_rollback_candidate.sql"), rollbackSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_tiny_invoke_v1_readback.sql"), readbackSql);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_action_function_tiny_invoke_v1_preflight.sql"), preflightSql);

console.log(
  JSON.stringify(
    {
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      target: report.target,
      hashes: report.hashes,
      findings: report.findings,
      artifacts: report.artifacts,
    },
    null,
    2,
  ),
);
