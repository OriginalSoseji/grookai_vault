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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e_stamped_active_finish_web_evidence_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17e2_base_cosmos_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17e2_base_cosmos_child_insert_guarded_dry_run_v1.md');

const PACKAGE_ID = 'PKG-17E2-BASE-COSMOS-CHILD-PRINTING-INSERTS';
const CREATED_BY = 'pkg17e2_base_cosmos_child_insert_guarded_dry_run_v1';
const EXPECTED_TARGET_COUNT = 4;

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row) || 'unknown'] = (counts[keyFn(row) || 'unknown'] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.status === 'ready_for_guarded_dry_run')
    .filter((row) => row.accepted_finish_key === 'cosmos')
    .filter((row) => !(row.base_parent_child_finishes ?? []).includes(row.accepted_finish_key))
    .map((row) => ({
      target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.selected_base_parent_id}:${row.accepted_finish_key}`),
      target_parent_id: row.selected_base_parent_id,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      target_variant_key: row.variant_key,
      target_finish_key: row.accepted_finish_key,
      source_families: row.source_families,
      evidence_count: row.evidence_count,
      evidence: row.evidence,
      source_fingerprint_sha256: source.fingerprint_sha256,
    }))
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

function packageFingerprint(source, targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint_sha256: source.fingerprint_sha256,
    targets: targets.map((row) => ({
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      target_finish_key: row.target_finish_key,
      source_families: row.source_families,
    })),
  }));
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

async function runDryRun(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
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
    const inTransactionSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      dry_run_status: 'pkg17e2_completed_rolled_back_no_durable_change',
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
      dry_run_status: 'pkg17e2_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: null,
      simulated_write_counts: { child_inserts: 0, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      stop_findings: [`dry_run_error:${error.message}`],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-17E2 Base Cosmos Child Printing Insert Guarded Dry Run V1

Rollback-only dry run for the base-parent cosmos child printings required before the remaining PKG-17E stamped parent inserts can proceed.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- transaction_writes_rolled_back: ${report.transaction_writes_rolled_back}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- rollback_verified: ${report.execution.rollback_verified}

## Scope

- child_inserts: ${report.execution.simulated_write_counts.child_inserts}
- parent_writes: ${report.execution.simulated_write_counts.parent_writes}
- identity_writes: ${report.execution.simulated_write_counts.identity_writes}
- deletes: ${report.execution.simulated_write_counts.deletes}
- merges: ${report.execution.simulated_write_counts.merges}

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

## Result

- dry_run_status: ${report.execution.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.execution.dry_run_proof_sha256}\`
- stop_findings: ${report.execution.stop_findings.length}

## Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targets = buildTargets(source);
  const fingerprint = packageFingerprint(source, targets);
  const conn = connectionString();
  let execution;

  if (targets.length !== EXPECTED_TARGET_COUNT) {
    execution = {
      dry_run_status: 'blocked_unexpected_target_count',
      rollback_verified: false,
      dry_run_proof_sha256: null,
      simulated_write_counts: { child_inserts: 0, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      stop_findings: [`unexpected_target_count:${targets.length}`],
    };
  } else if (!conn) {
    execution = {
      dry_run_status: 'blocked_missing_database_connection',
      rollback_verified: false,
      dry_run_proof_sha256: null,
      simulated_write_counts: { child_inserts: 0, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      stop_findings: ['missing_database_connection'],
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      execution = await runDryRun(client, targets, fingerprint);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const bySet = countBy(targets, (row) => row.set_key);
  const byFinish = countBy(targets, (row) => row.target_finish_key);
  const recommended = execution.dry_run_status === 'pkg17e2_completed_rolled_back_no_durable_change' && execution.rollback_verified && execution.stop_findings.length === 0
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. Scope: ${targets.length} child-only base parent card_printing inserts; finishes ${Object.entries(byFinish).map(([finish, count]) => `${finish}=${count}`).join(', ')}; sets ${Object.entries(bySet).map(([set, count]) => `${set}=${count}`).join(', ')}. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes. No identity writes.`
    : 'Not approval-ready; dry-run did not pass cleanly.';

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17e2_base_cosmos_child_insert_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: fingerprint,
    dry_run_proof_sha256: execution.dry_run_proof_sha256,
    source_artifact: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    db_writes_performed: false,
    durable_db_writes_performed: false,
    transaction_writes_rolled_back: true,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    scope: {
      target_count: targets.length,
      by_set: bySet,
      by_finish: byFinish,
      targets,
    },
    execution,
    recommended_real_apply_approval_text: recommended,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    dry_run_status: execution.dry_run_status,
    dry_run_proof_sha256: execution.dry_run_proof_sha256,
    rollback_verified: execution.rollback_verified,
    simulated_write_counts: execution.simulated_write_counts,
    stop_findings: execution.stop_findings,
    recommended_real_apply_approval_text: recommended,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
