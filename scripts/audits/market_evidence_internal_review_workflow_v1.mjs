import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PACKAGE_ID = "MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const ARTIFACT_DIR = path.join(AUDIT_DIR, PACKAGE_ID);
const PLAN_DIR = path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1");
const CONTRACT_DIR = path.join(REPO_ROOT, "docs", "contracts");
const SQL_DIR = path.join(REPO_ROOT, "docs", "sql");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function supabaseReadOnlyQuery(sql) {
  const output = execFileSync("supabase", ["db", "query", "--linked", sql], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Could not parse Supabase query JSON output: ${output.slice(0, 500)}`);
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)).rows ?? [];
}

const reviewWorkflow = {
  review_lanes: {
    high_signal_review: {
      meaning: "Strongest internal review queue: enough rollup-eligible evidence and at least two source families in the current read model.",
      default_disposition: "review_pending_high_signal",
      allowed_dispositions: ["review_confirmed_internal_candidate", "review_split_required", "review_blocked", "review_defer_more_evidence"],
      future_publication_handoff: "May become a publication-gate candidate only under a separate publication contract after lane separation, source independence, recency, and blocker checks pass.",
    },
    candidate_review: {
      meaning: "Basic internal rollup candidate: at least three rollup-eligible rows, but not enough independent signal for high-signal treatment.",
      default_disposition: "review_pending_candidate",
      allowed_dispositions: ["review_confirmed_internal_candidate", "review_split_required", "review_blocked", "review_defer_more_evidence"],
      future_publication_handoff: "Cannot publish directly; may feed future publication-gate backlog after additional evidence or manual confirmation.",
    },
    classification_review: {
      meaning: "Large active-listing evidence pool with zero rollup-eligible rows. This means classification or quality gates are blocking, not that price is ready.",
      default_disposition: "review_pending_classification_fix",
      allowed_dispositions: ["review_reclassify", "review_blocked_classification", "review_split_required", "review_defer_more_evidence"],
      future_publication_handoff: "Blocked from publication until classifier/quality-gate issues are resolved in a separate apply package.",
    },
    reference_only_review: {
      meaning: "Reference evidence exists without active-listing corroboration.",
      default_disposition: "review_pending_reference_only",
      allowed_dispositions: ["review_reference_crosscheck", "review_defer_active_market_evidence", "review_blocked"],
      future_publication_handoff: "Reference-only cards cannot become market truth or public pricing under this workflow.",
    },
    low_signal_monitor: {
      meaning: "Evidence is present but currently too thin for internal price review.",
      default_disposition: "monitor_only",
      allowed_dispositions: ["monitor_only", "review_defer_more_evidence", "review_blocked"],
      future_publication_handoff: "No publication handoff.",
    },
  },
  evidence_thresholds: {
    minimum_internal_candidate_rollup_eligible_count: 3,
    high_signal_rollup_eligible_count: 10,
    high_signal_source_family_count: 2,
    classification_review_active_listing_count: 25,
    publication_gate_minimums_are_out_of_scope: true,
  },
  separation_rules: [
    "raw_single_count and slab_count must never be combined into one public-facing price.",
    "reference_metric_count may support review but cannot publish without independent publication-gate approval.",
    "active_listing evidence is asking-price evidence only and cannot be treated as sold value.",
    "mixed raw/slab evidence requires review_split_required before any future publication gate can inspect it.",
    "special card lanes, print-run lanes, signatures, stamps, and deck replicas require lane-specific review evidence.",
  ],
  hard_blockers: [
    "publishable_count > 0 inside internal read models",
    "app_visible_count > 0 inside internal read models",
    "market_truth_count > 0 inside internal read models",
    "wrong identity or unresolved match ambiguity",
    "bulk/lot/sealed/proxy/custom evidence used as a raw-single card signal",
    "slab evidence mixed into raw-single medians",
    "reference-only evidence being treated as market truth",
    "active asking price being labeled as sold value",
  ],
};

const readbackSql = `-- MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1 readback query candidates.
-- Internal review workflow only. No writes, no public pricing, no app-visible pricing.

select
  review_lane,
  count(*)::int as card_count,
  sum(evidence_count)::int as evidence_count,
  sum(rollup_eligible_count)::int as rollup_eligible_count,
  sum(reference_evidence_count)::int as reference_evidence_count,
  sum(active_listing_evidence_count)::int as active_listing_evidence_count,
  sum(raw_single_count)::int as raw_single_count,
  sum(slab_count)::int as slab_count,
  count(*) filter (where internal_rollup_candidate)::int as internal_rollup_candidate_count,
  sum(publishable_count)::int as publishable_count,
  sum(app_visible_count)::int as app_visible_count,
  sum(market_truth_count)::int as market_truth_count
from public.v_market_evidence_card_review_queue_v1
group by review_lane
order by card_count desc, review_lane;

select
  count(*)::int as card_signal_rows,
  count(*) filter (where publishable_count > 0)::int as cards_with_publishable_flags,
  count(*) filter (where app_visible_count > 0)::int as cards_with_app_visible_flags,
  count(*) filter (where market_truth_count > 0)::int as cards_with_market_truth_flags,
  count(*) filter (where raw_single_count > 0 and slab_count > 0)::int as mixed_raw_slab_cards
from public.v_market_evidence_card_signal_summary_v1;
`;

function renderContract(report) {
  return `# MEE Core Internal Review Workflow V1

Status: plan only

## Objective

Define how Grookai reviews internal Market Evidence Engine card-level signals before any future publication gate can inspect them.

This is not a public pricing contract. It does not publish prices, write pricing tables, or change app-visible pricing.

## Review Lanes

${Object.entries(reviewWorkflow.review_lanes).map(([lane, def]) => `### ${lane}\n\n${def.meaning}\n\nDefault disposition: \`${def.default_disposition}\`\n\nAllowed dispositions: ${def.allowed_dispositions.map((d) => `\`${d}\``).join(", ")}\n\nFuture handoff: ${def.future_publication_handoff}`).join("\n\n")}

## Evidence Thresholds

- Minimum internal rollup candidate: ${reviewWorkflow.evidence_thresholds.minimum_internal_candidate_rollup_eligible_count} rollup-eligible rows.
- High-signal review: ${reviewWorkflow.evidence_thresholds.high_signal_rollup_eligible_count}+ rollup-eligible rows and ${reviewWorkflow.evidence_thresholds.high_signal_source_family_count}+ source families.
- Classification review: ${reviewWorkflow.evidence_thresholds.classification_review_active_listing_count}+ active-listing rows with zero rollup-eligible rows.
- Publication-gate minimums are explicitly out of scope.

## Separation Rules

${reviewWorkflow.separation_rules.map((rule) => `- ${rule}`).join("\n")}

## Hard Blockers

${reviewWorkflow.hard_blockers.map((rule) => `- ${rule}`).join("\n")}

## Current Audit Snapshot

- Cards in review queue: ${report.audit.card_count}
- Internal rollup candidate rows: ${report.audit.internal_rollup_candidate_rows}
- Mixed raw/slab rows requiring split review: ${report.audit.mixed_raw_slab_rows}
- Publishable rows: ${report.audit.publishable_rows}
- App-visible rows: ${report.audit.app_visible_rows}
- Market-truth rows: ${report.audit.market_truth_rows}

## Future Publication Handoff

A card can only be handed to a future publication gate as a candidate when:

- it remains internal-only in this workflow,
- no publishable/app-visible/market-truth flags are present,
- the review lane disposition is explicitly confirmed,
- raw-single and slab signals are separated,
- reference-only evidence is not treated as market truth,
- active listings are labeled as asking-price evidence only,
- the future publication contract supplies its own source, recency, outlier, and independence thresholds.
`;
}

function renderMarkdown(report) {
  return `# MEE Core Internal Review Workflow V1

Generated: ${report.generated_at}

Mode: plan only, local artifacts only

## Summary

- Package: \`${report.package_id}\`
- Fingerprint: \`${report.package_fingerprint_sha256}\`
- Cards in review queue: ${report.audit.card_count}
- Findings: ${report.findings.length}

## Lane Counts

${Object.entries(report.audit.lane_counts).map(([lane, count]) => `- ${lane}: ${count}`).join("\n")}

## Source Mix

\`\`\`json
${JSON.stringify(report.audit.source_mix, null, 2)}
\`\`\`

## Boundary Proof

\`\`\`json
${JSON.stringify(report.boundary_proof, null, 2)}
\`\`\`

## Findings

${report.findings.length ? report.findings.map((finding) => `- ${finding}`).join("\n") : "- none"}
`;
}

const laneSummaries = supabaseReadOnlyQuery(`
select
  review_lane,
  count(*)::int as card_count,
  sum(evidence_count)::int as evidence_count,
  sum(rollup_eligible_count)::int as rollup_eligible_count,
  sum(reference_evidence_count)::int as reference_evidence_count,
  sum(active_listing_evidence_count)::int as active_listing_evidence_count,
  sum(raw_single_count)::int as raw_single_count,
  sum(slab_count)::int as slab_count,
  count(*) filter (where internal_rollup_candidate)::int as internal_rollup_candidate_count,
  sum(publishable_count)::int as publishable_count,
  sum(app_visible_count)::int as app_visible_count,
  sum(market_truth_count)::int as market_truth_count
from public.v_market_evidence_card_review_queue_v1
group by review_lane
order by card_count desc, review_lane;
`);

const [flagSummary] = supabaseReadOnlyQuery(`
select
  count(*)::int as card_signal_rows,
  count(*) filter (where publishable_count > 0)::int as publishable_rows,
  count(*) filter (where app_visible_count > 0)::int as app_visible_rows,
  count(*) filter (where market_truth_count > 0)::int as market_truth_rows,
  count(*) filter (where raw_single_count > 0 and slab_count > 0)::int as mixed_raw_slab_rows,
  count(*) filter (where internal_rollup_candidate)::int as internal_rollup_candidate_rows
from public.v_market_evidence_card_signal_summary_v1;
`);

const [sourceMix] = supabaseReadOnlyQuery(`
select
  count(*) filter (where reference_evidence_count > 0 and active_listing_evidence_count > 0)::int as both_reference_and_active,
  count(*) filter (where reference_evidence_count > 0 and active_listing_evidence_count = 0)::int as reference_only,
  count(*) filter (where reference_evidence_count = 0 and active_listing_evidence_count > 0)::int as active_only,
  count(*) filter (where reference_evidence_count = 0 and active_listing_evidence_count = 0)::int as neither
from public.v_market_evidence_card_signal_summary_v1;
`);

const sampleRows = supabaseReadOnlyQuery(`
select
  card_print_id,
  sample_gv_id,
  review_lane,
  evidence_count,
  reference_evidence_count,
  active_listing_evidence_count,
  rollup_eligible_count,
  raw_single_count,
  slab_count,
  internal_rollup_candidate
from public.v_market_evidence_card_review_queue_v1
order by evidence_count desc, card_print_id
limit 25;
`);

const audit = {
  card_count: laneSummaries.reduce((sum, lane) => sum + Number(lane.card_count ?? 0), 0),
  lane_counts: Object.fromEntries(laneSummaries.map((lane) => [lane.review_lane, lane.card_count])),
  lane_summaries: laneSummaries,
  source_mix: sourceMix,
  internal_rollup_candidate_rows: flagSummary.internal_rollup_candidate_rows,
  mixed_raw_slab_rows: flagSummary.mixed_raw_slab_rows,
  publishable_rows: flagSummary.publishable_rows,
  app_visible_rows: flagSummary.app_visible_rows,
  market_truth_rows: flagSummary.market_truth_rows,
  sample_rows: sampleRows,
};
const findings = [];
if (audit.publishable_rows !== 0) findings.push("publishable_flags_present");
if (audit.app_visible_rows !== 0) findings.push("app_visible_flags_present");
if (audit.market_truth_rows !== 0) findings.push("market_truth_flags_present");
for (const lane of Object.keys(audit.lane_counts)) {
  if (!reviewWorkflow.review_lanes[lane]) findings.push(`unknown_review_lane:${lane}`);
}

const reportPayload = { audit, reviewWorkflow, findings };
const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "plan_only_internal_review_workflow",
  package_fingerprint_sha256: sha256(reportPayload),
  audit,
  review_workflow: reviewWorkflow,
  artifacts: {
    contract_md: "docs/contracts/MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md",
    audit_md: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1.md",
    report_json: "docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1/report.json",
    sql_readback: "docs/sql/mee_core_internal_review_workflow_v1_readback.sql",
    plan_md: "docs/plans/market_evidence_engine_v1/MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md",
  },
  findings,
  boundary_proof: {
    remote_migration_apply: false,
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
mkdirSync(PLAN_DIR, { recursive: true });
mkdirSync(CONTRACT_DIR, { recursive: true });
mkdirSync(SQL_DIR, { recursive: true });

writeFileSync(path.join(CONTRACT_DIR, "MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md"), renderContract(report));
writeFileSync(path.join(AUDIT_DIR, "MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1.md"), renderMarkdown(report));
writeFileSync(path.join(ARTIFACT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(SQL_DIR, "mee_core_internal_review_workflow_v1_readback.sql"), readbackSql);
writeFileSync(path.join(PLAN_DIR, "MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md"), `# MEE Core Internal Review Workflow V1\n\nStatus: plan only\n\n## Objective\n\nCreate the internal review workflow contract for the MEE read-model views.\n\n## Artifacts\n\n- \`docs/contracts/MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1.md\`\n- \`docs/sql/mee_core_internal_review_workflow_v1_readback.sql\`\n- \`docs/audits/market_evidence_engine_v1/MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1/report.json\`\n\n## Boundary\n\nNo remote migration apply, DB writes, provider calls, source fetches, public pricing, app-visible pricing, public price rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.\n`);

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  findings: report.findings,
  audit: report.audit,
  artifacts: report.artifacts,
}, null, 2));
