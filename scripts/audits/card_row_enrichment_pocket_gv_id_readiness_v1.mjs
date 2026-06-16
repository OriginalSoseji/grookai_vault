import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

import {
  buildPocketCardPrintGvIdV1,
  buildPocketCardPrintingGvIdV1,
} from '../../backend/warehouse/buildPocketGvIdV1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'pocket_gv_id_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'pocket_gv_id_readiness_v1.md');

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

async function loadPocketRows(client) {
  const result = await client.query(`
    select
      cp.id::text as card_print_id,
      cp.name as card_name,
      cp.set_code,
      s.code as sets_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      coalesce(cp.external_ids->>'tcgdex', em.external_id) as tcgdex_external_id,
      cp.gv_id,
      cpr.id::text as card_printing_id,
      cpr.finish_key,
      cpr.printing_gv_id
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join lateral (
      select external_id
      from public.external_mappings
      where card_print_id = cp.id
        and source = 'tcgdex'
        and active is true
      order by external_id
      limit 1
    ) em on true
    join public.card_printings cpr on cpr.card_print_id = cp.id
    where coalesce(cp.identity_domain, s.identity_domain_default) = 'tcg_pocket_excluded'
    order by coalesce(cp.set_code, s.code), cp.number_plain, cp.number, cp.name, cpr.finish_key
  `);
  return result.rows;
}

async function loadExistingCollisions(client, parentRows, childRows) {
  const parentTargets = parentRows.map((row) => ({
    id: row.card_print_id,
    gv_id: row.proposed_gv_id,
  }));
  const childTargets = childRows.map((row) => ({
    id: row.card_printing_id,
    printing_gv_id: row.proposed_printing_gv_id,
  }));
  const [parentResult, childResult] = await Promise.all([
    client.query(
      `with targets as (
         select * from jsonb_to_recordset($1::jsonb)
         as x(id uuid, gv_id text)
       )
       select cp.gv_id, count(*)::int as rows
       from public.card_prints cp
       join targets t on t.gv_id = cp.gv_id
       where cp.id <> t.id
       group by cp.gv_id`,
      [JSON.stringify(parentTargets)],
    ),
    client.query(
      `with targets as (
         select * from jsonb_to_recordset($1::jsonb)
         as x(id uuid, printing_gv_id text)
       )
       select cpr.printing_gv_id, count(*)::int as rows
       from public.card_printings cpr
       join targets t on t.printing_gv_id = cpr.printing_gv_id
       where cpr.id <> t.id
       group by cpr.printing_gv_id`,
      [JSON.stringify(childTargets)],
    ),
  ]);
  return {
    parent: parentResult.rows,
    child: childResult.rows,
  };
}

function duplicateCount(rows, key) {
  const counts = countBy(rows, (row) => row[key]);
  return Object.entries(counts).filter(([, count]) => count > 1).length;
}

