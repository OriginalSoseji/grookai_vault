import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'verified_master_set_index_v1', 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg10bb_first_edition_parent_identity_bulk_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-10B-B-FIRST-EDITION-PARENT-IDENTITY-BULK-DRY-RUN';
const SOURCE_PACKAGE_ID = 'PKG-10B-FIRST-EDITION-CANONICAL-PARENT-READINESS';
const PACKAGE_FINGERPRINT = '429353610d2eddead641783e02861d1cdb50d26da6eee4cca84bd87bd4b1a9d5';
const SQL_HASH = '9bf02b7e1c764f764721dc31a27131406d3c3fe37a9f2458e98cf3e4c557b06e';
const DRY_RUN_PROOF_HASH = '3714a24507734cc9809ecf1ede541aa65289e4fd9caa0e0a29a46aca4e1952c8';
const APPROVAL_TEXT = 'Approve real PKG-10B-B-FIRST-EDITION-PARENT-IDENTITY-BULK-DRY-RUN apply only. Fingerprint: 429353610d2eddead641783e02861d1cdb50d26da6eee4cca84bd87bd4b1a9d5. SQL hash: 9bf02b7e1c764f764721dc31a27131406d3c3fe37a9f2458e98cf3e4c557b06e. Scope: 941 first-edition parent identity inserts and 941 child card_printing inserts across 11 WOTC first-edition sets; child finishes normal=761 and holo=180; source finishes first_edition_normal=761 and first_edition_holo=180; external mappings=0; 1 duplicate source fact deduped before write. Dry-run proof: 3714a24507734cc9809ecf1ede541aa65289e4fd9caa0e0a29a46aca4e1952c8 == 3714a24507734cc9809ecf1ede541aa65289e4fd9caa0e0a29a46aca4e1952c8. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No quarantine. No finish-key activation.';

const EXPECTED = {
  source_candidate_rows: 942,
  deduped_source_rows: 1,
  parent_rows: 941,
  child_rows: 941,
  external_mapping_rows: 0,
  set_count: 11,
  by_finish: { holo: 180, normal: 761 },
  by_source_finish: { first_edition_holo: 180, first_edition_normal: 761 },
  parent_modifier: 'edition:first_edition',
};

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

function validateCounts(actual, expected, label, findings) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) findings.push(`${label}_${key}_count_mismatch`);
  }
  for (const key of Object.keys(actual)) {
    if (expected[key] === undefined) findings.push(`${label}_${key}_unexpected`);
  }
}

