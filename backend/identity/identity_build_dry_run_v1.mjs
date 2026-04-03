import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const INPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'identity_audit_results_v1.json',
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'identity_build_dry_run_v1.json',
);

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const APPROVED_IDENTITY_KEY_VERSION = 'pokemon_eng_standard:v1';
const HASH_BATCH_SIZE = 500;

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function uniqueValues(values) {
  return Array.from(new Set(values));
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

async function computeHashes(client, rows) {
  const hashedRows = [];

  for (let start = 0; start < rows.length; start += HASH_BATCH_SIZE) {
    const batch = rows.slice(start, start + HASH_BATCH_SIZE);
    const payload = JSON.stringify(batch);
    const sql = `
      select
        candidate.card_print_id,
        public.card_print_identity_hash_v1(
          candidate.identity_domain,
          candidate.identity_key_version,
          candidate.set_code_identity,
          candidate.printed_number,
          candidate.normalized_printed_name,
          candidate.source_name_raw,
          candidate.identity_payload
        ) as identity_key_hash
      from jsonb_to_recordset($1::jsonb) as candidate(
        card_print_id uuid,
        identity_domain text,
        identity_key_version text,
        set_code_identity text,
        printed_number text,
        normalized_printed_name text,
        source_name_raw text,
        identity_payload jsonb,
        is_active boolean
      )
    `;

    const { rows: hashedBatch } = await client.query(sql, [payload]);
    const hashMap = new Map(
      hashedBatch.map((row) => [row.card_print_id, row.identity_key_hash]),
    );

    for (const row of batch) {
      hashedRows.push({
        ...row,
        identity_key_hash: hashMap.get(row.card_print_id) ?? null,
      });
    }
  }

  return hashedRows;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const audit = readJson(INPUT_PATH);
  const auditRows = Array.isArray(audit.rows) ? audit.rows : [];
  const readyAuditRows = auditRows.filter(
    (row) =>
      row.identity_domain === TARGET_IDENTITY_DOMAIN &&
      row.classification_status === 'READY' &&
      row.proposed_identity_row,
  );

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'identity_build_dry_run_v1',
  });

  await client.connect();

  try {
    const existingActiveCounts = await loadExistingActiveIdentityCounts(
      client,
      readyAuditRows.map((row) => row.card_print_id),
    );

    const skippedExistingActiveRows = [];
    const candidateRows = [];
    const incompleteHashInputRows = [];

    for (const row of readyAuditRows) {
      const proposed = row.proposed_identity_row;
      const existingActiveCount = existingActiveCounts.get(proposed.card_print_id) ?? 0;

      if (existingActiveCount > 0) {
        skippedExistingActiveRows.push({
          card_print_id: proposed.card_print_id,
          existing_active_identity_count: existingActiveCount,
        });
        continue;
      }

      const candidateRow = {
        card_print_id: proposed.card_print_id,
        identity_domain: proposed.identity_domain,
        identity_key_version: APPROVED_IDENTITY_KEY_VERSION,
        set_code_identity: proposed.set_code_identity,
        printed_number: proposed.printed_number,
        normalized_printed_name: proposed.normalized_printed_name,
        source_name_raw: proposed.source_name_raw,
        identity_payload: proposed.identity_payload ?? {},
        is_active: true,
      };

      if (
        !candidateRow.identity_domain ||
        !candidateRow.set_code_identity ||
        !candidateRow.printed_number ||
        !candidateRow.normalized_printed_name
      ) {
        incompleteHashInputRows.push({
          card_print_id: candidateRow.card_print_id,
          identity_domain: candidateRow.identity_domain ?? null,
          set_code_identity: candidateRow.set_code_identity ?? null,
          printed_number: candidateRow.printed_number ?? null,
          normalized_printed_name: candidateRow.normalized_printed_name ?? null,
        });
        continue;
      }

      candidateRows.push(candidateRow);
    }

    const hashedRows = await computeHashes(client, candidateRows);
    const cardPrintCounts = new Map();
    const hashCounts = new Map();

    for (const row of hashedRows) {
      cardPrintCounts.set(row.card_print_id, (cardPrintCounts.get(row.card_print_id) ?? 0) + 1);
      const hashKey = `${row.identity_domain}|${row.identity_key_hash ?? ''}`;
      hashCounts.set(hashKey, (hashCounts.get(hashKey) ?? 0) + 1);
    }

    const duplicateActiveCardPrintGroups = Array.from(cardPrintCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([cardPrintId, count]) => ({
        card_print_id: cardPrintId,
        row_count: count,
      }));

    const duplicateActiveDomainHashGroups = Array.from(hashCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([hashKey, count]) => ({
        hash_key: hashKey,
        row_count: count,
      }));

    const existingActiveHashCounts = await loadExistingActiveHashCounts(
      client,
      uniqueValues(hashedRows.map((row) => row.identity_key_hash).filter(Boolean)),
    );

    const existingActiveHashConflicts = hashedRows
      .filter((row) => (existingActiveHashCounts.get(row.identity_key_hash) ?? 0) > 0)
      .map((row) => ({
        card_print_id: row.card_print_id,
        identity_key_hash: row.identity_key_hash,
        existing_active_hash_count: existingActiveHashCounts.get(row.identity_key_hash) ?? 0,
      }));

    const summary = {
      generated_at: new Date().toISOString(),
      target_identity_domain: TARGET_IDENTITY_DOMAIN,
      total_audited_rows: audit.summary?.audited_rows ?? 0,
      ready_rows_from_audit: readyAuditRows.length,
      skipped_existing_active_count: skippedExistingActiveRows.length,
      incomplete_hash_input_count: incompleteHashInputRows.length,
      dry_run_rows: hashedRows.length,
      duplicate_active_card_print_group_count: duplicateActiveCardPrintGroups.length,
      duplicate_active_domain_hash_group_count: duplicateActiveDomainHashGroups.length,
      existing_active_hash_conflict_count: existingActiveHashConflicts.length,
      stop_conditions: {
        missing_hash_inputs: incompleteHashInputRows.length > 0,
        duplicate_active_card_print_groups: duplicateActiveCardPrintGroups.length > 0,
        duplicate_active_domain_hash_groups: duplicateActiveDomainHashGroups.length > 0,
        existing_active_hash_conflicts: existingActiveHashConflicts.length > 0,
      },
    };

    const output = {
      summary,
      skipped_existing_active_rows: skippedExistingActiveRows,
      incomplete_hash_input_rows: incompleteHashInputRows,
      duplicate_active_card_print_groups: duplicateActiveCardPrintGroups,
      duplicate_active_domain_hash_groups: duplicateActiveDomainHashGroups,
      existing_active_hash_conflicts: existingActiveHashConflicts,
      rows: hashedRows,
    };

    ensureOutputDir(OUTPUT_PATH);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log('Dry run rows:', hashedRows.length);
    console.log('Dry run summary:', summary);

    if (
      summary.stop_conditions.missing_hash_inputs ||
      summary.stop_conditions.duplicate_active_card_print_groups ||
      summary.stop_conditions.duplicate_active_domain_hash_groups ||
      summary.stop_conditions.existing_active_hash_conflicts
    ) {
      throw new Error(
        'IDENTITY_DRY_RUN_STOPPED:' +
          [
            summary.stop_conditions.missing_hash_inputs ? 'MISSING_HASH_INPUTS' : null,
            summary.stop_conditions.duplicate_active_card_print_groups
              ? 'DUPLICATE_ACTIVE_CARD_PRINT_GROUPS'
              : null,
            summary.stop_conditions.duplicate_active_domain_hash_groups
              ? 'DUPLICATE_ACTIVE_DOMAIN_HASH_GROUPS'
              : null,
            summary.stop_conditions.existing_active_hash_conflicts
              ? 'EXISTING_ACTIVE_HASH_CONFLICTS'
              : null,
          ]
            .filter(Boolean)
            .join(','),
      );
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
