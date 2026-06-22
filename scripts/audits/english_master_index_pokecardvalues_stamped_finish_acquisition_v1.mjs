import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const INPUT_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokecardvalues_stamped_finish_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokecardvalues_stamped_finish_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const SETS_URL = 'https://pokecardvalues.co.uk/sets/';
const SOURCE_KEY = 'pokecardvalues_stamped_finish';

function parseArgs(argv) {
  const options = { dryRun: false, refreshCache: false, sets: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) counts[fn(row)] = (counts[fn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpok[eé]mon\b/g, ' ')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(value)
    .replace(/\bex\b/g, ' ex ')
    .replace(/\sgx\b/g, ' gx')
    .replace(/\sv\b/g, ' v')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/\bblack star promos?\b/g, 'promo')
    .replace(/\bblack star\b/g, ' ')
    .replace(/\bpromos?\b/g, 'promo')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+/, '');
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/\\u0026/g, '&')
    .replace(/\\u002D/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}

function cacheFileForUrl(url) {
  return path.join(CACHE_DIR, `${sha256(url)}.html`);
}

async function fetchText(url, options) {
  const cacheFile = cacheFileForUrl(url);
  if (!options.refreshCache) {
    try {
      return await fs.readFile(cacheFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

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
  ], { timeout: 60000, maxBuffer: 30 * 1024 * 1024 });
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile, stdout);
  return stdout;
}

function parseSetsDirectory(html) {
  const links = new Map();
  const regex = /"name":\s*"([^"]+)"[\s\S]{0,300}?"url":\s*"([^"]+)"/g;
  for (const match of html.matchAll(regex)) {
    const name = decodeHtml(match[1]);
    const url = decodeHtml(match[2]);
    if (!url.includes('/sets/')) continue;
    const keyMatch = url.match(/\/sets\/([^/]+)\//);
    if (!keyMatch) continue;
    const setKey = normalizeText(keyMatch[1]);
    links.set(setKey, { set_key: setKey, set_name: name, source_url: url });
    links.set(setComparable(name), { set_key: setKey, set_name: name, source_url: url });
  }
  return links;
}

function parseStructuredCards(html) {
  const cards = [];
  const regex = /"name":\s*"([^"]+?)\s+-\s+Pokémon Card"[\s\S]{0,150}?"url":\s*"([^"]+)"/g;
  for (const match of html.matchAll(regex)) {
    const name = decodeHtml(match[1]);
    const url = decodeHtml(match[2]);
    const parsed = parseCardName(name);
    if (parsed) cards.push({ ...parsed, source_url: url, source_title: name });
  }
  return cards;
}

function pageCountFromHtml(html) {
  const match = String(html).match(/Currently Showing[\s\S]{0,300}?font-weight-bold">\s*([0-9,]+)\s*cards/i)
    ?? String(html).match(/Currently Showing[\s\S]{0,300}?\|\s*([0-9,]+)\s*cards/i);
  if (!match) return 1;
  const total = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(total) || total < 1) return 1;
  return Math.max(1, Math.ceil(total / 36));
}

async function fetchSetCards(setUrl, options) {
  const firstPage = await fetchText(setUrl, options);
  const pageCount = pageCountFromHtml(firstPage);
  const cards = parseStructuredCards(firstPage);
  for (let page = 2; page <= pageCount; page += 1) {
    const separator = setUrl.includes('?') ? '&' : '?';
    const html = await fetchText(`${setUrl}${separator}page=${page}`, options);
    cards.push(...parseStructuredCards(html));
  }
  const byUrl = new Map(cards.map((card) => [card.source_url, card]));
  return {
    source_url: setUrl,
    page_count: pageCount,
    cards: [...byUrl.values()],
  };
}

function parseCardName(value) {
  const parts = decodeHtml(value).split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 4) return null;
  const [cardName, numberPart, finishLabel, ...rest] = parts;
  const finishKey = finishFromLabel(finishLabel);
  if (!finishKey) return null;
  return {
    card_name: cardName,
    card_number: normalizeNumber(numberPart.split('/')[0]),
    full_number: numberPart,
    finish_key: finishKey,
    finish_label: finishLabel,
    variant_labels: rest,
    variant_text: rest.join(' '),
  };
}

function finishFromLabel(value) {
  const normalized = normalizeText(value);
  if (normalized === 'non holo' || normalized === 'non holofoil' || normalized === 'nonholo') return 'normal';
  if (normalized === 'reverse holo' || normalized === 'reverse holofoil') return 'reverse';
  if (normalized === 'holo' || normalized === 'holofoil') return 'holo';
  if (normalized.includes('cosmos holo')) return 'cosmos';
  if (normalized.includes('cracked ice')) return 'cracked_ice';
  return null;
}

function targetRows(report, options) {
  return (report.rows ?? [])
    .map((row) => ({
      ...row,
      proposed_variant_key: row.proposed_variant_key ?? row.variant_key,
    }))
    .filter((row) => (
      row.routing_status === 'blocked_missing_exact_finish_phrase'
      || row.queue_status === 'active_finish_required'
    ))
    .filter((row) => row.proposed_variant_key && row.proposed_variant_key !== 'stamped')
    .filter((row) => row.action_bucket !== 'display_metadata_no_write')
    .filter((row) => !row.live_satisfied)
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)))
    .sort((a, b) => String(a.set_key).localeCompare(String(b.set_key))
      || String(a.card_number).localeCompare(String(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name)));
}

