import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import "../../backend/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_ROOT = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PACKAGE_ID = "MEE-PRICE-PUBLICATION-POLICY-V1";
const OUT_DIR = path.join(AUDIT_ROOT, PACKAGE_ID);

const paths = {
  contract: path.join(REPO_ROOT, "docs", "contracts", "MEE_PRICE_PUBLICATION_POLICY_V1.md"),
  plan: path.join(REPO_ROOT, "docs", "plans", "market_evidence_engine_v1", "MEE_PRICE_PUBLICATION_POLICY_V1.md"),
  checkpoint: path.join(REPO_ROOT, "docs", "checkpoints", "market_evidence_engine", "MEE_PRICE_PUBLICATION_POLICY_V1.md"),
  viewSql: path.join(REPO_ROOT, "docs", "sql", "mee_price_publication_policy_v1_view_candidate.sql"),
  readbackSql: path.join(REPO_ROOT, "docs", "sql", "mee_price_publication_policy_v1_readback.sql"),
  reportJson: path.join(OUT_DIR, "report.json"),
  reportMd: path.join(AUDIT_ROOT, `${PACKAGE_ID}.md`),
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

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function renderTable(rows, columns) {
  if (!rows.length) return "_No rows._";
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

async function withClient(fn) {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL or DATABASE_URL is required.");
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const policySql = `-- MEE-PRICE-PUBLICATION-POLICY-V1 local SQL/view candidate.
-- Internal-only price publication policy evaluator.
-- Plan-only: do not apply remotely without a separate targeted schema approval.
-- This view does not publish pricing and does not create market truth.

create or replace view public.v_market_evidence_price_publication_policy_v1
with (security_invoker = true)
as
with review_dispositions as (
  select
    card_print_id,
    count(*) filter (where review_status in ('pending', 'in_review', 'blocked'))::int as unresolved_review_rows,
    count(*) filter (where review_disposition = 'review_confirmed_internal_candidate')::int as confirmed_internal_candidate_rows,
    coalesce(
      jsonb_agg(
        distinct jsonb_build_object(
          'review_lane', review_lane,
          'evidence_lane', evidence_lane,
          'review_status', review_status,
          'review_disposition', review_disposition
        )
      ) filter (where review_status in ('pending', 'in_review', 'blocked')),
      '[]'::jsonb
    ) as unresolved_review_summary
  from public.market_evidence_review_dispositions
  group by card_print_id
), evaluated as (
  select
    q.card_print_id,
    q.gv_id,
    q.source,
    q.source_type,
    q.evidence_lane,
    q.rollup_version,
    q.source_rollup_id,
    q.currency,
    q.candidate_median,
    q.candidate_low,
    q.candidate_high,
    q.minimum_active_ask,
    q.maximum_active_ask,
    q.evidence_count,
    q.seller_count,
    q.source_count,
    q.signal_at,
    q.confidence_tier,
    q.candidate_status,
    q.review_queue,
    q.reviewer_candidate,
    q.candidate_payload,
    coalesce(rd.unresolved_review_rows, 0) as unresolved_review_rows,
    coalesce(rd.confirmed_internal_candidate_rows, 0) as confirmed_internal_candidate_rows,
    coalesce(rd.unresolved_review_summary, '[]'::jsonb) as unresolved_review_summary,
    case
      when q.can_publish_price_directly or q.publishable or q.app_visible or q.market_truth
        then 'blocked_public_boundary'
      when q.source_type = 'reference'
        then 'hold_reference_context_only'
      when q.source_type <> 'active_listing'
        then 'blocked_unknown_source_type'
      when q.confidence_tier <> 'high_confidence'
        then 'defer_more_evidence'
      when q.candidate_status <> 'internal_candidate'
        then 'defer_review'
      when q.evidence_lane not in ('raw_single', 'slab')
        then 'blocked_lane_unknown'
      when q.gv_id like '%-WCD-%'
        or q.gv_id like '%-MCD-%'
        or q.gv_id like '%-TK-%'
        or q.gv_id like '%-MEP-%'
        or q.gv_id like '%-PR-%'
        or q.gv_id like '%FIRST-EDITION%'
        or q.gv_id like '%SHADOWLESS%'
        or q.gv_id like '%1999-2000%'
        then 'hold_special_lane_policy'
      when q.evidence_lane = 'slab'
        then 'hold_slab_grade_policy'
      when q.evidence_lane = 'raw_single' and q.candidate_median >= 250
        then 'hold_high_value_manual_review'
      when q.candidate_low is not null
       and q.candidate_high is not null
       and q.candidate_low > 0
       and q.candidate_high / q.candidate_low >= 20
        then 'hold_outlier_review'
      when q.evidence_lane = 'raw_single' and q.evidence_count >= 20 and q.seller_count >= 8
        then 'raw_single_policy_candidate'
      when q.evidence_lane = 'raw_single' and q.evidence_count >= 8 and q.seller_count >= 4
        then 'raw_single_review_candidate'
      else 'defer_more_evidence'
    end as price_policy_decision
  from public.v_market_evidence_price_candidate_review_queue_v1 q
  left join review_dispositions rd
    on rd.card_print_id = q.card_print_id
)
select
  card_print_id,
  gv_id,
  source,
  source_type,
  evidence_lane,
  rollup_version,
  source_rollup_id,
  currency,
  candidate_median,
  candidate_low,
  candidate_high,
  minimum_active_ask,
  maximum_active_ask,
  evidence_count,
  seller_count,
  source_count,
  signal_at,
  confidence_tier,
  candidate_status,
  review_queue,
  reviewer_candidate,
  candidate_payload,
  price_policy_decision,
  price_policy_decision in ('raw_single_policy_candidate', 'raw_single_review_candidate') as internal_price_policy_candidate,
  (
    price_policy_decision = 'raw_single_policy_candidate'
    and unresolved_review_rows = 0
    and evidence_lane = 'raw_single'
    and candidate_median < 100
    and (
      candidate_low is null
      or candidate_high is null
      or candidate_low <= 0
      or candidate_high / candidate_low < 10
    )
  ) as future_publication_review_candidate,
  true as internal_only,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth,
  unresolved_review_rows,
  confirmed_internal_candidate_rows,
  unresolved_review_summary
from evaluated;

revoke all on public.v_market_evidence_price_publication_policy_v1 from public, anon, authenticated, service_role;
grant select on public.v_market_evidence_price_publication_policy_v1 to service_role;
`;

const readbackSql = `-- MEE-PRICE-PUBLICATION-POLICY-V1 readback.
-- Read-only. Proves policy decisions and closed public boundary.

with policy as (
  select *
  from public.v_market_evidence_price_publication_policy_v1
), summary as (
  select
    price_policy_decision,
    source_type,
    evidence_lane,
    count(*)::int as rows,
    count(*) filter (where internal_price_policy_candidate)::int as internal_price_policy_candidate_rows,
    count(*) filter (where future_publication_review_candidate)::int as future_publication_review_candidate_rows,
    min(candidate_median) as min_candidate_median,
    percentile_cont(0.5) within group (order by candidate_median) filter (where candidate_median is not null) as median_candidate_median,
    max(candidate_median) as max_candidate_median
  from policy
  group by price_policy_decision, source_type, evidence_lane
), boundary as (
  select
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from policy
), samples as (
  select
    card_print_id,
    gv_id,
    source_type,
    evidence_lane,
    price_policy_decision,
    currency,
    candidate_median,
    candidate_low,
    candidate_high,
    evidence_count,
    seller_count,
    signal_at
  from policy
  where future_publication_review_candidate
  order by evidence_count desc, seller_count desc, candidate_median desc nulls last
  limit 50
)
select
  'MEE-PRICE-PUBLICATION-POLICY-V1'::text as package_id,
  (select count(*)::int from policy) as total_policy_rows,
  (select count(*)::int from policy where internal_price_policy_candidate) as internal_price_policy_candidate_rows,
  (select count(*)::int from policy where future_publication_review_candidate) as future_publication_review_candidate_rows,
  (select jsonb_agg(to_jsonb(summary) order by price_policy_decision, source_type, evidence_lane) from summary) as summary,
  (select to_jsonb(boundary) from boundary) as public_boundary,
  (select jsonb_agg(to_jsonb(samples) order by evidence_count desc, seller_count desc, candidate_median desc nulls last) from samples) as candidate_samples,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as public_pricing_view,
  false::boolean as app_visible_pricing,
  false::boolean as market_truth;
`;

function contractMarkdown() {
  return `# MEE Price Publication Policy V1

Status: plan-only

Date: 2026-06-29

## Objective

Define the first deterministic policy for moving internal Market Evidence Engine price candidates toward future publication review.

This is not public pricing. It does not publish prices, write app-visible prices, write \`pricing_observations\`, write \`ebay_active_prices_latest\`, or create market truth.

## Source Roles

Providers create evidence only:

- eBay active listings provide asking-price evidence, not sold-comparable truth.
- TCGCSV, PokemonTCG.io, TCGdex, and other free/reference APIs provide reference context only.
- No provider may set \`can_publish_price_directly\`, \`publishable\`, \`app_visible\`, or \`market_truth\`.

Grookai owns matching, classification, quality gates, lane separation, review decisions, and publication policy.

## Evidence Lanes

The policy keeps evidence lanes separate:

- \`raw_single\`: candidate raw-card asking-price evidence.
- \`slab\`: graded-card asking-price evidence, held until grade-specific policy exists.
- \`reference\`: context-only evidence; never publishable by itself.

Raw singles and slabs must never share a displayed median.

## Initial Policy Decisions

The candidate view may produce these internal decisions:

- \`raw_single_policy_candidate\`
- \`raw_single_review_candidate\`
- \`hold_slab_grade_policy\`
- \`hold_high_value_manual_review\`
- \`hold_special_lane_policy\`
- \`hold_outlier_review\`
- \`hold_reference_context_only\`
- \`defer_more_evidence\`
- \`defer_review\`
- \`blocked_public_boundary\`
- \`blocked_unknown_source_type\`
- \`blocked_lane_unknown\`

None of these decisions are app-visible prices.

## Candidate Thresholds

The first future-publication-review candidate is deliberately narrow:

| Lane | Required source type | Required status | Evidence count | Seller count | Price cap | Spread rule |
| --- | --- | --- | ---: | ---: | ---: | --- |
| raw_single | active_listing | high_confidence internal_candidate | >= 20 | >= 8 | < 250 USD median | candidate_high / candidate_low < 20 |

\`raw_single_review_candidate\` uses lower review thresholds, but does not qualify for future publication review:

| Lane | Evidence count | Seller count |
| --- | ---: | ---: |
| raw_single | >= 8 | >= 4 |

## Mandatory Holds

The policy holds these cases:

- all slab rows until grade-specific policy exists,
- all reference-only rows,
- all high-value raw single rows at or above 250 USD median,
- all wide-spread rows where candidate_high / candidate_low is 20 or more,
- World Championship, McDonald's, Trainer Kit, Base Set first edition, Shadowless, and 1999-2000 special lanes,
- any row with a public-boundary flag already set.

## Future Work

Before anything becomes app-visible, Grookai still needs a separate public pricing contract that writes a governed destination, preserves replay hashes, and defines user-facing display copy.
`;
}

function planMarkdown(report) {
  return `# MEE Price Publication Policy V1 Plan

Mode: plan-only

Generated: ${report.generated_at}

## What This Adds

- A local internal SQL view candidate: \`${rel(paths.viewSql)}\`
- A read-only readback query: \`${rel(paths.readbackSql)}\`
- A deterministic policy contract: \`${rel(paths.contract)}\`
- A checkpoint preserving why pricing remains non-public: \`${rel(paths.checkpoint)}\`

## Current Result

The policy finds ${report.readback.future_publication_review_candidate_rows} narrow raw-single future-publication-review candidates from ${report.readback.total_policy_rows} internal candidate rows.

These are not public prices. They are only the first rows that clear the initial narrow policy and can be reviewed by a future publication gate.

## Next Implementation Step

If this policy shape is accepted, the next safe implementation step is a targeted internal schema apply for \`v_market_evidence_price_publication_policy_v1\`, still service-role-only and still not app-visible.
`;
}

function checkpointMarkdown() {
  return `# MEE Price Publication Policy V1 Checkpoint

The pricing work drifted earlier toward acquisition coverage. This checkpoint keeps the current step focused on deterministic policy.

## What Changed

Grookai now has internal price candidates and review queues. This checkpoint defines which of those candidates may proceed toward future publication review.

## What Providers Can Do

Providers can contribute evidence. Active listings can contribute asking-price evidence. Reference APIs can contribute context.

## What Providers Cannot Do

Providers cannot create price truth, cannot directly publish prices, and cannot bypass Grookai lifecycle, matching, classification, quality, review, or publication gates.

## What Can Become Public Later

Only a future governed public pricing contract can make a price app-visible. That future layer must read policy-approved internal candidates, preserve replay evidence, and keep raw singles separate from slabs.

## What Cannot Become Public From This Contract

Reference-only evidence, slab evidence without grade policy, high-value evidence, special-lane evidence, wide-spread evidence, and any public-boundary leak cannot become public from this contract.
`;
}

async function runPolicyReadback() {
  return withClient(async (client) => {
    const policyCte = `
      with review_dispositions as (
        select
          card_print_id,
          count(*) filter (where review_status in ('pending', 'in_review', 'blocked'))::int as unresolved_review_rows,
          count(*) filter (where review_disposition = 'review_confirmed_internal_candidate')::int as confirmed_internal_candidate_rows,
          coalesce(
            jsonb_agg(
              distinct jsonb_build_object(
                'review_lane', review_lane,
                'evidence_lane', evidence_lane,
                'review_status', review_status,
                'review_disposition', review_disposition
              )
            ) filter (where review_status in ('pending', 'in_review', 'blocked')),
            '[]'::jsonb
          ) as unresolved_review_summary
        from public.market_evidence_review_dispositions
        group by card_print_id
      ), evaluated as (
        select
          q.card_print_id,
          q.gv_id,
          q.source,
          q.source_type,
          q.evidence_lane,
          q.rollup_version,
          q.source_rollup_id,
          q.currency,
          q.candidate_median::numeric as candidate_median,
          q.candidate_low::numeric as candidate_low,
          q.candidate_high::numeric as candidate_high,
          q.minimum_active_ask::numeric as minimum_active_ask,
          q.maximum_active_ask::numeric as maximum_active_ask,
          q.evidence_count,
          q.seller_count,
          q.source_count,
          q.signal_at,
          q.confidence_tier,
          q.candidate_status,
          q.review_queue,
          q.reviewer_candidate,
          q.candidate_payload,
          coalesce(rd.unresolved_review_rows, 0) as unresolved_review_rows,
          coalesce(rd.confirmed_internal_candidate_rows, 0) as confirmed_internal_candidate_rows,
          coalesce(rd.unresolved_review_summary, '[]'::jsonb) as unresolved_review_summary,
          case
            when q.can_publish_price_directly or q.publishable or q.app_visible or q.market_truth
              then 'blocked_public_boundary'
            when q.source_type = 'reference'
              then 'hold_reference_context_only'
            when q.source_type <> 'active_listing'
              then 'blocked_unknown_source_type'
            when q.confidence_tier <> 'high_confidence'
              then 'defer_more_evidence'
            when q.candidate_status <> 'internal_candidate'
              then 'defer_review'
            when q.evidence_lane not in ('raw_single', 'slab')
              then 'blocked_lane_unknown'
            when q.gv_id like '%-WCD-%'
              or q.gv_id like '%-MCD-%'
              or q.gv_id like '%-TK-%'
              or q.gv_id like '%-MEP-%'
              or q.gv_id like '%-PR-%'
              or q.gv_id like '%FIRST-EDITION%'
              or q.gv_id like '%SHADOWLESS%'
              or q.gv_id like '%1999-2000%'
              then 'hold_special_lane_policy'
            when q.evidence_lane = 'slab'
              then 'hold_slab_grade_policy'
            when q.evidence_lane = 'raw_single' and q.candidate_median >= 250
              then 'hold_high_value_manual_review'
            when q.candidate_low is not null
             and q.candidate_high is not null
             and q.candidate_low > 0
             and q.candidate_high / q.candidate_low >= 20
              then 'hold_outlier_review'
            when q.evidence_lane = 'raw_single' and q.evidence_count >= 20 and q.seller_count >= 8
              then 'raw_single_policy_candidate'
            when q.evidence_lane = 'raw_single' and q.evidence_count >= 8 and q.seller_count >= 4
              then 'raw_single_review_candidate'
            else 'defer_more_evidence'
          end as price_policy_decision,
          false as can_publish_price_directly,
          false as publishable,
          false as app_visible,
          false as market_truth
        from public.v_market_evidence_price_candidate_review_queue_v1 q
        left join review_dispositions rd
          on rd.card_print_id = q.card_print_id
      )
    `;
    const readback = await client.query(`
      ${policyCte}, policy as (
        select
          *,
          price_policy_decision in ('raw_single_policy_candidate', 'raw_single_review_candidate') as internal_price_policy_candidate,
          (
            price_policy_decision = 'raw_single_policy_candidate'
            and unresolved_review_rows = 0
            and evidence_lane = 'raw_single'
            and candidate_median < 100
            and (
              candidate_low is null
              or candidate_high is null
              or candidate_low <= 0
              or candidate_high / candidate_low < 10
            )
          ) as future_publication_review_candidate
        from evaluated
      ), summary as (
        select
          price_policy_decision,
          source_type,
          evidence_lane,
          count(*)::int as rows,
          count(*) filter (where internal_price_policy_candidate)::int as internal_price_policy_candidate_rows,
          count(*) filter (where future_publication_review_candidate)::int as future_publication_review_candidate_rows,
          min(candidate_median) as min_candidate_median,
          percentile_cont(0.5) within group (order by candidate_median) filter (where candidate_median is not null) as median_candidate_median,
          max(candidate_median) as max_candidate_median
        from policy
        group by price_policy_decision, source_type, evidence_lane
      ), boundary as (
        select
          count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
          count(*) filter (where publishable)::int as publishable_rows,
          count(*) filter (where app_visible)::int as app_visible_rows,
          count(*) filter (where market_truth)::int as market_truth_rows
        from policy
      ), samples as (
        select
          card_print_id,
          gv_id,
          source_type,
          evidence_lane,
          price_policy_decision,
          currency,
          candidate_median,
          candidate_low,
          candidate_high,
          evidence_count,
          seller_count,
          signal_at
        from policy
        where future_publication_review_candidate
        order by evidence_count desc, seller_count desc, candidate_median desc nulls last
        limit 50
      )
      select
        (select count(*)::int from policy) as total_policy_rows,
        (select count(*)::int from policy where internal_price_policy_candidate) as internal_price_policy_candidate_rows,
        (select count(*)::int from policy where future_publication_review_candidate) as future_publication_review_candidate_rows,
        (select jsonb_agg(to_jsonb(summary) order by price_policy_decision, source_type, evidence_lane) from summary) as summary,
        (select to_jsonb(boundary) from boundary) as public_boundary,
        (select jsonb_agg(to_jsonb(samples) order by evidence_count desc, seller_count desc, candidate_median desc nulls last) from samples) as candidate_samples;
    `);
    return readback.rows[0];
  });
}

async function main() {
  const readback = await runPolicyReadback();
  const generatedAt = new Date().toISOString();
  const report = {
    package_id: PACKAGE_ID,
    mode: "plan_only_internal_price_publication_policy",
    generated_at: generatedAt,
    remote_migration_apply: false,
    db_writes: false,
    provider_calls: false,
    source_fetches: false,
    function_invocation: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    boundary: {
      can_publish_price_directly: false,
      publishable: false,
      app_visible: false,
      market_truth: false,
    },
    proposed_objects: ["public.v_market_evidence_price_publication_policy_v1"],
    readback,
    findings: [],
  };
  report.hashes = {
    contract_sha256: sha256(contractMarkdown()),
    view_sql_sha256: sha256(policySql),
    readback_sql_sha256: sha256(readbackSql),
  };
  report.package_fingerprint_sha256 = sha256(report);

  const md = `# ${PACKAGE_ID}

Mode: plan-only

Generated: ${generatedAt}

## Purpose

Define the first deterministic internal policy that decides which internal price candidates may advance toward future publication review.

This does not publish pricing and does not write any public pricing destination.

## Current Policy Readback

| Metric | Count |
| --- | ---: |
| Total policy rows | ${readback.total_policy_rows} |
| Internal price policy candidates | ${readback.internal_price_policy_candidate_rows} |
| Future publication review candidates | ${readback.future_publication_review_candidate_rows} |

Public-boundary proof: can_publish_price_directly=${readback.public_boundary.can_publish_price_directly_rows}, publishable=${readback.public_boundary.publishable_rows}, app_visible=${readback.public_boundary.app_visible_rows}, market_truth=${readback.public_boundary.market_truth_rows}.

## Decision Summary

${renderTable(readback.summary, [
  { label: "Decision", value: (row) => row.price_policy_decision },
  { label: "Source", value: (row) => row.source_type },
  { label: "Lane", value: (row) => row.evidence_lane },
  { label: "Rows", value: (row) => row.rows },
  { label: "Internal Candidates", value: (row) => row.internal_price_policy_candidate_rows },
  { label: "Future Review", value: (row) => row.future_publication_review_candidate_rows },
  { label: "Median", value: (row) => row.median_candidate_median },
])}

## Candidate Samples

${renderTable(readback.candidate_samples ?? [], [
  { label: "GV ID", value: (row) => row.gv_id },
  { label: "Lane", value: (row) => row.evidence_lane },
  { label: "Median", value: (row) => row.candidate_median },
  { label: "Evidence", value: (row) => row.evidence_count },
  { label: "Sellers", value: (row) => row.seller_count },
])}

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, function invocation, public pricing views, app-visible pricing, public rollups, identity writes, vault writes, image writes, deletes, upserts, merges, or global apply were performed.

Package fingerprint: \`${report.package_fingerprint_sha256}\`
`;

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(path.dirname(paths.contract), { recursive: true });
  mkdirSync(path.dirname(paths.plan), { recursive: true });
  mkdirSync(path.dirname(paths.checkpoint), { recursive: true });
  mkdirSync(path.dirname(paths.viewSql), { recursive: true });

  writeFileSync(paths.contract, contractMarkdown());
  writeFileSync(paths.plan, planMarkdown(report));
  writeFileSync(paths.checkpoint, checkpointMarkdown());
  writeFileSync(paths.viewSql, policySql);
  writeFileSync(paths.readbackSql, readbackSql);
  writeFileSync(paths.reportJson, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(paths.reportMd, md);

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    report: rel(paths.reportJson),
    markdown: rel(paths.reportMd),
    total_policy_rows: readback.total_policy_rows,
    internal_price_policy_candidate_rows: readback.internal_price_policy_candidate_rows,
    future_publication_review_candidate_rows: readback.future_publication_review_candidate_rows,
    public_boundary: readback.public_boundary,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
  }, null, 2));
}

await main();
