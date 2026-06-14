import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(process.cwd(), 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08e_existing_parent_child_printing_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08e_existing_parent_child_printing_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08E-EXISTING-PARENT-CHILD-PRINTING-INSERTS';
const CREATED_BY = 'pkg08e_existing_parent_child_printing_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

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

function liveNumbers(row) {
  return [...new Set([
    row.card_number,
    row.number,
    row.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
}

function nameCandidates(name) {
  const raw = String(name ?? '').trim();
  const strippedParenthetical = raw.replace(/\s+\([^)]*\)\s*$/, '').trim();
  return [...new Set([raw, strippedParenthetical].filter(Boolean))];
}

async function resolveTargets(client, sourceRows) {
  if (sourceRows.length === 0) return [];
  const aliases = [...new Set(sourceRows.flatMap((row) => [
    row.set_key,
    row.matched_parent_alias,
    ...(row.set_aliases_checked ?? []),
  ]).filter(Boolean).map((value) => String(value).toLowerCase()))];
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.number,
       cp.number_plain,
       cp.name as card_name
     from public.card_prints cp
     where lower(coalesce(cp.set_code, '')) = any($1::text[])
     order by cp.set_code, card_number, cp.name, cp.id`,
    [aliases],
  );
  const parents = result.rows;
  const targets = [];
  for (const row of sourceRows) {
    const matches = parents.filter((parent) => (
      row.set_aliases_checked.map(normalizeText).includes(normalizeText(parent.set_code)) &&
      liveNumbers(parent).includes(normalizeNumber(row.card_number)) &&
      nameCandidates(row.card_name).some((candidateName) => (
        normalizeText(parent.card_name) === normalizeText(candidateName)
      ))
    ));
    targets.push({
      ...row,
      resolution_status: matches.length === 1 ? 'resolved_exact_parent' : 'blocked_parent_resolution_not_unique',
      resolution_match_count: matches.length,
      card_print_id: matches[0]?.card_print_id ?? null,
      live_set_code: matches[0]?.set_code ?? null,
      live_card_number: matches[0]?.card_number ?? null,
      live_card_name: matches[0]?.card_name ?? null,
      card_printing_id: crypto.randomUUID(),
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${normalizeNumber(row.card_number)}:${row.finish_key}`,
      created_by: CREATED_BY,
    });
  }
  return targets;
}

async function captureTargetSnapshot(client, rows) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text,
         live_set_code text,
         card_number text,
         card_name text
       )
     ),
     distinct_parent as (
       select distinct card_print_id
       from target
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       null::text as target_card_printing_id
     from distinct_parent t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'existing_target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr
       on cpr.card_print_id = t.card_print_id
      and cpr.finish_key = t.finish_key
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'planned_id_collision' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       t.card_printing_id::text as target_card_printing_id
     from target t
     join public.card_printings cpr on cpr.id = t.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(rows)],
  );
  const snapshotRows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows: snapshotRows,
    hash_sha256: sha256(stableJson(snapshotRows)),
    counts: {
      target_parent_rows: snapshotRows.filter((row) => row.row_type === 'target_parent').length,
      existing_target_child_rows: snapshotRows.filter((row) => row.row_type === 'existing_target_child').length,
      planned_id_collision_rows: snapshotRows.filter((row) => row.row_type === 'planned_id_collision').length,
      total_rows: snapshotRows.length,
    },
  };
}

async function runDryRun(client, rows, packageFingerprint) {
  const beforeSnapshot = await captureTargetSnapshot(client, rows);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '90s'");
    await client.query(
      `create temporary table pkg08e_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08e_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.finish_key,
         row.provenance_source,
         row.provenance_ref,
         row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(rows)],
    );
    const shape = await client.query(
      `select
         count(*)::int as child_rows,
         count(distinct card_print_id)::int as parent_rows,
         count(*) filter (where finish_key not in (select key from public.finish_keys where is_active = true))::int as inactive_finish_rows
       from pkg08e_targets`,
    );
    if (shape.rows[0].child_rows !== rows.length || shape.rows[0].inactive_finish_rows !== 0) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shape.rows[0])}`);
    }
    const existing = await client.query(
      `select count(*)::int as existing_child_count
       from pkg08e_targets target
       join public.card_printings cpr
         on cpr.card_print_id = target.card_print_id
        and cpr.finish_key = target.finish_key`,
    );
    if (existing.rows[0].existing_child_count !== 0) {
      throw new Error(`existing child collision count: ${existing.rows[0].existing_child_count}`);
    }
    const insertResult = await client.query(
      `insert into public.card_printings (
         id,
         card_print_id,
         finish_key,
         is_provisional,
         provenance_source,
         provenance_ref,
         created_by
       )
       select
         card_printing_id,
         card_print_id,
         finish_key,
         false,
         provenance_source,
         provenance_ref,
         created_by
       from pkg08e_targets`,
    );
    if (insertResult.rowCount !== rows.length) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         count(*)::int as planned_child_rows,
         count(distinct card_print_id)::int as planned_parent_rows
       from pkg08e_targets`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureTargetSnapshot(client, rows);
    return {
      status: 'pkg08e_existing_parent_child_printing_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureTargetSnapshot(client, rows).catch(() => null);
    return {
      status: 'pkg08e_existing_parent_child_printing_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  const setRows = Object.entries(report.scope.by_set).map(([set, count]) => [set, count]);
  const finishRows = Object.entries(report.scope.by_finish).map(([finish, count]) => [finish, count]);
  return `# PKG-08E Existing-Parent Child Printing Guarded Dry Run V1

