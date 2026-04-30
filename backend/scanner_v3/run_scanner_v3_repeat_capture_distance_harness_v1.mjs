import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import '../env.mjs';
import {
  DHASH_V1,
  computeDHashV1,
  hammingDistanceBits,
} from './lib/image_hash_v1.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_DATASET_DIR = '.tmp/scanner_v3_repeat_dataset';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_repeat_distance_proof';
const DEFAULT_BOOTSTRAP_SOURCE_DIR = '.tmp/embedding_test_images';
const NORMALIZATION_HARNESS = 'backend/scanner_v3/run_universal_tcg_scan_normalization_harness_v1.mjs';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const DEFAULT_BOOTSTRAP_GROUPS = [
  {
    card_id: 'card_A',
    files: [
      '02_005f33f8-8012-45f1-8ec4-f46b6bd91fdf.jpg',
      '03_eff7663b-bc5f-4466-b1f3-709ec492271c.jpg',
      '05_4cd4dfb4-73ab-4962-b72a-8be1a03bf3e1.jpg',
      '08_342082f4-aab9-4589-9c69-bceffa78838a.jpg',
      '06_259f8f55-7dec-4e52-8780-952e7b36cb44.jpg',
      '07_b4b114d6-0110-4d07-93ff-6a008382fdff.jpg',
    ],
  },
  {
    card_id: 'card_B',
    files: [
      '12_cbd8089a-ff27-4ad0-a606-f90da6b95fcb.jpg',
      '13_59c79456-63f6-4605-8cbc-d6dcacf1b6e7.jpg',
    ],
  },
  {
    card_id: 'card_C',
    files: [
      '01_c6042d0e-972c-4048-b7ff-038b027135f6.jpg',
    ],
  },
  {
    card_id: 'card_D',
    files: [
      '15_586c4d32-a72f-4a85-9d05-12ddacc6ceb0.jpg',
    ],
  },
];

