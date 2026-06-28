import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { marketEvidenceQueryRows } from "../lib/market_evidence_db_query_v1.mjs";

export const PACKAGE_ID = "MEE-NORMALIZATION-GVID-ASSIGNMENT-AUDIT-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const QUEUE_SQL_PATH = path.join(SQL_DIR, "mee_core_normalization_assignment_queue_v1_view_candidate.sql");

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

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function firstReport(rows) {
  const value = rows?.[0]?.report;
  if (!value) throw new Error("Missing report row");
  return typeof value === "string" ? JSON.parse(value) : value;
}

const queueViewSql = `-- MEE-NORMALIZATION-GVID-ASSIGNMENT-AUDIT-V1 local view candidate.
-- Purpose: internal-only queue for active-listing rows that did not cleanly normalize to card_print_id/gv_id.
-- Boundary: candidate SQL only. Do not apply remotely without a targeted schema approval.

create or replace view public.v_market_evidence_normalization_assignment_queue_v1 as
with listing_events as (
  select
    e.id as price_event_id,
    e.observation_id,
    e.source,
    e.source_listing_id,
    e.current_total_ask_price,
    e.currency,
    e.event_payload,
    o.listing_title,
    o.condition_text,
    o.seller_key,
    o.observed_at
  from public.market_listing_price_events e
  join public.market_listing_observations o on o.id = e.observation_id
), candidate_rows as (
  select
    c.id as candidate_id,
    c.observation_id,
    c.source,
    c.source_listing_id,
    c.card_print_id,
    c.gv_id as candidate_gv_id,
    c.match_status,
    c.match_confidence,
    c.title_features,
    c.exclusion_flags,
    c.needs_review,
    c.can_publish_price_directly
  from public.market_listing_card_candidates c
), joined as (
  select
    e.*,
    c.candidate_id,
    c.card_print_id,
    c.candidate_gv_id,
    cp.gv_id as canonical_gv_id,
    c.match_status,
    c.match_confidence,
    c.title_features,
    c.exclusion_flags,
    c.needs_review,
    c.can_publish_price_directly
  from listing_events e
  left join candidate_rows c
    on c.observation_id = e.observation_id
   and c.source = e.source
   and c.source_listing_id = e.source_listing_id
  left join public.card_prints cp on cp.id = c.card_print_id
)
select
  price_event_id,
  observation_id,
  candidate_id,
  source,
  source_listing_id,
  listing_title,
  condition_text,
  seller_key,
  observed_at,
  current_total_ask_price,
  currency,
  card_print_id,
  coalesce(canonical_gv_id, candidate_gv_id) as gv_id,
  match_status,
  match_confidence,
  title_features,
  exclusion_flags,
  case
    when candidate_id is null and event_payload->>'listing_evidence_class' = 'excluded_or_ambiguous' then 'excluded_or_ambiguous_non_candidate'
    when candidate_id is null then 'missing_candidate'
    when card_print_id is null then 'missing_card_print_id'
    when canonical_gv_id is null and candidate_gv_id is null then 'missing_gv_id'
    when can_publish_price_directly then 'public_boundary_violation'
    else 'assigned_review_only'
  end as assignment_queue_reason,
  true as needs_review,
  false as publishable,
  false as app_visible,
  false as market_truth
from joined
where candidate_id is null
   or card_print_id is null
   or (canonical_gv_id is null and candidate_gv_id is null)
   or can_publish_price_directly;

revoke all on public.v_market_evidence_normalization_assignment_queue_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_normalization_assignment_queue_v1 to service_role;
`;

