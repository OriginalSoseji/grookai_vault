import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });
loadDotenv({ quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_bulk_post_apply_verify_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_bulk_post_apply_verify_v1.md',
);

const SOURCE_ARTIFACTS = [
  'english_master_index_pokumon_detail_parent_insert_guarded_dry_run_v1.json',
  'english_master_index_league_placement_stamp_guarded_dry_run_v1.json',
  'english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.json',
  'english_master_index_dv1_stamp_holo_second_wave_guarded_dry_run_v1.json',
  'english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.json',
].map((fileName) => path.join(AUDIT_DIR, fileName));

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? null;
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
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function uniqueCount(rows, keyFn) {
  return new Set(rows.map(keyFn).filter(Boolean)).size;
}

async function loadTargets() {
  const artifacts = [];
  const targets = [];

  for (const artifactPath of SOURCE_ARTIFACTS) {
    const artifact = await readJson(artifactPath);
    const artifactTargets = artifact.targets ?? [];
    artifacts.push({
      source_artifact: path.relative(ROOT, artifactPath).replaceAll('\\', '/'),
      package_id: artifact.package_id,
      fingerprint_sha256: artifact.fingerprint_sha256,
      dry_run_status: artifact.summary?.dry_run_status,
      rollback_verified: artifact.summary?.rollback_verified === true,
      write_ready_for_approval: artifact.summary?.write_ready_for_approval === true,
      target_rows: artifactTargets.length,
      parent_insert_scope: artifact.summary?.parent_insert_scope ?? uniqueCount(artifactTargets, (row) => row.target_parent_id),
      identity_insert_scope: artifact.summary?.identity_insert_scope ?? uniqueCount(artifactTargets, (row) => row.target_parent_id),
      child_insert_scope: artifact.summary?.child_insert_scope ?? artifactTargets.length,
    });

    for (const target of artifactTargets) {
      targets.push({
        ...target,
        source_package_id: artifact.package_id,
        source_artifact: path.relative(ROOT, artifactPath).replaceAll('\\', '/'),
      });
    }
  }

  return { artifacts, targets };
}

function validateNoDuplicateTargetIds(targets) {
  const duplicateParentIds = Object.entries(countBy(targets, (row) => row.target_parent_id))
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  const duplicateChildIds = Object.entries(countBy(targets, (row) => row.target_child_id))
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  return { duplicateParentIds, duplicateChildIds };
}

async function readLiveRows(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         source_package_id text,
         source_artifact text,
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         target_printed_identity_modifier text,
         stamp_label text,
         target_gv_id text,
         target_printing_gv_id text
       )
     )
     select
       target.source_package_id,
       target.source_artifact,
       target.set_key,
       target.card_number,
       target.card_name,
       target.stamp_label,
       target.target_variant_key,
       target.target_printed_identity_modifier,
       target.target_finish_key,
       target.target_gv_id,
       target.target_printing_gv_id,
       target.target_parent_id::text,
       target.target_child_id::text,
       target.base_parent_id::text,
       cp.id is not null as parent_exists,
       cp.gv_id as actual_gv_id,
       cp.variant_key as actual_variant_key,
       cp.printed_identity_modifier as actual_printed_identity_modifier,
       cpr.id is not null as child_exists,
       cpr.finish_key as actual_finish_key,
       cpr.printing_gv_id as actual_printing_gv_id,
       cpi.id is not null as active_identity_exists,
       cpi.identity_key_hash,
       coalesce(forbidden.forbidden_stamped_child_count, 0)::int as forbidden_stamped_child_count
     from target
     left join public.card_prints cp on cp.id = target.target_parent_id
     left join public.card_printings cpr on cpr.id = target.target_child_id and cpr.card_print_id = target.target_parent_id
     left join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true
     left join lateral (
       select count(*)::int as forbidden_stamped_child_count
       from public.card_printings child
       where child.card_print_id = target.target_parent_id
         and child.finish_key = 'stamped'
     ) forbidden on true
     order by target.source_package_id, target.set_key, target.card_number, target.card_name, target.target_variant_key`,
    [JSON.stringify(targets)],
  );

  return result.rows.map((row) => {
    const optionalGvMatches = !row.target_gv_id || row.actual_gv_id === row.target_gv_id;
    const optionalPrintingGvMatches = !row.target_printing_gv_id || row.actual_printing_gv_id === row.target_printing_gv_id;
    const closed = row.parent_exists
      && row.child_exists
      && row.active_identity_exists
      && row.actual_variant_key === row.target_variant_key
      && row.actual_printed_identity_modifier === row.target_printed_identity_modifier
      && row.actual_finish_key === row.target_finish_key
      && optionalGvMatches
      && optionalPrintingGvMatches
      && row.forbidden_stamped_child_count === 0;

    const blockers = [
      row.parent_exists ? null : 'target_parent_missing',
      row.child_exists ? null : 'target_child_missing',
      row.active_identity_exists ? null : 'active_identity_missing',
      row.actual_variant_key === row.target_variant_key ? null : 'variant_mismatch',
      row.actual_printed_identity_modifier === row.target_printed_identity_modifier ? null : 'printed_identity_modifier_mismatch',
      row.actual_finish_key === row.target_finish_key ? null : 'finish_mismatch',
      optionalGvMatches ? null : 'gv_id_mismatch',
      optionalPrintingGvMatches ? null : 'printing_gv_id_mismatch',
      row.forbidden_stamped_child_count === 0 ? null : 'forbidden_stamped_child_present',
    ].filter(Boolean);

    return {
      ...row,
      verification_status: closed ? 'verified_applied' : 'not_verified',
      blockers,
    };
  });
}

function classifyVerification(rows) {
  const parentRowsPresent = uniqueCount(rows.filter((row) => row.parent_exists), (row) => row.target_parent_id);
  const childRowsPresent = rows.filter((row) => row.child_exists).length;
  const identityRowsPresent = uniqueCount(rows.filter((row) => row.active_identity_exists), (row) => row.target_parent_id);
  const verifiedRows = rows.filter((row) => row.verification_status === 'verified_applied').length;
  const forbiddenStampedRows = rows.reduce((sum, row) => sum + Number(row.forbidden_stamped_child_count ?? 0), 0);

  if (parentRowsPresent === 0 && childRowsPresent === 0 && identityRowsPresent === 0) {
    return 'not_applied';
  }
  if (verifiedRows === rows.length && forbiddenStampedRows === 0) {
    return 'passed';
  }
  return 'partial_or_failed';
}

function buildMarkdown(report) {
  return `# Stamped/Special Bulk Post-Apply Verify V1

