import '../env.mjs';

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { safeBasename } from './lib/hash_index_v1.mjs';
import {
  SYNTHETIC_SCAN_AUGMENT_V1,
  computeSyntheticImageQuality,
  generateSyntheticVariant,
  normalizeSourceCardImage,
} from './lib/synthetic_scan_augment_v1.mjs';

const DEFAULT_OUTPUT_DIR = '.tmp/synthetic_scanner_training_v1';
const DEFAULT_LIMIT = 25;
const DEFAULT_VARIANTS = 10;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUTPUT_DIR,
    limit: DEFAULT_LIMIT,
    variants: DEFAULT_VARIANTS,
    downloadTimeoutMs: DEFAULT_DOWNLOAD_TIMEOUT_MS,
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

    if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--limit') {
      args.limit = positiveInt(nextValue(), DEFAULT_LIMIT);
    } else if (name === '--variants') {
      args.variants = positiveInt(nextValue(), DEFAULT_VARIANTS);
    } else if (name === '--download-timeout-ms') {
      args.downloadTimeoutMs = positiveInt(nextValue(), DEFAULT_DOWNLOAD_TIMEOUT_MS);
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_synthetic_scanner_training_dataset_v1.mjs [--limit <n>] [--variants <n>] [--out <folder>]',
    '',
    'Defaults:',
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --limit ${DEFAULT_LIMIT}`,
    `  --variants ${DEFAULT_VARIANTS}`,
    '',
    'Creates a provenance-safe synthetic Scanner V3 training dataset under .tmp only.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const outputDir = path.resolve(args.out);
  const cardsDir = path.join(outputDir, 'cards');
  const sourceCacheDir = path.join(outputDir, 'source_cache');
  await Promise.all([
    ensureDir(outputDir),
    ensureDir(cardsDir),
    ensureDir(sourceCacheDir),
  ]);

  const sourcePlan = await loadCatalogSources({
    limit: args.limit,
    outputDir,
    sourceCacheDir,
    timeoutMs: args.downloadTimeoutMs,
  });

  const sourceManifest = {
    generated_at: new Date().toISOString(),
    generator_version: SYNTHETIC_SCAN_AUGMENT_V1.generator_version,
    source_policy: {
      allowed_source: 'existing Grookai catalog card_prints image_url or representative_image_url',
      disallowed_sources: ['random web scraping', 'scanner guesses', 'unprovenanced images'],
      label_authority: 'card_prints.card_print_id / gv_id from catalog row',
    },
    requested_limit: args.limit,
    source_count: sourcePlan.sources.length,
    skipped_count: sourcePlan.skipped.length,
    sources: sourcePlan.sources,
    skipped_sources: sourcePlan.skipped,
  };
  await writeJson(path.join(outputDir, 'source_manifest.json'), sourceManifest);

  const cardResults = [];
  const qualityRecords = [];
  for (const source of sourcePlan.sources) {
    const result = await generateForSource({
      source,
      cardsDir,
      variantsPerCard: args.variants,
    });
    cardResults.push(result.card_manifest);
    qualityRecords.push(...result.quality_records);
    console.log(JSON.stringify({
      event: 'synthetic_card_generated',
      card_print_id: source.card_print_id,
      generated_variants: result.card_manifest.generated_variant_count,
      rejected_variants: result.card_manifest.rejected_variant_count,
    }));
  }

  const datasetManifest = buildDatasetManifest({
    outputDir,
    args,
    sourceManifest,
    cardResults,
  });
  const qualityReport = buildQualityReport({
    outputDir,
    sourceManifest,
    cardResults,
    qualityRecords,
  });

  await writeJson(path.join(outputDir, 'dataset_manifest.json'), datasetManifest);
  await writeJson(path.join(outputDir, 'quality_report.json'), qualityReport);
  await writeAuditDoc({
    outputDir,
    datasetManifest,
    qualityReport,
  });

  console.log(JSON.stringify(datasetManifest, null, 2));
}

async function generateForSource({ source, cardsDir, variantsPerCard }) {
  const cardDir = path.join(cardsDir, safeBasename(source.card_print_id));
  await ensureDir(cardDir);
  const sourceBuffer = await readFile(source.local_image_path);
  const normalizedBuffer = await normalizeSourceCardImage(sourceBuffer);
  const sourceNormalizedPath = path.join(cardDir, 'source_normalized.png');
  await writeFile(sourceNormalizedPath, normalizedBuffer);

  const sourceQuality = await computeSyntheticImageQuality(normalizedBuffer, {
    card_visible_ratio: 1,
  });
  const variants = [];
  const rejectedVariants = [];
  const qualityRecords = [
    {
      card_print_id: source.card_print_id,
      artifact: 'source_normalized.png',
      accepted: true,
      quality: sourceQuality,
    },
  ];

  const maxAttempts = Math.max(variantsPerCard * 4, variantsPerCard + 4);
  for (let attempt = 1; variants.length < variantsPerCard && attempt <= maxAttempts; attempt += 1) {
    const variant = await generateSyntheticVariant({
      normalizedCardBuffer: normalizedBuffer,
      cardPrintId: source.card_print_id,
      variantIndex: attempt,
    });
    const fileName = `variant_${String(variants.length + 1).padStart(3, '0')}.png`;
    const artifactPath = path.join(cardDir, fileName);

    if (!variant.accepted.accepted) {
      rejectedVariants.push({
        attempted_variant_index: attempt,
        params: variant.params,
        quality: variant.quality,
        rejection_reasons: variant.accepted.rejection_reasons,
      });
      qualityRecords.push({
        card_print_id: source.card_print_id,
        artifact: `rejected_attempt_${String(attempt).padStart(3, '0')}`,
        accepted: false,
        quality: variant.quality,
        rejection_reasons: variant.accepted.rejection_reasons,
      });
      continue;
    }

    await writeFile(artifactPath, variant.buffer);
    variants.push({
      file: fileName,
      path: artifactPath,
      attempted_variant_index: attempt,
      params: variant.params,
      quality: variant.quality,
      accepted: true,
    });
    qualityRecords.push({
      card_print_id: source.card_print_id,
      artifact: fileName,
      accepted: true,
      quality: variant.quality,
      rejection_reasons: [],
    });
  }

  const metadata = {
    card_print_id: source.card_print_id,
    gv_id: source.gv_id,
    name: source.name,
    set_code: source.set_code,
    printed_set_abbrev: source.printed_set_abbrev,
    number: source.number,
    variant_key: source.variant_key,
    label_source: 'catalog_reference',
    dataset_type: 'synthetic',
    label_tier: 'SYNTHETIC',
    excluded_from_real_training_capture: true,
    source_image_url: source.image_url,
    source_image_url_field: source.image_url_field,
    source_provenance: source.source_provenance,
    source_normalized: {
      file: 'source_normalized.png',
      path: sourceNormalizedPath,
      quality: sourceQuality,
    },
    requested_variant_count: variantsPerCard,
    generated_variant_count: variants.length,
    rejected_variant_count: rejectedVariants.length,
    variants,
    rejected_variants: rejectedVariants,
    generator_version: SYNTHETIC_SCAN_AUGMENT_V1.generator_version,
    transform_policy: SYNTHETIC_SCAN_AUGMENT_V1.transform_policy,
    created_at: new Date().toISOString(),
  };
  await writeJson(path.join(cardDir, 'metadata.json'), metadata);

  return {
    card_manifest: metadata,
    quality_records: qualityRecords,
  };
}

async function loadCatalogSources({ limit, outputDir, sourceCacheDir, timeoutMs }) {
  const supabase = createBackendClient();
  const selectWithSet = [
    'id',
    'gv_id',
    'name',
    'number',
    'set_code',
    'variant_key',
    'image_url',
    'representative_image_url',
    'image_source',
    'image_status',
    'image_note',
    'sets(printed_set_abbrev)',
  ].join(', ');
  const selectFallback = [
    'id',
    'gv_id',
    'name',
    'number',
    'set_code',
    'variant_key',
    'image_url',
    'representative_image_url',
    'image_source',
    'image_status',
    'image_note',
  ].join(', ');

  let query = supabase
    .from('card_prints')
    .select(selectWithSet)
    .or('image_url.not.is.null,representative_image_url.not.is.null')
    .order('set_code', { ascending: true })
    .order('number', { ascending: true })
    .limit(limit);

  let { data, error } = await query;
  if (error) {
    const fallback = await supabase
      .from('card_prints')
      .select(selectFallback)
      .or('image_url.not.is.null,representative_image_url.not.is.null')
      .order('set_code', { ascending: true })
      .order('number', { ascending: true })
      .limit(limit);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw new Error(`synthetic_source_manifest_query_failed:${error.message}`);

  const sources = [];
  const skipped = [];
  for (const row of data ?? []) {
    const imageUrl = normalizeUrl(row.image_url) ?? normalizeUrl(row.representative_image_url);
    const imageUrlField = normalizeUrl(row.image_url) ? 'image_url' : 'representative_image_url';
    if (!imageUrl) {
      skipped.push({
        card_print_id: row.id,
        reason: 'missing_catalog_image_url',
      });
      continue;
    }

    try {
      const localImagePath = await downloadReferenceImage({
        url: imageUrl,
        cacheDir: sourceCacheDir,
        cardId: row.id,
        timeoutMs,
      });
      sources.push({
        card_print_id: row.id,
        gv_id: row.gv_id ?? null,
        name: row.name ?? null,
        set_code: row.set_code ?? null,
        printed_set_abbrev: row.sets?.printed_set_abbrev ?? null,
        number: row.number ?? null,
        variant_key: row.variant_key ?? null,
        image_url: imageUrl,
        image_url_field: imageUrlField,
        local_image_path: localImagePath,
        source_provenance: {
          table: 'card_prints',
          image_source: row.image_source ?? null,
          image_status: row.image_status ?? null,
          image_note: row.image_note ?? null,
          catalog_row_url_field: imageUrlField,
        },
      });
    } catch (downloadError) {
      skipped.push({
        card_print_id: row.id,
        image_url: imageUrl,
        reason: downloadError?.message || String(downloadError),
      });
    }
  }

  await writeJson(path.join(outputDir, 'source_download_skips.json'), skipped);
  return { sources, skipped };
}

async function downloadReferenceImage({ url, cacheDir, cardId, timeoutMs }) {
  const ext = imageExtensionFromUrl(url);
  const filePath = path.join(cacheDir, `${safeBasename(cardId)}${ext}`);
  if (await pathExists(filePath)) return filePath;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'grookai-synthetic-scanner-training-dataset-v1/1.0',
      },
    });
    if (!response.ok) throw new Error(`download_http_${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw new Error('download_empty_image');
    await writeFile(filePath, buffer);
    return filePath;
  } finally {
    clearTimeout(timeout);
  }
}

