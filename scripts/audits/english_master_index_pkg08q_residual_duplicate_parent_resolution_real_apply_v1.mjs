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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08q_residual_duplicate_parent_resolution_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08q_residual_duplicate_parent_resolution_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08q_residual_duplicate_parent_resolution_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08q_residual_duplicate_parent_resolution_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08Q-RESIDUAL-DUPLICATE-PARENT-RESOLUTION';
const PACKAGE_FINGERPRINT = 'a0d03986b2871b4cb8b42a637bfbd695e54dc9cd4691760a16870eb14d283839';
const DRY_RUN_PROOF_HASH = '63f0beb47a99229eb7d53a0523fe3160ab78e497a27cefa6f7bb07860f26d704';
const APPROVAL_TEXT = 'Approve real PKG-08Q-RESIDUAL-DUPLICATE-PARENT-RESOLUTION apply only. Fingerprint: a0d03986b2871b4cb8b42a637bfbd695e54dc9cd4691760a16870eb14d283839. Scope: 2 duplicate-parent groups, 3 child inserts, 2 empty duplicate parent deletes, 2 external mapping transfers, 0 discovery candidate transfers, 0 vault reference transfers, 0 vault instance transfers, 0 pricing watch transfers, 0 duplicate pricing watch deletes across 2 sets; 1 append-only feed row across 1 set excluded for separate non-delete strategy. Dry-run proof: 63f0beb47a99229eb7d53a0523fe3160ab78e497a27cefa6f7bb07860f26d704 == 63f0beb47a99229eb7d53a0523fe3160ab78e497a27cefa6f7bb07860f26d704. No global apply. No migrations. No unsupported cleanup. No quarantine.';

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

function duplicateRows(groupTargets) {
  return groupTargets.flatMap((row) => row.duplicate_card_print_ids.map((duplicateId) => ({
    group_key: row.group_key,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    survivor_card_print_id: row.survivor_card_print_id,
    duplicate_card_print_id: duplicateId,
  })));
}

