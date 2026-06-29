import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import "../../backend/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PACKAGE_ID = "MEE-PRICE-PUBLICATION-CANDIDATE-EXPORT-V1";
const AUDIT_ROOT = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const OUT_DIR = path.join(AUDIT_ROOT, PACKAGE_ID);
const JSON_PATH = path.join(OUT_DIR, "report.json");
const CSV_PATH = path.join(OUT_DIR, "future_publication_review_candidates.csv");
const MD_PATH = path.join(AUDIT_ROOT, `${PACKAGE_ID}.md`);

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

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
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
  const samples = titleSamples(row.candidate_payload);
  const matchCount = countTitleNameMatches(row);

  if (low && high && high / low >= 10) flags.push("moderate_price_spread");
  if (evidenceCount >= 100) flags.push("deep_evidence");
  if (sellerCount >= 25) flags.push("broad_seller_diversity");
  if (samples.length > 0 && matchCount < samples.length) flags.push("sample_title_partial_name_mismatch");
  if (median !== null && median >= 100) flags.push("upper_raw_single_review");
  if (String(row.gv_id ?? "").includes("-PR-")) flags.push("promo_lane");
  if (String(row.gv_id ?? "").includes("-MEP-")) flags.push("mega_evolution_promo_lane");
  return flags;
}

function reviewBand(row) {
  const median = asNumber(row.candidate_median) ?? 0;
  const evidenceCount = Number(row.evidence_count ?? 0);
  const sellerCount = Number(row.seller_count ?? 0);
  const flags = qualityFlags(row);

  if (flags.includes("sample_title_partial_name_mismatch")) return "review_title_samples";
  if (flags.includes("moderate_price_spread")) return "review_spread";
  if (median >= 100) return "review_upper_raw_single";
  if (evidenceCount >= 100 && sellerCount >= 25) return "strong_candidate";
  return "standard_candidate";
}

