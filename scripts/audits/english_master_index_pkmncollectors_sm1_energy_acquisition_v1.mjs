import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncollectors_sm1_energy_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pkmncollectors_sm1_energy_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');

const TARGETS = [
  { cardNumber: '164', cardName: 'Grass Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/grass-energy-sun-moon-164-common' },
  { cardNumber: '165', cardName: 'Fire Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/fire-energy-sun-moon-165-common' },
  { cardNumber: '166', cardName: 'Water Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/water-energy-sun-moon-166-common' },
  { cardNumber: '167', cardName: 'Lightning Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/lightning-energy-sun-moon-167-common' },
  { cardNumber: '168', cardName: 'Psychic Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/psychic-energy-sun-moon-168-common' },
  { cardNumber: '169', cardName: 'Fighting Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/fighting-energy-sun-moon-169-common' },
  { cardNumber: '170', cardName: 'Darkness Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/darkness-energy-sun-moon-170-common' },
  { cardNumber: '171', cardName: 'Metal Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/metal-energy-sun-moon-171-common' },
  { cardNumber: '172', cardName: 'Fairy Energy', sourceUrl: 'https://www.pkmncollectors.com/cards/fairy-energy-sun-moon-172-common' },
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
  const checks = {
    card_name: hasExactLabel(html, target.cardName),
    card_number: html.includes(`#${target.cardNumber} of 149`),
    set_name: hasExactLabel(html, 'Sun & Moon') || hasExactLabel(html, 'Sun &amp; Moon'),
    rarity_common: hasExactLabel(html, 'Common'),
    available_variants_normal: /Available\s+variants[\s\S]{0,600}>\s*Normal\s*</i.test(html),
  };
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
  };
}

function recordFromTarget(target, generatedAt) {
  return {
    source_key: 'pkmncollectors_sm1_energy',
    source_kind: 'collector_reference',
    source_url: target.sourceUrl,
    set_key: 'sm1',
    set_name: 'Sun & Moon',
    card_number: target.cardNumber,
    card_name: target.cardName,
    finish_key: 'normal',
    rarity: 'Common',
    evidence_type: 'finish_presence',
    evidence_label: 'PKMN Collectors card page lists Available variants: Normal',
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pkmncollectors_sm1_energy:${target.cardNumber}:${slugFromUrl(target.sourceUrl)}`,
    notes: 'Exact card page match for Sun & Moon numbered basic energy with Available variants: Normal. Audit-only source evidence.',
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
    let status = 'source_unavailable';
    let validation = null;
    let error = null;
    try {
      const html = await fetchHtmlCached(target.sourceUrl, options);
      validation = validateTarget(html, target);
      status = validation.ok ? 'generated' : 'validation_failed';
      if (validation.ok) records.push(recordFromTarget(target, generatedAt));
    } catch (fetchError) {
      error = String(fetchError?.message ?? fetchError);
    }
    results.push({
      set_key: 'sm1',
      set_name: 'Sun & Moon',
      card_number: target.cardNumber,
      card_name: target.cardName,
      finish_key: 'normal',
      source_url: target.sourceUrl,
      status,
      validation,
      error,
      records_generated: status === 'generated' ? 1 : 0,
    });
  }

  const fixtureFiles = [];
  if (records.length && !options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    const fixturePath = path.join(FIXTURE_DIR, 'sm1_energy_normal.json');
    const fixture = {
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: 'pkmncollectors_sm1_energy',
      source_kind: 'collector_reference',
      source_url: 'https://www.pkmncollectors.com/sets/sun-moon',
      source_status: 'available_generated',
      set_key: 'sm1',
      set_name: 'Sun & Moon',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pkmncollectors_sm1_energy:${generatedAt}`,
      generation_note: 'Generated from exact PKMN Collectors Sun & Moon basic energy card pages. Evidence labels only; no page dumps stored in the fixture.',
      ...safety(),
      records,
    };
    await fs.writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
    fixtureFiles.push(fixturePath);
  }

  const payload = {
    version: 'english_master_index_pkmncollectors_sm1_energy_acquisition_v1',
    generated_at: generatedAt,
    ...safety(),
    dry_run: options.dryRun,
    source_key: 'pkmncollectors_sm1_energy',
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
    await fs.writeFile(path.join(REPORT_DIR, 'pkmncollectors_sm1_energy_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
    const md = [
      '# PKMN Collectors SM1 Energy Acquisition V1',
      '',
      'Audit only. Exact Sun & Moon basic energy normal-variant evidence. No DB writes, migrations, cleanup, or quarantine.',
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
    ].join('\n');
    await fs.writeFile(path.join(REPORT_DIR, 'pkmncollectors_sm1_energy_acquisition_v1.md'), md);
  }

  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((error) => {
  console.error('[pkmncollectors-sm1-energy] failed:', error);
  process.exitCode = 1;
});
