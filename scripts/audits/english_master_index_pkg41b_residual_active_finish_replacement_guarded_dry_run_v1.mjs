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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg41a_residual_active_finish_replacement_master_index_delta_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg41b_residual_active_finish_replacement_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg41b_residual_active_finish_replacement_guarded_dry_run_v1.md');

const PACKAGE_ID = 'PKG-41B-RESIDUAL-ACTIVE-FINISH-REPLACEMENT';
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

function buildTargets(source) {
  return (source.rows ?? []).map((row) => ({
    card_print_id: row.selected_base_parent_id,
    current_child_printing_id: row.current_child_printing_id,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    target_variant_key: row.variant_key,
    current_finish_key: row.current_finish_key,
    target_finish_key: row.accepted_finish_key,
    requires_child_replacement: Boolean(row.requires_child_replacement),
    requires_parent_identity_backfill: Boolean(row.requires_parent_identity_backfill),
    source_route_fingerprint: source.fingerprint_sha256,
  }));
}

async function existingOptionalTables(client) {
  const result = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
    [OPTIONAL_DEPENDENCY_TABLES],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

async function captureSnapshot(client, targets) {
  const parentIds = targets.map((row) => row.card_print_id);
  const childIds = targets.map((row) => row.current_child_printing_id).filter(Boolean);
  const result = await client.query(
    `with target_parent as (
       select unnest($1::uuid[]) as card_print_id
     ), target_child as (
       select unnest($2::uuid[]) as card_printing_id
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       null::text as identity_key_hash
     from target_parent target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'child',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text
     from target_parent target
     join public.card_printings cpr on cpr.card_print_id = target.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'target_child',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text
     from target_child target
     join public.card_printings cpr on cpr.id = target.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'active_identity',
       cpi.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text,
       cpi.identity_key_hash
     from target_parent target
     join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [parentIds, childIds],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function dependencyCounts(client, childIds) {
  const existingTables = await existingOptionalTables(client);
  const refs = await client.query(
    `select
       (select count(*)::int from public.card_printings where id = any($1::uuid[])) as child_rows,
       (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[]) and archived_at is null) as vault_item_instance_refs,
       (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[])) as external_printing_mapping_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidate_refs`,
    [childIds],
  );
  const counts = refs.rows[0];
  counts.truth_review_refs = 0;
  if (existingTables.has('card_printing_truth_reviews')) {
    const truth = await client.query(
      `select count(*)::int as refs from public.card_printing_truth_reviews where card_printing_id = any($1::uuid[])`,
      [childIds],
    );
    counts.truth_review_refs = truth.rows[0].refs;
  }
  counts.justtcg_mapping_refs = 0;
  if (existingTables.has('justtcg_grookai_mappings')) {
    const justtcg = await client.query(
      `select count(*)::int as refs from public.justtcg_grookai_mappings where card_printing_id = any($1::uuid[])`,
      [childIds],
    );
    counts.justtcg_mapping_refs = justtcg.rows[0].refs;
  }
  return counts;
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const replacementTargets = targets.filter((row) => row.requires_child_replacement);
  const replacementChildIds = replacementTargets.map((row) => row.current_child_printing_id);
  const beforeDependencies = await dependencyCounts(client, replacementChildIds);
  if (
    beforeDependencies.child_rows !== replacementTargets.length
    || beforeDependencies.vault_item_instance_refs !== 0
    || beforeDependencies.external_printing_mapping_refs !== 0
    || beforeDependencies.canon_warehouse_candidate_refs !== 0
    || beforeDependencies.truth_review_refs !== 0
    || beforeDependencies.justtcg_mapping_refs !== 0
  ) {
    return {
      dry_run_status: 'blocked_before_dry_run_dependency_mismatch',
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      rollback_proof_hash_match: true,
      stop_findings: ['replacement_child_dependency_mismatch'],
    };
  }

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg41b_targets (
         card_print_id uuid primary key,
         current_child_printing_id uuid,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_variant_key text not null,
         current_finish_key text not null,
         target_finish_key text not null,
         requires_child_replacement boolean not null,
         requires_parent_identity_backfill boolean not null,
         source_route_fingerprint text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg41b_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         current_child_printing_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_variant_key text,
         current_finish_key text,
         target_finish_key text,
         requires_child_replacement boolean,
         requires_parent_identity_backfill boolean,
         source_route_fingerprint text
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `with projection as (
         select
           target.card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             cp.set_code,
             s.code,
             cp.number,
             cp.number_plain,
             cp.name,
             cp.variant_key,
             coalesce(cp.printed_total, s.printed_total),
             coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from pkg41b_targets target
         join public.card_prints cp on cp.id = target.card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from pkg41b_targets) as target_rows,
         (select count(*)::int from pkg41b_targets where requires_child_replacement) as replacement_rows,
         (select count(*)::int from pkg41b_targets where not requires_child_replacement) as modifier_only_rows,
         (select count(*)::int from pkg41b_targets target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
         (select count(*)::int from pkg41b_targets target join public.card_prints cp on cp.id = target.card_print_id where cp.variant_key is distinct from target.target_variant_key) as variant_mismatch_count,
         (select count(*)::int from pkg41b_targets target join public.card_prints cp on cp.id = target.card_print_id where nullif(cp.printed_identity_modifier, '') is not null) as already_has_modifier_count,
         (select count(*)::int from pkg41b_targets target join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.target_finish_key where target.requires_child_replacement) as existing_replacement_target_child_count,
         (select count(*)::int from pkg41b_targets target join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.target_finish_key where not target.requires_child_replacement) as existing_modifier_only_target_child_count,
         (select count(*)::int from pkg41b_targets target join public.card_printings cpr on cpr.id = target.current_child_printing_id and cpr.card_print_id = target.card_print_id and cpr.finish_key = target.current_finish_key where target.requires_child_replacement) as matching_replacement_source_child_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_projection_count,
         (select count(*)::int
          from projection p
          join public.card_print_identity cpi
            on cpi.is_active = true
           and cpi.card_print_id <> p.card_print_id
           and cpi.identity_domain = p.projected->>'identity_domain'
           and cpi.identity_key_version = p.projected->>'identity_key_version'
           and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count,
         (select count(*)::int from pkg41b_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_target_finish_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== targets.length
      || guardRow.replacement_rows !== replacementTargets.length
      || guardRow.modifier_only_rows !== targets.length - replacementTargets.length
      || guardRow.missing_parent_count !== 0
      || guardRow.variant_mismatch_count !== 0
      || guardRow.already_has_modifier_count !== 0
      || guardRow.existing_replacement_target_child_count !== 0
      || guardRow.existing_modifier_only_target_child_count !== targets.length - replacementTargets.length
      || guardRow.matching_replacement_source_child_count !== replacementTargets.length
      || guardRow.ready_projection_count !== targets.length
      || guardRow.identity_hash_collision_count !== 0
      || guardRow.inactive_target_finish_count !== 0
    ) {
      throw new Error(`PKG-41B guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentUpdate = await client.query(
      `update public.card_prints cp
       set
         printed_identity_modifier = target.target_variant_key,
         updated_at = now(),
         ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'verified_master_index_identity_backfill', jsonb_build_object(
             'package_id', $1::text,
             'package_fingerprint_sha256', $2::text,
             'source_route_fingerprint', target.source_route_fingerprint,
             'residual_active_finish_replacement', true
           )
         )
       from pkg41b_targets target
       where cp.id = target.card_print_id
       returning cp.id::text as card_print_id, cp.printed_identity_modifier`,
      [PACKAGE_ID, packageFingerprint],
    );

    const identityInsert = await client.query(
      `with projection as (
         select
           target.card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             cp.set_code,
             s.code,
             cp.number,
             cp.number_plain,
             cp.name,
             cp.variant_key,
             coalesce(cp.printed_total, s.printed_total),
             coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from pkg41b_targets target
         join public.card_prints cp on cp.id = target.card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select
         p.card_print_id,
         p.projected->>'identity_domain',
         p.projected->>'set_code_identity',
         p.projected->>'printed_number',
         p.projected->>'normalized_printed_name',
         nullif(p.projected->>'source_name_raw', ''),
         coalesce(p.projected->'identity_payload', '{}'::jsonb),
         p.projected->>'identity_key_version',
         p.projected->>'identity_key_hash'
       from projection p
       left join public.card_print_identity existing on existing.card_print_id = p.card_print_id and existing.is_active = true
       where p.projected->>'status' = 'ready'
         and existing.id is null
       returning card_print_id::text, identity_domain, set_code_identity, printed_number, normalized_printed_name, identity_key_version, identity_key_hash`,
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         card_print_id, finish_key, provenance_source, provenance_ref, created_by
       )
       select
         target.card_print_id,
         target.target_finish_key,
         'verified_master_index',
         $1::text,
         'english_master_index_pkg41b'
       from pkg41b_targets target
       where target.requires_child_replacement
       returning id::text as card_printing_id, card_print_id::text, finish_key`,
      [PACKAGE_ID],
    );

    const childDelete = await client.query(
      `delete from public.card_printings cpr
       using pkg41b_targets target
       where target.requires_child_replacement
         and cpr.id = target.current_child_printing_id`,
    );

    if (childInsert.rowCount !== replacementTargets.length || childDelete.rowCount !== replacementTargets.length) {
      throw new Error(`PKG-41B child replacement mismatch: insert=${childInsert.rowCount} delete=${childDelete.rowCount}`);
    }

    const verification = await client.query(
      `select
         (select count(*)::int from pkg41b_targets target join public.card_prints cp on cp.id = target.card_print_id where cp.printed_identity_modifier = target.target_variant_key) as parent_modifier_backfilled_count,
         (select count(*)::int from pkg41b_targets target join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as active_identity_rows,
         (select count(*)::int from pkg41b_targets target join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.target_finish_key) as target_child_rows,
         (select count(*)::int from pkg41b_targets target join public.card_printings cpr on cpr.id = target.current_child_printing_id where target.requires_child_replacement) as stale_source_child_rows`,
    );

    const transientSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);

    return {
      dry_run_status: 'pkg41b_guarded_dry_run_passed_rolled_back_no_durable_change',
      before_snapshot: beforeSnapshot,
      transient_snapshot: transientSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_hash_match: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      transient_differs_from_before: beforeSnapshot.hash_sha256 !== transientSnapshot.hash_sha256,
      guard: guardRow,
      parent_update_rows: parentUpdate.rows,
      identity_insert_rows: identityInsert.rows,
      child_insert_rows: childInsert.rows,
      child_delete_count: childDelete.rowCount,
      verification: verification.rows[0],
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# PKG-41B Residual Active Finish Replacement Guarded Dry Run V1

Rollback-only guarded dry-run for the next residual active-finish closure group.

## Safety

- dry_run_only: ${report.dry_run_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_writes_performed: ${report.durable_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.package_fingerprint],
    ['target_rows', report.scope.target_rows],
    ['parent_updates', report.scope.parent_updates],
    ['identity_inserts_simulated', report.scope.identity_inserts_simulated],
    ['child_inserts_simulated', report.scope.child_inserts_simulated],
    ['child_deletes_simulated', report.scope.child_deletes_simulated],
    ['rollback_proof_hash_match', report.execution.rollback_proof_hash_match],
  ])}

## Targets

${markdownTable(
    ['set', 'number', 'card', 'current_finish', 'target_finish', 'variant', 'replacement'],
    report.targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.current_finish_key,
      row.target_finish_key,
      row.target_variant_key,
      String(row.requires_child_replacement),
    ]),
  )}

