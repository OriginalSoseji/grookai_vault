import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMarketEvidenceAcquisitionBatchV1 } from '../../backend/pricing/market_evidence_acquisition_batch_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');

function parseArgs(argv) {
  const parsed = {
    limit: 100,
    sources: null,
    queryPlan: null,
    outDir: DEFAULT_OUT_DIR,
  };

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      parsed.limit = Number(arg.slice('--limit='.length));
    } else if (arg.startsWith('--sources=')) {
      parsed.sources = arg.slice('--sources='.length).split(',').map((source) => source.trim()).filter(Boolean);
    } else if (arg.startsWith('--query-plan=')) {
      parsed.queryPlan = path.resolve(arg.slice('--query-plan='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    }
  }

  if (!Number.isInteger(parsed.limit) || parsed.limit < 1) {
    throw new Error('[mee-acquisition-batch] --limit must be a positive integer');
  }

  return parsed;
}

async function findLatestQueryPlan(outDir) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (/^mee_04b_multi_source_query_plan_.*\.json$/.test(entry.name)) {
      const fullPath = path.join(outDir, entry.name);
      const stat = await fs.stat(fullPath);
      candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (candidates.length === 0) {
    throw new Error('[mee-acquisition-batch] no MEE-04B query plan JSON found; run npm run mee:query-plan first');
  }
  return candidates[0].fullPath;
}

function renderMarkdown({ batch, jsonPath, queryPlanPath }) {
  const topRows = batch.items.slice(0, 50).map((item) => {
    return `| ${item.ordinal} | ${item.source} | ${item.name} (${item.set_code ?? '?'} #${item.number_plain ?? '?'}) | ${item.gv_id} | ${item.acquisition_status} |`;
  });

  const sourceRows = Object.entries(batch.summary.source_counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, count]) => `| ${source} | ${count} |`);

  return [
    '# MEE-04C Raw Evidence Acquisition Batch V1',
    '',
    `Generated: ${batch.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Dry-run acquisition batch only.',
    '- No provider calls.',
    '- No source page fetches.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '- No raw evidence objects were created.',
    '',
    '## Summary',
    '',
    `- queued_items: ${batch.summary.queued_item_count}`,
    `- target_count: ${batch.summary.target_count}`,
    `- sources: ${batch.options.sources.join(', ')}`,
    `- query_plan: ${path.relative(REPO_ROOT, queryPlanPath).replace(/\\/g, '/')}`,
    `- json: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/')}`,
    '',
    '## Source Counts',
    '',
    '| Source | Queued |',
    '| --- | ---: |',
    ...sourceRows,
    '',
    '## Top Queued Items',
    '',
    '| # | Source | Card | ID | Status |',
    '| ---: | --- | --- | --- | --- |',
    ...topRows,
    '',
    '## Next Step',
    '',
    'Proceed to a tiny approved fetch implementation only after selecting one source lane and confirming the allowed access method. The fetch implementation must write raw evidence candidates only, with no price rollups or public pricing.',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queryPlanPath = args.queryPlan ?? await findLatestQueryPlan(args.outDir);
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');

  const queryPlanRaw = await fs.readFile(queryPlanPath, 'utf8');
  const queryPlan = JSON.parse(queryPlanRaw);
  const batch = buildMarketEvidenceAcquisitionBatchV1({
    queryPlan,
    sources: args.sources,
    limit: args.limit,
    generatedAt,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_04c_raw_evidence_acquisition_batch_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_04c_raw_evidence_acquisition_batch_${stamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(batch, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({ batch, jsonPath, queryPlanPath }));

  console.log(`[mee-acquisition-batch] read ${path.relative(REPO_ROOT, queryPlanPath)}`);
  console.log(`[mee-acquisition-batch] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-acquisition-batch] wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`[mee-acquisition-batch] queued items=${batch.summary.queued_item_count} targets=${batch.summary.target_count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
