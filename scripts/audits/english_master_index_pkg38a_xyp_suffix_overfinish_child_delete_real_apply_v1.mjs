import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg38a_xyp_suffix_overfinish_child_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg38a_xyp_suffix_overfinish_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg38a_xyp_suffix_overfinish_child_delete_real_apply_v1.md');

const PACKAGE_ID = 'PKG-38A-XYP-SUFFIX-OVERFINISH-CHILD-DELETE';
const APPROVED_FINGERPRINT = 'aba4f25dc6ce864d71cd86108117bc46e2e7f2dd3bc65745e9bbde1d75edaaf1';
const APPROVED_DRY_RUN_PROOF_HASH = 'c024883e7880fecf739d20ba53441d5f357cb31c76ebf486f9a6611d1d7cf5d3';
const APPROVED_APPROVAL_TEXT = 'Approve real PKG-38A-XYP-SUFFIX-OVERFINISH-CHILD-DELETE apply only. Fingerprint: aba4f25dc6ce864d71cd86108117bc46e2e7f2dd3bc65745e9bbde1d75edaaf1. Scope: 10 XYP suffix overfinish child deletes; finishes normal=5, reverse=5; target rows XY150a/XY177a/XY198a/XY200a/XY67a normal/reverse only. Dry-run proof: c024883e7880fecf739d20ba53441d5f357cb31c76ebf486f9a6611d1d7cf5d3 == c024883e7880fecf739d20ba53441d5f357cb31c76ebf486f9a6611d1d7cf5d3. No global apply. No migrations. No parent writes. No merges. No quarantine. Holo rows preserved.';
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

function assertEqual(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
}

function assertDryRun(dryRun) {
  assertEqual('package_id', dryRun.package_id, PACKAGE_ID);
  assertEqual('package_fingerprint', dryRun.package_fingerprint, APPROVED_FINGERPRINT);
  assertEqual('recommended_real_apply_approval_text', dryRun.recommended_real_apply_approval_text, APPROVED_APPROVAL_TEXT);
  assertEqual('scope.target_child_deletes', Number(dryRun.scope?.target_child_deletes ?? Number.NaN), 10);
  assertEqual('scope.by_set.xyp', Number(dryRun.scope?.by_set?.xyp ?? Number.NaN), 10);
  assertEqual('scope.by_finish.normal', Number(dryRun.scope?.by_finish?.normal ?? Number.NaN), 5);
  assertEqual('scope.by_finish.reverse', Number(dryRun.scope?.by_finish?.reverse ?? Number.NaN), 5);
  assertEqual('execution.rollback_proof_hash_match', dryRun.execution?.rollback_proof_hash_match, true);
  assertEqual('execution.before_snapshot.hash_sha256', dryRun.execution?.before_snapshot?.hash_sha256, APPROVED_DRY_RUN_PROOF_HASH);
  assertEqual('execution.after_snapshot.hash_sha256', dryRun.execution?.after_snapshot?.hash_sha256, APPROVED_DRY_RUN_PROOF_HASH);
  assertEqual('targets.length', (dryRun.targets ?? []).length, 10);
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

function assertPreApplySnapshot(snapshot, targetCount) {
  assertEqual('pre_apply.child_rows', Number(snapshot.impact_counts.child_rows), targetCount);
  assertEqual('pre_apply.vault_item_instance_refs', Number(snapshot.impact_counts.vault_item_instance_refs), 0);
  assertEqual('pre_apply.external_printing_mapping_refs', Number(snapshot.impact_counts.external_printing_mapping_refs), 0);
  assertEqual('pre_apply.canon_warehouse_candidate_refs', Number(snapshot.impact_counts.canon_warehouse_candidate_refs), 0);
  assertEqual('pre_apply.justtcg_mapping_refs', Number(snapshot.impact_counts.justtcg_mapping_refs), 0);
}

async function executeRealApply(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  assertEqual('pre_apply.hash_sha256', beforeSnapshot.hash_sha256, APPROVED_DRY_RUN_PROOF_HASH);
  assertPreApplySnapshot(beforeSnapshot, targets.length);

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    await client.query(
      `create temporary table pkg38a_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         governance_bucket text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg38a_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key, row.governance_bucket
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         governance_bucket text
       )`,
      [JSON.stringify(targets)],
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg38a_targets) as target_rows,
         (select count(*)::int from pkg38a_targets where finish_key not in ('normal', 'reverse')) as disallowed_finish_rows,
         (select count(*)::int from pkg38a_targets where governance_bucket <> 'product_promo_base_finish_overgeneration_candidate') as disallowed_bucket_rows,
         (select count(*)::int from public.card_printings cpr join pkg38a_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.card_prints cp join pkg38a_targets t on t.card_print_id = cp.id where cp.set_code <> 'xyp' or coalesce(cp.printed_identity_modifier, '') <> '' or not (cp.number ~ '^XY[0-9]+a$')) as disallowed_parent_shape_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg38a_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg38a_targets t on t.card_printing_id = epm.card_printing_id) as external_printing_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg38a_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.justtcg_mapping_refs = 0;
    if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs
         from public.justtcg_grookai_mappings jgm
         join pkg38a_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    assertEqual('guard.target_rows', Number(guard.target_rows), targets.length);
    assertEqual('guard.disallowed_finish_rows', Number(guard.disallowed_finish_rows), 0);
    assertEqual('guard.disallowed_bucket_rows', Number(guard.disallowed_bucket_rows), 0);
    assertEqual('guard.matching_child_rows', Number(guard.matching_child_rows), targets.length);
    assertEqual('guard.disallowed_parent_shape_rows', Number(guard.disallowed_parent_shape_rows), 0);
    assertEqual('guard.vault_item_instance_refs', Number(guard.vault_item_instance_refs), 0);
    assertEqual('guard.external_printing_mapping_refs', Number(guard.external_printing_mapping_refs), 0);
    assertEqual('guard.canon_warehouse_candidate_refs', Number(guard.canon_warehouse_candidate_refs), 0);
    assertEqual('guard.justtcg_mapping_refs', Number(guard.justtcg_mapping_refs), 0);

    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg38a_targets target
       where cpr.id = target.card_printing_id`,
    );
    assertEqual('deleted_rows', deleteResult.rowCount, targets.length);
    await client.query('commit');
    return {
      apply_status: 'pkg38a_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      deleted_rows: deleteResult.rowCount,
      guard,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function capturePostApplyProof(client, targets) {
  const targetIds = targets.map((row) => row.card_printing_id);
  const parentIds = [...new Set(targets.map((row) => row.card_print_id))];
  const deletedChildren = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where id = any($1::uuid[])`,
    [targetIds],
  );
  const preservedHoloChildren = await client.query(
    `select cp.number, cp.name, count(cpr.id)::int as holo_children
     from public.card_prints cp
     left join public.card_printings cpr
       on cpr.card_print_id = cp.id
      and cpr.finish_key = 'holo'
     where cp.id = any($1::uuid[])
     group by cp.number, cp.name
     order by cp.number, cp.name`,
    [parentIds],
  );
  const remainingChildren = await client.query(
    `select cp.number, cp.name, cpr.finish_key, count(cpr.id)::int as rows
     from public.card_prints cp
     join public.card_printings cpr on cpr.card_print_id = cp.id
     where cp.id = any($1::uuid[])
     group by cp.number, cp.name, cpr.finish_key
     order by cp.number, cp.name, cpr.finish_key`,
    [parentIds],
  );
  return {
    target_children_remaining: Number(deletedChildren.rows[0]?.count ?? 0),
    preserved_holo_children: preservedHoloChildren.rows,
    remaining_children_by_parent_finish: remainingChildren.rows,
  };
}

