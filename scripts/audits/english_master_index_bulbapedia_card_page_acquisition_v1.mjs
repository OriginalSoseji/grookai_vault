import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_card_pages_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_card_page_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const SOURCE_KEY = 'bulbapedia_card_page_release_info';
const BULBAPEDIA_INDEX = 'https://bulbapedia.bulbagarden.net/w/index.php';
const BULBAPEDIA_WIKI = 'https://bulbapedia.bulbagarden.net/wiki';

const execFileAsync = promisify(execFile);

const PROMO_TITLE_SET = {
  basep: 'Wizards Promo',
  bwp: 'BW Promo',
  dpp: 'DP Promo',
  ex1: 'EX Ruby & Sapphire',
  ex2: 'EX Sandstorm',
  ex3: 'EX Dragon',
  ex4: 'EX Team Magma vs Team Aqua',
  ex5: 'EX Hidden Legends',
  ex6: 'EX FireRed & LeafGreen',
  ex7: 'EX Team Rocket Returns',
  ex8: 'EX Deoxys',
  ex9: 'EX Emerald',
  ex10: 'EX Unseen Forces',
  ex11: 'EX Delta Species',
  ex12: 'EX Legend Maker',
  ex13: 'EX Holon Phantoms',
  ex14: 'EX Crystal Guardians',
  ex15: 'EX Dragon Frontiers',
  ex16: 'EX Power Keepers',
  hsp: 'HGSS Promo',
  mep: 'MEP Promo',
  np: 'Nintendo Promo',
  smp: 'SM Promo',
  swshp: 'SWSH Promo',
  svp: 'SVP Promo',
  xyp: 'XY Promo',
};

const TARGET_SET_ALIASES = {
  basep: ['Wizards Black Star Promos', 'Wizards Promo'],
  bwp: ['BW Black Star Promos', 'BW Promo'],
  dpp: ['DP Black Star Promos', 'DP Promo'],
  ex1: ['EX Ruby & Sapphire', 'Ruby & Sapphire'],
  ex2: ['EX Sandstorm', 'Sandstorm'],
  ex3: ['EX Dragon', 'Dragon'],
  ex4: ['EX Team Magma vs Team Aqua', 'Team Magma vs Team Aqua'],
  ex5: ['EX Hidden Legends', 'Hidden Legends'],
  ex6: ['EX FireRed & LeafGreen', 'FireRed & LeafGreen'],
  ex7: ['EX Team Rocket Returns', 'Team Rocket Returns'],
  ex8: ['EX Deoxys', 'Deoxys'],
  ex9: ['EX Emerald', 'Emerald'],
  ex10: ['EX Unseen Forces', 'Unseen Forces'],
  ex11: ['EX Delta Species', 'Delta Species'],
  ex12: ['EX Legend Maker', 'Legend Maker'],
  ex13: ['EX Holon Phantoms', 'Holon Phantoms'],
  ex14: ['EX Crystal Guardians', 'Crystal Guardians'],
  ex15: ['EX Dragon Frontiers', 'Dragon Frontiers'],
  ex16: ['EX Power Keepers', 'Power Keepers'],
  hsp: ['HGSS Black Star Promos', 'HGSS Promo'],
  mep: ['MEP Black Star Promos', 'MEP Promo'],
  np: ['Nintendo Black Star Promos', 'Nintendo Promo'],
  smp: ['SM Black Star Promos', 'SM Promo'],
  swshp: ['SWSH Black Star Promos', 'SWSH Promo'],
  svp: ['SVP Black Star Promos', 'SV Black Star Promos', 'SVP Promo', 'SV Promo'],
  xyp: ['XY Black Star Promos', 'XY Promo'],
};

