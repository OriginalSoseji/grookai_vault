import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg27b_subset_variant_overfinish_child_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg27b_subset_variant_overfinish_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg27b_subset_variant_overfinish_child_delete_real_apply_v1.md');

const PACKAGE_ID = 'PKG-27B-SUBSET-VARIANT-OVERFINISH-CHILD-DELETE';
const PACKAGE_FINGERPRINT = '2c6d003783412de97d2e273bf4cc26970edba2818bcab2a7609f6ab9bf25b96a';
const DRY_RUN_PROOF_HASH = 'edefb0f6b8ae5f1773fb96000a3e8ac29ea88cf760bd26ae73b0293e49c55994';
const EXPECTED_TARGET_ROWS = 131;
const APPROVAL_TEXT = 'Approve real PKG-27B-SUBSET-VARIANT-OVERFINISH-CHILD-DELETE apply only. Fingerprint: 2c6d003783412de97d2e273bf4cc26970edba2818bcab2a7609f6ab9bf25b96a. Scope: 131 deterministic subset/number-prefix overfinish child deletes; finishes normal=62, reverse=51, holo=18; top sets g1=64, cel25c=19, swsh12tg=17, col1=11, bw11=10, pl4=5, pl2=4, pl1=1. Dry-run proof: edefb0f6b8ae5f1773fb96000a3e8ac29ea88cf760bd26ae73b0293e49c55994 == edefb0f6b8ae5f1773fb96000a3e8ac29ea88cf760bd26ae73b0293e49c55994. No global apply. No migrations. No parent writes. No merges. No quarantine.';
const OPTIONAL_DEPENDENCY_TABLES = ['justtcg_grookai_mappings', 'card_printing_truth_reviews'];
const ALLOWED_FAMILIES = new Set([
  'generations_radiant_collection_overfinish',
  'celebrations_classic_collection_overfinish',
  'trainer_gallery_normal_overfinish',
  'call_of_legends_sl_reverse_overfinish',
  'legendary_treasures_radiant_collection_overfinish',
  'arceus_ar_prefix_overfinish',
  'rising_rivals_rotom_prefix_overfinish',
  'shiny_secret_prefix_holo_overfinish',
]);
const ALLOWED_FINISHES = new Set(['normal', 'holo', 'reverse']);

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
  if (dryRun.dry_run_proof_hash !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.dry_run?.rollback_proof_hash_match !== true) findings.push('dry_run_rollback_proof_false');
  if (dryRun.summary?.target_rows !== EXPECTED_TARGET_ROWS) findings.push(`scope_target_rows_not_${EXPECTED_TARGET_ROWS}:${dryRun.summary?.target_rows}`);
  if (dryRun.summary?.by_finish?.normal !== 62) findings.push('scope_normal_not_62');
  if (dryRun.summary?.by_finish?.reverse !== 51) findings.push('scope_reverse_not_51');
  if (dryRun.summary?.by_finish?.holo !== 18) findings.push('scope_holo_not_18');
  if ((dryRun.targets ?? []).length !== EXPECTED_TARGET_ROWS) findings.push(`targets_length_not_${EXPECTED_TARGET_ROWS}:${(dryRun.targets ?? []).length}`);
  if ((dryRun.targets ?? []).some((row) => !ALLOWED_FINISHES.has(row.finish_key))) findings.push('target_disallowed_finish');
  if ((dryRun.targets ?? []).some((row) => !ALLOWED_FAMILIES.has(row.candidate_family))) findings.push('target_disallowed_family');
  if (dryRun.real_apply_performed !== false) findings.push('dry_run_claims_real_apply');
  if (dryRun.db_writes_persisted !== false) findings.push('dry_run_claims_db_writes_persisted');
  return findings;
}

