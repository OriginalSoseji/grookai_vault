import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

import { buildPocketCardPrintGvIdV1 } from '../../backend/warehouse/buildPocketGvIdV1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'pocket_gv_id_duplicate_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'pocket_gv_id_duplicate_governance_v1.md');

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function loadPocketParents(client) {
  const result = await client.query(`
    select
      cp.id::text as card_print_id,
      cp.name as card_name,
      coalesce(cp.set_code, s.code) as set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.rarity,
      cp.variant_key,
      coalesce(cp.external_ids->>'tcgdex', em.external_id) as tcgdex_external_id,
      count(distinct cpr.id)::int as child_count,
      count(distinct em_all.id)::int as external_mapping_count,
      count(distinct epm.id)::int as child_external_mapping_count
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    join public.card_printings cpr on cpr.card_print_id = cp.id
    left join lateral (
      select external_id
      from public.external_mappings
      where card_print_id = cp.id
        and source = 'tcgdex'
        and active is true
      order by external_id
      limit 1
    ) em on true
    left join public.external_mappings em_all on em_all.card_print_id = cp.id and em_all.active is true
    left join public.external_printing_mappings epm on epm.card_printing_id = cpr.id and epm.active is true
    where coalesce(cp.identity_domain, s.identity_domain_default) = 'tcg_pocket_excluded'
    group by cp.id, cp.name, coalesce(cp.set_code, s.code), s.name, cp.number, cp.number_plain, cp.rarity, cp.variant_key, coalesce(cp.external_ids->>'tcgdex', em.external_id)
  `);
  return result.rows.map((row) => ({
    ...row,
    proposed_gv_id: buildPocketCardPrintGvIdV1({
      setCode: row.set_code,
      number: row.number,
      numberPlain: row.number_plain,
      externalId: row.tcgdex_external_id,
    }),
  }));
}

function classifyGroup(rows) {
  const numberedRows = rows.filter((row) => row.number || row.number_plain);
  const sourceOnlyRows = rows.filter((row) => !row.number && !row.number_plain && row.tcgdex_external_id);
  const sameName = new Set(rows.map((row) => row.card_name)).size === 1;
  const sameSet = new Set(rows.map((row) => row.set_code)).size === 1;
  const sameRarity = new Set(rows.map((row) => row.rarity ?? '')).size === 1;

  if (
    rows.length === 2
    && numberedRows.length === 1
    && sourceOnlyRows.length === 1
    && sameName
    && sameSet
    && sameRarity
  ) {
    return {
      classification: 'source_alias_duplicate_owner_transfer_candidate',
      recommended_owner_card_print_id: numberedRows[0].card_print_id,
      recommended_duplicate_card_print_id: sourceOnlyRows[0].card_print_id,
      reason: 'Numbered Pocket owner and source-only TCGdex duplicate produce the same GV-TCGP ID.',
    };
  }

  return {
    classification: 'manual_review_required',
    recommended_owner_card_print_id: null,
    recommended_duplicate_card_print_id: null,
    reason: 'Duplicate group does not match the deterministic source-alias duplicate pattern.',
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const parents = await loadPocketParents(client);
    const groupsByGvId = new Map();
    for (const row of parents) {
      const group = groupsByGvId.get(row.proposed_gv_id) ?? [];
      group.push(row);
      groupsByGvId.set(row.proposed_gv_id, group);
    }

    const duplicateGroups = [...groupsByGvId.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([proposed_gv_id, rows]) => ({
        proposed_gv_id,
        ...classifyGroup(rows),
        rows,
      }))
      .sort((a, b) => a.classification.localeCompare(b.classification) || a.proposed_gv_id.localeCompare(b.proposed_gv_id));

    const report = {
      version: 'POCKET_GV_ID_DUPLICATE_GOVERNANCE_V1',
      generated_at: new Date().toISOString(),
      scope: {
        target_domain: 'tcg_pocket_excluded',
        db_writes_performed: false,
        migrations_created: false,
        physical_rows_targeted: false,
      },
      totals: {
        pocket_parent_rows: parents.length,
        duplicate_parent_groups: duplicateGroups.length,
        duplicate_parent_rows: duplicateGroups.reduce((sum, group) => sum + group.rows.length, 0),
        deterministic_owner_transfer_candidate_groups: duplicateGroups.filter((group) => group.classification === 'source_alias_duplicate_owner_transfer_candidate').length,
        manual_review_groups: duplicateGroups.filter((group) => group.classification === 'manual_review_required').length,
      },
      classification_counts: countBy(duplicateGroups, (group) => group.classification),
      duplicate_group_samples: duplicateGroups.slice(0, 50),
      recommended_next_step: duplicateGroups.every((group) => group.classification === 'source_alias_duplicate_owner_transfer_candidate')
        ? 'prepare_guarded_dry_run_for_pocket_source_alias_duplicate_owner_transfer'
        : 'manual_review_before_any_pocket_gv_id_backfill',
    };
    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      classification_counts: report.classification_counts,
    }));

    await writeJson(OUTPUT_JSON, report);
    const sampleRows = duplicateGroups.slice(0, 25).flatMap((group) => group.rows.map((row) => ({
      proposed_gv_id: group.proposed_gv_id,
      classification: group.classification,
      recommended_owner_card_print_id: group.recommended_owner_card_print_id,
      ...row,
    })));
    const md = [
      '# Pocket GV-ID Duplicate Governance V1',
      '',
      'Read-only governance report for Pocket parent rows that would collide under the `GV-TCGP-*` namespace.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Physical rows targeted: false',
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([key, value]) => ({ key, value })), [
        { label: 'metric', value: (row) => row.key },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Classification Counts',
      '',
      markdownTable(Object.entries(report.classification_counts).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'groups', value: (row) => row.rows },
      ]),
      '',
      '## Sample Groups',
      '',
      markdownTable(sampleRows, [
        { label: 'proposed', value: (row) => row.proposed_gv_id },
        { label: 'classification', value: (row) => row.classification },
        { label: 'set', value: (row) => row.set_code },
        { label: 'number/source', value: (row) => row.number ?? row.number_plain ?? row.tcgdex_external_id },
        { label: 'name', value: (row) => row.card_name },
        { label: 'owner?', value: (row) => row.card_print_id === row.recommended_owner_card_print_id ? 'yes' : '' },
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
      recommended_next_step: report.recommended_next_step,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