function parseArgs(argv) {
  const options = { sets: null, dryRun: false, refreshCache: false, maxPages: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else if (arg === '--max-pages') {
      options.maxPages = Number(next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberComparable(value) {
  const normalized = normalizeNumber(value);
  const suffix = normalized.match(/[A-Z]*0*(\d+[a-z]?)$/i);
  return suffix ? suffix[1].toLowerCase() : normalized.toLowerCase();
}

function rawNumber(value) {
  return String(value ?? '').trim().split('/')[0].replace(/^0+(?=\d)/, '');
}

function titleCardName(value) {
  return String(value ?? '')
    .trim()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, '_')
    .replace(/♀/g, '%E2%99%80')
    .replace(/♂/g, '%E2%99%82');
}

function titleSetName(row) {
  return PROMO_TITLE_SET[row.set_key] ?? row.set_name;
}

function cardPageTitle(row) {
  const number = rawNumber(row.card_number).replace(/^[A-Z]+/i, '').replace(/^0+(?=\d)/, '');
  return `${titleCardName(row.card_name)}_(${titleSetName(row).replace(/\s+/g, '_')}_${number})`;
}

function rawUrlForTitle(title) {
  return `${BULBAPEDIA_INDEX}?title=${encodeURIComponent(title)}&action=raw`;
}

function sourceUrlForTitle(title) {
  return `${BULBAPEDIA_WIKI}/${encodeURIComponent(title)}`;
}

function cacheNameForTitle(title) {
  return `${title.replace(/[^A-Za-z0-9_.-]+/g, '_')}.txt`;
}

function redirectTitle(raw) {
  const match = String(raw ?? '').match(/#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  return match ? match[1].trim().replace(/\s+/g, '_') : null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchViaCurl(url) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '45',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: 60000, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

async function fetchRawPage(title, options, redirects = 0) {
  const cacheFile = path.join(CACHE_DIR, cacheNameForTitle(title));
  if (!options.refreshCache) {
    try {
      const raw = await fs.readFile(cacheFile, 'utf8');
      return { title, raw, source_url: sourceUrlForTitle(title), from_cache: true };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const raw = await fetchViaCurl(rawUrlForTitle(title));
  const redirected = redirectTitle(raw);
  if (redirected && redirects < 3) return fetchRawPage(redirected, options, redirects + 1);
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, raw);
  }
  return { title, raw, source_url: sourceUrlForTitle(title), from_cache: false };
}

function targetFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => ['card_identity_second_source_needed', 'finish_human_checklist_evidence_needed', 'finish_second_source_needed'].includes(row.gap_type))
    .filter((row) => row.card_number && row.card_name)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)))
    .filter((row) => {
      if (row.fact_type === 'card_identity') return true;
      return ['stamped', 'cosmos', 'normal', 'holo', 'reverse'].includes(normalizeFinishKey(row.finish_key));
    });
}

function factKey(row) {
  return [
    row.fact_type,
    row.set_key,
    numberComparable(row.card_number),
    comparable(row.card_name),
    normalizeFinishKey(row.finish_key) ?? '',
  ].join('|');
}

function fixtureRecordKey(row) {
  return [
    row.source_key,
    row.set_key,
    numberComparable(row.card_number),
    comparable(row.card_name),
    normalizeFinishKey(row.finish_key) ?? '',
    row.evidence_type,
  ].join('|');
}

function targetSetNames(row) {
  return [row.set_name, ...(TARGET_SET_ALIASES[row.set_key] ?? [])].map(comparable);
}

function expansionBlocks(raw) {
  const blocks = [];
  const lines = String(raw ?? '').split(/\r?\n/).filter((line) => line.includes('{{PokémoncardInfobox/Expansion|'));
  for (const line of lines) {
    const block = line.replace(/^.*?\{\{PokémoncardInfobox\/Expansion\|/, '').replace(/\}\}\s*$/, '');
    const cardNo = block.match(/\|cardno=([^|}]+)/i)?.[1]?.trim();
    const expansions = [];
    for (const exp of block.matchAll(/\|(?:expansion|deck)=\{\{TCG\|([^|}]+)(?:\|([^}]+))?\}\}/gi)) {
      expansions.push((exp[2] ?? exp[1]).trim());
    }
    blocks.push({ block, card_number: cardNo, expansions });
  }
  return blocks;
}

function pageSupportsTarget(raw, row) {
  const wantedNumbers = new Set([numberComparable(row.card_number), rawNumber(row.card_number).toLowerCase()]);
  const wantedSets = new Set(targetSetNames(row));
  return expansionBlocks(raw).some((block) => {
    const blockNumber = numberComparable(block.card_number);
    if (!wantedNumbers.has(blockNumber)) return false;
    return block.expansions.some((name) => wantedSets.has(comparable(name)));
  });
}

