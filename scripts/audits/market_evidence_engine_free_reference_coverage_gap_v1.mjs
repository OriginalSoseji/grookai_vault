import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFreeReferenceCoverageGapV1 } from '../../backend/pricing/market_evidence_free_reference_coverage_gap_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');

function parseArgs(argv) {
  const parsed = {
    batch: null,
    tcgcsvAcquisition: null,
    tcgcsvNormalized: null,
    pokemonTcgAcquisition: null,
    pokemonTcgNormalized: null,
    outDir: DEFAULT_OUT_DIR,
    sampleLimit: 50,
  };
  for (const arg of argv) {
    if (arg.startsWith('--batch=')) parsed.batch = path.resolve(arg.slice('--batch='.length));
    else if (arg.startsWith('--tcgcsv-acquisition=')) parsed.tcgcsvAcquisition = path.resolve(arg.slice('--tcgcsv-acquisition='.length));
    else if (arg.startsWith('--tcgcsv-normalized=')) parsed.tcgcsvNormalized = path.resolve(arg.slice('--tcgcsv-normalized='.length));
    else if (arg.startsWith('--pokemontcg-acquisition=')) parsed.pokemonTcgAcquisition = path.resolve(arg.slice('--pokemontcg-acquisition='.length));
    else if (arg.startsWith('--pokemontcg-normalized=')) parsed.pokemonTcgNormalized = path.resolve(arg.slice('--pokemontcg-normalized='.length));
    else if (arg.startsWith('--out-dir=')) parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    else if (arg.startsWith('--sample-limit=')) parsed.sampleLimit = Number(arg.slice('--sample-limit='.length));
  }
  if (!Number.isInteger(parsed.sampleLimit) || parsed.sampleLimit < 1) {
    throw new Error('[mee-free-reference-gap] --sample-limit must be a positive integer');
  }
  return parsed;
}

async function findLatestJson(outDir, predicate, label) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const fullPath = path.join(outDir, entry.name);
    const raw = await fs.readFile(fullPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!predicate(entry.name, parsed)) continue;
    const stat = await fs.stat(fullPath);
    candidates.push({ fullPath, parsed, mtimeMs: stat.mtimeMs });
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error(`[mee-free-reference-gap] no ${label} artifact found`);
  }
  return candidates[0];
}

async function loadArtifact(explicitPath, outDir, predicate, label) {
  if (explicitPath) {
    return {
      fullPath: explicitPath,
      parsed: JSON.parse(await fs.readFile(explicitPath, 'utf8')),
    };
  }
  return findLatestJson(outDir, predicate, label);
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function countRows(counts) {
  return Object.entries(counts).map(([label, count]) => `| ${cell(label)} | ${count} |`);
}

function targetRows(rows) {
  return rows.map((row, index) => (
    `| ${index + 1} | ${cell(row.gv_id)} | ${cell(row.name)} | ${cell(row.set_code)} | ${cell(row.number_plain)} | ${cell(row.tcgcsv_status)} | ${cell(row.pokemontcg_io_status)} | ${cell(row.miss_reason)} |`
  ));
}

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
}

