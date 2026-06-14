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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08p_cracked_ice_duplicate_parent_resolution_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08P-CRACKED-ICE-DUPLICATE-PARENT-RESOLUTION';
const PACKAGE_FINGERPRINT = '67b344815544f4cb8962318d19298f25ef1153b60ce7ef07b75e9401f6ba43e2';
const DRY_RUN_PROOF_HASH = 'd765d98ad3197e06da8f37cb20c881dd6bfb44f5b164fae7434a272512523108';
const APPROVAL_TEXT = 'Approve real PKG-08P-CRACKED-ICE-DUPLICATE-PARENT-RESOLUTION apply only. Fingerprint: 67b344815544f4cb8962318d19298f25ef1153b60ce7ef07b75e9401f6ba43e2. Scope: 8 cracked_ice duplicate-parent resolutions: 8 external mapping transfers, 8 cracked_ice child inserts, 8 empty duplicate parent deletes across 2 sets. Dry-run proof: d765d98ad3197e06da8f37cb20c881dd6bfb44f5b164fae7434a272512523108 == d765d98ad3197e06da8f37cb20c881dd6bfb44f5b164fae7434a272512523108. No global apply. No migrations. No unsupported cleanup. No quarantine.';

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

async function captureSnapshot(client, targets) {
  const duplicateIds = targets.map((row) => row.duplicate_card_print_id);
  const survivorIds = targets.map((row) => row.survivor_card_print_id);
  const allIds = [...new Set([...duplicateIds, ...survivorIds])];
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.rarity,
       case when cp.id = any($1::uuid[]) then 'duplicate_parent' else 'survivor_parent' end as target_role,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as card_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
       coalesce((select jsonb_agg(to_jsonb(cps) order by cps.species_id, cps.role, cps.source, cps.id) from public.card_print_species cps where cps.card_print_id = cp.id), '[]'::jsonb) as card_print_species,
       coalesce((select jsonb_agg(to_jsonb(cwc) order by cwc.id) from public.canon_warehouse_candidates cwc where cwc.promoted_card_print_id = cp.id), '[]'::jsonb) as canon_warehouse_candidates,
       coalesce((select count(*)::int from public.justtcg_variants jv where jv.card_print_id = cp.id), 0) as justtcg_variant_count,
       coalesce((select count(*)::int from public.justtcg_variant_prices_latest jl where jl.card_print_id = cp.id), 0) as justtcg_latest_count,
       coalesce((select count(*)::int from public.justtcg_variant_price_snapshots js where js.card_print_id = cp.id), 0) as justtcg_snapshot_count,
       coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count
     from public.card_prints cp
     where cp.id = any($2::uuid[])
     order by cp.set_code, card_number, cp.name, cp.id`,
    [duplicateIds, allIds],
  );
  const refResult = await client.query(
    `select
       (select count(*)::int from public.card_prints where id = any($1::uuid[])) as duplicate_parent_rows,
       (select count(*)::int from public.card_prints where id = any($2::uuid[])) as survivor_parent_rows,
       (select count(*)::int from public.card_printings where card_print_id = any($1::uuid[])) as duplicate_child_rows,
       (select count(*)::int from public.card_printings where card_print_id = any($2::uuid[]) and finish_key = 'cracked_ice') as survivor_cracked_ice_rows,
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as duplicate_external_mapping_rows,
       (select count(*)::int from public.external_mappings where card_print_id = any($2::uuid[])) as survivor_external_mapping_rows,
       (select count(*)::int from public.card_print_species where card_print_id = any($1::uuid[])) as duplicate_species_rows,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_print_id = any($1::uuid[])) as duplicate_warehouse_candidate_rows,
       (select count(*)::int from public.justtcg_variants where card_print_id = any($1::uuid[])) as duplicate_justtcg_variant_rows,
       (select count(*)::int from public.justtcg_variant_prices_latest where card_print_id = any($1::uuid[])) as duplicate_justtcg_latest_rows,
       (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id = any($1::uuid[])) as duplicate_justtcg_snapshot_rows,
       (select count(*)::int from public.vault_items where card_id = any($1::uuid[])) as duplicate_vault_rows,
       (select count(*)::int from public.vault_items where card_id = any($2::uuid[])) as survivor_vault_rows`,
    [duplicateIds, survivorIds],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: refResult.rows[0],
  };
}

function validateDryRun(dryRun, targets) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08p_cracked_ice_duplicate_parent_resolution_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_match_not_true');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (targets.length !== 8) findings.push(`target_rows_not_8:${targets.length}`);
  if (Object.keys(countBy(targets, (row) => row.set_key)).length !== 2) findings.push('target_set_count_not_2');
  if (Object.keys(countBy(targets, (row) => row.finish_key)).join(',') !== 'cracked_ice') findings.push('target_finish_not_cracked_ice_only');
  return findings;
}

function validateBefore(snapshot) {
  const counts = snapshot?.impact_counts ?? {};
  const findings = [];
  if (snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('fresh_before_hash_mismatch');
  if (counts.duplicate_parent_rows !== 8) findings.push('before_duplicate_parent_rows_not_8');
  if (counts.survivor_parent_rows !== 8) findings.push('before_survivor_parent_rows_not_8');
  if (counts.duplicate_child_rows !== 0) findings.push('before_duplicate_child_rows_present');
  if (counts.survivor_cracked_ice_rows !== 0) findings.push('before_survivor_cracked_ice_rows_present');
  if (counts.duplicate_external_mapping_rows !== 8) findings.push('before_duplicate_external_mapping_rows_not_8');
  if (counts.duplicate_vault_rows !== 0 || counts.survivor_vault_rows !== 0) findings.push('vault_rows_present');
  return findings;
}

function validateAfter(snapshot) {
  const counts = snapshot?.impact_counts ?? {};
  const findings = [];
  if (counts.duplicate_parent_rows !== 0) findings.push('after_duplicate_parents_remain');
  if (counts.survivor_parent_rows !== 8) findings.push('after_survivor_parent_rows_not_8');
  if (counts.duplicate_child_rows !== 0) findings.push('after_duplicate_child_rows_present');
  if (counts.survivor_cracked_ice_rows !== 8) findings.push('after_survivor_cracked_ice_rows_not_8');
  if (counts.duplicate_external_mapping_rows !== 0) findings.push('after_duplicate_external_mappings_remain');
  if (counts.duplicate_species_rows !== 0) findings.push('after_duplicate_species_remain');
  if (counts.duplicate_warehouse_candidate_rows !== 0) findings.push('after_duplicate_warehouse_candidates_remain');
  if (counts.duplicate_justtcg_variant_rows !== 0) findings.push('after_duplicate_justtcg_variants_remain');
  if (counts.duplicate_justtcg_latest_rows !== 0) findings.push('after_duplicate_justtcg_latest_remain');
  if (counts.duplicate_justtcg_snapshot_rows !== 0) findings.push('after_duplicate_justtcg_snapshots_remain');
  if (counts.duplicate_vault_rows !== 0 || counts.survivor_vault_rows !== 0) findings.push('after_vault_rows_present');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
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
      `create temporary table pkg08p_targets (
         set_key text not null,
         card_number text not null,
         card_name text not null,
         finish_key text not null,
         duplicate_card_print_id uuid primary key,
         survivor_card_print_id uuid not null,
         card_printing_id uuid not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08p_targets
       select row.set_key, row.card_number, row.card_name, row.finish_key, row.duplicate_card_print_id::uuid,
              row.survivor_card_print_id::uuid, row.card_printing_id::uuid, row.provenance_source, row.provenance_ref, row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         set_key text, card_number text, card_name text, finish_key text, duplicate_card_print_id text,
         survivor_card_print_id text, card_printing_id text, provenance_source text, provenance_ref text, created_by text
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg08p_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg08p_targets t on t.duplicate_card_print_id = cp.id) as duplicate_parents_present,
         (select count(*)::int from public.card_prints cp join pkg08p_targets t on t.survivor_card_print_id = cp.id) as survivor_parents_present,
         (select count(*)::int from public.card_printings cpr join pkg08p_targets t on t.duplicate_card_print_id = cpr.card_print_id) as duplicate_child_rows,
         (select count(*)::int from public.card_printings cpr join pkg08p_targets t on t.survivor_card_print_id = cpr.card_print_id and cpr.finish_key = t.finish_key) as survivor_existing_finish_rows,
         (select count(*)::int from public.vault_items vi join pkg08p_targets t on t.duplicate_card_print_id = vi.card_id or t.survivor_card_print_id = vi.card_id) as vault_rows,
         (select count(*)::int from public.card_printings cpr join pkg08p_targets t on t.card_printing_id = cpr.id) as planned_child_id_collisions,
         (select count(*)::int from pkg08p_targets t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== 8
      || guardRow.duplicate_parents_present !== 8
      || guardRow.survivor_parents_present !== 8
      || guardRow.duplicate_child_rows !== 0
      || guardRow.survivor_existing_finish_rows !== 0
      || guardRow.vault_rows !== 0
      || guardRow.planned_child_id_collisions !== 0
      || guardRow.inactive_finish_rows !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guardRow)}`);
    }
    await client.query(
      `select cp.id
       from public.card_prints cp
       join (
         select duplicate_card_print_id as card_print_id from pkg08p_targets
         union
         select survivor_card_print_id as card_print_id from pkg08p_targets
       ) target on target.card_print_id = cp.id
       for update of cp`,
    );
    const mappingUpdate = await client.query(
      `update public.external_mappings em
       set card_print_id = target.survivor_card_print_id
       from pkg08p_targets target
       where em.card_print_id = target.duplicate_card_print_id`,
    );
    const speciesDedupeDelete = await client.query(
      `delete from public.card_print_species cps
       using pkg08p_targets target
       where cps.card_print_id = target.duplicate_card_print_id
         and cps.active = true
         and exists (
           select 1
           from public.card_print_species survivor_species
           where survivor_species.card_print_id = target.survivor_card_print_id
             and survivor_species.species_id = cps.species_id
             and survivor_species.role = cps.role
             and survivor_species.active = true
         )`,
    );
    const speciesUpdate = await client.query(
      `update public.card_print_species cps
       set card_print_id = target.survivor_card_print_id
       from pkg08p_targets target
       where cps.card_print_id = target.duplicate_card_print_id`,
    );
    const warehouseUpdate = await client.query(
      `update public.canon_warehouse_candidates cwc
       set promoted_card_print_id = target.survivor_card_print_id
       from pkg08p_targets target
       where cwc.promoted_card_print_id = target.duplicate_card_print_id`,
    );
    const justtcgVariantUpdate = await client.query(
      `update public.justtcg_variants jv
       set card_print_id = target.survivor_card_print_id
       from pkg08p_targets target
       where jv.card_print_id = target.duplicate_card_print_id`,
    );
    const justtcgLatestUpdate = await client.query(
      `update public.justtcg_variant_prices_latest jl
       set card_print_id = target.survivor_card_print_id
       from pkg08p_targets target
       where jl.card_print_id = target.duplicate_card_print_id`,
    );
    const justtcgSnapshotUpdate = await client.query(
      `update public.justtcg_variant_price_snapshots js
       set card_print_id = target.survivor_card_print_id
       from pkg08p_targets target
       where js.card_print_id = target.duplicate_card_print_id`,
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source, provenance_ref, created_by
       )
       select card_printing_id, survivor_card_print_id, finish_key, false, provenance_source, provenance_ref, created_by
       from pkg08p_targets`,
    );
    const parentDelete = await client.query(
      `delete from public.card_prints cp
       using pkg08p_targets target
       where cp.id = target.duplicate_card_print_id`,
    );
    if (mappingUpdate.rowCount !== 8 || childInsert.rowCount !== 8 || parentDelete.rowCount !== 8) {
      throw new Error(`write count mismatch: ${JSON.stringify({
        mapping_updates: mappingUpdate.rowCount,
        child_inserts: childInsert.rowCount,
        parent_deletes: parentDelete.rowCount,
      })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08p_targets) as target_rows,
         $3::int as mapping_updates,
         $4::int as child_inserts,
         $5::int as duplicate_parent_deletes,
         $6::int as species_updates,
         $7::int as warehouse_updates,
         $8::int as justtcg_variant_updates,
         $9::int as justtcg_latest_updates,
         $10::int as justtcg_snapshot_updates,
         $11::int as species_dedupe_deletes`,
      [
        PACKAGE_ID,
        PACKAGE_FINGERPRINT,
        mappingUpdate.rowCount,
        childInsert.rowCount,
        parentDelete.rowCount,
        speciesUpdate.rowCount,
        warehouseUpdate.rowCount,
        justtcgVariantUpdate.rowCount,
        justtcgLatestUpdate.rowCount,
        justtcgSnapshotUpdate.rowCount,
        speciesDedupeDelete.rowCount,
      ],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg08p_cracked_ice_duplicate_parent_resolution_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: true,
      proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      apply_status: 'pkg08p_cracked_ice_duplicate_parent_resolution_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: false,
      proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-08P Cracked Ice Duplicate Parent Resolution Real Apply V1

Approved real apply for the remaining cracked_ice duplicate-parent rows.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| db_write_committed | ${report.db_write_committed} |
| target_rows | ${report.scope.target_rows} |
| mapping_transfers | ${report.scope.mapping_transfers} |
| child_inserts | ${report.scope.child_inserts} |
| duplicate_parent_deletes | ${report.scope.duplicate_parent_deletes} |
| migrations_created | ${report.migrations_created} |
| unsupported_cleanup_performed | ${report.unsupported_cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

## By Set

${markdownTable(['set_key', 'rows'], Object.entries(report.scope.by_set))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08P Cracked Ice Duplicate Parent Resolution Real Apply Checkpoint V1](20260610_pkg08p_cracked_ice_duplicate_parent_resolution_real_apply_checkpoint_v1.md) | Records approved real apply for 8 cracked_ice duplicate-parent resolutions; no migrations, unsupported cleanup, or quarantine. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08p_cracked_ice_duplicate_parent_resolution_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08p_cracked_ice_duplicate_parent_resolution_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = await readJson(DRY_RUN_JSON);
const targets = dryRun.scope?.target_rows_detail ?? [];
const prerequisiteFindings = validateDryRun(dryRun, targets);
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
    applyResult = await applyPackage(client, targets);
  } finally {
    await client.end().catch(() => {});
  }
}

const afterFindings = applyResult.committed ? validateAfter(applyResult.after_snapshot) : ['apply_not_committed'];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.error_message ? [`apply_error:${applyResult.error_message}`] : []),
  ...afterFindings,
];
const pass = stopFindings.length === 0;
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  approval: {
    exact_approval_text: APPROVAL_TEXT,
    approved_real_apply_only: true,
    no_global_apply: true,
    no_migrations: true,
    no_unsupported_cleanup: true,
    no_quarantine: true,
  },
  apply_status: pass
    ? 'pkg08p_cracked_ice_duplicate_parent_resolution_committed_and_verified'
    : 'pkg08p_cracked_ice_duplicate_parent_resolution_failed_or_blocked',
  execution_status: applyResult.apply_status,
  error_message: applyResult.error_message,
  db_write_committed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: false,
  unsupported_cleanup_performed: false,
  quarantine_performed: false,
  global_apply_included: false,
  scope: {
    target_rows: targets.length,
    mapping_transfers: 8,
    child_inserts: 8,
    duplicate_parent_deletes: 8,
    by_set: countBy(targets, (row) => row.set_key),
    by_finish: countBy(targets, (row) => row.finish_key),
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  proof_rows: applyResult.proof_rows,
  verification_summary: {
    duplicate_parents_removed: applyResult.after_snapshot?.impact_counts?.duplicate_parent_rows === 0,
    survivor_parents_preserved: applyResult.after_snapshot?.impact_counts?.survivor_parent_rows === 8,
    cracked_ice_children_inserted: applyResult.after_snapshot?.impact_counts?.survivor_cracked_ice_rows === 8,
    duplicate_dependencies_removed: [
      'duplicate_external_mapping_rows',
      'duplicate_species_rows',
      'duplicate_warehouse_candidate_rows',
      'duplicate_justtcg_variant_rows',
      'duplicate_justtcg_latest_rows',
      'duplicate_justtcg_snapshot_rows',
    ].every((key) => Number(applyResult.after_snapshot?.impact_counts?.[key] ?? -1) === 0),
  },
  stop_findings: stopFindings,
  pass,
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
  execution_status: report.execution_status,
  db_write_committed: report.db_write_committed,
  scope: report.scope,
  proof_rows: report.proof_rows,
  verification_summary: report.verification_summary,
  migrations_created: report.migrations_created,
  unsupported_cleanup_performed: report.unsupported_cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  stop_findings: report.stop_findings,
}, null, 2));

if (!pass) process.exitCode = 1;
