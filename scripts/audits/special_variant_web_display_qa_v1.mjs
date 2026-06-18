import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });
loadDotenv({ path: '.env', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const OUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'special_variant_discovery_v1',
);
const DISCOVERY_PATH = path.join(OUT_DIR, 'special_variant_discovery_v1.json');
const DISPLAY_HELPER_PATH = path.join(ROOT, 'apps', 'web', 'src', 'lib', 'cards', 'displayDiscriminator.ts');
const OUT_JSON = path.join(OUT_DIR, 'special_variant_web_display_qa_v1.json');
const OUT_MD = path.join(OUT_DIR, 'special_variant_web_display_qa_v1.md');

function getDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/pokemon/g, 'pokémon')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toUpperCase();
}

function exactCandidateKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeKey(row.proposed_variant_key),
    normalizeKey(row.proposed_identity_modifier),
  ].join('|');
}

function exactDbKey(row) {
  return [
    normalizeText(row.set_code),
    normalizeNumber(row.number),
    normalizeText(row.name),
    normalizeKey(row.variant_key),
    normalizeKey(row.printed_identity_modifier),
  ].join('|');
}

function relaxedDbKey(row) {
  return [
    normalizeText(row.set_code),
    normalizeNumber(row.number),
    normalizeText(row.name),
    normalizeKey(row.printed_identity_modifier),
  ].join('|');
}

function relaxedCandidateKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeKey(row.proposed_identity_modifier),
  ].join('|');
}

function parseRecord(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*:[^{]+\\{([\\s\\S]*?)\\n\\};`));
  if (!match) return new Map();

  const entries = new Map();
  const body = match[1] ?? '';
  const entryPattern = /(?:["']([^"']+)["']|([A-Za-z0-9_]+))\s*:\s*"([^"]+)"/g;
  for (const entry of body.matchAll(entryPattern)) {
    const key = entry[1] ?? entry[2];
    const label = entry[3];
    entries.set(normalizeKey(key), label);
  }
  return entries;
}

function markdownTable(rows, columns) {
  if (!rows.length) return 'None.';
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const sep = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => {
    const value = column.value(row);
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  }).join(' |')} |`);
  return [header, sep, ...body].join('\n');
}

