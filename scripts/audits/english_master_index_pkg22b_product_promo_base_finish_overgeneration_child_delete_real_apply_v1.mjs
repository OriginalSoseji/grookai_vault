import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg22b_product_promo_base_finish_overgeneration_child_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg22b_product_promo_base_finish_overgeneration_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg22b_product_promo_base_finish_overgeneration_child_delete_real_apply_v1.md');

const PACKAGE_ID = 'PKG-22B-PRODUCT-PROMO-BASE-FINISH-OVERGENERATION-CHILD-DELETE';
const PACKAGE_FINGERPRINT = '51fb478da9343d6ff89feb996d21f772d181e85bd32378dcf28ecdce7d3f0520';
const DRY_RUN_PROOF_HASH = 'ffae17e402d8bbb23f17ec75bfb6916856457a649e513dd1f01e67653cd82087';
const APPROVAL_TEXT = 'Approve real PKG-22B-PRODUCT-PROMO-BASE-FINISH-OVERGENERATION-CHILD-DELETE apply only. Fingerprint: 51fb478da9343d6ff89feb996d21f772d181e85bd32378dcf28ecdce7d3f0520. Scope: 2064 product/promo base finish-overgeneration child deletes; finishes reverse=1028, normal=944, holo=92; top sets smp=486, xyp=416, svp=388, swshp=256, bwp=194, sma=94, np=72, pop1=27. Dry-run proof: ffae17e402d8bbb23f17ec75bfb6916856457a649e513dd1f01e67653cd82087 == ffae17e402d8bbb23f17ec75bfb6916856457a649e513dd1f01e67653cd82087. No global apply. No migrations. No parent writes. No merges. No quarantine. Variant/modifier rows excluded.';
const TARGET_BUCKET = 'product_promo_base_finish_overgeneration_candidate';
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
  if (dryRun.scope?.target_child_deletes !== 2064) findings.push(`scope_target_child_deletes_not_2064:${dryRun.scope?.target_child_deletes}`);
  if (dryRun.scope?.by_finish?.reverse !== 1028) findings.push('scope_reverse_not_1028');
  if (dryRun.scope?.by_finish?.normal !== 944) findings.push('scope_normal_not_944');
  if (dryRun.scope?.by_finish?.holo !== 92) findings.push('scope_holo_not_92');
  if ((dryRun.targets ?? []).length !== 2064) findings.push(`targets_length_not_2064:${(dryRun.targets ?? []).length}`);
  if ((dryRun.targets ?? []).some((row) => row.governance_bucket !== TARGET_BUCKET)) findings.push('target_disallowed_bucket');
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
      `select count(*)::int as refs from public.justtcg_grookai_mappings where card_printing_id = any($1::uuid[])`,
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
      `create temporary table pkg22b_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         governance_bucket text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg22b_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key, row.governance_bucket
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         governance_bucket text
       )`,
      [JSON.stringify(targets)],
    );
    const optionalTables = await existingOptionalTables(client);
    const guards = await client.query(
      `select
         (select count(*)::int from pkg22b_targets) as target_rows,
         (select count(*)::int from pkg22b_targets where finish_key not in ('normal', 'holo', 'reverse')) as disallowed_finish_rows,
         (select count(*)::int from pkg22b_targets where governance_bucket <> 'product_promo_base_finish_overgeneration_candidate') as disallowed_bucket_rows,
         (select count(*)::int from public.card_printings cpr join pkg22b_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.card_prints cp join pkg22b_targets t on t.card_print_id = cp.id where coalesce(cp.variant_key, '') not in ('', 'base') or coalesce(cp.printed_identity_modifier, '') <> '') as identity_modifier_or_variant_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg22b_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg22b_targets t on t.card_printing_id = epm.card_printing_id) as external_printing_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg22b_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.justtcg_mapping_refs = 0;
    if (optionalTables.has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs
         from public.justtcg_grookai_mappings jgm
         join pkg22b_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    if (
      guard.target_rows !== targets.length
      || guard.disallowed_finish_rows !== 0
      || guard.disallowed_bucket_rows !== 0
      || guard.matching_child_rows !== targets.length
      || guard.identity_modifier_or_variant_rows !== 0
      || guard.vault_item_instance_refs !== 0
      || guard.external_printing_mapping_refs !== 0
      || guard.canon_warehouse_candidate_refs !== 0
      || guard.justtcg_mapping_refs !== 0
    ) {
      throw new Error(`PKG-22B prewrite guard failed: ${JSON.stringify(guard)}`);
    }
    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg22b_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (deleteResult.rowCount !== targets.length) {
      throw new Error(`PKG-22B delete count mismatch: ${deleteResult.rowCount}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_printings cpr join pkg22b_targets target on target.card_printing_id = cpr.id) as remaining_target_children,
         $3::int as deleted_child_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT, deleteResult.rowCount],
    );
    if (proof.rows[0].remaining_target_children !== 0) {
      throw new Error(`PKG-22B post-delete proof failed: ${JSON.stringify(proof.rows[0])}`);
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg22b_real_apply_committed',
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
  return `# PKG-22B Product/Promo Base Finish Overgeneration Child Delete Real Apply V1

Approved real apply for product/promo base finish-overgeneration child cleanup.

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

${markdownTable(['set', 'rows'], Object.entries(report.scope.by_set).map(([set, count]) => [set, count]))}

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
  throw new Error(`PKG-22B dry-run prerequisite validation failed: ${prerequisiteFindings.join(', ')}`);
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
  version: 'english_master_index_pkg22b_product_promo_base_finish_overgeneration_child_delete_real_apply_v1',
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
  variant_modifier_rows_excluded: true,
  scope: {
    target_child_deletes: targets.length,
    by_set: countBy(targets, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(targets, (row) => row.finish_key),
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
