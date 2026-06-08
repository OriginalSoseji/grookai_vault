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
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_doubleholo_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/doubleholo_acquisition_v1';
const BASE_URL = 'https://doubleholo.com/sets';

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = { sets: null, maxSets: null, dryRun: false };
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
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'e')
    .replace(/&Eacute;/g, 'E')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .trim();
}

function slugify(value) {
  const expanded = String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/&/g, ' and ');
  return normalizeText(expanded)
    .replace(/\band\b/g, 'and')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function factKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function rowKey(setKey, row) {
  return [
    setKey,
    normalizeNumber(row.card_number),
    cardComparable(row.card_name),
    normalizeFinishKey(row.finish_key),
  ].join('|');
}

function finishFromVariantLabel(label) {
  const normalized = normalizeText(label);
  if (!normalized) return null;
  if (normalized.includes('jumbo') || normalized.includes('oversized') || normalized.includes('metal')) return null;
  if (normalized.includes('master ball')) return 'masterball';
  if (normalized.includes('poke ball')) return 'pokeball';
  if (normalized.includes('rocket reverse') || normalized.includes('team rocket')) return 'rocket_reverse';
  if (normalized.includes('reverse holo')) return 'reverse';
  if (normalized.includes('cosmos holo')) return 'cosmos';
  if (normalized.includes('cracked ice')) return 'cracked_ice';
  if (normalized.includes('snowflake') || normalized.includes('stamp') || normalized.includes('stamped')) return 'stamped';
  if (normalized === 'holo' || normalized.includes('holo')) return 'holo';
  return null;
}

function parseDoubleHoloCardName(value, rarity = null) {
  const raw = decodeHtml(value);
  const match = raw.match(/^(.*?)\s+-\s+Pokemon\s+(.+?)\s+#(.+)$/i);
  if (!match) return null;
  const cardWithVariant = match[1].trim();
  const variantMatch = cardWithVariant.match(/^(.*?)\s+\[([^\]]+)\]$/);
  const normalizedRarity = normalizeText(rarity);
  const finishKey = variantMatch
    ? finishFromVariantLabel(variantMatch[2])
    : (normalizedRarity === 'holo rare' || normalizedRarity === 'holo_rare' ? 'holo' : null);
  if (!finishKey) return null;
  return {
    card_name: (variantMatch ? variantMatch[1] : cardWithVariant).trim(),
    finish_key: finishKey,
    card_number: match[3].trim(),
    source_label: variantMatch ? cardWithVariant : `${cardWithVariant} [${rarity}]`,
    evidence_type: variantMatch ? 'finish_presence' : 'finish_context_holo_rare',
  };
}

function parseJsonLdRows(html) {
  const rows = [];
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    const text = decodeHtml(match[1]);
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      continue;
    }
    const payloads = Array.isArray(payload) ? payload : [payload];
    for (const item of payloads) {
      const elements = item?.mainEntity?.itemListElement;
      if (!Array.isArray(elements)) continue;
      for (const element of elements) {
        const parsed = parseDoubleHoloCardName(element?.item?.name);
        if (parsed) rows.push(parsed);
      }
    }
  }
  return rows;
}

