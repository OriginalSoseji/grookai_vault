import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg13c_svp_holo_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg13c_svp_holo_parent_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg13c_svp_holo_parent_child_insert_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg13c_svp_holo_parent_child_insert_real_apply_checkpoint_v1.md');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const PACKAGE_ID = 'PKG-13C-SVP-HOLO-PARENT-CHILD-INSERTS';

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

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function packageFingerprintFromDryRun(dryRun) {
  return hash(stableJson({
    package_id: PACKAGE_ID,
    finish_adjudication: 'human_marketplace_holo_over_tcgdx_normal_conflict_for_svp_175_176',
    targets: (dryRun.scope?.parent_rows ?? []).map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: 'holo',
      mapping: row.mapping,
      tcgdex_conflict_url: row.tcgdex_conflict_url,
    })),
  }));
}

function validateDryRun(dryRun) {
  const findings = [];
  const fingerprint = packageFingerprintFromDryRun(dryRun);
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== fingerprint) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.execution?.dry_run_status !== 'pkg13c_svp_holo_parent_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_rollback_not_verified');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_write');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migration');
  if (dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_cleanup_or_quarantine');
  if (dryRun.source_conflict_documented !== true) findings.push('source_conflict_not_documented');
  if ((dryRun.scope?.parent_rows ?? []).length !== 2) findings.push('parent_scope_not_2');
  if ((dryRun.scope?.child_rows ?? []).length !== 2) findings.push('child_scope_not_2');
  if ((dryRun.scope?.external_mapping_rows ?? []).length !== 2) findings.push('mapping_scope_not_2');
  if ((dryRun.scope?.child_rows ?? []).some((row) => row.finish_key !== 'holo')) findings.push('non_holo_child_in_scope');
  return { findings, fingerprint };
}

