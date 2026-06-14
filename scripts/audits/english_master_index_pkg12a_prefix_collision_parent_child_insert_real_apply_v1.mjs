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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12a_prefix_collision_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12a_prefix_collision_parent_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12a_prefix_collision_parent_child_insert_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12a_prefix_collision_parent_child_insert_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12A-PREFIX-COLLISION-PARENT-CHILD-INSERTS';

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
  if (dryRun.dry_run_status !== 'pkg12a_prefix_collision_parent_child_insert_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (!dryRun.recommended_real_apply_approval_text) findings.push('dry_run_missing_recommended_approval_text');
  if (dryRun.scope?.target_parent_rows !== 3) findings.push('target_parent_rows_not_3');
  if (dryRun.scope?.target_child_rows !== 6) findings.push('target_child_rows_not_6');
  if (dryRun.scope?.target_external_mappings !== 3) findings.push('target_mapping_rows_not_3');
  if (dryRun.scope?.blocked_rows !== 5) findings.push('blocked_rows_not_5');
  if (dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256) findings.push('dry_run_proof_hash_mismatch');
  return findings;
}

async function captureSnapshot(client, scope) {
  const result = await client.query(
    `with parent_target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     ),
     child_target as (
       select *
       from jsonb_to_recordset($2::jsonb) as t(card_printing_id uuid)
     ),
     mapping_target as (
       select *
       from jsonb_to_recordset($3::jsonb) as t(source text, external_id text)
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name as card_name,
       null::text as finish_key,
       null::text as source,
       null::text as external_id
     from parent_target t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name as card_name,
       cpr.finish_key,
       null::text as source,
       null::text as external_id
     from child_target t
     join public.card_printings cpr on cpr.id = t.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'mapping' as row_type,
       em.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name as card_name,
       null::text as finish_key,
       em.source,
       em.external_id
     from mapping_target t
     join public.external_mappings em on em.source = t.source and em.external_id = t.external_id
     left join public.card_prints cp on cp.id = em.card_print_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, source nulls last, external_id nulls last, row_id`,
    [
      JSON.stringify(scope.parentRows),
      JSON.stringify(scope.childRows),
      JSON.stringify(scope.mappingRows),
    ],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      parent_rows: rows.filter((row) => row.row_type === 'parent').length,
      child_rows: rows.filter((row) => row.row_type === 'child').length,
      mapping_rows: rows.filter((row) => row.row_type === 'mapping').length,
      total_rows: rows.length,
    },
  };
}

