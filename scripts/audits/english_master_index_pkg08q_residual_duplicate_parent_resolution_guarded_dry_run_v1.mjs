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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08Q-RESIDUAL-DUPLICATE-PARENT-RESOLUTION';
const CREATED_BY = 'pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_v1';
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

function groupKey(row) {
  return `${row.set_key}|${normalizeNumber(row.card_number)}|${row.card_name}`;
}

function chooseSurvivor(candidates) {
  return [...candidates].sort((left, right) => (
    Number(right.child_count) - Number(left.child_count)
    || Number(right.external_mapping_count) - Number(left.external_mapping_count)
    || String(left.card_print_id).localeCompare(String(right.card_print_id))
  ))[0];
}

function buildTargets(rows) {
  const rowsByGroup = new Map();
  for (const row of rows) {
    const key = groupKey(row);
    if (!rowsByGroup.has(key)) rowsByGroup.set(key, []);
    rowsByGroup.get(key).push(row);
  }
  const groupTargets = [];
  const childTargets = [];
  const blockedRows = [];
  for (const [key, groupRows] of rowsByGroup) {
    const candidatesById = new Map();
    for (const row of groupRows) {
      for (const candidate of row.same_number_candidates) candidatesById.set(candidate.card_print_id, candidate);
    }
    const candidates = [...candidatesById.values()];
    const survivor = chooseSurvivor(candidates);
    const duplicates = candidates.filter((candidate) => candidate.card_print_id !== survivor.card_print_id);
    if (!survivor || duplicates.length === 0 || duplicates.some((candidate) => Number(candidate.child_count) !== 0)) {
      blockedRows.push({
        group_key: key,
        blocked_reason: 'survivor_or_empty_duplicate_shape_not_safe',
        survivor,
        duplicates,
        source_rows: groupRows,
      });
      continue;
    }
    groupTargets.push({
      group_key: key,
      set_key: groupRows[0].set_key,
      card_number: groupRows[0].card_number,
      card_name: groupRows[0].card_name,
      survivor_card_print_id: survivor.card_print_id,
      duplicate_card_print_ids: duplicates.map((candidate) => candidate.card_print_id),
      strategy: Number(survivor.child_count) > 0 ? 'empty_duplicate_to_populated_survivor' : 'empty_duplicate_to_best_empty_survivor',
      survivor_existing_finishes: survivor.finishes ?? [],
      sources: [...new Set(groupRows.flatMap((row) => row.sources ?? []))].sort(),
      evidence_urls: [...new Set(groupRows.flatMap((row) => row.evidence_urls ?? []))].sort(),
    });
    for (const row of groupRows) {
      if ((survivor.finishes ?? []).includes(row.finish_key)) continue;
      childTargets.push({
        group_key: key,
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        survivor_card_print_id: survivor.card_print_id,
        card_printing_id: crypto.randomUUID(),
        provenance_source: PROVENANCE_SOURCE,
        provenance_ref: `${row.set_key}:${normalizeNumber(row.card_number)}:${row.finish_key}`,
        created_by: CREATED_BY,
      });
    }
  }
  return { groupTargets, childTargets, blockedRows };
}

