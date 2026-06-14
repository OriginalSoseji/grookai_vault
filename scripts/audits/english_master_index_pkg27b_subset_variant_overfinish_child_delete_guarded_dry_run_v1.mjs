import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg27a_subset_variant_overfinish_child_delete_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg27b_subset_variant_overfinish_child_delete_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg27b_subset_variant_overfinish_child_delete_guarded_dry_run_v1.md');
const PACKAGE_ID = 'PKG-27B-SUBSET-VARIANT-OVERFINISH-CHILD-DELETE';
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
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
    [OPTIONAL_DEPENDENCY_TABLES],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

function buildTargets(source) {
  const targets = [];
  const blocked = [];
  const seen = new Set();
  for (const row of source.candidates ?? []) {
    const dependencyTotal = Number(row.child_dependency_total ?? 0);
    const allowedShape = row.cleanup_readiness === 'dry_run_candidate'
      && row.card_printing_id
      && row.card_print_id
      && dependencyTotal === 0
      && ALLOWED_FAMILIES.has(row.candidate_family)
      && ALLOWED_FINISHES.has(row.finish_key)
      && !(row.known_index_finishes ?? []).includes(row.finish_key)
      && Number(row.sibling_rows_after_target_delete ?? 0) >= 1;
    if (!allowedShape || seen.has(row.card_printing_id)) {
      blocked.push({
        ...row,
        blocked_reason: seen.has(row.card_printing_id) ? 'duplicate_card_printing_id' : 'target_shape_not_allowed_for_pkg27b',
      });
      continue;
    }
    seen.add(row.card_printing_id);
    targets.push({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      canonical_set_key: row.canonical_set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      printed_identity_modifier: row.printed_identity_modifier ?? '',
      variant_key: row.variant_key ?? '',
      candidate_family: row.candidate_family,
      known_index_finishes: row.known_index_finishes ?? [],
    });
  }
  return {
    targets: targets.sort((left, right) => (
      String(left.canonical_set_key).localeCompare(String(right.canonical_set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.finish_key).localeCompare(String(right.finish_key))
      || String(left.card_printing_id).localeCompare(String(right.card_printing_id))
    )),
    blocked,
  };
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

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const before = beforeSnapshot.impact_counts;
  const beforeFindings = [];
  if (before.child_rows !== targets.length) beforeFindings.push(`before_child_rows_not_target_count:${before.child_rows}`);
  for (const key of ['vault_item_instance_refs', 'external_printing_mapping_refs', 'canon_warehouse_candidate_refs', 'truth_review_refs', 'justtcg_mapping_refs']) {
    if (Number(before[key] ?? 0) !== 0) beforeFindings.push(`before_${key}_present`);
  }
  if (beforeFindings.length) {
    return {
      dry_run_status: 'blocked_before_dry_run_live_shape_mismatch',
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      rollback_proof_hash_match: true,
      stop_findings: beforeFindings,
    };
  }

  try {
    await client.query('begin');
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
      throw new Error(`PKG-27B guard failed: ${JSON.stringify(guard)}`);
    }
    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg27b_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (deleteResult.rowCount !== targets.length) {
      throw new Error(`PKG-27B delete simulation mismatch: ${deleteResult.rowCount}`);
    }
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    dry_run_status: 'pkg27b_guarded_dry_run_passed_rolled_back_no_durable_change',
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    rollback_proof_hash_match: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
    stop_findings: [],
  };
}

function renderMarkdown(report) {
  return `# PKG-27B Subset Variant Overfinish Child Delete Guarded Dry Run V1

Rollback-only dry-run proof for deterministic subset/number-prefix overfinish child deletes.

## Safety

- real_apply_performed: ${report.real_apply_performed}
- db_writes_persisted: ${report.db_writes_persisted}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- target_rows: ${report.summary.target_rows}
- blocked_rows: ${report.summary.blocked_rows}
- dry_run_status: ${report.dry_run.dry_run_status}
- rollback_proof_hash_match: ${report.dry_run.rollback_proof_hash_match}
- package_fingerprint: ${report.package_fingerprint}
- dry_run_proof_hash: ${report.dry_run_proof_hash}

## Target Families

${markdownTable(['family', 'rows'], Object.entries(report.summary.by_candidate_family).map(([key, count]) => [key, count]))}

## Target Sets

${markdownTable(['set', 'rows'], Object.entries(report.summary.by_set).map(([key, count]) => [key, count]))}

## Target Finishes

${markdownTable(['finish', 'rows'], Object.entries(report.summary.by_finish).map(([key, count]) => [key, count]))}

## Guardrails

- This was rollback-only.
- No durable DB change was performed.
- No migrations were created.
- No parent writes are included.
- Real apply requires exact approval with package fingerprint and dry-run proof hash.
`;
}

const source = await readJson(SOURCE_JSON);
const { targets, blocked } = buildTargets(source);
if (targets.length === 0) throw new Error('PKG-27B has no targets.');
const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required.');
const client = new Client({ connectionString: conn });
await client.connect();
let dryRun;
try {
  dryRun = await runDryRun(client, targets);
} finally {
  await client.end().catch(() => {});
}
const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  targets: targets.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    printed_identity_modifier: row.printed_identity_modifier,
    variant_key: row.variant_key,
    candidate_family: row.candidate_family,
  })),
  blocked: blocked.map((row) => ({
    card_printing_id: row.card_printing_id,
    blocked_reason: row.blocked_reason,
  })),
}));
const dryRunProofHash = sha256(stableJson({
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  before_hash: dryRun.before_snapshot.hash_sha256,
  after_hash: dryRun.after_snapshot.hash_sha256,
  rollback_proof_hash_match: dryRun.rollback_proof_hash_match,
  target_rows: targets.length,
}));
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg27b_subset_variant_overfinish_child_delete_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  dry_run_proof_hash: dryRunProofHash,
  real_apply_performed: false,
  db_writes_persisted: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  source_package_fingerprint: source.package_fingerprint,
  summary: {
    target_rows: targets.length,
    blocked_rows: blocked.length,
    by_candidate_family: countBy(targets, (row) => row.candidate_family),
    by_set: countBy(targets, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(targets, (row) => row.finish_key),
  },
  dry_run: dryRun,
  targets,
  blocked_rows: blocked,
};
await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  dry_run_proof_hash: dryRunProofHash,
  dry_run_status: dryRun.dry_run_status,
  rollback_proof_hash_match: dryRun.rollback_proof_hash_match,
  summary: report.summary,
  real_apply_performed: false,
  db_writes_persisted: false,
  migrations_created: false,
}, null, 2));