function validateArtifacts({ gate, dryRun }) {
  const findings = [];
  const sqlText = fs.readFileSync(dryRun.sql_artifact, 'utf8');
  const sqlHash = sha256(sqlText);
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('gate_not_ready');
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('gate_stop_findings_present');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('gate_package_mismatch');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('gate_fingerprint_mismatch');
  if (gate.package_scope?.sql_hash_sha256 !== SQL_HASH) findings.push('gate_sql_hash_mismatch');
  if (gate.apply_allowed !== false || gate.write_ready_now !== 0) findings.push('gate_unexpected_write_ready');
  if (gate.db_writes_performed !== false || gate.migrations_created !== false) findings.push('gate_reports_write_or_migration');

  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_mismatch');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (sqlHash !== SQL_HASH) findings.push('sql_artifact_hash_mismatch');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.rollback_proof_equal !== true) findings.push('dry_run_rollback_proof_not_equal');
  if (dryRun.dry_run?.ok !== true || dryRun.dry_run?.rolled_back !== true) findings.push('dry_run_not_successful');
  if (dryRun.db_writes_performed !== false || dryRun.migrations_created !== false) findings.push('dry_run_reports_write_or_migration');
  if (dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_cleanup_or_quarantine');
  if (dryRun.summary?.source_candidate_rows !== EXPECTED.source_candidate_rows) findings.push('source_candidate_count_mismatch');
  if (dryRun.summary?.deduped_source_rows !== EXPECTED.deduped_source_rows) findings.push('deduped_source_count_mismatch');
  if (dryRun.summary?.target_parent_rows !== EXPECTED.parent_rows) findings.push('target_parent_count_mismatch');
  if (dryRun.summary?.target_child_rows !== EXPECTED.child_rows) findings.push('target_child_count_mismatch');
  if (dryRun.summary?.external_mapping_rows !== EXPECTED.external_mapping_rows) findings.push('external_mapping_count_mismatch');
  if (dryRun.summary?.target_set_count !== EXPECTED.set_count) findings.push('target_set_count_mismatch');
  validateCounts(dryRun.summary?.by_finish ?? {}, EXPECTED.by_finish, 'target_finish', findings);
  validateCounts(dryRun.summary?.by_source_finish ?? {}, EXPECTED.by_source_finish, 'target_source_finish', findings);
  if (dryRun.dry_run?.guard?.parent_collision_count !== 0) findings.push('dry_run_parent_collision_count_nonzero');
  if (dryRun.dry_run?.guard?.child_collision_count !== 0) findings.push('dry_run_child_collision_count_nonzero');
  if (dryRun.dry_run?.guard?.inactive_finish_count !== 0) findings.push('dry_run_inactive_finish_count_nonzero');
  if (dryRun.dry_run?.guard?.missing_base_count !== 0) findings.push('dry_run_missing_base_count_nonzero');
  if (dryRun.dry_run?.inserted?.inserted_parent_count !== EXPECTED.parent_rows) findings.push('dry_run_inserted_parent_count_mismatch');
  if (dryRun.dry_run?.inserted?.inserted_child_count !== EXPECTED.child_rows) findings.push('dry_run_inserted_child_count_mismatch');
  return { findings, sqlHash };
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         target_finish_key text,
         target_printed_identity_modifier text,
         target_variant_key text
       )
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key,
       cpr.finish_key
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'proposed_parent_collision' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints base on base.id = t.base_parent_id
     join public.card_prints cp
       on cp.id <> t.target_parent_id
      and cp.set_id = base.set_id
      and cp.number_plain = base.number_plain
      and coalesce(cp.printed_identity_modifier, '') = t.target_printed_identity_modifier
      and coalesce(cp.variant_key, '') = coalesce(t.target_variant_key, '')
     union all
     select
       'external_mapping_for_target_parent' as row_type,
       em.id::text as row_id,
       null::text as set_code,
       null::text as number,
       null::text as number_plain,
       null::text as name,
       null::text as printed_identity_modifier,
       null::text as variant_key,
       null::text as finish_key
     from target t
     join public.external_mappings em on em.card_print_id = t.target_parent_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_parent_rows: rows.filter((row) => row.row_type === 'target_parent').length,
      target_child_rows: rows.filter((row) => row.row_type === 'target_child').length,
      proposed_parent_collision_rows: rows.filter((row) => row.row_type === 'proposed_parent_collision').length,
      external_mapping_for_target_parent_rows: rows.filter((row) => row.row_type === 'external_mapping_for_target_parent').length,
      total_rows: rows.length,
    },
  };
}

async function captureInsertedRows(client, targets) {
  const parentIds = [...new Set(targets.map((row) => row.target_parent_id))];
  const childIds = targets.map((row) => row.target_child_id);
  const parents = await client.query(
    `select
       cp.id::text,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key,
       cp.gv_id,
       cp.image_note
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, cp.number_plain, cp.number, cp.name, cp.id`,
    [parentIds],
  );
  const children = await client.query(
    `select
       cpr.id::text,
       cpr.card_print_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cpr.finish_key,
       cpr.is_provisional,
       cpr.provenance_source,
       cpr.provenance_ref,
       cpr.created_by
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($1::uuid[])
     order by cp.set_code, cp.number_plain, cp.number, cp.name, cpr.finish_key, cpr.id`,
    [childIds],
  );
  return {
    captured_at: new Date().toISOString(),
    parent_rows: parents.rows,
    child_rows: children.rows,
    hash_sha256: sha256(stableJson({ parent_rows: parents.rows, child_rows: children.rows })),
    counts: {
      parent_rows: parents.rows.length,
      child_rows: children.rows.length,
      parent_rows_with_modifier: parents.rows.filter((row) => row.printed_identity_modifier === EXPECTED.parent_modifier).length,
      child_provisional_rows: children.rows.filter((row) => row.is_provisional === true).length,
      external_mapping_rows: 0,
      by_set: countBy(children.rows, (row) => row.set_code),
      by_finish: countBy(children.rows, (row) => row.finish_key),
    },
  };
}

