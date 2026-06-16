import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const LANES_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_source_lanes_v1.json');
const READINESS_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_readiness_v1.json');
const EBAY_PROBE_JSON = path.join(OUTPUT_DIR, 'image_truth_img15a_ebay_browse_evidence_probe_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img16a_exact_photo_acquisition_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img16a_exact_photo_acquisition_plan_v1.md');

const LANE_KEYS = [
  'exact_asset_probe_candidate',
  'source_evidence_available_no_exact_asset_extractor',
  'representative_only_unless_visual_manually_verified',
  'representative_only_unless_rendered_overlay_captured',
  'no_source_evidence_available',
];

const FINISH_PRIORITY = new Map([
  ['rocket_reverse', 100],
  ['masterball', 95],
  ['pokeball', 90],
  ['cracked_ice', 85],
  ['cosmos', 80],
  ['stamped', 75],
  ['holo', 55],
  ['reverse', 40],
  ['normal', 20],
]);

const SOURCE_PRIORITY = new Map([
  ['cardtrader', 95],
  ['pricecharting', 90],
  ['tcgcollector', 80],
  ['binderbuilder', 75],
  ['bulbapedia', 70],
  ['tcgcsv', 65],
  ['tcgplayer', 65],
  ['tcdb', 60],
  ['pokescope', 55],
  ['reverseholo', 45],
  ['ebay', 30],
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function sourceFamily(row) {
  const keys = [
    row.best_source?.source_key,
    ...(Array.isArray(row.sources) ? row.sources.map((source) => source.source_key) : []),
  ].filter(Boolean).map(normalize);
  const joined = keys.join(' ');
  if (joined.includes('cardtrader')) return 'cardtrader';
  if (joined.includes('pricecharting')) return 'pricecharting';
  if (joined.includes('tcgcollector')) return 'tcgcollector';
  if (joined.includes('binderbuilder')) return 'binderbuilder';
  if (joined.includes('bulbapedia')) return 'bulbapedia';
  if (joined.includes('tcgcsv') || joined.includes('tcgplayer')) return 'tcgcsv_tcgplayer';
  if (joined.includes('tcdb')) return 'tcdb';
  if (joined.includes('pokescope')) return 'pokescope';
  if (joined.includes('reverseholo')) return 'reverseholo';
  return 'no_source';
}

function sourceUrl(row) {
  return row.best_source?.source_url ?? row.sources?.find((source) => source.source_url)?.source_url ?? null;
}

function sourceLabel(row) {
  return row.best_source?.evidence_label ?? row.sources?.find((source) => source.evidence_label)?.evidence_label ?? null;
}

function sourceFixture(row) {
  return row.best_source?.fixture_file ?? row.sources?.find((source) => source.fixture_file)?.fixture_file ?? null;
}

function compactRow(row, extra = {}) {
  return {
    card_printing_id: row.card_printing_id ?? null,
    card_print_id: row.card_print_id ?? null,
    set_code: row.set_code ?? null,
    number: row.number ?? null,
    card_name: row.card_name ?? null,
    finish_key: row.finish_key ?? null,
    printed_identity_modifier: row.printed_identity_modifier ?? null,
    variant_key: row.variant_key ?? null,
    readiness_lane: row.readiness_lane ?? null,
    source_family: sourceFamily(row),
    source_count: row.source_count ?? 0,
    source_url: sourceUrl(row),
    evidence_label: sourceLabel(row),
    fixture_file: sourceFixture(row),
    ...extra,
  };
}

function flattenLanes(lanes) {
  const rows = [];
  for (const lane of LANE_KEYS) {
    for (const row of lanes[lane] ?? []) rows.push({ ...row, readiness_lane: lane });
  }
  return rows;
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function scoreRow(row) {
  const finishScore = FINISH_PRIORITY.get(normalize(row.finish_key)) ?? 10;
  const family = sourceFamily(row);
  const sourceScore = [...SOURCE_PRIORITY.entries()].find(([key]) => family.includes(key))?.[1] ?? 10;
  const evidenceScore = row.source_count > 1 ? 10 : row.source_count === 1 ? 5 : 0;
  return finishScore + sourceScore + evidenceScore;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const scoreDiff = scoreRow(b) - scoreRow(a);
    if (scoreDiff !== 0) return scoreDiff;
    const setDiff = String(a.set_code ?? '').localeCompare(String(b.set_code ?? ''));
    if (setDiff !== 0) return setDiff;
    return String(a.number ?? '').localeCompare(String(b.number ?? ''), undefined, { numeric: true });
  });
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function shortUrl(url) {
  if (!url) return '';
  return url.length > 96 ? `${url.slice(0, 93)}...` : url;
}

function hashObject(object) {
  return crypto.createHash('sha256').update(JSON.stringify(object)).digest('hex');
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function buildStrategyBuckets(rows, ebayProbe) {
  const sourceEvidence = rows.filter((row) => row.readiness_lane === 'source_evidence_available_no_exact_asset_extractor');
  const manualVisual = rows.filter((row) => row.readiness_lane === 'representative_only_unless_visual_manually_verified');
  const noSource = rows.filter((row) => row.readiness_lane === 'no_source_evidence_available');
  const renderedOverlay = rows.filter((row) => row.readiness_lane === 'representative_only_unless_rendered_overlay_captured');
  const residualProbe = rows.filter((row) => row.readiness_lane === 'exact_asset_probe_candidate');

  const highValueFinishes = new Set(['cosmos', 'cracked_ice', 'pokeball', 'masterball', 'rocket_reverse', 'stamped']);
  const exactPhotoSourceEvidence = sourceEvidence.filter((row) => highValueFinishes.has(normalize(row.finish_key)));
  const exactPhotoLowerPriority = sourceEvidence.filter((row) => !highValueFinishes.has(normalize(row.finish_key)));
  const noSourceHighValue = noSource.filter((row) => highValueFinishes.has(normalize(row.finish_key)));
  const noSourceOther = noSource.filter((row) => !highValueFinishes.has(normalize(row.finish_key)));
  const ebayRows = Array.isArray(ebayProbe?.rows) ? ebayProbe.rows : [];

  return {
    exact_photo_needed_source_evidence_exists: sortRows(exactPhotoSourceEvidence),
    exact_photo_lower_priority_source_evidence_exists: sortRows(exactPhotoLowerPriority),
    manual_visual_review_needed: sortRows(manualVisual),
    no_source_acquire_source_first_high_value: sortRows(noSourceHighValue),
    no_source_acquire_source_first_other: sortRows(noSourceOther),
    rendered_overlay_candidate: sortRows(renderedOverlay),
    residual_probe_exhausted: sortRows(residualProbe),
    ebay_title_context_only: ebayRows.map((row) => ({
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      status: row.status,
      matching_listing_count: row.matching_listing_count ?? 0,
      source_policy: 'title_evidence_context_only_listing_images_not_canonical_assets',
      source_url: row.search_url ?? null,
    })),
  };
}

function buildPackageRecommendations(buckets) {
  return [
    {
      package_key: 'IMG-16B-EXACT-PHOTO-SOURCE-EVIDENCE-PILOT',
      recommended_size: 25,
      input_bucket: 'exact_photo_needed_source_evidence_exists',
      candidate_rows_available: buckets.exact_photo_needed_source_evidence_exists.length,
      allowed_actions: ['download_or_stage_nonproduction_candidate_assets', 'preserve_source_url', 'generate_visual_proof_manifest', 'dry_run_child_card_printing_image_updates'],
      forbidden_actions: ['db_writes_without_explicit_approval', 'parent_image_overwrites', 'storage_promotion_without_dry_run', 'listing_image_use_without_approved_license_rule'],
      promotion_gate: 'Every row must prove exact set + card number + card name + finish/variant in the image source itself.',
    },
    {
      package_key: 'IMG-16C-MANUAL-VISUAL-REVIEW-PILOT',
      recommended_size: 20,
      input_bucket: 'manual_visual_review_needed',
      candidate_rows_available: buckets.manual_visual_review_needed.length,
      allowed_actions: ['manual_visual_review', 'screenshot_or_asset_proof_in_nonproduction_staging', 'review_report_only'],
      forbidden_actions: ['bulk_exact_promotion_from_catalog_url', 'db_writes_without_explicit_approval'],
      promotion_gate: 'Catalog product metadata must be paired with visual proof that the asset shows the exact finish.',
    },
    {
      package_key: 'IMG-16D-NO-SOURCE-HIGH-VALUE-SOURCE-HUNT',
      recommended_size: 25,
      input_bucket: 'no_source_acquire_source_first_high_value',
      candidate_rows_available: buckets.no_source_acquire_source_first_high_value.length,
      allowed_actions: ['find_new_source_urls', 'capture evidence labels', 'produce source fixture only'],
      forbidden_actions: ['image_uploads', 'db_writes', 'exact_image_promotion'],
      promotion_gate: 'A new source must first prove the row exists before any image truth decision.',
    },
    {
      package_key: 'IMG-16E-REVERSE-REPRESENTATIVE-OVERLAY-DESIGN',
      recommended_size: 50,
      input_bucket: 'rendered_overlay_candidate',
      candidate_rows_available: buckets.rendered_overlay_candidate.length,
      allowed_actions: ['design_representative_overlay_proof', 'label_as_representative', 'no_exact_claims'],
      forbidden_actions: ['marking_rendered_overlay_as_exact', 'parent_image_overwrites'],
      promotion_gate: 'Any rendered overlay must stay representative and clearly disclose that it is not an exact photographed variant.',
    },
  ];
}

async function main() {
  const lanes = JSON.parse(await fs.readFile(LANES_JSON, 'utf8'));
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  const ebayProbe = await readJsonIfExists(EBAY_PROBE_JSON);
  const rows = flattenLanes(lanes);
  const buckets = buildStrategyBuckets(rows, ebayProbe);
  const recommendations = buildPackageRecommendations(buckets);

  const summary = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    exact_variant_backlog_rows: readiness.exact_variant_backlog_rows ?? rows.length,
    ready_now_for_image_apply: 0,
    by_strategy_bucket: {
      exact_photo_needed_source_evidence_exists: buckets.exact_photo_needed_source_evidence_exists.length,
      exact_photo_lower_priority_source_evidence_exists: buckets.exact_photo_lower_priority_source_evidence_exists.length,
      manual_visual_review_needed: buckets.manual_visual_review_needed.length,
      no_source_acquire_source_first_high_value: buckets.no_source_acquire_source_first_high_value.length,
      no_source_acquire_source_first_other: buckets.no_source_acquire_source_first_other.length,
      rendered_overlay_candidate: buckets.rendered_overlay_candidate.length,
      residual_probe_exhausted: buckets.residual_probe_exhausted.length,
      ebay_title_context_only: buckets.ebay_title_context_only.length,
    },
    by_finish: countBy(rows, (row) => row.finish_key),
    by_lane: countBy(rows, (row) => row.readiness_lane),
    exact_photo_source_evidence_by_finish: countBy(buckets.exact_photo_needed_source_evidence_exists, (row) => row.finish_key),
    exact_photo_source_evidence_by_source_family: countBy(buckets.exact_photo_needed_source_evidence_exists, sourceFamily),
    no_source_high_value_by_finish: countBy(buckets.no_source_acquire_source_first_high_value, (row) => row.finish_key),
  };

  const report = {
    ...summary,
    source_truth_rule: 'Image exactness requires the image source asset itself to prove the exact finish, stamp, parallel, or variant visual.',
    representative_truth_rule: 'Representative images are allowed only when user-facing copy remains honest that the exact finish, stamp, or parallel may not be shown.',
    package_recommendations: recommendations,
    acquisition_queues: {
      exact_photo_needed_source_evidence_exists: buckets.exact_photo_needed_source_evidence_exists.map((row) => compactRow(row)),
      exact_photo_lower_priority_source_evidence_exists: buckets.exact_photo_lower_priority_source_evidence_exists.map((row) => compactRow(row)),
      manual_visual_review_needed: buckets.manual_visual_review_needed.map((row) => compactRow(row)),
      no_source_acquire_source_first_high_value: buckets.no_source_acquire_source_first_high_value.map((row) => compactRow(row)),
      no_source_acquire_source_first_other_sample: buckets.no_source_acquire_source_first_other.slice(0, 250).map((row) => compactRow(row)),
      rendered_overlay_candidate_sample: buckets.rendered_overlay_candidate.slice(0, 250).map((row) => compactRow(row)),
      residual_probe_exhausted: buckets.residual_probe_exhausted.map((row) => compactRow(row)),
      ebay_title_context_only: buckets.ebay_title_context_only,
    },
  };
  report.fingerprint = hashObject({
    summary,
    first_exact_photo_rows: report.acquisition_queues.exact_photo_needed_source_evidence_exists.slice(0, 50),
    package_recommendations: recommendations,
  });

  const topExact = report.acquisition_queues.exact_photo_needed_source_evidence_exists.slice(0, 25);
  const topNoSource = report.acquisition_queues.no_source_acquire_source_first_high_value.slice(0, 25);

  const md = [
    '# Image Truth IMG-16A Exact Photo Acquisition Plan V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'This is audit-only. It does not upload images, update database rows, create migrations, clean up, quarantine, or promote image confidence.',
    '',
    '## Summary',
    '',
    `- exact_variant_backlog_rows: ${report.exact_variant_backlog_rows}`,
    `- ready_now_for_image_apply: ${report.ready_now_for_image_apply}`,
    `- exact_photo_needed_source_evidence_exists: ${report.by_strategy_bucket.exact_photo_needed_source_evidence_exists}`,
    `- manual_visual_review_needed: ${report.by_strategy_bucket.manual_visual_review_needed}`,
    `- no_source_acquire_source_first_high_value: ${report.by_strategy_bucket.no_source_acquire_source_first_high_value}`,
    `- rendered_overlay_candidate: ${report.by_strategy_bucket.rendered_overlay_candidate}`,
    `- residual_probe_exhausted: ${report.by_strategy_bucket.residual_probe_exhausted}`,
    `- db_writes_performed: ${report.db_writes_performed}`,
    `- storage_uploads_performed: ${report.storage_uploads_performed}`,
    `- migrations_created: ${report.migrations_created}`,
    `- parent_overwrite_allowed: ${report.parent_overwrite_allowed}`,
    `- fingerprint: ${report.fingerprint}`,
    '',
    '## Strategy Buckets',
    '',
    markdownTable(Object.entries(report.by_strategy_bucket).map(([bucket, rows]) => ({ bucket, rows })), [
      { label: 'bucket', value: (row) => row.bucket },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Exact Photo Source-Evidence Queue',
    '',
    'These rows already have source evidence for the printing/finish, but no approved exact image extractor. They are the best next target for exact-photo acquisition.',
    '',
    markdownTable(topExact, [
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number },
      { label: 'card', value: (row) => row.card_name },
      { label: 'finish', value: (row) => row.finish_key },
      { label: 'source', value: (row) => row.source_family },
      { label: 'url', value: (row) => shortUrl(row.source_url) },
    ]),
    '',
    '## No-Source High-Value Queue',
    '',
    'These rows should not move to image acquisition yet. First they need source evidence proving the exact printing/finish exists.',
    '',
    markdownTable(topNoSource, [
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number },
      { label: 'card', value: (row) => row.card_name },
      { label: 'finish', value: (row) => row.finish_key },
      { label: 'variant', value: (row) => row.variant_key || row.printed_identity_modifier || '' },
    ]),
    '',
    '## Package Recommendations',
    '',
    markdownTable(report.package_recommendations, [
      { label: 'package', value: (row) => row.package_key },
      { label: 'size', value: (row) => row.recommended_size },
      { label: 'available', value: (row) => row.candidate_rows_available },
      { label: 'input', value: (row) => row.input_bucket },
      { label: 'gate', value: (row) => row.promotion_gate },
    ]),
    '',
    '## Guardrails',
    '',
    '- Do not mark a child image exact unless the source asset itself proves the exact finish, stamp, parallel, or variant visual.',
    '- Do not use eBay listing images as canonical assets from this plan.',
    '- Do not overwrite parent images.',
    '- Do not write database rows or promote storage assets until a package has dry-run proof and explicit approval.',
    '- Representative display remains valid only with honest user-facing copy.',
    '',
    '## Next Step',
    '',
    'Build IMG-16B as a 25-row nonproduction exact-photo acquisition pilot from `exact_photo_needed_source_evidence_exists`. It should stage candidate assets and proof metadata only, then produce a guarded dry-run package. No DB writes without approval.',
    '',
  ].join('\n');

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, md);
  console.log(`Wrote ${OUTPUT_JSON}`);
  console.log(`Wrote ${OUTPUT_MD}`);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
