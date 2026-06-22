import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const QUEUE_PATH = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json',
);
const OUT_DIR = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/me02_suicune_eb_games_second_source_review_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'me02_suicune_eb_games_second_source_review_v1.json');
const OUT_MD = path.join(OUT_DIR, 'me02_suicune_eb_games_second_source_review_v1.md');

const SOURCES = [
  {
    source_key: 'hobbyscan_card_379797',
    source_kind: 'collector_reference',
    source_url: 'https://www.hobbyscan.com/card/379797',
    required_terms: [
      'Suicune',
      'Phantasmal Flames',
      'ME02',
      'Card Number',
      '026',
      'Features',
      'Holo',
      'EB Games Stamp',
      'English',
    ],
    evidence_label: 'HobbyScan card page terms: Suicune, Phantasmal Flames, ME02, #026, Holo, EB Games Stamp, English',
  },
  {
    source_key: 'hobbyscan_card_359806',
    source_kind: 'collector_reference',
    source_url: 'https://www.hobbyscan.com/card/359806',
    required_terms: [
      'Suicune',
      'Phantasmal Flames',
      'Card Number',
      '026',
      'Features',
      'Holo',
      'EB Games Stamp',
      'English',
    ],
    evidence_label: 'HobbyScan alternate card page terms: Suicune, Phantasmal Flames, #026, Holo, EB Games Stamp, English',
  },
  {
    source_key: 'pokemon_official_phantasmal_flames_retailer_promos',
    source_kind: 'official_gallery',
    source_url: 'https://www.pokemon.com/us/pokemon-news/get-suicune-reshiram-and-genesect-promo-cards-at-participating-retailers',
    required_terms: [
      'Suicune',
      'Phantasmal Flames',
      'EB Games',
      'GameStop',
      'Hot Topic',
    ],
    evidence_label: 'Official Pokemon news page terms: Suicune, Phantasmal Flames, EB Games, GameStop, Hot Topic',
  },
];

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

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '-');
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiSourceAudit/1.0 (+audit-only; no purchase automation)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return decodeHtml(await response.text());
  } catch (error) {
    const script = [
      '$ProgressPreference = "SilentlyContinue";',
      '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
      `$r = Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -TimeoutSec 30;`,
      '$r.Content',
    ].join(' ');
    try {
      return decodeHtml(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      }));
    } catch (fallbackError) {
      throw new Error(`${error.message}; powershell_fallback_failed:${fallbackError.status ?? 'unknown'}`);
    }
  }
}

function queueRows(queue) {
  return (queue.rows || queue.queue || queue.items || []).filter((row) => (
    row.set_key === 'me02'
    && String(row.card_number || '').replace(/^0+/, '') === '26'
    && row.card_name === 'Suicune'
    && (row.stamp_label === 'EB Games Stamp' || row.variant_key === 'eb_games_stamp')
  ));
}

async function inspectSource(source) {
  try {
    const html = await fetchText(source.source_url);
    const term_results = source.required_terms.map((term) => ({
      term,
      found: html.includes(term),
    }));
    return {
      ...source,
      fetch_status: 'fetched',
      term_results,
      all_required_terms_found: term_results.every((result) => result.found),
    };
  } catch (error) {
    return {
      ...source,
      fetch_status: `fetch_failed:${error.message}`,
      term_results: source.required_terms.map((term) => ({ term, found: false })),
      all_required_terms_found: false,
    };
  }
}

function mdTable(columns, rows) {
  if (!rows.length) return '_None._\n';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n') + '\n';
}

function buildMarkdown(report) {
  return `# ME02 Suicune EB Games Second Source Review V1

Audit-only evidence review for ME02 / Phantasmal Flames / Suicune #026 / EB Games Stamp.

This report creates no fixture and no write package. It preserves source findings for manual finish-taxonomy adjudication.

## Summary

${mdTable([
    { label: 'metric', value: (row) => row[0] },
    { label: 'value', value: (row) => row[1] },
  ], [
    ['queue_rows_found', report.summary.queue_rows_found],
    ['sources_checked', report.summary.sources_checked],
    ['sources_with_required_terms', report.summary.sources_with_required_terms],
    ['write_ready_created', report.summary.write_ready_created],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Decision

Status: \`${report.decision.status}\`

Reason: ${report.decision.reason}

Recommended next action: ${report.decision.recommended_next_action}

## Queue Rows

${mdTable([
    { label: 'bucket', value: (row) => row.action_bucket },
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'card', value: (row) => row.card_name },
    { label: 'stamp', value: (row) => row.stamp_label },
    { label: 'finish', value: (row) => row.finish_key || '' },
  ], report.queue_rows)}

## Source Checks

${mdTable([
    { label: 'source', value: (row) => row.source_key },
    { label: 'kind', value: (row) => row.source_kind },
    { label: 'required terms found', value: (row) => row.all_required_terms_found },
    { label: 'status', value: (row) => row.fetch_status },
    { label: 'url', value: (row) => row.source_url },
  ], report.sources)}

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- fixtures_created: false

`;
}

const queue = await readJson(QUEUE_PATH);
const rows = queueRows(queue);
const sources = [];
for (const source of SOURCES) {
  sources.push(await inspectSource(source));
}

const reportCore = {
  generated_at: new Date().toISOString(),
  scope: {
    set_key: 'me02',
    set_name: 'Phantasmal Flames',
    card_number: '026',
    card_name: 'Suicune',
    stamp_label: 'EB Games Stamp',
    variant_key: 'eb_games_stamp',
  },
  summary: {
    queue_rows_found: rows.length,
    sources_checked: sources.length,
    sources_with_required_terms: sources.filter((source) => source.all_required_terms_found).length,
    write_ready_created: 0,
  },
  decision: {
    status: 'manual_finish_taxonomy_adjudication_required',
    reason: 'Sources confirm Suicune #026 Phantasmal Flames with EB Games Stamp, and HobbyScan labels the feature as Holo. Existing collector context may use Cosmos/Cosmo wording for the same promo family, so this audit does not promote a child finish automatically.',
    recommended_next_action: 'Use this packet as review evidence. If Grookai decides EB Games Suicune active finish should remain holo, prepare a separate guarded dry-run package. If it should be cosmos, first update the Master Index finish taxonomy before any DB write.',
  },
  queue_rows: rows.map((row) => ({
    action_bucket: row.action_bucket,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    stamp_label: row.stamp_label,
    variant_key: row.variant_key,
    finish_key: row.finish_key ?? null,
  })),
  sources,
  safety: {
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    fixtures_created: false,
  },
};

const fingerprint = sha256(stableJson(reportCore));
const report = { ...reportCore, fingerprint_sha256: fingerprint };

await writeJson(OUT_JSON, report);
await writeText(OUT_MD, buildMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUT_JSON),
  output_md: path.relative(ROOT, OUT_MD),
  queue_rows_found: report.summary.queue_rows_found,
  sources_with_required_terms: report.summary.sources_with_required_terms,
  decision_status: report.decision.status,
  write_ready_created: report.summary.write_ready_created,
  fingerprint_sha256: report.fingerprint_sha256,
}, null, 2));