function validateBeforeSnapshot(snapshot) {
  const findings = [];
  if (snapshot.counts.target_parent_rows !== 0) findings.push('before_target_parent_rows_present');
  if (snapshot.counts.target_child_rows !== 0) findings.push('before_target_child_rows_present');
  if (snapshot.counts.proposed_parent_collision_rows !== 0) findings.push('before_proposed_parent_collisions_present');
  if (snapshot.counts.external_mapping_for_target_parent_rows !== 0) findings.push('before_target_external_mappings_present');
  return findings;
}

function validateAfterSnapshot({ snapshot, insertedRows }) {
  const findings = [];
  if (snapshot.counts.target_parent_rows !== EXPECTED.parent_rows) findings.push('after_target_parent_count_mismatch');
  if (snapshot.counts.target_child_rows !== EXPECTED.child_rows) findings.push('after_target_child_count_mismatch');
  if (snapshot.counts.proposed_parent_collision_rows !== 0) findings.push('after_proposed_parent_collisions_present');
  if (snapshot.counts.external_mapping_for_target_parent_rows !== 0) findings.push('after_target_external_mappings_present');
  if (insertedRows.counts.parent_rows !== EXPECTED.parent_rows) findings.push('inserted_parent_count_mismatch');
  if (insertedRows.counts.child_rows !== EXPECTED.child_rows) findings.push('inserted_child_count_mismatch');
  if (insertedRows.counts.parent_rows_with_modifier !== EXPECTED.parent_rows) findings.push('inserted_parent_modifier_count_mismatch');
  if (insertedRows.counts.child_provisional_rows !== 0) findings.push('inserted_child_provisional_rows_present');
  validateCounts(insertedRows.counts.by_finish, EXPECTED.by_finish, 'inserted_finish', findings);
  return findings;
}

