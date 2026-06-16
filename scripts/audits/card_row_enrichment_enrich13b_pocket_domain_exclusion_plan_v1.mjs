import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13b_pocket_domain_exclusion_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13b_pocket_domain_exclusion_plan_v1.md');

const POCKET_SET_CODES = new Set(['A3a', 'P-A']);
const TARGET_CLASSIFICATION = 'blocked_pocket_domain_governance_required';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

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

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

async function readSetRows(client) {
  const result = await client.query(
    `select
       s.id::text as set_id,
       s.code,
       s.name,
       s.identity_domain_default,
       s.source->>'domain' as source_domain,
       s.source
     from public.sets s
     where s.code = any($1::text[])
     order by s.code`,
    [Array.from(POCKET_SET_CODES)],
  );
  return result.rows;
}

async function tableExists(client, tableName) {
  const result = await client.query('select to_regclass($1) as regclass', [`public.${tableName}`]);
  return Boolean(result.rows[0]?.regclass);
}

async function readVaultDependencyCounts(client, cardPrintIds) {
  const candidates = ['vault_item_instances', 'vault_instances'];
  const available = [];
  for (const tableName of candidates) {
    if (await tableExists(client, tableName)) available.push(tableName);
  }

  if (!cardPrintIds.length || !available.length) {
    return {
      table_status: Object.fromEntries(candidates.map((tableName) => [tableName, available.includes(tableName) ? 'available' : 'missing'])),
      counts: {},
    };
  }

  const counts = {};
  for (const tableName of available) {
    const result = await client.query(
      `with target as (
         select id::uuid
         from unnest($1::uuid[]) as id
       )
       select
         t.id::text as card_print_id,
         count(distinct vi.id)::int as count
       from target t
       left join public.${tableName} vi on vi.card_print_id = t.id
       group by t.id`,
      [cardPrintIds],
    );
    for (const row of result.rows) {
      counts[row.card_print_id] = (counts[row.card_print_id] ?? 0) + Number(row.count ?? 0);
    }
  }

  return {
    table_status: Object.fromEntries(candidates.map((tableName) => [tableName, available.includes(tableName) ? 'available' : 'missing'])),
    counts,
  };
}

async function readLiveDependencyCounts(client, cardPrintIds) {
  if (!cardPrintIds.length) return {};
  const vaultDependencies = await readVaultDependencyCounts(client, cardPrintIds);
  const result = await client.query(
    `with target as (
       select id::uuid
       from unnest($1::uuid[]) as id
     )
     select
       t.id::text as card_print_id,
       count(distinct cpr.id)::int as child_count,
       count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
       count(distinct em.id) filter (where coalesce(em.active, true) = true)::int as active_mapping_count,
       count(distinct cpt.id)::int as trait_count,
       count(distinct cps.id)::int as species_count
     from target t
     left join public.card_printings cpr on cpr.card_print_id = t.id
     left join public.card_print_identity cpi on cpi.card_print_id = t.id
     left join public.external_mappings em on em.card_print_id = t.id
     left join public.card_print_traits cpt on cpt.card_print_id = t.id
     left join public.card_print_species cps on cps.card_print_id = t.id
     group by t.id
     order by t.id`,
    [cardPrintIds],
  );
  return {
    table_status: {
      vault_dependencies: vaultDependencies.table_status,
    },
    counts_by_card_print_id: Object.fromEntries(result.rows.map((row) => [
      row.card_print_id,
      {
        ...row,
        vault_instance_count: vaultDependencies.counts[row.card_print_id] ?? 0,
      },
    ])),
  };
}

function rowSummary(row, liveDependencies) {
  return {
    card_print_id: row.card_print_id,
    set_id: row.set_id,
    set_code: row.sets_code,
    set_name: row.set_name,
    current_set_code: row.current_set_code,
    current_number: row.current_number,
    current_number_plain: row.current_number_plain,
    card_name: row.card_name,
    external_ids: row.external_ids,
    parsed_source: row.parsed_source,
    proposed_updates: row.proposed_updates,
    readiness_dependency_counts: row.dependency_counts,
    live_dependency_counts: liveDependencies.counts_by_card_print_id?.[row.card_print_id] ?? null,
    blockers: row.blockers,
  };
}

