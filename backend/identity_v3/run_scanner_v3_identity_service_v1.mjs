import '../env.mjs';

import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';

import {
  EMBEDDING_INDEX_V1,
  embedImageBuffer,
  rankEmbeddingViewCandidates,
} from './lib/embedding_index_v1.mjs';

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 8787;
const DEFAULT_V7_CACHE = '.tmp/scanner_v3_embedding_index_v7.json';
const DEFAULT_V5_CACHE = '.tmp/scanner_v3_embedding_index.json';
const MAX_BODY_BYTES = 16 * 1024 * 1024;

function parseArgs(argv) {
  const args = {
    host: process.env.SCANNER_V3_IDENTITY_HOST || DEFAULT_HOST,
    port: positiveInt(process.env.SCANNER_V3_IDENTITY_PORT, DEFAULT_PORT),
    indexCache: process.env.SCANNER_V3_IDENTITY_INDEX_CACHE || DEFAULT_V7_CACHE,
    fallbackIndexCache: process.env.SCANNER_V3_IDENTITY_FALLBACK_INDEX_CACHE || DEFAULT_V5_CACHE,
    model: process.env.SCANNER_V3_IDENTITY_MODEL || EMBEDDING_INDEX_V1.model,
    topK: positiveInt(process.env.SCANNER_V3_IDENTITY_TOP_K, 50),
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
    } else if (name === '--index-cache') {
      args.indexCache = nextValue() || DEFAULT_V7_CACHE;
    } else if (name === '--fallback-index-cache') {
      args.fallbackIndexCache = nextValue() || DEFAULT_V5_CACHE;
    } else if (name === '--model') {
      args.model = nextValue() || EMBEDDING_INDEX_V1.model;
    } else if (name === '--top-k') {
      args.topK = positiveInt(nextValue(), 50);
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_scanner_v3_identity_service_v1.mjs [--host 0.0.0.0] [--port 8787]',
    '',
    'Endpoints:',
    '  GET  /health',
    '  POST /scanner-v3/embed',
    '  POST /scanner-v3/candidates',
    '',
    'The service reads the V7 multiview index cache when available and falls back to the V5 single-view cache.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  await mkdir('.tmp', { recursive: true });
  const indexLoad = await loadEmbeddingIndex(args);
  await warmEmbeddingModel(args.model);

  const service = {
    startedAt: new Date().toISOString(),
    args,
    index: indexLoad.index,
    indexSource: indexLoad.source,
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
      event: 'scanner_v3_identity_service_started',
      host: args.host,
      port: args.port,
      health: `http://localhost:${args.port}/health`,
      embed: `http://localhost:${args.port}/scanner-v3/embed`,
      candidates: `http://localhost:${args.port}/scanner-v3/candidates`,
      model: args.model,
      index_source: indexLoad.source,
      reference_count: service.index.references.length,
      reference_view_count: service.index.reference_view_count,
    }, null, 2));
  });
}

