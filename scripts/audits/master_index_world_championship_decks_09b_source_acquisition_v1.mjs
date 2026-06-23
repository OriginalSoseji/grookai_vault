import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const CACHE_DIR = path.join(OUTPUT_DIR, 'cache_bulbapedia_raw_v1');
const DECKS_JSONL = path.join(OUTPUT_DIR, 'world_championship_decks_09b_decks_source_manifest_v1.jsonl');
const CARDS_JSONL = path.join(OUTPUT_DIR, 'world_championship_decks_09b_cards_source_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'world_championship_decks_09b_source_acquisition_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'world_championship_decks_09b_source_acquisition_summary_v1.md');
const PACKAGE_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09B-SOURCE-ACQUISITION';
const USER_AGENT = 'Grookai Master Index World Championship Deck Acquisition/1.0';
const INDEX_TITLE = 'World_Championships_Deck_(TCG)';

function parseArgs(argv) {
  const args = {
    refreshCache: false,
    deckLimit: Number.parseInt(process.env.WCD_DECK_LIMIT ?? '0', 10),
    timeoutMs: Number.parseInt(process.env.WCD_TIMEOUT_MS ?? '45000', 10),
    delayMs: Number.parseInt(process.env.WCD_DELAY_MS ?? '350', 10),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--refresh-cache') args.refreshCache = true;
    else if (arg === '--deck-limit') args.deckLimit = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--timeout-ms') args.timeoutMs = Number.parseInt(argv[++index] ?? '45000', 10);
    else if (arg === '--delay-ms') args.delayMs = Number.parseInt(argv[++index] ?? '350', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.timeoutMs = Math.max(10000, args.timeoutMs || 45000);
  args.delayMs = Math.max(100, args.delayMs || 350);
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return String(value ?? '')
    .trim()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, '_');
}

function cacheName(title) {
  return `${title.replace(/[^A-Za-z0-9_.-]+/g, '_')}.txt`;
}

function sourceUrl(title) {
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(title)}`;
}

function rawUrl(title) {
  const url = new URL('https://bulbapedia.bulbagarden.net/w/index.php');
  url.searchParams.set('title', title);
  url.searchParams.set('action', 'raw');
  return url.toString();
}

function redirectTitle(raw) {
  const match = String(raw ?? '').match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  return match ? match[1].trim().replace(/\s+/g, '_') : null;
}

async function fetchRaw(title, args, redirects = 0) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, cacheName(title));
  if (!args.refreshCache) {
    try {
      const raw = await fs.readFile(cacheFile, 'utf8');
      return { title, raw, url: sourceUrl(title), from_cache: true };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    String(Math.ceil(args.timeoutMs / 1000)),
    '--user-agent',
    USER_AGENT,
    rawUrl(title),
  ], { timeout: args.timeoutMs + 5000, maxBuffer: 20 * 1024 * 1024 });

  const redirected = redirectTitle(stdout);
  if (redirected && redirects < 4) return fetchRaw(redirected, args, redirects + 1);

  await fs.writeFile(cacheFile, stdout, 'utf8');
  return { title, raw: stdout, url: sourceUrl(title), from_cache: false };
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

function parseIndex(raw) {
  const lines = raw.split(/\r?\n/);
  const decks = [];
  let currentYear = null;
  for (const line of lines) {
    const yearMatch = line.match(/^===.*?(\d{4}).*?===$/);
    if (yearMatch) {
      currentYear = Number.parseInt(yearMatch[1], 10);
      continue;
    }
    if (!currentYear) continue;
    const deckMatch = line.match(/^\*\s+\{\{TCG\|([^}]+)\}\}/);
    if (!deckMatch) continue;
    const deck_name = clean(deckMatch[1]);
    decks.push({
      year: currentYear,
      deck_name,
      deck_title: `${slug(deck_name)}_(TCG)`,
      source_index_title: INDEX_TITLE,
      source_index_url: sourceUrl(INDEX_TITLE),
    });
  }
  return decks;
}

function fieldFromInfobox(raw, field) {
  const match = raw.match(new RegExp(`\\|${field}=([^\\n]+)`));
  return match ? clean(match[1].replace(/\{\{[^}]+\}\}/g, '')) : null;
}

function plainWikiText(value) {
  return clean(String(value ?? '')
    .replace(/\{\{TCG ID\|([^|]+)\|([^|]+)\|([^}]+)\}\}/g, '$2 ($1 $3)')
    .replace(/\{\{TCG\|([^}]+)\}\}/g, '$1')
    .replace(/\{\{TCGV\}\}/g, ' V')
    .replace(/\{\{VSTAR\}\}/g, ' VSTAR')
    .replace(/\{\{VMAX\}\}/g, ' VMAX')
    .replace(/\{\{BREAK\}\}/g, ' BREAK')
    .replace(/\{\{EX\}\}/g, '-EX')
    .replace(/\{\{GX\}\}/g, '-GX')
    .replace(/\{\{Red GX\}\}/g, '-GX')
    .replace(/\{\{TT GX\}\}/g, '-GX')
    .replace(/\{\{Mega\}\}/g, 'M ')
    .replace(/\{\{Star\}\}/g, '☆')
    .replace(/\{\{Prism Star\}\}/g, '♢')
    .replace(/\{\{TCGMerch\|[^|]+\|[^|]+\|([^}]+)\}\}/g, '$1')
    .replace(/\{\{e\|([^}]+)\}\}/g, '$1')
    .replace(/\{\{ene\|([^}]+)\}\}/g, '$1')
    .replace(/\{\{SP\|([^}]+)\}\}/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, ''));
}

function normalizeDecklistLines(raw) {
  return raw
    .replace(/\}\}\{\{decklist\/entry\|/g, '}}\n{{decklist/entry|')
    .replace(/\}\}\{\{halfdecklist\/entry\|/g, '}}\n{{halfdecklist/entry|')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('{{decklist/entry|') || line.startsWith('{{halfdecklist/entry|'));
}

function splitTopLevelFields(value) {
  const fields = [];
  let current = '';
  let braceDepth = 0;
  let bracketDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const two = value.slice(index, index + 2);
    if (two === '{{') {
      braceDepth += 1;
      current += two;
      index += 1;
      continue;
    }
    if (two === '}}') {
      braceDepth = Math.max(0, braceDepth - 1);
      current += two;
      index += 1;
      continue;
    }
    if (two === '[[') {
      bracketDepth += 1;
      current += two;
      index += 1;
      continue;
    }
    if (two === ']]') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += two;
      index += 1;
      continue;
    }
    const char = value[index];
    if (char === '|' && braceDepth === 0 && bracketDepth === 0) {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields;
}

function parseSetNumberTitle(title) {
  const match = clean(title).match(/^(.+?) \((.+?) ([^()]+)\)$/);
  if (!match) return null;
  return {
    card_name: clean(match[1]),
    source_set_name: clean(match[2]),
    card_number: clean(match[3]),
  };
}

function parseCardReference(value) {
  const raw = String(value ?? '').trim();
  const tcgId = raw.match(/\{\{TCG ID\|([^|]+)\|([^|]+)\|([^}]+)\}\}/);
  if (tcgId) {
    return {
      source_set_name: clean(tcgId[1]),
      card_name: plainWikiText(tcgId[2]),
      card_number: clean(tcgId[3]),
      card_reference_kind: 'tcg_id_template',
      raw_card_reference: raw,
    };
  }

  const wikiLink = raw.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
  if (wikiLink) {
    const parsedTitle = parseSetNumberTitle(wikiLink[1]);
    return {
      source_set_name: parsedTitle?.source_set_name ?? null,
      card_name: parsedTitle?.card_name ?? plainWikiText(wikiLink[2] ?? wikiLink[1]),
      card_number: parsedTitle?.card_number ?? null,
      card_reference_kind: parsedTitle ? 'wiki_card_page_link' : 'wiki_link',
      raw_card_reference: raw,
    };
  }

  const tcgEnergy = raw.match(/\{\{TCG\|([^}]+)\}\}/);
  if (tcgEnergy) {
    return {
      source_set_name: null,
      card_name: plainWikiText(tcgEnergy[1]),
      card_number: null,
      card_reference_kind: 'tcg_named_template',
      raw_card_reference: raw,
    };
  }

  return {
    source_set_name: null,
    card_name: plainWikiText(raw),
    card_number: null,
    card_reference_kind: 'plain_or_unresolved',
    raw_card_reference: raw,
  };
}

function parseDeckPage(raw, deckSeed, resolvedTitle, resolvedUrl) {
  const playerMatch = raw.match(/'''[^']+''' is the name of the deck used by (.+?) in the (?:\[\[)?(\d{4})(?: [^\]]*)?(?:\]\])? World Championships/i);
  const releaseMatch = raw.match(/released in ([^.]+)\./i);
  const traits = {
    silver_border: /silver border/i.test(raw),
    player_signature: /\bsignature\b/i.test(raw),
    world_championship_back: /World Championships back/i.test(raw),
    non_tournament_legal: /not tournament legal|None of the cards are tournament legal/i.test(raw),
  };
  const deck = {
    ...deckSeed,
    resolved_title: resolvedTitle,
    source_url: resolvedUrl,
    infobox_title: fieldFromInfobox(raw, 'title'),
    infobox_image: fieldFromInfobox(raw, 'image'),
    player_name: playerMatch ? plainWikiText(playerMatch[1]) : null,
    source_year_from_page: playerMatch ? Number.parseInt(playerMatch[2], 10) : null,
    release_text: releaseMatch ? plainWikiText(releaseMatch[1]) : null,
    special_traits: traits,
    source_backed_lane_reason: 'World Championship Deck cards are non-tournament-legal replica prints with deck-player signatures, silver borders, and World Championships card backs when source text confirms those traits.',
  };

  const cards = [];
  const nonParsedDecklistLines = [];
  for (const line of normalizeDecklistLines(raw)) {
    const templateKind = line.startsWith('{{halfdecklist/entry|') ? 'halfdecklist/entry' : 'decklist/entry';
    const body = line.replace(/^\{\{(?:half)?decklist\/entry\|/, '').replace(/\}\}$/, '');
    const fields = splitTopLevelFields(body);
    if ((templateKind === 'decklist/entry' && fields.length < 3) || (templateKind === 'halfdecklist/entry' && fields.length < 6)) {
      nonParsedDecklistLines.push(line);
      continue;
    }
    const cardReference = parseCardReference(templateKind === 'halfdecklist/entry' ? fields[2] : fields[1]);
    cards.push({
      deck_year: deckSeed.year,
      deck_name: deckSeed.deck_name,
      deck_title: deck.resolved_title,
      player_name: deck.player_name,
      quantity: Number.parseInt(clean(templateKind === 'halfdecklist/entry' ? fields[5] : fields[0]), 10),
      deck_print_number: templateKind === 'halfdecklist/entry' ? clean(fields[0]) : null,
      deck_print_rarity_code: templateKind === 'halfdecklist/entry' ? clean(fields[1]) : null,
      source_set_name: cardReference.source_set_name,
      card_name: cardReference.card_name,
      card_number: cardReference.card_number,
      card_reference_kind: cardReference.card_reference_kind,
      raw_card_reference: cardReference.raw_card_reference,
      card_type: plainWikiText(templateKind === 'halfdecklist/entry' ? fields[3] : fields[2]) || null,
      card_subtype: plainWikiText(templateKind === 'halfdecklist/entry' ? fields[4] : fields[3]) || null,
      rarity: templateKind === 'halfdecklist/entry' ? null : (plainWikiText(fields[4]) || null),
      source_url: resolvedUrl,
      source_template: templateKind,
      proposed_lane_type: 'world_championship_deck_replica',
      exact_image_claim_allowed: false,
    });
  }
  deck.decklist_unique_rows = cards.length;
  deck.decklist_total_cards = cards.reduce((sum, card) => sum + (Number.isFinite(card.quantity) ? card.quantity : 0), 0);
  deck.nonparsed_decklist_lines = nonParsedDecklistLines.length;
  return { deck, cards, nonParsedDecklistLines };
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  const header = `| ${columns.join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function renderMarkdown(summary) {
  const sampleDecks = summary.sample_decks.map((deck) => ({
    year: deck.year,
    deck: deck.deck_name,
    player: deck.player_name ?? '',
    rows: deck.decklist_unique_rows,
    cards: deck.decklist_total_cards,
  }));
  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Index source: ${summary.index_source_url}
- Deck rows acquired: ${summary.deck_rows_acquired}
- Card source rows acquired: ${summary.card_source_rows_acquired}
- Years covered: ${summary.years_covered.join(', ')}
- Deck pages with source-confirmed special traits: ${summary.deck_pages_with_all_special_traits}
- Deck pages with parse errors: ${summary.deck_pages_with_errors}
- Nonparsed decklist lines: ${summary.nonparsed_decklist_lines}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## Why This Is A Separate Lane

Source text describes World Championship decks as purchasable, non-tournament-legal prints of player decks. The acquired deck pages identify player/deck context and, when present in source text, special card traits such as silver borders, player signatures, and World Championships backs. These should not be collapsed into ordinary expansion prints.

## Deck Sample

${markdownTable(sampleDecks, ['year', 'deck', 'player', 'rows', 'cards'])}

## Year Counts

${markdownTable(Object.entries(summary.deck_rows_by_year).map(([year, count]) => ({ year, count })), ['year', 'count'])}

## Next Work

Build a guarded dry-run translation from this source manifest into derived set lanes and card print candidates. That next package should still make no writes until approved.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const indexPage = await fetchRaw(INDEX_TITLE, args);
  let deckSeeds = parseIndex(indexPage.raw);
  if (args.deckLimit > 0) deckSeeds = deckSeeds.slice(0, args.deckLimit);

  const decks = [];
  const cards = [];
  const errors = [];
  let nonparsedDecklistLines = 0;

  for (const [index, deckSeed] of deckSeeds.entries()) {
    if (index > 0) await sleep(args.delayMs);
    try {
      const page = await fetchRaw(deckSeed.deck_title, args);
      const parsed = parseDeckPage(page.raw, deckSeed, page.title, page.url);
      decks.push(parsed.deck);
      cards.push(...parsed.cards);
      nonparsedDecklistLines += parsed.nonParsedDecklistLines.length;
    } catch (error) {
      errors.push({
        deck_name: deckSeed.deck_name,
        year: deckSeed.year,
        deck_title: deckSeed.deck_title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await fs.writeFile(DECKS_JSONL, `${decks.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  await fs.writeFile(CARDS_JSONL, `${cards.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  const summaryBase = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_source_acquisition_no_db_no_storage_writes',
    index_source_url: indexPage.url,
    deck_rows_expected_from_index: deckSeeds.length,
    deck_rows_acquired: decks.length,
    card_source_rows_acquired: cards.length,
    decklist_total_card_quantity_acquired: cards.reduce((sum, card) => sum + (Number.isFinite(card.quantity) ? card.quantity : 0), 0),
    years_covered: Array.from(new Set(decks.map((deck) => deck.year))).sort((left, right) => left - right),
    deck_rows_by_year: countBy(decks, (deck) => String(deck.year)),
    deck_pages_with_all_special_traits: decks.filter((deck) =>
      deck.special_traits.silver_border
      && deck.special_traits.player_signature
      && deck.special_traits.world_championship_back
      && deck.special_traits.non_tournament_legal).length,
    deck_pages_with_errors: errors.length,
    errors,
    nonparsed_decklist_lines: nonparsedDecklistLines,
    sample_decks: decks.slice(0, 12),
    deck_manifest_path: path.relative(ROOT, DECKS_JSONL),
    card_manifest_path: path.relative(ROOT, CARDS_JSONL),
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };

  const fingerprintPayload = {
    package_id: summaryBase.package_id,
    deck_rows_expected_from_index: summaryBase.deck_rows_expected_from_index,
    deck_rows_acquired: summaryBase.deck_rows_acquired,
    card_source_rows_acquired: summaryBase.card_source_rows_acquired,
    decklist_total_card_quantity_acquired: summaryBase.decklist_total_card_quantity_acquired,
    years_covered: summaryBase.years_covered,
    deck_rows_by_year: summaryBase.deck_rows_by_year,
    deck_pages_with_all_special_traits: summaryBase.deck_pages_with_all_special_traits,
    deck_pages_with_errors: summaryBase.deck_pages_with_errors,
    nonparsed_decklist_lines: summaryBase.nonparsed_decklist_lines,
    decks: decks.map((deck) => ({
      year: deck.year,
      deck_name: deck.deck_name,
      player_name: deck.player_name,
      rows: deck.decklist_unique_rows,
      total: deck.decklist_total_cards,
      traits: deck.special_traits,
    })),
    cards: cards.map((card) => ({
      year: card.deck_year,
      deck: card.deck_name,
      quantity: card.quantity,
      set: card.source_set_name,
      name: card.card_name,
      number: card.card_number,
    })),
  };
  const summary = { ...summaryBase, fingerprint: proofHash(fingerprintPayload) };

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    deck_manifest: path.relative(ROOT, DECKS_JSONL),
    card_manifest: path.relative(ROOT, CARDS_JSONL),
    fingerprint: summary.fingerprint,
    deck_rows_acquired: summary.deck_rows_acquired,
    card_source_rows_acquired: summary.card_source_rows_acquired,
    deck_pages_with_errors: summary.deck_pages_with_errors,
    nonparsed_decklist_lines: summary.nonparsed_decklist_lines,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
