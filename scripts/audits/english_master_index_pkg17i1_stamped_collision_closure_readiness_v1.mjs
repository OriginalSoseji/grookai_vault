import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17i1_stamped_collision_closure_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17i1_stamped_collision_closure_readiness_v1.md');

const PACKAGE_ID = 'PKG-17I1-STAMPED-COLLISION-CLOSURE-READINESS';
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

function numberPlain(value) {
  const first = String(value ?? '').split('/')[0].trim();
  const stripped = first.replace(/^0+(?=\d)/, '');
  return stripped || first;
}

function targetRows(queue) {
  return (queue.rows ?? [])
    .filter((row) => row.queue_status === 'existing_stamped_parent_collision_review')
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      source_number_plain: numberPlain(row.card_number),
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      source_report: row.source_report,
      source_blockers: row.blockers ?? [],
    }));
}

async function captureLiveRows(targets) {
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
           set_key text,
           set_name text,
           card_number text,
           source_number_plain text,
           card_name text,
           variant_key text,
           stamp_label text,
           source_report text,
           source_blockers jsonb
         )
       ),
       matched_parent as (
         select
           target.*,
           cp.id::text as card_print_id,
           cp.set_code,
           cp.number,
           cp.number_plain,
           cp.name,
           cp.variant_key as live_variant_key,
           cp.printed_identity_modifier,
           cp.gv_id
         from target
         left join public.card_prints cp
           on cp.set_code = target.set_key
          and lower(cp.name) = lower(target.card_name)
          and coalesce(nullif(ltrim(split_part(coalesce(cp.number_plain, cp.number), '/', 1), '0'), ''), '0') = target.source_number_plain
          and coalesce(cp.variant_key, '') = coalesce(target.variant_key, '')
       ),
       child_summary as (
         select
           mp.card_print_id,
           jsonb_agg(
             jsonb_build_object(
               'id', cpr.id::text,
               'finish_key', cpr.finish_key,
               'created_by', cpr.created_by,
               'is_provisional', cpr.is_provisional
             )
             order by cpr.finish_key, cpr.id
           ) filter (where cpr.id is not null) as child_printings,
           count(cpr.id)::int as child_count,
           count(cpr.id) filter (where cpr.finish_key in ('normal', 'holo', 'reverse', 'cosmos', 'cracked_ice'))::int as active_child_finish_count,
           count(cpr.id) filter (where cpr.finish_key = 'stamped')::int as forbidden_stamped_child_count
         from matched_parent mp
         left join public.card_printings cpr on cpr.card_print_id::text = mp.card_print_id
         group by mp.card_print_id
       ),
       identity_summary as (
         select
           mp.card_print_id,
           count(cpi.id) filter (where cpi.is_active)::int as active_identity_count
         from matched_parent mp
         left join public.card_print_identity cpi on cpi.card_print_id::text = mp.card_print_id
         group by mp.card_print_id
       ),
       dependency_summary as (
         select
           mp.card_print_id,
           count(distinct em.id)::int as active_external_mapping_count,
           count(distinct vii.id)::int as vault_instance_parent_count,
           count(distinct pw.id)::int as pricing_watch_count
         from matched_parent mp
         left join public.external_mappings em
           on em.card_print_id::text = mp.card_print_id
          and coalesce(em.active, true) = true
         left join public.vault_item_instances vii on vii.card_print_id::text = mp.card_print_id
         left join public.pricing_watch pw on pw.card_print_id::text = mp.card_print_id
         group by mp.card_print_id
       )
       select
         mp.*,
         coalesce(cs.child_printings, '[]'::jsonb) as child_printings,
         coalesce(cs.child_count, 0)::int as child_count,
         coalesce(cs.active_child_finish_count, 0)::int as active_child_finish_count,
         coalesce(cs.forbidden_stamped_child_count, 0)::int as forbidden_stamped_child_count,
         coalesce(ids.active_identity_count, 0)::int as active_identity_count,
         coalesce(dep.active_external_mapping_count, 0)::int as active_external_mapping_count,
         coalesce(dep.vault_instance_parent_count, 0)::int as vault_instance_parent_count,
         coalesce(dep.pricing_watch_count, 0)::int as pricing_watch_count
       from matched_parent mp
       left join child_summary cs on cs.card_print_id = mp.card_print_id
       left join identity_summary ids on ids.card_print_id = mp.card_print_id
       left join dependency_summary dep on dep.card_print_id = mp.card_print_id
       order by mp.set_key, mp.source_number_plain, mp.card_name, mp.variant_key, mp.card_print_id`,
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
  const childFinishes = [...new Set((row.child_printings ?? []).map((child) => child.finish_key).filter(Boolean))].sort();
  const activeFinishes = childFinishes.filter((finish) => ACTIVE_CHILD_FINISHES.has(finish));
  const blockers = [];

  if (!row.card_print_id) {
    return {
      closure_status: 'blocked_existing_stamped_parent_not_found',
      child_finishes: [],
      active_child_finishes: [],
      blockers: ['existing_stamped_parent_not_found'],
    };
  }
  if (Number(row.forbidden_stamped_child_count) > 0) blockers.push('forbidden_stamped_child_finish_exists');
  if (Number(row.active_identity_count) !== 1) blockers.push('active_identity_count_not_one');
  if (activeFinishes.length === 0) blockers.push('missing_active_child_finish');
  if (activeFinishes.length > 1) blockers.push('multiple_active_child_finishes_require_review');

  if (blockers.length === 0) {
    return {
      closure_status: 'closed_existing_stamped_parent_has_identity_and_active_child_finish',
      child_finishes: childFinishes,
      active_child_finishes: activeFinishes,
      blockers: [],
    };
  }
  if (activeFinishes.length > 0 && Number(row.active_identity_count) === 1 && Number(row.forbidden_stamped_child_count) === 0) {
    return {
      closure_status: 'review_existing_stamped_parent_has_identity_and_active_child_finish',
      child_finishes: childFinishes,
      active_child_finishes: activeFinishes,
      blockers,
    };
  }
  return {
    closure_status: 'blocked_existing_stamped_parent_not_clean',
    child_finishes: childFinishes,
    active_child_finishes: activeFinishes,
    blockers,
  };
}

function buildRows(liveRows) {
  return liveRows.map((row) => {
    const classification = classify(row);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      card_print_id: row.card_print_id,
      printed_identity_modifier: row.printed_identity_modifier,
      active_identity_count: Number(row.active_identity_count ?? 0),
      child_count: Number(row.child_count ?? 0),
      child_printings: row.child_printings ?? [],
      active_external_mapping_count: Number(row.active_external_mapping_count ?? 0),
      vault_instance_parent_count: Number(row.vault_instance_parent_count ?? 0),
      pricing_watch_count: Number(row.pricing_watch_count ?? 0),
      ...classification,
      write_ready_now: 0,
      recommended_next_action: classification.closure_status === 'closed_existing_stamped_parent_has_identity_and_active_child_finish'
        ? 'Remove from future write packages after global audit refresh; DB already has a clean stamped parent and active child finish.'
        : 'Keep blocked until exact identity, child finish, and dependency state are cleanly adjudicated.',
    };
  });
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_closure_status).map(([status, count]) => [status, count]);
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key,
    row.active_child_finishes.join(', '),
    row.active_identity_count,
    row.closure_status,
    row.blockers.join(', '),
  ]);

  return `# PKG-17I1 Stamped Collision Closure Readiness V1