function releaseInformation(raw) {
  const text = String(raw ?? '');
  const start = text.indexOf('==Release information==');
  if (start === -1) return '';
  const end = text.indexOf('\n==', start + '==Release information=='.length);
  return text.slice(start, end === -1 ? text.length : end);
}

function cleanSnippet(value) {
  return String(value ?? '')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<ref[\s\S]*?<\/ref>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
}

function isEnglishScopedEvidence(snippet) {
  const text = String(snippet ?? '');
  if (/\b(?:Japanese|Japan|Pokémon Card Gym|Daiichi|CoroCoro|Sealed Battle|Shield Battle|Gym Challenge)\b/i.test(text)) {
    return /\b(?:outside of Japan|North America|United States|Canada|Australia|Europe|United Kingdom)\b/i.test(text);
  }
  return true;
}

function evidenceSentence(normalized, pattern) {
  return normalized.match(new RegExp(`[^.]*?${pattern}[^.]*\\.`, 'i'))?.[0] ?? normalized;
}

function evidenceSentences(normalized, pattern) {
  const matcher = new RegExp(pattern, 'i');
  const sentences = String(normalized ?? '')
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => matcher.test(sentence));
  return sentences.length > 0 ? sentences : [normalized];
}

function cardStampOrLogoSentence(normalized) {
  return evidenceSentences(normalized, '(?:stamp(?:ed)?|logo)')
    .find((sentence) => {
      if (!isEnglishScopedEvidence(sentence)) return false;
      if (/\bStamp Rally\b/i.test(sentence)) return false;
      if (/\b(?:Cracked Ice|Line Holofoil|Mirage Holofoil|Cosmos Holofoil|Reverse Holofoil|Parallel Holofoil)\b/i.test(sentence)) return false;
      return /(?:with|featuring|bearing|includes?|has)[^.]{0,140}\b(?:stamp(?:ed)?|logo)\b/i.test(sentence)
        || /\b(?:stamp(?:ed)?|logo)\b[^.]{0,140}\b(?:artwork|card|corner|bottom|top|left|right)\b/i.test(sentence);
    }) ?? null;
}

function finishEvidenceForRow(raw, row) {
  const finishKey = normalizeFinishKey(row.finish_key);
  const release = releaseInformation(raw);
  if (!release) return null;
  const normalized = release.replace(/\s+/g, ' ');

  if (finishKey === 'stamped') {
    const snippet = cardStampOrLogoSentence(normalized);
    if (!snippet) return null;
    return {
      evidence_type: 'finish_presence',
      evidence_label: 'Bulbapedia card page release information stamp/logo variant',
      notes: `Release information explicitly documents an English-scoped stamp/logo variant. Evidence: ${cleanSnippet(snippet)}`,
    };
  }

  if (finishKey === 'cosmos') {
    if (!/\bCosmos\s+Holofoil\b/i.test(normalized)) return null;
    const snippet = evidenceSentence(normalized, 'Cosmos\\s+Holofoil');
    if (!isEnglishScopedEvidence(snippet)) return null;
    return {
      evidence_type: 'finish_presence',
      evidence_label: 'Bulbapedia card page release information Cosmos Holofoil version',
      notes: `Release information explicitly documents an English-scoped Cosmos Holofoil version. Evidence: ${cleanSnippet(snippet)}`,
    };
  }

  if (finishKey === 'normal') {
    if (!/\b(?:Non[-\s]?Holofoil|Non[-\s]?Holo|nonholo)\b/i.test(normalized)) return null;
    const snippet = evidenceSentence(normalized, '(?:Non[-\\s]?Holofoil|Non[-\\s]?Holo|nonholo)');
    if (!isEnglishScopedEvidence(snippet)) return null;
    return {
      evidence_type: 'finish_presence',
      evidence_label: 'Bulbapedia card page release information Non Holofoil version',
      notes: `Release information explicitly documents an English-scoped Non Holofoil version. Evidence: ${cleanSnippet(snippet)}`,
    };
  }

  if (finishKey === 'reverse') {
    if (!/\b(?:Reverse\s+Holofoil|Parallel\s+Holofoil)\b/i.test(normalized)) return null;
    const snippet = evidenceSentence(normalized, '(?:Reverse\\s+Holofoil|Parallel\\s+Holofoil)');
    if (!isEnglishScopedEvidence(snippet)) return null;
    return {
      evidence_type: 'finish_presence',
      evidence_label: 'Bulbapedia card page release information reverse/parallel Holofoil version',
      notes: `Release information explicitly documents an English-scoped Reverse or Parallel Holofoil version. Evidence: ${cleanSnippet(snippet)}`,
    };
  }

  if (finishKey === 'holo') {
    if (!/\b(?:Holofoil|Holographic)\b/i.test(normalized)) return null;
    const snippet = evidenceSentence(normalized, '(?:Holofoil|Holographic)');
    if (!isEnglishScopedEvidence(snippet)) return null;
    if (/\b(?:Cracked Ice|Line Holofoil|Mirage Holofoil|Cosmos Holofoil|Reverse Holofoil|Parallel Holofoil)\b/i.test(snippet)) {
      return null;
    }
    return {
      evidence_type: 'finish_presence',
      evidence_label: 'Bulbapedia card page release information Holofoil version',
      notes: `Release information explicitly documents an English-scoped Holofoil/Holographic version. Evidence: ${cleanSnippet(snippet)}`,
    };
  }

  return null;
}

