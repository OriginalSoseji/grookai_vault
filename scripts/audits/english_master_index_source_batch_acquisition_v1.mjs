import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/source_batch_acquisition_v1';
const DELTA_SCRIPT = 'scripts/audits/english_master_index_source_delta_audit_v1.mjs';
const DELTA_SUMMARY_SCRIPT = 'scripts/audits/english_master_index_source_delta_summary_v1.mjs';

const SOURCES = [
  {
    id: 'bulbapedia_card_page',
    source_key: 'bulbapedia_card_page_release_info',
    source_kind: 'human_readable_checklist',
    script: 'scripts/audits/english_master_index_bulbapedia_card_page_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_card_pages_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'bulbapedia_build_battle',
    source_key: 'bulbapedia_build_battle_product',
    source_kind: 'human_readable_checklist',
    script: 'scripts/audits/english_master_index_bulbapedia_build_battle_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_build_battle_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'cardtrader',
    source_key: 'cardtrader_blueprint_index',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_cardtrader_finish_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'elitefourum_alternate',
    source_key: 'elitefourum_alternate_checklist',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_elitefourum_alternate_checklist_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_elitefourum_alternate_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'pokemoncard_io',
    source_key: 'pokemoncard_io_price_breakdown',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_pokemoncard_finish_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokemoncard_io_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'reverseholo',
    source_key: 'reverseholo_set_checklist',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_reverseholo_finish_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_reverseholo_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'tcdb',
    source_key: 'tcdb_checklist',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_tcdb_checklist_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcdb_checklists_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'tcgcollector',
    source_key: 'tcgcollector_card_variants',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_tcgcollector_variant_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcollector_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'tcgcsv_finish',
    source_key: 'tcgcsv_tcgplayer_catalog',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_tcgcsv_finish_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'tcgcsv_identity',
    source_key: 'tcgcsv_tcgplayer_catalog_identity',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_tcgcsv_identity_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_identity_v1',
    supports_sets: true,
    fixture_mode: 'merge',
  },
  {
    id: 'thepricedex_preservation',
    source_key: 'thepricedex_price_list',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_thepricedex_preservation_from_index_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_thepricedex_preservation_v1',
    supports_sets: false,
    fixture_mode: 'preservation',
  },
  {
    id: 'binderbuilder',
    source_key: 'binderbuilder_set_variant',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_binderbuilder_variant_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_binderbuilder_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'doubleholo',
    source_key: 'doubleholo_set_checklist',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_doubleholo_finish_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_doubleholo_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'official_checklist_pdf',
    source_key: 'official_pokemon_checklist_pdf',
    source_kind: 'official_gallery',
    script: 'scripts/audits/english_master_index_official_checklist_pdf_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_official_pokemon_checklist_pdf_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'official_legacy_checklist',
    source_key: 'official_pokemon_legacy_checklist',
    source_kind: 'official_gallery',
    script: 'scripts/audits/english_master_index_official_legacy_checklist_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_official_legacy_checklists_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'pkmncards_identity_gap',
    source_key: 'pkmncards_identity_gap',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_pkmncards_identity_gap_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_identity_gap_v1',
    supports_sets: false,
    fixture_mode: 'reset',
  },
  {
    id: 'pokellector_identity',
    source_key: 'pokellector_set_checklist',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_pokellector_identity_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokellector_identity_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'pokex_identity',
    source_key: 'pokex_set_checklist',
    source_kind: 'collector_reference',
    script: 'scripts/audits/english_master_index_pokex_identity_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokex_identity_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'pricecharting_csv',
    source_key: 'pricecharting_csv_product',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_pricecharting_csv_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_csv_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'pricecharting_api',
    source_key: 'pricecharting_api_product',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_pricecharting_finish_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
  {
    id: 'tcgplayer_pricedex_link',
    source_key: 'tcgplayer_pricedex_link',
    source_kind: 'marketplace_checklist',
    script: 'scripts/audits/english_master_index_tcgplayer_pricedex_link_acquisition_v1.mjs',
    fixture_dir: 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgplayer_pricedex_links_v1',
    supports_sets: true,
    fixture_mode: 'reset',
  },
];

const DEFAULT_SOURCE_IDS = SOURCES
  .filter((source) => ['merge', 'preservation'].includes(source.fixture_mode))
  .map((source) => normalizeText(source.id));

function parseArgs(argv) {
  const options = {
    sources: null,
    sets: null,
    dryRun: false,
    includeResettingSources: false,
    acquisition: true,
    delta: true,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sources') {
      options.sources = next.split(',').map((value) => normalizeText(value)).filter(Boolean);
      index += 1;
    } else if (arg === '--sets') {
      options.sets = next;
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--include-resetting-sources') {
      options.includeResettingSources = true;
    } else if (arg === '--delta-only') {
      options.acquisition = false;
      options.delta = true;
    } else if (arg === '--acquisition-only') {
      options.acquisition = true;
      options.delta = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function sourceById() {
  return new Map(SOURCES.map((source) => [normalizeText(source.id), source]));
}

function selectedSources(options) {
  const byId = sourceById();
  const requested = options.sources ?? DEFAULT_SOURCE_IDS;
  const selected = [];
  const excluded = [];
  for (const id of requested) {
    const source = byId.get(id);
    if (!source) throw new Error(`Unknown source id: ${id}`);
    if (source.fixture_mode === 'reset' && !options.includeResettingSources) {
      excluded.push({ ...source, exclusion_reason: 'fixture_reset_source_requires_--include-resetting-sources' });
      continue;
    }
    selected.push(source);
  }
  if (!options.sources) {
    for (const source of SOURCES.filter((row) => row.fixture_mode === 'reset')) {
      excluded.push({ ...source, exclusion_reason: 'fixture_reset_source_excluded_from_default_batch' });
    }
  }
  return { selected, excluded };
}

function runNode(args, { logPrefix }) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(`[${logPrefix}] ${text}`);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(`[${logPrefix}] ${text}`);
    });
    child.on('error', (error) => {
      resolve({
        exit_code: 1,
        duration_ms: Date.now() - startedAt,
        stdout_tail: stdout.slice(-4000),
        stderr_tail: `${stderr}\n${error.message}`.slice(-4000),
      });
    });
    child.on('exit', (code) => {
      resolve({
        exit_code: code,
        duration_ms: Date.now() - startedAt,
        stdout_tail: stdout.slice(-4000),
        stderr_tail: stderr.slice(-4000),
      });
    });
  });
}

