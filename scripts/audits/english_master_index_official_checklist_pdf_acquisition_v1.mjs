import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const SETS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const CARDS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_cards_v1.json';
const PRINTINGS_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_official_pokemon_checklist_pdf_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/official_pokemon_checklist_pdf_acquisition_v1';
const BASE_URL = 'https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist';
const SOURCE_KEY = 'official_pokemon_checklist_pdf';
const execFileAsync = promisify(execFile);

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

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function commandExists(command) {
  try {
    await execFileAsync(command, ['-v'], { timeout: 5000 });
    return true;
  } catch (error) {
    return Boolean(error?.stdout || error?.stderr);
  }
}

function pdfUrlForId(id) {
  return `${BASE_URL}/${encodeURIComponent(id)}_web_cardlist_en.pdf`;
}

function officialIdCandidates(set) {
  const raw = [
    set.source_aliases?.official_pokemon_checklist,
    set.source_aliases?.official_checklist_pdf,
    set.pokemontcg,
    set.key,
    set.source_aliases?.tcgdex,
  ].filter(Boolean);
  const candidates = new Set();
  for (const value of raw) {
    candidates.add(value);
    candidates.add(String(value).replace(/\./g, ''));
  }
  if (set.key === 'sv1') candidates.add('svi');
  return [...candidates].filter(Boolean);
}

async function fetchPdf(set) {
  const errors = [];
  for (const id of officialIdCandidates(set)) {
    const url = pdfUrlForId(id);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/pdf',
          'User-Agent': 'Grookai Master Index Audit/1.0',
        },
        signal: AbortSignal.timeout(25000),
      });
      const body = Buffer.from(await response.arrayBuffer());
      if (!response.ok || body.length < 1000) {
        errors.push(`${response.status} ${response.statusText}: ${url}`);
        continue;
      }
      const header = body.subarray(0, 5).toString('latin1');
      if (header !== '%PDF-') {
        errors.push(`not_pdf: ${url}`);
        continue;
      }
      return { url, body, official_id: id };
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
        ], { timeout: 70000, encoding: 'buffer', maxBuffer: 30 * 1024 * 1024 });
        const body = Buffer.from(stdout);
        if (body.subarray(0, 5).toString('latin1') !== '%PDF-') {
          errors.push(`curl_not_pdf: ${url}`);
          continue;
        }
        return { url, body, official_id: id };
      } catch (curlError) {
        errors.push(`${url}: ${String(error.message ?? error)} | curl: ${String(curlError.message ?? curlError)}`);
      }
    }
  }
  throw new Error(errors.join(' | '));
}

function decodePdfString(value) {
  return String(value ?? '')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\222/g, "'")
    .replace(/\\226/g, '-')
    .replace(/\\227/g, '-')
    .replace(/\\251/g, '(c)')
    .replace(/\\256/g, '(r)')
    .replace(/\\351/g, 'é')
    .replace(/\\034/g, '')
    .replace(/\\035/g, '')
    .replace(/\\036/g, '')
    .replace(/\\037/g, '')
    .replace(/\\[0-7]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodePdfArrayText(value) {
  return [...String(value ?? '').matchAll(/\((?:\\.|[^\\)])*\)/g)]
    .map((match) => decodePdfString(match[0].slice(1, -1)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function inflatePdfStreams(body) {
  const streams = [];
  let position = 0;
  while (true) {
    const streamIndex = body.indexOf(Buffer.from('stream'), position);
    if (streamIndex < 0) break;
    let start = streamIndex + 'stream'.length;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;
    else if (body[start] === 10) start += 1;

    const endStreamIndex = body.indexOf(Buffer.from('endstream'), start);
    if (endStreamIndex < 0) break;
    let end = endStreamIndex;
    if (body[end - 2] === 13 && body[end - 1] === 10) end -= 2;
    else if (body[end - 1] === 10) end -= 1;

    const dictStart = Math.max(0, body.lastIndexOf(Buffer.from('<<'), streamIndex));
    const dictionary = body.subarray(dictStart, streamIndex).toString('latin1');
    const data = body.subarray(start, end);
    if (dictionary.includes('/FlateDecode')) {
      try {
        streams.push(zlib.inflateSync(data).toString('latin1'));
      } catch {
        // Some PDFs contain non-content compressed streams. Ignore unreadable streams.
      }
    } else {
      streams.push(data.toString('latin1'));
    }
    position = endStreamIndex + 'endstream'.length;
  }
  return streams;
}

function extractTextItems(streamText) {
  if (!streamText.includes('Tj') && !streamText.includes('TJ')) return [];
  const items = [];
  let x = null;
  let y = null;
  const tokenRegex = /(-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm)|(\[(?:\\.|[^\]])*\]TJ)|(\((?:\\.|[^\\)])*\)Tj)/g;
  for (const match of streamText.matchAll(tokenRegex)) {
    if (match[1]) {
      x = Number(match[2]);
      y = Number(match[3]);
      continue;
    }
    const text = match[4]
      ? decodePdfArrayText(match[4])
      : decodePdfString(match[5].slice(1, -3));
    if (text && Number.isFinite(x) && Number.isFinite(y)) {
      items.push({ x, y, text });
    }
  }
  return items;
}

function parseOfficialRows(body) {
  return parseOfficialRowsFromStreams(body);
}

function parseOfficialRowsFromStreams(body) {
  const items = inflatePdfStreams(body).flatMap(extractTextItems);
  const groups = new Map();
  for (const item of items) {
    const rowY = Math.round(item.y * 2) / 2;
    if (!groups.has(rowY)) groups.set(rowY, []);
    groups.get(rowY).push(item);
  }

  const rows = [];
  for (const group of groups.values()) {
    const numberItem = group
      .filter((item) => item.x >= 285 && item.x <= 335 && /^\d+[a-z]?$/i.test(item.text))
      .sort((a, b) => a.x - b.x)[0];
    if (!numberItem) continue;

    const name = group
      .filter((item) => item.x >= 335 && item.x <= 410)
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name || /^H$/i.test(name) || name.length < 2) continue;

    const hasHoloMarker = group.some((item) => item.x >= 410 && item.x <= 450 && /^H$/i.test(item.text));
    rows.push({
      card_number: numberItem.text,
      card_name: name,
      has_holo_marker: hasHoloMarker,
    });
  }
  return rows.sort((a, b) => Number(normalizeNumber(a.card_number)) - Number(normalizeNumber(b.card_number)));
}

