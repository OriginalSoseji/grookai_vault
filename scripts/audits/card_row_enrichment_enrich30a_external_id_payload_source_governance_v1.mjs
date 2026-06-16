import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich30a_external_id_payload_source_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich30a_external_id_payload_source_governance_v1.md');

const DIRECT_MAPPING_SOURCES = new Set(['pokemonapi', 'tcgdex']);
const PROVENANCE_ONLY_SOURCES = new Set(['verified_master_index_v1']);

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function loadPayloadRows(client) {
  const result = await client.query(`
    with mapping_counts as (
      select card_print_id, count(*) filter (where active = true)::int as active_mapping_count
      from public.external_mappings
      group by card_print_id
    ),
    payload as (
      select
        cp.id::text as card_print_id,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.name as card_name,
        cp.printed_identity_modifier,
        cp.external_ids,
        j.key as source,
        j.value as payload_value,
        jsonb_typeof(j.value) as value_type,
        case when jsonb_typeof(j.value) = 'string' then trim(both '"' from j.value::text) else null end as external_id
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      left join mapping_counts mc on mc.card_print_id = cp.id
      cross join lateral jsonb_each(cp.external_ids) j
      where s.identity_domain_default like 'pokemon_eng%'
        and coalesce(mc.active_mapping_count, 0) = 0
        and cp.external_ids is not null
        and cp.external_ids <> '{}'::jsonb
    )
    select *
    from payload
    order by source, set_code nulls last, number_plain nulls last, number nulls last, card_name nulls last, card_print_id
  `);
  return result.rows;
}

