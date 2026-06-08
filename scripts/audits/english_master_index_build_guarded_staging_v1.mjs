import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const FINAL_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const STAGING_ROOT = 'docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging';
const BUILDER = 'scripts/audits/verified_master_set_index_v1_build_english_master_index.mjs';
const DEFAULT_SOURCES = 'tcgdex,pokemontcg_api,thepricedex,bulbapedia';

function parseArgs(argv) {
  const options = {
    sources: DEFAULT_SOURCES,
    baselineFile: path.join(FINAL_DIR, 'english_master_index_v1.json'),
    label: null,
    outputDir: null,
    force: false,
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
    } else if (arg === '--label') {
      options.label = next;
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--allow-canonical-dedupe') {
      options.allowCanonicalDedupe = true;
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
  };
}

function safeLabel(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultStagingDir(generatedAt, label) {
  const stamp = generatedAt.replace(/[:.]/g, '-');
  const suffix = label ? `-${safeLabel(label)}` : '';
  return path.join(STAGING_ROOT, `${stamp}${suffix}`);
}

function assertStagingPath(outputDir) {
  const root = path.resolve(STAGING_ROOT);
  const target = path.resolve(outputDir);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Staging output must stay under ${STAGING_ROOT}: ${outputDir}`);
  }
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function runBuilder({ sources, outputDir }) {
  await fs.mkdir(path.dirname(outputDir), { recursive: true });
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
      else reject(new Error(`Master Index staging builder exited with ${code}`));
    });
  });
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const outputDir = options.outputDir ?? defaultStagingDir(generatedAt, options.label);
  const markerPath = path.join(outputDir, 'guarded_staging_manifest_v1.json');
  assertStagingPath(outputDir);

  if (await pathExists(outputDir)) {
    if (!options.force) {
      throw new Error(`Staging directory already exists: ${outputDir}. Pass --force to rebuild it.`);
    }
    await fs.rm(outputDir, { recursive: true, force: true });
  }

  const baseline = await readJson(options.baselineFile);
  const baselineMetrics = metrics(baseline);

  await runBuilder({ sources: options.sources, outputDir });

  const staged = await readJson(path.join(outputDir, 'english_master_index_v1.json'));
  const stagedMetrics = metrics(staged);
  const guardArgs = [
    'node',
    'scripts/audits/english_master_index_guarded_rebuild_v1.mjs',
    '--staging-dir',
    outputDir,
    '--min-master-verified-printings',
    String(baselineMetrics.master_verified_printings),
    '--min-master-verified-cards',
    String(baselineMetrics.master_verified_cards),
    '--min-evidence-rows',
    String(baselineMetrics.evidence_rows),
    '--max-candidate-printings',
    String(baselineMetrics.candidate_printings),
    '--max-conflicts',
    String(baselineMetrics.conflicts),
  ];
  if (options.allowCanonicalDedupe) guardArgs.push('--allow-canonical-dedupe');
  guardArgs.push('--promote');

  const manifest = {
    version: 'ENGLISH_MASTER_INDEX_GUARDED_STAGING_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    sources: options.sources,
    allow_canonical_dedupe: options.allowCanonicalDedupe,
    baseline_file: options.baselineFile,
    staging_dir: outputDir,
    baseline: baselineMetrics,
    staged: stagedMetrics,
    recommended_guard_command: guardArgs.join(' '),
    guard_thresholds: {
      min_master_verified_printings: baselineMetrics.master_verified_printings,
      min_master_verified_cards: baselineMetrics.master_verified_cards,
      min_evidence_rows: baselineMetrics.evidence_rows,
      max_candidate_printings: baselineMetrics.candidate_printings,
      max_conflicts: baselineMetrics.conflicts,
    },
    workflow: [
      'Build staging output in this directory.',
      'Inspect staged metrics and source deltas.',
      'Promote only through english_master_index_guarded_rebuild_v1.mjs --staging-dir.',
      'Regenerate downstream reports only after guard promotion passes.',
    ],
  };

  await fs.writeFile(markerPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(STAGING_ROOT, 'last_guarded_staging_manifest_v1.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error('[guarded-staging] failed:', error);
  process.exitCode = 1;
});
