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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_source_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260612_sv03_play_pokemon_ex_holo_child_insert_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'SV03-PLAY-POKEMON-EX-HOLO-CHILD-INSERT';
const CREATED_BY = 'verified_master_set_index_v1';

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

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.adjudication_status === 'accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run')
    .map((row) => ({
      target_child_id: row.expected_target_child_id,
      target_parent_id: row.existing_parent_id,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.source_card_number,
      source_number_plain: row.source_number_plain,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      evidence_tier: 'accepted_exact_multi_source_holo',
      source_adjudication_fingerprint: source.fingerprint_sha256,
      evidence_sources: row.evidence_rows.map((item) => ({
        source_key: item.source_key,
        source_kind: item.source_kind,
        source_url: item.source_url,
        evidence_type: item.evidence_type,
        evidence_label: item.evidence_label,
        finish_key: item.finish_key,
      })),
    }))
    .sort((left, right) => Number(left.source_number_plain) - Number(right.source_number_plain));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_child_id uuid,
         target_parent_id uuid,
         target_finish_key text
       )
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.target_parent_id
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text as identity_key_hash
     from target
     join public.card_printings cpr on cpr.card_print_id = target.target_parent_id
     join public.card_prints cp on cp.id = cpr.card_print_id
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
       cpi.identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.target_parent_id
     join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_parent_rows: result.rows.filter((row) => row.row_type === 'target_parent').length,
      target_child_rows: result.rows.filter((row) => row.row_type === 'target_child').length,
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
      `create temporary table sv03_play_pokemon_ex_holo_child_targets (
         target_child_id uuid primary key,
         target_parent_id uuid not null,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         source_number_plain text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         evidence_tier text not null,
         source_adjudication_fingerprint text not null,
         evidence_sources jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into sv03_play_pokemon_ex_holo_child_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_child_id uuid,
         target_parent_id uuid,
         set_key text,
         set_name text,
         card_number text,
         source_number_plain text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         evidence_tier text,
         source_adjudication_fingerprint text,
         evidence_sources jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from sv03_play_pokemon_ex_holo_child_targets) as target_count,
         (select count(distinct target_child_id)::int from sv03_play_pokemon_ex_holo_child_targets) as target_child_count,
         (select count(distinct target_parent_id)::int from sv03_play_pokemon_ex_holo_child_targets) as target_parent_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets
          where set_key = 'sv03'
            and card_name in ('Toedscruel ex', 'Tyranitar ex')
            and card_number in ('22', '66')
            and target_variant_key = 'play_pokemon_stamp'
            and target_finish_key = 'holo'
            and evidence_tier = 'accepted_exact_multi_source_holo') as exact_shape_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          left join public.card_prints cp on cp.id = target.target_parent_id
          where cp.id is null) as missing_parent_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_prints cp on cp.id = target.target_parent_id
          where cp.set_code <> 'sv03'
             or cp.name <> target.card_name
             or coalesce(nullif(ltrim(coalesce(cp.number_plain, cp.number), '0'), ''), '0') <> target.source_number_plain
             or cp.variant_key <> target.target_variant_key
             or cp.printed_identity_modifier <> target.target_variant_key) as parent_mismatch_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true
          where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.id = target.target_child_id) as child_id_collision_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as target_finish_collision_count,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== 2 ||
      guardRow.target_child_count !== 2 ||
      guardRow.target_parent_count !== 2 ||
      guardRow.exact_shape_count !== 2 ||
      guardRow.missing_parent_count !== 0 ||
      guardRow.parent_mismatch_count !== 0 ||
      guardRow.inactive_finish_count !== 0 ||
      guardRow.active_identity_count !== 2 ||
      guardRow.child_id_collision_count !== 0 ||
      guardRow.target_finish_collision_count !== 0 ||
      guardRow.forbidden_stamped_child_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const childInsert = await client.query(
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
         concat(target.set_key, ':', target.card_number, ':existing_stamped_parent:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Existing Play Pokemon stamped parent child finish inserted from exact multi-source reviewed evidence: ', target.target_finish_key)
       from sv03_play_pokemon_ex_holo_child_targets target
       returning id::text as child_printing_id, card_print_id::text, finish_key`,
      [CREATED_BY],
    );
    if (childInsert.rowCount !== 2) throw new Error(`child insert count mismatch: ${childInsert.rowCount}`);

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from sv03_play_pokemon_ex_holo_child_targets) as target_rows,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.id = target.target_child_id and cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as inserted_child_rows,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_rows,
         (select count(*)::int
          from sv03_play_pokemon_ex_holo_child_targets target
          join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, packageFingerprint],
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
      child_insert_rows: childInsert.rows,
      proof: proof.rows[0],
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
  return `# English Master Index SV03 Play Pokemon ex Holo Child Insert Guarded Dry Run V1

Rollback-only guarded dry-run for child-only inserts on existing SV03 Play Pokemon stamped ex parents. No durable database writes, parent writes, identity writes, deletes, merges, cleanup, quarantine, migrations, or global apply were performed.

| Field | Value |
| --- | --- |
| package_id | ${report.package_id} |
| package_fingerprint_sha256 | \`${report.package_fingerprint_sha256}\` |
| target_rows | ${report.summary.target_rows} |
| child_inserts_simulated | ${report.summary.child_inserts_simulated} |
| parent_writes_simulated | ${report.summary.parent_writes_simulated} |
| identity_writes_simulated | ${report.summary.identity_writes_simulated} |
| durable_after_snapshot_matches_before_snapshot | ${report.durable_after_snapshot_matches_before_snapshot} |
| dry_run_proof_hash | \`${report.dry_run_proof_hash}\` |

${markdownTable(['set', 'number', 'card', 'variant', 'finish', 'parent', 'child_id'], report.targets.map((row) => [
  row.set_key,
  row.card_number,
  row.card_name,
  row.target_variant_key,
  row.target_finish_key,
  row.target_parent_id,
  row.target_child_id,
]))}

## Recommended Approval

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targets = buildTargets(source);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint: source.fingerprint_sha256,
    targets,
  }));
  if (targets.length !== 2) throw new Error(`expected exactly 2 Play Pokemon ex targets, found ${targets.length}`);

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
  const recommendedApproval = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 2 child-only card_printing inserts for sv03/Obsidian Flames Play Pokemon stamped parents Toedscruel ex #22 and Tyranitar ex #66, finish holo; parent writes=0, identity writes=0, deletes=0, merges=0. Dry-run proof: ${dryRunProofHash} == ${dryRun.afterSnapshot.hash_sha256}. No global apply. No migrations. No cleanup. No quarantine.`;

  const report = {
    version: 1,
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    rollback_only_dry_run: true,
    db_reads_performed: true,
    db_writes_performed_inside_rolled_back_transaction: true,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    package_fingerprint_sha256: packageFingerprint,
    source_artifact: path.relative(ROOT, SOURCE_JSON),
    source_adjudication_fingerprint: source.fingerprint_sha256,
    dry_run_status: 'sv03_play_pokemon_ex_holo_child_insert_completed_rolled_back_no_durable_change',
    dry_run_proof_hash: dryRunProofHash,
    durable_after_snapshot_matches_before_snapshot: dryRun.durable_after_snapshot_matches_before_snapshot,
    transient_after_snapshot_differs_from_before_snapshot: dryRun.transient_after_snapshot_differs_from_before_snapshot,
    before_snapshot: dryRun.beforeSnapshot,
    transient_snapshot: dryRun.transientSnapshot,
    after_snapshot: dryRun.afterSnapshot,
    guard: dryRun.guard,
    proof: dryRun.proof,
    child_insert_rows: dryRun.child_insert_rows,
    summary: {
      target_rows: targets.length,
      child_inserts_simulated: dryRun.child_insert_rows.length,
      parent_writes_simulated: 0,
      identity_writes_simulated: 0,
      deletes_simulated: 0,
      merges_simulated: 0,
    },
    targets,
    recommended_real_apply_approval_text: recommendedApproval,
    stop_findings: dryRun.durable_after_snapshot_matches_before_snapshot ? [] : ['durable_after_snapshot_did_not_match_before_snapshot'],
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
