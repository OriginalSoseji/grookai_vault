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
  'docs/audits/english_master_index_source_exhaustion_v1/brilliant_stars_prerelease_finish_evidence_v1',
);
const FIXTURE_DIR = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_brilliant_stars_prerelease_finish_evidence_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'brilliant_stars_prerelease_finish_evidence_v1.json');
const OUT_MD = path.join(OUT_DIR, 'brilliant_stars_prerelease_finish_evidence_v1.md');
const FIXTURE_JSON = path.join(FIXTURE_DIR, 'swshp_brilliant_stars_prerelease_holo_v1.json');

const CARDS = [
  { card_name: 'Moltres', card_number: 'SWSH185', f2f_slug: 'moltres-swsh185' },
  { card_name: 'Lucario', card_number: 'SWSH186', f2f_slug: 'lucario-swsh186' },
  { card_name: 'Liepard', card_number: 'SWSH187', f2f_slug: 'liepard-swsh187' },
  { card_name: 'Bibarel', card_number: 'SWSH188', f2f_slug: 'bibarel-swsh188' },
];

function f2fUrl(card) {
  return `https://facetofacegames.com/products/${card.f2f_slug}-promo-prerelease-swshp-${card.card_number.toLowerCase()}-holo`;
}

function pricechartingUrl(card) {
  return `https://www.pricecharting.com/game/pokemon-promo/${card.f2f_slug}`;
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
        maxBuffer: 12 * 1024 * 1024,
      }));
    } catch (fallbackError) {
      throw new Error(`${error.message}; powershell_fallback_failed:${fallbackError.status ?? 'unknown'}`);
    }
  }
}

function queueRows(queue) {
  const wanted = new Set(CARDS.map((card) => card.card_number));
  return (queue.rows || queue.queue || queue.items || []).filter((row) => (
    row.action_bucket === 'prerelease_exact_finish_source'
    && row.set_key === 'swshp'
    && wanted.has(row.card_number)
    && (row.stamp_label === 'Prerelease Stamp' || row.variant_key === 'prerelease_stamp')
  ));
}

async function inspect(url, terms) {
  try {
    const html = await fetchText(url);
    const term_results = terms.map((term) => ({
      term,
      found: html.includes(term),
    }));
    return {
      source_url: url,
      fetch_status: 'fetched',
      term_results,
      all_required_terms_found: term_results.every((result) => result.found),
    };
  } catch (error) {
    return {
      source_url: url,
      fetch_status: `fetch_failed:${error.message}`,
      term_results: terms.map((term) => ({ term, found: false })),
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
  return `# Brilliant Stars Prerelease Finish Evidence V1

Audit-only evidence packet for the SWSH Black Star Brilliant Stars prerelease promos currently in the stamped/special queue.

## Summary

${mdTable([
    { label: 'metric', value: (row) => row[0] },
    { label: 'value', value: (row) => row[1] },
  ], [
    ['target_queue_rows', report.summary.target_queue_rows],
    ['source_ready_candidates', report.summary.source_ready_candidates],
    ['fixture_records_written', report.summary.fixture_records_written],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Source-Ready Candidates

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'card', value: (row) => row.card_name },
    { label: 'stamp', value: (row) => row.stamp_label },
    { label: 'finish', value: (row) => row.finish_key },
    { label: 'sources', value: (row) => row.source_count },
    { label: 'status', value: (row) => row.status },
  ], report.results)}

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

`;
}

const generatedAt = new Date().toISOString();
const queue = await readJson(QUEUE_PATH);
const targets = queueRows(queue);
const targetByNumber = new Map(targets.map((row) => [row.card_number, row]));
const results = [];
const records = [];

for (const card of CARDS) {
  const row = targetByNumber.get(card.card_number);
  const f2f = await inspect(f2fUrl(card), [
    card.card_name,
    'Prerelease',
    'Holo',
    'Collector #:',
    card.card_number,
    'Sword & Shield Promotional Cards',
  ]);
  const pricecharting = await inspect(pricechartingUrl(card), [
    card.card_name,
    card.card_number,
    'Prerelease',
    'Holo',
  ]);
  const sourceChecks = [
    { source_key: 'facetofacegames_prerelease_product', source_kind: 'marketplace_checklist', ...f2f },
    { source_key: 'pricecharting_promo_price_guide', source_kind: 'marketplace_checklist', ...pricecharting },
  ];
  const sourceCount = sourceChecks.filter((source) => source.all_required_terms_found).length;
  const status = row && sourceCount >= 2 ? 'source_ready_candidate_no_db_write' : 'blocked_source_terms_missing_or_not_in_queue';
  results.push({
    set_key: row?.set_key ?? 'swshp',
    set_name: row?.set_name ?? 'SWSH Black Star Promos',
    card_number: card.card_number,
    card_name: card.card_name,
    stamp_label: row?.stamp_label ?? 'Prerelease Stamp',
    variant_key: row?.variant_key ?? 'prerelease_stamp',
    finish_key: 'holo',
    source_count: sourceCount,
    status,
    source_checks: sourceChecks,
  });
  if (status === 'source_ready_candidate_no_db_write') {
    for (const source of sourceChecks.filter((item) => item.all_required_terms_found)) {
      records.push({
        source_key: source.source_key,
        source_kind: source.source_kind,
        source_url: source.source_url,
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: card.card_number,
        card_name: card.card_name,
        finish_key: 'holo',
        rarity: 'Promo',
        evidence_type: 'finish_presence',
        evidence_label: `${source.source_key}: ${card.card_name} ${card.card_number} Prerelease Holo`,
        language: 'en',
        retrieved_at: generatedAt,
        raw_snapshot_ref: `generated_fixture:brilliant_stars_prerelease_finish:${card.card_number}:${source.source_key}:${generatedAt}`,
        notes: 'Audit-only exact source evidence for prerelease stamp active finish. No DB writes performed.',
      });
    }
  }
}

const fixture = {
  fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
  source_key: 'brilliant_stars_prerelease_finish_evidence_v1',
  source_kind: 'marketplace_checklist',
  source_url: 'multiple',
  source_status: 'available_generated_review_evidence',
  set_key: 'swshp',
  set_name: 'SWSH Black Star Promos',
  retrieved_at: generatedAt,
  raw_snapshot_ref: `generated_fixture:brilliant_stars_prerelease_finish_evidence_v1:${generatedAt}`,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  records,
};

const reportCore = {
  version: 'brilliant_stars_prerelease_finish_evidence_v1',
  generated_at: generatedAt,
  audit_only: true,
  summary: {
    target_queue_rows: targets.length,
    source_ready_candidates: results.filter((row) => row.status === 'source_ready_candidate_no_db_write').length,
    fixture_records_written: records.length,
    write_ready_created: 0,
  },
  results,
  fixture_output: path.relative(ROOT, FIXTURE_JSON),
  safety: {
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  },
};

const report = {
  ...reportCore,
  fingerprint_sha256: sha256(stableJson(reportCore)),
};

await writeJson(FIXTURE_JSON, fixture);
await writeJson(OUT_JSON, report);
await writeText(OUT_MD, buildMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUT_JSON),
  output_md: path.relative(ROOT, OUT_MD),
  fixture_json: path.relative(ROOT, FIXTURE_JSON),
  ...report.summary,
  fingerprint_sha256: report.fingerprint_sha256,
}, null, 2));
