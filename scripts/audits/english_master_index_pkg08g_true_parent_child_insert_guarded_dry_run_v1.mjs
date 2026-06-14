import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(process.cwd(), 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08f_missing_parent_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08g_true_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08g_true_parent_child_insert_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08g_true_parent_child_insert_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08G-TRUE-PARENT-CHILD-INSERTS';
const CREATED_BY = 'pkg08g_true_parent_child_insert_guarded_dry_run_v1';
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

function parentKey(row) {
  return [row.matched_set_alias, normalizeNumber(row.card_number), normalizeText(row.card_name)].join('|');
}

async function resolveSets(client, rows) {
  const aliases = [...new Set(rows.map((row) => normalizeText(row.matched_set_alias)).filter(Boolean))];
  const result = await client.query(
    `select id::text as set_id, code, name
     from public.sets
     where game = 'pokemon'
       and lower(coalesce(code, '')) = any($1::text[])
     order by code, id`,
    [aliases],
  );
  return new Map(result.rows.map((row) => [normalizeText(row.code), row]));
}

function buildTargets({ sourceRows, setByAlias }) {
  const parentByKey = new Map();
  const childRows = [];
  const blockedRows = [];

  for (const row of sourceRows) {
    const setRow = setByAlias.get(normalizeText(row.matched_set_alias));
    if (!setRow) {
      blockedRows.push({ ...row, blocked_reason: 'live_set_not_resolved_at_dry_run_time' });
      continue;
    }
    if (!row.tcgdex_external_id) {
      blockedRows.push({ ...row, blocked_reason: 'tcgdex_external_id_missing' });
      continue;
    }
    if (row.external_mapping_collision_count !== 0 || row.same_number_parent_count !== 0 || row.exact_name_parent_count !== 0) {
      blockedRows.push({ ...row, blocked_reason: 'source_strategy_no_longer_true_parent_insert_candidate' });
      continue;
    }
    const key = parentKey(row);
    if (!parentByKey.has(key)) {
      const cardPrintId = crypto.randomUUID();
      parentByKey.set(key, {
        card_print_id: cardPrintId,
        set_id: setRow.set_id,
        set_key: row.set_key,
        live_set_code: setRow.code,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        rarity: null,
        variant_key: '',
        external_id: row.tcgdex_external_id,
        external_ids: { tcgdex: row.tcgdex_external_id },
        ai_metadata: {
          source: PROVENANCE_SOURCE,
          package_id: PACKAGE_ID,
          source_set_key: row.set_key,
        },
        evidence_urls: row.evidence_urls ?? [],
        sources: row.sources ?? [],
      });
    }
    const parent = parentByKey.get(key);
    childRows.push({
      card_printing_id: crypto.randomUUID(),
      card_print_id: parent.card_print_id,
      set_key: row.set_key,
      live_set_code: parent.live_set_code,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${normalizeNumber(row.card_number)}:${row.finish_key}`,
      created_by: CREATED_BY,
      evidence_urls: row.evidence_urls ?? [],
      sources: row.sources ?? [],
    });
  }

  const parentRows = [...parentByKey.values()];
  const mappingRows = parentRows.map((row) => ({
    source: 'tcgdex',
    external_id: row.external_id,
    card_print_id: row.card_print_id,
    meta: {
      package_id: PACKAGE_ID,
      set_key: row.set_key,
      live_set_code: row.live_set_code,
      card_name: row.card_name,
      card_number: row.card_number,
    },
  }));
  return { parentRows, childRows, mappingRows, blockedRows };
}

async function captureTargetSnapshot(client, planned) {
  const result = await client.query(
    `with parent_target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         live_set_code text,
         card_number text,
         card_name text,
         external_id text
       )
     ),
     child_target as (
       select *
       from jsonb_to_recordset($2::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text
       )
     )
     select
       'existing_parent_exact' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       null::text as finish_key,
       null::text as external_id
     from parent_target target
     join public.card_prints cp
       on cp.id = target.card_print_id
       or (
         lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
         and (
           lower(coalesce(cp.number, '')) = lower(target.card_number)
           or lower(coalesce(cp.number_plain, '')) = lower(target.card_number)
         )
         and lower(coalesce(cp.name, '')) = lower(target.card_name)
       )
     union all
     select
       'existing_child_exact' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       coalesce(cp.number_plain, cp.number) as card_number,
       cp.name as card_name,
       cpr.finish_key,
       null::text as external_id
     from child_target target
     join public.card_printings cpr
       on cpr.id = target.card_printing_id
       or (
         cpr.card_print_id = target.card_print_id
         and cpr.finish_key = target.finish_key
       )
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'external_mapping_collision' as row_type,
       em.id::text as row_id,
       null::text as set_code,
       null::text as card_number,
       null::text as card_name,
       null::text as finish_key,
       em.external_id
     from parent_target target
     join public.external_mappings em
       on em.source = 'tcgdex'
      and em.external_id = target.external_id
     union all
     select
       'target_set' as row_type,
       s.id::text as row_id,
       s.code as set_code,
       null::text as card_number,
       s.name as card_name,
       null::text as finish_key,
       null::text as external_id
     from public.sets s
     where lower(coalesce(s.code, '')) = any($3::text[])
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [
      JSON.stringify(planned.parentRows),
      JSON.stringify(planned.childRows),
      [...new Set(planned.parentRows.map((row) => normalizeText(row.live_set_code)))],
    ],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_set_rows: rows.filter((row) => row.row_type === 'target_set').length,
      existing_parent_exact_rows: rows.filter((row) => row.row_type === 'existing_parent_exact').length,
      existing_child_exact_rows: rows.filter((row) => row.row_type === 'existing_child_exact').length,
      external_mapping_collision_rows: rows.filter((row) => row.row_type === 'external_mapping_collision').length,
      total_rows: rows.length,
    },
  };
}