function renderMarkdown(report) {
  return `# PKG-38A XYP Suffix Overfinish Child Delete Real Apply V1

Real apply completed for the explicitly approved PKG-38A scope only.

No migrations were created. No parent writes, merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['deleted_rows', report.execution.deleted_rows],
    ['target_children_remaining', report.post_apply_proof.target_children_remaining],
    ['migrations_created', false],
    ['parent_writes', false],
  ])}

## Preserved Holo Children

${markdownTable(
    ['number', 'name', 'holo_children'],
    report.post_apply_proof.preserved_holo_children.map((row) => [row.number, row.name, row.holo_children]),
  )}
`;
}

const dryRun = await readJson(DRY_RUN_JSON);
assertDryRun(dryRun);

const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
const client = new Client({ connectionString: conn });
await client.connect();
let execution;
let postApplyProof;
try {
  execution = await executeRealApply(client, dryRun.targets);
  postApplyProof = await capturePostApplyProof(client, dryRun.targets);
} finally {
  await client.end().catch(() => {});
}

assertEqual('post_apply.target_children_remaining', postApplyProof.target_children_remaining, 0);
for (const row of postApplyProof.preserved_holo_children) {
  assertEqual(`post_apply.preserved_holo_children.${row.number}.${row.name}`, Number(row.holo_children), 1);
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg38a_xyp_suffix_overfinish_child_delete_real_apply_v1',
  package_id: PACKAGE_ID,
  fingerprint: APPROVED_FINGERPRINT,
  dry_run_artifact: path.relative(process.cwd(), DRY_RUN_JSON),
  safety: {
    no_global_apply: true,
    migrations_created: false,
    parent_writes: false,
    merges: false,
    quarantine: false,
  },
  execution,
  post_apply_proof: postApplyProof,
  targets: dryRun.targets,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(process.cwd(), OUTPUT_JSON),
  output_md: path.relative(process.cwd(), OUTPUT_MD),
  package_id: PACKAGE_ID,
  fingerprint: APPROVED_FINGERPRINT,
  apply_status: execution.apply_status,
  deleted_rows: execution.deleted_rows,
  post_apply_proof: postApplyProof,
  db_writes_performed: true,
  migrations_created: false,
  parent_writes: false,
}, null, 2));
