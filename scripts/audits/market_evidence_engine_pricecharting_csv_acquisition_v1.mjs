import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import '../../backend/env.mjs';
import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import {
  acquirePriceChartingCsvEvidenceV1,
  parsePriceChartingCsvRowsV1,
} from '../../backend/pricing/market_evidence_pricecharting_csv_acquisition_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');
const DEFAULT_CSV = path.join(REPO_ROOT, 'tmp', 'pricecharting', 'pokemon_cards_pricecharting.csv');

function parseArgs(argv) {
  const parsed = {
    batch: null,
    csv: DEFAULT_CSV,
    outDir: DEFAULT_OUT_DIR,
    maxCandidatesPerTarget: 3,
    noDbSetCatalog: false,
  };

  for (const arg of argv) {
    if (arg.startsWith('--batch=')) {
      parsed.batch = path.resolve(arg.slice('--batch='.length));
    } else if (arg.startsWith('--csv=')) {
      parsed.csv = path.resolve(arg.slice('--csv='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    } else if (arg.startsWith('--max-candidates-per-target=')) {
      parsed.maxCandidatesPerTarget = Number(arg.slice('--max-candidates-per-target='.length));
    } else if (arg === '--no-db-set-catalog') {
      parsed.noDbSetCatalog = true;
    }
  }

  if (!Number.isInteger(parsed.maxCandidatesPerTarget) || parsed.maxCandidatesPerTarget < 1) {
    throw new Error('[mee-pricecharting-csv] --max-candidates-per-target must be a positive integer');
  }

  return parsed;
}

async function findLatestBatch(outDir) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (/^mee_04c_raw_evidence_acquisition_batch_.*\.json$/.test(entry.name)) {
      const fullPath = path.join(outDir, entry.name);
      const stat = await fs.stat(fullPath);
      candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error('[mee-pricecharting-csv] no MEE-04C batch JSON found; run npm run mee:acquisition-batch first');
  }
  return candidates[0].fullPath;
}

async function readSetCatalog({ noDbSetCatalog }) {
  if (noDbSetCatalog) {
    return {};
  }
  try {
    const supabase = createBackendClient();
    const { data, error } = await supabase
      .from('sets')
      .select('code,name')
      .order('code', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return Object.fromEntries((data ?? []).map((row) => [row.code, row]));
  } catch (error) {
    console.warn(`[mee-pricecharting-csv] set catalog unavailable, continuing with offline aliases: ${error.message}`);
    return {};
  }
}

function renderMarkdown({ acquisition, jsonPath, batchPath, csvPath, setCatalogCount }) {
  const statusRows = Object.entries(acquisition.summary.status_counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `| ${status} | ${count} |`);

  const sampleRows = acquisition.candidate_evidence.slice(0, 50).map((row, index) => {
    return `| ${index + 1} | ${row.raw_title} | ${row.gv_id} | ${row.raw_price ?? ''} | ${row.condition_hint ?? ''} | ${row.match_confidence_hint} |`;
  });

  return [
    '# MEE-04D PriceCharting CSV Raw Evidence V1',
    '',
    `Generated: ${acquisition.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Local CSV acquisition only.',
    '- No provider calls.',
    '- No source page fetches.',
    '- Read-only set catalog lookup only when available.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '- Raw evidence candidates are local artifacts only and remain review-gated.',
    '',
    '## Summary',
    '',
    `- pricecharting_targets: ${acquisition.summary.pricecharting_targets}`,
    `- reviewed_targets: ${acquisition.summary.reviewed_targets}`,
    `- candidate_evidence_count: ${acquisition.summary.candidate_evidence_count}`,
    `- set_catalog_rows: ${setCatalogCount}`,
    `- batch: ${path.relative(REPO_ROOT, batchPath).replace(/\\/g, '/')}`,
    `- csv: ${path.relative(REPO_ROOT, csvPath).replace(/\\/g, '/')}`,
    `- json: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/')}`,
    '',
    '## Target Status',
    '',
    '| Status | Count |',
    '| --- | ---: |',
    ...statusRows,
    '',
    '## Sample Candidate Evidence',
    '',
    '| # | Raw title | ID | Raw price | Condition | Confidence |',
    '| ---: | --- | --- | ---: | --- | --- |',
    ...sampleRows,
    '',
    '## Next Step',
    '',
    'Scale this lane overnight by generating a larger pricecharting-only MEE-04C batch, then run this acquisition command against that batch. The output remains local raw evidence only until the warehouse tables and promotion rules are approved.',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const batchPath = args.batch ?? await findLatestBatch(args.outDir);
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');

  const [batchRaw, csvRaw, setCatalog] = await Promise.all([
    fs.readFile(batchPath, 'utf8'),
    fs.readFile(args.csv, 'utf8'),
    readSetCatalog(args),
  ]);
  const batch = JSON.parse(batchRaw);
  const csvRows = parsePriceChartingCsvRowsV1(csvRaw);
  const acquisition = acquirePriceChartingCsvEvidenceV1({
    batch,
    csvRows,
    setCatalog,
    generatedAt,
    maxCandidatesPerTarget: args.maxCandidatesPerTarget,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_04d_pricecharting_csv_raw_evidence_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_04d_pricecharting_csv_raw_evidence_${stamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(acquisition, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({
    acquisition,
    jsonPath,
    batchPath,
    csvPath: args.csv,
    setCatalogCount: Object.keys(setCatalog).length,
  }));

  console.log(`[mee-pricecharting-csv] read batch ${path.relative(REPO_ROOT, batchPath)}`);
  console.log(`[mee-pricecharting-csv] parsed csv rows=${csvRows.length}`);
  console.log(`[mee-pricecharting-csv] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-pricecharting-csv] wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`[mee-pricecharting-csv] candidate evidence=${acquisition.summary.candidate_evidence_count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
