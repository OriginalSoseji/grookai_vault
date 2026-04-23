/**
 * MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical identity outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

import { installIdentityMaintenanceBoundaryV1 } from './identity_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_IDENTITY_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
  );
}

if (process.env.IDENTITY_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
  );
}

if (process.env.IDENTITY_MAINTENANCE_ENTRYPOINT !== 'backend/identity/run_identity_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched from backend/identity/run_identity_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.IDENTITY_MAINTENANCE_DRY_RUN !== 'false';
const { assertMaintenanceWriteAllowed } = installIdentityMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('IDENTITY MAINTENANCE: running in DRY RUN mode');
}

void assertMaintenanceWriteAllowed;
const INPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'identity_build_dry_run_v1.json',
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'identity_apply_report_v1.json',
);

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const APPROVED_IDENTITY_KEY_VERSION = 'pokemon_eng_standard:v1';
const INSERT_BATCH_SIZE = 250;

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function countDuplicates(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value, row_count]) => ({ value, row_count }));
}

async function loadExistingActiveIdentityCounts(client, cardPrintIds) {
  if (cardPrintIds.length === 0) {
    return new Map();
  }

  const sql = `
    select
      card_print_id,
      count(*)::int as active_identity_count
    from public.card_print_identity
    where is_active = true
      and card_print_id = any($1::uuid[])
    group by card_print_id
  `;

  const { rows } = await client.query(sql, [cardPrintIds]);
  return new Map(
    rows.map((row) => [row.card_print_id, Number(row.active_identity_count) || 0]),
  );
}

async function loadExistingActiveHashCounts(client, identityKeyHashes) {
  if (identityKeyHashes.length === 0) {
    return new Map();
  }

  const sql = `
    select
      identity_key_hash,
      count(*)::int as active_hash_count
    from public.card_print_identity
    where is_active = true
      and identity_key_hash = any($1::text[])
    group by identity_key_hash
  `;

  const { rows } = await client.query(sql, [identityKeyHashes]);
  return new Map(
    rows.map((row) => [row.identity_key_hash, Number(row.active_hash_count) || 0]),
  );
}

async function loadFinalActiveIdentityCount(client) {
  const sql = `
    select count(*)::int as active_row_count
    from public.card_print_identity
    where is_active = true
  `;
  const { rows } = await client.query(sql);
  return rows[0]?.active_row_count ?? 0;
}

async function insertBatch(client, batchRows) {
  const sql = `
    insert into public.card_print_identity (
      card_print_id,
      identity_domain,
      set_code_identity,
      printed_number,
      normalized_printed_name,
      source_name_raw,
      identity_payload,
      identity_key_version,
      identity_key_hash,
      is_active
    )
    select
      candidate.card_print_id,
      candidate.identity_domain,
      candidate.set_code_identity,
      candidate.printed_number,
      candidate.normalized_printed_name,
      candidate.source_name_raw,
      candidate.identity_payload,
      candidate.identity_key_version,
      candidate.identity_key_hash,
      candidate.is_active
    from jsonb_to_recordset($1::jsonb) as candidate(
      card_print_id uuid,
      identity_domain text,
      identity_key_version text,
      set_code_identity text,
      printed_number text,
      normalized_printed_name text,
      source_name_raw text,
      identity_payload jsonb,
      identity_key_hash text,
      is_active boolean
    )
    returning card_print_id
  `;

  const { rows } = await client.query(sql, [JSON.stringify(batchRows)]);
  return rows.length;
}

function writeReport(report) {
  ensureOutputDir(OUTPUT_PATH);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const dryRun = readJson(INPUT_PATH);
  const rows = Array.isArray(dryRun.rows) ? dryRun.rows : [];
  const report = {
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    dry_run_row_count: rows.length,
    inserted_count: 0,
    skipped_existing_active_count: 0,
    failed_count: 0,
    first_failure: null,
    final_active_card_print_identity_row_count: null,
    invariant_results: {},
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'identity_apply_v1',
  });

  await client.connect();

  try {
    const duplicateCardPrintGroups = countDuplicates(rows.map((row) => row.card_print_id));
    const duplicateHashGroups = countDuplicates(rows.map((row) => row.identity_key_hash));
    const invalidDomainRows = rows.filter(
      (row) =>
        row.identity_domain !== TARGET_IDENTITY_DOMAIN ||
        row.identity_key_version !== APPROVED_IDENTITY_KEY_VERSION,
    );
    const excludedDomainRows = rows.filter((row) => row.identity_domain === 'tcg_pocket_excluded');
    const missingPrintedNumberRows = rows.filter((row) => !row.printed_number);
    const missingSetCodeRows = rows.filter((row) => !row.set_code_identity);
    const missingHashRows = rows.filter((row) => !row.identity_key_hash);

    report.invariant_results = {
      only_target_rows: invalidDomainRows.length === 0,
      zero_excluded_non_target_rows: excludedDomainRows.length === 0,
      no_duplicate_active_card_print_groups: duplicateCardPrintGroups.length === 0,
      no_duplicate_active_domain_hash_groups: duplicateHashGroups.length === 0,
      all_printed_number_present: missingPrintedNumberRows.length === 0,
      all_set_code_identity_present: missingSetCodeRows.length === 0,
      all_identity_key_hash_present: missingHashRows.length === 0,
    };

    const invariantStopReasons = [];
    if (!report.invariant_results.only_target_rows) {
      invariantStopReasons.push(`NON_TARGET_ROWS:${invalidDomainRows.length}`);
    }
    if (!report.invariant_results.zero_excluded_non_target_rows) {
      invariantStopReasons.push(`EXCLUDED_NON_TARGET_ROWS:${excludedDomainRows.length}`);
    }
    if (!report.invariant_results.no_duplicate_active_card_print_groups) {
      invariantStopReasons.push(
        `DUPLICATE_ACTIVE_CARD_PRINT_GROUPS:${duplicateCardPrintGroups.length}`,
      );
    }
    if (!report.invariant_results.no_duplicate_active_domain_hash_groups) {
      invariantStopReasons.push(
        `DUPLICATE_ACTIVE_DOMAIN_HASH_GROUPS:${duplicateHashGroups.length}`,
      );
    }
    if (!report.invariant_results.all_printed_number_present) {
      invariantStopReasons.push(`MISSING_PRINTED_NUMBER:${missingPrintedNumberRows.length}`);
    }
    if (!report.invariant_results.all_set_code_identity_present) {
      invariantStopReasons.push(`MISSING_SET_CODE_IDENTITY:${missingSetCodeRows.length}`);
    }
    if (!report.invariant_results.all_identity_key_hash_present) {
      invariantStopReasons.push(`MISSING_IDENTITY_KEY_HASH:${missingHashRows.length}`);
    }

    const existingActiveCounts = await loadExistingActiveIdentityCounts(
      client,
      rows.map((row) => row.card_print_id),
    );
    const rowsWithExistingActive = rows.filter(
      (row) => (existingActiveCounts.get(row.card_print_id) ?? 0) > 0,
    );
    report.skipped_existing_active_count = rowsWithExistingActive.length;

    const insertRows = rows.filter(
      (row) => (existingActiveCounts.get(row.card_print_id) ?? 0) === 0,
    );

    const existingActiveHashCounts = await loadExistingActiveHashCounts(
      client,
      insertRows.map((row) => row.identity_key_hash).filter(Boolean),
    );
    const existingHashConflictRows = insertRows.filter(
      (row) => (existingActiveHashCounts.get(row.identity_key_hash) ?? 0) > 0,
    );

    report.invariant_results.no_target_rows_with_existing_active_identity =
      insertRows.length + report.skipped_existing_active_count === rows.length;
    report.invariant_results.no_existing_active_hash_conflicts =
      existingHashConflictRows.length === 0;

    if (!report.invariant_results.no_existing_active_hash_conflicts) {
      invariantStopReasons.push(`EXISTING_ACTIVE_HASH_CONFLICTS:${existingHashConflictRows.length}`);
    }

    if (invariantStopReasons.length > 0) {
      report.failed_count = invariantStopReasons.length;
      report.first_failure = {
        step: 'pre_insert_invariant_check',
        message: invariantStopReasons[0],
      };
      report.final_active_card_print_identity_row_count = await loadFinalActiveIdentityCount(client);
      writeReport(report);
      throw new Error(`APPLY_STOPPED:${invariantStopReasons.join(',')}`);
    }

    await client.query('begin');
    try {
      for (let start = 0; start < insertRows.length; start += INSERT_BATCH_SIZE) {
        const batch = insertRows.slice(start, start + INSERT_BATCH_SIZE);
        const insertedCount = await insertBatch(client, batch);
        report.inserted_count += insertedCount;
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      report.failed_count = 1;
      report.first_failure = {
        step: 'insert_batch',
        sqlstate: error?.code ?? null,
        message: error?.message ?? String(error),
      };
      report.final_active_card_print_identity_row_count = await loadFinalActiveIdentityCount(client);
      writeReport(report);
      throw error;
    }

    report.final_active_card_print_identity_row_count = await loadFinalActiveIdentityCount(client);
    writeReport(report);
    console.log('Applied:', report.inserted_count);
    console.log('Apply report:', report);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
