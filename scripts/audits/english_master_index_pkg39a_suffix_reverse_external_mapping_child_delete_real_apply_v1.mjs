import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg39a_suffix_reverse_external_mapping_child_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg39a_suffix_reverse_external_mapping_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg39a_suffix_reverse_external_mapping_child_delete_real_apply_v1.md');

const PACKAGE_ID = 'PKG-39A-SUFFIX-REVERSE-EXTERNAL-MAPPING-CHILD-DELETE';
const APPROVED_FINGERPRINT = 'a878917281b733c360a8313dcb487d50fdd2b1ec378355cd6172ea00d8cd3dc4';
const APPROVED_DRY_RUN_PROOF_HASH = 'b2790e5b7ffe1b18c13fc53e1b7b56b153bc3f051f1090d25a1ec392771a7405';
const APPROVED_APPROVAL_TEXT = 'Approve real PKG-39A-SUFFIX-REVERSE-EXTERNAL-MAPPING-CHILD-DELETE apply only. Fingerprint: a878917281b733c360a8313dcb487d50fdd2b1ec378355cd6172ea00d8cd3dc4. Scope: 7 unsupported suffix reverse child deletes and 7 stale TCGdex external mapping deletes; sets xy10=2, xy4=2, g1=1, xy3=1, xy6=1; finish reverse=7. Dry-run proof: b2790e5b7ffe1b18c13fc53e1b7b56b153bc3f051f1090d25a1ec392771a7405 == b2790e5b7ffe1b18c13fc53e1b7b56b153bc3f051f1090d25a1ec392771a7405. No global apply. No migrations. No parent writes. No merges. No quarantine. Supported holo/normal rows preserved.';
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
  assertEqual('scope.target_child_deletes', Number(dryRun.scope?.target_child_deletes ?? Number.NaN), 7);
  assertEqual('scope.target_external_mapping_deletes', Number(dryRun.scope?.target_external_mapping_deletes ?? Number.NaN), 7);
  assertEqual('scope.by_finish.reverse', Number(dryRun.scope?.by_finish?.reverse ?? Number.NaN), 7);
  assertEqual('scope.by_source.tcgdex', Number(dryRun.scope?.by_source?.tcgdex ?? Number.NaN), 7);
  assertEqual('scope.by_set.xy10', Number(dryRun.scope?.by_set?.xy10 ?? Number.NaN), 2);
  assertEqual('scope.by_set.xy4', Number(dryRun.scope?.by_set?.xy4 ?? Number.NaN), 2);
  assertEqual('scope.by_set.g1', Number(dryRun.scope?.by_set?.g1 ?? Number.NaN), 1);
  assertEqual('scope.by_set.xy3', Number(dryRun.scope?.by_set?.xy3 ?? Number.NaN), 1);
  assertEqual('scope.by_set.xy6', Number(dryRun.scope?.by_set?.xy6 ?? Number.NaN), 1);
  assertEqual('execution.rollback_proof_hash_match', dryRun.execution?.rollback_proof_hash_match, true);
  assertEqual('execution.before_snapshot.hash_sha256', dryRun.execution?.before_snapshot?.hash_sha256, APPROVED_DRY_RUN_PROOF_HASH);
  assertEqual('execution.after_snapshot.hash_sha256', dryRun.execution?.after_snapshot?.hash_sha256, APPROVED_DRY_RUN_PROOF_HASH);
  assertEqual('targets.length', (dryRun.targets ?? []).length, 7);
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
  const childIds = targets.map((row) => row.card_printing_id);
  const mappingIds = targets.map((row) => row.external_mapping_id);
  const children = await client.query(
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
    [childIds],
  );
  const mappings = await client.query(
    `select id::text, card_printing_id::text, source, external_id, active, meta
     from public.external_printing_mappings
     where id = any($1::uuid[])
     order by source, external_id, id`,
    [mappingIds],
  );
  const refs = await client.query(
    `select
       (select count(*)::int from public.card_printings where id = any($1::uuid[])) as child_rows,
       (select count(*)::int from public.external_printing_mappings where id = any($2::uuid[])) as external_mapping_rows,
       (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[]) and archived_at is null) as vault_item_instance_refs,
       (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[]) and not (id = any($2::uuid[]))) as non_target_external_mapping_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidate_refs`,
    [childIds, mappingIds],
  );
  const impactCounts = refs.rows[0];
  impactCounts.justtcg_mapping_refs = 0;
  if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
    const justtcg = await client.query(
      `select count(*)::int as refs
       from public.justtcg_grookai_mappings
       where card_printing_id = any($1::uuid[])`,
      [childIds],
    );
    impactCounts.justtcg_mapping_refs = justtcg.rows[0].refs;
  }
  const payload = { children: children.rows, mappings: mappings.rows };
  return {
    captured_at: new Date().toISOString(),
    ...payload,
    hash_sha256: sha256(stableJson(payload)),
    impact_counts: impactCounts,
  };
}

