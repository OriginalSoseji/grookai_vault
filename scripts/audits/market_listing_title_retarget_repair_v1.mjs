import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import {
  MARKET_LISTING_TITLE_RETARGET_VERSION,
  resolveMarketListingTitleTargetV1,
} from "../../backend/pricing/market_listing_title_retarget_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PAGE_SIZE = 1000;
const CANDIDATE_VERSION = "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1";

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
  };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function deterministicUuid(input) {
  const hash = sha256(input);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function normalizeNumberKey(value) {
  return String(value ?? "").replace(/^#/, "").replace(/^0+(\d)/, "$1").trim();
}

function titleNumberKeys(title) {
  const text = String(title ?? "");
  const keys = new Set();
  for (const match of text.matchAll(/(^|[^0-9])0*(\d{1,4})\s*\/\s*0*(\d{1,4})([^0-9]|$)/g)) {
    keys.add(normalizeNumberKey(match[2]));
  }
  for (const match of text.matchAll(/(^|[^0-9])#?\s*0*(\d{1,4})([^0-9/]|$)/g)) {
    keys.add(normalizeNumberKey(match[2]));
  }
  return [...keys].filter(Boolean);
}

async function supabaseRequest(factory) {
  const result = await factory();
  if (result.error) throw new Error(result.error.message);
  return result;
}

async function fetchCatalog(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabaseRequest(() => supabase
      .from("card_prints")
      .select("id,gv_id,name,set_code,number,number_plain,printed_set_abbrev,printed_total,rarity,set:sets(name)")
      .not("gv_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to));
    if (!data?.length) break;
    rows.push(...data.map((row) => ({
      card_print_id: row.id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      set_name: row.set?.name ?? null,
      number: row.number,
      number_plain: row.number_plain,
      printed_set_abbrev: row.printed_set_abbrev,
      printed_total: row.printed_total,
      rarity: row.rarity,
    })));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

function buildCatalogIndex(catalog) {
  const byNumber = new Map();
  for (const card of catalog) {
    const key = normalizeNumberKey(card.number_plain ?? card.number);
    if (!key) continue;
    const rows = byNumber.get(key) ?? [];
    rows.push(card);
    byNumber.set(key, rows);
  }
  return byNumber;
}

function plausibleCatalog(title, byNumber) {
  const seen = new Set();
  const rows = [];
  for (const key of titleNumberKeys(title)) {
    for (const card of byNumber.get(key) ?? []) {
      if (seen.has(card.card_print_id)) continue;
      seen.add(card.card_print_id);
      rows.push(card);
    }
  }
  return rows;
}

function firstRelated(value) {
  return Array.isArray(value) ? (value[0] ?? {}) : (value ?? {});
}

function evidenceClassFor(row) {
  return row.title_features?.listing_evidence_class ?? "unknown";
}

function confidenceFor(existing, evidenceClass) {
  const baseline = evidenceClass === "slab" ? 0.69 : 0.72;
  const current = Number(existing);
  return Math.max(Number.isFinite(current) ? current : 0, baseline);
}

function correctedCandidateRow(row, resolution, generatedAt) {
  const obs = firstRelated(row.obs);
  const evidenceClass = evidenceClassFor(row);
  const candidateHash = sha256({
    source: row.source,
    source_listing_id: row.source_listing_id,
    observation_id: row.observation_id,
    card_print_id: resolution.target.card_print_id,
    evidence_class: evidenceClass,
  });

  return {
    id: deterministicUuid(`market_listing_card_candidate:${candidateHash}`),
    observation_id: row.observation_id,
    raw_snapshot_id: row.raw_snapshot_id ?? obs.raw_snapshot_id,
    card_print_id: resolution.target.card_print_id,
    gv_id: resolution.target.gv_id,
    source: row.source,
    source_listing_id: row.source_listing_id,
    match_version: CANDIDATE_VERSION,
    match_status: "needs_review",
    match_confidence: confidenceFor(row.match_confidence, evidenceClass),
    title_features: {
      ...(row.title_features ?? {}),
      listing_title: obs.listing_title ?? row.title_features?.listing_title ?? null,
      title_retarget: {
        version: resolution.version,
        status: resolution.status,
        retargeted: resolution.retargeted,
        score: resolution.score ?? null,
        reasons: resolution.reasons ?? [],
        original_gv_id: row.gv_id,
        original_card_print_id: row.card_print_id,
        resolved_gv_id: resolution.target.gv_id,
        resolved_card_print_id: resolution.target.card_print_id,
      },
    },
    set_features: {
      ...(row.set_features ?? {}),
      title_retarget_version: MARKET_LISTING_TITLE_RETARGET_VERSION,
    },
    number_features: {
      ...(row.number_features ?? {}),
      title_retarget_status: resolution.status,
    },
    finish_features: row.finish_features ?? {},
    condition_features: row.condition_features ?? {},
    exclusion_flags: row.exclusion_flags ?? [],
    needs_review: true,
    can_publish_price_directly: false,
    candidate_hash: candidateHash,
    created_at: generatedAt,
  };
}

async function existingCandidateHashes(supabase, hashes) {
  const found = new Set();
  const unique = [...new Set(hashes)];
  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const { data } = await supabaseRequest(() => supabase
      .from("market_listing_card_candidates")
      .select("candidate_hash")
      .eq("source", "ebay_active")
      .in("candidate_hash", chunk));
    for (const row of data ?? []) found.add(row.candidate_hash);
  }
  return found;
}

async function insertRows(supabase, rows) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    const { data } = await supabaseRequest(() => supabase
      .from("market_listing_card_candidates")
      .insert(chunk)
      .select("id"));
    inserted += data?.length ?? chunk.length;
  }
  return inserted;
}

async function fetchObservationsById(supabase, ids) {
  const map = new Map();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const { data } = await supabaseRequest(() => supabase
      .from("market_listing_observations")
      .select("id,raw_snapshot_id,listing_title,total_ask_price,currency,condition_text,seller_key")
      .in("id", chunk));
    for (const row of data ?? []) map.set(row.id, row);
  }
  return map;
}

function renderMarkdown(report) {
  return [
    "# Market Listing Title Retarget Repair V1",
    "",
    `- Mode: \`${report.mode}\``,
    `- Applied: \`${report.applied}\``,
    `- Retargeted candidates found: \`${report.summary.retargeted_candidate_count}\``,
    `- Inserted candidates: \`${report.summary.inserted_candidate_count}\``,
    `- Existing corrected candidates skipped: \`${report.summary.existing_corrected_candidate_count}\``,
    "",
    "## Target Regression",
    "",
    "```json",
    JSON.stringify(report.regression, null, 2),
    "```",
    "",
    "## Boundary",
    "",
    "```json",
    JSON.stringify(report.boundary, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));
const generatedAt = new Date().toISOString();
const stamp = generatedAt.replace(/[:.]/g, "-");
const supabase = createBackendClient();
const catalog = await fetchCatalog(supabase);
const catalogIndex = buildCatalogIndex(catalog);
const corrected = [];
const statusCounts = {};
const samples = [];
let scanned = 0;

for (let from = 0; ; from += PAGE_SIZE) {
  const to = from + PAGE_SIZE - 1;
  const { data } = await supabaseRequest(() => supabase
    .from("market_listing_card_candidates")
    .select("id,observation_id,raw_snapshot_id,card_print_id,gv_id,source,source_listing_id,match_confidence,title_features,set_features,number_features,finish_features,condition_features,exclusion_flags")
    .eq("source", "ebay_active")
    .eq("match_version", CANDIDATE_VERSION)
    .order("id", { ascending: true })
    .range(from, to));
  if (!data?.length) break;
  const observationById = await fetchObservationsById(supabase, data.map((row) => row.observation_id));

  for (const row of data) {
    scanned += 1;
    const obs = observationById.get(row.observation_id) ?? {};
    const resolution = resolveMarketListingTitleTargetV1({
      listingTitle: obs.listing_title,
      originalTarget: {
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
      },
      catalog: plausibleCatalog(obs.listing_title, catalogIndex),
    });
    statusCounts[resolution.status] = (statusCounts[resolution.status] ?? 0) + 1;
    if (!resolution.retargeted || !resolution.target?.card_print_id) continue;

    const candidate = correctedCandidateRow({ ...row, obs }, resolution, generatedAt);
    corrected.push(candidate);
    if (samples.length < 20) {
      samples.push({
        listing_title: obs.listing_title,
        original_gv_id: row.gv_id,
        resolved_gv_id: candidate.gv_id,
        evidence_class: evidenceClassFor(row),
        total_ask_price: obs.total_ask_price,
        currency: obs.currency,
      });
    }
  }
  if (data.length < PAGE_SIZE) break;
}

const existing = await existingCandidateHashes(supabase, corrected.map((row) => row.candidate_hash));
const insertable = corrected.filter((row) => !existing.has(row.candidate_hash));
const inserted = args.apply && insertable.length ? await insertRows(supabase, insertable) : 0;
const targetRows = corrected.filter((row) => row.gv_id === "GV-PK-ASC-276");
const targetInsertedRows = insertable.filter((row) => row.gv_id === "GV-PK-ASC-276");

mkdirSync(AUDIT_DIR, { recursive: true });
const rowsPath = path.join(AUDIT_DIR, `mee_title_retarget_repair_v1_rows_${stamp}.json`);
writeFileSync(rowsPath, `${JSON.stringify(insertable, null, 2)}\n`);

const report = {
  package_id: "MARKET-LISTING-TITLE-RETARGET-REPAIR-V1",
  generated_at: generatedAt,
  mode: args.apply ? "apply_corrected_candidates" : "plan_only_no_writes",
  applied: args.apply,
  retarget_version: MARKET_LISTING_TITLE_RETARGET_VERSION,
  summary: {
    scanned_candidate_count: scanned,
    catalog_size: catalog.length,
    retargeted_candidate_count: corrected.length,
    existing_corrected_candidate_count: existing.size,
    insertable_candidate_count: insertable.length,
    inserted_candidate_count: inserted,
    status_counts: Object.fromEntries(Object.entries(statusCounts).sort(([left], [right]) => left.localeCompare(right))),
  },
  regression: {
    gv_id: "GV-PK-ASC-276",
    corrected_candidate_count: targetRows.length,
    insertable_candidate_count: targetInsertedRows.length,
    sample: targetRows.slice(0, 5).map((row) => ({
      id: row.id,
      source_listing_id: row.source_listing_id,
      candidate_hash: row.candidate_hash,
      title_retarget: row.title_features.title_retarget,
    })),
  },
  artifacts: {
    candidate_rows_json: rel(rowsPath),
  },
  samples,
  boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: args.apply,
    market_listing_card_candidates_writes: args.apply,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
  findings: [],
};

if (report.regression.corrected_candidate_count <= 0) report.findings.push("asc276_regression_not_repaired");
if (args.apply && report.summary.inserted_candidate_count !== report.summary.insertable_candidate_count) {
  report.findings.push("inserted_count_mismatch");
}

const jsonPath = path.join(AUDIT_DIR, `mee_title_retarget_repair_v1_${stamp}.json`);
const mdPath = path.join(AUDIT_DIR, `mee_title_retarget_repair_v1_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  applied: report.applied,
  summary: report.summary,
  regression: report.regression,
  findings: report.findings,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  },
}, null, 2));

if (report.findings.length) process.exitCode = 1;