async function captureSnapshot(client, plan) {
  const result = await client.query(
    `with parent_target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         live_set_code text,
         number_plain text,
         card_name text
       )
     ),
     child_target as (
       select * from jsonb_to_recordset($2::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text
       )
     ),
     mapping_target as (
       select * from jsonb_to_recordset($3::jsonb) as t(
         source text,
         external_id text,
         card_print_id uuid
       )
     )
     select 'target_set' as row_type, s.id::text as row_id, s.code as set_code,
            null::text as card_number, s.name as card_name, null::text as finish_key,
            null::text as source, null::text as external_id
     from public.sets s
     where lower(coalesce(s.code, '')) = 'svp'
     union all
     select 'existing_parent_exact', cp.id::text, cp.set_code,
            coalesce(cp.number_plain, cp.number), cp.name, null::text, null::text, null::text
     from parent_target target
     join public.card_prints cp
       on cp.id = target.card_print_id
       or (
         lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
         and coalesce(cp.number_plain, cp.number, '') = target.number_plain
         and lower(coalesce(cp.printed_identity_modifier, '')) = ''
         and lower(coalesce(cp.name, '')) = lower(target.card_name)
       )
     union all
     select 'existing_child_exact', cpr.id::text, cp.set_code,
            coalesce(cp.number_plain, cp.number), cp.name, cpr.finish_key, null::text, null::text
     from child_target target
     join public.card_printings cpr
       on cpr.id = target.card_printing_id
       or (cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key)
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'external_mapping_collision', em.id::text, cp.set_code,
            coalesce(cp.number_plain, cp.number), cp.name, null::text, em.source, em.external_id
     from mapping_target target
     join public.external_mappings em on em.source = target.source and em.external_id = target.external_id
     left join public.card_prints cp on cp.id = em.card_print_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, source nulls last, external_id nulls last, row_id`,
    [JSON.stringify(plan.parentRows), JSON.stringify(plan.childRows), JSON.stringify(plan.mappingRows)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: hash(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

function validateAfter(snapshot, plan) {
  const findings = [];
  const counts = snapshot.counts ?? {};
  if ((counts.target_set ?? 0) !== 1) findings.push('target_set_not_1');
  if ((counts.existing_parent_exact ?? 0) !== plan.parentRows.length) findings.push('inserted_parent_readback_mismatch');
  if ((counts.existing_child_exact ?? 0) !== plan.childRows.length) findings.push('inserted_child_readback_mismatch');
  if ((counts.external_mapping_collision ?? 0) !== plan.mappingRows.length) findings.push('inserted_mapping_readback_mismatch');
  return findings;
}

async function applyPackage(client, plan, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, plan);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg13c_parent_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         live_set_code text not null,
         card_number text not null,
         number_plain text not null,
         card_name text not null,
         rarity text null,
         external_ids jsonb not null,
         ai_metadata jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg13c_child_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg13c_mapping_targets (
         source text not null,
         external_id text not null,
         card_print_id uuid not null,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg13c_parent_targets
       select row.card_print_id::uuid, row.set_id::uuid, row.live_set_code, row.card_number,
              row.number_plain, row.card_name, row.rarity, row.external_ids, row.ai_metadata
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         live_set_code text,
         card_number text,
         number_plain text,
         card_name text,
         rarity text,
         external_ids jsonb,
         ai_metadata jsonb
       )`,
      [JSON.stringify(plan.parentRows)],
    );
    await client.query(
      `insert into pkg13c_child_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key,
              row.provenance_source, row.provenance_ref, row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(plan.childRows)],
    );
    await client.query(
      `insert into pkg13c_mapping_targets
       select row.source, row.external_id, row.card_print_id::uuid, row.meta
       from jsonb_to_recordset($1::jsonb) as row(
         source text,
         external_id text,
         card_print_id text,
         meta jsonb
       )`,
      [JSON.stringify(plan.mappingRows)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg13c_parent_targets) as parent_rows,
         (select count(*)::int from pkg13c_child_targets) as child_rows,
         (select count(*)::int from pkg13c_mapping_targets) as mapping_rows,
         (select count(*)::int from pkg13c_child_targets child left join public.finish_keys fk on fk.key = child.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows,
         (select count(*)::int from pkg13c_parent_targets target join public.card_prints cp
          on lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
         and coalesce(cp.number_plain, cp.number, '') = target.number_plain
         and lower(coalesce(cp.printed_identity_modifier, '')) = ''
         and lower(coalesce(cp.name, '')) = lower(target.card_name)) as parent_collisions,
         (select count(*)::int from pkg13c_child_targets target join public.card_printings cpr
          on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key) as child_collisions,
         (select count(*)::int from pkg13c_mapping_targets target join public.external_mappings em
          on em.source = target.source and em.external_id = target.external_id) as mapping_collisions`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.parent_rows !== plan.parentRows.length ||
      guardRow.child_rows !== plan.childRows.length ||
      guardRow.mapping_rows !== plan.mappingRows.length ||
      guardRow.inactive_finish_rows !== 0 ||
      guardRow.parent_collisions !== 0 ||
      guardRow.child_collisions !== 0 ||
      guardRow.mapping_collisions !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, set_id, set_code, number, name, rarity, variant_key, external_ids, ai_metadata
       )
       select card_print_id, set_id, live_set_code, card_number, card_name,
              rarity, ''::text, external_ids, ai_metadata
       from pkg13c_parent_targets`,
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select source, external_id, card_print_id, meta
       from pkg13c_mapping_targets`,
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source, provenance_ref, created_by
       )
       select card_printing_id, card_print_id, finish_key, false, provenance_source, provenance_ref, created_by
       from pkg13c_child_targets`,
    );
    const proof = await client.query(
      `select $1::text as package_id,
              $2::text as package_fingerprint,
              (select count(*)::int from pkg13c_parent_targets) as planned_parent_rows,
              (select count(*)::int from pkg13c_child_targets) as planned_child_rows,
              (select count(*)::int from pkg13c_mapping_targets) as planned_mapping_rows`,
      [PACKAGE_ID, fingerprint],
    );
    if (
      parentInsert.rowCount !== plan.parentRows.length ||
      childInsert.rowCount !== plan.childRows.length ||
      mappingInsert.rowCount !== plan.mappingRows.length
    ) {
      throw new Error('insert count mismatch');
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, plan);
    const afterFindings = validateAfter(afterSnapshot, plan);
    return {
      apply_status: afterFindings.length ? 'committed_but_after_validation_failed' : 'pkg13c_svp_holo_parent_child_insert_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: proof.rows,
      guard: guardRow,
      write_counts: {
        parent_inserts: parentInsert.rowCount,
        child_inserts: childInsert.rowCount,
        external_mapping_inserts: mappingInsert.rowCount,
        deletes: 0,
        merges: 0,
      },
      stop_findings: afterFindings,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, plan).catch(() => beforeSnapshot);
    return {
      apply_status: 'pkg13c_svp_holo_parent_child_insert_real_apply_failed_rolled_back',
      committed: false,
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: [],
      guard: null,
      write_counts: { parent_inserts: 0, child_inserts: 0, external_mapping_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: [error.message],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-13C SVP Holo Parent+Child Insert Real Apply V1

- package_id: \`${report.package_id}\`
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- apply_status: ${report.execution.apply_status}
- committed: ${report.execution.committed}
- parent_inserts: ${report.execution.write_counts.parent_inserts}
- child_inserts: ${report.execution.write_counts.child_inserts}
- external_mapping_inserts: ${report.execution.write_counts.external_mapping_inserts}
- deletes: ${report.execution.write_counts.deletes}
- merges: ${report.execution.write_counts.merges}
- by_set: ${JSON.stringify(report.scope.by_set)}
- by_finish: ${JSON.stringify(report.scope.by_finish)}
- by_mapping_source: ${JSON.stringify(report.scope.by_mapping_source)}
- dry_run_proof: \`${report.dry_run_proof.before_hash}\` == \`${report.dry_run_proof.after_hash}\`
- tcgdex_finish_conflict_documented: true
- migrations_created: false
- global_apply: false
- unsupported_cleanup: false
- quarantine_performed: false
`;
}

async function updateCheckpointIndex() {
  const line = '| 2026-06-10 | [PKG-13C SVP Holo Parent+Child Insert Real Apply Checkpoint V1](20260610_pkg13c_svp_holo_parent_child_insert_real_apply_checkpoint_v1.md) | Real apply for two SVP TCGplayer-backed holo parent+child inserts after rollback-only proof, with TCGdex normal conflict documented. No migrations, deletes, merges, unsupported cleanup, or quarantine. |';
  let current = '';
  try {
    current = await fs.readFile(CHECKPOINT_INDEX, 'utf8');
  } catch {
    current = '# Master Index Checkpoints\n';
  }
  if (!current.includes('20260610_pkg13c_svp_holo_parent_child_insert_real_apply_checkpoint_v1.md')) {
    await writeText(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL');
  const dryRun = await readJson(DRY_RUN_JSON);
  const validation = validateDryRun(dryRun);
  if (validation.findings.length) throw new Error(`dry-run validation failed: ${validation.findings.join(', ')}`);

  const plan = {
    parentRows: dryRun.scope.parent_rows,
    childRows: dryRun.scope.child_rows,
    mappingRows: dryRun.scope.external_mapping_rows,
  };

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const execution = await applyPackage(client, plan, validation.fingerprint);
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg13c_svp_holo_parent_child_insert_real_apply_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: validation.fingerprint,
      db_write_committed: execution.committed,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      source_conflict_documented: true,
      source_artifacts: {
        guarded_dry_run: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      },
      dry_run_proof: {
        before_hash: dryRun.execution.before_snapshot.hash_sha256,
        after_hash: dryRun.execution.after_snapshot.hash_sha256,
        rollback_verified: dryRun.execution.durable_after_snapshot_matches_before_snapshot,
      },
      scope: {
        target_parent_rows: plan.parentRows.length,
        target_child_rows: plan.childRows.length,
        target_external_mappings: plan.mappingRows.length,
        by_set: countBy(plan.childRows, (row) => row.set_key),
        by_finish: countBy(plan.childRows, (row) => row.finish_key),
        by_mapping_source: countBy(plan.mappingRows, (row) => row.source),
      },
      execution,
    };
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    await writeText(CHECKPOINT_MD, `# PKG-13C SVP Holo Parent+Child Insert Real Apply Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${validation.fingerprint}\`
- Apply status: ${execution.apply_status}
- Committed: ${execution.committed}
- Parent inserts: ${execution.write_counts.parent_inserts}
- Child inserts: ${execution.write_counts.child_inserts}
- External mapping inserts: ${execution.write_counts.external_mapping_inserts}
- Deletes: ${execution.write_counts.deletes}
- Merges: ${execution.write_counts.merges}
- Dry-run proof: \`${dryRun.execution.before_snapshot.hash_sha256}\` == \`${dryRun.execution.after_snapshot.hash_sha256}\`
- TCGdex normal finish conflict documented: true
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
`);
    await updateCheckpointIndex();
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      fingerprint_sha256: validation.fingerprint,
      apply_status: execution.apply_status,
      committed: execution.committed,
      scope: report.scope,
      write_counts: execution.write_counts,
      stop_findings: execution.stop_findings,
      dry_run_proof: `${dryRun.execution.before_snapshot.hash_sha256} == ${dryRun.execution.after_snapshot.hash_sha256}`,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
