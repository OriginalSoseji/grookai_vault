import '../env.mjs';

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createInterface } from 'node:readline/promises';
import sharp from 'sharp';

import {
  EMBEDDING_INDEX_V1,
  cosineDistance,
  embedImageBuffer,
} from './lib/embedding_index_v1.mjs';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8789;
const DEFAULT_ARTIFACT_DIR = '.tmp/scanner_v3_ann_index_v1/sample_v1';
const DEFAULT_MAX_HAMMING = 6;
const DEFAULT_TOP_K = 15;
const DEFAULT_MAX_CANDIDATE_VECTORS = 10000;
const DEFAULT_VISUAL_RERANK_TOP_N = 500;
const DEFAULT_VISUAL_RERANK_POOL_K = 500;
const DEFAULT_VISUAL_RERANK_SIZE = 32;
const DEFAULT_VISUAL_RERANK_GRID = 4;
const DEFAULT_VISUAL_RERANK_COLOR_THRESHOLD = 0.06;
const DEFAULT_VISUAL_RERANK_PENALTY_WEIGHT = 1.5;
const DEFAULT_VISUAL_RERANK_DISTANCE_WEIGHT = 1.0;
const DEFAULT_VISUAL_RERANK_ANN_WEIGHT = 0.30;
const DEFAULT_VISUAL_RERANK_COLOR_WEIGHT = 0.10;
const DEFAULT_VISUAL_RERANK_STRUCTURE_WEIGHT = 0.60;
const DEFAULT_VISUAL_STRUCTURE_SIZE = 56;
const DEFAULT_VISUAL_ALIGNMENT_SIZE = 48;
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const VECTOR_DTYPE = 'float32le';
const SAME_NAME_FAMILY_SUPPORT_CROP_TYPE = 'same_name_family_support';
const VISUAL_IDENTITY_BAND_SUPPORT_CROP_TYPE = 'visual_identity_band_match';
const FULL_CARD_EXACT_VISUAL_MATCH_CROP_TYPE = 'full_card_exact_visual_match';
const FULL_CARD_EXACT_SCAN_CROP_TYPES = new Set(['full_card']);
const FULL_CARD_EXACT_SCAN_VIEW_TYPES = ['full_card'];
const FULL_CARD_FAMILY_SUPPORT_TOP_N = 80;
const FULL_CARD_FAMILY_SUPPORT_MIN_COUNT = 3;
const FULL_CARD_FAMILY_SUPPORT_MAX_BEST_GAP = 0.04;
const FULL_CARD_FAMILY_SUPPORT_DISTANCE_BONUS = 0.055;
const REPRESENTATIVE_REFERENCE_DISTANCE_PENALTY = 0.01;
const IDENTITY_BAND_FEATURE_WIDTH = 96;
const IDENTITY_BAND_FEATURE_HEIGHT = 24;
const IDENTITY_BAND_DISTANCE_WEIGHT = 0.08;
const IDENTITY_BAND_SUPPORT_MAX_ABSOLUTE_DISTANCE = 0.34;
const IDENTITY_BAND_SUPPORT_MIN_SEPARATION = 0.006;
const FULL_CARD_EXACT_VISUAL_MATCH_RERANK_TOP_N = 80;
const FULL_CARD_EXACT_VISUAL_MATCH_MAX_ALIGNMENT_DISTANCE = 0.30;
const FULL_CARD_EXACT_VISUAL_MATCH_MIN_SEPARATION = 0.035;
const FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE = 'fixed_slot_visual_confirmation';
const FIXED_SLOT_VISUAL_CONFIRMATION_MAX_CANDIDATES = 260;
const FIXED_SLOT_CANDIDATE_POOL_MAX_PER_CROP = 200;
const FIXED_SLOT_CANDIDATE_SUPPORT_BONUS = 0.018;
const FIXED_SLOT_CANDIDATE_SUPPORT_BONUS_MAX = 0.072;
const FIXED_SLOT_VISUAL_CONFIRMATION_FEATURE_SIZE = 48;
const FIXED_SLOT_VISUAL_CONFIRMATION_THRESHOLD = 0.78;
const FIXED_SLOT_VISUAL_CONFIRMATION_MIN_SEPARATION = 0.08;
const FIXED_SLOT_VISUAL_CONFIRMATION_REGIONS = {
  title: { left: 0.02, top: 0.00, right: 0.98, bottom: 0.16 },
  artwork: { left: 0.12, top: 0.18, right: 0.88, bottom: 0.47 },
  attack: { left: 0.04, top: 0.50, right: 0.96, bottom: 0.67 },
  full: { left: 0.00, top: 0.00, right: 1.00, bottom: 1.00 },
  bottom: { left: 0.02, top: 0.90, right: 0.98, bottom: 1.00 },
};
const FIXED_SLOT_VISUAL_CONFIRMATION_WEIGHTS = {
  artwork: 0.40,
  title: 0.35,
  attack: 0.15,
  full: 0.05,
  bottom: 0.00,
  ann: 0.05,
};
let debugCropRequestSequence = 0;

