import fs from 'node:fs/promises';
import os from 'node:os';
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
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_official_legacy_checklists_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/official_legacy_checklist_acquisition_v1';
const BASE_URL = 'https://assets.pokemon.com/assets/cms/pdf/tcg/checklists';
const SOURCE_KEY = 'official_pokemon_legacy_checklist';
const execFileAsync = promisify(execFile);

const LEGACY_SLUGS = {
  ex1: 'rubysapphire',
  ex2: 'sandstorm',
  ex3: 'dragon',
  ex4: 'teammagmavsteamaqua',
  ex5: 'hiddenlegends',
  ex6: 'fireredleafgreen',
  ex8: 'deoxys',
  ex9: 'emerald',
  ex10: 'unseenforces',
  ex11: 'deltaspecies',
  ex12: 'legendmaker',
  ex13: 'holonphantoms',
  ex14: 'crystalguardians',
  ex15: 'dragonfrontiers',
  ex16: 'powerkeepers',
};

function parseArgs(argv) {
  const options = { sets: null, maxSets: null, dryRun: false, concurrency: 6 };
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
      options.concurrency = Number(next);
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

function checklistUrl(slug) {
  return `${BASE_URL}/${slug}_checklist.pdf`;
}

function slugCandidates(set) {
  const candidates = new Set();
  if (LEGACY_SLUGS[set.key]) candidates.add(LEGACY_SLUGS[set.key]);
  const base = normalizeText(set.set_name).replace(/\bex\b/g, '').replace(/\s+/g, '');
  if (base) candidates.add(base);
  return [...candidates].filter(Boolean);
}

async function fetchPdf(set) {
  const errors = [];
  for (const slug of slugCandidates(set)) {
    const url = checklistUrl(slug);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/pdf',
          'User-Agent': 'Grookai Master Index Audit/1.0',
        },
        signal: AbortSignal.timeout(20000),
      });
      const body = Buffer.from(await response.arrayBuffer());
      if (!response.ok || body.subarray(0, 5).toString('latin1') !== '%PDF-') {
        errors.push(`${response.status} ${response.statusText}: ${url}`);
        continue;
      }
      return { url, body, slug };
    } catch (error) {
      try {
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
        ], {
          encoding: 'buffer',
          maxBuffer: 25 * 1024 * 1024,
          timeout: 70000,
        });
        const body = Buffer.from(stdout);
        if (body.subarray(0, 5).toString('latin1') !== '%PDF-') {
          errors.push(`curl_not_pdf: ${url}`);
          continue;
        }
        return { url, body, slug };
      } catch (curlError) {
        errors.push(`${url}: ${String(error.message ?? error)} | curl: ${String(curlError.message ?? curlError)}`);
      }
    }
  }
  throw new Error(errors.join(' | '));
}

