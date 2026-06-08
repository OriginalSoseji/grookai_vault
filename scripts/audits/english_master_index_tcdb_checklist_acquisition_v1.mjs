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

const execFileAsync = promisify(execFile);

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcdb_checklists_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcdb_checklist_acquisition_v1';
const BASE_URL = 'https://www.tcdb.com';
const SOURCE_KEY = 'tcdb_checklist';

function parseArgs(argv) {
  const options = { sets: null, maxSets: null, concurrency: 2, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--max-sets') {
      options.maxSets = Number(next);
      index += 1;
    } else if (arg === '--concurrency') {
      options.concurrency = Math.max(1, Number(next));
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&#233;/g, 'é')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeUrlText(value) {
  try {
    return decodeURIComponent(String(value ?? ''));
  } catch {
    return String(value ?? '');
  }
}

function stripHtml(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]+>/g, ' '));
}

function comparable(value) {
  return normalizeText(value)
    .replace(/\bpok[eé]mon\b/g, ' ')
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bex\b/g, ' ')
    .replace(/\bblack star\b/g, ' ')
    .replace(/\bpromos?\b/g, ' promo ')
    .replace(/\bcollection\b/g, ' ')
    .replace(/\bset\b/g, ' ')
    .replace(/\btrainer kit\b/g, ' trainer kit ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\bex\b/g, ' ex ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNonEnglishTitle(title) {
  return /\((?:japanese|korean|french|german|spanish|italian|chinese|dutch|portuguese|thai|indonesian)\)/i.test(title);
}

function finishFromTcdbTitle(title) {
  const normalized = normalizeText(title);
  if (/\bmaster ball\b/.test(normalized)) return 'masterball';
  if (/\bpoke ball\b|\bpokeball\b/.test(normalized)) return 'pokeball';
  if (/\brocket\b/.test(normalized) && /\breverse\b/.test(normalized)) return 'rocket_reverse';
  if (/\breverse\b/.test(normalized) && /\bholo/.test(normalized)) return 'reverse';
  if (/\bgalaxy holo\b|\bcosmos holo\b/.test(normalized)) return 'cosmos';
  if (/\bcracked ice\b/.test(normalized)) return 'cracked_ice';
  if (/\bstamped\b|\bstamp\b/.test(normalized)) return 'stamped';
  if (/\benergy holo\b|\s-\sholo\b/.test(normalized) && !/\breverse\b/.test(normalized)) return 'holo';
  return null;
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function cardKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
  ].join('|');
}

async function fetchText(url) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '60',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: 70000, maxBuffer: 30 * 1024 * 1024 });
  return stdout;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

function searchUrl(query) {
  const url = new URL(`${BASE_URL}/Search.cfm`);
  url.searchParams.set('SearchCategory', 'Gaming');
  url.searchParams.set('q', query);
  return url.toString();
}

function parseSearchLinks(html) {
  const links = [];
  const seen = new Set();
  const regex = /<a\s+href="(\/ViewSet\.cfm\/sid\/(\d+)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of String(html ?? '').matchAll(regex)) {
    const href = decodeHtml(match[1]);
    const sid = match[2];
    const title = stripHtml(match[3]);
    if (!title || seen.has(sid) || isNonEnglishTitle(title)) continue;
    seen.add(sid);
    const checklistHref = href.replace('/ViewSet.cfm/', '/Checklist.cfm/');
    links.push({
      sid,
      title,
      finish_key: finishFromTcdbTitle(title),
      view_url: `${BASE_URL}${href}`,
      checklist_url: `${BASE_URL}${checklistHref}`,
    });
  }
  return links;
}

function scoreLink(set, link, wantedFinish) {
  const setTokens = comparable(set.set_name).split(' ').filter((token) => token.length > 2);
  const titleText = comparable(link.title);
  let score = 0;
  for (const token of setTokens) {
    if (titleText.includes(token)) score += 3;
  }
  if (/pokemon|pokémon/i.test(link.title)) score += 4;
  if (wantedFinish && link.finish_key === wantedFinish) score += 30;
  if (!wantedFinish && !link.finish_key) score += 5;
  if (isNonEnglishTitle(link.title)) score -= 100;
  return score;
}

function targetFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish' || row.gap_type === 'card_identity_second_source_needed')
    .filter((row) => row.card_number && row.card_name)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function queriesForSet(set, facts) {
  const finishes = [...new Set(facts.map((row) => normalizeFinishKey(row.finish_key)).filter(Boolean))];
  const setNames = new Set([set.set_name]);
  if (/^ex\d+/i.test(set.key) && !/\bex\b/i.test(set.set_name)) setNames.add(`EX ${set.set_name}`);
  for (const name of [...setNames]) {
    setNames.add(String(name).replace(/\s*&\s*/g, ' ').replace(/\s+/g, ' ').trim());
  }
  const queries = new Set([...setNames].map((name) => `${name} Pokemon`));
  for (const finish of finishes) {
    for (const name of setNames) {
      if (finish === 'reverse') queries.add(`${name} Pokemon Reverse Holo`);
      if (finish === 'holo') queries.add(`${name} Pokemon Holo`);
      if (finish === 'cosmos') queries.add(`${name} Pokemon Galaxy Holo`);
      if (finish === 'pokeball') queries.add(`${name} Pokemon Poke Ball Reverse Holo`);
      if (finish === 'masterball') queries.add(`${name} Pokemon Master Ball Reverse Holo`);
      if (finish === 'rocket_reverse') queries.add(`${name} Pokemon Rocket Reverse Holo`);
      if (finish === 'stamped') queries.add(`${name} Pokemon Stamped`);
    }
  }
  return [...queries];
}

function parseChecklistRows(html) {
  const rows = [];
  const seen = new Set();
  function addRow(row) {
    const cardNumber = normalizeNumber(row.card_number);
    const cardName = cardComparable(row.card_name);
    if (!cardNumber || !cardName) return;
    const key = `${cardNumber}|${cardName}|${row.source_url}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  }

  for (const match of String(html ?? '').matchAll(/href="(\/ViewCard\.cfm\/sid\/\d+\/cid\/\d+\/([^"?]+)\?PageIndex=\d+)"/g)) {
    const href = decodeHtml(match[1]);
    const slug = decodeUrlText(decodeHtml(match[2]));
    const parsed = slug.match(/-([A-Z]*0*\d+[A-Za-z]*\/\d+)-(.+)$/i);
    if (!parsed) continue;
    addRow({
      card_number: parsed[1].split('/')[0],
      card_name: parsed[2].replace(/-/g, ' ').trim(),
      source_url: `${BASE_URL}${href}`,
      rarity: null,
    });
  }

  for (const match of String(html ?? '').matchAll(/<tr\b[\s\S]*?<\/tr>/g)) {
    const rowHtml = match[0];
    if (!/\/ViewCard\.cfm\/sid\//.test(rowHtml)) continue;
    const numberMatch = rowHtml.match(/<td[^>]*nowrap[^>]*valign="top"[^>]*>\s*<a\s+href="([^"]+)">([^<]+)<\/a>/i);
    const nameBlock = rowHtml.match(/<td[^>]*width="90%"[^>]*>([\s\S]*?)<\/td>/i);
    if (!numberMatch || !nameBlock) continue;
    const cardNumber = stripHtml(numberMatch[2]).split('/')[0].trim();
    const nameMatch = nameBlock[1].match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
    const cardName = stripHtml(nameMatch?.[1] ?? '');
    if (!cardNumber || !cardName) continue;
    const cardUrl = `${BASE_URL}${decodeHtml(numberMatch[1])}`;
    const rarity = stripHtml(nameBlock[1].match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? '') || null;
    addRow({ card_number: cardNumber, card_name: cardName, source_url: cardUrl, rarity });
  }
  return rows;
}

async function fetchChecklistRows(link) {
  const rows = [];
  const seen = new Set();
  for (let page = 1; page <= 12; page += 1) {
    const url = `${link.checklist_url}?PageIndex=${page}`;
    const html = await fetchText(url);
    const pageRows = parseChecklistRows(html);
    let added = 0;
    for (const row of pageRows) {
      const key = `${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}|${row.source_url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
      added += 1;
    }
    if (page > 1 && added === 0) break;
    if (!html.includes(`PageIndex=${page + 1}`)) break;
  }
  return rows;
}

function buildFixtureRecord({ set, row, fact, link, retrievedAt }) {
  const finishKey = normalizeFinishKey(fact.finish_key);
  return {
    source_key: SOURCE_KEY,
    source_kind: 'collector_reference',
    source_url: row.source_url,
    set_key: set.key,
    set_name: set.set_name,
    card_number: fact.card_number,
    card_name: fact.card_name,
    finish_key: finishKey || null,
    rarity: row.rarity,
    evidence_type: finishKey ? 'finish_presence' : 'card_identity',
    evidence_label: finishKey
      ? `TCDB checklist ${link.title} ${fact.card_number} ${fact.card_name}`
      : `TCDB checklist ${link.title} ${fact.card_number} ${fact.card_name}`,
    language: 'en',
    retrieved_at: retrievedAt,
    raw_snapshot_ref: `tcdb:${link.sid}:${normalizeNumber(fact.card_number)}:${finishKey || 'identity'}`,
    notes: finishKey
      ? 'Exact card-level finish evidence from a TCDB checklist whose set title explicitly names this finish/variant. No era, rarity, or default-finish inference was used.'
      : 'Card identity evidence from a TCDB checklist row. No finish truth was inferred.',
  };
}

