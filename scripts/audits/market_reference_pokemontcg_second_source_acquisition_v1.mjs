import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import { acquirePokemonTcgIoEvidenceV1 } from "../../backend/pricing/market_evidence_pokemontcg_io_acquisition_v1.mjs";
import { buildMarketReferenceSignalAcquisitionWorklistV1 } from "../../backend/pricing/market_reference_signal_acquisition_worklist_v1.mjs";
import {
  MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BATCH_VERSION,
  buildPokemonTcgSecondSourceBatchV1,
} from "../../backend/pricing/market_reference_pokemontcg_second_source_batch_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-ACQUISITION-V1";
export const EXPECTED_FIRST_WAVE_TARGETS = 570;

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const DEFAULT_BASE_URL = "https://api.pokemontcg.io/v2";

function parseArgs(argv) {
  return {
    limit: Number(argv.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length) ?? EXPECTED_FIRST_WAVE_TARGETS),
    offset: Number(argv.find((arg) => arg.startsWith("--offset="))?.slice("--offset=".length) ?? 0),
    fetchMethod: argv.find((arg) => arg.startsWith("--fetch-method="))?.slice("--fetch-method=".length) ?? "curl",
    cacheDir: argv.find((arg) => arg.startsWith("--cache-dir="))?.slice("--cache-dir=".length)
      ?? path.join(AUDIT_DIR, "pokemontcg_second_source_cache_v1"),
    verboseJson: argv.includes("--verbose-json"),
  };
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function fetchAll(supabase, table, select, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(select).range(from, to);
    if (error) throw new Error(`[pokemontcg-second-source] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchCardPrintsByIds(supabase, ids) {
  const rows = [];
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const chunk = uniqueIds.slice(index, index + 100);
    const { data, error } = await supabase
      .from("card_prints")
      .select("id,gv_id,name,set_code,printed_set_abbrev,number,number_plain,rarity,external_ids")
      .in("id", chunk);
    if (error) throw new Error(`[pokemontcg-second-source] card_prints read failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function resolvePokemonApiIds(supabase, cardPrints, ids) {
  const mappings = new Map();
  for (const row of cardPrints) {
    const externalId = row?.external_ids?.pokemonapi ?? row?.external_ids?.pokemontcg ?? null;
    if (row?.id && externalId) {
      mappings.set(row.id, { pokemonapi_id: externalId, match_basis: "card_prints.external_ids.pokemonapi" });
    }
  }

  const missing = ids.filter((id) => !mappings.has(id));
  for (let index = 0; index < missing.length; index += 100) {
    const chunk = missing.slice(index, index + 100);
    const { data, error } = await supabase
      .from("external_mappings")
      .select("card_print_id, external_id")
      .eq("source", "pokemonapi")
      .in("card_print_id", chunk);
    if (error) throw new Error(`[pokemontcg-second-source] external_mappings read failed: ${error.message}`);
    for (const row of data ?? []) {
      if (row?.card_print_id && row?.external_id && !mappings.has(row.card_print_id)) {
        mappings.set(row.card_print_id, { pokemonapi_id: row.external_id, match_basis: "external_mappings.pokemonapi" });
      }
    }
  }
  return mappings;
}

function pokemonCardUrl(cardId) {
  const base = process.env.POKEMONAPI_BASE_URL || DEFAULT_BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return new URL(`cards/${encodeURIComponent(cardId)}`, normalizedBase).toString();
}

async function fetchPokemonCardByIdViaCurl(cardId) {
  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--max-time",
    "60",
    "--user-agent",
    "GrookaiMarketEvidenceAudit/1.0",
    "--header",
    "Accept: application/json",
  ];
  if (process.platform === "win32") args.unshift("--ssl-no-revoke");
  const apiKey = process.env.POKEMONAPI_API_KEY;
  if (apiKey) args.push("--header", `X-Api-Key: ${apiKey}`);
  args.push(pokemonCardUrl(cardId));

  const command = process.platform === "win32" ? "curl.exe" : "curl";
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { stdout } = await execFileAsync(command, args, { timeout: 80000, maxBuffer: 8 * 1024 * 1024 });
      const payload = JSON.parse(stdout);
      return payload?.data ?? null;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

function cacheFileFor(cacheDir, id) {
  const safeId = String(id).replace(/[^a-z0-9_.-]/gi, "_");
  return path.join(REPO_ROOT, cacheDir, `${safeId}.json`);
}

async function readCachedCard(cacheDir, id) {
  try {
    const filePath = cacheFileFor(cacheDir, id);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeCachedCard(cacheDir, id, card) {
  await fs.mkdir(path.join(REPO_ROOT, cacheDir), { recursive: true });
  const filePath = cacheFileFor(cacheDir, id);
  await fs.writeFile(filePath, `${JSON.stringify(card, null, 2)}\n`);
}

async function fetchCardsById(ids, { cacheDir }) {
  const cardsByExternalId = {};
  const errors = [];
  let cacheHits = 0;
  let cacheMisses = 0;
  for (const id of ids) {
    try {
      const cached = await readCachedCard(cacheDir, id);
      if (cached) {
        cardsByExternalId[id] = cached;
        cacheHits += 1;
        continue;
      }
      cacheMisses += 1;
      const card = await fetchPokemonCardByIdViaCurl(id);
      if (card) {
        cardsByExternalId[id] = card;
        await writeCachedCard(cacheDir, id, card);
      }
    } catch (error) {
      errors.push({
        id,
        error: error?.message ?? String(error),
        cause_code: error?.cause?.code ?? null,
      });
    }
  }
  return { cardsByExternalId, errors, cacheHits, cacheMisses };
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.acquisition.summary.status_counts ?? {}).map(([status, count]) => `| ${status} | ${count} |`);
  const evidenceRows = report.acquisition.candidate_evidence.slice(0, 30).map((row) => (
    `| ${row.gv_id} | ${row.raw_title.replace(/\|/g, "\\|")} | ${row.currency} | ${row.raw_price} | ${row.finish_hint} | ${row.condition_hint} |`
  ));
  return [
    "# MEE-09I PokemonTCG.io Second Source Acquisition",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready: \`${report.ready}\``,
    `- Range: \`offset ${report.range.offset}, limit ${report.range.limit}, selected ${report.range.selected_targets}/${report.range.first_wave_total}\``,
    `- First-wave targets: \`${report.batch.summary.selected_targets}\``,
    `- Resolved PokemonTCG.io IDs: \`${report.summary.resolved_pokemonapi_ids}\``,
    `- Fetched payloads: \`${report.summary.fetched_payloads}\``,
    `- Candidate evidence: \`${report.acquisition.summary.candidate_evidence_count}\``,
    `- Fetch errors: \`${report.summary.fetch_error_count}\``,
    `- Cache hits: \`${report.summary.cache_hits}\``,
    `- Cache misses: \`${report.summary.cache_misses}\``,
    "",
    "## Boundary",
    "",
    "- Free API reference acquisition only.",
    "- Read-only DB mapping lookup.",
    "- Local evidence artifact only.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No public/app-visible pricing.",
    "",
    "## Target Status",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...statusRows,
    "",
    "## Candidate Evidence Sample",
    "",
    "| GV ID | Raw title | Currency | Price | Finish | Metric |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...evidenceRows,
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!Number.isInteger(args.limit) || args.limit < 1) throw new Error("[pokemontcg-second-source] --limit must be a positive integer");
  if (!Number.isInteger(args.offset) || args.offset < 0) throw new Error("[pokemontcg-second-source] --offset must be a non-negative integer");
  if (args.fetchMethod !== "curl") throw new Error("[pokemontcg-second-source] only curl fetch method is enabled for this pass");
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const supabase = createBackendClient();

  const rollups = await fetchAll(
    supabase,
    "market_reference_signal_rollups",
    "id,card_print_id,gv_id,rollup_version,review_status,currency,reference_low,reference_median,reference_high,source_count,eligible_evidence_count,price_ratio,variance_band,review_flags,source_summary,needs_review,publishable,app_visible,market_truth",
  );
  const cardPrints = await fetchCardPrintsByIds(supabase, rollups.map((row) => row.card_print_id));
  const worklist = buildMarketReferenceSignalAcquisitionWorklistV1({ rollups, cardPrints, firstWaveLimit: EXPECTED_FIRST_WAVE_TARGETS });
  const selected = worklist.first_wave.slice(args.offset, args.offset + args.limit);
  const mappings = await resolvePokemonApiIds(supabase, cardPrints, selected.map((row) => row.card_print_id));
  const batch = buildPokemonTcgSecondSourceBatchV1({
    workItems: selected,
    idMappings: mappings,
    generatedAt,
    limit: selected.length || 1,
  });
  const ids = [...new Set(batch.items.map((item) => item.pokemonapi_id).filter(Boolean))];
  const { cardsByExternalId, errors, cacheHits, cacheMisses } = await fetchCardsById(ids, { cacheDir: args.cacheDir });
  const acquisition = acquirePokemonTcgIoEvidenceV1({
    batch,
    cardsByExternalId,
    generatedAt,
  });
  acquisition.phase = "MEE_09I_POKEMONTCG_IO_SECOND_SOURCE_ACQUISITION_V1";
  acquisition.boundary.provider_calls = true;
  acquisition.boundary.source_fetches = true;
  acquisition.boundary.read_only_db_mapping_lookup = true;
  acquisition.boundary.raw_evidence_objects_persisted_to_db = false;
  acquisition.summary.fetch_error_count = errors.length;
  acquisition.summary.unique_pokemonapi_ids = ids.length;

  const findings = [];
  if (batch.summary.selected_targets !== selected.length) findings.push("selected_target_count_mismatch");
  if (batch.items.some((item) => item.can_publish_price_directly !== false)) findings.push("direct_publish_candidate_detected");
  if (errors.length > 0) findings.push("fetch_errors_present");

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "free_api_second_source_acquisition_no_writes",
    batch_version: MARKET_REFERENCE_POKEMONTCG_SECOND_SOURCE_BATCH_VERSION,
    range: {
      first_wave_total: worklist.first_wave.length,
      offset: args.offset,
      limit: args.limit,
      selected_targets: selected.length,
      next_offset: args.offset + selected.length,
      complete: args.offset + selected.length >= worklist.first_wave.length,
    },
    boundary: {
      provider_calls: true,
      source_fetches: true,
      db_writes: false,
      pricing_observations_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
    },
    summary: {
      first_wave_targets: selected.length,
      resolved_pokemonapi_ids: batch.items.filter((item) => item.pokemonapi_id).length,
      unresolved_pokemonapi_ids: batch.items.filter((item) => !item.pokemonapi_id).length,
      unique_pokemonapi_ids: ids.length,
      fetched_payloads: Object.keys(cardsByExternalId).length,
      fetch_error_count: errors.length,
      cache_hits: cacheHits,
      cache_misses: cacheMisses,
      target_status_counts: acquisition.summary.status_counts,
      candidate_evidence_count: acquisition.summary.candidate_evidence_count,
      evidence_currency_counts: countBy(acquisition.candidate_evidence, (row) => row.currency),
      evidence_finish_counts: countBy(acquisition.candidate_evidence, (row) => row.finish_hint),
    },
    batch,
    acquisition,
    fetch_errors: errors,
    findings,
    ready: findings.length === 0,
  };

  await fs.mkdir(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09i_pokemontcg_second_source_acquisition_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_09i_pokemontcg_second_source_acquisition_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));
  const consoleReport = {
    package_id: report.package_id,
    ready: report.ready,
    range: report.range,
    summary: report.summary,
    findings: report.findings,
    artifacts: { jsonPath: rel(jsonPath), mdPath: rel(mdPath) },
  };
  console.log(JSON.stringify(args.verboseJson ? { ...report, artifacts: consoleReport.artifacts } : consoleReport, null, 2));
  if (!report.ready) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