function normalizeExtractedText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[●◆★]/g, ' ')
    .replace(/[♢◇]/g, ' ')
    .replace(/[■☐□]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseOfficialRowsFromText(text) {
  const rows = [];
  const seen = new Set();
  const normalizedText = String(text ?? '').replace(/\r/g, '');
  const rowStart = /(?:^|\s)((?:SV|SH)?\d{1,3}[a-z]?)\s+(?:[■☐□]\s*){0,3}/gimu;

  for (const line of normalizedText.split('\n')) {
    const compact = line.replace(/\s+/g, ' ').trim();
    if (!compact || !/\d/.test(compact)) continue;
    const starts = [...compact.matchAll(rowStart)];
    for (let index = 0; index < starts.length; index += 1) {
      const match = starts[index];
      const next = starts[index + 1];
      const cardNumber = match[1];
      const segment = compact.slice(match.index + match[0].length, next?.index ?? compact.length);
      const markerMatch = segment.match(/\s(?:[●◆★]|V★|\*|★H|★U|★R|★)\b/);
      const namePart = markerMatch ? segment.slice(0, markerMatch.index) : segment;
      const markerPart = markerMatch ? segment.slice(markerMatch.index) : '';
      const rawName = normalizeExtractedText(namePart)
        .replace(/\b(VMAX|VSTAR|ex|EX|V-UNION|BREAK|GX|V)\s+(?=\d{3}\b)/g, '$1')
        .replace(/\s+\d{3}[a-z]?\s*$/, '')
        .trim();
      if (!rawName || rawName.length < 2 || /^\d+$/.test(rawName)) continue;
      const hasHoloMarker = /★H\b/.test(markerPart) || /\bH\b/.test(markerPart);
      const key = `${normalizeNumber(cardNumber)}|${cardComparable(rawName)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        card_number: cardNumber,
        card_name: rawName,
        has_holo_marker: hasHoloMarker,
      });
    }
  }

  return rows.sort((a, b) => Number(normalizeNumber(a.card_number)) - Number(normalizeNumber(b.card_number)));
}

async function parseOfficialRowsWithPoppler(body, setKey, officialId) {
  if (!await commandExists('pdftotext')) {
    return { rows: [], extraction_method: 'node_stream_parser', extraction_error: 'pdftotext_not_available' };
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'grookai-official-pdf-'));
  const pdfPath = path.join(tempDir, `${setKey}_${officialId}.pdf`);
  const txtPath = path.join(tempDir, `${setKey}_${officialId}.txt`);
  try {
    await fs.writeFile(pdfPath, body);
    await execFileAsync('pdftotext', ['-layout', '-enc', 'UTF-8', pdfPath, txtPath], { timeout: 30000 });
    const text = await fs.readFile(txtPath, 'utf8');
    const rows = parseOfficialRowsFromText(text);
    return { rows, extraction_method: rows.length ? 'pdftotext_layout' : 'node_stream_parser', extraction_error: rows.length ? null : 'pdftotext_no_rows' };
  } catch (error) {
    return { rows: [], extraction_method: 'node_stream_parser', extraction_error: String(error.message ?? error).slice(0, 300) };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function cardComparable(value) {
  return normalizeText(value)
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardKey(row) {
  return `${row.set_key}|${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}`;
}

function printingKey(row) {
  return `${row.set_key}|${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}|${normalizeFinishKey(row.finish_key)}`;
}

function targetCardFacts(gaps, cards) {
  const currentGaps = (gaps.facts ?? [])
    .filter((row) => row.gap_type === 'card_identity_second_source_needed')
    .map((row) => ({ ...row, fact_type: 'card_identity' }));
  const priorOfficial = (cards.cards ?? [])
    .filter((row) => (row.sources ?? []).includes(SOURCE_KEY))
    .map((row) => ({ ...row, fact_type: 'card_identity' }));
  return mergeFacts(cardKey, currentGaps, priorOfficial);
}

function targetHoloFacts(gaps, printings) {
  const currentGaps = (gaps.facts ?? [])
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => normalizeFinishKey(row.finish_key) === 'holo')
    .map((row) => ({ ...row, finish_key: 'holo' }));
  const priorOfficial = (printings.printings ?? [])
    .filter((row) => (row.sources ?? []).includes(SOURCE_KEY))
    .filter((row) => normalizeFinishKey(row.finish_key) === 'holo')
    .map((row) => ({ ...row, finish_key: 'holo' }));
  return mergeFacts(printingKey, currentGaps, priorOfficial);
}

function mergeFacts(keyFn, ...groups) {
  const out = new Map();
  for (const group of groups) {
    for (const row of group) out.set(keyFn(row), row);
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

function buildRecords({ set, cardFacts, holoFacts, officialRows, sourceUrl, generatedAt }) {
  const cards = new Set(cardFacts.map(cardKey));
  const holos = new Set(holoFacts.map(printingKey));
  const records = [];
  const seen = new Set();

  for (const row of officialRows) {
    const base = {
      source_key: SOURCE_KEY,
      source_kind: 'official_gallery',
      source_url: sourceUrl,
      set_key: set.key,
      set_name: set.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      rarity: null,
      language: 'en',
      retrieved_at: generatedAt,
    };

    const identityKey = cardKey({ ...row, set_key: set.key });
    if (cards.has(identityKey)) {
      const key = `${identityKey}|card_identity`;
      if (!seen.has(key)) {
        seen.add(key);
        records.push({
          ...base,
          finish_key: null,
          evidence_type: 'card_identity',
          evidence_label: `Official Pokemon checklist row #${row.card_number} - ${row.card_name}`,
          raw_snapshot_ref: `official_checklist_pdf:${set.key}:${row.card_number}:identity`,
          notes: 'Official checklist card identity evidence only. This row does not assert non-holo, reverse, or parallel truth.',
        });
      }
    }

    const holoKey = printingKey({ ...row, set_key: set.key, finish_key: 'holo' });
    if (row.has_holo_marker && holos.has(holoKey)) {
      const key = `${holoKey}|finish_presence`;
      if (!seen.has(key)) {
        seen.add(key);
        records.push({
          ...base,
          finish_key: 'holo',
          evidence_type: 'finish_presence',
          evidence_label: `Official Pokemon checklist H marker row #${row.card_number} - ${row.card_name}`,
          raw_snapshot_ref: `official_checklist_pdf:${set.key}:${row.card_number}:holo`,
          notes: 'Official checklist row has an explicit H marker. No reverse or normal finish is inferred from checkbox layout.',
        });
      }
    }
  }

  return records;
}

