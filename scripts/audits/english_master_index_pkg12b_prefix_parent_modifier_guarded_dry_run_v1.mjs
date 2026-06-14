import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12_parent_identity_mismatch_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12b_prefix_parent_modifier_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12b_prefix_parent_modifier_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12b_prefix_parent_modifier_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12B-PREFIX-PARENT-MODIFIER-BACKFILL';
const EXPECTED_TARGET_ROWS = 8;
const EXPECTED_BY_PREFIX = { RC: 5, SL: 3 };

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

function buildTargets(source) {
  const byId = new Map();
  for (const row of source.rows ?? []) {
    if (row.strategy_status !== 'prefix_collision_true_parent_insert_candidate') continue;
    for (const candidate of row.live_same_number_candidates ?? []) {
      const number = String(candidate.number ?? '').trim().toUpperCase();
      const match = number.match(/^([A-Z]+)(\d+[A-Z]?)$/);
      if (!match) continue;
      if (candidate.printed_identity_modifier) continue;
      if (!byId.has(candidate.card_print_id)) {
        byId.set(candidate.card_print_id, {
          card_print_id: candidate.card_print_id,
          set_key: candidate.set_code,
          card_number: candidate.number,
          expected_number_plain: candidate.number_plain,
          card_name: candidate.name,
          prefix: match[1],
          target_printed_identity_modifier: `number_prefix:${match[1]}`,
          protected_for_master_rows: [],
        });
      }
      byId.get(candidate.card_print_id).protected_for_master_rows.push({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
      });
    }
  }
  return [...byId.values()].sort((left, right) => (
    String(left.set_key).localeCompare(String(right.set_key))
    || String(left.prefix).localeCompare(String(right.prefix))
    || String(left.card_number).localeCompare(String(right.card_number))
    || String(left.card_name).localeCompare(String(right.card_name))
  ));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         target_printed_identity_modifier text
       )
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cp.variant_key,
       cpr.finish_key
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      parent_rows: rows.filter((row) => row.row_type === 'parent').length,
      child_rows: rows.filter((row) => row.row_type === 'child').length,
      total_rows: rows.length,
    },
  };
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg12b_targets (
         card_print_id uuid primary key,
         set_key text not null,
         card_number text not null,
         expected_number_plain text not null,
         card_name text not null,
         prefix text not null,
         target_printed_identity_modifier text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg12b_targets
       select
         row.card_print_id::uuid,
         row.set_key,
         row.card_number,
         row.expected_number_plain,
         row.card_name,
         row.prefix,
         row.target_printed_identity_modifier
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_key text,
         card_number text,
         expected_number_plain text,
         card_name text,
         prefix text,
         target_printed_identity_modifier text
       )`,
      [JSON.stringify(targets)],
    );
    const shape = await client.query(
      `select
         count(*)::int as target_rows,
         count(*) filter (where prefix not in ('RC', 'SL'))::int as unsupported_prefix_rows,
         count(*) filter (where target_printed_identity_modifier <> concat('number_prefix:', prefix))::int as modifier_mismatch_rows
       from pkg12b_targets`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.target_rows !== EXPECTED_TARGET_ROWS ||
      shapeRow.unsupported_prefix_rows !== 0 ||
      shapeRow.modifier_mismatch_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    const collision = await client.query(
      `select
         (select count(*)::int
          from pkg12b_targets t
          join public.card_prints cp on cp.id = t.card_print_id
          where coalesce(cp.printed_identity_modifier, '') <> '') as already_modified_rows,
         (select count(*)::int
          from pkg12b_targets t
          join public.card_prints cp on cp.id = t.card_print_id
          where coalesce(cp.number, '') <> t.card_number
             or coalesce(cp.number_plain, '') <> t.expected_number_plain
             or coalesce(cp.name, '') <> t.card_name) as identity_mismatch_rows,
         (select count(*)::int
          from pkg12b_targets t
          join public.card_prints cp on cp.id <> t.card_print_id
          join public.card_prints current_cp on current_cp.id = t.card_print_id
          where cp.set_id = current_cp.set_id
            and coalesce(cp.number_plain, '') = t.expected_number_plain
            and coalesce(cp.printed_identity_modifier, '') = t.target_printed_identity_modifier
            and coalesce(cp.variant_key, '') = coalesce(current_cp.variant_key, '')) as target_modifier_collisions`,
    );
    const collisionRow = collision.rows[0];
    if (
      collisionRow.already_modified_rows !== 0 ||
      collisionRow.identity_mismatch_rows !== 0 ||
      collisionRow.target_modifier_collisions !== 0
    ) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }
    const update = await client.query(
      `update public.card_prints cp
       set printed_identity_modifier = t.target_printed_identity_modifier
       from pkg12b_targets t
       where cp.id = t.card_print_id
         and cp.printed_identity_modifier is null
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.number_plain, cp.printed_identity_modifier, cp.name`,
    );
    if (update.rowCount !== targets.length) {
      throw new Error(`update count mismatch: ${update.rowCount} !== ${targets.length}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg12b_targets) as planned_update_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg12b_prefix_parent_modifier_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg12b_prefix_parent_modifier_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-12B Prefix Parent Modifier Guarded Dry Run V1