Read-only closure check for current stamped collision rows.

## Safety

- audit_only: ${report.audit_only}
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- target_collision_rows: ${report.summary.target_collision_rows}
- live_rows_returned: ${report.summary.live_rows_returned}
- closed_existing_parent_rows: ${report.summary.closed_existing_parent_rows}
- blocked_or_review_rows: ${report.summary.blocked_or_review_rows}
- forbidden_stamped_child_rows: ${report.summary.forbidden_stamped_child_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

## Closure Status

${markdownTable(['status', 'rows'], statusRows)}

## Rows

${markdownTable(['set', 'number', 'card', 'variant', 'active finishes', 'active identities', 'status', 'blockers'], rows)}

## Rule

Closed rows are not delete or write authority. They only mean this collision lane should not produce a new write package for that fact after the next global audit refresh.
`;
}

async function main() {
  const queue = await readJson(INPUT_JSON);
  const targets = targetRows(queue);
  const capture = await captureLiveRows(targets);
  const rows = buildRows(capture.rows);
  const byClosureStatus = countBy(rows, (row) => row.closure_status);
  const payload = {
    input_fingerprint: queue.fingerprint_sha256,
    db_available: capture.db_available,
    db_read_error: capture.db_read_error,
    rows,
  };

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17i1_stamped_collision_closure_readiness_v1',
    package_id: PACKAGE_ID,
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
    source_artifact: rel(INPUT_JSON),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_collision_rows: targets.length,
      live_rows_returned: rows.length,
      closed_existing_parent_rows: rows.filter((row) => row.closure_status === 'closed_existing_stamped_parent_has_identity_and_active_child_finish').length,
      blocked_or_review_rows: rows.filter((row) => row.closure_status !== 'closed_existing_stamped_parent_has_identity_and_active_child_finish').length,
      forbidden_stamped_child_rows: rows.filter((row) => (row.child_finishes ?? []).includes('stamped')).length,
      by_closure_status: byClosureStatus,
      by_set: countBy(rows, (row) => row.set_key),
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