const readiness = await readJson(READINESS_JSON);
const rows = (readiness.rows ?? [])
  .filter((row) => row.classification === TARGET_CLASSIFICATION)
  .filter((row) => POCKET_SET_CODES.has(row.sets_code));

const unexpectedRows = (readiness.rows ?? [])
  .filter((row) => row.classification === TARGET_CLASSIFICATION)
  .filter((row) => !POCKET_SET_CODES.has(row.sets_code));

const cs = connectionString();
if (!cs) throw new Error('Missing database connection string');

const client = new Client({ connectionString: cs, application_name: 'card_row_enrichment_enrich13b_pocket_domain_exclusion_plan_v1' });
await client.connect();

let setRows;
let liveDependencyCounts;
try {
  setRows = await readSetRows(client);
  liveDependencyCounts = await readLiveDependencyCounts(client, rows.map((row) => row.card_print_id));
} finally {
  await client.end();
}

const rowsBySet = Object.entries(countBy(rows, (row) => `${row.sets_code}|${row.set_name}`))
  .map(([key, count]) => {
    const [set_code, set_name] = key.split('|');
    const set = setRows.find((setRow) => setRow.code === set_code) ?? null;
    return {
      set_code,
      set_name,
      rows: count,
      current_identity_domain_default: set?.identity_domain_default ?? null,
      source_domain: set?.source_domain ?? null,
      tcgdex_id: set?.source?.tcgdex?.id ?? null,
      tcgdex_total: set?.source?.tcgdex?.raw?.cardCount?.total ?? null,
      tcgdex_official: set?.source?.tcgdex?.raw?.cardCount?.official ?? null,
    };
  });

const dependencyTotals = rows.reduce((totals, row) => {
  const deps = liveDependencyCounts.counts_by_card_print_id?.[row.card_print_id] ?? row.dependency_counts ?? {};
  for (const [key, value] of Object.entries(deps)) {
    if (key === 'card_print_id') continue;
    totals[key] = (totals[key] ?? 0) + Number(value ?? 0);
  }
  return totals;
}, {});

const report = {
  version: 'ENRICH_13B_POCKET_DOMAIN_EXCLUSION_PLAN_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_governance_plan',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  source_file: READINESS_JSON,
  summary: {
    target_rows: rows.length,
    unexpected_pocket_classified_rows: unexpectedRows.length,
    target_sets: rowsBySet.length,
    write_ready_now: false,
    recommended_policy: 'exclude_from_english_physical_enrichment_until_dedicated_tcg_pocket_domain_contract_exists',
  },
  set_status: rowsBySet,
  dependency_table_status: liveDependencyCounts.table_status ?? {},
  dependency_totals: dependencyTotals,
  governance_decision: {
    decision: 'do_not_backfill_as_english_physical',
    reason: 'Rows belong to TCG Pocket-like source IDs and were previously policy-blocked from public physical GV-ID backfill. Current sets still have pokemon_eng_standard identity defaults, so applying physical enrichment would mix non-physical rows into the English physical canon.',
    allowed_future_work: [
      'read-only Pocket/domain inventory',
      'dedicated TCG Pocket exclusion/domain contract',
      'guarded dry-run for set/card_print domain reclassification only after contract approval',
      'public route exclusion verification',
    ],
    forbidden_without_new_contract: [
      'card_prints.set_code or number backfill as English physical',
      'GV-ID minting under public physical namespace',
      'child printing GV-ID enrichment',
      'active identity insertion in pokemon_eng_standard',
      'deletion or cleanup of dependency-bearing rows',
    ],
  },
  proposed_future_package_shape: {
    package_id: 'ENRICH-13B1-TCG-POCKET-DOMAIN-RECLASSIFICATION-READINESS',
    current_status: 'not_write_ready_contract_required',
    expected_scope_if_later_approved: [
      'sets.identity_domain_default for A3a/P-A',
      'card_prints.identity_domain for rows in those sets',
      'active identity domain handling or deactivation strategy only with explicit contract',
    ],
    excluded_from_scope: [
      'deletes',
      'merges',
      'GV-ID writes',
      'set_code/number writes',
      'child printing writes',
      'image writes',
      'migrations',
    ],
    required_before_dry_run: [
      'authoritative Pocket/non-physical domain contract',
      'visibility/public-route impact audit',
      'active identity uniqueness plan for non-physical domain',
      'rollback proof for set and parent domain fields',
    ],
  },
  sample_rows: rows.slice(0, 50).map((row) => rowSummary(row, liveDependencyCounts)),
};