async function runApply(client, scope) {
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg12a_parent_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         live_set_code text not null,
         card_number text not null,
         printed_identity_modifier text null,
         card_name text not null,
         rarity text null,
         variant_key text not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg12a_child_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg12a_mapping_targets (
         source text not null,
         external_id text not null,
         card_print_id uuid not null,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg12a_parent_targets
       select
         row.card_print_id::uuid,
         row.set_id::uuid,
         row.live_set_code,
         row.card_number,
         row.printed_identity_modifier,
         row.card_name,
         row.rarity,
         row.variant_key,
         row.external_ids,
         row.ai_metadata
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         live_set_code text,
         card_number text,
         printed_identity_modifier text,
         card_name text,
         rarity text,
         variant_key text,
         external_ids jsonb,
         ai_metadata jsonb
       )`,
      [JSON.stringify(scope.parentRows)],
    );
    await client.query(
      `insert into pkg12a_child_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.finish_key,
         row.provenance_source,
         row.provenance_ref,
         row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(scope.childRows)],
    );
    await client.query(
      `insert into pkg12a_mapping_targets
       select row.source, row.external_id, row.card_print_id::uuid, row.meta
       from jsonb_to_recordset($1::jsonb) as row(
         source text,
         external_id text,
         card_print_id text,
         meta jsonb
       )`,
      [JSON.stringify(scope.mappingRows)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg12a_parent_targets) as parent_rows,
         (select count(*)::int from pkg12a_child_targets) as child_rows,
         (select count(*)::int from pkg12a_mapping_targets) as mapping_rows,
         (select count(*)::int
          from pkg12a_parent_targets target
          join public.card_prints cp
            on cp.id = target.card_print_id
            or (
              lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
              and lower(coalesce(cp.number_plain, cp.number, '')) = lower(target.card_number)
              and lower(coalesce(cp.printed_identity_modifier, '')) = lower(coalesce(target.printed_identity_modifier, ''))
              and lower(coalesce(cp.name, '')) = lower(target.card_name)
            )) as parent_collisions,
         (select count(*)::int
          from pkg12a_child_targets target
          join public.card_printings cpr
            on cpr.id = target.card_printing_id
            or (
              cpr.card_print_id = target.card_print_id
              and cpr.finish_key = target.finish_key
            )) as child_collisions,
         (select count(*)::int
          from pkg12a_mapping_targets target
          join public.external_mappings em
            on em.source = target.source
           and em.external_id = target.external_id) as mapping_collisions`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.parent_rows !== scope.parentRows.length ||
      guardRow.child_rows !== scope.childRows.length ||
      guardRow.mapping_rows !== scope.mappingRows.length ||
      guardRow.parent_collisions !== 0 ||
      guardRow.child_collisions !== 0 ||
      guardRow.mapping_collisions !== 0
    ) {
      throw new Error(`apply guard failed: ${JSON.stringify(guardRow)}`);
    }
    const parentInsert = await client.query(
      `insert into public.card_prints (
         id,
         set_id,
         set_code,
         number,
         printed_identity_modifier,
         name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       )
       select
         card_print_id,
         set_id,
         live_set_code,
         card_number,
         printed_identity_modifier,
         card_name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       from pkg12a_parent_targets`,
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select source, external_id, card_print_id, meta
       from pkg12a_mapping_targets`,
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
         card_print_id,
         finish_key,
         false,
         provenance_source,
         provenance_ref,
         created_by
       from pkg12a_child_targets`,
    );
    if (
      parentInsert.rowCount !== scope.parentRows.length ||
      childInsert.rowCount !== scope.childRows.length ||
      mappingInsert.rowCount !== scope.mappingRows.length
    ) {
      throw new Error(`insert count mismatch: ${JSON.stringify({
        parents: parentInsert.rowCount,
        children: childInsert.rowCount,
        mappings: mappingInsert.rowCount,
      })}`);
    }
    await client.query('commit');
    return {
      parent_rows_inserted: parentInsert.rowCount,
      child_rows_inserted: childInsert.rowCount,
      mapping_rows_inserted: mappingInsert.rowCount,
      error_message: null,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      parent_rows_inserted: 0,
      child_rows_inserted: 0,
      mapping_rows_inserted: 0,
      error_message: error.message,
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-12A Prefix-Collision Parent+Child Insert Real Apply V1

Approved real apply for the non-colliding COL1 parent+child insert subset.

## Status

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? 'missing'}\`
- parent_rows_inserted: ${report.scope?.parent_rows_inserted ?? 0}
- child_rows_inserted: ${report.scope?.child_rows_inserted ?? 0}
- mapping_rows_inserted: ${report.scope?.mapping_rows_inserted ?? 0}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Set

${markdownTable(['set_key', 'child_rows'], Object.entries(report.scope?.by_set ?? {}))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12A Prefix-Collision Parent+Child Insert Real Apply Checkpoint V1](20260610_pkg12a_prefix_collision_parent_child_insert_real_apply_checkpoint_v1.md) | Applied 3 COL1 unprefixed parent inserts, 6 child printings, and 3 PokemonAPI mappings; 5 BW11 collision rows remain blocked. No migrations, deletes, merges, or cleanup. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12a_prefix_collision_parent_child_insert_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12a_prefix_collision_parent_child_insert_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = readJson(DRY_RUN_JSON);
const prerequisiteFindings = validateDryRun(dryRun);
const scope = {
  parentRows: dryRun.scope?.parent_rows ?? [],
  childRows: dryRun.scope?.child_rows ?? [],
  mappingRows: dryRun.scope?.external_mapping_rows ?? [],
};
let report;

if (prerequisiteFindings.length) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg12a_prefix_collision_parent_child_insert_real_apply_v1',
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
      version: 'english_master_index_pkg12a_prefix_collision_parent_child_insert_real_apply_v1',
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
      const beforeSnapshot = await captureSnapshot(client, scope);
      const applyResult = await runApply(client, scope);
      const afterSnapshot = await captureSnapshot(client, scope);
      const postFindings = [];
      if (applyResult.error_message) postFindings.push(`apply_error:${applyResult.error_message}`);
      if (applyResult.parent_rows_inserted !== scope.parentRows.length) postFindings.push('parent_insert_count_mismatch');
      if (applyResult.child_rows_inserted !== scope.childRows.length) postFindings.push('child_insert_count_mismatch');
      if (applyResult.mapping_rows_inserted !== scope.mappingRows.length) postFindings.push('mapping_insert_count_mismatch');
      if (afterSnapshot.counts.parent_rows !== scope.parentRows.length) postFindings.push('post_parent_rows_missing');
      if (afterSnapshot.counts.child_rows !== scope.childRows.length) postFindings.push('post_child_rows_missing');
      if (afterSnapshot.counts.mapping_rows !== scope.mappingRows.length) postFindings.push('post_mapping_rows_missing');
      report = {
        generated_at: new Date().toISOString(),
        version: 'english_master_index_pkg12a_prefix_collision_parent_child_insert_real_apply_v1',
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: dryRun.package_fingerprint_sha256 ?? null,
        apply_status: postFindings.length ? 'applied_with_post_findings' : 'applied',
        prerequisite_findings: [],
        post_apply_findings: postFindings,
        db_writes_performed: applyResult.parent_rows_inserted > 0 || applyResult.child_rows_inserted > 0 || applyResult.mapping_rows_inserted > 0,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        scope: {
          parent_rows_inserted: applyResult.parent_rows_inserted,
          child_rows_inserted: applyResult.child_rows_inserted,
          mapping_rows_inserted: applyResult.mapping_rows_inserted,
          blocked_rows_excluded: dryRun.scope?.blocked_rows ?? null,
          by_set: countBy(scope.childRows, (row) => row.set_key),
          by_finish: countBy(scope.childRows, (row) => row.finish_key),
          parent_rows: scope.parentRows,
          child_rows: scope.childRows,
          mapping_rows: scope.mappingRows,
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
