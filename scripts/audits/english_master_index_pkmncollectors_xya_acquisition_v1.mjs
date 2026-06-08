import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncollectors_xya_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pkmncollectors_xya_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');

const TARGETS = [
  ['24a', 'M Manectric-EX', 'https://www.pkmncollectors.com/cards/m-manectric-ex-yellow-a-alternate-24a-rare'],
  ['28a', 'Jolteon-EX', 'https://www.pkmncollectors.com/cards/jolteon-ex-yellow-a-alternate-28a-rare'],
  ['54a', 'Zygarde-EX', 'https://www.pkmncollectors.com/cards/zygarde-ex-yellow-a-alternate-54a-rare'],
  ['55a', 'M Lucario-EX', 'https://www.pkmncollectors.com/cards/m-lucario-ex-yellow-a-alternate-55a-rare'],
];

function parseArgs(argv) {
  const options = { refreshCache: false, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };
}

function slugFromUrl(url) {
  return url.split('/').filter(Boolean).at(-1);
}

async function fetchHtmlCached(url, options) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, `${slugFromUrl(url)}.html`);
  if (!options.refreshCache) {
    try {
      return await fs.readFile(cacheFile, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '60',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    url,
  ], { timeout: 70000, maxBuffer: 5 * 1024 * 1024 });
  if (!options.dryRun) await fs.writeFile(cacheFile, stdout);
  return stdout;
}

function hasExactLabel(html, label) {
  return new RegExp(`(^|[>\\s])${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([<\\s]|$)`, 'i').test(html);
}

function validateTarget(html, target) {
  const [cardNumber, cardName] = target;
  const checks = {
    card_name: hasExactLabel(html, cardName),
    card_number: html.includes(`#${cardNumber} of 6`),
    set_name: hasExactLabel(html, 'Yellow A Alternate'),
    rarity_rare: hasExactLabel(html, 'Rare'),
    available_variants_normal: /Available\s+variants[\s\S]{0,600}>\s*Normal\s*</i.test(html),
  };
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
  };
}

function recordFromTarget(target, generatedAt) {
  const [cardNumber, cardName, sourceUrl] = target;
  return {
    source_key: 'pkmncollectors_xya',
    source_kind: 'collector_reference',
    source_url: sourceUrl,
    set_key: 'xya',
    set_name: 'Yellow A Alternate',
    card_number: cardNumber,
    card_name: cardName,
    finish_key: 'normal',
    rarity: 'Rare',
    evidence_type: 'finish_presence',
    evidence_label: 'PKMN Collectors card page lists Available variants: Normal',
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pkmncollectors_xya:${cardNumber}:${slugFromUrl(sourceUrl)}`,
    notes: 'Exact Yellow A Alternate card page with Available variants: Normal. Audit-only source evidence.',
  };
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const results = [];
  const records = [];

  for (const target of TARGETS) {
    const [cardNumber, cardName, sourceUrl] = target;
    let status = 'source_unavailable';
    let validation = null;
    let error = null;
    try {
      const html = await fetchHtmlCached(sourceUrl, options);
      validation = validateTarget(html, target);
      status = validation.ok ? 'generated' : 'validation_failed';
      if (validation.ok) records.push(recordFromTarget(target, generatedAt));
    } catch (fetchError) {
      error = String(fetchError?.message ?? fetchError);
    }
    results.push({
      set_key: 'xya',
      set_name: 'Yellow A Alternate',
      card_number: cardNumber,
      card_name: cardName,
      finish_key: 'normal',
      source_url: sourceUrl,
      status,
      validation,
      error,
      records_generated: status === 'generated' ? 1 : 0,
    });
  }

  const fixtureFiles = [];
  if (records.length && !options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    const fixturePath = path.join(FIXTURE_DIR, 'xya_normal.json');
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: 'pkmncollectors_xya',
      source_kind: 'collector_reference',
      source_url: 'https://www.pkmncollectors.com/sets/yellow-a-alternate',
      source_status: 'available_generated',
      set_key: 'xya',
      set_name: 'Yellow A Alternate',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pkmncollectors_xya:${generatedAt}`,
      generation_note: 'Generated from exact PKMN Collectors Yellow A Alternate card pages. Evidence labels only; no page dumps stored in the fixture.',
      ...safety(),
      records,
    };
    await fs.writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
    fixtureFiles.push(fixturePath);
  }

  const payload = {
    version: 'english_master_index_pkmncollectors_xya_acquisition_v1',
    generated_at: generatedAt,
    ...safety(),
    dry_run: options.dryRun,
    source_key: 'pkmncollectors_xya',
    source_kind: 'collector_reference',
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    summary: {
      targets: TARGETS.length,
      records_generated: records.length,
      fixture_files_written: fixtureFiles.length,
      by_status: countBy(results, (row) => row.status),
    },
    results,
  };

  if (!options.dryRun) {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'pkmncollectors_xya_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
    await fs.writeFile(path.join(REPORT_DIR, 'pkmncollectors_xya_acquisition_v1.md'), [
      '# PKMN Collectors Yellow A Alternate Acquisition V1',
      '',
      'Audit only. Exact Yellow A Alternate normal-variant evidence. No DB writes, migrations, cleanup, or quarantine.',
      '',
      `Generated: ${generatedAt}`,
      '',
      '## Summary',
      '',
      markdownTable(['metric', 'value'], Object.entries(payload.summary).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value])),
      '',
      '## Results',
      '',
      markdownTable(
        ['number', 'card', 'finish', 'status', 'source'],
        results.map((row) => [row.card_number, row.card_name, row.finish_key, row.status, row.source_url]),
      ),
      '',
      '## Safety Confirmation',
      '',
      '```json',
      JSON.stringify(safety(), null, 2),
      '```',
      '',
    ].join('\n'));
  }

  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((error) => {
  console.error('[pkmncollectors-xya] failed:', error);
  process.exitCode = 1;
});