report.fingerprint_sha256 = sha256(stableJson({
  summary: report.summary,
  set_status: report.set_status,
  dependency_totals: report.dependency_totals,
  governance_decision: report.governance_decision,
  proposed_future_package_shape: report.proposed_future_package_shape,
  sample_rows: report.sample_rows,
}));

await writeJson(OUTPUT_JSON, report);

const md = [
  '# ENRICH-13B Pocket Domain Exclusion Plan V1',
  '',
  'Read-only governance plan for the 203 Pocket-like rows currently blocking core identity enrichment.',
  '',
  '## Safety',
  '',
  '- DB writes performed: false',
  '- Migrations created: false',
  '- Cleanup performed: false',
  '- This report is not apply authority.',
  '',
  '## Summary',
  '',
  `- Target rows: ${report.summary.target_rows}`,
  `- Target sets: ${report.summary.target_sets}`,
  `- Unexpected Pocket-classified rows: ${report.summary.unexpected_pocket_classified_rows}`,
  `- Write-ready now: ${report.summary.write_ready_now}`,
  `- Recommended policy: \`${report.summary.recommended_policy}\``,
  '',
  '## Set Status',
  '',
  table(rowsBySet, [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'set_name', value: (row) => row.set_name },
    { label: 'rows', value: (row) => row.rows },
    { label: 'identity_domain_default', value: (row) => row.current_identity_domain_default },
    { label: 'source_domain', value: (row) => row.source_domain },
    { label: 'tcgdex_id', value: (row) => row.tcgdex_id },
    { label: 'tcgdex_total', value: (row) => row.tcgdex_total },
    { label: 'tcgdex_official', value: (row) => row.tcgdex_official },
  ]),
  '',
  '## Dependency Totals',
  '',
  table(Object.entries(dependencyTotals).map(([key, value]) => ({ key, value })), [
    { label: 'dependency', value: (row) => row.key },
    { label: 'rows', value: (row) => row.value },
  ]),
  '',
  '## Governance Decision',
  '',
  `Decision: \`${report.governance_decision.decision}\``,
  '',
  report.governance_decision.reason,
  '',
  'Allowed future work:',
  '',
  ...report.governance_decision.allowed_future_work.map((item) => `- ${item}`),
  '',
  'Forbidden without a new contract:',
  '',
  ...report.governance_decision.forbidden_without_new_contract.map((item) => `- ${item}`),
  '',
  '## Future Package Shape',
  '',
  `Package: \`${report.proposed_future_package_shape.package_id}\``,
  '',
  `Current status: \`${report.proposed_future_package_shape.current_status}\``,
  '',
  'Required before dry-run:',
  '',
  ...report.proposed_future_package_shape.required_before_dry_run.map((item) => `- ${item}`),
  '',
  '## Conclusion',
  '',
  'No Pocket-like row should be backfilled as English physical. The next safe move is a dedicated TCG Pocket/non-physical domain contract before any reclassification dry-run.',
  '',
  `Fingerprint: \`${report.fingerprint_sha256}\``,
  '',
].join('\n');

await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
}, null, 2));
