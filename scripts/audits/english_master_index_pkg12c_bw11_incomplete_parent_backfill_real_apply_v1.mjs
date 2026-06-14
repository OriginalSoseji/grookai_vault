import crypto from 'node:crypto';
import fs from 'node:fs';
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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12c_bw11_incomplete_parent_backfill_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12C-BW11-INCOMPLETE-PARENT-BACKFILL';
const EXPECTED_FINGERPRINT = '18b5f0780d8f64e07bce8fac5654850faf67909c0cac55a0710e520d24102413';
const EXPECTED_DRY_RUN_PROOF = '7e7ec07c2093e445179762c2a478e6104adc316f67eaf5220a38488b8fb4755a';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg12c_bw11_incomplete_parent_backfill_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (!dryRun.recommended_real_apply_approval_text) findings.push('dry_run_missing_recommended_approval_text');
  if (dryRun.scope?.target_rows !== 5) findings.push('target_rows_not_5');
  if (dryRun.scope?.blocked_rows !== 0) findings.push('blocked_rows_present');
  if (dryRun.scope?.expected_operations?.survivor_set_code_updates !== 5) findings.push('survivor_update_scope_mismatch');
  if (dryRun.scope?.expected_operations?.tcgdex_mapping_transfers !== 5) findings.push('mapping_transfer_scope_mismatch');
  if (dryRun.scope?.expected_operations?.duplicate_child_deletes !== 15) findings.push('child_delete_scope_mismatch');
  if (dryRun.scope?.expected_operations?.duplicate_parent_deletes !== 5) findings.push('parent_delete_scope_mismatch');
  if (dryRun.scope?.expected_operations?.species_transfers !== 5) findings.push('species_transfer_scope_mismatch');
  if (dryRun.scope?.expected_operations?.trait_transfers !== 5) findings.push('trait_transfer_scope_mismatch');
  if (dryRun.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_proof_hash_mismatch');
  if (dryRun.after_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_proof_hash_mismatch');
  return findings;
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

async function runApply(client, targets, packageFingerprint) {
  await client.query('begin');
  try {
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
         (select count(*)::int from public.card_printings cpr join pkg12c_targets t on t.duplicate_card_print_id = cpr.card_print_id) as duplicate_children_remaining,
         (select count(*)::int from public.external_mappings em join pkg12c_targets t on t.survivor_card_print_id = em.card_print_id and em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id) as survivor_tcgdex_mapping_rows,
         (select count(*)::int from public.card_prints cp join pkg12c_targets t on t.survivor_card_print_id = cp.id and cp.set_code = t.live_set_code) as survivor_set_code_rows,
         (select count(*)::int from public.card_print_species cps join pkg12c_targets t on t.survivor_card_print_id = cps.card_print_id) as survivor_species_rows,
         (select count(*)::int from public.card_print_traits cpt join pkg12c_targets t on t.survivor_card_print_id = cpt.card_print_id) as survivor_trait_rows`,
    );
    const postGuardRow = postGuard.rows[0];
    if (
      postGuardRow.duplicate_parents_remaining !== 0 ||
      postGuardRow.duplicate_children_remaining !== 0 ||
      postGuardRow.survivor_tcgdex_mapping_rows !== targets.length ||
      postGuardRow.survivor_set_code_rows !== targets.length ||
      postGuardRow.survivor_species_rows !== targets.length ||
      postGuardRow.survivor_trait_rows !== targets.length
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
    await client.query('commit');
    return {
      proof_rows: proof.rows,
      survivor_updates: survivorUpdate.rowCount,
      mapping_transfers: mappingTransfer.rowCount,
      survivor_species_deletes: survivorSpeciesDelete.rowCount,
      species_transfers: speciesTransfer.rowCount,
      trait_transfers: traitTransfer.rowCount,
      child_deletes: childDelete.rowCount,
      parent_deletes: parentDelete.rowCount,
      error_message: null,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      proof_rows: [],
      survivor_updates: 0,
      mapping_transfers: 0,
      survivor_species_deletes: 0,
      species_transfers: 0,
      trait_transfers: 0,
      child_deletes: 0,
      parent_deletes: 0,
      error_message: error.message,
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-12C BW11 Incomplete Parent Backfill Real Apply V1

Approved real apply for five Legendary Treasures incomplete base parent reconciliations.

## Status

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- survivor_set_code_updates: ${report.scope?.survivor_set_code_updates ?? 0}
- tcgdex_mapping_transfers: ${report.scope?.tcgdex_mapping_transfers ?? 0}
- duplicate_child_deletes: ${report.scope?.duplicate_child_deletes ?? 0}
- duplicate_parent_deletes: ${report.scope?.duplicate_parent_deletes ?? 0}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Set

${markdownTable(['set_key', 'rows'], Object.entries(report.scope?.by_set ?? {}))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12C BW11 Incomplete Parent Backfill Real Apply Checkpoint V1](20260610_pkg12c_bw11_incomplete_parent_backfill_real_apply_checkpoint_v1.md) | Applied 5 BW11 survivor set_code updates, 5 TCGdex mapping transfers, 15 duplicate child deletes, 5 duplicate parent deletes, and species/trait transfers. No migrations, global apply, unsupported cleanup, or quarantine. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12c_bw11_incomplete_parent_backfill_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12c_bw11_incomplete_parent_backfill_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const targets = dryRun.scope?.target_rows_detail ?? [];
const prerequisiteFindings = validateDryRun(dryRun);
let report;

if (prerequisiteFindings.length) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
    apply_status: 'blocked_prerequisite_findings',
    prerequisite_findings: prerequisiteFindings,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };
} else {
  const conn = connectionString();
  if (!conn) {
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_real_apply_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
      apply_status: 'blocked_no_database_connection_string',
      prerequisite_findings: ['database_connection_unavailable'],
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      const beforeSnapshot = await captureSnapshot(client, targets);
      const applyResult = await runApply(client, targets, dryRun.package_fingerprint_sha256);
      const afterSnapshot = await captureSnapshot(client, targets);
      const postFindings = [];
      if (applyResult.error_message) postFindings.push(`apply_error:${applyResult.error_message}`);
      if (applyResult.survivor_updates !== targets.length) postFindings.push('survivor_update_count_mismatch');
      if (applyResult.mapping_transfers !== targets.length) postFindings.push('mapping_transfer_count_mismatch');
      if (applyResult.child_deletes !== targets.length * 3) postFindings.push('child_delete_count_mismatch');
      if (applyResult.parent_deletes !== targets.length) postFindings.push('parent_delete_count_mismatch');
      if (applyResult.species_transfers !== targets.length) postFindings.push('species_transfer_count_mismatch');
      if (applyResult.trait_transfers !== targets.length) postFindings.push('trait_transfer_count_mismatch');
      if (afterSnapshot.counts.duplicate_parent_rows !== 0) postFindings.push('post_duplicate_parent_rows_remaining');
      if (afterSnapshot.counts.survivor_parent_rows !== targets.length) postFindings.push('post_survivor_parent_count_mismatch');
      report = {
        generated_at: new Date().toISOString(),
        version: 'english_master_index_pkg12c_bw11_incomplete_parent_backfill_real_apply_v1',
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
        apply_status: postFindings.length ? 'applied_with_post_findings' : 'applied',
        prerequisite_findings: [],
        post_apply_findings: postFindings,
        db_writes_performed: applyResult.survivor_updates > 0 || applyResult.mapping_transfers > 0 || applyResult.child_deletes > 0 || applyResult.parent_deletes > 0,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        global_apply_performed: false,
        unsupported_cleanup_performed: false,
        scope: {
          survivor_set_code_updates: applyResult.survivor_updates,
          tcgdex_mapping_transfers: applyResult.mapping_transfers,
          duplicate_child_deletes: applyResult.child_deletes,
          duplicate_parent_deletes: applyResult.parent_deletes,
          survivor_species_deletes: applyResult.survivor_species_deletes,
          species_transfers: applyResult.species_transfers,
          trait_transfers: applyResult.trait_transfers,
          by_set: countBy(targets, (row) => row.set_key),
          target_rows: targets,
          proof_rows: applyResult.proof_rows,
        },
        before_snapshot: beforeSnapshot,
        after_snapshot: afterSnapshot,
      };
    } finally {
      await client.end().catch(() => {});
    }
  }
}

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint_md: CHECKPOINT_MD,
  apply_status: report.apply_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  prerequisite_findings: report.prerequisite_findings,
  post_apply_findings: report.post_apply_findings,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
}, null, 2));
