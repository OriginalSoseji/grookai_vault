import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'external_mapping_duplicate_triage_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'external_mapping_duplicate_triage_v1.md');

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

function classifyGroup(row) {
  if (row.identity_domain === 'tcg_pocket_excluded') {
    return 'pocket_domain_review';
  }
  if (row.source === 'tcgdex' && row.external_id_count > 1) {
    return 'tcgdex_multiple_ids_same_card_review';
  }
  if (row.source === 'pokemonapi' && row.external_id_count > 1) {
    return 'pokemonapi_multiple_ids_same_card_review';
  }
  if (row.source === 'tcgplayer' && row.external_id_count > 1) {
    return 'tcgplayer_product_alias_review';
  }
  if (row.source === 'pricecharting' && row.external_id_count > 1) {
    return 'pricecharting_product_alias_review';
  }
  return 'source_specific_alias_review';
}

async function loadDuplicateGroups(client) {
  const result = await client.query(`
    with duplicate_groups as (
      select
        em.source,
        em.card_print_id,
        count(*)::int as active_mapping_count,
        count(distinct em.external_id)::int as external_id_count,
        array_agg(em.external_id order by em.external_id) as external_ids,
        array_agg(em.id::text order by em.external_id) as mapping_ids
      from public.external_mappings em
      where em.active = true
      group by em.source, em.card_print_id
      having count(*) > 1
    )
    select
      dg.source,
      dg.card_print_id::text,
      cp.name as card_name,
      cp.number,
      cp.number_plain,
      coalesce(cp.set_code, s.code) as set_code,
      s.name as set_name,
      coalesce(cp.identity_domain, s.identity_domain_default) as identity_domain,
      cp.gv_id,
      dg.active_mapping_count,
      dg.external_id_count,
      dg.external_ids,
      dg.mapping_ids,
      count(cpr.id)::int as child_printing_count
    from duplicate_groups dg
    join public.card_prints cp on cp.id = dg.card_print_id
    join public.sets s on s.id = cp.set_id
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    group by
      dg.source,
      dg.card_print_id,
      cp.name,
      cp.number,
      cp.number_plain,
      coalesce(cp.set_code, s.code),
      s.name,
      coalesce(cp.identity_domain, s.identity_domain_default),
      cp.gv_id,
      dg.active_mapping_count,
      dg.external_id_count,
      dg.external_ids,
      dg.mapping_ids
    order by dg.source, coalesce(cp.set_code, s.code), cp.number_plain, cp.number, cp.name
  `);
  return result.rows.map((row) => ({
    ...row,
    classification: classifyGroup(row),
  }));
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const groups = await loadDuplicateGroups(client);
    const report = {
      version: 'EXTERNAL_MAPPING_DUPLICATE_TRIAGE_V1',
      generated_at: new Date().toISOString(),
      scope: {
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
      },
      invariant: 'active external_mappings grouped by source and card_print_id must not have more than one row unless source-specific alias governance allows it',
      totals: {
        duplicate_source_card_groups: groups.length,
        duplicate_mapping_rows_in_groups: groups.reduce((sum, row) => sum + row.active_mapping_count, 0),
        english_physical_groups: groups.filter((row) => row.identity_domain === 'pokemon_eng_standard').length,
        pocket_groups: groups.filter((row) => row.identity_domain === 'tcg_pocket_excluded').length,
      },
      by_source: countBy(groups, (row) => row.source),
      by_domain: countBy(groups, (row) => row.identity_domain),
      by_classification: countBy(groups, (row) => row.classification),
      by_set_top_50: Object.fromEntries(Object.entries(countBy(groups, (row) => row.set_code)).slice(0, 50)),
      groups,
      recommended_next_step: 'source_specific_readiness_rules_before_any_external_mapping_deactivation',
    };
    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      by_source: report.by_source,
      by_domain: report.by_domain,
      by_classification: report.by_classification,
    }));

    await writeJson(OUTPUT_JSON, report);
    const md = [
      '# External Mapping Duplicate Triage V1',
      '',
      'Read-only triage for the preflight `external_mappings_source_card_duplicates` deferred debt.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Cleanup performed: false',
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([key, value]) => ({ key, value })), [
        { label: 'metric', value: (row) => row.key },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## By Source',
      '',
      markdownTable(Object.entries(report.by_source).map(([source, groups]) => ({ source, groups })), [
        { label: 'source', value: (row) => row.source },
        { label: 'groups', value: (row) => row.groups },
      ]),
      '',
      '## By Classification',
      '',
      markdownTable(Object.entries(report.by_classification).map(([classification, groups]) => ({ classification, groups })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'groups', value: (row) => row.groups },
      ]),
      '',
      '## Sample Groups',
      '',
      markdownTable(groups.slice(0, 50), [
        { label: 'source', value: (row) => row.source },
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number ?? row.number_plain },
        { label: 'name', value: (row) => row.card_name },
        { label: 'domain', value: (row) => row.identity_domain },
        { label: 'count', value: (row) => row.active_mapping_count },
        { label: 'classification', value: (row) => row.classification },
      ]),
      '',
      `Recommended next step: \`${report.recommended_next_step}\``,
      '',
      `Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
    ].join('\n');
    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      by_source: report.by_source,
      by_classification: report.by_classification,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
