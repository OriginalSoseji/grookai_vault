import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const FINAL_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const BUILDER = 'scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs';
const DEFAULT_SOURCES = 'tcgdex,pokemontcg_api,thepricedex,pkmncards,bulbapedia';

function parseArgs(argv) {
  const options = {
    sources: DEFAULT_SOURCES,
    baselineFile: path.join(FINAL_DIR, 'english_master_index_v1.json'),
    minMasterVerifiedPrintings: null,
    minMasterVerifiedCards: null,
    minEvidenceRows: null,
    maxCandidatePrintings: null,
    maxConflicts: 0,
    promote: false,
    stagingDir: null,
    allowCanonicalDedupe: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sources') {
      options.sources = next;
      index += 1;
    } else if (arg === '--baseline-file') {
      options.baselineFile = next;
      index += 1;
    } else if (arg === '--min-master-verified-printings') {
      options.minMasterVerifiedPrintings = Number(next);
      index += 1;
    } else if (arg === '--min-master-verified-cards') {
      options.minMasterVerifiedCards = Number(next);
      index += 1;
    } else if (arg === '--min-evidence-rows') {
      options.minEvidenceRows = Number(next);
      index += 1;
    } else if (arg === '--max-candidate-printings') {
      options.maxCandidatePrintings = Number(next);
      index += 1;
    } else if (arg === '--max-conflicts') {
      options.maxConflicts = Number(next);
      index += 1;
    } else if (arg === '--promote') {
      options.promote = true;
    } else if (arg === '--allow-canonical-dedupe') {
      options.allowCanonicalDedupe = true;
    } else if (arg === '--staging-dir') {
      options.stagingDir = next;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function metrics(payload) {
  return {
    generated_at: payload.generated_at,
    master_verified_cards: payload.summary?.cards_by_status?.master_verified ?? 0,
    master_verified_printings: payload.summary?.printings_by_status?.master_verified ?? 0,
    conflicts: payload.summary?.conflicts ?? 0,
    evidence_rows: payload.summary?.evidence_rows ?? 0,
    candidate_printings: payload.summary?.printings_by_status?.candidate_unconfirmed ?? 0,
    human_source_verified_printings: payload.summary?.printings_by_status?.human_source_verified ?? 0,
    canonical_master_verified_cards: payload.summary?.canonical_master_verified_cards,
    canonical_master_verified_printings: payload.summary?.canonical_master_verified_printings,
    canonical_candidate_printings: payload.summary?.canonical_candidate_printings,
  };
}

function canonicalCardKey(row) {
  const normalizedSetKey = normalizeText(row.set_key);
  const normalizedNumber = normalizeNumber(row.card_number).toLowerCase();
  const classicCollectionNumber = normalizedNumber.match(/^(\d+)a\d*$/i)?.[1] ?? null;
  const canonicalSetKey = normalizedSetKey === 'cel25' && classicCollectionNumber ? 'cel25c' : normalizedSetKey;
  const canonicalNumber = normalizedSetKey === 'cel25' && classicCollectionNumber ? classicCollectionNumber : normalizedNumber;
  return [
    canonicalSetKey,
    canonicalNumber,
    normalizeText(row.card_name),
  ].join('|');
}

function canonicalPrintingKey(row) {
  return `${canonicalCardKey(row)}|${normalizeFinishKey(row.finish_key) ?? ''}`;
}

async function canonicalMetrics(dir) {
  const cardsPayload = await readJson(path.join(dir, 'english_master_index_cards_v1.json'));
  const printingsPayload = await readJson(path.join(dir, 'english_master_index_printings_v1.json'));
  const cards = cardsPayload.cards ?? [];
  const printings = printingsPayload.printings ?? [];

  return {
    canonical_master_verified_cards: new Set(cards.filter((row) => row.status === 'master_verified').map(canonicalCardKey)).size,
    canonical_master_verified_printings: new Set(printings.filter((row) => row.status === 'master_verified').map(canonicalPrintingKey)).size,
    canonical_candidate_printings: new Set(printings.filter((row) => row.status === 'candidate_unconfirmed').map(canonicalPrintingKey)).size,
  };
}

async function masterVerifiedPrintingRegressions({ baselineDir, stagingDir }) {
  const baselinePayload = await readJson(path.join(baselineDir, 'english_master_index_printings_v1.json'));
  const stagedPayload = await readJson(path.join(stagingDir, 'english_master_index_printings_v1.json'));
  const baselinePrintings = baselinePayload.printings ?? [];
  const stagedPrintings = stagedPayload.printings ?? [];
  const stagedByCanonicalKey = new Map();
  for (const row of stagedPrintings) {
    const key = canonicalPrintingKey(row);
    const existing = stagedByCanonicalKey.get(key);
    if (!existing || existing.status !== 'master_verified') stagedByCanonicalKey.set(key, row);
    if (row.status === 'master_verified') stagedByCanonicalKey.set(key, row);
  }

  const regressions = [];
  const seen = new Set();
  for (const baselineRow of baselinePrintings) {
    if (baselineRow.status !== 'master_verified') continue;
    const key = canonicalPrintingKey(baselineRow);
    if (seen.has(key)) continue;
    seen.add(key);
    const stagedRow = stagedByCanonicalKey.get(key);
    if (stagedRow?.status === 'master_verified') continue;
    regressions.push({
      canonical_printing_key: key,
      set_key: baselineRow.set_key,
      set_name: baselineRow.set_name,
      card_number: baselineRow.card_number,
      card_name: baselineRow.card_name,
      finish_key: baselineRow.finish_key,
      baseline_status: baselineRow.status,
      staged_status: stagedRow?.status ?? 'missing_from_staging',
      baseline_sources: baselineRow.sources ?? [],
      staged_sources: stagedRow?.sources ?? [],
    });
  }
  return regressions;
}

async function runBuilder({ sources, outputDir }) {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const args = [
    BUILDER,
    '--sources',
    sources,
    '--output-dir',
    outputDir,
  ];
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Guarded rebuild builder exited with ${code}`));
    });
  });
}

function evaluate({ baseline, staged, options }) {
  const baselineMetrics = metrics(baseline);
  const stagedMetrics = metrics(staged);
  const minPrintings = options.minMasterVerifiedPrintings ?? baselineMetrics.master_verified_printings;
  const minCards = options.minMasterVerifiedCards ?? baselineMetrics.master_verified_cards;
  const failures = [];

  const canonicalDedupeNotes = [];
  const canonicalPrintingsSatisfied = options.allowCanonicalDedupe
    && Number.isFinite(baselineMetrics.canonical_master_verified_printings)
    && Number.isFinite(stagedMetrics.canonical_master_verified_printings)
    && stagedMetrics.canonical_master_verified_printings >= baselineMetrics.canonical_master_verified_printings;
  const canonicalCardsSatisfied = options.allowCanonicalDedupe
    && Number.isFinite(baselineMetrics.canonical_master_verified_cards)
    && Number.isFinite(stagedMetrics.canonical_master_verified_cards)
    && stagedMetrics.canonical_master_verified_cards >= baselineMetrics.canonical_master_verified_cards;

  if (stagedMetrics.master_verified_printings < minPrintings && !canonicalPrintingsSatisfied) {
    failures.push(`master_verified_printings ${stagedMetrics.master_verified_printings} < ${minPrintings}`);
  } else if (stagedMetrics.master_verified_printings < minPrintings && canonicalPrintingsSatisfied) {
    canonicalDedupeNotes.push('raw master_verified_printings decreased, but canonical master_verified_printings did not decrease');
  }
  if (stagedMetrics.master_verified_cards < minCards && !canonicalCardsSatisfied) {
    failures.push(`master_verified_cards ${stagedMetrics.master_verified_cards} < ${minCards}`);
  } else if (stagedMetrics.master_verified_cards < minCards && canonicalCardsSatisfied) {
    canonicalDedupeNotes.push('raw master_verified_cards decreased, but canonical master_verified_cards did not decrease');
  }
  if (Number.isFinite(options.minEvidenceRows) && stagedMetrics.evidence_rows < options.minEvidenceRows) {
    failures.push(`evidence_rows ${stagedMetrics.evidence_rows} < ${options.minEvidenceRows}`);
  }
  if (stagedMetrics.conflicts > options.maxConflicts) {
    failures.push(`conflicts ${stagedMetrics.conflicts} > ${options.maxConflicts}`);
  }
  if (Number.isFinite(options.maxCandidatePrintings) && stagedMetrics.candidate_printings > options.maxCandidatePrintings) {
    failures.push(`candidate_printings ${stagedMetrics.candidate_printings} > ${options.maxCandidatePrintings}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    baseline: baselineMetrics,
    staged: stagedMetrics,
    canonical_dedupe_allowed: options.allowCanonicalDedupe,
    canonical_dedupe_notes: canonicalDedupeNotes,
    thresholds: {
      min_master_verified_printings: minPrintings,
      min_master_verified_cards: minCards,
      min_evidence_rows: options.minEvidenceRows,
      max_candidate_printings: options.maxCandidatePrintings,
      max_conflicts: options.maxConflicts,
    },
  };
}

async function copyDirectoryContents(fromDir, toDir) {
  await fs.mkdir(toDir, { recursive: true });
  const entries = await fs.readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      await fs.rm(to, { recursive: true, force: true });
      await fs.cp(from, to, { recursive: true });
    } else {
      await fs.copyFile(from, to);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const stagingDir = options.stagingDir
    ?? path.join('docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging', generatedAt.replace(/[:.]/g, '-'));
  const reportDir = 'docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging';
  const baseline = await readJson(options.baselineFile);
  const baselineDir = path.dirname(options.baselineFile);

  if (!options.stagingDir) {
    await runBuilder({ sources: options.sources, outputDir: stagingDir });
  }
  const staged = await readJson(path.join(stagingDir, 'english_master_index_v1.json'));
  if (options.allowCanonicalDedupe) {
    Object.assign(baseline, { __canonical_metrics: await canonicalMetrics(baselineDir) });
    Object.assign(staged, { __canonical_metrics: await canonicalMetrics(stagingDir) });
    Object.assign(baseline.summary, baseline.__canonical_metrics);
    Object.assign(staged.summary, staged.__canonical_metrics);
  }
  const result = evaluate({ baseline, staged, options });
  const regressions = await masterVerifiedPrintingRegressions({ baselineDir, stagingDir });
  result.master_verified_printing_regressions = regressions;
  if (regressions.length > 0) {
    result.failures.push(`master_verified_printing_regressions ${regressions.length}`);
    result.passed = false;
  }

  const report = {
    version: 'ENGLISH_MASTER_INDEX_GUARDED_REBUILD_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    final_reports_promoted: false,
    staging_dir: stagingDir,
    final_dir: FINAL_DIR,
    baseline_file: options.baselineFile,
    result,
  };

  if (!result.passed) {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(path.join(reportDir, 'last_guarded_rebuild_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.error(`[guarded-rebuild] STOP: ${result.failures.join('; ')}`);
    console.error(`[guarded-rebuild] staged output preserved at ${stagingDir}`);
    process.exitCode = 2;
    return;
  }

  if (options.promote) {
    await copyDirectoryContents(stagingDir, FINAL_DIR);
    report.final_reports_promoted = true;
  }

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, 'last_guarded_rebuild_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
