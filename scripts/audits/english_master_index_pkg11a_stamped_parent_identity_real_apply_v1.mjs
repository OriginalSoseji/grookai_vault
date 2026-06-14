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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11a_stamped_parent_identity_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11a_stamped_parent_identity_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg11a_stamped_parent_identity_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg11a_stamped_parent_identity_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-11A-STAMPED-CANONICAL-PARENT-IDENTITY-PILOT';
const PACKAGE_FINGERPRINT = 'bfd77c554ba3ee32c18f523b1211d95aa7442dda6fccfeee2c0ebeea958fe6ea';
const DRY_RUN_PROOF_HASH = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
const SOURCE_PACKAGE_ID = 'STAMPED-IDENTITY-READINESS-V1';

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
  if (dryRun.dry_run_status !== 'pkg11a_stamped_parent_identity_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.rollback_proof_equal !== true) findings.push('dry_run_rollback_not_equal');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if ((dryRun.scope?.targets ?? []).length !== 16) findings.push('target_count_not_16');
  if (dryRun.simulated_write_counts?.parent_inserts !== 16) findings.push('parent_insert_count_not_16');
  if (dryRun.simulated_write_counts?.child_inserts !== 16) findings.push('child_insert_count_not_16');
  if (dryRun.simulated_write_counts?.deletes !== 0 || dryRun.simulated_write_counts?.merges !== 0) findings.push('dry_run_unexpected_delete_or_merge');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         target_finish_key text,
         target_variant_key text
       )
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cpr.finish_key
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'proposed_parent_collision' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints base on base.id = t.base_parent_id
     join public.card_prints cp
       on cp.id <> t.target_parent_id
      and cp.set_id = base.set_id
      and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
      and lower(cp.name) = lower(base.name)
      and coalesce(cp.variant_key, '') = coalesce(t.target_variant_key, '')
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_parent_rows: rows.filter((row) => row.row_type === 'target_parent').length,
      target_child_rows: rows.filter((row) => row.row_type === 'target_child').length,
      proposed_parent_collision_rows: rows.filter((row) => row.row_type === 'proposed_parent_collision').length,
      total_rows: rows.length,
    },
  };
}

function validateBefore(snapshot) {
  const findings = [];
  if (snapshot.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('fresh_before_hash_mismatch');
  if (snapshot.counts.target_parent_rows !== 0) findings.push('before_target_parent_rows_present');
  if (snapshot.counts.target_child_rows !== 0) findings.push('before_target_child_rows_present');
  if (snapshot.counts.proposed_parent_collision_rows !== 0) findings.push('before_parent_collisions_present');
  return findings;
}

function validateAfter(snapshot) {
  const findings = [];
  if (snapshot.counts.target_parent_rows !== 16) findings.push('after_target_parent_rows_not_16');
  if (snapshot.counts.target_child_rows !== 16) findings.push('after_target_child_rows_not_16');
  if (snapshot.counts.proposed_parent_collision_rows !== 0) findings.push('after_parent_collisions_present');
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
      write_counts: { parent_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: beforeFindings,
    };
  }
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg11a_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         stamp_label text not null,
         target_number_plain text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg11a_targets
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
         stamp_label text,
         target_number_plain text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg11a_targets) as target_count,
         (select count(*)::int from pkg11a_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from pkg11a_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from pkg11a_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from pkg11a_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== 16 ||
      guardRow.missing_base_count !== 0 ||
      guardRow.inactive_finish_count !== 0 ||
      guardRow.parent_collision_count !== 0 ||
      guardRow.child_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }
    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id, external_ids,
         updated_at, set_code, artist, regulation_mark, image_alt_url, image_source, variants, created_at,
         last_synced_at, print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total, gv_id,
         image_path, identity_domain, printed_identity_modifier, set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.target_variant_key, base.rarity, null, null,
         jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code,
         base.artist, base.regulation_mark, null, null, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'source_package_id', $2::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-', upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, base.identity_domain, null, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from pkg11a_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID, SOURCE_PACKAGE_ID],
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target.target_child_id,
         target.target_parent_id,
         target.target_finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         concat(target.set_key, ':', target.card_number, ':stamped_identity:', target.target_variant_key, ':', target.target_finish_key),
         'english_master_index_pkg11a_stamped_parent_identity_real_apply_v1',
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Stamped identity child finish copied from unambiguous base finish: ', target.target_finish_key)
       from pkg11a_targets target`,
    );
    if (parentInsert.rowCount !== 16 || childInsert.rowCount !== 16) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg11a_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg11a_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_printings cpr join pkg11a_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    const afterFindings = validateAfter(afterSnapshot);
    return {
      apply_status: afterFindings.length ? 'committed_but_after_validation_failed' : 'pkg11a_stamped_parent_identity_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: proof.rows,
      write_counts: { parent_inserts: parentInsert.rowCount, child_inserts: childInsert.rowCount, deletes: 0, merges: 0 },
      stop_findings: afterFindings,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      apply_status: 'pkg11a_stamped_parent_identity_real_apply_failed_rolled_back',
      committed: false,
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: [],
      write_counts: { parent_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: [error.message],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-11A Stamped Parent Identity Real Apply V1

Real apply for the first stamped canonical parent identity pilot.

## Status

- apply_status: \`${report.apply_status}\`
- committed: \`${report.db_write_committed}\`
- fingerprint: \`${report.package_fingerprint_sha256}\`
- parent_inserts: ${report.write_counts.parent_inserts}
- child_inserts: ${report.write_counts.child_inserts}
- deletes: ${report.write_counts.deletes}
- merges: ${report.write_counts.merges}
- migrations_created: \`${report.migrations_created}\`
- stop_findings: ${report.stop_findings.length}

## Counts

${markdownTable(['operation', 'rows'], Object.entries(report.write_counts))}
`;
}