function renderMarkdown(report) {
  return [
    "# MEE Normalization GVID Assignment Audit V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Findings: \`${report.findings.length}\``,
    "",
    "## Assignment Summary",
    "",
    "```json",
    JSON.stringify(report.assignment_summary, null, 2),
    "```",
    "",
    "## Queue Summary",
    "",
    "```json",
    JSON.stringify(report.assignment_queue_summary, null, 2),
    "```",
    "",
    "## Samples",
    "",
    "```json",
    JSON.stringify(report.samples, null, 2),
    "```",
    "",
    "## View Candidate",
    "",
    `- ${report.artifacts.queue_view_sql}`,
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

const assignmentSummary = firstReport(await marketEvidenceQueryRows(`
with candidate_join as (
  select
    c.id,
    c.observation_id,
    c.raw_snapshot_id,
    c.source,
    c.source_listing_id,
    c.card_print_id,
    c.gv_id as candidate_gv_id,
    cp.id as joined_card_print_id,
    cp.gv_id as canonical_gv_id,
    c.match_confidence,
    c.match_status,
    c.needs_review,
    c.can_publish_price_directly
  from public.market_listing_card_candidates c
  left join public.card_prints cp on cp.id = c.card_print_id
), price_event_to_candidate as (
  select
    e.id as price_event_id,
    e.observation_id,
    e.source,
    e.source_listing_id,
    c.id as candidate_id,
    c.card_print_id,
    cp.gv_id as canonical_gv_id
  from public.market_listing_price_events e
  left join public.market_listing_card_candidates c
    on c.observation_id = e.observation_id
   and c.source = e.source
   and c.source_listing_id = e.source_listing_id
  left join public.card_prints cp on cp.id = c.card_print_id
), duplicate_candidate_hashes as (
  select source, candidate_hash, count(*) as row_count
  from public.market_listing_card_candidates
  group by source, candidate_hash
  having count(*) > 1
)
select jsonb_build_object(
  'listing_price_events_total', (select count(*)::int from public.market_listing_price_events),
  'listing_observations_total', (select count(*)::int from public.market_listing_observations),
  'listing_candidates_total', (select count(*)::int from candidate_join),
  'listing_candidates_with_card_print_id', (select count(*)::int from candidate_join where card_print_id is not null),
  'listing_candidates_without_card_print_id', (select count(*)::int from candidate_join where card_print_id is null),
  'listing_candidates_join_card_prints', (select count(*)::int from candidate_join where joined_card_print_id is not null),
  'listing_candidates_missing_card_print_join', (select count(*)::int from candidate_join where card_print_id is not null and joined_card_print_id is null),
  'listing_candidates_with_gv_id', (select count(*)::int from candidate_join where coalesce(canonical_gv_id, candidate_gv_id) is not null),
  'listing_candidates_missing_gv_id_after_join', (select count(*)::int from candidate_join where joined_card_print_id is not null and coalesce(canonical_gv_id, candidate_gv_id) is null),
  'listing_candidates_low_match_confidence', (select count(*)::int from candidate_join where match_confidence is null or match_confidence < 0.80),
  'listing_candidates_public_boundary_violations', (select count(*)::int from candidate_join where can_publish_price_directly),
  'price_events_without_candidate', (select count(*)::int from price_event_to_candidate where candidate_id is null),
  'price_events_without_candidate_but_candidate_eligible', (
    select count(*)::int
    from public.market_listing_price_events e
    left join public.market_listing_card_candidates c
      on c.observation_id = e.observation_id
     and c.source = e.source
     and c.source_listing_id = e.source_listing_id
    where c.id is null
      and e.event_payload->>'listing_evidence_class' in ('raw_single', 'slab')
  ),
  'price_events_excluded_or_ambiguous_non_candidate', (
    select count(*)::int
    from public.market_listing_price_events e
    left join public.market_listing_card_candidates c
      on c.observation_id = e.observation_id
     and c.source = e.source
     and c.source_listing_id = e.source_listing_id
    where c.id is null
      and e.event_payload->>'listing_evidence_class' = 'excluded_or_ambiguous'
  ),
  'price_events_without_card_print_id', (select count(*)::int from price_event_to_candidate where candidate_id is not null and card_print_id is null),
  'price_events_without_gv_id', (select count(*)::int from price_event_to_candidate where candidate_id is not null and canonical_gv_id is null),
  'duplicate_candidate_hash_groups', (select count(*)::int from duplicate_candidate_hashes),
  'lifecycle_listing_observations', (
    select count(*)::int
    from public.market_evidence_observations
    where provider_observation_table = 'market_listing_card_candidates'
  ),
  'lifecycle_listing_remaining_unprojected_candidates', (
    select count(*)::int
    from public.market_listing_card_candidates c
    where c.card_print_id is not null
      and not exists (
        select 1
        from public.market_evidence_observations eo
        where eo.provider_observation_table = 'market_listing_card_candidates'
          and eo.provider_observation_id = c.id
      )
  )
) as report;
`));

const queueSummary = firstReport(await marketEvidenceQueryRows(`
with listing_events as (
  select
    e.id as price_event_id,
    e.observation_id,
    e.source,
    e.source_listing_id,
    e.event_payload,
    o.listing_title,
    e.current_total_ask_price,
    e.currency
  from public.market_listing_price_events e
  join public.market_listing_observations o on o.id = e.observation_id
), joined as (
  select
    e.*,
    c.id as candidate_id,
    c.card_print_id,
    coalesce(cp.gv_id, c.gv_id) as gv_id,
    c.match_confidence,
    c.can_publish_price_directly
  from listing_events e
  left join public.market_listing_card_candidates c
    on c.observation_id = e.observation_id
   and c.source = e.source
   and c.source_listing_id = e.source_listing_id
  left join public.card_prints cp on cp.id = c.card_print_id
), queue as (
  select
    case
      when candidate_id is null and event_payload->>'listing_evidence_class' = 'excluded_or_ambiguous' then 'excluded_or_ambiguous_non_candidate'
      when candidate_id is null then 'missing_candidate'
      when card_print_id is null then 'missing_card_print_id'
      when gv_id is null then 'missing_gv_id'
      when can_publish_price_directly then 'public_boundary_violation'
      else 'assigned_review_only'
    end as reason
  from joined
  where candidate_id is null
     or card_print_id is null
     or gv_id is null
     or can_publish_price_directly
)
select jsonb_build_object(
  'queue_rows_total', (select count(*)::int from queue),
  'by_reason', coalesce((select jsonb_object_agg(reason, row_count order by reason) from (
    select reason, count(*)::int as row_count
    from queue
    group by reason
  ) s), '{}'::jsonb)
) as report;
`));

const samples = firstReport(await marketEvidenceQueryRows(`
with listing_events as (
  select
    e.id as price_event_id,
    e.observation_id,
    e.source,
    e.source_listing_id,
    e.event_payload,
    o.listing_title,
    e.current_total_ask_price,
    e.currency
  from public.market_listing_price_events e
  join public.market_listing_observations o on o.id = e.observation_id
), joined as (
  select
    e.*,
    c.id as candidate_id,
    c.card_print_id,
    coalesce(cp.gv_id, c.gv_id) as gv_id,
    c.match_confidence,
    c.can_publish_price_directly
  from listing_events e
  left join public.market_listing_card_candidates c
    on c.observation_id = e.observation_id
   and c.source = e.source
   and c.source_listing_id = e.source_listing_id
  left join public.card_prints cp on cp.id = c.card_print_id
), queue as (
  select
    price_event_id,
    source_listing_id,
    listing_title,
    card_print_id,
    gv_id,
    match_confidence,
    current_total_ask_price,
    currency,
    case
      when candidate_id is null and event_payload->>'listing_evidence_class' = 'excluded_or_ambiguous' then 'excluded_or_ambiguous_non_candidate'
      when candidate_id is null then 'missing_candidate'
      when card_print_id is null then 'missing_card_print_id'
      when gv_id is null then 'missing_gv_id'
      when can_publish_price_directly then 'public_boundary_violation'
      else 'assigned_review_only'
    end as reason
  from joined
  where candidate_id is null
     or card_print_id is null
     or gv_id is null
     or can_publish_price_directly
)
select jsonb_build_object(
  'queue_samples', coalesce((select jsonb_agg(to_jsonb(q) order by reason, price_event_id) from (select * from queue order by reason, price_event_id limit 25) q), '[]'::jsonb)
) as report;
`));

const findings = [];
if (assignmentSummary.listing_candidates_without_card_print_id !== 0) findings.push("candidate_rows_missing_card_print_id");
if (assignmentSummary.listing_candidates_missing_card_print_join !== 0) findings.push("candidate_rows_missing_card_print_join");
if (assignmentSummary.listing_candidates_missing_gv_id_after_join !== 0) findings.push("candidate_rows_missing_gv_id");
if (assignmentSummary.price_events_without_candidate_but_candidate_eligible !== 0) {
  findings.push("candidate_eligible_price_events_without_candidate_rows");
}
if (assignmentSummary.price_events_without_card_print_id !== 0) findings.push("price_events_without_card_print_id");
if (assignmentSummary.price_events_without_gv_id !== 0) findings.push("price_events_without_gv_id");
if (assignmentSummary.duplicate_candidate_hash_groups !== 0) findings.push("duplicate_candidate_hash_groups");
if (assignmentSummary.lifecycle_listing_remaining_unprojected_candidates !== 0) findings.push("listing_candidates_not_projected_to_lifecycle");
if (assignmentSummary.listing_candidates_public_boundary_violations !== 0) findings.push("candidate_public_boundary_violation");

mkdirSync(ARTIFACT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(QUEUE_SQL_PATH, queueViewSql);

const payload = {
  assignmentSummary,
  queueSummary,
  samples,
  findings,
};
const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "read_only_normalization_gvid_assignment_audit",
  package_fingerprint_sha256: sha256(payload),
  assignment_summary: assignmentSummary,
  assignment_queue_summary: queueSummary,
  samples,
  artifacts: {
    queue_view_sql: rel(QUEUE_SQL_PATH),
  },
  boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    card_prints_writes: false,
    card_printings_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
  findings,
};

const jsonPath = path.join(ARTIFACT_DIR, "report.json");
const mdPath = path.join(AUDIT_DIR, `${PACKAGE_ID}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  assignment_summary: report.assignment_summary,
  assignment_queue_summary: report.assignment_queue_summary,
  findings: report.findings,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
    queueViewSql: rel(QUEUE_SQL_PATH),
  },
}, null, 2));