function parseAltRows(html) {
  const rows = [];
  const regex = /alt="([^"]+\s+-\s+Pokemon\s+[^"]+?\s+#.*?)"/g;
  for (const match of html.matchAll(regex)) {
    const parsed = parseDoubleHoloCardName(match[1]);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

function parseVisibleGridRows(html) {
  const rows = [];
  const regex = /alt="([^"]+\s+-\s+Pokemon\s+[^"]+?\s+#.*?)"[\s\S]{0,2600}?<span class="text-xs bg-muted px-2 py-0\.5 rounded">([^<]+)<\/span>/g;
  for (const match of html.matchAll(regex)) {
    const parsed = parseDoubleHoloCardName(match[1], match[2]);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

function parseRows(html) {
  const byKey = new Map();
  for (const row of [...parseJsonLdRows(html), ...parseAltRows(html), ...parseVisibleGridRows(html)]) {
    const key = `${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}|${normalizeFinishKey(row.finish_key)}|${row.evidence_type}`;
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

function targetFacts(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => row.card_number && row.card_name && row.finish_key)
    .filter((row) => [
      'holo',
      'reverse',
      'stamped',
      'cosmos',
      'cracked_ice',
      'pokeball',
      'masterball',
      'rocket_reverse',
    ].includes(normalizeFinishKey(row.finish_key)));
}

function priorDoubleHoloFacts(printings) {
  return (printings.printings ?? [])
    .filter((row) => (row.sources ?? []).includes('doubleholo_set_checklist'))
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
    if (!setsByKey.has(row.set_key)) continue;
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  let entries = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (options.maxSets) entries = entries.slice(0, options.maxSets);
  return entries;
}

function sourceSlugs(set) {
  const aliases = set.source_aliases ?? {};
  const candidates = [
    aliases.doubleholo,
    aliases.pkmncards ? `pokemon-${aliases.pkmncards}` : null,
    aliases.pkmncards ? `pokemon-${slugify(aliases.pkmncards.replace(/-/g, ' '))}` : null,
    `pokemon-${slugify(set.set_name)}`,
  ].filter(Boolean);
  return [...new Set(candidates)];
}

async function fetchUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Grookai Master Index Audit/1.0',
      },
      signal: AbortSignal.timeout(30000),
    });
    const html = await response.text();
    if (response.ok && html && !/NEXT_HTTP_ERROR_FALLBACK;404|This page could not be found/i.test(html)) {
      return html;
    }
  } catch {
    // Windows TLS revocation checks often fail from Node; curl fallback is explicit and local only.
  }
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
  ], { timeout: 70000, maxBuffer: 80 * 1024 * 1024 });
  if (!stdout || /NEXT_HTTP_ERROR_FALLBACK;404|This page could not be found/i.test(stdout)) {
    throw new Error(`Double Holo set not found or unavailable: ${url}`);
  }
  return stdout;
}

async function fetchSetPage(set) {
  const errors = [];
  for (const slug of sourceSlugs(set)) {
    const url = `${BASE_URL}/${encodeURIComponent(slug)}`;
    try {
      return { url, html: await fetchUrl(url) };
    } catch (error) {
      errors.push(String(error.message ?? error));
    }
  }
  throw new Error(errors.join(' | '));
}

function buildRecords({ set, facts, rows, sourceUrl, generatedAt }) {
  const targets = new Set(facts.map(factKey));
  const records = [];
  const seen = new Set();
  for (const row of rows) {
    const key = rowKey(set.key, row);
    if (!targets.has(key) || seen.has(key)) continue;
    seen.add(key);
    records.push({
      source_key: 'doubleholo_set_checklist',
      source_kind: 'marketplace_checklist',
      source_url: sourceUrl,
      set_key: set.key,
      set_name: set.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      rarity: null,
      evidence_type: row.evidence_type,
      evidence_label: `Double Holo checklist row ${row.source_label} #${row.card_number}`,
      language: 'en',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `doubleholo:${set.key}:${row.card_number}:${row.finish_key}`,
      notes: row.evidence_type === 'finish_presence'
        ? 'Generated only from explicit bracketed Double Holo finish labels.'
        : 'Unbracketed Double Holo holo_rare row retained as manual-review context only. It is not finish_presence and cannot promote or demote printing truth.',
    });
  }
  return records;
}

