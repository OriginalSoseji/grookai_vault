import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { resolveMarketListingTitleTargetV1 } from "../../backend/pricing/market_listing_title_retarget_v1.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-LISTING-CARD-CANDIDATE-ROLLUP-PLAN-V1";
export const EXPECTED_SOURCE_READBACK_FINGERPRINT = "3ecef7a22b6209c5a68fc591d58d6e63519dd97c0327259b74f39afe7b281d95";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const PAGE_SIZE = 1000;
const { Client } = pg;

function parseArgs(argv) {
  return {
    runKey: argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length) ?? null,
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

function writeRow(stream, row, hash) {
  stream.write(`${JSON.stringify(row)}\n`);
  hash.update(`${JSON.stringify(stable(row))}\n`);
}

function closeStream(stream) {
  return new Promise((resolve, reject) => {
    stream.end((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function countInto(counts, key) {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

function sortedObject(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function confidenceFor(strategy, evidenceClass) {
  let score = 0.55;
  if (strategy === "strict_identity") score = 0.72;
  if (strategy === "special_lane") score = 0.68;
  if (strategy === "name_number") score = 0.58;
  if (evidenceClass === "slab") score -= 0.03;
  return Math.max(0, Math.min(1, score));
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return null;
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function rounded(value) {
  return value === null || value === undefined ? null : Math.round(Number(value) * 100) / 100;
}

function candidateRow(row, generatedAt) {
  const eventPayload = row.event_payload ?? {};
  const target = eventPayload.target ?? {};
  const obs = Array.isArray(row.obs) ? (row.obs[0] ?? {}) : (row.obs ?? {});
  const evidenceClass = eventPayload.listing_evidence_class ?? "unknown";
  const candidateHash = sha256({
    source: row.source,
    source_listing_id: row.source_listing_id,
    observation_id: row.observation_id,
    card_print_id: target.card_print_id,
    evidence_class: evidenceClass,
  });

  return {
    id: deterministicUuid(`market_listing_card_candidate:${candidateHash}`),
    observation_id: row.observation_id,
    raw_snapshot_id: obs.raw_snapshot_id,
    card_print_id: target.card_print_id,
    gv_id: target.gv_id ?? eventPayload.gv_id ?? null,
    source: row.source,
    source_listing_id: row.source_listing_id,
    match_version: "MEE_11S_REVIEW_ONLY_TARGETED_LISTING_CANDIDATES_V1",
    match_status: "needs_review",
    match_confidence: confidenceFor(eventPayload.strategy ?? target.strategy, evidenceClass),
    title_features: {
      listing_title: obs.listing_title,
      query_text: target.query_text ?? null,
      strategy: eventPayload.strategy ?? target.strategy ?? null,
      title_retarget: eventPayload.title_retarget ?? null,
      listing_evidence_class: evidenceClass,
      listing_evidence_tags: eventPayload.listing_evidence_tags ?? [],
    },
    set_features: {
      query_key: eventPayload.query_key ?? target.query_key ?? null,
      provider_total_for_query: eventPayload.provider_total_for_query ?? null,
    },
    number_features: {},
    finish_features: {},
    condition_features: {
      condition_text: obs.condition_text,
      slab_features: eventPayload.slab_features ?? null,
    },
    exclusion_flags: eventPayload.ingestion_exclusion_flags ?? [],
    needs_review: true,
    can_publish_price_directly: false,
    candidate_hash: candidateHash,
    created_at: generatedAt,
  };
}

function rollupKey(row) {
  const eventPayload = row.event_payload ?? {};
  const target = eventPayload.target ?? {};
  const evidenceClass = eventPayload.listing_evidence_class;
  return `${target.card_print_id}|${target.gv_id ?? eventPayload.gv_id}|${evidenceClass}`;
}

function addRollupSignal(groups, row) {
  const eventPayload = row.event_payload ?? {};
  const target = eventPayload.target ?? {};
  const evidenceClass = eventPayload.listing_evidence_class;
  if (!target.card_print_id || !target.gv_id || !["raw_single", "slab"].includes(evidenceClass)) return;
  const price = safeNumber(row.current_total_ask_price);
  if (price === null || row.currency !== "USD") return;

  const key = rollupKey(row);
  const group = groups.get(key) ?? {
    card_print_id: target.card_print_id,
    gv_id: target.gv_id,
    evidence_class: evidenceClass,
    prices: [],
    sellers: new Set(),
    exclusion_counts: {},
    listing_count: 0,
  };
  group.prices.push(price);
  group.listing_count += 1;
  if (row.obs?.seller_key) group.sellers.add(row.obs.seller_key);
  for (const flag of eventPayload.ingestion_exclusion_flags ?? []) countInto(group.exclusion_counts, flag);
  groups.set(key, group);
}

async function fetchRetargetCatalog(supabase) {
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

function normalizeNumberKey(value) {
  return String(value ?? "").replace(/^#/, "").replace(/^0+(\d)/, "$1").trim();
}

function buildRetargetCatalogIndex(catalog) {
  const byNumber = new Map();
  for (const card of catalog) {
    const key = normalizeNumberKey(card.number_plain ?? card.number);
    if (!key) continue;
    const rows = byNumber.get(key) ?? [];
    rows.push(card);
    byNumber.set(key, rows);
  }
  return { byNumber };
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

function plausibleCatalogForTitle(title, index) {
  const seen = new Set();
  const rows = [];
  for (const key of titleNumberKeys(title)) {
    for (const card of index.byNumber.get(key) ?? []) {
      if (seen.has(card.card_print_id)) continue;
      seen.add(card.card_print_id);
      rows.push(card);
    }
  }
  return rows;
}

function withResolvedTitleTarget(row, catalogIndex) {
  const obs = Array.isArray(row.obs) ? (row.obs[0] ?? {}) : (row.obs ?? {});
  const originalPayload = row.event_payload ?? {};
  const originalTarget = originalPayload.target ?? {};
  const plausibleCatalog = plausibleCatalogForTitle(obs.listing_title, catalogIndex);
  const resolution = resolveMarketListingTitleTargetV1({
    listingTitle: obs.listing_title,
    originalTarget,
    catalog: plausibleCatalog,
  });

  return {
    row: {
      ...row,
      event_payload: {
        ...originalPayload,
        target: resolution.target,
        title_retarget: {
          version: resolution.version,
          status: resolution.status,
          retargeted: resolution.retargeted,
          score: resolution.score ?? null,
          reasons: resolution.reasons ?? [],
          original_gv_id: originalTarget.gv_id ?? null,
          original_card_print_id: originalTarget.card_print_id ?? null,
          resolved_gv_id: resolution.target?.gv_id ?? null,
          resolved_card_print_id: resolution.target?.card_print_id ?? null,
        },
      },
    },
    resolution,
  };
}

async function fetchPriceEventsForObservations(supabase, observations) {
  if (process.env.SUPABASE_DB_URL) return fetchPriceEventsForObservationsWithPg(observations);

  const rows = [];
  const observationById = new Map(observations.map((observation) => [observation.id, observation]));
  const ids = observations.map((observation) => observation.id);
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data } = await supabaseRequest(() => supabase
      .from("market_listing_price_events")
      .select("id,observation_id,source,source_listing_id,current_total_ask_price,currency,observed_at,event_payload")
      .in("observation_id", chunk)
      .order("id", { ascending: true }));
    for (const row of data ?? []) {
      rows.push({
        ...row,
        obs: observationById.get(row.observation_id) ?? {},
      });
    }
  }
  return rows.sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

async function fetchPriceEventsForObservationsWithPg(observations) {
  const rows = [];
  const observationById = new Map(observations.map((observation) => [observation.id, observation]));
  const ids = observations.map((observation) => observation.id);
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (let index = 0; index < ids.length; index += 1_000) {
      const chunk = ids.slice(index, index + 1_000);
      const result = await client.query(
        `select id, observation_id, source, source_listing_id, current_total_ask_price,
                currency, observed_at, event_payload
           from public.market_listing_price_events
          where observation_id = any($1::uuid[])
          order by id asc`,
        [chunk],
      );
      for (const row of result.rows) {
        rows.push({
          ...row,
          obs: observationById.get(row.observation_id) ?? {},
        });
      }
    }
  } finally {
    await client.end();
  }
  return rows.sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function rollupRow(group, generatedAt, runKey) {
  const prices = [...group.prices].sort((left, right) => left - right);
  const evidenceVersion = group.evidence_class === "slab"
    ? "MEE_11S_INTERNAL_SLAB_ACTIVE_ASK_REVIEW_V1"
    : "MEE_11S_INTERNAL_RAW_SINGLE_ACTIVE_ASK_REVIEW_V1";

  return {
    id: deterministicUuid(`market_listing_rollup:${evidenceVersion}:manual:${group.card_print_id}`),
    card_print_id: group.card_print_id,
    gv_id: group.gv_id,
    source: "ebay_active",
    rollup_version: evidenceVersion,
    rollup_window: "manual",
    listing_count: group.listing_count,
    seller_count: group.sellers.size,
    median_active_ask: rounded(percentile(prices, 0.5)),
    trimmed_low_active_ask: rounded(percentile(prices, 0.1)),
    trimmed_high_active_ask: rounded(percentile(prices, 0.9)),
    minimum_active_ask: rounded(prices[0] ?? null),
    maximum_active_ask: rounded(prices.at(-1) ?? null),
    currency: "USD",
    stale_listing_count: 0,
    reviewed_candidate_count: 0,
    exclusion_counts: sortedObject(group.exclusion_counts),
    rollup_payload: {
      evidence_class: group.evidence_class,
      q25: rounded(percentile(prices, 0.25)),
      q75: rounded(percentile(prices, 0.75)),
      p95: rounded(percentile(prices, 0.95)),
      source_run_key: runKey,
      review_only: true,
    },
    needs_review: true,
    publishable: false,
    app_visible: false,
    market_truth: false,
    generated_at: generatedAt,
    created_at: generatedAt,
  };
}

async function supabaseRequest(factory) {
  const result = await factory();
  if (result.error) throw new Error(result.error.message);
  return result;
}

async function resolveAcquisitionRun(supabase, runKey) {
  const { data } = await supabaseRequest(() => {
    let query = supabase
      .from("market_listing_acquisition_runs")
      .select("id,run_key,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);
    if (runKey) query = query.eq("run_key", runKey);
    return query;
  });
  const row = data?.[0];
  if (!row) {
    throw new Error(runKey
      ? `No market_listing_acquisition_runs row found for run_key=${runKey}`
      : "No market_listing_acquisition_runs rows found");
  }
  return row;
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-CARD-CANDIDATE-ROLLUP-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Row manifest hash: ${report.row_manifest_hash_sha256}. Source readback fingerprint: ${report.source_readback_fingerprint_sha256}. Scope: insert ${report.proposed_table_row_counts.market_listing_card_candidates} review-only market_listing_card_candidates rows and ${report.proposed_table_row_counts.market_listing_rollups} internal-only market_listing_rollups rows from local MEE-11S artifacts only, keeping raw_single and slab rollups separated and not app-visible. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

function renderMarkdown(report) {
  return [
    "# MEE-11S Market Listing Card Candidate Rollup Plan",
    "",
    `- Ready for apply approval: \`${report.ready_for_apply_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    "",
    "## Proposed Rows",
    "",
    "```json",
    JSON.stringify(report.proposed_table_row_counts, null, 2),
    "```",
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(report.summary, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    report.approval_prompt_for_next_step,
    "```",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const outputDir = path.join(REPO_ROOT, AUDIT_DIR, `mee_11s_market_listing_card_candidate_rollup_plan_${stamp}`);
  mkdirSync(outputDir, { recursive: true });

  const supabase = createBackendClient();
  const retargetCatalog = await fetchRetargetCatalog(supabase);
  const retargetCatalogIndex = buildRetargetCatalogIndex(retargetCatalog);
  const runRow = await resolveAcquisitionRun(supabase, args.runKey);
  const runId = runRow.id;
  const resolvedRunKey = runRow.run_key;

  const candidatePath = path.join(outputDir, "market_listing_card_candidates.jsonl");
  const rollupPath = path.join(outputDir, "market_listing_rollups.jsonl");
  const candidateStream = createWriteStream(candidatePath, { encoding: "utf8" });
  const candidateHash = createHash("sha256");
  const rollupHash = createHash("sha256");
  const groups = new Map();
  const classCounts = {};
  const retargetCounts = {};
  let candidateCount = 0;
  let scannedCount = 0;
  let skippedCount = 0;

  let lastObservationId = null;
  for (;;) {
    const { data: observations } = await supabaseRequest(() => {
      let query = supabase
        .from("market_listing_observations")
        .select("id,raw_snapshot_id,acquisition_run_id,listing_title,condition_text,seller_key")
        .eq("acquisition_run_id", runId)
        .order("id", { ascending: true })
        .limit(PAGE_SIZE);
      if (lastObservationId) query = query.gt("id", lastObservationId);
      return query;
    });
    if (!observations?.length) break;
    lastObservationId = observations.at(-1).id;

    const data = await fetchPriceEventsForObservations(supabase, observations);

    for (const sourceRow of data) {
      scannedCount += 1;
      const { row, resolution } = withResolvedTitleTarget(sourceRow, retargetCatalogIndex);
      countInto(retargetCounts, resolution.status);
      const evidenceClass = row.event_payload?.listing_evidence_class;
      countInto(classCounts, evidenceClass ?? "unknown");
      const target = row.event_payload?.target ?? {};
      if (!target.card_print_id || !target.gv_id || !["raw_single", "slab"].includes(evidenceClass)) {
        skippedCount += 1;
        continue;
      }
      writeRow(candidateStream, candidateRow(row, generatedAt), candidateHash);
      candidateCount += 1;
      addRollupSignal(groups, row);
    }
    if (observations.length < PAGE_SIZE) break;
  }
  await closeStream(candidateStream);

  const rollupStream = createWriteStream(rollupPath, { encoding: "utf8" });
  let rollupCount = 0;
  const rollupClassCounts = {};
  for (const group of [...groups.values()].sort((left, right) =>
    left.evidence_class.localeCompare(right.evidence_class) || left.gv_id.localeCompare(right.gv_id))) {
    writeRow(rollupStream, rollupRow(group, generatedAt, resolvedRunKey), rollupHash);
    rollupCount += 1;
    countInto(rollupClassCounts, group.evidence_class);
  }
  await closeStream(rollupStream);

  const rowFileHashes = {
    cardCandidateRows: candidateHash.digest("hex"),
    rollupRows: rollupHash.digest("hex"),
  };
  const rowManifestHash = sha256({
    row_file_hashes: rowFileHashes,
    candidate_count: candidateCount,
    rollup_count: rollupCount,
    source_run_key: resolvedRunKey,
  });
  const packageFingerprint = sha256({
    package_id: PACKAGE_ID,
    source_readback_fingerprint: EXPECTED_SOURCE_READBACK_FINGERPRINT,
    row_manifest_hash: rowManifestHash,
    boundary: {
      db_writes: false,
      public_pricing: false,
      app_visible: false,
    },
  });
  const findings = [];
  if (candidateCount <= 0) findings.push("no_candidate_rows");
  if (rollupCount <= 0) findings.push("no_rollup_rows");

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "candidate_rollup_plan_only_no_writes",
    source_readback_fingerprint_sha256: EXPECTED_SOURCE_READBACK_FINGERPRINT,
    source_run_key: resolvedRunKey,
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    row_file_hashes_sha256: rowFileHashes,
    proposed_table_row_counts: {
      market_listing_card_candidates: candidateCount,
      market_listing_rollups: rollupCount,
    },
    summary: {
      scanned_price_events: scannedCount,
      skipped_non_candidate_events: skippedCount,
      retarget_catalog_size: retargetCatalog.length,
      title_retarget_counts: sortedObject(retargetCounts),
      evidence_class_counts: sortedObject(classCounts),
      rollup_class_counts: sortedObject(rollupClassCounts),
    },
    row_files: {
      cardCandidateRows: rel(candidatePath),
      rollupRows: rel(rollupPath),
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
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    findings,
    ready_for_apply_approval: findings.length === 0,
  };
  report.approval_prompt_for_next_step = approvalPrompt(report);

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11s_market_listing_card_candidate_rollup_plan_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11s_market_listing_card_candidate_rollup_plan_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: report.package_id,
    ready_for_apply_approval: report.ready_for_apply_approval,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    row_manifest_hash_sha256: report.row_manifest_hash_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    summary: report.summary,
    findings: report.findings,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
    approval_prompt_for_next_step: report.approval_prompt_for_next_step,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
