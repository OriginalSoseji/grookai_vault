import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const READINESS_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_migration_readiness_v1.json';
const OUTPUT_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_schema_apply_gate_v1.json';
const OUTPUT_MD = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_schema_apply_gate_v1.md';

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
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));

  const gate = {
    version: 'EXTERNAL_MAPPING_ALIAS_SIDECAR_SCHEMA_APPLY_GATE_V1',
    generated_at: new Date().toISOString(),
    source_report: READINESS_JSON,
    scope: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      sidecar_created: false,
      ddl_executed: false,
    },
    package_id: readiness.proposed_package_id,
    proposed_migration_name: readiness.proposed_migration_name,
    proposed_table: readiness.proposed_table,
    draft_sql_hash_sha256: readiness.draft_sql_hash_sha256,
    readiness_fingerprint_sha256: readiness.fingerprint_sha256,
    authorized_if_approved: [
      'create one migration file for public.external_mapping_aliases schema only',
      'create table public.external_mapping_aliases',
      'create indexes and constraints listed in the readiness packet',
      'run migration through the standard Supabase migration path',
      'verify table/index existence after migration',
    ],
    not_authorized_even_if_approved: [
      'inserting alias rows',
      'deactivating external_mappings',
      'cleanup',
      'parent card_print writes',
      'child card_printing writes',
      'identity writes',
      'image writes',
      'global apply',
      'app/runtime exposure',
    ],
    expected_next_after_schema: {
      package_id: 'EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION',
      dry_run_only_first: true,
      projected_alias_rows: readiness.readiness_projection.projected_sidecar_alias_rows,
      source: 'justtcg',
      purpose: 'insert preserved alias rows into the sidecar before any external_mappings deactivation',
    },
    stop_conditions: [
      'draft SQL hash differs from readiness packet',
      'migration includes DML or alias inserts',
      'migration touches external_mappings rows',
      'migration touches card_prints/card_printings/card_print_identity',
      'migration changes image data',
      'migration includes broad permissions or public exposure',
      'preflight critical failures appear after migration',
    ],
  };

  gate.fingerprint_sha256 = sha256(stableJson({
    version: gate.version,
    package_id: gate.package_id,
    proposed_table: gate.proposed_table,
    draft_sql_hash_sha256: gate.draft_sql_hash_sha256,
    authorized_if_approved: gate.authorized_if_approved,
    not_authorized_even_if_approved: gate.not_authorized_even_if_approved,
  }));

  gate.approval_phrase = [
    `Approve ${gate.package_id} schema migration creation and standard Supabase migration apply only.`,
    `Fingerprint: ${gate.fingerprint_sha256}.`,
    `SQL hash: ${gate.draft_sql_hash_sha256}.`,
    `Scope: create ${gate.proposed_table} sidecar table, constraints, and indexes only.`,
    'No alias row inserts.',
    'No external_mappings deactivation.',
    'No cleanup.',
    'No parent writes.',
    'No child writes.',
    'No identity writes.',
    'No image writes.',
    'No global apply.',
  ].join(' ');

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(gate, null, 2)}\n`);

  const md = [
    '# External Mapping Alias Sidecar Schema Apply Gate V1',
    '',
    'Approval gate for the future sidecar schema migration. This artifact does not create a migration and does not touch the database.',
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
      { metric: 'package_id', value: gate.package_id },
      { metric: 'migration_name', value: gate.proposed_migration_name },
      { metric: 'table', value: gate.proposed_table },
      { metric: 'sql_hash', value: gate.draft_sql_hash_sha256 },
      { metric: 'fingerprint', value: gate.fingerprint_sha256 },
    ], [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Authorized If Approved',
    '',
    ...gate.authorized_if_approved.map((item) => `- ${item}`),
    '',
    '## Not Authorized Even If Approved',
    '',
    ...gate.not_authorized_even_if_approved.map((item) => `- ${item}`),
    '',
    '## Stop Conditions',
    '',
    ...gate.stop_conditions.map((item) => `- ${item}`),
    '',
    '## Approval Phrase',
    '',
    '```text',
    gate.approval_phrase,
    '```',
    '',
    '## Expected Next After Schema',
    '',
    markdownTable(Object.entries(gate.expected_next_after_schema).map(([metric, value]) => ({ metric, value })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    package_id: gate.package_id,
    fingerprint_sha256: gate.fingerprint_sha256,
    draft_sql_hash_sha256: gate.draft_sql_hash_sha256,
    approval_phrase: gate.approval_phrase,
  }, null, 2));
}

await main();
