import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { marketEvidenceQueryRows } from "../lib/market_evidence_db_query_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_POST_DRAIN_READBACK_V1");
const PACKAGE_ID = "MEE-CORE-LIFECYCLE-POST-DRAIN-READBACK-V1";

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
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

async function runSql(sql) {
  return marketEvidenceQueryRows(sql);
}

function parseJsonRow(rows) {
  const value = rows?.[0]?.report;
  if (!value) throw new Error("Missing report row");
  return typeof value === "string" ? JSON.parse(value) : value;
}

function renderMarkdown(report) {
  return [
    "# MEE Core Lifecycle Post-Drain Readback V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: read-only post-drain integrity audit",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Findings: ${report.findings.length}`,
    "",
    "## Coverage",
    "",
    "```json",
    JSON.stringify(report.coverage, null, 2),
    "```",
    "",
    "## Stage Integrity",
    "",
    "```json",
    JSON.stringify(report.stage_integrity, null, 2),
    "```",
    "",
    "## Public Boundary",
    "",
    "```json",
    JSON.stringify(report.public_boundary, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

const coverage = parseJsonRow(await runSql(`
select jsonb_build_object(
  'source_totals', jsonb_build_object(
    'reference_normalized_evidence', (
      select count(*)::int
      from public.market_reference_normalized_evidence n
      join public.market_reference_candidates c on c.id = n.candidate_id
      where c.raw_snapshot_id is not null
    ),
    'active_listing_candidates', (
      select count(*)::int
      from public.market_listing_card_candidates cc
      where cc.raw_snapshot_id is not null
        and cc.card_print_id is not null
    )
  ),
  'lifecycle_totals', jsonb_build_object(
    'observations', (select count(*)::int from public.market_evidence_observations),
    'events', (select count(*)::int from public.market_evidence_lifecycle_events),
    'reference_observations', (
      select count(*)::int
      from public.market_evidence_observations
      where source_type = 'reference'
        and provider_observation_table = 'market_reference_normalized_evidence'
    ),
    'active_listing_observations', (
      select count(*)::int
      from public.market_evidence_observations
      where source_type = 'active_listing'
        and provider_observation_table = 'market_listing_card_candidates'
    )
  ),
  'remaining', jsonb_build_object(
    'reference', (
      select count(*)::int
      from public.market_reference_normalized_evidence n
      join public.market_reference_candidates c on c.id = n.candidate_id
      where c.raw_snapshot_id is not null
        and not exists (
          select 1
          from public.market_evidence_observations eo
          where eo.source = c.source
            and eo.source_type = 'reference'
            and eo.source_record_id = c.source || ':' || c.candidate_hash
            and eo.provider_observation_table = 'market_reference_normalized_evidence'
            and eo.provider_observation_id = n.id
        )
    ),
    'active_listing', (
      select count(*)::int
      from public.market_listing_card_candidates cc
      join public.market_listing_observations o on o.id = cc.observation_id
      where cc.raw_snapshot_id is not null
        and cc.card_print_id is not null
        and not exists (
          select 1
          from public.market_evidence_observations eo
          where eo.source = o.source
            and eo.source_type = 'active_listing'
            and eo.source_record_id = o.source || ':' || o.source_listing_id
            and eo.provider_observation_table = 'market_listing_card_candidates'
            and eo.provider_observation_id = cc.id
        )
    )
  )
) as report;
`));

const stageIntegrity = parseJsonRow(await runSql(`
with duplicate_observation_keys as (
  select
    source,
    source_type,
    source_record_id,
    coalesce(provider_observation_table, '') as provider_observation_table,
    coalesce(provider_observation_id::text, '') as provider_observation_id,
    count(*)::int as row_count
  from public.market_evidence_observations
  group by 1,2,3,4,5
  having count(*) > 1
)
select jsonb_build_object(
  'observation_count', (select count(*)::int from public.market_evidence_observations),
  'event_count', (select count(*)::int from public.market_evidence_lifecycle_events),
  'expected_event_count', (
    select (count(*) * 7)::int from public.market_evidence_observations
  ),
  'stage_counts', (
    select jsonb_object_agg(to_state, stage_count)
    from (
      select to_state, count(*)::int as stage_count
      from public.market_evidence_lifecycle_events
      group by to_state
    ) s
  ),
  'unexpected_stage_count', (
    select count(*)::int
    from public.market_evidence_lifecycle_events
    where to_state not in (
      'acquired',
      'raw_stored',
      'normalized',
      'matched',
      'classified',
      'quality_gated',
      'rollup_eligible'
    )
  ),
  'event_hash_distinct_count', (
    select count(distinct event_hash)::int from public.market_evidence_lifecycle_events
  ),
  'duplicate_observation_keys', (select count(*)::int from duplicate_observation_keys),
  'app_visible_true_observations', (
    select count(distinct observation_id)::int
    from public.market_evidence_lifecycle_events
    where app_visible
  ),
  'market_truth_true_observations', (
    select count(distinct observation_id)::int
    from public.market_evidence_lifecycle_events
    where market_truth
  ),
  'publishable_true_observations', (
    select count(distinct observation_id)::int
    from public.market_evidence_lifecycle_events
    where publishable
  )
) as report;
`));

const publicBoundary = parseJsonRow(await runSql(`
select jsonb_build_object(
  'pricing_observations_count', (select count(*)::int from public.pricing_observations),
  'ebay_active_prices_latest_count', (select count(*)::int from public.ebay_active_prices_latest),
  'v_card_pricing_references_market_evidence',
    pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_evidence_%'
) as report;
`));

const findings = [];
if (coverage.remaining.reference !== 0) findings.push("reference_rows_remaining");
if (coverage.remaining.active_listing !== 0) findings.push("active_listing_rows_remaining");
if (coverage.source_totals.reference_normalized_evidence !== coverage.lifecycle_totals.reference_observations) {
  findings.push("reference_coverage_mismatch");
}
if (coverage.source_totals.active_listing_candidates !== coverage.lifecycle_totals.active_listing_observations) {
  findings.push("active_listing_coverage_mismatch");
}
if (stageIntegrity.event_count !== stageIntegrity.expected_event_count) findings.push("event_count_total_mismatch");
for (const stage of [
  "acquired",
  "raw_stored",
  "normalized",
  "matched",
  "classified",
  "quality_gated",
  "rollup_eligible",
]) {
  if (stageIntegrity.stage_counts?.[stage] !== stageIntegrity.observation_count) {
    findings.push(`${stage}_stage_count_mismatch`);
  }
}
if (stageIntegrity.unexpected_stage_count !== 0) findings.push("unexpected_lifecycle_stage");
if (stageIntegrity.event_hash_distinct_count !== stageIntegrity.event_count) findings.push("duplicate_event_hashes");
if (stageIntegrity.duplicate_observation_keys !== 0) findings.push("duplicate_observation_keys");
if (stageIntegrity.app_visible_true_observations !== 0) findings.push("app_visible_boundary_leak");
if (stageIntegrity.market_truth_true_observations !== 0) findings.push("market_truth_boundary_leak");
if (stageIntegrity.publishable_true_observations !== 0) findings.push("publishable_boundary_leak");
if (publicBoundary.pricing_observations_count !== 0) findings.push("pricing_observations_not_empty");
if (publicBoundary.v_card_pricing_references_market_evidence) findings.push("public_view_references_market_evidence");

const payload = { coverage, stageIntegrity, publicBoundary, findings };
const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "read_only_post_drain_integrity_audit",
  package_fingerprint_sha256: sha256(payload),
  coverage,
  stage_integrity: stageIntegrity,
  public_boundary: publicBoundary,
  findings,
  boundary_proof: {
    db_writes: false,
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

mkdirSync(ARTIFACT_DIR, { recursive: true });
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_POST_DRAIN_READBACK_V1.md"), renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  findings: report.findings,
  coverage: report.coverage,
}, null, 2));
