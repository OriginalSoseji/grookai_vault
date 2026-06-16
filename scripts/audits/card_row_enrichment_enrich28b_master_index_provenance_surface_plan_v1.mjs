import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'enrich28a_master_index_provenance_payload_governance_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich28b_master_index_provenance_surface_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich28b_master_index_provenance_surface_plan_v1.md');

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
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function classifyReviewRow(row) {
  const blockers = row.blockers ?? [];
  if (blockers.includes('missing_evidence_urls') && blockers.includes('missing_source_labels')) {
    return 'payload_missing_evidence_and_source_labels';
  }
  if (blockers.includes('missing_evidence_urls')) {
    return 'payload_missing_evidence_urls';
  }
  if (blockers.includes('missing_readiness_or_routing_fingerprint')) {
    return 'payload_missing_fingerprint_only';
  }
  return 'payload_shape_manual_review';
}

async function main() {
  const governance = await readJson(INPUT_JSON);
  const usableRows = governance.usable_samples ?? [];
  const reviewRows = governance.review_samples ?? [];
  const reviewRowsWithLane = reviewRows.map((row) => ({
    ...row,
    remediation_lane: classifyReviewRow(row),
  }));

  const plan = {
    version: 'ENRICH28B_MASTER_INDEX_PROVENANCE_SURFACE_PLAN_V1',
    generated_at: new Date().toISOString(),
    source_file: INPUT_JSON,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    scope: {
      target: 'Master Index provenance payload display/query strategy',
      forbidden: ['DB writes', 'schema changes', 'migrations', 'external_mappings inserts', 'external_mappings transfers', 'canonical identity changes', 'deletes', 'merges', 'image writes', 'global apply'],
    },
    inherited_totals: governance.totals,
    surface_readiness: {
      internal_admin_surface_ready_rows: governance.totals?.usable_provenance_payload_rows ?? 0,
      public_surface_ready_rows: 0,
      reason_public_surface_not_ready: 'Public provenance display needs a stable UI contract and source attribution rules; do not expose raw payloads directly.',
      review_queue_rows: governance.totals?.review_payload_rows ?? 0,
      db_write_ready_rows: 0,
    },
    review_queue: {
      by_lane: countBy(reviewRowsWithLane, (row) => row.remediation_lane),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(reviewRowsWithLane, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
      samples: reviewRowsWithLane.slice(0, 100),
    },
    recommended_model: {
      current_safe_model: 'Keep external_ids.verified_master_index_v1 as embedded audit provenance for now.',
      future_first_class_model: {
        table_intent: 'append-only card_print_evidence or card_print_provenance table',
        minimum_fields: [
          'card_print_id',
          'evidence_source_key',
          'evidence_source_kind',
          'evidence_url',
          'evidence_label',
          'evidence_claim_type',
          'evidence_claim_payload',
          'source_payload_hash',
          'created_at',
          'created_by_package',
          'active',
        ],
        hard_rules: [
          'must not replace external_mappings',
          'must not imply source/external_id ownership',
          'must preserve source URL or stable source reference',
          'must be append-only or historically auditable',
          'must distinguish exact proof from representative/supporting evidence',
        ],
      },
    },
    recommended_next_actions: [
      {
        action: 'No DB write package now',
        reason: 'There are zero external_mapping-ready rows and provenance should not overload external_mappings.',
      },
      {
        action: 'Use 570 usable rows for internal audit/admin provenance display only',
        reason: 'They have source labels, evidence URLs, and fingerprints.',
      },
      {
        action: 'Queue 52 review rows for evidence payload cleanup',
        reason: 'They are active identities but lack one or more display-grade provenance fields.',
      },
      {
        action: 'Defer schema until product needs first-class provenance search/display',
        reason: 'A migration is unnecessary unless the app needs queryable evidence rows.',
      },
    ],
  };

  plan.fingerprint_sha256 = sha256(stableJson({
    version: plan.version,
    inherited_totals: plan.inherited_totals,
    surface_readiness: plan.surface_readiness,
    review_queue: {
      by_lane: plan.review_queue.by_lane,
      by_set_top_25: plan.review_queue.by_set_top_25,
    },
    recommended_model: plan.recommended_model,
  }));

  await writeJson(OUTPUT_JSON, plan);

  const md = [
    '# ENRICH-28B Master Index Provenance Surface Plan V1',
    '',
    '## Result',
    '',
    `- Audit only: ${plan.audit_only}`,
    `- DB writes performed: ${plan.db_writes_performed}`,
    `- Migrations created: ${plan.migrations_created}`,
    `- Fingerprint: \`${plan.fingerprint_sha256}\``,
    '',
    '## Surface Readiness',
    '',
    markdownTable(Object.entries(plan.surface_readiness).map(([metric, value]) => ({ metric, value })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Review Queue',
    '',
    markdownTable(Object.entries(plan.review_queue.by_lane).map(([lane, rows]) => ({ lane, rows })), [
      { label: 'lane', value: (row) => row.lane },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Recommended Model',
    '',
    `- Current safe model: ${plan.recommended_model.current_safe_model}`,
    `- Future model: ${plan.recommended_model.future_first_class_model.table_intent}`,
    '',
    '## Hard Rules',
    '',
    plan.recommended_model.future_first_class_model.hard_rules.map((rule) => `- ${rule}`).join('\n'),
    '',
    '## Recommended Next Actions',
    '',
    plan.recommended_next_actions.map((row) => `- ${row.action}: ${row.reason}`).join('\n'),
    '',
  ].join('\n');

  await writeText(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    fingerprint_sha256: plan.fingerprint_sha256,
    surface_readiness: plan.surface_readiness,
    review_queue: plan.review_queue.by_lane,
  }, null, 2));
}

await main();