function enrichRows(rows) {
  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    card_name: row.card_name,
    set_code: row.set_code,
    printed_set_abbrev: row.printed_set_abbrev,
    number: row.number,
    rarity: row.rarity,
    price_policy_decision: row.price_policy_decision,
    source_type: row.source_type,
    evidence_lane: row.evidence_lane,
    confidence_tier: row.confidence_tier,
    currency: row.currency,
    candidate_median: asNumber(row.candidate_median),
    candidate_low: asNumber(row.candidate_low),
    candidate_high: asNumber(row.candidate_high),
    minimum_active_ask: asNumber(row.minimum_active_ask),
    maximum_active_ask: asNumber(row.maximum_active_ask),
    evidence_count: row.evidence_count,
    seller_count: row.seller_count,
    spread_ratio:
      asNumber(row.candidate_low) && asNumber(row.candidate_high)
        ? Number((asNumber(row.candidate_high) / asNumber(row.candidate_low)).toFixed(4))
        : null,
    signal_at: row.signal_at,
    quality_flags: qualityFlags(row),
    review_band: reviewBand(row),
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

async function main() {
  const raw = await withClient(async (client) => {
    const result = await client.query(`
      select
        p.card_print_id,
        p.gv_id,
        cp.name as card_name,
        cp.set_code,
        cp.printed_set_abbrev,
        cp.number,
        cp.rarity,
        p.price_policy_decision,
        p.source_type,
        p.evidence_lane,
        p.confidence_tier,
        p.currency,
        p.candidate_median,
        p.candidate_low,
        p.candidate_high,
        p.minimum_active_ask,
        p.maximum_active_ask,
        p.evidence_count,
        p.seller_count,
        p.signal_at,
        p.candidate_payload
      from public.v_market_evidence_price_publication_policy_v1 p
      left join public.card_prints cp on cp.id = p.card_print_id
      where p.future_publication_review_candidate
      order by p.evidence_count desc, p.seller_count desc, p.candidate_median desc nulls last, p.gv_id
    `);
    const boundary = await client.query(`
      select
        count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
        count(*) filter (where publishable)::int as publishable_rows,
        count(*) filter (where app_visible)::int as app_visible_rows,
        count(*) filter (where market_truth)::int as market_truth_rows
      from public.v_market_evidence_price_publication_policy_v1
    `);
    return { rows: result.rows, public_boundary: boundary.rows[0] };
  });

  const candidates = enrichRows(raw.rows);
  const byBand = Object.values(
    candidates.reduce((acc, row) => {
      acc[row.review_band] ??= {
        review_band: row.review_band,
        rows: 0,
        median_values: [],
        min_candidate_median: null,
        max_candidate_median: null,
      };
      const bucket = acc[row.review_band];
      bucket.rows += 1;
      bucket.median_values.push(row.candidate_median);
      bucket.min_candidate_median =
        bucket.min_candidate_median === null ? row.candidate_median : Math.min(bucket.min_candidate_median, row.candidate_median);
      bucket.max_candidate_median =
        bucket.max_candidate_median === null ? row.candidate_median : Math.max(bucket.max_candidate_median, row.candidate_median);
      return acc;
    }, {}),
  ).map((bucket) => ({
    ...bucket,
    median_candidate_median: bucket.median_values.sort((a, b) => a - b)[Math.floor(bucket.median_values.length / 2)],
    median_values: undefined,
  }));

  const report = {
    package_id: PACKAGE_ID,
    mode: "read_only_internal_future_publication_candidate_export",
    generated_at: new Date().toISOString(),
    candidate_count: candidates.length,
    review_band_summary: byBand.sort((left, right) => left.review_band.localeCompare(right.review_band)),
    public_boundary: raw.public_boundary,
    candidates,
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
      "All exported rows are internal future-publication-review candidates, not public prices.",
      "Rows are raw_single only; slab and reference lanes remain held by policy.",
      "Review bands identify rows that need title sample or spread inspection before any public handoff.",
    ],
  };
  report.csv_sha256 = "";

  const csvColumns = [
    "gv_id",
    "card_name",
    "set_code",
    "number",
    "rarity",
    "currency",
    "candidate_median",
    "candidate_low",
    "candidate_high",
    "minimum_active_ask",
    "maximum_active_ask",
    "evidence_count",
    "seller_count",
    "spread_ratio",
    "review_band",
    "quality_flags",
    "signal_at",
  ];
  const csv = [
    csvColumns.join(","),
    ...candidates.map((row) => csvColumns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  report.csv_sha256 = sha256(csv);
  report.package_fingerprint_sha256 = sha256(report);

  const columns = [
    { label: "GV ID", value: (row) => row.gv_id },
    { label: "Card", value: (row) => `${row.card_name ?? ""} ${row.number ? `#${row.number}` : ""}`.trim() },
    { label: "Median", value: (row) => money(row.candidate_median) },
    { label: "Evidence", value: (row) => row.evidence_count },
    { label: "Sellers", value: (row) => row.seller_count },
    { label: "Band", value: (row) => row.review_band },
    { label: "Flags", value: (row) => row.quality_flags.join(", ") },
  ];

  const markdown = `# ${PACKAGE_ID}

Generated: ${report.generated_at}

## Purpose

Export all internal future-publication-review price candidates for operator review.

This is not public pricing. It does not write \`pricing_observations\`, \`ebay_active_prices_latest\`, app-visible views, or public rollups.

## Summary

| Metric | Count |
| --- | ---: |
| Future publication-review candidates | ${report.candidate_count} |
| Public can-publish-directly rows | ${raw.public_boundary.can_publish_price_directly_rows} |
| Publishable rows | ${raw.public_boundary.publishable_rows} |
| App-visible rows | ${raw.public_boundary.app_visible_rows} |
| Market-truth rows | ${raw.public_boundary.market_truth_rows} |

## Review Bands

${renderTable(report.review_band_summary, [
  { label: "Band", value: (row) => row.review_band },
  { label: "Rows", value: (row) => row.rows },
  { label: "Min Median", value: (row) => money(row.min_candidate_median) },
  { label: "Median", value: (row) => money(row.median_candidate_median) },
  { label: "Max Median", value: (row) => money(row.max_candidate_median) },
])}

## Top Candidates By Evidence

${renderTable(candidates.slice(0, 40), columns)}

## Highest Median Candidates

${renderTable([...candidates].sort((left, right) => right.candidate_median - left.candidate_median).slice(0, 40), columns)}

## CSV

\`${rel(CSV_PATH)}\`

## Boundary

No DB writes, provider calls, source fetches, function invocation, public pricing views, app-visible pricing, public rollups, identity/card/vault/image writes, deletes, upserts, merges, migrations, or global apply were performed.

Package fingerprint: \`${report.package_fingerprint_sha256}\`
`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(CSV_PATH, `${csv}\n`);
  writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(MD_PATH, markdown);

  console.log(
    JSON.stringify(
      {
        package_id: PACKAGE_ID,
        markdown: rel(MD_PATH),
        json: rel(JSON_PATH),
        csv: rel(CSV_PATH),
        candidate_count: report.candidate_count,
        review_band_summary: report.review_band_summary,
        public_boundary: report.public_boundary,
        csv_sha256: report.csv_sha256,
        package_fingerprint_sha256: report.package_fingerprint_sha256,
      },
      null,
      2,
    ),
  );
}

await main();
