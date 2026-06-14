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
const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08y_host_subset_relocation_cleanup_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08Y-HOST-SUBSET-RELOCATION-CLEANUP';
const PACKAGE_FINGERPRINT = 'c315ae87967cdde2c6e81343cefe0953c78e958c25ba6f372b52daa99c193ce6';
const DRY_RUN_PROOF_HASH = '2e6509a775673e06289018353f9908835dcddb4f646dd2d06f2c1023f8da12aa';
const APPROVAL_TEXT = 'Approve real PKG-08Y-HOST-SUBSET-RELOCATION-CLEANUP apply only. Fingerprint: c315ae87967cdde2c6e81343cefe0953c78e958c25ba6f372b52daa99c193ce6. Scope: 25 parent relocations from swsh45sv to swsh4.5, 25 normal child printings preserved, 50 unsupported extra child printings deleted (holo=25, reverse=25), existing external mappings preserved. Dry-run proof: 2e6509a775673e06289018353f9908835dcddb4f646dd2d06f2c1023f8da12aa == 2e6509a775673e06289018353f9908835dcddb4f646dd2d06f2c1023f8da12aa. No global apply. No migrations. No merges. No quarantine.';

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

function validatePrerequisites({ gate, dryRun, targets }) {
  const findings = [];
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('gate_not_ready');
  if (gate.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (gate.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('gate_fingerprint_mismatch');
  if (gate.source_summary?.before_hash !== DRY_RUN_PROOF_HASH || gate.source_summary?.after_hash !== DRY_RUN_PROOF_HASH) findings.push('gate_dry_run_proof_hash_mismatch');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08y_host_subset_relocation_cleanup_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_rollback_proof_not_true');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (targets.length !== 25) findings.push(`target_count_not_25:${targets.length}`);
  if (targets.some((row) => row.from_set_code !== 'swsh45sv' || row.to_set_code !== 'swsh4.5')) findings.push('non_swsh45sv_to_swsh4_5_target_present');
  if (targets.some((row) => row.target_finish_key !== 'normal')) findings.push('non_normal_target_finish_present');
  if (targets.some((row) => (row.extra_child_printing_ids ?? []).length !== 2)) findings.push('target_extra_child_count_not_2');
  if (targets.flatMap((row) => row.extra_child_finishes ?? []).some((finish) => !['holo', 'reverse'].includes(finish))) findings.push('unexpected_extra_child_finish_present');
  return findings;
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
       (select count(*)::int from public.card_prints where id = any($1::uuid[]) and lower(set_code) = 'swsh45sv') as swsh45sv_parent_rows,
       (select count(*)::int from public.card_prints where id = any($1::uuid[]) and lower(set_code) = 'swsh4.5') as swsh45_parent_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[])) as tracked_child_rows,
       (select count(*)::int from public.card_printings where id = any($3::uuid[]) and finish_key = 'normal') as normal_child_rows,
       (select count(*)::int from public.card_printings where id = any($4::uuid[]) and finish_key in ('holo', 'reverse')) as extra_child_rows,
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[]) and source = 'tcgdex') as tcgdex_mapping_rows`,
    [
      parentIds,
      childIds,
      targets.map((row) => row.target_child_printing_id),
      targets.flatMap((row) => row.extra_child_printing_ids),
    ],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: refResult.rows[0],
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const before = beforeSnapshot.impact_counts;
  const beforeFindings = [];
  if (before.parent_rows !== 25) beforeFindings.push(`before_parent_rows_not_25:${before.parent_rows}`);
  if (before.swsh45sv_parent_rows !== 25) beforeFindings.push(`before_swsh45sv_parent_rows_not_25:${before.swsh45sv_parent_rows}`);
  if (before.swsh45_parent_rows !== 0) beforeFindings.push(`before_swsh4_5_parent_rows_present:${before.swsh45_parent_rows}`);
  if (before.normal_child_rows !== 25) beforeFindings.push(`before_normal_child_rows_not_25:${before.normal_child_rows}`);
  if (before.extra_child_rows !== 50) beforeFindings.push(`before_extra_child_rows_not_50:${before.extra_child_rows}`);
  if (before.tcgdex_mapping_rows !== 25) beforeFindings.push(`before_tcgdex_mapping_rows_not_25:${before.tcgdex_mapping_rows}`);
  if (beforeFindings.length) {
    return {
      apply_status: 'blocked_before_real_apply_live_shape_mismatch',
      committed: false,
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      proof_rows: [],
      write_counts: {},
      stop_findings: beforeFindings,
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
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
      [JSON.stringify(targets), targetSet.rows[0].id, targetSet.rows[0].code],
    );
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
    const guard = guards.rows[0];
    if (
      guard.source_parent_rows !== 25 ||
      guard.target_parent_collisions !== 0 ||
      guard.normal_children_to_preserve !== 25 ||
      guard.extra_children_to_delete !== 50 ||
      guard.extra_external_printing_mapping_refs !== 0 ||
      guard.extra_vault_instance_refs !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guard)}`);
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
    if (childDelete.rowCount !== 50 || parentUpdate.rowCount !== 25) {
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
         (select count(*)::int from public.card_printings cpr join pkg08y_targets t on cpr.id = t.target_child_printing_id and cpr.finish_key = 'normal') as normal_children_preserved,
         (select count(*)::int from public.card_prints cp join pkg08y_targets t on t.card_print_id = cp.id and lower(cp.set_code) = 'swsh4.5') as relocated_parent_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT, childDelete.rowCount],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg08y_host_subset_relocation_cleanup_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: proof.rows,
      write_counts: {
        parent_updates: parentUpdate.rowCount,
        child_deletes: childDelete.rowCount,
      },
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      apply_status: 'pkg08y_host_subset_relocation_cleanup_failed_rolled_back',
      committed: false,
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: [],
      write_counts: {},
      stop_findings: [`real_apply_error:${error.message}`],
    };
  }
}