async function writeFixture(set, records, retrievedAt, dryRun) {
  if (records.length === 0 || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const file = path.join(FIXTURE_DIR, `${set.key}.json`);
  let existing = [];
  try {
    existing = (JSON.parse(await fs.readFile(file, 'utf8')).records ?? []);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const byKey = new Map();
  for (const record of [...existing, ...records]) {
    byKey.set([
      record.source_key,
      record.set_key,
      normalizeNumber(record.card_number),
      cardComparable(record.card_name),
      normalizeFinishKey(record.finish_key),
      record.evidence_type,
    ].join('|'), record);
  }
  const merged = [...byKey.values()].sort((left, right) => {
    return String(normalizeNumber(left.card_number)).localeCompare(String(normalizeNumber(right.card_number)), undefined, { numeric: true })
      || String(left.finish_key ?? '').localeCompare(String(right.finish_key ?? ''));
  });
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `tcdb_checklist_${set.key}`,
    source_kind: 'collector_reference',
    source_url: BASE_URL,
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: retrievedAt,
    raw_snapshot_ref: `generated_fixture:tcdb:${set.key}:${retrievedAt}`,
    generation_note: 'Generated from TCDB checklist pages. Finish evidence is emitted only when TCDB set title explicitly names the finish/variant.',
    records: merged,
  };
  await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  return file;
}

async function runSet(set, facts, options, retrievedAt) {
  const statuses = [];
  const linksBySid = new Map();
  const wantedFinishes = new Set(facts.map((row) => normalizeFinishKey(row.finish_key)).filter(Boolean));
  const wantsIdentity = facts.some((row) => row.gap_type === 'card_identity_second_source_needed');
  for (const query of queriesForSet(set, facts)) {
    try {
      const html = await fetchText(searchUrl(query));
      const links = parseSearchLinks(html);
      for (const link of links) {
        if (link.finish_key && !wantedFinishes.has(link.finish_key)) continue;
        if (!link.finish_key && !wantsIdentity) continue;
        const bestScore = Math.max(0, ...[...wantedFinishes, null].map((finish) => scoreLink(set, link, finish)));
        if (bestScore >= 9) linksBySid.set(link.sid, link);
      }
      statuses.push({ query, status: links.length ? 'search_results' : 'no_search_results', result_count: links.length });
    } catch (error) {
      statuses.push({ query, status: 'source_unavailable', error: String(error?.message ?? error) });
    }
  }

  const factByFinishKey = new Map(facts.filter((row) => row.fact_type === 'printing_finish').map((row) => [factKey(row), row]));
  const factByCardKey = new Map(facts.map((row) => [cardKey(row), row]));
  const records = [];
  const matched = [];
  const noMatches = [];

  for (const link of linksBySid.values()) {
    let rows = [];
    try {
      rows = await fetchChecklistRows(link);
    } catch (error) {
      statuses.push({ query: link.title, status: 'checklist_unavailable', error: String(error?.message ?? error) });
      continue;
    }

    for (const row of rows) {
      const cardOnlyKey = [
        set.key,
        normalizeNumber(row.card_number),
        cardComparable(row.card_name),
      ].join('|');
      const identityFact = factByCardKey.get(cardOnlyKey);
      if (identityFact?.gap_type === 'card_identity_second_source_needed') {
        records.push(buildFixtureRecord({ set, row, fact: { ...identityFact, finish_key: null }, link, retrievedAt }));
        matched.push({ type: 'card_identity', card_number: identityFact.card_number, card_name: identityFact.card_name, finish_key: null, tcdb_title: link.title });
      }

      if (!link.finish_key) continue;
      const targetKey = [
        set.key,
        normalizeNumber(row.card_number),
        cardComparable(row.card_name),
        normalizeFinishKey(link.finish_key),
      ].join('|');
      const finishFact = factByFinishKey.get(targetKey);
      if (finishFact) {
        records.push(buildFixtureRecord({ set, row, fact: finishFact, link, retrievedAt }));
        matched.push({ type: 'printing_finish', card_number: finishFact.card_number, card_name: finishFact.card_name, finish_key: finishFact.finish_key, tcdb_title: link.title });
      }
    }
  }

  const matchedKeys = new Set(matched.map((row) => `${row.type}|${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}|${normalizeFinishKey(row.finish_key)}`));
  for (const fact of facts) {
    const type = fact.fact_type === 'printing_finish' ? 'printing_finish' : 'card_identity';
    const key = `${type}|${normalizeNumber(fact.card_number)}|${cardComparable(fact.card_name)}|${normalizeFinishKey(fact.finish_key)}`;
    if (!matchedKeys.has(key)) noMatches.push(fact);
  }

  const fixture = await writeFixture(set, records, retrievedAt, options.dryRun);
  return {
    set_key: set.key,
    set_name: set.set_name,
    searched_queries: statuses.length,
    candidate_tcdb_sets: linksBySid.size,
    records_generated: records.length,
    fixture_file: fixture ? path.relative(process.cwd(), fixture) : null,
    statuses,
    matched,
    no_match_count: noMatches.length,
  };
}

async function writeReports(results, retrievedAt) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const summary = {
    target_sets: results.length,
    records_generated: results.reduce((sum, row) => sum + row.records_generated, 0),
    fixtures_written: results.filter((row) => row.fixture_file).length,
    source_unavailable_events: results.flatMap((row) => row.statuses).filter((row) => row.status === 'source_unavailable' || row.status === 'checklist_unavailable').length,
    no_match_sets: results.filter((row) => row.records_generated === 0).length,
  };
  const payload = {
    version: 'english_master_index_tcdb_checklist_acquisition_v1',
    generated_at: retrievedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_key: SOURCE_KEY,
    summary,
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'tcdb_checklist_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const rows = results
    .sort((left, right) => right.records_generated - left.records_generated || left.set_key.localeCompare(right.set_key))
    .slice(0, 80)
    .map((row) => [row.set_key, row.set_name, row.candidate_tcdb_sets, row.records_generated, row.no_match_count, row.fixture_file ?? '']);
  const markdown = [
    '# TCDB Checklist Acquisition V1',
    '',
    `Generated: ${retrievedAt}`,
    '',
    'Audit-only source acquisition. No DB writes, migrations, cleanup, quarantine, or reconciliation were performed.',
    '',
    'Finish evidence is emitted only when TCDB has a checklist set title that explicitly names the finish or variant. Base checklist rows are used for card identity only.',
    '',
    '## Summary',
    '',
    markdownTable(['Metric', 'Value'], [
      ['Target sets', summary.target_sets],
      ['Records generated', summary.records_generated],
      ['Fixtures written', summary.fixtures_written],
      ['Source unavailable events', summary.source_unavailable_events],
      ['No-match sets', summary.no_match_sets],
    ]),
    '',
    '## Top Results',
    '',
    markdownTable(['Set', 'Name', 'TCDB sets', 'Records', 'No-match facts', 'Fixture'], rows),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'tcdb_checklist_acquisition_v1.md'), markdown);
}

