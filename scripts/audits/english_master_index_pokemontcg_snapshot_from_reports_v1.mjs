import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_OUTPUT = path.join(DEFAULT_OUTPUT_DIR, 'source_snapshots', 'pokemontcg_api_source_snapshot_v1.json.gz');
const DEFAULT_REPORT_REF = 'HEAD';
const REPORT_ROOT = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const SOURCE_KEYS = new Set(['pokemontcg_api', 'tcgplayer_price_guide']);

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    reportRef: DEFAULT_REPORT_REF,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--output') {
      options.output = next;
      index += 1;
    } else if (arg === '--report-ref') {
      options.reportRef = next;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function gitShowJson(ref, file) {
  const { stdout } = await execFileAsync('git', ['show', `${ref}:${file}`], {
    maxBuffer: 250 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function sourceEvidenceKey(row) {
  return [
    row.source_key,
    row.evidence_type,
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeFinishKey(row.finish_key) ?? '',
  ].join('|');
}

function recordsFromFacts(facts) {
  const records = [];
  for (const fact of facts) {
    const expandedSources = new Set();
    for (const evidence of fact.evidence ?? []) {
      if (!SOURCE_KEYS.has(evidence.source_key)) continue;
      expandedSources.add(evidence.source_key);
      records.push({
        source_key: evidence.source_key,
        source_kind: evidence.source_kind,
        source_url: evidence.source_url,
        set_key: fact.set_key,
        set_name: fact.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: normalizeFinishKey(fact.finish_key),
        finish_key_raw: evidence.finish_key_raw ?? fact.finish_key ?? null,
        rarity: evidence.rarity ?? fact.rarity_values?.[0] ?? null,
        evidence_type: evidence.evidence_type,
        evidence_label: evidence.evidence_label,
        language: 'en',
        retrieved_at: evidence.retrieved_at ?? null,
        raw_snapshot_ref: evidence.raw_snapshot_ref,
        notes: evidence.notes ?? null,
        source_card_name: fact.card_name,
        source_set_name: fact.set_name,
        marketplace_source_url: evidence.marketplace_source_url ?? null,
      });
    }
    if (fact.fact_type !== 'printing_finish') continue;
    for (const sourceKey of fact.sources ?? []) {
      if (!SOURCE_KEYS.has(sourceKey) || expandedSources.has(sourceKey)) continue;
      const sourceUrl = sourceKey === 'pokemontcg_api'
        ? (fact.evidence_urls ?? []).find((url) => /api\.pokemontcg\.io/i.test(url))
        : (fact.evidence_urls ?? []).find((url) => /prices\.pokemontcg\.io|tcgplayer/i.test(url));
      if (!sourceUrl) continue;
      records.push({
        source_key: sourceKey,
        source_kind: sourceKey === 'tcgplayer_price_guide' ? 'marketplace_checklist' : 'structured_api',
        source_url: sourceUrl,
        set_key: fact.set_key,
        set_name: fact.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: normalizeFinishKey(fact.finish_key),
        finish_key_raw: fact.finish_key ?? null,
        rarity: fact.rarity_values?.[0] ?? null,
        evidence_type: 'finish_presence',
        evidence_label: sourceKey === 'tcgplayer_price_guide'
          ? `Cached TCGplayer price-guide variant ${fact.finish_key}`
          : `Cached PokemonTCG.io finish ${fact.finish_key}`,
        language: 'en',
        retrieved_at: null,
        raw_snapshot_ref: `${sourceKey}:${fact.set_key}:${fact.card_number}:${normalizeFinishKey(fact.finish_key)}`,
        notes: 'Reconstructed from compact English Master Index report evidence URLs for source-outage fallback.',
        source_card_name: fact.card_name,
        source_set_name: fact.set_name,
        marketplace_source_url: sourceKey === 'tcgplayer_price_guide' ? sourceUrl : null,
      });
    }
  }
  return records;
}

function uniqueRecords(records) {
  const seen = new Set();
  const unique = [];
  for (const record of records) {
    const key = sourceEvidenceKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }
  return unique;
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const [setsReport, cardsReport, printingsReport] = await Promise.all([
    gitShowJson(options.reportRef, `${REPORT_ROOT}/english_master_index_sets_v1.json`),
    gitShowJson(options.reportRef, `${REPORT_ROOT}/english_master_index_cards_v1.json`),
    gitShowJson(options.reportRef, `${REPORT_ROOT}/english_master_index_printings_v1.json`),
  ]);

  const records = uniqueRecords([
    ...recordsFromFacts(cardsReport.cards ?? []),
    ...recordsFromFacts(printingsReport.printings ?? []),
  ]);
  const payload = {
    version: 'POKEMONTCG_API_SOURCE_SNAPSHOT_V1',
    generated_at: generatedAt,
    source_report_ref: options.reportRef,
    source_reports: [
      `${REPORT_ROOT}/english_master_index_sets_v1.json`,
      `${REPORT_ROOT}/english_master_index_cards_v1.json`,
      `${REPORT_ROOT}/english_master_index_printings_v1.json`,
    ],
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    note: 'Cached source evidence snapshot for audit resilience when PokemonTCG.io is temporarily unavailable. This does not create truth by itself; records retain original source keys and are still classified by the Master Index agreement engine.',
    summary: {
      set_configs: setsReport.sets?.length ?? 0,
      records: records.length,
      by_source_key: countBy(records, (row) => row.source_key),
      by_evidence_type: countBy(records, (row) => row.evidence_type),
    },
    set_configs: setsReport.sets ?? [],
    records,
  };

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, zlib.gzipSync(JSON.stringify(payload)));
  const markdownPath = options.output.replace(/\.json(?:\.gz)?$/i, '.md');
  await fs.writeFile(markdownPath, [
    '# PokemonTCG.io Source Snapshot V1',
    '',
    'Audit-only cached source snapshot for transient PokemonTCG.io outages.',
    '',
    markdownTable(['metric', 'value'], [
      ['source report ref', options.reportRef],
      ['set configs', payload.summary.set_configs],
      ['records', payload.summary.records],
      ['db writes performed', false],
      ['migrations created', false],
    ]),
    '',
    '## Source Counts',
    '',
    markdownTable(['source_key', 'records'], Object.entries(payload.summary.by_source_key)),
    '',
  ].join('\n'));

  console.log(JSON.stringify({
    output: options.output,
    markdown: markdownPath,
    ...payload.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
