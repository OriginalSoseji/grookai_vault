import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMarketReferenceWarehouseBackfillManifestV1 } from "../../backend/pricing/market_reference_warehouse_backfill_manifest_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");

function parseArgs(argv) {
  const parsed = {
    outDir: DEFAULT_OUT_DIR,
    batch: null,
    tcgcsvAcquisition: null,
    pokemonTcgAcquisition: null,
    tcgcsvNormalized: null,
    pokemonTcgNormalized: null,
    coverageReport: null,
    sampleLimit: 25,
  };
  for (const arg of argv) {
    if (arg.startsWith("--out-dir=")) parsed.outDir = path.resolve(arg.slice("--out-dir=".length));
    else if (arg.startsWith("--batch=")) parsed.batch = path.resolve(arg.slice("--batch=".length));
    else if (arg.startsWith("--tcgcsv-acquisition=")) parsed.tcgcsvAcquisition = path.resolve(arg.slice("--tcgcsv-acquisition=".length));
    else if (arg.startsWith("--pokemontcg-acquisition=")) parsed.pokemonTcgAcquisition = path.resolve(arg.slice("--pokemontcg-acquisition=".length));
    else if (arg.startsWith("--tcgcsv-normalized=")) parsed.tcgcsvNormalized = path.resolve(arg.slice("--tcgcsv-normalized=".length));
    else if (arg.startsWith("--pokemontcg-normalized=")) parsed.pokemonTcgNormalized = path.resolve(arg.slice("--pokemontcg-normalized=".length));
    else if (arg.startsWith("--coverage-report=")) parsed.coverageReport = path.resolve(arg.slice("--coverage-report=".length));
    else if (arg.startsWith("--sample-limit=")) parsed.sampleLimit = Number(arg.slice("--sample-limit=".length));
  }
  if (!Number.isInteger(parsed.sampleLimit) || parsed.sampleLimit < 1) {
    throw new Error("[market-reference-backfill-manifest] --sample-limit must be a positive integer");
  }
  return parsed;
}

async function findLatestJson(outDir, predicate, label) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const fullPath = path.join(outDir, entry.name);
    const parsed = JSON.parse(await fs.readFile(fullPath, "utf8"));
    if (!predicate(entry.name, parsed)) continue;
    const stat = await fs.stat(fullPath);
    candidates.push({ fullPath, parsed, mtimeMs: stat.mtimeMs });
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) throw new Error(`[market-reference-backfill-manifest] no ${label} artifact found`);
  return candidates[0];
}

