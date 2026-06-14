import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const INPUT_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json';
const NORMAL_REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_prize_pack_normal_acquisition_v1';
const CACHE_DIR = path.join(NORMAL_REPORT_DIR, 'cache');
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/bulbapedia_prize_pack_foil_rule_review_v1';

const EXPANSION_TO_KEY = {
  'Sword & Shield': 'swsh1',
  'Rebel Clash': 'swsh2',
  'Darkness Ablaze': 'swsh3',
  "Champion's Path": 'swsh3.5',
  'Vivid Voltage': 'swsh4',
  'Shining Fates': 'swsh4.5',
  'Battle Styles': 'swsh5',
  'Chilling Reign': 'swsh6',
  'Evolving Skies': 'swsh7',
  'Fusion Strike': 'swsh8',
  'Brilliant Stars': 'swsh9',
  'Astral Radiance': 'swsh10',
  'Lost Origin': 'swsh11',
  'Silver Tempest': 'swsh12',
  'Crown Zenith': 'swsh12.5',
  'SWSH Promo': 'swshp',
  'SWSH Black Star Promos': 'swshp',
  'Scarlet & Violet': 'sv01',
  'Paldea Evolved': 'sv02',
  'Obsidian Flames': 'sv03',
  '151': 'sv03.5',
  'Paradox Rift': 'sv04',
  'Paldean Fates': 'sv04.5',
  'Temporal Forces': 'sv05',
  'Twilight Masquerade': 'sv06',
  'Shrouded Fable': 'sv06.5',
  'Stellar Crown': 'sv07',
  'Surging Sparks': 'sv08',
  'Prismatic Evolutions': 'sv08.5',
  'Journey Together': 'sv09',
  'Destined Rivals': 'sv10',
  'Scarlet & Violet Energies': 'sve',
  'SVP Promo': 'svp',
  'SVP Black Star Promos': 'svp',
};

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

function decodeWikitext(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .trim();
}

function comparable(value) {
  return normalizeText(String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\bbasic\s+(grass|fire|water|lightning|psychic|fighting|darkness|metal)\s+energy\b/g, '$1 energy')
    .replace(/\bex\b/g, ' ex ')
    .replace(/\sgx\b/g, ' gx')
    .replace(/\svmax\b/g, ' vmax')
    .replace(/\svstar\b/g, ' vstar')
    .replace(/\sv\b/g, ' v')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+(?=\d)/, '');
}

function splitTopLevel(value) {
  const parts = [];
  let current = '';
  let templateDepth = 0;
  let linkDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const two = value.slice(index, index + 2);
    if (two === '{{') {
      templateDepth += 1;
      current += two;
      index += 1;
    } else if (two === '}}') {
      templateDepth = Math.max(0, templateDepth - 1);
      current += two;
      index += 1;
    } else if (two === '[[') {
      linkDepth += 1;
      current += two;
      index += 1;
    } else if (two === ']]') {
      linkDepth = Math.max(0, linkDepth - 1);
      current += two;
      index += 1;
    } else if (value[index] === '|' && templateDepth === 0 && linkDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += value[index];
    }
  }
  parts.push(current);
  return parts;
}

function fieldExpansionAndNumber(raw) {
  const promoMatch = raw.match(/\b(SWSH|SVP)(\d+)\b/i);
  if (promoMatch) return {
    set_key: promoMatch[1].toUpperCase() === 'SWSH' ? 'swshp' : 'svp',
    card_number: `${promoMatch[1].toUpperCase()}${promoMatch[2]}`,
  };

  const linkMatch = raw.match(/link=([^|\]]+?)(?:\s+\(TCG\))?(?:\||\])/);
  const expansion = decodeWikitext(linkMatch?.[1] ?? '').replace(/_/g, ' ');
  const numberMatch = raw.match(/\b([A-Za-z0-9.-]+)\s*\/\s*\d+\b/);
  return {
    set_key: EXPANSION_TO_KEY[expansion] ?? null,
    card_number: numberMatch ? normalizeNumber(numberMatch[1]) : '',
    expansion,
  };
}

