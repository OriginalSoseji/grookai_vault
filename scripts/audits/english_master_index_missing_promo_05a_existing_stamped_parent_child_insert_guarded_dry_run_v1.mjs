import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const READINESS_JSON = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'existing_stamped_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'existing_stamped_parent_child_insert_guarded_dry_run_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-05A-EXISTING-STAMPED-PARENT-FINISH-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_05a_existing_stamped_parent_child_insert_guarded_dry_run_v1';
const FINISH_SUFFIX = {
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
  cosmos: 'COSMOS',
  cracked_ice: 'CRACKED-ICE',
};

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

function uuidFromSeed(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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

function finishSuffix(finishKey) {
  return FINISH_SUFFIX[finishKey] ?? String(finishKey).toUpperCase().replaceAll('_', '-');
}

function sourceTargets(readinessReport) {
  return (readinessReport.rows ?? [])
    .filter((row) => row.routing_status === 'ready_finish_routed_exact_label')
    .filter((row) => row.target_finish_key && row.target_finish_key !== 'stamped')
    .map((row) => ({
      set_code: row.set_key,
      number: row.card_number,
      name: row.card_name,
      variant_key: row.proposed_variant_key,
      stamp_label: row.stamp_label,
      finish_key: row.target_finish_key,
      family: row.proposed_variant_key?.includes('league') ? 'league_stamp' : 'other_stamp',
      evidence: {
        routing_status: row.routing_status,
        routing_fingerprint: readinessReport.fingerprint_sha256,
        preserved_evidence_sources: row.preserved_evidence_sources ?? [],
        evidence_urls: row.preserved_evidence_urls ?? [],
        evidence_labels: row.preserved_evidence_labels ?? [],
        finish_claims: row.finish_claims ?? [],
      },
    }));
}

async function resolveExistingTargets(client, rows) {
  const result = await client.query(
    `with source as (
       select *
       from jsonb_to_recordset($1::jsonb) as s(
         set_code text,
         number text,
         name text,
         variant_key text,
         stamp_label text,
         finish_key text,
         family text,
         evidence jsonb
       )
     ),
     resolved as (
       select
         source.*,
         cp.id as parent_id,
         cp.gv_id,
         cpr.id as existing_finish_child_id,
         cpr_gv.id as existing_printing_gv_id_child_id,
         count(cp.id) over (partition by source.set_code, source.number, source.name, source.variant_key) as parent_match_count
       from source
       join public.card_prints cp
         on cp.set_code = source.set_code
        and cp.number = source.number
        and cp.name = source.name
        and coalesce(cp.variant_key, '') = coalesce(source.variant_key, '')
       left join public.card_printings cpr
         on cpr.card_print_id = cp.id
        and cpr.finish_key = source.finish_key
       left join public.card_printings cpr_gv
         on cpr_gv.printing_gv_id = concat(cp.gv_id, '-', case source.finish_key
           when 'normal' then 'STD'
           when 'holo' then 'HOLO'
           when 'reverse' then 'RH'
           when 'cosmos' then 'COSMOS'
           when 'cracked_ice' then 'CRACKED-ICE'
           else upper(replace(source.finish_key, '_', '-'))
         end)
     )
     select *
     from resolved
     order by set_code, number, name, variant_key`,
    [JSON.stringify(rows)],
  );
  return result.rows
    .filter((row) => Number(row.parent_match_count) === 1)
    .filter((row) => !row.existing_finish_child_id && !row.existing_printing_gv_id_child_id)
    .map((row) => ({
      parent_id: row.parent_id,
      target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.parent_id}:${row.finish_key}`),
      finish_key: row.finish_key,
      printing_gv_id: `${row.gv_id}-${finishSuffix(row.finish_key)}`,
      set_code: row.set_code,
      number: row.number,
      name: row.name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      family: row.family,
      evidence_mode: 'existing_stamped_parent_exact_finish',
      provenance: {
        source: 'verified_master_index_v1',
        package_id: PACKAGE_ID,
        evidence_mode: 'existing_stamped_parent_exact_finish',
        evidence_urls: row.evidence?.evidence_urls ?? [],
        evidence_labels: row.evidence?.evidence_labels ?? [],
        evidence_sources: row.evidence?.preserved_evidence_sources ?? [],
        finish_claims: row.evidence?.finish_claims ?? [],
        routing_fingerprint: row.evidence?.routing_fingerprint ?? null,
      },
    }));
}

function packageFingerprint(targets, readinessReport) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    readiness_fingerprint_sha256: readinessReport.fingerprint_sha256,
    targets: targets.map((target) => ({
      parent_id: target.parent_id,
      target_child_id: target.target_child_id,
      finish_key: target.finish_key,
      printing_gv_id: target.printing_gv_id,
      evidence_urls: target.provenance.evidence_urls,
      evidence_labels: target.provenance.evidence_labels,
    })),
  }));
}

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: ['insert child-only public.card_printings rows for existing stamped parents with exact active finish evidence'],
    forbidden: ['parent writes', 'identity writes', 'external mapping writes', 'pricing writes', 'image writes', 'deletes', 'merges', 'migrations', 'global apply', 'stamped finish_key'],
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(parent_id uuid, target_child_id uuid, finish_key text, printing_gv_id text)
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
    [JSON.stringify(targets.map((target) => ({
      parent_id: target.parent_id,
      target_child_id: target.target_child_id,
      finish_key: target.finish_key,
      printing_gv_id: target.printing_gv_id,
    })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: countBy(result.rows, (row) => row.row_type),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table existing_stamped_child_targets (
         parent_id uuid primary key,
         target_child_id uuid not null unique,
         finish_key text not null,
         printing_gv_id text not null unique,
         set_code text not null,
         number text not null,
         name text not null,
         variant_key text,
         stamp_label text,
         family text not null,
         evidence_mode text not null,
         provenance jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into existing_stamped_child_targets
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
         stamp_label text,
         family text,
         evidence_mode text,
         provenance jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from existing_stamped_child_targets) as target_count,
         (select count(distinct parent_id)::int from existing_stamped_child_targets) as parent_count,
         (select count(distinct target_child_id)::int from existing_stamped_child_targets) as child_id_count,
         (select count(distinct printing_gv_id)::int from existing_stamped_child_targets) as printing_gv_id_count,
         (select count(*)::int from existing_stamped_child_targets t left join public.card_prints cp on cp.id = t.parent_id where cp.id is null) as missing_parent_count,
         (select count(*)::int from existing_stamped_child_targets t join public.card_prints cp on cp.id = t.parent_id where cp.gv_id is null) as missing_parent_gv_id_count,
         (select count(*)::int from existing_stamped_child_targets t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from existing_stamped_child_targets t join public.card_printings cpr on cpr.id = t.target_child_id) as child_id_collision_count,
         (select count(*)::int from existing_stamped_child_targets t join public.card_printings cpr on cpr.printing_gv_id = t.printing_gv_id) as printing_gv_id_collision_count,
         (select count(*)::int from existing_stamped_child_targets t join public.card_printings cpr on cpr.card_print_id = t.parent_id and cpr.finish_key = t.finish_key) as existing_finish_collision_count,
         (select count(*)::int from existing_stamped_child_targets t join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from existing_stamped_child_targets where finish_key = 'stamped') as forbidden_stamped_finish_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.parent_count !== targets.length
      || guardRow.child_id_count !== targets.length
      || guardRow.printing_gv_id_count !== targets.length
      || guardRow.missing_parent_count !== 0
      || guardRow.missing_parent_gv_id_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.child_id_collision_count !== 0
      || guardRow.printing_gv_id_collision_count !== 0
      || guardRow.existing_finish_collision_count !== 0
      || guardRow.active_identity_count !== targets.length
      || guardRow.forbidden_stamped_finish_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
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
         concat(set_code, ':', number, ':', coalesce(nullif(variant_key, ''), family), ':', finish_key),
         $1::text,
         printing_gv_id,
         null, null, null, null,
         null,
         concat('Existing stamped parent child printing completed from exact active finish evidence: ', evidence_mode)
       from existing_stamped_child_targets
       order by set_code, number, name
       returning id::text, card_print_id::text, finish_key, printing_gv_id`,
      [CREATED_BY],
    );
    if (insertResult.rowCount !== targets.length) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);

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
    '# Existing Stamped Parent Child Insert Guarded Dry Run V1',
    '',
    'Rollback-only dry-run for active child printings on stamped parents that already exist in canon.',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['target_count', report.summary.target_count],
        ['by_finish', JSON.stringify(report.summary.by_finish)],
        ['by_variant', JSON.stringify(report.summary.by_variant)],
        ['package_fingerprint_sha256', report.package_fingerprint_sha256],
        ['sql_hash_sha256', report.sql_hash_sha256],
        ['dry_run_proof_sha256', report.dry_run_proof_sha256],
      ],
    ),
    '',
    '## Targets',
    '',
    markdownTable(
      ['set', 'number', 'name', 'variant', 'finish', 'printing_gv_id'],
      report.targets.map((target) => [
        target.set_code,
        target.number,
        target.name,
        target.variant_key,
        target.finish_key,
        target.printing_gv_id,
      ]),
    ),
    '',
    '## Recommended Approval',
    '',
    '```text',
    report.recommended_real_apply_approval_text,
    '```',
    '',
  ].join('\n');
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');
  const readinessReport = await readJson(READINESS_JSON);
  const sourceRows = sourceTargets(readinessReport);

  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    const targets = await resolveExistingTargets(client, sourceRows);
    const packageHash = packageFingerprint(targets, readinessReport);
    const sqlHashValue = sqlHash();
    const dryRun = targets.length ? await runDryRun(client, targets) : null;
    const dryRunProof = dryRun ? sha256(stableJson({
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageHash,
      inserted_rows: dryRun.inserted_rows,
      guard: dryRun.guard,
    })) : 'not_applicable_no_ready_targets';
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_rollback_dry_run',
      input_artifacts: {
        stamped_finish_routing_readiness: rel(READINESS_JSON),
      },
      package_fingerprint_sha256: packageHash,
      sql_hash_sha256: sqlHashValue,
      dry_run_proof_sha256: dryRunProof,
      rollback_proof_sha256: dryRun ? dryRun.afterSnapshot.hash_sha256 : 'not_applicable_no_ready_targets',
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      summary: {
        source_ready_rows: sourceRows.length,
        target_count: targets.length,
        by_finish: countBy(targets, (target) => target.finish_key),
        by_variant: countBy(targets, (target) => target.variant_key),
        inserted_rows_in_rollback_transaction: dryRun?.inserted_rows.length ?? 0,
        durable_after_snapshot_matches_before_snapshot: dryRun?.durable_after_snapshot_matches_before_snapshot ?? null,
        transient_after_snapshot_differs_from_before_snapshot: dryRun?.transient_after_snapshot_differs_from_before_snapshot ?? null,
      },
      guard: dryRun?.guard ?? null,
      targets,
      recommended_real_apply_approval_text: targets.length
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageHash}. SQL hash: ${sqlHashValue}. Scope: ${targets.length} child-only card_printing inserts for existing stamped parents from exact active finish evidence; finishes ${Object.entries(countBy(targets, (target) => target.finish_key)).map(([key, count]) => `${key}=${count}`).join(', ')}. Dry-run proof: ${dryRunProof} == ${dryRunProof}. No parent writes. No identity writes. No external mapping writes. No pricing writes. No image writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
        : 'No real apply recommended: no existing stamped parent child-printing targets.',
      db_writes_performed: false,
      migrations_created: false,
    };
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageHash,
      sql_hash_sha256: sqlHashValue,
      dry_run_proof_sha256: dryRunProof,
      rollback_proof_sha256: report.rollback_proof_sha256,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      summary: report.summary,
      guard: report.guard,
      recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