function buildDatasetManifest({ outputDir, args, sourceManifest, cardResults }) {
  const totalVariants = cardResults.reduce((sum, card) => sum + card.generated_variant_count, 0);
  const totalRejected = cardResults.reduce((sum, card) => sum + card.rejected_variant_count, 0);
  return {
    generated_at: new Date().toISOString(),
    output_dir: outputDir,
    generator_version: SYNTHETIC_SCAN_AUGMENT_V1.generator_version,
    requested_limit: args.limit,
    requested_variants_per_card: args.variants,
    total_source_cards: sourceManifest.source_count,
    total_synthetic_variants: totalVariants,
    total_rejected_variants: totalRejected,
    skipped_sources: sourceManifest.skipped_sources,
    skipped_source_count: sourceManifest.skipped_count,
    transform_config_summary: SYNTHETIC_SCAN_AUGMENT_V1.transform_policy,
    quality_thresholds: SYNTHETIC_SCAN_AUGMENT_V1.quality_thresholds,
    label_policy_summary: {
      dataset_type: 'synthetic',
      label_source: 'catalog_reference',
      label_authority: 'card_prints.card_print_id / gv_id',
      no_scanner_guess_labels: true,
      not_gold_or_silver_real_capture: true,
      must_not_be_mixed_with_real_scanner_training_capture: true,
    },
    warning: 'Synthetic examples are not confirmed real Scanner V3 user captures and must not be mixed with GOLD/SILVER real training capture records.',
    cards: cardResults.map((card) => ({
      card_print_id: card.card_print_id,
      gv_id: card.gv_id,
      name: card.name,
      set_code: card.set_code,
      number: card.number,
      generated_variant_count: card.generated_variant_count,
      rejected_variant_count: card.rejected_variant_count,
      metadata_path: path.join(outputDir, 'cards', safeBasename(card.card_print_id), 'metadata.json'),
    })),
  };
}