Read-only verifier for the five-package stamped/special bulk gate.

This report is designed to be safe before and after real apply. Before apply it should report \`not_applied\`; after apply it should report \`passed\`.

## Summary

${markdownTable(['metric', 'value'], [
    ['verification_status', report.summary.verification_status],
    ['apply_detected', report.summary.apply_detected],
    ['expected_parent_rows', report.summary.expected_parent_rows],
    ['present_parent_rows', report.summary.present_parent_rows],
    ['expected_identity_rows', report.summary.expected_identity_rows],
    ['present_identity_rows', report.summary.present_identity_rows],
    ['expected_child_rows', report.summary.expected_child_rows],
    ['present_child_rows', report.summary.present_child_rows],
    ['verified_child_rows', report.summary.verified_child_rows],
    ['forbidden_stamped_child_rows', report.summary.forbidden_stamped_child_rows],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Package Sources

${markdownTable(
    ['package', 'targets', 'parents', 'children', 'rollback', 'fingerprint'],
    report.package_artifacts.map((artifact) => [
      artifact.package_id,
      artifact.target_rows,
      artifact.parent_insert_scope,
      artifact.child_insert_scope,
      artifact.rollback_verified,
      `\`${artifact.fingerprint_sha256}\``,
    ]),
  )}

## Finish Scope

${markdownTable(
    ['finish', 'target rows'],
    Object.entries(report.summary.by_finish).map(([finish, count]) => [finish, count]),
  )}

## Verification Notes

