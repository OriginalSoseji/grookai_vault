import crypto from 'node:crypto';
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
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const FIXTURE_JSON = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures', 'generated_pricecharting_stamp_label_v1', 'pricecharting_stamp_label_candidates_v1.json');
const ACQUISITION_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pkg17i3_pricecharting_stamp_label_acquisition_v1', 'pkg17i3_pricecharting_stamp_label_acquisition_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17i4_pricecharting_stamp_label_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17i4_pricecharting_stamp_label_readiness_v1.md');

const PACKAGE_ID = 'PKG-17I4-PRICECHARTING-STAMP-LABEL-READINESS';
const FUTURE_PACKAGE_ID = 'PKG-17J-PRICECHARTING-STAMPED-PARENT-IDENTITY-CANDIDATES';
const ACTIVE_CHILD_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);

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
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function targetRows(fixture) {
  return (fixture.records ?? []).map((record) => {
    const numberPlain = normalizeNumber(record.card_number);
    return {
      target_parent_id: uuidFromSeed(`${FUTURE_PACKAGE_ID}:parent:${record.set_key}:${numberPlain}:${normalizeText(record.card_name)}:${record.variant_key}`),
      target_child_id: record.finish_key
        ? uuidFromSeed(`${FUTURE_PACKAGE_ID}:child:${record.set_key}:${numberPlain}:${normalizeText(record.card_name)}:${record.variant_key}:${record.finish_key}`)
        : null,
      set_key: record.set_key,
      set_name: record.set_name,
      card_number: record.card_number,
      number_plain: numberPlain,
      card_name: record.card_name,
      variant_key: record.variant_key,
      stamp_label: record.stamp_label,
      finish_key: record.finish_key,
      source_key: record.source_key,
      source_kind: record.source_kind,
      source_url: record.source_url,
      evidence_label: record.evidence_label,
      raw_snapshot_ref: record.raw_snapshot_ref,
    };
  }).sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
    || String(left.number_plain).localeCompare(String(right.number_plain), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.variant_key).localeCompare(String(right.variant_key)));
}

