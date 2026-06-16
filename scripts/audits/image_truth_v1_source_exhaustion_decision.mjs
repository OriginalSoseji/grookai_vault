import fs from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const LANES_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_source_lanes_v1.json');
const READINESS_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_readiness_v1.json');
const RESIDUAL_PRICECHARTING_PROBE_JSON = path.join(OUTPUT_DIR, 'image_truth_img14a_pricecharting_residual_exact_probe_v1.json');
const EBAY_BROWSE_EVIDENCE_PROBE_JSON = path.join(OUTPUT_DIR, 'image_truth_img15a_ebay_browse_evidence_probe_v1.json');
const EXACT_PHOTO_ACQUISITION_PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_img16a_exact_photo_acquisition_plan_v1.json');
const EXACT_PHOTO_SOURCE_EVIDENCE_PILOT_JSON = path.join(OUTPUT_DIR, 'image_truth_img16b_exact_photo_source_evidence_pilot_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_source_exhaustion_decision_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_source_exhaustion_decision_v1.md');

const LANE_KEYS = [
  'exact_asset_probe_candidate',
  'source_evidence_available_no_exact_asset_extractor',
  'representative_only_unless_visual_manually_verified',
  'representative_only_unless_rendered_overlay_captured',
  'no_source_evidence_available',
];

