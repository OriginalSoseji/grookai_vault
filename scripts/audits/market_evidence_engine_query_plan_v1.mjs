import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMarketEvidenceQueryPlanV1 } from '../../backend/pricing/market_evidence_query_plan_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'market_evidence_engine_v1');
const DEFAULT_WORKLIST = path.join(DEFAULT_OUT_DIR, 'mee_overnight_worklist_2026-06-25T05-13-57-661Z.json');

function parseArgs(argv) {
  const parsed = {
    limit: 5000,
    worklist: DEFAULT_WORKLIST,
    outDir: DEFAULT_OUT_DIR,
  };

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      parsed.limit = Number(arg.slice('--limit='.length));
    } else if (arg.startsWith('--worklist=')) {
      parsed.worklist = path.resolve(arg.slice('--worklist='.length));
    } else if (arg.startsWith('--out-dir=')) {
      parsed.outDir = path.resolve(arg.slice('--out-dir='.length));
    }
  }

  if (!Number.isInteger(parsed.limit) || parsed.limit < 1) {
    throw new Error('[mee-query-plan] --limit must be a positive integer');
  }

  return parsed;
}

function renderMarkdown({ plan, jsonPath }) {
  const topRows = plan.targets.slice(0, 50).map((target) => {
    const sources = target.source_queries.map((query) => query.source).join(', ');
    return `| ${target.ordinal} | ${target.priority_score ?? ''} | ${target.name} (${target.set_code ?? '?'} #${target.number_plain ?? '?'}) | ${target.gv_id} | ${sources} |`;
  });

  return [
    '# MEE-04B Multi-Source Query Plan V1',
    '',
    `Generated: ${plan.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Local query plan only.',
    '- No provider calls.',
    '- No web scraping.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- Search URLs are templates for later approved acquisition, not fetched evidence.',
    '',
    '## Summary',
    '',
    `- targets: ${plan.summary.target_count}`,
    `- sources_per_target: ${plan.summary.source_count}`,
    `- planned_queries: ${plan.summary.planned_query_count}`,
    `- json: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/')}`,
    '',
    '## Sources',
    '',
    ...plan.registry_sources.map((source) => `- ${source.source}: ${source.source_type}, ${source.pricing_lane}, ${source.acquisition_mode}, direct_publish=${source.can_publish_price_directly}`),
    '',
    '## Top Planned Targets',
    '',
    '| # | Score | Card | ID | Sources |',
    '| ---: | ---: | --- | --- | --- |',
    ...topRows,
    '',
    '## Next Step',
    '',
    'Proceed to MEE-04C only after approving which planned source lanes are allowed to fetch. MEE-04C should start with a tiny acquisition batch and raw evidence storage only.',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');

  const worklistRaw = await fs.readFile(args.worklist, 'utf8');
  const worklist = JSON.parse(worklistRaw);
  if (!Array.isArray(worklist.targets)) {
    throw new Error('[mee-query-plan] worklist targets array is missing');
  }

  const plan = buildMarketEvidenceQueryPlanV1({
    targets: worklist.targets,
    limit: args.limit,
    generatedAt,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_04b_multi_source_query_plan_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_04b_multi_source_query_plan_${stamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(plan, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({ plan, jsonPath }));

  console.log(`[mee-query-plan] read ${path.relative(REPO_ROOT, args.worklist)}`);
  console.log(`[mee-query-plan] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-query-plan] wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`[mee-query-plan] planned targets=${plan.summary.target_count} queries=${plan.summary.planned_query_count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