async function applyPackage({ targets }) {
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const beforeSnapshot = await captureSnapshot(client, targets);
    const beforeFindings = validateBeforeSnapshot(beforeSnapshot);
    if (beforeFindings.length) {
      return {
        apply_status: 'blocked_before_snapshot_findings_present',
        committed: false,
        before_snapshot: beforeSnapshot,
        stop_findings: beforeFindings,
      };
    }

    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg10bb_targets (
         target_parent_id uuid not null,
         target_child_id uuid primary key,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         source_card_name text not null,
         target_card_name text not null,
         source_finish_key text not null,
         target_finish_key text not null,
         target_printed_identity_modifier text not null,
         target_variant_key text null,
         proposed_number_plain text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg10bb_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         card_number text,
         source_card_name text,
         target_card_name text,
         source_finish_key text,
         target_finish_key text,
         target_printed_identity_modifier text,
         target_variant_key text,
         proposed_number_plain text,
         evidence jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        ...row,
        evidence: { sources: row.sources, evidence_urls: row.evidence_urls, package_id: PACKAGE_ID },
      })))],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg10bb_targets) as target_count,
         (select count(distinct target_parent_id)::int from pkg10bb_targets) as target_parent_count,
         (select count(distinct set_key)::int from pkg10bb_targets) as set_count,
         (select count(*)::int
          from pkg10bb_targets target
          left join public.card_prints base on base.id = target.base_parent_id
          where base.id is null) as missing_base_count,
         (select count(*)::int
          from pkg10bb_targets target
          left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true
          where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from pkg10bb_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and cp.number_plain = base.number_plain
           and coalesce(cp.printed_identity_modifier, '') = target.target_printed_identity_modifier
           and coalesce(cp.variant_key, '') = coalesce(target.target_variant_key, '')) as parent_collision_count,
         (select count(*)::int
          from pkg10bb_targets target
          join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== EXPECTED.child_rows
      || guardRow.target_parent_count !== EXPECTED.parent_rows
      || guardRow.set_count !== EXPECTED.set_count
      || guardRow.missing_base_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.parent_collision_count !== 0
      || guardRow.child_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id, external_ids,
         updated_at, set_code, artist, regulation_mark, image_alt_url, image_source, variants, created_at,
         last_synced_at, print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total, gv_id,
         image_path, identity_domain, printed_identity_modifier, set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, target.target_card_name, base.number,
         target.target_variant_key, base.rarity, base.image_url, null,
         jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code,
         base.artist, base.regulation_mark, base.image_alt_url, base.image_source, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', $1::text,
           'package_id', $2::text,
           'source_package_id', $3::text,
           'first_edition_base_parent_id', base.id::text
         ),
         base.image_hash, base.data_quality_flags, base.image_status, base.image_res, base.image_last_checked_at,
         base.printed_set_abbrev, base.printed_total, null, base.image_path, base.identity_domain,
         target.target_printed_identity_modifier, base.set_identity_model, base.representative_image_url,
         'first edition parent identity applied by PKG-10BB'
       from (
         select distinct on (target_parent_id) *
         from pkg10bb_targets
         order by target_parent_id
       ) target
       join public.card_prints base on base.id = target.base_parent_id`,
      ['verified_master_set_index_v1', PACKAGE_ID, SOURCE_PACKAGE_ID],
    );
    await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target.target_child_id,
         target.target_parent_id,
         target.target_finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         concat(target.set_key, ':', target.card_number, ':', target.source_finish_key, '->', target.target_finish_key),
         'pkg10bb_first_edition_parent_identity_bulk_real_apply_v1',
         null, null, null, null, null, null,
         'first edition child printing applied by PKG-10BB'
       from pkg10bb_targets target`,
    );
    const inserted = await client.query(
      `select
         (select count(*)::int from public.card_prints cp join (select distinct target_parent_id from pkg10bb_targets) target on target.target_parent_id = cp.id) as inserted_parent_count,
         (select count(*)::int from public.card_printings cpr join pkg10bb_targets target on target.target_child_id = cpr.id) as inserted_child_count`,
    );
    if (
      inserted.rows[0].inserted_parent_count !== EXPECTED.parent_rows
      || inserted.rows[0].inserted_child_count !== EXPECTED.child_rows
    ) {
      throw new Error(`insert count mismatch: ${JSON.stringify(inserted.rows[0])}`);
    }
    await client.query('commit');

    const afterSnapshot = await captureSnapshot(client, targets);
    const insertedRows = await captureInsertedRows(client, targets);
    const afterFindings = validateAfterSnapshot({ snapshot: afterSnapshot, insertedRows });
    return {
      apply_status: afterFindings.length ? 'committed_with_post_apply_findings' : 'committed_verified',
      committed: true,
      guard: guardRow,
      inserted_counts: inserted.rows[0],
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      inserted_rows: insertedRows,
      stop_findings: afterFindings,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      apply_status: 'failed_rolled_back',
      committed: false,
      error_message: error.message,
      stop_findings: [error.message],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  return `# PKG-10BB First Edition Parent Identity Bulk Real Apply V1

Approved real apply for first-edition parent identities.

| Field | Value |
| --- | --- |
| apply_status | ${report.apply_status} |
| committed | ${report.committed} |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| sql_hash_sha256 | \`${report.sql_hash_sha256}\` |
| parent_rows_inserted | ${report.summary.parent_rows_inserted} |
| child_rows_inserted | ${report.summary.child_rows_inserted} |
| external_mapping_rows_inserted | ${report.summary.external_mapping_rows_inserted} |
| finish_key_activation_performed | ${report.finish_key_activation_performed} |
| migrations_created | ${report.migrations_created} |
| cleanup_performed | ${report.cleanup_performed} |
| quarantine_performed | ${report.quarantine_performed} |
| stop_findings | ${report.stop_findings.length} |

## Dry-Run Proof

- before_hash: ${report.dry_run_proof.before_hash_sha256}
- after_hash: ${report.dry_run_proof.after_hash_sha256}
- proof_equal: ${report.dry_run_proof.rollback_proof_equal}

## Post-Apply

- after_target_parent_rows: ${report.after_snapshot?.counts?.target_parent_rows ?? 'n/a'}
- after_target_child_rows: ${report.after_snapshot?.counts?.target_child_rows ?? 'n/a'}
- proposed_parent_collision_rows: ${report.after_snapshot?.counts?.proposed_parent_collision_rows ?? 'n/a'}
- external_mapping_for_target_parent_rows: ${report.after_snapshot?.counts?.external_mapping_for_target_parent_rows ?? 'n/a'}
`;
}

