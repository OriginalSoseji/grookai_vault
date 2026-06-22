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
const SETS_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_sets_v1.json';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_stamped_subtype_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_stamped_subtype_v1';
const SOURCE_KEY = 'tcgcsv_stamped_subtype';
const BASE_URL = 'https://tcgcsv.com/tcgplayer';
const CATEGORY_ID = 3;

const SET_GROUP_ALIAS = {
  bwp: ['Black and White Promos'],
  dpp: ['Diamond and Pearl Promos'],
  hgss2: ['Unleashed'],
  hgss3: ['Undaunted'],
  hgss4: ['Triumphant'],
  hgssp: ['HGSS Promos'],
  smp: ['SM Promos'],
  svp: ['SV: Scarlet & Violet Promo Cards'],
  swshp: ['SWSH: Sword & Shield Promo Cards'],
  xyp: ['XY Promos'],
};

function parseArgs(argv) {
  const options = { dryRun: false, sets: null, refreshCache: false };
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
  const out = {};
  for (const row of rows) out[fn(row)] = (out[fn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokémon\b/g, ' ')
    .replace(/\bbase\s+set\b/g, 'base')
    .replace(/\bpromos?\b/g, 'promo')
    .replace(/\bblack\s+star\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/^(sv|sv\d+|swsh|swsh\d+|sm|xy|bw|dp|hgss|ex|pl)\d*[: -]+/i, '')
    .replace(/\band\b/g, ' ')
    .replace(/\bpromo\s+cards\b/g, 'promo')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+(?=\d)/, '');
}

function cardComparable(value) {
  return comparable(value)
    .replace(/\bex\b/g, ' ex ')
    .replace(/\sgx\b/g, ' gx')
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheFileForUrl(url) {
  return path.join(CACHE_DIR, `${sha256(url)}.json`);
}

async function fetchJson(url, options) {
  const cacheFile = cacheFileForUrl(url);
  if (!options.refreshCache) {
    try {
      return JSON.parse(await fs.readFile(cacheFile, 'utf8'));
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
    '90',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: 100000, maxBuffer: 80 * 1024 * 1024 });
  const payload = JSON.parse(stdout);
  if (!options.dryRun) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, `${JSON.stringify(payload)}\n`);
  }
  return payload;
}

function extendedValue(product, names) {
  const allowed = new Set(names.map(normalizeText));
  return (product.extendedData ?? []).find((item) => allowed.has(normalizeText(item.name)) || allowed.has(normalizeText(item.displayName)))?.value ?? null;
}

function productNumber(product) {
  const number = extendedValue(product, ['Number', 'Card Number']);
  if (number) return normalizeNumber(String(number).split('/')[0]);
  const match = String(product.name ?? '').match(/#\s*([A-Za-z0-9.-]+)/);
  return match ? normalizeNumber(match[1]) : '';
}

function finishFromSubtype(value) {
  const normalized = normalizeText(value);
  if (normalized === 'normal' || normalized === 'unlimited' || normalized === 'common') return 'normal';
  if (normalized === 'holofoil' || normalized === 'holo' || normalized === 'foil') return 'holo';
  if (normalized === 'reverse holofoil' || normalized === 'reverse holo') return 'reverse';
  if (normalized.includes('cosmos')) return 'cosmos';
  if (normalized.includes('cracked ice')) return 'cracked_ice';
  return null;
}

function productText(product) {
  return [
    product.name,
    product.cleanName,
  ].filter(Boolean).join(' ');
}

function productCardNameMatches(row, product) {
  const expected = cardComparable(row.card_name);
  const title = cardComparable(productText(product));
  if (!expected || !title) return false;
  return title === expected
    || title.startsWith(`${expected} `)
    || title.includes(` ${expected} `);
}

function variantMatches(row, product) {
  const text = comparable(productText(product));
  const variantKey = normalizeText(row.proposed_variant_key ?? row.variant_key);
  const stampLabel = comparable(row.stamp_label);
  if (variantKey === 'battle_academy_deck_mark') return /\bbattle\s+academy\b/.test(text);
  if (variantKey === 'prize_pack_stamp') return /\bprize\s+pack\b/.test(text);
  if (variantKey === 'staff_stamp') return /\bstaff\b/.test(text);
  if (variantKey === 'prerelease_stamp') return /\bpre\s*release\b|\bprerelease\b/.test(text) && !/\bstaff\b/.test(text);
  if (variantKey === 'professor_program_stamp') return /\bprofessor\b/.test(text) && /\bprogram\b|\bpromo\b|\bstamp/.test(text);
  if (variantKey === 'player_rewards_crosshatch_stamp') return /\bplayer\s+rewards\b|\bcrosshatch\b/.test(text);
  if (variantKey === 'pikachu_jack_o_lantern_stamp') return /\bpikachu\b/.test(text) && /\bjack\b|\blantern\b|\bhalloween\b|\btrick\b/.test(text);
  if (variantKey === 'play_pokemon_stamp') return /\bplay\b|\bleague\b/.test(text) && /\bpokemon\b|\bleague\b/.test(text);
  if (variantKey === 'league_stamp') return /\bleague\b/.test(text);
  if (variantKey === 'pikachu_stamp') return /\bpikachu\b/.test(text) && /\bstamp/.test(text);
  if (variantKey === 'stamped') return /\bstamp/.test(text);
  if (variantKey.includes('cinderace')) return /\bcinderace\b/.test(text) && /\bstamp/.test(text);
  if (stampLabel) {
    const terms = stampLabel.split(/\s+/).filter((term) => term.length > 2 && !['stamped', 'stamp', 'promo'].includes(term));
    if (terms.length && terms.every((term) => text.includes(term))) return true;
  }
  return false;
}

function chooseGroups(set, groups) {
  const manualAliases = (SET_GROUP_ALIAS[set.key] ?? []).map(setComparable).filter(Boolean);
  const sourceAliases = Object.values(set.source_aliases ?? {})
    .filter((value) => String(value).length > 3 && !/^[a-z]{2,}\d*$/i.test(String(value)))
    .map(setComparable)
    .filter((value) => value && value !== 'promo');
  const aliases = [
    setComparable(set.set_name),
    ...manualAliases,
    ...sourceAliases,
  ].filter(Boolean);
  const matches = groups.filter((group) => {
    const name = setComparable(group.name);
    const abbreviation = comparable(group.abbreviation);
    return aliases.some((alias) => (
      name === alias
      || abbreviation === comparable(set.key)
    ));
  });
  return [...new Map(matches.map((group) => [group.groupId, group])).values()];
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
    .filter((row) => !options.sets || options.sets.has(normalizeText(row.set_key)));
}

function groupBySet(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.set_key)) grouped.set(row.set_key, []);
    grouped.get(row.set_key).push(row);
  }
  return grouped;
}