async function captureReadiness(targets) {
  const conn = connectionString();
  if (!conn) return { db_available: false, db_read_error: 'database_connection_unavailable', rows: [] };

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           target_parent_id uuid,
           target_child_id uuid,
           set_key text,
           set_name text,
           card_number text,
           number_plain text,
           card_name text,
           variant_key text,
           stamp_label text,
           finish_key text,
           source_key text,
           source_kind text,
           source_url text,
           evidence_label text,
           raw_snapshot_ref text
         )
       ),
       base_candidates as (
         select
           target.target_parent_id,
           cp.id,
           cp.set_id,
           cp.set_code,
           cp.number,
           cp.number_plain,
           cp.name,
           coalesce(cp.variant_key, '') as variant_key,
           cp.printed_identity_modifier,
           cp.printed_total,
           cp.printed_set_abbrev,
           row_number() over (
             partition by target.target_parent_id
             order by case when coalesce(cp.variant_key, '') = '' then 0 else 1 end, cp.id
           ) as candidate_rank
         from target
         join public.card_prints cp
           on cp.set_code = target.set_key
          and lower(cp.name) = lower(target.card_name)
          and (
            coalesce(cp.number_plain, cp.number) = target.number_plain
            or cp.number = target.card_number
          )
          and coalesce(cp.variant_key, '') = ''
       ),
       selected_base as (
         select * from base_candidates where candidate_rank = 1
       ),
       projections as (
         select
           target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             base.set_code,
             s.code,
             base.number,
             base.number_plain,
             base.name,
             target.variant_key,
             coalesce(base.printed_total, s.printed_total),
             coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from target
         join selected_base base on base.target_parent_id = target.target_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         target.*,
         coalesce(base_count.base_candidate_count, 0)::int as base_candidate_count,
         base.id::text as base_parent_id,
         base.set_id::text as base_set_id,
         base.number as base_parent_number,
         base.number_plain as base_parent_number_plain,
         coalesce(base_finish.base_child_finishes, '[]'::jsonb) as base_child_finishes,
         coalesce(target_parent.target_parent_count, 0)::int as target_parent_count,
         coalesce(target_child.target_child_count, 0)::int as target_child_finish_count,
         coalesce(target_forbidden.forbidden_stamped_child_count, 0)::int as forbidden_stamped_child_count,
         coalesce(active_finish.active_finish_exists, false) as active_finish_exists,
         (projections.projected is not null) as ready_identity_projection,
         projections.projected->>'identity_domain' as identity_domain,
         projections.projected->>'identity_key_version' as identity_key_version,
         projections.projected->>'identity_key_hash' as identity_key_hash,
         coalesce(identity_collision.identity_hash_collision_count, 0)::int as identity_hash_collision_count,
         coalesce(vault_refs.vault_parent_ref_count, 0)::int as base_parent_vault_ref_count,
         coalesce(external_refs.external_mapping_count, 0)::int as base_parent_external_mapping_count
       from target
       left join (
         select target_parent_id, count(*)::int as base_candidate_count
         from base_candidates
         group by target_parent_id
       ) base_count on base_count.target_parent_id = target.target_parent_id
       left join selected_base base on base.target_parent_id = target.target_parent_id
       left join lateral (
         select jsonb_agg(cpr.finish_key order by cpr.finish_key) as base_child_finishes
         from public.card_printings cpr
         where cpr.card_print_id = base.id
       ) base_finish on true
       left join lateral (
         select count(*)::int as target_parent_count
         from public.card_prints cp
         where cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.variant_key
       ) target_parent on true
       left join lateral (
         select count(*)::int as target_child_count
         from public.card_prints cp
         join public.card_printings cpr on cpr.card_print_id = cp.id
         where cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.variant_key
           and cpr.finish_key = target.finish_key
       ) target_child on true
       left join lateral (
         select count(*)::int as forbidden_stamped_child_count
         from public.card_prints cp
         join public.card_printings cpr on cpr.card_print_id = cp.id
         where cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.variant_key
           and cpr.finish_key = 'stamped'
       ) target_forbidden on true
       left join lateral (
         select true as active_finish_exists
         from public.finish_keys fk
         where fk.key = target.finish_key
           and fk.is_active = true
         limit 1
       ) active_finish on true
       left join projections on projections.target_parent_id = target.target_parent_id
       left join lateral (
         select count(*)::int as identity_hash_collision_count
         from public.card_print_identity cpi
         where cpi.identity_key_hash = projections.projected->>'identity_key_hash'
           and cpi.is_active = true
       ) identity_collision on true
       left join lateral (
         select count(*)::int as vault_parent_ref_count
         from public.vault_item_instances vii
         where vii.card_print_id = base.id
       ) vault_refs on true
       left join lateral (
         select count(*)::int as external_mapping_count
         from public.external_mappings em
         where em.card_print_id = base.id
           and coalesce(em.active, true) = true
       ) external_refs on true
       order by target.set_key, target.number_plain, target.card_name, target.variant_key`,
      [JSON.stringify(targets)],
    );
    await client.query('rollback');
    return { db_available: true, db_read_error: null, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { db_available: false, db_read_error: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function classify(row) {
  const blockers = [];
  const baseFinishes = Array.isArray(row.base_child_finishes) ? row.base_child_finishes : [];

  if (!row.finish_key) blockers.push('active_finish_required');
  else if (!ACTIVE_CHILD_FINISHES.has(row.finish_key)) blockers.push('unsupported_active_finish');
  else if (!row.active_finish_exists) blockers.push('finish_key_not_active');

  if (Number(row.base_candidate_count) === 0) blockers.push('base_parent_missing');
  if (Number(row.base_candidate_count) > 1) blockers.push('base_parent_ambiguous');
  if (row.finish_key && !baseFinishes.includes(row.finish_key)) blockers.push('base_parent_missing_target_child_finish');
  if (Number(row.target_parent_count) > 0) blockers.push('target_stamped_parent_already_exists_review');
  if (Number(row.target_child_finish_count) > 0) blockers.push('target_child_finish_already_exists_review');
  if (Number(row.forbidden_stamped_child_count) > 0) blockers.push('forbidden_stamped_child_finish_exists');
  if (!row.ready_identity_projection) blockers.push('identity_projection_unavailable');
  if (Number(row.identity_hash_collision_count) > 0) blockers.push('identity_hash_collision');

  let readiness_status = 'blocked';
  if (blockers.length === 0) readiness_status = 'future_guarded_parent_identity_insert_candidate';
  else if (blockers.every((blocker) => blocker.endsWith('_review') || blocker === 'target_stamped_parent_already_exists_review' || blocker === 'target_child_finish_already_exists_review')) {
    readiness_status = 'review_existing_target_parent_or_child';
  } else if (blockers.includes('active_finish_required')) {
    readiness_status = 'label_candidate_only_active_finish_required';
  } else if (blockers.includes('base_parent_missing') || blockers.includes('base_parent_ambiguous')) {
    readiness_status = 'blocked_base_parent_resolution_required';
  } else {
    readiness_status = 'blocked_guarded_readiness_failed';
  }

  return {
    readiness_status,
    blockers,
  };
}

function buildRows(liveRows) {
  return liveRows.map((row) => {
    const classification = classify(row);
    return {
      package_id: PACKAGE_ID,
      future_package_id: FUTURE_PACKAGE_ID,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      finish_key: row.finish_key,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      base_parent_id: row.base_parent_id,
      base_candidate_count: Number(row.base_candidate_count ?? 0),
      base_child_finishes: row.base_child_finishes ?? [],
      target_parent_count: Number(row.target_parent_count ?? 0),
      target_child_finish_count: Number(row.target_child_finish_count ?? 0),
      forbidden_stamped_child_count: Number(row.forbidden_stamped_child_count ?? 0),
      active_finish_exists: Boolean(row.active_finish_exists),
      ready_identity_projection: Boolean(row.ready_identity_projection),
      identity_domain: row.identity_domain,
      identity_key_version: row.identity_key_version,
      identity_key_hash: row.identity_key_hash,
      identity_hash_collision_count: Number(row.identity_hash_collision_count ?? 0),
      base_parent_vault_ref_count: Number(row.base_parent_vault_ref_count ?? 0),
      base_parent_external_mapping_count: Number(row.base_parent_external_mapping_count ?? 0),
      source_key: row.source_key,
      source_kind: row.source_kind,
      source_url: row.source_url,
      evidence_label: row.evidence_label,
      raw_snapshot_ref: row.raw_snapshot_ref,
      ...classification,
      write_ready_now: 0,
    };
  });
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_readiness_status).map(([status, count]) => [status, count]);
  const blockerRows = Object.entries(report.summary.by_blocker).map(([blocker, count]) => [blocker, count]);
  const candidateRows = report.rows
    .filter((row) => row.readiness_status === 'future_guarded_parent_identity_insert_candidate')
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.finish_key,
      row.source_url,
    ]);
  const blockedRows = report.rows
    .filter((row) => row.readiness_status !== 'future_guarded_parent_identity_insert_candidate')
    .slice(0, 100)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.finish_key ?? '',
      row.readiness_status,
      row.blockers.join(', '),
    ]);

  return `# PKG-17I4 PriceCharting Stamp Label Readiness V1

Read-only readiness check for PriceCharting stamp-label candidates.

## Safety

- audit_only: ${report.audit_only}
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- candidate_source_rows: ${report.summary.candidate_source_rows}
- future_guarded_parent_identity_insert_candidates: ${report.summary.future_guarded_parent_identity_insert_candidates}
- label_candidate_only_active_finish_required: ${report.summary.by_readiness_status.label_candidate_only_active_finish_required ?? 0}
- blocked_or_review_rows: ${report.summary.blocked_or_review_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Readiness Status

${markdownTable(['status', 'rows'], statusRows)}

## Blockers

${markdownTable(['blocker', 'rows'], blockerRows)}

## Future Candidate Rows

${candidateRows.length ? markdownTable(['set', 'number', 'card', 'stamp label', 'finish', 'source'], candidateRows) : 'No future guarded parent identity insert candidates were found.'}

## Blocked/Review Rows

${blockedRows.length ? markdownTable(['set', 'number', 'card', 'stamp label', 'finish', 'status', 'blockers'], blockedRows) : 'No blocked rows.'}

## Rule

This report does not authorize a write. Candidate rows still require a separate rollback-only guarded dry-run artifact, fingerprint, post-apply verification plan, and explicit approval before any DB mutation.
`;
}

async function main() {
  const [fixture, acquisition] = await Promise.all([readJson(FIXTURE_JSON), readJson(ACQUISITION_JSON)]);
  const targets = targetRows(fixture);
  const capture = await captureReadiness(targets);
  const rows = buildRows(capture.rows);
  const allBlockers = rows.flatMap((row) => row.blockers);
  const payload = {
    fixture_source_status: fixture.source_status,
    fixture_record_count: fixture.records?.length ?? 0,
    acquisition_fingerprint: acquisition.fingerprint_sha256,
    rows,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17i4_pricecharting_stamp_label_readiness_v1',
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    audit_only: true,
    db_reads_performed: capture.db_available,
    db_read_error: capture.db_read_error,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      fixture: rel(FIXTURE_JSON),
      acquisition_report: rel(ACQUISITION_JSON),
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      candidate_source_rows: targets.length,
      live_rows_returned: rows.length,
      future_guarded_parent_identity_insert_candidates: rows.filter((row) => row.readiness_status === 'future_guarded_parent_identity_insert_candidate').length,
      blocked_or_review_rows: rows.filter((row) => row.readiness_status !== 'future_guarded_parent_identity_insert_candidate').length,
      forbidden_stamped_child_rows: rows.filter((row) => row.forbidden_stamped_child_count > 0).length,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_blocker: countBy(allBlockers.map((blocker) => ({ blocker })), (row) => row.blocker),
      by_set: countBy(rows, (row) => row.set_key),
      by_stamp_label: countBy(rows, (row) => row.stamp_label),
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    db_reads_performed: report.db_reads_performed,
    db_read_error: report.db_read_error,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