const SOURCE_DECISIONS = {
  no_source_evidence: {
    source_family: 'No Source Evidence',
    current_decision: 'blocked_until_new_source_found',
    exact_asset_policy: 'No exact-image promotion is allowed without a source URL and proof asset.',
    representative_policy: 'Keep existing representative display and user-facing honesty label.',
    next_action: 'Acquire a new source family or leave these rows honestly representative.',
    risk: 'There is no preserved source evidence for exact variant image acquisition.',
  },
  pricecharting_csv_product: {
    source_family: 'PriceCharting',
    current_decision: 'probe_only',
    exact_asset_policy: 'Exact only when frozen page title/image-alt/source URL prove set + card number + name + finish and dry-run proof passes.',
    representative_policy: 'May remain representative when exact image proof is missing or volatile.',
    next_action: 'Re-probe the 6 remaining candidates individually; promote none without frozen proof.',
    risk: 'Live page volatility can remove or change image-alt evidence.',
  },
  pricecharting_csv_base_product: {
    source_family: 'PriceCharting',
    current_decision: 'probe_only',
    exact_asset_policy: 'Exact only when frozen page title/image-alt/source URL prove set + card number + name + finish and dry-run proof passes.',
    representative_policy: 'May remain representative when exact image proof is missing or volatile.',
    next_action: 'Re-probe only if the row appears in an exact asset candidate queue.',
    risk: 'Base products can prove identity while not proving variant visual.',
  },
  cardtrader: {
    source_family: 'CardTrader',
    current_decision: 'exact_when_frozen_metadata_proves_visual',
    exact_asset_policy: 'Exact only from frozen product metadata/image proof, as used by IMG-13A.',
    representative_policy: 'Otherwise representative only.',
    next_action: 'Search for additional CardTrader rows only through the frozen-plan workflow.',
    risk: 'Blueprint/catalog images may not show texture or parallel treatment unless metadata and asset are variant-specific.',
  },
  tcgcsv_tcgplayer_catalog: {
    source_family: 'TCGCSV / TCGplayer Catalog',
    current_decision: 'manual_visual_review_only',
    exact_asset_policy: 'Do not promote exact from catalog URL alone. Exact requires product image proof that distinguishes the target finish/variant.',
    representative_policy: 'Safe for representative display when identity is exact and source URL is preserved.',
    next_action: 'Keep the 56 rows in visual review; do not bulk promote exact from shared catalog imagery.',
    risk: 'TCGplayer products often share normal/reverse pricing and images; public pages are app-rendered and unstable for extraction.',
  },
  tcgcollector_card_variants: {
    source_family: 'TCGCollector',
    current_decision: 'variant_evidence_not_exact_asset',
    exact_asset_policy: 'Do not promote exact from variant icons/labels alone.',
    representative_policy: 'Useful for proving the variant exists and explaining representative-image honesty.',
    next_action: 'Use as evidence source, not image asset source, until a variant-specific image extractor is proven.',
    risk: 'Main images appear base/card-level and may not show cosmos/cracked ice/stamp treatment.',
  },
  binderbuilder_set_variant: {
    source_family: 'BinderBuilder',
    current_decision: 'variant_evidence_not_exact_asset',
    exact_asset_policy: 'Do not promote exact unless embedded image URLs are proven variant-specific.',
    representative_policy: 'Useful for finish/variant source evidence and gap triage.',
    next_action: 'Treat as evidence only; add a future extractor only if variant-specific images are proven.',
    risk: 'Structured variant rows may point at base card images.',
  },
  reverseholo_set_checklist: {
    source_family: 'ReverseHolo',
    current_decision: 'representative_only_unless_rendered_overlay_captured',
    exact_asset_policy: 'Do not mark exact from checklist evidence or base asset alone.',
    representative_policy: 'Useful for broad display coverage and finish evidence.',
    next_action: 'Consider a separate rendered-overlay pipeline if Grookai wants synthetic representative reverse imagery, clearly labeled.',
    risk: 'Checklist proves the reverse printing exists; it does not provide a photographed exact reverse finish image.',
  },
  pokescope_variant_exact: {
    source_family: 'PokeScope',
    current_decision: 'variant_evidence_not_exact_asset',
    exact_asset_policy: 'Do not promote exact unless a variant-specific image URL is found.',
    representative_policy: 'Useful for source-backed variant existence and display honesty.',
    next_action: 'Keep the 2 rows blocked as evidence-only unless future page structure exposes variant-specific assets.',
    risk: 'Observed image URLs appear base/card-level while variant sections prove finish/pricing separately.',
  },
  bulbapedia_card_page_release_info: {
    source_family: 'Bulbapedia',
    current_decision: 'human_evidence_not_exact_asset',
    exact_asset_policy: 'Do not promote exact from release text alone.',
    representative_policy: 'Useful as human-readable evidence for variant existence.',
    next_action: 'Use for source agreement, not image upload, unless an externally reusable exact image asset is identified.',
    risk: 'Release text can prove existence but not provide a reusable exact child visual asset.',
  },
  bulbapedia_sm_black_star_promos: {
    source_family: 'Bulbapedia',
    current_decision: 'human_evidence_not_exact_asset',
    exact_asset_policy: 'Do not promote exact from checklist text alone.',
    representative_policy: 'Useful as human-readable evidence for variant existence.',
    next_action: 'Use for source agreement, not image upload, unless an externally reusable exact image asset is identified.',
    risk: 'Checklist text can prove existence but not provide a reusable exact child visual asset.',
  },
  bulbapedia_card_release_info: {
    source_family: 'Bulbapedia',
    current_decision: 'human_evidence_not_exact_asset',
    exact_asset_policy: 'Do not promote exact from release text alone.',
    representative_policy: 'Useful as human-readable evidence for variant existence.',
    next_action: 'Use for source agreement, not image upload, unless an externally reusable exact image asset is identified.',
    risk: 'Release text can prove existence but not provide a reusable exact child visual asset.',
  },
  tcdb_checklist: {
    source_family: 'TCDB',
    current_decision: 'checklist_evidence_not_exact_asset',
    exact_asset_policy: 'Do not promote exact from checklist text alone.',
    representative_policy: 'Useful as source evidence when source URL and label are preserved.',
    next_action: 'Use as source agreement only unless image rights and exact variant asset proof are established.',
    risk: 'Checklist support is not automatically an image license or exact visual proof.',
  },
};

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function sourceKeys(row) {
  const sources = Array.isArray(row.sources) ? row.sources : [];
  const keys = sources.map((source) => source.source_key).filter(Boolean);
  if (keys.length > 0) return [...new Set(keys)];
  return row.best_source?.source_key ? [row.best_source.source_key] : ['unknown'];
}

function flattenLaneRows(lanes) {
  const rows = [];
  for (const lane of LANE_KEYS) {
    for (const row of lanes[lane] ?? []) rows.push({ ...row, readiness_lane: lane });
  }
  return rows;
}

