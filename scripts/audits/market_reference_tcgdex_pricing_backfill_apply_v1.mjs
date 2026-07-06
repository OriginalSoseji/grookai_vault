import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  PACKAGE_ID as AUDIT_PACKAGE_ID,
  TCGDEX_CARDMARKET_SOURCE,
  TCGDEX_TCGPLAYER_SOURCE,
  buildTcgdexReferencePricingAuditV1,
  sha256V1,
} from "../../backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs";

export const PACKAGE_ID = "MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-APPLY-V1";
export const EXPECTED_AUDIT_PACKAGE_FINGERPRINT = "da6b070aef331e3b3e193e841038232b58031f2ef31fe38790119cd2bf8ba899";
export const EXPECTED_BACKFILL_PLAN_FINGERPRINT = "60ed28faf7ed421344fe4637e421d0b1e7029a563fc8ee1d46caede95e0aa4c9";
export const EXPECTED_CANDIDATE_ROWS_HASH = "f4864fffb268dba1bb4c1d784d7d12e84dca2d98e095f23dad8920cc7a10cea7";
export const EXPECTED_NORMALIZED_ROWS_HASH = "543bb50256c54ed34831816ec08ea9de962b7d1629d2e2ba2ac443375ebe2a4e";
export const EXPECTED_CANDIDATE_ROWS = 310744;
export const EXPECTED_NORMALIZED_ROWS = 310744;
export const EXPECTED_UNIQUE_CARD_PRINTS = 19134;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const TARGET_SOURCES = [TCGDEX_TCGPLAYER_SOURCE, TCGDEX_CARDMARKET_SOURCE];

