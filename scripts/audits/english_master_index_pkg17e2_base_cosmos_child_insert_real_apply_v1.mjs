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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e2_base_cosmos_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e2_base_cosmos_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17e2_base_cosmos_child_insert_real_apply_v1.md');

const PACKAGE_ID = 'PKG-17E2-BASE-COSMOS-CHILD-PRINTING-INSERTS';
const CREATED_BY = 'pkg17e2_base_cosmos_child_insert_real_apply_v1';
const EXPECTED_PACKAGE_FINGERPRINT = 'c96a24654788b7ed26116ebd423c35cd872528680d765d515e178a4b2b65e4f6';
const EXPECTED_DRY_RUN_PROOF = 'e5845be43c26beae077311be2febf67c860613bc53879c1c4d35c9f31daeaea5';
const EXPECTED_PRE_APPLY_HASH = 'cee812d57ed2a2b2d5eeb06631781c55323bab98608e73c86c5dfb817fdaf79e';
const EXPECTED_TARGET_COUNT = 4;
const APPROVAL_TEXT = 'Approve real PKG-17E2-BASE-COSMOS-CHILD-PRINTING-INSERTS apply only. Fingerprint: c96a24654788b7ed26116ebd423c35cd872528680d765d515e178a4b2b65e4f6. Scope: 4 child-only base parent card_printing inserts; finishes cosmos=4; sets sv06.5=1, swsh12.5=3. Dry-run proof: cee812d57ed2a2b2d5eeb06631781c55323bab98608e73c86c5dfb817fdaf79e == cee812d57ed2a2b2d5eeb06631781c55323bab98608e73c86c5dfb817fdaf79e. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes. No identity writes.';

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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_PACKAGE_FINGERPRINT) findings.push('dry_run_package_fingerprint_mismatch');
  if (dryRun.execution?.dry_run_status !== 'pkg17e2_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('dry_run_rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  const counts = dryRun.execution?.simulated_write_counts ?? {};
  if (counts.child_inserts !== EXPECTED_TARGET_COUNT) findings.push('dry_run_child_insert_scope_mismatch');
  if (counts.parent_writes !== 0 || counts.identity_writes !== 0 || counts.deletes !== 0 || counts.merges !== 0) findings.push('dry_run_forbidden_write_scope_present');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  if ((dryRun.scope?.targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('dry_run_targets_not_expected_count');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) findings.push('dry_run_after_rollback_hash_mismatch');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         target_finish_key text
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
       cp.printed_identity_modifier,
       null::text as finish_key
     from target
     join public.card_prints cp on cp.id = target.target_parent_id
     union all
     select
       'existing_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key
     from target
     join public.card_printings cpr on cpr.card_print_id = target.target_parent_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key
     from target
     join public.card_printings cpr on cpr.id = target.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function applyPackage(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_PRE_APPLY_HASH) {
    throw new Error(`pre-apply snapshot hash mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg17e2_targets (
         target_child_id uuid primary key,
         target_parent_id uuid not null,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg17e2_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_child_id uuid,
         target_parent_id uuid,
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         evidence jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        target_child_id: row.target_child_id,
        target_parent_id: row.target_parent_id,
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        target_variant_key: row.target_variant_key,
        target_finish_key: row.target_finish_key,
        evidence: row,
      })))],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from pkg17e2_targets) as target_count,
         (select count(distinct target_child_id)::int from pkg17e2_targets) as target_child_count,
         (select count(distinct target_parent_id)::int from pkg17e2_targets) as target_parent_count,
         (select count(*)::int from pkg17e2_targets where target_finish_key = 'cosmos') as exact_finish_count,
         (select count(*)::int from pkg17e2_targets target left join public.card_prints cp on cp.id = target.target_parent_id where cp.id is null) as missing_parent_count,
         (select count(*)::int
          from pkg17e2_targets target
          join public.card_prints cp on cp.id = target.target_parent_id
          where cp.set_code <> target.set_key
             or cp.name <> target.card_name
             or coalesce(nullif(ltrim(coalesce(cp.number_plain, cp.number), '0'), ''), '0') <> coalesce(nullif(ltrim(target.card_number, '0'), ''), '0')
             or coalesce(cp.variant_key, '') <> ''
             or cp.printed_identity_modifier is not null) as parent_mismatch_count,
         (select count(*)::int from pkg17e2_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from pkg17e2_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_id_collision_count,
         (select count(*)::int from pkg17e2_targets target join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as target_finish_collision_count,
         (select count(*)::int from pkg17e2_targets target join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_count,
         (select count(*)::int from pkg17e2_targets target where jsonb_array_length(coalesce(target.evidence->'source_families', '[]'::jsonb)) < 2) as insufficient_source_family_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length ||
      guardRow.target_child_count !== targets.length ||
      guardRow.target_parent_count !== targets.length ||
      guardRow.exact_finish_count !== targets.length ||
      guardRow.missing_parent_count !== 0 ||
      guardRow.parent_mismatch_count !== 0 ||
      guardRow.inactive_finish_count !== 0 ||
      guardRow.child_id_collision_count !== 0 ||
      guardRow.target_finish_collision_count !== 0 ||
      guardRow.forbidden_stamped_child_count !== 0 ||
      guardRow.insufficient_source_family_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

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
         concat(target.set_key, ':', target.card_number, ':base_dependency:', target.target_finish_key),
         $1::text,
         null, null, null, null, null,
         'source_backed_no_image',
         concat('Base parent finish dependency for source-backed stamped variant: ', target.target_finish_key)
       from pkg17e2_targets target`,
      [CREATED_BY],
    );
    if (childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${childInsert.rowCount}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg17e2_targets) as target_rows,
         (select count(*)::int from public.card_printings cpr join pkg17e2_targets target on target.target_child_id = cpr.id) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join pkg17e2_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'cosmos') as inserted_cosmos_rows,
         (select count(*)::int from public.card_printings cpr join pkg17e2_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, fingerprint],
    );

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg17e2_real_apply_committed',
      guard: guardRow,
      proof: proof.rows[0],
      write_counts: {
        child_inserts: childInsert.rowCount,
        parent_writes: 0,
        identity_writes: 0,
        deletes: 0,
        merges: 0,
      },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# PKG-17E2 Base Cosmos Child Printing Insert Real Apply V1

Approved real apply for PKG-17E2 only.

## Safety

- approval_text_required: ${report.approval_text_required}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- global_apply_performed: ${report.global_apply_performed}
- parent_writes: ${report.write_counts.parent_writes}
- identity_writes: ${report.write_counts.identity_writes}

## Scope

- child_inserts: ${report.write_counts.child_inserts}
- deletes: ${report.write_counts.deletes}
- merges: ${report.write_counts.merges}

## Targets

${markdownTable(
    ['set', 'number', 'card', 'base_parent_id', 'finish', 'sources'],
    report.scope.targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.target_parent_id,
      row.target_finish_key,
      row.source_families.join(', '),
    ]),
  )}

