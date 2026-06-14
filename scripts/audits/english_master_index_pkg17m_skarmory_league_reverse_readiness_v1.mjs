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
const FIXTURE_JSON = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures', 'generated_pkg17m_skarmory_league_active_finish_second_source_v1', 'skarmory_fb_league_reverse_second_source_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17m_skarmory_league_reverse_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17m_skarmory_league_reverse_readiness_v1.md');

const PACKAGE_ID = 'PKG-17M-SKARMORY-LEAGUE-REVERSE-READINESS';
const FUTURE_PACKAGE_ID = 'PKG-17N-SKARMORY-LEAGUE-REVERSE-PARENT-INSERT';
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

function groupedTargetRows(fixtureRows) {
  const grouped = new Map();
  for (const record of fixtureRows) {
    const key = [
      record.set_key,
      normalizeNumber(record.card_number),
      normalizeText(record.card_name),
      record.variant_key,
      record.finish_key,
    ].join('|');
    const current = grouped.get(key) ?? {
      set_key: record.set_key,
      set_name: record.set_name,
      card_number: record.card_number,
      number_plain: normalizeNumber(record.card_number),
      card_name: record.card_name,
      variant_key: record.variant_key,
      stamp_label: record.stamp_label,
      finish_key: record.finish_key,
      evidence_records: [],
    };
    current.evidence_records.push(record);
    grouped.set(key, current);
  }
  return [...grouped.values()].map((row) => ({
    ...row,
    target_parent_id: uuidFromSeed(`${FUTURE_PACKAGE_ID}:parent:${row.set_key}:${row.number_plain}:${normalizeText(row.card_name)}:${row.variant_key}`),
    target_child_id: uuidFromSeed(`${FUTURE_PACKAGE_ID}:child:${row.set_key}:${row.number_plain}:${normalizeText(row.card_name)}:${row.variant_key}:${row.finish_key}`),
    source_count: row.evidence_records.length,
    source_keys: [...new Set(row.evidence_records.map((record) => record.source_key))].sort(),
    source_urls: [...new Set(row.evidence_records.map((record) => record.source_url))].sort(),
  }));
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
           source_count int,
           source_keys jsonb,
           source_urls jsonb
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
         left join selected_base base on base.target_parent_id = target.target_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         target.*,
         base.id as base_parent_id,
         coalesce(array_agg(distinct base_child.finish_key order by base_child.finish_key) filter (where base_child.finish_key is not null), '{}') as base_parent_child_finishes,
         count(distinct collision.id)::int as parent_collision_count,
         count(distinct child_collision.id)::int as child_collision_count,
         count(distinct identity_collision.id)::int as identity_collision_count,
         projection.projected->>'status' as identity_projection_status,
         projection.projected->>'identity_key_hash' as projected_identity_key_hash
       from target
       left join selected_base base on base.target_parent_id = target.target_parent_id
       left join public.card_printings base_child on base_child.card_print_id = base.id
       left join public.card_prints collision
         on collision.set_id = base.set_id
        and coalesce(collision.number_plain, collision.number) = coalesce(base.number_plain, base.number)
        and lower(collision.name) = lower(base.name)
        and coalesce(collision.variant_key, '') = target.variant_key
       left join public.card_printings child_collision on child_collision.id = target.target_child_id
       left join public.card_print_identity identity_collision on identity_collision.card_print_id = target.target_parent_id and identity_collision.is_active = true
       left join projections projection on projection.target_parent_id = target.target_parent_id
       group by
         target.target_parent_id,
         target.target_child_id,
         target.set_key,
         target.set_name,
         target.card_number,
         target.number_plain,
         target.card_name,
         target.variant_key,
         target.stamp_label,
         target.finish_key,
         target.source_count,
         target.source_keys,
         target.source_urls,
         base.id,
         projection.projected`,
      [JSON.stringify(targets)],
    );
    await client.query('rollback');
    return {
      db_available: true,
      db_read_error: null,
      rows: result.rows.map((row) => {
        const blockers = [];
        if (!row.base_parent_id) blockers.push('base_parent_missing');
        if (!ACTIVE_CHILD_FINISHES.has(row.finish_key)) blockers.push('inactive_or_invalid_finish');
        if (!(row.base_parent_child_finishes ?? []).includes(row.finish_key)) blockers.push('base_parent_missing_target_child_finish');
        if (row.parent_collision_count !== 0) blockers.push('target_parent_collision');
        if (row.child_collision_count !== 0) blockers.push('target_child_collision');
        if (row.identity_collision_count !== 0) blockers.push('target_identity_collision');
        if (row.identity_projection_status !== 'ready') blockers.push('identity_projection_unavailable');
        if (Number(row.source_count) < 2) blockers.push('second_source_needed');
        return {
          ...row,
          readiness_status: blockers.length === 0 ? 'future_guarded_parent_identity_insert_candidate' : 'blocked_or_review',
          blockers,
        };
      }),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { db_available: false, db_read_error: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  return `# PKG-17M Skarmory League Reverse Readiness V1

Read-only readiness check for the Skarmory FB League Stamp reverse candidate.

## Safety

- audit_only: ${report.audit_only}
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['candidate_source_rows', report.summary.candidate_source_rows],
    ['target_rows', report.summary.target_rows],
    ['future_guarded_parent_identity_insert_candidates', report.summary.future_guarded_parent_identity_insert_candidates],
    ['blocked_or_review_rows', report.summary.blocked_or_review_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Rows

${markdownTable(
    ['set', 'number', 'card', 'variant', 'finish', 'source_count', 'base_parent_id', 'status', 'blockers'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.finish_key,
      row.source_count,
      row.base_parent_id,
      row.readiness_status,
      row.blockers.join(', ') || 'none',
    ]),
  )}
`;
}

async function main() {
  const fixtureRows = await readJson(FIXTURE_JSON);
  const targets = groupedTargetRows(fixtureRows);
  const readiness = await captureReadiness(targets);
  const rows = readiness.rows;
  const payload = {
    fixture_hash: sha256(stableJson(fixtureRows)),
    targets,
    rows,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17m_skarmory_league_reverse_readiness_v1',
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    source_artifact: rel(FIXTURE_JSON),
    audit_only: true,
    db_reads_performed: readiness.db_available,
    db_read_error: readiness.db_read_error,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      candidate_source_rows: fixtureRows.length,
      target_rows: targets.length,
      future_guarded_parent_identity_insert_candidates: rows.filter((row) => row.readiness_status === 'future_guarded_parent_identity_insert_candidate').length,
      blocked_or_review_rows: rows.filter((row) => row.readiness_status !== 'future_guarded_parent_identity_insert_candidate').length,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_blocker: countBy(rows.flatMap((row) => row.blockers), (blocker) => blocker),
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