function parseArgs(argv) {
  const parsed = {
    apply: false,
    resumeNormalized: false,
    chunkSize: 1000,
    outDir: AUDIT_DIR,
  };
  for (const arg of argv) {
    if (arg === "--apply") parsed.apply = true;
    else if (arg === "--resume-normalized") parsed.resumeNormalized = true;
    else if (arg.startsWith("--chunk-size=")) parsed.chunkSize = Number(arg.slice("--chunk-size=".length));
    else if (arg.startsWith("--out-dir=")) parsed.outDir = path.resolve(arg.slice("--out-dir=".length));
  }
  if (!Number.isInteger(parsed.chunkSize) || parsed.chunkSize < 100 || parsed.chunkSize > 1000) {
    throw new Error("[tcgdex-backfill-apply] --chunk-size must be an integer from 100 to 1000");
  }
  return parsed;
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function fetchAll(supabase, table, select, configure = (query) => query) {
  const rows = [];
  for (let from = 0;; from += 1000) {
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await configure(supabase.from(table).select(select).range(from, from + 999));
      data = response.data;
      error = response.error;
      if (!error) break;
      await sleep(attempt * 1000);
    }
    if (error) throw new Error(`[tcgdex-backfill-apply] ${table} read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchCardPrintsByIds(supabase, ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const rows = [];
  for (let index = 0; index < uniqueIds.length; index += 250) {
    const chunk = uniqueIds.slice(index, index + 250);
    let data = null;
    let error = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await supabase
        .from("card_prints")
        .select("id,gv_id,name,number,number_plain,set_code,rarity")
        .in("id", chunk);
      data = response.data;
      error = response.error;
      if (!error) break;
      await sleep(attempt * 1000);
    }
    if (error) throw new Error(`[tcgdex-backfill-apply] card_prints read failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

async function sourceCount(supabase, table, source) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("source", source);
  if (error) throw new Error(`[tcgdex-backfill-apply] ${table} source count failed: ${error.message}`);
  return count ?? 0;
}

async function existingSourceCounts(supabase) {
  const out = {
    market_reference_candidates: {},
    market_reference_normalized_evidence: {},
  };
  for (const source of TARGET_SOURCES) {
    out.market_reference_candidates[source] = await sourceCount(supabase, "market_reference_candidates", source);
    out.market_reference_normalized_evidence[source] = await sourceCount(supabase, "market_reference_normalized_evidence", source);
  }
  return out;
}

function candidateInsertRows(candidateRows) {
  return candidateRows.map((row) => ({
    acquisition_run_id: null,
    raw_snapshot_id: null,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    source: row.source,
    source_type: row.source_type,
    source_url: row.source_url,
    raw_title: row.raw_title,
    raw_price: row.raw_price,
    currency: row.currency,
    condition_hint: row.condition_hint,
    finish_hint: row.finish_hint,
    observed_at: row.observed_at,
    match_confidence_hint: row.match_confidence_hint,
    exclusion_flags: row.exclusion_flags,
    needs_review: row.needs_review,
    can_publish_price_directly: row.can_publish_price_directly,
    raw_payload: row.raw_payload,
    candidate_hash: row.candidate_hash,
  }));
}

function normalizedInsertRows(normalizedRows, candidateIdByHash) {
  return normalizedRows.map((row) => {
    const candidateId = candidateIdByHash.get(`${row.source}:${row.candidate_hash}`);
    if (!candidateId) {
      throw new Error(`[tcgdex-backfill-apply] missing candidate_id for ${row.source}:${row.candidate_hash}`);
    }
    return {
      candidate_id: candidateId,
      card_print_id: row.card_print_id,
      source: row.source,
      normalizer_version: row.normalizer_version,
      metric_key: row.metric_key,
      metric_family: row.metric_family,
      normalized_price: row.normalized_price,
      normalized_currency: row.normalized_currency,
      model_disposition: row.model_disposition,
      model_eligible: row.model_eligible,
      evidence_quality_score: row.evidence_quality_score,
      weight_hint: row.weight_hint,
      quality_flags: row.quality_flags,
      group_reference_median: row.group_reference_median,
      normalized_payload: row.normalized_payload,
    };
  });
}

async function insertChunked(supabase, table, rows, { chunkSize, select = null, label = table }) {
  const returned = [];
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
      await sleep(attempt * 1500);
    }
    if (error) {
      throw new Error(`[tcgdex-backfill-apply] insert failed for ${label} at offset ${index}: ${error.message}`);
    }
    if (select) returned.push(...(data ?? []));
    if ((index / chunkSize) % 25 === 0) {
      console.log(`[tcgdex-backfill-apply] inserted ${label} ${Math.min(index + chunk.length, rows.length)}/${rows.length}`);
    }
  }
  return returned;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildAuditFromRemote(supabase, generatedAt) {
  const [rawImports, mappings, sourceCounts] = await Promise.all([
    fetchAll(supabase, "raw_imports", "id,payload,source,status,ingested_at,processed_at", (query) => query.eq("source", "tcgdex")),
    fetchAll(supabase, "external_mappings", "id,card_print_id,source,external_id,active,synced_at", (query) => query.eq("source", "tcgdex").eq("active", true)),
    existingSourceCounts(supabase),
  ]);
  const mappingMap = new Map();
  for (const mapping of mappings) {
    const rows = mappingMap.get(mapping.external_id) ?? [];
    rows.push(mapping);
    mappingMap.set(mapping.external_id, rows);
  }
  const cardPrintsById = await fetchCardPrintsByIds(supabase, mappings.map((row) => row.card_print_id));
  const audit = buildTcgdexReferencePricingAuditV1({
    rawImports,
    tcgdexMappings: mappingMap,
    cardPrintsById,
    existingSourceCounts: sourceCounts.market_reference_candidates,
    generatedAt,
    sampleLimit: 25,
  });
  return { audit, sourceCounts };
}

function expectedCandidateCountsBySource(audit) {
  return {
    [TCGDEX_TCGPLAYER_SOURCE]: audit.counts.candidates_by_source[TCGDEX_TCGPLAYER_SOURCE] ?? 0,
    [TCGDEX_CARDMARKET_SOURCE]: audit.counts.candidates_by_source[TCGDEX_CARDMARKET_SOURCE] ?? 0,
  };
}

function validateAudit(audit, sourceCounts, args = {}) {
  const findings = [];
  if (audit.package_id !== AUDIT_PACKAGE_ID) findings.push("audit_package_id_mismatch");
  if (audit.hashes.package_fingerprint !== EXPECTED_AUDIT_PACKAGE_FINGERPRINT) findings.push("audit_package_fingerprint_mismatch");
  if (audit.hashes.candidate_rows_hash !== EXPECTED_CANDIDATE_ROWS_HASH) findings.push("candidate_rows_hash_mismatch");
  if (audit.hashes.normalized_rows_hash !== EXPECTED_NORMALIZED_ROWS_HASH) findings.push("normalized_rows_hash_mismatch");
  if (audit.summary.projected_market_reference_candidate_rows !== EXPECTED_CANDIDATE_ROWS) findings.push("candidate_row_count_mismatch");
  if (audit.summary.projected_market_reference_normalized_evidence_rows !== EXPECTED_NORMALIZED_ROWS) findings.push("normalized_row_count_mismatch");
  if (audit.summary.projected_unique_card_prints !== EXPECTED_UNIQUE_CARD_PRINTS) findings.push("unique_card_print_count_mismatch");
  const ignoredResumeFindings = new Set(args.resumeNormalized ? ["target_sources_already_have_rows"] : []);
  const activeAuditFindings = audit.findings.filter((finding) => !ignoredResumeFindings.has(finding));
  if (activeAuditFindings.length > 0) findings.push("input_audit_contains_findings");
  if (audit.proofs.no_candidate_can_publish_directly !== true) findings.push("candidate_public_boundary_failed");
  if (audit.proofs.all_candidates_need_review !== true) findings.push("candidate_review_boundary_failed");
  if (audit.proofs.all_candidate_hashes_unique !== true) findings.push("candidate_hash_uniqueness_failed");
  if (audit.row_manifests.candidate_rows.some((row) => !row.observed_at)) findings.push("candidate_observed_at_missing");
  if (audit.row_manifests.normalized_evidence_rows.some((row) => row.source === "ebay_active")) findings.push("unexpected_ebay_source_in_normalized_rows");
  const expectedCandidatesBySource = expectedCandidateCountsBySource(audit);
  const candidatesAlreadyComplete = TARGET_SOURCES.every(
    (source) => sourceCounts.market_reference_candidates[source] === expectedCandidatesBySource[source],
  );
  const normalizedEmpty = Object.values(sourceCounts.market_reference_normalized_evidence).every((count) => count === 0);
  if (Object.values(sourceCounts.market_reference_candidates).some((count) => count > 0)) {
    if (!(args.resumeNormalized && candidatesAlreadyComplete && normalizedEmpty)) {
      findings.push("target_candidate_sources_already_have_rows");
    }
  }
  if (Object.values(sourceCounts.market_reference_normalized_evidence).some((count) => count > 0)) findings.push("target_normalized_sources_already_have_rows");
  return findings;
}

async function readbackSummary(supabase) {
  const candidateCounts = {};
  const normalizedCounts = {};
  for (const source of TARGET_SOURCES) {
    candidateCounts[source] = await sourceCount(supabase, "market_reference_candidates", source);
    normalizedCounts[source] = await sourceCount(supabase, "market_reference_normalized_evidence", source);
  }
  return {
    market_reference_candidates: candidateCounts,
    market_reference_normalized_evidence: normalizedCounts,
    total_candidates: Object.values(candidateCounts).reduce((sum, count) => sum + count, 0),
    total_normalized: Object.values(normalizedCounts).reduce((sum, count) => sum + count, 0),
  };
}

async function fetchInsertedCandidateMap(supabase) {
  const rows = [];
  for (const source of TARGET_SOURCES) {
    const sourceRows = await fetchAll(
      supabase,
      "market_reference_candidates",
      "id,source,candidate_hash",
      (query) => query
        .eq("source", source)
        .order("candidate_hash", { ascending: true })
        .order("id", { ascending: true }),
    );
    for (const row of sourceRows) rows.push(row);
  }
  const map = new Map();
  for (const row of rows) {
    const key = `${row.source}:${row.candidate_hash}`;
    if (map.has(key)) throw new Error(`[tcgdex-backfill-apply] duplicate remote candidate_hash ${key}`);
    map.set(key, row.id);
  }
  return { map, rows };
}

async function applyRows({ supabase, audit, chunkSize, resumeNormalized = false }) {
  const candidateRows = audit.row_manifests.candidate_rows;
  const normalizedRows = audit.row_manifests.normalized_evidence_rows;
  let insertedCandidateCount = 0;
  if (!resumeNormalized) {
    const insertedCandidates = await insertChunked(
      supabase,
      "market_reference_candidates",
      candidateInsertRows(candidateRows),
      { chunkSize, select: "id,source,candidate_hash", label: "market_reference_candidates" },
    );
    insertedCandidateCount = insertedCandidates.length;
    if (insertedCandidates.length !== candidateRows.length) {
      throw new Error(`[tcgdex-backfill-apply] inserted candidate count mismatch ${insertedCandidates.length} != ${candidateRows.length}`);
    }
  }
  const { map: candidateIdByHash, rows: remoteCandidateRows } = await fetchInsertedCandidateMap(supabase);
  if (remoteCandidateRows.length !== candidateRows.length) {
    throw new Error(`[tcgdex-backfill-apply] remote candidate readback mismatch ${remoteCandidateRows.length} != ${candidateRows.length}`);
  }
  const normalizedInsert = normalizedInsertRows(normalizedRows, candidateIdByHash);
  await insertChunked(
    supabase,
    "market_reference_normalized_evidence",
    normalizedInsert,
    { chunkSize, select: null, label: "market_reference_normalized_evidence" },
  );
  return {
    market_reference_candidates_inserted: insertedCandidateCount,
    market_reference_candidates_reused_for_resume: resumeNormalized ? candidateRows.length : 0,
    market_reference_normalized_evidence_inserted: normalizedRows.length,
  };
}

function buildReport({ generatedAt, audit, sourceCounts, findings, args, applied = false, applyResult = null, readback = null }) {
  const packageFingerprint = sha256V1({
    package_id: PACKAGE_ID,
    audit_package_fingerprint: audit.hashes.package_fingerprint,
    backfill_plan_fingerprint: EXPECTED_BACKFILL_PLAN_FINGERPRINT,
    candidate_rows_hash: audit.hashes.candidate_rows_hash,
    normalized_rows_hash: audit.hashes.normalized_rows_hash,
    row_counts: {
      market_reference_candidates: audit.summary.projected_market_reference_candidate_rows,
      market_reference_normalized_evidence: audit.summary.projected_market_reference_normalized_evidence_rows,
    },
    boundary: {
      public_pricing: false,
      app_visible_pricing: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
    },
  });
  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: args.apply ? "apply_requested" : "preflight_only",
    ready_for_apply: findings.length === 0,
    applied,
    package_fingerprint_sha256: packageFingerprint,
    audit_package_fingerprint_sha256: audit.hashes.package_fingerprint,
    backfill_plan_fingerprint_sha256: EXPECTED_BACKFILL_PLAN_FINGERPRINT,
    row_hashes: {
      candidate_rows_hash: audit.hashes.candidate_rows_hash,
      normalized_rows_hash: audit.hashes.normalized_rows_hash,
    },
    proposed_table_row_counts: {
      market_reference_candidates: audit.summary.projected_market_reference_candidate_rows,
      market_reference_normalized_evidence: audit.summary.projected_market_reference_normalized_evidence_rows,
      unique_card_prints: audit.summary.projected_unique_card_prints,
      model_eligible_rows: audit.summary.projected_model_eligible_rows,
      quarantined_rows: audit.summary.projected_quarantined_rows,
    },
    remote_preflight_source_counts: sourceCounts,
    transport: {
      chunk_size: args.chunkSize,
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: applied,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      card_print_writes: false,
      card_printing_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    apply_result: applyResult,
    readback,
    findings,
  };
}

function renderMarkdown(report) {
  return [
    "# MEE TCGdex Reference Pricing Backfill Apply V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready for apply: \`${report.ready_for_apply}\``,
    `- Applied: \`${report.applied}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Rows",
    "",
    `- Candidates: ${report.proposed_table_row_counts.market_reference_candidates}`,
    `- Normalized evidence: ${report.proposed_table_row_counts.market_reference_normalized_evidence}`,
    `- Unique card prints: ${report.proposed_table_row_counts.unique_card_prints}`,
    `- Model-eligible rows: ${report.proposed_table_row_counts.model_eligible_rows}`,
    `- Quarantined rows: ${report.proposed_table_row_counts.quarantined_rows}`,
    "",
    "## Boundary",
    "",
    "- Internal `market_reference_*` warehouse only.",
    "- No public/app-visible pricing.",
    "- No `pricing_observations` writes.",
    "- No `ebay_active_prices_latest` writes.",
    "- No identity, card, vault, image, delete, upsert, merge, migration, or global apply.",
    "",
    "## Readback",
    "",
    "```json",
    JSON.stringify(report.readback ?? report.remote_preflight_source_counts, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

async function writeReport(report, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = report.generated_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `mee_tcgdex_reference_pricing_backfill_apply_${stamp}.json`);
  const mdPath = path.join(outDir, `mee_tcgdex_reference_pricing_backfill_apply_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));
  return { json: rel(jsonPath), markdown: rel(mdPath) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const supabase = createBackendClient();
  const { audit, sourceCounts } = await buildAuditFromRemote(supabase, generatedAt);
  const findings = validateAudit(audit, sourceCounts, args);
  let report = buildReport({ generatedAt, audit, sourceCounts, findings, args });

  if (args.apply && report.ready_for_apply) {
    try {
      const applyResult = await applyRows({
        supabase,
        audit,
        chunkSize: args.chunkSize,
        resumeNormalized: args.resumeNormalized,
      });
      const readback = await readbackSummary(supabase);
      const readbackFindings = [];
      if (readback.total_candidates !== EXPECTED_CANDIDATE_ROWS) readbackFindings.push("candidate_readback_count_mismatch");
      if (readback.total_normalized !== EXPECTED_NORMALIZED_ROWS) readbackFindings.push("normalized_readback_count_mismatch");
      report = buildReport({
        generatedAt,
        audit,
        sourceCounts,
        findings: [...findings, ...readbackFindings],
        args,
        applied: readbackFindings.length === 0,
        applyResult,
        readback,
      });
      if (readbackFindings.length > 0) process.exitCode = 1;
    } catch (error) {
      report.findings.push(`apply_failed:${error.message}`);
      report.ready_for_apply = false;
      report.applied = false;
      process.exitCode = 1;
    }
  } else if (args.apply) {
    process.exitCode = 1;
  }

  const artifacts = await writeReport(report, args.outDir);
  console.log(JSON.stringify({
    package_id: report.package_id,
    mode: report.mode,
    ready_for_apply: report.ready_for_apply,
    applied: report.applied,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    readback: report.readback,
    findings: report.findings,
    artifacts,
  }, null, 2));
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