## Proof

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`
- pre_apply_hash: \`${report.before_snapshot.hash_sha256}\`
- post_apply_hash: \`${report.after_snapshot.hash_sha256}\`
- inserted_child_rows: ${report.proof.inserted_child_rows}
- inserted_cosmos_rows: ${report.proof.inserted_cosmos_rows}
- forbidden_stamped_child_rows: ${report.proof.forbidden_stamped_child_rows}
- stop_findings: ${report.stop_findings.length}
`;
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const validationFindings = validateDryRun(dryRun);
  if (validationFindings.length > 0) {
    throw new Error(`dry-run validation failed: ${validationFindings.join(', ')}`);
  }
  const conn = connectionString();
  if (!conn) throw new Error('missing_database_connection');

  const targets = dryRun.scope.targets;
  const client = new Client({ connectionString: conn });
  await client.connect();
  let execution;
  try {
    execution = await applyPackage(client, targets, dryRun.package_fingerprint_sha256);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17e2_base_cosmos_child_insert_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
    dry_run_proof_sha256: dryRun.dry_run_proof_sha256,
    approval_text_required: APPROVAL_TEXT,
    apply_status: execution.apply_status,
    committed: true,
    source_artifact: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
    db_writes_performed: true,
    durable_db_writes_performed: true,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    deletes_performed: false,
    merges_performed: false,
    parent_writes_performed: false,
    identity_writes_performed: false,
    write_counts: execution.write_counts,
    guard: execution.guard,
    proof: execution.proof,
    before_snapshot: execution.before_snapshot,
    after_snapshot: execution.after_snapshot,
    scope: {
      target_count: targets.length,
      by_set: dryRun.scope.by_set,
      by_finish: dryRun.scope.by_finish,
      targets,
    },
    stop_findings: execution.stop_findings,
  };

  const proof = report.proof ?? {};
  if (
    proof.target_rows !== EXPECTED_TARGET_COUNT ||
    proof.inserted_child_rows !== EXPECTED_TARGET_COUNT ||
    proof.inserted_cosmos_rows !== EXPECTED_TARGET_COUNT ||
    proof.forbidden_stamped_child_rows !== 0
  ) {
    throw new Error(`post-apply proof failed: ${JSON.stringify(proof)}`);
  }

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    apply_status: report.apply_status,
    committed: report.committed,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    dry_run_proof_sha256: report.dry_run_proof_sha256,
    write_counts: report.write_counts,
    proof: report.proof,
    stop_findings: report.stop_findings,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