function assertPreApplySnapshot(snapshot, targetCount) {
  assertEqual('pre_apply.child_rows', Number(snapshot.impact_counts.child_rows), targetCount);
  assertEqual('pre_apply.external_mapping_rows', Number(snapshot.impact_counts.external_mapping_rows), targetCount);
  assertEqual('pre_apply.vault_item_instance_refs', Number(snapshot.impact_counts.vault_item_instance_refs), 0);
  assertEqual('pre_apply.non_target_external_mapping_refs', Number(snapshot.impact_counts.non_target_external_mapping_refs), 0);
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
      `create temporary table pkg39a_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         external_mapping_id uuid not null,
         finish_key text not null,
         source text not null,
         external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg39a_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.external_mapping_id::uuid,
         row.finish_key,
         row.source,
         row.external_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         external_mapping_id text,
         finish_key text,
         source text,
         external_id text
       )`,
      [JSON.stringify(targets)],
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg39a_targets) as target_rows,
         (select count(*)::int from pkg39a_targets where finish_key <> 'reverse') as disallowed_finish_rows,
         (select count(*)::int from pkg39a_targets where source <> 'tcgdex' or external_id !~ '^[a-z0-9.]+-[0-9]+a$') as disallowed_mapping_shape_rows,
         (select count(*)::int from public.card_printings cpr join pkg39a_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.external_printing_mappings epm join pkg39a_targets t on t.external_mapping_id = epm.id and t.card_printing_id = epm.card_printing_id and t.source = epm.source and t.external_id = epm.external_id) as matching_external_mapping_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg39a_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg39a_targets t on t.card_printing_id = epm.card_printing_id and epm.id <> t.external_mapping_id) as non_target_external_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg39a_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.justtcg_mapping_refs = 0;
    if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs
         from public.justtcg_grookai_mappings jgm
         join pkg39a_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    assertEqual('guard.target_rows', Number(guard.target_rows), targets.length);
    assertEqual('guard.disallowed_finish_rows', Number(guard.disallowed_finish_rows), 0);
    assertEqual('guard.disallowed_mapping_shape_rows', Number(guard.disallowed_mapping_shape_rows), 0);
    assertEqual('guard.matching_child_rows', Number(guard.matching_child_rows), targets.length);
    assertEqual('guard.matching_external_mapping_rows', Number(guard.matching_external_mapping_rows), targets.length);
    assertEqual('guard.vault_item_instance_refs', Number(guard.vault_item_instance_refs), 0);
    assertEqual('guard.non_target_external_mapping_refs', Number(guard.non_target_external_mapping_refs), 0);
    assertEqual('guard.canon_warehouse_candidate_refs', Number(guard.canon_warehouse_candidate_refs), 0);
    assertEqual('guard.justtcg_mapping_refs', Number(guard.justtcg_mapping_refs), 0);

    const mappingDelete = await client.query(
      `delete from public.external_printing_mappings epm
       using pkg39a_targets target
       where epm.id = target.external_mapping_id`,
    );
    assertEqual('mapping_deleted_rows', mappingDelete.rowCount, targets.length);
    const childDelete = await client.query(
      `delete from public.card_printings cpr
       using pkg39a_targets target
       where cpr.id = target.card_printing_id`,
    );
    assertEqual('child_deleted_rows', childDelete.rowCount, targets.length);
    await client.query('commit');
    return {
      apply_status: 'pkg39a_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      mapping_deleted_rows: mappingDelete.rowCount,
      child_deleted_rows: childDelete.rowCount,
      guard,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function capturePostApplyProof(client, targets) {
  const childIds = targets.map((row) => row.card_printing_id);
  const mappingIds = targets.map((row) => row.external_mapping_id);
  const parentIds = [...new Set(targets.map((row) => row.card_print_id))];
  const remainingTargets = await client.query(
    `select
       (select count(*)::int from public.card_printings where id = any($1::uuid[])) as target_children_remaining,
       (select count(*)::int from public.external_printing_mappings where id = any($2::uuid[])) as target_mappings_remaining`,
    [childIds, mappingIds],
  );
  const remainingChildren = await client.query(
    `select cp.set_code, cp.number, cp.name, cpr.finish_key, count(cpr.id)::int as rows
     from public.card_prints cp
     join public.card_printings cpr on cpr.card_print_id = cp.id
     where cp.id = any($1::uuid[])
     group by cp.set_code, cp.number, cp.name, cpr.finish_key
     order by cp.set_code, cp.number, cp.name, cpr.finish_key`,
    [parentIds],
  );
  return {
    target_children_remaining: Number(remainingTargets.rows[0]?.target_children_remaining ?? 0),
    target_mappings_remaining: Number(remainingTargets.rows[0]?.target_mappings_remaining ?? 0),
    remaining_children_by_parent_finish: remainingChildren.rows,
  };
}

function renderMarkdown(report) {
  return `# PKG-39A Suffix Reverse External Mapping Child Delete Real Apply V1

Real apply completed for the explicitly approved PKG-39A scope only.

No migrations were created. No parent writes, merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['mapping_deleted_rows', report.execution.mapping_deleted_rows],
    ['child_deleted_rows', report.execution.child_deleted_rows],
    ['target_children_remaining', report.post_apply_proof.target_children_remaining],
    ['target_mappings_remaining', report.post_apply_proof.target_mappings_remaining],
    ['migrations_created', false],
    ['parent_writes', false],
  ])}

## Remaining Supported Rows On Target Parents

${markdownTable(
    ['set', 'number', 'name', 'finish', 'rows'],
    report.post_apply_proof.remaining_children_by_parent_finish.map((row) => [row.set_code, row.number, row.name, row.finish_key, row.rows]),
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
assertEqual('post_apply.target_mappings_remaining', postApplyProof.target_mappings_remaining, 0);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg39a_suffix_reverse_external_mapping_child_delete_real_apply_v1',
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
  mapping_deleted_rows: execution.mapping_deleted_rows,
  child_deleted_rows: execution.child_deleted_rows,
  post_apply_proof: postApplyProof,
  db_writes_performed: true,
  migrations_created: false,
  parent_writes: false,
}, null, 2));