async function inspectSet({ setKey, set, rows, groups, options }) {
  const groupMatches = chooseGroups(set, groups);
  if (groupMatches.length === 0) {
    return rows.map((row) => ({ ...row, status: 'blocked_tcgcsv_group_not_mapped', group_candidates: [] }));
  }
  if (groupMatches.length > 3) {
    return rows.map((row) => ({
      ...row,
      status: 'blocked_tcgcsv_group_ambiguous',
      group_candidates: groupMatches.map((group) => ({ groupId: group.groupId, name: group.name, abbreviation: group.abbreviation })),
    }));
  }

  const products = [];
  const prices = [];
  for (const group of groupMatches) {
    const [productPayload, pricePayload] = await Promise.all([
      fetchJson(`${BASE_URL}/${CATEGORY_ID}/${group.groupId}/products`, options),
      fetchJson(`${BASE_URL}/${CATEGORY_ID}/${group.groupId}/prices`, options),
    ]);
    for (const product of productPayload.results ?? []) products.push({ ...product, _group: group });
    for (const price of pricePayload.results ?? []) prices.push({ ...price, _group: group });
  }
  const pricesByProduct = new Map();
  for (const price of prices) {
    if (!pricesByProduct.has(price.productId)) pricesByProduct.set(price.productId, []);
    pricesByProduct.get(price.productId).push(price);
  }

  const results = [];
  for (const row of rows) {
    const productMatches = products.filter((product) => (
      compactNumber(productNumber(product)) === compactNumber(row.card_number)
      && productCardNameMatches(row, product)
      && variantMatches(row, product)
    ));
    if (productMatches.length === 0) {
      results.push({
        ...row,
        status: 'blocked_no_exact_tcgcsv_product_match',
        group_candidates: groupMatches.map((group) => ({ groupId: group.groupId, name: group.name, abbreviation: group.abbreviation })),
      });
      continue;
    }
    const activeCandidates = [];
    for (const product of productMatches) {
      for (const price of pricesByProduct.get(product.productId) ?? []) {
        const finishKey = finishFromSubtype(price.subTypeName);
        if (!finishKey) continue;
        activeCandidates.push({
          product,
          price,
          finish_key: finishKey,
        });
      }
    }
    const usableCandidates = activeCandidates;
    const finishKeys = [...new Set(usableCandidates.map((candidate) => candidate.finish_key))].sort();
    const productIds = [...new Set(usableCandidates.map((candidate) => candidate.product.productId))].sort();
    if (usableCandidates.length === 0) {
      results.push({
        ...row,
        status: 'blocked_no_active_tcgcsv_subtype_match',
        product_candidates: productMatches.slice(0, 8).map((product) => ({
          productId: product.productId,
          name: product.name,
          url: product.url,
          subtypes: (pricesByProduct.get(product.productId) ?? []).map((price) => price.subTypeName),
        })),
      });
      continue;
    }
    if (productIds.length !== 1 || finishKeys.length !== 1) {
      results.push({
        ...row,
        status: 'blocked_ambiguous_tcgcsv_subtypes',
        candidate_product_ids: productIds,
        candidate_finish_keys: finishKeys,
        product_candidates: usableCandidates.slice(0, 8).map((candidate) => ({
          productId: candidate.product.productId,
          name: candidate.product.name,
          url: candidate.product.url,
          subtype: candidate.price.subTypeName,
          finish_key: candidate.finish_key,
        })),
      });
      continue;
    }
    const accepted = usableCandidates[0];
    results.push({
      ...row,
      status: 'accepted_exact_tcgcsv_subtype_match',
      accepted_finish_key: accepted.finish_key,
      accepted_source_url: accepted.product.url,
      accepted_product_id: accepted.product.productId,
      accepted_product_name: accepted.product.name,
      accepted_group_id: accepted.product._group.groupId,
      accepted_group_name: accepted.product._group.name,
      accepted_subtype_name: accepted.price.subTypeName,
    });
  }
  return results;
}

