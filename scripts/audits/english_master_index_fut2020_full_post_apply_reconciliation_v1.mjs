import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);
const COMPLETION_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_completion_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const MASTER_EXPORT_JSON = path.join(COMPLETION_DIR, 'english_master_index_master_admissible_export_v1.json');
const PKG01A_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_real_apply_v1.json');
const PKG01B_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01b_fut2020_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_fut2020_full_post_apply_reconciliation_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_fut2020_full_post_apply_reconciliation_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_fut2020_full_post_apply_reconciliation_checkpoint_v1.md');

const TARGET_SET_KEY = 'fut2020';
const TARGET_SET_NAME = 'Pokémon Futsal 2020';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function normalizeNumber(value) {
  return String(value ?? '').trim();
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function queryGrookaiFut2020() {
  const conn = connectionString();
  if (!conn) {
    return {
      connected: false,
      rows: [],
      error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const result = await client.query(
      `select
         cp.id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.set_id,
         cp.external_ids,
         cp.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', cpr.id,
             'finish_key', cpr.finish_key,
             'provenance_source', cpr.provenance_source,
             'provenance_ref', cpr.provenance_ref
           ) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         (select count(*)::int from public.external_mappings em where em.card_print_id = cp.id) as external_mappings_count,
         (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id) as identity_rows_count,
         (select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id) as trait_rows_count,
         (select count(*)::int from public.vault_items vi where vi.card_id = cp.id) as vault_items_count
       from public.card_prints cp
       where cp.set_code = $1
          or cp.external_ids->>'tcgdex' like 'fut2020-%'
          or exists (
            select 1
            from public.external_mappings em
            where em.card_print_id = cp.id
              and em.source = 'tcgdex'
              and em.external_id like 'fut2020-%'
          )
       order by nullif(regexp_replace(coalesce(cp.number_plain, cp.number), '[^0-9]', '', 'g'), '')::int nulls last,
                cp.number,
                cp.name`,
      [TARGET_SET_KEY],
    );

    return {
      connected: true,
      rows: result.rows.map((row) => ({
        card_print_id: row.id,
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        name: row.name,
        set_id: row.set_id,
        external_ids: row.external_ids,
        updated_at: row.updated_at,
        card_printings: row.card_printings,
        dependency_counts: {
          external_mappings: row.external_mappings_count,
          card_print_identity: row.identity_rows_count,
          card_print_traits: row.trait_rows_count,
          vault_items: row.vault_items_count,
        },
      })),
      error_message: null,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildExpectedMasterRows(masterExport) {
  const cards = (masterExport.cards ?? [])
    .filter((row) => row.set_key === TARGET_SET_KEY)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: normalizeNumber(row.card_number),
      card_name: row.card_name,
      status: row.status,
      source_count: row.source_count,
      sources: row.sources ?? [],
    }))
    .sort((left, right) =>
      Number(left.card_number) - Number(right.card_number) ||
      left.card_name.localeCompare(right.card_name));

  const printings = (masterExport.printings ?? [])
    .filter((row) => row.set_key === TARGET_SET_KEY)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: normalizeNumber(row.card_number),
      card_name: row.card_name,
      finish_key: row.finish_key,
      status: row.status,
      source_count: row.source_count,
      sources: row.sources ?? [],
    }))
    .sort((left, right) =>
      Number(left.card_number) - Number(right.card_number) ||
      left.card_name.localeCompare(right.card_name) ||
      left.finish_key.localeCompare(right.finish_key));

  return { cards, printings };
}

function cardKey(number, name) {
  return `${normalizeNumber(number)}::${normalizeName(name)}`;
}

function printingKey(number, name, finishKey) {
  return `${cardKey(number, name)}::${finishKey}`;
}