async function writeFixture(set, records, sourceUrl, generatedAt, dryRun) {
  if (records.length === 0 || dryRun) return null;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: `official_pokemon_checklist_pdf_${set.key}`,
    source_kind: 'official_gallery',
    source_url: sourceUrl,
    source_status: 'available_generated',
    set_key: set.key,
    set_name: set.set_name,
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:official_pokemon_checklist_pdf:${set.key}:${generatedAt}`,
    generation_note: 'Generated from official Pokemon checklist PDF text streams. Card identity and explicit H-marked holo rows only; no reverse, normal, checkbox, or parallel inference is emitted.',
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
    version: 'OFFICIAL_POKEMON_CHECKLIST_PDF_ACQUISITION_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: dryRun,
    rule: 'Official checklist PDFs may support card identity and exact holo presence only when an H marker is present on the exact row. Normal, reverse, and parallel printings are not inferred from checkbox layout. Full acquisition uses pdftotext only; the legacy stream parser remains in code as a manual fallback but is not used automatically because some older PDFs are CPU-expensive to parse.',
    summary: {
      sets_attempted: results.length,
      records_generated: results.reduce((total, row) => total + row.records_generated, 0),
      fixture_files_written: fixtureFiles.filter(Boolean).length,
      by_status: countBy(results, (row) => row.status),
      by_record_type: countBy(results.flatMap((row) => row.record_types ?? []), (row) => row),
    },
    fixture_dir: dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles.filter(Boolean),
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'official_pokemon_checklist_pdf_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);

  const md = [
    '# Official Pokemon Checklist PDF Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Safety Rule',
    '',
    'Official checklist PDFs are used only for exact card identity rows and exact holo presence rows with an explicit H marker. Checkbox layout is not interpreted as reverse, normal, or parallel truth. Full acquisition uses pdftotext only; legacy stream fallback is not automatic.',
    '',
    '## Summary',
    '',
    `- Sets attempted: ${payload.summary.sets_attempted}`,
    `- Records generated: ${payload.summary.records_generated}`,
    `- Fixture files written: ${payload.summary.fixture_files_written}`,
    `- Status counts: ${JSON.stringify(payload.summary.by_status)}`,
    `- Record type counts: ${JSON.stringify(payload.summary.by_record_type)}`,
    '',
    '## Results',
    '',
    markdownTable(
      ['set', 'status', 'official id', 'method', 'rows parsed', 'records', 'url/error'],
      results.map((row) => [
        `${row.set_key} ${row.set_name}`,
        row.status,
        row.official_id ?? '',
        row.extraction_method ?? '',
        row.official_rows_parsed,
        row.records_generated,
        row.source_url ?? row.error ?? '',
      ]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'official_pokemon_checklist_pdf_acquisition_v1.md'), md);
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [gaps, setsPayload, cards, printings] = await Promise.all([
    readJson(GAPS_PATH),
    readJson(SETS_PATH),
    readJson(CARDS_PATH),
    readJson(PRINTINGS_PATH),
  ]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const targets = mergeFacts(
    (row) => `${row.set_key}|${row.fact_type ?? 'printing'}|${normalizeNumber(row.card_number)}|${cardComparable(row.card_name)}|${normalizeFinishKey(row.finish_key)}`,
    targetCardFacts(gaps, cards),
    targetHoloFacts(gaps, printings),
  );
  const grouped = groupBySet(targets, setsByKey, options);
  if (!options.dryRun) await fs.rm(FIXTURE_DIR, { recursive: true, force: true });

  async function processSet([setKey, facts]) {
    const set = setsByKey.get(setKey);
    const cardFacts = facts.filter((row) => row.fact_type === 'card_identity');
    const holoFacts = facts.filter((row) => row.fact_type !== 'card_identity' && normalizeFinishKey(row.finish_key) === 'holo');
    try {
      const { url, body, official_id: officialId } = await fetchPdf(set);
      const popplerResult = await parseOfficialRowsWithPoppler(body, set.key, officialId);
      const officialRows = popplerResult.rows;
      const records = buildRecords({ set, cardFacts, holoFacts, officialRows, sourceUrl: url, generatedAt });
      await sleep(50);
      return {
        set_key: set.key,
        set_name: set.set_name,
        status: records.length > 0
          ? 'generated'
          : (officialRows.length > 0 ? 'no_target_rows_matched' : 'pdftotext_no_usable_rows'),
        official_id: officialId,
        source_url: url,
        target_facts: facts.length,
        official_rows_parsed: officialRows.length,
        extraction_method: popplerResult.extraction_method,
        extraction_error: popplerResult.extraction_error,
        records_generated: records.length,
        record_types: records.map((row) => row.evidence_type),
        records,
      };
    } catch (error) {
      await sleep(50);
      return {
        set_key: set.key,
        set_name: set.set_name,
        status: 'source_unavailable_or_unparseable',
        official_id: null,
        source_url: null,
        target_facts: facts.length,
        official_rows_parsed: 0,
        records_generated: 0,
        error: String(error.message ?? error).slice(0, 800),
        records: [],
      };
    }
  }

  let nextIndex = 0;
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
  const fixtureFiles = [];
  for (const result of results) {
    if (result.records?.length) {
      const set = setsByKey.get(result.set_key);
      fixtureFiles.push(await writeFixture(set, result.records, result.source_url, generatedAt, options.dryRun));
    }
    delete result.records;
  }

  await writeReports({ results, fixtureFiles, generatedAt, dryRun: options.dryRun });
  console.log(JSON.stringify({
    target_sets: grouped.length,
    records_generated: results.reduce((total, row) => total + row.records_generated, 0),
    fixture_files_written: fixtureFiles.filter(Boolean).length,
    by_status: countBy(results, (row) => row.status),
    dry_run: options.dryRun,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
