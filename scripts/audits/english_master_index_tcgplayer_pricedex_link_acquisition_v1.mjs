import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgplayer_pricedex_links_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgplayer_pricedex_link_acquisition_v1';

function parseArgs(argv) {
  const options = {
    maxSets: null,
    sets: null,
    dryRun: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-sets') {
      options.maxSets = Number(next);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function slugifyForThePriceDex(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[''.:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function finishKeyFromThePriceDexVariant(value) {
  const normalized = String(value ?? '').trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const aliases = {
    normal: 'normal',
    holofoil: 'holo',
    holo_foil: 'holo',
    holo: 'holo',
    reverse_holofoil: 'reverse',
    reverse_holo: 'reverse',
    reverse: 'reverse',
    first_edition_normal: 'first_edition_normal',
    first_edition: 'first_edition_normal',
    first_edition_holofoil: 'first_edition_holo',
    first_edition_holo: 'first_edition_holo',
    pokeball: 'pokeball',
    poke_ball: 'pokeball',
    poke_ball_reverse_holofoil: 'pokeball',
    masterball: 'masterball',
    master_ball: 'masterball',
    master_ball_reverse_holofoil: 'masterball',
    cosmos_holofoil: 'cosmos',
    cosmos_holo: 'cosmos',
    cracked_ice_holofoil: 'cracked_ice',
    cracked_ice_holo: 'cracked_ice',
    expansion_stamp: 'stamped',
    holiday_stamp: 'stamped',
    stamp: 'stamped',
    stamped: 'stamped',
    rocket_reverse_holofoil: 'rocket_reverse',
    rocket_reverse: 'rocket_reverse',
  };
  return normalizeFinishKey(aliases[normalized] ?? null);
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function cardKey(card, setKey, finishKey) {
  return [
    setKey,
    normalizeNumber(card.number ?? card.printedNumber),
    normalizeText(card.name),
    normalizeFinishKey(finishKey),
  ].join('|');
}

function tcgplayerUrl(productId) {
  return `https://www.tcgplayer.com/product/${productId}`;
}

function thePriceDexUrl(set) {
  const setId = set.source_aliases?.thepricedex ?? set.source_aliases?.thepricedex_price_list ?? set.pokemontcg ?? set.tcgdex;
  if (!setId) return null;
  return `https://www.thepricedex.com/set/${encodeURIComponent(setId)}/${slugifyForThePriceDex(set.set_name)}/price-list`;
}

function extractNextDataJson(html, url) {
  const match = String(html).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`ThePriceDex page did not expose __NEXT_DATA__: ${url}`);
  return JSON.parse(match[1]);
}

async function fetchThePriceDexCards(set) {
  const url = thePriceDexUrl(set);
  if (!url) return { url: null, cards: [], error: 'missing_thepricedex_alias' };
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Grookai Master Index Audit/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
    const data = extractNextDataJson(html, url);
    const cards = data?.props?.pageProps?.initialCards;
    if (!Array.isArray(cards)) throw new Error(`ThePriceDex page contained no card rows: ${url}`);
    return { url, cards, error: null };
  } catch (error) {
    return { url, cards: [], error: String(error.message ?? error) };
  }
}

function targetFacts(printings) {
  return (printings.printings ?? [])
    .filter((row) => row.status === 'human_source_verified')
    .filter((row) => (row.sources ?? []).includes('thepricedex_price_list'))
    .filter((row) => row.finish_key && row.card_number && row.card_name);
}

function setTargets(targets) {
  const map = new Map();
  for (const row of targets) {
    if (!map.has(row.set_key)) map.set(row.set_key, []);
    map.get(row.set_key).push(row);
  }
  return map;
}

function buildRecordsForSet({ set, facts, cards, priceDexUrl }) {
  const targetKeys = new Set(facts.map(factKey));
  const records = [];
  for (const card of cards) {
    for (const variant of card.variants ?? []) {
      const finishKey = finishKeyFromThePriceDexVariant(variant?.name);
      if (!finishKey) continue;
      const key = cardKey(card, set.key, finishKey);
      if (!targetKeys.has(key)) continue;
      const tcgplayer = (variant.marketplaces ?? []).find((entry) => entry.name === 'tcgplayer' && entry.productId);
      if (!tcgplayer?.productId) continue;
      records.push({
        source_key: `tcgplayer_product_${tcgplayer.productId}`,
        source_kind: 'marketplace_checklist',
        source_url: tcgplayerUrl(tcgplayer.productId),
        set_name: set.set_name,
        card_number: card.number ?? card.printedNumber,
        card_name: card.name,
        finish_key: finishKey,
        rarity: card.rarity ?? null,
        evidence_type: 'finish_presence',
        evidence_label: `TCGplayer marketplace product ${tcgplayer.productId} is linked by ThePriceDex for ${card.name} #${card.number ?? card.printedNumber} with ${finishKey} finish.`,
        notes: `Generated only for an existing ThePriceDex exact variant fact. ThePriceDex source page: ${priceDexUrl}`,
      });
    }
  }
  return records;
}

async function writeFixture(set, records, generatedAt, dryRun) {
  if (records.length === 0 || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `tcgplayer_pricedex_links_${set.key}`,
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.tcgplayer.com/',
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:tcgplayer_pricedex_links:${set.key}:${generatedAt}`,
    generation_note: 'Generated from ThePriceDex exact variant marketplace metadata. Does not create new finish facts; only supports existing ThePriceDex exact variant facts with linked TCGplayer product IDs.',
    records,
  };
  const file = path.join(FIXTURE_DIR, `${set.key}.json`);
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeReports({ results, fixtureFiles, generatedAt, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'english_master_index_tcgplayer_pricedex_link_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    rule: 'TCGplayer product evidence is generated only for existing ThePriceDex exact variant facts with linked TCGplayer product IDs. It does not create new finish facts.',
    summary: {
      sets_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'tcgplayer_pricedex_link_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const setRows = results.map((row) => [
    row.set_key,
    row.set_name,
    row.status,
    row.target_facts,
    row.records_generated,
    row.error ?? '',
  ]);
  const markdown = [
    '# TCGplayer PriceDex Link Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['sets_attempted', payload.summary.sets_attempted],
      ['records_generated', payload.summary.records_generated],
      ['fixture_files_written', payload.summary.fixture_files_written],
      ['by_status', JSON.stringify(payload.summary.by_status)],
    ]),
    '',
    '## Sets',
    '',
    markdownTable(['set_key', 'set_name', 'status', 'target_facts', 'records_generated', 'error'], setRows),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'tcgplayer_pricedex_link_acquisition_v1.md'), markdown);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const printings = JSON.parse(await fs.readFile(PRINTINGS_PATH, 'utf8'));
  const setsArtifact = JSON.parse(await fs.readFile(SETS_PATH, 'utf8'));
  const setsByKey = new Map((setsArtifact.sets ?? []).map((set) => [set.key, set]));
  let targetBySet = [...setTargets(targetFacts(printings)).entries()]
    .filter(([setKey]) => {
      if (!options.sets) return true;
      const set = setsByKey.get(setKey);
      return options.sets.has(normalizeText(setKey)) || options.sets.has(normalizeText(set?.set_name));
    })
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (Number.isFinite(options.maxSets) && options.maxSets > 0) targetBySet = targetBySet.slice(0, options.maxSets);
  console.log(`[tcgplayer-pricedex] target sets ${targetBySet.length}`);

  if (!options.dryRun) await fs.rm(FIXTURE_DIR, { recursive: true, force: true });

  const results = [];
  const fixtureFiles = [];
  for (const [setKey, facts] of targetBySet) {
    const set = setsByKey.get(setKey);
    if (!set) {
      results.push({ set_key: setKey, set_name: null, status: 'set_config_missing', target_facts: facts.length, records_generated: 0, error: 'set config missing' });
      continue;
    }
    console.log(`[tcgplayer-pricedex] ${set.key} ${set.set_name} target facts ${facts.length}`);
    const fetched = await fetchThePriceDexCards(set);
    if (fetched.error) {
      results.push({ set_key: set.key, set_name: set.set_name, status: 'source_unavailable', target_facts: facts.length, records_generated: 0, error: fetched.error });
      continue;
    }
    const records = buildRecordsForSet({ set, facts, cards: fetched.cards, priceDexUrl: fetched.url });
    const fixtureFile = await writeFixture(set, records, generatedAt, options.dryRun);
    fixtureFiles.push(fixtureFile);
    results.push({
      set_key: set.key,
      set_name: set.set_name,
      status: records.length > 0 ? 'generated' : 'no_linked_product_ids',
      target_facts: facts.length,
      records_generated: records.length,
      source_url: fetched.url,
      fixture_file: fixtureFile,
    });
    await sleep(150);
  }

  const report = await writeReports({ results, fixtureFiles, generatedAt, dryRun: options.dryRun });
  console.log(`[tcgplayer-pricedex] records ${report.summary.records_generated}`);
  console.log(`[tcgplayer-pricedex] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
