import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");
const ARTIFACT_DIR = path.join(AUDIT_DIR, "MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1");
const PACKAGE_ID = "MEE-CORE-INTERNAL-EVIDENCE-READ-MODEL-V1";

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

function requireSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function pageAll(supabase, table, select, options = {}) {
  const pageSize = options.pageSize ?? 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    for (const [column, value] of Object.entries(options.eq ?? {})) query = query.eq(column, value);
    if (options.notNull) query = query.not(options.notNull, "is", null);
    const { data, error } = await query;
    if (error) throw new Error(`${table} page ${from} failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function bucketForEvidence(total) {
  if (total >= 100) return "100+";
  if (total >= 25) return "25-99";
  if (total >= 10) return "10-24";
  if (total >= 3) return "3-9";
  if (total >= 1) return "1-2";
  return "0";
}

function renderMarkdown(report) {
  return [
    "# MEE Core Internal Evidence Read Model V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: plan only, local artifacts only",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Cards with evidence: ${report.audit.cards_with_evidence}`,
    `- Cards with both reference and active listing evidence: ${report.audit.cards_with_both_reference_and_active}`,
    `- Internal read model candidates: ${report.read_model_candidates.length}`,
    `- Findings: ${report.findings.length}`,
    "",
    "## Proposed Read Models",
    "",
    "- `v_market_evidence_card_signal_summary_v1`: one row per card print with source mix, review burden, rollup eligibility, and non-public readiness flags.",
    "- `v_market_evidence_card_review_queue_v1`: card-level review prioritization derived from source mix and review burden.",
    "",
    "## Audit Snapshot",
    "",
    "```json",
    JSON.stringify(report.audit, null, 2),
    "```",
    "",
    "## Boundaries",
    "",
    "```json",
    JSON.stringify(report.boundary_proof, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

const viewCandidateSql = `-- MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1 local SQL/view candidates.
-- Plan only. Do not apply remotely without a separate targeted approval.
-- Internal-only read models. No pricing_observations writes, no public pricing views,
-- no app-visible pricing, no price rollups, no identity/vault/image writes.

create or replace view public.v_market_evidence_card_signal_summary_v1
with (security_invoker = true)
as
with final_events as (
  select
    observation_id,
    needs_review,
    model_eligible,
    rollup_eligible,
    publishable,
    app_visible,
    market_truth,
    evidence_class,
    quality_flags,
    exclusion_flags
  from public.market_evidence_lifecycle_events
  where to_state = 'rollup_eligible'
),
joined as (
  select
    o.card_print_id,
    o.gv_id,
    o.source,
    o.source_type,
    o.observed_at,
    f.needs_review,
    f.model_eligible,
    f.rollup_eligible,
    f.publishable,
    f.app_visible,
    f.market_truth,
    f.evidence_class,
    cardinality(f.quality_flags) as quality_flag_count,
    cardinality(f.exclusion_flags) as exclusion_flag_count
  from public.market_evidence_observations o
  join final_events f on f.observation_id = o.id
  where o.card_print_id is not null
)
select
  card_print_id,
  min(gv_id) as sample_gv_id,
  count(*)::int as evidence_count,
  count(*) filter (where source_type = 'reference')::int as reference_evidence_count,
  count(*) filter (where source_type = 'active_listing')::int as active_listing_evidence_count,
  count(distinct source)::int as source_family_count,
  count(*) filter (where needs_review)::int as needs_review_count,
  count(*) filter (where model_eligible)::int as model_eligible_count,
  count(*) filter (where rollup_eligible)::int as rollup_eligible_count,
  count(*) filter (where publishable)::int as publishable_count,
  count(*) filter (where app_visible)::int as app_visible_count,
  count(*) filter (where market_truth)::int as market_truth_count,
  count(*) filter (where evidence_class = 'reference_metric')::int as reference_metric_count,
  count(*) filter (where evidence_class = 'raw_single')::int as raw_single_count,
  count(*) filter (where evidence_class = 'slab')::int as slab_count,
  count(*) filter (where evidence_class not in ('reference_metric', 'raw_single', 'slab'))::int as review_required_evidence_count,
  sum(quality_flag_count)::int as quality_flag_count,
  sum(exclusion_flag_count)::int as exclusion_flag_count,
  min(observed_at) as first_observed_at,
  max(observed_at) as last_observed_at,
  case
    when count(*) filter (where publishable) > 0 then false
    when count(*) filter (where app_visible) > 0 then false
    when count(*) filter (where market_truth) > 0 then false
    when count(*) filter (where rollup_eligible) >= 3 then true
    else false
  end as internal_rollup_candidate,
  true as needs_review,
  false as publishable,
  false as app_visible,
  false as market_truth
from joined
group by card_print_id;

create or replace view public.v_market_evidence_card_review_queue_v1
with (security_invoker = true)
as
select
  *,
  case
    when rollup_eligible_count >= 10 and source_family_count >= 2 then 'high_signal_review'
    when rollup_eligible_count >= 3 then 'candidate_review'
    when active_listing_evidence_count >= 25 and rollup_eligible_count = 0 then 'classification_review'
    when reference_evidence_count > 0 and active_listing_evidence_count = 0 then 'reference_only_review'
    else 'low_signal_monitor'
  end as review_lane
from public.v_market_evidence_card_signal_summary_v1
where needs_review = true;
`;

const supabase = requireSupabase();
const observations = await pageAll(
  supabase,
  "market_evidence_observations",
  "id,card_print_id,gv_id,source,source_type,observed_at",
  { notNull: "card_print_id" },
);
const finalEvents = await pageAll(
  supabase,
  "market_evidence_lifecycle_events",
  "observation_id,needs_review,model_eligible,rollup_eligible,publishable,app_visible,market_truth,evidence_class,quality_flags,exclusion_flags",
  { eq: { to_state: "rollup_eligible" } },
);

const eventsByObservation = new Map(finalEvents.map((row) => [row.observation_id, row]));
const byCard = new Map();

for (const observation of observations) {
  const event = eventsByObservation.get(observation.id);
  if (!event) continue;
  const key = observation.card_print_id;
  if (!byCard.has(key)) {
    byCard.set(key, {
      card_print_id: key,
      sample_gv_id: observation.gv_id,
      evidence_count: 0,
      reference_evidence_count: 0,
      active_listing_evidence_count: 0,
      sources: new Set(),
      needs_review_count: 0,
      model_eligible_count: 0,
      rollup_eligible_count: 0,
      publishable_count: 0,
      app_visible_count: 0,
      market_truth_count: 0,
      evidence_classes: new Map(),
      quality_flag_count: 0,
      exclusion_flag_count: 0,
    });
  }
  const card = byCard.get(key);
  card.evidence_count += 1;
  card.sources.add(observation.source);
  if (observation.source_type === "reference") card.reference_evidence_count += 1;
  if (observation.source_type === "active_listing") card.active_listing_evidence_count += 1;
  if (event.needs_review) card.needs_review_count += 1;
  if (event.model_eligible) card.model_eligible_count += 1;
  if (event.rollup_eligible) card.rollup_eligible_count += 1;
  if (event.publishable) card.publishable_count += 1;
  if (event.app_visible) card.app_visible_count += 1;
  if (event.market_truth) card.market_truth_count += 1;
  const evidenceClass = event.evidence_class ?? "unknown";
  card.evidence_classes.set(evidenceClass, (card.evidence_classes.get(evidenceClass) ?? 0) + 1);
  card.quality_flag_count += event.quality_flags?.length ?? 0;
  card.exclusion_flag_count += event.exclusion_flags?.length ?? 0;
}

const cards = [...byCard.values()].map((card) => ({
  ...card,
  source_family_count: card.sources.size,
  sources: [...card.sources].sort(),
  evidence_classes: Object.fromEntries([...card.evidence_classes.entries()].sort(([a], [b]) => a.localeCompare(b))),
  evidence_bucket: bucketForEvidence(card.evidence_count),
  internal_rollup_candidate:
    card.rollup_eligible_count >= 3 &&
    card.publishable_count === 0 &&
    card.app_visible_count === 0 &&
    card.market_truth_count === 0,
}));

const bucketCounts = {};
for (const card of cards) bucketCounts[card.evidence_bucket] = (bucketCounts[card.evidence_bucket] ?? 0) + 1;

const readModelCandidates = [
  {
    name: "v_market_evidence_card_signal_summary_v1",
    kind: "internal_view_candidate",
    purpose: "Per-card evidence source mix, lifecycle state summary, review burden, and internal-only rollup candidate flag.",
    public: false,
    app_visible: false,
    market_truth: false,
  },
  {
    name: "v_market_evidence_card_review_queue_v1",
    kind: "internal_view_candidate",
    purpose: "Per-card review lane assignment for analysts/operators before any downstream pricing publication contract.",
    public: false,
    app_visible: false,
    market_truth: false,
  },
];

const audit = {
  observation_rows_read: observations.length,
  final_lifecycle_events_read: finalEvents.length,
  cards_with_evidence: cards.length,
  cards_with_reference_evidence: cards.filter((card) => card.reference_evidence_count > 0).length,
  cards_with_active_listing_evidence: cards.filter((card) => card.active_listing_evidence_count > 0).length,
  cards_with_both_reference_and_active: cards.filter(
    (card) => card.reference_evidence_count > 0 && card.active_listing_evidence_count > 0,
  ).length,
  cards_with_internal_rollup_candidate_flag: cards.filter((card) => card.internal_rollup_candidate).length,
  cards_with_any_publishable_flag: cards.filter((card) => card.publishable_count > 0).length,
  cards_with_any_app_visible_flag: cards.filter((card) => card.app_visible_count > 0).length,
  cards_with_any_market_truth_flag: cards.filter((card) => card.market_truth_count > 0).length,
  evidence_bucket_counts: bucketCounts,
  top_evidence_cards: cards
    .sort((left, right) => right.evidence_count - left.evidence_count)
    .slice(0, 20)
    .map((card) => ({
      card_print_id: card.card_print_id,
      sample_gv_id: card.sample_gv_id,
      evidence_count: card.evidence_count,
      reference_evidence_count: card.reference_evidence_count,
      active_listing_evidence_count: card.active_listing_evidence_count,
      rollup_eligible_count: card.rollup_eligible_count,
      internal_rollup_candidate: card.internal_rollup_candidate,
    })),
};

const findings = [];
if (audit.cards_with_any_publishable_flag !== 0) findings.push("publishable_flags_present");
if (audit.cards_with_any_app_visible_flag !== 0) findings.push("app_visible_flags_present");
if (audit.cards_with_any_market_truth_flag !== 0) findings.push("market_truth_flags_present");
if (observations.length !== finalEvents.length) findings.push("observation_final_event_count_mismatch");

const reportPayload = { audit, readModelCandidates, findings };
const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_read_model",
  package_fingerprint_sha256: sha256(reportPayload),
  audit,
  read_model_candidates: readModelCandidates,
  sql_candidate: "docs/sql/mee_core_internal_evidence_read_model_v1_view_candidates.sql",
  findings,
  boundary_proof: {
    db_writes: false,
    remote_migration_apply: false,
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
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });
writeFileSync(path.join(SQL_DIR, "mee_core_internal_evidence_read_model_v1_view_candidates.sql"), viewCandidateSql);
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, "MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1.md"), renderMarkdown(report));
writeFileSync(
  path.join(PLAN_DIR, "MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1.md"),
  [
    "# MEE Core Internal Evidence Read Model V1",
    "",
    "Status: plan only",
    "",
    "## Objective",
    "",
    "Create internal-only card-level evidence read models on top of completed lifecycle data. These models summarize evidence coverage, source mix, review burden, lifecycle flags, and internal rollup candidacy without creating public pricing.",
    "",
    "## Proposed Objects",
    "",
    "- `v_market_evidence_card_signal_summary_v1`",
    "- `v_market_evidence_card_review_queue_v1`",
    "",
    "## Boundaries",
    "",
    "No remote migration apply, DB writes, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public price rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.",
    "",
    "## SQL Candidate",
    "",
    "`docs/sql/mee_core_internal_evidence_read_model_v1_view_candidates.sql`",
    "",
  ].join("\n"),
);

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  findings: report.findings,
  audit: report.audit,
  artifacts: {
    report_json: "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1/report.json",
    report_md: "docs/audits/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1.md",
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1.md",
    sql_candidate: "docs/sql/mee_core_internal_evidence_read_model_v1_view_candidates.sql",
  },
}, null, 2));