async function runAcquisition(source, options) {
  const args = [source.script];
  if (options.sets && source.supports_sets) args.push('--sets', options.sets);
  if (options.dryRun) args.push('--dry-run');
  const result = await runNode(args, { logPrefix: source.id });
  return {
    source_id: source.id,
    source_key: source.source_key,
    command: `node ${args.join(' ')}`,
    fixture_mode: source.fixture_mode,
    phase: 'acquisition',
    status: result.exit_code === 0 ? 'completed' : 'failed',
    ...result,
  };
}

async function runDelta(source) {
  if (!await fileExists(source.fixture_dir)) {
    return {
      source_id: source.id,
      source_key: source.source_key,
      phase: 'delta',
      status: 'skipped_fixture_dir_missing',
      fixture_dir: source.fixture_dir,
    };
  }
  const args = [
    DELTA_SCRIPT,
    '--source-key',
    source.source_key,
    '--source-kind',
    source.source_kind,
    '--fixture-dir',
    source.fixture_dir,
  ];
  const result = await runNode(args, { logPrefix: `${source.id}:delta` });
  const deltaFile = path.join(
    'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1',
    `${source.source_key}_source_delta_audit_v1.json`,
  );
  let deltaSummary = null;
  if (result.exit_code === 0 && await fileExists(deltaFile)) {
    deltaSummary = (await readJson(deltaFile)).summary ?? null;
  }
  return {
    source_id: source.id,
    source_key: source.source_key,
    command: `node ${args.join(' ')}`,
    fixture_dir: source.fixture_dir,
    phase: 'delta',
    status: result.exit_code === 0 ? 'completed' : 'failed',
    delta_summary: deltaSummary,
    ...result,
  };
}

function sumUseful(deltaResults) {
  return deltaResults.reduce((total, result) => total + Number(result.delta_summary?.useful_candidate_matches ?? 0), 0);
}

