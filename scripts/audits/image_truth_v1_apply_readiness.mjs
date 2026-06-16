import fs from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const AUDIT_JSON = path.join(OUTPUT_DIR, 'image_truth_audit_v1.json');
const RISK_JSON = path.join(OUTPUT_DIR, 'image_truth_risk_queue_v1.json');
const READINESS_JSON = path.join(OUTPUT_DIR, 'image_truth_apply_readiness_v1.json');
const READINESS_MD = path.join(OUTPUT_DIR, 'image_truth_apply_readiness_v1.md');

const CODE_PROBES = [
  {
    key: 'web_card_detail_reads_child_images',
    file: 'apps/web/src/lib/getPublicCardByGvId.ts',
    required: ['resolveCardImageFieldsV1(printing)', 'is_display_fallback'],
  },
  {
    key: 'web_public_sets_reads_child_images',
    file: 'apps/web/src/lib/publicSets.ts',
    required: ['resolveCardImageFieldsV1(printing)', 'card_printings'],
  },
  {
    key: 'child_image_column_selector_exists',
    file: 'apps/web/src/lib/cards/childPrintingImageStorage.ts',
    required: ['image_source', 'image_path', 'image_status', 'image_note'],
  },
  {
    key: 'warehouse_write_plan_targets_child_images',
    file: 'apps/web/src/lib/warehouse/buildPromotionWritePlanV1.ts',
    required: ['ENRICH_CARD_PRINTING_IMAGE', 'target_table: "card_printings"', 'Promotion would update the resolved child printing image'],
  },
  {
    key: 'warehouse_stage_worker_freezes_child_asset',
    file: 'backend/warehouse/promotion_stage_worker_v1.mjs',
    required: ['ENRICH_CARD_PRINTING_IMAGE', "target_table: 'card_printings'", 'normalized_front_storage_path'],
  },
  {
    key: 'warehouse_executor_updates_child_only',
    file: 'backend/warehouse/promotion_executor_v1.mjs',
    required: ['ENRICH_CARD_PRINTING_IMAGE', 'update public.card_printings', "image_status: 'exact'"],
  },
];

