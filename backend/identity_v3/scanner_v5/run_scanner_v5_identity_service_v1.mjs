import '../../env.mjs';

import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { rectifyCardStillBuffer } from './rectify_card_still_v1.mjs';
import { ocrCardNumberBuffer } from './ocr_card_number_v1.mjs';
import {
  embedAndSearchFullCard,
  loadScannerV5Artifact,
} from './scanner_v5_artifact_v1.mjs';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8795;
const DEFAULT_ARTIFACT_DIR = 'backend/identity_v3/scanner_v5/fixtures/artifact';
const MAX_BODY_BYTES = 16 * 1024 * 1024;

function parseArgs(argv) {
  const args = {
    host: process.env.SCANNER_V5_HOST || DEFAULT_HOST,
    port: positiveInt(process.env.SCANNER_V5_PORT, DEFAULT_PORT),
    artifactDir: process.env.SCANNER_V5_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR,
    debugDir: process.env.SCANNER_V5_DEBUG_DIR || '.tmp/scanner_v5_identity_service',
    saveDebugArtifacts: truthy(process.env.SCANNER_V5_SAVE_DEBUG_ARTIFACTS),
    model: process.env.SCANNER_V5_IDENTITY_MODEL || null,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inline] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const next = () => {
      if (inline !== null) return inline;
      i += 1;
      return argv[i] ?? '';
    };
    if (name === '--host') args.host = next() || DEFAULT_HOST;
    else if (name === '--port') args.port = positiveInt(next(), DEFAULT_PORT);
    else if (name === '--artifact-dir') args.artifactDir = next() || DEFAULT_ARTIFACT_DIR;
    else if (name === '--debug-dir') args.debugDir = next() || args.debugDir;
    else if (name === '--save-debug-artifacts') args.saveDebugArtifacts = true;
    else if (name === '--model') args.model = next() || null;
    else if (name === '--help' || name === '-h') args.help = true;
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/scanner_v5/run_scanner_v5_identity_service_v1.mjs [--port 8795]',
    '',
    'Endpoints:',
    '  GET  /health',
    '  GET  /scanner-v5/health',
    '  POST /scanner-v5/identify',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const artifact = await loadScannerV5Artifact(args.artifactDir);
  if (args.saveDebugArtifacts) {
    await mkdir(args.debugDir, { recursive: true });
  }
  const service = {
    startedAt: new Date().toISOString(),
    args,
    artifact,
    sequence: 0,
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
      event: 'scanner_v5_identity_service_started',
      host: args.host,
      port: args.port,
      health: `http://${args.host}:${args.port}/scanner-v5/health`,
      artifact_dir: path.resolve(args.artifactDir),
      reference_count: artifact.referenceCount,
      save_debug_artifacts: args.saveDebugArtifacts,
    }, null, 2));
  });
}

