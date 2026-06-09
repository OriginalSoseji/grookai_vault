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
const REAL_APPLY_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg01a_post_apply_reconciliation_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg01a_post_apply_reconciliation_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg01a_post_apply_reconciliation_checkpoint_v1.md');

const TARGET_SET_KEY = 'fut2020';
const TARGET_CARD_PRINT_ID = 'a676888d-19e0-4064-89aa-e67019af5b95';

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
      card_number: row.card_number,
      card_name: row.card_name,
      status: row.status,
      source_count: row.source_count,
      sources: row.sources ?? [],
    }))
    .sort((left, right) => Number(left.card_number) - Number(right.card_number) || left.card_name.localeCompare(right.card_name));

  const printings = (masterExport.printings ?? [])
    .filter((row) => row.set_key === TARGET_SET_KEY)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
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

function compareRows(expected, grookaiRows) {
  const byNumberName = new Map();
  for (const row of grookaiRows) {
    const key = `${row.number_plain ?? row.number}::${String(row.name).toLowerCase()}`;
    if (!byNumberName.has(key)) byNumberName.set(key, []);
    byNumberName.get(key).push(row);
  }

  const cardComparisons = expected.cards.map((card) => {
    const key = `${card.card_number}::${String(card.card_name).toLowerCase()}`;
    const matches = byNumberName.get(key) ?? [];
    const mappedMatches = matches.filter((row) => row.set_code === TARGET_SET_KEY);
    let status = 'verified_by_index';
    if (matches.length === 0) status = 'missing_from_grookai';
    else if (mappedMatches.length === 0) status = 'missing_set_code_mapping';
    else if (mappedMatches.length > 1) status = 'duplicate_grookai_rows';
    return {
      set_key: TARGET_SET_KEY,
      card_number: card.card_number,
      card_name: card.card_name,
      expected_status: card.status,
      grookai_match_count: matches.length,
      mapped_match_count: mappedMatches.length,
      card_print_ids: mappedMatches.map((row) => row.card_print_id),
      status,
    };
  });

  const printingComparisons = expected.printings.map((printing) => {
    const key = `${printing.card_number}::${String(printing.card_name).toLowerCase()}`;
    const mappedMatches = (byNumberName.get(key) ?? []).filter((row) => row.set_code === TARGET_SET_KEY);
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

  const expectedKeys = new Set(expected.printings.map((row) => `${row.card_number}::${row.card_name.toLowerCase()}::${row.finish_key}`));
  const unsupportedRows = [];
  for (const row of grookaiRows.filter((candidate) => candidate.set_code === TARGET_SET_KEY)) {
    for (const child of row.card_printings ?? []) {
      const key = `${row.number_plain ?? row.number}::${String(row.name).toLowerCase()}::${child.finish_key}`;
      if (!expectedKeys.has(key)) {
        unsupportedRows.push({
          card_print_id: row.card_print_id,
          card_number: row.number_plain ?? row.number,
          card_name: row.name,
          finish_key: child.finish_key,
          status: 'unsupported_by_index',
        });
      }
    }
  }

  return { cardComparisons, printingComparisons, unsupportedRows };
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
}

function validateReport(report) {
  const findings = [];
  const targetRow = report.grookai_snapshot.rows.find((row) => row.card_print_id === TARGET_CARD_PRINT_ID);

  if (!report.grookai_snapshot.connected) findings.push('database_connection_unavailable');
  if (!targetRow) findings.push('pkg01a_target_row_missing');
  if (targetRow && targetRow.set_code !== TARGET_SET_KEY) findings.push('pkg01a_target_set_code_not_resolved');
  if (targetRow && targetRow.name !== 'Pikachu on the Ball') findings.push('pkg01a_target_name_drift');
  if (targetRow && (targetRow.number_plain ?? targetRow.number) !== '1') findings.push('pkg01a_target_number_drift');
  if (targetRow && (targetRow.card_printings ?? []).length !== 1) findings.push('pkg01a_child_printing_count_drift');
  if (targetRow && (targetRow.card_printings ?? [])[0]?.finish_key !== 'holo') findings.push('pkg01a_finish_drift');
  if (targetRow && targetRow.dependency_counts?.vault_items !== 0) findings.push('pkg01a_vault_reference_drift');

  if (report.summary.master_index_cards !== 5) findings.push('master_index_fut2020_card_count_not_five');
  if (report.summary.master_index_printings !== 5) findings.push('master_index_fut2020_printing_count_not_five');
  if (report.summary.pkg01a_card_status !== 'verified_by_index') findings.push('pkg01a_card_not_verified_by_index');
  if (report.summary.pkg01a_printing_status !== 'verified_by_index') findings.push('pkg01a_printing_not_verified_by_index');
  if (report.summary.pkg01a_unsupported_by_index !== 0) findings.push('pkg01a_unsupported_printings_present');
  if (report.summary.pkg01b_included !== false) findings.push('pkg01b_scope_leakage');
  if (report.summary.migrations_created !== false) findings.push('migration_created');
  if (report.summary.cleanup_performed !== false) findings.push('cleanup_performed');
  if (report.summary.quarantine_performed !== false) findings.push('quarantine_performed');

  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-01A Post-Apply Reconciliation V1');
  lines.push('');
  lines.push('This report verifies the approved one-row `PKG-01A / fut2020` DB apply after it was committed.');
  lines.push('');
  lines.push('It is read-only: no DB writes, migrations, cleanup, quarantine, or PKG-01B execution were performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| reconciliation_status | ${report.reconciliation_status} |`);
  lines.push(`| set_key | ${report.set_key} |`);
  lines.push(`| db_reads_performed | ${report.db_reads_performed} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.summary.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.summary.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.summary.quarantine_performed} |`);
  lines.push(`| pkg01b_included | ${report.summary.pkg01b_included} |`);
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
  lines.push(`| PKG-01A card status | ${report.summary.pkg01a_card_status} |`);
  lines.push(`| PKG-01A printing status | ${report.summary.pkg01a_printing_status} |`);
  lines.push(`| PKG-01A unsupported_by_index | ${report.summary.pkg01a_unsupported_by_index} |`);
  lines.push(`| Remaining fut2020 unmapped source rows | ${report.summary.remaining_unmapped_source_rows} |`);
  lines.push(`| Remaining fut2020 unmapped source child printings | ${report.summary.remaining_unmapped_source_printings} |`);
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
  lines.push('## PKG-01A Target');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| card_print_id | ${report.pkg01a_target.card_print_id} |`);
  lines.push(`| set_code | ${report.pkg01a_target.set_code} |`);
  lines.push(`| number | ${report.pkg01a_target.number} |`);
  lines.push(`| name | ${mdEscape(report.pkg01a_target.name)} |`);
  lines.push(`| finishes | ${mdEscape(report.pkg01a_target.finishes.join(', '))} |`);
  lines.push(`| vault_items | ${report.pkg01a_target.vault_items} |`);
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
  return `# PKG-01A Post-Apply Reconciliation Checkpoint V1

Date: 2026-06-09

## Purpose

Record the read-only post-apply reconciliation for the approved one-row PKG-01A / fut2020 DB change.

## Result

| Field | Value |
| --- | --- |
| reconciliation_status | ${report.reconciliation_status} |
| set_key | ${report.set_key} |
| Master Index cards | ${report.summary.master_index_cards} |
| Master Index printings | ${report.summary.master_index_printings} |
| Grookai mapped cards | ${report.summary.grookai_mapped_cards} |
| Grookai mapped printings | ${report.summary.grookai_mapped_printings} |
| PKG-01A card status | ${report.summary.pkg01a_card_status} |
| PKG-01A printing status | ${report.summary.pkg01a_printing_status} |
| PKG-01A unsupported_by_index | ${report.summary.pkg01a_unsupported_by_index} |
| Remaining fut2020 unmapped source rows | ${report.summary.remaining_unmapped_source_rows} |
| Remaining fut2020 unmapped source child printings | ${report.summary.remaining_unmapped_source_printings} |
| stop_findings | ${report.stop_findings.length} |

## PKG-01A Target

| Field | Value |
| --- | --- |
| card_print_id | ${report.pkg01a_target.card_print_id} |
| set_code | ${report.pkg01a_target.set_code} |
| number | ${report.pkg01a_target.number} |
| name | ${report.pkg01a_target.name} |
| finishes | ${report.pkg01a_target.finishes.join(', ')} |
| vault_items | ${report.pkg01a_target.vault_items} |

## Safety

- DB reads performed: true
- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- PKG-01B included: false
- Remaining fut2020 cards #2-#5 are not treated as a PKG-01A failure. They remain outside this approval scope and require a separate PKG-01B/split pilot decision.

## Source Reports

- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_post_apply_reconciliation_v1.json\`
- \`docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_post_apply_reconciliation_v1.md\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-01A Post-Apply Reconciliation Checkpoint V1](20260609_pkg01a_post_apply_reconciliation_checkpoint_v1.md) | Records read-only PKG-01A post-apply reconciliation: fut2020 #1 verified by index, cards #2-#5 remain out-of-scope PKG-01B candidates, and PKG-01B still blocked. |';
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes('20260609_pkg01a_post_apply_reconciliation_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg01a_post_apply_reconciliation_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const masterExport = readJson(MASTER_EXPORT_JSON);
  const realApply = readJson(REAL_APPLY_JSON);
  const expected = buildExpectedMasterRows(masterExport);
  const grookaiSnapshot = await queryGrookaiFut2020();
  const comparison = compareRows(expected, grookaiSnapshot.rows);
  const targetRow = grookaiSnapshot.rows.find((row) => row.card_print_id === TARGET_CARD_PRINT_ID) ?? null;
  const pkg01aCard = comparison.cardComparisons.find((row) => row.card_print_ids.includes(TARGET_CARD_PRINT_ID)) ?? null;
  const pkg01aPrinting = comparison.printingComparisons.find((row) => row.card_print_ids.includes(TARGET_CARD_PRINT_ID)) ?? null;
  const pkg01aUnsupported = comparison.unsupportedRows.filter((row) => row.card_print_id === TARGET_CARD_PRINT_ID);
  const remainingUnmappedRows = grookaiSnapshot.rows.filter((row) => row.card_print_id !== TARGET_CARD_PRINT_ID && row.set_code !== TARGET_SET_KEY);

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg01a_post_apply_reconciliation_v1',
    set_key: TARGET_SET_KEY,
    audit_only: true,
    read_only_post_apply_verification: true,
    db_reads_performed: true,
    db_writes_performed: false,
    reconciliation_status: 'pending_validation',
    source_artifacts: {
      master_admissible_export: path.relative(ROOT, MASTER_EXPORT_JSON).replaceAll('\\', '/'),
      real_apply_proof: path.relative(ROOT, REAL_APPLY_JSON).replaceAll('\\', '/'),
    },
    prior_apply_status: realApply.apply_status,
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
    pkg01a_target: {
      card_print_id: targetRow?.card_print_id ?? TARGET_CARD_PRINT_ID,
      set_code: targetRow?.set_code ?? null,
      number: targetRow?.number_plain ?? targetRow?.number ?? null,
      name: targetRow?.name ?? null,
      finishes: (targetRow?.card_printings ?? []).map((row) => row.finish_key).sort(),
      vault_items: targetRow?.dependency_counts?.vault_items ?? null,
    },
    summary: {
      master_index_cards: expected.cards.length,
      master_index_printings: expected.printings.length,
      grookai_mapped_cards: grookaiSnapshot.rows.filter((row) => row.set_code === TARGET_SET_KEY).length,
      grookai_mapped_printings: grookaiSnapshot.rows
        .filter((row) => row.set_code === TARGET_SET_KEY)
        .reduce((sum, row) => sum + (row.card_printings?.length ?? 0), 0),
      card_status_counts: statusCounts(comparison.cardComparisons),
      printing_status_counts: statusCounts(comparison.printingComparisons),
      unsupported_by_index: comparison.unsupportedRows.length,
      pkg01a_card_status: pkg01aCard?.status ?? 'missing_from_comparison',
      pkg01a_printing_status: pkg01aPrinting?.status ?? 'missing_from_comparison',
      pkg01a_unsupported_by_index: pkg01aUnsupported.length,
      remaining_unmapped_source_rows: remainingUnmappedRows.length,
      remaining_unmapped_source_printings: remainingUnmappedRows.reduce((sum, row) => sum + (row.card_printings?.length ?? 0), 0),
      pkg01b_included: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    stop_findings: [],
    pass: false,
  };

  report.stop_findings = validateReport(report);
  report.reconciliation_status = report.stop_findings.length === 0
    ? 'pkg01a_post_apply_reconciled_fut2020_verified_by_index'
    : 'pkg01a_post_apply_reconciliation_blocked_stop_findings_present';
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
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.summary.migrations_created,
    cleanup_performed: report.summary.cleanup_performed,
    quarantine_performed: report.summary.quarantine_performed,
    pkg01b_included: report.summary.pkg01b_included,
    stop_findings: report.stop_findings.length,
  }, null, 2));

  if (!report.pass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