async function writeFixture(set, records, sourceUrl, generatedAt, dryRun) {
  if (records.length === 0 || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `doubleholo_finish_${set.key}`,
    source_kind: 'marketplace_checklist',
    source_url: sourceUrl,
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:doubleholo:${set.key}:${generatedAt}`,
    generation_note: 'Generated from Double Holo set checklist explicit bracketed finish labels only.',
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
  return out;
}

async function writeReports({ results, fixtureFiles, generatedAt, dryRun }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const payload = {
    version: 'DOUBLEHOLO_FINISH_ACQUISITION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    rule: 'Double Holo finish_presence evidence is emitted only for exact card-number/name matches with explicit bracketed finish labels. Unbracketed holo_rare rows are retained only as finish_context_holo_rare manual-review evidence.',
    summary: {
      sets_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      finish_presence_records: results.reduce((total, row) => total + (row.finish_presence_records ?? 0), 0),
      manual_review_context_records: results.reduce((total, row) => total + (row.manual_review_context_records ?? 0), 0),
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'doubleholo_finish_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const md = [
    '# Double Holo Finish Acquisition V1',
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
      ['finish_presence_records', payload.summary.finish_presence_records],
      ['manual_review_context_records', payload.summary.manual_review_context_records],
      ['fixture_files_written', payload.summary.fixture_files_written],
      ['by_status', JSON.stringify(payload.summary.by_status)],
    ]),
    '',
    '## Rule',
    '',
    payload.rule,
    '',
    '## Sets',
    '',
    markdownTable(['set_key', 'set_name', 'status', 'target_facts', 'source_rows', 'records_generated', 'finish_presence', 'manual_review_context', 'source_url', 'error'], results.map((row) => [
      row.set_key,
      row.set_name,
      row.status,
      row.target_facts,
      row.source_rows,
      row.records_generated,
      row.finish_presence_records ?? 0,
      row.manual_review_context_records ?? 0,
      row.source_url ?? '',
      row.error ?? '',
    ])),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'doubleholo_finish_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload, printingsPayload] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(SETS_PATH),
    readJson(PRINTINGS_PATH),
  ]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const targets = groupBySet(mergeFacts(targetFacts(gaps), priorDoubleHoloFacts(printingsPayload)), setsByKey, options);
  console.log(`[doubleholo] target sets ${targets.length}`);

  const results = [];
  const recordWrites = [];
  for (const [setKey, facts] of targets) {
    const set = setsByKey.get(setKey);
    console.log(`[doubleholo] ${set.key} ${set.set_name} target facts ${facts.length}`);
    try {
      const fetched = await fetchSetPage(set);
      const rows = parseRows(fetched.html);
      const records = buildRecords({ set, facts, rows, sourceUrl: fetched.url, generatedAt });
      recordWrites.push({ set, records, sourceUrl: fetched.url });
      results.push({
        set_key: set.key,
        set_name: set.set_name,
        status: records.length > 0 ? 'generated' : 'no_matching_variant_rows',
        target_facts: facts.length,
        source_rows: rows.length,
        records_generated: records.length,
        finish_presence_records: records.filter((row) => row.evidence_type === 'finish_presence').length,
        manual_review_context_records: records.filter((row) => row.evidence_type !== 'finish_presence').length,
        source_url: fetched.url,
        fixture_file: records.length ? path.join(FIXTURE_DIR, `${set.key}.json`) : null,
        error: null,
      });
    } catch (error) {
      results.push({
        set_key: set.key,
        set_name: set.set_name,
        status: 'source_error',
        target_facts: facts.length,
        source_rows: 0,
        records_generated: 0,
        finish_presence_records: 0,
        manual_review_context_records: 0,
        source_url: sourceSlugs(set).map((slug) => `${BASE_URL}/${encodeURIComponent(slug)}`).join(' | '),
        error: String(error.message ?? error),
      });
    }
    await sleep(150);
  }

  const allSourcesFailed = results.length > 0 && results.every((row) => row.status === 'source_error');
  if (allSourcesFailed && !options.dryRun) {
    console.log('[doubleholo] all sources failed; preserving existing fixture directory');
  }
  const fixtureFiles = [];
  if (!allSourcesFailed) {
    if (!options.dryRun) await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
    for (const item of recordWrites) {
      fixtureFiles.push(await writeFixture(item.set, item.records, item.sourceUrl, generatedAt, options.dryRun));
    }
  }
  const report = await writeReports({ results, fixtureFiles, generatedAt, dryRun: options.dryRun });
  console.log(`[doubleholo] records ${report.summary.records_generated}`);
  console.log(`[doubleholo] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
