import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeNumber } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08b_parent_identity_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08P-CRACKED-ICE-DUPLICATE-PARENT-RESOLUTION';
const CREATED_BY = 'pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

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

function buildTargets(rows) {
  const targets = [];
  const blockedRows = [];
  for (const row of rows) {
    const emptyParents = row.same_number_candidates.filter((candidate) => Number(candidate.child_count) === 0);
    const survivorParents = row.same_number_candidates.filter((candidate) => (
      Number(candidate.child_count) > 0
      && Array.isArray(candidate.finishes)
      && !candidate.finishes.includes(row.finish_key)
    ));
    if (emptyParents.length !== 1 || survivorParents.length !== 1) {
      blockedRows.push({
        ...row,
        blocked_reason: 'expected_one_empty_duplicate_and_one_survivor_without_cracked_ice',
        empty_parent_count: emptyParents.length,
        survivor_parent_count: survivorParents.length,
      });
      continue;
    }
    const duplicate = emptyParents[0];
    const survivor = survivorParents[0];
    targets.push({
      package_id: PACKAGE_ID,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      duplicate_card_print_id: duplicate.card_print_id,
      survivor_card_print_id: survivor.card_print_id,
      card_printing_id: crypto.randomUUID(),
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${normalizeNumber(row.card_number)}:${row.finish_key}`,
      created_by: CREATED_BY,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
    });
  }
  return { targets, blockedRows };
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
       coalesce((
         select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = cp.id
       ), '[]'::jsonb) as card_printings,
       coalesce((
         select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
         from public.external_mappings em
         where em.card_print_id = cp.id
       ), '[]'::jsonb) as external_mappings,
       coalesce((
         select jsonb_agg(to_jsonb(cps) order by cps.species_id, cps.role, cps.source, cps.id)
         from public.card_print_species cps
         where cps.card_print_id = cp.id
       ), '[]'::jsonb) as card_print_species,
       coalesce((
         select jsonb_agg(to_jsonb(cwc) order by cwc.id)
         from public.canon_warehouse_candidates cwc
         where cwc.promoted_card_print_id = cp.id
       ), '[]'::jsonb) as canon_warehouse_candidates,
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

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '90s'");
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
       select
         row.set_key,
         row.card_number,
         row.card_name,
         row.finish_key,
         row.duplicate_card_print_id::uuid,
         row.survivor_card_print_id::uuid,
         row.card_printing_id::uuid,
         row.provenance_source,
         row.provenance_ref,
         row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         set_key text,
         card_number text,
         card_name text,
         finish_key text,
         duplicate_card_print_id text,
         survivor_card_print_id text,
         card_printing_id text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(targets)],
    );
    const shape = await client.query(
      `select
         count(*)::int as target_rows,
         count(distinct duplicate_card_print_id)::int as duplicate_parent_rows,
         count(distinct survivor_card_print_id)::int as survivor_parent_rows,
         count(*) filter (where finish_key <> 'cracked_ice')::int as non_cracked_ice_rows,
         count(*) filter (where finish_key not in (select key from public.finish_keys where is_active = true))::int as inactive_finish_rows
       from pkg08p_targets`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.target_rows !== targets.length
      || shapeRow.duplicate_parent_rows !== targets.length
      || shapeRow.survivor_parent_rows !== targets.length
      || shapeRow.non_cracked_ice_rows !== 0
      || shapeRow.inactive_finish_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
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
    const guards = await client.query(
      `select
         (select count(*)::int from public.card_prints cp join pkg08p_targets t on t.duplicate_card_print_id = cp.id) as duplicate_parents_present,
         (select count(*)::int from public.card_prints cp join pkg08p_targets t on t.survivor_card_print_id = cp.id) as survivor_parents_present,
         (select count(*)::int from public.card_printings cpr join pkg08p_targets t on t.duplicate_card_print_id = cpr.card_print_id) as duplicate_child_rows,
         (select count(*)::int from public.card_printings cpr join pkg08p_targets t on t.survivor_card_print_id = cpr.card_print_id and cpr.finish_key = t.finish_key) as survivor_existing_finish_rows,
         (select count(*)::int from public.vault_items vi join pkg08p_targets t on t.duplicate_card_print_id = vi.card_id) as duplicate_vault_rows,
         (select count(*)::int from public.card_printings cpr join pkg08p_targets t on t.card_printing_id = cpr.id) as planned_child_id_collisions`,
    );
    const guardRow = guards.rows[0];
    if (
      guardRow.duplicate_parents_present !== targets.length
      || guardRow.survivor_parents_present !== targets.length
      || guardRow.duplicate_child_rows !== 0
      || guardRow.survivor_existing_finish_rows !== 0
      || guardRow.duplicate_vault_rows !== 0
      || guardRow.planned_child_id_collisions !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guardRow)}`);
    }
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
         id,
         card_print_id,
         finish_key,
         is_provisional,
         provenance_source,
         provenance_ref,
         created_by
       )
       select
         card_printing_id,
         survivor_card_print_id,
         finish_key,
         false,
         provenance_source,
         provenance_ref,
         created_by
       from pkg08p_targets`,
    );
    const parentDelete = await client.query(
      `delete from public.card_prints cp
       using pkg08p_targets target
       where cp.id = target.duplicate_card_print_id`,
    );
    if (
      mappingUpdate.rowCount !== targets.length
      || childInsert.rowCount !== targets.length
      || parentDelete.rowCount !== targets.length
    ) {
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
        packageFingerprint,
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
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg08p_cracked_ice_duplicate_parent_resolution_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg08p_cracked_ice_duplicate_parent_resolution_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-08P Cracked Ice Duplicate Parent Resolution Guarded Dry Run V1

Rollback-only dry run for the remaining cracked_ice duplicate-parent rows.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? ''}\`
- target_rows: ${report.scope?.target_rows ?? 0}
- mapping_transfers: ${report.scope?.mapping_transfers ?? 0}
- child_inserts: ${report.scope?.child_inserts ?? 0}
- duplicate_parent_delete_simulation: ${report.scope?.duplicate_parent_delete_simulation ?? 0}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- stop_findings: ${report.stop_findings?.length ?? 0}

## By Set

${markdownTable(['set_key', 'rows'], Object.entries(report.scope?.by_set ?? {}))}

## Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Approval Boundary

This is rollback-only proof. It does not authorize real apply.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08P Cracked Ice Duplicate Parent Resolution Guarded Dry Run Checkpoint V1](20260610_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 8 cracked_ice duplicate-parent resolutions; no durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => (
  row.adjudication_lane === 'duplicate_exact_parent'
  && row.finish_key === 'cracked_ice'
));
const { targets, blockedRows } = buildTargets(sourceRows);
const packageFingerprint = sha256(stableJson(targets.map((row) => ({
  set_key: row.set_key,
  card_number: row.card_number,
  card_name: row.card_name,
  finish_key: row.finish_key,
  duplicate_card_print_id: row.duplicate_card_print_id,
  survivor_card_print_id: row.survivor_card_print_id,
}))));
const conn = connectionString();
let report;

if (!conn) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_status: 'blocked_no_database_connection_string',
    durable_db_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    stop_findings: ['database_connection_unavailable'],
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const execution = targets.length > 0 && blockedRows.length === 0
      ? await runDryRun(client, targets, packageFingerprint)
      : {
        status: 'blocked_no_targets_or_blocked_rows_present',
        error_message: blockedRows.length ? 'blocked_rows_present' : 'no_targets',
        before_snapshot: null,
        after_snapshot: null,
        rollback_proof_rows: [],
      };
    const durableMatch = Boolean(execution.before_snapshot?.hash_sha256)
      && execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256;
    const stopFindings = [
      ...(sourceRows.length !== 8 ? [`source_cracked_ice_duplicate_rows_not_8:${sourceRows.length}`] : []),
      ...(targets.length !== 8 ? [`target_rows_not_8:${targets.length}`] : []),
      ...(blockedRows.length ? ['blocked_target_rows_present'] : []),
      ...(execution.status !== 'pkg08p_cracked_ice_duplicate_parent_resolution_completed_rolled_back_no_durable_change' ? ['dry_run_not_passed'] : []),
      ...(execution.error_message ? [`dry_run_error:${execution.error_message}`] : []),
      ...(!durableMatch ? ['durable_after_snapshot_differs_from_before_snapshot'] : []),
      ...(execution.before_snapshot?.impact_counts?.duplicate_child_rows !== 0 ? ['before_duplicate_child_rows_present'] : []),
      ...(execution.before_snapshot?.impact_counts?.duplicate_vault_rows !== 0 ? ['before_duplicate_vault_rows_present'] : []),
      ...(execution.before_snapshot?.impact_counts?.survivor_cracked_ice_rows !== 0 ? ['before_survivor_cracked_ice_rows_present'] : []),
    ];
    const bySet = countBy(targets, (row) => row.set_key);
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08p_cracked_ice_duplicate_parent_resolution_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      audit_only: false,
      rollback_only: true,
      dry_run_status: execution.status,
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_authorized: false,
      scope: {
        source_rows: sourceRows.length,
        target_rows: targets.length,
        duplicate_parent_rows: targets.length,
        survivor_parent_rows: targets.length,
        mapping_transfers: targets.length,
        child_inserts: targets.length,
        duplicate_parent_delete_simulation: targets.length,
        blocked_rows: blockedRows.length,
        by_set: bySet,
        by_finish: countBy(targets, (row) => row.finish_key),
        target_rows_detail: targets,
        blocked_rows_detail: blockedRows,
      },
      before_snapshot: execution.before_snapshot,
      after_snapshot: execution.after_snapshot,
      rollback_proof_rows: execution.rollback_proof_rows,
      durable_after_snapshot_matches_before_snapshot: durableMatch,
      recommended_real_apply_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 8 cracked_ice duplicate-parent resolutions: 8 external mapping transfers, 8 cracked_ice child inserts, 8 empty duplicate parent deletes across ${Object.keys(bySet).length} sets. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No unsupported cleanup. No quarantine.`
        : null,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
  output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  before_hash: report.before_snapshot?.hash_sha256 ?? null,
  after_hash: report.after_snapshot?.hash_sha256 ?? null,
  durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  stop_findings: report.stop_findings,
}, null, 2));

if ((report.stop_findings ?? []).length !== 0) process.exitCode = 1;
