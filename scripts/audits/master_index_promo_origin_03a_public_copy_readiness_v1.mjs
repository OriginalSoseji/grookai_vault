import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const PACKAGE_ID = 'MASTER-INDEX-PROMO-ORIGIN-03A-PUBLIC-COPY-READINESS';
const INPUT_JSONL = path.join(
  ROOT,
  'docs',
  'audits',
  'master_index_promo_origin_v1',
  'master_index_promo_origin_02a_source_acquisition_v1.jsonl',
);
const CURRENT_PUBLIC_COPY_JSON = path.join(
  ROOT,
  'apps',
  'web',
  'src',
  'lib',
  'cards',
  'variantOriginPublicCopy.generated.json',
);
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_promo_origin_v1');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'master_index_promo_origin_03a_public_copy_readiness_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'master_index_promo_origin_03a_public_copy_readiness_summary_v1.md');

const FAMILY_LEVEL_COPY_READY = new Set([
  'best_of_game',
  'bw_black_star_promos',
  'dp_black_star_promos',
  'hgss_black_star_promos',
  'mega_evolution_promos',
  'nintendo_black_star_promos',
  'pop_series',
  'sm_black_star_promos',
  'sv_black_star_promos',
  'swsh_black_star_promos',
  'wizards_black_star_promos',
  'xy_black_star_promos',
]);

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function markdownTable(entries) {
  if (entries.length === 0) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...entries.map(([key, count]) => `| ${String(key).replace(/\|/g, '\\|')} | ${count} |`),
  ].join('\n');
}

async function readAcquisitionRows() {
  const raw = await fs.readFile(INPUT_JSONL, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function normalizeGvId(value) {
  return String(value ?? '').trim().toUpperCase();
}

function rowRef(row) {
  return {
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    family: row.proposed_promo_family?.key ?? null,
    confidence: row.confidence,
    source_candidate_count: row.source_candidate_count ?? 0,
  };
}

async function main() {
  const rows = await readAcquisitionRows();
  const publicCopy = JSON.parse(await fs.readFile(CURRENT_PUBLIC_COPY_JSON, 'utf8'));
  const byGvId = publicCopy.by_gv_id ?? {};
  const byCardPrintId = publicCopy.by_card_print_id ?? {};

  const enriched = rows.map((row) => {
    const hasPublicCopy = Boolean(byGvId[normalizeGvId(row.gv_id)] || byCardPrintId[row.card_print_id]);
    const familyKey = row.proposed_promo_family?.key ?? null;
    const sourceCandidateCount = Number(row.source_candidate_count ?? 0);
    const familyLevelCopyReady =
      !hasPublicCopy &&
      row.confidence === 'source_candidates_found' &&
      sourceCandidateCount > 0 &&
      FAMILY_LEVEL_COPY_READY.has(familyKey);
    const needsExactProductOrigin =
      !hasPublicCopy &&
      sourceCandidateCount > 0 &&
      !familyLevelCopyReady &&
      row.confidence !== 'manual_review_no_search_hits';
    const manualReview = !hasPublicCopy && row.confidence === 'manual_review_no_search_hits';
    return {
      ...row,
      has_public_copy: hasPublicCopy,
      family_level_copy_ready: familyLevelCopyReady,
      needs_exact_product_origin: needsExactProductOrigin,
      manual_review: manualReview,
    };
  });

  const existingPublicCopyRows = enriched.filter((row) => row.has_public_copy);
  const missingPublicCopyRows = enriched.filter((row) => !row.has_public_copy);
  const familyLevelCopyReadyRows = enriched.filter((row) => row.family_level_copy_ready);
  const exactProductOriginRows = enriched.filter((row) => row.needs_exact_product_origin);
  const manualReviewRows = enriched.filter((row) => row.manual_review);

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_acquisition_to_public_copy_readiness',
    db_writes_performed: false,
    migrations_created: false,
    image_writes_performed: false,
    input_jsonl: path.relative(ROOT, INPUT_JSONL),
    current_public_copy_json: path.relative(ROOT, CURRENT_PUBLIC_COPY_JSON),
    metrics: {
      promo_source_acquisition_rows: rows.length,
      current_public_copy_rows_total: Object.keys(byCardPrintId).length,
      promo_rows_with_public_copy: existingPublicCopyRows.length,
      promo_rows_missing_public_copy: missingPublicCopyRows.length,
      missing_rows_with_source_candidates: missingPublicCopyRows.filter((row) => Number(row.source_candidate_count ?? 0) > 0).length,
      family_level_copy_ready_rows: familyLevelCopyReadyRows.length,
      exact_product_origin_needed_rows: exactProductOriginRows.length,
      manual_review_rows: manualReviewRows.length,
    },
    missing_by_family: countBy(missingPublicCopyRows, (row) => row.proposed_promo_family?.key),
    family_level_copy_ready_by_family: countBy(familyLevelCopyReadyRows, (row) => row.proposed_promo_family?.key),
    exact_product_origin_needed_by_family: countBy(exactProductOriginRows, (row) => row.proposed_promo_family?.key),
    missing_by_set_code: countBy(missingPublicCopyRows, (row) => row.set_code),
    manual_review_rows: manualReviewRows.map(rowRef),
    sample_family_level_copy_ready: familyLevelCopyReadyRows.slice(0, 50).map(rowRef),
    sample_exact_product_origin_needed: exactProductOriginRows.slice(0, 50).map(rowRef),
  };

  summary.proof_hash = proofHash({
    package_id: summary.package_id,
    metrics: summary.metrics,
    missing_by_family: summary.missing_by_family,
    family_level_copy_ready_by_family: summary.family_level_copy_ready_by_family,
    exact_product_origin_needed_by_family: summary.exact_product_origin_needed_by_family,
    missing_by_set_code: summary.missing_by_set_code,
    manual_review_rows: summary.manual_review_rows,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Proof hash: \`${summary.proof_hash}\`
- DB writes performed: ${summary.db_writes_performed}
- Migrations created: ${summary.migrations_created}
- Image writes performed: ${summary.image_writes_performed}

## Metrics

| metric | value |
| --- | ---: |
| promo source acquisition rows | ${summary.metrics.promo_source_acquisition_rows} |
| current public copy rows total | ${summary.metrics.current_public_copy_rows_total} |
| promo rows with public copy | ${summary.metrics.promo_rows_with_public_copy} |
| promo rows missing public copy | ${summary.metrics.promo_rows_missing_public_copy} |
| missing rows with source candidates | ${summary.metrics.missing_rows_with_source_candidates} |
| family-level copy ready rows | ${summary.metrics.family_level_copy_ready_rows} |
| exact product origin needed rows | ${summary.metrics.exact_product_origin_needed_rows} |
| manual review rows | ${summary.metrics.manual_review_rows} |

## Missing By Family

${markdownTable(Object.entries(summary.missing_by_family))}

## Family-Level Copy Ready

${markdownTable(Object.entries(summary.family_level_copy_ready_by_family))}

## Exact Product Origin Still Needed

${markdownTable(Object.entries(summary.exact_product_origin_needed_by_family))}

## Policy

- This is a read-only readiness report.
- No database writes, storage writes, migrations, price writes, or image changes.
- Family-level public copy is suitable only for broad promo lane explanations.
- Exact product/event origin remains a separate enrichment lane where card-level evidence is required.
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    proof_hash: summary.proof_hash,
    metrics: summary.metrics,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