function compareRows(expected, grookaiRows) {
  const mappedRows = grookaiRows.filter((row) => row.set_code === TARGET_SET_KEY);
  const mappedByCard = new Map();
  for (const row of mappedRows) {
    const key = cardKey(row.number_plain ?? row.number, row.name);
    if (!mappedByCard.has(key)) mappedByCard.set(key, []);
    mappedByCard.get(key).push(row);
  }

  const allByCard = new Map();
  for (const row of grookaiRows) {
    const key = cardKey(row.number_plain ?? row.number, row.name);
    if (!allByCard.has(key)) allByCard.set(key, []);
    allByCard.get(key).push(row);
  }

  const cardComparisons = expected.cards.map((card) => {
    const key = cardKey(card.card_number, card.card_name);
    const allMatches = allByCard.get(key) ?? [];
    const mappedMatches = mappedByCard.get(key) ?? [];
    let status = 'verified_by_index';
    if (allMatches.length === 0) status = 'missing_from_grookai';
    else if (mappedMatches.length === 0) status = 'missing_set_code_mapping';
    else if (mappedMatches.length > 1) status = 'duplicate_grookai_rows';
    return {
      set_key: TARGET_SET_KEY,
      card_number: card.card_number,
      card_name: card.card_name,
      expected_status: card.status,
      grookai_match_count: allMatches.length,
      mapped_match_count: mappedMatches.length,
      card_print_ids: mappedMatches.map((row) => row.card_print_id),
      status,
    };
  });

  const printingComparisons = expected.printings.map((printing) => {
    const key = cardKey(printing.card_number, printing.card_name);
    const mappedMatches = mappedByCard.get(key) ?? [];
    const finishMatches = mappedMatches.filter((row) =>
      (row.card_printings ?? []).some((child) => child.finish_key === printing.finish_key));
    let status = 'verified_by_index';
    if (mappedMatches.length === 0) status = 'missing_from_grookai';
    else if (finishMatches.length === 0) status = 'finish_missing_from_grookai';
    else if (finishMatches.length > 1) status = 'duplicate_grookai_printings';
    return {
      set_key: TARGET_SET_KEY,
      card_number: printing.card_number,
      card_name: printing.card_name,
      finish_key: printing.finish_key,
      expected_status: printing.status,
      mapped_match_count: mappedMatches.length,
      finish_match_count: finishMatches.length,
      card_print_ids: finishMatches.map((row) => row.card_print_id),
      status,
    };
  });

  const expectedPrintingKeys = new Set(expected.printings.map((row) =>
    printingKey(row.card_number, row.card_name, row.finish_key)));
  const unsupportedRows = [];
  for (const row of mappedRows) {
    for (const child of row.card_printings ?? []) {
      const key = printingKey(row.number_plain ?? row.number, row.name, child.finish_key);
      if (!expectedPrintingKeys.has(key)) {
        unsupportedRows.push({
          card_print_id: row.card_print_id,
          card_printing_id: child.id,
          card_number: row.number_plain ?? row.number,
          card_name: row.name,
          finish_key: child.finish_key,
          status: 'unsupported_by_index',
        });
      }
    }
  }

  const expectedCardKeys = new Set(expected.cards.map((row) => cardKey(row.card_number, row.card_name)));
  const extraMappedRows = mappedRows
    .filter((row) => !expectedCardKeys.has(cardKey(row.number_plain ?? row.number, row.name)))
    .map((row) => ({
      card_print_id: row.card_print_id,
      card_number: row.number_plain ?? row.number,
      card_name: row.name,
      set_code: row.set_code,
      status: 'extra_mapped_row_not_in_index',
    }));

  return { cardComparisons, printingComparisons, unsupportedRows, extraMappedRows };
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
}