function sourceFamilyForKey(sourceKey) {
  if (!sourceKey || sourceKey === 'unknown') return 'no_source_evidence';
  if (sourceKey.includes('cardtrader')) return 'cardtrader';
  if (sourceKey.includes('pricecharting')) return 'pricecharting_csv_product';
  if (sourceKey.includes('bulbapedia')) return 'bulbapedia_card_page_release_info';
  return sourceKey;
}

function summarizeSourceFamilies(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const rowSourceFamilies = [...new Set(sourceKeys(row).map((rawKey) => sourceFamilyForKey(String(rawKey))))];
    for (const sourceKey of rowSourceFamilies) {
      if (!buckets.has(sourceKey)) {
        buckets.set(sourceKey, {
          source_key: sourceKey,
          rows: 0,
          by_lane: {},
          by_finish: {},
          examples: [],
        });
      }
      const bucket = buckets.get(sourceKey);
      bucket.rows += 1;
      bucket.by_lane[row.readiness_lane] = (bucket.by_lane[row.readiness_lane] ?? 0) + 1;
      bucket.by_finish[row.finish_key] = (bucket.by_finish[row.finish_key] ?? 0) + 1;
      if (bucket.examples.length < 8) {
        bucket.examples.push({
          card_printing_id: row.card_printing_id,
          set_code: row.set_code,
          number: row.number,
          card_name: row.card_name,
          finish_key: row.finish_key,
          source_url: row.best_source?.source_url ?? row.sources?.[0]?.source_url ?? null,
        });
      }
    }
  }
  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      decision: SOURCE_DECISIONS[bucket.source_key] ?? {
        source_family: bucket.source_key,
        current_decision: 'unclassified_evidence_only',
        exact_asset_policy: 'Do not promote exact until a source-specific extractor and proof rule are defined.',
        representative_policy: 'May be used only within existing representative/honesty rules.',
        next_action: 'Classify this source before using it for image promotion.',
        risk: 'No approved image-truth policy exists for this source key.',
      },
      by_lane: Object.fromEntries(Object.entries(bucket.by_lane).sort((a, b) => b[1] - a[1])),
      by_finish: Object.fromEntries(Object.entries(bucket.by_finish).sort((a, b) => b[1] - a[1])),
    }))
    .sort((a, b) => b.rows - a.rows || a.source_key.localeCompare(b.source_key));
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function compactObject(object) {
  return Object.entries(object ?? {}).map(([key, value]) => `${key}=${value}`).join(', ');
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function main() {
  const lanes = JSON.parse(await fs.readFile(LANES_JSON, 'utf8'));
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  const residualPriceChartingProbe = await readJsonIfExists(RESIDUAL_PRICECHARTING_PROBE_JSON);
  const ebayBrowseEvidenceProbe = await readJsonIfExists(EBAY_BROWSE_EVIDENCE_PROBE_JSON);
  const exactPhotoAcquisitionPlan = await readJsonIfExists(EXACT_PHOTO_ACQUISITION_PLAN_JSON);
  const exactPhotoSourceEvidencePilot = await readJsonIfExists(EXACT_PHOTO_SOURCE_EVIDENCE_PILOT_JSON);
  const rows = flattenLaneRows(lanes);
  const source_families = summarizeSourceFamilies(rows);

  const blockedRows =
    Number(lanes.by_readiness_lane?.source_evidence_available_no_exact_asset_extractor ?? 0) +
    Number(lanes.by_readiness_lane?.representative_only_unless_visual_manually_verified ?? 0) +
    Number(lanes.by_readiness_lane?.representative_only_unless_rendered_overlay_captured ?? 0) +
    Number(lanes.by_readiness_lane?.no_source_evidence_available ?? 0);

  const exactProbeRows = Number(lanes.by_readiness_lane?.exact_asset_probe_candidate ?? 0);
  const residualProbeCompleted =
    residualPriceChartingProbe?.package_id === 'IMG-14A-PRICECHARTING-RESIDUAL-EXACT-VARIANT-PROBE' &&
    residualPriceChartingProbe?.summary?.source_rows === exactProbeRows;
  const residualProbeReadyRows = residualProbeCompleted
    ? Number(residualPriceChartingProbe.summary?.exact_ready_rows ?? 0)
    : null;
  const residualProbeBlockedRows = residualProbeCompleted
    ? Number(residualPriceChartingProbe.summary?.blocked_rows ?? 0)
    : null;
  const priceChartingResidualExhausted = residualProbeCompleted && residualProbeReadyRows === 0;
  const ebayProbeCompleted =
    ebayBrowseEvidenceProbe?.package_id === 'IMG-15A-EBAY-BROWSE-EVIDENCE-ONLY-PROBE' &&
    ebayBrowseEvidenceProbe?.summary?.source_rows === exactProbeRows;
  const ebayTitleEvidenceRows = ebayProbeCompleted
    ? Number(ebayBrowseEvidenceProbe.summary?.title_evidence_candidate_rows ?? 0)
    : null;
  const ebayNoTitleEvidenceRows = ebayProbeCompleted
    ? Number(ebayBrowseEvidenceProbe.summary?.no_title_evidence_rows ?? 0)
    : null;
  const exactPhotoPlanCompleted =
    exactPhotoAcquisitionPlan?.audit_only === true &&
    exactPhotoAcquisitionPlan?.ready_now_for_image_apply === 0 &&
    Number(exactPhotoAcquisitionPlan?.exact_variant_backlog_rows ?? 0) === Number(lanes.exact_variant_backlog_rows ?? 0);
  const exactPhotoSourceEvidenceRows = exactPhotoPlanCompleted
    ? Number(exactPhotoAcquisitionPlan.by_strategy_bucket?.exact_photo_needed_source_evidence_exists ?? 0)
    : null;
  const exactPhotoHighValueNoSourceRows = exactPhotoPlanCompleted
    ? Number(exactPhotoAcquisitionPlan.by_strategy_bucket?.no_source_acquire_source_first_high_value ?? 0)
    : null;
  const exactPhotoSourceEvidencePilotCompleted =
    exactPhotoSourceEvidencePilot?.package_id === 'IMG-16B-EXACT-PHOTO-SOURCE-EVIDENCE-PILOT' &&
    exactPhotoSourceEvidencePilot?.audit_only === true;
  const exactPhotoSourceEvidencePilotRows = exactPhotoSourceEvidencePilotCompleted
    ? Number(exactPhotoSourceEvidencePilot.source_rows ?? 0)
    : null;
  const exactPhotoSourceEvidencePilotReadyRows = exactPhotoSourceEvidencePilotCompleted
    ? Number(exactPhotoSourceEvidencePilot.exact_ready_rows ?? 0)
    : null;

  if (priceChartingResidualExhausted) {
    for (const bucket of source_families) {
      if (bucket.source_key !== 'pricecharting_csv_product') continue;
      bucket.decision = {
        ...bucket.decision,
        current_decision: 'residual_probe_exhausted',
        next_action: 'No PriceCharting residual row is exact-image ready after IMG-14A; move to eBay Browse evidence-only investigation or a new exact-photo source lane.',
        risk: 'PriceCharting still proves product/finish evidence for these rows, but current pages do not expose exact matching image alt/assets.',
      };
    }
  }

  const nextSourceAcquisitionOrder = priceChartingResidualExhausted
    ? [
        ebayProbeCompleted
          ? 'Use eBay Browse only as volatile title-evidence context; do not use listing images as canonical assets.'
          : 'Investigate eBay Browse as evidence-only first; do not use listing images as canonical assets until licensing and exactness rules are approved.',
        exactPhotoPlanCompleted
          ? exactPhotoSourceEvidencePilotCompleted
            ? 'Do not promote TCGCollector/BinderBuilder-style rows as exact assets from page images; move to new-source hunting for exact photos or keep representative honesty.'
            : 'Run IMG-16B as a 25-row nonproduction exact-photo acquisition pilot from source-evidence rows; generate asset proof and dry-run only.'
          : 'Design a dedicated exact-photo acquisition lane for high-value cosmos/cracked_ice/stamped rows.',
        'Consider rendered overlay display for reverse-heavy rows, clearly labeled representative rather than exact.',
        'Keep no-source rows honest until new sources are found.',
      ]
    : [
        'Re-probe the 6 PriceCharting exact candidates with frozen-page proof.',
        'Investigate eBay Browse as evidence-only first; do not use listing images as canonical assets until licensing and exactness rules are approved.',
        'Design a dedicated exact-photo acquisition lane for high-value cosmos/cracked_ice/stamped rows.',
        'Consider rendered overlay display for reverse-heavy rows, clearly labeled representative rather than exact.',
        'Keep no-source rows honest until new sources are found.',
      ];

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    source_inputs: {
      lanes_json: LANES_JSON,
      readiness_json: READINESS_JSON,
      residual_pricecharting_probe_json: residualProbeCompleted ? RESIDUAL_PRICECHARTING_PROBE_JSON : null,
      ebay_browse_evidence_probe_json: ebayProbeCompleted ? EBAY_BROWSE_EVIDENCE_PROBE_JSON : null,
      exact_photo_acquisition_plan_json: exactPhotoPlanCompleted ? EXACT_PHOTO_ACQUISITION_PLAN_JSON : null,
      exact_photo_source_evidence_pilot_json: exactPhotoSourceEvidencePilotCompleted ? EXACT_PHOTO_SOURCE_EVIDENCE_PILOT_JSON : null,
      source_records_loaded: readiness.source_records_loaded,
    },
    summary: {
      exact_variant_backlog_rows: lanes.exact_variant_backlog_rows,
      exact_promote_ready_rows_now: 0,
      exact_asset_probe_candidate_rows: exactProbeRows,
      representative_or_blocked_rows: blockedRows,
      no_source_evidence_rows: lanes.by_readiness_lane?.no_source_evidence_available ?? 0,
      pricecharting_residual_probe_completed: residualProbeCompleted,
      pricecharting_residual_exact_ready_rows: residualProbeReadyRows,
      pricecharting_residual_blocked_rows: residualProbeBlockedRows,
      pricecharting_residual_exhausted: priceChartingResidualExhausted,
      ebay_browse_evidence_probe_completed: ebayProbeCompleted,
      ebay_title_evidence_candidate_rows: ebayTitleEvidenceRows,
      ebay_no_title_evidence_rows: ebayNoTitleEvidenceRows,
      exact_photo_acquisition_plan_completed: exactPhotoPlanCompleted,
      exact_photo_source_evidence_rows: exactPhotoSourceEvidenceRows,
      exact_photo_high_value_no_source_rows: exactPhotoHighValueNoSourceRows,
      exact_photo_source_evidence_pilot_completed: exactPhotoSourceEvidencePilotCompleted,
      exact_photo_source_evidence_pilot_rows: exactPhotoSourceEvidencePilotRows,
      exact_photo_source_evidence_pilot_ready_rows: exactPhotoSourceEvidencePilotReadyRows,
      current_display_missing_rows: 0,
      exact_rows_already_improved_by_recent_packages: 41,
      db_safe_next_step: 'website_honesty_messaging_or_new_source_acquisition',
    },
    by_readiness_lane: lanes.by_readiness_lane,
    by_finish: readiness.summary?.by_finish ?? countBy(rows, (row) => row.finish_key),
    by_source_key: lanes.by_source_key,
    source_families,
    decisions: {
      exact_promotion_allowed_now: false,
      exact_promotion_blocker: 'No remaining row is currently promotion-ready without a fresh source-specific proof package.',
      safe_user_facing_state: 'Correct printing; representative image may not show exact finish, stamp, or parallel.',
      ebay_browse_policy: 'Evidence-only. Listing titles may support manual/source context, but listing images are excluded from canonical image promotion until licensing, stability, and exact visual proof rules are separately approved.',
      next_source_acquisition_order: nextSourceAcquisitionOrder,
    },
    verification: {
      generated_from_existing_reports_only: true,
      no_network_required: true,
      no_db_required: true,
      no_apply_path_imported: true,
    },
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    '# Image Truth Source Exhaustion Decision V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'This is read-only. It does not upload images, update database rows, create migrations, clean up, quarantine, or change image confidence.',
    '',
    '## Summary',
    '',
    `- exact_variant_backlog_rows: ${report.summary.exact_variant_backlog_rows}`,
    `- exact_promote_ready_rows_now: ${report.summary.exact_promote_ready_rows_now}`,
    `- exact_asset_probe_candidate_rows: ${report.summary.exact_asset_probe_candidate_rows}`,
    `- pricecharting_residual_probe_completed: ${report.summary.pricecharting_residual_probe_completed}`,
    `- pricecharting_residual_exact_ready_rows: ${report.summary.pricecharting_residual_exact_ready_rows}`,
    `- pricecharting_residual_blocked_rows: ${report.summary.pricecharting_residual_blocked_rows}`,
    `- ebay_browse_evidence_probe_completed: ${report.summary.ebay_browse_evidence_probe_completed}`,
    `- ebay_title_evidence_candidate_rows: ${report.summary.ebay_title_evidence_candidate_rows}`,
    `- ebay_no_title_evidence_rows: ${report.summary.ebay_no_title_evidence_rows}`,
    `- exact_photo_acquisition_plan_completed: ${report.summary.exact_photo_acquisition_plan_completed}`,
    `- exact_photo_source_evidence_rows: ${report.summary.exact_photo_source_evidence_rows}`,
    `- exact_photo_high_value_no_source_rows: ${report.summary.exact_photo_high_value_no_source_rows}`,
    `- exact_photo_source_evidence_pilot_completed: ${report.summary.exact_photo_source_evidence_pilot_completed}`,
    `- exact_photo_source_evidence_pilot_rows: ${report.summary.exact_photo_source_evidence_pilot_rows}`,
    `- exact_photo_source_evidence_pilot_ready_rows: ${report.summary.exact_photo_source_evidence_pilot_ready_rows}`,
    `- representative_or_blocked_rows: ${report.summary.representative_or_blocked_rows}`,
    `- no_source_evidence_rows: ${report.summary.no_source_evidence_rows}`,
    `- db_writes_performed: ${report.db_writes_performed}`,
    `- migrations_created: ${report.migrations_created}`,
    '',
    '## Decision',
    '',
    'No remaining image lane is currently safe for direct exact-image promotion without a new proof package.',
    '',
    'The safe product behavior is:',
    '',
    '> Correct printing; representative image may not show exact finish, stamp, or parallel.',
    '',
    'This keeps display coverage complete without pretending representative images are exact variant images.',
    '',
    '## eBay Browse Evidence Probe',
    '',
    ebayProbeCompleted
      ? `IMG-15A checked ${ebayBrowseEvidenceProbe.summary.source_rows} residual rows. It found ${ebayBrowseEvidenceProbe.summary.title_evidence_candidate_rows} title-only evidence candidates and ${ebayBrowseEvidenceProbe.summary.no_title_evidence_rows} rows without exact listing-title evidence. Listing images remain excluded.`
      : 'No completed eBay Browse evidence probe is recorded yet.',
    '',
    '## Source Family Decisions',
    '',
    markdownTable(source_families, [
      { label: 'source', value: (row) => row.decision.source_family },
      { label: 'rows', value: (row) => row.rows },
      { label: 'decision', value: (row) => row.decision.current_decision },
      { label: 'lanes', value: (row) => compactObject(row.by_lane) },
      { label: 'finishes', value: (row) => compactObject(row.by_finish) },
      { label: 'next action', value: (row) => row.decision.next_action },
    ]),
    '',
    '## Remaining Readiness Lanes',
    '',
    markdownTable(Object.entries(report.by_readiness_lane).map(([lane, rows]) => ({ lane, rows })), [
      { label: 'lane', value: (row) => row.lane },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Next Source Acquisition Order',
    '',
    ...report.decisions.next_source_acquisition_order.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Guardrail',
    '',
    'Do not mark a child image exact unless the source asset itself proves the exact finish, stamp, parallel, or variant visual. Variant existence evidence is not image exactness evidence.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_MD, md);
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    exact_variant_backlog_rows: report.summary.exact_variant_backlog_rows,
    exact_promote_ready_rows_now: report.summary.exact_promote_ready_rows_now,
    exact_asset_probe_candidate_rows: report.summary.exact_asset_probe_candidate_rows,
    representative_or_blocked_rows: report.summary.representative_or_blocked_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