async function captureSnapshot(client, targets) {
  const ids = targets.map((row) => row.card_printing_id);
  const optionalTables = await existingOptionalTables(client);
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
  impactCounts.truth_review_refs = 0;
  if (optionalTables.has('card_printing_truth_reviews')) {
    const truthReviews = await client.query(
      `select count(*)::int as refs from public.card_printing_truth_reviews where card_printing_id = any($1::uuid[])`,
      [ids],
    );
    impactCounts.truth_review_refs = truthReviews.rows[0].refs;
  }
  impactCounts.justtcg_mapping_refs = 0;
  if (optionalTables.has('justtcg_grookai_mappings')) {
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

async function applyPackage(client, targets, expectedBeforeHash) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const before = beforeSnapshot.impact_counts;
  const beforeFindings = [];
  if (beforeSnapshot.hash_sha256 !== expectedBeforeHash) beforeFindings.push('live_pre_apply_snapshot_hash_mismatch');
  if (before.child_rows !== targets.length) beforeFindings.push(`before_child_rows_not_target_count:${before.child_rows}`);
  for (const key of ['vault_item_instance_refs', 'external_printing_mapping_refs', 'canon_warehouse_candidate_refs', 'truth_review_refs', 'justtcg_mapping_refs']) {
    if (Number(before[key] ?? 0) !== 0) beforeFindings.push(`before_${key}_present`);
  }
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
      `create temporary table pkg27b_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         candidate_family text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg27b_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key, row.candidate_family
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         candidate_family text
       )`,
      [JSON.stringify(targets)],
    );
    const optionalTables = await existingOptionalTables(client);
    const guards = await client.query(
      `with parent_counts as (
         select
           target.card_print_id,
           count(cpr.id)::int as total_children,
           count(cpr.id) filter (where target2.card_printing_id is null)::int as children_after_target_delete
         from pkg27b_targets target
         join public.card_printings cpr on cpr.card_print_id = target.card_print_id
         left join pkg27b_targets target2 on target2.card_printing_id = cpr.id
         group by target.card_print_id
       )
       select
         (select count(*)::int from pkg27b_targets) as target_rows,
         (select count(*)::int from pkg27b_targets where finish_key not in ('normal', 'holo', 'reverse')) as disallowed_finish_rows,
         (select count(*)::int from pkg27b_targets where candidate_family <> all($1::text[])) as disallowed_family_rows,
         (select count(*)::int from public.card_printings cpr join pkg27b_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from parent_counts where children_after_target_delete < 1) as parent_orphan_risk_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg27b_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg27b_targets t on t.card_printing_id = epm.card_printing_id) as external_printing_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg27b_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
      [[...ALLOWED_FAMILIES]],
    );
    const guard = guards.rows[0];
    guard.truth_review_refs = 0;
    if (optionalTables.has('card_printing_truth_reviews')) {
      const truthReviews = await client.query(
        `select count(*)::int as refs
         from public.card_printing_truth_reviews ctr
         join pkg27b_targets t on t.card_printing_id = ctr.card_printing_id`,
      );
      guard.truth_review_refs = truthReviews.rows[0].refs;
    }
    guard.justtcg_mapping_refs = 0;
    if (optionalTables.has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs
         from public.justtcg_grookai_mappings jgm
         join pkg27b_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    if (
      guard.target_rows !== targets.length
      || guard.disallowed_finish_rows !== 0
      || guard.disallowed_family_rows !== 0
      || guard.matching_child_rows !== targets.length
      || guard.parent_orphan_risk_rows !== 0
      || guard.vault_item_instance_refs !== 0
      || guard.external_printing_mapping_refs !== 0
      || guard.canon_warehouse_candidate_refs !== 0
      || guard.truth_review_refs !== 0
      || guard.justtcg_mapping_refs !== 0
    ) {
      throw new Error(`PKG-27B prewrite guard failed: ${JSON.stringify(guard)}`);
    }
    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg27b_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (deleteResult.rowCount !== targets.length) throw new Error(`PKG-27B delete count mismatch: ${deleteResult.rowCount}`);
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_printings cpr join pkg27b_targets target on target.card_printing_id = cpr.id) as remaining_target_children,
         $3::int as deleted_child_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT, deleteResult.rowCount],
    );
    if (proof.rows[0].remaining_target_children !== 0) {
      throw new Error(`PKG-27B post-delete proof failed: ${JSON.stringify(proof.rows[0])}`);
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg27b_real_apply_committed',
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
  return `# PKG-27B Subset Variant Overfinish Child Delete Real Apply V1

Approved real apply for deterministic subset/number-prefix overfinish child cleanup.

## Safety

- apply_status: ${report.apply.apply_status}
- committed: ${report.apply.committed}
- migrations_created: ${report.migrations_created}
- parent_writes: ${report.apply.write_counts.parent_writes ?? 0}
- merges: ${report.apply.write_counts.merges ?? 0}

## Scope

- child_deletes: ${report.apply.write_counts.child_deletes ?? 0}
- package_fingerprint: ${report.package_fingerprint}
- dry_run_proof_hash: ${report.dry_run_proof_hash}

## Finishes

${markdownTable(['finish', 'rows'], Object.entries(report.summary.by_finish).map(([key, count]) => [key, count]))}

## Sets

${markdownTable(['set', 'rows'], Object.entries(report.summary.by_set).map(([key, count]) => [key, count]))}

## Post-Apply Proof

${markdownTable(['field', 'value'], Object.entries(report.apply.proof_rows[0] ?? {}).map(([key, value]) => [key, value]))}
`;
}

const dryRun = await readJson(DRY_RUN_JSON);
const validationFindings = validateDryRun(dryRun);
if (validationFindings.length) {
  throw new Error(`PKG-27B dry-run artifact validation failed: ${validationFindings.join(', ')}`);
}

const targets = dryRun.targets ?? [];
const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required.');
const client = new Client({ connectionString: conn });
await client.connect();
let applyResult;
try {
  applyResult = await applyPackage(client, targets, dryRun.dry_run.before_snapshot.hash_sha256);
} finally {
  await client.end().catch(() => {});
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg27b_subset_variant_overfinish_child_delete_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: PACKAGE_FINGERPRINT,
  dry_run_proof_hash: DRY_RUN_PROOF_HASH,
  approval_text: APPROVAL_TEXT,
  dry_run_artifact: DRY_RUN_JSON,
  migrations_created: false,
  global_apply: false,
  quarantine_performed: false,
  unsupported_cleanup_scope_only: true,
  summary: {
    target_rows: targets.length,
    by_candidate_family: countBy(targets, (row) => row.candidate_family),
    by_set: countBy(targets, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(targets, (row) => row.finish_key),
  },
  apply: applyResult,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: PACKAGE_FINGERPRINT,
  dry_run_proof_hash: DRY_RUN_PROOF_HASH,
  apply_status: applyResult.apply_status,
  committed: applyResult.committed,
  write_counts: applyResult.write_counts,
  stop_findings: applyResult.stop_findings,
  migrations_created: false,
}, null, 2));
