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

const INPUT_JSON = 'docs/audits/english_master_index_source_exhaustion_v1/sv03_bulbapedia_additional_stamped_active_finish_v1/sv03_bulbapedia_additional_stamped_active_finish_v1.json';
const PRIZE_PACK_JSON = 'docs/audits/english_master_index_source_exhaustion_v1/sv03_prize_pack_stamped_finish_rule_review_v1/sv03_prize_pack_stamped_finish_rule_review_v1.json';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/sv03_product_family_stamped_finish_review_v1';
const OUT_BASENAME = 'sv03_product_family_stamped_finish_review_v1';

const PAGES = {
  trick_or_trade_2024: {
    title: 'Trick or Trade 2024 (TCG)',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Trick_or_Trade_2024_(TCG)',
  },
  battle_academy_2024: {
    title: 'Battle Academy 2024 (TCG)',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_2024_(TCG)',
  },
};

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) counts[fn(row) || 'unknown'] = (counts[fn(row) || 'unknown'] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rawUrl(title) {
  return `https://bulbapedia.bulbagarden.net/w/index.php?title=${encodeURIComponent(title.replaceAll(' ', '_'))}&action=raw`;
}

async function fetchRaw(title) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '60',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    rawUrl(title),
  ], { timeout: 75_000, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
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

function cleanName(raw) {
  let name = raw.match(/\{\{TCG ID\|[^|]+\|([^|]+)\|[^}]+\}\}/)?.[1]
    ?? raw.match(/\[\[[^\]|]+\|([^\]]+)\]\]/)?.[1]
    ?? raw;
  if (/\{\{(?:Tera )?ex\}\}/i.test(raw)) name = `${name} ex`;
  return name.replace(/\{\{[^}]+\}\}/g, '').replace(/\[\[|\]\]/g, '').replace(/\s+/g, ' ').trim();
}

function parseSetlistEntries(raw) {
  const entries = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('{{Setlist/entry|')) continue;
    if (!/link=Obsidian Flames \(TCG\)/.test(line)) continue;
    const body = line.replace(/^\{\{Setlist\/entry\|/, '').replace(/\}\}\s*$/, '');
    const fields = splitTopLevel(body);
    const number = fields[0]?.match(/\b([A-Za-z0-9.-]+)\s*\/\s*197\b/)?.[1];
    if (!number) continue;
    entries.push({
      card_number: normalizeNumber(number),
      card_name: cleanName(fields[2] ?? ''),
      rarity_label: fields[5] ?? '',
      raw_entry: line,
    });
  }
  return entries;
}