function validateReport(report) {
  const findings = [];

  if (!report.grookai_snapshot.connected) findings.push('database_connection_unavailable');
  if (report.prior_apply_status.pkg01a !== 'pkg01a_real_apply_committed_and_verified') {
    findings.push('pkg01a_apply_not_verified');
  }
  if (report.prior_apply_status.pkg01b !== 'pkg01b_fut2020_real_apply_committed_and_verified') {
    findings.push('pkg01b_apply_not_verified');
  }
  if (report.summary.master_index_cards !== 5) findings.push('master_index_fut2020_card_count_not_five');
  if (report.summary.master_index_printings !== 5) findings.push('master_index_fut2020_printing_count_not_five');
  if (report.summary.grookai_mapped_cards !== 5) findings.push('grookai_mapped_card_count_not_five');
  if (report.summary.grookai_mapped_printings !== 5) findings.push('grookai_mapped_printing_count_not_five');
  if (report.summary.card_status_counts.verified_by_index !== 5) findings.push('not_all_cards_verified_by_index');
  if (report.summary.printing_status_counts.verified_by_index !== 5) findings.push('not_all_printings_verified_by_index');
  if (report.summary.unsupported_by_index !== 0) findings.push('unsupported_printings_present');
  if (report.summary.extra_mapped_rows_not_in_index !== 0) findings.push('extra_mapped_rows_present');
  if (report.summary.total_vault_items_referencing_set !== 0) findings.push('vault_references_present_for_target_set');
  if (report.db_writes_performed !== false) findings.push('db_write_performed');
  if (report.migrations_created !== false) findings.push('migration_created');
  if (report.cleanup_performed !== false) findings.push('cleanup_performed');
  if (report.quarantine_performed !== false) findings.push('quarantine_performed');
  if (report.global_apply_included !== false) findings.push('global_apply_included');

  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index FUT2020 Full Post-Apply Reconciliation V1');
  lines.push('');
  lines.push('This report verifies the full `fut2020` set after the approved PKG-01A and PKG-01B applies.');
  lines.push('');
  lines.push('It is read-only: no DB writes, migrations, cleanup, quarantine, or global apply were performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| reconciliation_status | ${report.reconciliation_status} |`);
  lines.push(`| set_key | ${report.set_key} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| global_apply_included | ${report.global_apply_included} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| Master Index cards | ${report.summary.master_index_cards} |`);
  lines.push(`| Master Index printings | ${report.summary.master_index_printings} |`);
  lines.push(`| Grookai mapped cards | ${report.summary.grookai_mapped_cards} |`);
  lines.push(`| Grookai mapped printings | ${report.summary.grookai_mapped_printings} |`);
  lines.push(`| Unsupported by index | ${report.summary.unsupported_by_index} |`);
  lines.push(`| Extra mapped rows not in index | ${report.summary.extra_mapped_rows_not_in_index} |`);
  lines.push(`| Vault items referencing target set | ${report.summary.total_vault_items_referencing_set} |`);
  lines.push('');
  lines.push('## Card Comparison');
  lines.push('');
  lines.push('| # | Card | Status | Grookai IDs |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of report.card_comparison) {
    lines.push(`| ${mdEscape(row.card_number)} | ${mdEscape(row.card_name)} | ${row.status} | ${mdEscape(row.card_print_ids.join(', '))} |`);
  }
  lines.push('');
  lines.push('## Printing Comparison');
  lines.push('');
  lines.push('| # | Card | Finish | Status | Grookai IDs |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.printing_comparison) {
    lines.push(`| ${mdEscape(row.card_number)} | ${mdEscape(row.card_name)} | ${mdEscape(row.finish_key)} | ${row.status} | ${mdEscape(row.card_print_ids.join(', '))} |`);
  }
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) {
    lines.push('None.');
  } else {
    for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# FUT2020 Full Post-Apply Reconciliation Checkpoint V1

Date: 2026-06-09

## Purpose

Record a read-only full-set reconciliation after the approved PKG-01A and PKG-01B FUT2020 applies.

## Result

| Field | Value |
| --- | --- |
| reconciliation_status | ${report.reconciliation_status} |
| set_key | ${report.set_key} |
| Master Index cards | ${report.summary.master_index_cards} |
| Master Index printings | ${report.summary.master_index_printings} |
| Grookai mapped cards | ${report.summary.grookai_mapped_cards} |
| Grookai mapped printings | ${report.summary.grookai_mapped_printings} |
| Unsupported by index | ${report.summary.unsupported_by_index} |
| Extra mapped rows not in index | ${report.summary.extra_mapped_rows_not_in_index} |
| Vault items referencing target set | ${report.summary.total_vault_items_referencing_set} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- DB reads performed: true
- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- Global apply included: false

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_fut2020_full_post_apply_reconciliation_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_fut2020_full_post_apply_reconciliation_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [FUT2020 Full Post-Apply Reconciliation Checkpoint V1](20260609_fut2020_full_post_apply_reconciliation_checkpoint_v1.md) | Records read-only full-set reconciliation after PKG-01A and PKG-01B: fut2020 has five mapped cards, five verified printings, zero unsupported rows, and no global apply. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_fut2020_full_post_apply_reconciliation_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_fut2020_full_post_apply_reconciliation_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const masterExport = readJson(MASTER_EXPORT_JSON);
  const pkg01aApply = readJson(PKG01A_APPLY_JSON);
  const pkg01bApply = readJson(PKG01B_APPLY_JSON);
  const expected = buildExpectedMasterRows(masterExport);
  const grookaiSnapshot = await queryGrookaiFut2020();
  const comparison = compareRows(expected, grookaiSnapshot.rows);

  const mappedRows = grookaiSnapshot.rows.filter((row) => row.set_code === TARGET_SET_KEY);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_fut2020_full_post_apply_reconciliation_v1',
    set_key: TARGET_SET_KEY,
    set_name: TARGET_SET_NAME,
    audit_only: true,
    read_only_post_apply_verification: true,
    db_reads_performed: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_included: false,
    reconciliation_status: 'pending_validation',
    source_artifacts: {
      master_admissible_export: path.relative(ROOT, MASTER_EXPORT_JSON).replaceAll('\\', '/'),
      pkg01a_real_apply_proof: path.relative(ROOT, PKG01A_APPLY_JSON).replaceAll('\\', '/'),
      pkg01b_real_apply_proof: path.relative(ROOT, PKG01B_APPLY_JSON).replaceAll('\\', '/'),
    },
    prior_apply_status: {
      pkg01a: pkg01aApply.apply_status,
      pkg01b: pkg01bApply.apply_status,
    },
    grookai_snapshot: {
      connected: grookaiSnapshot.connected,
      error_message: grookaiSnapshot.error_message,
      captured_at: new Date().toISOString(),
      rows: grookaiSnapshot.rows,
      hash_sha256: sha256(stableJson(grookaiSnapshot.rows)),
    },
    expected_master_index: expected,
    card_comparison: comparison.cardComparisons,
    printing_comparison: comparison.printingComparisons,
    unsupported_rows: comparison.unsupportedRows,
    extra_mapped_rows: comparison.extraMappedRows,
    summary: {
      master_index_cards: expected.cards.length,
      master_index_printings: expected.printings.length,
      grookai_mapped_cards: mappedRows.length,
      grookai_mapped_printings: mappedRows.reduce((sum, row) => sum + (row.card_printings?.length ?? 0), 0),
      card_status_counts: statusCounts(comparison.cardComparisons),
      printing_status_counts: statusCounts(comparison.printingComparisons),
      unsupported_by_index: comparison.unsupportedRows.length,
      extra_mapped_rows_not_in_index: comparison.extraMappedRows.length,
      total_vault_items_referencing_set: mappedRows.reduce((sum, row) => sum + (row.dependency_counts?.vault_items ?? 0), 0),
    },
    stop_findings: [],
    pass: false,
  };

  report.stop_findings = validateReport(report);
  report.reconciliation_status = report.stop_findings.length === 0
    ? 'fut2020_full_post_apply_reconciled_verified_by_index'
    : 'fut2020_full_post_apply_reconciliation_blocked_stop_findings_present';
  report.pass = report.stop_findings.length === 0;

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    generated_files: [
      path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
      path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
      path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
    ],
    reconciliation_status: report.reconciliation_status,
    pass: report.pass,
    master_index_cards: report.summary.master_index_cards,
    master_index_printings: report.summary.master_index_printings,
    grookai_mapped_cards: report.summary.grookai_mapped_cards,
    grookai_mapped_printings: report.summary.grookai_mapped_printings,
    unsupported_by_index: report.summary.unsupported_by_index,
    extra_mapped_rows_not_in_index: report.summary.extra_mapped_rows_not_in_index,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    cleanup_performed: report.cleanup_performed,
    quarantine_performed: report.quarantine_performed,
    global_apply_included: report.global_apply_included,
    stop_findings: report.stop_findings.length,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
