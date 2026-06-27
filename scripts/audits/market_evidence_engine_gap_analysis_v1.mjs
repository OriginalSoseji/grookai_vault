import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMarketEvidenceGapAnalysisV1 } from '../../backend/pricing/market_evidence_gap_analysis_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');
const DEFAULT_CSV = path.join(REPO_ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');

function parseArgs(argv) {
  const parsed = {
    acquisition: null,
    csv: DEFAULT_CSV,
    outDir: DEFAULT_OUT_DIR,
    sampleLimit: 50,
  };
  for (const arg of argv) {
    if (arg.startsWith('--acquisition=')) {
      parsed.acquisition = path.resolve(arg.slice('--acquisition='.length));
    } else if (arg.startsWith('--csv=')) {
      parsed.csv = path.resolve(arg.slice('--csv='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    } else if (arg.startsWith('--sample-limit=')) {
      parsed.sampleLimit = Number(arg.slice('--sample-limit='.length));
    }
  }
  if (!Number.isInteger(parsed.sampleLimit) || parsed.sampleLimit < 1) {
    throw new Error('[mee-gap-analysis] --sample-limit must be a positive integer');
  }
  return parsed;
}

async function findLatestAcquisition(outDir) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (/^mee_04d_pricecharting_csv_raw_evidence_.*\.json$/.test(entry.name)) {
      const fullPath = path.join(outDir, entry.name);
      const stat = await fs.stat(fullPath);
      candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error('[mee-gap-analysis] no MEE-04D acquisition JSON found; run npm run mee:pricecharting-csv first');
  }
  return candidates[0].fullPath;
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function rowsFromCounts(counts) {
  return Object.entries(counts).map(([label, count]) => `| ${cell(label)} | ${count} |`);
}

function targetRows(rows) {
  return rows.map((row, index) => `| ${index + 1} | ${cell(row.gv_id)} | ${cell(row.name)} | ${cell(row.set_code)} | ${cell(row.number_plain)} | ${cell(row.gap_reason)} | ${row.name_match_count} | ${row.exact_number_match_count} | ${row.prefixed_number_match_count} | ${cell((row.sample_csv_products ?? []).join('; '))} |`);
}

function candidateRows(rows) {
  return rows.map((row, index) => `| ${index + 1} | ${cell(row.gv_id)} | ${cell(row.raw_title)} | ${cell(row.disposition)} | ${cell(row.variant_label)} | ${cell((row.exclusion_flags ?? []).join(', '))} |`);
}

function renderMarkdown({ analysis, jsonPath, acquisitionPath, csvPath }) {
  return [
    '# MEE-05B Raw Evidence Gap Analysis V1',
    '',
    `Generated: ${analysis.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Local gap analysis only.',
    '- No provider calls.',
    '- No source page fetches.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '',
    '## Summary',
    '',
    `- reviewed_target_count: ${analysis.summary.reviewed_target_count}`,
    `- no_match_target_count: ${analysis.summary.no_match_target_count}`,
    `- candidate_evidence_count: ${analysis.summary.candidate_evidence_count}`,
    `- ambiguous_or_blocked_candidate_count: ${analysis.summary.ambiguous_or_blocked_candidate_count}`,
    `- csv_pokemon_card_rows: ${analysis.summary.csv_pokemon_card_rows}`,
    `- acquisition: ${path.relative(REPO_ROOT, acquisitionPath).replace(/\\/g, '/')}`,
    `- csv: ${path.relative(REPO_ROOT, csvPath).replace(/\\/g, '/')}`,
    `- json: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/')}`,
    '',
    '## No-Match Gap Reasons',
    '',
    '| Reason | Count |',
    '| --- | ---: |',
    ...rowsFromCounts(analysis.counts.no_match_by_gap_reason),
    '',
    '## No-Match Set Codes',
    '',
    '| Set code | Count |',
    '| --- | ---: |',
    ...rowsFromCounts(analysis.counts.no_match_by_set_code).slice(0, 40),
    '',
    '## Ambiguous Or Blocked Dispositions',
    '',
    '| Disposition | Count |',
    '| --- | ---: |',
    ...rowsFromCounts(analysis.counts.ambiguous_or_blocked_by_disposition),
    '',
    '## Ambiguous Or Blocked Variant Labels',
    '',
    '| Variant label | Count |',
    '| --- | ---: |',
    ...rowsFromCounts(analysis.counts.ambiguous_or_blocked_by_variant_label).slice(0, 40),
    '',
    '## Sample Prefix-Number Gap Targets',
    '',
    '| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |',
    '| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |',
    ...targetRows(analysis.samples.prefixed_number_gap_targets),
    '',
    '## Sample Set Alias Or Variant Gap Targets',
    '',
    '| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |',
    '| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |',
    ...targetRows(analysis.samples.set_alias_or_variant_gap_targets),
    '',
    '## Sample Ambiguous Or Blocked Candidates',
    '',
    '| # | ID | Raw title | Disposition | Variant label | Flags |',
    '| ---: | --- | --- | --- | --- | --- |',
    ...candidateRows(analysis.samples.ambiguous_or_blocked_candidates),
    '',
    '## Recommendations',
    '',
    ...analysis.recommendations.map((entry) => `- ${entry.key}: ${entry.action}`),
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const acquisitionPath = args.acquisition ?? await findLatestAcquisition(args.outDir);
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');
  const [acquisitionRaw, csvRaw] = await Promise.all([
    fs.readFile(acquisitionPath, 'utf8'),
    fs.readFile(args.csv, 'utf8'),
  ]);
  const analysis = buildMarketEvidenceGapAnalysisV1({
    acquisition: JSON.parse(acquisitionRaw),
    csvRaw,
    generatedAt,
    sampleLimit: args.sampleLimit,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_05b_raw_evidence_gap_analysis_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_05b_raw_evidence_gap_analysis_${stamp}.md`);
  await fs.writeFile(jsonPath, JSON.stringify(analysis, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({
    analysis,
    jsonPath,
    acquisitionPath,
    csvPath: args.csv,
  }));

  console.log(`[mee-gap-analysis] read ${path.relative(REPO_ROOT, acquisitionPath)}`);
  console.log(`[mee-gap-analysis] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-gap-analysis] wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`[mee-gap-analysis] no-match targets=${analysis.summary.no_match_target_count}`);
  console.log(`[mee-gap-analysis] ambiguous/blocked candidates=${analysis.summary.ambiguous_or_blocked_candidate_count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