function parseArgs(argv) {
  const args = {
    host: process.env.SCANNER_V3_ANN_HOST || DEFAULT_HOST,
    port: positiveInt(process.env.SCANNER_V3_ANN_PORT, DEFAULT_PORT),
    artifactDir: process.env.SCANNER_V3_ANN_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR,
    model: process.env.SCANNER_V3_IDENTITY_MODEL || EMBEDDING_INDEX_V1.model,
    topK: positiveInt(process.env.SCANNER_V3_ANN_TOP_K, DEFAULT_TOP_K),
    maxHamming: positiveInt(process.env.SCANNER_V3_ANN_MAX_HAMMING, DEFAULT_MAX_HAMMING),
    maxCandidateVectors: positiveInt(
      process.env.SCANNER_V3_ANN_MAX_CANDIDATE_VECTORS,
      DEFAULT_MAX_CANDIDATE_VECTORS,
    ),
    visualRerankEnabled: String(process.env.SCANNER_V3_VISUAL_RERANK ?? '1') !== '0',
    visualRerankTopN: positiveInt(
      process.env.SCANNER_V3_VISUAL_RERANK_TOP_N,
      DEFAULT_VISUAL_RERANK_TOP_N,
    ),
    visualRerankPoolK: positiveInt(
      process.env.SCANNER_V3_VISUAL_RERANK_POOL_K,
      DEFAULT_VISUAL_RERANK_POOL_K,
    ),
    visualRerankSize: positiveInt(
      process.env.SCANNER_V3_VISUAL_RERANK_SIZE,
      DEFAULT_VISUAL_RERANK_SIZE,
    ),
    visualRerankGrid: positiveInt(
      process.env.SCANNER_V3_VISUAL_RERANK_GRID,
      DEFAULT_VISUAL_RERANK_GRID,
    ),
    visualRerankColorThreshold: positiveNumber(
      process.env.SCANNER_V3_VISUAL_RERANK_COLOR_THRESHOLD,
      DEFAULT_VISUAL_RERANK_COLOR_THRESHOLD,
    ),
    visualRerankPenaltyWeight: positiveNumber(
      process.env.SCANNER_V3_VISUAL_RERANK_PENALTY_WEIGHT,
      DEFAULT_VISUAL_RERANK_PENALTY_WEIGHT,
    ),
    visualRerankDistanceWeight: positiveNumber(
      process.env.SCANNER_V3_VISUAL_RERANK_DISTANCE_WEIGHT,
      DEFAULT_VISUAL_RERANK_DISTANCE_WEIGHT,
    ),
    visualRerankAnnWeight: positiveNumber(
      process.env.SCANNER_V3_VISUAL_RERANK_ANN_WEIGHT,
      DEFAULT_VISUAL_RERANK_ANN_WEIGHT,
    ),
    visualRerankColorWeight: positiveNumber(
      process.env.SCANNER_V3_VISUAL_RERANK_COLOR_WEIGHT,
      DEFAULT_VISUAL_RERANK_COLOR_WEIGHT,
    ),
    visualRerankStructureWeight: positiveNumber(
      process.env.SCANNER_V3_VISUAL_RERANK_STRUCTURE_WEIGHT,
      DEFAULT_VISUAL_RERANK_STRUCTURE_WEIGHT,
    ),
    visualStructureSize: positiveInt(
      process.env.SCANNER_V3_VISUAL_STRUCTURE_SIZE,
      DEFAULT_VISUAL_STRUCTURE_SIZE,
    ),
    visualAlignmentSize: positiveInt(
      process.env.SCANNER_V3_VISUAL_ALIGNMENT_SIZE,
      DEFAULT_VISUAL_ALIGNMENT_SIZE,
    ),
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

    if (name === '--host') {
      args.host = nextValue() || DEFAULT_HOST;
    } else if (name === '--port') {
      args.port = positiveInt(nextValue(), DEFAULT_PORT);
    } else if (name === '--artifact-dir') {
      args.artifactDir = nextValue() || DEFAULT_ARTIFACT_DIR;
    } else if (name === '--model') {
      args.model = nextValue() || EMBEDDING_INDEX_V1.model;
    } else if (name === '--top-k') {
      args.topK = positiveInt(nextValue(), DEFAULT_TOP_K);
    } else if (name === '--max-hamming') {
      args.maxHamming = positiveInt(nextValue(), DEFAULT_MAX_HAMMING);
    } else if (name === '--max-candidate-vectors') {
      args.maxCandidateVectors = positiveInt(nextValue(), DEFAULT_MAX_CANDIDATE_VECTORS);
    } else if (name === '--visual-rerank') {
      args.visualRerankEnabled = String(nextValue() || '1') !== '0';
    } else if (name === '--visual-rerank-top-n') {
      args.visualRerankTopN = positiveInt(nextValue(), DEFAULT_VISUAL_RERANK_TOP_N);
    } else if (name === '--visual-rerank-pool-k') {
      args.visualRerankPoolK = positiveInt(nextValue(), DEFAULT_VISUAL_RERANK_POOL_K);
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs --artifact-dir .tmp/scanner_v3_ann_index_v1/sample_v1 --port 8789',
    '',
    'Endpoints:',
    '  GET  /health',
    '  POST /scanner-v3/resolve-crops',
    '  POST /scanner-v3/candidates',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const artifact = await loadAnnArtifact(path.resolve(args.artifactDir));
  await warmEmbeddingModel(args.model);

  const service = {
    startedAt: new Date().toISOString(),
    args,
    artifact,
    visualFeatureCache: new Map(),
    visualStructureFeatureCache: new Map(),
    visualAlignmentFeatureCache: new Map(),
    visualIdentityBandFeatureCache: new Map(),
    fixedSlotVisualConfirmationFeatureCache: new Map(),
  };

  const server = createServer((request, response) => {
    handleRequest(request, response, service).catch((error) => {
      writeJson(response, 500, {
        ok: false,
        error: error?.message || String(error),
      });
    });
  });

  server.listen(args.port, args.host, () => {
    console.log(JSON.stringify({
      event: 'scanner_v3_ann_identity_service_started',
      host: args.host,
      port: args.port,
      health: `http://${args.host}:${args.port}/health`,
      artifact_dir: artifact.artifactDir,
      reference_count: artifact.referenceCount,
      reference_view_count: artifact.referenceViewCount,
      shard_count: artifact.shards.size,
    }, null, 2));
  });
}

async function handleRequest(request, response, service) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const requestStartedAt = performance.now();

  if (request.method === 'GET' && url.pathname === '/health') {
    writeJson(response, 200, {
      ok: true,
      service: 'scanner_v3_ann_identity_service_v1',
      started_at: service.startedAt,
      model: service.args.model,
      artifact_dir: service.artifact.artifactDir,
      artifact: service.artifact.manifest.artifact,
      generated_at: service.artifact.manifest.generated_at,
      lsh: service.artifact.manifest.lsh,
      reference_count: service.artifact.referenceCount,
      reference_view_count: service.artifact.referenceViewCount,
      pal_sv02_count: service.artifact.palSv02Count,
      shard_count: service.artifact.shards.size,
      storage: service.artifact.manifest.storage ?? null,
      max_hamming: service.args.maxHamming,
      max_candidate_vectors: service.args.maxCandidateVectors,
      visual_rerank: {
        enabled: service.args.visualRerankEnabled,
        top_n: service.args.visualRerankTopN,
        pool_k: service.args.visualRerankPoolK,
        size: service.args.visualRerankSize,
        grid: service.args.visualRerankGrid,
        color_threshold: service.args.visualRerankColorThreshold,
        penalty_weight: service.args.visualRerankPenaltyWeight,
        distance_weight: service.args.visualRerankDistanceWeight,
        ann_weight: service.args.visualRerankAnnWeight,
        color_weight: service.args.visualRerankColorWeight,
        structure_weight: service.args.visualRerankStructureWeight,
        structure_size: service.args.visualStructureSize,
        alignment_size: service.args.visualAlignmentSize,
        cache_entries: service.visualFeatureCache.size,
        structure_cache_entries: service.visualStructureFeatureCache.size,
        alignment_cache_entries: service.visualAlignmentFeatureCache.size,
        identity_band_cache_entries: service.visualIdentityBandFeatureCache.size,
        fixed_slot_confirmation_cache_entries:
          service.fixedSlotVisualConfirmationFeatureCache.size,
      },
      fixed_slot_visual_confirmation: {
        enabled: true,
        crop_type: FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE,
        max_candidates: FIXED_SLOT_VISUAL_CONFIRMATION_MAX_CANDIDATES,
        max_per_crop: FIXED_SLOT_CANDIDATE_POOL_MAX_PER_CROP,
        support_bonus: FIXED_SLOT_CANDIDATE_SUPPORT_BONUS,
        support_bonus_max: FIXED_SLOT_CANDIDATE_SUPPORT_BONUS_MAX,
        feature_size: FIXED_SLOT_VISUAL_CONFIRMATION_FEATURE_SIZE,
        threshold: FIXED_SLOT_VISUAL_CONFIRMATION_THRESHOLD,
        min_separation: FIXED_SLOT_VISUAL_CONFIRMATION_MIN_SEPARATION,
      },
      ocr: {
        title_ocr_enabled: false,
        title_ocr_engine: null,
        disabled_by_contract: 'SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1',
      },
      memory_usage: process.memoryUsage(),
      endpoints: {
        candidates: '/scanner-v3/candidates',
        resolve_crops: '/scanner-v3/resolve-crops',
      },
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/scanner-v3/resolve-crops') {
    const body = await readJsonBody(request);
    const crops = Array.isArray(body.crops) ? body.crops : [];
    if (crops.length === 0) {
      writeJson(response, 400, { ok: false, error: 'missing_crops' });
      return;
    }

    const startedAt = performance.now();
    const topK = positiveInt(body.top_k ?? body.topK, service.args.topK);
    const debugRequestId = debugCropRequestSequence += 1;
    const resolvedCrops = await Promise.all(crops.map(async (crop) => (
      resolveCrop({ crop, service, topK, debugRequestId })
    )));
    const expandedCrops = await applySameNameExpansion({
      resolvedCrops,
      service,
      topK,
    });
    const fixedSlotVisualConfirmation = await confirmFixedSlotVisualCandidate({
      resolvedCrops: expandedCrops,
      service,
    });
    const publicCrops = expandedCrops.map(publicResolvedCrop);

    const payload = {
      ok: true,
      crops: publicCrops,
      fixed_slot_visual_confirmation: fixedSlotVisualConfirmation,
      count: publicCrops.length,
      top_k: topK,
      model: service.args.model,
      distance: EMBEDDING_INDEX_V1.distance,
      reference_count: service.artifact.referenceCount,
      reference_view_count: service.artifact.referenceViewCount,
      ann: true,
      elapsed_ms: roundMs(performance.now() - startedAt),
      mode: body.mode ?? null,
    };
    console.log(JSON.stringify({
      event: 'ann_resolve_crops_request',
      crop_count: publicCrops.length,
      successful_crop_count: publicCrops.filter((crop) => crop.ok).length,
      elapsed_ms: roundMs(performance.now() - requestStartedAt),
      remote: request.socket.remoteAddress,
    }));
    writeJson(response, 200, payload);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/scanner-v3/candidates') {
    const body = await readJsonBody(request);
    const embedding = Array.isArray(body.embedding)
      ? body.embedding.map(Number).filter(Number.isFinite)
      : [];
    if (embedding.length === 0) {
      writeJson(response, 400, { ok: false, error: 'missing_embedding' });
      return;
    }
    const startedAt = performance.now();
    const topK = positiveInt(body.top_k ?? body.topK, service.args.topK);
    const queryCropType = textOrNull(body.query_crop_type ?? body.queryCropType);
    const search = searchAnn({
      queryEmbedding: embedding,
      queryCropType,
      service,
      topK,
    });
    writeJson(response, 200, {
      ok: true,
      candidates: search.candidates.map(publicResponseCandidate),
      count: search.candidates.length,
      top_k: topK,
      query_crop_type: queryCropType,
      model: service.args.model,
      distance: EMBEDDING_INDEX_V1.distance,
      reference_count: service.artifact.referenceCount,
      reference_view_count: service.artifact.referenceViewCount,
      vector_search_ms: roundMs(performance.now() - startedAt),
      ann: search.stats,
      mode: body.mode ?? null,
    });
    return;
  }

  writeJson(response, 404, {
    ok: false,
    error: 'not_found',
    path: url.pathname,
  });
}

async function resolveCrop({ crop, service, topK, debugRequestId }) {
  const cropStartedAt = performance.now();
  const cropType = textOrNull(crop?.crop_type ?? crop?.cropType ?? crop?.type);
  try {
    const imageBuffer = await imageBufferFromCrop(crop);
    await saveDebugCropImage({
      imageBuffer,
      cropType,
      debugRequestId,
    });
    if (String(cropType ?? '').toLowerCase() === FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE) {
      return {
        ok: true,
        crop_type: cropType,
        candidates: [],
        count: 0,
        embedding_ms: null,
        vector_search_ms: null,
        visual_rerank_ms: null,
        ocr_ms: null,
        ocr: null,
        ann: {
          skipped: true,
          reason: 'fixed_slot_visual_confirmation_only',
        },
        elapsed_ms: roundMs(performance.now() - cropStartedAt),
        _internal_image_buffer: imageBuffer,
        _internal_embedding: null,
      };
    }
    const embedding = await embedImageBuffer(imageBuffer, { model: service.args.model });
    const vectorStartedAt = performance.now();
    const searchTopK = service.args.visualRerankEnabled
      ? Math.max(topK, service.args.visualRerankPoolK, service.args.visualRerankTopN)
      : topK;
    const search = searchAnn({
      queryEmbedding: embedding.embedding,
      queryCropType: cropType,
      service,
      topK: searchTopK,
    });
    const vectorSearchMs = roundMs(performance.now() - vectorStartedAt);
    const candidatesWithIdentityBand = await applyFullCardIdentityBandSupport({
      imageBuffer,
      cropType,
      candidates: search.candidates,
      service,
    });
    const visualRerankStartedAt = performance.now();
    const visualRerank = await rerankCandidatesByVisualColor({
      imageBuffer,
      cropType,
      candidates: candidatesWithIdentityBand,
      service,
      topK,
    });
    logDebugCropTopCandidates({
      cropType,
      candidates: visualRerank.candidates,
    });
    return {
      ok: true,
      crop_type: cropType,
      candidates: visualRerank.candidates,
      count: visualRerank.candidates.length,
      embedding_ms: embedding.elapsed_ms,
      vector_search_ms: vectorSearchMs,
      visual_rerank_ms: roundMs(performance.now() - visualRerankStartedAt),
      ocr_ms: null,
      ocr: null,
      ann: {
        ...search.stats,
        requested_top_k: topK,
        search_top_k: searchTopK,
        visual_rerank: visualRerank.stats,
      },
      elapsed_ms: roundMs(performance.now() - cropStartedAt),
      _internal_image_buffer: imageBuffer,
      _internal_embedding: embedding.embedding,
    };
  } catch (error) {
    return {
      ok: false,
      crop_type: cropType,
      candidates: [],
      count: 0,
      embedding_ms: null,
      vector_search_ms: null,
      ann: null,
      elapsed_ms: roundMs(performance.now() - cropStartedAt),
      error: error?.message || String(error),
    };
  }
}

async function applySameNameExpansion({ resolvedCrops, service, topK }) {
  const nameHints = sameNameExpansionHints(resolvedCrops);
  if (nameHints.size === 0) return resolvedCrops;

  return Promise.all(resolvedCrops.map(async (crop) => {
    if (
      !crop?.ok ||
      !isFullCardAlignmentCrop(crop.crop_type) ||
      !crop._internal_image_buffer ||
      !Array.isArray(crop._internal_embedding)
    ) {
      return crop;
    }

    const expansionCandidates = sameNameExpansionCandidates({
      artifact: service.artifact,
      nameHints,
      queryEmbedding: crop._internal_embedding,
      queryCropType: crop.crop_type,
    });
    if (expansionCandidates.length === 0) return crop;

    const combinedCandidates = dedupeCandidatesByCard([
      ...(Array.isArray(crop.candidates) ? crop.candidates : []),
      ...expansionCandidates,
    ], crop.crop_type, Math.max(topK, service.args.visualRerankTopN, service.args.visualRerankPoolK));

    const reranked = await rerankCandidatesByVisualColor({
      imageBuffer: crop._internal_image_buffer,
      cropType: crop.crop_type,
      candidates: combinedCandidates,
      service,
      topK,
    });
    const expanded = {
      ...crop,
      candidates: reranked.candidates,
      count: reranked.candidates.length,
      ann: {
        ...(crop.ann ?? {}),
        same_name_expansion: {
          enabled: true,
          hint_count: nameHints.size,
          hints: [...nameHints],
          candidate_count: expansionCandidates.length,
        },
        visual_rerank: reranked.stats,
      },
    };
    if (process.env.SCANNER_V3_DEBUG_LOG_TOP === '1') {
      console.log(JSON.stringify({
        event: 'scanner_v3_debug_same_name_expansion',
        crop_type: crop.crop_type,
        hints: [...nameHints],
        expansion_candidate_count: expansionCandidates.length,
        top: expanded.candidates.slice(0, 5).map((candidate) => ({
          rank: candidate.rank,
          name: candidate.name,
          gv_id: candidate.gv_id,
          card_id: candidate.card_id,
          distance: candidate.distance,
          view: candidate.reference_view_type,
          same_name_expansion: candidate.same_name_expansion === true,
          alignment: candidate.visual_card_alignment_distance,
        })),
      }));
    }
    return expanded;
  }));
}

function publicResolvedCrop(crop) {
  if (!crop || typeof crop !== 'object') return crop;
  const {
    _internal_image_buffer: _unusedImageBuffer,
    _internal_embedding: _unusedEmbedding,
    ...publicCrop
  } = crop;
  return publicCrop;
}

async function confirmFixedSlotVisualCandidate({ resolvedCrops, service }) {
  const confirmationCrop = resolvedCrops.find((crop) =>
    crop?.ok &&
    String(crop.crop_type ?? '').toLowerCase() === FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE &&
    crop._internal_image_buffer
  );
  const fullCardCrop = confirmationCrop ?? resolvedCrops.find((crop) =>
    crop?.ok && String(crop.crop_type ?? '').toLowerCase() === 'full_card' &&
    crop._internal_image_buffer
  );
  if (!fullCardCrop) {
    return {
      enabled: true,
      confirmed: false,
      failure_reason: 'missing_full_card_crop',
      candidate: null,
    };
  }

  const candidatePool = fixedSlotCandidatePool(resolvedCrops);
  if (candidatePool.length === 0) {
    return {
      enabled: true,
      confirmed: false,
      failure_reason: 'missing_candidate_pool',
      candidate: null,
    };
  }

  const startedAt = performance.now();
  const queryFeatures = await fixedSlotVisualConfirmationFeaturesFromImageBuffer(
    fullCardCrop._internal_image_buffer,
  );
  const ranked = [];
  let skippedCount = 0;
  for (const candidate of candidatePool.slice(0, FIXED_SLOT_VISUAL_CONFIRMATION_MAX_CANDIDATES)) {
    try {
      const referenceFeatures = await referenceFixedSlotVisualConfirmationFeatures(
        candidate,
        service,
      );
      if (!referenceFeatures) {
        skippedCount += 1;
        continue;
      }
      const distances = {};
      for (const key of Object.keys(FIXED_SLOT_VISUAL_CONFIRMATION_REGIONS)) {
        distances[key] = cosineDistance(queryFeatures[key], referenceFeatures[key]);
      }
      let visualScore = 0;
      for (const [key, weight] of Object.entries(FIXED_SLOT_VISUAL_CONFIRMATION_WEIGHTS)) {
        if (key === 'ann') continue;
        visualScore += (distances[key] ?? 1) * weight;
      }
      const score = round6(
        visualScore +
          (Number(candidate.distance ?? candidate.ann_distance ?? 1) *
            FIXED_SLOT_VISUAL_CONFIRMATION_WEIGHTS.ann) -
          fixedSlotCandidateSupportBonus(candidate),
      );
      ranked.push({
        ...candidate,
        fixed_slot_visual_confirmation_score: score,
        fixed_slot_visual_score: round6(visualScore),
        fixed_slot_visual_distances: roundObjectValues(distances),
      });
    } catch {
      skippedCount += 1;
    }
  }

  ranked.sort((a, b) => {
    if (a.fixed_slot_visual_confirmation_score !== b.fixed_slot_visual_confirmation_score) {
      return a.fixed_slot_visual_confirmation_score - b.fixed_slot_visual_confirmation_score;
    }
    return Number(a.distance ?? 1) - Number(b.distance ?? 1);
  });

  const top = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  const separation = top && second
    ? round6(
      second.fixed_slot_visual_confirmation_score -
        top.fixed_slot_visual_confirmation_score,
    )
    : null;
  const confirmed = Boolean(
    top &&
      top.fixed_slot_visual_confirmation_score <=
        FIXED_SLOT_VISUAL_CONFIRMATION_THRESHOLD &&
      (separation === null ||
        separation >= FIXED_SLOT_VISUAL_CONFIRMATION_MIN_SEPARATION),
  );
  const exactFullCardConfirmation = fixedSlotExactFullCardConfirmationCandidate(resolvedCrops);
  const selected = exactFullCardConfirmation &&
    (
      exactFullCardConfirmation.fixed_slot_exact_priority === 'rank1_full_card' ||
      !confirmed ||
      !fixedSlotVisualCandidateHasFullCardEvidence(top)
    )
    ? exactFullCardConfirmation
    : confirmed
      ? top
      : exactFullCardConfirmation;
  const candidate = selected
    ? publicResponseCandidate({
      ...selected,
      distance: selected.fixed_slot_visual_confirmation_score ?? selected.distance,
      similarity: round6(Math.max(
        0,
        1 - Number(selected.fixed_slot_visual_confirmation_score ?? selected.distance ?? 1),
      )),
      aggregate_score: round6(Math.max(
        0,
        1 - Number(selected.fixed_slot_visual_confirmation_score ?? selected.distance ?? 1),
      )),
      rerank_score: round6(Math.max(
        0,
        1 - Number(selected.fixed_slot_visual_confirmation_score ?? selected.distance ?? 1),
      )),
      crop_type: FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE,
      best_query_crop_type: FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE,
      contributing_crop_types: [
        ...new Set([
          ...(Array.isArray(selected.contributing_crop_types)
            ? selected.contributing_crop_types
            : []),
          FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE,
        ]),
      ],
      fixed_slot_visual_confirmation: true,
    })
    : null;
  const finalConfirmed = Boolean(candidate);

  return {
    enabled: true,
    confirmed: finalConfirmed,
    failure_reason: finalConfirmed
      ? null
      : fixedSlotConfirmationFailureReason({ top, second, separation }),
    candidate,
    elapsed_ms: roundMs(performance.now() - startedAt),
    candidate_pool_count: candidatePool.length,
    scored_count: ranked.length,
    skipped_count: skippedCount,
    decision: {
      threshold: FIXED_SLOT_VISUAL_CONFIRMATION_THRESHOLD,
      min_separation: FIXED_SLOT_VISUAL_CONFIRMATION_MIN_SEPARATION,
      top_score: top?.fixed_slot_visual_confirmation_score ?? null,
      second_score: second?.fixed_slot_visual_confirmation_score ?? null,
      separation,
      exact_full_card_confirmation:
        exactFullCardConfirmation == null
          ? null
          : {
              gv_id: exactFullCardConfirmation.gv_id ?? null,
              name: exactFullCardConfirmation.name ?? null,
              distance: exactFullCardConfirmation.distance ?? null,
              visual_card_alignment_distance:
                exactFullCardConfirmation.visual_card_alignment_distance ?? null,
              visual_card_alignment_separation:
                exactFullCardConfirmation.visual_card_alignment_separation ?? null,
            },
    },
    top_candidates: ranked.slice(0, 8).map((candidate) => publicResponseCandidate(candidate)),
  };
}

function fixedSlotExactFullCardConfirmationCandidate(resolvedCrops) {
  const fullCardCrop = resolvedCrops.find((crop) =>
    crop?.ok &&
    String(crop.crop_type ?? '').toLowerCase() === 'full_card' &&
    Array.isArray(crop.candidates) &&
    crop.candidates.length > 0
  );
  const signaledCandidate = fullCardCrop?.candidates?.find((row) =>
    textOrNull(row?.gv_id) && fixedSlotFullCardExactSignal(row)
  );
  if (signaledCandidate) {
    return fixedSlotExactFullCardCandidateIfSafe(
      signaledCandidate,
      'full_card_exact_visual_match',
    );
  }

  const firstCanonicalCandidate = fullCardCrop?.candidates?.find((row) =>
    textOrNull(row?.gv_id)
  );
  if (
    firstCanonicalCandidate &&
    Number(firstCanonicalCandidate.rank ?? 999999) <= 1
  ) {
    return fixedSlotExactFullCardCandidateIfSafe(
      firstCanonicalCandidate,
      'rank1_full_card',
    );
  }

  return null;
}

function fixedSlotExactFullCardCandidateIfSafe(candidate, priority) {
  const distance = Number(candidate.distance ?? 1);
  const alignmentDistance = Number(candidate.visual_card_alignment_distance);
  const alignmentSeparation = Number(candidate.visual_card_alignment_separation);
  if (!Number.isFinite(distance) || distance > 0.24) return null;
  if (Number.isFinite(alignmentDistance) && alignmentDistance > 0.24) return null;
  if (Number.isFinite(alignmentSeparation) && alignmentSeparation < 0.045) return null;

  return {
    ...candidate,
    fixed_slot_visual_confirmation_score: round6(distance),
    fixed_slot_visual_confirmation_source: priority,
    fixed_slot_exact_priority: priority,
    contributing_crop_types: [
      ...new Set([
        ...(Array.isArray(candidate.contributing_crop_types)
          ? candidate.contributing_crop_types
          : []),
        FULL_CARD_EXACT_VISUAL_MATCH_CROP_TYPE,
      ]),
    ],
  };
}

function fixedSlotFullCardExactSignal(candidate) {
  return (
    candidate?.visual_full_card_alignment_signal === true ||
    candidate?.full_card_exact_visual_match === true ||
    (Array.isArray(candidate?.contributing_crop_types) &&
      (
        candidate.contributing_crop_types.includes('visual_full_card_alignment') ||
        candidate.contributing_crop_types.includes(FULL_CARD_EXACT_VISUAL_MATCH_CROP_TYPE)
      ))
  );
}

function fixedSlotVisualCandidateHasFullCardEvidence(candidate) {
  if (!candidate) return false;
  if (fixedSlotFullCardExactSignal(candidate)) return true;
  const alignmentDistance = Number(candidate.visual_card_alignment_distance);
  return Number.isFinite(alignmentDistance) && alignmentDistance <= 0.24;
}

function fixedSlotCandidatePool(resolvedCrops) {
  const byGvId = new Map();
  for (const crop of resolvedCrops) {
    const cropType = String(crop?.crop_type ?? '').toLowerCase();
    if (!crop?.ok || !Array.isArray(crop.candidates)) continue;
    if (!isFixedSlotCandidatePoolCropType(cropType)) continue;
    for (const candidate of crop.candidates.slice(0, FIXED_SLOT_CANDIDATE_POOL_MAX_PER_CROP)) {
      const gvId = textOrNull(candidate.gv_id);
      const cardId = textOrNull(candidate.card_id);
      if (!gvId || !cardId) continue;
      const existing = byGvId.get(gvId);
      const cropTypes = new Set(existing?.fixed_slot_query_crop_types ?? []);
      cropTypes.add(cropType);
      const bestDistanceByCrop = {
        ...(existing?.fixed_slot_best_distance_by_crop ?? {}),
      };
      const bestRankByCrop = {
        ...(existing?.fixed_slot_best_rank_by_crop ?? {}),
      };
      const candidateDistance = Number(candidate.distance ?? 1);
      const candidateRank = Number(candidate.rank ?? 999999);
      if (
        bestDistanceByCrop[cropType] == null ||
        candidateDistance < Number(bestDistanceByCrop[cropType])
      ) {
        bestDistanceByCrop[cropType] = round6(candidateDistance);
      }
      if (
        bestRankByCrop[cropType] == null ||
        candidateRank < Number(bestRankByCrop[cropType])
      ) {
        bestRankByCrop[cropType] = Number.isFinite(candidateRank) ? candidateRank : null;
      }
      const base = !existing || candidateDistance < Number(existing.distance ?? 1)
        ? {
            ...candidate,
            source_crop_type: crop.crop_type,
          }
        : existing;
      const supportCount = cropTypes.size;
      const supportBonus = Math.min(
        FIXED_SLOT_CANDIDATE_SUPPORT_BONUS_MAX,
        Math.max(0, supportCount - 1) * FIXED_SLOT_CANDIDATE_SUPPORT_BONUS,
      );
      const poolScore = round6(Math.max(0, Number(base.distance ?? 1) - supportBonus));
      byGvId.set(gvId, {
        ...base,
        fixed_slot_query_crop_types: [...cropTypes].sort(),
        fixed_slot_query_support_count: supportCount,
        fixed_slot_best_distance_by_crop: bestDistanceByCrop,
        fixed_slot_best_rank_by_crop: bestRankByCrop,
        fixed_slot_candidate_support_bonus: round6(supportBonus),
        fixed_slot_candidate_pool_score: poolScore,
      });
    }
  }
  return [...byGvId.values()].sort((a, b) => {
    const scoreA = Number(a.fixed_slot_candidate_pool_score ?? a.distance ?? 1);
    const scoreB = Number(b.fixed_slot_candidate_pool_score ?? b.distance ?? 1);
    if (scoreA !== scoreB) return scoreA - scoreB;
    const supportA = Number(a.fixed_slot_query_support_count ?? 1);
    const supportB = Number(b.fixed_slot_query_support_count ?? 1);
    if (supportA !== supportB) return supportB - supportA;
    return Number(a.distance ?? 1) - Number(b.distance ?? 1);
  });
}

function isFixedSlotCandidatePoolCropType(cropType) {
  if (!cropType || cropType === FIXED_SLOT_VISUAL_CONFIRMATION_CROP_TYPE) return false;
  return (
    cropType === 'full_card' ||
    cropType === 'full_card_core_identity' ||
    cropType === 'full_card_core' ||
    cropType === 'full_card_upper' ||
    cropType === 'full_card_middle' ||
    cropType === 'title_band' ||
    cropType === 'artwork_zoom_in_10' ||
    cropType === 'artwork_zoom_in_10_gray'
  );
}

function fixedSlotCandidateSupportBonus(candidate) {
  const supportCount = Number(candidate?.fixed_slot_query_support_count ?? 1);
  return Math.min(
    FIXED_SLOT_CANDIDATE_SUPPORT_BONUS_MAX,
    Math.max(0, supportCount - 1) * FIXED_SLOT_CANDIDATE_SUPPORT_BONUS,
  );
}

function fixedSlotConfirmationFailureReason({ top, second, separation }) {
  if (!top) return 'no_scored_visual_candidates';
  if (top.fixed_slot_visual_confirmation_score > FIXED_SLOT_VISUAL_CONFIRMATION_THRESHOLD) {
    return 'visual_confirmation_score_too_high';
  }
  if (
    second &&
    separation !== null &&
    separation < FIXED_SLOT_VISUAL_CONFIRMATION_MIN_SEPARATION
  ) {
    return 'visual_confirmation_margin_too_small';
  }
  return 'visual_confirmation_unconfirmed';
}

async function referenceFixedSlotVisualConfirmationFeatures(candidate, service) {
  const sourcePath = sourcePathForCandidate(candidate, service);
  if (!sourcePath) return null;
  const key = [
    sourcePath,
    'fixed_slot_visual_confirmation',
    FIXED_SLOT_VISUAL_CONFIRMATION_FEATURE_SIZE,
  ].join('|');
  if (!service.fixedSlotVisualConfirmationFeatureCache.has(key)) {
    service.fixedSlotVisualConfirmationFeatureCache.set(
      key,
      fixedSlotVisualConfirmationFeaturesFromImageBufferOrPath(sourcePath)
        .catch(() => null),
    );
  }
  return service.fixedSlotVisualConfirmationFeatureCache.get(key);
}

function sourcePathForCandidate(candidate, service) {
  const direct = textOrNull(candidate._source_path ?? candidate.source_path);
  if (direct) return direct;
  const rows = service.artifact.referenceRowsByCard.get(candidate.card_id) ?? [];
  const preferred =
    rows.find((row) => row.view_type === 'full_card' && textOrNull(row.source_path)) ??
    rows.find((row) => textOrNull(row.source_path));
  return textOrNull(preferred?.source_path);
}

async function fixedSlotVisualConfirmationFeaturesFromImageBufferOrPath(input) {
  const image = Buffer.isBuffer(input)
    ? sharp(input, { failOn: 'none' }).rotate()
    : sharp(input, { failOn: 'none' }).rotate();
  const normalized = await image
    .resize(224, 224, { fit: 'fill' })
    .png()
    .toBuffer();
  return fixedSlotVisualConfirmationFeaturesFromImageBuffer(normalized);
}

async function fixedSlotVisualConfirmationFeaturesFromImageBuffer(imageBuffer) {
  const features = {};
  for (const [key, rect] of Object.entries(FIXED_SLOT_VISUAL_CONFIRMATION_REGIONS)) {
    features[key] = await fixedSlotGrayRegionFeature(imageBuffer, rect);
  }
  return features;
}

async function fixedSlotGrayRegionFeature(imageBuffer, rect) {
  const metadata = await sharp(imageBuffer, { failOn: 'none' }).rotate().metadata();
  const extract = rectToPixels(rect, metadata.width, metadata.height);
  const { data } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .extract(extract)
    .resize(
      FIXED_SLOT_VISUAL_CONFIRMATION_FEATURE_SIZE,
      FIXED_SLOT_VISUAL_CONFIRMATION_FEATURE_SIZE,
      { fit: 'fill' },
    )
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const values = Array.from(data, (value) => value / 255);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  let norm = 0;
  for (let index = 0; index < values.length; index += 1) {
    values[index] -= mean;
    norm += values[index] * values[index];
  }
  norm = Math.sqrt(norm) || 1;
  return values.map((value) => value / norm);
}

function roundObjectValues(object) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, round6(value)]),
  );
}