function parseArgs(argv) {
  const args = {
    dataset: DEFAULT_DATASET_DIR,
    out: DEFAULT_OUTPUT_DIR,
    bootstrap: true,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inlineValue] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const nextValue = () => {
      if (inlineValue !== null) return inlineValue;
      i += 1;
      return argv[i] ?? '';
    };

    if (name === '--dataset' || name === '--folder') {
      args.dataset = nextValue();
    } else if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--no-bootstrap') {
      args.bootstrap = false;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/scanner_v3/run_scanner_v3_repeat_capture_distance_harness_v1.mjs [--dataset <path>] [--out <path>] [--no-bootstrap]',
    '',
    'Defaults:',
    `  --dataset ${DEFAULT_DATASET_DIR}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    '',
    'This proof harness compares grouped normalized artifacts only. It does not identify cards.',
  ].join('\n');
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function sanitizeSegment(value, fallback = 'item') {
  const clean = String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return clean || fallback;
}

async function listImageFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(folder, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function datasetHasGroupedImages(datasetDir) {
  if (!(await pathExists(datasetDir))) return false;
  const entries = await readdir(datasetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const images = await listImageFiles(path.join(datasetDir, entry.name));
    if (images.length > 0) return true;
  }
  return false;
}

async function bootstrapDatasetIfNeeded(datasetDir) {
  const resolvedDataset = path.resolve(datasetDir);
  if (await datasetHasGroupedImages(resolvedDataset)) {
    return {
      bootstrapped: false,
      dataset_dir: resolvedDataset,
      source_dir: null,
      groups: [],
      notes: ['existing_dataset_used'],
    };
  }

  const sourceDir = path.resolve(DEFAULT_BOOTSTRAP_SOURCE_DIR);
  if (!(await pathExists(sourceDir))) {
    return {
      bootstrapped: false,
      dataset_dir: resolvedDataset,
      source_dir: sourceDir,
      groups: [],
      notes: ['bootstrap_source_missing'],
    };
  }

  await ensureDir(resolvedDataset);
  const groups = [];
  for (const group of DEFAULT_BOOTSTRAP_GROUPS) {
    const groupDir = path.join(resolvedDataset, group.card_id);
    await ensureDir(groupDir);
    const copied = [];
    for (let i = 0; i < group.files.length; i += 1) {
      const sourcePath = path.join(sourceDir, group.files[i]);
      if (!(await pathExists(sourcePath))) continue;
      const targetPath = path.join(groupDir, `img_${String(i + 1).padStart(2, '0')}${path.extname(group.files[i]).toLowerCase()}`);
      await copyFile(sourcePath, targetPath);
      copied.push({
        source_path: sourcePath,
        dataset_path: targetPath,
      });
    }
    groups.push({
      card_id: group.card_id,
      copied_count: copied.length,
      files: copied,
    });
  }

  return {
    bootstrapped: true,
    dataset_dir: resolvedDataset,
    source_dir: sourceDir,
    groups,
    notes: ['bootstrap_from_existing_embedding_test_images', 'folder_labels_are_proof_group_labels_not_identity_decisions'],
  };
}

async function discoverDataset(datasetDir) {
  const resolved = path.resolve(datasetDir);
  const rootStat = await stat(resolved);
  if (!rootStat.isDirectory()) {
    throw new Error(`dataset_not_directory:${resolved}`);
  }

  const entries = await readdir(resolved, { withFileTypes: true });
  const groups = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const groupDir = path.join(resolved, entry.name);
    const images = await listImageFiles(groupDir);
    if (images.length === 0) continue;
    groups.push({
      card_id: sanitizeSegment(entry.name),
      input_dir: groupDir,
      image_paths: images,
    });
  }

  if (groups.length === 0) {
    throw new Error(`dataset_has_no_grouped_images:${resolved}`);
  }

  return {
    dataset_dir: resolved,
    groups,
  };
}

async function runNormalizationForGroup({ group, outputDir }) {
  const normalizationDir = path.join(outputDir, '_normalized', group.card_id);
  await ensureDir(normalizationDir);

  const harnessPath = path.resolve(NORMALIZATION_HARNESS);
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [harnessPath, '--folder', group.input_dir, '--out', normalizationDir],
    {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 24 * 1024 * 1024,
    }
  );

  return {
    normalization_dir: normalizationDir,
    stdout_tail: stdout.split(/\r?\n/).filter(Boolean).slice(-3),
    stderr_tail: stderr.split(/\r?\n/).filter(Boolean).slice(-3),
  };
}

async function readJsonIfPresent(filePath) {
  if (!(await pathExists(filePath))) return null;
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function discoverNormalizedItems({ group, normalizationDir }) {
  const entries = await readdir(normalizationDir, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(normalizationDir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const items = [];
  for (let index = 0; index < dirs.length; index += 1) {
    const dir = dirs[index];
    const fullCardPath = path.join(dir, 'normalized_full_card.jpg');
    const artworkPath = path.join(dir, 'normalized_artwork_region.jpg');
    if (!(await pathExists(fullCardPath)) || !(await pathExists(artworkPath))) continue;

    const metrics = await readJsonIfPresent(path.join(dir, 'metrics.json'));
    const sourceBase = sanitizeSegment(path.basename(metrics?.input_path || dir), `img_${index + 1}`);
    const imageId = `${group.card_id}_${sourceBase}`;
    items.push({
      image_id: imageId,
      card_id: group.card_id,
      source_image_path: metrics?.input_path ?? null,
      normalized_dir: dir,
      normalized_full_card_path: fullCardPath,
      normalized_artwork_region_path: artworkPath,
      normalization_metrics: metrics,
      capture_accepted: metrics?.capture_accepted === true,
    });
  }

  return items;
}

async function hashItem(item) {
  const [fullCardBuffer, artworkBuffer] = await Promise.all([
    readFile(item.normalized_full_card_path),
    readFile(item.normalized_artwork_region_path),
  ]);
  const [fullCardHash, artworkHash] = await Promise.all([
    computeDHashV1(fullCardBuffer),
    computeDHashV1(artworkBuffer),
  ]);

  return {
    ...item,
    full_card_hash: fullCardHash,
    artwork_hash: artworkHash,
  };
}

function distanceBetween(a, b) {
  const fullCardDistance = hammingDistanceBits(a.full_card_hash.bits, b.full_card_hash.bits);
  const artworkDistance = hammingDistanceBits(a.artwork_hash.bits, b.artwork_hash.bits);
  return {
    image_id: b.image_id,
    card_id: b.card_id,
    source_image_path: b.source_image_path,
    distance: fullCardDistance + artworkDistance,
    full_card_distance: fullCardDistance,
    artwork_distance: artworkDistance,
    capture_accepted: b.capture_accepted,
  };
}

function stats(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length === 0) {
    return {
      min: null,
      max: null,
      avg: null,
      count: 0,
    };
  }
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    avg: Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 1_000_000) / 1_000_000,
    count: nums.length,
  };
}

function buildPairDistances(items, { acceptedOnly = false } = {}) {
  const filtered = acceptedOnly ? items.filter((item) => item.capture_accepted) : items;
  const samePairs = [];
  const diffPairs = [];

  for (let i = 0; i < filtered.length; i += 1) {
    for (let j = i + 1; j < filtered.length; j += 1) {
      const a = filtered[i];
      const b = filtered[j];
      const ab = distanceBetween(a, b);
      const pair = {
        a_image_id: a.image_id,
        a_card_id: a.card_id,
        b_image_id: b.image_id,
        b_card_id: b.card_id,
        distance: ab.distance,
        full_card_distance: ab.full_card_distance,
        artwork_distance: ab.artwork_distance,
        a_capture_accepted: a.capture_accepted,
        b_capture_accepted: b.capture_accepted,
      };
      if (a.card_id === b.card_id) samePairs.push(pair);
      else diffPairs.push(pair);
    }
  }

  return { samePairs, diffPairs };
}

function separationSummary({ samePairs, diffPairs }) {
  const sameDistance = stats(samePairs.map((pair) => pair.distance));
  const diffDistance = stats(diffPairs.map((pair) => pair.distance));
  const maxSameDistance = sameDistance.max;
  const minDiffDistance = diffDistance.min;
  const hasComparableDistances = Number.isFinite(maxSameDistance) && Number.isFinite(minDiffDistance);
  const overlapExists = hasComparableDistances ? maxSameDistance >= minDiffDistance : null;
  const cleanSeparation = hasComparableDistances ? maxSameDistance < minDiffDistance : false;
  const candidateThreshold = cleanSeparation
    ? Math.floor((maxSameDistance + minDiffDistance) / 2)
    : null;

  const exampleOverlaps = hasComparableDistances && overlapExists
    ? {
        same_pairs_at_or_above_min_diff: samePairs
          .filter((pair) => pair.distance >= minDiffDistance)
          .sort((a, b) => b.distance - a.distance)
          .slice(0, 8),
        diff_pairs_at_or_below_max_same: diffPairs
          .filter((pair) => pair.distance <= maxSameDistance)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 8),
      }
    : {
        same_pairs_at_or_above_min_diff: [],
        diff_pairs_at_or_below_max_same: [],
      };

  return {
    same_distance: sameDistance,
    diff_distance: diffDistance,
    max_same_distance: maxSameDistance,
    min_diff_distance: minDiffDistance,
    overlap_exists: overlapExists,
    clean_separation: cleanSeparation,
    candidate_threshold: candidateThreshold,
    example_overlaps: exampleOverlaps,
  };
}

async function writePerImageDistances({ outputDir, item, items }) {
  const sameCardDistances = items
    .filter((candidate) => candidate.card_id === item.card_id && candidate.image_id !== item.image_id)
    .map((candidate) => distanceBetween(item, candidate))
    .sort((a, b) => a.distance - b.distance || a.image_id.localeCompare(b.image_id));

  const diffCardDistances = items
    .filter((candidate) => candidate.card_id !== item.card_id)
    .map((candidate) => distanceBetween(item, candidate))
    .sort((a, b) => a.distance - b.distance || a.image_id.localeCompare(b.image_id));

  const payload = {
    image_id: item.image_id,
    card_id: item.card_id,
    source_image_path: item.source_image_path,
    normalized_full_card_path: item.normalized_full_card_path,
    normalized_artwork_region_path: item.normalized_artwork_region_path,
    capture_accepted: item.capture_accepted,
    rejection_reasons: item.normalization_metrics?.rejection_reasons ?? [],
    hash_algorithm: DHASH_V1.algorithm,
    full_card_hash_hex: item.full_card_hash.hex,
    artwork_hash_hex: item.artwork_hash.hex,
    same_card_distances: sameCardDistances,
    diff_card_distances: diffCardDistances,
    nearest_same: sameCardDistances[0] ?? null,
    nearest_diff: diffCardDistances[0] ?? null,
    min_same_distance: sameCardDistances[0]?.distance ?? null,
    max_same_distance: sameCardDistances.length > 0
      ? Math.max(...sameCardDistances.map((entry) => entry.distance))
      : null,
    avg_same_distance: stats(sameCardDistances.map((entry) => entry.distance)).avg,
    min_diff_distance: diffCardDistances[0]?.distance ?? null,
    max_diff_distance: diffCardDistances.length > 0
      ? Math.max(...diffCardDistances.map((entry) => entry.distance))
      : null,
    avg_diff_distance: stats(diffCardDistances.map((entry) => entry.distance)).avg,
    proof_only: true,
    final_identity_decision: false,
  };

  const itemDir = path.join(outputDir, item.image_id);
  await ensureDir(itemDir);
  await writeJson(path.join(itemDir, 'distances.json'), payload);
  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const datasetDir = path.resolve(args.dataset || DEFAULT_DATASET_DIR);
  const outputDir = path.resolve(args.out || DEFAULT_OUTPUT_DIR);
  await ensureDir(outputDir);

  const bootstrap = args.bootstrap
    ? await bootstrapDatasetIfNeeded(datasetDir)
    : {
        bootstrapped: false,
        dataset_dir: datasetDir,
        source_dir: null,
        groups: [],
        notes: ['bootstrap_disabled'],
      };

  const dataset = await discoverDataset(datasetDir);
  const normalizationRuns = [];
  const normalizedItems = [];

  for (const group of dataset.groups) {
    const normalization = await runNormalizationForGroup({ group, outputDir });
    normalizationRuns.push({
      card_id: group.card_id,
      input_dir: group.input_dir,
      image_count: group.image_paths.length,
      ...normalization,
    });
    normalizedItems.push(...await discoverNormalizedItems({
      group,
      normalizationDir: normalization.normalization_dir,
    }));
  }

  const hashedItems = [];
  for (const item of normalizedItems) {
    hashedItems.push(await hashItem(item));
  }

  const perImage = [];
  for (const item of hashedItems) {
    const distances = await writePerImageDistances({ outputDir, item, items: hashedItems });
    perImage.push({
      image_id: distances.image_id,
      card_id: distances.card_id,
      capture_accepted: distances.capture_accepted,
      min_same_distance: distances.min_same_distance,
      max_same_distance: distances.max_same_distance,
      avg_same_distance: distances.avg_same_distance,
      min_diff_distance: distances.min_diff_distance,
      max_diff_distance: distances.max_diff_distance,
      avg_diff_distance: distances.avg_diff_distance,
      nearest_same: distances.nearest_same,
      nearest_diff: distances.nearest_diff,
    });
  }

  const allPairs = buildPairDistances(hashedItems);
  const acceptedPairs = buildPairDistances(hashedItems, { acceptedOnly: true });
  const allSeparation = separationSummary(allPairs);
  const acceptedSeparation = separationSummary(acceptedPairs);

  const summary = {
    generated_at: new Date().toISOString(),
    harness: 'scanner_v3_repeat_capture_distance_harness_v1',
    proof_only: true,
    final_identity_decision: false,
    dataset_dir: dataset.dataset_dir,
    output_dir: outputDir,
    normalization_output_dir: path.join(outputDir, '_normalized'),
    total_cards: dataset.groups.length,
    total_images: dataset.groups.reduce((sum, group) => sum + group.image_paths.length, 0),
    total_normalized_images: hashedItems.length,
    capture_accepted_count: hashedItems.filter((item) => item.capture_accepted).length,
    hash_algorithm: DHASH_V1.algorithm,
    combined_distance: 'full_card_dhash_hamming_plus_artwork_dhash_hamming',
    same_distance: allSeparation.same_distance,
    diff_distance: allSeparation.diff_distance,
    max_same_distance: allSeparation.max_same_distance,
    min_diff_distance: allSeparation.min_diff_distance,
    overlap_exists: allSeparation.overlap_exists,
    clean_separation: allSeparation.clean_separation,
    candidate_threshold: allSeparation.candidate_threshold,
    example_overlaps: allSeparation.example_overlaps,
    accepted_only: acceptedSeparation,
    dataset_bootstrap: bootstrap,
    dataset_groups: dataset.groups.map((group) => ({
      card_id: group.card_id,
      input_dir: group.input_dir,
      image_count: group.image_paths.length,
      image_paths: group.image_paths,
    })),
    normalization_runs: normalizationRuns,
    per_image: perImage,
  };

  await writeJson(path.join(outputDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
