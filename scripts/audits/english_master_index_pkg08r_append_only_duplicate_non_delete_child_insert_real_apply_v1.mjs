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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08r_append_only_duplicate_non_delete_child_insert_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08R-APPEND-ONLY-DUPLICATE-NON-DELETE-CHILD-INSERT';
const PACKAGE_FINGERPRINT = 'ab7fe98f70f60608e69647870097a7b54d6aafb335a66e8ae7729cda019d2d9f';
const DRY_RUN_PROOF_HASH = '21ed1da49549e0f099822b033ba51af3503bbc5edaeadcbe90d78af88f5a5987';
const APPROVAL_TEXT = 'Approve real PKG-08R-APPEND-ONLY-DUPLICATE-NON-DELETE-CHILD-INSERT apply only. Fingerprint: ab7fe98f70f60608e69647870097a7b54d6aafb335a66e8ae7729cda019d2d9f. Scope: 1 child-only card_printing insert for sv03.5/151 Pikachu #025 cosmos on canonical parent 85d64fe0-be9a-4760-a1a6-51dadcc88a7d; preserved Pokemon Together stamped parent a058c87e-0779-4e90-b60e-81d8c90b0b50 remains untouched with append-only feed history. Dry-run proof: 21ed1da49549e0f099822b033ba51af3503bbc5edaeadcbe90d78af88f5a5987 == 21ed1da49549e0f099822b033ba51af3503bbc5edaeadcbe90d78af88f5a5987. No parent writes. No dependency transfers. No deletes. No global apply. No migrations. No unsupported cleanup. No quarantine.';

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

