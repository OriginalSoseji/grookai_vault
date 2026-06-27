import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMarketEvidenceReviewGateV1 } from '../../backend/pricing/market_evidence_review_gate_v1.mjs';

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
    throw new Error('[mee-review-gate] --sample-limit must be a positive integer');
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
    throw new Error('[mee-review-gate] no MEE-04D acquisition JSON found; run npm run mee:pricecharting-csv first');
  }
  return candidates[0].fullPath;
}

function tableRowsFromCounts(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `| ${markdownTableCell(label)} | ${count} |`);
}

function markdownTableCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderCandidateRows(rows) {
  return rows.map((row, index) => {
    const flags = (row.exclusion_flags ?? []).join(', ');
    return `| ${index + 1} | ${markdownTableCell(row.gv_id)} | ${markdownTableCell(row.raw_title)} | ${row.raw_price ?? ''} | ${markdownTableCell(row.condition_hint)} | ${markdownTableCell(row.match_confidence_hint)} | ${markdownTableCell(row.disposition)} | ${markdownTableCell(flags)} |`;
  });
}

function renderTargetRows(rows) {
  return rows.map((row, index) => {
    return `| ${index + 1} | ${markdownTableCell(row.gv_id)} | ${markdownTableCell(row.name)} | ${markdownTableCell(row.set_code)} | ${markdownTableCell(row.number_plain)} | ${markdownTableCell(row.best_match_reason)} |`;
  });
}

function renderMarkdown({ review, jsonPath, acquisitionPath }) {
  return [
    '# MEE-05A Raw Evidence Review Gate V1',
    '',
    `Generated: ${review.generated_at}`,
    '',
    '## Boundary',
    '',
    '- Local review artifact only.',
    '- No provider calls.',
    '- No source page fetches.',
    '- No database writes.',
    '- No pricing rollups.',
    '- No migration apply.',
    '- No public price publication.',
    '- Every candidate remains review-gated and cannot publish directly.',
    '',
    '## Summary',
    '',
    `- reviewed_target_count: ${review.summary.reviewed_target_count}`,
    `- targets_with_candidate_evidence: ${review.summary.targets_with_candidate_evidence}`,
    `- targets_without_candidate_evidence: ${review.summary.targets_without_candidate_evidence}`,
    `- candidate_evidence_count: ${review.summary.candidate_evidence_count}`,
    `- candidates_without_blocking_flags: ${review.summary.candidates_without_blocking_flags}`,
    `- candidates_with_blocking_flags: ${review.summary.candidates_with_blocking_flags}`,
    `- warehouse_ready_reference_candidate_count: ${review.summary.warehouse_ready_reference_candidate_count}`,
    `- direct_publishable_candidate_count: ${review.summary.direct_publishable_candidate_count}`,
    `- non_review_gated_candidate_count: ${review.summary.non_review_gated_candidate_count}`,
    `- acquisition: ${path.relative(REPO_ROOT, acquisitionPath).replace(/\\/g, '/')}`,
    `- json: ${path.relative(REPO_ROOT, jsonPath).replace(/\\/g, '/')}`,
    '',
    '## Proofs',
    '',
    `- no_candidate_can_publish_directly: ${review.proofs.no_candidate_can_publish_directly}`,
    `- every_candidate_is_review_gated: ${review.proofs.every_candidate_is_review_gated}`,
    `- no_database_write_boundary: ${review.proofs.no_database_write_boundary}`,
    `- no_pricing_rollup_boundary: ${review.proofs.no_pricing_rollup_boundary}`,
    `- no_public_price_publication_boundary: ${review.proofs.no_public_price_publication_boundary}`,
    '',
    '## Target Status Counts',
    '',
    '| Status | Count |',
    '| --- | ---: |',
    ...tableRowsFromCounts(review.counts.target_status_counts),
    '',
    '## Disposition Counts',
    '',
    '| Disposition | Count |',
    '| --- | ---: |',
    ...tableRowsFromCounts(review.counts.disposition_counts),
    '',
    '## Exclusion Flag Counts',
    '',
    '| Flag | Count |',
    '| --- | ---: |',
    ...tableRowsFromCounts(review.counts.exclusion_flag_counts),
    '',
    '## Sample High Confidence Reference Candidates',
    '',
    '| # | ID | Raw title | Raw price | Condition | Confidence | Disposition | Flags |',
    '| ---: | --- | --- | ---: | --- | --- | --- | --- |',
    ...renderCandidateRows(review.samples.high_confidence_reference_candidates),
    '',
    '## Sample Blocked Or Ambiguous Candidates',
    '',
    '| # | ID | Raw title | Raw price | Condition | Confidence | Disposition | Flags |',
    '| ---: | --- | --- | ---: | --- | --- | --- | --- |',
    ...renderCandidateRows(review.samples.blocked_or_ambiguous_candidates),
    '',
    '## Sample No-Match Targets',
    '',
    '| # | ID | Name | Set | Number | Best match reason |',
    '| ---: | --- | --- | --- | --- | --- |',
    ...renderTargetRows(review.samples.no_match_targets),
    '',
    '## Next Step',
    '',
    'Use this review artifact to decide whether to draft a reference-evidence warehouse migration or first improve matching for the no-match and ambiguous buckets. Do not publish any candidate as a Grookai price from this artifact.',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const acquisitionPath = args.acquisition ?? await findLatestAcquisition(args.outDir);
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, '-');
  const acquisition = JSON.parse(await fs.readFile(acquisitionPath, 'utf8'));
  const review = buildMarketEvidenceReviewGateV1({
    acquisition,
    generatedAt,
    sampleLimit: args.sampleLimit,
  });

  await fs.mkdir(args.outDir, { recursive: true });
  const jsonPath = path.join(args.outDir, `mee_05a_raw_evidence_review_gate_${stamp}.json`);
  const mdPath = path.join(args.outDir, `mee_05a_raw_evidence_review_gate_${stamp}.md`);
  await fs.writeFile(jsonPath, JSON.stringify(review, null, 2));
  await fs.writeFile(mdPath, renderMarkdown({ review, jsonPath, acquisitionPath }));

  console.log(`[mee-review-gate] read ${path.relative(REPO_ROOT, acquisitionPath)}`);
  console.log(`[mee-review-gate] wrote ${path.relative(REPO_ROOT, jsonPath)}`);
  console.log(`[mee-review-gate] wrote ${path.relative(REPO_ROOT, mdPath)}`);
  console.log(`[mee-review-gate] candidates=${review.summary.candidate_evidence_count}`);
  console.log(`[mee-review-gate] no-match targets=${review.summary.targets_without_candidate_evidence}`);
  console.log(`[mee-review-gate] direct publishable=${review.summary.direct_publishable_candidate_count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