async function main() {
  const options = parseArgs(process.argv);
  const retrievedAt = new Date().toISOString();
  const gaps = await readJson(GAPS_PATH);
  const setsPayload = await readJson(SETS_PATH);
  const facts = targetFacts(gaps, options);
  const factsBySet = new Map();
  for (const fact of facts) {
    if (!factsBySet.has(fact.set_key)) factsBySet.set(fact.set_key, []);
    factsBySet.get(fact.set_key).push(fact);
  }
  const setByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  let targets = [...factsBySet.entries()]
    .map(([setKey, setFacts]) => ({ set: setByKey.get(setKey) ?? { key: setKey, set_name: setFacts[0]?.set_name ?? setKey }, facts: setFacts }))
    .sort((left, right) => right.facts.length - left.facts.length || left.set.key.localeCompare(right.set.key));
  if (Number.isFinite(options.maxSets) && options.maxSets > 0) targets = targets.slice(0, options.maxSets);

  const results = await mapWithConcurrency(targets, options.concurrency, ({ set, facts: setFacts }) => runSet(set, setFacts, options, retrievedAt));
  await writeReports(results, retrievedAt);
  console.log(`[tcdb] target_sets ${results.length}`);
  console.log(`[tcdb] records ${results.reduce((sum, row) => sum + row.records_generated, 0)}`);
  console.log(`[tcdb] fixtures ${results.filter((row) => row.fixture_file).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
