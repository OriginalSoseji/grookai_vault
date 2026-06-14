import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40e_dependency_zero_child_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40e_dependency_zero_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg40e_dependency_zero_child_delete_real_apply_v1.md');

const PACKAGE_ID = 'PKG-40E-DEPENDENCY-ZERO-CHILD-DELETE';
const EXPECTED_PACKAGE_FINGERPRINT = 'fbdd4890f8dd691fe84a4879dcae4555ae1b0be7ca55d9d3774ec094a7fed6fa';
const EXPECTED_DRY_RUN_PROOF_HASH = 'e5ceff99bccf01d617ee0deff7f73ca5007c2604c906cefb7bcb2fcf5c22b5d5';
const OPTIONAL_DEPENDENCY_TABLES = ['justtcg_grookai_mappings', 'card_printing_truth_reviews'];

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
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

async function existingOptionalTables(client) {
  const result = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
    [OPTIONAL_DEPENDENCY_TABLES],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

async function captureSnapshot(client, targets) {
  const ids = targets.map((row) => row.card_printing_id);
  const rows = await client.query(
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
  const existingTables = await existingOptionalTables(client);
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
  if (existingTables.has('card_printing_truth_reviews')) {
    const truth = await client.query(
      `select count(*)::int as refs from public.card_printing_truth_reviews where card_printing_id = any($1::uuid[])`,
      [ids],
    );
    impactCounts.truth_review_refs = truth.rows[0].refs;
  }
  impactCounts.justtcg_mapping_refs = 0;
  if (existingTables.has('justtcg_grookai_mappings')) {
    const justtcg = await client.query(
      `select count(*)::int as refs from public.justtcg_grookai_mappings where card_printing_id = any($1::uuid[])`,
      [ids],
    );
    impactCounts.justtcg_mapping_refs = justtcg.rows[0].refs;
  }
  return {
    captured_at: new Date().toISOString(),
    rows: rows.rows,
    hash_sha256: sha256(stableJson(rows.rows)),
    impact_counts: impactCounts,
  };
}

async function runApply(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH) {
    throw new Error(`fresh before snapshot hash ${beforeSnapshot.hash_sha256} does not match approved dry-run proof ${EXPECTED_DRY_RUN_PROOF_HASH}`);
  }
  const beforeRefs = beforeSnapshot.impact_counts;
  if (
    beforeRefs.child_rows !== targets.length
    || beforeRefs.vault_item_instance_refs !== 0
    || beforeRefs.external_printing_mapping_refs !== 0
    || beforeRefs.canon_warehouse_candidate_refs !== 0
    || beforeRefs.truth_review_refs !== 0
    || beforeRefs.justtcg_mapping_refs !== 0
  ) {
    throw new Error(`fresh dependency guard failed: ${JSON.stringify(beforeRefs)}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    await client.query(
      `create temporary table pkg40e_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         proposed_status text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg40e_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key, row.proposed_status
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         proposed_status text
       )`,
      [JSON.stringify(targets)],
    );
    const existingTables = await existingOptionalTables(client);
    const guards = await client.query(
      `select
         (select count(*)::int from pkg40e_targets) as target_rows,
         (select count(*)::int from pkg40e_targets where finish_key not in ('reverse', 'holo')) as disallowed_finish_rows,
         (select count(*)::int
          from pkg40e_targets
          where proposed_status not in (
            'delete_candidate_no_reverse_evidence_after_holo_suffix_verified',
            'delete_candidate_no_reverse_evidence_holo_normal_preserved',
            'delete_candidate_suffix_normalization_duplicate',
            'delete_candidate_no_reverse_evidence_suffix_normalization_duplicate'
          )) as disallowed_status_rows,
         (select count(*)::int
          from public.card_printings cpr
          join pkg40e_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg40e_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg40e_targets t on t.card_printing_id = epm.card_printing_id) as external_printing_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg40e_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.truth_review_refs = 0;
    if (existingTables.has('card_printing_truth_reviews')) {
      const truth = await client.query(
        `select count(*)::int as refs from public.card_printing_truth_reviews ctr join pkg40e_targets t on t.card_printing_id = ctr.card_printing_id`,
      );
      guard.truth_review_refs = truth.rows[0].refs;
    }
    guard.justtcg_mapping_refs = 0;
    if (existingTables.has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs from public.justtcg_grookai_mappings jgm join pkg40e_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    if (
      guard.target_rows !== targets.length
      || guard.disallowed_finish_rows !== 0
      || guard.disallowed_status_rows !== 0
      || guard.matching_child_rows !== targets.length
      || guard.vault_item_instance_refs !== 0
      || guard.external_printing_mapping_refs !== 0
      || guard.canon_warehouse_candidate_refs !== 0
      || guard.truth_review_refs !== 0
      || guard.justtcg_mapping_refs !== 0
    ) {
      throw new Error(`PKG-40E real-apply guard failed: ${JSON.stringify(guard)}`);
    }
    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg40e_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (deleteResult.rowCount !== targets.length) {
      throw new Error(`PKG-40E delete mismatch: ${deleteResult.rowCount}`);
    }
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return { beforeSnapshot, afterSnapshot, guard, deleted_rows: deleteResult.rowCount };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# PKG-40E Dependency-Zero Child Delete Real Apply V1

Real apply for the explicitly approved PKG-40E scope.

## Safety

- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- parent_writes_performed: ${report.parent_writes_performed}
- mapping_writes_performed: ${report.mapping_writes_performed}
- deletes_performed: ${report.deletes_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['package_fingerprint', report.package_fingerprint],
    ['approved_dry_run_proof_hash', report.approved_dry_run_proof_hash],
    ['fresh_before_snapshot_hash', report.before_snapshot.hash_sha256],
    ['after_snapshot_child_rows', report.after_snapshot.impact_counts.child_rows],
    ['child_rows_deleted', report.summary.child_rows_deleted],
  ])}

## Targets

${markdownTable(
    ['set', 'number', 'card', 'finish', 'variant', 'status'],
    report.targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.finish_key,
      row.variant_key,
      row.proposed_status,
    ]),
  )}