function duplicateGroups(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    const group = groups.get(value) ?? [];
    group.push(row);
    groups.set(value, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([value, group]) => ({ value, rows: group }))
    .sort((a, b) => b.rows.length - a.rows.length || a.value.localeCompare(b.value));
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const rows = await loadPocketRows(client);
    const parentById = new Map();
    const childRows = [];
    const blockedRows = [];
    for (const row of rows) {
      const setCode = row.set_code ?? row.sets_code;
      let proposedParentGvId = null;
      try {
        proposedParentGvId = buildPocketCardPrintGvIdV1({
        setCode,
        number: row.number,
        numberPlain: row.number_plain,
        externalId: row.tcgdex_external_id,
      });
      } catch (error) {
        if (!parentById.has(row.card_print_id)) {
          blockedRows.push({
            card_print_id: row.card_print_id,
            set_code: setCode,
            set_name: row.set_name,
          number: row.number,
          number_plain: row.number_plain,
          tcgdex_external_id: row.tcgdex_external_id,
          card_name: row.card_name,
          reason: error.message,
          });
          parentById.set(row.card_print_id, null);
        }
        continue;
      }
      if (!parentById.has(row.card_print_id)) {
        parentById.set(row.card_print_id, {
          card_print_id: row.card_print_id,
          set_code: setCode,
          set_name: row.set_name,
          number: row.number,
          number_plain: row.number_plain,
          tcgdex_external_id: row.tcgdex_external_id,
          card_name: row.card_name,
          current_gv_id: row.gv_id,
          proposed_gv_id: proposedParentGvId,
        });
      }
      childRows.push({
        card_printing_id: row.card_printing_id,
        card_print_id: row.card_print_id,
        set_code: setCode,
        number: row.number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        tcgdex_external_id: row.tcgdex_external_id,
        current_printing_gv_id: row.printing_gv_id,
        proposed_printing_gv_id: buildPocketCardPrintingGvIdV1({
          parentGvId: proposedParentGvId,
          finishKey: row.finish_key,
        }),
      });
    }
    const parentRows = [...parentById.values()]
      .filter(Boolean)
      .sort((a, b) => `${a.set_code}|${a.number}|${a.card_name}`.localeCompare(`${b.set_code}|${b.number}|${b.card_name}`));
    const parentDuplicateGroups = duplicateGroups(parentRows, 'proposed_gv_id');
    const childDuplicateGroups = duplicateGroups(childRows, 'proposed_printing_gv_id');
    const collisions = await loadExistingCollisions(client, parentRows, childRows);
    const ready = (
      blockedRows.length === 0 &&
      parentRows.every((row) => !row.current_gv_id) &&
      childRows.every((row) => !row.current_printing_gv_id) &&
      parentDuplicateGroups.length === 0 &&
      childDuplicateGroups.length === 0 &&
      collisions.parent.length === 0 &&
      collisions.child.length === 0
    );
    const complete = (
      blockedRows.length === 0 &&
      parentRows.every((row) => row.current_gv_id === row.proposed_gv_id) &&
      childRows.every((row) => row.current_printing_gv_id === row.proposed_printing_gv_id) &&
      parentDuplicateGroups.length === 0 &&
      childDuplicateGroups.length === 0 &&
      collisions.parent.length === 0 &&
      collisions.child.length === 0
    );

    const report = {
      version: 'POCKET_GV_ID_READINESS_V1',
      generated_at: new Date().toISOString(),
      contract: 'POCKET_GV_ID_NAMESPACE_CONTRACT_V1',
      scope: {
        target_domain: 'tcg_pocket_excluded',
        db_writes_performed: false,
        migrations_created: false,
        physical_rows_targeted: false,
      },
      totals: {
        pocket_parent_rows: parentRows.length,
        pocket_child_printing_rows: childRows.length,
        parent_rows_missing_gv_id: parentRows.filter((row) => !row.current_gv_id).length,
        child_rows_missing_printing_gv_id: childRows.filter((row) => !row.current_printing_gv_id).length,
        blocked_parent_rows: blockedRows.length,
        proposed_parent_duplicate_groups: parentDuplicateGroups.length,
        proposed_child_duplicate_groups: childDuplicateGroups.length,
        existing_parent_collision_groups: collisions.parent.length,
        existing_child_collision_groups: collisions.child.length,
      },
      ready_for_guarded_dry_run: ready,
      gv_id_backfill_complete: complete,
      by_set: countBy(parentRows, (row) => row.set_code),
      by_finish: countBy(childRows, (row) => row.finish_key),
      blockers_by_reason: countBy(blockedRows, (row) => row.reason),
      blocked_parent_rows: blockedRows,
      duplicate_parent_group_samples: parentDuplicateGroups.slice(0, 25),
      duplicate_child_group_samples: childDuplicateGroups.slice(0, 25),
      sample_parent_rows: parentRows.slice(0, 25),
      sample_child_rows: childRows.slice(0, 25),
    };
    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      by_set: report.by_set,
      by_finish: report.by_finish,
    }));

    await writeJson(OUTPUT_JSON, report);
    const md = [
      '# Pocket GV-ID Readiness V1',
      '',
      'Read-only readiness report for assigning separate `GV-TCGP-*` IDs to TCG Pocket rows.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Physical rows targeted: false',
      '- Contract: `POCKET_GV_ID_NAMESPACE_CONTRACT_V1`',
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([key, value]) => ({ key, value })), [
        { label: 'metric', value: (row) => row.key },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      `Ready for guarded dry-run: ${report.ready_for_guarded_dry_run}`,
      '',
      `GV-ID backfill complete: ${report.gv_id_backfill_complete}`,
      '',
      '## By Set',
      '',
      markdownTable(Object.entries(report.by_set).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set', value: (row) => row.set_code },
        { label: 'parents', value: (row) => row.rows },
      ]),
      '',
      '## By Finish',
      '',
      markdownTable(Object.entries(report.by_finish).map(([finish_key, rows]) => ({ finish_key, rows })), [
        { label: 'finish', value: (row) => row.finish_key },
        { label: 'children', value: (row) => row.rows },
      ]),
      '',
      '## Blocked Rows',
      '',
      markdownTable(blockedRows.slice(0, 50), [
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number ?? row.number_plain },
        { label: 'name', value: (row) => row.card_name },
        { label: 'reason', value: (row) => row.reason },
      ]),
      '',
      '## Duplicate Parent ID Samples',
      '',
      markdownTable(parentDuplicateGroups.slice(0, 25).flatMap((group) => group.rows.map((row) => ({
        proposed_gv_id: group.value,
        ...row,
      }))), [
        { label: 'proposed', value: (row) => row.proposed_gv_id },
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number ?? row.number_plain ?? row.tcgdex_external_id },
        { label: 'name', value: (row) => row.card_name },
        { label: 'current gv_id', value: (row) => row.current_gv_id },
      ]),
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
      ready_for_guarded_dry_run: report.ready_for_guarded_dry_run,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
