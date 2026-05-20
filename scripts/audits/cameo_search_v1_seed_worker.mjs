import crypto from 'node:crypto';
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

const PHASE3_EVIDENCE_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'cameo_search_v1',
  'cameo_search_v1_phase3_alias_replay_dry_run_20260520.json',
);
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const JSON_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase5_seed_dry_run_20260520.json');
const MD_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase5_seed_dry_run_20260520.md');

const SOURCE_NAME = 'rotomamiti_cameo_database';
const SOURCE_URL = 'https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview';
const EXPECTED_APPROVED_COUNT = 1360;

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
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_') ?? null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function requireDryRun() {
  if (process.argv.includes('--apply')) {
    throw new Error('CAMEO_SEARCH_V1 Phase 5 is dry-run only. Apply mode is intentionally disabled.');
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildSeedRow(result) {
  const subjectType = result.cameo_subject_type;
  const subjectName = cleanText(result.cameo_subject_name);
  const sourceRowHash = cleanText(result.source_row_hash);
  const cardPrintId = cleanText(result.approved_card_print_id);

  if (result.classification !== 'APPROVED_MATCH') {
    throw new Error(`Non-approved row reached seed payload: ${result.source_tab}:${result.source_row_index}`);
  }
  if (!cardPrintId || !sourceRowHash || !subjectName) {
    throw new Error(`Approved row missing required seed field: ${result.source_tab}:${result.source_row_index}`);
  }

  return {
    card_print_id: cardPrintId,
    cameo_subject_type: subjectType,
    cameo_subject_name: subjectName,
    pokemon_ndex: subjectType === 'pokemon' ? cleanText(result.pokemon_ndex) : null,
    pokemon_species_id: null,
    trainer_key: subjectType === 'trainer' ? normalizeKey(subjectName) : null,
    source_name: SOURCE_NAME,
    source_url: SOURCE_URL,
    source_tab: cleanText(result.source_tab),
    source_gid: cleanText(result.source_gid),
    source_row_index: Number(result.source_row_index),
    source_row_hash: sourceRowHash,
    card_name_raw: cleanText(result.card_name_raw),
    set_name_raw: cleanText(result.set_name_raw),
    number_raw: cleanText(result.number_raw),
    notes_raw: cleanText(result.notes_raw),
    cameo_qualifiers: asArray(result.cameo_qualifiers),
    match_status: 'APPROVED_MATCH',
    match_confidence: 'deterministic',
    active: true,
    approved_gv_id: cleanText(result.approved_gv_id),
  };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# CAMEO_SEARCH_V1 Phase 5 Seed Dry Run');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Dry-run seed/apply worker proof for the future `card_print_cameos` table. No rows were inserted.');
  lines.push('');
  lines.push('## Inputs');
  lines.push('');
  lines.push(`- Phase 3 evidence: \`${report.inputs.phase3_evidence_path}\``);
  lines.push(`- Phase 3 evidence hash: \`${report.inputs.phase3_evidence_hash}\``);
  lines.push(`- Approved candidates loaded: ${report.summary.approved_candidates}`);
  lines.push('');
  lines.push('## Database Precheck');
  lines.push('');
  lines.push(`- ` + `card_print_cameos` + ` exists: ${report.db_precheck.card_print_cameos_exists}`);
  lines.push(`- Target card_print rows found: ${report.db_precheck.target_card_prints_found}`);
  lines.push(`- Target rows missing parent GV-ID: ${report.db_precheck.target_missing_gv_id}`);
  lines.push(`- Existing source hash collisions: ${report.db_precheck.existing_source_hash_collisions}`);
  lines.push('');
  lines.push('## Seed Payload');
  lines.push('');
  lines.push(`- Candidate payload rows: ${report.summary.seed_payload_rows}`);
  lines.push(`- Duplicate source hashes in payload: ${report.summary.duplicate_source_hashes}`);
  lines.push(`- Excluded non-approved Phase 3 rows: ${report.summary.excluded_non_approved_rows}`);
  lines.push(`- Japanese/language-scope blocked rows in payload: ${report.summary.language_scope_blocked_rows}`);
  lines.push('');
  lines.push('## Future Write Boundary');
  lines.push('');
  lines.push('Future apply may insert only into `public.card_print_cameos` after the migration is applied and a fresh dry run passes.');
  lines.push('');
  lines.push('Disallowed writes remain:');
  lines.push('');
  for (const table of report.write_boundary.disallowed_tables) {
    lines.push(`- ${table}`);
  }
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(report.ready_for_future_apply
    ? 'Seed payload is structurally ready for a later apply gate after the migration is applied and evidence is refreshed.'
    : 'Seed payload is not ready for future apply. Resolve failed guards first.');
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No migrations applied.');
  lines.push('- No search resolver changes.');
  lines.push('- No app changes.');
  lines.push('- No Species Dex changes.');
  lines.push('- No scanner changes.');
  lines.push('- No pricing changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  requireDryRun();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const phase3Raw = await fs.readFile(PHASE3_EVIDENCE_PATH, 'utf8');
  const phase3 = JSON.parse(phase3Raw);
  const results = asArray(phase3.results);
  const approved = results.filter((row) => row.classification === 'APPROVED_MATCH');
  const seedRows = approved.map(buildSeedRow);

  const sourceHashDuplicates = duplicateValues(seedRows.map((row) => row.source_row_hash));
  const cardPrintIds = [...new Set(seedRows.map((row) => row.card_print_id))];
  const sourceHashes = seedRows.map((row) => row.source_row_hash);

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');
  const client = new pg.Client({
    connectionString,
    statement_timeout: 120000,
    application_name: 'cameo_search_v1_seed_worker:dry_run_readonly',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  let targetCards = [];
  let tableExists = false;
  let existingSourceHashCollisions = [];
  try {
    await client.query('begin transaction read only');
    const tableCheck = await client.query(`select to_regclass('public.card_print_cameos') as table_regclass`);
    tableExists = Boolean(tableCheck.rows[0]?.table_regclass);
    const cardCheck = await client.query(
      `
        select id::text, gv_id
        from public.card_prints
        where id = any($1::uuid[])
      `,
      [cardPrintIds],
    );
    targetCards = cardCheck.rows;
    if (tableExists) {
      const existing = await client.query(
        `
          select source_row_hash
          from public.card_print_cameos
          where source_row_hash = any($1::text[])
        `,
        [sourceHashes],
      );
      existingSourceHashCollisions = existing.rows.map((row) => row.source_row_hash);
    }
    await client.query('commit');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback failures after read-only query errors
    }
    throw error;
  } finally {
    await client.end();
  }

  const targetById = new Map(targetCards.map((row) => [row.id, row]));
  const missingTargetIds = cardPrintIds.filter((id) => !targetById.has(id));
  const missingGvId = targetCards.filter((row) => !cleanText(row.gv_id));
  const languageScopeBlockedRows = seedRows.filter((row) => {
    const setName = cleanText(row.set_name_raw)?.toLowerCase() ?? '';
    return /(^|[-\s])(sm-p|xy-p|sv-p|s-p|bw-p|dpt-p|pcg-p)(\s|$)/i.test(setName);
  });

  const nonApprovedRows = results.length - approved.length;
  const guards = {
    expected_approved_count: approved.length === EXPECTED_APPROVED_COUNT,
    no_duplicate_source_hashes: sourceHashDuplicates.length === 0,
    target_cards_exist: missingTargetIds.length === 0,
    target_cards_have_gv_id: missingGvId.length === 0,
    no_existing_source_hash_collisions: existingSourceHashCollisions.length === 0,
    no_language_scope_blocked_rows: languageScopeBlockedRows.length === 0,
  };

  const report = {
    generated_at: new Date().toISOString(),
    mode: 'DRY_RUN_ONLY',
    inputs: {
      phase3_evidence_path: path.relative(ROOT, PHASE3_EVIDENCE_PATH),
      phase3_evidence_hash: sha256(phase3Raw),
    },
    summary: {
      phase3_results: results.length,
      approved_candidates: approved.length,
      expected_approved_candidates: EXPECTED_APPROVED_COUNT,
      seed_payload_rows: seedRows.length,
      excluded_non_approved_rows: nonApprovedRows,
      duplicate_source_hashes: sourceHashDuplicates.length,
      language_scope_blocked_rows: languageScopeBlockedRows.length,
    },
    db_precheck: {
      read_mode: 'transaction read only',
      card_print_cameos_exists: tableExists,
      distinct_target_card_print_ids: cardPrintIds.length,
      target_card_prints_found: targetCards.length,
      target_card_prints_missing: missingTargetIds.length,
      target_missing_gv_id: missingGvId.length,
      existing_source_hash_collisions: existingSourceHashCollisions.length,
    },
    guards,
    ready_for_future_apply: Object.values(guards).every(Boolean),
    write_boundary: {
      future_allowed_operation: 'insert into public.card_print_cameos only',
      disallowed_tables: [
        'public.card_prints',
        'public.card_printings',
        'public.pokemon_species',
        'public.card_print_species',
        'pricing tables',
        'scanner tables',
        'warehouse tables',
      ],
    },
    samples: {
      seed_rows: seedRows.slice(0, 25),
      duplicate_source_hashes: sourceHashDuplicates.slice(0, 25),
      missing_target_ids: missingTargetIds.slice(0, 25),
      missing_gv_id: missingGvId.slice(0, 25),
      existing_source_hash_collisions: existingSourceHashCollisions.slice(0, 25),
      language_scope_blocked_rows: languageScopeBlockedRows.slice(0, 25),
    },
    seed_payload: seedRows,
    confirmations: {
      db_writes: false,
      migrations_applied: false,
      search_resolver_changes: false,
      app_changes: false,
    },
  };

  await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(MD_PATH, buildMarkdown(report));

  console.log(JSON.stringify({
    status: report.ready_for_future_apply ? 'dry_run_pass' : 'dry_run_blocked',
    json_path: path.relative(ROOT, JSON_PATH),
    md_path: path.relative(ROOT, MD_PATH),
    approved_candidates: approved.length,
    ready_for_future_apply: report.ready_for_future_apply,
    guards,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
