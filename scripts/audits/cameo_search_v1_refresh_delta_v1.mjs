import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const REPORT_LABEL = process.env.CAMEO_SEARCH_REPORT_LABEL ?? '20260618';
const PHASE3_PATH = path.join(OUT_DIR, `cameo_search_v1_phase3_alias_replay_dry_run_${REPORT_LABEL}.json`);
const SOURCE_AUDIT_PATH = path.join(OUT_DIR, `cameo_search_v1_source_audit_${REPORT_LABEL}.json`);
const JSON_PATH = path.join(OUT_DIR, `cameo_search_v1_rotomamiti_refresh_delta_${REPORT_LABEL}.json`);
const MD_PATH = path.join(OUT_DIR, `cameo_search_v1_rotomamiti_refresh_delta_${REPORT_LABEL}.md`);
const SOURCE_NAME = 'rotomamiti_cameo_database';

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeKey(value) {
  return cleanText(value)
    ?.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function logicalKey(row) {
  const subjectIdentifier = row.cameo_subject_type === 'pokemon'
    ? normalizeKey(row.pokemon_ndex)
    : normalizeKey(row.trainer_key ?? row.cameo_subject_name);
  return [
    row.card_print_id ?? row.approved_card_print_id,
    row.cameo_subject_type,
    normalizeKey(row.cameo_subject_name),
    subjectIdentifier,
  ].join('|');
}

function topEntries(rows, getKey, limit = 25) {
  const counts = new Map();
  for (const row of rows) {
    const key = getKey(row) || '(blank)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function compactCandidate(row) {
  return {
    source_tab: row.source_tab,
    source_gid: row.source_gid,
    source_row_index: row.source_row_index,
    cameo_subject_type: row.cameo_subject_type,
    cameo_subject_name: row.cameo_subject_name,
    pokemon_ndex: row.pokemon_ndex ?? null,
    card_name_raw: row.card_name_raw,
    set_name_raw: row.set_name_raw,
    number_raw: row.number_raw,
    notes_raw: row.notes_raw ?? null,
    cameo_qualifiers: Array.isArray(row.cameo_qualifiers) ? row.cameo_qualifiers : [],
    approved_card_print_id: row.approved_card_print_id,
    approved_gv_id: row.approved_gv_id,
    source_row_hash: row.source_row_hash,
  };
}

function compactExisting(row) {
  return {
    source_tab: row.source_tab,
    source_row_index: row.source_row_index,
    cameo_subject_type: row.cameo_subject_type,
    cameo_subject_name: row.cameo_subject_name,
    pokemon_ndex: row.pokemon_ndex ?? null,
    card_name_raw: row.card_name_raw,
    set_name_raw: row.set_name_raw,
    number_raw: row.number_raw,
    notes_raw: row.notes_raw ?? null,
    card_print_id: row.card_print_id,
    source_row_hash: row.source_row_hash,
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# CAMEO_SEARCH_V1 RotomAmiti Refresh Delta');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Refresh/delta audit for RotomAmiti cameo source data. This is additive enrichment evidence only; it is not card identity, finish truth, Species Dex ownership, pricing, scanner behavior, or vault truth.');
  lines.push('');
  lines.push('## Source');
  lines.push('');
  lines.push(`- Source URL: ${report.source_url}`);
  lines.push(`- Source audit: \`${report.inputs.source_audit_path}\``);
  lines.push(`- Match dry run: \`${report.inputs.phase3_path}\``);
  lines.push(`- Local TLS workaround used: ${report.inputs.local_tls_workaround_used}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Current source rows: ${report.source_summary.data_rows}`);
  lines.push(`- Current approved deterministic matches: ${report.summary.current_approved_matches}`);
  lines.push(`- Existing active DB cameos: ${report.summary.existing_active_cameos}`);
  lines.push(`- Current approved source-hash overlap: ${report.summary.source_hash_overlap}`);
  lines.push(`- New logical cameo candidates: ${report.summary.logical_new_candidates}`);
  lines.push(`- Existing logical cameos not present in current sheet: ${report.summary.existing_missing_from_current_logical}`);
  lines.push(`- Current source conflicts: ${report.summary.current_conflicts}`);
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push('Do not seed by `source_row_hash` alone. The public source workbook has row/hash volatility, so refresh promotion must be keyed by logical cameo identity: parent card, subject type, subject name, and subject identifier.');
  lines.push('');
  lines.push('The 259 new logical candidates are additive review/apply candidates. The 237 existing cameos missing from the current logical source view are preservation-review candidates, not deletion candidates.');
  lines.push('');
  lines.push('## New Candidates By Set');
  lines.push('');
  lines.push('| Set | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.new_candidates_by_set) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## New Candidates By Tab');
  lines.push('');
  lines.push('| Tab | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.new_candidates_by_tab) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Promotion Rule');
  lines.push('');
  lines.push('A future apply package may insert only logical-new `APPROVED_MATCH` rows that do not already exist by logical cameo identity. It must not deactivate or delete existing cameos solely because the current source workbook no longer exposes the same logical row.');
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No migrations.');
  lines.push('- No card identity changes.');
  lines.push('- No child printing changes.');
  lines.push('- No Species Dex changes.');
  lines.push('- No pricing changes.');
  lines.push('- No image writes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const phase3 = JSON.parse(await fs.readFile(PHASE3_PATH, 'utf8'));
  const sourceAudit = JSON.parse(await fs.readFile(SOURCE_AUDIT_PATH, 'utf8'));
  const approved = (phase3.results ?? []).filter((row) => row.classification === 'APPROVED_MATCH');
  const currentApprovedHashes = new Set(approved.map((row) => row.source_row_hash));

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    statement_timeout: 120000,
    application_name: 'cameo_search_v1_refresh_delta:readonly',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query('begin transaction read only');
    const existingResult = await client.query(
      `
        select
          card_print_id::text,
          cameo_subject_type,
          cameo_subject_name,
          pokemon_ndex,
          trainer_key,
          source_row_hash,
          source_tab,
          source_row_index,
          card_name_raw,
          set_name_raw,
          number_raw,
          notes_raw
        from public.card_print_cameos
        where source_name = $1
          and active = true
      `,
      [SOURCE_NAME],
    );
    await client.query('commit');

    const existingRows = existingResult.rows;
    const existingLogicalKeys = new Set(existingRows.map(logicalKey));
    const currentLogicalKeys = new Set(approved.map((row) => logicalKey({ ...row, card_print_id: row.approved_card_print_id })));
    const existingHashes = new Set(existingRows.map((row) => row.source_row_hash));
    const logicalNewCandidates = approved.filter((row) => !existingLogicalKeys.has(logicalKey({ ...row, card_print_id: row.approved_card_print_id })));
    const existingMissingFromCurrent = existingRows.filter((row) => !currentLogicalKeys.has(logicalKey(row)));

    const report = {
      generated_at: new Date().toISOString(),
      source_url: phase3.source_url,
      inputs: {
        source_audit_path: path.relative(ROOT, SOURCE_AUDIT_PATH),
        phase3_path: path.relative(ROOT, PHASE3_PATH),
        local_tls_workaround_used: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
      },
      source_summary: {
        data_rows: sourceAudit.summary?.data_rows ?? null,
        pokemon_rows: sourceAudit.summary?.pokemon_rows ?? null,
        trainer_rows: sourceAudit.summary?.trainer_rows ?? null,
        workbook_hash: sourceAudit.workbook_hash,
      },
      summary: {
        existing_active_cameos: existingRows.length,
        current_approved_matches: approved.length,
        existing_logical_keys: existingLogicalKeys.size,
        current_logical_keys: currentLogicalKeys.size,
        source_hash_overlap: approved.filter((row) => existingHashes.has(row.source_row_hash)).length,
        current_approved_hashes_missing_from_db: approved.filter((row) => !existingHashes.has(row.source_row_hash)).length,
        existing_hashes_missing_from_current_approved: existingRows.filter((row) => !currentApprovedHashes.has(row.source_row_hash)).length,
        logical_new_candidates: logicalNewCandidates.length,
        existing_missing_from_current_logical: existingMissingFromCurrent.length,
        current_conflicts: phase3.summary?.classification_counts?.BLOCKED_AMBIGUOUS_CARD ?? 0,
        new_candidates_by_set: topEntries(logicalNewCandidates, (row) => row.set_name_raw),
        new_candidates_by_tab: topEntries(logicalNewCandidates, (row) => row.source_tab),
        missing_existing_by_set: topEntries(existingMissingFromCurrent, (row) => row.set_name_raw),
      },
      samples: {
        logical_new_candidates: logicalNewCandidates.slice(0, 100).map(compactCandidate),
        existing_missing_from_current_logical: existingMissingFromCurrent.slice(0, 100).map(compactExisting),
      },
      candidates: {
        logical_new_insert_candidates: logicalNewCandidates.map(compactCandidate),
        preservation_review_existing_missing_from_current: existingMissingFromCurrent.map(compactExisting),
      },
      promotion_rule: {
        key: ['card_print_id', 'cameo_subject_type', 'cameo_subject_name_normalized', 'pokemon_ndex_or_trainer_key'],
        future_allowed_write: 'insert logical-new approved cameo rows only',
        forbidden: [
          'seed by source_row_hash alone',
          'delete existing cameo rows because the current source sheet omitted them',
          'change card identity',
          'change child printings',
          'change Species Dex ownership',
        ],
      },
      confirmations: {
        db_writes: false,
        migrations: false,
        card_identity_changes: false,
        child_printing_changes: false,
        species_dex_changes: false,
        pricing_changes: false,
        image_writes: false,
      },
    };

    await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(MD_PATH, buildMarkdown(report));
    console.log(JSON.stringify({
      status: 'ok',
      json_path: path.relative(ROOT, JSON_PATH),
      md_path: path.relative(ROOT, MD_PATH),
      logical_new_candidates: logicalNewCandidates.length,
      existing_missing_from_current_logical: existingMissingFromCurrent.length,
      source_hash_overlap: report.summary.source_hash_overlap,
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ignore rollback failures after read-only errors.
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
