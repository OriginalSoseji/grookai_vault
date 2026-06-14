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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260612_sv03_existing_stamped_parent_identity_backfill_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'SV03-EXISTING-STAMPED-PARENT-IDENTITY-BACKFILL';

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

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.readiness_status === 'ready_for_guarded_identity_backfill_dry_run_preparation')
    .map((row) => ({
      card_print_id: row.existing_parent_id,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      source_number_plain: row.source_number_plain,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      evidence_tier: row.evidence_tier,
      child_action_status: row.child_action_status,
      projected_identity_key_hash: row.projected_identity_key_hash,
      source_readiness_fingerprint: source.fingerprint_sha256,
    }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         target_variant_key text,
         target_finish_key text
       )
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
       null::text as identity_domain,
       null::text as set_code_identity,
       null::text as printed_number,
       null::text as normalized_printed_name,
       null::text as identity_key_version,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text as identity_domain,
       null::text as set_code_identity,
       null::text as printed_number,
       null::text as normalized_printed_name,
       null::text as identity_key_version,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     join public.card_printings cpr on cpr.card_print_id = cp.id
     union all
     select
       'active_identity' as row_type,
       cpi.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       cpi.identity_domain,
       cpi.set_code_identity,
       cpi.printed_number,
       cpi.normalized_printed_name,
       cpi.identity_key_version,
       cpi.identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      child_rows: result.rows.filter((row) => row.row_type === 'child').length,
      active_identity_rows: result.rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: result.rows.length,
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
      `create temporary table sv03_existing_stamped_identity_targets (
         card_print_id uuid primary key,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         source_number_plain text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         evidence_tier text not null,
         child_action_status text not null,
         projected_identity_key_hash text not null,
         source_readiness_fingerprint text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into sv03_existing_stamped_identity_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_key text,
         set_name text,
         card_number text,
         source_number_plain text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         evidence_tier text,
         child_action_status text,
         projected_identity_key_hash text,
         source_readiness_fingerprint text
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
         from sv03_existing_stamped_identity_targets target
         join public.card_prints cp on cp.id = target.card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from sv03_existing_stamped_identity_targets) as target_count,
         (select count(distinct card_print_id)::int from sv03_existing_stamped_identity_targets) as target_parent_count,
         (select count(*)::int from sv03_existing_stamped_identity_targets where set_key <> 'sv03') as non_sv03_target_count,
         (select count(*)::int from sv03_existing_stamped_identity_targets target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.variant_key is distinct from target.target_variant_key) as variant_mismatch_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as active_identity_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_projection_count,
         (select count(*)::int
          from projection p
          join public.card_print_identity cpi
            on cpi.is_active = true
           and cpi.card_print_id <> p.card_print_id
           and cpi.identity_domain = p.projected->>'identity_domain'
           and cpi.identity_key_version = p.projected->>'identity_key_version'
           and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true
          where fk.key is null) as inactive_target_finish_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length ||
      guardRow.target_parent_count !== targets.length ||
      guardRow.non_sv03_target_count !== 0 ||
      guardRow.missing_parent_count !== 0 ||
      guardRow.variant_mismatch_count !== 0 ||
      guardRow.active_identity_collision_count !== 0 ||
      guardRow.ready_projection_count !== targets.length ||
      guardRow.identity_hash_collision_count !== 0 ||
      guardRow.inactive_target_finish_count !== 0 ||
      guardRow.forbidden_stamped_child_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
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
             'source_readiness_fingerprint', target.source_readiness_fingerprint,
             'stamped_parent_identity_backfill', true,
             'child_action_status', target.child_action_status
           )
         )
       from sv03_existing_stamped_identity_targets target
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
         from sv03_existing_stamped_identity_targets target
         join public.card_prints cp on cp.id = target.card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select
         card_print_id,
         projected->>'identity_domain',
         projected->>'set_code_identity',
         projected->>'printed_number',
         projected->>'normalized_printed_name',
         nullif(projected->>'source_name_raw', ''),
         coalesce(projected->'identity_payload', '{}'::jsonb),
         projected->>'identity_key_version',
         projected->>'identity_key_hash'
       from projection
       where projected->>'status' = 'ready'
       returning card_print_id::text, identity_domain, set_code_identity, printed_number, normalized_printed_name, identity_key_version, identity_key_hash`,
    );

    const verification = await client.query(
      `select
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.printed_identity_modifier = target.target_variant_key) as parent_modifier_backfilled_count,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as active_identity_rows,
         (select count(*)::int
          from sv03_existing_stamped_identity_targets target
          join public.card_printings cpr on cpr.card_print_id = target.card_print_id) as child_rows_after_identity_backfill`,
    );

    const transientSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);

    return {
      beforeSnapshot,
      transientSnapshot,
      afterSnapshot,
      durable_after_snapshot_matches_before_snapshot: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      transient_after_snapshot_differs_from_before_snapshot: beforeSnapshot.hash_sha256 !== transientSnapshot.hash_sha256,
      guard: guardRow,
      parent_update_rows: parentUpdate.rows,
      identity_insert_rows: identityInsert.rows,
      verification: verification.rows[0],
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ignore rollback errors after a failed guarded dry-run.
    }
    throw error;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index SV03 Existing Stamped Parent Identity Backfill Guarded Dry Run V1');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('Rollback-only guarded dry-run for existing SV03 stamped parent identity backfill. This dry-run updated parent identity metadata and inserted `card_print_identity` rows inside a transaction, then rolled back. No durable database writes, migrations, cleanup, quarantine, child inserts, deletes, or merges were performed.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(markdownTable(
    ['metric', 'value'],
    Object.entries({
      target_rows: report.summary.target_rows,
      parent_updates_simulated: report.summary.parent_updates_simulated,
      identity_inserts_simulated: report.summary.identity_inserts_simulated,
      child_inserts_simulated: report.summary.child_inserts_simulated,
      durable_after_snapshot_matches_before_snapshot: String(report.durable_after_snapshot_matches_before_snapshot),
      dry_run_proof_hash: `\`${report.dry_run_proof_hash}\``,
      package_fingerprint_sha256: `\`${report.package_fingerprint_sha256}\``,
    }),
  ));
  lines.push('');
  lines.push('## Targets');
  lines.push('');
  lines.push(markdownTable(
    ['number', 'card', 'variant', 'target_finish', 'child_status', 'parent_id'],
    report.targets.map((row) => [
      row.card_number,
      row.card_name,
      row.target_variant_key,
      row.target_finish_key,
      row.child_action_status,
      row.card_print_id,
    ]),
  ));
  lines.push('');
  lines.push('## Recommended Approval Text');
  lines.push('');
  lines.push('```text');
  lines.push(report.recommended_real_apply_approval_text);
  lines.push('```');
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('This package is identity backfill only. It does not insert missing child printings. Town Store may be prepared separately after identity backfill; Toedscruel ex and Tyranitar ex still require manual adjudication or stronger exact finish evidence before child inserts.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targets = buildTargets(source);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint: source.fingerprint_sha256,
    targets,
  }));

  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL for guarded dry-run.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let dryRun;
  try {
    dryRun = await runDryRun(client, targets, packageFingerprint);
  } finally {
    await client.end();
  }

  const dryRunProofHash = dryRun.beforeSnapshot.hash_sha256;
  const recommendedApproval = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} existing SV03 stamped parent identity backfills, ${targets.length} parent printed_identity_modifier updates, ${targets.length} active card_print_identity inserts, 0 child inserts, 0 deletes, 0 merges. Dry-run proof: ${dryRunProofHash} == ${dryRun.afterSnapshot.hash_sha256}. No global apply. No migrations. No cleanup. No quarantine.`;

  const report = {
    version: 1,
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    audit_only: false,
    rollback_only_dry_run: true,
    db_reads_performed: true,
    db_writes_performed_inside_rolled_back_transaction: true,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    child_inserts_performed: false,
    deletes_performed: false,
    package_fingerprint_sha256: packageFingerprint,
    source_artifact: path.relative(ROOT, SOURCE_JSON),
    source_readiness_fingerprint: source.fingerprint_sha256,
    dry_run_status: 'sv03_existing_stamped_parent_identity_backfill_completed_rolled_back_no_durable_change',
    dry_run_proof_hash: dryRunProofHash,
    durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
    transient_after_snapshot_differs_from_before_snapshot: dryRun.transient_after_snapshot_differs_from_before_snapshot,
    before_snapshot: dryRun.beforeSnapshot,
    transient_snapshot: dryRun.transientSnapshot,
    after_snapshot: dryRun.afterSnapshot,
    guard: dryRun.guard,
    summary: {
      target_rows: targets.length,
      parent_updates_simulated: dryRun.parent_update_rows.length,
      identity_inserts_simulated: dryRun.identity_insert_rows.length,
      child_inserts_simulated: 0,
      by_child_action_status: countBy(targets, (row) => row.child_action_status),
      by_evidence_tier: countBy(targets, (row) => row.evidence_tier),
    },
    targets,
    parent_update_rows: dryRun.parent_update_rows,
    identity_insert_rows: dryRun.identity_insert_rows,
    verification: dryRun.verification,
    recommended_real_apply_approval_text: recommendedApproval,
    stop_findings: dryRun.durable_after_snapshot_matches_before_snapshot ? [] : ['durable_after_snapshot_did_not_match_before_snapshot'],
    safety_confirmation: {
      no_durable_db_writes_performed: dryRun.durable_after_snapshot_matches_before_snapshot,
      no_migrations_created: true,
      no_cleanup_or_quarantine_performed: true,
      no_child_inserts_included: true,
      stamped_is_parent_identity_not_child_finish: true,
    },
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
    package_fingerprint_sha256: packageFingerprint,
    dry_run_proof_hash: dryRunProofHash,
    summary: report.summary,
    durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
    recommended_real_apply_approval_text: recommendedApproval,
    durable_db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
