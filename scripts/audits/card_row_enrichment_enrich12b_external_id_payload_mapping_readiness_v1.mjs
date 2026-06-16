import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich12b_external_id_payload_mapping_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich12b_external_id_payload_mapping_readiness_v1.md');
const PACKAGE_ID = 'ENRICH-12B-EXTERNAL-ID-PAYLOAD-MAPPING-READINESS';
const ALLOWED_SOURCES = new Set(['pokemonapi', 'tcgdex']);

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

async function loadCandidateRows(client) {
  const result = await client.query(`
    with active_mapping_counts as (
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
        trim(both '"' from j.value::text) as external_id,
        jsonb_typeof(j.value) as value_type
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      left join active_mapping_counts am on am.card_print_id = cp.id
      cross join lateral jsonb_each(cp.external_ids) j
      where s.identity_domain_default like 'pokemon_eng%'
        and coalesce(am.active_mapping_count, 0) = 0
        and cp.external_ids is not null
        and cp.external_ids <> '{}'::jsonb
    )
    select *
    from payload
    where source = any($1::text[])
      and value_type = 'string'
      and external_id is not null
      and btrim(external_id) <> ''
    order by source, set_code nulls last, number_plain nulls last, number nulls last, card_name nulls last, external_id
  `, [[...ALLOWED_SOURCES]]);
  return result.rows;
}

async function loadExistingOwners(client, candidates) {
  if (!candidates.length) return [];
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         source text,
         external_id text,
         set_code text,
         number text,
         number_plain text,
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
       target.number_plain as target_number_plain,
       target.card_name as target_card_name,
       target.printed_identity_modifier as target_printed_identity_modifier,
       em.id::text as existing_mapping_id,
       em.card_print_id::text as existing_card_print_id,
       owner.set_code as existing_set_code,
       owner.number as existing_number,
       owner.number_plain as existing_number_plain,
       owner.name as existing_card_name,
       owner.printed_identity_modifier as existing_printed_identity_modifier
     from target
     join public.external_mappings em
       on em.source = target.source
      and em.external_id = target.external_id
      and em.active = true
     join public.card_prints owner on owner.id = em.card_print_id
     order by target.source, target.external_id, target.set_code nulls last, target.number_plain nulls last`,
    [JSON.stringify(candidates.map((row) => ({
      card_print_id: row.card_print_id,
      source: row.source,
      external_id: row.external_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      printed_identity_modifier: row.printed_identity_modifier,
    })))],
  );
  return result.rows;
}

function sameBaseIdentity(row) {
  return String(row.target_set_code ?? '') === String(row.existing_set_code ?? '')
    && String(row.target_number ?? '') === String(row.existing_number ?? '')
    && String(row.target_card_name ?? '') === String(row.existing_card_name ?? '');
}

function classifyCandidate(row, ownerRows) {
  const owners = ownerRows.filter((owner) => (
    owner.target_card_print_id === row.card_print_id
    && owner.source === row.source
    && owner.external_id === row.external_id
  ));

  if (!ALLOWED_SOURCES.has(row.source)) return 'blocked_unsupported_source';
  if (row.value_type !== 'string') return 'blocked_non_scalar_payload';
  if (!owners.length) return 'ready_for_guarded_dry_run';
  if (owners.some((owner) => owner.existing_card_print_id === row.card_print_id)) return 'blocked_target_already_has_active_mapping';
  if (owners.some((owner) => owner.existing_set_code == null || owner.existing_number == null)) return 'blocked_existing_owner_incomplete_identity';
  if (row.printed_identity_modifier && owners.some(sameBaseIdentity)) return 'blocked_variant_source_id_owned_by_base_parent';
  return 'blocked_existing_source_external_owner';
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for readiness audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const candidates = await loadCandidateRows(client);
    const owners = await loadExistingOwners(client, candidates);
    const classified = candidates.map((row) => ({
      ...row,
      readiness_status: classifyCandidate(row, owners),
      existing_owners: owners.filter((owner) => (
        owner.target_card_print_id === row.card_print_id
        && owner.source === row.source
        && owner.external_id === row.external_id
      )),
    }));
    const readyRows = classified.filter((row) => row.readiness_status === 'ready_for_guarded_dry_run');
    const blockedRows = classified.filter((row) => row.readiness_status !== 'ready_for_guarded_dry_run');
    const targetFingerprint = sha256(stableJson(classified.map((row) => ({
      card_print_id: row.card_print_id,
      source: row.source,
      external_id: row.external_id,
      readiness_status: row.readiness_status,
      owners: row.existing_owners.map((owner) => owner.existing_card_print_id).sort(),
    }))));

    const report = {
      version: 'ENRICH12B_EXTERNAL_ID_PAYLOAD_MAPPING_READINESS_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      allowed_sources: [...ALLOWED_SOURCES].sort(),
      fingerprint_sha256: targetFingerprint,
      totals: {
        candidate_parent_rows: new Set(candidates.map((row) => row.card_print_id)).size,
        candidate_mapping_rows: candidates.length,
        ready_mapping_rows: readyRows.length,
        blocked_mapping_rows: blockedRows.length,
        existing_owner_rows: owners.length,
      },
      by_readiness_status: countBy(classified, (row) => row.readiness_status),
      by_source: countBy(classified, (row) => row.source),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(classified, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
      ready_rows: readyRows,
      blocked_rows: blockedRows,
      recommended_next_step: readyRows.length > 0
        ? 'Build a guarded rollback dry-run for ready rows only.'
        : 'Do not create external_mappings from these payloads. All candidate source/external IDs are already actively owned elsewhere; resolve ownership or leave payloads as non-authoritative references.',
      safety: {
        writes_performed: [],
        forbidden: ['external_mappings inserts', 'parent writes', 'child writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-12B External ID Payload Mapping Readiness V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Candidate parent rows: ${report.totals.candidate_parent_rows}`,
      `- Candidate mapping rows: ${report.totals.candidate_mapping_rows}`,
      `- Ready mapping rows: ${report.totals.ready_mapping_rows}`,
      `- Blocked mapping rows: ${report.totals.blocked_mapping_rows}`,
      `- Existing owner rows: ${report.totals.existing_owner_rows}`,
      `- Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
      '## Readiness',
      '',
      markdownTable(Object.entries(report.by_readiness_status).map(([status, rows]) => ({ status, rows })), [
        { label: 'status', value: (row) => row.status },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## By Source',
      '',
      markdownTable(Object.entries(report.by_source).map(([source, rows]) => ({ source, rows })), [
        { label: 'source', value: (row) => row.source },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Blocked Rows',
      '',
      markdownTable(blockedRows, [
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'modifier', value: (row) => row.printed_identity_modifier ?? '' },
        { label: 'source', value: (row) => row.source },
        { label: 'external_id', value: (row) => row.external_id },
        { label: 'status', value: (row) => row.readiness_status },
        { label: 'existing_owner', value: (row) => row.existing_owners.map((owner) => `${owner.existing_set_code ?? 'null'} ${owner.existing_number ?? 'null'} ${owner.existing_card_name ?? ''}`).join('; ') },
      ]),
      '',
      '## Recommended Next Step',
      '',
      report.recommended_next_step,
      '',
      '## Safety',
      '',
      '- Audit only.',
      '- DB writes performed: false.',
      '- Migrations created: false.',
      '- No external mapping inserts, parent writes, child writes, identity writes, deletes, merges, image writes, or global apply.',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      by_readiness_status: report.by_readiness_status,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
