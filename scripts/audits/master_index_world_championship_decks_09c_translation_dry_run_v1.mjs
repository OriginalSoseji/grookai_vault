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
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const SOURCE_SUMMARY = path.join(SOURCE_DIR, 'world_championship_decks_09b_source_acquisition_summary_v1.json');
const SOURCE_DECKS = path.join(SOURCE_DIR, 'world_championship_decks_09b_decks_source_manifest_v1.jsonl');
const SOURCE_CARDS = path.join(SOURCE_DIR, 'world_championship_decks_09b_cards_source_manifest_v1.jsonl');
const PROPOSED_SETS = path.join(SOURCE_DIR, 'world_championship_decks_09c_proposed_sets_v1.jsonl');
const PROPOSED_CARDS = path.join(SOURCE_DIR, 'world_championship_decks_09c_proposed_card_prints_v1.jsonl');
const SUMMARY_JSON = path.join(SOURCE_DIR, 'world_championship_decks_09c_translation_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(SOURCE_DIR, 'world_championship_decks_09c_translation_dry_run_summary_v1.md');
const PACKAGE_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09C-TRANSLATION-DRY-RUN';

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/pokemon/g, 'pokemon')
    .replace(/&/g, ' and ')
    .replace(/['`"._]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value, max = 40) {
  const normalized = normalizeText(value).replace(/\s+/g, '-').replace(/^-|-$/g, '');
  return (normalized || 'unknown').slice(0, max).replace(/-$/g, '');
}

function gvSlug(value, max = 32) {
  return slug(value, max).toUpperCase().replace(/-/g, '_');
}

function numberPlain(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits || null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const text = await fs.readFile(file, 'utf8');
  return text.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function writeJsonl(file, rows) {
  await fs.writeFile(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}

async function loadDbSnapshot() {
  const connectionString = dbUrl();
  if (!connectionString) {
    return {
      connected: false,
      sets: [],
      card_prints: [],
      error: 'Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.',
    };
  }
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('set default_transaction_read_only = on');
  try {
    const [sets, cards] = await Promise.all([
      client.query(`
        select code, name, printed_total, set_role, identity_model
        from public.sets
      `),
      client.query(`
        select
          cp.id::text,
          cp.gv_id,
          cp.name,
          cp.number,
          cp.number_plain,
          cp.rarity,
          cp.set_code,
          s.name as set_name
        from public.card_prints cp
        left join public.sets s on s.code = cp.set_code
      `),
    ]);
    return { connected: true, sets: sets.rows, card_prints: cards.rows, error: null };
  } finally {
    await client.end();
  }
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function indexExistingCards(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = [
      normalizeText(row.set_name),
      normalizeText(row.name),
      numberPlain(row.number ?? row.number_plain) ?? '',
    ].join('|');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function proposeSet(deck) {
  const deckSlug = slug(deck.deck_name, 28);
  const code = `wcd${deck.year}-${deckSlug}`;
  return {
    proposed_set_code: code,
    proposed_set_name: `${deck.year} World Championships Deck: ${deck.deck_name}`,
    year: deck.year,
    deck_name: deck.deck_name,
    player_name: deck.player_name,
    printed_total: deck.decklist_unique_rows,
    decklist_total_card_quantity: deck.decklist_total_cards,
    source_url: deck.source_url,
    source_index_url: deck.source_index_url,
    proposed_set_role: 'derived_collector_lane',
    proposed_identity_model: 'reprint_anthology',
    lane_explanation: 'World Championship Deck cards are purchasable, non-tournament-legal replica prints tied to a specific player deck, with source-backed signature/back/border treatment.',
    exact_image_claim_allowed: false,
  };
}

function proposeCard(card, proposedSet, indexWithinDeck, sourceMatches) {
  const entry = String(indexWithinDeck + 1).padStart(2, '0');
  const cardPart = card.card_name ? gvSlug(card.card_name, 28) : 'CARD';
  const sourcePart = card.source_set_name ? gvSlug(card.source_set_name, 16) : 'ENERGY';
  const numberPart = numberPlain(card.card_number ?? card.deck_print_number) ?? entry;
  return {
    proposed_gv_id: `GV-PK-WCD-${card.deck_year}-${gvSlug(card.deck_name, 24)}-${entry}-${sourcePart}-${numberPart}-${cardPart}`,
    proposed_set_code: proposedSet.proposed_set_code,
    proposed_set_name: proposedSet.proposed_set_name,
    name: card.card_name,
    number: card.deck_print_number ?? card.card_number ?? entry,
    variant_key: 'world_championship_deck_replica',
    rarity: card.rarity,
    source_set_name: card.source_set_name,
    source_card_number: card.card_number,
    source_card_reference_kind: card.card_reference_kind,
    source_card_print_match_count: sourceMatches.length,
    source_card_print_id: sourceMatches[0]?.id ?? null,
    source_card_print_gv_id: sourceMatches[0]?.gv_id ?? null,
    deck_year: card.deck_year,
    deck_name: card.deck_name,
    player_name: card.player_name,
    deck_quantity: card.quantity,
    source_url: card.source_url,
    image_status: 'missing',
    image_note: 'World Championship Deck exact image not cataloged yet; do not display ordinary expansion imagery as exact.',
    exact_image_claim_allowed: false,
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(row[column] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function renderMarkdown(summary) {
  const yearRows = Object.entries(summary.proposed_sets_by_year).map(([year, count]) => ({ year, sets: count }));
  const sampleRows = summary.sample_proposed_sets.map((row) => ({
    code: row.proposed_set_code,
    name: row.proposed_set_name,
    total: row.printed_total,
  }));
  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Source WH09B fingerprint: \`${summary.source_acquisition_fingerprint}\`
- Proposed set lane inserts: ${summary.proposed_set_rows}
- Proposed card_print parent identity inserts: ${summary.proposed_card_print_rows}
- Existing proposed set code collisions: ${summary.existing_set_code_collisions}
- Existing proposed gv_id collisions: ${summary.existing_gv_id_collisions}
- Duplicate proposed gv_ids in plan: ${summary.duplicate_proposed_gv_ids}
- Source card rows with existing DB match: ${summary.source_card_rows_with_existing_db_match}
- Source card rows without existing DB match: ${summary.source_card_rows_without_existing_db_match}
- Write ready after this dry run: ${summary.write_ready_after_this_dry_run}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## Stop Findings

${summary.stop_findings.length ? summary.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._'}

## Proposed Set Sample

${markdownTable(sampleRows, ['code', 'name', 'total'])}

## Proposed Sets By Year

${markdownTable(yearRows, ['year', 'sets'])}

## Next Work

If the scope is acceptable, the next package is a guarded rollback SQL dry-run that inserts these proposed rows inside a transaction and rolls back. Real apply should still require exact approval text and should not include child writes, external mappings, prices, storage writes, deletes, merges, migrations, or exact image claims.
`;
}

async function main() {
  const [sourceSummary, decks, cards, db] = await Promise.all([
    readJson(SOURCE_SUMMARY),
    readJsonl(SOURCE_DECKS),
    readJsonl(SOURCE_CARDS),
    loadDbSnapshot(),
  ]);

  const proposedSets = decks.map(proposeSet);
  const proposedSetByDeck = new Map(proposedSets.map((row) => [`${row.year}|${row.deck_name}`, row]));
  const existingSetCodes = new Set(db.sets.map((row) => row.code));
  const existingGvIds = new Set(db.card_prints.map((row) => row.gv_id).filter(Boolean));
  const existingCardIndex = indexExistingCards(db.card_prints);
  const deckEntryCounters = new Map();

  const proposedCards = cards.map((card) => {
    const deckKey = `${card.deck_year}|${card.deck_name}`;
    const indexWithinDeck = deckEntryCounters.get(deckKey) ?? 0;
    deckEntryCounters.set(deckKey, indexWithinDeck + 1);
    const set = proposedSetByDeck.get(deckKey);
    const matchKey = [
      normalizeText(card.source_set_name),
      normalizeText(card.card_name),
      numberPlain(card.card_number) ?? '',
    ].join('|');
    const sourceMatches = card.card_type === 'Energy' ? [] : (existingCardIndex.get(matchKey) ?? []);
    return proposeCard(card, set, indexWithinDeck, sourceMatches);
  });

  const proposedGvCounts = countBy(proposedCards, (row) => row.proposed_gv_id);
  const duplicateGvIds = Object.values(proposedGvCounts).filter((count) => count > 1).length;
  const existingSetCollisions = proposedSets.filter((row) => existingSetCodes.has(row.proposed_set_code)).length;
  const existingGvCollisions = proposedCards.filter((row) => existingGvIds.has(row.proposed_gv_id)).length;
  const sourceMatched = proposedCards.filter((row) => row.source_card_print_match_count > 0).length;
  const sourceUnmatched = proposedCards.length - sourceMatched;

  const stopFindings = [];
  if (!db.connected) stopFindings.push('database_connection_unavailable');
  if (sourceSummary.deck_rows_acquired !== 80) stopFindings.push('source_deck_count_not_80');
  if (sourceSummary.nonparsed_decklist_lines !== 0) stopFindings.push('source_nonparsed_decklist_lines_present');
  if (proposedSets.length !== 80) stopFindings.push('proposed_set_count_not_80');
  if (proposedCards.length !== sourceSummary.card_source_rows_acquired) stopFindings.push('proposed_card_count_mismatch_source');
  if (existingSetCollisions > 0) stopFindings.push('existing_set_code_collisions_present');
  if (existingGvCollisions > 0) stopFindings.push('existing_gv_id_collisions_present');
  if (duplicateGvIds > 0) stopFindings.push('duplicate_proposed_gv_ids_present');

  const fingerprintPayload = {
    package_id: PACKAGE_ID,
    source_acquisition_fingerprint: sourceSummary.fingerprint,
    proposed_sets: proposedSets.map((row) => ({
      code: row.proposed_set_code,
      name: row.proposed_set_name,
      printed_total: row.printed_total,
      identity_model: row.proposed_identity_model,
      set_role: row.proposed_set_role,
    })),
    proposed_cards: proposedCards.map((row) => ({
      gv_id: row.proposed_gv_id,
      set_code: row.proposed_set_code,
      name: row.name,
      number: row.number,
      variant_key: row.variant_key,
      image_status: row.image_status,
      exact_image_claim_allowed: row.exact_image_claim_allowed,
    })),
    proposed_card_count: proposedCards.length,
    proposed_sets_by_year: countBy(proposedSets, (row) => String(row.year)),
    sourceMatched,
    sourceUnmatched,
    existingSetCollisions,
    existingGvCollisions,
    duplicateGvIds,
  };
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'translation_dry_run_no_db_writes_no_storage_writes',
    source_acquisition_fingerprint: sourceSummary.fingerprint,
    source_acquisition_summary: path.relative(ROOT, SOURCE_SUMMARY),
    proposed_sets_path: path.relative(ROOT, PROPOSED_SETS),
    proposed_cards_path: path.relative(ROOT, PROPOSED_CARDS),
    proposed_set_rows: proposedSets.length,
    proposed_card_print_rows: proposedCards.length,
    proposed_sets_by_year: countBy(proposedSets, (row) => String(row.year)),
    existing_set_code_collisions: existingSetCollisions,
    existing_gv_id_collisions: existingGvCollisions,
    duplicate_proposed_gv_ids: duplicateGvIds,
    source_card_rows_with_existing_db_match: sourceMatched,
    source_card_rows_without_existing_db_match: sourceUnmatched,
    unmatched_rows_by_card_type: countBy(proposedCards.filter((row) => row.source_card_print_match_count === 0), (row) => row.name?.includes('Energy') ? 'Energy' : 'Non-energy'),
    sample_proposed_sets: proposedSets.slice(0, 12),
    sample_unmatched_non_energy_rows: proposedCards.filter((row) => row.source_card_print_match_count === 0 && !row.name?.includes('Energy')).slice(0, 25),
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
    write_ready_after_this_dry_run: stopFindings.length === 0,
    stop_findings: stopFindings,
  };
  summary.fingerprint = sha256(stableJson(fingerprintPayload));

  await writeJsonl(PROPOSED_SETS, proposedSets);
  await writeJsonl(PROPOSED_CARDS, proposedCards);
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    proposed_sets: path.relative(ROOT, PROPOSED_SETS),
    proposed_cards: path.relative(ROOT, PROPOSED_CARDS),
    fingerprint: summary.fingerprint,
    proposed_set_rows: summary.proposed_set_rows,
    proposed_card_print_rows: summary.proposed_card_print_rows,
    write_ready_after_this_dry_run: summary.write_ready_after_this_dry_run,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
