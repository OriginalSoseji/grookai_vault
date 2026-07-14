import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  AUTOMATED_REFERENCE_SOURCES_V1,
  MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_CONTRACT_VERSION,
} from "../../backend/pricing/market_reference_warehouse_automated_apply_policy_v1.mjs";
import { referenceCandidateHashV1 } from "../../backend/pricing/market_reference_warehouse_backfill_manifest_v1.mjs";

export const PACKAGE_ID = "MEE-REFERENCE-WAREHOUSE-DELTA-WRITER-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const { Client } = pg;
const REFERENCE_WAREHOUSE_TABLES = new Set([
  "market_reference_candidates",
  "market_reference_normalized_evidence",
]);

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

function parseArgs(argv) {
  return {
    run: argv.includes("--run"),
    dryRun: argv.includes("--dry-run") || !argv.includes("--run"),
    chunkSize: Number(argv.find((arg) => arg.startsWith("--chunk-size="))?.slice("--chunk-size=".length) ?? 500),
  };
}

async function latestFile({ dir, pattern }) {
  const entries = await readdir(dir, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    if (!entry.isFile() || !pattern.test(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const info = await stat(fullPath);
    matches.push({ fullPath, mtimeMs: info.mtimeMs });
  }
  matches.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return matches[0]?.fullPath ?? null;
}

function readJsonIfPresent(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function countJsonlLines(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  const text = readFileSync(filePath, "utf8").trim();
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

async function countRowsBySource(supabase, table) {
  if (process.env.SUPABASE_DB_URL) return countRowsBySourceWithPg(table);

  const out = {};
  for (const source of AUTOMATED_REFERENCE_SOURCES_V1) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("source", source);
    if (error) throw new Error(`[mee-reference-delta-writer] count failed for ${table}.${source}: ${error.message}`);
    out[source] = count ?? 0;
  }
  return out;
}

async function withPgClient(callback) {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function countRowsBySourceWithPg(table) {
  if (!REFERENCE_WAREHOUSE_TABLES.has(table)) {
    throw new Error(`[mee-reference-delta-writer] unsafe table for pg count: ${table}`);
  }
  return withPgClient(async (client) => {
    const result = await client.query(
      `select source, count(*)::integer as count
         from public.${table}
        where source = any($1::text[])
        group by source`,
      [AUTOMATED_REFERENCE_SOURCES_V1],
    );
    const out = Object.fromEntries(AUTOMATED_REFERENCE_SOURCES_V1.map((source) => [source, 0]));
    for (const row of result.rows) out[row.source] = Number(row.count);
    return out;
  });
}

function sourceCountsFromNormalizedArtifact(artifact) {
  return artifact?.counts?.source_counts ?? {};
}

async function latestNormalizedForSource(source) {
  const entries = await readdir(AUDIT_DIR, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^mee_06c_normalized_reference_evidence_.*\.json$/.test(entry.name)) continue;
    const fullPath = path.join(AUDIT_DIR, entry.name);
    const artifact = readJsonIfPresent(fullPath);
    if (!artifact) continue;
    const counts = sourceCountsFromNormalizedArtifact(artifact);
    if (!Object.prototype.hasOwnProperty.call(counts, source)) continue;
    const info = await stat(fullPath);
    matches.push({ fullPath, artifact, mtimeMs: info.mtimeMs });
  }
  matches.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return matches[0] ?? null;
}

async function buildArtifactInventory({ candidateCounts = {}, normalizedCounts = {} } = {}) {
  const tcgdexAuditPath = await latestFile({
    dir: AUDIT_DIR,
    pattern: /^mee_tcgdex_reference_pricing_audit_.*\.json$/,
  });
  const tcgdexAudit = readJsonIfPresent(tcgdexAuditPath);
  const tcgdexCandidateManifestPath = tcgdexAudit?.artifacts?.candidates
    ? path.join(REPO_ROOT, tcgdexAudit.artifacts.candidates)
    : null;
  const tcgdexNormalizedManifestPath = tcgdexAudit?.artifacts?.normalized
    ? path.join(REPO_ROOT, tcgdexAudit.artifacts.normalized)
    : null;

  const pokemonAcquisitionPath = await latestFile({
    dir: AUDIT_DIR,
    pattern: /^mee_06a_pokemontcg_io_reference_evidence_.*\.json$/,
  });
  const tcgcsvAcquisitionPath = await latestFile({
    dir: AUDIT_DIR,
    pattern: /^mee_06b_tcgcsv_reference_evidence_.*\.json$/,
  });
  const pokemonAcquisition = readJsonIfPresent(pokemonAcquisitionPath);
  const tcgcsvAcquisition = readJsonIfPresent(tcgcsvAcquisitionPath);
  const pokemonNormalized = await latestNormalizedForSource("pokemontcg_io_reference");
  const tcgcsvNormalized = await latestNormalizedForSource("tcgcsv_reference");

  const projectedTcgdexBySource = tcgdexAudit?.counts?.candidates_by_source ?? {};
  const projectedTcgdexNormalizedBySource = tcgdexAudit?.counts?.candidates_by_source ?? {};
  const tcgdexSources = [
    "tcgdex_tcgplayer_reference",
    "tcgdex_cardmarket_reference",
  ];
  const tcgdexAlreadyComplete = tcgdexAudit
    ? tcgdexSources.every((source) => (
      candidateCounts[source] === (projectedTcgdexBySource[source] ?? null) &&
      normalizedCounts[source] === (projectedTcgdexNormalizedBySource[source] ?? null)
    ))
    : tcgdexSources.every((source) => (
      (candidateCounts[source] ?? 0) > 0 &&
      candidateCounts[source] === normalizedCounts[source]
    ));
  const tcgdexManifestFindings = tcgdexAlreadyComplete
    ? []
    : [
      ...(tcgdexCandidateManifestPath && existsSync(tcgdexCandidateManifestPath) ? [] : ["tcgdex_candidate_row_manifest_missing"]),
      ...(tcgdexNormalizedManifestPath && existsSync(tcgdexNormalizedManifestPath) ? [] : ["tcgdex_normalized_row_manifest_missing"]),
    ];

  return {
    tcgdex: {
      audit_path: tcgdexAuditPath ? rel(tcgdexAuditPath) : null,
      candidate_manifest_path: tcgdexCandidateManifestPath && existsSync(tcgdexCandidateManifestPath)
        ? rel(tcgdexCandidateManifestPath)
        : null,
      normalized_manifest_path: tcgdexNormalizedManifestPath && existsSync(tcgdexNormalizedManifestPath)
        ? rel(tcgdexNormalizedManifestPath)
        : null,
      projected_candidate_rows: tcgdexAudit?.summary?.projected_market_reference_candidate_rows ?? null,
      projected_normalized_rows: tcgdexAudit?.summary?.projected_market_reference_normalized_evidence_rows ?? null,
      projected_candidate_rows_by_source: projectedTcgdexBySource,
      projected_normalized_rows_by_source: projectedTcgdexNormalizedBySource,
      warehouse_already_complete: tcgdexAlreadyComplete,
      candidate_manifest_rows: countJsonlLines(tcgdexCandidateManifestPath),
      normalized_manifest_rows: countJsonlLines(tcgdexNormalizedManifestPath),
      findings: [
        ...(tcgdexAuditPath || tcgdexAlreadyComplete ? [] : ["tcgdex_audit_missing"]),
        ...tcgdexManifestFindings,
      ],
    },
    pokemontcg_io_reference: {
      acquisition_path: pokemonAcquisitionPath ? rel(pokemonAcquisitionPath) : null,
      normalized_path: pokemonNormalized?.fullPath ? rel(pokemonNormalized.fullPath) : null,
      projected_candidate_rows: pokemonAcquisition?.candidate_evidence?.length ?? null,
      projected_normalized_rows: pokemonNormalized?.artifact?.normalized_evidence?.length ?? null,
      findings: [
        ...(pokemonAcquisitionPath ? [] : ["pokemontcg_acquisition_missing"]),
        ...(pokemonNormalized?.fullPath ? [] : ["pokemontcg_normalized_missing"]),
      ],
    },
    tcgcsv_reference: {
      acquisition_path: tcgcsvAcquisitionPath ? rel(tcgcsvAcquisitionPath) : null,
      normalized_path: tcgcsvNormalized?.fullPath ? rel(tcgcsvNormalized.fullPath) : null,
      projected_candidate_rows: tcgcsvAcquisition?.candidate_evidence?.length ?? null,
      projected_normalized_rows: tcgcsvNormalized?.artifact?.normalized_evidence?.length ?? null,
      findings: [
        ...(tcgcsvAcquisitionPath ? [] : ["tcgcsv_acquisition_missing"]),
        ...(tcgcsvNormalized?.fullPath ? [] : ["tcgcsv_normalized_missing"]),
      ],
    },
  };
}

function sourceProjectionFromInventory(inventory) {
  return {
    tcgdex_tcgplayer_reference: {
      projected_candidate_rows: null,
      projected_normalized_rows: null,
      note: "TCGDex row manifests contain both TCGPlayer and Cardmarket rows; per-source split is verified inside the manifest apply package.",
    },
    tcgdex_cardmarket_reference: {
      projected_candidate_rows: null,
      projected_normalized_rows: null,
      note: "TCGDex row manifests contain both TCGPlayer and Cardmarket rows; per-source split is verified inside the manifest apply package.",
    },
    pokemontcg_io_reference: {
      projected_candidate_rows: inventory.pokemontcg_io_reference.projected_candidate_rows,
      projected_normalized_rows: inventory.pokemontcg_io_reference.projected_normalized_rows,
    },
    tcgcsv_reference: {
      projected_candidate_rows: inventory.tcgcsv_reference.projected_candidate_rows,
      projected_normalized_rows: inventory.tcgcsv_reference.projected_normalized_rows,
    },
  };
}

async function fetchAll(supabase, table, select, configure = (query) => query, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0;; from += pageSize) {
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await configure(supabase.from(table).select(select).range(from, from + pageSize - 1));
      data = response.data;
      error = response.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
    if (error) throw new Error(`[mee-reference-delta-writer] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchExistingCandidateMapWithPg(source) {
  return withPgClient(async (client) => {
    const result = await client.query(
      `select id, candidate_hash
         from public.market_reference_candidates
        where source = $1
        order by id asc`,
      [source],
    );
    return new Map(result.rows.map((row) => [row.candidate_hash, row.id]));
  });
}

async function fetchExistingNormalizedKeysWithPg(source) {
  return withPgClient(async (client) => {
    const result = await client.query(
      `select candidate_id, normalizer_version
         from public.market_reference_normalized_evidence
        where source = $1
        order by candidate_id asc`,
      [source],
    );
    return new Set(result.rows.map((row) => `${row.candidate_id}:${row.normalizer_version}`));
  });
}

async function fetchExistingCandidateMap(supabase, source) {
  if (process.env.SUPABASE_DB_URL) return fetchExistingCandidateMapWithPg(source);

  const rows = await fetchAll(
    supabase,
    "market_reference_candidates",
    "id,candidate_hash",
    (query) => query.eq("source", source).order("id", { ascending: true }),
  );
  return new Map(rows.map((row) => [row.candidate_hash, row.id]));
}

async function fetchExistingNormalizedKeys(supabase, source) {
  if (process.env.SUPABASE_DB_URL) return fetchExistingNormalizedKeysWithPg(source);

  const rows = await fetchAll(
    supabase,
    "market_reference_normalized_evidence",
    "candidate_id,normalizer_version",
    (query) => query.eq("source", source).order("candidate_id", { ascending: true }),
  );
  return new Set(rows.map((row) => `${row.candidate_id}:${row.normalizer_version}`));
}

function candidateInsertRow(candidate) {
  return {
    acquisition_run_id: null,
    raw_snapshot_id: null,
    card_print_id: candidate.card_print_id,
    gv_id: candidate.gv_id,
    source: candidate.source,
    source_type: "reference",
    source_url: candidate.source_url ?? null,
    raw_title: candidate.raw_title ?? null,
    raw_price: candidate.raw_price ?? null,
    currency: candidate.currency ?? null,
    condition_hint: candidate.condition_hint ?? null,
    finish_hint: candidate.finish_hint ?? null,
    observed_at: candidate.observed_at,
    match_confidence_hint: candidate.match_confidence_hint ?? "unreviewed",
    exclusion_flags: candidate.exclusion_flags ?? [],
    needs_review: true,
    can_publish_price_directly: false,
    raw_payload: candidate.raw_payload ?? {},
    candidate_hash: referenceCandidateHashV1(candidate),
  };
}

function normalizedProjectionRow(row) {
  return {
    candidate_hash: referenceCandidateHashV1(row),
    card_print_id: row.card_print_id,
    source: row.source,
    normalizer_version: row.normalizer_version,
    metric_key: row.metric_key ?? null,
    metric_family: row.metric_family ?? null,
    normalized_price: row.normalized_price ?? null,
    normalized_currency: row.normalized_currency ?? null,
    model_disposition: row.model_disposition,
    model_eligible: row.model_eligible === true,
    evidence_quality_score: row.evidence_quality_score ?? null,
    weight_hint: row.weight_hint ?? null,
    quality_flags: row.quality_flags ?? [],
    group_reference_median: row.group_reference_median ?? null,
    normalized_payload: {
      gv_id: row.gv_id ?? null,
      source_url: row.source_url ?? null,
      raw_title: row.raw_title ?? null,
      condition_hint: row.condition_hint ?? null,
      finish_hint: row.finish_hint ?? null,
      observed_at: row.observed_at ?? null,
      match_confidence_hint: row.match_confidence_hint ?? null,
      needs_review: row.needs_review === true,
      can_publish_price_directly: false,
      raw_payload: row.raw_payload ?? {},
    },
  };
}

function dedupeBy(rows, getKey) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function plannedSourcesFromInventory(inventory) {
  return [
    {
      source: "pokemontcg_io_reference",
      acquisitionPath: inventory.pokemontcg_io_reference.acquisition_path,
      normalizedPath: inventory.pokemontcg_io_reference.normalized_path,
    },
    {
      source: "tcgcsv_reference",
      acquisitionPath: inventory.tcgcsv_reference.acquisition_path,
      normalizedPath: inventory.tcgcsv_reference.normalized_path,
    },
  ];
}

async function buildSourceDeltaPlan({ supabase, inventory }) {
  const sourcePlans = [];
  const findings = [];

  for (const item of plannedSourcesFromInventory(inventory)) {
    const acquisition = readJsonIfPresent(item.acquisitionPath ? path.join(REPO_ROOT, item.acquisitionPath) : null);
    const normalized = readJsonIfPresent(item.normalizedPath ? path.join(REPO_ROOT, item.normalizedPath) : null);
    if (!acquisition || !normalized) {
      findings.push(`${item.source}:source_artifacts_missing`);
      continue;
    }
    const existingCandidateMap = await fetchExistingCandidateMap(supabase, item.source);
    const existingNormalizedKeys = await fetchExistingNormalizedKeys(supabase, item.source);
    const candidateRows = dedupeBy(
      (acquisition.candidate_evidence ?? [])
        .filter((row) => row.source === item.source)
        .map(candidateInsertRow),
      (row) => `${row.source}:${row.candidate_hash}`,
    );
    const normalizedRows = dedupeBy(
      (normalized.normalized_evidence ?? [])
        .filter((row) => row.source === item.source)
        .map(normalizedProjectionRow),
      (row) => `${row.source}:${row.candidate_hash}:${row.normalizer_version}`,
    );
    const candidateRowsByHash = new Map(candidateRows.map((row) => [row.candidate_hash, row]));
    const missingCandidateRows = candidateRows.filter((row) => !existingCandidateMap.has(row.candidate_hash));
    const unresolvedNormalizedRows = normalizedRows.filter((row) => (
      !existingCandidateMap.has(row.candidate_hash) && !candidateRowsByHash.has(row.candidate_hash)
    ));
    const missingNormalizedRows = normalizedRows.filter((row) => {
      const candidateId = existingCandidateMap.get(row.candidate_hash);
      if (!candidateId) return candidateRowsByHash.has(row.candidate_hash);
      return !existingNormalizedKeys.has(`${candidateId}:${row.normalizer_version}`);
    });

    const sourceFindings = [];
    if (candidateRows.some((row) => row.can_publish_price_directly !== false)) sourceFindings.push("direct_publish_candidate_detected");
    if (candidateRows.some((row) => row.needs_review !== true)) sourceFindings.push("candidate_missing_review_gate");
    if (unresolvedNormalizedRows.length > 0) sourceFindings.push("normalized_rows_without_candidate_hash_match");
    if (sourceFindings.length > 0) {
      findings.push(...sourceFindings.map((finding) => `${item.source}:${finding}`));
    }

    sourcePlans.push({
      source: item.source,
      acquisition_path: item.acquisitionPath,
      normalized_path: item.normalizedPath,
      projected_candidate_rows: candidateRows.length,
      projected_normalized_rows: normalizedRows.length,
      existing_candidate_rows: existingCandidateMap.size,
      existing_normalized_rows: existingNormalizedKeys.size,
      missing_candidate_rows: missingCandidateRows.length,
      missing_normalized_rows: missingNormalizedRows.length,
      unresolved_normalized_rows: unresolvedNormalizedRows.length,
      ready_for_insert: sourceFindings.length === 0,
      rows: {
        missing_candidate_rows: missingCandidateRows,
        missing_normalized_rows: missingNormalizedRows,
      },
    });
  }

  return { sourcePlans, findings };
}

async function insertChunked(supabase, table, rows, { chunkSize, select = null }) {
  const inserted = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const query = supabase.from(table).insert(chunk);
      const response = select ? await query.select(select) : await query;
      data = response.data;
      error = response.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
    if (error) throw new Error(`[mee-reference-delta-writer] insert failed for ${table} at offset ${index}: ${error.message}`);
    inserted.push(...(data ?? []));
  }
  return inserted;
}

async function applySourceDeltaPlan({ supabase, sourcePlans, chunkSize }) {
  const applyResults = [];
  for (const sourcePlan of sourcePlans) {
    if (!sourcePlan.ready_for_insert) {
      applyResults.push({ source: sourcePlan.source, skipped: true, reason: "source_plan_not_ready" });
      continue;
    }
    if (sourcePlan.missing_candidate_rows === 0 && sourcePlan.missing_normalized_rows === 0) {
      applyResults.push({ source: sourcePlan.source, skipped: true, reason: "no_missing_rows" });
      continue;
    }

    const insertedCandidates = await insertChunked(
      supabase,
      "market_reference_candidates",
      sourcePlan.rows.missing_candidate_rows,
      { chunkSize, select: "id,candidate_hash" },
    );
    const candidateIdByHash = new Map(insertedCandidates.map((row) => [row.candidate_hash, row.id]));
    const existingCandidateMap = await fetchExistingCandidateMap(supabase, sourcePlan.source);
    for (const [hash, id] of existingCandidateMap.entries()) {
      if (!candidateIdByHash.has(hash)) candidateIdByHash.set(hash, id);
    }
    const normalizedInsertRows = sourcePlan.rows.missing_normalized_rows.map((row) => {
      const candidateId = candidateIdByHash.get(row.candidate_hash);
      if (!candidateId) {
        throw new Error(`[mee-reference-delta-writer] missing candidate_id after insert for ${sourcePlan.source}:${row.candidate_hash}`);
      }
      const { candidate_hash, ...rest } = row;
      return {
        ...rest,
        candidate_id: candidateId,
      };
    });
    await insertChunked(
      supabase,
      "market_reference_normalized_evidence",
      normalizedInsertRows,
      { chunkSize },
    );
    applyResults.push({
      source: sourcePlan.source,
      inserted_candidate_rows: sourcePlan.rows.missing_candidate_rows.length,
      inserted_normalized_rows: normalizedInsertRows.length,
    });
  }
  return applyResults;
}

function renderMarkdown(report) {
  return [
    `# ${PACKAGE_ID}`,
    "",
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Purpose",
    "",
    "Run/dry-run the internal reference warehouse delta writer. It inventories available source artifacts, compares current warehouse source counts, and inserts only missing internal reference rows when explicitly enabled.",
    "",
    "## Boundary",
    "",
    "```json",
    JSON.stringify(report.boundary, null, 2),
    "```",
    "",
    "## Current Warehouse Counts",
    "",
    "```json",
    JSON.stringify(report.current_warehouse_counts, null, 2),
    "```",
    "",
    "## Artifact Inventory",
    "",
    "```json",
    JSON.stringify(report.artifact_inventory, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Delta Plan",
    "",
    "```json",
    JSON.stringify(report.delta_plan_summary ?? null, null, 2),
    "```",
    "",
    "## Apply Results",
    "",
    "```json",
    JSON.stringify(report.apply_results ?? null, null, 2),
    "```",
    "",
    "## Next",
    "",
    "Generate complete TCGDex row manifests on the droplet reference-refresh pass, then implement the guarded missing-row insert mode using these artifact and readback rules.",
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(AUDIT_DIR, { recursive: true });
  const stamp = report.generated_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(AUDIT_DIR, `mee_reference_warehouse_delta_writer_v1_${stamp}.json`);
  const mdPath = path.join(AUDIT_DIR, `mee_reference_warehouse_delta_writer_v1_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return {
    json: rel(jsonPath),
    markdown: rel(mdPath),
  };
}

export async function buildReferenceWarehouseDeltaWriterDryRunV1({
  generatedAt = new Date().toISOString(),
  run = false,
  chunkSize = 500,
} = {}) {
  if (!Number.isInteger(chunkSize) || chunkSize < 100 || chunkSize > 1000) {
    throw new Error("[mee-reference-delta-writer] chunkSize must be an integer from 100 to 1000");
  }
  const supabase = createBackendClient();
  const [candidateCounts, normalizedCounts] = await Promise.all([
    countRowsBySource(supabase, "market_reference_candidates"),
    countRowsBySource(supabase, "market_reference_normalized_evidence"),
  ]);
  const artifactInventory = await buildArtifactInventory({ candidateCounts, normalizedCounts });
  const deltaPlan = await buildSourceDeltaPlan({ supabase, inventory: artifactInventory });
  const findings = [
    ...artifactInventory.tcgdex.findings,
    ...artifactInventory.pokemontcg_io_reference.findings,
    ...artifactInventory.tcgcsv_reference.findings,
    ...deltaPlan.findings,
  ];
  const totalMissingCandidateRows = deltaPlan.sourcePlans.reduce((sum, plan) => sum + plan.missing_candidate_rows, 0);
  const totalMissingNormalizedRows = deltaPlan.sourcePlans.reduce((sum, plan) => sum + plan.missing_normalized_rows, 0);
  const allowRun = process.env.MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN === "1";
  const runFindings = [];
  if (run && !allowRun) runFindings.push("MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN_not_set_to_1");
  if (run && findings.length > 0) runFindings.push("preflight_findings_block_run");
  let applyResults = [];
  if (run && runFindings.length === 0) {
    applyResults = await applySourceDeltaPlan({
      supabase,
      sourcePlans: deltaPlan.sourcePlans,
      chunkSize,
    });
  }
  const allFindings = [...findings, ...runFindings];
  const reportCore = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    contract_version: MARKET_REFERENCE_WAREHOUSE_AUTOMATED_APPLY_CONTRACT_VERSION,
    mode: run ? "guarded_run_missing_rows_only" : "dry_run_read_only_no_writes",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: run && applyResults.some((result) => (result.inserted_candidate_rows ?? 0) > 0 || (result.inserted_normalized_rows ?? 0) > 0),
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
    current_warehouse_counts: {
      market_reference_candidates: candidateCounts,
      market_reference_normalized_evidence: normalizedCounts,
    },
    artifact_inventory: artifactInventory,
    source_projection: sourceProjectionFromInventory(artifactInventory),
    delta_plan_summary: {
      sources: deltaPlan.sourcePlans.map((plan) => ({
        source: plan.source,
        projected_candidate_rows: plan.projected_candidate_rows,
        projected_normalized_rows: plan.projected_normalized_rows,
        existing_candidate_rows: plan.existing_candidate_rows,
        existing_normalized_rows: plan.existing_normalized_rows,
        missing_candidate_rows: plan.missing_candidate_rows,
        missing_normalized_rows: plan.missing_normalized_rows,
        unresolved_normalized_rows: plan.unresolved_normalized_rows,
        ready_for_insert: plan.ready_for_insert,
      })),
      total_missing_candidate_rows: totalMissingCandidateRows,
      total_missing_normalized_rows: totalMissingNormalizedRows,
    },
    apply_results: applyResults,
    ready_for_internal_writer_apply_contract: allFindings.length === 0,
    findings: allFindings,
  };
  const report = {
    ...reportCore,
    package_fingerprint_sha256: sha256(reportCore),
  };
  report.artifacts = writeReport(report);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseArgs(process.argv.slice(2));
  const report = await buildReferenceWarehouseDeltaWriterDryRunV1({
    run: args.run,
    chunkSize: args.chunkSize,
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.findings.length > 0) process.exitCode = 1;
}
