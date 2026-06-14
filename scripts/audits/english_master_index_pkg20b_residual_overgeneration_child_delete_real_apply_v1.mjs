import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg20b_residual_overgeneration_child_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg20b_residual_overgeneration_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg20b_residual_overgeneration_child_delete_real_apply_v1.md');

const PACKAGE_ID = 'PKG-20B-RESIDUAL-OVERGENERATION-CHILD-DELETE';
const PACKAGE_FINGERPRINT = '522bea9bee4b2d75354889b74079e862162985c146e925602f2f844ffa7dc4bf';
const DRY_RUN_PROOF_HASH = '988d35248771646ed220573cbd2121e17b5637de523d482333e462c7d2bc02a6';
const APPROVAL_TEXT = 'Approve real PKG-20B-RESIDUAL-OVERGENERATION-CHILD-DELETE apply only. Fingerprint: 522bea9bee4b2d75354889b74079e862162985c146e925602f2f844ffa7dc4bf. Scope: 100 unsupported residual overgeneration child deletes; finishes holo=94, normal=6; lanes holo_overgeneration_candidate_no_dependencies=94, normal_overgeneration_candidate_no_dependencies=6. Dry-run proof: 988d35248771646ed220573cbd2121e17b5637de523d482333e462c7d2bc02a6 == 988d35248771646ed220573cbd2121e17b5637de523d482333e462c7d2bc02a6. No global apply. No migrations. No parent writes. No merges. No quarantine.';
const ALLOWED_LANES = new Set([
  'holo_overgeneration_candidate_no_dependencies',
  'normal_overgeneration_candidate_no_dependencies',
]);
const ALLOWED_FINISHES = new Set(['holo', 'normal']);
const OPTIONAL_DEPENDENCY_TABLES = ['justtcg_grookai_mappings'];

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
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

async function existingOptionalTables(client) {
  const result = await client.query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [OPTIONAL_DEPENDENCY_TABLES],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package_id');
  if (dryRun.package_fingerprint !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.execution?.rollback_proof_hash_match !== true) findings.push('dry_run_rollback_proof_false');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.scope?.target_child_deletes !== 100) findings.push(`scope_target_child_deletes_not_100:${dryRun.scope?.target_child_deletes}`);
  if (dryRun.scope?.by_finish?.holo !== 94) findings.push('scope_holo_not_94');
  if (dryRun.scope?.by_finish?.normal !== 6) findings.push('scope_normal_not_6');
  if (dryRun.scope?.by_lane?.holo_overgeneration_candidate_no_dependencies !== 94) findings.push('scope_holo_lane_not_94');
  if (dryRun.scope?.by_lane?.normal_overgeneration_candidate_no_dependencies !== 6) findings.push('scope_normal_lane_not_6');
  if ((dryRun.targets ?? []).length !== 100) findings.push(`targets_length_not_100:${(dryRun.targets ?? []).length}`);
  if ((dryRun.targets ?? []).some((row) => !ALLOWED_FINISHES.has(row.finish_key))) findings.push('target_disallowed_finish');
  if ((dryRun.targets ?? []).some((row) => !ALLOWED_LANES.has(row.lane))) findings.push('target_disallowed_lane');
  return findings;
}

