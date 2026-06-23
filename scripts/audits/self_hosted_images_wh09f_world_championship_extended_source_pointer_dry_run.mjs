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
const SOURCE_CARDS_JSONL = path.join(
  ROOT,
  'docs',
  'audits',
  'master_index_world_championship_decks_v1',
  'world_championship_decks_09c_proposed_card_prints_v1.jsonl',
);
const SUMMARY_JSON = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09f_world_championship_extended_source_pointer_dry_run_summary_v1.json',
);
const SUMMARY_MD = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09f_world_championship_extended_source_pointer_dry_run_summary_v1.md',
);
const PLAN_JSONL = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09f_world_championship_extended_source_pointer_plan_v1.jsonl',
);

const PACKAGE_ID = 'IMG-HOST-WH-09F-WORLD-CHAMPIONSHIP-EXTENDED-SOURCE-POINTER-DRY-RUN';
const FUTURE_APPLY_PACKAGE_ID = 'IMG-HOST-WH-09G-WORLD-CHAMPIONSHIP-EXTENDED-SOURCE-POINTER-APPLY';
const EXPECTED_ALREADY_REPRESENTATIVE_ROWS = 1804;
const EXPECTED_CURRENT_MISSING_ROWS = 140;

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((output, key) => {
      output[key] = canonicalize(value[key]);
      return output;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalize(value)));
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/☆/g, ' star ')
    .replace(/δ/g, ' delta ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function cardImagePath(row) {
  return clean(row.image_path)
    ?? clean(row.image_url)
    ?? clean(row.image_alt_url)
    ?? clean(row.representative_image_url)
    ?? null;
}

function normalizeSourceNumber(sourceSetName, sourceCardNumber) {
  let number = String(sourceCardNumber ?? '').trim().toLowerCase();
  if (normalize(sourceSetName) === 'ex') {
    const match = number.match(/^(.+?)\s+(\d+[a-z]?)$/i);
    if (match) number = match[2];
  }
  return number.replace(/^0+(\d)/, '$1');
}

function normalizePrintedNumber(number) {
  const raw = String(number ?? '').trim().toLowerCase();
  const match = raw.match(/^(?:[a-z]+)?0*(\d+[a-z]?)$/);
  return match ? match[1] : raw;
}

function sourceAliases(sourceSetName, sourceCardNumber) {
  const aliases = new Set();
  const sourceSet = clean(sourceSetName);
  if (sourceSet) aliases.add(normalize(sourceSet));

  const promoAliases = {
    'dp promo': 'dp black star promos',
    'bw promo': 'bw black star promos',
    'xy promo': 'xy black star promos',
    'sm promo': 'sm black star promos',
    'swsh promo': 'swsh black star promos',
  };
  for (const alias of [...aliases]) {
    if (promoAliases[alias]) aliases.add(promoAliases[alias]);
  }

  if (normalize(sourceSetName) === 'ex') {
    const match = String(sourceCardNumber ?? '').trim().match(/^(.+?)\s+(\d+[a-z]?)$/i);
    if (match) aliases.add(normalize(`EX ${match[1]}`));
  }

  return [...aliases].filter(Boolean);
}

function setAliasMatches(rowSetName, aliases) {
  const normalizedSetName = normalize(rowSetName);
  return aliases.some((alias) => normalizedSetName === alias
    || normalizedSetName.endsWith(alias)
    || alias.endsWith(normalizedSetName));
}