function variantMatches(row, card) {
  const variantText = normalizeText(card.variant_text);
  const stampLabel = normalizeText(row.stamp_label);
  const normalizedVariantKey = row.proposed_variant_key ?? row.variant_key;
  const variantKey = normalizeText(normalizedVariantKey).replace(/_/g, ' ');

  if (normalizedVariantKey === 'staff_stamp') {
    return /\bstaff\b/.test(variantText);
  }
  if (normalizedVariantKey === 'battle_academy_deck_mark') {
    return /\bbattle academy\b/.test(variantText);
  }
  if (normalizedVariantKey === 'prerelease_stamp') {
    return /\bprerelease stamp\b/.test(variantText) && !/\bstaff\b/.test(variantText);
  }
  if (normalizedVariantKey === 'play_pokemon_stamp') {
    return /\bplay\b/.test(variantText) && /\bpokemon\b/.test(variantText);
  }
  if (normalizedVariantKey?.includes('burger_king')) {
    return /\bburger king\b/.test(variantText);
  }

  const stampTokens = stampLabel
    .replace(/\bstamped?\b/g, ' ')
    .replace(/\bstamp\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !['the', 'and', 'promo'].includes(token));
  const keyTokens = variantKey
    .replace(/\bstamped?\b/g, ' ')
    .replace(/\bstamp\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !['the', 'and', 'promo'].includes(token));
  const tokens = stampTokens.length ? stampTokens : keyTokens;
  return tokens.length > 0 && tokens.every((token) => variantText.includes(token));
}

function cardMatches(row, card) {
  const allowedFinishes = row.base_parent_child_finishes ?? [];
  return compactNumber(row.card_number) === compactNumber(card.card_number)
    && cardComparable(row.card_name) === cardComparable(card.card_name)
    && (!allowedFinishes.length || allowedFinishes.includes(card.finish_key))
    && variantMatches(row, card);
}

function validateMatches(row, matches) {
  if (matches.length === 0) return { status: 'no_exact_pokecardvalues_match', accepted: null, matches };
  const variantLabels = [...new Set(matches.map((match) => normalizeText(match.variant_text)))];
  if (variantLabels.length > 1) return { status: 'blocked_multiple_matching_stamp_variants', accepted: null, matches };
  const finishKeys = [...new Set(matches.map((match) => match.finish_key))];
  if (finishKeys.length > 1) return { status: 'blocked_conflicting_finish_matches', accepted: null, matches };
  if (matches.length > 1) return { status: 'blocked_duplicate_matching_products', accepted: null, matches };
  return { status: 'accepted_exact_finish_match', accepted: matches[0], matches };
}

function fixtureRecord(row, card, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'collector_reference',
    source_url: card.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: normalizeNumber(row.card_number),
    card_name: row.card_name,
    finish_key: card.finish_key,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `Poke Card Values exact stamped finish: ${card.source_title}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pokecardvalues:${row.set_key}:${normalizeNumber(row.card_number)}:${row.proposed_variant_key}:${card.finish_key}`,
    notes: 'Accepted only when the Poke Card Values set index had one exact set/card/number/stamp-family match and the active finish was explicit in the card title.',
  };
}

