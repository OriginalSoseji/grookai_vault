import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08aa_swsh45sv_correction_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08AA-SWSH45SV-CORRECTION';
const PACKAGE_FINGERPRINT = '2c18c98a4774bc445d7b8c4fad5f66a3c68199c70714ef843746b3b60d351c77';
const DRY_RUN_PROOF_HASH = '0e0a09bcebf494f9f66cb31f8ee11e604434d5c27c0875ea32256987089d4f5a';

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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08aa_swsh45sv_correction_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_rollback_proof_not_true');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if ((dryRun.scope?.targets ?? []).length !== 25) findings.push(`target_count_not_25:${(dryRun.scope?.targets ?? []).length}`);
  if (dryRun.simulated_write_counts?.parent_updates !== 25) findings.push('dry_run_parent_update_count_not_25');
  if (dryRun.simulated_write_counts?.child_updates !== 25) findings.push('dry_run_child_update_count_not_25');
  if (dryRun.simulated_write_counts?.deletes !== 0) findings.push('dry_run_deletes_not_zero');
  if (dryRun.simulated_write_counts?.inserts !== 0) findings.push('dry_run_inserts_not_zero');
  return findings;
}

async function captureSnapshot(client, targets) {
  const parentIds = targets.map((row) => row.card_print_id);
  const childIds = targets.map((row) => row.card_printing_id);
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_id::text as set_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as child_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, cp.number, cp.name, cp.id`,
    [parentIds],
  );
  const counts = await client.query(
    `select
       (select count(*)::int from public.card_prints where id = any($1::uuid[])) as parent_rows,
       (select count(*)::int from public.card_prints where id = any($1::uuid[]) and lower(set_code) = 'swsh4.5') as host_parent_rows,
       (select count(*)::int from public.card_prints where id = any($1::uuid[]) and lower(set_code) = 'swsh45sv') as subset_parent_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[])) as child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and finish_key = 'normal') as normal_child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and finish_key = 'holo') as holo_child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and printing_gv_id like '%-HOLO') as holo_gv_child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and printing_gv_id like '%-STD') as std_gv_child_rows`,
    [parentIds, childIds],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: counts.rows[0],
  };
}

function validateBefore(snapshot) {
  const counts = snapshot?.impact_counts ?? {};
  const findings = [];
  if (snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('fresh_before_hash_mismatch');
  if (counts.parent_rows !== 25) findings.push('before_parent_rows_not_25');
  if (counts.host_parent_rows !== 25) findings.push('before_host_parent_rows_not_25');
  if (counts.subset_parent_rows !== 0) findings.push('before_subset_parent_rows_not_0');
  if (counts.child_rows !== 25) findings.push('before_child_rows_not_25');
  if (counts.normal_child_rows !== 25) findings.push('before_normal_child_rows_not_25');
  if (counts.holo_child_rows !== 0) findings.push('before_holo_child_rows_not_0');
  if (counts.std_gv_child_rows !== 25) findings.push('before_std_gv_child_rows_not_25');
  return findings;
}

function validateAfter(snapshot) {
  const counts = snapshot?.impact_counts ?? {};
  const findings = [];
  if (counts.parent_rows !== 25) findings.push('after_parent_rows_not_25');
  if (counts.host_parent_rows !== 0) findings.push('after_host_parent_rows_not_0');
  if (counts.subset_parent_rows !== 25) findings.push('after_subset_parent_rows_not_25');
  if (counts.child_rows !== 25) findings.push('after_child_rows_not_25');
  if (counts.normal_child_rows !== 0) findings.push('after_normal_child_rows_not_0');
  if (counts.holo_child_rows !== 25) findings.push('after_holo_child_rows_not_25');
  if (counts.holo_gv_child_rows !== 25) findings.push('after_holo_gv_child_rows_not_25');
  if (counts.std_gv_child_rows !== 0) findings.push('after_std_gv_child_rows_not_0');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const beforeFindings = validateBefore(beforeSnapshot);
  if (beforeFindings.length) {
    return {
      apply_status: 'blocked_before_real_apply_live_shape_mismatch',
      committed: false,
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      proof_rows: [],
      write_counts: { parent_updates: 0, child_updates: 0, deletes: 0, inserts: 0 },
      stop_findings: beforeFindings,
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08aa_targets (
         card_print_id uuid primary key,
         card_printing_id uuid not null,
         from_set_code text not null,
         to_set_id uuid not null,
         to_set_code text not null,
         card_number text not null,
         card_name text not null,
         from_finish_key text not null,
         to_finish_key text not null,
         from_printing_gv_id text not null,
         to_printing_gv_id text not null
       ) on commit drop`,
    );
    const targetSet = await client.query(
      `select id::text, code, name
       from public.sets
       where game = 'pokemon'
         and lower(code) = 'swsh45sv'`,
    );
    if (targetSet.rows.length !== 1) throw new Error(`expected_one_swsh45sv_set_found_${targetSet.rows.length}`);
    await client.query(
      `insert into pkg08aa_targets
       select
         row.card_print_id::uuid,
         row.card_printing_id::uuid,
         row.from_set_code,
         $2::uuid,
         $3::text,
         row.card_number,
         row.card_name,
         row.from_finish_key,
         row.to_finish_key,
         row.from_printing_gv_id,
         row.to_printing_gv_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         card_printing_id text,
         from_set_code text,
         card_number text,
         card_name text,
         from_finish_key text,
         to_finish_key text,
         from_printing_gv_id text,
         to_printing_gv_id text
       )`,
      [JSON.stringify(targets), targetSet.rows[0].id, targetSet.rows[0].code],
    );
    await client.query(
      `select cp.id
       from public.card_prints cp
       join pkg08aa_targets target on target.card_print_id = cp.id
       for update of cp`,
    );
    await client.query(
      `select cpr.id
       from public.card_printings cpr
       join pkg08aa_targets target on target.card_printing_id = cpr.id
       for update of cpr`,
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg08aa_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg08aa_targets t on t.card_print_id = cp.id and lower(cp.set_code) = lower(t.from_set_code)) as source_parent_rows,
         (select count(*)::int from public.card_prints cp join pkg08aa_targets t on lower(cp.set_code) = lower(t.to_set_code) and cp.number = t.card_number and lower(cp.name) = lower(t.card_name) and cp.id <> t.card_print_id) as target_parent_collisions,
         (select count(*)::int from public.card_printings cpr join pkg08aa_targets t on cpr.id = t.card_printing_id and cpr.card_print_id = t.card_print_id and cpr.finish_key = t.from_finish_key and cpr.printing_gv_id = t.from_printing_gv_id) as normal_children_to_update,
         (select count(*)::int from public.card_printings cpr join pkg08aa_targets t on cpr.card_print_id = t.card_print_id and cpr.finish_key = t.to_finish_key) as existing_holo_child_collisions,
         (select count(*)::int from public.finish_keys fk where fk.key = 'holo' and fk.is_active = true) as active_holo_finish_keys`,
    );
    const guard = guards.rows[0];
    if (
      guard.target_rows !== targets.length ||
      guard.source_parent_rows !== targets.length ||
      guard.target_parent_collisions !== 0 ||
      guard.normal_children_to_update !== targets.length ||
      guard.existing_holo_child_collisions !== 0 ||
      guard.active_holo_finish_keys !== 1
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guard)}`);
    }
    const parentUpdate = await client.query(
      `update public.card_prints cp
       set set_id = target.to_set_id,
           set_code = target.to_set_code,
           ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
             'pkg08aa_corrected_from_set_code', cp.set_code,
             'pkg08aa_package_id', $1::text
           )
       from pkg08aa_targets target
       where cp.id = target.card_print_id`,
      [PACKAGE_ID],
    );
    const childUpdate = await client.query(
      `update public.card_printings cpr
       set finish_key = target.to_finish_key,
           printing_gv_id = target.to_printing_gv_id
       from pkg08aa_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (parentUpdate.rowCount !== targets.length || childUpdate.rowCount !== targets.length) {
      throw new Error(`write count mismatch: ${JSON.stringify({ parent_updates: parentUpdate.rowCount, child_updates: childUpdate.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08aa_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg08aa_targets t on cp.id = t.card_print_id and lower(cp.set_code) = lower(t.to_set_code)) as corrected_parent_rows,
         (select count(*)::int from public.card_printings cpr join pkg08aa_targets t on cpr.id = t.card_printing_id and cpr.finish_key = t.to_finish_key and cpr.printing_gv_id = t.to_printing_gv_id) as corrected_child_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    const afterFindings = validateAfter(afterSnapshot);
    return {
      apply_status: afterFindings.length ? 'committed_but_after_validation_failed' : 'pkg08aa_swsh45sv_correction_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: proof.rows,
      write_counts: {
        parent_updates: parentUpdate.rowCount,
        child_updates: childUpdate.rowCount,
        deletes: 0,
        inserts: 0,
      },
      stop_findings: afterFindings,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      apply_status: 'pkg08aa_swsh45sv_correction_real_apply_failed_rolled_back',
      committed: false,
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: [],
      write_counts: { parent_updates: 0, child_updates: 0, deletes: 0, inserts: 0 },
      stop_findings: [error.message],
    };
  }
}

function renderMarkdown(report) {
  const proofRows = (report.proof_rows ?? []).map((row) => Object.entries(row).map(([key, value]) => `${key}=${value}`).join(', '));
  const countsRows = Object.entries(report.write_counts ?? {}).map(([key, value]) => [key, value]);
  return `# PKG-08AA SWSH45SV Correction Real Apply V1

Real apply for correcting the PKG-08Y Shining Fates Shiny Vault direction after guarded dry-run proof.

## Status

- Apply status: \`${report.apply_status}\`
- Fingerprint: \`${report.package_fingerprint_sha256}\`
- Committed: \`${report.db_write_committed}\`
- Migrations created: \`${report.migrations_created}\`
- Global apply performed: \`${report.global_apply_performed}\`
- Cleanup performed: \`${report.cleanup_performed}\`
- Stop findings: ${report.stop_findings.length}

## Write Counts

${markdownTable(['operation', 'rows'], countsRows)}

## Before/After

- Before hash: \`${report.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- After hash: \`${report.after_snapshot?.hash_sha256 ?? 'n/a'}\`
- Before counts: \`${JSON.stringify(report.before_snapshot?.impact_counts ?? {})}\`
- After counts: \`${JSON.stringify(report.after_snapshot?.impact_counts ?? {})}\`

## Proof

${proofRows.length ? proofRows.map((row) => `- ${row}`).join('\n') : '- none'}
`;
}

async function updateCheckpointIndex() {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08AA SWSH45SV Correction Real Apply Checkpoint V1](20260610_pkg08aa_swsh45sv_correction_real_apply_checkpoint_v1.md) | Corrected PKG-08Y Shining Fates Shiny Vault direction with 25 parent updates and 25 in-place child finish updates. No migrations. |';
  const current = fsSync.existsSync(indexPath) ? await fs.readFile(indexPath, 'utf8') : '# Master Index Checkpoint Index\n\n';
  if (current.includes('20260610_pkg08aa_swsh45sv_correction_real_apply_checkpoint_v1.md')) {
    const next = current.split(/\r?\n/).map((existingLine) => (
      existingLine.includes('20260610_pkg08aa_swsh45sv_correction_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n');
    await fs.writeFile(indexPath, next.endsWith('\n') ? next : `${next}\n`);
    return;
  }
  await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const dryRunFindings = validateDryRun(dryRun);
  const targets = dryRun.scope?.targets ?? [];
  let execution;

  if (dryRunFindings.length) {
    execution = {
      apply_status: 'blocked_dry_run_validation_failed',
      committed: false,
      before_snapshot: null,
      after_snapshot: null,
      proof_rows: [],
      write_counts: { parent_updates: 0, child_updates: 0, deletes: 0, inserts: 0 },
      stop_findings: dryRunFindings,
    };
  } else {
    const conn = connectionString();
    if (!conn) throw new Error('database_connection_unavailable');
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      execution = await applyPackage(client, targets);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08aa_swsh45sv_correction_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    dry_run_proof_hash_sha256: DRY_RUN_PROOF_HASH,
    apply_status: execution.apply_status,
    error_message: execution.error_message ?? null,
    db_write_committed: execution.committed,
    durable_db_writes_performed: execution.committed,
    migrations_created: false,
    cleanup_performed: false,
    unsupported_cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    merges_performed: false,
    scope: {
      target_rows: targets.length,
      parent_updates: 25,
      child_finish_updates: 25,
      deletes: 0,
      inserts: 0,
      by_set_direction: countBy(targets, (row) => `${row.from_set_code}->${row.to_set_code}`),
      by_finish_direction: countBy(targets, (row) => `${row.from_finish_key}->${row.to_finish_key}`),
    },
    write_counts: execution.write_counts,
    before_snapshot: execution.before_snapshot,
    after_snapshot: execution.after_snapshot,
    proof_rows: execution.proof_rows,
    stop_findings: execution.stop_findings ?? [],
    source_dry_run_artifact: path.relative(ROOT, DRY_RUN_JSON),
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# PKG-08AA SWSH45SV Correction Real Apply Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${PACKAGE_FINGERPRINT}\`
- Apply status: \`${report.apply_status}\`
- Committed: \`${report.db_write_committed}\`
- Parent updates: ${report.write_counts.parent_updates}
- Child updates: ${report.write_counts.child_updates}
- Deletes: ${report.write_counts.deletes}
- Inserts: ${report.write_counts.inserts}
- Before hash: \`${report.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- After hash: \`${report.after_snapshot?.hash_sha256 ?? 'n/a'}\`
- Migrations created: \`false\`
- Global apply performed: \`false\`
`);
  await updateCheckpointIndex();

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    apply_status: report.apply_status,
    db_write_committed: report.db_write_committed,
    write_counts: report.write_counts,
    before_counts: report.before_snapshot?.impact_counts ?? null,
    after_counts: report.after_snapshot?.impact_counts ?? null,
    stop_findings: report.stop_findings,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
  }, null, 2));

  if (!report.db_write_committed || report.stop_findings.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
