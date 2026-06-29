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
const PACKAGE_ID = "MEE-PRICE-CANDIDATE-REVIEW-SAMPLE-V1";
const OUT_DIR = path.join(AUDIT_ROOT, PACKAGE_ID);
const MD_PATH = path.join(AUDIT_ROOT, `${PACKAGE_ID}.md`);
const JSON_PATH = path.join(OUT_DIR, "report.json");

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

function asNumber(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value) {
  const parsed = asNumber(value);
  if (parsed === null) return "";
  return parsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function titleSamples(payload) {
  const samples = Array.isArray(payload?.sample_titles) ? payload.sample_titles : [];
  return samples.slice(0, 5).map((sample) => ({
    title: String(sample.title ?? "").slice(0, 220),
    condition_text: sample.condition_text ?? null,
    total_ask_price: asNumber(sample.total_ask_price),
  }));
}

function normalizedToken(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countTitleNameMatches(row) {
  const expected = normalizedToken(row.card_name);
  if (!expected) return 0;
  return titleSamples(row.candidate_payload).filter((sample) => normalizedToken(sample.title).includes(expected)).length;
}

function qualityFlags(row) {
  const flags = [];
  const low = asNumber(row.candidate_low);
  const high = asNumber(row.candidate_high);
  const median = asNumber(row.candidate_median);
  const evidenceCount = Number(row.evidence_count ?? 0);
  const sellerCount = Number(row.seller_count ?? 0);
  const matchCount = countTitleNameMatches(row);
  const samples = titleSamples(row.candidate_payload);

  if (low && high && high / low >= 20) flags.push("wide_price_spread");
  if (evidenceCount < 5) flags.push("thin_evidence");
  if (sellerCount < 3) flags.push("low_seller_diversity");
  if (samples.length > 0 && matchCount < Math.ceil(samples.length / 2)) flags.push("sample_title_name_mismatch");
  if (row.evidence_lane === "raw_single" && median !== null && median >= 250) flags.push("raw_single_high_value_manual_review");
  if (row.evidence_lane === "slab" && median !== null && median >= 1000) flags.push("slab_high_value_manual_review");
  if (String(row.gv_id ?? "").includes("-WCD-")) flags.push("world_championship_special_lane");
  if (String(row.gv_id ?? "").includes("-MCD-")) flags.push("mcdonalds_special_lane");
  if (String(row.gv_id ?? "").includes("FIRST-EDITION") || String(row.gv_id ?? "").includes("SHADOWLESS") || String(row.gv_id ?? "").includes("1999-2000")) {
    flags.push("base_print_run_special_lane");
  }

  return flags;
}

function recommendation(row) {
  const flags = qualityFlags(row);
  const evidenceCount = Number(row.evidence_count ?? 0);
  const sellerCount = Number(row.seller_count ?? 0);

  if (flags.includes("sample_title_name_mismatch")) return "hold_for_matcher_review";
  if (flags.some((flag) => flag.endsWith("_special_lane"))) return "hold_for_special_lane_policy";
  if (flags.some((flag) => flag.endsWith("_manual_review"))) return "manual_high_value_review";
  if (flags.includes("wide_price_spread")) return "hold_for_outlier_review";
  if (evidenceCount >= 8 && sellerCount >= 4) return "ready_for_internal_policy_review";
  return "needs_more_evidence";
}

function enrichRows(rows) {
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    card_name: row.card_name,
    set_code: row.set_code,
    number: row.number,
    rarity: row.rarity,
    review_queue: row.review_queue,
    source_type: row.source_type,
    evidence_lane: row.evidence_lane,
    confidence_tier: row.confidence_tier,
    candidate_status: row.candidate_status,
    currency: row.currency,
    candidate_median: asNumber(row.candidate_median),
    candidate_low: asNumber(row.candidate_low),
    candidate_high: asNumber(row.candidate_high),
    minimum_active_ask: asNumber(row.minimum_active_ask),
    maximum_active_ask: asNumber(row.maximum_active_ask),
    evidence_count: row.evidence_count,
    seller_count: row.seller_count,
    signal_at: row.signal_at,
    quality_flags: qualityFlags(row),
    review_recommendation: recommendation(row),
    sample_titles: titleSamples(row.candidate_payload),
  }));
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

