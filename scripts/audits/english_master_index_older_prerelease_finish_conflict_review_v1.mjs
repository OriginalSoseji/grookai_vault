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
  'docs/audits/english_master_index_source_exhaustion_v1/older_prerelease_finish_conflict_review_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'older_prerelease_finish_conflict_review_v1.json');
const OUT_MD = path.join(OUT_DIR, 'older_prerelease_finish_conflict_review_v1.md');

const TARGETS = [
  {
    set_key: 'bwp',
    card_number: 'BW75',
    card_name: 'Metagross',
    sources: [
      {
        source_key: 'pricecharting_metagross_bw75',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/metagross-bw75',
        required_terms: ['Metagross', 'BW75', 'Prerelease', 'Holo'],
        claimed_finish_key: 'holo',
      },
      {
        source_key: 'tcgplayer_metagross_bw75_prerelease',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/87344/pokemon-black-and-white-promos-metagross-bw75-team-plasma-prerelease',
        required_terms: ['Metagross', 'BW75', 'Prerelease', 'Holofoil'],
        claimed_finish_key: 'holo',
      },
    ],
  },
  {
    set_key: 'ex4',
    card_number: '24',
    card_name: "Team Aqua's Cacnea",
    sources: [
      {
        source_key: 'pricecharting_cacnea_prerelease_24',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-team-magma-%26-team-aqua/cacnea-prerelease-24',
        required_terms: ['Prerelease', '24', 'Holo'],
        claimed_finish_key: 'holo',
      },
      {
        source_key: 'pokumon_cacnea_prerelease_special_print',
        source_kind: 'collector_reference',
        source_url: 'https://pokumon.com/card/team-aquas-cacnea-24-95-ex-team-magma-vs-team-aqua-prerelease-special-print/',
        required_terms: ['Team Aqua', 'Cacnea', '24/95', 'Prerelease'],
        claimed_finish_key: null,
      },
      {
        source_key: 'pokecardvalues_cacnea_non_holo_prerelease',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/team-aquas-cacnea-24-95-non-holo-prerelease-stamp-team-magma-vs-team-aqua/ex4-24-2-54/',
        required_terms: ['Team Aqua', 'Cacnea', '24/95', 'Non-Holo', 'Prerelease Stamp'],
        claimed_finish_key: 'normal',
      },
    ],
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
        maxBuffer: 12 * 1024 * 1024,
      }));
    } catch (fallbackError) {
      throw new Error(`${error.message}; powershell_fallback_failed:${fallbackError.status ?? 'unknown'}`);
    }
  }
}

function queueRows(queue) {
  return (queue.rows || queue.queue || queue.items || []).filter((row) => (
    row.action_bucket === 'prerelease_exact_finish_source'
    && TARGETS.some((target) => target.set_key === row.set_key && target.card_number === row.card_number)
  ));
}

async function inspect(source) {
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

function classify(sourceChecks) {
  const accepted = sourceChecks.filter((source) => source.all_required_terms_found);
  const claimedFinishes = [...new Set(accepted.map((source) => source.claimed_finish_key).filter(Boolean))].sort();
  if (accepted.length >= 2 && claimedFinishes.length === 1) {
    return {
      status: 'source_ready_candidate_no_db_write',
      accepted_source_count: accepted.length,
      claimed_finish_keys: claimedFinishes,
      decision_reason: 'Two or more fetched sources support the same exact active finish.',
    };
  }
  if (claimedFinishes.length > 1) {
    return {
      status: 'manual_finish_conflict_no_write',
      accepted_source_count: accepted.length,
      claimed_finish_keys: claimedFinishes,
      decision_reason: 'Fetched sources support different active finishes; fail closed.',
    };
  }
  return {
    status: 'review_only_insufficient_second_source_no_write',
    accepted_source_count: accepted.length,
    claimed_finish_keys: claimedFinishes,
    decision_reason: 'Exact source evidence exists but not enough independently fetched agreement for promotion.',
  };
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
  return `# Older Prerelease Finish Conflict Review V1

Audit-only review for the two older prerelease rows still in the stamped/special queue.

## Summary

${mdTable([
    { label: 'metric', value: (row) => row[0] },
    { label: 'value', value: (row) => row[1] },
  ], [
    ['target_queue_rows', report.summary.target_queue_rows],
    ['source_ready_candidates', report.summary.source_ready_candidates],
    ['manual_finish_conflicts', report.summary.manual_finish_conflicts],
    ['review_only_rows', report.summary.review_only_rows],
    ['write_ready_created', report.summary.write_ready_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Results

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'card', value: (row) => row.card_name },
    { label: 'status', value: (row) => row.status },
    { label: 'claimed finishes', value: (row) => row.claimed_finish_keys.join(', ') },
    { label: 'reason', value: (row) => row.decision_reason },
  ], report.results)}

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- fixtures_created: false

`;
}

const queue = await readJson(QUEUE_PATH);
const targets = queueRows(queue);
const targetByKey = new Map(targets.map((row) => [`${row.set_key}|${row.card_number}`, row]));
const results = [];

for (const target of TARGETS) {
  const row = targetByKey.get(`${target.set_key}|${target.card_number}`);
  const sourceChecks = [];
  for (const source of target.sources) {
    sourceChecks.push(await inspect(source));
  }
  results.push({
    set_key: target.set_key,
    set_name: row?.set_name ?? null,
    card_number: target.card_number,
    card_name: target.card_name,
    stamp_label: row?.stamp_label ?? 'Prerelease Stamp',
    variant_key: row?.variant_key ?? 'prerelease_stamp',
    in_current_queue: Boolean(row),
    source_checks: sourceChecks,
    ...classify(sourceChecks),
  });
}

const reportCore = {
  version: 'older_prerelease_finish_conflict_review_v1',
  generated_at: new Date().toISOString(),
  audit_only: true,
  summary: {
    target_queue_rows: targets.length,
    source_ready_candidates: results.filter((row) => row.status === 'source_ready_candidate_no_db_write').length,
    manual_finish_conflicts: results.filter((row) => row.status === 'manual_finish_conflict_no_write').length,
    review_only_rows: results.filter((row) => row.status === 'review_only_insufficient_second_source_no_write').length,
    write_ready_created: 0,
  },
  results,
  safety: {
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    fixtures_created: false,
  },
};

const report = {
  ...reportCore,
  fingerprint_sha256: sha256(stableJson(reportCore)),
};

await writeJson(OUT_JSON, report);
await writeText(OUT_MD, buildMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUT_JSON),
  output_md: path.relative(ROOT, OUT_MD),
  ...report.summary,
  fingerprint_sha256: report.fingerprint_sha256,
}, null, 2));
