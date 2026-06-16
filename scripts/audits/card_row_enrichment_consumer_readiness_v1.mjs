import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_consumer_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'card_row_enrichment_consumer_readiness_v1.md');

const STATUS_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_status_v1.json');
const CHECKPOINT_JSON = 'docs/checkpoints/card_row_enrichment/20260616_card_row_enrichment_completion_checkpoint_v1.json';
const IMAGE_EXHAUSTION_JSON = 'docs/audits/image_truth_v1/image_truth_source_exhaustion_decision_v1.json';
const IMAGE_CONTRACT = 'docs/contracts/IMAGE_CONFIDENCE_CONTRACT_V1.md';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function coverageMetric(coverage, key) {
  const metric = coverage?.[key] ?? {};
  return {
    present: Number(metric.present ?? 0),
    missing: Number(metric.missing ?? 0),
    percent: Number(metric.percent ?? 0),
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function statusFor({ ready, caution = false }) {
  if (ready && caution) return 'ready_with_labeling_guardrails';
  if (ready) return 'ready';
  return 'not_ready';
}

async function main() {
  const [status, checkpoint, imageExhaustion] = await Promise.all([
    readJson(STATUS_JSON),
    readJson(CHECKPOINT_JSON),
    readJson(IMAGE_EXHAUSTION_JSON),
  ]);

  const surfaces = [
    {
      surface: 'public_card_identity',
      status: statusFor({ ready: checkpoint.english_physical_residuals.core_identity_gap_rows === 0 && checkpoint.english_physical_residuals.active_identity_ready === 0 }),
      db_basis: 'English physical core identity gaps are 0; no active identity backfill candidates remain.',
      use_now: [
        'card name',
        'set',
        'number',
        'active card_print_identity',
        'printed_identity_modifier',
      ],
      guardrails: [
        'Do not derive identity from external_ids payloads.',
        'Do not treat provenance payloads as active external mappings.',
      ],
    },
    {
      surface: 'printing_selector',
      status: statusFor({ ready: coverageMetric(status.child_coverage, 'finish_key').percent === 100 }),
      db_basis: 'Every child printing has finish_key and active_finish_key coverage.',
      use_now: [
        'card_printings.finish_key',
        'child printing rows',
        'canonical parent identity',
      ],
      guardrails: [
        'Do not invent finish labels from parent metadata.',
        'Do not hide verified child printings because exact image is missing.',
      ],
    },
    {
      surface: 'image_display',
      status: statusFor({ ready: imageExhaustion.summary.current_display_missing_rows === 0, caution: true }),
      db_basis: 'Image Truth reports current display missing rows as 0, but exact variant image backlog remains.',
      use_now: [
        'child image when present',
        'parent or representative fallback image',
        'image_confidence',
        'image status/source fields',
      ],
      guardrails: [
        'Show representative or missing_variant_visual labels when image is not exact.',
        'Never label representative image as exact.',
        'Do not overwrite parent image fields to repair child image truth.',
      ],
    },
    {
      surface: 'catalog_metadata',
      status: statusFor({ ready: true, caution: checkpoint.english_physical_residuals.catalog_metadata_gaps > 0 }),
      db_basis: `${checkpoint.english_physical_residuals.catalog_metadata_gaps} English physical catalog metadata gaps remain, but no exact source-mapped write package is safe.`,
      use_now: [
        'rarity when present',
        'artist when present',
        'regulation_mark when present',
        'variants when present',
      ],
      guardrails: [
        'Treat blank metadata as unknown, not false.',
        'Do not infer rarity/artist/regulation mark from sibling rows unless a future guarded package proves it.',
      ],
    },
    {
      surface: 'species_and_traits',
      status: statusFor({ ready: true, caution: checkpoint.english_physical_residuals.species_gaps > 0 || checkpoint.english_physical_residuals.trait_gaps > 0 }),
      db_basis: 'Species and trait residuals are source-limited or not-applicable classes, not broad write queues.',
      use_now: [
        'traits when present',
        'species links when present',
      ],
      guardrails: [
        'Do not require species for trainer/energy/object cards.',
        'Do not block card display because species or traits are absent.',
      ],
    },
    {
      surface: 'external_source_links',
      status: 'admin_only_or_hidden',
      db_basis: 'External mapping payload governance found 0 ready mapping rows; verified_master_index_v1 payloads are provenance, not active source mappings.',
      use_now: [
        'active external_mappings only',
        'Master Index provenance only in admin/review surfaces',
      ],
      guardrails: [
        'Do not expose raw verified_master_index_v1 payloads publicly.',
        'Do not convert payload source IDs into active mappings without source-specific dry-run proof.',
      ],
    },
    {
      surface: 'public_provenance',
      status: 'not_public_ready',
      db_basis: 'Master Index provenance surface plan says 592 rows are internal-admin ready and 0 are public-surface ready.',
      use_now: [
        'internal admin provenance review',
      ],
      guardrails: [
        'Build a stable public attribution UI contract before exposing provenance.',
        'Do not expose review payload rows as public truth.',
      ],
    },
  ];

  const report = {
    version: 'CARD_ROW_ENRICHMENT_CONSUMER_READINESS_V1',
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    source_reports: {
      status: STATUS_JSON,
      checkpoint: CHECKPOINT_JSON,
      image_exhaustion: IMAGE_EXHAUSTION_JSON,
      image_confidence_contract: IMAGE_CONTRACT,
    },
    row_universe: {
      english_physical_parent_rows: status.english_physical_parent_rows,
      english_physical_child_printing_rows: status.english_physical_child_printing_rows,
      english_physical_parent_gap_rows: status.english_physical_parent_gap_rows,
      english_physical_child_gap_rows: status.english_physical_child_gap_rows,
    },
    core_display_readiness: {
      parent_identity: {
        active_identity_missing_for_english_physical: checkpoint.english_physical_residuals.active_identity_candidates,
        core_identity_gap_rows: checkpoint.english_physical_residuals.core_identity_gap_rows,
      },
      printing_truth: {
        finish_key_coverage_percent: coverageMetric(status.child_coverage, 'finish_key').percent,
        active_finish_key_coverage_percent: coverageMetric(status.child_coverage, 'active_finish_key').percent,
        non_provisional_percent: coverageMetric(status.child_coverage, 'non_provisional').percent,
      },
      image_truth: {
        current_display_missing_rows: imageExhaustion.summary.current_display_missing_rows,
        exact_variant_backlog_rows: imageExhaustion.summary.exact_variant_backlog_rows,
        exact_promote_ready_rows_now: imageExhaustion.summary.exact_promote_ready_rows_now,
        representative_or_blocked_rows: imageExhaustion.summary.representative_or_blocked_rows,
      },
    },
    surfaces,
    implementation_next_steps: [
      {
        step: 'Ensure website and app consume child-printing-level finish truth.',
        reason: 'The reconciled DB truth lives at card_printings for finishes and display image confidence.',
      },
      {
        step: 'Make image confidence visible wherever a non-exact image can appear.',
        reason: 'Representative coverage is allowed only when the UI is honest about exact variant uncertainty.',
      },
      {
        step: 'Hide or admin-scope raw Master Index provenance payloads.',
        reason: 'They are governance/evidence context, not public source mappings.',
      },
      {
        step: 'Treat blank enrichment fields as unknown.',
        reason: 'Remaining catalog metadata, species, and trait residuals are not safe inference targets.',
      },
    ],
    forbidden_for_consumers: [
      'Do not infer missing printings or finishes in UI.',
      'Do not label representative images as exact.',
      'Do not require exact child image before displaying a verified printing.',
      'Do not expose raw provenance payloads as public source links.',
      'Do not use external_ids payloads as active mappings.',
    ],
  };

  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    row_universe: report.row_universe,
    core_display_readiness: report.core_display_readiness,
    surfaces: report.surfaces.map((surface) => ({
      surface: surface.surface,
      status: surface.status,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);

  const md = [
    '# Card Row Enrichment Consumer Readiness V1',
    '',
    '## Result',
    '',
    `- Audit only: ${report.audit_only}`,
    `- DB writes performed: ${report.db_writes_performed}`,
    `- Migrations created: ${report.migrations_created}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Row Universe',
    '',
    markdownTable(Object.entries(report.row_universe).map(([metric, rows]) => ({ metric, rows })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Core Display Readiness',
    '',
    markdownTable([
      { metric: 'finish_key coverage', value: `${report.core_display_readiness.printing_truth.finish_key_coverage_percent}%` },
      { metric: 'active_finish_key coverage', value: `${report.core_display_readiness.printing_truth.active_finish_key_coverage_percent}%` },
      { metric: 'non_provisional child printings', value: `${report.core_display_readiness.printing_truth.non_provisional_percent}%` },
      { metric: 'current display missing rows', value: report.core_display_readiness.image_truth.current_display_missing_rows },
      { metric: 'exact variant image backlog', value: report.core_display_readiness.image_truth.exact_variant_backlog_rows },
      { metric: 'exact image promote-ready rows now', value: report.core_display_readiness.image_truth.exact_promote_ready_rows_now },
    ], [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Surface Decisions',
    '',
    markdownTable(surfaces, [
      { label: 'surface', value: (row) => row.surface },
      { label: 'status', value: (row) => row.status },
      { label: 'basis', value: (row) => row.db_basis },
    ]),
    '',
    '## Implementation Next Steps',
    '',
    report.implementation_next_steps.map((row, index) => `${index + 1}. ${row.step}\n   ${row.reason}`).join('\n'),
    '',
    '## Forbidden For Consumers',
    '',
    report.forbidden_for_consumers.map((item) => `- ${item}`).join('\n'),
    '',
  ].join('\n');

  await writeText(OUTPUT_MD, md);
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    fingerprint_sha256: report.fingerprint_sha256,
    surfaces: surfaces.map((surface) => ({ surface: surface.surface, status: surface.status })),
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
