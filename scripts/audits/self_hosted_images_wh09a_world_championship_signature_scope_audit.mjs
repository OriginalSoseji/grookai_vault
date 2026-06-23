import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh09a_world_championship_signature_scope_audit_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh09a_world_championship_signature_scope_audit_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-09A-WORLD-CHAMPIONSHIP-SIGNATURE-SCOPE-AUDIT';

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 50) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function renderMarkdown(summary) {
  const worldsRows = summary.worlds_rows
    .slice(0, 100)
    .map((row) => `| ${row.gv_id} | ${row.set_code} | ${row.name} | ${row.number} | ${row.variant_key ?? ''} | ${row.image_status ?? ''} |`)
    .join('\n') || '| _None_ | | | | | |';

  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- World Championship set rows in \`sets\`: ${summary.world_championship_set_rows}
- Local World/Worlds promo or stamped parent rows: ${summary.worlds_parent_rows}
- Local championship/signature/stamped parent rows: ${summary.championship_signature_parent_rows}
- Rows already exact: ${summary.exact_rows}
- Rows representative/stamped only: ${summary.representative_rows}
- Missing likely World Championship Deck lane: ${summary.missing_world_championship_deck_lane}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## Existing World/Worlds Rows

| gv_id | set | name | number | variant | image status |
| --- | --- | --- | --- | --- | --- |
${worldsRows}

## Image Statuses

${markdownTable(topEntries(summary.image_statuses))}

## Sets

${markdownTable(topEntries(summary.set_codes))}

## Next Read-Only Work

Build a source-backed World Championship Deck master-index acquisition pass. This should model deck-year/player lanes separately from normal expansion cards because these cards are non-tournament-legal replica prints with different backs, silver borders, and player signatures.
`;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let worldSets;
  let championshipRows;
  let worldsRows;
  try {
    const worldSetsResult = await client.query(`
      select code, name, printed_total, set_role, identity_model
      from public.sets
      where lower(coalesce(name,'') || ' ' || coalesce(code,'')) ~ '(world championship|worlds)'
      order by release_date nulls last, code
    `);
    const championshipRowsResult = await client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source,
        cp.image_path,
        cp.image_status,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.code = cp.set_code
      where lower(coalesce(s.name,'') || ' ' || coalesce(cp.set_code,'') || ' ' || coalesce(cp.variant_key,'') || ' ' || coalesce(cp.printed_identity_modifier,'')) ~
        '(world championship|worlds|championship|signature|signed)'
      order by cp.set_code, cp.number_plain nulls last, cp.variant_key
    `);
    const worldsRowsResult = await client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source,
        cp.image_path,
        cp.image_status,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.code = cp.set_code
      where lower(coalesce(s.name,'') || ' ' || coalesce(cp.set_code,'') || ' ' || coalesce(cp.variant_key,'') || ' ' || coalesce(cp.printed_identity_modifier,'')) ~
        '(world championship|worlds)'
      order by cp.set_code, cp.number_plain nulls last, cp.variant_key
    `);
    worldSets = worldSetsResult.rows;
    championshipRows = championshipRowsResult.rows;
    worldsRows = worldsRowsResult.rows;
  } finally {
    await client.end();
  }

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_scope_audit_no_write',
    world_championship_set_rows: worldSets.length,
    world_championship_sets: worldSets,
    worlds_parent_rows: worldsRows.length,
    championship_signature_parent_rows: championshipRows.length,
    exact_rows: championshipRows.filter((row) => row.image_status === 'exact').length,
    representative_rows: championshipRows.filter((row) => String(row.image_status ?? '').startsWith('representative_')).length,
    missing_world_championship_deck_lane: worldSets.length === 0,
    image_statuses: countBy(championshipRows, (row) => row.image_status ?? 'null'),
    set_codes: countBy(championshipRows, (row) => row.set_code),
    worlds_rows: worldsRows,
    championship_signature_samples: championshipRows.slice(0, 100),
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    world_championship_set_rows: summary.world_championship_set_rows,
    worlds_parent_rows: summary.worlds_parent_rows,
    championship_signature_parent_rows: summary.championship_signature_parent_rows,
    exact_rows: summary.exact_rows,
    representative_rows: summary.representative_rows,
    missing_world_championship_deck_lane: summary.missing_world_championship_deck_lane,
    image_statuses: summary.image_statuses,
    set_codes: summary.set_codes,
    worlds_rows: worldsRows.map((row) => ({
      gv_id: row.gv_id,
      set_code: row.set_code,
      variant_key: row.variant_key,
      image_status: row.image_status,
    })),
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    fingerprint: summary.fingerprint,
    world_championship_set_rows: summary.world_championship_set_rows,
    worlds_parent_rows: summary.worlds_parent_rows,
    championship_signature_parent_rows: summary.championship_signature_parent_rows,
    missing_world_championship_deck_lane: summary.missing_world_championship_deck_lane,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