const RISK_PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortByRisk(a, b) {
  const riskDelta = (RISK_PRIORITY_ORDER[a.risk_level] ?? 99) - (RISK_PRIORITY_ORDER[b.risk_level] ?? 99);
  if (riskDelta !== 0) return riskDelta;
  return String(a.set_code ?? '').localeCompare(String(b.set_code ?? '')) ||
    String(a.card_name ?? '').localeCompare(String(b.card_name ?? '')) ||
    String(a.number ?? '').localeCompare(String(b.number ?? '')) ||
    String(a.finish_key ?? '').localeCompare(String(b.finish_key ?? ''));
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = String(row[key] ?? 'unknown');
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function hasResolvedSet(row) {
  const setCode = String(row.set_code ?? '').trim().toLowerCase();
  return Boolean(setCode && setCode !== 'unknown' && setCode !== 'null');
}

function hasResolvedNumber(row) {
  return Boolean(String(row.number ?? '').trim());
}

function topEntries(counts, limit = 20) {
  return Object.fromEntries(Object.entries(counts).slice(0, limit));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function probeCode() {
  const probes = [];
  for (const probe of CODE_PROBES) {
    let text = '';
    let exists = true;
    try {
      text = await fs.readFile(probe.file, 'utf8');
    } catch {
      exists = false;
    }

    const missing = exists ? probe.required.filter((needle) => !text.includes(needle)) : probe.required;
    probes.push({
      key: probe.key,
      file: probe.file,
      ready: exists && missing.length === 0,
      missing_markers: missing,
    });
  }
  return probes;
}

function buildBuckets(rows, addressableRows = [], identityBlockedRows = [], queueSummary = null) {
  const exactRequired = rows.filter((row) => row.exact_child_image_required === true);
  const criticalMissingDisplay = exactRequired.filter((row) => row.image_coverage_status === 'missing_display_image');
  const finishSpecificFallback = exactRequired.filter((row) => row.image_coverage_status !== 'missing_display_image');
  const identityBlocked = exactRequired.filter((row) => !hasResolvedSet(row) || !hasResolvedNumber(row));
  const applyAddressable = exactRequired.filter((row) => hasResolvedSet(row) && hasResolvedNumber(row));
  const effectiveAddressableRows = addressableRows.length > 0 ? addressableRows : applyAddressable;
  const effectiveIdentityBlockedRows = identityBlockedRows.length > 0 ? identityBlockedRows : identityBlocked;
  const noOwnership = exactRequired.filter((row) => Number(row.ownership_refs_count ?? 0) === 0);
  const withOwnership = exactRequired.filter((row) => Number(row.ownership_refs_count ?? 0) > 0);

  return {
    risk_queue_rows: rows.length,
    detailed_rows_are_top_limited: true,
    exact_required_rows_in_queue: exactRequired.length,
    full_missing_exact_rows_count: queueSummary?.full_missing_exact_rows_count ?? exactRequired.length,
    apply_addressable_rows_total: queueSummary?.apply_addressable_missing_exact_rows ?? applyAddressable.length,
    identity_blocked_rows_total: queueSummary?.identity_blocked_missing_exact_rows ?? identityBlocked.length,
    non_physical_blocked_rows_total: queueSummary?.non_physical_blocked_missing_exact_rows ?? 0,
    other_scope_rows_total: queueSummary?.other_scope_missing_exact_rows ?? 0,
    apply_addressable_rows_in_detailed_queue: applyAddressable.length,
    identity_blocked_rows_in_detailed_queue: identityBlocked.length,
    critical_missing_display_rows: criticalMissingDisplay.length,
    finish_specific_fallback_rows: finishSpecificFallback.length,
    ownership_reference_rows: withOwnership.length,
    no_ownership_reference_rows: noOwnership.length,
    first_source_acquisition_bucket: effectiveAddressableRows
      .filter((row) => row.image_coverage_status === 'missing_display_image' && hasResolvedSet(row) && hasResolvedNumber(row))
      .sort(sortByRisk)
      .slice(0, 25),
    identity_blocked_source_review_bucket: effectiveIdentityBlockedRows.sort(sortByRisk).slice(0, 25),
    first_child_image_promotion_bucket: effectiveAddressableRows
      .filter((row) => row.image_coverage_status !== 'missing_display_image')
      .filter((row) => Number(row.ownership_refs_count ?? 0) === 0 && hasResolvedSet(row) && hasResolvedNumber(row))
      .sort(sortByRisk)
      .slice(0, 25),
  };
}

function summarizeReadiness(audit, riskQueue, probes, buckets) {
  const probeReady = Object.fromEntries(probes.map((probe) => [probe.key, probe.ready]));
  const allCodeProbesReady = probes.every((probe) => probe.ready);
  const childColumnsReady = audit.summary?.child_image_storage_columns_present === true;
  const hasRiskQueue = Array.isArray(riskQueue.rows) && riskQueue.rows.length > 0;

  return {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    readiness_classification: childColumnsReady && allCodeProbesReady && hasRiskQueue
      ? 'pipeline_ready_source_assets_required'
      : 'blocked_readiness_gap',
    safe_to_apply_now: false,
    reason_safe_to_apply_now_false: 'No exact source image asset packet has been staged and dry-run proven for a target bucket.',
    source_audit_summary: audit.summary,
    probe_ready: probeReady,
    code_probes: probes,
    bucket_summary: {
      risk_queue_rows: buckets.risk_queue_rows,
      detailed_rows_are_top_limited: buckets.detailed_rows_are_top_limited,
      exact_required_rows_in_queue: buckets.exact_required_rows_in_queue,
      full_missing_exact_rows_count: buckets.full_missing_exact_rows_count,
      apply_addressable_rows_total: buckets.apply_addressable_rows_total,
      identity_blocked_rows_total: buckets.identity_blocked_rows_total,
      non_physical_blocked_rows_total: buckets.non_physical_blocked_rows_total,
      other_scope_rows_total: buckets.other_scope_rows_total,
      apply_addressable_rows_in_detailed_queue: buckets.apply_addressable_rows_in_detailed_queue,
      identity_blocked_rows_in_detailed_queue: buckets.identity_blocked_rows_in_detailed_queue,
      critical_missing_display_rows: buckets.critical_missing_display_rows,
      finish_specific_fallback_rows: buckets.finish_specific_fallback_rows,
      ownership_reference_rows: buckets.ownership_reference_rows,
      no_ownership_reference_rows: buckets.no_ownership_reference_rows,
      risk_by_finish: topEntries(countBy(riskQueue.rows, 'finish_key'), 20),
      risk_by_set: topEntries(countBy(riskQueue.rows, 'set_code'), 20),
      risk_by_coverage: topEntries(countBy(riskQueue.rows, 'image_coverage_status'), 20),
      risk_by_confidence: topEntries(countBy(riskQueue.rows, 'image_confidence'), 20),
      english_physical_confidence_counts: audit.summary?.english_physical_image_confidence_counts ?? {},
      english_physical_exact_required_confidence_counts: audit.summary?.english_physical_exact_required_image_confidence_counts ?? {},
    },
    recommended_sequence: [
      {
        step: 'IMG-01A',
        name: 'Source asset acquisition for missing display images',
        scope: 'Start with 10-25 critical exact-child-required rows that currently have no display image.',
        writes_allowed: false,
        output: 'Evidence packet with source URL, source kind, target card_printing_id, and normalized image asset path.',
      },
      {
        step: 'IMG-01R',
        name: 'Representative confidence labeling for covered rows',
        scope: 'Rows with a safe parent/base display image but missing exact finish, stamp, or parallel visual become missing_variant_visual, not exact.',
        writes_allowed: false,
        output: 'Read-only package showing which rows can be honestly labeled as display-covered but not exact.',
      },
      {
        step: 'IMG-01B',
        name: 'Child-image dry-run promotion packet',
        scope: 'Use only rows with exact source assets and resolved card_printing targets.',
        writes_allowed: false,
        output: 'Rollback-only dry-run proof showing only card_printings image fields would change.',
      },
      {
        step: 'IMG-01C',
        name: 'One-row real apply after approval',
        scope: 'Apply one child image row only after dry-run proof and visual route verification.',
        writes_allowed: 'requires explicit user approval',
        output: 'Post-apply proof that parent image fields were untouched and child image renders.',
      },
      {
        step: 'IMG-02',
        name: 'Bulk child image buckets',
        scope: 'Scale by finish family after IMG-01 proves the loop.',
        writes_allowed: 'requires explicit bucket approval',
        output: 'Guarded child-image correction packages.',
      },
    ],
    hard_guardrails: [
      'Never update card_prints.image_url for finish-specific child image repair.',
      'Only english_physical scoped rows may enter the first image correction packages.',
      'Digital-only or physical-pipeline-excluded sets must stay blocked from physical image repair.',
      'Only card_printings image fields may change for ENRICH_CARD_PRINTING_IMAGE.',
      'Require exact card_printing_id target, source URL or preserved asset reference, and normalized front asset.',
      'Do not promote marketplace/title-only evidence unless exact set, number, name, and finish are proven.',
      'Do not overwrite an existing distinct child image without a separate conflict review.',
      'Dry-run and post-apply proof must show parent image fields unchanged.',
      'No migrations for image correction packages.',
    ],
    first_source_acquisition_bucket: buckets.first_source_acquisition_bucket,
    identity_blocked_source_review_bucket: buckets.identity_blocked_source_review_bucket,
    first_child_image_promotion_bucket: buckets.first_child_image_promotion_bucket,
  };
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildMarkdown(report) {
  const summary = report.source_audit_summary ?? {};
  const probeRows = report.code_probes.map((probe) => ({
    ...probe,
    status: probe.ready ? 'ready' : 'blocked',
    missing: probe.missing_markers.length ? probe.missing_markers.join(', ') : '-',
  }));

  const rowColumns = [
    { label: 'set', value: (row) => row.set_code ?? 'unknown' },
    { label: 'scope', value: (row) => row.image_scope ?? 'unknown' },
    { label: 'confidence', value: (row) => row.image_confidence ?? 'unknown' },
    { label: 'card', value: (row) => row.card_name },
    { label: 'number', value: (row) => row.number },
    { label: 'finish', value: (row) => row.finish_key },
    { label: 'coverage', value: (row) => row.image_coverage_status },
    { label: 'risk', value: (row) => row.risk_level },
    { label: 'printing', value: (row) => row.printing_gv_id ?? row.card_printing_id },
  ];

  return `# Image Truth Apply Readiness V1

Generated: ${report.generated_at}

This is audit-only. It does not write to the database, create migrations, run cleanup, or quarantine rows.

## Readiness

- readiness_classification: ${report.readiness_classification}
- safe_to_apply_now: ${report.safe_to_apply_now}
- reason: ${report.reason_safe_to_apply_now_false}
- total_child_printings: ${summary.total_child_printings ?? 0}
- exact_child_image_required: ${summary.exact_child_image_required ?? 0}
- exact_required_missing_child_exact_image: ${summary.exact_required_missing_child_exact_image ?? 0}
- critical_or_high_risk_rows: ${summary.critical_or_high_risk_rows ?? 0}
- english_physical_display_covered_rows: ${summary.english_physical_display_covered_rows ?? 0}
- english_physical_missing_display_rows: ${summary.english_physical_missing_display_rows ?? 0}
- english_physical_missing_variant_visual_rows: ${summary.english_physical_missing_variant_visual_rows ?? 0}
- child_image_storage_columns_present: ${summary.child_image_storage_columns_present === true}

## Existing Pipeline Checks

${markdownTable(probeRows, [
  { label: 'check', value: (row) => row.key },
  { label: 'status', value: (row) => row.status },
  { label: 'file', value: (row) => row.file },
  { label: 'missing markers', value: (row) => row.missing },
])}

## Bucket Summary

- risk_queue_rows: ${report.bucket_summary.risk_queue_rows}
- detailed_rows_are_top_limited: ${report.bucket_summary.detailed_rows_are_top_limited}
- exact_required_rows_in_queue: ${report.bucket_summary.exact_required_rows_in_queue}
- full_missing_exact_rows_count: ${report.bucket_summary.full_missing_exact_rows_count}
- apply_addressable_rows_total: ${report.bucket_summary.apply_addressable_rows_total}
- identity_blocked_rows_total: ${report.bucket_summary.identity_blocked_rows_total}
- non_physical_blocked_rows_total: ${report.bucket_summary.non_physical_blocked_rows_total}
- other_scope_rows_total: ${report.bucket_summary.other_scope_rows_total}
- apply_addressable_rows_in_detailed_queue: ${report.bucket_summary.apply_addressable_rows_in_detailed_queue}
- identity_blocked_rows_in_detailed_queue: ${report.bucket_summary.identity_blocked_rows_in_detailed_queue}
- critical_missing_display_rows: ${report.bucket_summary.critical_missing_display_rows}
- finish_specific_fallback_rows: ${report.bucket_summary.finish_specific_fallback_rows}
- ownership_reference_rows: ${report.bucket_summary.ownership_reference_rows}
- no_ownership_reference_rows: ${report.bucket_summary.no_ownership_reference_rows}

## Confidence Counts

English physical:

${markdownTable(Object.entries(report.bucket_summary.english_physical_confidence_counts).map(([confidence, count]) => ({ confidence, count })), [
  { label: 'confidence', value: (row) => row.confidence },
  { label: 'rows', value: (row) => row.count },
])}

English physical exact-required:

${markdownTable(Object.entries(report.bucket_summary.english_physical_exact_required_confidence_counts).map(([confidence, count]) => ({ confidence, count })), [
  { label: 'confidence', value: (row) => row.confidence },
  { label: 'rows', value: (row) => row.count },
])}

## Recommended Sequence

${report.recommended_sequence.map((step) => `- ${step.step}: ${step.name}. ${step.scope} Writes: ${step.writes_allowed}.`).join('\n')}

## Hard Guardrails

${report.hard_guardrails.map((guardrail) => `- ${guardrail}`).join('\n')}

## First Source Acquisition Bucket

These rows have exact-child-required finishes, resolved set/number identity, and no display image. They should receive source asset acquisition first, not immediate DB writes.

${markdownTable(report.first_source_acquisition_bucket.slice(0, 25), rowColumns)}

## Identity-Blocked Image Review Bucket

These rows are image-risky but do not have enough resolved set/number context for image apply work. They require identity/set resolution or exclusion before any image package.

${markdownTable(report.identity_blocked_source_review_bucket.slice(0, 25), rowColumns)}

## First Child Image Promotion Bucket

These rows have exact-child-required finishes, resolved set/number identity, and currently rely on a parent image. They are candidates only after exact child source assets are staged and dry-run proven.

${markdownTable(report.first_child_image_promotion_bucket.slice(0, 25), rowColumns)}

## Explicit Non-Actions

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
`;
}

async function main() {
  const [audit, riskQueue] = await Promise.all([readJson(AUDIT_JSON), readJson(RISK_JSON)]);
  const probes = await probeCode();
  const buckets = buildBuckets(
    riskQueue.rows ?? [],
    riskQueue.apply_addressable_rows ?? [],
    riskQueue.identity_blocked_rows ?? [],
    {
      ...(riskQueue.bucket_summary ?? {}),
      full_missing_exact_rows_count: riskQueue.full_missing_exact_rows_count,
    },
  );
  const report = summarizeReadiness(audit, riskQueue, probes, buckets);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(READINESS_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(READINESS_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated: [READINESS_JSON, READINESS_MD],
    readiness_classification: report.readiness_classification,
    safe_to_apply_now: report.safe_to_apply_now,
    exact_required_rows_in_queue: report.bucket_summary.exact_required_rows_in_queue,
    critical_missing_display_rows: report.bucket_summary.critical_missing_display_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