async function pdfToText(body, setKey, slug) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'grookai-legacy-pdf-'));
  const pdfPath = path.join(tempDir, `${setKey}_${slug}.pdf`);
  const txtPath = path.join(tempDir, `${setKey}_${slug}.txt`);
  try {
    await fs.writeFile(pdfPath, body);
    await execFileAsync('pdftotext', ['-layout', '-enc', 'UTF-8', pdfPath, txtPath], { timeout: 30000 });
    return await fs.readFile(txtPath, 'utf8');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function cleanName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[©™®]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRows(text) {
  const rows = [];
  const seen = new Set();
  const rowRegex = /(?:^|\s)(\d{1,3})\s{2,}([^\d\n]+?)(?=\s{2,}\d{1,3}\s{2,}|$)/g;
  for (const line of String(text ?? '').replace(/\r/g, '').split('\n')) {
    if (!/\d/.test(line)) continue;
    for (const match of line.matchAll(rowRegex)) {
      const cardNumber = match[1];
      const cardName = cleanName(match[2]);
      if (!cardName || cardName.length < 2 || /\bCards?\b/i.test(cardName)) continue;
      const key = `${normalizeNumber(cardNumber)}|${cardComparable(cardName)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ card_number: cardNumber, card_name: cardName });
    }
  }
  return rows.sort((a, b) => Number(normalizeNumber(a.card_number)) - Number(normalizeNumber(b.card_number)));
}

function parseRangeRules(text) {
  const rules = [];
  const normalized = String(text ?? '').replace(/\r/g, '').replace(/\s+/g, ' ');
  const regex = /Cards?\s+(\d{1,3})\s*-\s*(\d{1,3})\s+(?:each\s+)?come[s]?\s+in\s+([^\.]+)\./gi;
  for (const match of normalized.matchAll(regex)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    const label = cleanName(match[0]);
    const body = normalizeText(match[3]);
    const presence_finishes = [];
    const absence_finishes = [];
    if (body.includes('non holo') || body.includes('nonfoil') || body.includes('non foil')) {
      presence_finishes.push('normal');
    }
    if (body.includes('one holo')) {
      presence_finishes.push('holo');
    }
    if (body.includes('two foil') || body.includes('one holo')) {
      absence_finishes.push('normal');
    }
    if (Number.isFinite(start) && Number.isFinite(end) && (presence_finishes.length || absence_finishes.length)) {
      rules.push({
        start,
        end,
        presence_finishes: [...new Set(presence_finishes)],
        absence_finishes: [...new Set(absence_finishes)],
        evidence_label: label,
      });
    }
  }
  return rules;
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function targetFacts(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => ['normal', 'holo'].includes(normalizeFinishKey(row.finish_key)));
}

function priorFacts(printings) {
  return (printings.printings ?? [])
    .filter((row) => (row.sources ?? []).includes(SOURCE_KEY))
    .filter((row) => row.card_number && row.card_name && row.finish_key);
}

function mergeFacts(...groups) {
  const out = new Map();
  for (const group of groups) {
    for (const row of group) out.set(factKey(row), row);
  }
  return [...out.values()];
}

function groupBySet(rows, setsByKey, options) {
  const grouped = new Map();
  for (const row of rows) {
    if (options.sets && !options.sets.has(normalizeText(row.set_key))) continue;
    const set = setsByKey.get(row.set_key);
    if (!set || !slugCandidates(set).length) continue;
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  let entries = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (options.maxSets) entries = entries.slice(0, options.maxSets);
  return entries;
}

function buildRecords({ set, facts, rows, rules, sourceUrl, generatedAt }) {
  const targets = new Map(facts.map((row) => [factKey(row), row]));
  const records = [];
  const seen = new Set();
  for (const row of rows) {
    const number = Number(normalizeNumber(row.card_number));
    for (const rule of rules) {
      if (number < rule.start || number > rule.end) continue;
      for (const finishKey of rule.presence_finishes) {
        const key = factKey({ set_key: set.key, card_number: row.card_number, card_name: row.card_name, finish_key: finishKey });
        const target = targets.get(key);
        if (!target || seen.has(key)) continue;
        seen.add(key);
        records.push({
          source_key: SOURCE_KEY,
          source_kind: 'official_gallery',
          source_url: sourceUrl,
          set_key: set.key,
          set_name: set.set_name,
          card_number: target.card_number,
          card_name: target.card_name,
          finish_key: finishKey,
          rarity: null,
          evidence_type: 'finish_presence',
          evidence_label: `Official legacy checklist rule: ${rule.evidence_label}`,
          language: 'en',
          retrieved_at: generatedAt,
          raw_snapshot_ref: `official_legacy_checklist:${set.key}:${target.card_number}:${finishKey}`,
          notes: 'Exact card-level finish evidence derived from an official checklist card row plus an explicit official card-number range rule. No era-wide assumption is used.',
        });
      }
      for (const finishKey of rule.absence_finishes) {
        const key = factKey({ set_key: set.key, card_number: row.card_number, card_name: row.card_name, finish_key: finishKey });
        const target = targets.get(key);
        if (!target || seen.has(key)) continue;
        seen.add(key);
        records.push({
          source_key: SOURCE_KEY,
          source_kind: 'official_gallery',
          source_url: sourceUrl,
          set_key: set.key,
          set_name: set.set_name,
          card_number: target.card_number,
          card_name: target.card_name,
          finish_key: finishKey,
          rarity: null,
          evidence_type: 'finish_absence',
          evidence_label: `Official legacy checklist exclusion rule: ${rule.evidence_label}`,
          language: 'en',
          retrieved_at: generatedAt,
          raw_snapshot_ref: `official_legacy_checklist:${set.key}:${target.card_number}:${finishKey}:absence`,
          notes: 'Official checklist range defines the available version family for this card number and does not include a non-holo/normal version. This is absence evidence, not deletion authority.',
        });
      }
    }
  }
  return records;
}

async function writeFixtures(recordsBySet, generatedAt, dryRun) {
  if (dryRun) return [];
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const files = [];
  for (const [setKey, payload] of [...recordsBySet.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!payload.records.length) continue;
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `official_legacy_checklist_${setKey}`,
      source_kind: 'official_gallery',
      source_url: payload.source_url,
      source_status: 'available_generated',
      set_key: setKey,
      set_name: payload.set_name,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:official_legacy_checklist:${setKey}:${generatedAt}`,
      generation_note: 'Generated from official legacy Pokemon checklist PDF card rows and explicit range rules. No PDF dump is stored.',
      records: payload.records,
    };
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
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
  return out;
}

async function writeReports({ results, fixtureFiles, generatedAt, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'OFFICIAL_LEGACY_CHECKLIST_ACQUISITION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    rule: 'Legacy official checklist evidence is accepted only when an exact card row is paired with an explicit official card-number range rule.',
    summary: {
      sets_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(results.flatMap((row) => row.generated_finishes ?? []), (row) => row),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'official_legacy_checklist_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# Official Legacy Checklist Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    `- Sets attempted: ${payload.summary.sets_attempted}`,
    `- Records generated: ${payload.summary.records_generated}`,
    `- Fixture files written: ${payload.summary.fixture_files_written}`,
    `- Status counts: ${JSON.stringify(payload.summary.by_status)}`,
    `- Finish counts: ${JSON.stringify(payload.summary.by_finish)}`,
    '',
    '## Results',
    '',
    markdownTable(
      ['set', 'status', 'slug', 'rows', 'rules', 'records', 'url/error'],
      results.map((row) => [
        `${row.set_key} ${row.set_name}`,
        row.status,
        row.slug ?? '',
        row.rows_parsed,
        row.rules_parsed,
        row.records_generated,
        row.source_url ?? row.error ?? '',
      ]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'official_legacy_checklist_acquisition_v1.md'), md);
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload, printings] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(SETS_PATH),
    readJson(PRINTINGS_PATH),
  ]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const grouped = groupBySet(mergeFacts(targetFacts(gaps), priorFacts(printings)), setsByKey, options);

  let nextIndex = 0;
  async function processSet([setKey, facts]) {
    const set = setsByKey.get(setKey);
    try {
      const { url, body, slug } = await fetchPdf(set);
      const text = await pdfToText(body, set.key, slug);
      const rows = parseRows(text);
      const rules = parseRangeRules(text);
      const records = buildRecords({ set, facts, rows, rules, sourceUrl: url, generatedAt });
      return {
        set_key: set.key,
        set_name: set.set_name,
        status: records.length ? 'generated' : 'no_target_rows_matched',
        slug,
        source_url: url,
        target_facts: facts.length,
        rows_parsed: rows.length,
        rules_parsed: rules.length,
        records_generated: records.length,
        generated_finishes: records.map((row) => row.finish_key),
        records,
      };
    } catch (error) {
      return {
        set_key: set.key,
        set_name: set.set_name,
        status: 'source_unavailable_or_unparseable',
        target_facts: facts.length,
        rows_parsed: 0,
        rules_parsed: 0,
        records_generated: 0,
        error: String(error.message ?? error).slice(0, 800),
        records: [],
      };
    }
  }

  async function worker() {
    const out = [];
    while (nextIndex < grouped.length) {
      const item = grouped[nextIndex];
      nextIndex += 1;
      out.push(await processSet(item));
    }
    return out;
  }

  const workerCount = Math.max(1, Math.min(options.concurrency || 1, grouped.length || 1));
  const results = (await Promise.all(Array.from({ length: workerCount }, worker))).flat();
  const recordsBySet = new Map();
  for (const result of results) {
    if (!recordsBySet.has(result.set_key)) {
      recordsBySet.set(result.set_key, { set_name: result.set_name, source_url: result.source_url, records: [] });
    }
    recordsBySet.get(result.set_key).records.push(...result.records);
    delete result.records;
  }
  const fixtureFiles = await writeFixtures(recordsBySet, generatedAt, options.dryRun);
  await writeReports({ results, fixtureFiles, generatedAt, dryRun: options.dryRun });
  console.log(JSON.stringify({
    target_sets: grouped.length,
    records_generated: results.reduce((total, row) => total + row.records_generated, 0),
    fixture_files_written: fixtureFiles.length,
    by_status: countBy(results, (row) => row.status),
    by_finish: countBy(results.flatMap((row) => row.generated_finishes ?? []), (row) => row),
    dry_run: options.dryRun,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
