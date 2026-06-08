import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const GAPS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgstats_mfb_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/tcgstats_mfb_acquisition_v1';
const SOURCE_URL = 'https://tcgstats.com/pokemon/expansions/my-first-battle';
const SOURCE_KEY = 'tcgstats_mfb_price_guide';

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function fetchText(url) {
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
  ], { timeout: 100000, maxBuffer: 30 * 1024 * 1024 });
  return stdout;
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'e')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparable(value) {
  return normalizeText(value)
    .replace(/\bbasic\s+(.+?\s+energy)\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function targetFacts(gaps) {
  return (gaps.facts ?? [])
    .filter((row) => row.set_key === 'mfb')
    .filter((row) => row.gap_type === 'finish_human_checklist_evidence_needed')
    .filter((row) => row.fact_type === 'printing_finish')
    .filter((row) => normalizeFinishKey(row.finish_key) === 'normal')
    .filter((row) => row.card_number && row.card_name)
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true }));
}

function extractMarketplaceNames(html) {
  const names = new Set();
  const encodedRegex = /&quot;name&quot;:\[0,&quot;([^&]+)&quot;\]/g;
  for (const match of html.matchAll(encodedRegex)) {
    names.add(comparable(decodeHtml(match[1])));
  }
  const titleRegex = /<div[^>]*class="[^"]*font-bold[^"]*"[^>]*>([^<]+?)<!--\s*-->/g;
  for (const match of html.matchAll(titleRegex)) {
    names.add(comparable(decodeHtml(match[1])));
  }
  return names;
}

function factHasMarketplaceRow(fact, pageText, marketplaceNames) {
  const name = comparable(fact.card_name);
  const text = comparable(pageText);
  if (!text.includes('my first battle')) return false;
  if (marketplaceNames.has(name)) return true;
  return text.includes(`${name} #`) || text.includes(`${name} my first battle`);
}

function buildRecord(fact, generatedAt) {
  return {
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: SOURCE_URL,
    set_key: 'mfb',
    set_name: 'My First Battle',
    card_number: fact.card_number,
    card_name: fact.card_name,
    finish_key: 'normal',
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `TCGStats My First Battle product row for ${fact.card_name}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `tcgstats:mfb:${normalizeNumber(fact.card_number)}:${generatedAt}`,
    notes: 'Matched a current My First Battle gap to a TCGStats marketplace/checklist product row. My First Battle cards do not carry printed card numbers, so the Master Index card_number is retained only as the internal canonical join key.',
  };
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function buildMarkdown(payload) {
  const rows = payload.results.map((row) => [
    row.status,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.source_url,
  ]);
  return [
    '# TCGStats My First Battle Finish Acquisition V1',
    '',
    'Audit-only acquisition. No DB writes, migrations, cleanup, quarantine, or apply paths are performed.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['target_facts', payload.summary.target_facts],
        ['records_generated', payload.summary.records_generated],
        ['not_found', payload.summary.not_found],
        ['fixture_files_written', payload.summary.fixture_files_written],
        ['db_writes_performed', payload.db_writes_performed],
        ['migrations_created', payload.migrations_created],
      ],
    ),
    '',
    '## Results',
    '',
    markdownTable(['status', 'card_number', 'card_name', 'finish', 'source_url'], rows),
    '',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const gaps = await readJson(GAPS_PATH);
  const facts = targetFacts(gaps);
  const html = await fetchText(SOURCE_URL);
  const pageText = decodeHtml(html);
  const marketplaceNames = extractMarketplaceNames(html);

  const results = facts.map((fact) => {
    if (!factHasMarketplaceRow(fact, pageText, marketplaceNames)) {
      return {
        status: 'no_exact_marketplace_row',
        set_key: fact.set_key,
        set_name: fact.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: fact.finish_key,
        source_url: SOURCE_URL,
      };
    }
    return {
      status: 'generated',
      ...buildRecord(fact, generatedAt),
    };
  });

  const records = results.filter((row) => row.status === 'generated').map(({ status, ...record }) => record);
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: SOURCE_URL,
    source_status: records.length ? 'available_generated' : 'available_no_matching_rows',
    set_key: 'mfb',
    set_name: 'My First Battle',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `generated_fixture:tcgstats:mfb:${generatedAt}`,
    generation_note: 'Generated only from current My First Battle normal-finish gap facts that matched TCGStats My First Battle product rows. No non-normal finishes are inferred.',
    records,
  };

  const report = {
    version: 'english_master_index_tcgstats_mfb_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_key: SOURCE_KEY,
    source_kind: 'marketplace_checklist',
    source_url: SOURCE_URL,
    summary: {
      target_facts: facts.length,
      records_generated: records.length,
      not_found: results.filter((row) => row.status !== 'generated').length,
      fixture_files_written: records.length && !options.dryRun ? 1 : 0,
    },
    results,
  };

  if (!options.dryRun) {
    await writeJson(path.join(FIXTURE_DIR, 'mfb.json'), fixture);
    await writeJson(path.join(REPORT_DIR, 'tcgstats_mfb_finish_acquisition_v1.json'), report);
    await fs.writeFile(path.join(REPORT_DIR, 'tcgstats_mfb_finish_acquisition_v1.md'), buildMarkdown(report));
  }

  console.log(JSON.stringify({
    report_path: path.join(REPORT_DIR, 'tcgstats_mfb_finish_acquisition_v1.json'),
    fixture_path: path.join(FIXTURE_DIR, 'mfb.json'),
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