`;
}

const dryRun = await readJson(DRY_RUN_JSON);
const sourceArtifact = dryRun.source_artifacts?.adjudication
  ? path.join(ROOT, dryRun.source_artifacts.adjudication)
  : null;
if (!sourceArtifact) throw new Error('dry-run artifact missing source adjudication path');
const source = await readJson(sourceArtifact);
if (dryRun.package_fingerprint !== EXPECTED_PACKAGE_FINGERPRINT) {
  throw new Error(`dry-run package fingerprint mismatch: ${dryRun.package_fingerprint} !== ${EXPECTED_PACKAGE_FINGERPRINT}`);
}
if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH || dryRun.execution?.after_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF_HASH) {
  throw new Error('dry-run proof hash does not match approved proof');
}
if (dryRun.execution?.rollback_proof_hash_match !== true) {
  throw new Error('dry-run rollback proof was not clean');
}

const targets = dryRun.targets ?? [];
if (targets.length !== 4) throw new Error(`Expected 4 PKG-40E targets, found ${targets.length}`);
const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  source_fingerprint: source.fingerprint_sha256,
  targets,
}));
if (packageFingerprint !== EXPECTED_PACKAGE_FINGERPRINT) {
  throw new Error(`recomputed package fingerprint mismatch: ${packageFingerprint} !== ${EXPECTED_PACKAGE_FINGERPRINT}`);
}

const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
const client = new Client({ connectionString: conn });
await client.connect();
let applyResult;
try {
  applyResult = await runApply(client, targets);
} finally {
  await client.end().catch(() => {});
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg40e_dependency_zero_child_delete_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  real_apply_performed: true,
  durable_db_writes_performed: true,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  parent_writes_performed: false,
  mapping_writes_performed: false,
  deletes_performed: true,
  approved_dry_run_proof_hash: EXPECTED_DRY_RUN_PROOF_HASH,
  dry_run_artifact: path.relative(ROOT, DRY_RUN_JSON),
  before_snapshot: applyResult.beforeSnapshot,
  after_snapshot: applyResult.afterSnapshot,
  guard: applyResult.guard,
  summary: {
    child_rows_deleted: applyResult.deleted_rows,
    by_set: countBy(targets, (row) => row.set_key),
    by_finish: countBy(targets, (row) => row.finish_key),
    by_status: countBy(targets, (row) => row.proposed_status),
  },
  targets,
  safety_confirmation: {
    approved_scope_only: true,
    no_global_apply: true,
    no_migrations_created: true,
    no_parent_writes: true,
    no_mapping_writes: true,
    no_cleanup_or_quarantine_performed: true,
    supported_canonical_rows_preserved: true,
  },
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  package_fingerprint: packageFingerprint,
  approved_dry_run_proof_hash: EXPECTED_DRY_RUN_PROOF_HASH,
  before_snapshot_hash: report.before_snapshot.hash_sha256,
  after_snapshot_child_rows: report.after_snapshot.impact_counts.child_rows,
  summary: report.summary,
  durable_db_writes_performed: true,
  migrations_created: false,
  parent_writes_performed: false,
  mapping_writes_performed: false,
}, null, 2));
