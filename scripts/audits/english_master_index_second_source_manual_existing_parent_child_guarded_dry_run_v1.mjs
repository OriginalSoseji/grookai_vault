import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_candidate_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_existing_parent_child_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_second_source_manual_existing_parent_child_guarded_dry_run_v1.md');
const PACKAGE_ID = 'SECOND-SOURCE-MANUAL-EXISTING-PARENT-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_second_source_manual_existing_parent_child_guarded_dry_run_v1';

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

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function buildTargets(readiness) {
  return (readiness.rows ?? [])
    .filter((row) => row.readiness_route === 'existing_parent_child_missing_candidate')
    .map((row) => ({
      target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.variant_key}:${row.candidate_finish_key}`),
      target_parent_id: row.existing_variant_parent_id,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: row.candidate_finish_key,
      target_variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      target_printing_gv_id: row.target_printing_gv_id,
      source_urls: row.source_urls ?? [],
      evidence_labels: row.evidence_labels ?? [],
    }));
}

function packageFingerprint(targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
    })),
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid
       )
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as printing_gv_id
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, cpr.printing_gv_id
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.target_parent_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'new_target_child', cpr.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, cpr.printing_gv_id
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, variant_key nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function runDryRun(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query(
      `create temporary table second_source_existing_child_targets (
         target_child_id uuid primary key,
         target_parent_id uuid not null,
         set_key text not null,
         set_name text,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         stamp_label text,
         target_printing_gv_id text not null,
         source_urls jsonb not null,
         evidence_labels jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into second_source_existing_child_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_child_id uuid,
         target_parent_id uuid,
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         stamp_label text,
         target_printing_gv_id text,
         source_urls jsonb,
         evidence_labels jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from second_source_existing_child_targets) as target_count,
         (select count(distinct target_parent_id)::int from second_source_existing_child_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from second_source_existing_child_targets) as target_child_count,
         (select count(*)::int from second_source_existing_child_targets target left join public.card_prints cp on cp.id = target.target_parent_id where cp.id is null) as missing_parent_count,
         (select count(*)::int from second_source_existing_child_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from second_source_existing_child_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as target_child_id_collision_count,
         (select count(*)::int from second_source_existing_child_targets target join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as existing_parent_finish_collision_count,
         (select count(*)::int from second_source_existing_child_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_count`,
    );
    const guardRow = guard.rows[0];
    const expected = {
      target_count: targets.length,
      target_parent_count: targets.length,
      target_child_count: targets.length,
      missing_parent_count: 0,
      inactive_finish_count: 0,
      target_child_id_collision_count: 0,
      existing_parent_finish_collision_count: 0,
      active_identity_count: targets.length,
    };
    const failures = Object.entries(expected)
      .filter(([key, value]) => guardRow[key] !== value)
      .map(([key, value]) => `${key}:${guardRow[key]}!=${value}`);
    if (failures.length) throw new Error(`guard failed: ${failures.join(', ')}`);

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
         concat(target.set_key, ':', target.card_number, ':existing_stamped_identity:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         target.target_printing_gv_id,
         null, null, null, null,
         'representative_shared_stamp',
         concat('Manual second-source existing stamped identity child finish routed from preserved evidence: ', target.target_finish_key)
       from second_source_existing_child_targets target`,
      [CREATED_BY],
    );
    if (childInsert.rowCount !== targets.length) {
      throw new Error(`child insert count mismatch: ${childInsert.rowCount} != ${targets.length}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from second_source_existing_child_targets) as target_rows,
         (select count(*)::int from public.card_printings cpr join second_source_existing_child_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
      [PACKAGE_ID, fingerprint],
    );
    const inTransactionSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      dry_run_status: 'completed_rolled_back_no_durable_change',
      guard: guardRow,
      proof: proof.rows[0],
      simulated_write_counts: {
        child_inserts: childInsert.rowCount,
        parent_writes: 0,
        identity_writes: 0,
        deletes: 0,
        merges: 0,
      },
      before_snapshot: beforeSnapshot,
      in_transaction_snapshot: inTransactionSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: fingerprint,
        guard: guardRow,
        proof: proof.rows[0],
        before_hash: beforeSnapshot.hash_sha256,
        after_hash: afterSnapshot.hash_sha256,
      })),
      stop_findings: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256 ? [] : ['rollback_snapshot_mismatch'],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'failed_rolled_back',
      error: error.message,
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      stop_findings: ['dry_run_failed'],
    };
  }
}

function renderMarkdown(report) {
  return `# Second Source Manual Existing Parent Child Guarded Dry Run V1

Generated: ${report.generated_at}

Rollback-only dry-run for existing stamped parent rows that need one additional child printing after second-source evidence.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- parent_writes: 0
- identity_writes: 0
- deletes: 0
- merges: 0

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['child_insert_scope', report.summary.child_insert_scope],
    ['rollback_verified', report.summary.rollback_verified],
    ['dry_run_proof_sha256', report.dry_run?.dry_run_proof_sha256 ?? '(none)'],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Scope

${markdownTable(['set', 'number', 'card', 'stamp', 'variant_key', 'finish'], report.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label,
    row.target_variant_key,
    row.target_finish_key,
  ]))}

## Required Approval Boundary

Do not real-apply this package without explicit approval. If approved, the exact scope is ${report.summary.child_insert_scope} child-only \`card_printing\` insert. No parent writes, no identity writes, no deletes, no merges, no migrations.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string');
  const readiness = await readJson(READINESS_JSON);
  const targets = buildTargets(readiness);
  const fingerprint = packageFingerprint(targets);
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const dryRun = targets.length ? await runDryRun(client, targets, fingerprint) : null;
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      input_artifact: rel(READINESS_JSON),
      audit_only: true,
      safety: {
        db_writes_performed: false,
        durable_db_writes_performed: false,
        migrations_created: false,
        apply_performed: false,
        cleanup_performed: false,
        quarantine_performed: false,
        global_apply_performed: false,
      },
      summary: {
        target_rows: targets.length,
        child_insert_scope: targets.length,
        rollback_verified: dryRun?.rollback_verified ?? true,
        write_ready_for_approval: targets.length > 0 && dryRun?.rollback_verified === true && dryRun.stop_findings.length === 0,
      },
      targets,
      dry_run: dryRun,
    };
    report.fingerprint_sha256 = sha256(stableJson({
      package_id: PACKAGE_ID,
      package_fingerprint: fingerprint,
      summary: report.summary,
      targets,
      dry_run_proof_sha256: dryRun?.dry_run_proof_sha256 ?? null,
    }));
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      package_fingerprint: fingerprint,
      dry_run_proof_sha256: dryRun?.dry_run_proof_sha256 ?? null,
      summary: report.summary,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