async function handleRequest(request, response, service) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const requestStartedAt = performance.now();
  if (request.method === 'GET' && url.pathname === '/health') {
    writeJson(response, 200, {
      ok: true,
      service: 'scanner_v3_identity_service_v1',
      started_at: service.startedAt,
      model: service.args.model,
      index_source: service.indexSource,
      reference_count: service.index.references.length,
      reference_view_count: service.index.reference_view_count,
      dimensions: service.index.dimensions,
      endpoints: {
        embed: '/scanner-v3/embed',
        candidates: '/scanner-v3/candidates',
      },
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/scanner-v3/embed') {
    const body = await readJsonBody(request);
    const startedAt = performance.now();
    const imageBuffer = imageBufferFromBody(body);
    const result = await embedImageBuffer(imageBuffer, { model: service.args.model });
    const payload = {
      ok: true,
      embedding: result.embedding,
      dimensions: result.dimensions,
      model: result.model,
      source: result.source,
      embedding_ms: result.elapsed_ms,
      elapsed_ms: roundMs(performance.now() - startedAt),
      input: body.input ?? null,
      mode: body.mode ?? null,
    };
    console.log(JSON.stringify({
      event: 'embed_request',
      input: payload.input,
      bytes: imageBuffer.length,
      embedding_ms: payload.embedding_ms,
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
      writeJson(response, 400, {
        ok: false,
        error: 'missing_embedding',
      });
      return;
    }
    const startedAt = performance.now();
    const topK = positiveInt(body.top_k ?? body.topK, service.args.topK);
    const queryCropType = textOrNull(body.query_crop_type ?? body.queryCropType);
    const rawCandidates = rankEmbeddingViewCandidates({
      queryEmbedding: embedding,
      references: service.index.references,
      topN: Math.max(topK * 4, topK),
      queryCropType,
    });
    const candidates = dedupeCandidatesByCard(rawCandidates, queryCropType, topK);

    const payload = {
      ok: true,
      candidates,
      count: candidates.length,
      top_k: topK,
      query_crop_type: queryCropType,
      model: service.args.model,
      distance: EMBEDDING_INDEX_V1.distance,
      reference_count: service.index.references.length,
      reference_view_count: service.index.reference_view_count,
      vector_search_ms: roundMs(performance.now() - startedAt),
      mode: body.mode ?? null,
    };
    console.log(JSON.stringify({
      event: 'candidates_request',
      query_crop_type: queryCropType,
      count: candidates.length,
      vector_search_ms: payload.vector_search_ms,
      elapsed_ms: roundMs(performance.now() - requestStartedAt),
      remote: request.socket.remoteAddress,
    }));
    writeJson(response, 200, payload);
    return;
  }

  writeJson(response, 404, {
    ok: false,
    error: 'not_found',
    path: url.pathname,
  });
}

function dedupeCandidatesByCard(rawCandidates, queryCropType, topK) {
  const byCard = new Map();
  for (const candidate of rawCandidates) {
    const existing = byCard.get(candidate.card_id);
    if (!existing) {
      byCard.set(candidate.card_id, {
        ...candidate,
        best_reference_view_type: candidate.reference_view_type ?? null,
        best_query_crop_type: candidate.query_crop_type ?? queryCropType,
        raw_rank: candidate.rank,
        view_type: candidate.reference_view_type ?? null,
        crop_type: candidate.query_crop_type ?? queryCropType,
        contributing_crop_types: queryCropType ? [queryCropType] : [],
        crop_contribution_count: 1,
        reference_view_contribution_count: candidate.reference_view_type ? 1 : 0,
        aggregate_score: candidate.similarity,
        _referenceViews: new Set(candidate.reference_view_type ? [candidate.reference_view_type] : []),
      });
      continue;
    }

    if (candidate.reference_view_type) existing._referenceViews.add(candidate.reference_view_type);
    existing.reference_view_contribution_count = existing._referenceViews.size;
    if (candidate.distance < existing.distance) {
      existing.distance = candidate.distance;
      existing.similarity = candidate.similarity;
      existing.aggregate_score = candidate.similarity;
      existing.rank = candidate.rank;
      existing.raw_rank = candidate.rank;
      existing.reference_view_type = candidate.reference_view_type;
      existing.best_reference_view_type = candidate.reference_view_type ?? null;
      existing.view_type = candidate.reference_view_type ?? null;
      existing.crop_type = candidate.query_crop_type ?? queryCropType;
    }
  }

  return [...byCard.values()]
    .map((candidate) => {
      const { _referenceViews, ...publicCandidate } = candidate;
      return publicCandidate;
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topK)
    .map((candidate, index) => ({
      ...candidate,
      raw_rank: candidate.raw_rank ?? candidate.rank,
      view_type: candidate.view_type ?? candidate.reference_view_type ?? null,
      crop_type: candidate.crop_type ?? candidate.query_crop_type ?? queryCropType,
      rank: index + 1,
    }));
}

async function loadEmbeddingIndex(args) {
  const primaryPath = path.resolve(args.indexCache);
  const fallbackPath = path.resolve(args.fallbackIndexCache);

  for (const candidatePath of [primaryPath, fallbackPath]) {
    const loaded = await readIndexIfPresent(candidatePath);
    if (loaded) return loaded;
  }

  throw new Error(
    `scanner_v3_identity_index_missing:${primaryPath}; fallback:${fallbackPath}. Run V7 first or provide --index-cache.`,
  );
}

async function readIndexIfPresent(indexPath) {
  try {
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw);
    const normalized = normalizeIndex(parsed);
    if (normalized.references.length === 0) return null;
    return {
      source: indexPath,
      index: normalized,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function normalizeIndex(parsed) {
  const rawReferences = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.references)
      ? parsed.references
      : [];
  const references = rawReferences
    .map((reference) => {
      if (Array.isArray(reference.views) && reference.views.length > 0) {
        return {
          ...reference,
          views: reference.views.filter((view) => Array.isArray(view.embedding)),
        };
      }
      if (Array.isArray(reference.embedding)) {
        return {
          ...reference,
          views: [{
            view_type: 'artwork',
            source: reference.embedding_source ?? 'single_view_cache',
            embedding_model: reference.embedding_model ?? parsed.model ?? EMBEDDING_INDEX_V1.model,
            embedding_source: reference.embedding_source ?? EMBEDDING_INDEX_V1.source,
            embedding_ms: reference.embedding_ms ?? null,
            embedding: reference.embedding,
          }],
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter((reference) => reference.views.length > 0);

  const referenceViewCount = references.reduce(
    (sum, reference) => sum + reference.views.length,
    0,
  );

  return {
    version: parsed.version ?? `${EMBEDDING_INDEX_V1.name}_service_normalized`,
    source: parsed.source ?? EMBEDDING_INDEX_V1.source,
    model: parsed.model ?? EMBEDDING_INDEX_V1.model,
    dimensions: parsed.dimensions ?? references[0]?.views?.[0]?.embedding?.length ?? EMBEDDING_INDEX_V1.dimensions,
    reference_count: references.length,
    reference_view_count: referenceViewCount,
    views_per_reference_avg: references.length === 0
      ? null
      : round6(referenceViewCount / references.length),
    references,
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
    if (size > MAX_BODY_BYTES) {
      throw new Error('request_body_too_large');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(text);
}

function imageBufferFromBody(body) {
  const value = body.image_b64 ?? body.imageBase64 ?? body.image ?? body.input_image_b64;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('missing_image_b64');
  }
  const cleaned = value.includes(',') ? value.split(',').pop() : value;
  const buffer = Buffer.from(cleaned, 'base64');
  if (buffer.length === 0) throw new Error('empty_image_b64');
  return buffer;
}

function writeJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  });
  response.end(body);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
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