async function captureSnapshot(client, groupTargets) {
  const duplicateIds = groupTargets.flatMap((row) => row.duplicate_card_print_ids);
  const survivorIds = groupTargets.map((row) => row.survivor_card_print_id);
  const targetChildSurvivorIds = groupTargets.flatMap((row) => row.child_targets?.map((child) => child.survivor_card_print_id) ?? []);
  const targetChildFinishKeys = groupTargets.flatMap((row) => row.child_targets?.map((child) => child.finish_key) ?? []);
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
       (select count(*)::int from public.card_printings cpr join unnest($3::uuid[], $4::text[]) as target(card_print_id, finish_key) on target.card_print_id = cpr.card_print_id and target.finish_key = cpr.finish_key) as survivor_target_child_rows,
       (select count(*)::int from public.external_mappings where card_print_id = any($1::uuid[])) as duplicate_external_mapping_rows,
       (select count(*)::int from public.external_mappings where card_print_id = any($2::uuid[])) as survivor_external_mapping_rows,
       (select count(*)::int from public.card_print_species where card_print_id = any($1::uuid[])) as duplicate_species_rows,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_print_id = any($1::uuid[])) as duplicate_warehouse_candidate_rows,
       (select count(*)::int from public.external_discovery_candidates where card_print_id = any($1::uuid[])) as duplicate_external_discovery_candidate_rows,
       (select count(*)::int from public.justtcg_variants where card_print_id = any($1::uuid[])) as duplicate_justtcg_variant_rows,
       (select count(*)::int from public.justtcg_variant_prices_latest where card_print_id = any($1::uuid[])) as duplicate_justtcg_latest_rows,
       (select count(*)::int from public.justtcg_variant_price_snapshots where card_print_id = any($1::uuid[])) as duplicate_justtcg_snapshot_rows,
       (select count(*)::int from public.pricing_watch where card_print_id = any($1::uuid[])) as duplicate_pricing_watch_rows,
       (select count(*)::int from public.vault_item_instances where card_print_id = any($1::uuid[])) as duplicate_vault_instance_rows,
       (select count(*)::int from public.vault_items where card_id = any($1::uuid[])) as duplicate_vault_rows,
       (select count(*)::int from public.card_feed_events where card_print_id = any($1::uuid[])) as duplicate_card_feed_event_rows`,
    [
      duplicateIds,
      survivorIds,
      targetChildSurvivorIds,
      targetChildFinishKeys,
    ],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    impact_counts: refResult.rows[0],
  };
}

function buildTargetsFromDryRun(dryRun) {
  const groupTargets = dryRun.scope.group_targets.map((group) => ({
    ...group,
    child_targets: dryRun.scope.child_targets.filter((child) => child.group_key === group.group_key),
  }));
  return {
    groupTargets,
    childTargets: dryRun.scope.child_targets,
    blockedRows: dryRun.scope.blocked_rows_detail ?? [],
  };
}

function validateDryRun(dryRun, groupTargets, childTargets, blockedRows) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08q_residual_duplicate_parent_resolution_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_match_not_true');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (groupTargets.length !== 2) findings.push(`group_count_not_2:${groupTargets.length}`);
  if (childTargets.length !== 3) findings.push(`child_count_not_3:${childTargets.length}`);
  if (duplicateRows(groupTargets).length !== 2) findings.push('duplicate_parent_count_not_2');
  if (blockedRows.length !== 1) findings.push(`blocked_row_count_not_1:${blockedRows.length}`);
  if (blockedRows[0]?.set_key !== 'sv03.5') findings.push('blocked_row_not_sv03_5');
  return findings;
}

function validateBefore(snapshot) {
  const counts = snapshot?.impact_counts ?? {};
  const findings = [];
  if (snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('fresh_before_hash_mismatch');
  if (counts.duplicate_parent_rows !== 2) findings.push('before_duplicate_parent_rows_not_2');
  if (counts.survivor_parent_rows !== 2) findings.push('before_survivor_parent_rows_not_2');
  if (counts.duplicate_child_rows !== 0) findings.push('before_duplicate_child_rows_present');
  if (counts.survivor_target_child_rows !== 0) findings.push('before_survivor_target_child_rows_present');
  if (counts.duplicate_external_mapping_rows !== 2) findings.push('before_duplicate_external_mapping_rows_not_2');
  if (counts.duplicate_card_feed_event_rows !== 0) findings.push('before_duplicate_append_only_feed_rows_present');
  return findings;
}

function validateAfter(snapshot, childTargets) {
  const counts = snapshot?.impact_counts ?? {};
  const findings = [];
  if (counts.duplicate_parent_rows !== 0) findings.push('after_duplicate_parents_remain');
  if (counts.survivor_parent_rows !== 2) findings.push('after_survivor_parent_rows_not_2');
  if (counts.duplicate_child_rows !== 0) findings.push('after_duplicate_child_rows_present');
  if (counts.survivor_target_child_rows !== childTargets.length) findings.push('after_survivor_target_child_rows_not_3');
  if (counts.duplicate_external_mapping_rows !== 0) findings.push('after_duplicate_external_mappings_remain');
  if (counts.duplicate_species_rows !== 0) findings.push('after_duplicate_species_remain');
  if (counts.duplicate_warehouse_candidate_rows !== 0) findings.push('after_duplicate_warehouse_candidates_remain');
  if (counts.duplicate_external_discovery_candidate_rows !== 0) findings.push('after_duplicate_discovery_candidates_remain');
  if (counts.duplicate_justtcg_variant_rows !== 0) findings.push('after_duplicate_justtcg_variants_remain');
  if (counts.duplicate_justtcg_latest_rows !== 0) findings.push('after_duplicate_justtcg_latest_remain');
  if (counts.duplicate_justtcg_snapshot_rows !== 0) findings.push('after_duplicate_justtcg_snapshots_remain');
  if (counts.duplicate_pricing_watch_rows !== 0) findings.push('after_duplicate_pricing_watch_remain');
  if (counts.duplicate_vault_instance_rows !== 0) findings.push('after_duplicate_vault_instances_remain');
  if (counts.duplicate_vault_rows !== 0) findings.push('after_duplicate_vault_rows_remain');
  if (counts.duplicate_card_feed_event_rows !== 0) findings.push('after_duplicate_append_only_feed_rows_present');
  return findings;
}

async function applyPackage(client, groupTargets, childTargets) {
  const beforeSnapshot = await captureSnapshot(client, groupTargets);
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
      [JSON.stringify(duplicateRows(groupTargets))],
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
         (select count(*)::int from public.card_printings cpr join pkg08q_child_targets target on target.card_printing_id = cpr.id) as planned_child_id_collisions,
         (select count(*)::int from public.card_feed_events cfe join pkg08q_group_targets target on target.duplicate_card_print_id = cfe.card_print_id) as duplicate_append_only_feed_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.duplicate_targets !== 2
      || guardRow.survivor_targets !== 2
      || guardRow.child_targets !== 3
      || guardRow.inactive_finish_rows !== 0
      || guardRow.duplicate_child_rows !== 0
      || guardRow.survivor_existing_finish_rows !== 0
      || guardRow.planned_child_id_collisions !== 0
      || guardRow.duplicate_append_only_feed_rows !== 0
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
    if (mappingUpdate.rowCount !== 2 || childInsert.rowCount !== 3 || parentDelete.rowCount !== 2) {
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
        PACKAGE_FINGERPRINT,
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
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, groupTargets);
    return {
      apply_status: 'pkg08q_residual_duplicate_parent_resolution_committed',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: true,
      proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, groupTargets).catch(() => null);
    return {
      apply_status: 'pkg08q_residual_duplicate_parent_resolution_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      committed: false,
      proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-08Q Residual Duplicate Parent Resolution Real Apply V1

Approved real apply for the safe subset of residual duplicate-parent rows.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| db_write_committed | ${report.db_write_committed} |
| groups | ${report.scope.groups} |
| child_inserts | ${report.scope.child_inserts} |
| duplicate_parent_deletes | ${report.scope.duplicate_parent_deletes} |
| mapping_transfers | ${report.scope.mapping_transfers} |
| blocked_append_only_rows | ${report.scope.blocked_append_only_rows} |
| migrations_created | ${report.migrations_created} |
| unsupported_cleanup_performed | ${report.unsupported_cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

## By Set

${markdownTable(['set_key', 'rows'], Object.entries(report.scope.by_set))}

## Blocked Rows

${markdownTable(['set_key', 'card_number', 'card_name', 'finish_key', 'blocked_reason'], report.scope.blocked_rows_detail.map((row) => [
  row.set_key,
  row.card_number,
  row.card_name,
  row.finish_key,
  row.blocked_reason,
]))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08Q Residual Duplicate Parent Resolution Real Apply Checkpoint V1](20260610_pkg08q_residual_duplicate_parent_resolution_real_apply_checkpoint_v1.md) | Records approved real apply for 2 safe residual duplicate-parent groups; sv03.5 append-only feed row remains blocked for non-delete strategy. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08q_residual_duplicate_parent_resolution_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08q_residual_duplicate_parent_resolution_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = await readJson(DRY_RUN_JSON);
const { groupTargets, childTargets, blockedRows } = buildTargetsFromDryRun(dryRun);
const prerequisiteFindings = validateDryRun(dryRun, groupTargets, childTargets, blockedRows);
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
    applyResult = await applyPackage(client, groupTargets, childTargets);
  } finally {
    await client.end().catch(() => {});
  }
}

const afterFindings = applyResult.committed ? validateAfter(applyResult.after_snapshot, childTargets) : [];
const stopFindings = [
  ...prerequisiteFindings,
  ...(applyResult.error_message ? [`apply_error:${applyResult.error_message}`] : []),
  ...afterFindings,
];
const proof = applyResult.proof_rows?.[0] ?? {};
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08q_residual_duplicate_parent_resolution_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  approval_text: APPROVAL_TEXT,
  apply_status: applyResult.apply_status,
  db_write_committed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  unsupported_cleanup_performed: false,
  global_apply_performed: false,
  scope: {
    groups: groupTargets.length,
    child_inserts: proof.child_inserts ?? 0,
    duplicate_parent_deletes: proof.duplicate_parent_deletes ?? 0,
    mapping_transfers: proof.mapping_updates ?? 0,
    discovery_candidate_transfers: proof.external_discovery_candidate_updates ?? 0,
    vault_reference_transfers: proof.vault_updates ?? 0,
    vault_instance_transfers: proof.vault_instance_updates ?? 0,
    pricing_watch_transfers: proof.pricing_watch_updates ?? 0,
    pricing_watch_dedupe_deletes: proof.pricing_watch_dedupe_deletes ?? 0,
    blocked_append_only_rows: blockedRows.length,
    by_set: countBy(childTargets, (row) => row.set_key),
    by_finish: countBy(childTargets, (row) => row.finish_key),
    group_targets: groupTargets,
    child_targets: childTargets,
    blocked_rows_detail: blockedRows,
  },
  before_snapshot: applyResult.before_snapshot,
  after_snapshot: applyResult.after_snapshot,
  proof_rows: applyResult.proof_rows,
  stop_findings: stopFindings,
  pass: applyResult.committed && stopFindings.length === 0,
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
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  before_hash: report.before_snapshot?.hash_sha256 ?? null,
  after_hash: report.after_snapshot?.hash_sha256 ?? null,
  db_write_committed: report.db_write_committed,
  durable_db_writes_performed: report.durable_db_writes_performed,
  migrations_created: report.migrations_created,
  stop_findings: report.stop_findings,
}, null, 2));

if (!report.pass) process.exitCode = 1;
