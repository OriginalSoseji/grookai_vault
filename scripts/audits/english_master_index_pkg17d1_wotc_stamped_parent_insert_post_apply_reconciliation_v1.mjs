import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17d1_wotc_stamped_parent_insert_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17d1_wotc_stamped_parent_insert_post_apply_reconciliation_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17d1_wotc_stamped_parent_insert_post_apply_reconciliation_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

async function readLiveRows(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         target_printed_identity_modifier text
       )
     )
     select
       target.set_key,
       target.card_number,
       target.card_name,
       target.target_variant_key,
       target.target_printed_identity_modifier,
       target.target_finish_key,
       target.target_parent_id::text,
       target.target_child_id::text,
       cp.id is not null as parent_exists,
       cp.variant_key as actual_variant_key,
       cp.printed_identity_modifier as actual_printed_identity_modifier,
       cpr.id is not null as child_exists,
       cpr.finish_key as actual_finish_key,
       cpi.id is not null as active_identity_exists,
       cpi.identity_key_hash,
       coalesce(forbidden.forbidden_stamped_child_count, 0)::int as forbidden_stamped_child_count
     from target
     left join public.card_prints cp on cp.id = target.target_parent_id
     left join public.card_printings cpr on cpr.id = target.target_child_id and cpr.card_print_id = target.target_parent_id
     left join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true
     left join lateral (
       select count(*)::int as forbidden_stamped_child_count
       from public.card_printings child
       where child.card_print_id = target.target_parent_id
         and child.finish_key = 'stamped'
     ) forbidden on true
     order by target.set_key, target.card_number, target.card_name, target.target_variant_key`,
    [JSON.stringify(targets)],
  );
  return result.rows.map((row) => {
    const closed = row.parent_exists
      && row.child_exists
      && row.active_identity_exists
      && row.actual_variant_key === row.target_variant_key
      && row.actual_printed_identity_modifier === row.target_printed_identity_modifier
      && row.actual_finish_key === row.target_finish_key
      && row.forbidden_stamped_child_count === 0;
    return {
      ...row,
      reconciliation_status: closed ? 'verified_applied' : 'not_verified',
      blockers: [
        row.parent_exists ? null : 'target_parent_missing',
        row.child_exists ? null : 'target_child_missing',
        row.active_identity_exists ? null : 'active_identity_missing',
        row.actual_variant_key === row.target_variant_key ? null : 'variant_mismatch',
        row.actual_printed_identity_modifier === row.target_printed_identity_modifier ? null : 'printed_identity_modifier_mismatch',
        row.actual_finish_key === row.target_finish_key ? null : 'finish_mismatch',
        row.forbidden_stamped_child_count === 0 ? null : 'forbidden_stamped_child_present',
      ].filter(Boolean),
    };
  });
}

function buildMarkdown(report) {
  return `# PKG-17D1 WOTC Stamped Parent Insert Post-Apply Reconciliation V1

Read-only post-apply verification for PKG-17D1.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['verified_applied_rows', report.summary.verified_applied_rows],
    ['not_verified_rows', report.summary.not_verified_rows],
    ['forbidden_stamped_child_rows', report.summary.forbidden_stamped_child_rows],
    ['db_writes_performed', report.db_writes_performed],
    ['migrations_created', report.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'modifier', 'finish', 'status', 'blockers'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.target_variant_key,
      row.target_printed_identity_modifier,
      row.target_finish_key,
      row.reconciliation_status,
      row.blockers.join(', ') || 'none',
    ]),
  )}
`;
}

async function main() {
  const apply = await readJson(APPLY_JSON);
  const conn = connectionString();
  if (!conn) throw new Error('missing_database_connection');
  const client = new Client({ connectionString: conn });
  await client.connect();
  let rows;
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    rows = await readLiveRows(client, apply.scope.targets);
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17d1_wotc_stamped_parent_insert_post_apply_reconciliation_v1',
    package_id: apply.package_id,
    package_fingerprint_sha256: apply.package_fingerprint_sha256,
    source_artifact: path.relative(ROOT, APPLY_JSON).replaceAll('\\', '/'),
    audit_only: true,
    db_reads_performed: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    fingerprint_sha256: sha256(stableJson(rows)),
    summary: {
      target_rows: rows.length,
      verified_applied_rows: rows.filter((row) => row.reconciliation_status === 'verified_applied').length,
      not_verified_rows: rows.filter((row) => row.reconciliation_status !== 'verified_applied').length,
      forbidden_stamped_child_rows: rows.reduce((sum, row) => sum + Number(row.forbidden_stamped_child_count ?? 0), 0),
      by_status: countBy(rows, (row) => row.reconciliation_status),
      by_finish: countBy(rows, (row) => row.target_finish_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
  };

  if (report.summary.not_verified_rows !== 0 || report.summary.forbidden_stamped_child_rows !== 0) {
    throw new Error(`post-apply reconciliation failed: ${JSON.stringify(report.summary)}`);
  }

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
