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
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_elitefourum_alternate_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/elitefourum_alternate_checklist_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const SOURCE_URL = 'https://www.elitefourum.com/t/updated-6-15-15-alternate-set-card-checklist-english/11788';

const execFileAsync = promisify(execFile);

const SET_ALIASES = {
  'black white base set': 'bw1',
  'black white emerging powers': 'bw2',
  'black white noble victories': 'bw3',
  'black white next destinies': 'bw4',
  'black white dark explorers': 'bw5',
  'black white dragons exalted': 'bw6',
  'black white boundaries crossed': 'bw7',
  'black white plasma storm': 'bw8',
  'black white plasma freeze': 'bw9',
  'black white plasma blast': 'bw10',
  'black white legendary treasures': 'bw11',
  'diamond pearl': 'dp1',
  'diamond pearl mysterious treasures': 'dp2',
  'diamond pearl secret wonders': 'dp3',
  'diamond pearl great encounters': 'dp4',
  'diamond pearl majestic dawn': 'dp5',
  'diamond pearl legends awakened': 'dp6',
  'diamond pearl stormfront': 'dp7',
  'platinum': 'pl1',
  'platinum rising rivals': 'pl2',
  'platinum supreme victors': 'pl3',
  'platinum arceus': 'pl4',
  'heartgold soulsilver': 'hgss1',
  'heartgold soulsilver unleashed': 'hgss2',
  'heartgold soulsilver undaunted': 'hgss3',
  'heartgold soulsilver triumphant': 'hgss4',
  'call of legends': 'col1',
  'ex ruby sapphire': 'ex1',
  'ex sandstorm': 'ex2',
  'ex dragon': 'ex3',
  'ex team magma vs team aqua': 'ex4',
  'ex hidden legends': 'ex5',
  'ex firered leafgreen': 'ex6',
  'ex team rocket returns': 'ex7',
  'ex deoxys': 'ex8',
  'ex emerald': 'ex9',
  'ex unseen forces': 'ex10',
  'ex delta species': 'ex11',
  'ex legend maker': 'ex12',
  'ex holon phantoms': 'ex13',
  'ex crystal guardians': 'ex14',
  'ex dragon frontiers': 'ex15',
  'ex power keepers': 'ex16',
  'wizards black star promos': 'basep',
  'dp black star promos': 'dpp',
  'hgss black star promos': 'hgssp',
  'bw black star promos': 'bwp',
  'xy black star promos': 'xyp',
  'sm black star promos': 'smp',
  'swsh black star promos': 'swshp',
};

function parseArgs(argv) {
  const options = { sets: null, refreshCache: false, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;|&#8217;|&rsquo;|&#8216;|&lsquo;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&nbsp;/g, ' ');
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/\bbase set\b/g, 'base set')
    .replace(/\s+/g, ' ')
    .trim();
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    comparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function identityKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    comparable(row.card_name),
  ].join('|');
}

async function fetchChecklistHtml(options) {
  const cacheFile = path.join(CACHE_DIR, 'elitefourum_alternate_checklist.html');
  if (!options.refreshCache) {
    try {
      return await fs.readFile(cacheFile, 'utf8');
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
    '120',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    SOURCE_URL,
  ], { timeout: 140000, maxBuffer: 20 * 1024 * 1024 });
  const html = stdout.toString('utf8');
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, html);
  }
  return html;
}

