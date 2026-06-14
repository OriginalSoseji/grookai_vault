import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08x_host_subset_finish_impact_plan_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08Y-HOST-SUBSET-RELOCATION-CLEANUP';

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

function buildTargets(sourceRows) {
  const targets = [];
  const blocked = [];
  for (const row of sourceRows) {
    const targetChildren = row.target_child_printings_to_preserve ?? [];
    const extraChildren = row.extra_child_printings_impacted ?? [];
    const durableDepTotal = extraChildren.reduce((sum, child) => sum + Number(child.durable_dependency_total ?? 0), 0);
    if (targetChildren.length !== 1 || extraChildren.length !== 2 || durableDepTotal !== 0) {
      blocked.push({
        ...row,
        blocked_reason: 'expected_one_target_child_two_extra_children_and_zero_durable_dependencies',
        target_child_count: targetChildren.length,
        extra_child_count: extraChildren.length,
        durable_dependency_total: durableDepTotal,
      });
      continue;
    }
    targets.push({
      card_print_id: row.mapped_parent.card_print_id,
      from_set_code: row.mapped_parent.set_code,
      to_set_code: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: row.target_finish_key,
      target_child_printing_id: targetChildren[0].card_printing_id,
      extra_child_printing_ids: extraChildren.map((child) => child.card_printing_id).sort(),
      extra_child_finishes: extraChildren.map((child) => child.finish_key).sort(),
      tcgdex_external_id: row.mapped_parent.external_id,
      evidence_urls: row.evidence_urls ?? [],
    });
  }
  return { targets, blocked };
}

