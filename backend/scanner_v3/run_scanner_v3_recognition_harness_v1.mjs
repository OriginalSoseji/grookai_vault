import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import '../env.mjs';
import {
  DHASH_V1,
  computeDHashV1,
  hammingDistanceBits,
  rankByHammingDistance,
} from './lib/image_hash_v1.mjs';

const DEFAULT_INPUT_DIR = '.tmp/scanner_v3_normalization_proof';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_recognition_proof';
const DEFAULT_TOP_N = 3;

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT_DIR,
    out: DEFAULT_OUTPUT_DIR,
    top: DEFAULT_TOP_N,
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

    if (name === '--input' || name === '--folder') {
      args.input = nextValue();
    } else if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--top') {
      const parsed = Number.parseInt(nextValue(), 10);
      args.top = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOP_N;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/scanner_v3/run_scanner_v3_recognition_harness_v1.mjs [--input <path>] [--out <path>] [--top <n>]',
    '',
    'Defaults:',
    `  --input ${DEFAULT_INPUT_DIR}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --top ${DEFAULT_TOP_N}`,
    '',
    'This proof harness compares normalized artifacts only. It does not make final identity decisions.',
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

async function readJsonIfPresent(filePath) {
  if (!(await pathExists(filePath))) return null;
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function idForIndex(index) {
  return `image_${String(index + 1).padStart(2, '0')}`;
}

async function discoverNormalizedItems(inputDir) {
  const resolved = path.resolve(inputDir);
  const rootStat = await stat(resolved);
  if (!rootStat.isDirectory()) {
    throw new Error(`input_not_directory:${resolved}`);
  }

  const entries = await readdir(resolved, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resolved, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const items = [];
  const skipped = [];

  for (const dir of dirs) {
    const fullCardPath = path.join(dir, 'normalized_full_card.jpg');
    const artworkPath = path.join(dir, 'normalized_artwork_region.jpg');
    const hasFullCard = await pathExists(fullCardPath);
    const hasArtwork = await pathExists(artworkPath);
    if (!hasFullCard || !hasArtwork) {
      skipped.push({
        source_dir: dir,
        reason: hasFullCard ? 'missing_normalized_artwork_region' : 'missing_normalized_full_card',
      });
      continue;
    }

    const metrics = await readJsonIfPresent(path.join(dir, 'metrics.json'));
    items.push({
      id: idForIndex(items.length),
      source_dir: dir,
      source_name: path.basename(dir),
      full_card_path: fullCardPath,
      artwork_path: artworkPath,
      normalization_metrics: metrics,
    });
  }

  return {
    input_dir: resolved,
    items,
    skipped,
  };
}

async function hashItem(item) {
  const [fullCardBuffer, artworkBuffer] = await Promise.all([
    readFile(item.full_card_path),
    readFile(item.artwork_path),
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

function nearestNonSelfDistance(item, hashedItems) {
  const distances = hashedItems
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) =>
      hammingDistanceBits(item.full_card_hash.bits, candidate.full_card_hash.bits) +
      hammingDistanceBits(item.artwork_hash.bits, candidate.artwork_hash.bits)
    );
  if (distances.length === 0) return null;
  return Math.min(...distances);
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 1_000_000) / 1_000_000;
}

function buildSummary({ inputDir, outputDir, hashedItems, skipped, matchResults, topN }) {
  const nearestDistances = hashedItems.map((item) => nearestNonSelfDistance(item, hashedItems));
  const selfTop1Count = matchResults.filter((result) => result.top_matches?.[0]?.is_self === true).length;
  const captureAcceptedCount = hashedItems.filter((item) =>
    item.normalization_metrics?.capture_accepted === true
  ).length;

  return {
    generated_at: new Date().toISOString(),
    harness: 'scanner_v3_recognition_harness_v1',
    proof_only: true,
    final_identity_decision: false,
    input_dir: inputDir,
    output_dir: outputDir,
    hash_algorithm: DHASH_V1.algorithm,
    hash_bits_per_artifact: DHASH_V1.bits,
    artifacts_per_item: ['normalized_full_card.jpg', 'normalized_artwork_region.jpg'],
    top_n: topN,
    total_items: hashedItems.length,
    skipped_count: skipped.length,
    capture_accepted_count: captureAcceptedCount,
    self_top1_count: selfTop1Count,
    average_nearest_non_self_distance: average(nearestDistances),
    min_nearest_non_self_distance: nearestDistances.filter(Number.isFinite).length
      ? Math.min(...nearestDistances.filter(Number.isFinite))
      : null,
    max_nearest_non_self_distance: nearestDistances.filter(Number.isFinite).length
      ? Math.max(...nearestDistances.filter(Number.isFinite))
      : null,
    skipped,
    per_image: matchResults.map((result) => ({
      id: result.query,
      source_name: result.source_name,
      capture_accepted: result.capture_accepted,
      nearest_non_self_distance: result.nearest_non_self_distance,
      top_matches: result.top_matches,
      output_dir: result.output_dir,
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const outputDir = path.resolve(args.out || DEFAULT_OUTPUT_DIR);
  await ensureDir(outputDir);

  const discovery = await discoverNormalizedItems(args.input || DEFAULT_INPUT_DIR);
  if (discovery.items.length === 0) {
    throw new Error(`no_normalized_items_found:${discovery.input_dir}`);
  }

  const hashedItems = [];
  for (const item of discovery.items) {
    hashedItems.push(await hashItem(item));
  }

  const matchResults = [];
  for (const item of hashedItems) {
    const itemOutDir = path.join(outputDir, item.id);
    await ensureDir(itemOutDir);

    const topMatches = rankByHammingDistance({
      query: item,
      references: hashedItems,
      topN: args.top,
    });

    const result = {
      query: item.id,
      source_name: item.source_name,
      source_dir: item.source_dir,
      normalized_full_card_path: item.full_card_path,
      normalized_artwork_region_path: item.artwork_path,
      hash_algorithm: DHASH_V1.algorithm,
      hash: item.full_card_hash.bits,
      hash_hex: item.full_card_hash.hex,
      artwork_hash: item.artwork_hash.bits,
      artwork_hash_hex: item.artwork_hash.hex,
      top_matches: topMatches,
      nearest_non_self_distance: nearestNonSelfDistance(item, hashedItems),
      capture_accepted: item.normalization_metrics?.capture_accepted ?? null,
      rejection_reasons: item.normalization_metrics?.rejection_reasons ?? [],
      output_dir: itemOutDir,
      proof_only: true,
      final_identity_decision: false,
    };

    await writeJson(path.join(itemOutDir, 'match.json'), result);
    matchResults.push(result);

    console.log(JSON.stringify({
      query: result.query,
      source_name: result.source_name,
      capture_accepted: result.capture_accepted,
      nearest_non_self_distance: result.nearest_non_self_distance,
      top_matches: result.top_matches.map((match) => ({
        id: match.id,
        distance: match.distance,
        full_card_distance: match.full_card_distance,
        artwork_distance: match.artwork_distance,
        is_self: match.is_self,
      })),
      output_dir: itemOutDir,
    }));
  }

  const summary = buildSummary({
    inputDir: discovery.input_dir,
    outputDir,
    hashedItems,
    skipped: discovery.skipped,
    matchResults,
    topN: args.top,
  });
  await writeJson(path.join(outputDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