function validateAfter(applyResult) {
  const after = applyResult.after_snapshot?.impact_counts ?? {};
  const findings = [];
  if (after.parent_rows !== 25) findings.push(`after_parent_rows_not_25:${after.parent_rows}`);
  if (after.swsh45sv_parent_rows !== 0) findings.push(`after_swsh45sv_parent_rows_present:${after.swsh45sv_parent_rows}`);
  if (after.swsh45_parent_rows !== 25) findings.push(`after_swsh4_5_parent_rows_not_25:${after.swsh45_parent_rows}`);
  if (after.normal_child_rows !== 25) findings.push(`after_normal_child_rows_not_25:${after.normal_child_rows}`);
  if (after.extra_child_rows !== 0) findings.push(`after_extra_child_rows_present:${after.extra_child_rows}`);
  if (after.tcgdex_mapping_rows !== 25) findings.push(`after_tcgdex_mapping_rows_not_25:${after.tcgdex_mapping_rows}`);
  return findings;
}

function renderMarkdown(report) {
  const finishRows = Object.entries(report.scope.extra_child_deletes_by_finish ?? {}).map(([finish, count]) => [finish, count]);
  return `# PKG-08Y Host/Subset Relocation Cleanup Real Apply V1

Approved real apply for the Shining Fates host/subset relocation cleanup package.

## Result

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- db_write_committed: ${report.db_write_committed}
- parent_updates: ${report.write_counts.parent_updates ?? 0}
- child_deletes: ${report.write_counts.child_deletes ?? 0}
- migrations_created: ${report.migrations_created}
- global_apply_performed: ${report.global_apply_performed}
- merges_performed: ${report.merges_performed}
- quarantine_performed: ${report.quarantine_performed}
- stop_findings: ${report.stop_findings.length}

## Scope

- parent_relocations: ${report.scope.parent_relocations}
- normal_children_preserved: ${report.scope.normal_children_preserved}
- extra_child_deletes: ${report.scope.extra_child_deletes}

${markdownTable(['extra_finish', 'rows'], finishRows)}

## Verification

- before_swsh45sv_parent_rows: ${report.before_snapshot?.impact_counts?.swsh45sv_parent_rows ?? 'missing'}
- after_swsh4_5_parent_rows: ${report.after_snapshot?.impact_counts?.swsh45_parent_rows ?? 'missing'}
- after_extra_child_rows: ${report.after_snapshot?.impact_counts?.extra_child_rows ?? 'missing'}
- after_tcgdex_mapping_rows: ${report.after_snapshot?.impact_counts?.tcgdex_mapping_rows ?? 'missing'}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08Y Host/Subset Relocation Cleanup Real Apply Checkpoint V1](20260610_pkg08y_host_subset_relocation_cleanup_real_apply_checkpoint_v1.md) | Real-applies approved 25 swsh45sv -> swsh4.5 parent relocations and removes 50 unsupported holo/reverse child printings. No migrations, merges, global apply, or quarantine. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08y_host_subset_relocation_cleanup_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08y_host_subset_relocation_cleanup_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = await readJson(GATE_JSON);
const dryRun = await readJson(DRY_RUN_JSON);
const targets = dryRun.scope?.target_rows_detail ?? [];
const prerequisiteFindings = validatePrerequisites({ gate, dryRun, targets });
const conn = connectionString();
let applyResult;

if (!conn) {
  applyResult = {
    apply_status: 'blocked_no_database_connection_string',
    committed: false,
    error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
    before_snapshot: null,
    after_snapshot: null,
    proof_rows: [],
    write_counts: {},
    stop_findings: ['database_connection_unavailable'],
  };
} else if (prerequisiteFindings.length) {
  applyResult = {
    apply_status: 'blocked_prerequisite_findings_present',
    committed: false,
    error_message: prerequisiteFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    proof_rows: [],
    write_counts: {},
    stop_findings: prerequisiteFindings,
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    applyResult = await applyPackage(client, targets);
  } finally {
    await client.end().catch(() => {});
  }
}

const afterFindings = applyResult.committed ? validateAfter(applyResult) : [];
const stopFindings = [
  ...(applyResult.stop_findings ?? []),
  ...(applyResult.error_message && !applyResult.stop_findings?.length ? [`apply_error:${applyResult.error_message}`] : []),
  ...afterFindings,
];
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  approval_text: APPROVAL_TEXT,
  apply_status: applyResult.committed && stopFindings.length === 0
    ? applyResult.apply_status
    : applyResult.apply_status === 'pkg08y_host_subset_relocation_cleanup_real_apply_committed'
      ? 'committed_with_post_apply_findings'
      : applyResult.apply_status,
  db_write_committed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: applyResult.committed,
  unsupported_cleanup_performed: applyResult.committed,
  quarantine_performed: false,
  global_apply_performed: false,
  merges_performed: false,
  scope: {
    source_rows: targets.length,
    parent_relocations: 25,
    normal_children_preserved: 25,
    extra_child_deletes: 50,
    extra_child_deletes_by_finish: countBy(targets.flatMap((row) => row.extra_child_finishes), (finish) => finish),
    targets,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  proof_rows: applyResult.proof_rows,
  write_counts: applyResult.write_counts,
  stop_findings: stopFindings,
  pass: applyResult.committed && stopFindings.length === 0,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
  output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  apply_status: report.apply_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  write_counts: report.write_counts,
  before_counts: report.before_snapshot?.impact_counts ?? null,
  after_counts: report.after_snapshot?.impact_counts ?? null,
  db_write_committed: report.db_write_committed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings,
}, null, 2));

if (!report.pass) process.exitCode = 1;
