import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  PACKAGE_ID,
  TCGDEX_CARDMARKET_SOURCE,
  TCGDEX_TCGPLAYER_SOURCE,
  buildTcgdexReferencePricingAuditV1,
} from "../../backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");

function parseArgs(argv) {
  const parsed = {
    outDir: DEFAULT_OUT_DIR,
    sampleLimit: 50,
    writeRowManifests: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--out-dir=")) parsed.outDir = path.resolve(arg.slice("--out-dir=".length));
    else if (arg.startsWith("--sample-limit=")) parsed.sampleLimit = Number(arg.slice("--sample-limit=".length));
    else if (arg === "--write-row-manifests") parsed.writeRowManifests = true;
  }
  if (!Number.isInteger(parsed.sampleLimit) || parsed.sampleLimit < 1) {
    throw new Error("[tcgdex-pricing-audit] --sample-limit must be a positive integer");
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
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const query = configure(supabase.from(table).select(select).range(from, from + 999));
      const response = await query;
      data = response.data;
      error = response.error;
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
    if (error) throw new Error(`[tcgdex-pricing-audit] ${table} read failed: ${error.message}`);
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
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
    if (error) throw new Error(`[tcgdex-pricing-audit] card_prints read failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [row.id, row]));
}

async function existingSourceCounts(supabase) {
  const out = {};
  for (const source of [TCGDEX_TCGPLAYER_SOURCE, TCGDEX_CARDMARKET_SOURCE]) {
    const { count, error } = await supabase
      .from("market_reference_candidates")
      .select("*", { count: "exact", head: true })
      .eq("source", source);
    if (error) throw new Error(`[tcgdex-pricing-audit] existing source count failed: ${error.message}`);
    out[source] = count ?? 0;
  }
  return out;
}

function writeJsonlRows(rows) {
  return rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length > 0 ? "\n" : "");
}

function withoutRowManifests(report) {
  const { row_manifests, ...rest } = report;
  return {
    ...rest,
    row_manifest_counts: {
      candidate_rows: row_manifests.candidate_rows.length,
      normalized_evidence_rows: row_manifests.normalized_evidence_rows.length,
    },
  };
}

function tableRows(counts) {
  return Object.entries(counts ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `| ${String(key).replace(/\|/g, "\\|")} | ${count} |`);
}

function renderMarkdown(report, artifacts) {
  return [
    "# MEE-TCGDEX Reference Pricing Audit V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Read-only DB audit.",
    "- No provider calls.",
    "- No source fetches.",
    "- No DB writes.",
    "- No pricing_observations writes.",
    "- No ebay_active_prices_latest writes.",
    "- No public pricing views.",
    "- No app-visible pricing.",
    "- No identity, vault, image, delete, migration, merge, or global apply.",
    "",
    "## Summary",
    "",
    `- TCGdex raw imports: ${report.summary.tcgdex_raw_import_rows}`,
    `- TCGdex card raw imports: ${report.summary.tcgdex_card_raw_import_rows}`,
    `- Card raw imports with pricing: ${report.summary.tcgdex_card_raw_import_rows_with_pricing}`,
    `- Mapped pricing card imports: ${report.summary.mapped_pricing_raw_import_rows}`,
    `- Unmapped/ambiguous pricing card imports: ${report.summary.unmapped_or_ambiguous_pricing_raw_import_rows}`,
    `- Projected candidate rows: ${report.summary.projected_market_reference_candidate_rows}`,
    `- Projected normalized evidence rows: ${report.summary.projected_market_reference_normalized_evidence_rows}`,
    `- Projected model-eligible rows: ${report.summary.projected_model_eligible_rows}`,
    `- Projected quarantined rows: ${report.summary.projected_quarantined_rows}`,
    `- Projected unique card prints: ${report.summary.projected_unique_card_prints}`,
    "",
    "## Source Counts",
    "",
    "| Source | Projected candidate rows |",
    "| --- | ---: |",
    ...tableRows(report.counts.candidates_by_source),
    "",
    "## Disposition Counts",
    "",
    "| Disposition | Projected normalized rows |",
    "| --- | ---: |",
    ...tableRows(report.counts.normalized_by_disposition),
    "",
    "## Proofs",
    "",
    `- no_candidate_can_publish_directly: ${report.proofs.no_candidate_can_publish_directly}`,
    `- all_candidates_need_review: ${report.proofs.all_candidates_need_review}`,
    `- all_candidates_have_card_print_id: ${report.proofs.all_candidates_have_card_print_id}`,
    `- all_candidates_have_gv_id: ${report.proofs.all_candidates_have_gv_id}`,
    `- all_candidate_hashes_unique: ${report.proofs.all_candidate_hashes_unique}`,
    `- no_public_boundary_leak: ${report.proofs.no_public_boundary_leak}`,
    "",
    "## Hashes",
    "",
    `- candidate_rows_hash: \`${report.hashes.candidate_rows_hash}\``,
    `- normalized_rows_hash: \`${report.hashes.normalized_rows_hash}\``,
    `- package_fingerprint: \`${report.hashes.package_fingerprint}\``,
    "",
    "## Artifacts",
    "",
    `- JSON report: ${artifacts.json}`,
    `- Markdown report: ${artifacts.markdown}`,
    `- Candidate row JSONL: ${artifacts.candidates ?? "not materialized; rerun with --write-row-manifests for apply packaging"}`,
    `- Normalized evidence JSONL: ${artifacts.normalized ?? "not materialized; rerun with --write-row-manifests for apply packaging"}`,
    "",
    "## Findings",
    "",
    ...(report.findings.length > 0 ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Step",
    "",
    "Prepare a guarded backfill plan that inserts the projected TCGdex reference candidates and normalized evidence into `market_reference_*` only, then refresh internal reference rollups. Keep all rows review-only and non-public.",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const supabase = createBackendClient();

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
    existingSourceCounts: sourceCounts,
    generatedAt,
    sampleLimit: args.sampleLimit,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_tcgdex_reference_pricing_audit_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_tcgdex_reference_pricing_audit_${stamp}.md`);
  const candidatePath = path.join(args.outDir, `mee_tcgdex_reference_pricing_candidates_${stamp}.jsonl`);
  const normalizedPath = path.join(args.outDir, `mee_tcgdex_reference_pricing_normalized_${stamp}.jsonl`);
  const report = withoutRowManifests(audit);
  const artifacts = {
    json: rel(jsonPath),
    markdown: rel(mdPath),
    candidates: args.writeRowManifests ? rel(candidatePath) : null,
    normalized: args.writeRowManifests ? rel(normalizedPath) : null,
  };

  if (args.writeRowManifests) {
    await fs.writeFile(candidatePath, writeJsonlRows(audit.row_manifests.candidate_rows));
    await fs.writeFile(normalizedPath, writeJsonlRows(audit.row_manifests.normalized_evidence_rows));
  }
  await fs.writeFile(jsonPath, `${JSON.stringify({ ...report, artifacts }, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report, artifacts));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    projected_candidate_rows: audit.summary.projected_market_reference_candidate_rows,
    projected_normalized_rows: audit.summary.projected_market_reference_normalized_evidence_rows,
    projected_unique_card_prints: audit.summary.projected_unique_card_prints,
    findings: audit.findings,
    hashes: audit.hashes,
    artifacts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