function cleanCardName(raw) {
  const tcgId = raw.match(/\{\{TCG ID\|[^|]+\|([^|]+)\|[^}]+\}\}/);
  let name = tcgId?.[1] ?? null;
  if (!name) {
    const link = raw.match(/\[\[[^\]|]+(?:\|([^\]]+))?\]\]/);
    if (link) name = link[1] ?? raw.match(/\[\[([^\]|]+)/)?.[1] ?? '';
  }
  if (!name) name = raw;
  const suffixes = [];
  if (/\{\{TCGV\}\}/i.test(raw)) suffixes.push('V');
  if (/\{\{TCGVMAX\}\}/i.test(raw)) suffixes.push('VMAX');
  if (/\{\{TCGVSTAR\}\}/i.test(raw)) suffixes.push('VSTAR');
  if (/\{\{TCG ex\}\}/i.test(raw) || /\{\{ex\}\}/i.test(raw)) suffixes.push('ex');
  if (/\{\{TCGGX\}\}/i.test(raw)) suffixes.push('GX');
  return decodeWikitext(`${name.replace(/\s*\([^)]*\)\s*$/, '')}${suffixes.length ? ` ${suffixes.join(' ')}` : ''}`)
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\[|\]\]/g, '')
    .trim();
}

function cardKind(rawName, fields) {
  const raw = `${rawName} ${fields.join(' ')}`;
  const normalized = normalizeText(raw);
  return {
    is_v: /\{\{tcgv\}\}|\bpokemon v\b|\bpokémon v\b/.test(normalized),
    is_vmax: /\{\{tcgvmax\}\}|\bvmax\b/.test(normalized),
    is_vstar: /\{\{tcgvstar\}\}|\bvstar\b/.test(normalized),
    is_ex: /\{\{tcg ex\}\}|\{\{ex\}\}|\bex\b/.test(normalized),
    is_radiant: /\bradiant\b/.test(normalized),
    is_ace_spec: /\bace spec\b/.test(normalized),
  };
}

function foilRuleForWikitext(wikitext) {
  const ruleText = wikitext.replace(/\r?\n/g, ' ').match(/Foil cards in this set have[^.]+\./i)?.[0] ?? null;
  if (!ruleText) return { status: 'blocked_missing_page_foil_rule', rule_text: null, exceptions: [] };
  const normalized = normalizeText(ruleText);
  const exceptions = [];
  if (/\bpokemon v\b|\bpokémon v\b/.test(normalized)) exceptions.push('pokemon_v');
  if (/\bvmax\b/.test(normalized)) exceptions.push('pokemon_vmax');
  if (/\bvstar\b/.test(normalized)) exceptions.push('pokemon_vstar');
  if (/\bex\b/.test(normalized)) exceptions.push('pokemon_ex');
  if (/\bradiant\b/.test(normalized)) exceptions.push('radiant');
  if (/\bace spec\b/.test(normalized)) exceptions.push('ace_spec');
  return { status: 'rule_available', rule_text: ruleText, exceptions };
}

function parseEntries(page, wikitext) {
  const rule = foilRuleForWikitext(wikitext);
  const entries = [];
  for (const line of wikitext.split(/\r?\n/)) {
    if (!line.startsWith('{{Setlist/entry|')) continue;
    const inner = line.replace(/^\{\{Setlist\/entry\|/, '').replace(/\}\}\s*$/, '');
    const fields = splitTopLevel(inner);
    if (fields.length < 7) continue;
    const identity = fieldExpansionAndNumber(fields[0]);
    const promotion = decodeWikitext(fields[6]);
    const kinds = cardKind(fields[2], fields);
    entries.push({
      source_series: page.series,
      source_title: page.title,
      source_url: `https://bulbapedia.bulbagarden.net/wiki/${page.title}`,
      set_key: identity.set_key,
      card_number: identity.card_number,
      card_name: cleanCardName(fields[2]),
      promotion,
      rule_status: rule.status,
      foil_rule_text: rule.rule_text,
      foil_rule_exceptions: rule.exceptions,
      card_kind: kinds,
      status: identity.set_key ? 'parsed' : 'blocked_unmapped_expansion',
    });
  }
  return entries;
}

async function readCachedEntries() {
  const files = await fs.readdir(CACHE_DIR);
  const groups = await Promise.all(files
    .filter((file) => file.endsWith('.json'))
    .map(async (file) => {
      const payload = await readJson(path.join(CACHE_DIR, file));
      return parseEntries(payload.page, payload.wikitext ?? '');
    }));
  return groups.flat();
}

function targetRows(report) {
  return (report.rows ?? [])
    .filter((row) => row.routing_status === 'blocked_missing_exact_finish_phrase')
    .filter((row) => row.proposed_variant_key === 'prize_pack_stamp');
}

function entryMatches(row, entry) {
  return entry.set_key === row.set_key
    && compactNumber(entry.card_number) === compactNumber(row.card_number)
    && comparable(entry.card_name) === comparable(row.card_name);
}

function isRuleException(entry) {
  const exceptions = new Set(entry.foil_rule_exceptions ?? []);
  return (exceptions.has('pokemon_v') && entry.card_kind.is_v)
    || (exceptions.has('pokemon_vmax') && entry.card_kind.is_vmax)
    || (exceptions.has('pokemon_vstar') && entry.card_kind.is_vstar)
    || (exceptions.has('pokemon_ex') && entry.card_kind.is_ex)
    || (exceptions.has('radiant') && entry.card_kind.is_radiant)
    || (exceptions.has('ace_spec') && entry.card_kind.is_ace_spec);
}

