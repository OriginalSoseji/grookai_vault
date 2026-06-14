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
const APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15o_stamped_review_ready_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15o_post_apply_reconciliation_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15o_post_apply_reconciliation_v1.md');

const PACKAGE_ID = 'PKG-15O-STAMPED-REVIEW-READY-PARENT-INSERTS';

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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

async function reconcile(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         base_parent_id uuid
       )
     ),
     target_rows as (
       select
         target.*,
         cp.id::text as parent_id,
         cp.set_code as parent_set_code,
         cp.number as parent_number,
         cp.number_plain as parent_number_plain,
         cp.name as parent_name,
         cp.variant_key as parent_variant_key,
         cp.printed_identity_modifier as parent_printed_identity_modifier,
         cpr.id::text as child_id,
         cpr.finish_key as child_finish_key,
         cpr.created_by as child_created_by,
         cpi.id::text as identity_id,
         cpi.identity_key_hash as identity_key_hash,
         cpi.is_active as identity_is_active
       from target
       left join public.card_prints cp on cp.id = target.target_parent_id
       left join public.card_printings cpr on cpr.id = target.target_child_id
       left join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true
     )
     select
       *,
       case
         when parent_id is null then 'missing_parent'
         when child_id is null then 'missing_child'
         when identity_id is null then 'missing_identity'
         when coalesce(parent_variant_key, '') <> target_variant_key then 'parent_variant_mismatch'
         when child_finish_key <> target_finish_key then 'child_finish_mismatch'
         when child_finish_key = 'stamped' then 'forbidden_stamped_child_finish'
         else 'verified_after_apply'
       end as reconciliation_status
     from target_rows
     order by set_key, card_number, card_name, target_variant_key`,
    [JSON.stringify(targets)],
  );

  const collision = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_variant_key text,
         base_parent_id uuid
       )
     )
     select
       count(*)::int as duplicate_identity_hash_rows
     from public.card_print_identity cpi
     join public.card_print_identity cpi2
       on cpi2.id <> cpi.id
      and cpi2.is_active = true
      and cpi2.identity_domain = cpi.identity_domain
      and cpi2.identity_key_version = cpi.identity_key_version
      and cpi2.identity_key_hash = cpi.identity_key_hash
     join target on target.target_parent_id = cpi.card_print_id
     where cpi.is_active = true`,
    [JSON.stringify(targets)],
  );

  return {
    rows: result.rows,
    duplicate_identity_hash_rows: Number(collision.rows[0]?.duplicate_identity_hash_rows ?? 0),
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_reconciliation_status).map(([status, count]) => [status, count]);
  const targetRows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_variant_key,
    row.target_finish_key,
    row.parent_id ?? '',
    row.child_id ?? '',
    row.identity_id ?? '',
    row.reconciliation_status,
  ]);

  return `# PKG-15O Post-Apply Reconciliation V1

Read-only post-apply verification for PKG-15O stamped parent identities and reverse child printings.

## Safety

- audit_only: ${report.audit_only}
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- targets: ${report.summary.targets}
- verified_after_apply: ${report.summary.verified_after_apply}
- stop_findings: ${report.stop_findings.length}
- duplicate_identity_hash_rows: ${report.summary.duplicate_identity_hash_rows}
- forbidden_stamped_child_finishes: ${report.summary.forbidden_stamped_child_finishes}
- reconciliation_fingerprint_sha256: \`${report.reconciliation_fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Rows

${markdownTable(['set', 'number', 'name', 'variant', 'finish', 'parent_id', 'child_id', 'identity_id', 'status'], targetRows)}
`;
}

async function main() {
  const apply = await readJson(APPLY_JSON);
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required for post-apply reconciliation.');
  const targets = apply.scope?.targets ?? [];
  const client = new Client({ connectionString: conn });
  await client.connect();
  let reconciliation;
  try {
    await client.query('begin read only');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    reconciliation = await reconcile(client, targets);
    await client.query('rollback');
  } finally {
    await client.end().catch(() => {});
  }

  const stopFindings = [];
  if (apply.package_id !== PACKAGE_ID) stopFindings.push('apply_package_id_mismatch');
  if (apply.execution?.apply_status !== 'pkg15o_real_apply_committed') stopFindings.push('apply_status_not_committed');
  if (targets.length !== 5) stopFindings.push(`unexpected_target_count:${targets.length}`);
  if (reconciliation.rows.some((row) => row.reconciliation_status !== 'verified_after_apply')) stopFindings.push('target_row_not_verified_after_apply');
  if (reconciliation.duplicate_identity_hash_rows !== 0) stopFindings.push('duplicate_identity_hash_rows_present');

  const reportBase = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15o_post_apply_reconciliation_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_reads_performed: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_artifact: path.relative(ROOT, APPLY_JSON).replaceAll('\\', '/'),
    applied_package_fingerprint_sha256: apply.package_fingerprint_sha256,
    applied_dry_run_proof_sha256: apply.dry_run_proof_sha256,
    applied_verification_hash_sha256: apply.execution?.verification_hash_sha256 ?? null,
    summary: {
      targets: targets.length,
      verified_after_apply: reconciliation.rows.filter((row) => row.reconciliation_status === 'verified_after_apply').length,
      duplicate_identity_hash_rows: reconciliation.duplicate_identity_hash_rows,
      forbidden_stamped_child_finishes: reconciliation.rows.filter((row) => row.child_finish_key === 'stamped').length,
      by_reconciliation_status: countBy(reconciliation.rows, (row) => row.reconciliation_status),
      by_set: countBy(reconciliation.rows, (row) => row.set_key),
    },
    rows: reconciliation.rows,
    stop_findings: stopFindings,
  };
  const report = {
    ...reportBase,
    reconciliation_fingerprint_sha256: sha256(stableJson({
      package_id: PACKAGE_ID,
      rows: reconciliation.rows.map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        target_variant_key: row.target_variant_key,
        target_finish_key: row.target_finish_key,
        parent_id: row.parent_id,
        child_id: row.child_id,
        identity_id: row.identity_id,
        reconciliation_status: row.reconciliation_status,
      })),
      duplicate_identity_hash_rows: reconciliation.duplicate_identity_hash_rows,
    })),
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    verified_after_apply: report.summary.verified_after_apply,
    duplicate_identity_hash_rows: report.summary.duplicate_identity_hash_rows,
    forbidden_stamped_child_finishes: report.summary.forbidden_stamped_child_finishes,
    stop_findings: report.stop_findings,
    reconciliation_fingerprint_sha256: report.reconciliation_fingerprint_sha256,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