async function updateCheckpointIndex() {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-11A Stamped Parent Identity Real Apply Checkpoint V1](20260610_pkg11a_stamped_parent_identity_real_apply_checkpoint_v1.md) | Applied first 16 stamped canonical parent identities with child finishes copied from unambiguous base rows. No migrations. |';
  const current = fsSync.existsSync(indexPath) ? await fs.readFile(indexPath, 'utf8') : '# Master Index Checkpoint Index\n\n';
  if (current.includes('20260610_pkg11a_stamped_parent_identity_real_apply_checkpoint_v1.md')) {
    const next = current.split(/\r?\n/).map((existingLine) => (
      existingLine.includes('20260610_pkg11a_stamped_parent_identity_real_apply_checkpoint_v1.md') ? line : existingLine
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
      write_counts: { parent_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
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
    version: 'english_master_index_pkg11a_stamped_parent_identity_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    dry_run_proof_hash_sha256: DRY_RUN_PROOF_HASH,
    apply_status: execution.apply_status,
    error_message: execution.error_message ?? null,
    db_write_committed: execution.committed,
    durable_db_writes_performed: execution.committed,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    merges_performed: false,
    stamped_finish_activation_performed: false,
    scope: {
      target_parent_rows: targets.length,
      target_child_rows: targets.length,
      by_set: countBy(targets, (row) => row.set_key),
      by_child_finish: countBy(targets, (row) => row.target_finish_key),
      by_variant_key: countBy(targets, (row) => row.target_variant_key),
    },
    write_counts: execution.write_counts,
    before_snapshot: execution.before_snapshot,
    after_snapshot: execution.after_snapshot,
    proof_rows: execution.proof_rows,
    stop_findings: execution.stop_findings ?? [],
    source_dry_run_artifact: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# PKG-11A Stamped Parent Identity Real Apply Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${PACKAGE_FINGERPRINT}\`
- Apply status: \`${report.apply_status}\`
- Committed: \`${report.db_write_committed}\`
- Parent inserts: ${report.write_counts.parent_inserts}
- Child inserts: ${report.write_counts.child_inserts}
- Deletes: ${report.write_counts.deletes}
- Merges: ${report.write_counts.merges}
- Migrations created: \`false\`
- Stamped finish activated: \`false\`
`);
  await updateCheckpointIndex();

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    apply_status: report.apply_status,
    db_write_committed: report.db_write_committed,
    write_counts: report.write_counts,
    before_counts: report.before_snapshot?.counts ?? null,
    after_counts: report.after_snapshot?.counts ?? null,
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