async function handleRequest(request, response, service) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/scanner-v5/health')) {
    writeJson(response, 200, {
      ok: true,
      service: 'scanner_v5_identity_service_v1',
      started_at: service.startedAt,
      artifact_dir: path.resolve(service.args.artifactDir),
      reference_count: service.artifact.referenceCount,
      save_debug_artifacts: service.args.saveDebugArtifacts,
      contract: 'SCANNER_V5_IDENTIFY_CONTRACT_V1',
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/scanner-v5/identify') {
    const requestId = `${Date.now()}_${String(++service.sequence).padStart(5, '0')}`;
    const startedAt = performance.now();
    try {
      const body = await readRequestBody(request, MAX_BODY_BYTES);
      const imageBuffer = imageBufferFromRequest(body, request.headers['content-type']);
      const readMs = roundMs(performance.now() - startedAt);
      const requestDebugDir = service.args.saveDebugArtifacts
        ? path.join(service.args.debugDir, requestId)
        : null;
      if (requestDebugDir) await mkdir(requestDebugDir, { recursive: true });
      const uploadDebugPath = requestDebugDir ? path.join(requestDebugDir, 'upload.jpg') : null;
      if (uploadDebugPath) await writeFile(uploadDebugPath, imageBuffer);

      const rectifyStartedAt = performance.now();
      const rectified = await rectifyCardStillBuffer(imageBuffer);
      const rectifyMs = roundMs(performance.now() - rectifyStartedAt);
      const debugPath = requestDebugDir ? path.join(requestDebugDir, 'rectified.png') : null;
      if (debugPath) await writeFile(debugPath, rectified.png);
      const ocrDebugDir = requestDebugDir ? path.join(requestDebugDir, 'ocr') : null;

      const ocrStartedAt = performance.now();
      const ocr = await ocrCardNumberBuffer(rectified.png, {
        artifact: service.artifact,
        artifactDir: service.args.artifactDir,
        debugDir: ocrDebugDir,
        sourcePath: debugPath,
      });
      const ocrMs = roundMs(performance.now() - ocrStartedAt);

      const exactCandidates = normalizeCandidates(ocr.matches);
      let embedding = null;
      let mode = 'ocr_miss';
      let candidates = [];

      if (exactCandidates.length === 1) {
        mode = 'ocr_exact';
        candidates = exactCandidates.slice(0, 1);
      } else if (exactCandidates.length > 1) {
        embedding = await runEmbeddingLane(rectified.png, service);
        mode = 'fused';
        candidates = rankOcrSiblingsByEmbedding(exactCandidates, embedding.candidates).slice(0, 3);
      } else {
        embedding = await runEmbeddingLane(rectified.png, service);
        candidates = normalizeCandidates(embedding.candidates).slice(0, 3);
        mode = candidates.length > 0 ? 'embedding_only' : 'unreadable';
      }

      if (mode === 'unreadable') {
        candidates = [];
      }

      const latency = {
        read_ms: readMs,
        rectify_ms: rectifyMs,
        ocr_ms: ocrMs,
        embedding_ms: embedding?.embedding_ms ?? null,
        total_ms: roundMs(performance.now() - startedAt),
      };
      const payload = {
        ok: true,
        request_id: requestId,
        mode,
        candidates,
        latency_ms: latency,
        ocr: {
          number: ocr.number,
          set_total: ocr.set_total,
          set_code_guess: ocr.set_code_guess,
          confidence: ocr.ocr_confidence,
          available: ocr.ocr_available,
          parser_source: ocr.parser_source,
        },
        rectification: rectified.sidecar,
        upload_debug_path: uploadDebugPath,
        rectified_debug_path: debugPath,
        ocr_debug_dir: ocrDebugDir,
        retake_hint: mode === 'unreadable' ? retakeHint(rectified.sidecar) : null,
      };
      console.log(JSON.stringify({
        event: 'scanner_v5_identify_request',
        request_id: requestId,
        mode,
        candidate_count: candidates.length,
        ocr: payload.ocr,
        rectification: {
          quad_source: rectified.sidecar?.quad_source ?? null,
          confidence: rectified.sidecar?.confidence ?? null,
          skew_deg: rectified.sidecar?.skew_deg ?? null,
        },
        debug_dir: requestDebugDir,
        latency_ms: latency,
      }));
      writeJson(response, 200, payload);
    } catch (error) {
      const latency = {
        read_ms: null,
        rectify_ms: null,
        ocr_ms: null,
        embedding_ms: null,
        total_ms: roundMs(performance.now() - startedAt),
      };
      console.warn(JSON.stringify({
        event: 'scanner_v5_identify_unreadable',
        request_id: requestId,
        error: error?.message || String(error),
        latency_ms: latency,
      }));
      writeJson(response, 200, {
        ok: false,
        mode: 'unreadable',
        candidates: [],
        latency_ms: latency,
        ocr: {
          number: null,
          set_total: null,
          set_code_guess: null,
          confidence: null,
          available: null,
          parser_source: 'unreadable',
        },
        rectification: null,
        rectified_debug_path: null,
        retake_hint: 'Retake with the full card centered, in focus, and evenly lit.',
        error: error?.message || String(error),
      });
    }
    return;
  }

  writeJson(response, 404, { ok: false, error: 'not_found' });
}