async function captureSnapshot(client, groupTargets) {
  const duplicateIds = groupTargets.flatMap((row) => row.duplicate_card_print_ids);
  const survivorIds = groupTargets.map((row) => row.survivor_card_print_id);
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
       coalesce((select jsonb_agg(to_jsonb(edc) order by edc.source, edc.upstream_id, edc.id) from public.external_discovery_candidates edc where edc.card_print_id = cp.id), '[]'::jsonb) as external_discovery_candidates,
       coalesce((select count(*)::int from public.justtcg_variants jv where jv.card_print_id = cp.id), 0) as justtcg_variant_count,
       coalesce((select count(*)::int from public.justtcg_variant_prices_latest jl where jl.card_print_id = cp.id), 0) as justtcg_latest_count,
       coalesce((select count(*)::int from public.justtcg_variant_price_snapshots js where js.card_print_id = cp.id), 0) as justtcg_snapshot_count,
       coalesce((select jsonb_agg(to_jsonb(pw) order by pw.watch_reason, pw.id) from public.pricing_watch pw where pw.card_print_id = cp.id), '[]'::jsonb) as pricing_watch,
       coalesce((select jsonb_agg(to_jsonb(vii) order by vii.user_id, vii.id) from public.vault_item_instances vii where vii.card_print_id = cp.id), '[]'::jsonb) as vault_item_instances,
       coalesce((select jsonb_agg(to_jsonb(vi) order by vi.user_id, vi.id) from public.vault_items vi where vi.card_id = cp.id), '[]'::jsonb) as vault_items
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
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as duplicate_external_mapping_rows,
       (select count(*)::int from public.external_mappings where card_print_id = any($2::uuid[])) as survivor_external_mapping_rows,
       (select count(*)::int from public.card_print_species where card_print_id = any($1::uuid[])) as duplicate_species_rows,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_print_id = any($1::uuid[])) as duplicate_warehouse_candidate_rows,
       (select count(*)::int from public.external_discovery_candidates where card_print_id = any($1::uuid[])) as duplicate_external_discovery_candidate_rows,
       (select count(*)::int from public.external_discovery_candidates where card_print_id = any($2::uuid[])) as survivor_external_discovery_candidate_rows,
       (select count(*)::int from public.justtcg_variants where card_print_id = any($1::uuid[])) as duplicate_justtcg_variant_rows,
       (select count(*)::int from public.justtcg_variant_prices_latest where card_print_id = any($1::uuid[])) as duplicate_justtcg_latest_rows,
       (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id = any($1::uuid[])) as duplicate_justtcg_snapshot_rows,
       (select count(*)::int from public.pricing_watch where card_print_id = any($1::uuid[])) as duplicate_pricing_watch_rows,
       (select count(*)::int from public.pricing_watch where card_print_id = any($2::uuid[])) as survivor_pricing_watch_rows,
       (select count(*)::int from public.vault_item_instances where card_print_id = any($1::uuid[])) as duplicate_vault_instance_rows,
       (select count(*)::int from public.vault_item_instances where card_print_id = any($2::uuid[])) as survivor_vault_instance_rows,
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