function parseHalfDeckEntries(raw) {
  const entries = [];
  const intro = raw.replace(/\r?\n/g, ' ').match(/Most of the cards within the decks are reprints[^.]+\.[^.]+silhouette[^.]+\./i)?.[0] ?? null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes('{{halfdecklist/entry|')) continue;
    for (const match of line.matchAll(/\{\{halfdecklist\/entry\|([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/g)) {
      if (!/link=Obsidian Flames \(TCG\)/.test(match[0])) continue;
      const fields = splitTopLevel(match[1]);
      const number = fields[0]?.match(/\b([A-Za-z0-9.-]+)\s*\/\s*197\b/)?.[1];
      if (!number) continue;
      entries.push({
        card_number: normalizeNumber(number),
        card_name: cleanName(fields[2] ?? ''),
        deck_marker: fields[1] ?? '',
        count: fields[5] ?? '',
        raw_entry: match[0],
        product_rule_text: intro,
      });
    }
  }
  return entries;
}

function keyFor(row) {
  return `${normalizeNumber(row.card_number)}|${normalizeText(row.card_name)}`;
}

function cardPageTitle(row) {
  return `${row.card_name} (Obsidian Flames ${normalizeNumber(row.card_number)})`;
}

function cardPageUrl(row) {
  return `https://bulbapedia.bulbagarden.net/wiki/${cardPageTitle(row).replaceAll(' ', '_')}`;
}

function hasRegularHoloCardPageEvidence(raw) {
  const text = String(raw ?? '');
  return /rarity=\{\{rar\|Double Rare\}\}/i.test(text)
    && /\[\[Category:Holographic cards\]\]/i.test(text);
}

function holidayCalendarSnowflakeEvidence(raw) {
  return String(raw ?? '').replace(/\r?\n/g, ' ')
    .match(/A version of the Regular print featuring a silver snowflake stamp was available in the [^.]+Holiday Calendar 2024[^.]*\./i)?.[0] ?? null;
}

function observationFor(row, sources) {
  const identities = new Set(row.stamp_identity_keys ?? []);
  const observations = [];

  if (identities.has('pikachu_jack_o_lantern_stamp')) {
    const entry = sources.trickMap.get(keyFor(row));
    if (entry) {
      if (/\bHolo\b/i.test(entry.rarity_label)) {
        observations.push({
          source_family: 'trick_or_trade_2024',
          status: 'review_candidate_holo_from_trick_or_trade_holo_rarity',
          proposed_finish_key: 'holo',
          source_url: PAGES.trick_or_trade_2024.source_url,
          evidence_label: `Trick or Trade 2024 row: ${row.card_name} ${row.card_number} rarity ${entry.rarity_label}; page states cards feature Pikachu jack-o-lantern stamp.`,
        });
      } else {
        observations.push({
          source_family: 'trick_or_trade_2024',
          status: 'review_candidate_normal_from_trick_or_trade_non_holo_rarity',
          proposed_finish_key: 'normal',
          source_url: PAGES.trick_or_trade_2024.source_url,
          evidence_label: `Trick or Trade 2024 row: ${row.card_name} ${row.card_number} rarity ${entry.rarity_label}; page states cards feature Pikachu jack-o-lantern stamp.`,
        });
      }
    }
  }

  if (identities.has('battle_academy_deck_stamp')) {
    const entry = sources.battleMap.get(keyFor(row));
    if (entry) {
      observations.push({
        source_family: 'battle_academy_2024',
        status: 'blocked_battle_academy_identity_only_no_active_finish',
        proposed_finish_key: null,
        source_url: PAGES.battle_academy_2024.source_url,
        evidence_label: `Battle Academy 2024 deck row: ${row.card_name} ${row.card_number}; page states deck reprints have silhouettes but does not state holo/non-holo finish.`,
      });
    }
  }

  if (identities.has('snowflake_symbol') && row.card_number === '42') {
    const cardRaw = sources.cardPageRawByKey.get(keyFor(row)) ?? '';
    const cardPageMatch = holidayCalendarSnowflakeEvidence(cardRaw);
    const hasHoloEvidence = hasRegularHoloCardPageEvidence(cardRaw);
    observations.push({
      source_family: 'holiday_calendar_2024',
      status: cardPageMatch && hasHoloEvidence
        ? 'review_candidate_holo_from_holiday_regular_holographic_card_page'
        : 'blocked_holiday_calendar_regular_print_identity_no_active_finish',
      proposed_finish_key: cardPageMatch && hasHoloEvidence ? 'holo' : null,
      source_url: cardPageUrl(row),
      evidence_label: cardPageMatch ?? 'No exact Bulbapedia card-page evidence found.',
    });
  }

  if (identities.has('play_pokemon_stamp')) {
    const prizeRow = sources.prizeRows.get(keyFor(row));
    if (prizeRow) {
      observations.push({
        source_family: 'play_pokemon_prize_pack',
        status: prizeRow.status,
        proposed_finish_key: prizeRow.accepted_finish_key,
        source_url: 'docs/audits/english_master_index_source_exhaustion_v1/sv03_prize_pack_stamped_finish_rule_review_v1/sv03_prize_pack_stamped_finish_rule_review_v1.json',
        evidence_label: `Prize Pack rule review: ${prizeRow.status}`,
      });
      if (
        prizeRow.status === 'blocked_ex_regular_foil_pattern_requires_active_finish_mapping'
        && hasRegularHoloCardPageEvidence(sources.cardPageRawByKey.get(keyFor(row)))
      ) {
        observations.push({
          source_family: 'bulbapedia_ex_regular_card_page',
          status: 'review_candidate_holo_from_ex_regular_holographic_card_page',
          proposed_finish_key: 'holo',
          source_url: cardPageUrl(row),
          evidence_label: 'Bulbapedia card page identifies the Obsidian Flames regular print as Double Rare and categorizes the card as holographic; Prize Pack page says Pokemon ex retain regular foil patterns.',
        });
      }
    }
  }

  return observations;
}

function classifyRow(row, sources) {
  const observations = observationFor(row, sources);
  const review = observations.filter((item) => String(item.status).startsWith('review_candidate_'));
  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    previous_status: row.status,
    previous_finish_key: row.accepted_finish_key,
    stamp_identity_keys: row.stamp_identity_keys,
    status: review.length > 0 ? 'review_candidate_found' : 'blocked_no_product_family_active_finish_closure',
    proposed_finish_keys: [...new Set(review.map((item) => item.proposed_finish_key).filter(Boolean))].sort(),
    observations,
  };
}

function renderMarkdown(report) {
  const rows = report.results.map((row) => [
    row.card_number,
    row.card_name,
    row.status,
    row.proposed_finish_keys.join(', '),
    row.observations.map((item) => `${item.source_family}:${item.status}`).join('; '),
  ]);
  return `# SV03 Product-Family Stamped Finish Review V1

Generated: ${report.generated_at}

Audit-only review of remaining SV03 stamped product-family evidence. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['review_candidate_rows', report.summary.review_candidate_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['by_status', JSON.stringify(report.summary.by_status)],
    ['by_observation_status', JSON.stringify(report.summary.by_observation_status)],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Results

${markdownTable(['number', 'card', 'status', 'proposed_finish', 'observations'], rows)}

## Safety

Review candidates are not write authority. They require a separate fixture or readiness package, guarded dry-run, rollback proof, and explicit approval before any DB mutation.
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const [input, prizePack, trickRaw, battleRaw] = await Promise.all([
    readJson(INPUT_JSON),
    readJsonIfExists(PRIZE_PACK_JSON, { results: [] }),
    fetchRaw(PAGES.trick_or_trade_2024.title),
    fetchRaw(PAGES.battle_academy_2024.title),
  ]);
  const activeTargets = new Set([
    'pikachu_jack_o_lantern_stamp',
    'battle_academy_deck_stamp',
    'snowflake_symbol',
    'play_pokemon_stamp',
  ]);
  const rows = (input.results ?? []).filter((row) => (
    row.stamp_identity_keys ?? []
  ).some((identity) => activeTargets.has(identity)));
  const cardPageRows = rows.filter((row) => (
    row.stamp_identity_keys ?? []
  ).some((identity) => ['snowflake_symbol', 'play_pokemon_stamp'].includes(identity)));
  const cardPageEntries = await Promise.all(cardPageRows.map(async (row) => [
    keyFor(row),
    await fetchRaw(cardPageTitle(row)),
  ]));
  const sources = {
    trickMap: new Map(parseSetlistEntries(trickRaw).map((entry) => [keyFor(entry), entry])),
    battleMap: new Map(parseHalfDeckEntries(battleRaw).map((entry) => [keyFor(entry), entry])),
    cardPageRawByKey: new Map(cardPageEntries),
    prizeRows: new Map((prizePack.results ?? []).map((entry) => [keyFor(entry), entry])),
  };
  const results = rows.map((row) => classifyRow(row, sources));
  const report = {
    version: OUT_BASENAME,
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_key: 'sv03_product_family_stamped_finish_review',
    source_kind: 'human_readable_checklist',
    source_urls: Object.values(PAGES).map((page) => page.source_url),
    fingerprint_sha256: sha256(stableJson(results)),
    summary: {
      target_rows: results.length,
      review_candidate_rows: results.filter((row) => row.status === 'review_candidate_found').length,
      blocked_rows: results.filter((row) => row.status !== 'review_candidate_found').length,
      write_ready_now: 0,
      by_status: countBy(results, (row) => row.status),
      by_observation_status: countBy(results.flatMap((row) => row.observations), (row) => row.status),
      by_proposed_finish: countBy(results.flatMap((row) => row.proposed_finish_keys), (finish) => finish),
    },
    results,
  };
  await writeJson(path.join(REPORT_DIR, `${OUT_BASENAME}.json`), report);
  await writeText(path.join(REPORT_DIR, `${OUT_BASENAME}.md`), renderMarkdown(report));
  console.log(JSON.stringify({
    report_json: path.join(REPORT_DIR, `${OUT_BASENAME}.json`).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