const candidateSelect = `
  select
    q.card_print_id,
    q.gv_id,
    cp.name as card_name,
    cp.set_code,
    cp.number,
    cp.rarity,
    q.review_queue,
    q.source_type,
    q.evidence_lane,
    q.confidence_tier,
    q.candidate_status,
    q.currency,
    q.candidate_median,
    q.candidate_low,
    q.candidate_high,
    q.minimum_active_ask,
    q.maximum_active_ask,
    q.evidence_count,
    q.seller_count,
    q.signal_at,
    q.candidate_payload
  from public.v_market_evidence_price_candidate_review_queue_v1 q
  left join public.card_prints cp on cp.id = q.card_print_id
`;

async function main() {
  const readback = await withClient(async (client) => {
    const overview = await client.query(`
        select
          count(*)::int as total_rows,
          count(*) filter (where reviewer_candidate)::int as reviewer_candidate_rows,
          count(*) filter (where source_type = 'active_listing')::int as active_listing_rows,
          count(*) filter (where source_type = 'reference')::int as reference_rows,
          count(*) filter (where evidence_lane = 'raw_single')::int as raw_single_rows,
          count(*) filter (where evidence_lane = 'slab')::int as slab_rows,
          count(*) filter (where review_queue in ('raw_single_high_value_review', 'slab_high_value_review'))::int as high_value_manual_queue_rows,
          (select count(*)::int from public.v_market_evidence_price_candidate_high_value_review_v1) as high_value_review_rows
        from public.v_market_evidence_price_candidate_review_queue_v1;
      `);
    const queueSummary = await client.query(`
        select *
        from public.v_market_evidence_price_candidate_review_summary_v1
        order by review_queue, source_type, evidence_lane, confidence_tier, candidate_status;
      `);
    const rawSingleReady = await client.query(`
        ${candidateSelect}
        where q.review_queue = 'raw_single_ready_review'
        order by q.evidence_count desc, q.seller_count desc, q.candidate_median desc nulls last
        limit 40;
      `);
    const rawSingleHighValue = await client.query(`
        ${candidateSelect}
        where q.review_queue = 'raw_single_high_value_review'
        order by q.candidate_median desc nulls last, q.evidence_count desc
        limit 40;
      `);
    const slabReady = await client.query(`
        ${candidateSelect}
        where q.review_queue = 'slab_ready_review'
        order by q.evidence_count desc, q.seller_count desc, q.candidate_median desc nulls last
        limit 40;
      `);
    const slabHighValue = await client.query(`
        ${candidateSelect}
        where q.review_queue = 'slab_high_value_review'
        order by q.candidate_median desc nulls last, q.evidence_count desc
        limit 40;
      `);
    const mismatchRisk = await client.query(`
        ${candidateSelect}
        where q.reviewer_candidate
        order by
          case when q.candidate_low::numeric > 0 then q.candidate_high::numeric / q.candidate_low::numeric else 999999 end desc nulls last,
          q.candidate_median desc nulls last
        limit 40;
      `);
    const publicBoundary = await client.query(`
        select
          count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
          count(*) filter (where publishable)::int as publishable_rows,
          count(*) filter (where app_visible)::int as app_visible_rows,
          count(*) filter (where market_truth)::int as market_truth_rows
        from public.v_market_evidence_price_candidate_review_queue_v1;
      `);

    return {
      overview: overview.rows[0],
      queue_summary: queueSummary.rows,
      raw_single_ready_samples: enrichRows(rawSingleReady.rows),
      raw_single_high_value_samples: enrichRows(rawSingleHighValue.rows),
      slab_ready_samples: enrichRows(slabReady.rows),
      slab_high_value_samples: enrichRows(slabHighValue.rows),
      spread_risk_samples: enrichRows(mismatchRisk.rows),
      public_boundary: publicBoundary.rows[0],
    };
  });

  const report = {
    package_id: PACKAGE_ID,
    mode: "read_only_internal_price_candidate_review_sample",
    generated_at: new Date().toISOString(),
    readback,
    boundary: {
      db_writes: false,
      provider_calls: false,
      source_fetches: false,
      function_invocation: false,
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
    findings: [
      "Reviewer candidates are internal price candidates only; none are publishable or app-visible.",
      "High-value rows remain manual-review lanes, separated for raw singles and slabs.",
      "Sample-title and spread-risk flags show why active-listing evidence still requires gated review before public pricing.",
    ],
  };
  report.package_fingerprint_sha256 = sha256(report);

  const columns = [
    { label: "GV ID", value: (row) => row.gv_id },
    { label: "Card", value: (row) => `${row.card_name ?? ""} ${row.number ? `#${row.number}` : ""}`.trim() },
    { label: "Lane", value: (row) => row.evidence_lane },
    { label: "Median", value: (row) => money(row.candidate_median) },
    { label: "Evidence", value: (row) => row.evidence_count },
    { label: "Sellers", value: (row) => row.seller_count },
    { label: "Recommendation", value: (row) => row.review_recommendation },
    { label: "Flags", value: (row) => row.quality_flags.join(", ") },
  ];

  const markdown = `# ${PACKAGE_ID}

Generated: ${report.generated_at}

## Purpose

This is an internal-only sample/export over \`v_market_evidence_price_candidate_review_queue_v1\`.
It shows which price candidates look reviewable, which are high-value manual-review lanes, and which rows have quality warnings before any publication policy exists.

It does not publish pricing, write pricing observations, update \`ebay_active_prices_latest\`, or create app-visible prices.

## Overview

| Metric | Count |
| --- | ---: |
| Total queue rows | ${readback.overview.total_rows} |
| Reviewer candidate rows | ${readback.overview.reviewer_candidate_rows} |
| Active listing rows | ${readback.overview.active_listing_rows} |
| Reference rows | ${readback.overview.reference_rows} |
| Raw single rows | ${readback.overview.raw_single_rows} |
| Slab rows | ${readback.overview.slab_rows} |
| High-value manual queue rows | ${readback.overview.high_value_manual_queue_rows} |
| Broader high-value review rows | ${readback.overview.high_value_review_rows} |

Public-boundary proof: can_publish_price_directly=${readback.public_boundary.can_publish_price_directly_rows}, publishable=${readback.public_boundary.publishable_rows}, app_visible=${readback.public_boundary.app_visible_rows}, market_truth=${readback.public_boundary.market_truth_rows}.

## Queue Summary

${renderTable(readback.queue_summary, [
  { label: "Queue", value: (row) => row.review_queue },
  { label: "Source", value: (row) => row.source_type },
  { label: "Lane", value: (row) => row.evidence_lane },
  { label: "Status", value: (row) => row.candidate_status },
  { label: "Rows", value: (row) => row.candidate_count },
  { label: "Median", value: (row) => money(row.median_candidate_median) },
  { label: "Reviewer", value: (row) => row.reviewer_candidate_count },
])}

## Raw Single Ready Samples

${renderTable(readback.raw_single_ready_samples.slice(0, 20), columns)}

## Raw Single High-Value Samples

${renderTable(readback.raw_single_high_value_samples.slice(0, 20), columns)}

## Slab Ready Samples

${renderTable(readback.slab_ready_samples.slice(0, 20), columns)}

## Slab High-Value Samples

${renderTable(readback.slab_high_value_samples.slice(0, 20), columns)}

## Spread And Matcher Risk Samples

${renderTable(readback.spread_risk_samples.slice(0, 20), columns)}

## Boundary

No DB writes, provider calls, source fetches, public pricing views, app-visible pricing, public rollups, identity writes, vault writes, image writes, deletes, upserts, merges, migrations, or global apply were performed.

JSON report: \`${rel(JSON_PATH)}\`

Package fingerprint: \`${report.package_fingerprint_sha256}\`
`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(MD_PATH, markdown);

  console.log(
    JSON.stringify(
      {
        package_id: PACKAGE_ID,
        markdown: rel(MD_PATH),
        json: rel(JSON_PATH),
        total_rows: readback.overview.total_rows,
        reviewer_candidate_rows: readback.overview.reviewer_candidate_rows,
        high_value_manual_queue_rows: readback.overview.high_value_manual_queue_rows,
        high_value_review_rows: readback.overview.high_value_review_rows,
        public_boundary: readback.public_boundary,
        package_fingerprint_sha256: report.package_fingerprint_sha256,
      },
      null,
      2,
    ),
  );
}

await main();