- This script opens a read-only transaction and rolls it back.
- The script reads only exact target parent and child IDs from frozen guarded dry-run artifacts.
- \`finish_key=stamped\` remains forbidden as a child printing finish.
- A \`not_applied\` status is expected until the exact real apply phrase is approved and executed.

## Not Verified Rows

${report.rows.filter((row) => row.verification_status !== 'verified_applied').length === 0
    ? 'None.'
    : markdownTable(
      ['package', 'set', 'number', 'card', 'stamp', 'finish', 'blockers'],
      report.rows
        .filter((row) => row.verification_status !== 'verified_applied')
        .slice(0, 80)
        .map((row) => [
          row.source_package_id,
          row.set_key,
          row.card_number,
          row.card_name,
          row.stamp_label,
          row.target_finish_key,
          row.blockers.join(', ') || 'none',
        ]),
    )}
`;
}

async function main() {
  const { artifacts, targets } = await loadTargets();
  const duplicateCheck = validateNoDuplicateTargetIds(targets);
  if (duplicateCheck.duplicateChildIds.length > 0) {
    throw new Error(`duplicate target child IDs: ${duplicateCheck.duplicateChildIds.join(', ')}`);
  }

  const conn = connectionString();
  if (!conn) throw new Error('missing_database_connection');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let rows;
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    rows = await readLiveRows(client, targets);
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const verificationStatus = classifyVerification(rows);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_bulk_post_apply_verify_v1',
    audit_only: true,
    db_reads_performed: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
    },
    package_artifacts: artifacts,
    duplicate_target_parent_ids: duplicateCheck.duplicateParentIds,
    duplicate_target_child_ids: duplicateCheck.duplicateChildIds,
    summary: {
      verification_status: verificationStatus,
      apply_detected: verificationStatus !== 'not_applied',
      expected_parent_rows: uniqueCount(targets, (row) => row.target_parent_id),
      present_parent_rows: uniqueCount(rows.filter((row) => row.parent_exists), (row) => row.target_parent_id),
      expected_identity_rows: uniqueCount(targets, (row) => row.target_parent_id),
      present_identity_rows: uniqueCount(rows.filter((row) => row.active_identity_exists), (row) => row.target_parent_id),
      expected_child_rows: targets.length,
      present_child_rows: rows.filter((row) => row.child_exists).length,
      verified_child_rows: rows.filter((row) => row.verification_status === 'verified_applied').length,
      not_verified_child_rows: rows.filter((row) => row.verification_status !== 'verified_applied').length,
      forbidden_stamped_child_rows: rows.reduce((sum, row) => sum + Number(row.forbidden_stamped_child_count ?? 0), 0),
      by_package: countBy(rows, (row) => row.source_package_id),
      by_finish: countBy(rows, (row) => row.target_finish_key),
      by_status: countBy(rows, (row) => row.verification_status),
      by_blocker: countBy(rows.flatMap((row) => row.blockers.length ? row.blockers : ['none']), (value) => value),
    },
    fingerprint_sha256: sha256(stableJson({
      package_artifacts: artifacts,
      summary_basis: rows.map((row) => ({
        target_parent_id: row.target_parent_id,
        target_child_id: row.target_child_id,
        parent_exists: row.parent_exists,
        child_exists: row.child_exists,
        active_identity_exists: row.active_identity_exists,
        actual_finish_key: row.actual_finish_key,
        actual_variant_key: row.actual_variant_key,
        actual_printed_identity_modifier: row.actual_printed_identity_modifier,
        actual_gv_id: row.actual_gv_id,
        actual_printing_gv_id: row.actual_printing_gv_id,
        forbidden_stamped_child_count: row.forbidden_stamped_child_count,
        verification_status: row.verification_status,
        blockers: row.blockers,
      })),
    })),
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    verification_status: report.summary.verification_status,
    expected_parent_rows: report.summary.expected_parent_rows,
    present_parent_rows: report.summary.present_parent_rows,
    expected_child_rows: report.summary.expected_child_rows,
    present_child_rows: report.summary.present_child_rows,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));

  if (verificationStatus === 'partial_or_failed') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