async function captureSnapshot(client, targets) {
  const parentIds = targets.map((row) => row.card_print_id);
  const childIds = [
    ...targets.map((row) => row.target_child_printing_id),
    ...targets.flatMap((row) => row.extra_child_printing_ids),
  ];
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_id::text as set_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       coalesce((
         select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
            or cpr.id = any($2::uuid[])
       ), '[]'::jsonb) as card_printings,
       coalesce((
         select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
         from public.external_mappings em
         where em.card_print_id = cp.id
       ), '[]'::jsonb) as external_mappings
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, cp.number, cp.name, cp.id`,
    [parentIds, childIds],
  );
  const refResult = await client.query(
    `select
       (select count(*)::int from public.card_prints where id = any($1::uuid[])) as parent_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[])) as tracked_child_rows,
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as external_mapping_rows`,
    [parentIds, childIds],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: refResult.rows[0],
  };
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '90s'");
    await client.query(
      `create temporary table pkg08y_targets (
         card_print_id uuid primary key,
         from_set_code text not null,
         to_set_id uuid not null,
         to_set_code text not null,
         card_number text not null,
         card_name text not null,
         target_child_printing_id uuid not null,
         extra_child_printing_ids uuid[] not null
       ) on commit drop`,
    );
    const targetSet = await client.query(
      `select id::text, code, name
       from public.sets
       where game = 'pokemon'
         and lower(code) = 'swsh4.5'`,
    );
    if (targetSet.rows.length !== 1) throw new Error(`expected_one_swsh4.5_set_found_${targetSet.rows.length}`);
    const targetSetRow = targetSet.rows[0];
    await client.query(
      `insert into pkg08y_targets
       select
         row.card_print_id::uuid,
         row.from_set_code,
         $2::uuid,
         $3::text,
         row.card_number,
         row.card_name,
         row.target_child_printing_id::uuid,
         row.extra_child_printing_ids::uuid[]
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         from_set_code text,
         card_number text,
         card_name text,
         target_child_printing_id text,
         extra_child_printing_ids text[]
       )`,
      [JSON.stringify(targets), targetSetRow.id, targetSetRow.code],
    );
    const shape = await client.query(
      `select
         count(*)::int as target_rows,
         count(*) filter (where from_set_code <> 'swsh45sv')::int as non_swsh45sv_rows,
         sum(array_length(extra_child_printing_ids, 1))::int as extra_child_rows
       from pkg08y_targets`,
    );
    const shapeRow = shape.rows[0];
    if (shapeRow.target_rows !== targets.length || shapeRow.non_swsh45sv_rows !== 0 || shapeRow.extra_child_rows !== targets.length * 2) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    await client.query(
      `select cp.id
       from public.card_prints cp
       join pkg08y_targets target on target.card_print_id = cp.id
       for update of cp`,
    );
    const guards = await client.query(
      `select
         (select count(*)::int from public.card_prints cp join pkg08y_targets t on t.card_print_id = cp.id and lower(cp.set_code) = lower(t.from_set_code)) as source_parent_rows,
         (select count(*)::int from public.card_prints cp join pkg08y_targets t on lower(cp.set_code) = lower(t.to_set_code) and cp.number = t.card_number and lower(cp.name) = lower(t.card_name) and cp.id <> t.card_print_id) as target_parent_collisions,
         (select count(*)::int from public.card_printings cpr join pkg08y_targets t on cpr.id = t.target_child_printing_id and cpr.card_print_id = t.card_print_id and cpr.finish_key = 'normal') as normal_children_to_preserve,
         (select count(*)::int from public.card_printings cpr join pkg08y_targets t on cpr.id = any(t.extra_child_printing_ids) and cpr.card_print_id = t.card_print_id and cpr.finish_key in ('holo', 'reverse')) as extra_children_to_delete,
         (select count(*)::int from public.external_printing_mappings epm join pkg08y_targets t on epm.card_printing_id = any(t.extra_child_printing_ids)) as extra_external_printing_mapping_refs,
         (select count(*)::int from public.vault_item_instances vii join pkg08y_targets t on vii.card_printing_id = any(t.extra_child_printing_ids)) as extra_vault_instance_refs`,
    );
    const guardRow = guards.rows[0];
    if (
      guardRow.source_parent_rows !== targets.length ||
      guardRow.target_parent_collisions !== 0 ||
      guardRow.normal_children_to_preserve !== targets.length ||
      guardRow.extra_children_to_delete !== targets.length * 2 ||
      guardRow.extra_external_printing_mapping_refs !== 0 ||
      guardRow.extra_vault_instance_refs !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guardRow)}`);
    }
    const childDelete = await client.query(
      `delete from public.card_printings cpr
       using pkg08y_targets target
       where cpr.id = any(target.extra_child_printing_ids)`,
    );
    const parentUpdate = await client.query(
      `update public.card_prints cp
       set set_id = target.to_set_id,
           set_code = target.to_set_code,
           ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
             'pkg08y_relocated_from_set_code', cp.set_code,
             'pkg08y_package_id', $1::text
           )
       from pkg08y_targets target
       where cp.id = target.card_print_id`,
      [PACKAGE_ID],
    );
    if (childDelete.rowCount !== targets.length * 2 || parentUpdate.rowCount !== targets.length) {
      throw new Error(`write count mismatch: ${JSON.stringify({
        child_deletes: childDelete.rowCount,
        parent_updates: parentUpdate.rowCount,
      })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08y_targets) as parent_relocations,
         $3::int as extra_child_deletes,
         (select count(*)::int from public.card_printings cpr join pkg08y_targets t on cpr.id = t.target_child_printing_id and cpr.finish_key = 'normal') as normal_children_preserved`,
      [PACKAGE_ID, packageFingerprint, childDelete.rowCount],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg08y_host_subset_relocation_cleanup_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
      simulated_parent_updates: parentUpdate.rowCount,
      simulated_child_deletes: childDelete.rowCount,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg08y_host_subset_relocation_cleanup_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
      simulated_parent_updates: 0,
      simulated_child_deletes: 0,
    };
  }
}

