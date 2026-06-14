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

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'english_master_index_pkg02h_post_apply_remaining_recovery_queue_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'english_master_index_pkg02h_post_apply_remaining_recovery_queue_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function normalized(value) {
  return normalizeText(value);
}

function parentMatchesTarget(row, live) {
  return normalized(live?.set_code) === normalized(row.set_key)
    && normalizeNumber(live?.number) === normalizeNumber(row.source_card_number)
    && normalized(live?.name) === normalized(row.index_card_name);
}

function addCount(target, key, count = 1) {
  const normalizedKey = String(key ?? '').trim() || 'unknown';
  target[normalizedKey] = (target[normalizedKey] ?? 0) + Number(count ?? 0);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(filePath, data) {
  await fs.writeFile(filePath, data);
}

async function readLiveParents(cardPrintIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rowsById: new Map(),
      countsById: new Map(),
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const rows = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_identity_modifier,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = cp.id) as child_printing_count,
         (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id) as external_mappings_count,
         (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows_count,
         (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows_count,
         (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_items_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])`,
      [cardPrintIds],
    );
    await client.query('rollback');
    const rowsById = new Map();
    const countsById = new Map();
    for (const row of rows.rows) {
      rowsById.set(row.card_print_id, row);
      countsById.set(row.card_print_id, {
        child_printing_count: Number(row.child_printing_count ?? 0),
        external_mappings_count: Number(row.external_mappings_count ?? 0),
        identity_rows_count: Number(row.identity_rows_count ?? 0),
        trait_rows_count: Number(row.trait_rows_count ?? 0),
        vault_items_count: Number(row.vault_items_count ?? 0),
      });
    }
    return { available: true, reason: null, rowsById, countsById };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only parent snapshot failed: ${error.message}`,
      rowsById: new Map(),
      countsById: new Map(),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildReport({ exactMatch, live }) {
  const eligibleRows = (exactMatch.rows ?? [])
    .filter((row) => row.card_match_status === 'exact_card_identity_match')
    .filter((row) => row.finish_match_status === 'all_finishes_master_verified_by_index');

  const rows = eligibleRows.map((row) => {
    const liveParent = live.rowsById.get(row.card_print_id);
    const dependencyCounts = live.countsById.get(row.card_print_id) ?? {};
    let live_status = 'still_needs_recovery';
    if (!liveParent) live_status = 'parent_not_found_closed_or_deleted';
    else if (parentMatchesTarget(row, liveParent)) live_status = 'already_matches_index_target';

    return {
      package_candidate_status: live_status === 'still_needs_recovery' ? 'remaining_candidate' : 'closed_by_prior_apply',
      live_status,
      set_key: row.set_key,
      set_name: row.set_name,
      card_print_id: row.card_print_id,
      target_card_number: row.source_card_number,
      target_card_name: row.index_card_name,
      target_finishes: row.supported_finishes ?? [],
      current_set_code: liveParent?.set_code ?? null,
      current_number: liveParent?.number ?? null,
      current_number_plain: liveParent?.number_plain ?? null,
      current_name: liveParent?.name ?? null,
      current_printed_identity_modifier: liveParent?.printed_identity_modifier ?? null,
      dependency_counts: dependencyCounts,
      evidence_sources: uniqueSorted(row.supported_sources ?? []),
      evidence_source_kinds: uniqueSorted(row.supported_source_kinds ?? []),
      mutation_authority: 'not mutation authority',
    };
  });

  const remainingRows = rows.filter((row) => row.package_candidate_status === 'remaining_candidate');
  const closedRows = rows.filter((row) => row.package_candidate_status === 'closed_by_prior_apply');
  const summary = {
    original_eligible_rows: eligibleRows.length,
    closed_by_prior_apply_rows: closedRows.length,
    remaining_candidate_rows: remainingRows.length,
    remaining_candidate_printing_rows: remainingRows.reduce((sum, row) => sum + row.target_finishes.length, 0),
    remaining_candidate_sets: uniqueSorted(remainingRows.map((row) => row.set_key)).length,
    by_live_status: {},
    remaining_by_set: {},
    remaining_vault_items: remainingRows.reduce((sum, row) => sum + Number(row.dependency_counts?.vault_items_count ?? 0), 0),
  };
  for (const row of rows) addCount(summary.by_live_status, row.live_status);
  for (const row of remainingRows) addCount(summary.remaining_by_set, row.set_key);

  const stopFindings = [];
  if (!live.available) stopFindings.push('live_db_snapshot_unavailable');

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02h_post_apply_remaining_recovery_queue_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    report_status: stopFindings.length
      ? 'blocked_live_snapshot_required_no_write'
      : 'post_apply_remaining_recovery_queue_ready_no_write',
    rule: 'This report filters prior all-finish master-verified physical recovery candidates against the live DB after PKG-02 applies. It is not write authorization.',
    source_artifacts: {
      exact_match: 'english_master_index_physical_recovery_exact_match_v1.json',
      post_apply_packages_closed: [
        'PKG-02C-FULL-BETA-NONCOLLIDING',
        'PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER',
        'PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER',
      ],
    },
    live_snapshot: {
      available: live.available,
      reason: live.reason,
    },
    summary,
    stop_findings: stopFindings,
    remaining_candidates: remainingRows,
    closed_rows: closedRows,
    next_required_step: remainingRows.length
      ? 'Generate a small guarded dry-run transaction artifact for the lowest-risk remaining candidate set only.'
      : 'No remaining all-finish master-verified physical recovery candidates remain in this lane.',
  };
}

function buildMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_live_status).map(([status, count]) => [status, count]);
  const setRows = Object.entries(report.summary.remaining_by_set)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .map(([set, count]) => [set, count]);
  const candidateRows = report.remaining_candidates.slice(0, 120).map((row) => [
    row.set_key,
    row.target_card_number,
    row.target_card_name,
    row.card_print_id,
    row.target_finishes.join(', '),
    row.current_set_code ?? '',
    row.current_number ?? '',
    row.current_name ?? '',
    row.dependency_counts?.vault_items_count ?? 0,
  ]);

  return `# PKG-02H Post-Apply Remaining Recovery Queue V1

This is a read-only post-apply planning artifact. It does not authorize DB writes, migrations, cleanup, quarantine, or global apply.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- apply_paths_executed: ${report.apply_paths_executed}

## Summary

- report_status: ${report.report_status}
- original_eligible_rows: ${report.summary.original_eligible_rows}
- closed_by_prior_apply_rows: ${report.summary.closed_by_prior_apply_rows}
- remaining_candidate_rows: ${report.summary.remaining_candidate_rows}
- remaining_candidate_printing_rows: ${report.summary.remaining_candidate_printing_rows}
- remaining_candidate_sets: ${report.summary.remaining_candidate_sets}
- remaining_vault_items: ${report.summary.remaining_vault_items}

## Live Status

${markdownTable(['status', 'rows'], statusRows)}

## Remaining By Set

${markdownTable(['set_key', 'rows'], setRows)}

## Remaining Candidate Sample

${markdownTable(['set', 'number', 'target_name', 'card_print_id', 'finishes', 'current_set', 'current_number', 'current_name', 'vault_items'], candidateRows)}

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : '- none'}

## Next Required Step

${report.next_required_step}
`;
}

async function main() {
  const exactMatch = await readJson('english_master_index_physical_recovery_exact_match_v1.json');
  const eligibleIds = uniqueSorted((exactMatch.rows ?? [])
    .filter((row) => row.card_match_status === 'exact_card_identity_match')
    .filter((row) => row.finish_match_status === 'all_finishes_master_verified_by_index')
    .map((row) => row.card_print_id));
  const live = await readLiveParents(eligibleIds);
  const report = buildReport({ exactMatch, live });
  await writeJson(OUTPUT_JSON, report);
  await writeMarkdown(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated_files: [
      path.relative(process.cwd(), OUTPUT_JSON).replaceAll('\\', '/'),
      path.relative(process.cwd(), OUTPUT_MD).replaceAll('\\', '/'),
    ],
    report_status: report.report_status,
    summary: report.summary,
    stop_findings: report.stop_findings,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