async function runDryRun(client, groupTargets, childTargets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, groupTargets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08q_group_targets (
         group_key text not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         survivor_card_print_id uuid not null,
         duplicate_card_print_id uuid not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg08q_child_targets (
         group_key text not null,
         card_printing_id uuid primary key,
         survivor_card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    const duplicateRows = groupTargets.flatMap((row) => row.duplicate_card_print_ids.map((duplicateId) => ({
      group_key: row.group_key,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      survivor_card_print_id: row.survivor_card_print_id,
      duplicate_card_print_id: duplicateId,
    })));
    await client.query(
      `insert into pkg08q_group_targets
       select row.group_key, row.set_key, row.card_number, row.card_name, row.survivor_card_print_id::uuid, row.duplicate_card_print_id::uuid
       from jsonb_to_recordset($1::jsonb) as row(
         group_key text,
         set_key text,
         card_number text,
         card_name text,
         survivor_card_print_id text,
         duplicate_card_print_id text
       )`,
      [JSON.stringify(duplicateRows)],
    );
    await client.query(
      `insert into pkg08q_child_targets
       select row.group_key, row.card_printing_id::uuid, row.survivor_card_print_id::uuid, row.finish_key, row.provenance_source, row.provenance_ref, row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         group_key text,
         card_printing_id text,
         survivor_card_print_id text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(childTargets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg08q_group_targets) as duplicate_targets,
         (select count(distinct survivor_card_print_id)::int from pkg08q_group_targets) as survivor_targets,
         (select count(*)::int from pkg08q_child_targets) as child_targets,
         (select count(*)::int from pkg08q_child_targets child left join public.finish_keys fk on fk.key = child.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows,
         (select count(*)::int from public.card_printings cpr join pkg08q_group_targets target on target.duplicate_card_print_id = cpr.card_print_id) as duplicate_child_rows,
         (select count(*)::int from public.card_printings cpr join pkg08q_child_targets target on target.survivor_card_print_id = cpr.card_print_id and target.finish_key = cpr.finish_key) as survivor_existing_finish_rows,
         (select count(*)::int from public.card_printings cpr join pkg08q_child_targets target on target.card_printing_id = cpr.id) as planned_child_id_collisions`,
    );
    const guardRow = guard.rows[0];
    const expectedDuplicateTargets = groupTargets.reduce((sum, row) => sum + row.duplicate_card_print_ids.length, 0);
    const expectedSurvivorTargets = new Set(groupTargets.map((row) => row.survivor_card_print_id)).size;
    if (
      guardRow.duplicate_targets !== expectedDuplicateTargets
      || guardRow.survivor_targets !== expectedSurvivorTargets
      || guardRow.child_targets !== childTargets.length
      || guardRow.inactive_finish_rows !== 0
      || guardRow.duplicate_child_rows !== 0
      || guardRow.survivor_existing_finish_rows !== 0
      || guardRow.planned_child_id_collisions !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guardRow)}`);
    }
    await client.query(
      `select cp.id
       from public.card_prints cp
       join (
         select duplicate_card_print_id as card_print_id from pkg08q_group_targets
         union
         select survivor_card_print_id as card_print_id from pkg08q_group_targets
       ) target on target.card_print_id = cp.id
       for update of cp`,
    );
    const mappingUpdate = await client.query(
      `update public.external_mappings em
       set card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where em.card_print_id = target.duplicate_card_print_id`,
    );
    const speciesDedupeDelete = await client.query(
      `delete from public.card_print_species cps
       using pkg08q_group_targets target
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
       from pkg08q_group_targets target
       where cps.card_print_id = target.duplicate_card_print_id`,
    );
    const warehouseUpdate = await client.query(
      `update public.canon_warehouse_candidates cwc
       set promoted_card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where cwc.promoted_card_print_id = target.duplicate_card_print_id`,
    );
    const externalDiscoveryCandidateUpdate = await client.query(
      `update public.external_discovery_candidates edc
       set card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where edc.card_print_id = target.duplicate_card_print_id`,
    );
    const justtcgVariantUpdate = await client.query(
      `update public.justtcg_variants jv
       set card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where jv.card_print_id = target.duplicate_card_print_id`,
    );
    const justtcgLatestUpdate = await client.query(
      `update public.justtcg_variant_prices_latest jl
       set card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where jl.card_print_id = target.duplicate_card_print_id`,
    );
    const justtcgSnapshotUpdate = await client.query(
      `update public.justtcg_variant_price_snapshots js
       set card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where js.card_print_id = target.duplicate_card_print_id`,
    );
    const vaultUpdate = await client.query(
      `update public.vault_items vi
       set card_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where vi.card_id = target.duplicate_card_print_id`,
    );
    const vaultInstanceUpdate = await client.query(
      `update public.vault_item_instances vii
       set card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where vii.card_print_id = target.duplicate_card_print_id`,
    );
    const pricingWatchDedupeDelete = await client.query(
      `delete from public.pricing_watch pw
       using pkg08q_group_targets target
       where pw.card_print_id = target.duplicate_card_print_id
         and exists (
           select 1
           from public.pricing_watch survivor_pw
           where survivor_pw.card_print_id = target.survivor_card_print_id
             and survivor_pw.watch_reason = pw.watch_reason
         )`,
    );
    const pricingWatchUpdate = await client.query(
      `update public.pricing_watch pw
       set card_print_id = target.survivor_card_print_id
       from pkg08q_group_targets target
       where pw.card_print_id = target.duplicate_card_print_id`,
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source, provenance_ref, created_by
       )
       select card_printing_id, survivor_card_print_id, finish_key, false, provenance_source, provenance_ref, created_by
       from pkg08q_child_targets`,
    );
    const parentDelete = await client.query(
      `delete from public.card_prints cp
       using pkg08q_group_targets target
       where cp.id = target.duplicate_card_print_id`,
    );
    const expectedParentDeletes = groupTargets.reduce((sum, row) => sum + row.duplicate_card_print_ids.length, 0);
    const expectedMappingUpdates = Number(beforeSnapshot.impact_counts?.duplicate_external_mapping_rows ?? 0);
    if (mappingUpdate.rowCount !== expectedMappingUpdates || childInsert.rowCount !== childTargets.length || parentDelete.rowCount !== expectedParentDeletes) {
      throw new Error(`write count mismatch: ${JSON.stringify({
        mapping_updates: mappingUpdate.rowCount,
        expected_mapping_updates: expectedMappingUpdates,
        child_inserts: childInsert.rowCount,
        expected_child_inserts: childTargets.length,
        parent_deletes: parentDelete.rowCount,
        expected_parent_deletes: expectedParentDeletes,
      })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         $3::int as groups,
         $4::int as duplicate_parent_deletes,
         $5::int as child_inserts,
         $6::int as mapping_updates,
         $7::int as vault_updates,
         $8::int as species_updates,
         $9::int as species_dedupe_deletes,
         $10::int as warehouse_updates,
         $11::int as justtcg_variant_updates,
         $12::int as justtcg_latest_updates,
         $13::int as justtcg_snapshot_updates,
         $14::int as pricing_watch_updates,
         $15::int as pricing_watch_dedupe_deletes,
         $16::int as vault_instance_updates,
         $17::int as external_discovery_candidate_updates`,
      [
        PACKAGE_ID,
        packageFingerprint,
        groupTargets.length,
        parentDelete.rowCount,
        childInsert.rowCount,
        mappingUpdate.rowCount,
        vaultUpdate.rowCount,
        speciesUpdate.rowCount,
        speciesDedupeDelete.rowCount,
        warehouseUpdate.rowCount,
        justtcgVariantUpdate.rowCount,
        justtcgLatestUpdate.rowCount,
        justtcgSnapshotUpdate.rowCount,
        pricingWatchUpdate.rowCount,
        pricingWatchDedupeDelete.rowCount,
        vaultInstanceUpdate.rowCount,
        externalDiscoveryCandidateUpdate.rowCount,
      ],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, groupTargets);
    return {
      status: 'pkg08q_residual_duplicate_parent_resolution_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, groupTargets).catch(() => null);
    return {
      status: 'pkg08q_residual_duplicate_parent_resolution_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

async function excludeAppendOnlyFeedGroups(client, sourceRows, groupTargets, childTargets, blockedRows) {
  const duplicateIds = groupTargets.flatMap((row) => row.duplicate_card_print_ids);
  if (!duplicateIds.length) return { groupTargets, childTargets, blockedRows };
  const result = await client.query(
    `select card_print_id::text, count(*)::int as card_feed_event_count
     from public.card_feed_events
     where card_print_id = any($1::uuid[])
     group by card_print_id`,
    [duplicateIds],
  );
  const feedCounts = new Map(result.rows.map((row) => [row.card_print_id, Number(row.card_feed_event_count)]));
  const blockedGroupKeys = new Set(
    groupTargets
      .filter((row) => row.duplicate_card_print_ids.some((id) => (feedCounts.get(id) ?? 0) > 0))
      .map((row) => row.group_key),
  );
  if (!blockedGroupKeys.size) return { groupTargets, childTargets, blockedRows };
  const appendOnlyBlockedRows = sourceRows
    .filter((row) => blockedGroupKeys.has(groupKey(row)))
    .map((row) => ({
      ...row,
      blocked_reason: 'duplicate_parent_has_append_only_card_feed_events_requires_non_delete_strategy',
    }));
  return {
    groupTargets: groupTargets.filter((row) => !blockedGroupKeys.has(row.group_key)),
    childTargets: childTargets.filter((row) => !blockedGroupKeys.has(row.group_key)),
    blockedRows: [...blockedRows, ...appendOnlyBlockedRows],
  };
}

function renderMarkdown(report) {
  return `# PKG-08Q Residual Duplicate Parent Resolution Guarded Dry Run V1

Rollback-only dry run for the remaining duplicate-exact-parent rows after cracked_ice closure.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? ''}\`
- groups: ${report.scope?.groups ?? 0}
- duplicate_parent_delete_simulation: ${report.scope?.duplicate_parent_delete_simulation ?? 0}
- child_inserts: ${report.scope?.child_inserts ?? 0}
- mapping_transfers: ${report.scope?.mapping_transfers ?? 0}
- vault_transfers: ${report.scope?.vault_transfers ?? 0}
- vault_instance_transfers: ${report.scope?.vault_instance_transfers ?? 0}
- pricing_watch_transfers: ${report.scope?.pricing_watch_transfers ?? 0}
- pricing_watch_dedupe_deletes: ${report.scope?.pricing_watch_dedupe_deletes ?? 0}
- external_discovery_candidate_transfers: ${report.scope?.external_discovery_candidate_transfers ?? 0}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- stop_findings: ${report.stop_findings?.length ?? 0}

## By Set

${markdownTable(['set_key', 'rows'], Object.entries(report.scope?.by_set ?? {}))}

## By Finish

${markdownTable(['finish_key', 'rows'], Object.entries(report.scope?.by_finish ?? {}))}

## Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08Q Residual Duplicate Parent Resolution Guarded Dry Run Checkpoint V1](20260610_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 4 remaining duplicate finish rows across 3 duplicate-parent groups; includes vault transfer simulation, no durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

function fingerprintForTargets(groupTargets, childTargets) {
  return sha256(stableJson({
    groups: groupTargets.map((row) => ({
      group_key: row.group_key,
      survivor_card_print_id: row.survivor_card_print_id,
      duplicate_card_print_ids: row.duplicate_card_print_ids,
      strategy: row.strategy,
    })),
    child_targets: childTargets.map((row) => ({
      group_key: row.group_key,
      finish_key: row.finish_key,
      survivor_card_print_id: row.survivor_card_print_id,
    })),
  }));
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.adjudication_lane === 'duplicate_exact_parent');
const initialTargets = buildTargets(sourceRows);
let packageFingerprint = fingerprintForTargets(initialTargets.groupTargets, initialTargets.childTargets);
const conn = connectionString();
let report;

if (!conn) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_v1',
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
    const targetState = await excludeAppendOnlyFeedGroups(
      client,
      sourceRows,
      initialTargets.groupTargets,
      initialTargets.childTargets,
      initialTargets.blockedRows,
    );
    const { groupTargets, childTargets, blockedRows } = targetState;
    packageFingerprint = fingerprintForTargets(groupTargets, childTargets);
    const execution = groupTargets.length > 0
      ? await runDryRun(client, groupTargets, childTargets, packageFingerprint)
      : {
        status: 'blocked_no_executable_targets',
        error_message: 'no_executable_targets',
        before_snapshot: null,
        after_snapshot: null,
        rollback_proof_rows: [],
      };
    const durableMatch = Boolean(execution.before_snapshot?.hash_sha256)
      && execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256;
    const executableSetCount = new Set(groupTargets.map((row) => row.set_key)).size;
    const blockedSetCount = new Set(blockedRows.map((row) => row.set_key)).size;
    const stopFindings = [
      ...(sourceRows.length !== 4 ? [`source_duplicate_rows_not_4:${sourceRows.length}`] : []),
      ...(groupTargets.length === 0 ? ['no_executable_duplicate_groups'] : []),
      ...(childTargets.length === 0 ? ['no_executable_child_targets'] : []),
      ...(execution.status !== 'pkg08q_residual_duplicate_parent_resolution_completed_rolled_back_no_durable_change' ? ['dry_run_not_passed'] : []),
      ...(execution.error_message ? [`dry_run_error:${execution.error_message}`] : []),
      ...(!durableMatch ? ['durable_after_snapshot_differs_from_before_snapshot'] : []),
      ...(execution.before_snapshot?.impact_counts?.duplicate_child_rows !== 0 ? ['before_duplicate_child_rows_present'] : []),
    ];
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_v1',
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
      unsupported_cleanup_performed: false,
      real_apply_authorized: false,
      scope: {
        source_rows: sourceRows.length,
        executable_source_rows: childTargets.length,
        groups: groupTargets.length,
        duplicate_parent_delete_simulation: groupTargets.reduce((sum, row) => sum + row.duplicate_card_print_ids.length, 0),
        survivor_parent_rows: groupTargets.length,
        child_inserts: childTargets.length,
        mapping_transfers: execution.rollback_proof_rows?.[0]?.mapping_updates ?? null,
        vault_transfers: execution.rollback_proof_rows?.[0]?.vault_updates ?? null,
        vault_instance_transfers: execution.rollback_proof_rows?.[0]?.vault_instance_updates ?? null,
        pricing_watch_transfers: execution.rollback_proof_rows?.[0]?.pricing_watch_updates ?? null,
        pricing_watch_dedupe_deletes: execution.rollback_proof_rows?.[0]?.pricing_watch_dedupe_deletes ?? null,
        external_discovery_candidate_transfers: execution.rollback_proof_rows?.[0]?.external_discovery_candidate_updates ?? null,
        blocked_rows: blockedRows.length,
        blocked_append_only_rows: blockedRows.filter((row) => row.blocked_reason === 'duplicate_parent_has_append_only_card_feed_events_requires_non_delete_strategy').length,
        by_set: countBy(childTargets, (row) => row.set_key),
        by_finish: countBy(childTargets, (row) => row.finish_key),
        group_targets: groupTargets,
        child_targets: childTargets,
        blocked_rows_detail: blockedRows,
      },
      before_snapshot: execution.before_snapshot,
      after_snapshot: execution.after_snapshot,
      rollback_proof_rows: execution.rollback_proof_rows,
      durable_after_snapshot_matches_before_snapshot: durableMatch,
      recommended_real_apply_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${groupTargets.length} duplicate-parent groups, ${childTargets.length} child inserts, ${groupTargets.reduce((sum, row) => sum + row.duplicate_card_print_ids.length, 0)} empty duplicate parent deletes, ${execution.rollback_proof_rows?.[0]?.mapping_updates ?? 0} external mapping transfers, ${execution.rollback_proof_rows?.[0]?.external_discovery_candidate_updates ?? 0} discovery candidate transfers, ${execution.rollback_proof_rows?.[0]?.vault_updates ?? 0} vault reference transfers, ${execution.rollback_proof_rows?.[0]?.vault_instance_updates ?? 0} vault instance transfers, ${execution.rollback_proof_rows?.[0]?.pricing_watch_updates ?? 0} pricing watch transfers, ${execution.rollback_proof_rows?.[0]?.pricing_watch_dedupe_deletes ?? 0} duplicate pricing watch deletes across ${executableSetCount} sets; ${blockedRows.length} append-only feed row across ${blockedSetCount} set excluded for separate non-delete strategy. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No unsupported cleanup. No quarantine.`
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