function sumLoaded(deltaResults) {
  return deltaResults.reduce((total, result) => total + Number(result.delta_summary?.candidate_records_loaded ?? 0), 0);
}

async function writeReport({ generatedAt, options, selected, excluded, acquisitionResults, deltaResults, deltaSummary }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const usefulMatches = sumUseful(deltaResults);
  const payload = {
    version: 'english_master_index_source_batch_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    selected_sources: selected.map((source) => ({
      source_id: source.id,
      source_key: source.source_key,
      source_kind: source.source_kind,
      fixture_mode: source.fixture_mode,
      fixture_dir: source.fixture_dir,
    })),
    excluded_sources: excluded.map((source) => ({
      source_id: source.id,
      source_key: source.source_key,
      fixture_mode: source.fixture_mode,
      reason: source.exclusion_reason,
    })),
    summary: {
      selected_sources: selected.length,
      excluded_sources: excluded.length,
      acquisition_completed: acquisitionResults.filter((row) => row.status === 'completed').length,
      acquisition_failed: acquisitionResults.filter((row) => row.status === 'failed').length,
      delta_completed: deltaResults.filter((row) => row.status === 'completed').length,
      candidate_records_loaded: sumLoaded(deltaResults),
      useful_candidate_matches: usefulMatches,
      guarded_rebuild_recommended: usefulMatches > 0,
      guarded_rebuild_command: usefulMatches > 0
        ? 'node scripts/audits/english_master_index_build_guarded_staging_v1.mjs --label source-batch-v1'
        : null,
      guarded_promote_command: usefulMatches > 0
        ? 'Run the recommended_guard_command from the generated guarded staging manifest after reviewing staged metrics.'
        : null,
      delta_summary: deltaSummary?.summary ?? null,
    },
    acquisition_results: acquisitionResults,
    delta_results: deltaResults,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'source_batch_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);

  const md = [
    '# English Master Index Source Batch Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    markdownTable(
      ['Metric', 'Value'],
      Object.entries(payload.summary).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]),
    ),
    '',
    '## Selected Sources',
    '',
    markdownTable(
      ['source', 'key', 'kind', 'fixture mode'],
      payload.selected_sources.map((source) => [source.source_id, source.source_key, source.source_kind, source.fixture_mode]),
    ),
    '',
    '## Excluded Sources',
    '',
    payload.excluded_sources.length
      ? markdownTable(['source', 'key', 'mode', 'reason'], payload.excluded_sources.map((source) => [source.source_id, source.source_key, source.fixture_mode, source.reason]))
      : 'None.',
    '',
    '## Delta Results',
    '',
    markdownTable(
      ['source', 'status', 'loaded', 'matched gaps', 'useful', 'already in index', 'unmatched'],
      deltaResults.map((row) => [
        row.source_id,
        row.status,
        row.delta_summary?.candidate_records_loaded ?? '',
        row.delta_summary?.matched_gap_facts ?? '',
        row.delta_summary?.useful_candidate_matches ?? '',
        row.delta_summary?.already_in_current_index ?? '',
        row.delta_summary?.unmatched_candidate_records ?? '',
      ]),
    ),
    '',
    '## Safety Confirmation',
    '',
    '```json',
    JSON.stringify({
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    }, null, 2),
    '```',
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'source_batch_acquisition_v1.md'), md);
  return payload;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const { selected, excluded } = selectedSources(options);
  const acquisitionResults = [];
  const deltaResults = [];

  for (const source of selected) {
    if (options.acquisition) {
      console.log(`[source-batch] acquisition ${source.id}`);
      acquisitionResults.push(await runAcquisition(source, options));
    }
    if (options.delta) {
      console.log(`[source-batch] delta ${source.id}`);
      deltaResults.push(await runDelta(source));
    }
  }

  let deltaSummary = null;
  if (options.delta) {
    const result = await runNode([DELTA_SUMMARY_SCRIPT], { logPrefix: 'delta-summary' });
    if (result.exit_code === 0) {
      deltaSummary = await readJson('docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/english_master_index_source_delta_summary_v1.json');
    }
  }

  const report = await writeReport({ generatedAt, options, selected, excluded, acquisitionResults, deltaResults, deltaSummary });
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[source-batch] failed:', error);
  process.exitCode = 1;
});