Rollback-only dry run to add explicit number-prefix identity modifiers to protected RC/SL parents before inserting unprefixed base checklist parents.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- target_update_rows: ${report.scope?.target_update_rows ?? 0}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Prefix

${markdownTable(['prefix', 'rows'], Object.entries(report.scope?.by_prefix ?? {}))}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

This report is dry-run proof only. It does not authorize real apply.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12B Prefix Parent Modifier Guarded Dry Run Checkpoint V1](20260610_pkg12b_prefix_parent_modifier_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 8 protected RC/SL parent printed_identity_modifier updates. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12b_prefix_parent_modifier_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12b_prefix_parent_modifier_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targets = buildTargets(source);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_strategy_fingerprint_sha256: source.fingerprint ?? null,
    targets: targets.map((row) => ({
      card_print_id: row.card_print_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_printed_identity_modifier: row.target_printed_identity_modifier,
    })),
  }));
  const conn = connectionString();
  let report;

  if (!conn) {
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg12b_prefix_parent_modifier_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_status: 'blocked_no_database_connection_string',
      stop_findings: ['database_connection_unavailable'],
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      const execution = targets.length > 0
        ? await runDryRun(client, targets, packageFingerprint)
        : {
          status: 'blocked_no_targets_present',
          error_message: null,
          before_snapshot: null,
          after_snapshot: null,
          rollback_proof_rows: [],
        };
      const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
      const byPrefix = countBy(targets, (row) => row.prefix);
      const stopFindings = [];
      if (source.package_id !== 'PKG-12-PARENT-IDENTITY-MISMATCH-STRATEGY') stopFindings.push('source_strategy_package_mismatch');
      if (targets.length !== EXPECTED_TARGET_ROWS) stopFindings.push(`target_count_not_${EXPECTED_TARGET_ROWS}`);
      if (stableJson(byPrefix) !== stableJson(EXPECTED_BY_PREFIX)) stopFindings.push('prefix_scope_mismatch');
      if (execution.status !== 'pkg12b_prefix_parent_modifier_completed_rolled_back_no_durable_change') stopFindings.push('dry_run_not_passed');
      if (execution.error_message) stopFindings.push(`dry_run_error:${execution.error_message}`);
      if (!durableMatch) stopFindings.push('durable_after_snapshot_differs_from_before_snapshot');

      report = {
        generated_at: new Date().toISOString(),
        version: 'english_master_index_pkg12b_prefix_parent_modifier_guarded_dry_run_v1',
        package_id: PACKAGE_ID,
        source_strategy_fingerprint_sha256: source.fingerprint ?? null,
        package_fingerprint_sha256: packageFingerprint,
        rollback_only: true,
        dry_run_status: execution.status,
        durable_db_writes_performed: false,
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        real_apply_authorized: false,
        scope: {
          target_update_rows: targets.length,
          by_prefix: byPrefix,
          by_set: countBy(targets, (row) => row.set_key),
          target_rows: targets,
        },
        before_snapshot: execution.before_snapshot,
        after_snapshot: execution.after_snapshot,
        durable_after_snapshot_matches_before_snapshot: durableMatch,
        rollback_proof_rows: execution.rollback_proof_rows,
        stop_findings: stopFindings,
        recommended_real_apply_approval_text: stopFindings.length === 0
          ? `Approve real PKG-12B-PREFIX-PARENT-MODIFIER-BACKFILL apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} protected RC/SL parent printed_identity_modifier updates, prefixes ${Object.entries(byPrefix).map(([prefix, count]) => `${prefix}=${count}`).join(', ')}. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No child writes. No deletes. No merges. No unsupported cleanup.`
          : null,
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
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    checkpoint_md: CHECKPOINT_MD,
    dry_run_status: report.dry_run_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    scope: report.scope,
    stop_findings: report.stop_findings,
    recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
