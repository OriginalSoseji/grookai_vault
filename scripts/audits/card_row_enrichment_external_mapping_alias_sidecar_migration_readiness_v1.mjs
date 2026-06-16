import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const SCHEMA_PLAN_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_schema_plan_v1.json';
const OUTPUT_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_migration_readiness_v1.json';
const OUTPUT_MD = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_migration_readiness_v1.md';

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function main() {
  const schemaPlan = JSON.parse(await fs.readFile(SCHEMA_PLAN_JSON, 'utf8'));
  const draftSql = schemaPlan.proposed_ddl;
  const draftSqlHash = sha256(draftSql);

  const report = {
    version: 'EXTERNAL_MAPPING_ALIAS_SIDECAR_MIGRATION_READINESS_V1',
    generated_at: new Date().toISOString(),
    source_report: SCHEMA_PLAN_JSON,
    contract: schemaPlan.contract,
    scope: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      sidecar_created: false,
      ddl_executed: false,
    },
    proposed_package_id: 'EXTMAP-ALIAS-01A-SIDECAR-SCHEMA-CREATE',
    proposed_migration_name: 'create_external_mapping_aliases_sidecar_v1',
    proposed_table: schemaPlan.proposed_table,
    draft_sql_hash_sha256: draftSqlHash,
    readiness_checks: [
      {
        check: 'external_mappings_id_type',
        status: 'pass',
        evidence: 'Baseline schema defines public.external_mappings.id as bigint.',
      },
      {
        check: 'card_print_owner_fk_shape',
        status: 'pass',
        evidence: 'canonical_card_print_id references public.card_prints(id), matching existing canonical owner table.',
      },
      {
        check: 'gen_random_uuid_available',
        status: 'pass',
        evidence: 'Existing migrations already use gen_random_uuid() for uuid primary keys.',
      },
      {
        check: 'source_alias_uniqueness',
        status: 'pass',
        evidence: 'Draft includes partial unique index on source + alias_external_id where active = true.',
      },
      {
        check: 'migration_file_created',
        status: 'not_created',
        evidence: 'This packet is an audit artifact only; no supabase/migrations file was created.',
      },
      {
        check: 'rls_policy',
        status: 'defer',
        evidence: 'No runtime/public exposure is authorized in the schema package; RLS/read policy should be decided before app usage.',
      },
    ],
    readiness_projection: schemaPlan.readiness_projection,
    draft_sql: draftSql,
    future_migration_guardrails: [
      'Create only the sidecar table and indexes.',
      'Do not insert alias rows in the schema migration.',
      'Do not deactivate external_mappings in the schema migration.',
      'Do not alter card_prints, card_printings, card_print_identity, or Master Index tables.',
      'Do not add public app reads until RLS/API policy is explicitly approved.',
      'Run post-migration existence and index checks before any data package.',
    ],
    future_data_package_after_schema: {
      package_id: 'EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION',
      scope: {
        projected_alias_rows: schemaPlan.readiness_projection.projected_sidecar_alias_rows,
        source: 'justtcg',
        allowed_alias_kinds: Object.keys(schemaPlan.readiness_projection.by_alias_kind),
      },
      still_no_cleanup_until_after: 'alias row preservation and readback proof',
    },
    approval_boundary: {
      current_packet_authorizes: 'nothing; audit artifact only',
      future_schema_approval_would_authorize: 'creating the sidecar table and indexes only',
      future_schema_approval_would_not_authorize: [
        'alias row inserts',
        'external_mappings deactivation',
        'cleanup',
        'app exposure',
        'parent or child card writes',
      ],
    },
  };

  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    proposed_package_id: report.proposed_package_id,
    proposed_table: report.proposed_table,
    draft_sql_hash_sha256: report.draft_sql_hash_sha256,
    readiness_projection: report.readiness_projection,
  }));

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    '# External Mapping Alias Sidecar Migration Readiness V1',
    '',
    'Operator-ready readiness packet for a future sidecar schema migration. This report does not create a migration and does not touch the database.',
    '',
    '## Safety',
    '',
    '- DB writes performed: false',
    '- Migrations created: false',
    '- Cleanup performed: false',
    '- Sidecar created: false',
    '- DDL executed: false',
    '',
    '## Package',
    '',
    markdownTable([
      { metric: 'package_id', value: report.proposed_package_id },
      { metric: 'migration_name', value: report.proposed_migration_name },
      { metric: 'table', value: report.proposed_table },
      { metric: 'draft_sql_hash_sha256', value: report.draft_sql_hash_sha256 },
      { metric: 'fingerprint_sha256', value: report.fingerprint_sha256 },
    ], [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Readiness Checks',
    '',
    markdownTable(report.readiness_checks, [
      { label: 'check', value: (row) => row.check },
      { label: 'status', value: (row) => row.status },
      { label: 'evidence', value: (row) => row.evidence },
    ]),
    '',
    '## Readiness Projection',
    '',
    markdownTable(Object.entries(report.readiness_projection).map(([metric, value]) => ({
      metric,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
    })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Draft SQL',
    '',
    '```sql',
    report.draft_sql,
    '```',
    '',
    '## Future Migration Guardrails',
    '',
    ...report.future_migration_guardrails.map((item) => `- ${item}`),
    '',
    '## Future Data Package After Schema',
    '',
    markdownTable(Object.entries(report.future_data_package_after_schema.scope).map(([metric, value]) => ({
      metric,
      value: Array.isArray(value) ? value.join(', ') : value,
    })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Approval Boundary',
    '',
    `Current packet authorizes: ${report.approval_boundary.current_packet_authorizes}`,
    '',
    `Future schema approval would authorize: ${report.approval_boundary.future_schema_approval_would_authorize}`,
    '',
    'Future schema approval would not authorize:',
    '',
    ...report.approval_boundary.future_schema_approval_would_not_authorize.map((item) => `- ${item}`),
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    proposed_package_id: report.proposed_package_id,
    draft_sql_hash_sha256: report.draft_sql_hash_sha256,
    fingerprint_sha256: report.fingerprint_sha256,
    readiness_projection: report.readiness_projection,
  }, null, 2));
}

await main();