async function runDryRun(client, planned, packageFingerprint) {
  const beforeSnapshot = await captureTargetSnapshot(client, planned);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08g_parent_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         live_set_code text not null,
         card_number text not null,
         card_name text not null,
         rarity text null,
         variant_key text not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null,
         external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg08g_child_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg08g_mapping_targets (
         source text not null,
         external_id text not null,
         card_print_id uuid not null,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08g_parent_targets
       select
         row.card_print_id::uuid,
         row.set_id::uuid,
         row.live_set_code,
         row.card_number,
         row.card_name,
         row.rarity,
         row.variant_key,
         row.external_ids,
         row.ai_metadata,
         row.external_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         live_set_code text,
         card_number text,
         card_name text,
         rarity text,
         variant_key text,
         external_ids jsonb,
         ai_metadata jsonb,
         external_id text
       )`,
      [JSON.stringify(planned.parentRows)],
    );
    await client.query(
      `insert into pkg08g_child_targets
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
      [JSON.stringify(planned.childRows)],
    );
    await client.query(
      `insert into pkg08g_mapping_targets
       select row.source, row.external_id, row.card_print_id::uuid, row.meta
       from jsonb_to_recordset($1::jsonb) as row(
         source text,
         external_id text,
         card_print_id text,
         meta jsonb
       )`,
      [JSON.stringify(planned.mappingRows)],
    );

    const shape = await client.query(
      `select
         (select count(*)::int from pkg08g_parent_targets) as parent_rows,
         (select count(*)::int from pkg08g_child_targets) as child_rows,
         (select count(*)::int from pkg08g_mapping_targets) as mapping_rows,
         (select count(*)::int from pkg08g_child_targets child left join pkg08g_parent_targets parent on parent.card_print_id = child.card_print_id where parent.card_print_id is null) as child_without_parent,
         (select count(*)::int from pkg08g_child_targets child left join public.finish_keys fk on fk.key = child.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows`,
    );
    const shapeRow = shape.rows[0];
    if (
      shapeRow.parent_rows !== planned.parentRows.length ||
      shapeRow.child_rows !== planned.childRows.length ||
      shapeRow.mapping_rows !== planned.mappingRows.length ||
      shapeRow.child_without_parent !== 0 ||
      shapeRow.inactive_finish_rows !== 0
    ) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }

    const collisions = await client.query(
      `select
         (select count(*)::int
          from pkg08g_parent_targets target
          join public.card_prints cp
            on cp.id = target.card_print_id
            or (
              lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
              and (
                lower(coalesce(cp.number, '')) = lower(target.card_number)
                or lower(coalesce(cp.number_plain, '')) = lower(target.card_number)
              )
              and lower(coalesce(cp.name, '')) = lower(target.card_name)
            )) as parent_collisions,
         (select count(*)::int
          from pkg08g_child_targets target
          join public.card_printings cpr
            on cpr.id = target.card_printing_id
            or (
              cpr.card_print_id = target.card_print_id
              and cpr.finish_key = target.finish_key
            )) as child_collisions,
         (select count(*)::int
          from pkg08g_mapping_targets target
          join public.external_mappings em
            on em.source = target.source
           and em.external_id = target.external_id) as mapping_collisions`,
    );
    const collisionRow = collisions.rows[0];
    if (
      collisionRow.parent_collisions !== 0 ||
      collisionRow.child_collisions !== 0 ||
      collisionRow.mapping_collisions !== 0
    ) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id,
         set_id,
         set_code,
         number,
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
         card_name,
         rarity,
         variant_key,
         external_ids,
         ai_metadata
       from pkg08g_parent_targets`,
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select source, external_id, card_print_id, meta
       from pkg08g_mapping_targets`,
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
       from pkg08g_child_targets`,
    );
    if (
      parentInsert.rowCount !== planned.parentRows.length ||
      childInsert.rowCount !== planned.childRows.length ||
      mappingInsert.rowCount !== planned.mappingRows.length
    ) {
      throw new Error(`insert count mismatch: ${JSON.stringify({
        parents: parentInsert.rowCount,
        children: childInsert.rowCount,
        mappings: mappingInsert.rowCount,
      })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08g_parent_targets) as planned_parent_rows,
         (select count(*)::int from pkg08g_child_targets) as planned_child_rows,
         (select count(*)::int from pkg08g_mapping_targets) as planned_mapping_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureTargetSnapshot(client, planned);
    return {
      status: 'pkg08g_true_parent_child_insert_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureTargetSnapshot(client, planned).catch(() => null);
    return {
      status: 'pkg08g_true_parent_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-08G True Parent+Child Insert Guarded Dry Run V1

Rollback-only dry run for the true parent-insert candidates identified by PKG-08F.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- source_strategy_fingerprint_sha256: \`${report.source_strategy_fingerprint_sha256}\`
- target_parent_rows: ${report.scope.target_parent_rows}
- target_child_rows: ${report.scope.target_child_rows}
- target_external_mappings: ${report.scope.target_external_mappings}
- blocked_rows: ${report.scope.blocked_rows}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

## By Set

${markdownTable(['set_key', 'child_rows'], Object.entries(report.scope.by_set))}

## By Finish

${markdownTable(['finish_key', 'child_rows'], Object.entries(report.scope.by_finish))}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Approval Boundary

This report is dry-run proof only. It does not authorize real apply.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08G True Parent+Child Insert Guarded Dry Run Checkpoint V1](20260610_pkg08g_true_parent_child_insert_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for true parent+child inserts from PKG-08F. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08g_true_parent_child_insert_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08g_true_parent_child_insert_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.strategy_lane === 'true_parent_insert_candidate');
const conn = connectionString();
let report;

if (!conn) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08g_true_parent_child_insert_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    source_strategy_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
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
    const setByAlias = await resolveSets(client, sourceRows);
    const planned = buildTargets({ sourceRows, setByAlias });
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      source_strategy_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
      parent_rows: planned.parentRows.map((row) => ({
        set_key: row.set_key,
        live_set_code: row.live_set_code,
        card_number: row.card_number,
        card_name: row.card_name,
        external_id: row.external_id,
      })),
      child_rows: planned.childRows.map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
      })),
    }));
    const execution = planned.parentRows.length > 0 && planned.blockedRows.length === 0
      ? await runDryRun(client, planned, packageFingerprint)
      : {
        status: 'blocked_no_targets_or_blocked_rows_present',
        error_message: null,
        before_snapshot: null,
        after_snapshot: null,
        rollback_proof_rows: [],
      };
    const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
    const stopFindings = [];
    if (source.package_id !== 'PKG-08F-MISSING-PARENT-STRATEGY') stopFindings.push('source_strategy_package_mismatch');
    if (planned.parentRows.length !== 9) stopFindings.push('target_parent_count_not_9');
    if (planned.childRows.length !== 9) stopFindings.push('target_child_count_not_9');
    if (planned.mappingRows.length !== 9) stopFindings.push('target_mapping_count_not_9');
    if (planned.blockedRows.length !== 0) stopFindings.push('planned_blocked_rows_present');
    if (execution.status !== 'pkg08g_true_parent_child_insert_completed_rolled_back_no_durable_change') stopFindings.push('dry_run_not_passed');
    if (execution.error_message) stopFindings.push(`dry_run_error:${execution.error_message}`);
    if (!durableMatch) stopFindings.push('durable_after_snapshot_differs_from_before_snapshot');
    if (execution.before_snapshot?.counts?.existing_parent_exact_rows !== 0) stopFindings.push('before_parent_collision_rows_present');
    if (execution.before_snapshot?.counts?.existing_child_exact_rows !== 0) stopFindings.push('before_child_collision_rows_present');
    if (execution.before_snapshot?.counts?.external_mapping_collision_rows !== 0) stopFindings.push('before_external_mapping_collision_rows_present');
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08g_true_parent_child_insert_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      source_strategy_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
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
        target_parent_rows: planned.parentRows.length,
        target_child_rows: planned.childRows.length,
        target_external_mappings: planned.mappingRows.length,
        blocked_rows: planned.blockedRows.length,
        selected_set_keys: [...new Set(planned.childRows.map((row) => row.set_key))].sort(),
        by_set: countBy(planned.childRows, (row) => row.set_key),
        by_live_set: countBy(planned.childRows, (row) => row.live_set_code),
        by_finish: countBy(planned.childRows, (row) => row.finish_key),
        parent_rows: planned.parentRows,
        child_rows: planned.childRows,
        external_mapping_rows: planned.mappingRows,
        blocked_rows_detail: planned.blockedRows,
      },
      before_snapshot: execution.before_snapshot,
      after_snapshot: execution.after_snapshot,
      durable_after_snapshot_matches_before_snapshot: durableMatch,
      rollback_proof_rows: execution.rollback_proof_rows,
      stop_findings: stopFindings,
      recommended_real_apply_approval_text: stopFindings.length === 0
        ? `Approve real PKG-08G-TRUE-PARENT-CHILD-INSERTS apply only. Fingerprint: ${packageFingerprint}. Scope: ${planned.parentRows.length} parent card_print inserts, ${planned.childRows.length} child card_printing inserts, ${planned.mappingRows.length} TCGdex external mappings across ${Object.keys(countBy(planned.childRows, (row) => row.set_key)).length} sets; finishes ${Object.entries(countBy(planned.childRows, (row) => row.finish_key)).map(([finish, count]) => `${finish}=${count}`).join(', ')}. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
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
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  stop_findings: report.stop_findings,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