async function runEmbeddingLane(rectifiedPng, service) {
  return embedAndSearchFullCard({
    imageBuffer: rectifiedPng,
    artifact: service.artifact,
    topK: 10,
    model: service.args.model,
  });
}

function rankOcrSiblingsByEmbedding(ocrCandidates, embeddingCandidates) {
  const distanceById = new Map();
  for (const candidate of embeddingCandidates ?? []) {
    if (candidate.gv_id) distanceById.set(candidate.gv_id, candidate.distance);
    if (candidate.id) distanceById.set(candidate.id, candidate.distance);
  }
  return ocrCandidates
    .map((candidate) => ({
      ...candidate,
      distance: distanceById.get(candidate.gv_id) ?? distanceById.get(candidate.id) ?? null,
    }))
    .sort((a, b) => {
      const da = a.distance ?? 999;
      const db = b.distance ?? 999;
      if (da !== db) return da - db;
      return String(a.id).localeCompare(String(b.id));
    });
}

function normalizeCandidates(candidates) {
  return (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidate && (candidate.id || candidate.gv_id || candidate.card_id))
    .map((candidate, index) => {
      const distance = numericOrNull(candidate.distance);
      const score = numericOrNull(candidate.score);
      const confidence = numericOrNull(candidate.confidence) ??
        score ??
        (distance == null ? null : round6(Math.max(0, Math.min(1, 1 - distance))));
      const name = candidate.display_name ?? candidate.name ?? null;
      return {
      id: candidate.gv_id ?? candidate.id ?? candidate.card_id,
      card_id: candidate.card_id ?? null,
      gv_id: candidate.gv_id ?? null,
      display_name: name,
      name,
      set: candidate.set ?? candidate.set_code ?? null,
      set_code: candidate.set_code ?? candidate.set ?? null,
      number: candidate.number ?? null,
      image_url: candidate.image_url ?? null,
      confidence,
      rank: positiveInt(candidate.rank, index + 1),
      distance,
      score,
      reason: candidate.reason ?? null,
    };
  });
}

function numericOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round6(value) {
  return Number.isFinite(value) ? Math.round(value * 1_000_000) / 1_000_000 : null;
}

function retakeHint(sidecar) {
  if (sidecar?.quad_source === 'fallback_slot') {
    return 'Center the full card inside the frame and avoid desk background.';
  }
  if (Number(sidecar?.confidence ?? 0) < 0.55) {
    return 'Move closer, reduce glare, and keep the card edges inside the guide.';
  }
  return 'Retake with steadier focus and brighter even light.';
}

async function readRequestBody(request, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('scanner_v5_request_too_large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function imageBufferFromRequest(body, contentType = '') {
  const type = String(contentType ?? '').toLowerCase();
  if (type.includes('application/json')) {
    const parsed = JSON.parse(body.toString('utf8'));
    const raw = parsed.image_base64 ?? parsed.image ?? parsed.still_base64;
    if (!raw) throw new Error('scanner_v5_missing_base64_image');
    return Buffer.from(String(raw).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ''), 'base64');
  }
  if (type.includes('multipart/form-data')) {
    return extractFirstMultipartFile(body, contentType);
  }
  return body;
}

function extractFirstMultipartFile(body, contentType) {
  const boundary = String(contentType).match(/boundary=([^;]+)/i)?.[1];
  if (!boundary) throw new Error('scanner_v5_multipart_boundary_missing');
  const delimiter = Buffer.from(`--${boundary}`);
  const start = body.indexOf(Buffer.from('\r\n\r\n'));
  if (start < 0) throw new Error('scanner_v5_multipart_file_missing');
  const dataStart = start + 4;
  const nextBoundary = body.indexOf(delimiter, dataStart);
  const dataEnd = nextBoundary < 0 ? body.length : Math.max(dataStart, nextBoundary - 2);
  return body.subarray(dataStart, dataEnd);
}

function writeJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function truthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value ?? '').trim());
}

function roundMs(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