function classifyFoilEntry(row, entry) {
  if (entry.rule_status !== 'rule_available') {
    return {
      ...row,
      status: entry.rule_status,
      matched_entries: [entry],
    };
  }
  const exception = isRuleException(entry);
  return {
    ...row,
    status: exception
      ? 'review_candidate_regular_holo_from_explicit_exception_rule'
      : 'review_candidate_cosmos_from_explicit_foil_rule',
    candidate_finish_key: exception ? 'holo' : 'cosmos',
    accepted_source_url: entry.source_url,
    accepted_source_series: entry.source_series,
    accepted_source_promotion: entry.promotion,
    accepted_foil_rule_text: entry.foil_rule_text,
    accepted_foil_rule_exceptions: entry.foil_rule_exceptions,
    accepted_card_kind: entry.card_kind,
  };
}

function classifyTargets(targets, entries) {
  const parsed = entries.filter((entry) => entry.status === 'parsed');
  const results = [];
  for (const row of targets) {
    const matches = parsed.filter((entry) => entryMatches(row, entry));
    if (matches.length === 0) {
      results.push({ ...row, status: 'blocked_no_exact_bulbapedia_prize_pack_match' });
      continue;
    }
    const foilMatches = matches.filter((entry) => normalizeText(entry.promotion) === 'standard set foil');
    if (foilMatches.length === 0) {
      results.push({ ...row, status: 'blocked_no_standard_set_foil_match', matched_entries: matches });
      continue;
    }
    if (foilMatches.length > 1) {
      results.push({ ...row, status: 'blocked_multiple_standard_set_foil_matches', matched_entries: foilMatches });
      continue;
    }
    results.push(classifyFoilEntry(row, foilMatches[0]));
  }
  return results;
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const finishRows = Object.entries(report.summary.by_candidate_finish_key).map(([finish, count]) => [finish, count]);
  const candidateRows = report.results
    .filter((row) => row.candidate_finish_key)
    .slice(0, 80)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.candidate_finish_key,
      row.accepted_source_series,
      row.status,
    ]);

  return `# Bulbapedia Prize Pack Foil Rule Review V1

Audit-only review of Prize Pack stamped foil rows. This report does not create fixtures and does not write to the database.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- fixture_records_generated: 0

## Rule

Only exact \`Standard Set Foil\` card-list matches are reviewed. Series-level foil-pattern text is used only when the page explicitly states the foil pattern and exceptions.

## Summary

- target_rows: ${report.summary.target_rows}
- source_entries_parsed: ${report.summary.source_entries_parsed}
- candidate_rows: ${report.summary.candidate_rows}
- blocked_rows: ${report.summary.blocked_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

${markdownTable(['candidate_finish_key', 'rows'], finishRows)}

## Candidate Sample

${candidateRows.length ? markdownTable(['set', 'number', 'name', 'candidate_finish', 'series', 'status'], candidateRows) : '_No candidate rows._'}
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const routing = await readJson(INPUT_JSON);
  const targets = targetRows(routing);
  const entries = await readCachedEntries();
  const results = classifyTargets(targets, entries);
  const candidates = results.filter((row) => row.candidate_finish_key);
  const report = {
    version: 'english_master_index_bulbapedia_prize_pack_foil_rule_review_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_key: 'bulbapedia_prize_pack_foil_rule_review',
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net',
    rule: 'Review exact Standard Set Foil matches against explicit Bulbapedia Prize Pack foil-pattern rule text. No fixture promotion in this script.',
    fingerprint_sha256: sha256(stableJson(candidates.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      candidate_finish_key: row.candidate_finish_key,
      series: row.accepted_source_series,
      status: row.status,
    })))),
    summary: {
      target_rows: targets.length,
      source_entries_parsed: entries.filter((entry) => entry.status === 'parsed').length,
      source_entry_blockers: countBy(entries.filter((entry) => entry.status !== 'parsed'), (entry) => entry.status),
      candidate_rows: candidates.length,
      blocked_rows: results.length - candidates.length,
      by_status: countBy(results, (row) => row.status),
      by_candidate_finish_key: countBy(candidates, (row) => row.candidate_finish_key),
      by_set: countBy(candidates, (row) => row.set_key),
    },
    results,
  };
  await writeJson(path.join(REPORT_DIR, 'bulbapedia_prize_pack_foil_rule_review_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'bulbapedia_prize_pack_foil_rule_review_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

await main();
