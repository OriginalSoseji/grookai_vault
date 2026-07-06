import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { embedImageBuffer } from '../lib/embedding_index_v1.mjs';
import { loadScannerV5Artifact } from './scanner_v5_artifact_v1.mjs';

const DEFAULT_IN = '.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1';
const DEFAULT_OUT = '.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v2_augmented_trial';
const VARIANTS = 4;

function parseArgs(argv) {
  const args = {
    artifactDir: process.env.SCANNER_V5_ARTIFACT_DIR || DEFAULT_IN,
    outDir: DEFAULT_OUT,
    limit: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inline] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const next = () => {
      if (inline !== null) return inline;
      i += 1;
      return argv[i] ?? '';
    };
    if (name === '--artifact-dir') args.artifactDir = next() || DEFAULT_IN;
    else if (name === '--out-dir') args.outDir = next() || DEFAULT_OUT;
    else if (name === '--limit') args.limit = positiveInt(next(), null);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifact = await loadScannerV5Artifact(args.artifactDir);
  const fullCardShard = artifact.shards.get('full_card') ?? [...artifact.shards.values()][0];
  if (!fullCardShard) throw new Error('scanner_v5_augmented_missing_full_card_shard');
  const sourceRows = fullCardShard.metadataRows
    .filter((row) => row.source_path)
    .slice(0, args.limit ?? fullCardShard.metadataRows.length);
  await mkdir(args.outDir, { recursive: true });
  const outPath = path.join(args.outDir, 'augmented_index.jsonl');
  const reportPath = path.join(args.outDir, 'build_report.json');
  const lines = [];
  const timings = [];
  let skipped = 0;

  for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex += 1) {
    const row = sourceRows[rowIndex];
    for (let variant = 0; variant < VARIANTS; variant += 1) {
      try {
        const buffer = await augmentReferenceImage(row.source_path, variant);
        const embedded = await embedImageBuffer(buffer, { model: artifact.manifest.model });
        timings.push(embedded.elapsed_ms);
        lines.push(JSON.stringify({
          card_id: row.card_id,
          gv_id: row.gv_id ?? null,
          name: row.name ?? null,
          set_code: row.set_code ?? null,
          number: row.number ?? row.number_plain ?? null,
          variant_index: variant,
          source_path: row.source_path,
          embedding_model: embedded.model,
          embedding_ms: embedded.elapsed_ms,
          embedding: embedded.embedding,
        }));
      } catch (error) {
        skipped += 1;
        console.error(JSON.stringify({
          event: 'scanner_v5_augmented_skip',
          card_id: row.card_id,
          variant,
          error: error?.message || String(error),
        }));
      }
    }
    if ((rowIndex + 1) % 25 === 0) {
      console.log(JSON.stringify({
        event: 'scanner_v5_augmented_progress',
        rows_done: rowIndex + 1,
        rows_total: sourceRows.length,
        embeddings: lines.length,
      }));
    }
  }

  await writeFile(outPath, `${lines.join('\n')}\n`);
  const report = {
    artifact: 'full_candidate_compact_v2_augmented',
    source_artifact_dir: path.resolve(args.artifactDir),
    generated_at: new Date().toISOString(),
    trial: args.limit != null,
    row_limit: args.limit,
    source_rows: sourceRows.length,
    variants_per_reference: VARIANTS,
    embedding_rows: lines.length,
    skipped,
    embedding_ms_avg: average(timings),
    output_jsonl: path.resolve(outPath),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

async function augmentReferenceImage(sourcePath, variant) {
  const rotate = [-3, -1.5, 1.5, 3][variant % 4];
  const brightness = [0.94, 1.04, 0.98, 1.08][variant % 4];
  const contrast = [1.06, 0.96, 1.02, 0.94][variant % 4];
  const blur = [0.3, 0, 0.45, 0.35][variant % 4];
  const pad = [0.02, 0.04, 0.06, 0.03][variant % 4];
  const base = sharp(sourcePath, { failOn: 'none' }).rotate();
  const metadata = await base.metadata();
  const width = metadata.width ?? 716;
  const height = metadata.height ?? 1000;
  const padX = Math.round(width * pad);
  const padY = Math.round(height * pad);
  let image = sharp(sourcePath, { failOn: 'none' })
    .rotate()
    .extend({
      top: padY,
      bottom: padY,
      left: padX,
      right: padX,
      background: { r: 14, g: 14, b: 18 },
    })
    .rotate(rotate, { background: { r: 14, g: 14, b: 18 } })
    .modulate({ brightness })
    .linear(contrast, -(128 * contrast) + 128)
    .resize(716, 1000, { fit: 'cover' });
  if (blur > 0) image = image.blur(blur);
  return image.png().toBuffer();
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function average(values) {
  return values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