function fixtureRecord(row, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: row.accepted_source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.accepted_finish_key,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `TCGCSV/TCGplayer exact stamped subtype: ${row.accepted_product_name} / ${row.accepted_subtype_name}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `tcgcsv:${row.accepted_group_id}:${row.accepted_product_id}:${normalizeText(row.accepted_subtype_name)}`,
    notes: 'Exact active-finish evidence accepted only when TCGCSV product matched set/card/number/stamp identity and exactly one TCGplayer subtype mapped to an active child finish.',
  };
}

async function writeFixtures(results, generatedAt, dryRun) {
  const accepted = results.filter((row) => row.status === 'accepted_exact_tcgcsv_subtype_match');
  const files = [];
  if (dryRun || accepted.length === 0) return files;
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  for (const [setKey, setRows] of groupBySet(accepted)) {
    const records = setRows.map((row) => fixtureRecord(row, generatedAt));
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: `${SOURCE_KEY}_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: BASE_URL,
      source_status: 'available_generated',
      set_key: setKey,
      set_name: records[0]?.set_name ?? setKey,
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${setKey}:${generatedAt}`,
      generation_note: 'Generated from TCGCSV TCGplayer products and price subtypes. Exact card-number/name/stamp identity and one active subtype only.',
      records,
    };
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await writeJson(file, fixture);
    files.push(file);
  }
  return files;
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const acceptedRows = report.results
    .filter((row) => row.status === 'accepted_exact_tcgcsv_subtype_match')
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.proposed_variant_key,
      row.accepted_finish_key,
      row.accepted_product_name,
      row.accepted_subtype_name,
    ]);
  return `# TCGCSV Stamped Subtype Acquisition V1

Audit-only source acquisition lane using TCGCSV/TCGplayer products plus price \`subTypeName\`.

## Safety

- dry_run: ${report.dry_run}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- target_rows: ${report.summary.target_rows}
- sets_attempted: ${report.summary.sets_attempted}
- records_generated: ${report.summary.records_generated}
- fixture_files_written: ${report.summary.fixture_files_written}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Accepted

${acceptedRows.length ? markdownTable(['set', 'number', 'name', 'variant', 'finish', 'product', 'subtype'], acceptedRows) : 'No exact TCGCSV subtype matches were accepted.'}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [input, setsPayload, groupsPayload] = await Promise.all([
    readJson(INPUT_JSON),
    readJson(SETS_JSON),
    fetchJson(`${BASE_URL}/${CATEGORY_ID}/groups`, options),
  ]);
  const setsByKey = new Map((setsPayload.sets ?? []).map((set) => [set.key, set]));
  const targets = targetRows(input, options);
  const targetGroups = [...groupBySet(targets).entries()].sort((left, right) => left[0].localeCompare(right[0]));
  const allResults = [];
  for (const [setKey, rows] of targetGroups) {
    const set = setsByKey.get(setKey);
    if (!set) {
      allResults.push(...rows.map((row) => ({ ...row, status: 'blocked_set_metadata_missing' })));
      continue;
    }
    const results = await inspectSet({ setKey, set, rows, groups: groupsPayload.results ?? [], options });
    allResults.push(...results);
  }
  const fixtureFiles = await writeFixtures(allResults, generatedAt, options.dryRun);
  const accepted = allResults.filter((row) => row.status === 'accepted_exact_tcgcsv_subtype_match');
  const fingerprintPayload = accepted.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    accepted_finish_key: row.accepted_finish_key,
    accepted_product_id: row.accepted_product_id,
    accepted_subtype_name: row.accepted_subtype_name,
  }));
  const report = {
    version: 'english_master_index_tcgcsv_stamped_subtype_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: BASE_URL,
    source_reference: 'https://tcgcsv.com/docs',
    rule: 'Accept only exact set/card-number/card-name/stamp-identity product matches with exactly one active TCGplayer price subtype.',
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary: {
      target_rows: targets.length,
      sets_attempted: targetGroups.length,
      records_generated: accepted.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(allResults, (row) => row.status),
      by_finish: countBy(accepted, (row) => row.accepted_finish_key),
      by_set: countBy(accepted, (row) => row.set_key),
    },
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results: allResults,
  };
  await writeJson(path.join(REPORT_DIR, 'tcgcsv_stamped_subtype_acquisition_v1.json'), report);
  await writeText(path.join(REPORT_DIR, 'tcgcsv_stamped_subtype_acquisition_v1.md'), renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