function identityEvidenceForRow(raw, row) {
  if (!pageSupportsTarget(raw, row)) return null;
  return {
    evidence_type: 'card_identity',
    evidence_label: 'Bulbapedia card page expansion metadata',
    notes: 'Card page expansion metadata matches the target set and card number. This row supports card identity only, not finish truth.',
  };
}

function buildRecordsForFacts(page, facts, generatedAt) {
  const records = [];
  const ignored = [];
  for (const fact of facts) {
    if (!pageSupportsTarget(page.raw, fact)) {
      ignored.push({ gap_key: factKey(fact), reason: 'page_expansion_metadata_did_not_match_target_set_number' });
      continue;
    }
    const evidence = fact.fact_type === 'card_identity'
      ? identityEvidenceForRow(page.raw, fact)
      : finishEvidenceForRow(page.raw, fact);
    if (!evidence) {
      ignored.push({ gap_key: factKey(fact), reason: 'no_explicit_target_finish_language' });
      continue;
    }
    records.push({
      source_key: SOURCE_KEY,
      source_kind: 'human_readable_checklist',
      source_url: page.source_url,
      set_key: fact.set_key,
      set_name: fact.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: fact.fact_type === 'card_identity' ? null : normalizeFinishKey(fact.finish_key),
      rarity: null,
      evidence_type: evidence.evidence_type,
      evidence_label: evidence.evidence_label,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `bulbapedia_card_page:${page.title}:${fact.set_key}:${fact.card_number}:${normalizeFinishKey(fact.finish_key) ?? 'identity'}`,
      notes: evidence.notes,
    });
  }
  return { records, ignored };
}