Rollback-only dry run for existing-parent child printing inserts. No durable write was authorized or performed.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- target_child_rows: ${report.scope.target_child_rows}
- target_parent_rows: ${report.scope.target_parent_rows}
- stop_findings: ${report.stop_findings.length}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Set

${markdownTable(['set_key', 'child_rows'], setRows)}

## By Finish

${markdownTable(['finish_key', 'child_rows'], finishRows)}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08E Existing-Parent Child Printing Guarded Dry Run Checkpoint V1](20260610_pkg08e_existing_parent_child_printing_guarded_dry_run_checkpoint_v1.md) | Records rollback-only dry run for existing-parent child printing inserts. No durable write or migration. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08e_existing_parent_child_printing_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08e_existing_parent_child_printing_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'existing_parent_missing_child');
const conn = connectionString();
let report;
if (!conn) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08e_existing_parent_child_printing_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    dry_run_status: 'blocked_no_database_connection_string',
    stop_findings: ['database_connection_unavailable'],
    durable_db_writes_performed: false,
    migrations_created: false,
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const resolvedRows = await resolveTargets(client, sourceRows);
    const targetRows = resolvedRows.filter((row) => row.resolution_status === 'resolved_exact_parent');
    const blockedRows = resolvedRows.filter((row) => row.resolution_status !== 'resolved_exact_parent');
    const packageFingerprint = sha256(stableJson(targetRows.map((row) => ({
      set_key: row.set_key,
      live_set_code: row.live_set_code,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      card_print_id: row.card_print_id,
    }))));
    const dryRun = targetRows.length > 0
      ? await runDryRun(client, targetRows, packageFingerprint)
      : {
          status: 'blocked_target_resolution_findings_present',
          error_message: 'No target rows.',
          before_snapshot: null,
          after_snapshot: null,
          rollback_proof_rows: [],
        };
    const stopFindings = [
      ...(dryRun.error_message ? [`dry_run_error:${dryRun.error_message}`] : []),
      ...(dryRun.status !== 'pkg08e_existing_parent_child_printing_completed_rolled_back_no_durable_change' ? ['dry_run_not_passed'] : []),
      ...(dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256 ? ['durable_after_snapshot_differs_from_before_snapshot'] : []),
      ...(dryRun.before_snapshot?.counts?.existing_target_child_rows !== 0 ? ['before_existing_target_child_rows_present'] : []),
      ...(dryRun.before_snapshot?.counts?.planned_id_collision_rows !== 0 ? ['before_planned_id_collision_rows_present'] : []),
    ];
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08e_existing_parent_child_printing_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      audit_only: false,
      rollback_only: true,
      dry_run_status: dryRun.status,
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_authorized: false,
      scope: {
        source_rows: sourceRows.length,
        target_child_rows: targetRows.length,
        target_parent_rows: new Set(targetRows.map((row) => row.card_print_id)).size,
        blocked_resolution_rows: blockedRows.length,
        blocked_resolution_rows_excluded_from_package: blockedRows.length,
        by_set: countBy(targetRows, (row) => row.set_key),
        by_live_set: countBy(targetRows, (row) => row.live_set_code),
        by_finish: countBy(targetRows, (row) => row.finish_key),
        rows: targetRows,
        blocked_rows: blockedRows,
      },
      before_snapshot: dryRun.before_snapshot,
      after_snapshot: dryRun.after_snapshot,
      rollback_proof_rows: dryRun.rollback_proof_rows,
      durable_after_snapshot_matches_before_snapshot:
        Boolean(dryRun.before_snapshot?.hash_sha256) && dryRun.before_snapshot?.hash_sha256 === dryRun.after_snapshot?.hash_sha256,
      stop_findings: stopFindings,
      next_step_if_clean:
        stopFindings.length === 0
          ? 'Prepare a no-write real-apply gate for exact operator approval. Do not apply without approval.'
          : 'Resolve stop findings before any real-apply gate.',
    };
  } finally {
    await client.end().catch(() => {});
  }
}

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  target_child_rows: report.scope?.target_child_rows ?? 0,
  target_parent_rows: report.scope?.target_parent_rows ?? 0,
  by_set: report.scope?.by_set ?? {},
  by_finish: report.scope?.by_finish ?? {},
  stop_findings: report.stop_findings,
  durable_db_writes_performed: report.durable_db_writes_performed,
  migrations_created: report.migrations_created,
}, null, 2));

if ((report.stop_findings ?? []).length !== 0) process.exitCode = 1;
