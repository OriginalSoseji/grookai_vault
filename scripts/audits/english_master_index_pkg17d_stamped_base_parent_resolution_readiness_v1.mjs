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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17d_stamped_base_parent_resolution_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17d_stamped_base_parent_resolution_readiness_v1.md');

const PACKAGE_ID = 'PKG-17D-STAMPED-BASE-PARENT-RESOLUTION-READINESS';
const FUTURE_INSERT_PACKAGE_ID = 'PKG-17D1-STAMPED-BASE-PARENT-INSERTS';
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

function normalizeSetCode(value) {
  return String(value ?? '').trim().toLowerCase();
}

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function targetRows(queue) {
  return (queue.rows ?? [])
    .filter((row) => row.action_bucket === 'base_parent_blocked_no_write')
    .map((row) => ({
      ...row,
      normalized_card_number: normalizeNumber(row.card_number),
      normalized_card_name: normalizeText(row.card_name),
    }))
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.normalized_card_number).localeCompare(String(right.normalized_card_number), undefined, { numeric: true })
      || String(left.normalized_card_name).localeCompare(String(right.normalized_card_name))
      || String(left.variant_key ?? '').localeCompare(String(right.variant_key ?? '')));
}

async function loadLiveContext(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', sets: [], parents: [] };

  const setKeys = [...new Set(rows.map((row) => normalizeSetCode(row.set_key)))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const sets = await client.query(
      `select id::text as set_id, code, name
       from public.sets
       where game = 'pokemon'
         and lower(coalesce(code, '')) = any($1::text[])
       order by code, id`,
      [setKeys],
    );
    const parents = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_id::text,
         cp.set_code,
         cp.number,
         cp.number_plain,
         coalesce(cp.number_plain, cp.number) as coalesced_number,
         cp.name,
         cp.rarity,
         coalesce(cp.variant_key, '') as variant_key,
         cp.printed_identity_modifier,
         cp.printed_total,
         cp.printed_set_abbrev,
         coalesce((select jsonb_agg(cpr.finish_key order by cpr.finish_key)
                   from public.card_printings cpr
                   where cpr.card_print_id = cp.id), '[]'::jsonb) as child_finishes,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id), 0) as external_mapping_count,
         coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_instance_parent_count,
         coalesce((select count(*)::int from public.pricing_watch pw where pw.card_print_id = cp.id), 0) as pricing_watch_count,
         coalesce((select count(*)::int from public.card_feed_events cfe where cfe.card_print_id = cp.id), 0) as card_feed_event_count
       from public.card_prints cp
       where lower(coalesce(cp.set_code, '')) = any($1::text[])
       order by cp.set_code, cp.number, cp.name, cp.variant_key, cp.id`,
      [setKeys],
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      sets: sets.rows,
      parents: parents.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, sets: [], parents: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function rowNumberMatches(parent, row) {
  const candidates = [parent.number, parent.number_plain, parent.coalesced_number].filter(Boolean).map(normalizeNumber);
  return candidates.includes(row.normalized_card_number);
}

function parentSnapshot(parent) {
  return {
    card_print_id: parent.card_print_id,
    set_code: parent.set_code,
    number: parent.number,
    number_plain: parent.number_plain,
    name: parent.name,
    rarity: parent.rarity,
    variant_key: parent.variant_key || null,
    printed_identity_modifier: parent.printed_identity_modifier,
    child_finishes: parent.child_finishes ?? [],
    external_mapping_count: parent.external_mapping_count,
    vault_item_count: parent.vault_item_count,
    vault_instance_parent_count: parent.vault_instance_parent_count,
    pricing_watch_count: parent.pricing_watch_count,
    card_feed_event_count: parent.card_feed_event_count,
  };
}

function classifyRow(row, context) {
  const rowSetCode = normalizeSetCode(row.set_key);
  const set = context.sets.find((candidate) => normalizeSetCode(candidate.code) === rowSetCode) ?? null;
  const sameSetParents = context.parents.filter((parent) => normalizeSetCode(parent.set_code) === rowSetCode);
  const sameNumberParents = sameSetParents.filter((parent) => rowNumberMatches(parent, row));
  const sameNameParents = sameNumberParents.filter((parent) => normalizeText(parent.name) === row.normalized_card_name);
  const unstampedParents = sameNameParents.filter((parent) => !parent.variant_key && !parent.printed_identity_modifier);
  const stampedVariantParents = row.variant_key
    ? sameNameParents.filter((parent) => normalizeText(parent.variant_key) === normalizeText(row.variant_key))
    : [];
  const targetFinish = row.finish_key ?? null;
  const targetFinishActive = targetFinish ? ACTIVE_CHILD_FINISHES.has(targetFinish) : false;
  const targetParentId = uuidFromSeed(`${FUTURE_INSERT_PACKAGE_ID}:base-parent:${row.set_key}:${row.normalized_card_number}:${row.normalized_card_name}`);
  const targetChildId = targetFinish ? uuidFromSeed(`${FUTURE_INSERT_PACKAGE_ID}:base-child:${row.set_key}:${row.normalized_card_number}:${row.normalized_card_name}:${targetFinish}`) : null;

  let readiness_status = 'blocked_manual_review';
  const blockers = [];
  let recommended_next_action = 'Manual review required before any package.';

  if (!set) {
    readiness_status = 'blocked_set_missing';
    blockers.push('live_set_missing');
    recommended_next_action = 'Resolve the live set alias before base parent work.';
  } else if (stampedVariantParents.length > 0) {
    readiness_status = 'stale_stamped_parent_now_exists';
    recommended_next_action = 'Return this row to stamped active-finish or child-finish closure checks; stamped parent already exists.';
  } else if (unstampedParents.length === 1) {
    readiness_status = 'stale_unstamped_base_parent_now_exists';
    recommended_next_action = 'Return this row to stamped parent identity readiness; the unstamped base parent now exists.';
  } else if (unstampedParents.length > 1 || sameNameParents.length > 1) {
    readiness_status = 'blocked_multiple_base_parent_candidates';
    blockers.push(`same_name_parent_count_${sameNameParents.length}`);
    recommended_next_action = 'Resolve base parent identity collision before any stamped package.';
  } else if (sameNumberParents.length > 0) {
    readiness_status = 'blocked_same_number_different_name';
    blockers.push(`same_number_parent_count_${sameNumberParents.length}`);
    recommended_next_action = 'Adjudicate same-number identity conflict before inserting a base parent.';
  } else if (!targetFinishActive) {
    readiness_status = 'blocked_missing_or_inactive_base_finish';
    blockers.push(targetFinish ? `inactive_finish_${targetFinish}` : 'missing_target_finish');
    recommended_next_action = 'Acquire an exact active child finish for the unstamped base parent before any insert dry-run.';
  } else if (row.queue_status !== 'base_parent_missing') {
    readiness_status = 'blocked_original_status_not_missing';
    blockers.push(`source_queue_status_${row.queue_status}`);
    recommended_next_action = 'Keep ambiguous rows out of insert buckets until ambiguity is resolved.';
  } else {
    readiness_status = 'base_parent_insert_dry_run_candidate';
    recommended_next_action = 'Eligible for a separate guarded dry-run package that inserts only the unstamped base parent and its active child finish.';
  }

  return {
    package_id: PACKAGE_ID,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    stamped_variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    target_base_finish_key: targetFinish,
    source_queue_status: row.queue_status,
    source_blockers: row.blockers ?? [],
    live_set_id: set?.set_id ?? null,
    selected_base_parent_id: unstampedParents.length === 1 ? unstampedParents[0].card_print_id : null,
    selected_base_parent: unstampedParents.length === 1 ? parentSnapshot(unstampedParents[0]) : null,
    target_base_parent_id: readiness_status === 'base_parent_insert_dry_run_candidate' ? targetParentId : null,
    target_base_child_id: readiness_status === 'base_parent_insert_dry_run_candidate' ? targetChildId : null,
    same_number_parent_count: sameNumberParents.length,
    same_name_parent_count: sameNameParents.length,
    unstamped_parent_count: unstampedParents.length,
    stamped_variant_parent_count: stampedVariantParents.length,
    readiness_status,
    blockers,
    recommended_next_action,
    same_number_parents: sameNumberParents.slice(0, 8).map(parentSnapshot),
  };
}

function buildMarkdown(report) {
  return `# PKG-17D Stamped Base Parent Resolution Readiness V1