async function captureSnapshot(client, target) {
  const ids = [target.survivor_card_print_id, target.preserved_duplicate_card_print_id];
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.gv_id,
       cp.printed_identity_modifier,
       cp.set_identity_model,
       case
         when cp.id = $1::uuid then 'canonical_survivor_parent'
         when cp.id = $2::uuid then 'preserved_append_only_variant_parent'
         else 'unknown'
       end as target_role,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as card_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
       coalesce((select count(*)::int from public.card_feed_events cfe where cfe.card_print_id = cp.id), 0) as card_feed_event_count,
       coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
       coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_instance_count,
       coalesce((select count(*)::int from public.shared_cards sc where sc.card_id = cp.id), 0) as shared_card_count,
       coalesce((select count(*)::int from public.pricing_watch pw where pw.card_print_id = cp.id), 0) as pricing_watch_count
     from public.card_prints cp
     where cp.id = any($3::uuid[])
     order by target_role, cp.id`,
    [target.survivor_card_print_id, target.preserved_duplicate_card_print_id, ids],
  );
  const counts = await client.query(
    `select
       (select count(*)::int from public.card_prints where id = $1::uuid) as survivor_parent_rows,
       (select count(*)::int from public.card_prints where id = $2::uuid) as preserved_duplicate_parent_rows,
       (select count(*)::int from public.card_printings where card_print_id = $1::uuid and finish_key = $3::text) as survivor_target_child_rows,
       (select count(*)::int from public.card_printings where card_print_id = $2::uuid) as preserved_duplicate_child_rows,
       (select count(*)::int from public.card_feed_events where card_print_id = $2::uuid) as preserved_duplicate_feed_rows,
       (select count(*)::int from public.external_mappings where card_print_id = $2::uuid) as preserved_duplicate_mapping_rows,
       (select count(*)::int from public.vault_items where card_id = $2::uuid) as preserved_duplicate_vault_rows,
       (select count(*)::int from public.vault_item_instances where card_print_id = $2::uuid) as preserved_duplicate_vault_instance_rows,
       (select count(*)::int from public.shared_cards where card_id = $2::uuid) as preserved_duplicate_shared_card_rows`,
    [target.survivor_card_print_id, target.preserved_duplicate_card_print_id, target.finish_key],
  );
  const rows = result.rows;
  const preservedRow = rows.find((row) => row.target_role === 'preserved_append_only_variant_parent');
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    preserved_parent_hash_sha256: sha256(stableJson(preservedRow)),
    impact_counts: counts.rows[0],
  };
}

function validateDryRun(dryRun, target) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08r_append_only_duplicate_non_delete_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_match_not_true');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (target?.survivor_card_print_id !== '85d64fe0-be9a-4760-a1a6-51dadcc88a7d') findings.push('wrong_survivor_parent');
  if (target?.preserved_duplicate_card_print_id !== 'a058c87e-0779-4e90-b60e-81d8c90b0b50') findings.push('wrong_preserved_parent');
  if (target?.finish_key !== 'cosmos') findings.push('wrong_finish_key');
  return findings;
}

function validateBefore(snapshot) {
  const counts = snapshot?.impact_counts ?? {};
  const findings = [];
  if (snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('fresh_before_hash_mismatch');
  if (counts.survivor_parent_rows !== 1) findings.push('before_survivor_parent_rows_not_1');
  if (counts.preserved_duplicate_parent_rows !== 1) findings.push('before_preserved_parent_rows_not_1');
  if (counts.survivor_target_child_rows !== 0) findings.push('before_survivor_cosmos_already_present');
  if (counts.preserved_duplicate_child_rows !== 0) findings.push('before_preserved_parent_child_rows_present');
  if (counts.preserved_duplicate_feed_rows !== 1) findings.push('before_preserved_feed_rows_not_1');
  return findings;
}

function validateAfter(beforeSnapshot, afterSnapshot) {
  const counts = afterSnapshot?.impact_counts ?? {};
  const findings = [];
  if (counts.survivor_parent_rows !== 1) findings.push('after_survivor_parent_rows_not_1');
  if (counts.preserved_duplicate_parent_rows !== 1) findings.push('after_preserved_parent_rows_not_1');
  if (counts.survivor_target_child_rows !== 1) findings.push('after_survivor_cosmos_not_inserted');
  if (counts.preserved_duplicate_child_rows !== 0) findings.push('after_preserved_parent_child_rows_present');
  if (counts.preserved_duplicate_feed_rows !== 1) findings.push('after_preserved_feed_rows_not_1');
  if (counts.preserved_duplicate_mapping_rows !== 2) findings.push('after_preserved_mapping_rows_changed');
  if (counts.preserved_duplicate_vault_rows !== 1) findings.push('after_preserved_vault_rows_changed');
  if (counts.preserved_duplicate_vault_instance_rows !== 1) findings.push('after_preserved_vault_instance_rows_changed');
  if (counts.preserved_duplicate_shared_card_rows !== 1) findings.push('after_preserved_shared_card_rows_changed');
  if (beforeSnapshot?.preserved_parent_hash_sha256 !== afterSnapshot?.preserved_parent_hash_sha256) {
    findings.push('preserved_parent_snapshot_changed');
  }
  return findings;
}

async function applyPackage(client, target) {
  const beforeSnapshot = await captureSnapshot(client, target);
  const beforeFindings = validateBefore(beforeSnapshot);
  if (beforeFindings.length) {
    return {
      apply_status: 'blocked_before_snapshot_findings_present',
      error_message: beforeFindings.join(', '),
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      committed: false,
      proof_rows: [],
    };
  }
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08r_target (
         card_printing_id uuid primary key,
         survivor_card_print_id uuid not null,
         preserved_duplicate_card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08r_target
       values ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::text, $7::text)`,
      [
        target.card_printing_id,
        target.survivor_card_print_id,
        target.preserved_duplicate_card_print_id,
        target.finish_key,
        target.provenance_source,
        target.provenance_ref,
        target.created_by,
      ],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg08r_target) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg08r_target t on t.survivor_card_print_id = cp.id) as survivor_rows,
         (select count(*)::int from public.card_prints cp join pkg08r_target t on t.preserved_duplicate_card_print_id = cp.id) as preserved_duplicate_rows,
         (select count(*)::int from public.card_printings cpr join pkg08r_target t on t.survivor_card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as survivor_existing_finish_rows,
         (select count(*)::int from public.card_printings cpr join pkg08r_target t on t.preserved_duplicate_card_print_id = cpr.card_print_id) as preserved_duplicate_child_rows,
         (select count(*)::int from public.card_printings cpr join pkg08r_target t on t.card_printing_id = cpr.id) as planned_child_id_collisions,
         (select count(*)::int from public.card_feed_events cfe join pkg08r_target t on t.preserved_duplicate_card_print_id = cfe.card_print_id) as preserved_duplicate_feed_rows,
         (select count(*)::int from public.card_prints cp join pkg08r_target t on t.preserved_duplicate_card_print_id = cp.id where cp.variant_key = 'pokemon_together_stamp') as preserved_duplicate_stamp_variant_rows,
         (select count(*)::int from pkg08r_target t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== 1
      || guardRow.survivor_rows !== 1
      || guardRow.preserved_duplicate_rows !== 1
      || guardRow.survivor_existing_finish_rows !== 0
      || guardRow.preserved_duplicate_child_rows !== 0
      || guardRow.planned_child_id_collisions !== 0
      || guardRow.preserved_duplicate_feed_rows !== 1
      || guardRow.preserved_duplicate_stamp_variant_rows !== 1
      || guardRow.inactive_finish_rows !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guardRow)}`);
    }
    await client.query(
      `select cp.id
       from public.card_prints cp
       join (
         select survivor_card_print_id as card_print_id from pkg08r_target
         union
         select preserved_duplicate_card_print_id as card_print_id from pkg08r_target
       ) target on target.card_print_id = cp.id
       for update of cp`,
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source, provenance_ref, created_by
       )
       select card_printing_id, survivor_card_print_id, finish_key, false, provenance_source, provenance_ref, created_by
       from pkg08r_target`,
    );
    if (childInsert.rowCount !== 1) {
      throw new Error(`write count mismatch: ${JSON.stringify({ child_inserts: childInsert.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         $3::int as child_inserts,
         0::int as parent_updates,
         0::int as parent_deletes,
         0::int as dependency_transfers`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT, childInsert.rowCount],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, target);
    return {
      apply_status: 'pkg08r_append_only_duplicate_non_delete_child_insert_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: true,
      proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, target).catch(() => null);
    return {
      apply_status: 'pkg08r_append_only_duplicate_non_delete_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: false,
      proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-08R Append-Only Duplicate Non-Delete Child Insert Real Apply V1

Approved real apply for the remaining \`sv03.5\` Pikachu #025 cosmos child printing.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| db_write_committed | ${report.db_write_committed} |
| child_inserts | ${report.scope.child_inserts} |
| parent_updates | ${report.scope.parent_updates} |
| parent_deletes | ${report.scope.parent_deletes} |
| dependency_transfers | ${report.scope.dependency_transfers} |
| preserved_parent_unchanged | ${report.preserved_parent_unchanged} |
| migrations_created | ${report.migrations_created} |
| unsupported_cleanup_performed | ${report.unsupported_cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

## Target

${markdownTable(['set', 'card', 'finish', 'canonical_parent', 'preserved_parent'], [[
  report.scope.target.set_key,
  `${report.scope.target.card_number} ${report.scope.target.card_name}`,
  report.scope.target.finish_key,
  report.scope.target.survivor_card_print_id,
  report.scope.target.preserved_duplicate_card_print_id,
]])}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08R Append-Only Duplicate Non-Delete Child Insert Real Apply Checkpoint V1](20260610_pkg08r_append_only_duplicate_non_delete_child_insert_real_apply_checkpoint_v1.md) | Records approved child-only insert for sv03.5 Pikachu #025 cosmos; Pokemon Together stamped parent preserved untouched. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08r_append_only_duplicate_non_delete_child_insert_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08r_append_only_duplicate_non_delete_child_insert_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = await readJson(DRY_RUN_JSON);
const target = dryRun.scope?.target;
const prerequisiteFindings = validateDryRun(dryRun, target);
const conn = connectionString();
let applyResult;

if (!conn) {
  applyResult = {
    apply_status: 'blocked_no_database_connection_string',
    error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
    before_snapshot: null,
    after_snapshot: null,
    committed: false,
    proof_rows: [],
  };
} else if (prerequisiteFindings.length) {
  applyResult = {
    apply_status: 'blocked_prerequisite_findings_present',
    error_message: prerequisiteFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    committed: false,
    proof_rows: [],
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    applyResult = await applyPackage(client, target);
  } finally {
    await client.end().catch(() => {});
  }
}

const afterFindings = applyResult.committed ? validateAfter(applyResult.before_snapshot, applyResult.after_snapshot) : [];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.error_message ? [`apply_error:${applyResult.error_message}`] : []),
  ...afterFindings,
];
const proof = applyResult.proof_rows?.[0] ?? {};
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  approval_text: APPROVAL_TEXT,
  apply_status: applyResult.apply_status,
  db_write_committed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  unsupported_cleanup_performed: false,
  global_apply_performed: false,
  preserved_parent_unchanged: applyResult.before_snapshot?.preserved_parent_hash_sha256 === applyResult.after_snapshot?.preserved_parent_hash_sha256,
  scope: {
    child_inserts: proof.child_inserts ?? 0,
    parent_updates: proof.parent_updates ?? 0,
    parent_deletes: proof.parent_deletes ?? 0,
    dependency_transfers: proof.dependency_transfers ?? 0,
    target,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  proof_rows: applyResult.proof_rows,
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
  scope: report.scope,
  before_hash: report.before_snapshot?.hash_sha256 ?? null,
  after_hash: report.after_snapshot?.hash_sha256 ?? null,
  preserved_parent_unchanged: report.preserved_parent_unchanged,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings,
}, null, 2));

if (!report.pass) process.exitCode = 1;