async function readExistingFixture(file) {
  try {
    const fixture = JSON.parse(await fs.readFile(file, 'utf8'));
    return fixture.records ?? [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeFixture(setKey, setName, records, generatedAt, dryRun) {
  if (!records.length || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${setKey}.json`);
  const existing = await readExistingFixture(file);
  const merged = [...new Map([...existing, ...records].map((record) => [fixtureRecordKey(record), record])).values()]
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key ?? '').localeCompare(String(b.finish_key ?? '')));
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `bulbapedia_card_page_${setKey}`,
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Category:Pokémon_cards',
    source_status: 'available_generated',
    set_key: setKey,
    set_name: setName,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:bulbapedia_card_page:${setKey}:${generatedAt}`,
    generation_note: 'Generated from Bulbapedia individual card page expansion metadata and release-information text. Exact set/number match is required; finish truth is emitted only for explicit finish/stamp/logo wording.',
    records: merged,
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeReports({ generatedAt, results, records, fixtureFiles, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'english_master_index_bulbapedia_card_page_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_key: SOURCE_KEY,
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Category:Pokémon_cards',
    summary: {
      pages_attempted: results.length,
      records_generated: records.length,
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(records.filter((row) => row.finish_key), (row) => row.finish_key),
      by_evidence_type: countBy(records, (row) => row.evidence_type),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
    records,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'bulbapedia_card_page_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const rows = results
    .filter((row) => row.records_generated || row.status !== 'source_unavailable')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.status, row.target_facts, row.records_generated, row.source_url]);
  const md = [
    '# Bulbapedia Card Page Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    'The adapter requires card-page expansion metadata to match set and number before it emits evidence. Finish rows require explicit release-information wording such as stamp/logo, Cosmos Holofoil, Non Holofoil, or Holofoil.',
    '',
    `Generated: ${generatedAt}`,
    '',
    markdownTable(['set', 'number', 'card', 'status', 'target facts', 'records', 'source URL'], rows.slice(0, 120)),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'bulbapedia_card_page_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const gaps = await readJson(GAPS_PATH);
  const facts = targetFacts(gaps, options);
  const factsByTitle = new Map();
  for (const fact of facts) {
    const title = cardPageTitle(fact);
    if (!factsByTitle.has(title)) factsByTitle.set(title, []);
    factsByTitle.get(title).push(fact);
  }
  let entries = [...factsByTitle.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (options.maxPages) entries = entries.slice(0, options.maxPages);

  console.log(`[bulbapedia-card-page] target facts ${facts.length}`);
  console.log(`[bulbapedia-card-page] target pages ${entries.length}`);

  const results = [];
  const allRecords = [];
  for (const [title, titleFacts] of entries) {
    const first = titleFacts[0];
    let result;
    try {
      const page = await fetchRawPage(title, options);
      if (/^#REDIRECT/i.test(page.raw) || !page.raw.trim() || /There is currently no text in this page/i.test(page.raw)) {
        result = {
          title,
          set_key: first.set_key,
          set_name: first.set_name,
          card_number: first.card_number,
          card_name: first.card_name,
          status: 'source_unavailable',
          target_facts: titleFacts.length,
          records_generated: 0,
          source_url: sourceUrlForTitle(title),
          ignored: [],
        };
      } else {
        const built = buildRecordsForFacts(page, titleFacts, generatedAt);
        allRecords.push(...built.records);
        result = {
          title: page.title,
          requested_title: title,
          set_key: first.set_key,
          set_name: first.set_name,
          card_number: first.card_number,
          card_name: first.card_name,
          status: built.records.length ? 'generated' : 'no_exact_finish_or_identity_evidence',
          target_facts: titleFacts.length,
          records_generated: built.records.length,
          source_url: page.source_url,
          from_cache: page.from_cache,
          ignored: built.ignored.slice(0, 20),
        };
      }
    } catch (error) {
      result = {
        title,
        set_key: first.set_key,
        set_name: first.set_name,
        card_number: first.card_number,
        card_name: first.card_name,
        status: 'source_error',
        target_facts: titleFacts.length,
        records_generated: 0,
        source_url: sourceUrlForTitle(title),
        error: String(error?.message ?? error),
        ignored: [],
      };
    }
    results.push(result);
    if (result.records_generated || result.status === 'source_error') {
      console.log(`[bulbapedia-card-page] ${first.set_key} ${first.card_number} ${first.card_name} ${result.status} records ${result.records_generated}`);
    }
    await sleep(125);
  }

  const records = [...new Map(allRecords.map((record) => [fixtureRecordKey(record), record])).values()];
  const recordsBySet = new Map();
  for (const record of records) {
    if (!recordsBySet.has(record.set_key)) recordsBySet.set(record.set_key, []);
    recordsBySet.get(record.set_key).push(record);
  }

  const fixtureFiles = [];
  for (const [setKey, setRecords] of recordsBySet.entries()) {
    fixtureFiles.push(await writeFixture(setKey, setRecords[0].set_name, setRecords, generatedAt, options.dryRun));
  }

  const report = await writeReports({ generatedAt, results, records, fixtureFiles, dryRun: options.dryRun });
  console.log(`[bulbapedia-card-page] records ${report.summary.records_generated}`);
  console.log(`[bulbapedia-card-page] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error('[bulbapedia-card-page] failed:', error);
  process.exitCode = 1;
});
