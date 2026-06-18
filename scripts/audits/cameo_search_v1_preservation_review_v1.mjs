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

const REPORT_LABEL = process.env.CAMEO_SEARCH_REPORT_LABEL ?? '20260618';
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const DELTA_PATH = path.join(OUT_DIR, `cameo_search_v1_rotomamiti_refresh_delta_${REPORT_LABEL}.json`);
const JSON_PATH = path.join(OUT_DIR, `cameo_search_v1_preservation_review_${REPORT_LABEL}.json`);
const MD_PATH = path.join(OUT_DIR, `cameo_search_v1_preservation_review_${REPORT_LABEL}.md`);
const SOURCE_NAME = 'rotomamiti_cameo_database';

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalize(value) {
  return cleanText(value)
    ?.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function classifyPreservation(row) {
  const notes = normalize(row.notes_raw);
  const setName = normalize(row.set_name_raw);
  const rowIndex = Number(row.source_row_index ?? 0);
  const reasons = [];

  if (notes.includes('japanese') || notes.includes('korean') || notes.includes('chinese') || notes.includes('not released in english')) {
    reasons.push('language_scope_note');
  }
  if (notes.includes('jumbo')) {
    reasons.push('jumbo_note');
  }
  if (notes.includes('partial') || notes.includes('silhouette') || notes.includes('picture') || notes.includes('photo')) {
    reasons.push('edge_visibility_note');
  }
  if (setName.includes('promos') || setName.includes('promo')) {
    reasons.push('promo_family_row');
  }
  if (rowIndex > 0) {
    reasons.push('historical_source_row_retained');
  }

  return {
    action: 'preserve_pending_manual_review',
    reason_codes: reasons.length > 0 ? reasons : ['source_snapshot_drift'],
    deletion_safe: false,
    notes: 'Existing cameo row is absent from the current logical source view. Preserve it until a human confirms source removal or replacement.',
  };
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

function buildMarkdown(report) {
  const lines = [];
  lines.push('# CAMEO_SEARCH_V1 Preservation Review');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Review of active cameo rows that are present in Grookai but absent from the current RotomAmiti logical source snapshot.');
  lines.push('');
  lines.push('This is a no-write preservation report. It does not delete or deactivate cameo rows.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Preservation-review rows: ${report.summary.preservation_review_rows}`);
  lines.push(`- Deletion-safe rows: ${report.summary.deletion_safe_rows}`);
  lines.push(`- Recommended action: ${report.summary.recommended_action}`);
  lines.push('');
  lines.push('## Why Preserve');
  lines.push('');
  lines.push('The RotomAmiti spreadsheet is a living public source. Row positions and row-derived hashes are volatile, and source rows may move or be reworded. Existing cameo rows should not be deleted just because a fresh snapshot no longer exposes the same logical row.');
  lines.push('');
  lines.push('## Rows By Set');
  lines.push('');
  lines.push('| Set | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.rows_by_set) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Rows By Subject Type');
  lines.push('');
  lines.push('| Subject type | Rows |');
  lines.push('| --- | ---: |');
  for (const row of report.summary.rows_by_subject_type) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No deactivations.');
  lines.push('- No deletes.');
  lines.push('- No migrations.');
  lines.push('- No card identity changes.');
  lines.push('- No Species Dex changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const delta = JSON.parse(await fs.readFile(DELTA_PATH, 'utf8'));
  const reviewRows = delta.candidates?.preservation_review_existing_missing_from_current ?? [];

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    statement_timeout: 120000,
    application_name: 'cameo_search_v1_preservation_review:readonly',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query('begin transaction read only');
    const activeCount = await client.query(
      `
        select count(*)::int as active_count
        from public.card_print_cameos
        where source_name = $1
          and active = true
      `,
      [SOURCE_NAME],
    );
    await client.query('commit');

    const rows = reviewRows.map((row) => ({
      ...row,
      review: classifyPreservation(row),
    }));
    const report = {
      generated_at: new Date().toISOString(),
      source_delta_path: path.relative(ROOT, DELTA_PATH),
      db_read_mode: 'transaction read only',
      active_source_rows_now: activeCount.rows[0]?.active_count ?? null,
      summary: {
        preservation_review_rows: rows.length,
        deletion_safe_rows: rows.filter((row) => row.review.deletion_safe).length,
        recommended_action: 'preserve_all_until_manual_adjudication',
        rows_by_set: topEntries(rows, (row) => row.set_name_raw),
        rows_by_subject_type: topEntries(rows, (row) => row.cameo_subject_type),
        rows_by_reason: topEntries(rows.flatMap((row) => row.review.reason_codes.map((reason) => ({ reason }))), (row) => row.reason),
      },
      rows,
      confirmations: {
        db_writes: false,
        deactivations: false,
        deletes: false,
        migrations: false,
        card_identity_changes: false,
        species_dex_changes: false,
      },
    };

    await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(MD_PATH, buildMarkdown(report));
    console.log(JSON.stringify({
      status: 'ok',
      json_path: path.relative(ROOT, JSON_PATH),
      md_path: path.relative(ROOT, MD_PATH),
      preservation_review_rows: rows.length,
      deletion_safe_rows: report.summary.deletion_safe_rows,
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback failures
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
