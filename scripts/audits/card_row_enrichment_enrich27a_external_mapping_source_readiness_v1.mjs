import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich27a_external_mapping_source_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich27a_external_mapping_source_readiness_v1.md');

const DIRECT_MAPPING_SOURCE_KEYS = new Set([
  'tcgdex',
  'pokemonapi',
  'pokemontcg',
  'pokemontcg_io',
  'pokemon_tcg_api',
  'tcgplayer',
  'tcgcsv',
  'pricecharting',
  'cardtrader',
  'justtcg',
]);

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
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function normalizeSource(source) {
  const raw = String(source ?? '').trim().toLowerCase();
  if (raw === 'pokemon_tcg' || raw === 'pokemontcgapi') return 'pokemonapi';
  if (raw === 'pokemon_tcg_io' || raw === 'pokemontcg.io') return 'pokemontcg';
  return raw;
}

function extractScalarExternalId(row) {
  const valueType = row.value_type;
  if (valueType === 'string') {
    const value = String(row.external_id_text ?? '').trim();
    return value.length ? value : null;
  }
  if (valueType === 'number') {
    const value = String(row.external_id_json ?? '').trim();
    return value.length ? value : null;
  }
  return null;
}

function classify(row) {
  const source = normalizeSource(row.source);
  const externalId = extractScalarExternalId(row);
  const collisionCount = Number(row.source_external_collision_count ?? 0);
  const sourceAlreadyMappedCount = Number(row.target_source_mapping_count ?? 0);
  const batchDuplicateCount = Number(row.batch_source_external_count ?? 0);

  if (!DIRECT_MAPPING_SOURCE_KEYS.has(source)) {
    return {
      classification: 'blocked_unknown_or_non_direct_source_key',
      write_ready: false,
      source,
      external_id: externalId,
      reason: 'Source key is not governed as direct external_mappings authority.',
    };
  }

  if (!externalId) {
    return {
      classification: 'blocked_non_scalar_or_blank_payload',
      write_ready: false,
      source,
      external_id: null,
      reason: 'Payload value is not a scalar external ID.',
    };
  }

  if (sourceAlreadyMappedCount > 0) {
    return {
      classification: 'blocked_target_source_already_mapped',
      write_ready: false,
      source,
      external_id: externalId,
      reason: 'Target already has an active mapping for this source.',
    };
  }

  if (collisionCount > 0) {
    return {
      classification: 'blocked_existing_source_external_collision',
      write_ready: false,
      source,
      external_id: externalId,
      reason: 'The same source/external_id already belongs to another active owner.',
    };
  }

  if (batchDuplicateCount > 1) {
    return {
      classification: 'blocked_batch_source_external_duplicate',
      write_ready: false,
      source,
      external_id: externalId,
      reason: 'More than one candidate claims the same source/external_id in this batch.',
    };
  }

  return {
    classification: 'ready_for_source_specific_external_mapping_dry_run',
    write_ready: true,
    source,
    external_id: externalId,
    reason: 'Governed direct source key, scalar external ID, no active collision, no batch duplicate.',
  };
}

async function loadPayloadRows(client) {
  const result = await client.query(`
    with active_mapping_counts as (
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
        jsonb_typeof(j.value) as value_type,
        case when jsonb_typeof(j.value) = 'string' then trim(both '"' from j.value::text) else null end as external_id_text,
        j.value::text as external_id_json
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      left join active_mapping_counts am on am.card_print_id = cp.id
      cross join lateral jsonb_each(cp.external_ids) j
      where s.identity_domain_default like 'pokemon_eng%'
        and coalesce(am.active_mapping_count, 0) = 0
        and cp.external_ids is not null
        and cp.external_ids <> '{}'::jsonb
    ),
    normalized as (
      select
        payload.*,
        case
          when lower(payload.source) in ('pokemon_tcg', 'pokemontcgapi') then 'pokemonapi'
          when lower(payload.source) in ('pokemon_tcg_io', 'pokemontcg.io') then 'pokemontcg'
          else lower(payload.source)
        end as normalized_source,
        case
          when payload.value_type = 'string' then nullif(btrim(payload.external_id_text), '')
          when payload.value_type = 'number' then nullif(btrim(payload.external_id_json), '')
          else null
        end as scalar_external_id
      from payload
    )
    select
      normalized.*,
      (
        select count(*)::int
        from public.external_mappings em
        where em.card_print_id = normalized.card_print_id::uuid
          and em.source = normalized.normalized_source
          and em.active = true
      ) as target_source_mapping_count,
      (
        select count(*)::int
        from public.external_mappings em
        where em.source = normalized.normalized_source
          and em.external_id = normalized.scalar_external_id
          and em.active = true
      ) as source_external_collision_count,
      count(*) over (partition by normalized.normalized_source, normalized.scalar_external_id)::int as batch_source_external_count
    from normalized
    order by normalized.normalized_source, normalized.set_code nulls last, normalized.number_plain nulls last, normalized.number nulls last, normalized.card_name nulls last
  `);
  return result.rows;
}