Generated: ${report.generated_at}

Read-only readiness view for stamped rows blocked because the unstamped base parent is missing or ambiguous. This report does not write to the database, create migrations, delete rows, merge rows, or alter canonical truth.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['db_reads_performed', report.db_reads_performed],
    ['insert_dry_run_candidates', report.summary.insert_dry_run_candidates],
    ['stale_or_return_to_stamped_readiness', report.summary.stale_or_return_to_stamped_readiness],
    ['blocked_rows', report.summary.blocked_rows],
    ['write_ready_now', report.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Status Counts

${markdownTable(['status', 'rows'], Object.entries(report.summary.by_readiness_status))}

## Candidate Rows

${markdownTable(
    ['set', 'number', 'card', 'base_finish', 'target_parent_id', 'target_child_id'],
    report.rows
      .filter((row) => row.readiness_status === 'base_parent_insert_dry_run_candidate')
      .map((row) => [
        row.set_key,
        row.card_number,
        row.card_name,
        row.target_base_finish_key,
        row.target_base_parent_id,
        row.target_base_child_id,
      ]),
  )}

## Blocked / Return Rows

${markdownTable(
    ['set', 'number', 'card', 'status', 'blockers', 'next_action'],
    report.rows
      .filter((row) => row.readiness_status !== 'base_parent_insert_dry_run_candidate')
      .slice(0, 120)
      .map((row) => [
        row.set_key,
        row.card_number,
        row.card_name,
        row.readiness_status,
        row.blockers.join(', ') || 'none',
        row.recommended_next_action,
      ]),
  )}

## Guardrail

Candidate rows are not approval to write. A future package must prepare a rollback-only dry-run transaction artifact, prove target IDs and child finishes, and receive explicit approval before any apply.
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targets = targetRows(source);
  const live = await loadLiveContext(targets);
  const rows = targets.map((row) => classifyRow(row, live));
  const payload = {
    source_fingerprint: source.fingerprint_sha256,
    db_context_available: live.available,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      stamped_variant_key: row.stamped_variant_key,
      target_base_finish_key: row.target_base_finish_key,
      readiness_status: row.readiness_status,
      target_base_parent_id: row.target_base_parent_id,
      target_base_child_id: row.target_base_child_id,
    })),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17d_stamped_base_parent_resolution_readiness_v1',
    package_id: PACKAGE_ID,
    future_insert_package_id: FUTURE_INSERT_PACKAGE_ID,
    audit_only: true,
    db_reads_performed: live.available,
    db_read_error: live.reason,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifact: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: rows.length,
      insert_dry_run_candidates: rows.filter((row) => row.readiness_status === 'base_parent_insert_dry_run_candidate').length,
      stale_or_return_to_stamped_readiness: rows.filter((row) => row.readiness_status.startsWith('stale_')).length,
      blocked_rows: rows.filter((row) => row.readiness_status.startsWith('blocked_')).length,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
    safety_confirmation: {
      audit_only: true,
      db_reads_performed: live.available,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      write_ready_now: 0,
    },
  };

  const markdown = buildMarkdown(report);
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, markdown);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_reads_performed: report.db_reads_performed,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
