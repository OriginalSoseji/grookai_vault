import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich25a_verified_master_index_mapping_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich25a_verified_master_index_mapping_readiness_v1.md');
const SOURCE_KEY = 'verified_master_index_v1';

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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function classify(row) {
  if (row.value_type !== 'string') return 'blocked_non_scalar_payload';
  if (!row.external_id || !row.external_id.trim()) return 'blocked_blank_external_id';
  if (row.target_source_already_mapped_count > 0) return 'already_mapped_on_target';
  if (row.source_external_owner_count > 0) return 'blocked_source_external_owned_elsewhere';
  if (row.batch_source_external_duplicate_count > 1) return 'blocked_batch_source_external_duplicate';
  if (!row.external_id.startsWith('vmi:')) return 'blocked_missing_vmi_namespace';
  return 'review_required_internal_reference_not_external_source';
}

async function loadRows(client) {
  const result = await client.query(
    `with active_mapping_counts as (
       select card_print_id, count(*) filter (where active = true)::int as active_mapping_count
       from public.external_mappings
       group by card_print_id
     ),
     payload as (
       select
         cp.id::text as card_print_id,
         cp.gv_id,
         cp.set_code,
         s.name as set_name,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         cp.printed_identity_modifier,
         cp.variant_key,
         j.key as source,
         trim(both '"' from j.value::text) as external_id,
         jsonb_typeof(j.value) as value_type,
         coalesce(am.active_mapping_count, 0) as active_mapping_count
       from public.card_prints cp
       join public.sets s on s.id = cp.set_id
       left join active_mapping_counts am on am.card_print_id = cp.id
       cross join lateral jsonb_each(cp.external_ids) j
       where s.identity_domain_default like 'pokemon_eng%'
         and j.key = $1
         and cp.external_ids is not null
         and cp.external_ids <> '{}'::jsonb
     ),
     source_counts as (
       select source, external_id, count(*)::int as batch_source_external_duplicate_count
       from payload
       group by source, external_id
     )
     select
       payload.*,
       source_counts.batch_source_external_duplicate_count,
       (select count(*)::int
       from public.external_mappings em
        where em.card_print_id::text = payload.card_print_id
          and em.source = payload.source
          and em.external_id = payload.external_id
          and em.active = true) as target_source_already_mapped_count,
       (select count(*)::int
        from public.external_mappings em
        where em.source = payload.source
          and em.external_id = payload.external_id
          and em.active = true
          and em.card_print_id::text <> payload.card_print_id) as source_external_owner_count
     from payload
     join source_counts on source_counts.source = payload.source and source_counts.external_id = payload.external_id
     order by payload.set_code nulls last, payload.number_plain nulls last, payload.number nulls last, payload.card_name nulls last`,
    [SOURCE_KEY],
  );

  return result.rows.map((row) => ({
    ...row,
    classification: classify(row),
  }));
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for readiness audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const rows = await loadRows(client);
    const writeReadyRows = rows.filter((row) => row.classification === 'ready_for_external_mapping_insert');
    const report = {
      version: 'ENRICH25A_VERIFIED_MASTER_INDEX_MAPPING_READINESS_V1',
      generated_at: new Date().toISOString(),
      mode: 'audit_only_readiness',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      source_key: SOURCE_KEY,
      governance_decision: {
        status: 'not_write_ready',
        reason: 'verified_master_index_v1 is an internal reference/index provenance key, not an independent external source mapping authority. It should remain payload/provenance unless a distinct external namespace and ownership rule are created.',
        forbidden: [
          'do not insert verified_master_index_v1 as external_mappings without governance approval',
          'do not treat internal index IDs as external source ownership',
          'do not overwrite tcgdex/pokemonapi/marketplace source mappings',
          'do not create duplicate source/external owners',
        ],
      },
      summary: {
        candidate_rows: rows.length,
        write_ready_rows: writeReadyRows.length,
        by_classification: countBy(rows, (row) => row.classification),
        by_set_top_25: Object.fromEntries(Object.entries(countBy(rows, (row) => row.set_code)).slice(0, 25)),
      },
      rows,
      samples_by_classification: Object.fromEntries(
        Object.entries(countBy(rows, (row) => row.classification)).map(([classification]) => [
          classification,
          rows.filter((row) => row.classification === classification).slice(0, 20),
        ]),
      ),
    };
    report.fingerprint_sha256 = sha256(stableJson({
      source_key: report.source_key,
      governance_decision: report.governance_decision,
      summary: report.summary,
      rows: rows.map((row) => ({
        card_print_id: row.card_print_id,
        source: row.source,
        external_id: row.external_id,
        classification: row.classification,
      })),
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, [
      '# ENRICH-25A Verified Master Index Mapping Readiness V1',
      '',
      'Read-only readiness audit for `verified_master_index_v1` payload IDs.',
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
      `- Candidate rows: ${report.summary.candidate_rows}`,
      `- Write-ready rows: ${report.summary.write_ready_rows}`,
      `- Governance status: \`${report.governance_decision.status}\``,
      `- Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
      '## Governance Decision',
      '',
      report.governance_decision.reason,
      '',
      '## Classification Counts',
      '',
      table(Object.entries(report.summary.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Set Counts',
      '',
      table(Object.entries(report.summary.by_set_top_25).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Conclusion',
      '',
      '`verified_master_index_v1` should not be bulk inserted into `external_mappings` in this pass. It is internal provenance, not an independent external source namespace.',
      '',
    ].join('\n'));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      summary: report.summary,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
