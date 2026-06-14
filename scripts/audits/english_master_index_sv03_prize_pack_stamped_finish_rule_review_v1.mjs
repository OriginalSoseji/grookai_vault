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
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/sv03_prize_pack_stamped_finish_rule_review_v1';
const OUT_BASENAME = 'sv03_prize_pack_stamped_finish_rule_review_v1';
const SERIES = [
  { key: 'four', label: 'Four', title: 'Play! Pokémon Prize Pack Series Four (TCG)' },
  { key: 'five', label: 'Five', title: 'Play! Pokémon Prize Pack Series Five (TCG)' },
  { key: 'six', label: 'Six', title: 'Play! Pokémon Prize Pack Series Six (TCG)' },
];

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

function pageUrl(title) {
  return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
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

function parseRule(raw) {
  return raw.replace(/\r?\n/g, ' ').match(/Foil cards in this set have[^.]+\./i)?.[0] ?? null;
}

function parseEntries(raw, series) {
  const entries = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('{{Setlist/entry|')) continue;
    if (!/link=Obsidian Flames \(TCG\)/.test(line)) continue;
    const body = line.replace(/^\{\{Setlist\/entry\|/, '').replace(/\}\}\s*$/, '');
    const fields = splitTopLevel(body);
    const number = fields[0]?.match(/\b([A-Za-z0-9.-]+)\s*\/\s*197\b/)?.[1];
    if (!number) continue;
    entries.push({
      series_key: series.key,
      series_label: series.label,
      source_url: pageUrl(series.title),
      card_number: normalizeNumber(number),
      card_name: cleanName(fields[2] ?? ''),
      promotion: fields[6] ?? '',
      rarity: fields[5] ?? '',
      is_ex: /\{\{(?:Tera )?ex\}\}/i.test(fields[2] ?? '') || /\bex\b/i.test(cleanName(fields[2] ?? '')),
      raw_entry: line,
    });
  }
  return entries;
}

function referencedSeries(row) {
  const labels = [];
  for (const observation of row.observations ?? []) {
    if (!observation.stamp_identity_keys?.includes('play_pokemon_stamp')) continue;
    for (const series of SERIES) {
      if (new RegExp(`Prize Pack Series ${series.label}`, 'i').test(observation.evidence_label ?? '')) {
        labels.push(series.key);
      }
    }
  }
  return [...new Set(labels)];
}

function classify(row, entriesBySeries, rulesBySeries) {
  const seriesKeys = referencedSeries(row);
  const observations = [];
  for (const seriesKey of seriesKeys) {
    const entry = entriesBySeries.get(`${seriesKey}|${normalizeNumber(row.card_number)}|${normalizeText(row.card_name)}`);
    const rule = rulesBySeries.get(seriesKey);
    if (!entry) {
      observations.push({
        series_key: seriesKey,
        status: 'blocked_no_exact_prize_pack_row',
        source_url: SERIES.find((item) => item.key === seriesKey)?.title,
        page_foil_rule: rule,
      });
      continue;
    }
    if (/Standard Set Foil/i.test(entry.promotion) && !entry.is_ex && /Cosmos Holofoil/i.test(rule ?? '')) {
      observations.push({
        ...entry,
        status: 'review_candidate_cosmos_from_exact_standard_set_foil_rule',
        accepted_finish_key: 'cosmos',
        page_foil_rule: rule,
      });
    } else if (/Standard Set Foil/i.test(entry.promotion) && entry.is_ex && /retain their regular foil patterns/i.test(rule ?? '')) {
      observations.push({
        ...entry,
        status: 'blocked_ex_regular_foil_pattern_requires_active_finish_mapping',
        accepted_finish_key: null,
        page_foil_rule: rule,
      });
    } else if (/Standard Set$/i.test(entry.promotion)) {
      observations.push({
        ...entry,
        status: 'blocked_standard_set_no_foil_finish_claim',
        accepted_finish_key: null,
        page_foil_rule: rule,
      });
    } else {
      observations.push({
        ...entry,
        status: 'blocked_unhandled_prize_pack_promotion',
        accepted_finish_key: null,
        page_foil_rule: rule,
      });
    }
  }
  const accepted = observations.filter((item) => item.status === 'review_candidate_cosmos_from_exact_standard_set_foil_rule');
  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    referenced_series: seriesKeys,
    status: accepted.length > 0 ? 'review_candidate_cosmos_from_prize_pack_rule' : (observations[0]?.status ?? 'no_play_pokemon_prize_pack_reference'),
    accepted_finish_key: accepted[0]?.accepted_finish_key ?? null,
    observations,
  };
}

function renderMarkdown(report) {
  const rows = report.results.map((row) => [
    row.card_number,
    row.card_name,
    row.referenced_series.join(', '),
    row.status,
    row.accepted_finish_key ?? '',
    row.observations.map((item) => item.promotion).filter(Boolean).join(' | '),
  ]);
  return `# SV03 Prize Pack Stamped Finish Rule Review V1

Generated: ${report.generated_at}

Audit-only targeted review of SV03 Play! Pokemon Prize Pack stamped rows. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['review_candidate_rows', report.summary.review_candidate_rows],
    ['blocked_rows', report.summary.blocked_rows],
    ['by_status', JSON.stringify(report.summary.by_status)],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Rows

${markdownTable(['number', 'card', 'series', 'status', 'finish', 'promotion'], rows)}
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const input = await readJson(INPUT_JSON);
  const sourceRows = (input.results ?? []).filter((row) => referencedSeries(row).length > 0);
  const pagePayloads = await Promise.all(SERIES.map(async (series) => ({
    series,
    raw: await fetchRaw(series.title),
  })));
  const rulesBySeries = new Map(pagePayloads.map(({ series, raw }) => [series.key, parseRule(raw)]));
  const entries = pagePayloads.flatMap(({ series, raw }) => parseEntries(raw, series));
  const entriesBySeries = new Map(entries.map((entry) => [
    `${entry.series_key}|${normalizeNumber(entry.card_number)}|${normalizeText(entry.card_name)}`,
    entry,
  ]));
  const results = sourceRows.map((row) => classify(row, entriesBySeries, rulesBySeries));
  const accepted = results.filter((row) => row.status === 'review_candidate_cosmos_from_prize_pack_rule');
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
    source_key: 'bulbapedia_sv03_prize_pack_stamped_finish_rule_review',
    source_kind: 'human_readable_checklist',
    source_urls: SERIES.map((series) => pageUrl(series.title)),
    rule: 'Accept only exact Prize Pack rows where the row is Standard Set Foil and the page-level foil rule maps that row to Cosmos Holofoil. Pokemon ex regular-foil-pattern rows remain blocked until active finish mapping is explicitly governed.',
    fingerprint_sha256: sha256(stableJson(results)),
    summary: {
      target_rows: results.length,
      source_entries_parsed: entries.length,
      review_candidate_rows: accepted.length,
      blocked_rows: results.length - accepted.length,
      write_ready_now: 0,
      by_status: countBy(results, (row) => row.status),
      by_observation_status: countBy(results.flatMap((row) => row.observations), (row) => row.status),
    },
    page_rules: Object.fromEntries(rulesBySeries),
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