function buildQualityReport({ outputDir, sourceManifest, cardResults, qualityRecords }) {
  const accepted = qualityRecords.filter((record) => record.accepted);
  const rejected = qualityRecords.filter((record) => !record.accepted);
  const reasonCounts = new Map();
  for (const record of rejected) {
    for (const reason of record.rejection_reasons ?? []) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    output_dir: outputDir,
    source_cards: sourceManifest.source_count,
    cards_with_full_variant_count: cardResults.filter((card) => card.generated_variant_count === card.requested_variant_count).length,
    artifacts_checked: qualityRecords.length,
    accepted_artifacts: accepted.length,
    rejected_variant_attempts: rejected.length,
    rejection_reason_counts: Object.fromEntries([...reasonCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    brightness_score_avg: average(accepted.map((record) => record.quality.brightness_score)),
    blur_score_avg: average(accepted.map((record) => record.quality.blur_score)),
    highlight_ratio_avg: average(accepted.map((record) => record.quality.highlight_ratio)),
    card_visible_ratio_avg: average(accepted.map((record) => record.quality.card_visible_ratio)),
    checks: [
      'decode success',
      'output dimensions',
      'brightness not too dark or bright',
      'blur above minimum',
      'known-transform card visibility estimate',
    ],
    records: qualityRecords,
  };
}

async function writeAuditDoc({ outputDir, datasetManifest, qualityReport }) {
  const auditPath = path.resolve('docs/audits/synthetic_scanner_training_dataset_v1_audit.md');
  const lines = [
    '# Synthetic Scanner Training Dataset V1 Audit',
    '',
    '## Purpose',
    '',
    'This audit covers a local-only synthetic dataset generator for future Scanner V3 Option B model experiments. It does not train a model, write schema, upload artifacts, call AI, or modify scanner runtime behavior.',
    '',
    'The active Scanner V3 path remains Option A: normalized artifacts -> embedding/vector search -> temporal voting -> AI fallback.',
    '',
    '## Source Policy',
    '',
    '- Allowed source images: existing Grookai catalog `card_prints.image_url` or `card_prints.representative_image_url` rows.',
    '- Disallowed sources: random web scraping, unprovenanced images, user captures without confirmation, and scanner guesses.',
    '- The generator stores only local `.tmp` artifacts and source manifests.',
    '',
    '## Label Policy',
    '',
    '- Every synthetic label comes from the source catalog row: `card_print_id` and `gv_id`.',
    '- Every generated example is marked `dataset_type: "synthetic"` and `label_source: "catalog_reference"`.',
    '- These examples are not GOLD or SILVER real capture examples.',
    '- Synthetic examples must not be mixed into confirmed Scanner V3 training capture indexes without an explicit future dataset policy.',
    '',
    '## Transform List',
    '',
    'The V1 generator applies bounded, label-preserving camera-like transforms:',
    '',
    '- slight rotation',
    '- bounded affine/perspective-like skew',
    '- scale and crop shift',
    '- brightness/exposure changes',
    '- contrast and saturation changes',
    '- mild blur',
    '- JPEG recompression',
    '- subtle sleeve haze',
    '- glare overlay',
    '- background canvas and padding',
    '- subtle texture/noise overlay',
    '',
    'Vertical flips and extreme identity-destroying transforms are not used.',
    '',
    '## Generated Counts',
    '',
    `- Source cards: ${datasetManifest.total_source_cards}`,
    `- Synthetic variants generated: ${datasetManifest.total_synthetic_variants}`,
    `- Rejected variant attempts: ${datasetManifest.total_rejected_variants}`,
    `- Skipped sources: ${datasetManifest.skipped_source_count}`,
    `- Quality artifacts checked: ${qualityReport.artifacts_checked}`,
    `- Accepted artifacts: ${qualityReport.accepted_artifacts}`,
    '',
    '## Storage Location',
    '',
    `Local output folder: \`${relativePath(outputDir)}\``,
    '',
    'Primary files:',
    '',
    '- `source_manifest.json`',
    '- `dataset_manifest.json`',
    '- `quality_report.json`',
    '- `cards/<card_print_id>/source_normalized.png`',
    '- `cards/<card_print_id>/variant_###.png`',
    '- `cards/<card_print_id>/metadata.json`',
    '',
    '## Quality Audit',
    '',
    'The generator checks decode success, output dimensions, brightness, blur, and a known-transform estimate that the card remains visible. Rejected variants are recorded in metadata and `quality_report.json`.',
    '',
    `Average accepted brightness score: ${qualityReport.brightness_score_avg}`,
    `Average accepted blur score: ${qualityReport.blur_score_avg}`,
    `Average accepted highlight ratio: ${qualityReport.highlight_ratio_avg}`,
    `Average accepted card visible ratio: ${qualityReport.card_visible_ratio_avg}`,
    '',
    '## Governance Warning',
    '',
    datasetManifest.warning,
    '',
    '## Next Step',
    '',
    'Use this dataset only for offline model experimentation. The next implementation step is a model-experiment harness that reads `dataset_manifest.json`, creates explicit train/validation splits, and keeps synthetic data separate from future GOLD/SILVER real Scanner V3 captures.',
    '',
  ];
  await writeFile(auditPath, `${lines.join('\n')}\n`);
}

function normalizeUrl(value) {
  const text = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return null;
  return text;
}

function imageExtensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  } catch {
    // fall through
  }
  return '.jpg';
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return Math.round((finite.reduce((sum, value) => sum + value, 0) / finite.length) * 1_000_000) / 1_000_000;
}

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
