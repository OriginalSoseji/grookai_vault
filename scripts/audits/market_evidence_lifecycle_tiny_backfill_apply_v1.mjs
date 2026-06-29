import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PACKAGE_DIR = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1");
const APPLY_DIR = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1");
const PACKAGE_ID = "MEE-CORE-LIFECYCLE-TINY-BACKFILL-APPLY-V1";
const APPROVED_PACKAGE_FINGERPRINT = "aabb3f8d7556afed1ff8a85a75cc44007f7d468a225f60f813650251b0218e2f";
const APPROVED_PROJECTION_FINGERPRINT = "99d6f31b5aab277785f1631ba9167a4c6382db9fda717df76803ef4d8e3af34d";

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
  const input = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(input).digest("hex");
}

function readJsonl(filePath) {
  const text = readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => JSON.parse(line));
}

function q(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function qJson(value) {
  return `${q(JSON.stringify(value ?? {}))}::jsonb`;
}

function qTextArray(values) {
  const arr = values ?? [];
  return `array[${arr.map((value) => q(value)).join(", ")}]::text[]`;
}

function runSupabaseQueryFile(filePath) {
  return execFileSync("supabase", ["db", "query", "--file", filePath, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
}

function runSupabaseQuery(sql) {
  const raw = execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  return JSON.parse(raw).rows ?? [];
}

function observationValues(row) {
  return [
    q(row.id),
    q(row.contract_version),
    q(row.source),
    q(row.source_type),
    q(row.provider_route),
    q(row.source_record_id),
    q(row.source_url),
    q(row.acquisition_run_table),
    q(row.acquisition_run_id),
    q(row.raw_snapshot_table),
    q(row.raw_snapshot_id),
    q(row.provider_observation_table),
    q(row.provider_observation_id),
    q(row.provider_candidate_table),
    q(row.provider_candidate_id),
    q(row.provider_rollup_table),
    q(row.provider_rollup_id),
    q(row.card_print_id),
    q(row.gv_id),
    q(row.observed_at),
    "now()",
    q(row.adapter_version),
    q(row.normalizer_version),
    q(row.matcher_version),
    q(row.classifier_version),
    q(row.quality_gate_version),
    q(row.rollup_version),
    q(row.publication_gate_version),
    qJson(row.identity_payload),
    qJson(row.source_payload),
    "now()",
  ].join(", ");
}

function lifecycleEventValues(row) {
  return [
    q(row.id),
    q(row.observation_id),
    q(row.contract_version),
    q(row.event_version),
    q(row.from_state),
    q(row.to_state),
    Number(row.stage_order),
    q(row.transition_reason),
    q(row.transition_actor),
    q(row.source),
    q(row.source_type),
    q(row.source_record_id),
    q(row.acquisition_run_id),
    q(row.raw_snapshot_id),
    q(row.normalized_observation_ref),
    q(row.matched_candidate_ref),
    q(row.classified_ref),
    q(row.quality_gate_ref),
    q(row.rollup_ref),
    q(row.publication_ref),
    row.match_confidence === null || row.match_confidence === undefined ? "null" : Number(row.match_confidence),
    q(row.match_status),
    q(row.evidence_class),
    qTextArray(row.quality_flags),
    qTextArray(row.exclusion_flags),
    row.model_eligible ? "true" : "false",
    row.rollup_eligible ? "true" : "false",
    row.needs_review ? "true" : "false",
    row.publishable ? "true" : "false",
    row.app_visible ? "true" : "false",
    row.market_truth ? "true" : "false",
    qJson(row.event_payload),
    q(row.event_hash),
    q(row.occurred_at),
    "now()",
  ].join(", ");
}

function buildSql(observations, events) {
  return [
    "-- MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1",
    "-- Insert-only tiny lifecycle seed package. No deletes, upserts, merges, pricing writes, or public view changes.",
    "begin;",
    "",
    "insert into public.market_evidence_observations (",
    "  id, contract_version, source, source_type, provider_route, source_record_id, source_url,",
    "  acquisition_run_table, acquisition_run_id, raw_snapshot_table, raw_snapshot_id,",
    "  provider_observation_table, provider_observation_id, provider_candidate_table, provider_candidate_id,",
    "  provider_rollup_table, provider_rollup_id, card_print_id, gv_id, observed_at, first_seen_at,",
    "  adapter_version, normalizer_version, matcher_version, classifier_version, quality_gate_version,",
    "  rollup_version, publication_gate_version, identity_payload, source_payload, created_at",
    ") values",
    observations.map((row) => `  (${observationValues(row)})`).join(",\n"),
    ";",
    "",
    "insert into public.market_evidence_lifecycle_events (",
    "  id, observation_id, contract_version, event_version, from_state, to_state, stage_order,",
    "  transition_reason, transition_actor, source, source_type, source_record_id, acquisition_run_id, raw_snapshot_id,",
    "  normalized_observation_ref, matched_candidate_ref, classified_ref, quality_gate_ref, rollup_ref, publication_ref,",
    "  match_confidence, match_status, evidence_class, quality_flags, exclusion_flags, model_eligible, rollup_eligible,",
    "  needs_review, publishable, app_visible, market_truth, event_payload, event_hash, occurred_at, created_at",
    ") values",
    events.map((row) => `  (${lifecycleEventValues(row)})`).join(",\n"),
    ";",
    "",
    "select",
    `  '${PACKAGE_ID}'::text as package_id,`,
    `  ${observations.length}::int as inserted_market_evidence_observations,`,
    `  ${events.length}::int as inserted_market_evidence_lifecycle_events,`,
    "  false::boolean as writes_pricing_observations,",
    "  false::boolean as writes_ebay_active_prices_latest,",
    "  false::boolean as creates_public_pricing_view,",
    "  false::boolean as creates_app_visible_pricing,",
    "  false::boolean as writes_identity_tables,",
    "  false::boolean as writes_vault_tables,",
    "  false::boolean as writes_image_or_storage_tables;",
    "",
    "commit;",
    "",
  ].join("\n");
}

function renderMarkdown(report) {
  return [
    "# MEE Core Lifecycle Tiny Backfill Apply V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: targeted tiny insert apply",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source plan fingerprint: \`${report.source_plan_fingerprint}\``,
    `- Inserted observations: ${report.apply_summary.inserted_market_evidence_observations}`,
    `- Inserted lifecycle events: ${report.apply_summary.inserted_market_evidence_lifecycle_events}`,
    "",
    "## Readback",
    "",
    "```json",
    JSON.stringify(report.readback, null, 2),
    "```",
    "",
    "## Boundary Proof",
    "",
    "```json",
    JSON.stringify(report.boundary_proof, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Step",
    "",
    "Create a readback/view smoke for `v_market_evidence_lifecycle_current_v1`, then plan the next bounded batch size.",
    "",
  ].join("\n");
}

const manifestPath = path.join(PACKAGE_DIR, "manifest.json");
const observationsPath = path.join(PACKAGE_DIR, "market_evidence_observations.jsonl");
const eventsPath = path.join(PACKAGE_DIR, "market_evidence_lifecycle_events.jsonl");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const observationsJsonl = readFileSync(observationsPath, "utf8");
const eventsJsonl = readFileSync(eventsPath, "utf8");

if (manifest.package_fingerprint_sha256 !== APPROVED_PACKAGE_FINGERPRINT) {
  throw new Error(`Package fingerprint mismatch: ${manifest.package_fingerprint_sha256}`);
}
if (manifest.source_projection_fingerprint !== APPROVED_PROJECTION_FINGERPRINT) {
  throw new Error(`Projection fingerprint mismatch: ${manifest.source_projection_fingerprint}`);
}
if (sha256(observationsJsonl) !== manifest.manifest_hashes.market_evidence_observations_jsonl_sha256) {
  throw new Error("Observation JSONL hash mismatch");
}
if (sha256(eventsJsonl) !== manifest.manifest_hashes.market_evidence_lifecycle_events_jsonl_sha256) {
  throw new Error("Lifecycle event JSONL hash mismatch");
}

const observations = readJsonl(observationsPath);
const events = readJsonl(eventsPath);
if (observations.length !== 6 || events.length !== 42) {
  throw new Error(`Unexpected row count: observations=${observations.length}, events=${events.length}`);
}

mkdirSync(APPLY_DIR, { recursive: true });
const sql = buildSql(observations, events);
const sqlPath = path.join(APPLY_DIR, "apply.sql");
writeFileSync(sqlPath, sql);
const sqlHash = sha256(sql);

const applyRaw = runSupabaseQueryFile(sqlPath);
const applyResult = JSON.parse(applyRaw).rows?.[0] ?? {};

const observationIds = observations.map((row) => row.id);
const eventHashes = events.map((row) => row.event_hash);
const readbackSql = `
with expected_observations(id) as (
  values ${observationIds.map((id) => `(${q(id)}::uuid)`).join(", ")}
),
expected_events(event_hash) as (
  values ${eventHashes.map((hash) => `(${q(hash)}::text)`).join(", ")}
),
obs as (
  select o.*
  from public.market_evidence_observations o
  join expected_observations e on e.id = o.id
),
evt as (
  select e.*
  from public.market_evidence_lifecycle_events e
  join expected_events x on x.event_hash = e.event_hash
),
stage_sequences as (
  select
    observation_id,
    jsonb_agg(to_state order by stage_order) as stages,
    count(*) as event_count,
    bool_or(publishable is distinct from false) as publishable_leak,
    bool_or(app_visible is distinct from false) as app_visible_leak,
    bool_or(market_truth is distinct from false) as market_truth_leak,
    bool_or(needs_review is distinct from true) as needs_review_leak
  from evt
  group by observation_id
)
select jsonb_build_object(
  'observations', jsonb_build_object(
    'expected', ${observations.length},
    'actual', (select count(*) from obs)
  ),
  'events', jsonb_build_object(
    'expected', ${events.length},
    'actual', (select count(*) from evt),
    'distinct_event_hashes', (select count(distinct event_hash) from evt)
  ),
  'stage_sequences', coalesce((
    select jsonb_agg(to_jsonb(stage_sequences) order by observation_id)
    from stage_sequences
  ), '[]'::jsonb),
  'current_view', jsonb_build_object(
    'expected', ${observations.length},
    'actual', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
    ),
    'rollup_eligible_state_count', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
      where v.lifecycle_state = 'rollup_eligible'
    ),
    'app_visible_true', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
      where v.app_visible is distinct from false
    ),
    'market_truth_true', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
      where v.market_truth is distinct from false
    )
  ),
  'public_pricing_surface', jsonb_build_object(
    'pricing_observations_count', (select count(*) from public.pricing_observations),
    'v_card_pricing_references_market_evidence', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_evidence_%'
  )
)::text as report;
`;

const readback = JSON.parse(runSupabaseQuery(readbackSql)[0]?.report ?? "{}");
const findings = [];
if (readback.observations?.actual !== observations.length) findings.push("observation_readback_count_mismatch");
if (readback.events?.actual !== events.length) findings.push("event_readback_count_mismatch");
if (readback.events?.distinct_event_hashes !== events.length) findings.push("event_hash_distinct_count_mismatch");
if (readback.current_view?.actual !== observations.length) findings.push("current_view_count_mismatch");
if (readback.current_view?.rollup_eligible_state_count !== observations.length) findings.push("current_view_final_state_mismatch");
if (readback.current_view?.app_visible_true !== 0) findings.push("app_visible_boundary_leak");
if (readback.current_view?.market_truth_true !== 0) findings.push("market_truth_boundary_leak");
if (readback.public_pricing_surface?.v_card_pricing_references_market_evidence) findings.push("public_view_references_market_evidence");
for (const sequence of readback.stage_sequences ?? []) {
  const stages = sequence.stages ?? [];
  const expected = ["acquired", "raw_stored", "normalized", "matched", "classified", "quality_gated", "rollup_eligible"];
  if (JSON.stringify(stages) !== JSON.stringify(expected)) findings.push(`stage_sequence_mismatch:${sequence.observation_id}`);
  if (sequence.publishable_leak) findings.push(`publishable_leak:${sequence.observation_id}`);
  if (sequence.app_visible_leak) findings.push(`app_visible_leak:${sequence.observation_id}`);
  if (sequence.market_truth_leak) findings.push(`market_truth_leak:${sequence.observation_id}`);
  if (sequence.needs_review_leak) findings.push(`needs_review_leak:${sequence.observation_id}`);
}

const reportPayload = {
  applyResult,
  readback,
  sqlHash,
  sourcePlanFingerprint: manifest.package_fingerprint_sha256,
};
const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "targeted_tiny_insert_apply",
  source_plan_fingerprint: manifest.package_fingerprint_sha256,
  source_projection_fingerprint: manifest.source_projection_fingerprint,
  package_fingerprint_sha256: sha256(reportPayload),
  apply_sql_path: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1/apply.sql",
  apply_sql_sha256: sqlHash,
  apply_summary: applyResult,
  readback,
  findings,
  boundary_proof: {
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

const reportJsonPath = path.join(APPLY_DIR, "report.json");
const reportMdPath = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1.md");
writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(reportMdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  apply_sql_sha256: report.apply_sql_sha256,
  apply_summary: report.apply_summary,
  findings: report.findings,
  artifacts: {
    sql: report.apply_sql_path,
    json: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1/report.json",
    markdown: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_APPLY_V1.md",
  },
}, null, 2));
