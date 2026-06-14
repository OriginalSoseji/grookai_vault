import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const MASTER_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join('docs', 'audits', 'english_master_index_source_exhaustion_v1');
const REPORT_DIR = path.join(SOURCE_DIR, 'sv03_bulbapedia_additional_stamped_active_finish_v1');
const FIXTURE_DIR = path.join(
  DEFAULT_OUTPUT_DIR,
  'source_fixtures',
  'generated_sv03_bulbapedia_additional_stamped_active_finish_v1',
);
const INPUT_JSON = path.join(MASTER_DIR, 'english_master_index_sv03_stamped_active_finish_closure_queue_v1.json');
const OUT_BASENAME = 'sv03_bulbapedia_additional_stamped_active_finish_v1';
const BULBAPEDIA_PAGE = 'Obsidian Flames (TCG)';
const SOURCE_URL = 'https://bulbapedia.bulbagarden.net/wiki/Obsidian_Flames_(TCG)';
const RAW_URL = 'https://bulbapedia.bulbagarden.net/w/index.php?title=Obsidian_Flames_(TCG)&action=raw';
const SOURCE_KEY = 'bulbapedia_sv03_additional_stamped_active_finish';

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function targetKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

async function fetchBulbapediaRaw() {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '60',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    RAW_URL,
  ], { timeout: 75_000, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

function splitTemplateParams(body) {
  const parts = [];
  let current = '';
  let depth = 0;
  for (let index = 0; index < body.length; index += 1) {
    const pair = body.slice(index, index + 2);
    if (pair === '{{' || pair === '[[') {
      depth += 1;
      current += pair;
      index += 1;
      continue;
    }
    if ((pair === '}}' || pair === ']]') && depth > 0) {
      depth -= 1;
      current += pair;
      index += 1;
      continue;
    }
    if (body[index] === '|' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += body[index];
  }
  parts.push(current.trim());
  return parts;
}

function collapseTemplate(value) {
  const inner = value.slice(2, -2);
  const parts = splitTemplateParams(inner);
  if (/^TCG ID$/i.test(parts[0] ?? '')) return parts[2] ?? '';
  if (/^TCGMerch$/i.test(parts[0] ?? '')) return parts.at(-1) ?? '';
  if (/^TCG$/i.test(parts[0] ?? '')) return parts[1] ?? '';
  if (/^(ex|Tera ex)$/i.test(parts[0] ?? '')) return ` ${parts[0].trim()}`;
  return parts.at(-1) ?? '';
}

function cleanWikiText(value) {
  let text = String(value ?? '');
  text = text.replace(/<br\s*\/?>/gi, '; ');
  for (let safety = 0; safety < 20 && /\{\{[^{}]*\}\}/.test(text); safety += 1) {
    text = text.replace(/\{\{[^{}]*\}\}/g, collapseTemplate);
  }
  text = text.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  text = text.replace(/'{2,}/g, '');
  text = text.replace(/\s*;\s*/g, '; ');
  return text.replace(/\s+/g, ' ').trim();
}

function parseCardName(rawName) {
  const cleaned = cleanWikiText(rawName);
  return cleaned
    .replace(/\bTera ex\b/gi, 'ex')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEntries(raw) {
  const entries = [];
  const start = raw.indexOf('Setlist/nmheader|title=Additional Cards');
  if (start < 0) return entries;
  const footer = raw.indexOf('{{Setlist/footer', start);
  const section = raw.slice(start, footer > start ? footer : raw.length);
  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{{Setlist/nmentry|')) continue;
    const body = trimmed.slice('{{Setlist/nmentry|'.length, trimmed.endsWith('}}') ? -2 : undefined);
    const params = splitTemplateParams(body);
    const number = params[0]?.trim();
    const rawCardName = params[1]?.trim();
    const noteField = params.find((part) => /^6\s*=/.test(part))?.replace(/^6\s*=/, '')
      ?? params[5]
      ?? '';
    if (!number || !rawCardName || !noteField) continue;
    entries.push({
      card_number: normalizeNumber(number),
      card_name: parseCardName(rawCardName),
      raw_note: noteField,
      evidence_label: cleanWikiText(noteField),
    });
  }
  return entries;
}

function activeFinishFromLabel(label) {
  const text = String(label ?? '');
  if (/\bCosmos Holo\b/i.test(text)) return 'cosmos';
  if (/\bReverse Holo\b/i.test(text)) return 'reverse';
  if (/\bNon[-\s]?Holo\b/i.test(text)) return 'normal';
  if (/\bHolo\b/i.test(text)) return 'holo';
  return null;
}

function stampIdentityFromLabel(label) {
  const text = String(label ?? '');
  const identities = [];
  if (/Play! Pokémon"? Stamp/i.test(text) || /"Play! Pokémon" Stamp/i.test(text)) identities.push('play_pokemon_stamp');
  if (/Pikachu jack-o'-lantern stamp/i.test(text)) identities.push('pikachu_jack_o_lantern_stamp');
  if (/Battle Academy 2024/i.test(text) && /Deck stamp/i.test(text)) identities.push('battle_academy_deck_stamp');
  if (/Regionals 2023 Staff promo/i.test(text)) identities.push('regionals_2023_staff_promo');
  else if (/Regionals 2023 promo/i.test(text)) identities.push('regionals_2023_promo');
  if (/Pokémon TCG Gym stamped Present Pack/i.test(text)) identities.push('pokemon_tcg_gym_present_pack_stamp');
  if (/Great Ball League Promo/i.test(text)) identities.push('great_ball_league_promo');
  if (/Snowflake Symbol/i.test(text)) identities.push('snowflake_symbol');
  if (/Jumbo .*stamp/i.test(text)) identities.push('jumbo_stamp');
  return [...new Set(identities)];
}

function classifyObservation(entry) {
  const acceptedFinishKey = activeFinishFromLabel(entry.evidence_label);
  const stampIdentityKeys = stampIdentityFromLabel(entry.evidence_label);
  const isJumbo = /\bJumbo\b/i.test(entry.evidence_label);

  if (isJumbo && !acceptedFinishKey) {
    return {
      status: 'blocked_jumbo_or_display_only_no_active_finish',
      accepted_finish_key: null,
      stamp_identity_keys: stampIdentityKeys,
      evidence_label: entry.evidence_label,
      source_url: SOURCE_URL,
    };
  }

  if (acceptedFinishKey && stampIdentityKeys.length > 0 && !stampIdentityKeys.includes('jumbo_stamp')) {
    return {
      status: 'accepted_active_finish_and_stamped_identity_review_candidate',
      accepted_finish_key: acceptedFinishKey,
      stamp_identity_keys: stampIdentityKeys,
      evidence_label: entry.evidence_label,
      source_url: SOURCE_URL,
    };
  }

  if (acceptedFinishKey) {
    return {
      status: 'active_finish_only_identity_not_proven',
      accepted_finish_key: acceptedFinishKey,
      stamp_identity_keys: stampIdentityKeys,
      evidence_label: entry.evidence_label,
      source_url: SOURCE_URL,
    };
  }

  if (stampIdentityKeys.length > 0) {
    return {
      status: 'identity_only_no_active_finish',
      accepted_finish_key: null,
      stamp_identity_keys: stampIdentityKeys,
      evidence_label: entry.evidence_label,
      source_url: SOURCE_URL,
    };
  }

  return {
    status: 'source_entry_ambiguous_no_usable_finish_or_identity',
    accepted_finish_key: null,
    stamp_identity_keys: stampIdentityKeys,
    evidence_label: entry.evidence_label,
    source_url: SOURCE_URL,
  };
}

function classifyEvidence(target, entries) {
  if (!entries?.length) {
    return {
      ...target,
      status: 'source_entry_missing',
      accepted_finish_key: null,
      stamp_identity_keys: [],
      evidence_label: null,
      observations: [],
      source_url: SOURCE_URL,
    };
  }

  const observations = entries.map(classifyObservation);
  const accepted = observations.filter((item) => item.status === 'accepted_active_finish_and_stamped_identity_review_candidate');
  const priority = [
    'accepted_active_finish_and_stamped_identity_review_candidate',
    'active_finish_only_identity_not_proven',
    'identity_only_no_active_finish',
    'blocked_jumbo_or_display_only_no_active_finish',
    'source_entry_ambiguous_no_usable_finish_or_identity',
  ];
  const status = priority.find((candidate) => observations.some((item) => item.status === candidate));
  return {
    ...target,
    status,
    accepted_finish_key: accepted[0]?.accepted_finish_key ?? null,
    stamp_identity_keys: [...new Set(observations.flatMap((item) => item.stamp_identity_keys))].sort(),
    evidence_label: observations.map((item) => item.evidence_label).filter(Boolean).join(' | '),
    observations,
    source_url: SOURCE_URL,
  };
}

function fixtureRecord(row, observation, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'human_readable_checklist',
    source_url: row.source_url,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: observation.accepted_finish_key,
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `Bulbapedia ${BULBAPEDIA_PAGE} Additional Cards: ${observation.evidence_label}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `bulbapedia:${BULBAPEDIA_PAGE}:additional-cards:${row.card_number}:${observation.accepted_finish_key}:${observation.stamp_identity_keys.join('+')}`,
    notes: `Stamped identity evidence: ${observation.stamp_identity_keys.join(', ')}. This fixture proves active finish and stamped/product identity only; it does not authorize DB writes.`,
  };
}

async function writeFixture(rows, generatedAt, dryRun) {
  const accepted = rows.flatMap((row) => (
    row.observations ?? []
  ).filter((observation) => observation.status === 'accepted_active_finish_and_stamped_identity_review_candidate').map((observation) => ({
    row,
    observation,
  })));
  if (dryRun || accepted.length === 0) return null;
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: SOURCE_KEY,
    source_kind: 'human_readable_checklist',
    source_url: SOURCE_URL,
    source_status: 'available_generated',
    set_key: 'sv03',
    set_name: 'Obsidian Flames',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:${SOURCE_KEY}:${generatedAt}`,
    generation_note: 'Generated only from Bulbapedia Obsidian Flames Additional Cards rows where the same row explicitly proves both active finish and stamped/product identity.',
    records: accepted.map(({ row, observation }) => fixtureRecord(row, observation, generatedAt)),
  };
  const fixturePath = path.join(FIXTURE_DIR, 'sv03.json');
  await writeJson(fixturePath, fixture);
  return fixturePath;
}

function buildMarkdown(report) {
  const summaryRows = [
    ['target_rows', report.summary.target_rows],
    ['bulbapedia_entries_matched', report.summary.bulbapedia_entries_matched],
    ['accepted_active_finish_identity_candidates', report.summary.accepted_active_finish_identity_candidates],
    ['identity_only_no_active_finish', report.summary.by_status.identity_only_no_active_finish ?? 0],
    ['active_finish_only_identity_not_proven', report.summary.by_status.active_finish_only_identity_not_proven ?? 0],
    ['blocked_jumbo_or_display_only_no_active_finish', report.summary.by_status.blocked_jumbo_or_display_only_no_active_finish ?? 0],
    ['source_entry_missing', report.summary.by_status.source_entry_missing ?? 0],
    ['fixture_records_generated', report.summary.fixture_records_generated],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ];
  const rowTable = report.results.map((row) => [
    row.card_number,
    row.card_name,
    row.status,
    row.accepted_finish_key ?? '',
    row.stamp_identity_keys.join(', '),
    row.evidence_label ?? '',
  ]);
  return `# SV03 Bulbapedia Additional Stamped Active Finish V1

Generated: ${report.generated_at}

Audit-only acquisition against Bulbapedia Obsidian Flames Additional Cards. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Safety

${markdownTable(['check', 'value'], Object.entries(report.safety_confirmation))}

## Summary

${markdownTable(['metric', 'value'], summaryRows)}

## Source Rule

Bulbapedia rows are accepted only when the same Additional Cards entry explicitly proves both an active finish and a stamped/product identity. Stamp-only rows remain blocked because \`stamped\` is not a child finish key.

Source: ${report.source_url}

## Results

${markdownTable(['number', 'card', 'status', 'active_finish', 'identity', 'evidence_label'], rowTable)}
`;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [queue, raw] = await Promise.all([readJson(INPUT_JSON), fetchBulbapediaRaw()]);
  const targets = (queue.rows ?? []).map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: normalizeNumber(row.card_number),
    card_name: row.card_name,
    closure_lane: row.closure_lane,
  }));
  const entries = parseEntries(raw);
  const entriesByKey = new Map();
  for (const entry of entries) {
    const key = ['sv03', normalizeNumber(entry.card_number), normalizeText(entry.card_name)].join('|');
    if (!entriesByKey.has(key)) entriesByKey.set(key, []);
    entriesByKey.get(key).push(entry);
  }
  const results = targets.map((target) => classifyEvidence(target, entriesByKey.get(targetKey(target))));
  const fixturePath = await writeFixture(results, generatedAt, options.dryRun);
  const accepted = results.flatMap((row) => row.observations ?? [])
    .filter((row) => row.status === 'accepted_active_finish_and_stamped_identity_review_candidate');
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
    dry_run: options.dryRun,
    source_key: SOURCE_KEY,
    source_kind: 'human_readable_checklist',
    source_url: SOURCE_URL,
    raw_source_url: RAW_URL,
    source_artifact: INPUT_JSON.replaceAll('\\', '/'),
    fixture_dir: FIXTURE_DIR.replaceAll('\\', '/'),
    fixture_file: fixturePath ? path.relative(ROOT, fixturePath).replaceAll('\\', '/') : null,
    fingerprint_sha256: sha256(stableJson(results.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      status: row.status,
      accepted_finish_key: row.accepted_finish_key,
      stamp_identity_keys: row.stamp_identity_keys,
      evidence_label: row.evidence_label,
    })))),
    summary: {
      target_rows: targets.length,
      bulbapedia_entries_matched: results.filter((row) => row.evidence_label).length,
      accepted_active_finish_identity_candidates: accepted.length,
      fixture_records_generated: accepted.length,
      write_ready_now: 0,
      by_status: countBy(results, (row) => row.status),
      by_accepted_finish: countBy(accepted, (row) => row.accepted_finish_key),
    },
    results,
    safety_confirmation: {
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      write_ready_now: 0,
    },
  };
  await writeJson(path.join(REPORT_DIR, `${OUT_BASENAME}.json`), report);
  await writeText(path.join(REPORT_DIR, `${OUT_BASENAME}.md`), buildMarkdown(report));
  console.log(JSON.stringify({
    report_json: path.join(REPORT_DIR, `${OUT_BASENAME}.json`).replaceAll('\\', '/'),
    fixture_file: report.fixture_file,
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
