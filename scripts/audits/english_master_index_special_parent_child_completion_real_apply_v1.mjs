import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'special_parent_child_completion_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'special_parent_child_completion_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'special_parent_child_completion_real_apply_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-03A-SPECIAL-PARENT-CHILD-COMPLETION';
const CREATED_BY = 'english_master_index_special_parent_child_completion_real_apply_v1';
const EXPECTED_FINGERPRINT = 'b761524ebc98d9305950531e54e3509bdc172dd0e481b2b03fe10bf6a5a0e260';
const EXPECTED_DRY_RUN_PROOF = '345df368648500e1c641a13cec5457300d3c4a59d6b6eefa51d58c542de3caca';
const EXPECTED_TARGET_COUNT = 312;
const EXPECTED_FINISH_COUNTS = { holo: 116, normal: 128, reverse: 68 };
const APPROVAL_TEXT = 'Approve real MISSING-PROMO-03A-SPECIAL-PARENT-CHILD-COMPLETION apply only. Fingerprint: b761524ebc98d9305950531e54e3509bdc172dd0e481b2b03fe10bf6a5a0e260. Scope: 312 child-only card_printing inserts for existing special/stamped parent identities; finishes holo=116, normal=128, reverse=68; families championship_stamp=11, e3_stamp=1, league_stamp=44, other_stamp=173, other_variant_or_modifier=2, prerelease_stamp=18, staff_stamp=47, winner_stamp=10, wotc_stamp=6. Dry-run proof: 345df368648500e1c641a13cec5457300d3c4a59d6b6eefa51d58c542de3caca == 345df368648500e1c641a13cec5457300d3c4a59d6b6eefa51d58c542de3caca. No parent writes. No identity writes. No external mapping writes. No pricing writes. No image writes. No deletes. No merges. No migrations. No global apply.';

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (dryRun.rollback_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('rollback_proof_mismatch');
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('rollback_invariant_not_true');
  if (dryRun.recommended_real_apply_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.summary?.ready_target_count !== EXPECTED_TARGET_COUNT) findings.push('ready_target_count_mismatch');
  if ((dryRun.ready_targets ?? []).length !== EXPECTED_TARGET_COUNT) findings.push('target_array_count_mismatch');
  if (dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_writes');
  if (dryRun.parent_writes_performed !== false) findings.push('dry_run_reports_parent_writes');
  if (dryRun.identity_writes_performed !== false) findings.push('dry_run_reports_identity_writes');
  if (dryRun.external_mapping_writes_performed !== false) findings.push('dry_run_reports_mapping_writes');
  if (dryRun.pricing_writes_performed !== false) findings.push('dry_run_reports_pricing_writes');
  if (dryRun.image_writes_performed !== false) findings.push('dry_run_reports_image_writes');
  if (dryRun.deletes_performed !== false || dryRun.merges_performed !== false) findings.push('dry_run_reports_deletes_or_merges');
  if (dryRun.migrations_created !== false) findings.push('dry_run_reports_migrations');

  const finishCounts = countBy(dryRun.ready_targets ?? [], (row) => row.finish_key);
  for (const [finish, expectedCount] of Object.entries(EXPECTED_FINISH_COUNTS)) {
    if (finishCounts[finish] !== expectedCount) findings.push(`finish_count_mismatch_${finish}`);
  }
  if (Object.keys(finishCounts).some((finish) => !(finish in EXPECTED_FINISH_COUNTS))) findings.push('unexpected_finish_present');
  if ((dryRun.ready_targets ?? []).some((row) => row.finish_key === 'stamped')) findings.push('forbidden_stamped_finish_present');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         target_child_id uuid,
         finish_key text,
         printing_gv_id text
       )
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text as finish_key, null::text as printing_gv_id
     from target t
     join public.card_prints cp on cp.id = t.parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, cpr.finish_key, cpr.printing_gv_id
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.parent_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'active_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text, null::text
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code, number, name, variant_key nulls first, finish_key nulls first, row_id`,
    [JSON.stringify(targets.map((row) => ({
      parent_id: row.parent_id,
      target_child_id: row.target_child_id,
      finish_key: row.finish_key,
      printing_gv_id: row.printing_gv_id,
    })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  if (beforeSnapshot.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) {
    throw new Error(`fresh pre-apply snapshot mismatch: ${beforeSnapshot.hash_sha256}`);
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table special_parent_child_completion_targets (
         parent_id uuid primary key,
         target_child_id uuid not null unique,
         finish_key text not null,
         printing_gv_id text not null unique,
         set_code text not null,
         number text not null,
         name text not null,
         variant_key text,
         printed_identity_modifier text,
         family text not null,
         evidence_mode text not null,
         provenance jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into special_parent_child_completion_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         target_child_id uuid,
         finish_key text,
         printing_gv_id text,
         set_code text,
         number text,
         name text,
         variant_key text,
         printed_identity_modifier text,
         family text,
         evidence_mode text,
         provenance jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        parent_id: row.parent_id,
        target_child_id: row.target_child_id,
        finish_key: row.finish_key,
        printing_gv_id: row.printing_gv_id,
        set_code: row.set_code,
        number: row.number,
        name: row.name,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
        family: row.family,
        evidence_mode: row.evidence_mode,
        provenance: {
          source: 'verified_master_index_v1',
          package_id: PACKAGE_ID,
          evidence_mode: row.evidence_mode,
          routing_status: row.routing_status,
          evidence_urls: row.evidence_urls,
          evidence_labels: row.evidence_labels,
          preserved_evidence_sources: row.preserved_evidence_sources,
        },
      })))],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from special_parent_child_completion_targets) as target_count,
         (select count(distinct parent_id)::int from special_parent_child_completion_targets) as parent_count,
         (select count(distinct target_child_id)::int from special_parent_child_completion_targets) as child_id_count,
         (select count(distinct printing_gv_id)::int from special_parent_child_completion_targets) as printing_gv_id_count,
         (select count(*)::int from special_parent_child_completion_targets t left join public.card_prints cp on cp.id = t.parent_id where cp.id is null) as missing_parent_count,
         (select count(*)::int from special_parent_child_completion_targets t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_printings cpr on cpr.id = t.target_child_id) as child_id_collision_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_printings cpr on cpr.printing_gv_id = t.printing_gv_id) as printing_gv_id_collision_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_printings cpr on cpr.card_print_id = t.parent_id and cpr.finish_key = t.finish_key) as existing_finish_collision_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from special_parent_child_completion_targets where finish_key = 'stamped') as forbidden_stamped_finish_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.parent_count !== targets.length
      || guardRow.child_id_count !== targets.length
      || guardRow.printing_gv_id_count !== targets.length
      || guardRow.missing_parent_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.child_id_collision_count !== 0
      || guardRow.printing_gv_id_collision_count !== 0
      || guardRow.existing_finish_collision_count !== 0
      || guardRow.active_identity_count !== targets.length
      || guardRow.forbidden_stamped_finish_count !== 0
    ) {
      throw new Error(`apply guard failed: ${JSON.stringify(guardRow)}`);
    }

    const insertResult = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target_child_id,
         parent_id,
         finish_key,
         now(),
         false,
         'verified_master_index_v1',
         concat(set_code, ':', number, ':', coalesce(nullif(variant_key, ''), printed_identity_modifier, family), ':', finish_key),
         $1::text,
         printing_gv_id,
         null, null, null, null,
         null,
         concat('Child printing completed from exact special-parent finish evidence: ', evidence_mode)
       from special_parent_child_completion_targets
       order by set_code, number, name, variant_key nulls first
       returning id::text, card_print_id::text, finish_key, printing_gv_id`,
      [CREATED_BY],
    );
    if (insertResult.rowCount !== targets.length) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);

    const proof = await client.query(
      `select
         (select count(*)::int from special_parent_child_completion_targets) as target_rows,
         (select count(*)::int
          from special_parent_child_completion_targets t
          join public.card_printings cpr on cpr.id = t.target_child_id and cpr.card_print_id = t.parent_id and cpr.finish_key = t.finish_key and cpr.printing_gv_id = t.printing_gv_id) as inserted_child_rows,
         (select count(*)::int
          from special_parent_child_completion_targets t
          join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true) as active_identity_rows,
         (select count(*)::int
          from special_parent_child_completion_targets t
          join public.card_printings cpr on cpr.card_print_id = t.parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_printings cpr on cpr.id = t.target_child_id where cpr.image_url is not null or cpr.image_path is not null) as image_touched_rows`,
    );
    const proofRow = proof.rows[0];
    if (
      proofRow.target_rows !== targets.length
      || proofRow.inserted_child_rows !== targets.length
      || proofRow.active_identity_rows !== targets.length
      || proofRow.forbidden_stamped_child_rows !== 0
      || proofRow.image_touched_rows !== 0
    ) {
      throw new Error(`proof mismatch: ${JSON.stringify(proofRow)}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      guard: guardRow,
      proof: proofRow,
      inserted_rows: insertResult.rows,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback cleanup failure
    }
    throw error;
  }
}

function renderMarkdown(report) {
  return [
    '# Special Parent Child Completion Real Apply V1',
    '',
    'Records the approved real apply for child-only printings on existing special/stamped parent identities.',
    '',
    '## Scope',
    '',
    `- Package: ${report.package_id}`,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Child rows inserted: ${report.write_counts.child_rows_inserted}`,
    `- Parent rows written: ${report.write_counts.parent_rows_written}`,
    `- Identity rows written: ${report.write_counts.identity_rows_written}`,
    `- External mapping writes: ${report.external_mapping_writes_performed}`,
    `- Pricing writes: ${report.pricing_writes_performed}`,
    `- Image writes: ${report.image_writes_performed}`,
    `- Deletes: ${report.deletes_performed}`,
    `- Migrations: ${report.migrations_created}`,
    '',
    '## Finish Counts',
    '',
    markdownTable(['finish', 'rows'], Object.entries(report.write_counts.by_finish).map(([key, value]) => [key, value])),
    '',
    '## Family Counts',
    '',
    markdownTable(['family', 'rows'], Object.entries(report.write_counts.by_family).map(([key, value]) => [key, value])),
    '',
    '## Proof',
    '',
    `- Dry-run proof: \`${report.approved_dry_run_proof_sha256}\``,
    `- Post-apply proof: \`${report.post_apply_proof_sha256}\``,
    '',
    'No parent writes, identity writes, mapping writes, pricing writes, image writes, deletes, merges, migrations, quarantine, or global apply were performed.',
    '',
  ].join('\n');
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const dryRunFindings = validateDryRun(dryRun);
  if (dryRunFindings.length) {
    throw new Error(`dry-run validation failed: ${dryRunFindings.join(', ')}`);
  }

  const targets = dryRun.ready_targets;
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const client = new pg.Client({ connectionString: conn });
  let execution;
  await client.connect();
  try {
    execution = await applyPackage(client, targets);
  } finally {
    await client.end();
  }

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    status: 'applied',
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    approved_dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    post_apply_proof_sha256: execution.after_snapshot.hash_sha256,
    db_writes_performed: true,
    writes_performed: ['card_printings insert'],
    write_counts: {
      child_rows_inserted: execution.inserted_rows.length,
      parent_rows_written: 0,
      identity_rows_written: 0,
      external_mapping_rows_written: 0,
      pricing_rows_written: 0,
      image_rows_written: 0,
      delete_rows: 0,
      merge_rows: 0,
      by_finish: countBy(targets, (row) => row.finish_key),
      by_family: countBy(targets, (row) => row.family),
    },
    parent_writes_performed: false,
    identity_writes_performed: false,
    external_mapping_writes_performed: false,
    pricing_writes_performed: false,
    image_writes_performed: false,
    deletes_performed: false,
    merges_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    guard: execution.guard,
    proof: execution.proof,
    before_snapshot: execution.before_snapshot,
    after_snapshot: execution.after_snapshot,
    inserted_rows: execution.inserted_rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    status: report.status,
    package_fingerprint_sha256: EXPECTED_FINGERPRINT,
    approved_dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
    post_apply_proof_sha256: report.post_apply_proof_sha256,
    child_rows_inserted: report.write_counts.child_rows_inserted,
    by_finish: report.write_counts.by_finish,
    by_family: report.write_counts.by_family,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    parent_writes_performed: false,
    identity_writes_performed: false,
    external_mapping_writes_performed: false,
    pricing_writes_performed: false,
    image_writes_performed: false,
    deletes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
