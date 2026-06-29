import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeReferenceEvidenceV1 } from '../../backend/pricing/market_evidence_normalized_reference_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');

function parseArgs(argv) {
  const parsed = {
    acquisition: null,
    outDir: DEFAULT_OUT_DIR,
    sampleLimit: 50,
  };

  for (const arg of argv) {
    if (arg.startsWith('--acquisition=')) {
      parsed.acquisition = path.resolve(arg.slice('--acquisition='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    } else if (arg.startsWith('--sample-limit=')) {
      parsed.sampleLimit = Number(arg.slice('--sample-limit='.length));
    }
  }

  if (!Number.isInteger(parsed.sampleLimit) || parsed.sampleLimit < 1) {
    throw new Error('[mee-normalize-reference] --sample-limit must be a positive integer');
  }

  return parsed;
}

async function findLatestReferenceAcquisition(outDir) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (/^mee_06[ab]_.*reference_evidence_.*\.json$/.test(entry.name) || /^mee_04d_pricecharting_csv_raw_evidence_.*\.json$/.test(entry.name)) {
      const fullPath = path.join(outDir, entry.name);
      const stat = await fs.stat(fullPath);
      candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error('[mee-normalize-reference] no reference acquisition JSON found; run a reference acquisition first');
  }
  return candidates[0].fullPath;
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function countRows(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `| ${cell(label)} | ${count} |`);
}

function evidenceRows(rows) {
  return rows.map((row, index) => (
    `| ${index + 1} | ${cell(row.gv_id)} | ${cell(row.source)} | ${cell(row.raw_title)} | ${row.normalized_price ?? ''} | ${cell(row.normalized_currency)} | ${cell(row.metric_key)} | ${row.evidence_quality_score} | ${cell(row.model_disposition)} | ${cell(row.quality_flags.join(', '))} |`
  ));
}

function renderMarkdown({ normalized, jsonPath, acquisitionPath }) {
  return [
    '# MEE-06C Normalized Reference Evidence V1',
    '',
    `Generated: ${normalized.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Local normalization artifact only.',
    '- No provider calls.',
    '- No source page fetches.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '- Quarantined and blocked rows cannot influence model inputs.',
    '',
    '## Summary',
    '',
    `- normalized_evidence_count: ${normalized.summary.normalized_evidence_count}`,
    `- model_eligible_count: ${normalized.summary.model_eligible_count}`,
    `- quarantined_count: ${normalized.summary.quarantined_count}`,
    `- blocked_count: ${normalized.summary.blocked_count}`,
    `- direct_publishable_count: ${normalized.summary.direct_publishable_count}`,
    `- acquisition: ${path.relative(REPO_ROOT, acquisitionPath).replace(/\\/g, '/')}`,
    `- json: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/')}`,
    '',
    '## Proofs',
    '',
    `- no_database_write_boundary: ${normalized.proofs.no_database_write_boundary}`,
    `- no_pricing_rollup_boundary: ${normalized.proofs.no_pricing_rollup_boundary}`,
    `- no_public_price_publication_boundary: ${normalized.proofs.no_public_price_publication_boundary}`,
    `- no_candidate_can_publish_directly: ${normalized.proofs.no_candidate_can_publish_directly}`,
    `- only_model_eligible_rows_receive_weight: ${normalized.proofs.only_model_eligible_rows_receive_weight}`,
    '',
    '## Disposition Counts',
    '',
    '| Disposition | Count |',
    '| --- | ---: |',
    ...countRows(normalized.counts.disposition_counts),
    '',
    '## Quality Flag Counts',
    '',
    '| Flag | Count |',
    '| --- | ---: |',
    ...countRows(normalized.counts.quality_flag_counts),
    '',
    '## Sample Model Eligible Rows',
    '',
    '| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |',
    '| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |',
    ...evidenceRows(normalized.samples.model_eligible),
    '',
    '## Sample Quarantined Rows',
    '',
    '| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |',
    '| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |',
    ...evidenceRows(normalized.samples.quarantined),
    '',
    '## Next Step',
    '',
    'Use this artifact to decide whether to scale free reference acquisition or tune metric policy before creating any warehouse writes.',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const acquisitionPath = args.acquisition ?? await findLatestReferenceAcquisition(args.outDir);
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');
  const acquisition = JSON.parse(await fs.readFile(acquisitionPath, 'utf8'));
  const normalized = normalizeReferenceEvidenceV1({
    acquisition,
    generatedAt,
    sampleLimit: args.sampleLimit,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_06c_normalized_reference_evidence_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_06c_normalized_reference_evidence_${stamp}.md`);
  await fs.writeFile(jsonPath, JSON.stringify(normalized, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({ normalized, jsonPath, acquisitionPath }));

  console.log(`[mee-normalize-reference] read ${path.relative(REPO_ROOT, acquisitionPath)}`);
  console.log(`[mee-normalize-reference] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-normalize-reference] wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`[mee-normalize-reference] model eligible=${normalized.summary.model_eligible_count}`);
  console.log(`[mee-normalize-reference] quarantined=${normalized.summary.quarantined_count}`);
  console.log(`[mee-normalize-reference] blocked=${normalized.summary.blocked_count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
