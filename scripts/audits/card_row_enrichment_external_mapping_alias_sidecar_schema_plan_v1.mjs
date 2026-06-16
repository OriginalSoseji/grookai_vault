import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const READINESS_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_readiness_v1.json';
const OUTPUT_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_schema_plan_v1.json';
const OUTPUT_MD = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_schema_plan_v1.md';

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

const proposedDdl = String.raw`-- DRAFT ONLY. Do not run from this report.
create table public.external_mapping_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_card_print_id uuid not null references public.card_prints(id) on delete cascade,
  canonical_external_mapping_id bigint null references public.external_mappings(id) on delete set null,
  source text not null,
  alias_external_id text not null,
  alias_kind text not null,
  alias_status text not null default 'active',
  source_domain text null,
  evidence_reason text not null,
  preserved_from_mapping_id bigint null references public.external_mappings(id) on delete set null,
  created_from_audit text not null,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index external_mapping_aliases_active_source_alias_uidx
  on public.external_mapping_aliases (source, alias_external_id)
  where active = true;

create index external_mapping_aliases_card_print_idx
  on public.external_mapping_aliases (canonical_card_print_id);

create index external_mapping_aliases_mapping_idx
  on public.external_mapping_aliases (canonical_external_mapping_id);

create index external_mapping_aliases_kind_idx
  on public.external_mapping_aliases (alias_kind)
  where active = true;`;

const proposedInsertShape = String.raw`-- DRAFT ONLY. Populate only after schema approval.
insert into public.external_mapping_aliases (
  canonical_card_print_id,
  canonical_external_mapping_id,
  source,
  alias_external_id,
  alias_kind,
  alias_status,
  source_domain,
  evidence_reason,
  preserved_from_mapping_id,
  created_from_audit,
  metadata,
  active
) values (...);`;

async function main() {
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  const projectedRows = readiness.projected_alias_rows ?? [];

  const report = {
    version: 'EXTERNAL_MAPPING_ALIAS_SIDECAR_SCHEMA_PLAN_V1',
    generated_at: new Date().toISOString(),
    source_report: READINESS_JSON,
    contract: readiness.contract,
    scope: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      sidecar_created: false,
      ddl_executed: false,
    },
    purpose: 'Define the future alias sidecar schema and migration readiness without creating a migration or touching the database.',
    proposed_table: 'public.external_mapping_aliases',
    proposed_columns: [
      { name: 'id', type: 'uuid', role: 'sidecar row identity' },
      { name: 'canonical_card_print_id', type: 'uuid', role: 'canonical Grookai card owner' },
      { name: 'canonical_external_mapping_id', type: 'bigint nullable', role: 'canonical active external_mappings owner row when known' },
      { name: 'source', type: 'text', role: 'source namespace such as justtcg' },
      { name: 'alias_external_id', type: 'text', role: 'preserved upstream alias identifier' },
      { name: 'alias_kind', type: 'text', role: 'product/deck/prize-pack/suffix/text category' },
      { name: 'alias_status', type: 'text', role: 'active, retired, superseded, blocked' },
      { name: 'source_domain', type: 'text nullable', role: 'identity domain at preservation time' },
      { name: 'evidence_reason', type: 'text', role: 'why the alias was preserved' },
      { name: 'preserved_from_mapping_id', type: 'bigint nullable', role: 'external_mappings row that would later be safe to deactivate' },
      { name: 'created_from_audit', type: 'text', role: 'audit package provenance' },
      { name: 'metadata', type: 'jsonb', role: 'non-authoritative source context' },
      { name: 'active', type: 'boolean', role: 'active sidecar alias flag' },
      { name: 'created_at', type: 'timestamptz', role: 'creation timestamp' },
      { name: 'updated_at', type: 'timestamptz', role: 'update timestamp' },
    ],
    proposed_constraints: [
      'primary key on id',
      'foreign key canonical_card_print_id -> public.card_prints(id)',
      'foreign key canonical_external_mapping_id -> public.external_mappings(id) on delete set null',
      'foreign key preserved_from_mapping_id -> public.external_mappings(id) on delete set null',
      'partial unique index on (source, alias_external_id) where active = true',
    ],
    proposed_ddl: proposedDdl,
    proposed_insert_shape: proposedInsertShape,
    readiness_projection: {
      sidecar_ready_groups: readiness.totals.sidecar_ready_groups,
      projected_sidecar_alias_rows: readiness.totals.projected_sidecar_alias_rows,
      projected_canonical_mapping_deactivations_after_sidecar: readiness.totals.projected_canonical_mapping_deactivations_after_sidecar,
      blocked_groups: readiness.totals.blocked_groups,
      by_alias_kind: readiness.by_alias_kind,
      by_source: countBy(projectedRows, (row) => row.source),
    },
    migration_prerequisites: [
      'Review and approve table name and FK behavior.',
      'Confirm bigint matches live external_mappings.id type.',
      'Confirm gen_random_uuid() availability in the live database.',
      'Confirm RLS/permission posture before public/runtime exposure.',
      'Generate migration only after explicit approval.',
      'Run guarded dry-run insert for the 214 projected aliases before any external_mappings deactivation package.',
    ],
    future_apply_order: [
      'Create sidecar schema by migration after approval.',
      'Insert projected sidecar alias rows in guarded dry-run transaction.',
      'Verify sidecar row count and unique source/alias constraints.',
      'Only then prepare deactivation package for preserved duplicate external_mappings rows.',
      'Verify external_mappings_source_card_duplicates falls from 169 to the remaining blocked groups only.',
    ],
    blocked_until_later: [
      '52 suffix/base source-owner policy groups',
      '14 non-product alias groups',
      '3 groups without a unique canonical source id',
      '1 Pocket product alias group',
    ],
  };

  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    proposed_table: report.proposed_table,
    proposed_columns: report.proposed_columns,
    proposed_constraints: report.proposed_constraints,
    readiness_projection: report.readiness_projection,
  }));

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    '# External Mapping Alias Sidecar Schema Plan V1',
    '',
    'No-write, no-migration schema plan for preserving useful source aliases before future external mapping cleanup.',
    '',
    '## Safety',
    '',
    '- DB writes performed: false',
    '- Migrations created: false',
    '- Cleanup performed: false',
    '- Sidecar created: false',
    '- DDL executed: false',
    '',
    '## Proposed Table',
    '',
    `\`${report.proposed_table}\``,
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
    '## Proposed Columns',
    '',
    markdownTable(report.proposed_columns, [
      { label: 'column', value: (row) => row.name },
      { label: 'type', value: (row) => row.type },
      { label: 'role', value: (row) => row.role },
    ]),
    '',
    '## Proposed Constraints',
    '',
    ...report.proposed_constraints.map((constraint) => `- ${constraint}`),
    '',
    '## Draft DDL',
    '',
    '```sql',
    report.proposed_ddl,
    '```',
    '',
    '## Draft Insert Shape',
    '',
    '```sql',
    report.proposed_insert_shape,
    '```',
    '',
    '## Migration Prerequisites',
    '',
    ...report.migration_prerequisites.map((item) => `- ${item}`),
    '',
    '## Future Apply Order',
    '',
    ...report.future_apply_order.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Blocked Until Later',
    '',
    ...report.blocked_until_later.map((item) => `- ${item}`),
    '',
    `Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    fingerprint_sha256: report.fingerprint_sha256,
    proposed_table: report.proposed_table,
    readiness_projection: report.readiness_projection,
  }, null, 2));
}

await main();