async function captureSnapshot(client, targets) {
  const ids = targets.map((row) => row.card_printing_id);
  const result = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text,
       cpr.finish_key,
       cpr.is_provisional,
       cpr.provenance_source,
       cpr.provenance_ref,
       cpr.created_by,
       cpr.created_at,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($1::uuid[])
     order by cp.set_code, coalesce(cp.number_plain, cp.number), cp.name, cpr.finish_key, cpr.id`,
    [ids],
  );
  const refs = await client.query(
    `select
       (select count(*)::int from public.card_printings where id = any($1::uuid[])) as child_rows,
       (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[]) and archived_at is null) as vault_item_instance_refs,
       (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[])) as external_printing_mapping_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidate_refs`,
    [ids],
  );
  const impactCounts = refs.rows[0];
  impactCounts.justtcg_mapping_refs = 0;
  if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
    const justtcg = await client.query(
      `select count(*)::int as refs
       from public.justtcg_grookai_mappings
       where card_printing_id = any($1::uuid[])`,
      [ids],
    );
    impactCounts.justtcg_mapping_refs = justtcg.rows[0].refs;
  }
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: impactCounts,
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const before = beforeSnapshot.impact_counts;
  const beforeFindings = [];
  if (beforeSnapshot.hash_sha256 !== DRY_RUN_PROOF_HASH) beforeFindings.push('live_pre_apply_snapshot_hash_mismatch');
  if (before.child_rows !== targets.length) beforeFindings.push(`before_child_rows_not_target_count:${before.child_rows}`);
  if (before.vault_item_instance_refs !== 0) beforeFindings.push('before_vault_item_instance_refs_present');
  if (before.external_printing_mapping_refs !== 0) beforeFindings.push('before_external_printing_mapping_refs_present');
  if (before.canon_warehouse_candidate_refs !== 0) beforeFindings.push('before_canon_warehouse_candidate_refs_present');
  if (before.justtcg_mapping_refs !== 0) beforeFindings.push('before_justtcg_mapping_refs_present');
  if (beforeFindings.length) {
    return {
      apply_status: 'blocked_before_real_apply_live_shape_mismatch',
      committed: false,
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      write_counts: {},
      proof_rows: [],
      stop_findings: beforeFindings,
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    await client.query(
      `create temporary table pkg20b_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         set_code text not null,
         canonical_set_key text not null,
         card_number text not null,
         card_name text not null,
         finish_key text not null,
         lane text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg20b_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.set_code,
         row.canonical_set_key,
         row.card_number,
         row.card_name,
         row.finish_key,
         row.lane
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         set_code text,
         canonical_set_key text,
         card_number text,
         card_name text,
         finish_key text,
         lane text
       )`,
      [JSON.stringify(targets)],
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg20b_targets) as target_rows,
         (select count(*)::int from pkg20b_targets where finish_key not in ('holo', 'normal')) as disallowed_finish_rows,
         (select count(*)::int from pkg20b_targets where lane not in (
           'holo_overgeneration_candidate_no_dependencies',
           'normal_overgeneration_candidate_no_dependencies'
         )) as disallowed_lane_rows,
         (select count(*)::int from public.card_printings cpr join pkg20b_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg20b_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg20b_targets t on t.card_printing_id = epm.card_printing_id) as external_printing_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg20b_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.justtcg_mapping_refs = 0;
    if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs
         from public.justtcg_grookai_mappings jgm
         join pkg20b_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    if (
      guard.target_rows !== targets.length
      || guard.disallowed_finish_rows !== 0
      || guard.disallowed_lane_rows !== 0
      || guard.matching_child_rows !== targets.length
      || guard.vault_item_instance_refs !== 0
      || guard.external_printing_mapping_refs !== 0
      || guard.canon_warehouse_candidate_refs !== 0
      || guard.justtcg_mapping_refs !== 0
    ) {
      throw new Error(`PKG-20B prewrite guard failed: ${JSON.stringify(guard)}`);
    }
    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg20b_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (deleteResult.rowCount !== targets.length) {
      throw new Error(`PKG-20B delete count mismatch: ${deleteResult.rowCount}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_printings cpr join pkg20b_targets target on target.card_printing_id = cpr.id) as remaining_target_children,
         $3::int as deleted_child_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT, deleteResult.rowCount],
    );
    if (proof.rows[0].remaining_target_children !== 0) {
      throw new Error(`PKG-20B post-delete proof failed: ${JSON.stringify(proof.rows[0])}`);
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg20b_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      write_counts: {
        child_deletes: deleteResult.rowCount,
        parent_writes: 0,
        merges: 0,
        migrations: 0,
      },
      proof_rows: proof.rows,
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# PKG-20B Residual Overgeneration Child Delete Real Apply V1

Approved real apply for residual unsupported overgeneration child printing cleanup.

## Safety

- package_id: ${report.package_id}
- committed: ${report.execution.committed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- parent_writes: ${report.execution.write_counts.parent_writes}
- merges: ${report.execution.write_counts.merges}
- quarantine_performed: ${report.quarantine_performed}

## Scope

- deleted_child_rows: ${report.execution.write_counts.child_deletes}
- target_child_deletes: ${report.scope.target_child_deletes}

${markdownTable(['finish', 'rows'], Object.entries(report.scope.by_finish).map(([finish, count]) => [finish, count]))}

${markdownTable(['lane', 'rows'], Object.entries(report.scope.by_lane).map(([lane, count]) => [lane, count]))}

## Proof

- dry_run_proof_hash: ${report.dry_run_proof_hash}
- pre_apply_hash: ${report.execution.before_snapshot.hash_sha256}
- remaining_target_children: ${report.execution.proof_rows?.[0]?.remaining_target_children}

## Rollback Material

The JSON artifact contains the full pre-apply child row snapshot needed for a manual reinsert rollback if separately approved.
`;
}

const dryRun = await readJson(DRY_RUN_JSON);
const prerequisiteFindings = validateDryRun(dryRun);
if (prerequisiteFindings.length > 0) {
  throw new Error(`PKG-20B dry-run prerequisite validation failed: ${prerequisiteFindings.join(', ')}`);
}

const targets = dryRun.targets;
const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
const client = new Client({ connectionString: conn });
await client.connect();
let execution;
try {
  execution = await applyPackage(client, targets);
} finally {
  await client.end().catch(() => {});
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg20b_residual_overgeneration_child_delete_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: PACKAGE_FINGERPRINT,
  approved_real_apply_text: APPROVAL_TEXT,
  dry_run_artifact: DRY_RUN_JSON,
  dry_run_proof_hash: DRY_RUN_PROOF_HASH,
  db_writes_performed: execution.committed,
  migrations_created: false,
  cleanup_performed: execution.committed,
  quarantine_performed: false,
  no_global_apply: true,
  no_parent_writes: true,
  no_merges: true,
  scope: {
    target_child_deletes: targets.length,
    by_lane: countBy(targets, (row) => row.lane),
    by_finish: countBy(targets, (row) => row.finish_key),
    by_set: countBy(targets, (row) => row.canonical_set_key),
  },
  execution,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: PACKAGE_FINGERPRINT,
  apply_status: execution.apply_status,
  committed: execution.committed,
  write_counts: execution.write_counts,
  proof_rows: execution.proof_rows,
  stop_findings: execution.stop_findings,
  migrations_created: false,
}, null, 2));