function updateCheckpointIndex() {
  const line = '| 2026-06-10 | [PKG-10BB First Edition Parent Identity Bulk Real Apply Checkpoint V1](20260610_pkg10bb_first_edition_parent_identity_bulk_real_apply_checkpoint_v1.md) | Records approved real apply for 941 first-edition parent identity inserts and 941 normal/holo child printings across 11 WOTC first-edition sets. |';
  const current = fs.existsSync(CHECKPOINT_INDEX) ? fs.readFileSync(CHECKPOINT_INDEX, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg10bb_first_edition_parent_identity_bulk_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(CHECKPOINT_INDEX, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg10bb_first_edition_parent_identity_bulk_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

const gate = readJson(GATE_JSON);
const dryRun = readJson(DRY_RUN_JSON);
const artifactValidation = validateArtifacts({ gate, dryRun });
let applyResult;
if (artifactValidation.findings.length) {
  applyResult = {
    apply_status: 'blocked_artifact_validation_failed',
    committed: false,
    stop_findings: artifactValidation.findings,
  };
} else {
  applyResult = await applyPackage({ targets: dryRun.targets });
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg10bb_first_edition_parent_identity_bulk_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: PACKAGE_FINGERPRINT,
  sql_hash_sha256: artifactValidation.sqlHash,
  approval_text: APPROVAL_TEXT,
  apply_status: applyResult.apply_status,
  committed: applyResult.committed,
  db_writes_performed: applyResult.committed,
  durable_db_writes_performed: applyResult.committed,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  global_apply_performed: false,
  deletes_performed: false,
  merges_performed: false,
  unsupported_cleanup_performed: false,
  finish_key_activation_performed: false,
  external_mapping_rows_inserted: 0,
  summary: {
    source_candidate_rows: EXPECTED.source_candidate_rows,
    deduped_source_rows: EXPECTED.deduped_source_rows,
    parent_rows_inserted: applyResult.inserted_rows?.counts?.parent_rows ?? 0,
    child_rows_inserted: applyResult.inserted_rows?.counts?.child_rows ?? 0,
    external_mapping_rows_inserted: 0,
    by_finish: applyResult.inserted_rows?.counts?.by_finish ?? {},
    by_set: applyResult.inserted_rows?.counts?.by_set ?? {},
  },
  dry_run_proof: {
    before_hash_sha256: dryRun.before_snapshot?.hash_sha256,
    after_hash_sha256: dryRun.after_snapshot?.hash_sha256,
    rollback_proof_equal: dryRun.rollback_proof_equal,
    guard: dryRun.dry_run?.guard,
  },
  real_apply_guard: applyResult.guard ?? null,
  before_snapshot: applyResult.before_snapshot ?? null,
  after_snapshot: applyResult.after_snapshot ?? null,
  inserted_rows: applyResult.inserted_rows ?? null,
  stop_findings: applyResult.stop_findings ?? [],
  error_message: applyResult.error_message ?? null,
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  apply_status: report.apply_status,
  committed: report.committed,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  sql_hash_sha256: report.sql_hash_sha256,
  summary: report.summary,
  stop_findings: report.stop_findings,
  error_message: report.error_message,
}, null, 2));

if (!report.committed || report.stop_findings.length) process.exitCode = 1;