function renderMarkdown({ analysis, jsonPath, paths }) {
  return [
    '# MEE-06D Free Reference Coverage Gap V1',
    '',
    `Generated: ${analysis.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Local coverage gap artifact only.',
    '- No provider calls.',
    '- No source page fetches.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '',
    '## Summary',
    '',
    `- target_count: ${analysis.summary.target_count}`,
    `- covered_target_count: ${analysis.summary.covered_target_count}`,
    `- uncovered_target_count: ${analysis.summary.uncovered_target_count}`,
    `- tcgcsv_model_eligible_card_count: ${analysis.summary.tcgcsv_model_eligible_card_count}`,
    `- pokemontcg_io_model_eligible_card_count: ${analysis.summary.pokemontcg_io_model_eligible_card_count}`,
    `- combined_model_eligible_card_count: ${analysis.summary.combined_model_eligible_card_count}`,
    `- batch: ${rel(paths.batch)}`,
    `- tcgcsv_acquisition: ${rel(paths.tcgcsvAcquisition)}`,
    `- tcgcsv_normalized: ${rel(paths.tcgcsvNormalized)}`,
    `- pokemontcg_acquisition: ${rel(paths.pokemonTcgAcquisition)}`,
    `- pokemontcg_normalized: ${rel(paths.pokemonTcgNormalized)}`,
    `- json: ${rel(jsonPath)}`,
    '',
    '## Coverage Buckets',
    '',
    '| Bucket | Count |',
    '| --- | ---: |',
    ...countRows(analysis.counts.coverage_bucket_counts),
    '',
    '## Miss Reasons',
    '',
    '| Reason | Count |',
    '| --- | ---: |',
    ...countRows(analysis.counts.miss_reason_counts),
    '',
    '## Status Pairs',
    '',
    '| Status pair | Count |',
    '| --- | ---: |',
    ...countRows(analysis.counts.status_pair_counts).slice(0, 40),
    '',
    '## Uncovered Set Codes',
    '',
    '| Set code | Count |',
    '| --- | ---: |',
    ...countRows(analysis.counts.uncovered_by_set_code).slice(0, 40),
    '',
    '## Sample Uncovered Targets',
    '',
    '| # | ID | Name | Set | Number | TCGCSV | PokemonTCG.io | Reason |',
    '| ---: | --- | --- | --- | --- | --- | --- | --- |',
    ...targetRows(analysis.samples.uncovered_targets),
    '',
    '## Recommendations',
    '',
    ...analysis.recommendations.map((entry) => `- ${entry.key}: ${entry.action}`),
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [batch, tcgcsvAcquisition, tcgcsvNormalized, pokemonTcgAcquisition, pokemonTcgNormalized] = await Promise.all([
    loadArtifact(args.batch, args.outDir, (name) => /^mee_04c_raw_evidence_acquisition_batch_.*\.json$/.test(name), 'batch'),
    loadArtifact(args.tcgcsvAcquisition, args.outDir, (name) => /^mee_06b_tcgcsv_reference_evidence_.*\.json$/.test(name), 'TCGCSV acquisition'),
    loadArtifact(args.tcgcsvNormalized, args.outDir, (name, parsed) => (
      /^mee_06c_normalized_reference_evidence_.*\.json$/.test(name)
      && parsed.input_summary?.source_phase === 'MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1'
    ), 'TCGCSV normalized'),
    loadArtifact(args.pokemonTcgAcquisition, args.outDir, (name) => /^mee_06a_pokemontcg_io_reference_evidence_.*\.json$/.test(name), 'PokemonTCG acquisition'),
    loadArtifact(args.pokemonTcgNormalized, args.outDir, (name, parsed) => (
      /^mee_06c_normalized_reference_evidence_.*\.json$/.test(name)
      && parsed.input_summary?.source_phase === 'MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1'
    ), 'PokemonTCG normalized'),
  ]);

  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');
  const analysis = buildFreeReferenceCoverageGapV1({
    batch: batch.parsed,
    tcgcsvAcquisition: tcgcsvAcquisition.parsed,
    tcgcsvNormalized: tcgcsvNormalized.parsed,
    pokemonTcgAcquisition: pokemonTcgAcquisition.parsed,
    pokemonTcgNormalized: pokemonTcgNormalized.parsed,
    generatedAt,
    sampleLimit: args.sampleLimit,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_06d_free_reference_coverage_gap_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_06d_free_reference_coverage_gap_${stamp}.md`);
  const paths = {
    batch: batch.fullPath,
    tcgcsvAcquisition: tcgcsvAcquisition.fullPath,
    tcgcsvNormalized: tcgcsvNormalized.fullPath,
    pokemonTcgAcquisition: pokemonTcgAcquisition.fullPath,
    pokemonTcgNormalized: pokemonTcgNormalized.fullPath,
  };
  await fs.writeFile(jsonPath, JSON.stringify(analysis, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({ analysis, jsonPath, paths }));

  console.log(`[mee-free-reference-gap] wrote ${rel(jsonPath)}`);
  console.log(`[mee-free-reference-gap] wrote ${rel(mdPath)}`);
  console.log(`[mee-free-reference-gap] targets=${analysis.summary.target_count}`);
  console.log(`[mee-free-reference-gap] covered=${analysis.summary.covered_target_count}`);
  console.log(`[mee-free-reference-gap] uncovered=${analysis.summary.uncovered_target_count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