function renderMarkdown(report) {
  const finishRows = Object.entries(report.scope?.extra_child_deletes_by_finish ?? {}).map(([finish, count]) => [finish, count]);
  return `# PKG-08Y Host/Subset Relocation Cleanup Guarded Dry Run V1

Rollback-only dry run for relocating Shining Fates Shiny Vault parents from \`swsh45sv\` to \`swsh4.5\`, preserving \`normal\` children and deleting only unsupported extra \`holo\`/\`reverse\` children inside the rolled-back transaction.

## Safety

- rollback_only: ${report.rollback_only}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- real_apply_authorized: ${report.real_apply_authorized}

## Scope

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? ''}\`
- parent_relocations: ${report.scope?.parent_relocations ?? 0}
- normal_children_preserved: ${report.scope?.normal_children_preserved ?? 0}
- extra_child_delete_simulation: ${report.scope?.extra_child_delete_simulation ?? 0}
- blocked_rows: ${report.scope?.blocked_rows ?? 0}

${markdownTable(['extra_finish', 'rows'], finishRows)}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Approval Boundary

This is rollback-only proof. It does not authorize real apply.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08Y Host/Subset Relocation Cleanup Guarded Dry Run Checkpoint V1](20260610_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for swsh45sv -> swsh4.5 relocation with exact extra child cleanup. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => (
  row.impact_status === 'relocation_plus_extra_finish_cleanup_dry_run_candidate_derived_view_refs_only'
));
const { targets, blocked } = buildTargets(sourceRows);
const packageFingerprint = sha256(stableJson(targets.map((row) => ({
  card_print_id: row.card_print_id,
  from_set_code: row.from_set_code,
  to_set_code: row.to_set_code,
  card_number: row.card_number,
  card_name: row.card_name,
  target_child_printing_id: row.target_child_printing_id,
  extra_child_printing_ids: row.extra_child_printing_ids,
}))));
const conn = connectionString();
let report;

if (!conn) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_status: 'blocked_no_database_connection_string',
    durable_db_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    stop_findings: ['database_connection_unavailable'],
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const execution = targets.length > 0 && blocked.length === 0
      ? await runDryRun(client, targets, packageFingerprint)
      : {
        status: 'blocked_no_targets_or_blocked_rows_present',
        error_message: blocked.length ? 'blocked_rows_present' : 'no_targets',
        before_snapshot: null,
        after_snapshot: null,
        rollback_proof_rows: [],
        simulated_parent_updates: 0,
        simulated_child_deletes: 0,
      };
    const durableMatch = Boolean(execution.before_snapshot?.hash_sha256)
      && execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256;
    const stopFindings = [
      ...(sourceRows.length !== 25 ? [`source_rows_not_25:${sourceRows.length}`] : []),
      ...(targets.length !== 25 ? [`target_rows_not_25:${targets.length}`] : []),
      ...(blocked.length ? ['blocked_target_rows_present'] : []),
      ...(execution.status !== 'pkg08y_host_subset_relocation_cleanup_completed_rolled_back_no_durable_change' ? ['dry_run_not_passed'] : []),
      ...(execution.error_message ? [`dry_run_error:${execution.error_message}`] : []),
      ...(!durableMatch ? ['durable_after_snapshot_differs_from_before_snapshot'] : []),
      ...(execution.simulated_parent_updates !== 25 ? [`simulated_parent_updates_not_25:${execution.simulated_parent_updates}`] : []),
      ...(execution.simulated_child_deletes !== 50 ? [`simulated_child_deletes_not_50:${execution.simulated_child_deletes}`] : []),
    ];
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      source_pkg08x_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
      audit_only: false,
      rollback_only: true,
      dry_run_status: execution.status,
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_authorized: false,
      scope: {
        source_rows: sourceRows.length,
        parent_relocations: targets.length,
        normal_children_preserved: targets.length,
        extra_child_delete_simulation: targets.length * 2,
        blocked_rows: blocked.length,
        extra_child_deletes_by_finish: countBy(targets.flatMap((row) => row.extra_child_finishes), (finish) => finish),
        target_rows_detail: targets,
        blocked_rows_detail: blocked,
      },
      before_snapshot: execution.before_snapshot,
      after_snapshot: execution.after_snapshot,
      rollback_proof_rows: execution.rollback_proof_rows,
      simulated_parent_updates: execution.simulated_parent_updates,
      simulated_child_deletes: execution.simulated_child_deletes,
      durable_after_snapshot_matches_before_snapshot: durableMatch,
      recommended_real_apply_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 25 parent relocations from swsh45sv to swsh4.5, 25 normal child printings preserved, 50 unsupported extra child printings deleted (holo=25, reverse=25), existing external mappings preserved. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No merges. No quarantine.`
        : null,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
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
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
  output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  before_hash: report.before_snapshot?.hash_sha256 ?? null,
  after_hash: report.after_snapshot?.hash_sha256 ?? null,
  durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  durable_db_writes_performed: false,
  db_writes_performed: false,
  migrations_created: false,
  stop_findings: report.stop_findings,
}, null, 2));

if ((report.stop_findings ?? []).length !== 0) process.exitCode = 1;