async function loadExistingOwners(client, rows) {
  const scalarRows = rows.filter((row) => row.external_id);
  if (!scalarRows.length) return [];
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         source text,
         external_id text,
         set_code text,
         number text,
         card_name text,
         printed_identity_modifier text
       )
     )
     select
       target.card_print_id::text as target_card_print_id,
       target.source,
       target.external_id,
       target.set_code as target_set_code,
       target.number as target_number,
       target.card_name as target_card_name,
       target.printed_identity_modifier as target_printed_identity_modifier,
       em.id::text as existing_mapping_id,
       em.card_print_id::text as existing_card_print_id,
       owner.set_code as existing_set_code,
       owner.number as existing_number,
       owner.name as existing_card_name,
       owner.printed_identity_modifier as existing_printed_identity_modifier
     from target
     join public.external_mappings em
       on em.source = target.source
      and em.external_id = target.external_id
      and em.active = true
     join public.card_prints owner on owner.id = em.card_print_id
     order by target.source, target.external_id, target.set_code nulls last, target.number nulls last`,
    [JSON.stringify(scalarRows.map((row) => ({
      card_print_id: row.card_print_id,
      source: row.source,
      external_id: row.external_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      printed_identity_modifier: row.printed_identity_modifier,
    })))],
  );
  return result.rows;
}

function classify(row, ownerRows) {
  if (PROVENANCE_ONLY_SOURCES.has(row.source)) return 'provenance_payload_not_external_mapping_source';
  if (row.value_type !== 'string') return 'blocked_non_scalar_payload';
  if (!row.external_id || !String(row.external_id).trim()) return 'blocked_blank_external_id';
  if (!DIRECT_MAPPING_SOURCES.has(row.source)) return 'source_governance_needed';

  const owners = ownerRows.filter((owner) => (
    owner.target_card_print_id === row.card_print_id
    && owner.source === row.source
    && owner.external_id === row.external_id
  ));

  if (!owners.length) return 'ready_for_guarded_external_mapping_dry_run';
  if (owners.some((owner) => owner.existing_card_print_id === row.card_print_id)) return 'blocked_target_already_has_active_mapping';
  if (row.printed_identity_modifier && owners.some((owner) => (
    owner.existing_set_code === row.set_code
    && owner.existing_number === row.number
    && owner.existing_card_name === row.card_name
  ))) return 'blocked_variant_source_id_owned_by_base_parent';
  return 'blocked_existing_source_external_owner';
}

function sample(row) {
  return {
    card_print_id: row.card_print_id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    card_name: row.card_name,
    printed_identity_modifier: row.printed_identity_modifier,
    source: row.source,
    value_type: row.value_type,
    external_id: row.external_id,
    classification: row.classification,
    existing_owners: row.existing_owners,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('set default_transaction_read_only = on');
    const rows = await loadPayloadRows(client);
    const owners = await loadExistingOwners(client, rows);
    const classified = rows.map((row) => {
      const existingOwners = owners.filter((owner) => (
        owner.target_card_print_id === row.card_print_id
        && owner.source === row.source
        && owner.external_id === row.external_id
      ));
      return {
        ...row,
        classification: classify(row, owners),
        existing_owners: existingOwners.map((owner) => ({
          card_print_id: owner.existing_card_print_id,
          set_code: owner.existing_set_code,
          number: owner.existing_number,
          card_name: owner.existing_card_name,
          printed_identity_modifier: owner.existing_printed_identity_modifier,
        })),
      };
    });

    const readyRows = classified.filter((row) => row.classification === 'ready_for_guarded_external_mapping_dry_run');
    const governanceRows = classified.filter((row) => row.classification === 'source_governance_needed');
    const parentCount = new Set(classified.map((row) => row.card_print_id)).size;
    const sourceSummary = Object.entries(countBy(classified, (row) => row.source)).map(([source, rowsForSource]) => ({
      source,
      rows: rowsForSource,
      classifications: countBy(classified.filter((row) => row.source === source), (row) => row.classification),
      value_types: countBy(classified.filter((row) => row.source === source), (row) => row.value_type),
    }));

    const report = {
      version: 'ENRICH30A_EXTERNAL_ID_PAYLOAD_SOURCE_GOVERNANCE_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      scope: {
        target: 'English physical card_prints with external_ids payloads but no active external mappings',
        direct_mapping_sources: [...DIRECT_MAPPING_SOURCES].sort(),
        provenance_only_sources: [...PROVENANCE_ONLY_SOURCES].sort(),
        forbidden: ['external_mappings writes', 'parent writes', 'child writes', 'identity writes', 'species writes', 'trait writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      totals: {
        candidate_parent_rows: parentCount,
        payload_source_mentions: classified.length,
        ready_mapping_rows: readyRows.length,
        source_governance_needed_rows: governanceRows.length,
        blocked_rows: classified.length - readyRows.length,
        existing_owner_rows: owners.length,
      },
      by_classification: countBy(classified, (row) => row.classification),
      by_source: countBy(classified, (row) => row.source),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(classified, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
      source_summary: sourceSummary,
      ready_rows: readyRows.map(sample),
      governance_needed_samples: governanceRows.slice(0, 75).map(sample),
      blocked_samples: classified.filter((row) => row.classification !== 'ready_for_guarded_external_mapping_dry_run').slice(0, 100).map(sample),
      recommended_next_step: readyRows.length > 0
        ? 'Build guarded rollback dry-run for ready direct mapping rows only.'
        : governanceRows.length > 0
        ? 'No direct mapping write is ready. Define source-specific rules for source_governance_needed rows before any external_mappings insert package.'
        : 'No external_id payload mapping package is currently safe.',
    };

    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      by_classification: report.by_classification,
      by_source: report.by_source,
      ready_rows: report.ready_rows.map((row) => ({
        card_print_id: row.card_print_id,
        source: row.source,
        external_id: row.external_id,
      })),
    }));

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-30A External ID Payload Source Governance V1',
      '',
      '## Result',
      '',
      `- Audit only: ${report.audit_only}`,
      `- DB writes performed: ${report.db_writes_performed}`,
      `- Migrations created: ${report.migrations_created}`,
      `- Candidate parent rows: ${report.totals.candidate_parent_rows}`,
      `- Payload source mentions: ${report.totals.payload_source_mentions}`,
      `- Ready mapping rows: ${report.totals.ready_mapping_rows}`,
      `- Source-governance-needed rows: ${report.totals.source_governance_needed_rows}`,
      `- Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
      '## By Classification',
      '',
      markdownTable(Object.entries(report.by_classification).map(([classification, rowsForClass]) => ({ classification, rows: rowsForClass })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## By Source',
      '',
      markdownTable(sourceSummary, [
        { label: 'source', value: (row) => row.source },
        { label: 'rows', value: (row) => row.rows },
        { label: 'classifications', value: (row) => JSON.stringify(row.classifications) },
      ]),
      '',
      '## Ready Rows',
      '',
      markdownTable(report.ready_rows, [
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'source', value: (row) => row.source },
        { label: 'external_id', value: (row) => row.external_id },
      ]),
      '',
      '## Recommended Next Step',
      '',
      report.recommended_next_step,
      '',
      '## Safety',
      '',
      '- No external mapping writes.',
      '- No parent, child, identity, species, or trait writes.',
      '- No deletes, merges, migrations, image writes, or global apply.',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      by_classification: report.by_classification,
      by_source: report.by_source,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