function sourceRank(row) {
  let rank = 0;
  if (row.image_status === 'exact') rank += 50;
  if (!clean(row.variant_key) || row.variant_key === 'standard') rank += 20;
  if (!String(row.variant_key ?? '').includes('stamp')) rank += 10;
  if (String(cardImagePath(row) ?? '').includes('self-hosted-images-v1')) rank += 10;
  return rank;
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function topEntries(counts, limit = 50) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return ['| key | count |', '| --- | ---: |', ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`)].join('\n');
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function fetchRows() {
  const url = dbUrl();
  if (!url) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const currentWcd = await client.query(`
      select id::text, gv_id, name, set_code, number, number_plain, variant_key,
             image_source, image_path, image_status, image_note
      from public.card_prints
      where set_code like 'wcd%'
        and variant_key = 'world_championship_deck_replica'
      order by gv_id
    `);
    const sourceRows = await client.query(`
      select cp.id::text, cp.gv_id, cp.name, cp.set_code, coalesce(s.name, cp.set_code) as set_name,
             cp.number, cp.number_plain, cp.variant_key, cp.image_source, cp.image_path,
             cp.image_status, cp.image_note, cp.image_url, cp.image_alt_url, cp.representative_image_url
      from public.card_prints cp
      left join public.sets s on s.code = cp.set_code
      where cp.set_code not like 'wcd%'
    `);
    return { currentWcd: currentWcd.rows, sourceRows: sourceRows.rows };
  } finally {
    await client.end();
  }
}

function buildPlanRow({ wcdRow, manifestRow, sourceRow, sourceMatchKind }) {
  const deckYear = manifestRow.deck_year;
  const deckName = manifestRow.deck_name;
  return {
    package_id: FUTURE_APPLY_PACKAGE_ID,
    source_dry_run_package_id: PACKAGE_ID,
    plan_type: 'metadata_pointer_repoint',
    target_table: 'card_prints',
    target_row_id: wcdRow.id,
    gv_id: wcdRow.gv_id,
    name: wcdRow.name,
    set_code: wcdRow.set_code,
    number: wcdRow.number,
    number_plain: wcdRow.number_plain,
    variant_key: wcdRow.variant_key,
    deck_year: deckYear,
    deck_name: deckName,
    player_name: manifestRow.player_name ?? null,
    source_set_name: manifestRow.source_set_name ?? null,
    source_card_number: manifestRow.source_card_number ?? null,
    source_card_reference_kind: manifestRow.source_card_reference_kind ?? null,
    source_match_kind: sourceMatchKind,
    representative_source_table: 'card_prints',
    representative_source_row_id: sourceRow.id,
    representative_source_gv_id: sourceRow.gv_id,
    representative_source_set_code: sourceRow.set_code,
    representative_source_set_name: sourceRow.set_name,
    source_image_status: sourceRow.image_status,
    source_image_path: cardImagePath(sourceRow),
    current_values: {
      image_source: wcdRow.image_source ?? null,
      image_path: wcdRow.image_path ?? null,
      image_status: wcdRow.image_status ?? null,
      image_note: wcdRow.image_note ?? null,
    },
    proposed_values: {
      image_source: 'identity',
      image_path: cardImagePath(sourceRow),
      image_status: 'representative_shared',
      image_note: `Extended-source representative image from ordinary source card ${sourceRow.gv_id} for World Championship Deck display continuity. This is not an exact ${deckYear} ${deckName} replica image and may omit World Championship back, border, and player signature treatment. Prepared by ${PACKAGE_ID}; exact WCD image remains uncataloged.`,
    },
    exact_image_claim_change: false,
    db_write_performed: false,
    storage_write_performed: false,
    runtime_public_url_field_write_planned: false,
    allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
    changed_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
  };
}

async function main() {
  const sourceCards = await readJsonl(SOURCE_CARDS_JSONL);
  const sourceCardsByGvId = new Map(sourceCards.map((row) => [row.proposed_gv_id, row]));
  const sourceTranslationFingerprint = proofHash(sourceCards.map((row) => ({
    proposed_gv_id: row.proposed_gv_id,
    source_set_name: row.source_set_name ?? null,
    source_card_number: row.source_card_number ?? null,
    source_card_reference_kind: row.source_card_reference_kind ?? null,
  })));

  const { currentWcd, sourceRows } = await fetchRows();
  const missingWcd = currentWcd.filter((row) => row.image_status === 'missing');
  const alreadyRepresentative = currentWcd.filter((row) => row.image_status === 'representative_shared');

  const planRows = [];
  const unresolvedRows = [];
  const stopFindings = [];

  if (currentWcd.length !== sourceCards.length) stopFindings.push(`wcd_manifest_count_mismatch:${currentWcd.length}:${sourceCards.length}`);
  if (missingWcd.length !== EXPECTED_CURRENT_MISSING_ROWS) stopFindings.push(`unexpected_current_missing_count:${missingWcd.length}`);
  if (alreadyRepresentative.length !== EXPECTED_ALREADY_REPRESENTATIVE_ROWS) {
    stopFindings.push(`unexpected_already_representative_count:${alreadyRepresentative.length}`);
  }

  for (const wcdRow of missingWcd) {
    const manifestRow = sourceCardsByGvId.get(wcdRow.gv_id);
    if (!manifestRow) {
      unresolvedRows.push({ ...wcdRow, match_kind: 'missing_manifest_row' });
      continue;
    }

    const sourceSetName = manifestRow.source_set_name;
    const sourceCardNumber = manifestRow.source_card_number;
    if (!clean(sourceSetName) || !clean(sourceCardNumber)) {
      unresolvedRows.push({
        ...wcdRow,
        source_set_name: sourceSetName ?? null,
        source_card_number: sourceCardNumber ?? null,
        source_card_reference_kind: manifestRow.source_card_reference_kind ?? null,
        match_kind: 'energy_or_template_missing_source_key',
      });
      continue;
    }

    const aliases = sourceAliases(sourceSetName, sourceCardNumber);
    const sourceNumber = normalizeSourceNumber(sourceSetName, sourceCardNumber);
    const matches = sourceRows
      .filter((sourceRow) => normalize(sourceRow.name) === normalize(wcdRow.name))
      .filter((sourceRow) => normalizePrintedNumber(sourceRow.number) === sourceNumber)
      .filter((sourceRow) => setAliasMatches(sourceRow.set_name, aliases))
      .filter((sourceRow) => String(cardImagePath(sourceRow) ?? '').includes('self-hosted-images-v1'))
      .sort((left, right) => sourceRank(right) - sourceRank(left) || left.gv_id.localeCompare(right.gv_id));

    if (!matches.length) {
      unresolvedRows.push({
        ...wcdRow,
        source_set_name: sourceSetName,
        source_card_number: sourceCardNumber,
        source_card_reference_kind: manifestRow.source_card_reference_kind ?? null,
        source_aliases: aliases,
        parsed_source_number: sourceNumber,
        match_kind: 'no_self_hosted_catalog_source_match',
      });
      continue;
    }

    const topRank = sourceRank(matches[0]);
    const topMatches = matches.filter((row) => sourceRank(row) === topRank);
    if (topMatches.length !== 1) {
      unresolvedRows.push({
        ...wcdRow,
        source_set_name: sourceSetName,
        source_card_number: sourceCardNumber,
        source_card_reference_kind: manifestRow.source_card_reference_kind ?? null,
        source_aliases: aliases,
        parsed_source_number: sourceNumber,
        match_kind: 'ambiguous_extended_source_match',
        candidate_source_gv_ids: topMatches.map((row) => row.gv_id),
      });
      continue;
    }

    const sourceRow = topMatches[0];
    const sourceMatchKind = aliases.some((alias) => alias.includes('black star promos'))
      ? 'promo_alias_source_match'
      : 'extended_exact_source_match';
    planRows.push(buildPlanRow({ wcdRow, manifestRow, sourceRow, sourceMatchKind }));
  }

  const changedColumnSets = countBy(planRows, (row) => row.changed_columns.join(','));
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    future_apply_package_id: FUTURE_APPLY_PACKAGE_ID,
    source_translation_fingerprint: sourceTranslationFingerprint,
    source_cards_jsonl: path.relative(ROOT, SOURCE_CARDS_JSONL),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    current_wcd_rows: currentWcd.length,
    already_representative_wcd_rows: alreadyRepresentative.length,
    current_missing_wcd_rows: missingWcd.length,
    residual_representative_candidate_rows: planRows.length,
    effective_metadata_pointer_updates: planRows.length,
    unresolved_residual_rows: unresolvedRows.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    child_writes_performed: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    planned_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
    candidate_set_codes: countBy(planRows, (row) => row.set_code),
    candidate_deck_years: countBy(planRows, (row) => String(row.deck_year)),
    source_match_kinds: countBy(planRows, (row) => row.source_match_kind),
    proposed_image_sources: countBy(planRows, (row) => row.proposed_values.image_source),
    proposed_image_statuses: countBy(planRows, (row) => row.proposed_values.image_status),
    changed_column_sets: changedColumnSets,
    unresolved_match_kinds: countBy(unresolvedRows, (row) => row.match_kind),
    unresolved_source_sets: countBy(unresolvedRows, (row) => row.source_set_name ?? 'unknown'),
    stop_findings: [...new Set(stopFindings)],
    ready_for_apply_package: stopFindings.length === 0 && planRows.length > 0,
    samples: {
      residual_candidates: planRows.slice(0, 30).map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        source_gv_id: row.representative_source_gv_id,
        source_set_name: row.representative_source_set_name,
        source_match_kind: row.source_match_kind,
      })),
      unresolved_rows: unresolvedRows.slice(0, 40).map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        source_set_name: row.source_set_name ?? null,
        source_card_number: row.source_card_number ?? null,
        source_reference_kind: row.source_card_reference_kind ?? null,
        match_kind: row.match_kind,
      })),
    },
  };
  summary.fingerprint = proofHash({
    package_id: PACKAGE_ID,
    source_translation_fingerprint: sourceTranslationFingerprint,
    current_missing_wcd_rows: summary.current_missing_wcd_rows,
    residual_representative_candidate_rows: summary.residual_representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    unresolved_residual_rows: summary.unresolved_residual_rows,
    source_match_kinds: summary.source_match_kinds,
    candidates: planRows.map((row) => ({
      gv_id: row.gv_id,
      source_gv_id: row.representative_source_gv_id,
      image_path: row.proposed_values.image_path,
      source_match_kind: row.source_match_kind,
    })),
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_JSONL, `${planRows.map((row) => JSON.stringify(row)).join('\n')}${planRows.length ? '\n' : ''}`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Future apply package: \`${summary.future_apply_package_id}\`
- Source translation fingerprint: \`${summary.source_translation_fingerprint}\`
- Current WCD rows: ${summary.current_wcd_rows}
- Already representative WCD rows: ${summary.already_representative_wcd_rows}
- Current missing WCD rows: ${summary.current_missing_wcd_rows}
- Residual representative candidate rows: ${summary.residual_representative_candidate_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Unresolved residual rows: ${summary.unresolved_residual_rows}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Child writes performed: ${summary.child_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}

## Finding

This pass recovers residual World Championship Deck display images where the source card is safely recoverable through promo aliases such as \`DP Promo\` -> \`DP Black Star Promos\`, or through exact source-set and printed-number matches that were not eligible in the prior residual pass. It still writes only representative display metadata and does not claim exact World Championship Deck imagery.

## Proposed Image Statuses

${markdownTable(topEntries(summary.proposed_image_statuses))}

## Source Match Kinds

${markdownTable(topEntries(summary.source_match_kinds))}

## Candidate Years

${markdownTable(topEntries(summary.candidate_deck_years, 30))}

## Largest Candidate Sets

${markdownTable(topEntries(summary.candidate_set_codes, 60))}

## Unresolved Match Kinds

${markdownTable(topEntries(summary.unresolved_match_kinds))}

## Unresolved Source Sets

${markdownTable(topEntries(summary.unresolved_source_sets, 40))}

## Apply Boundary

A future apply package, if approved, should update only \`card_prints.image_source\`, \`card_prints.image_path\`, \`card_prints.image_status\`, and \`card_prints.image_note\` for the candidate rows in \`${path.relative(ROOT, PLAN_JSONL)}\`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, deletes, merges, migrations, or exact-image claims.
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    current_missing_wcd_rows: summary.current_missing_wcd_rows,
    residual_representative_candidate_rows: summary.residual_representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    unresolved_residual_rows: summary.unresolved_residual_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