function sampleRow(row) {
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    card_name: row.card_name,
    printed_identity_modifier: row.printed_identity_modifier,
    variant_key: row.variant_key,
    source: row.source,
    normalized_source: row.normalized_source,
    value_type: row.value_type,
    external_id: row.external_id,
    classification: row.classification,
    reason: row.reason,
    source_external_collision_count: Number(row.source_external_collision_count ?? 0),
    batch_source_external_count: Number(row.batch_source_external_count ?? 0),
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('set default_transaction_read_only = on');
    const payloadRows = await loadPayloadRows(client);
    const classifiedRows = payloadRows.map((row) => {
      const result = classify(row);
      return {
        ...row,
        ...result,
      };
    });

    const readyRows = classifiedRows.filter((row) => row.write_ready);
    const blockedRows = classifiedRows.filter((row) => !row.write_ready);

    const report = {
      version: 'ENRICH27A_EXTERNAL_MAPPING_SOURCE_READINESS_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      scope: {
        target: 'English physical card_print rows with external_ids payload and no active external mapping',
        purpose: 'Classify source payloads before designing any external_mappings insert package.',
        governed_direct_source_keys: [...DIRECT_MAPPING_SOURCE_KEYS].sort(),
        forbidden: ['DB writes', 'external_mappings inserts', 'external_mappings transfers', 'parent writes', 'child writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      totals: {
        payload_source_mentions: classifiedRows.length,
        distinct_parent_rows: new Set(classifiedRows.map((row) => row.card_print_id)).size,
        write_ready_source_mentions: readyRows.length,
        write_ready_parent_rows: new Set(readyRows.map((row) => row.card_print_id)).size,
        blocked_source_mentions: blockedRows.length,
      },
      by_classification: countBy(classifiedRows, (row) => row.classification),
      by_source: countBy(classifiedRows, (row) => row.normalized_source),
      by_value_type: countBy(classifiedRows, (row) => row.value_type),
      ready_by_source: countBy(readyRows, (row) => row.normalized_source),
      blocked_by_source: countBy(blockedRows, (row) => row.normalized_source),
      ready_samples: readyRows.slice(0, 100).map(sampleRow),
      blocked_samples: blockedRows.slice(0, 100).map(sampleRow),
      next_recommended_package: readyRows.length > 0
        ? {
            package_id: 'ENRICH-27B-EXTERNAL-MAPPING-SCALAR-PAYLOAD-INSERTS',
            status: 'ready_for_guarded_dry_run_preparation',
            candidate_source_mentions: readyRows.length,
            candidate_parent_rows: new Set(readyRows.map((row) => row.card_print_id)).size,
            writes_if_later_approved: ['external_mappings inserts only'],
            forbidden: ['parent writes', 'child writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
            required_guard: 'Re-run collision checks inside rollback transaction before any real apply.',
          }
        : {
            package_id: 'ENRICH-27B-EXTERNAL-MAPPING-SCALAR-PAYLOAD-INSERTS',
            status: 'no_ready_rows',
            candidate_source_mentions: 0,
          },
    };

    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      by_classification: report.by_classification,
      ready_by_source: report.ready_by_source,
    }));

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-27A External Mapping Source Readiness V1',
      '',
      '## Result',
      '',
      `- Audit only: ${report.audit_only}`,
      `- DB writes performed: ${report.db_writes_performed}`,
      `- Migrations created: ${report.migrations_created}`,
      `- Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([metric, rows]) => ({ metric, rows })), [
        { label: 'metric', value: (row) => row.metric },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Classification',
      '',
      markdownTable(Object.entries(report.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Ready By Source',
      '',
      markdownTable(Object.entries(report.ready_by_source).map(([source, rows]) => ({ source, rows })), [
        { label: 'source', value: (row) => row.source },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Next Recommended Package',
      '',
      `- Package: \`${report.next_recommended_package.package_id}\``,
      `- Status: ${report.next_recommended_package.status}`,
      `- Candidate source mentions: ${report.next_recommended_package.candidate_source_mentions}`,
      '',
      'No write was performed. Any insert package must run a rollback dry-run and preserve source/external-id uniqueness.',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      by_classification: report.by_classification,
      next_recommended_package: report.next_recommended_package,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