## Recommended Real Apply Approval

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

const source = await readJson(SOURCE_JSON);
const targets = buildTargets(source);
if (targets.length !== 3) throw new Error(`Expected 3 PKG-41B targets, found ${targets.length}`);

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  source_fingerprint: source.fingerprint_sha256,
  targets,
}));

const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
const client = new Client({ connectionString: conn });
await client.connect();
let execution;
try {
  execution = await runDryRun(client, targets, packageFingerprint);
} finally {
  await client.end().catch(() => {});
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg41b_residual_active_finish_replacement_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  dry_run_only: true,
  db_writes_performed: false,
  durable_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: path.relative(ROOT, SOURCE_JSON),
  source_fingerprint_sha256: source.fingerprint_sha256,
  scope: {
    target_rows: targets.length,
    parent_updates: targets.length,
    identity_inserts_simulated: execution.identity_insert_rows?.length ?? 0,
    child_inserts_simulated: execution.child_insert_rows?.length ?? 0,
    child_deletes_simulated: execution.child_delete_count ?? 0,
    by_set: countBy(targets, (row) => row.set_key),
    by_target_finish: countBy(targets, (row) => row.target_finish_key),
  },
  execution,
  targets,
};

report.recommended_real_apply_approval_text = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} parent modifier updates, ${report.scope.identity_inserts_simulated} active identity inserts, ${report.scope.child_inserts_simulated} child inserts, ${report.scope.child_deletes_simulated} child deletes; sets ${Object.entries(report.scope.by_set).map(([set, count]) => `${set}=${count}`).join(', ')}; target finishes ${Object.entries(report.scope.by_target_finish).map(([finish, count]) => `${finish}=${count}`).join(', ')}. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_snapshot.hash_sha256}. No global apply. No migrations. No parent inserts. No mapping writes. No merges. No quarantine.`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  scope: report.scope,
  rollback_proof_hash_match: execution.rollback_proof_hash_match,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  durable_writes_performed: false,
  migrations_created: false,
}, null, 2));