function sameNameExpansionHints(resolvedCrops) {
  const hints = new Set();
  for (const crop of resolvedCrops) {
    const cropType = String(crop?.crop_type ?? '').toLowerCase();
    if (!crop?.ok || !cropType.includes('title')) continue;
    const candidates = Array.isArray(crop.candidates) ? crop.candidates.slice(0, 12) : [];
    for (const candidate of candidates) {
      const distance = Number(candidate.distance);
      if (!Number.isFinite(distance) || distance > 0.405) continue;
      const key = normalizedNameKey(candidate.name);
      if (key) hints.add(key);
    }
  }
  return hints;
}

function sameNameExpansionCandidates({
  artifact,
  nameHints,
  queryEmbedding,
  queryCropType,
}) {
  const rows = [];
  const viewTypes = viewTypesForCrop(queryCropType, artifact);
  for (const nameHint of nameHints) {
    const rowsByView = artifact.referenceRowsByNameAndView.get(nameHint);
    if (!rowsByView) continue;
    for (const viewType of viewTypes) {
      rows.push(...(rowsByView.get(viewType) ?? []));
    }
  }
  if (rows.length === 0) return [];

  const queryNorm = vectorNorm(queryEmbedding);
  const seen = new Set();
  return rows
    .map((row) => {
      const distance = round6(candidateDistance(queryEmbedding, queryNorm, row));
      return {
        ...publicCandidate(row, queryCropType),
        distance,
        ann_distance: distance,
        similarity: round6(Math.max(0, Math.min(1, 1 - distance))),
        aggregate_score: round6(Math.max(0, Math.min(1, 1 - distance))),
        rerank_score: round6(Math.max(0, Math.min(1, 1 - distance))),
        same_name_expansion: true,
        contributing_crop_types: [
          queryCropType,
          SAME_NAME_FAMILY_SUPPORT_CROP_TYPE,
        ].filter(Boolean),
        crop_contribution_count: 1,
        reference_view_contribution_count: row.view_type ? 1 : 0,
      };
    })
    .filter((candidate) => {
      const key = `${candidate.card_id}|${candidate.reference_view_type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.card_id).localeCompare(String(b.card_id));
    });
}

async function saveDebugCropImage({ imageBuffer, cropType, debugRequestId }) {
  const debugDir = textOrNull(process.env.SCANNER_V3_DEBUG_SAVE_CROPS_DIR);
  if (!debugDir) return;
  const safeCropType = String(cropType ?? 'unknown')
    .replace(/[^a-z0-9_.-]+/gi, '_')
    .slice(0, 80) || 'unknown';
  await mkdir(debugDir, { recursive: true });
  const fileName = `${String(debugRequestId).padStart(5, '0')}_${safeCropType}.png`;
  await writeFile(path.join(debugDir, fileName), imageBuffer);
}

function logDebugCropTopCandidates({ cropType, candidates }) {
  if (process.env.SCANNER_V3_DEBUG_LOG_TOP !== '1') return;
  const top = candidates.slice(0, 5).map((candidate) => ({
    rank: candidate.rank,
    name: candidate.name,
    gv_id: candidate.gv_id,
    card_id: candidate.card_id,
    distance: candidate.distance,
    view: candidate.reference_view_type,
    alignment: candidate.visual_card_alignment_distance,
    alignment_signal: candidate.visual_full_card_alignment_signal,
  }));
  console.log(JSON.stringify({
    event: 'scanner_v3_debug_crop_top',
    crop_type: cropType,
    top,
  }));
}

function searchAnn({ queryEmbedding, queryCropType, service, topK }) {
  const artifact = service.artifact;
  const planes = artifact.planes;
  const queryBucket = hashEmbedding(queryEmbedding, planes);
  const exactFullCardScan = usesExactFullCardScan(queryCropType);
  const viewTypes = exactFullCardScan
    ? FULL_CARD_EXACT_SCAN_VIEW_TYPES.filter((viewType) => artifact.shards.has(viewType))
    : viewTypesForCrop(queryCropType, artifact);
  const probeBuckets = probeBucketKeys(queryBucket, service.args.maxHamming);
  const candidateCollection = exactFullCardScan
    ? collectExactFullCardScanVectors({ artifact, viewTypes })
    : collectCandidateVectors({
        artifact,
        viewTypes,
        probeBuckets,
        maxCandidateVectors: service.args.maxCandidateVectors,
      });
  const candidateVectors = candidateCollection.candidateVectors;
  const queryNorm = vectorNorm(queryEmbedding);

  const ranked = candidateVectors
    .map((row) => {
      const distance = referencePriorAdjustedDistance(
        candidateDistance(queryEmbedding, queryNorm, row),
        row,
      );
      return {
        ...publicCandidate(row, queryCropType),
        distance: round6(distance),
        similarity: round6(1 - distance),
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (String(a.card_id) !== String(b.card_id)) return String(a.card_id).localeCompare(String(b.card_id));
      return String(a.reference_view_type).localeCompare(String(b.reference_view_type));
    });

  const candidates = applyFullCardFamilySupport({
    candidates: dedupeCandidatesByCard(ranked, queryCropType, topK),
    queryCropType,
    collectionKind: candidateCollection.kind,
  });
  return {
    candidates,
    stats: {
      query_bucket: queryBucket,
      max_hamming: service.args.maxHamming,
      searched_view_types: viewTypes,
      probe_bucket_count: candidateCollection.probedBucketCount,
      non_empty_probe_bucket_count: candidateCollection.nonEmptyProbeBucketCount,
      candidate_collection: candidateCollection.kind,
      bucket_rounds: candidateCollection.bucketRounds,
      candidate_vector_count: candidateVectors.length,
      exact_rerank_vector_count: ranked.length,
      candidate_card_count: candidates.length,
    },
  };
}

function usesExactFullCardScan(cropType) {
  return FULL_CARD_EXACT_SCAN_CROP_TYPES.has(String(cropType ?? '').toLowerCase());
}

function collectExactFullCardScanVectors({ artifact, viewTypes }) {
  const candidateVectors = [];
  for (const viewType of viewTypes) {
    const shard = artifact.shards.get(viewType);
    if (!shard) continue;
    for (let vectorIndex = 0; vectorIndex < shard.metadataRows.length; vectorIndex += 1) {
      const row = shard.metadataRows[vectorIndex];
      if (row) candidateVectors.push(row);
    }
  }
  return {
    kind: 'compact_full_card_exact_scan_v1',
    candidateVectors,
    probedBucketCount: 0,
    nonEmptyProbeBucketCount: viewTypes.length,
    bucketRounds: 0,
  };
}

function referencePriorAdjustedDistance(distance, row) {
  let adjusted = distance;
  if (
    row?.image_is_representative === true ||
    String(row?.image_status ?? '').toLowerCase().includes('representative')
  ) {
    adjusted += REPRESENTATIVE_REFERENCE_DISTANCE_PENALTY;
  }
  return adjusted;
}

function applyFullCardFamilySupport({ candidates, queryCropType, collectionKind }) {
  if (
    collectionKind !== 'compact_full_card_exact_scan_v1' ||
    !usesExactFullCardScan(queryCropType) ||
    candidates.length === 0
  ) {
    return candidates;
  }

  const topDistance = Number(candidates[0]?.distance);
  if (!Number.isFinite(topDistance)) return candidates;

  const groups = new Map();
  for (const candidate of candidates.slice(0, FULL_CARD_FAMILY_SUPPORT_TOP_N)) {
    const key = normalizedNameKey(candidate.name);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        count: 0,
        bestDistance: Number.POSITIVE_INFINITY,
      });
    }
    const group = groups.get(key);
    group.count += 1;
    if (Number(candidate.distance) < group.bestDistance) {
      group.bestDistance = Number(candidate.distance);
    }
  }

  const supportedFamilies = new Set();
  for (const [nameKey, group] of groups) {
    if (group.count < FULL_CARD_FAMILY_SUPPORT_MIN_COUNT) continue;
    if (group.bestDistance > topDistance + FULL_CARD_FAMILY_SUPPORT_MAX_BEST_GAP) continue;
    supportedFamilies.add(nameKey);
  }
  if (supportedFamilies.size === 0) return candidates;

  return rerankCandidates(candidates.map((candidate) => {
    const nameKey = normalizedNameKey(candidate.name);
    if (!nameKey || !supportedFamilies.has(nameKey)) return candidate;
    const contributingCropTypes = new Set([
      ...(Array.isArray(candidate.contributing_crop_types)
        ? candidate.contributing_crop_types
        : []),
      queryCropType,
      SAME_NAME_FAMILY_SUPPORT_CROP_TYPE,
    ].filter(Boolean));
    const distance = round6(Math.max(0, Number(candidate.distance) - FULL_CARD_FAMILY_SUPPORT_DISTANCE_BONUS));
    const similarity = round6(Math.max(0, Math.min(1, 1 - distance)));
    return {
      ...candidate,
      distance,
      similarity,
      aggregate_score: similarity,
      rerank_score: similarity,
      full_card_family_support: true,
      contributing_crop_types: [...contributingCropTypes],
      crop_contribution_count: Math.max(
        Number(candidate.crop_contribution_count ?? 1),
        1,
      ),
    };
  }));
}

async function applyFullCardIdentityBandSupport({ imageBuffer, cropType, candidates, service }) {
  if (!usesExactFullCardScan(cropType) || candidates.length === 0) return candidates;
  const supportedCandidates = candidates.filter((candidate) => (
    candidate.full_card_family_support === true &&
    Array.isArray(candidate.contributing_crop_types) &&
    candidate.contributing_crop_types.includes(SAME_NAME_FAMILY_SUPPORT_CROP_TYPE)
  ));
  if (supportedCandidates.length < 2) return candidates;

  const queryFeature = await visualIdentityBandFeatureFromImageBuffer(imageBuffer).catch(() => null);
  if (!queryFeature) return candidates;

  const bandDistances = new Map();
  const bandDistancesByName = new Map();
  await Promise.all(supportedCandidates.map(async (candidate) => {
    const referenceFeature = await referenceVisualIdentityBandFeature(candidate, service);
    if (!referenceFeature) return;
    const distance = cosineDistance(queryFeature, referenceFeature);
    if (!Number.isFinite(distance)) return;
    bandDistances.set(candidate.card_id, distance);
    const nameKey = normalizedNameKey(candidate.name);
    if (!nameKey) return;
    if (!bandDistancesByName.has(nameKey)) bandDistancesByName.set(nameKey, []);
    bandDistancesByName.get(nameKey).push({
      cardId: candidate.card_id,
      distance,
    });
  }));
  if (bandDistances.size === 0) return candidates;

  const identityBandSupportIds = new Set();
  const bestBandDistanceByName = new Map();
  for (const [nameKey, rows] of bandDistancesByName) {
    rows.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.cardId).localeCompare(String(b.cardId));
    });
    const best = rows[0];
    if (!best) continue;
    bestBandDistanceByName.set(nameKey, best.distance);
    const second = rows[1] ?? null;
    const separated =
      second == null ||
      (Number(second.distance) - Number(best.distance)) >= IDENTITY_BAND_SUPPORT_MIN_SEPARATION;
    if (
      Number(best.distance) <= IDENTITY_BAND_SUPPORT_MAX_ABSOLUTE_DISTANCE &&
      separated
    ) {
      identityBandSupportIds.add(best.cardId);
    }
  }

  return rerankCandidates(candidates.map((candidate) => {
    const bandDistance = bandDistances.get(candidate.card_id);
    if (bandDistance == null) return candidate;
    const nameKey = normalizedNameKey(candidate.name);
    const bestBandDistance = nameKey == null ? null : bestBandDistanceByName.get(nameKey);
    const relativeBandDistance = bestBandDistance == null
      ? 0
      : Math.max(0, bandDistance - bestBandDistance);
    const distance = round6(Math.max(
      0,
      Number(candidate.distance) + (relativeBandDistance * IDENTITY_BAND_DISTANCE_WEIGHT),
    ));
    const similarity = round6(Math.max(0, Math.min(1, 1 - distance)));
    const identityBandMatched = identityBandSupportIds.has(candidate.card_id);
    const contributingCropTypes = new Set([
      ...(Array.isArray(candidate.contributing_crop_types)
        ? candidate.contributing_crop_types
        : []),
      ...(identityBandMatched ? [VISUAL_IDENTITY_BAND_SUPPORT_CROP_TYPE] : []),
    ]);
    return {
      ...candidate,
      distance,
      similarity,
      aggregate_score: similarity,
      rerank_score: similarity,
      visual_identity_band_distance: round6(bandDistance),
      visual_identity_band_relative_distance: round6(relativeBandDistance),
      visual_identity_band_match: identityBandMatched,
      contributing_crop_types: [...contributingCropTypes],
    };
  }));
}

async function rerankCandidatesByVisualColor({ imageBuffer, cropType, candidates, service, topK }) {
  if (!service.args.visualRerankEnabled || candidates.length === 0) {
    return {
      candidates: candidates.slice(0, topK).map(publicResponseCandidate),
      stats: {
        enabled: false,
        reason: service.args.visualRerankEnabled ? 'no_candidates' : 'disabled',
      },
    };
  }

  const queryFeature = await visualColorFeatureFromImageBuffer(imageBuffer, {
    size: service.args.visualRerankSize,
    grid: service.args.visualRerankGrid,
  });
  const queryAlignmentFeature = await visualCardAlignmentFeatureFromImageBuffer(imageBuffer, {
    cropType,
    size: service.args.visualAlignmentSize,
  });
  const minimumHeadCount = Math.max(
    topK,
    DEFAULT_TOP_K,
    isFullCardAlignmentCrop(cropType) ? FULL_CARD_EXACT_VISUAL_MATCH_RERANK_TOP_N : 0,
  );
  const headCount = Math.min(
    service.args.visualRerankTopN,
    minimumHeadCount,
    candidates.length,
  );
  const head = candidates.slice(0, headCount);
  const tail = candidates.slice(headCount);
  const rerankedHead = await Promise.all(head.map(async (candidate) => {
    const referenceFeature = await referenceVisualColorFeature(candidate, service);
    const referenceAlignmentFeature = queryAlignmentFeature
      ? await referenceVisualCardAlignmentFeature(candidate, service)
      : null;
    if (!referenceFeature && !referenceAlignmentFeature) return candidate;
    const visualColorDistance = referenceFeature
      ? cosineDistance(queryFeature, referenceFeature)
      : null;
    const visualAlignmentDistance = referenceAlignmentFeature
      ? visualCardAlignmentDistance(queryAlignmentFeature, referenceAlignmentFeature)
      : null;
    if (visualAlignmentDistance !== null) {
      const annDistance = Number(candidate.ann_distance ?? candidate.distance);
      const visualColorForScore = visualColorDistance ?? visualAlignmentDistance;
      const annForScore = Number.isFinite(annDistance)
        ? annDistance
        : Number(candidate.distance);
      const adjustedDistance = round6(Math.max(0, Math.min(
        2,
        (annForScore * 0.82) +
          (visualAlignmentDistance * 0.13) +
          (visualColorForScore * 0.05),
      )));
      const adjustedSimilarity = round6(Math.max(0, Math.min(1, 1 - adjustedDistance)));
      return {
        ...candidate,
        ann_distance: candidate.distance,
        distance: adjustedDistance,
        similarity: adjustedSimilarity,
        rerank_score: adjustedSimilarity,
        aggregate_score: adjustedSimilarity,
        visual_color_distance: visualColorDistance === null ? null : round6(visualColorDistance),
        visual_color_distance_contribution: visualColorDistance === null
          ? null
          : round6(visualColorDistance),
        visual_color_penalty: 0,
        visual_card_alignment_distance: round6(visualAlignmentDistance),
        visual_structure_distance: null,
        visual_structure_distance_contribution: null,
      };
    }
    const visualColorOnlyDistance = visualColorDistance ?? candidate.distance;
    const penalty = Math.max(
      0,
      visualColorOnlyDistance - service.args.visualRerankColorThreshold,
    ) * service.args.visualRerankPenaltyWeight;
    const visualDistanceContribution =
      visualColorOnlyDistance * service.args.visualRerankDistanceWeight;
    const adjustedDistance = round6(
      candidate.distance + visualDistanceContribution + penalty,
    );
    const adjustedSimilarity = round6(Math.max(0, Math.min(1, 1 - adjustedDistance)));
    return {
      ...candidate,
      ann_distance: candidate.distance,
      distance: adjustedDistance,
      similarity: adjustedSimilarity,
      rerank_score: adjustedSimilarity,
      aggregate_score: adjustedSimilarity,
      visual_color_distance: round6(visualColorOnlyDistance),
      visual_color_distance_contribution: round6(visualDistanceContribution),
      visual_color_penalty: round6(penalty),
      visual_card_alignment_distance: null,
      visual_structure_distance: null,
      visual_structure_distance_contribution: null,
    };
  }));

  rerankedHead.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (String(a.card_id) !== String(b.card_id)) return String(a.card_id).localeCompare(String(b.card_id));
    return String(a.reference_view_type).localeCompare(String(b.reference_view_type));
  });
  const signaledHead = addStrongAlignmentSignal({
    candidates: rerankedHead,
    cropType,
  });

  return {
    candidates: [...signaledHead, ...tail]
      .slice(0, topK)
      .map((candidate, index) => publicResponseCandidate({
        ...candidate,
        rank: index + 1,
      })),
    stats: {
      enabled: true,
      top_n: headCount,
      pool_k: candidates.length,
      returned_top_k: topK,
      size: service.args.visualRerankSize,
      grid: service.args.visualRerankGrid,
      color_threshold: service.args.visualRerankColorThreshold,
      penalty_weight: service.args.visualRerankPenaltyWeight,
      distance_weight: service.args.visualRerankDistanceWeight,
      structure_enabled: false,
      structure_size: service.args.visualStructureSize,
      alignment_enabled: queryAlignmentFeature !== null,
      alignment_size: service.args.visualAlignmentSize,
      ann_weight: service.args.visualRerankAnnWeight,
      color_weight: service.args.visualRerankColorWeight,
      structure_weight: service.args.visualRerankStructureWeight,
      cache_entries: service.visualFeatureCache.size,
      structure_cache_entries: service.visualStructureFeatureCache.size,
      alignment_cache_entries: service.visualAlignmentFeatureCache.size,
      identity_band_cache_entries: service.visualIdentityBandFeatureCache.size,
    },
  };
}

function addStrongAlignmentSignal({ candidates, cropType }) {
  if (!isFullCardAlignmentCrop(cropType) || candidates.length === 0) return candidates;
  const alignmentRanked = candidates
    .map((candidate, index) => ({
      candidate,
      index,
      distance: Number(candidate.visual_card_alignment_distance),
    }))
    .filter((row) => Number.isFinite(row.distance))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.index - b.index;
    });
  const bestAlignment = alignmentRanked[0] ?? null;
  if (
    bestAlignment == null ||
    bestAlignment.distance > FULL_CARD_EXACT_VISUAL_MATCH_MAX_ALIGNMENT_DISTANCE
  ) {
    return candidates;
  }
  const secondAlignmentDistance = alignmentRanked[1]?.distance ?? null;
  if (
    Number.isFinite(secondAlignmentDistance) &&
    secondAlignmentDistance - bestAlignment.distance < FULL_CARD_EXACT_VISUAL_MATCH_MIN_SEPARATION
  ) {
    return candidates;
  }
  const promotedCardId = bestAlignment.candidate.card_id;
  const promoted = {
    ...bestAlignment.candidate,
    contributing_crop_types: [
      ...new Set([
        ...(Array.isArray(bestAlignment.candidate.contributing_crop_types)
          ? bestAlignment.candidate.contributing_crop_types
          : []),
        'full_card',
        'priority_full_card_top',
        'priority_identity_support',
        'visual_full_card_alignment',
        VISUAL_IDENTITY_BAND_SUPPORT_CROP_TYPE,
        FULL_CARD_EXACT_VISUAL_MATCH_CROP_TYPE,
      ]),
    ],
    crop_contribution_count: Math.max(
      4,
      Number(bestAlignment.candidate.crop_contribution_count ?? 1),
    ),
    visual_full_card_alignment_signal: true,
    full_card_exact_visual_match: true,
    visual_card_alignment_second_distance: secondAlignmentDistance == null
      ? null
      : round6(secondAlignmentDistance),
    visual_card_alignment_separation: secondAlignmentDistance == null
      ? null
      : round6(secondAlignmentDistance - bestAlignment.distance),
  };
  return [
    promoted,
    ...candidates.filter((candidate) => candidate.card_id !== promotedCardId),
  ];
}

async function referenceVisualColorFeature(candidate, service) {
  const sourcePath = textOrNull(candidate._source_path);
  if (!sourcePath) return null;
  const viewType = textOrNull(candidate.best_reference_view_type ?? candidate.reference_view_type) ?? 'full_card';
  const key = `${sourcePath}|${viewType}|${service.args.visualRerankSize}|${service.args.visualRerankGrid}`;
  if (!service.visualFeatureCache.has(key)) {
    service.visualFeatureCache.set(key, visualColorFeatureFromImagePath(sourcePath, {
      rect: referenceRectForView(viewType),
      size: service.args.visualRerankSize,
      grid: service.args.visualRerankGrid,
    }).catch(() => null));
  }
  return service.visualFeatureCache.get(key);
}

async function referenceVisualCardAlignmentFeature(candidate, service) {
  const sourcePath = textOrNull(candidate._source_path);
  if (!sourcePath) return null;
  const key = `${sourcePath}|card_alignment|${service.args.visualAlignmentSize}`;
  if (!service.visualAlignmentFeatureCache.has(key)) {
    service.visualAlignmentFeatureCache.set(key, visualCardAlignmentFeatureFromImagePath(sourcePath, {
      size: service.args.visualAlignmentSize,
    }).catch(() => null));
  }
  return service.visualAlignmentFeatureCache.get(key);
}

async function referenceVisualIdentityBandFeature(candidate, service) {
  const sourcePath = textOrNull(candidate._source_path);
  if (!sourcePath) return null;
  const key = `${sourcePath}|identity_band|${IDENTITY_BAND_FEATURE_WIDTH}x${IDENTITY_BAND_FEATURE_HEIGHT}`;
  if (!service.visualIdentityBandFeatureCache.has(key)) {
    service.visualIdentityBandFeatureCache.set(key, visualIdentityBandFeatureFromImagePath(sourcePath)
      .catch(() => null));
  }
  return service.visualIdentityBandFeatureCache.get(key);
}

async function referenceVisualStructureFeature(candidate, service, cropType) {
  const sourcePath = textOrNull(candidate._source_path);
  if (!sourcePath) return null;
  const rect = structureReferenceRectForCrop(cropType);
  if (!rect) return null;
  const key = `${sourcePath}|${cropType}|structure|${service.args.visualStructureSize}`;
  if (!service.visualStructureFeatureCache.has(key)) {
    service.visualStructureFeatureCache.set(key, visualStructureFeatureFromImagePath(sourcePath, {
      rect,
      size: service.args.visualStructureSize,
    }).catch(() => null));
  }
  return service.visualStructureFeatureCache.get(key);
}

async function visualColorFeatureFromImagePath(imagePath, { rect, size, grid }) {
  const image = sharp(imagePath, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 4 || height < 4) {
    throw new Error('visual_rerank_invalid_reference_dimensions');
  }
  return visualColorFeatureFromSharp(
    sharp(imagePath, { failOn: 'none' }).rotate().extract(rectToPixels(rect, width, height)),
    { size, grid },
  );
}

async function visualColorFeatureFromImageBuffer(imageBuffer, { size, grid }) {
  return visualColorFeatureFromSharp(sharp(imageBuffer, { failOn: 'none' }).rotate(), {
    size,
    grid,
  });
}

async function visualCardAlignmentFeatureFromImagePath(imagePath, { size }) {
  return visualCardAlignmentFeatureFromSharp(sharp(imagePath, { failOn: 'none' }).rotate(), {
    size,
  });
}

async function visualCardAlignmentFeatureFromImageBuffer(imageBuffer, { cropType, size }) {
  if (!isFullCardAlignmentCrop(cropType)) return null;
  const image = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64) {
    return null;
  }
  const raw = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer();
  const rect = detectForegroundCardRectFromRawRgb(raw, width, height);
  if (!rect) return null;
  return visualCardAlignmentFeatureFromSharp(
    sharp(imageBuffer, { failOn: 'none' }).rotate().extract(rect),
    { size },
  );
}

async function visualIdentityBandFeatureFromImagePath(imagePath) {
  const image = sharp(imagePath, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  return visualIdentityBandFeatureFromSharp(
    sharp(imagePath, { failOn: 'none' }).rotate().extract(identityBandRectToPixels(width, height)),
  );
}

async function visualIdentityBandFeatureFromImageBuffer(imageBuffer) {
  const image = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  return visualIdentityBandFeatureFromSharp(
    sharp(imageBuffer, { failOn: 'none' }).rotate().extract(identityBandRectToPixels(width, height)),
  );
}

async function visualStructureFeatureFromImagePath(imagePath, { rect, size }) {
  const image = sharp(imagePath, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 4 || height < 4) {
    throw new Error('visual_structure_invalid_reference_dimensions');
  }
  return visualStructureFeatureFromSharp(
    sharp(imagePath, { failOn: 'none' }).rotate().extract(rectToPixels(rect, width, height)),
    { size },
  );
}

async function visualStructureFeatureFromImageBuffer(imageBuffer, { cropType, size }) {
  const rect = structureQueryRectForCrop(cropType);
  if (!rect) return null;
  const image = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 4 || height < 4) {
    return null;
  }
  return visualStructureFeatureFromSharp(
    sharp(imageBuffer, { failOn: 'none' }).rotate().extract(rectToPixels(rect, width, height)),
    { size },
  );
}

async function visualColorFeatureFromSharp(image, { size, grid }) {
  const { data, info } = await image
    .resize(size, size, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return visualColorFeatureFromRawRgb(data, info.width, info.height, grid);
}

async function visualNormalizedRgbFeatureFromSharp(image, { size }) {
  const { data, info } = await image
    .resize(size, size, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return visualNormalizedRgbFeatureFromRawRgb(data, info.width, info.height);
}

async function visualCardAlignmentFeatureFromSharp(image, { size }) {
  const cardBuffer = await image
    .resize(224, 224, { fit: 'fill' })
    .png()
    .toBuffer();
  const fullRaw = await sharp(cardBuffer, { failOn: 'none' })
    .resize(size, size, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const artRect = rectToPixels(
    { left: 0.06, top: 0.12, right: 0.94, bottom: 0.50 },
    224,
    224,
  );
  const artRaw = await sharp(cardBuffer, { failOn: 'none' })
    .extract(artRect)
    .resize(size, size, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    rgbFull: visualNormalizedRgbFeatureFromRawRgb(fullRaw.data, fullRaw.info.width, fullRaw.info.height),
    grayFull: visualCenteredGrayFeatureFromRawRgb(fullRaw.data, fullRaw.info.width, fullRaw.info.height),
    edgeFull: visualEdgeFeatureFromRawRgb(fullRaw.data, fullRaw.info.width, fullRaw.info.height),
    rgbArt: visualNormalizedRgbFeatureFromRawRgb(artRaw.data, artRaw.info.width, artRaw.info.height),
    edgeArt: visualEdgeFeatureFromRawRgb(artRaw.data, artRaw.info.width, artRaw.info.height),
  };
}

async function visualIdentityBandFeatureFromSharp(image) {
  const { data, info } = await image
    .resize(IDENTITY_BAND_FEATURE_WIDTH, IDENTITY_BAND_FEATURE_HEIGHT, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return visualCenteredGrayFeatureFromRawRgb(data, info.width, info.height);
}

async function visualStructureFeatureFromSharp(image, { size }) {
  const { data, info } = await image
    .resize(size, size, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return visualStructureFeatureFromRawGray(data, info.width, info.height);
}

function visualColorFeatureFromRawRgb(data, width, height, grid) {
  const cells = Math.max(1, Math.min(grid, width, height));
  const features = [];
  for (let gridY = 0; gridY < cells; gridY += 1) {
    for (let gridX = 0; gridX < cells; gridX += 1) {
      let redRatio = 0;
      let greenRatio = 0;
      let blueRatio = 0;
      let luma = 0;
      let count = 0;
      const yStart = Math.floor((gridY * height) / cells);
      const yEnd = Math.floor(((gridY + 1) * height) / cells);
      const xStart = Math.floor((gridX * width) / cells);
      const xEnd = Math.floor(((gridX + 1) * width) / cells);
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          const index = ((y * width) + x) * 3;
          const red = Number(data[index]) / 255;
          const green = Number(data[index + 1]) / 255;
          const blue = Number(data[index + 2]) / 255;
          const average = ((red + green + blue) / 3) + 0.001;
          redRatio += red / average;
          greenRatio += green / average;
          blueRatio += blue / average;
          luma += average;
          count += 1;
        }
      }
      const safeCount = Math.max(1, count);
      features.push(
        redRatio / safeCount,
        greenRatio / safeCount,
        blueRatio / safeCount,
        luma / safeCount,
      );
    }
  }
  return features;
}

function visualNormalizedRgbFeatureFromRawRgb(data, width, height) {
  const features = [];
  const expectedLength = width * height * 3;
  const length = Math.min(expectedLength, data.length - (data.length % 3));
  for (let index = 0; index < length; index += 3) {
    const red = Number(data[index]) / 255;
    const green = Number(data[index + 1]) / 255;
    const blue = Number(data[index + 2]) / 255;
    const average = ((red + green + blue) / 3) + 0.001;
    features.push(red / average, green / average, blue / average);
  }
  let norm = 0;
  for (const value of features) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm <= 0) return features;
  return features.map((value) => value / norm);
}

function visualCenteredGrayFeatureFromRawRgb(data, width, height) {
  const values = [];
  const expectedLength = width * height * 3;
  const length = Math.min(expectedLength, data.length - (data.length % 3));
  for (let index = 0; index < length; index += 3) {
    values.push(
      ((Number(data[index]) * 0.299) +
        (Number(data[index + 1]) * 0.587) +
        (Number(data[index + 2]) * 0.114)) / 255,
    );
  }
  const mean = values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  return normalizeFeature(values.map((value) => value - mean));
}

function visualEdgeFeatureFromRawRgb(data, width, height) {
  const gray = [];
  const expectedLength = width * height * 3;
  const length = Math.min(expectedLength, data.length - (data.length % 3));
  for (let index = 0; index < length; index += 3) {
    gray.push(
      ((Number(data[index]) * 0.299) +
        (Number(data[index + 1]) * 0.587) +
        (Number(data[index + 2]) * 0.114)) / 255,
    );
  }
  const features = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const dx = gray[(y * width) + x + 1] - gray[(y * width) + x - 1];
      const dy = gray[((y + 1) * width) + x] - gray[((y - 1) * width) + x];
      features.push(Math.sqrt((dx * dx) + (dy * dy)));
    }
  }
  return normalizeFeature(features);
}

function visualCardAlignmentDistance(queryFeature, referenceFeature) {
  return (
    (cosineDistance(queryFeature.rgbFull, referenceFeature.rgbFull) * 0.30) +
    (cosineDistance(queryFeature.grayFull, referenceFeature.grayFull) * 0.30) +
    (cosineDistance(queryFeature.edgeFull, referenceFeature.edgeFull) * 0.20) +
    (cosineDistance(queryFeature.rgbArt, referenceFeature.rgbArt) * 0.10) +
    (cosineDistance(queryFeature.edgeArt, referenceFeature.edgeArt) * 0.10)
  );
}

function normalizeFeature(features) {
  let norm = 0;
  for (const value of features) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm <= 0) return features;
  return features.map((value) => value / norm);
}

function visualStructureFeatureFromRawGray(data, width, height) {
  const cells = 4;
  const bins = 8;
  const rowBands = 8;
  const colBands = 8;
  const features = new Array((cells * cells * bins) + rowBands + colBands).fill(0);
  const rowOffset = cells * cells * bins;
  const colOffset = rowOffset + rowBands;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const left = Number(data[(y * width) + x - 1]);
      const right = Number(data[(y * width) + x + 1]);
      const up = Number(data[((y - 1) * width) + x]);
      const down = Number(data[((y + 1) * width) + x]);
      const dx = right - left;
      const dy = down - up;
      const magnitude = Math.sqrt((dx * dx) + (dy * dy)) / 255;
      if (magnitude <= 0) continue;
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI;
      if (angle >= Math.PI) angle -= Math.PI;
      const bin = Math.min(bins - 1, Math.floor((angle / Math.PI) * bins));
      const cellX = Math.min(cells - 1, Math.floor((x / width) * cells));
      const cellY = Math.min(cells - 1, Math.floor((y / height) * cells));
      const cellIndex = ((cellY * cells) + cellX) * bins;
      features[cellIndex + bin] += magnitude;

      const rowBand = Math.min(rowBands - 1, Math.floor((y / height) * rowBands));
      const colBand = Math.min(colBands - 1, Math.floor((x / width) * colBands));
      features[rowOffset + rowBand] += magnitude;
      features[colOffset + colBand] += magnitude;
    }
  }

  let norm = 0;
  for (const value of features) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm <= 0) return features;
  return features.map((value) => value / norm);
}

function detectForegroundCardRectFromRawRgb(data, width, height) {
  if (data.length < width * height * 3) return null;
  const sampleSize = Math.max(4, Math.min(16, Math.floor(Math.min(width, height) / 8)));
  const corners = [
    [0, 0],
    [width - sampleSize, 0],
    [0, height - sampleSize],
    [width - sampleSize, height - sampleSize],
  ];
  const background = [0, 0, 0];
  let sampleCount = 0;
  for (const [left, top] of corners) {
    for (let y = top; y < top + sampleSize; y += 1) {
      for (let x = left; x < left + sampleSize; x += 1) {
        const index = ((y * width) + x) * 3;
        background[0] += Number(data[index]);
        background[1] += Number(data[index + 1]);
        background[2] += Number(data[index + 2]);
        sampleCount += 1;
      }
    }
  }
  const safeSampleCount = Math.max(1, sampleCount);
  background[0] /= safeSampleCount;
  background[1] /= safeSampleCount;
  background[2] /= safeSampleCount;

  const threshold = 100;
  const rows = new Array(height).fill(0);
  const columns = new Array(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = ((y * width) + x) * 3;
      const distance = Math.hypot(
        Number(data[index]) - background[0],
        Number(data[index + 1]) - background[1],
        Number(data[index + 2]) - background[2],
      );
      if (distance <= threshold) continue;
      rows[y] += 1;
      columns[x] += 1;
    }
  }

  const rowBounds = projectionBounds(rows, width * 0.4);
  const columnBounds = projectionBounds(columns, height * 0.4);
  if (!rowBounds || !columnBounds) return null;
  const top = Math.max(0, rowBounds.start - 2);
  const bottom = Math.min(height - 1, rowBounds.end + 2);
  const left = Math.max(0, columnBounds.start - 2);
  const right = Math.min(width - 1, columnBounds.end + 2);
  const rectWidth = right - left + 1;
  const rectHeight = bottom - top + 1;
  if (rectWidth < width * 0.45 || rectHeight < height * 0.45) return null;
  return {
    left,
    top,
    width: rectWidth,
    height: rectHeight,
  };
}

function projectionBounds(values, minimumCount) {
  let start = 0;
  let end = values.length - 1;
  while (start < values.length && values[start] < minimumCount) start += 1;
  while (end >= 0 && values[end] < minimumCount) end -= 1;
  if (start >= values.length || end < start) return null;
  return { start, end };
}

function referenceRectForView(viewType) {
  if (viewType === 'full_card_upper') {
    return { left: 0.06, top: 0.08, right: 0.94, bottom: 0.58 };
  }
  if (viewType === 'full_card_middle') {
    return { left: 0.06, top: 0.18, right: 0.94, bottom: 0.72 };
  }
  if (viewType === 'title_band') {
    return { left: 0.02, top: 0.00, right: 0.98, bottom: 0.16 };
  }
  if (viewType === 'artwork' || viewType === 'artwork_zoom_in_10' || viewType === 'center_tight') {
    return { left: 0.075, top: 0.155, right: 0.925, bottom: 0.495 };
  }
  return { left: 0.00, top: 0.00, right: 1.00, bottom: 1.00 };
}

function isFullCardAlignmentCrop(cropType) {
  return String(cropType ?? '').toLowerCase() === 'full_card';
}

function structureQueryRectForCrop(cropType) {
  const text = String(cropType ?? '').toLowerCase();
  if (
    text === 'full_card' ||
    text === 'full_card_core' ||
    text === 'full_card_core_identity' ||
    text === 'full_card_core_tight' ||
    text === 'full_card_inner_core' ||
    text === 'full_card_identity_anchor'
  ) {
    return { left: 0.04, top: 0.56, right: 0.96, bottom: 0.98 };
  }
  return null;
}

function structureReferenceRectForCrop(cropType) {
  const text = String(cropType ?? '').toLowerCase();
  if (text === 'full_card') {
    return { left: 0.04, top: 0.56, right: 0.96, bottom: 0.98 };
  }
  if (text === 'full_card_core' || text === 'full_card_core_identity') {
    return { left: 0.06, top: 0.52, right: 0.94, bottom: 0.88 };
  }
  if (text === 'full_card_core_tight') {
    return { left: 0.05, top: 0.50, right: 0.95, bottom: 0.84 };
  }
  if (text === 'full_card_inner_core') {
    return { left: 0.06, top: 0.48, right: 0.94, bottom: 0.80 };
  }
  if (text === 'full_card_identity_anchor') {
    return { left: 0.05, top: 0.38, right: 0.95, bottom: 0.72 };
  }
  return null;
}

function rectToPixels(rect, width, height) {
  const leftNorm = clamp01(rect.left);
  const topNorm = clamp01(rect.top);
  const rightNorm = clamp01(rect.right);
  const bottomNorm = clamp01(rect.bottom);
  const left = Math.max(0, Math.min(width - 1, Math.round(leftNorm * width)));
  const top = Math.max(0, Math.min(height - 1, Math.round(topNorm * height)));
  const right = Math.max(left + 1, Math.min(width, Math.round(rightNorm * width)));
  const bottom = Math.max(top + 1, Math.min(height, Math.round(bottomNorm * height)));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function identityBandRectToPixels(width, height) {
  return rectToPixels(
    { left: 0.03, top: 0.82, right: 0.46, bottom: 0.98 },
    width,
    height,
  );
}

function clamp01(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}

function candidateDistance(queryEmbedding, queryNorm, row) {
  if (row?._compactShard && Number.isInteger(row?._compactVectorIndex)) {
    return compactCosineDistance({
      queryEmbedding,
      queryNorm,
      shard: row._compactShard,
      vectorIndex: row._compactVectorIndex,
    });
  }
  if (Array.isArray(row?.embedding)) {
    return arrayCosineDistance(queryEmbedding, queryNorm, row.embedding);
  }
  return cosineDistance(queryEmbedding, row?.embedding);
}

function compactCosineDistance({ queryEmbedding, queryNorm, shard, vectorIndex }) {
  const dimensions = shard.dimensions ?? EMBEDDING_INDEX_V1.dimensions;
  const vectorOffset = vectorIndex * dimensions;
  const byteOffset = vectorOffset * 4;
  const vectorValues = shard.vectorFloat32;
  let dot = 0;
  const rowNorm = shard.vectorNorms?.[vectorIndex];
  const length = Math.min(queryEmbedding.length, dimensions);
  for (let i = 0; i < length; i += 1) {
    const rowValue = vectorValues
      ? vectorValues[vectorOffset + i]
      : shard.vectorBuffer.readFloatLE(byteOffset + (i * 4));
    dot += Number(queryEmbedding[i]) * rowValue;
  }
  if (length === 0 || queryNorm <= 0 || !Number.isFinite(rowNorm) || rowNorm <= 0) return 1;
  return Math.max(0, Math.min(2, 1 - (dot / (queryNorm * rowNorm))));
}

function arrayCosineDistance(queryEmbedding, queryNorm, rowEmbedding) {
  let dot = 0;
  let rowSquares = 0;
  const length = Math.min(queryEmbedding.length, rowEmbedding.length);
  for (let i = 0; i < length; i += 1) {
    const rowValue = Number(rowEmbedding[i]);
    if (!Number.isFinite(rowValue)) continue;
    dot += Number(queryEmbedding[i]) * rowValue;
    rowSquares += rowValue * rowValue;
  }
  if (length === 0 || queryNorm <= 0 || rowSquares <= 0) return 1;
  return Math.max(0, Math.min(2, 1 - (dot / (queryNorm * Math.sqrt(rowSquares)))));
}

function vectorNorm(vector) {
  let sumSquares = 0;
  for (const value of vector) {
    const number = Number(value);
    if (Number.isFinite(number)) sumSquares += number * number;
  }
  return sumSquares > 0 ? Math.sqrt(sumSquares) : 0;
}

function collectCandidateVectors({ artifact, viewTypes, probeBuckets, maxCandidateVectors }) {
  const bucketStates = [];
  let probedBucketCount = 0;
  for (const viewType of viewTypes) {
    const shard = artifact.shards.get(viewType);
    if (!shard) continue;
    for (const bucket of probeBuckets) {
      probedBucketCount += 1;
      const rows = shard.buckets.get(bucket) ?? [];
      if (rows.length === 0) continue;
      bucketStates.push({
        shard,
        rows,
        index: 0,
      });
    }
  }

  const candidateVectors = [];
  const seenVectorIds = new Set();
  let bucketRounds = 0;
  let madeProgress = true;
  while (candidateVectors.length < maxCandidateVectors && madeProgress) {
    madeProgress = false;
    bucketRounds += 1;
    for (const state of bucketStates) {
      if (candidateVectors.length >= maxCandidateVectors) break;
      while (state.index < state.rows.length) {
        const row = candidateRowFromBucketEntry(state.shard, state.rows[state.index]);
        state.index += 1;
        madeProgress = true;
        if (!row || seenVectorIds.has(row.vector_id)) continue;
        seenVectorIds.add(row.vector_id);
        candidateVectors.push(row);
        break;
      }
    }
  }

  return {
    kind: 'bucket_round_robin_v1',
    candidateVectors,
    probedBucketCount,
    nonEmptyProbeBucketCount: bucketStates.length,
    bucketRounds,
  };
}

function publicCandidate(row, queryCropType) {
  return {
    card_id: row.card_id,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    set_code: row.set_code ?? null,
    number: row.number ?? null,
    number_plain: row.number_plain ?? null,
    variant_key: row.variant_key ?? null,
    image_url: row.image_url ?? null,
    image_url_field: row.image_url_field ?? null,
    image_source: row.image_source ?? null,
    image_status: row.image_status ?? null,
    image_kind: row.image_kind ?? null,
    image_is_representative: row.image_is_representative ?? null,
    print_identity_key: row.print_identity_key ?? null,
    reference_view_type: row.view_type ?? null,
    query_crop_type: queryCropType,
    _source_path: row.source_path ?? null,
  };
}

function publicResponseCandidate(candidate) {
  const { _source_path: _unusedSourcePath, ...publicCandidate } = candidate;
  return publicCandidate;
}

function dedupeCandidatesByCard(rawCandidates, queryCropType, topK) {
  const byCard = new Map();
  for (const candidate of rawCandidates) {
    const contributingCropTypes = [
      ...(Array.isArray(candidate.contributing_crop_types) ? candidate.contributing_crop_types : []),
      ...(queryCropType ? [queryCropType] : []),
    ].filter(Boolean);
    const existing = byCard.get(candidate.card_id);
    if (!existing) {
      byCard.set(candidate.card_id, {
        ...candidate,
        best_reference_view_type: candidate.reference_view_type ?? null,
        best_query_crop_type: candidate.query_crop_type ?? queryCropType,
        raw_rank: rawCandidates.indexOf(candidate) + 1,
        view_type: candidate.reference_view_type ?? null,
        crop_type: candidate.query_crop_type ?? queryCropType,
        contributing_crop_types: [...new Set(contributingCropTypes)],
        crop_contribution_count: 1,
        reference_view_contribution_count: candidate.reference_view_type ? 1 : 0,
        aggregate_score: candidate.aggregate_score ?? candidate.similarity,
        rerank_score: candidate.rerank_score,
        _referenceViews: new Set(candidate.reference_view_type ? [candidate.reference_view_type] : []),
      });
      continue;
    }
    if (candidate.reference_view_type) existing._referenceViews.add(candidate.reference_view_type);
    existing.contributing_crop_types = [...new Set([
      ...(existing.contributing_crop_types ?? []),
      ...contributingCropTypes,
    ])];
    existing.reference_view_contribution_count = existing._referenceViews.size;
    if (candidate.distance < existing.distance) {
      existing.distance = candidate.distance;
      existing.similarity = candidate.similarity;
      existing.aggregate_score = candidate.aggregate_score ?? candidate.similarity;
      existing.rerank_score = candidate.rerank_score ?? existing.rerank_score;
      existing.reference_view_type = candidate.reference_view_type;
      existing.best_reference_view_type = candidate.reference_view_type ?? null;
      existing.view_type = candidate.reference_view_type ?? null;
      existing.crop_type = candidate.query_crop_type ?? queryCropType;
    }
  }

  return [...byCard.values()]
    .map((candidate) => {
      const { _referenceViews, ...publicRow } = candidate;
      return publicRow;
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topK)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      crop_contribution_count: Math.max(
        Number(candidate.crop_contribution_count ?? 1),
        Array.isArray(candidate.contributing_crop_types) ? candidate.contributing_crop_types.length : 1,
      ),
    }));
}

function rerankCandidates(candidates) {
  return [...candidates]
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (String(a.card_id) !== String(b.card_id)) return String(a.card_id).localeCompare(String(b.card_id));
      return String(a.reference_view_type).localeCompare(String(b.reference_view_type));
    })
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

async function loadAnnArtifact(artifactDir) {
  const manifest = JSON.parse(await readFile(path.join(artifactDir, 'manifest.json'), 'utf8'));
  const planes = generatePlanes(manifest.lsh);
  const referenceMetadataByCard = await loadReferenceMetadataByCard(artifactDir);
  const shards = new Map();
  const cardIds = new Set();
  const referenceRowsByNameAndView = new Map();
  const referenceRowsByCard = new Map();
  let referenceViewCount = 0;
  let palSv02Count = 0;
  const palCards = new Set();
  const dimensions = positiveInt(
    manifest.storage?.vector_dimensions ?? manifest.embedding?.dimensions,
    EMBEDDING_INDEX_V1.dimensions,
  );

  for (const shardInfo of manifest.index.shards ?? []) {
    const shard = await loadAnnShard({ artifactDir, shardInfo, dimensions });
    for (let rowIndex = 0; rowIndex < shard.metadataRows.length; rowIndex += 1) {
      const row = shard.metadataRows[rowIndex];
      if (shard.storageFormat === 'compact_f32_shards_v1') {
        row._compactShard = shard;
        row._compactVectorIndex = rowIndex;
      }
      const referenceMetadata = referenceMetadataByCard.get(row.card_id);
      if (referenceMetadata?.source_path && !row.source_path) {
        row.source_path = referenceMetadata.source_path;
      }
      addReferenceRowToNameIndex(referenceRowsByNameAndView, row);
      if (!referenceRowsByCard.has(row.card_id)) referenceRowsByCard.set(row.card_id, []);
      referenceRowsByCard.get(row.card_id).push(row);
      referenceViewCount += 1;
      cardIds.add(row.card_id);
      if (isPalSv02(row) && !palCards.has(row.card_id)) {
        palCards.add(row.card_id);
        palSv02Count += 1;
      }
    }
    shards.set(shardInfo.view_type, shard);
  }

  return {
    artifactDir,
    manifest,
    planes,
    shards,
    referenceRowsByNameAndView,
    referenceRowsByCard,
    referenceCount: cardIds.size,
    referenceViewCount,
    palSv02Count,
  };
}

function addReferenceRowToNameIndex(index, row) {
  const nameKey = normalizedNameKey(row?.name);
  const viewType = textOrNull(row?.view_type);
  if (!nameKey || !viewType) return;
  if (!index.has(nameKey)) index.set(nameKey, new Map());
  const rowsByView = index.get(nameKey);
  if (!rowsByView.has(viewType)) rowsByView.set(viewType, []);
  rowsByView.get(viewType).push(row);
}

function normalizedNameKey(name) {
  const normalized = textOrNull(name)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return normalized || null;
}

async function loadReferenceMetadataByCard(artifactDir) {
  try {
    const rows = await readJsonlRows(path.join(artifactDir, 'metadata.jsonl'));
    const byCard = new Map();
    for (const row of rows) {
      if (row?.card_id) byCard.set(row.card_id, row);
    }
    return byCard;
  } catch {
    return new Map();
  }
}

async function loadAnnShard({ artifactDir, shardInfo, dimensions }) {
  if (shardInfo.vector_file && shardInfo.metadata_file && shardInfo.bucket_file) {
    return loadCompactShard({ artifactDir, shardInfo, dimensions });
  }
  if (shardInfo.file) return loadJsonlShard({ artifactDir, shardInfo });
  throw new Error(`unsupported_ann_shard_manifest:${shardInfo.view_type ?? 'unknown'}`);
}

async function loadCompactShard({ artifactDir, shardInfo, dimensions }) {
  const metadataRows = await readJsonlRows(path.join(artifactDir, shardInfo.metadata_file));
  for (const row of metadataRows) {
    row.vector_id = `${shardInfo.view_type}:${row.vector_index}:${row.card_id}`;
  }
  const bucketObject = JSON.parse(await readFile(path.join(artifactDir, shardInfo.bucket_file), 'utf8'));
  const buckets = new Map();
  for (const [bucket, indexes] of Object.entries(bucketObject)) {
    buckets.set(bucket, Array.isArray(indexes)
      ? indexes.map((value) => Number.parseInt(String(value), 10)).filter(Number.isInteger)
      : []);
  }
  const vectorBuffer = await readFile(path.join(artifactDir, shardInfo.vector_file));
  const expectedBytes = metadataRows.length * dimensions * 4;
  if (vectorBuffer.length < expectedBytes) {
    throw new Error(`compact_vector_shard_too_small:${shardInfo.view_type}:${vectorBuffer.length}/${expectedBytes}`);
  }
  const vectorFloat32 = compactFloat32View(vectorBuffer);
  const vectorNorms = compactVectorNorms({
    vectorBuffer,
    vectorFloat32,
    vectorCount: metadataRows.length,
    dimensions,
  });
  return {
    viewType: shardInfo.view_type,
    storageFormat: 'compact_f32_shards_v1',
    vectorDtype: VECTOR_DTYPE,
    dimensions,
    buckets,
    metadataRows,
    vectorBuffer,
    vectorFloat32,
    vectorNorms,
    vectorCount: metadataRows.length,
  };
}

function compactFloat32View(vectorBuffer) {
  if (vectorBuffer.byteOffset % 4 !== 0 || vectorBuffer.byteLength % 4 !== 0) {
    return null;
  }
  try {
    return new Float32Array(
      vectorBuffer.buffer,
      vectorBuffer.byteOffset,
      vectorBuffer.byteLength / 4,
    );
  } catch {
    return null;
  }
}

function compactVectorNorms({ vectorBuffer, vectorFloat32, vectorCount, dimensions }) {
  const norms = new Float32Array(vectorCount);
  for (let vectorIndex = 0; vectorIndex < vectorCount; vectorIndex += 1) {
    const vectorOffset = vectorIndex * dimensions;
    const byteOffset = vectorOffset * 4;
    let rowSquares = 0;
    for (let i = 0; i < dimensions; i += 1) {
      const rowValue = vectorFloat32
        ? vectorFloat32[vectorOffset + i]
        : vectorBuffer.readFloatLE(byteOffset + (i * 4));
      rowSquares += rowValue * rowValue;
    }
    norms[vectorIndex] = rowSquares > 0 ? Math.sqrt(rowSquares) : 0;
  }
  return norms;
}

async function loadJsonlShard({ artifactDir, shardInfo }) {
  const shardPath = path.join(artifactDir, shardInfo.file);
  const shard = {
    viewType: shardInfo.view_type,
    storageFormat: 'jsonl_embedding_rows_v1',
    buckets: new Map(),
    metadataRows: [],
    vectorCount: 0,
  };
  const reader = createInterface({
    input: createReadStream(shardPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let lineNumber = 0;
  for await (const line of reader) {
    if (!line.trim()) continue;
    lineNumber += 1;
    const row = JSON.parse(line);
    row.vector_id = `${shardInfo.view_type}:${lineNumber}:${row.card_id}`;
    if (!Array.isArray(row.embedding)) continue;
    if (!shard.buckets.has(row.bucket)) shard.buckets.set(row.bucket, []);
    shard.buckets.get(row.bucket).push(row);
    shard.metadataRows.push(row);
    shard.vectorCount += 1;
  }
  return shard;
}

async function readJsonlRows(filePath) {
  const rows = [];
  const reader = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of reader) {
    if (line.trim()) rows.push(JSON.parse(line));
  }
  return rows;
}

function candidateRowFromBucketEntry(shard, entry) {
  if (typeof entry === 'number') return shard.metadataRows[entry] ?? null;
  if (entry && Array.isArray(entry.embedding)) return entry;
  return null;
}

function compactCandidateRow(shard, vectorIndex) {
  const metadata = shard.metadataRows[vectorIndex];
  if (!metadata) return null;
  return {
    ...metadata,
    _compactShard: shard,
    _compactVectorIndex: vectorIndex,
  };
}

function readCompactEmbedding(shard, vectorIndex) {
  const dimensions = shard.dimensions ?? EMBEDDING_INDEX_V1.dimensions;
  const offset = vectorIndex * dimensions * 4;
  const embedding = new Array(dimensions);
  for (let i = 0; i < dimensions; i += 1) {
    embedding[i] = shard.vectorBuffer.readFloatLE(offset + (i * 4));
  }
  return embedding;
}

function viewTypesForCrop(cropType, artifact) {
  const text = String(cropType ?? '').toLowerCase();
  const all = [...artifact.shards.keys()];
  const selected = [];
  if (
    text === 'full_card_inner_core' ||
    text === 'full_card_core_tight' ||
    text === 'full_card_middle'
  ) {
    selected.push('full_card_middle', 'center_tight');
    const deduped = [...new Set(selected)].filter((viewType) => artifact.shards.has(viewType));
    return deduped.length > 0 ? deduped : all;
  }
  if (text === 'full_card_core' || text === 'full_card_core_identity') {
    selected.push('full_card_middle', 'full_card_upper', 'center_tight');
    const deduped = [...new Set(selected)].filter((viewType) => artifact.shards.has(viewType));
    return deduped.length > 0 ? deduped : all;
  }
  if (text.includes('title')) selected.push('title_band');
  if (text.includes('shift')) {
    selected.push(
      'full_card',
      'full_card_middle',
      'full_card_upper',
      'artwork',
      'artwork_zoom_in_10',
      'center_tight',
    );
  }
  if (text.includes('upper')) selected.push('full_card_upper', 'full_card');
  if (text.includes('middle')) selected.push('full_card_middle', 'full_card');
  if (text.includes('full')) selected.push('full_card', 'full_card_upper', 'full_card_middle');
  if (text.includes('art') || text.includes('visual') || text.includes('crop')) {
    selected.push('artwork', 'artwork_zoom_in_10', 'center_tight');
  }
  const deduped = [...new Set(selected)].filter((viewType) => artifact.shards.has(viewType));
  return deduped.length > 0 ? deduped : all;
}

function probeBucketKeys(bucket, maxHamming) {
  const keys = new Set([bucket]);
  const maxDepth = Math.min(Math.max(0, positiveInt(maxHamming, 0)), bucket.length);
  const indexes = [];

  function visit(startIndex, remainingDepth) {
    if (remainingDepth === 0) {
      keys.add(flipBits(bucket, indexes));
      return;
    }
    for (
      let index = startIndex;
      index <= bucket.length - remainingDepth;
      index += 1
    ) {
      indexes.push(index);
      visit(index + 1, remainingDepth - 1);
      indexes.pop();
    }
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    visit(0, depth);
  }
  return [...keys];
}

function flipBits(bucket, indexes) {
  const chars = bucket.split('');
  for (const index of indexes) chars[index] = chars[index] === '1' ? '0' : '1';
  return chars.join('');
}

function generatePlanes({ seed, plane_count: planeCount, dimensions }) {
  const random = seededRandom(seed);
  return Array.from({ length: planeCount }, () => {
    const plane = [];
    for (let i = 0; i < dimensions; i += 1) {
      plane.push((random() * 2) - 1);
    }
    return plane;
  });
}

function hashEmbedding(embedding, planes) {
  return planes.map((plane) => dot(embedding, plane) >= 0 ? '1' : '0').join('');
}

function dot(left, right) {
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let i = 0; i < length; i += 1) sum += Number(left[i]) * Number(right[i]);
  return sum;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function warmEmbeddingModel(model) {
  const buffer = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  }).png().toBuffer();
  await embedImageBuffer(buffer, { model });
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('request_body_too_large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function imageBufferFromCrop(crop) {
  const rawValue = crop?.raw_b64 ?? crop?.rawBase64 ?? crop?.raw;
  if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
    const width = positiveInt(crop?.width, 0);
    const height = positiveInt(crop?.height, 0);
    const format = textOrNull(crop?.format)?.toLowerCase() ?? '';
    const channels = format.includes('rgba')
      ? 4
      : format.includes('rgb')
        ? 3
        : 1;
    if (width <= 0 || height <= 0) throw new Error('raw_crop_dimensions_required');
    const rawBuffer = imageBufferFromValue(rawValue);
    const expectedBytes = width * height * channels;
    if (rawBuffer.length < expectedBytes) {
      throw new Error(`raw_crop_too_small:${rawBuffer.length}/${expectedBytes}`);
    }
    return sharp(rawBuffer.subarray(0, expectedBytes), {
      raw: {
        width,
        height,
        channels,
      },
      failOn: 'none',
    }).png().toBuffer();
  }

  return imageBufferFromValue(crop?.image_b64 ?? crop?.imageBase64 ?? crop?.image);
}

function imageBufferFromValue(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('missing_image_b64');
  }
  const cleaned = value.includes(',') ? value.split(',').pop() : value;
  const buffer = Buffer.from(cleaned, 'base64');
  if (buffer.length === 0) throw new Error('empty_image_b64');
  return buffer;
}

function isPalSv02(row) {
  const setCode = String(row?.set_code ?? '').trim().toLowerCase();
  const gvId = String(row?.gv_id ?? '').trim().toUpperCase();
  return setCode === 'sv02' || setCode === 'pal' || gvId.startsWith('GV-PK-PAL-');
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function textOrNull(value) {
  const text = value?.toString().trim() ?? '';
  return text.length === 0 ? null : text;
}

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