function countBy(rows, getter) {
  const counts = {};
  for (const row of rows) {
    const key = getter(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function queryRows(client, expectedRows) {
  const variantKeys = [...new Set(expectedRows.map((row) => row.proposed_variant_key).filter(Boolean))];
  const modifierKeys = [...new Set(expectedRows.map((row) => row.proposed_identity_modifier).filter(Boolean))];

  const { rows } = await client.query(
    `
      select
        cp.id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        cp.number,
        cp.variant_key,
        cp.printed_identity_modifier,
        coalesce(cpi.active_identity_count, 0)::int as active_identity_count,
        coalesce(cpr.child_count, 0)::int as child_count,
        coalesce(cpr.child_finishes, array[]::text[]) as child_finishes,
        coalesce(cpr.printing_gv_ids, array[]::text[]) as printing_gv_ids
      from public.card_prints cp
      left join lateral (
        select count(*)::int as active_identity_count
        from public.card_print_identity cpi
        where cpi.card_print_id = cp.id
          and cpi.is_active = true
      ) cpi on true
      left join lateral (
        select
          count(*)::int as child_count,
          array_agg(cpr.finish_key order by cpr.finish_key) filter (where cpr.finish_key is not null) as child_finishes,
          array_agg(cpr.printing_gv_id order by cpr.printing_gv_id) filter (where cpr.printing_gv_id is not null) as printing_gv_ids
        from public.card_printings cpr
        where cpr.card_print_id = cp.id
      ) cpr on true
      where cp.variant_key = any($1::text[])
         or cp.printed_identity_modifier = any($2::text[])
      order by cp.set_code, cp.number, cp.name, cp.variant_key nulls last, cp.printed_identity_modifier nulls last
    `,
    [variantKeys, modifierKeys],
  );

  return rows;
}

async function main() {
  const [discoveryRaw, displayHelperSource] = await Promise.all([
    fs.readFile(DISCOVERY_PATH, 'utf8'),
    fs.readFile(DISPLAY_HELPER_PATH, 'utf8'),
  ]);

  const discovery = JSON.parse(discoveryRaw);
  const expectedRows = (discovery.rows ?? []).filter((row) => row.governance_status === 'source_ready');
  const variantLabels = parseRecord(displayHelperSource, 'VARIANT_LABELS');
  const modifierLabels = parseRecord(displayHelperSource, 'PRINTED_IDENTITY_MODIFIER_LABELS');

  const dbUrl = getDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only display QA.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let dbRows;
  try {
    dbRows = await queryRows(client, expectedRows);
  } finally {
    await client.end();
  }

  const dbByKey = new Map(dbRows.map((row) => [exactDbKey(row), row]));
  const dbByModifierKey = new Map(dbRows.map((row) => [relaxedDbKey(row), row]));

  const rows = expectedRows.map((candidate) => {
    const dbRow = dbByKey.get(exactCandidateKey(candidate))
      ?? dbByModifierKey.get(relaxedCandidateKey(candidate))
      ?? null;
    const liveVariantKey = dbRow ? dbRow.variant_key : candidate.proposed_variant_key;
    const liveModifier = dbRow ? dbRow.printed_identity_modifier : candidate.proposed_identity_modifier;
    const variantLabel = variantLabels.get(normalizeKey(liveVariantKey));
    const modifierLabel = modifierLabels.get(normalizeKey(liveModifier));
    const displayLabel = variantLabel ?? modifierLabel ?? null;
    const expectedFinish = candidate.proposed_finish_key;
    const childFinishes = dbRow?.child_finishes ?? [];
    const issues = [];

    if (!dbRow) issues.push('missing_live_db_row');
    if (dbRow && !dbRow.gv_id) issues.push('missing_gv_id');
    if (dbRow && dbRow.active_identity_count !== 1) issues.push('active_identity_count_not_one');
    if (dbRow && dbRow.child_count < 1) issues.push('missing_child_printing');
    if (dbRow && expectedFinish && !childFinishes.includes(expectedFinish)) issues.push('expected_finish_missing');
    if (dbRow && (dbRow.printing_gv_ids ?? []).length < 1) issues.push('missing_printing_gv_id');
    if (!displayLabel) issues.push('missing_explicit_web_label');

    return {
      candidate_key: candidate.candidate_key,
      set_key: candidate.set_key,
      card_number: candidate.card_number,
      card_name: candidate.card_name,
      variant_key: candidate.proposed_variant_key,
      printed_identity_modifier: candidate.proposed_identity_modifier,
      expected_finish_key: expectedFinish,
      db_card_print_id: dbRow?.id ?? null,
      gv_id: dbRow?.gv_id ?? null,
      route_path: dbRow?.gv_id ? `/card/${dbRow.gv_id}` : null,
      child_finishes: childFinishes,
      active_identity_count: dbRow?.active_identity_count ?? 0,
      child_count: dbRow?.child_count ?? 0,
      display_label: displayLabel,
      display_label_source: variantLabel ? 'variant_key' : modifierLabel ? 'printed_identity_modifier' : 'missing',
      status: issues.length ? 'needs_follow_up' : 'display_ready',
      issues,
    };
  });

  const issueRows = rows.filter((row) => row.issues.length);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'SPECIAL_VARIANT_WEB_DISPLAY_QA_V1',
    mode: 'read_only_display_qa',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_discovery_fingerprint: discovery.fingerprint_sha256,
    fingerprint_sha256: sha256(JSON.stringify(rows)),
    summary: {
      expected_source_ready_rows: expectedRows.length,
      live_db_rows_matched: rows.filter((row) => row.db_card_print_id).length,
      display_ready_rows: rows.filter((row) => row.status === 'display_ready').length,
      needs_follow_up_rows: issueRows.length,
      by_issue: countBy(issueRows.flatMap((row) => row.issues.map((issue) => ({ issue }))), (row) => row.issue),
      by_label_source: countBy(rows, (row) => row.display_label_source),
    },
    rows,
  };

  const markdown = [
    '# Special Variant Web Display QA V1',
    '',
    'Read-only QA for newly promoted special-variant lanes.',
    '',
    '```text',
    'db_writes_performed: false',
    'migrations_created: false',
    'cleanup_performed: false',
    'quarantine_performed: false',
    '```',
    '',
    '## Summary',
    '',
    `- Expected source-ready rows: ${report.summary.expected_source_ready_rows}`,
    `- Live DB rows matched: ${report.summary.live_db_rows_matched}`,
    `- Display-ready rows: ${report.summary.display_ready_rows}`,
    `- Needs follow-up rows: ${report.summary.needs_follow_up_rows}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Follow-Up Rows',
    '',
    markdownTable(issueRows, [
      { label: 'Candidate', value: (row) => row.candidate_key },
      { label: 'GV ID', value: (row) => row.gv_id ?? '' },
      { label: 'Issues', value: (row) => row.issues.join(', ') },
    ]),
    '',
    '## Display-Ready Sample',
    '',
    markdownTable(rows.filter((row) => row.status === 'display_ready').slice(0, 25), [
      { label: 'Candidate', value: (row) => row.candidate_key },
      { label: 'Label', value: (row) => row.display_label },
      { label: 'Route', value: (row) => row.route_path },
      { label: 'Finishes', value: (row) => row.child_finishes.join(', ') },
    ]),
    '',
  ].join('\n');

  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, markdown);

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
