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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12C-BW11-INCOMPLETE-PARENT-BACKFILL';
const TARGET_FACTS = [
  { set_key: 'bw11', set_name: 'Legendary Treasures', card_number: '2', card_name: 'Tangrowth', tcgdex_external_id: 'bw11-2' },
  { set_key: 'bw11', set_name: 'Legendary Treasures', card_number: '8', card_name: 'Serperior', tcgdex_external_id: 'bw11-8' },
  { set_key: 'bw11', set_name: 'Legendary Treasures', card_number: '11', card_name: 'Swadloon', tcgdex_external_id: 'bw11-11' },
  { set_key: 'bw11', set_name: 'Legendary Treasures', card_number: '17', card_name: 'Charmander', tcgdex_external_id: 'bw11-17' },
  { set_key: 'bw11', set_name: 'Legendary Treasures', card_number: '25', card_name: 'Tepig', tcgdex_external_id: 'bw11-25' },
];
const EXPECTED_FINISHES = ['holo', 'normal', 'reverse'];

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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

async function buildTargets(client) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         tcgdex_external_id text
       )
     ),
     resolved as (
       select
         t.*,
         s.id::text as set_id,
         s.code as live_set_code
       from target t
       join public.sets s on s.game = 'pokemon' and s.code = t.set_key
     )
     select
       r.*,
       duplicate_cp.id::text as duplicate_card_print_id,
       survivor_cp.id::text as survivor_card_print_id,
       coalesce((select jsonb_agg(cpr.finish_key order by cpr.finish_key) from public.card_printings cpr where cpr.card_print_id = duplicate_cp.id), '[]'::jsonb) as duplicate_finishes,
       coalesce((select jsonb_agg(cpr.finish_key order by cpr.finish_key) from public.card_printings cpr where cpr.card_print_id = survivor_cp.id), '[]'::jsonb) as survivor_finishes,
       coalesce((select count(*)::int from public.card_feed_events cfe where cfe.card_print_id = duplicate_cp.id), 0) as duplicate_feed_events,
       coalesce((select count(*)::int from public.vault_items vi where vi.card_id = duplicate_cp.id), 0) as duplicate_vault_items,
       coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = duplicate_cp.id), 0) as duplicate_vault_instances,
       coalesce((select count(*)::int from public.pricing_watch pw where pw.card_print_id = duplicate_cp.id), 0) as duplicate_pricing_watch,
       coalesce((select count(*)::int from public.external_discovery_candidates edc where edc.card_print_id = duplicate_cp.id), 0) as duplicate_discovery_candidates,
       coalesce((select count(*)::int from public.canon_warehouse_candidates cwc where cwc.promoted_card_print_id = duplicate_cp.id), 0) as duplicate_warehouse_candidates,
       coalesce((select count(*)::int from public.justtcg_variants jv where jv.card_print_id = duplicate_cp.id), 0) as duplicate_justtcg_variants,
       coalesce((select count(*)::int from public.justtcg_variant_prices_latest jl where jl.card_print_id = duplicate_cp.id), 0) as duplicate_justtcg_latest,
       coalesce((select count(*)::int from public.justtcg_variant_price_snapshots js where js.card_print_id = duplicate_cp.id), 0) as duplicate_justtcg_snapshots,
       coalesce((select count(*)::int from public.card_print_species cps where cps.card_print_id = duplicate_cp.id), 0) as duplicate_species_rows,
       coalesce((select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = duplicate_cp.id), 0) as duplicate_trait_rows
     from resolved r
     join public.external_mappings em
       on em.source = 'tcgdex'
      and em.external_id = r.tcgdex_external_id
     join public.card_prints duplicate_cp
       on duplicate_cp.id = em.card_print_id
      and duplicate_cp.set_id = r.set_id::uuid
      and duplicate_cp.name = r.card_name
      and duplicate_cp.set_code is null
      and duplicate_cp.number is null
      and duplicate_cp.number_plain is null
     join public.card_prints survivor_cp
       on survivor_cp.set_id = r.set_id::uuid
      and survivor_cp.name = r.card_name
      and survivor_cp.number = r.card_number
      and survivor_cp.number_plain = r.card_number
      and survivor_cp.printed_identity_modifier is null
      and coalesce(survivor_cp.variant_key, '') = ''
      and survivor_cp.id <> duplicate_cp.id
     order by r.card_number::int`,
    [JSON.stringify(TARGET_FACTS)],
  );

  const rows = result.rows.map((row) => ({
    package_id: PACKAGE_ID,
    set_key: row.set_key,
    set_name: row.set_name,
    set_id: row.set_id,
    live_set_code: row.live_set_code,
    card_number: row.card_number,
    card_name: row.card_name,
    tcgdex_external_id: row.tcgdex_external_id,
    duplicate_card_print_id: row.duplicate_card_print_id,
    survivor_card_print_id: row.survivor_card_print_id,
    duplicate_finishes: row.duplicate_finishes,
    survivor_finishes: row.survivor_finishes,
    duplicate_feed_events: row.duplicate_feed_events,
    duplicate_vault_items: row.duplicate_vault_items,
    duplicate_vault_instances: row.duplicate_vault_instances,
    duplicate_pricing_watch: row.duplicate_pricing_watch,
    duplicate_discovery_candidates: row.duplicate_discovery_candidates,
    duplicate_warehouse_candidates: row.duplicate_warehouse_candidates,
    duplicate_justtcg_variants: row.duplicate_justtcg_variants,
    duplicate_justtcg_latest: row.duplicate_justtcg_latest,
    duplicate_justtcg_snapshots: row.duplicate_justtcg_snapshots,
    duplicate_species_rows: row.duplicate_species_rows,
    duplicate_trait_rows: row.duplicate_trait_rows,
  }));

  const blockedRows = [];
  for (const row of rows) {
    const duplicateFinishes = stableJson(row.duplicate_finishes);
    const survivorFinishes = stableJson(row.survivor_finishes);
    if (duplicateFinishes !== stableJson(EXPECTED_FINISHES) || survivorFinishes !== stableJson(EXPECTED_FINISHES)) {
      blockedRows.push({ ...row, blocked_reason: 'duplicate_survivor_finish_shape_mismatch' });
    }
    if (
      row.duplicate_feed_events !== 0 ||
      row.duplicate_vault_items !== 0 ||
      row.duplicate_vault_instances !== 0 ||
      row.duplicate_pricing_watch !== 0 ||
      row.duplicate_discovery_candidates !== 0 ||
      row.duplicate_warehouse_candidates !== 0 ||
      row.duplicate_justtcg_variants !== 0 ||
      row.duplicate_justtcg_latest !== 0 ||
      row.duplicate_justtcg_snapshots !== 0
    ) {
      blockedRows.push({ ...row, blocked_reason: 'duplicate_parent_has_non_transferable_dependency' });
    }
  }

  return {
    targets: blockedRows.length ? [] : rows,
    blockedRows,
    rawRows: rows,
  };
}

async function captureSnapshot(client, targets) {
  const duplicateIds = targets.map((row) => row.duplicate_card_print_id);
  const survivorIds = targets.map((row) => row.survivor_card_print_id);
  const allIds = [...new Set([...duplicateIds, ...survivorIds])];
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       case when cp.id = any($1::uuid[]) then 'duplicate_parent' else 'survivor_parent' end as target_role,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cp.rarity,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as card_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
       coalesce((select jsonb_agg(to_jsonb(cps) order by cps.id) from public.card_print_species cps where cps.card_print_id = cp.id), '[]'::jsonb) as card_print_species,
       coalesce((select jsonb_agg(to_jsonb(cpt) order by cpt.id) from public.card_print_traits cpt where cpt.card_print_id = cp.id), '[]'::jsonb) as card_print_traits
     from public.card_prints cp
     where cp.id = any($2::uuid[])
     order by target_role, cp.name, cp.number nulls first, cp.id`,
    [duplicateIds, allIds],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      duplicate_parent_rows: rows.filter((row) => row.target_role === 'duplicate_parent').length,
      survivor_parent_rows: rows.filter((row) => row.target_role === 'survivor_parent').length,
      total_rows: rows.length,
    },
  };
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg12c_targets (
         set_key text not null,
         set_id uuid not null,
         live_set_code text not null,
         card_number text not null,
         card_name text not null,
         tcgdex_external_id text not null,
         duplicate_card_print_id uuid primary key,
         survivor_card_print_id uuid not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg12c_targets
       select
         row.set_key,
         row.set_id::uuid,
         row.live_set_code,
         row.card_number,
         row.card_name,
         row.tcgdex_external_id,
         row.duplicate_card_print_id::uuid,
         row.survivor_card_print_id::uuid
       from jsonb_to_recordset($1::jsonb) as row(
         set_key text,
         set_id text,
         live_set_code text,
         card_number text,
         card_name text,
         tcgdex_external_id text,
         duplicate_card_print_id text,
         survivor_card_print_id text
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg12c_targets) as target_rows,
         (select count(*)::int from public.card_printings cpr join pkg12c_targets t on t.duplicate_card_print_id = cpr.card_print_id) as duplicate_child_rows,
         (select count(*)::int from public.card_printings cpr join pkg12c_targets t on t.survivor_card_print_id = cpr.card_print_id) as survivor_child_rows,
         (select count(*)::int from public.external_mappings em join pkg12c_targets t on t.duplicate_card_print_id = em.card_print_id and em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id) as duplicate_tcgdex_mapping_rows,
         (select count(*)::int from public.external_mappings em join pkg12c_targets t on t.survivor_card_print_id = em.card_print_id and em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id) as survivor_tcgdex_mapping_rows,
         (select count(*)::int from public.card_prints cp join pkg12c_targets t on t.survivor_card_print_id = cp.id where cp.set_code is not null and cp.set_code <> t.live_set_code) as survivor_wrong_set_code_rows,
         (select count(*)::int from public.card_feed_events cfe join pkg12c_targets t on t.duplicate_card_print_id = cfe.card_print_id) as duplicate_feed_rows,
         (select count(*)::int from public.vault_items vi join pkg12c_targets t on t.duplicate_card_print_id = vi.card_id) as duplicate_vault_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg12c_targets t on t.duplicate_card_print_id = vii.card_print_id) as duplicate_vault_instance_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== targets.length ||
      guardRow.duplicate_child_rows !== targets.length * 3 ||
      guardRow.survivor_child_rows !== targets.length * 3 ||
      guardRow.duplicate_tcgdex_mapping_rows !== targets.length ||
      guardRow.survivor_tcgdex_mapping_rows !== 0 ||
      guardRow.survivor_wrong_set_code_rows !== 0 ||
      guardRow.duplicate_feed_rows !== 0 ||
      guardRow.duplicate_vault_rows !== 0 ||
      guardRow.duplicate_vault_instance_rows !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guardRow)}`);
    }
    await client.query(
      `select cp.id
       from public.card_prints cp
       join (
         select duplicate_card_print_id as card_print_id from pkg12c_targets
         union
         select survivor_card_print_id as card_print_id from pkg12c_targets
       ) t on t.card_print_id = cp.id
       for update of cp`,
    );
    const survivorUpdate = await client.query(
      `update public.card_prints cp
       set set_code = t.live_set_code
       from pkg12c_targets t
       where cp.id = t.survivor_card_print_id
         and cp.set_id = t.set_id
         and cp.number = t.card_number
         and cp.number_plain = t.card_number
         and cp.printed_identity_modifier is null
         and (cp.set_code is null or cp.set_code = t.live_set_code)`,
    );
    const mappingTransfer = await client.query(
      `update public.external_mappings em
       set card_print_id = t.survivor_card_print_id
       from pkg12c_targets t
       where em.card_print_id = t.duplicate_card_print_id
         and em.source = 'tcgdex'
         and em.external_id = t.tcgdex_external_id`,
    );
    const survivorSpeciesDelete = await client.query(
      `delete from public.card_print_species survivor_species
       using pkg12c_targets t, public.card_print_species duplicate_species
       where survivor_species.card_print_id = t.survivor_card_print_id
         and duplicate_species.card_print_id = t.duplicate_card_print_id
         and survivor_species.species_id = duplicate_species.species_id
         and survivor_species.role = duplicate_species.role
         and survivor_species.source = duplicate_species.source
         and survivor_species.active = duplicate_species.active`,
    );
    const speciesTransfer = await client.query(
      `update public.card_print_species cps
       set card_print_id = t.survivor_card_print_id
       from pkg12c_targets t
       where cps.card_print_id = t.duplicate_card_print_id`,
    );
    const traitTransfer = await client.query(
      `update public.card_print_traits cpt
       set card_print_id = t.survivor_card_print_id
       from pkg12c_targets t
       where cpt.card_print_id = t.duplicate_card_print_id`,
    );
    const childDelete = await client.query(
      `delete from public.card_printings duplicate_child
       using pkg12c_targets t
       where duplicate_child.card_print_id = t.duplicate_card_print_id
         and exists (
           select 1
           from public.card_printings survivor_child
           where survivor_child.card_print_id = t.survivor_card_print_id
             and survivor_child.finish_key = duplicate_child.finish_key
         )`,
    );
    const parentDelete = await client.query(
      `delete from public.card_prints cp
       using pkg12c_targets t
       where cp.id = t.duplicate_card_print_id
         and not exists (select 1 from public.card_printings cpr where cpr.card_print_id = cp.id)
         and not exists (select 1 from public.external_mappings em where em.card_print_id = cp.id)
         and not exists (select 1 from public.card_print_species cps where cps.card_print_id = cp.id)
         and not exists (select 1 from public.card_print_traits cpt where cpt.card_print_id = cp.id)`,
    );
    if (
      survivorUpdate.rowCount !== targets.length ||
      mappingTransfer.rowCount !== targets.length ||
      survivorSpeciesDelete.rowCount !== targets.length ||
      speciesTransfer.rowCount !== targets.length ||
      traitTransfer.rowCount !== targets.length ||
      childDelete.rowCount !== targets.length * 3 ||
      parentDelete.rowCount !== targets.length
    ) {
      throw new Error(`write count mismatch: ${JSON.stringify({
        survivor_updates: survivorUpdate.rowCount,
        mapping_transfers: mappingTransfer.rowCount,
        survivor_species_deletes: survivorSpeciesDelete.rowCount,
        species_transfers: speciesTransfer.rowCount,
        trait_transfers: traitTransfer.rowCount,
        child_deletes: childDelete.rowCount,
        parent_deletes: parentDelete.rowCount,
      })}`);
    }
    const postGuard = await client.query(
      `select
         (select count(*)::int from public.card_prints cp join pkg12c_targets t on t.duplicate_card_print_id = cp.id) as duplicate_parents_remaining,
         (select count(*)::int from public.external_mappings em join pkg12c_targets t on t.survivor_card_print_id = em.card_print_id and em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id) as survivor_tcgdex_mapping_rows,
         (select count(*)::int from public.card_prints cp join pkg12c_targets t on t.survivor_card_print_id = cp.id and cp.set_code = t.live_set_code) as survivor_set_code_rows`,
    );
    const postGuardRow = postGuard.rows[0];
    if (
      postGuardRow.duplicate_parents_remaining !== 0 ||
      postGuardRow.survivor_tcgdex_mapping_rows !== targets.length ||
      postGuardRow.survivor_set_code_rows !== targets.length
    ) {
      throw new Error(`postwrite guard failed: ${JSON.stringify(postGuardRow)}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         $3::int as target_rows,
         $4::int as survivor_updates,
         $5::int as mapping_transfers,
         $6::int as child_deletes,
         $7::int as parent_deletes,
         $8::int as species_transfers,
         $9::int as trait_transfers`,
      [
        PACKAGE_ID,
        packageFingerprint,
        targets.length,
        survivorUpdate.rowCount,
        mappingTransfer.rowCount,
        childDelete.rowCount,
        parentDelete.rowCount,
        speciesTransfer.rowCount,
        traitTransfer.rowCount,
      ],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg12c_bw11_incomplete_parent_backfill_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg12c_bw11_incomplete_parent_backfill_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-12C BW11 Incomplete Parent Backfill Guarded Dry Run V1

Rollback-only dry run for Legendary Treasures incomplete base parents.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- target_rows: ${report.scope?.target_rows ?? 0}
- blocked_rows: ${report.scope?.blocked_rows ?? 0}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Set

${markdownTable(['set_key', 'rows'], Object.entries(report.scope?.by_set ?? {}))}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12C BW11 Incomplete Parent Backfill Guarded Dry Run Checkpoint V1](20260610_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 5 BW11 survivor set_code updates, 5 TCGdex mapping transfers, 15 duplicate child deletes, and 5 duplicate parent deletes. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const conn = connectionString();
  let report;
  if (!conn) {
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      dry_run_status: 'blocked_no_database_connection_string',
      stop_findings: ['database_connection_unavailable'],
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      const readiness = await buildTargets(client);
      const targets = readiness.targets;
      const packageFingerprint = sha256(stableJson({
        package_id: PACKAGE_ID,
        targets: targets.map((row) => ({
          set_key: row.set_key,
          card_number: row.card_number,
          card_name: row.card_name,
          duplicate_card_print_id: row.duplicate_card_print_id,
          survivor_card_print_id: row.survivor_card_print_id,
          tcgdex_external_id: row.tcgdex_external_id,
        })),
      }));
      const execution = targets.length === TARGET_FACTS.length && readiness.blockedRows.length === 0
        ? await runDryRun(client, targets, packageFingerprint)
        : {
          status: 'blocked_target_shape_or_blocked_rows_present',
          error_message: null,
          before_snapshot: null,
          after_snapshot: null,
          rollback_proof_rows: [],
        };
      const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
      const stopFindings = [];
      if (targets.length !== TARGET_FACTS.length) stopFindings.push('target_count_mismatch');
      if (readiness.blockedRows.length !== 0) stopFindings.push('blocked_rows_present');
      if (execution.status !== 'pkg12c_bw11_incomplete_parent_backfill_completed_rolled_back_no_durable_change') stopFindings.push('dry_run_not_passed');
      if (execution.error_message) stopFindings.push(`dry_run_error:${execution.error_message}`);
      if (!durableMatch) stopFindings.push('durable_after_snapshot_differs_from_before_snapshot');
      report = {
        generated_at: new Date().toISOString(),
        version: 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_v1',
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: packageFingerprint,
        rollback_only: true,
        dry_run_status: execution.status,
        durable_db_writes_performed: false,
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        real_apply_authorized: false,
        scope: {
          target_rows: targets.length,
          blocked_rows: readiness.blockedRows.length,
          by_set: countBy(targets, (row) => row.set_key),
          target_rows_detail: targets,
          blocked_rows_detail: readiness.blockedRows,
          raw_rows: readiness.rawRows,
          expected_operations: {
            survivor_set_code_updates: targets.length,
            tcgdex_mapping_transfers: targets.length,
            duplicate_child_deletes: targets.length * 3,
            duplicate_parent_deletes: targets.length,
            species_transfers: targets.length,
            trait_transfers: targets.length,
          },
        },
        before_snapshot: execution.before_snapshot,
        after_snapshot: execution.after_snapshot,
        durable_after_snapshot_matches_before_snapshot: durableMatch,
        rollback_proof_rows: execution.rollback_proof_rows,
        stop_findings: stopFindings,
        recommended_real_apply_approval_text: stopFindings.length === 0
          ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} BW11 survivor parent set_code updates, ${targets.length} TCGdex mapping transfers, ${targets.length * 3} duplicate child deletes, ${targets.length} duplicate parent deletes, ${targets.length} species transfers, ${targets.length} trait transfers. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No unsupported cleanup. No quarantine.`
          : null,
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
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    checkpoint_md: CHECKPOINT_MD,
    dry_run_status: report.dry_run_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    scope: report.scope,
    stop_findings: report.stop_findings,
    recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