async function writeFixtures(records, generatedAt, dryRun) {
  if (dryRun || records.length === 0) return [];
  const bySet = new Map();
  for (const record of records) {
    if (!bySet.has(record.set_key)) bySet.set(record.set_key, []);
    bySet.get(record.set_key).push(record);
  }
  const files = [];
  for (const [setKey, setRecords] of bySet) {
    const filePath = path.join(FIXTURE_DIR, `${setKey}.json`);
    let existingRecords = [];
    try {
      const existing = await readJson(filePath);
      existingRecords = existing.records ?? [];
    } catch {
      existingRecords = [];
    }
    const mergedRecords = [...existingRecords, ...setRecords];
    const dedupedRecords = [...new Map(mergedRecords.map((record) => [
      record.raw_snapshot_ref ?? `${record.source_key}:${record.set_key}:${record.card_number}:${record.card_name}:${record.finish_key}`,
      record,
    ])).values()];
    const fixture = {
      source_key: `${SOURCE_KEY}_${setKey}`,
      source_kind: 'collector_reference',
      source_url: dedupedRecords[0]?.source_url ?? SETS_URL,
      source_status: 'available_generated_fixture',
      generated_at: generatedAt,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      generation_note: 'Generated from Poke Card Values structured set/card titles for remaining stamped finish blockers only.',
      records: dedupedRecords.sort((a, b) => String(a.card_number).localeCompare(String(b.card_number), undefined, { numeric: true })
        || String(a.card_name).localeCompare(String(b.card_name))
        || String(a.finish_key).localeCompare(String(b.finish_key))),
    };
    await writeJson(filePath, fixture);
    files.push(filePath);
  }
  return files;
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const acceptedRows = report.results
    .filter((row) => row.status === 'accepted_exact_finish_match')
    .slice(0, 100)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.proposed_variant_key,
      row.accepted_finish_key,
      row.accepted_source_title,
    ]);
  const blockedRows = report.results
    .filter((row) => row.status !== 'accepted_exact_finish_match')
    .slice(0, 80)
    .map((row) => [
      row.status,
      row.set_key,
      row.card_number,
      row.card_name,
      row.proposed_variant_key,
      row.match_count,
    ]);

  return `# Poke Card Values Stamped Finish Acquisition V1

Audit-only source acquisition lane for stamped active finishes. This does not write to the database.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- dry_run: ${report.dry_run}

## Rule

Accepted rows require one exact Poke Card Values structured card title matching set, card number, card name, stamp family, and active finish. If more than one stamped variant or finish matches the same target, the row is blocked.

## Summary

- target_rows: ${report.summary.target_rows}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: ${report.fingerprint_sha256}

${markdownTable(['status', 'count'], statusRows)}

## Accepted

${markdownTable(['set', 'number', 'card', 'variant', 'finish', 'source title'], acceptedRows)}

## Blocked Samples

${markdownTable(['status', 'set', 'number', 'card', 'variant', 'matches'], blockedRows)}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const input = await readJson(INPUT_JSON);
  const targets = targetRows(input, options);
  const setsHtml = await fetchText(SETS_URL, options);
  const setLinks = parseSetsDirectory(setsHtml);
  const cardsBySet = new Map();
  const results = [];

  for (const target of targets) {
    const link = setLinks.get(normalizeText(target.set_key)) ?? setLinks.get(setComparable(target.set_name));
    if (!link) {
      results.push({ ...target, status: 'source_set_url_not_found', match_count: 0 });
      continue;
    }
    if (!cardsBySet.has(target.set_key)) {
      cardsBySet.set(target.set_key, await fetchSetCards(link.source_url, options));
    }
    const setCards = cardsBySet.get(target.set_key);
    const matches = setCards.cards.filter((card) => cardMatches(target, card));
    const validation = validateMatches(target, matches);
    results.push({
      set_key: target.set_key,
      set_name: target.set_name,
      card_number: target.card_number,
      card_name: target.card_name,
      proposed_variant_key: target.proposed_variant_key,
      stamp_label: target.stamp_label,
      base_parent_child_finishes: target.base_parent_child_finishes,
      source_set_url: setCards.source_url,
      status: validation.status,
      match_count: matches.length,
      accepted_finish_key: validation.accepted?.finish_key ?? null,
      accepted_source_url: validation.accepted?.source_url ?? null,
      accepted_source_title: validation.accepted?.source_title ?? null,
      reviewed_matches: matches.slice(0, 8).map((match) => ({
        source_url: match.source_url,
        source_title: match.source_title,
        finish_key: match.finish_key,
        variant_text: match.variant_text,
      })),
    });
  }

  const acceptedRecords = results
    .filter((row) => row.status === 'accepted_exact_finish_match')
    .map((row) => {
      const target = targets.find((candidate) => candidate.set_key === row.set_key
        && normalizeNumber(candidate.card_number) === normalizeNumber(row.card_number)
        && cardComparable(candidate.card_name) === cardComparable(row.card_name)
        && candidate.proposed_variant_key === row.proposed_variant_key);
      return fixtureRecord(target, {
        finish_key: row.accepted_finish_key,
        source_url: row.accepted_source_url,
        source_title: row.accepted_source_title,
      }, generatedAt);
    });
  const fixtureFiles = await writeFixtures(acceptedRecords, generatedAt, options.dryRun);
  const fingerprint = sha256(stableJson({
    source_key: SOURCE_KEY,
    records: acceptedRecords,
    results: results.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      proposed_variant_key: row.proposed_variant_key,
      status: row.status,
      accepted_finish_key: row.accepted_finish_key,
      accepted_source_url: row.accepted_source_url,
    })),
  }));

  const report = {
    version: 'english_master_index_pokecardvalues_stamped_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_url: SETS_URL,
    rule: 'One exact Poke Card Values structured card title must match set/card/number/stamp-family and active finish. Ambiguous stamped variants are blocked.',
    fingerprint_sha256: fingerprint,
    summary: {
      target_rows: targets.length,
      records_generated: acceptedRecords.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
      by_finish: countBy(acceptedRecords, (row) => row.finish_key),
      by_set: countBy(acceptedRecords, (row) => row.set_key),
      fetched_sets: cardsBySet.size,
    },
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
    records: acceptedRecords,
  };

  await writeJson(path.join(REPORT_DIR, 'pokecardvalues_stamped_finish_acquisition_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'pokecardvalues_stamped_finish_acquisition_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify({
    target_rows: report.summary.target_rows,
    records_generated: report.summary.records_generated,
    by_status: report.summary.by_status,
    by_finish: report.summary.by_finish,
    fixture_files_written: report.summary.fixture_files_written,
    dry_run: report.dry_run,
    fingerprint_sha256: fingerprint,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