async function loadArtifact(explicitPath, outDir, predicate, label) {
  if (explicitPath) {
    return {
      fullPath: explicitPath,
      parsed: JSON.parse(await fs.readFile(explicitPath, "utf8")),
    };
  }
  return findLatestJson(outDir, predicate, label);
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function cell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function countRows(counts) {
  return Object.entries(counts).map(([label, count]) => `| ${cell(label)} | ${count} |`);
}

function renderMarkdown({ manifest, jsonPath, paths }) {
  return [
    "# MEE-08A Market Reference Warehouse Backfill Manifest V1",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Artifact-only backfill manifest.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No migration apply.",
    "- No pricing observations writes.",
    "- No pricing rollups.",
    "- No public price publication.",
    "",
    "## Inputs",
    "",
    `- batch: ${rel(paths.batch)}`,
    `- tcgcsv_acquisition: ${rel(paths.tcgcsvAcquisition)}`,
    `- pokemontcg_acquisition: ${rel(paths.pokemonTcgAcquisition)}`,
    `- tcgcsv_normalized: ${rel(paths.tcgcsvNormalized)}`,
    `- pokemontcg_normalized: ${rel(paths.pokemonTcgNormalized)}`,
    `- coverage_report: ${rel(paths.coverageReport)}`,
    `- json: ${rel(jsonPath)}`,
    "",
    "## Proposed Row Counts",
    "",
    "| Table | Rows |",
    "| --- | ---: |",
    ...countRows(manifest.proposed_table_row_counts),
    "",
    "## Candidate Sources",
    "",
    "| Source | Rows |",
    "| --- | ---: |",
    ...countRows(manifest.counts.candidate_source_counts),
    "",
    "## Normalized Dispositions",
    "",
    "| Disposition | Rows |",
    "| --- | ---: |",
    ...countRows(manifest.counts.normalized_disposition_counts),
    "",
    "## Gate",
    "",
    `- manifest_hash_sha256: \`${manifest.manifest_hash_sha256}\``,
    `- ready_for_db_backfill_apply_plan: \`${manifest.ready_for_db_backfill_apply_plan}\``,
    "",
    "## Findings",
    "",
    ...(manifest.findings.length ? manifest.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Step",
    "",
    "Create a separate DB backfill apply plan only after reviewing this manifest. That apply plan should insert warehouse rows only and still avoid pricing rollups.",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [batch, tcgcsvAcquisition, pokemonTcgAcquisition, tcgcsvNormalized, pokemonTcgNormalized, coverageReport] = await Promise.all([
    loadArtifact(args.batch, args.outDir, (name) => /^mee_04c_raw_evidence_acquisition_batch_.*\.json$/.test(name), "batch"),
    loadArtifact(args.tcgcsvAcquisition, args.outDir, (name) => /^mee_06b_tcgcsv_reference_evidence_.*\.json$/.test(name), "TCGCSV acquisition"),
    loadArtifact(args.pokemonTcgAcquisition, args.outDir, (name) => /^mee_06a_pokemontcg_io_reference_evidence_.*\.json$/.test(name), "PokemonTCG acquisition"),
    loadArtifact(args.tcgcsvNormalized, args.outDir, (name, parsed) => (
      /^mee_06c_normalized_reference_evidence_.*\.json$/.test(name)
      && parsed.input_summary?.source_phase === "MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1"
    ), "TCGCSV normalized"),
    loadArtifact(args.pokemonTcgNormalized, args.outDir, (name, parsed) => (
      /^mee_06c_normalized_reference_evidence_.*\.json$/.test(name)
      && parsed.input_summary?.source_phase === "MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1"
    ), "PokemonTCG normalized"),
    loadArtifact(args.coverageReport, args.outDir, (name) => /^mee_06d_free_reference_coverage_gap_.*\.json$/.test(name), "coverage report"),
  ]);

  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const paths = {
    batch: batch.fullPath,
    acquisitions: [tcgcsvAcquisition.fullPath, pokemonTcgAcquisition.fullPath],
    normalized: [tcgcsvNormalized.fullPath, pokemonTcgNormalized.fullPath],
    coverageReport: coverageReport.fullPath,
    tcgcsvAcquisition: tcgcsvAcquisition.fullPath,
    pokemonTcgAcquisition: pokemonTcgAcquisition.fullPath,
    tcgcsvNormalized: tcgcsvNormalized.fullPath,
    pokemonTcgNormalized: pokemonTcgNormalized.fullPath,
  };
  const manifest = buildMarketReferenceWarehouseBackfillManifestV1({
    batch: batch.parsed,
    acquisitions: [tcgcsvAcquisition.parsed, pokemonTcgAcquisition.parsed],
    normalizedArtifacts: [tcgcsvNormalized.parsed, pokemonTcgNormalized.parsed],
    coverageReport: coverageReport.parsed,
    artifactPaths: Object.fromEntries(Object.entries(paths).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(rel) : rel(value),
    ])),
    generatedAt,
    sampleLimit: args.sampleLimit,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_08a_market_reference_warehouse_backfill_manifest_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_08a_market_reference_warehouse_backfill_manifest_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown({ manifest, jsonPath, paths }));

  console.log(`[market-reference-backfill-manifest] wrote ${rel(jsonPath)}`);
  console.log(`[market-reference-backfill-manifest] wrote ${rel(mdPath)}`);
  console.log(`[market-reference-backfill-manifest] manifest_hash=${manifest.manifest_hash_sha256}`);
  console.log(`[market-reference-backfill-manifest] ready=${manifest.ready_for_db_backfill_apply_plan}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