function htmlToText(html) {
  return decodeHtml(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|blockquote|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function normalizeHeading(value) {
  return setComparable(String(value ?? '')
    .replace(/\*/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/:$/, '')
    .trim());
}

function setKeyForHeading(heading) {
  const normalized = normalizeHeading(heading);
  if (SET_ALIASES[normalized]) return SET_ALIASES[normalized];
  if (normalized.startsWith('black white ')) {
    const compact = normalized.replace(/^black white /, 'black white ');
    return SET_ALIASES[compact] ?? null;
  }
  return null;
}

function splitChecklistEntries(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/([A-Za-z0-9&'’éÉ -]+:)\s*/g, '\n$1\n')
    .split(/(?=)/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(''));
}

function parseEntry(entry, currentHeading) {
  const normalizedEntry = entry.replace(/^\s*/, '').trim();
  const match = normalizedEntry.match(/^([A-Z]*\s*)?([A-Z]{0,5}\d+[a-z]?|\d+[a-z]?|[A-Z]+[A-Z0-9]*\d*)\s*\/\s*([A-Z0-9]+)?\s+(.+?)\s*\[([^\]]+)\]/i);
  if (!match) return null;
  const number = match[2].trim();
  const cardName = match[4].replace(/^\*/, '').trim();
  const label = match[5].trim();
  const setKey = setKeyForHeading(currentHeading);
  if (!setKey) return null;
  return {
    set_key: setKey,
    set_heading: currentHeading,
    card_number: number,
    card_name: cardName,
    label,
    source_line: normalizedEntry,
  };
}

function finishFromLabel(label) {
  const value = comparable(label);
  if (/\bnon holo\b|\bnonholo\b/.test(value)) return 'normal';
  if (/\bcosmo holo\b|\bcosmos holo\b/.test(value)) return 'cosmos';
  if (/\bcracked ice holo\b|\bcracked holo\b/.test(value)) return 'cracked_ice';
  if (/\bmirror reverse holo\b|\benergy reverse holo\b|\breverse holo\b/.test(value)) return 'reverse';
  if (/\bholo promo\b|\btinsel holo\b/.test(value)) return 'holo';
  if (/\bstaff stamped\b|\bstamped\b|\bstamp\b/.test(value)) return 'stamped';
  return null;
}

function parseChecklist(html) {
  const text = htmlToText(html);
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const entries = [];
  let currentHeading = null;
  for (const line of lines) {
    const pieces = line.includes('') ? splitChecklistEntries(line) : [];
    const headingCandidate = line.split('')[0]?.trim();
    if (headingCandidate && /:$/.test(headingCandidate)) {
      currentHeading = headingCandidate.replace(/:$/, '');
    }
    for (const piece of pieces) {
      const parsed = parseEntry(piece, currentHeading);
      if (!parsed) continue;
      entries.push({
        ...parsed,
        finish_key: finishFromLabel(parsed.label),
      });
    }
  }
  return entries;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function targetFacts(gaps, options) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => ['candidate_unconfirmed', 'human_source_verified'].includes(row.status))
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function buildRecords(entries, facts, generatedAt) {
  const entriesByIdentity = new Map();
  for (const entry of entries) {
    const key = identityKey(entry);
    if (!entriesByIdentity.has(key)) entriesByIdentity.set(key, []);
    entriesByIdentity.get(key).push(entry);
  }

  const recordsBySet = new Map();
  const results = [];
  for (const fact of facts) {
    const candidates = entriesByIdentity.get(identityKey(fact)) ?? [];
    const exact = candidates.filter((entry) => normalizeFinishKey(entry.finish_key) === normalizeFinishKey(fact.finish_key));
    if (exact.length === 0) {
      results.push({
        ...fact,
        status: candidates.length > 0 ? 'identity_found_finish_not_explicit' : 'no_exact_match',
        candidate_labels: candidates.map((entry) => entry.label).slice(0, 10),
        records_generated: 0,
      });
      continue;
    }
    const entry = exact[0];
    const record = {
      source_key: 'elitefourum_alternate_checklist',
      source_kind: 'collector_reference',
      source_url: SOURCE_URL,
      set_key: fact.set_key,
      set_name: fact.set_name,
      card_number: fact.card_number,
      card_name: fact.card_name,
      finish_key: normalizeFinishKey(fact.finish_key),
      rarity: null,
      evidence_type: 'finish_presence',
      evidence_label: `Elite Fourum alternate checklist: ${entry.source_line}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `elitefourum_alternate_checklist:${fact.set_key}:${fact.card_number}:${normalizeFinishKey(fact.finish_key)}`,
      notes: 'Generated only when the checklist line exactly matched set, card number, card name, and explicit finish label.',
    };
    if (!recordsBySet.has(fact.set_key)) recordsBySet.set(fact.set_key, []);
    recordsBySet.get(fact.set_key).push(record);
    results.push({
      ...fact,
      status: 'generated',
      records_generated: 1,
      source_url: SOURCE_URL,
      evidence_label: record.evidence_label,
    });
  }
  return { recordsBySet, results };
}

async function writeFixtures(recordsBySet, generatedAt, dryRun) {
  if (dryRun) return [];
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const files = [];
  for (const [setKey, records] of recordsBySet.entries()) {
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    let existingRecords = [];
    try {
      const existing = JSON.parse(await fs.readFile(file, 'utf8'));
      existingRecords = Array.isArray(existing.records) ? existing.records : [];
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const deduped = [...new Map([...existingRecords, ...records].map((record) => [factKey(record), record])).values()];
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `elitefourum_alternate_${setKey}`,
      source_kind: 'collector_reference',
      source_url: SOURCE_URL,
      source_status: 'available_generated',
      set_key: setKey,
      set_name: deduped[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:elitefourum_alternate:${setKey}:${generatedAt}`,
      generation_note: 'Generated from Elite Fourum English alternate set checklist. Exact card-number/name/finish matches only.',
      records: deduped,
    };
    await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
    files.push(file);
  }
  return files;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

async function writeReports({ generatedAt, entries, facts, results, fixtureFiles, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const generated = results.filter((row) => row.status === 'generated');
  const payload = {
    version: 'english_master_index_elitefourum_alternate_checklist_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    source_url: SOURCE_URL,
    rule: 'Only exact Elite Fourum checklist matches on set, card number, card name, and explicit finish label emit fixture evidence.',
    summary: {
      parsed_checklist_entries: entries.length,
      target_facts: facts.length,
      records_generated: generated.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(generated, (row) => normalizeFinishKey(row.finish_key)),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'elitefourum_alternate_checklist_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const rows = results.slice(0, 200).map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.status,
    row.evidence_label ?? '',
  ]);
  const md = [
    '# Elite Fourum Alternate Checklist Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['parsed_checklist_entries', payload.summary.parsed_checklist_entries],
      ['target_facts', payload.summary.target_facts],
      ['records_generated', payload.summary.records_generated],
      ['fixture_files_written', payload.summary.fixture_files_written],
      ['by_status', JSON.stringify(payload.summary.by_status)],
      ['by_finish', JSON.stringify(payload.summary.by_finish)],
    ]),
    '',
    '## Result Sample',
    '',
    rows.length ? markdownTable(['set', 'number', 'name', 'finish', 'status', 'evidence'], rows) : 'No target facts were attempted.',
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'elitefourum_alternate_checklist_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, html] = await Promise.all([
    readJson(GAPS_PATH),
    fetchChecklistHtml(options),
  ]);
  const entries = parseChecklist(html);
  const facts = targetFacts(gaps, options);
  const { recordsBySet, results } = buildRecords(entries, facts, generatedAt);
  const fixtureFiles = await writeFixtures(recordsBySet, generatedAt, options.dryRun);
  const report = await writeReports({ generatedAt, entries, facts, results, fixtureFiles, dryRun: options.dryRun });
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[elitefourum-alternate] failed:', error);
  process.exitCode = 1;
});
